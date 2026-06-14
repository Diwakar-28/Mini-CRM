import { config, prisma } from '../config/config';
import axios from 'axios';

// Interfaces for our Job Queue
interface CampaignJob {
  campaignId: string;
}

export interface IQueueService {
  addCampaignJob(campaignId: string): Promise<void>;
  shutdown(): Promise<void>;
}

// In-Memory Fallback Queue Processor
class InMemoryQueueService implements IQueueService {
  private queue: CampaignJob[] = [];
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('[Queue] Initializing In-Memory Fallback Queue Service...');
    this.startWorker();
  }

  public async addCampaignJob(campaignId: string): Promise<void> {
    console.log(`[Queue] Adding job to In-Memory Queue: Campaign ${campaignId}`);
    this.queue.push({ campaignId });
  }

  private startWorker() {
    this.intervalId = setInterval(async () => {
      if (this.isProcessing || this.queue.length === 0) return;
      
      this.isProcessing = true;
      const job = this.queue.shift();
      if (job) {
        try {
          await this.processCampaign(job.campaignId);
        } catch (error: any) {
          console.error(`[Queue] Error processing campaign ${job.campaignId} in memory:`, error.message);
        }
      }
      this.isProcessing = false;
    }, 100);
  }

  private async processCampaign(campaignId: string): Promise<void> {
    console.log(`[Queue] In-Memory Worker: Starting Campaign ${campaignId}`);
    
    // 1. Get Campaign and Segment Details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { segment: true },
    });

    if (!campaign) {
      console.error(`[Queue] Campaign ${campaignId} not found.`);
      return;
    }

    // Update campaign status to "sending"
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending', launchedAt: new Date() },
    });

    // 2. Fetch Customers matching the Segment Rules
    const rules = JSON.parse(campaign.segment.rulesJson);
    const customers = await this.evaluateSegment(rules);
    console.log(`[Queue] Segment has ${customers.length} customers for Campaign ${campaignId}`);

    if (customers.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed' }, // Nothing to send
      });
      return;
    }

    // 3. Create Campaign Recipient entries and send to Channel Simulator
    for (const customer of customers) {
      const personalization = await this.getHistoryPersonalization(customer.id, customer.totalSpend);
      
      // Personalize the message template (replace variables like [Name], [City])
      let personalizedMessage = campaign.messageTemplate
        .replace(/\[Name\]/gi, customer.name)
        .replace(/\[City\]/gi, customer.city)
        .replace(/\[Email\]/gi, customer.email)
        .replace(/\[FavoriteProduct\]/gi, personalization.favoriteProduct)
        .replace(/\[FavoriteCategory\]/gi, personalization.favoriteCategory)
        .replace(/\[CategoryOffer\]/gi, personalization.categoryOffer)
        .replace(/\[CardOffer\]/gi, personalization.cardOffer);

      // Create CampaignRecipient
      const recipient = await prisma.campaignRecipient.create({
        data: {
          campaignId,
          customerId: customer.id,
          personalizedMessage,
          status: 'pending',
        },
      });

      // Dispatch asynchronously to Channel Service
      this.dispatchToChannelService({
        recipientId: recipient.id,
        customerId: customer.id,
        customerName: customer.name,
        destination: campaign.channel === 'email' ? customer.email : customer.phone,
        channel: campaign.channel as any,
        message: personalizedMessage,
        callbackUrl: `http://localhost:${config.port}/api/receipts`,
      });
    }

    // Update campaign status to "completed" (the sends have all been dispatched/queued)
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completed' },
    });

    console.log(`[Queue] In-Memory Worker: Finished dispatching Campaign ${campaignId}`);
  }

  private async getHistoryPersonalization(customerId: string, totalSpend: number) {
    const orders = await prisma.order.findMany({
      where: { customerId, status: { not: 'cancelled' } },
    });

    const productCounts: Record<string, number> = {};
    for (const order of orders) {
      try {
        const items = JSON.parse(order.items);
        if (Array.isArray(items)) {
          for (const item of items) {
            productCounts[item.name] = (productCounts[item.name] || 0) + (item.qty || 1);
          }
        }
      } catch (e) {}
    }

    let favoriteProduct = 'Premium Accessories';
    let maxCount = 0;
    for (const [prod, count] of Object.entries(productCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteProduct = prod;
      }
    }

    // Determine category based on product name
    let favoriteCategory = 'Everyday Essentials';
    let categoryOffer = '15% off gears and accessories using code GEAR15';

    const techProducts = ['Wireless Headphones', 'Mechanical Keyboard', 'Ergonomic Mouse', '4K Monitor', 'USB-C Hub', 'Smart Watch'];
    if (techProducts.includes(favoriteProduct)) {
      favoriteCategory = 'Tech & Gadgets';
      categoryOffer = 'an exclusive 15% discount on Tech Setup essentials (code: GEEK15)';
    } else {
      favoriteCategory = 'Lifestyle Accessories';
      categoryOffer = 'an exclusive 15% discount on Lifestyle items (code: STYLE15)';
    }

    // Determine bank card offer based on spend thresholds
    let cardOffer = '10% instant discount with SBI credit cards';
    if (totalSpend >= 25000) {
      cardOffer = 'an additional flat ₹2,000 instant cashback on HDFC premium cards';
    } else if (totalSpend >= 10000) {
      cardOffer = 'an extra 10% cash back using ICICI bank cards';
    }

    return {
      favoriteProduct,
      favoriteCategory,
      categoryOffer,
      cardOffer,
    };
  }

  private async evaluateSegment(rules: any): Promise<any[]> {
    // Import segment evaluator dynamically to avoid circular references
    const { evaluateSegment } = require('../services/segmentEvaluator');
    return evaluateSegment(rules);
  }

  private async dispatchToChannelService(payload: any) {
    try {
      await axios.post(`${config.channelServiceUrl}/send`, payload);
    } catch (err: any) {
      console.error(`[Queue] Failed to dispatch recipient ${payload.recipientId} to Channel Service:`, err.message);
      // Update DB to show failed direct delivery
      await prisma.campaignRecipient.update({
        where: { id: payload.recipientId },
        data: {
          status: 'failed',
          failureReason: 'DISPATCH_CHANNEL_SERVICE_OFFLINE',
        },
      });
    }
  }

  public async shutdown(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// BullMQ Real Redis implementation
let QueueClass: any = null;
let WorkerClass: any = null;

if (config.redisUrl) {
  try {
    const bullmq = require('bullmq');
    QueueClass = bullmq.Queue;
    WorkerClass = bullmq.Worker;
  } catch (e) {
    console.warn('[Queue] BullMQ failed to import. Falling back to In-Memory Queue.');
  }
}

class BullMQQueueService implements IQueueService {
  private queue: any;
  private worker: any;

  constructor() {
    console.log('[Queue] Initializing BullMQ with Redis URL:', config.redisUrl);
    const IORedis = require('ioredis');
    const connection = new IORedis(config.redisUrl);

    this.queue = new QueueClass('campaign-delivery', { connection });

    this.worker = new WorkerClass('campaign-delivery', async (job: any) => {
      const { campaignId } = job.data;
      console.log(`[Queue] BullMQ Worker: Processing Campaign ${campaignId}`);
      
      const inMemoryProcessor = new (InMemoryQueueService as any)();
      await inMemoryProcessor.processCampaign(campaignId);
      await inMemoryProcessor.shutdown();
    }, { connection });
  }

  public async addCampaignJob(campaignId: string): Promise<void> {
    await this.queue.add('process-campaign', { campaignId });
  }

  public async shutdown(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}

// Export a single instance
let queueService: IQueueService;
if (config.redisUrl && QueueClass && WorkerClass) {
  queueService = new BullMQQueueService();
} else {
  queueService = new InMemoryQueueService();
}

export default queueService;

import { Request, Response } from 'express';
import { prisma } from '../config/config';
import { evaluateSegment } from '../services/segmentEvaluator';
import queueService from '../queue/QueueService';
import { IngestCustomerDTO, IngestOrderDTO } from '@xeno/shared';

// -------------------------------------------------------------
// 1. Ingestion Controllers
// -------------------------------------------------------------

export async function ingestCustomers(req: Request, res: Response) {
  try {
    const customers = req.body as IngestCustomerDTO[];
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Body must be an array of customers' });
    }

    console.log(`[Ingestion] Ingesting batch of ${customers.length} customers...`);
    const results = [];

    for (const c of customers) {
      if (!c.email || !c.name || !c.phone || !c.city) {
        return res.status(400).json({ error: 'Missing required customer fields (email, name, phone, city)' });
      }

      const tagsStr = JSON.stringify(c.tags || []);
      const upserted = await prisma.customer.upsert({
        where: { email: c.email },
        update: {
          name: c.name,
          phone: c.phone,
          city: c.city,
          tags: tagsStr,
        },
        create: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          city: c.city,
          tags: tagsStr,
        },
      });
      results.push(upserted);
    }

    return res.json({
      success: true,
      message: `Successfully processed ${results.length} customer records`,
      count: results.length,
    });
  } catch (err: any) {
    console.error('[Ingestion] Customer ingestion failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

export async function ingestOrders(req: Request, res: Response) {
  try {
    const orders = req.body as IngestOrderDTO[];
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Body must be an array of orders' });
    }

    console.log(`[Ingestion] Ingesting batch of ${orders.length} orders...`);
    const processedOrders = [];

    for (const o of orders) {
      if (!o.email || o.orderValue === undefined || !o.items || !o.orderDate || !o.status) {
        return res.status(400).json({ error: 'Missing required order fields (email, orderValue, items, orderDate, status)' });
      }

      // Find customer
      const customer = await prisma.customer.findUnique({ where: { email: o.email } });
      if (!customer) {
        return res.status(404).json({ error: `Customer with email ${o.email} not found. Ingest customers first.` });
      }

      // Create order
      const newOrder = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderValue: o.orderValue,
          items: JSON.stringify(o.items),
          orderDate: new Date(o.orderDate),
          status: o.status,
        },
      });
      processedOrders.push(newOrder);

      // Recalculate customer statistics
      const customerOrders = await prisma.order.findMany({
        where: { customerId: customer.id },
      });

      let totalSpend = 0;
      let totalOrders = 0;
      let lastOrderDate: Date | null = null;

      for (const order of customerOrders) {
        if (order.status !== 'cancelled') {
          totalSpend += order.orderValue;
          totalOrders += 1;
        }
        const oDate = new Date(order.orderDate);
        if (!lastOrderDate || oDate > lastOrderDate) {
          lastOrderDate = oDate;
        }
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalOrders,
          lastOrderDate,
        },
      });
    }

    return res.json({
      success: true,
      message: `Successfully processed ${processedOrders.length} order records`,
      count: processedOrders.length,
    });
  } catch (err: any) {
    console.error('[Ingestion] Order ingestion failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// -------------------------------------------------------------
// 2. Segment Controllers
// -------------------------------------------------------------

export async function getAllSegments(req: Request, res: Response) {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(segments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createSegment(req: Request, res: Response) {
  try {
    const { name, description, rules, query } = req.body;
    if (!name || !rules) {
      return res.status(400).json({ error: 'Missing name or rules parameters' });
    }

    const segment = await prisma.segment.create({
      data: {
        name,
        description: description || '',
        rulesJson: typeof rules === 'string' ? rules : JSON.stringify(rules),
        naturalLanguageQuery: query || null,
        createdBy: 'manual',
      },
    });
    return res.status(201).json(segment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function previewSegment(req: Request, res: Response) {
  try {
    const { rules } = req.body;
    if (!rules) {
      return res.status(400).json({ error: 'Missing rules schema' });
    }

    const matched = await evaluateSegment(rules);
    return res.json({
      count: matched.length,
      sample: matched.slice(0, 10),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// -------------------------------------------------------------
// 3. Campaign Controllers
// -------------------------------------------------------------

export async function getAllCampaigns(req: Request, res: Response) {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: true,
        recipients: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = campaigns.map((c) => {
      const total = c.recipients.length;
      const sent = c.recipients.filter((r) => ['sent', 'delivered', 'opened', 'clicked'].includes(r.status)).length;
      const delivered = c.recipients.filter((r) => ['delivered', 'opened', 'clicked'].includes(r.status)).length;
      const opened = c.recipients.filter((r) => ['opened', 'clicked'].includes(r.status)).length;
      const clicked = c.recipients.filter((r) => r.status === 'clicked').length;
      const failed = c.recipients.filter((r) => r.status === 'failed').length;

      return {
        id: c.id,
        name: c.name,
        segmentName: c.segment.name,
        channel: c.channel,
        status: c.status,
        createdAt: c.createdAt,
        launchedAt: c.launchedAt,
        metrics: {
          total,
          sent,
          delivered,
          opened,
          clicked,
          failed,
        },
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getCampaignDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: true,
        recipients: {
          include: {
            customer: true,
            events: {
              orderBy: { occurredAt: 'desc' },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const total = campaign.recipients.length;
    const sent = campaign.recipients.filter((r) => ['sent', 'delivered', 'opened', 'clicked'].includes(r.status)).length;
    const delivered = campaign.recipients.filter((r) => ['delivered', 'opened', 'clicked'].includes(r.status)).length;
    const opened = campaign.recipients.filter((r) => ['opened', 'clicked'].includes(r.status)).length;
    const clicked = campaign.recipients.filter((r) => r.status === 'clicked').length;
    const failed = campaign.recipients.filter((r) => r.status === 'failed').length;

    return res.json({
      ...campaign,
      metrics: {
        total,
        sent,
        delivered,
        opened,
        clicked,
        failed,
        sentRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createCampaign(req: Request, res: Response) {
  try {
    const { name, segmentId, channel, messageTemplate } = req.body;
    if (!name || !segmentId || !channel || !messageTemplate) {
      return res.status(400).json({ error: 'Missing required campaign parameters' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        segmentId,
        channel,
        messageTemplate,
        aiGenerated: false,
        status: 'draft',
      },
    });
    return res.status(201).json(campaign);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function launchCampaign(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign has already been launched' });
    }

    // Launch via QueueService
    await queueService.addCampaignJob(campaign.id);

    return res.json({
      success: true,
      message: 'Campaign added to dispatch queue',
      campaignId: campaign.id,
      status: 'queued',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// -------------------------------------------------------------
// 4. Analytics Dashboard Controllers
// -------------------------------------------------------------

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    // A. Customer and Order counts
    const totalCustomers = await prisma.customer.count();
    
    const orders = await prisma.order.findMany({
      where: { status: { not: 'cancelled' } },
    });
    const totalSales = orders.reduce((sum, o) => sum + o.orderValue, 0);

    // B. Sales by City
    const customers = await prisma.customer.findMany({});
    const citySalesMap = new Map<string, number>();
    for (const c of customers) {
      const currentVal = citySalesMap.get(c.city) || 0;
      citySalesMap.set(c.city, currentVal + c.totalSpend);
    }
    const salesByCity = Array.from(citySalesMap.entries()).map(([city, sales]) => ({
      city,
      sales: Math.round(sales * 100) / 100,
    })).sort((a, b) => b.sales - a.sales).slice(0, 5);

    // C. Campaign Channel Performance
    const recipients = await prisma.campaignRecipient.findMany({
      include: { campaign: true },
    });

    const channelStats: Record<string, { total: number; sent: number; delivered: number; opened: number; clicked: number }> = {
      email: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0 },
      sms: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0 },
      whatsapp: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0 },
      rcs: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0 },
    };

    for (const r of recipients) {
      const ch = r.campaign.channel;
      if (channelStats[ch]) {
        channelStats[ch].total++;
        if (['sent', 'delivered', 'opened', 'clicked'].includes(r.status)) channelStats[ch].sent++;
        if (['delivered', 'opened', 'clicked'].includes(r.status)) channelStats[ch].delivered++;
        if (['opened', 'clicked'].includes(r.status)) channelStats[ch].opened++;
        if (r.status === 'clicked') channelStats[ch].clicked++;
      }
    }

    const channelPerformance = Object.entries(channelStats).map(([channel, metrics]) => {
      const total = metrics.total;
      return {
        channel,
        total,
        openRate: metrics.delivered > 0 ? Math.round((metrics.opened / metrics.delivered) * 100) : 0,
        clickRate: metrics.opened > 0 ? Math.round((metrics.clicked / metrics.opened) * 100) : 0,
      };
    });

    // D. Inbound Orders Timeline (for chart)
    const sortedOrders = [...orders].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
    const monthlySalesMap = new Map<string, number>();
    
    for (const o of sortedOrders) {
      const date = new Date(o.orderDate);
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const currentVal = monthlySalesMap.get(monthYear) || 0;
      monthlySalesMap.set(monthYear, currentVal + o.orderValue);
    }

    const salesTimeline = Array.from(monthlySalesMap.entries()).map(([month, sales]) => ({
      month,
      sales: Math.round(sales),
    }));

    return res.json({
      totalCustomers,
      totalSales: Math.round(totalSales * 100) / 100,
      salesByCity,
      channelPerformance,
      salesTimeline,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

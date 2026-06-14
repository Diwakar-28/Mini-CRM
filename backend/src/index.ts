import express from 'express';
import cors from 'cors';
import { config, prisma } from './config/config';
import crmRoutes from './routes/crmRoutes';
import { runAgent } from './ai/aiAgent';

const app = express();

app.use(cors());
app.use(express.json());

// Mount CRM Business APIs
app.use('/api', crmRoutes);

// AI Agent Chat API
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const agentResponse = await runAgent(message, history || []);
    return res.json({ response: agentResponse });
  } catch (err: any) {
    console.error('[Chat API] AI agent execution crashed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Delivery Receipts Webhook Callback
app.post('/api/receipts', async (req, res) => {
  const { recipientId, status, failureReason } = req.body;
  if (!recipientId || !status) {
    return res.status(400).json({ error: 'Missing recipientId or status' });
  }

  console.log(`[Webhook Receipt] Recipient: ${recipientId} | Status: ${status}`);

  try {
    // 1. Fetch recipient
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      console.warn(`[Webhook Receipt] CampaignRecipient ${recipientId} not found.`);
      return res.status(404).json({ error: 'Recipient record not found' });
    }

    // 2. Prepare field updates
    const updateData: any = { status };
    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'opened') {
      updateData.openedAt = new Date();
    } else if (status === 'clicked') {
      updateData.clickedAt = new Date();
    } else if (status === 'failed') {
      updateData.failureReason = failureReason || 'UNKNOWN_ERROR';
    }

    // Update CampaignRecipient
    const updatedRecipient = await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: updateData,
    });

    // 3. Log Communication Event
    await prisma.communicationEvent.create({
      data: {
        campaignRecipientId: recipientId,
        eventType: status,
        metadata: JSON.stringify({ failureReason, occurredAt: new Date() }),
      },
    });

    return res.json({ success: true, updatedRecipient });
  } catch (err: any) {
    console.error(`[Webhook Receipt] Failed to process status update for ${recipientId}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Xeno CRM Backend API' });
});

// Server bootstrap
app.listen(config.port, () => {
  console.log(`Xeno CRM Backend API running on port ${config.port}`);
});

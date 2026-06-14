import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

interface SendRequest {
  recipientId: string;
  customerId: string;
  customerName: string;
  destination: string; // email, phone number, etc.
  channel: 'email' | 'sms' | 'whatsapp' | 'rcs';
  message: string;
  callbackUrl: string;
}

// In-memory log of messages sent through this simulator
const messageLog: any[] = [];

// Robust Webhook Sender with Exponential Backoff Retries
async function sendWebhook(url: string, payload: any, attempt = 0): Promise<void> {
  try {
    await axios.post(url, payload);
    console.log(`[Simulator Callback] Successful callback to ${url} for recipient ${payload.recipientId} with status ${payload.status}`);
  } catch (err: any) {
    const maxRetries = 3;
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(`[Simulator Callback] Callback failed to ${url} (${err.message}). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      setTimeout(() => {
        sendWebhook(url, payload, attempt + 1);
      }, delay);
    } else {
      console.error(`[Simulator Callback] Max retries reached. Callback delivery failed for ${payload.recipientId}.`);
    }
  }
}

// Background simulation runner
function runMessageLifecycle(req: SendRequest) {
  const { recipientId, callbackUrl, channel } = req;

  // 1. Sent status callback (0.5s delay)
  setTimeout(() => {
    const isSent = Math.random() < 0.95; // 95% sent success rate
    if (!isSent) {
      sendWebhook(callbackUrl, {
        recipientId,
        status: 'failed',
        failureReason: 'SPAM_FILTER_REJECTED',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    sendWebhook(callbackUrl, {
      recipientId,
      status: 'sent',
      timestamp: new Date().toISOString(),
    });

    // 2. Delivered status callback (1.0s delay after sent)
    setTimeout(() => {
      const isDelivered = Math.random() < 0.90; // 90% delivery success rate of sent messages
      if (!isDelivered) {
        sendWebhook(callbackUrl, {
          recipientId,
          status: 'failed',
          failureReason: 'UNDELIVERABLE_CARRIER_ISSUE',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      sendWebhook(callbackUrl, {
        recipientId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
      });

      // 3. Opened status callback (1.5s delay after delivered, 50% probability)
      setTimeout(() => {
        const isOpened = Math.random() < 0.50;
        if (!isOpened) return;

        sendWebhook(callbackUrl, {
          recipientId,
          status: 'opened',
          timestamp: new Date().toISOString(),
        });

        // 4. Clicked/Read status callback (1.0s delay after opened, 20% probability)
        setTimeout(() => {
          const isClicked = Math.random() < 0.20;
          if (!isClicked) return;

          sendWebhook(callbackUrl, {
            recipientId,
            status: 'clicked',
            timestamp: new Date().toISOString(),
          });
        }, 1000);
      }, 1500);
    }, 1000);
  }, 500);
}

// Inbound Messaging Endpoint
app.post('/send', (req, res) => {
  const { recipientId, customerId, customerName, destination, channel, message, callbackUrl } = req.body as SendRequest;

  if (!recipientId || !destination || !channel || !message || !callbackUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const logEntry = {
    recipientId,
    customerId,
    customerName,
    destination,
    channel,
    message,
    status: 'queued',
    timestamp: new Date().toISOString(),
  };

  messageLog.push(logEntry);
  console.log(`[Simulator Received] Queued sending ${channel} message to ${customerName} (${destination})`);

  // Start asynchronous lifecycle triggers
  runMessageLifecycle(req.body);

  return res.json({
    recipientId,
    status: 'queued',
    message: 'Message accepted and queued for delivery simulation',
  });
});

// Logs Endpoint
app.get('/logs', (req, res) => {
  res.json(messageLog);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Xeno Message Delivery Simulator' });
});

app.listen(PORT, () => {
  console.log(`Xeno Channel Simulator running on port ${PORT}`);
});

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tags: string; // JSON string or comma-separated tags
  totalSpend: number;
  totalOrders: number;
  lastOrderDate: Date | string | null;
  createdAt: Date | string;
  orders?: Order[];
  recipients?: CampaignRecipient[];
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  orderValue: number;
  items: string; // JSON string of [{name, qty, price}]
  orderDate: Date | string;
  status: string; // placed, fulfilled, cancelled
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  rulesJson: string; // JSON string containing SegmentRules
  naturalLanguageQuery: string | null;
  createdBy: string; // ai or manual
  createdAt: Date | string;
  campaigns?: Campaign[];
}

export interface SegmentRules {
  cities?: string[];
  minSpend?: number;
  maxSpend?: number;
  minOrders?: number;
  lastOrderWithinDays?: number;
  tagsInclude?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  segment?: Segment;
  channel: string; // email, sms, whatsapp, rcs
  messageTemplate: string;
  aiGenerated: boolean;
  aiReasoning: string | null;
  status: string; // draft, queued, sending, completed, failed
  createdAt: Date | string;
  launchedAt: Date | string | null;
  recipients?: CampaignRecipient[];
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  campaign?: Campaign;
  customerId: string;
  customer?: Customer;
  personalizedMessage: string;
  status: string; // pending, sent, delivered, failed, opened, read, clicked
  sentAt: Date | string | null;
  deliveredAt: Date | string | null;
  openedAt: Date | string | null;
  clickedAt: Date | string | null;
  failureReason: string | null;
  retryCount: number;
  events?: CommunicationEvent[];
}

export interface CommunicationEvent {
  id: string;
  campaignRecipientId: string;
  recipient?: CampaignRecipient;
  eventType: string; // sent, delivered, failed, opened, read, clicked
  metadata: string | null; // JSON string of event metadata
  occurredAt: Date | string;
}

// Ingestion structures
export interface IngestCustomerDTO {
  name: string;
  email: string;
  phone: string;
  city: string;
  tags?: string[];
}

export interface IngestOrderDTO {
  email: string; // Used to look up customer
  orderValue: number;
  items: { name: string; qty: number; price: number }[];
  orderDate: string;
  status: string;
}

// Chat API structures
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  // UI Preview metadata
  preview?: {
    type: 'segment' | 'campaign' | 'analytics';
    data: any;
  };
}

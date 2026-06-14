import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { config, prisma } from '../config/config';
import { evaluateSegment } from '../services/segmentEvaluator';
import queueService from '../queue/QueueService';
import { SegmentRules } from '@xeno/shared';

// Define the response interface
export interface AgentResponse {
  thought: string;
  message: string;
  toolCall?: {
    name: string;
    arguments: any;
  };
  toolResult?: any;
}

// -------------------------------------------------------------
// 1. Tool Implementations
// -------------------------------------------------------------

export const tools = {
  build_segment: async (args: { query: string }) => {
    const rules = await parseSegmentRulesWithAI(args.query);
    const matched = await evaluateSegment(rules);
    return {
      rules,
      count: matched.length,
      sample: matched.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        city: c.city,
        totalSpend: c.totalSpend,
        totalOrders: c.totalOrders,
      })),
    };
  },

  create_segment: async (args: { name: string; description: string; rules: SegmentRules; query: string }) => {
    const segment = await prisma.segment.create({
      data: {
        name: args.name,
        description: args.description,
        rulesJson: JSON.stringify(args.rules),
        naturalLanguageQuery: args.query,
        createdBy: 'ai',
      },
    });
    return segment;
  },

  draft_campaign: async (args: { segmentId: string; intent: string }) => {
    const segment = await prisma.segment.findUnique({ where: { id: args.segmentId } });
    if (!segment) throw new Error('Segment not found');

    // Recommend channel based on keywords
    const intentLower = args.intent.toLowerCase();
    let channel = 'email';
    if (intentLower.includes('whatsapp') || intentLower.includes('discount') || intentLower.includes('offer')) {
      channel = 'whatsapp';
    } else if (intentLower.includes('sms') || intentLower.includes('urgent') || intentLower.includes('quick')) {
      channel = 'sms';
    } else if (intentLower.includes('rcs')) {
      channel = 'rcs';
    }

    // Dynamic messaging templates (featuring order history categories and bank card promotions)
    let messageTemplate = 'Hey [Name]! We noticed you love our [FavoriteCategory] gear (especially the [FavoriteProduct]). Here is an exclusive offer: [CategoryOffer]! To top it off, buy today to get [CardOffer].';
    if (intentLower.includes('reactivate') || intentLower.includes('miss')) {
      messageTemplate = 'Hi [Name], we miss you! We have special offers in our [FavoriteCategory] line tailored just for you. Get [CategoryOffer] and an extra cash back: [CardOffer]. Shop now!';
    }

    return {
      name: `${segment.name} Promo Campaign`,
      segmentId: args.segmentId,
      channel,
      messageTemplate,
      aiReasoning: `Recommended ${channel} channel for prompt "${args.intent}" to maximize reach in ${segment.name}.`,
    };
  },

  create_campaign: async (args: { name: string; segmentId: string; channel: string; messageTemplate: string; aiReasoning?: string }) => {
    const campaign = await prisma.campaign.create({
      data: {
        name: args.name,
        segmentId: args.segmentId,
        channel: args.channel,
        messageTemplate: args.messageTemplate,
        aiGenerated: true,
        aiReasoning: args.aiReasoning || 'Created via AI agent request.',
        status: 'draft',
      },
    });
    return campaign;
  },

  launch_campaign: async (args: { campaignId: string }) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    // Enqueue
    await queueService.addCampaignJob(campaign.id);

    return {
      campaignId: campaign.id,
      status: 'queued',
      message: 'Campaign launched successfully and added to dispatch queue.',
    };
  },

  get_campaign_analytics: async (args: { campaignId: string }) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: args.campaignId },
      include: {
        recipients: {
          include: {
            events: true,
          },
        },
      },
    });

    if (!campaign) throw new Error('Campaign not found');

    const total = campaign.recipients.length;
    const sent = campaign.recipients.filter((r) => ['sent', 'delivered', 'opened', 'clicked'].includes(r.status)).length;
    const delivered = campaign.recipients.filter((r) => ['delivered', 'opened', 'clicked'].includes(r.status)).length;
    const opened = campaign.recipients.filter((r) => ['opened', 'clicked'].includes(r.status)).length;
    const clicked = campaign.recipients.filter((r) => r.status === 'clicked').length;
    const failed = campaign.recipients.filter((r) => r.status === 'failed').length;

    return {
      campaignId: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
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
    };
  },

  get_all_campaigns: async () => {
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: true,
        recipients: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => {
      const total = campaign.recipients.length;
      const opened = campaign.recipients.filter((r) => ['opened', 'clicked'].includes(r.status)).length;
      const clicked = campaign.recipients.filter((r) => r.status === 'clicked').length;
      return {
        id: campaign.id,
        name: campaign.name,
        segmentName: campaign.segment.name,
        channel: campaign.channel,
        status: campaign.status,
        createdAt: campaign.createdAt,
        totalRecipients: total,
        openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      };
    });
  },
};

// -------------------------------------------------------------
// 2. Fallback Rule Parser (Mock AI Segment Builder)
// -------------------------------------------------------------
async function parseSegmentRulesWithAI(query: string): Promise<SegmentRules> {
  const queryLower = query.toLowerCase();
  const rules: SegmentRules = {};

  // Find cities
  const citiesCatalog = ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad', 'jaipur', 'ahmedabad', 'gurugram'];
  const matchedCities = citiesCatalog.filter((c) => queryLower.includes(c));
  if (matchedCities.length > 0) {
    rules.cities = matchedCities.map((c) => c.charAt(0).toUpperCase() + c.slice(1));
  }

  // Find orders count
  const orderRegex = /(?:ordered|orders|placed|purchased)\s+(?:at least|more than|>=|>)?\s*(\d+)/i;
  const orderMatch = queryLower.match(orderRegex);
  if (orderMatch) {
    rules.minOrders = parseInt(orderMatch[1]);
  } else if (queryLower.includes('ordered at least 3')) {
    rules.minOrders = 3;
  }

  // Find spend amount
  const spendRegex = /(?:spent|spend|ordered value|purchases)\s+(?:at least|more than|>=|>)?\s*(\d+)/i;
  const spendMatch = queryLower.match(spendRegex);
  if (spendMatch) {
    rules.minSpend = parseFloat(spendMatch[1]);
  }

  // Find tags
  const tagsCatalog = ['vip', 'active', 'inactive', 'churn-risk', 'new-user', 'tech-enthusiast'];
  const matchedTags = tagsCatalog.filter((t) => queryLower.includes(t));
  if (matchedTags.length > 0) {
    rules.tagsInclude = matchedTags;
  }

  // Recency search
  const daysRegex = /last\s+(\d+)\s+days/i;
  const daysMatch = queryLower.match(daysRegex);
  if (daysMatch) {
    rules.lastOrderWithinDays = parseInt(daysMatch[1]);
  }

  return rules;
}

// -------------------------------------------------------------
// 3. AI Agent Execution Wrapper
// -------------------------------------------------------------

const SYSTEM_PROMPT = `
You are the Xeno AI Marketing Agent. You interact with a marketer to build customer segments, draft/launch communication campaigns, and analyze performance funnels.

Always respond in a JSON structure containing:
{
  "thought": "your chain-of-thought reasoning",
  "message": "your reply to the user (keep it concise, professional, marketing-focused)",
  "toolCall": { // Optional: if you need to run a tool
    "name": "tool_name",
    "arguments": { ... }
  }
}

Available tools:
1. build_segment(query: string) -> returns rules, count, and sample customers
2. create_segment(name: string, description: string, rules: object, query: string) -> saves segment to DB
3. draft_campaign(segmentId: string, intent: string) -> suggests templates/channels
4. create_campaign(name: string, segmentId: string, channel: string, messageTemplate: string) -> saves campaign as draft
5. launch_campaign(campaignId: string) -> dispatches messaging runs
6. get_campaign_analytics(campaignId: string) -> returns conversion rates
7. get_all_campaigns() -> returns lists of all campaigns

To prompt segments, look for words like "segment", "filter", "find customers".
To prompt campaigns, look for "draft", "campaign", "offer", "discount", "send template".
To launch campaigns, look for "launch", "send now", "deliver".
To analyze campaigns, look for "analytics", "funnel", "conversion", "performance".

Supported Personalization Tokens in messageTemplate:
- [Name] : Customer full name
- [City] : Customer city
- [Email] : Customer email address
- [FavoriteProduct] : Most frequently purchased product name from their order history
- [FavoriteCategory] : Category based on their purchase history (e.g. "Tech & Gadgets", "Lifestyle Accessories")
- [CategoryOffer] : Custom category coupon offer (e.g. "an exclusive 15% discount on Tech Setup essentials (code: GEEK15)")
- [CardOffer] : Premium card cashback/discount offer selected dynamically based on their total historical spend (HDFC premium cards, ICICI, SBI credit cards)

Ensure your drafted messageTemplate includes these tokens to send highly personalized category and card offers.
`;

export async function runAgent(userMessage: string, history: any[] = []): Promise<AgentResponse> {
  const messageLower = userMessage.toLowerCase();

  // A. EXTREMELY ROBUST REGEX MOCK AGENT LOOP
  // If NO API KEYS are available, run a deterministic flow matching common chat queries
  if (!config.geminiApiKey && !config.anthropicApiKey) {
    console.log('[Agent] No AI credentials found. Operating in fallback mock-AI mode.');

    // 1. Analytics Check
    if (messageLower.includes('analytics') || messageLower.includes('how did') || messageLower.includes('performance')) {
      const campaigns = await tools.get_all_campaigns();
      if (campaigns.length > 0) {
        const report = await tools.get_campaign_analytics({ campaignId: campaigns[0].id });
        return {
          thought: 'User is requesting analytics. Selecting latest campaign to view funnel statistics.',
          message: `Here are the latest conversion metrics for the campaign: **${report.name}**.`,
          toolCall: {
            name: 'get_campaign_analytics',
            arguments: { campaignId: campaigns[0].id },
          },
          toolResult: report,
        };
      }
    }

    // 2. Launch Campaign Check
    const launchMatch = messageLower.match(/launch\s+campaign\s+([a-f0-9-]+)/i) || messageLower.match(/launch\s+([a-f0-9-]+)/i);
    if (launchMatch || messageLower.includes('launch campaign') || messageLower.includes('launch the draft')) {
      // Find latest draft campaign
      const drafts = await prisma.campaign.findMany({ where: { status: 'draft' }, orderBy: { createdAt: 'desc' } });
      if (drafts.length > 0) {
        const campaignId = drafts[0].id;
        const result = await tools.launch_campaign({ campaignId });
        return {
          thought: `Launching draft campaign ${campaignId} via background queue.`,
          message: `Campaign **${drafts[0].name}** has been successfully launched! Dispatches are underway. You can track progress in the Campaigns panel.`,
          toolCall: {
            name: 'launch_campaign',
            arguments: { campaignId },
          },
          toolResult: result,
        };
      }
    }

    // 3. Create Campaign Check
    if (messageLower.includes('create campaign') || messageLower.includes('save campaign')) {
      const latestSegment = await prisma.segment.findFirst({ orderBy: { createdAt: 'desc' } });
      if (latestSegment) {
        const draft = await tools.draft_campaign({ segmentId: latestSegment.id, intent: userMessage });
        const result = await tools.create_campaign({
          name: draft.name,
          segmentId: draft.segmentId,
          channel: draft.channel,
          messageTemplate: draft.messageTemplate,
        });
        return {
          thought: `Creating campaign draft for segment: ${latestSegment.name}`,
          message: `I have saved the campaign **${result.name}** as a draft. You can customize the template or trigger launch directly!`,
          toolCall: {
            name: 'create_campaign',
            arguments: result,
          },
          toolResult: result,
        };
      }
    }

    // 4. Draft Campaign Check
    if (messageLower.includes('draft') || messageLower.includes('discount') || messageLower.includes('offer')) {
      const latestSegment = await prisma.segment.findFirst({ orderBy: { createdAt: 'desc' } });
      if (latestSegment) {
        const result = await tools.draft_campaign({ segmentId: latestSegment.id, intent: userMessage });
        return {
          thought: 'Drafting new campaign message based on selected segment.',
          message: `I've prepared a **${result.channel.toUpperCase()}** campaign draft for the segment: **${latestSegment.name}**.`,
          toolCall: {
            name: 'draft_campaign',
            arguments: { segmentId: latestSegment.id, intent: userMessage },
          },
          toolResult: result,
        };
      } else {
        return {
          thought: 'Attempted to draft campaign, but no segment exists.',
          message: 'I cannot draft a campaign yet because no segment exists. Please ask me to create a customer segment first!',
        };
      }
    }

    // 5. Create Segment Check
    if (messageLower.includes('save segment') || messageLower.includes('create segment')) {
      const rules = await parseSegmentRulesWithAI(userMessage);
      const name = rules.cities ? `${rules.cities.join('/')} Customers` : 'Custom Audience';
      const result = await tools.create_segment({
        name,
        description: `Segment created dynamically for rules: ${JSON.stringify(rules)}`,
        rules,
        query: userMessage,
      });
      return {
        thought: 'Saving customer segment into database storage.',
        message: `Excellent! Segment **${result.name}** has been successfully saved. Would you like me to draft a campaign for this audience?`,
        toolCall: {
          name: 'create_segment',
          arguments: { name, description: result.description, rules, query: userMessage },
        },
        toolResult: result,
      };
    }

    // 6. Segment Rules Build Check (Default search)
    if (messageLower.includes('segment') || messageLower.includes('delhi') || messageLower.includes('ordered') || messageLower.includes('spend') || messageLower.includes('customers')) {
      const result = await tools.build_segment({ query: userMessage });
      return {
        thought: 'Parsing natural language search query to build customer segment rules.',
        message: `I parsed your request into filter rules. Found **${result.count} matching customers** in the database.`,
        toolCall: {
          name: 'build_segment',
          arguments: { query: userMessage },
        },
        toolResult: result,
      };
    }

    // Default chat
    return {
      thought: 'Standard greeting message response.',
      message: 'Hello! I am Xeno CRM AI assistant. Ask me to: \n- *Find customers from Delhi who ordered at least 3 times*\n- *Draft a campaign with a 25% discount*\n- *Check campaign performance analytics*',
    };
  }

  // B. LLM AGENT INVOCATION (GEMINI / CLAUDE)
  let textOutput = '';
  try {
    if (config.geminiApiKey) {
      console.log('[Agent] Invoking Gemini API...');
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const contents = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...history.map((h) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: typeof h.content === 'string' ? h.content : JSON.stringify(h.content) }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const result = await model.generateContent({ contents });
      textOutput = result.response.text();
    } else if (config.anthropicApiKey) {
      console.log('[Agent] Invoking Anthropic Claude API...');
      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          ...history.map((h) => ({
            role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: h.content,
          })),
          { role: 'user', content: userMessage },
        ],
      });
      if (response.content[0].type === 'text') {
        textOutput = response.content[0].text;
      }
    }

    // Parse output JSON
    // Clean codeblock formatting (```json ... ```) if present
    const cleanJSON = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJSON) as AgentResponse;

    // Execute tool if requested
    if (parsed.toolCall) {
      const toolName = parsed.toolCall.name as keyof typeof tools;
      if (tools[toolName]) {
        console.log(`[Agent] Executing tool: ${toolName}`);
        try {
          const toolResult = await (tools[toolName] as any)(parsed.toolCall.arguments);
          parsed.toolResult = toolResult;
        } catch (err: any) {
          console.error(`[Agent] Tool execution failed:`, err.message);
          parsed.message += ` (Tool error: ${err.message})`;
        }
      }
    }

    return parsed;
  } catch (error: any) {
    console.error('[Agent] LLM API Call failed:', error.message);
    // Fall back to Mock mode seamlessly if API calls crash (e.g. rate limits, network)
    const mockConfig = config;
    config.geminiApiKey = null;
    config.anthropicApiKey = null;
    const response = await runAgent(userMessage, history);
    // Restore
    config.geminiApiKey = mockConfig.geminiApiKey;
    config.anthropicApiKey = mockConfig.anthropicApiKey;
    return response;
  }
}

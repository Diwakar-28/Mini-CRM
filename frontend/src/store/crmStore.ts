import { create } from 'zustand';
import apiClient from '../api/apiClient';
import { ChatMessage, Segment } from '@xeno/shared';

interface CRMState {
  // Chat
  messages: ChatMessage[];
  chatLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  addSystemMessage: (content: string, preview?: { type: 'segment' | 'campaign' | 'analytics'; data: any }) => void;

  // Campaigns
  campaigns: any[];
  campaignDetails: any | null;
  campaignsLoading: boolean;
  fetchCampaigns: () => Promise<void>;
  fetchCampaignDetails: (id: string) => Promise<void>;
  createCampaign: (data: { name: string; segmentId: string; channel: string; messageTemplate: string }) => Promise<any>;
  launchCampaign: (id: string) => Promise<void>;

  // Segments
  segments: Segment[];
  segmentsLoading: boolean;
  fetchSegments: () => Promise<void>;
  createSegment: (data: { name: string; description: string; rules: any; query?: string }) => Promise<any>;
  previewSegmentRules: (rules: any) => Promise<{ count: number; sample: any[] }>;

  // Dashboard Analytics
  analytics: any | null;
  analyticsLoading: boolean;
  fetchAnalytics: () => Promise<void>;
}

export const useCRMStore = create<CRMState>()((set, get) => ({
  // Chat state
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Xeno AI CRM Agent. I can help you query your customer database, build segments, draft messaging campaigns, and track real-time delivery funnels. Try asking: \n\n*"Find customers from Delhi who have ordered at least 3 times"*',
      createdAt: new Date().toISOString(),
    },
  ],
  chatLoading: false,

  sendMessage: async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      chatLoading: true,
    }));

    try {
      // Map history for API
      const history = get().messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await apiClient.post('/chat', { message: text, history });
      const agentRes = res.data.response;

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: agentRes.message || 'I processed your request.',
        createdAt: new Date().toISOString(),
        preview: agentRes.toolCall ? {
          type: agentRes.toolCall.name,
          data: agentRes.toolResult,
        } : undefined,
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
      }));

      // Proactively refresh other stores if a tool created data
      if (agentRes.toolCall) {
        const toolName = agentRes.toolCall.name;
        if (toolName === 'create_segment') {
          get().fetchSegments();
        } else if (toolName === 'create_campaign' || toolName === 'launch_campaign') {
          get().fetchCampaigns();
          get().fetchAnalytics();
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err.message);
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `I encountered an error communicating with the CRM service: ${err.message}`,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      set({ chatLoading: false });
    }
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am your Xeno AI CRM Agent. I can help you query your customer database, build segments, draft messaging campaigns, and track real-time delivery funnels. Try asking: \n\n*"Find customers from Delhi who have ordered at least 3 times"*',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  },

  addSystemMessage: (content: string, preview?: { type: 'segment' | 'campaign' | 'analytics'; data: any }) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
          preview,
        },
      ],
    }));
  },

  // Campaigns state
  campaigns: [],
  campaignDetails: null,
  campaignsLoading: false,

  fetchCampaigns: async () => {
    set({ campaignsLoading: true });
    try {
      const res = await apiClient.get('/campaigns');
      set({ campaigns: res.data });
    } catch (err) {
      console.error('Fetch campaigns error:', err);
    } finally {
      set({ campaignsLoading: false });
    }
  },

  fetchCampaignDetails: async (id: string) => {
    try {
      const res = await apiClient.get(`/campaigns/${id}`);
      set({ campaignDetails: res.data });
    } catch (err) {
      console.error('Fetch campaign details error:', err);
    }
  },

  createCampaign: async (data) => {
    try {
      const res = await apiClient.post('/campaigns', data);
      await get().fetchCampaigns();
      return res.data;
    } catch (err) {
      console.error('Create campaign error:', err);
      throw err;
    }
  },

  launchCampaign: async (id: string) => {
    try {
      await apiClient.post(`/campaigns/${id}/launch`);
      await get().fetchCampaigns();
      if (get().campaignDetails?.id === id) {
        await get().fetchCampaignDetails(id);
      }
    } catch (err) {
      console.error('Launch campaign error:', err);
    }
  },

  // Segments state
  segments: [],
  segmentsLoading: false,

  fetchSegments: async () => {
    set({ segmentsLoading: true });
    try {
      const res = await apiClient.get('/segments');
      set({ segments: res.data });
    } catch (err) {
      console.error('Fetch segments error:', err);
    } finally {
      set({ segmentsLoading: false });
    }
  },

  createSegment: async (data) => {
    try {
      const res = await apiClient.post('/segments', data);
      await get().fetchSegments();
      return res.data;
    } catch (err) {
      console.error('Create segment error:', err);
      throw err;
    }
  },

  previewSegmentRules: async (rules) => {
    try {
      const res = await apiClient.post('/segments/preview', { rules });
      return res.data;
    } catch (err) {
      console.error('Preview segment error:', err);
      return { count: 0, sample: [] };
    }
  },

  // Dashboard state
  analytics: null,
  analyticsLoading: false,

  fetchAnalytics: async () => {
    set({ analyticsLoading: true });
    try {
      const res = await apiClient.get('/analytics');
      set({ analytics: res.data });
    } catch (err) {
      console.error('Fetch analytics error:', err);
    } finally {
      set({ analyticsLoading: false });
    }
  },
}));

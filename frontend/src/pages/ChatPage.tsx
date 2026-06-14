import React, { useState, useRef, useEffect } from 'react';
import { useCRMStore } from '../store/crmStore';
import { Send, Sparkles, Plus, Play, Info, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';

export default function ChatPage() {
  const { messages, chatLoading, sendMessage, clearChat, createSegment, createCampaign, launchCampaign, addSystemMessage } = useCRMStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    sendMessage(input);
    setInput('');
  };

  const selectSuggestion = (text: string) => {
    if (chatLoading) return;
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Top action header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI Copilot Chat</h2>
          <p className="text-xs text-slate-400">Describe what segments or campaigns you want to create.</p>
        </div>
        <button
          onClick={clearChat}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Reset Session
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 rounded-2xl border border-obsidian-border bg-obsidian-card/40 backdrop-blur-md space-y-6 mb-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] flex flex-col space-y-1">
                {/* Sender Indicator */}
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 ${isUser ? 'text-accent-teal text-right' : 'text-accent-purple'}`}>
                  {isUser ? 'Marketer' : 'Xeno AI Agent'}
                </span>

                {/* Main Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-gradient-to-tr from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 text-slate-100 rounded-tr-none'
                      : 'bg-gradient-to-tr from-slate-900 to-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>

                {/* Render Interactive Action Card if attachment exists */}
                {m.preview && (
                  <div className="mt-3">
                    <ActionCard type={m.preview.type} data={m.preview.data} createSegment={createSegment} createCampaign={createCampaign} launchCampaign={launchCampaign} addSystemMessage={addSystemMessage} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator bubble */}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] flex flex-col space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-purple">
                Thinking...
              </span>
              <div className="px-5 py-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800/80 border border-slate-700/50 text-slate-400 rounded-tl-none flex items-center gap-3">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-accent-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-accent-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Agent parsing natural language query...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested actions when stream is empty */}
      {messages.length === 1 && !chatLoading && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => selectSuggestion('Create a segment of customers from Delhi who have ordered at least 3 times')}
            className="p-3 text-left rounded-xl border border-obsidian-border bg-obsidian-card/30 hover:bg-slate-800/40 text-xs text-slate-300 transition-all flex items-start gap-2 hover:border-accent-teal/30"
          >
            <Sparkles className="h-4 w-4 text-accent-teal shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Segment Delhi Users</p>
              <p className="text-slate-400 text-[10px]">Filter for Delhi audience with 3+ orders</p>
            </div>
          </button>
          <button
            onClick={() => selectSuggestion('Segment customers from Mumbai with total spend of 15000')}
            className="p-3 text-left rounded-xl border border-obsidian-border bg-obsidian-card/30 hover:bg-slate-800/40 text-xs text-slate-300 transition-all flex items-start gap-2 hover:border-accent-teal/30"
          >
            <Sparkles className="h-4 w-4 text-accent-teal shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Segment Big Spenders</p>
              <p className="text-slate-400 text-[10px]">Filter Mumbai customers with high spent values</p>
            </div>
          </button>
        </div>
      )}

      {/* Inbound Text Form */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Ask me to build segments, draft campaigns, or get analytics..."
          className="flex-1 bg-obsidian-card/80 border border-obsidian-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-teal text-slate-200 transition-colors"
          disabled={chatLoading}
        />
        <button
          type="submit"
          disabled={chatLoading || !input.trim()}
          className="bg-gradient-to-r from-accent-teal to-accent-purple hover:opacity-90 disabled:opacity-40 text-white rounded-xl px-4 flex items-center justify-center transition-all duration-200"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// Interactive Action Card Dispatcher
// -------------------------------------------------------------
function ActionCard({
  type,
  data,
  createSegment,
  createCampaign,
  launchCampaign,
  addSystemMessage,
}: {
  type: string;
  data: any;
  createSegment: any;
  createCampaign: any;
  launchCampaign: any;
  addSystemMessage: any;
}) {
  const [segmentName, setSegmentName] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [campName, setCampName] = useState('');
  const [campChannel, setCampChannel] = useState('whatsapp');
  const [campTemplate, setCampTemplate] = useState('');
  const [campDraftId, setCampDraftId] = useState<string | null>(null);
  const [isCampSaved, setIsCampSaved] = useState(false);
  const [isCampLaunched, setIsCampLaunched] = useState(false);
  
  const [analyticsMetrics, setAnalyticsMetrics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pre-fill fields from tool results
  useEffect(() => {
    if (type === 'build_segment' && data?.rules) {
      const citiesStr = data.rules.cities?.join('/') || 'Global';
      setSegmentName(`${citiesStr} Customers Segment`);
      setSegmentDesc(`Segment of customers from ${citiesStr} based on AI filtering.`);
    } else if (type === 'draft_campaign' && data) {
      setCampName(data.name || 'Promo Campaign');
      setCampChannel(data.channel || 'whatsapp');
      setCampTemplate(data.messageTemplate || '');
    } else if (type === 'create_campaign' && data) {
      setCampName(data.name);
      setCampChannel(data.channel);
      setCampTemplate(data.messageTemplate);
      setCampDraftId(data.id);
      setIsCampSaved(true);
    } else if (type === 'get_campaign_analytics' && data) {
      setAnalyticsMetrics(data);
    }
  }, [type, data]);

  // A. Save Segment Action
  const handleSaveSegment = async () => {
    if (!segmentName.trim() || isSaved) return;
    try {
      const res = await createSegment({
        name: segmentName,
        description: segmentDesc,
        rules: data.rules,
        query: data.query,
      });
      setIsSaved(true);
      addSystemMessage(`Successfully created segment **${res.name}**! 

Would you like me to draft a campaign for this segment? Try typing: 
*"Draft a WhatsApp campaign offering a 20% discount."*`);
    } catch (e) {
      console.error(e);
    }
  };

  // B. Save / Create Campaign Action
  const handleCreateCampaign = async () => {
    if (!campName.trim() || isCampSaved) return;
    try {
      const res = await createCampaign({
        name: campName,
        segmentId: data.segmentId,
        channel: campChannel,
        messageTemplate: campTemplate,
      });
      setCampDraftId(res.id);
      setIsCampSaved(true);
      addSystemMessage(`Campaign **${res.name}** has been saved as a draft. 

You can launch this campaign now by clicking the **Launch Campaign** button in the draft card above!`);
    } catch (e) {
      console.error(e);
    }
  };

  // C. Launch Campaign Action
  const handleLaunchCampaign = async () => {
    const targetId = campDraftId || data.campaignId || data.id;
    if (!targetId || isCampLaunched) return;
    try {
      await launchCampaign(targetId);
      setIsCampLaunched(true);
      addSystemMessage(`Campaign successfully launched into simulator queue! 

Messaging deliveries are starting. You can view the live conversion progress in the **Campaigns** tab or ask me:
*"How did my campaigns perform?"*`);
    } catch (e) {
      console.error(e);
    }
  };

  // D. Refresh Analytics Funnel
  const refreshAnalytics = async () => {
    if (refreshing || !data?.campaignId) return;
    setRefreshing(true);
    try {
      const useCRMStoreState = useCRMStore.getState();
      await useCRMStoreState.fetchCampaignDetails(data.campaignId);
      const updated = useCRMStoreState.campaignDetails;
      if (updated && updated.metrics) {
        setAnalyticsMetrics(updated);
      }
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  // 1. Build Segment Card Renderer
  if (type === 'build_segment') {
    return (
      <div className="glass-card rounded-2xl p-4 border-l-4 border-l-accent-teal mt-2">
        <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-accent-teal" /> Segment Filter Preview
        </h3>
        
        {/* Rules info */}
        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 text-xs mb-3 space-y-1 text-slate-300">
          <p><span className="font-semibold text-slate-400">Target Cities:</span> {data.rules?.cities?.join(', ') || 'All Cities'}</p>
          {data.rules?.minSpend !== undefined && <p><span className="font-semibold text-slate-400">Spend:</span> &gt;= ₹{data.rules.minSpend}</p>}
          {data.rules?.minOrders !== undefined && <p><span className="font-semibold text-slate-400">Orders:</span> &gt;= {data.rules.minOrders} order(s)</p>}
          {data.rules?.tagsInclude && <p><span className="font-semibold text-slate-400">Tags Required:</span> {data.rules.tagsInclude.join(', ')}</p>}
          {data.rules?.lastOrderWithinDays && <p><span className="font-semibold text-slate-400">Ordered Within:</span> {data.rules.lastOrderWithinDays} days</p>}
        </div>

        {/* Count Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-400">Audience size:</span>
          <span className="px-2 py-0.5 rounded bg-accent-teal/20 text-accent-teal text-xs font-bold font-mono">
            {data.count} customer{data.count !== 1 && 's'} matched
          </span>
        </div>

        {/* Customer Sample profiles */}
        {data.sample && data.sample.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Sample Matches</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.sample.map((c: any) => (
                <div key={c.id} className="bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs shrink-0 w-36">
                  <p className="font-bold text-slate-200 truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{c.city} • {c.totalOrders} order{c.totalOrders !== 1 && 's'}</p>
                  <p className="text-[10px] text-accent-teal font-medium mt-0.5 font-mono">₹{c.totalSpend.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Segment configuration fields */}
        {!isSaved ? (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Segment Name</label>
              <input
                type="text"
                value={segmentName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSegmentName(e.target.value)}
                placeholder="Give this segment a name"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 mt-1 focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Description</label>
              <textarea
                value={segmentDesc}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSegmentDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 mt-1 focus:outline-none focus:border-accent-teal h-14 resize-none"
              />
            </div>
            <button
              onClick={handleSaveSegment}
              className="w-full bg-accent-teal text-slate-950 font-bold rounded-lg py-2 text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Save Customer Segment
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400 font-medium flex items-center gap-2">
            <span>✓ Segment saved successfully to database!</span>
          </div>
        )}
      </div>
    );
  }

  // 2. Draft Campaign Card / Create Campaign Draft
  if (type === 'draft_campaign' || type === 'create_campaign') {
    return (
      <div className="glass-card rounded-2xl p-4 border-l-4 border-l-accent-purple mt-2">
        <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent-purple" /> Campaign Messaging Draft
        </h3>

        {data.aiReasoning && (
          <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 mb-3 flex items-start gap-1.5 leading-relaxed">
            <Info className="h-3.5 w-3.5 text-accent-purple shrink-0 mt-0.5" />
            <span>{data.aiReasoning}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Campaign Name</label>
            <input
              type="text"
              value={campName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 mt-1 focus:outline-none focus:border-accent-purple"
              disabled={isCampSaved || isCampLaunched}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Channel</label>
              <select
                value={campChannel}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCampChannel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 mt-1 focus:outline-none focus:border-accent-purple"
                disabled={isCampSaved || isCampLaunched}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="rcs">RCS</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-[10px] text-slate-500 font-mono italic leading-none mb-2">
                Supported templates:
                <br />[Name], [City], [Email]
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Personalized Template Body</label>
            <textarea
              value={campTemplate}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampTemplate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 mt-1 focus:outline-none focus:border-accent-purple h-20 resize-none font-sans leading-relaxed"
              disabled={isCampSaved || isCampLaunched}
            />
          </div>

          {!isCampSaved ? (
            <button
              onClick={handleCreateCampaign}
              className="w-full bg-accent-purple text-white font-bold rounded-lg py-2 text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Save Campaign Draft
            </button>
          ) : !isCampLaunched ? (
            <button
              onClick={handleLaunchCampaign}
              className="w-full bg-gradient-to-r from-accent-teal to-accent-purple text-white font-bold rounded-lg py-2 text-xs transition-opacity hover:opacity-95 flex items-center justify-center gap-1.5 shadow-glow-teal animate-pulse"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Launch Campaign Executions
            </button>
          ) : (
            <div className="bg-teal-950/20 border border-teal-500/20 rounded-lg p-3 text-xs text-teal-400 font-medium flex items-center gap-2">
              <span>✓ Campaign launched and processing deliveries!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Campaign Funnel Analytics Card
  if (type === 'get_campaign_analytics') {
    const m = analyticsMetrics?.metrics || data?.metrics;
    if (!m) return null;

    return (
      <div className="glass-card rounded-2xl p-4 border-l-4 border-l-accent-teal mt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-accent-teal" /> Live Campaign Funnel
          </h3>
          {data.campaignId && (
            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {/* Funnel Progress Bars */}
          <FunnelBar label="Target Audience" count={m.total} pct={100} color="bg-slate-700" />
          <FunnelBar label="Sent" count={m.sent} pct={m.total > 0 ? Math.round((m.sent / m.total) * 100) : 0} color="bg-indigo-500" />
          <FunnelBar label="Delivered" count={m.delivered} pct={m.sent > 0 ? Math.round((m.delivered / m.sent) * 100) : 0} color="bg-teal-500" />
          <FunnelBar label="Opened" count={m.opened} pct={m.delivered > 0 ? Math.round((m.opened / m.delivered) * 100) : 0} color="bg-purple-500" />
          <FunnelBar label="Clicked" count={m.clicked} pct={m.opened > 0 ? Math.round((m.clicked / m.opened) * 100) : 0} color="bg-emerald-500" />

          {m.failed > 0 && (
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-2.5 text-xs text-rose-400 flex items-start gap-1.5 mt-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{m.failed} message delivery failures detected.</p>
                <p className="text-[10px] text-rose-500">Check simulator console for trace logs.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Fallback default save confirmation view
  return (
    <div className="glass-card rounded-xl p-3 border border-slate-800 text-xs text-slate-300">
      <p className="font-bold text-slate-200">AI Tool Executed</p>
      <pre className="mt-1 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-24 bg-slate-950/40 p-2 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// Sub-component for Funnel Bars
function FunnelBar({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{count.toLocaleString()} <span className="text-slate-500 text-[10px]">({pct}%)</span></span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useCRMStore } from '../store/crmStore';
import { Send, Zap, Clock, Info, CheckCircle, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export default function CampaignsPage() {
  const { campaigns, campaignsLoading, fetchCampaigns, campaignDetails, fetchCampaignDetails, launchCampaign } = useCRMStore();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Default select first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns]);

  // Load details when active campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignDetails(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // Real-time polling loop
  // Polls backend every 1.5s if the selected campaign is active or completed,
  // to animate simulator webhook status updates.
  useEffect(() => {
    if (!selectedCampaignId) return;

    const interval = setInterval(() => {
      // Keep polling to watch conversions tick up in real time
      fetchCampaignDetails(selectedCampaignId);
      // Also refresh the summary list
      fetchCampaigns();
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedCampaignId]);

  const handleLaunch = async (id: string) => {
    await launchCampaign(id);
    fetchCampaigns();
    fetchCampaignDetails(id);
  };

  const activeCamp = campaignDetails;
  const isDraft = activeCamp?.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Funnels</h2>
          <p className="text-sm text-slate-400">Launch campaigns and monitor real-time delivery conversions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaigns list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-accent-purple" /> History & Runs
            </h3>

            {campaignsLoading && campaigns.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 animate-pulse">
                Loading campaigns...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No campaigns drafted yet. Go to Chat Copilot to design a campaign first.
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {campaigns.map((camp) => {
                  const isActive = camp.id === selectedCampaignId;
                  const channelLabels: Record<string, string> = {
                    whatsapp: 'WhatsApp 💬',
                    email: 'Email ✉️',
                    sms: 'SMS 📱',
                    rcs: 'RCS ⚡',
                  };

                  return (
                    <button
                      key={camp.id}
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs flex justify-between items-start transition-all ${
                        isActive
                          ? 'bg-gradient-to-tr from-accent-purple/20 to-accent-teal/10 border-accent-purple text-white shadow-glow-purple'
                          : 'bg-slate-900/30 border-obsidian-border hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100 truncate">{camp.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold">{camp.segmentName} • {channelLabels[camp.channel] || camp.channel}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(camp.createdAt).toLocaleDateString()} {new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Status indicator */}
                      <StatusBadge status={camp.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Campaign Details & Live Funnel charts */}
        <div className="lg:col-span-2 space-y-4">
          {activeCamp ? (
            <div className="glass-card rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-obsidian-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-100">{activeCamp.name}</h3>
                    <StatusBadge status={activeCamp.status} />
                  </div>
                  <p className="text-xs text-slate-400">
                    Target segment: <span className="font-semibold text-slate-300">{activeCamp.segment?.name}</span>
                  </p>
                </div>

                {isDraft && (
                  <button
                    onClick={() => handleLaunch(activeCamp.id)}
                    className="bg-gradient-to-r from-accent-teal to-accent-purple text-white px-4 py-2 text-xs font-bold rounded-xl shadow-glow-teal flex items-center gap-1.5 transition-opacity hover:opacity-90 animate-pulse"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" /> Launch Campaign Run
                  </button>
                )}
              </div>

              {/* Message Template preview */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Channel & Template Body</p>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-accent-purple">Channel:</span>
                  <span className="bg-accent-purple/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-accent-purple">{activeCamp.channel}</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
                  {activeCamp.messageTemplate}
                </div>
              </div>

              {/* Live Funnel Progress indicators */}
              {!isDraft && activeCamp.metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-300">Delivery Funnel Analytics</h4>
                    <span className="text-[10px] text-accent-teal font-mono flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Live syncing from Simulator node
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <FunnelMetric label="Targeted" value={activeCamp.metrics.total} color="text-slate-400" />
                    <FunnelMetric label="Sent" value={activeCamp.metrics.sent} pct={activeCamp.metrics.sentRate} color="text-indigo-400" />
                    <FunnelMetric label="Delivered" value={activeCamp.metrics.delivered} pct={activeCamp.metrics.deliveryRate} color="text-teal-400" />
                    <FunnelMetric label="Opened" value={activeCamp.metrics.opened} pct={activeCamp.metrics.openRate} color="text-purple-400" />
                    <FunnelMetric label="Clicked" value={activeCamp.metrics.clicked} pct={activeCamp.metrics.clickRate} color="text-emerald-400" />
                  </div>

                  {/* Visual Bar Stack */}
                  <div className="space-y-3 pt-2">
                    <FunnelProgressBar label="Sent Rate" color="bg-indigo-500" value={activeCamp.metrics.sent} max={activeCamp.metrics.total} />
                    <FunnelProgressBar label="Delivery Rate" color="bg-teal-500" value={activeCamp.metrics.delivered} max={activeCamp.metrics.total} />
                    <FunnelProgressBar label="Open Rate" color="bg-purple-500" value={activeCamp.metrics.opened} max={activeCamp.metrics.total} />
                    <FunnelProgressBar label="Click Rate" color="bg-emerald-500" value={activeCamp.metrics.clicked} max={activeCamp.metrics.total} />
                  </div>
                </div>
              )}

              {/* Individual Recipients Log details */}
              {!isDraft && activeCamp.recipients && activeCamp.recipients.length > 0 && (
                <div className="space-y-3 border-t border-obsidian-border pt-4">
                  <h4 className="text-sm font-bold text-slate-300">Audit Logs (Recipients Activity)</h4>
                  <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800/80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3">Personalized message text</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {activeCamp.recipients.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-900/10 text-[11px]">
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-300">{r.customer?.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{r.customer?.email}</p>
                            </td>
                            <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-400" title={r.personalizedMessage}>
                              {r.personalizedMessage}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                r.status === 'clicked' ? 'bg-emerald-950/30 text-emerald-400' :
                                r.status === 'opened' ? 'bg-purple-950/30 text-purple-400' :
                                r.status === 'delivered' ? 'bg-teal-950/30 text-teal-400' :
                                r.status === 'sent' ? 'bg-indigo-950/30 text-indigo-400' :
                                r.status === 'failed' ? 'bg-rose-950/30 text-rose-400' :
                                'bg-slate-900 text-slate-500'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[9px] text-slate-500">
                              {r.failureReason ? `Err: ${r.failureReason}` : r.clickedAt ? 'Clicked link' : r.openedAt ? 'Opened msg' : 'Delivered'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px] text-center text-slate-500 gap-3 border-dashed border-2 border-slate-800">
              <Send className="h-10 w-10 text-slate-700" />
              <div>
                <p className="font-bold text-slate-400">No campaigns found</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Launch campaigns using the chat copilot, or create runs from existing drafts to trigger dynamic delivery sequences.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Small helper sub-components
// -------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-800 text-slate-400 border-slate-700',
    queued: 'bg-yellow-950/30 text-yellow-500 border-yellow-500/20 animate-pulse',
    sending: 'bg-indigo-950/30 text-indigo-400 border-indigo-500/20',
    completed: 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20',
    failed: 'bg-rose-950/30 text-rose-400 border-rose-500/20',
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider shrink-0 ${styles[status] || 'bg-slate-800 text-slate-400'}`}>
      {status}
    </span>
  );
}

function FunnelMetric({ label, value, pct, color }: { label: string; value: number; pct?: number; color: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between h-20">
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
      <div>
        <p className={`text-lg font-bold font-mono ${color}`}>{value.toLocaleString()}</p>
        {pct !== undefined && <p className="text-[9px] text-slate-500 font-mono">Conv: {pct}%</p>}
      </div>
    </div>
  );
}

function FunnelProgressBar({ label, color, value, max }: { label: string; color: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{pct}%</span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

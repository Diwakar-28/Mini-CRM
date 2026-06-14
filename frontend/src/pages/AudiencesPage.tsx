import React, { useEffect, useState } from 'react';
import { useCRMStore } from '../store/crmStore';
import { Users, Info, ArrowRight, UserCheck, Search, Database } from 'lucide-react';

export default function AudiencesPage() {
  const { segments, segmentsLoading, fetchSegments, previewSegmentRules } = useCRMStore();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [customerPreview, setCustomerPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch segments on mount
  useEffect(() => {
    fetchSegments();
  }, []);

  // Set first segment by default when segments list loads
  useEffect(() => {
    if (segments.length > 0 && !selectedSegmentId) {
      setSelectedSegmentId(segments[0].id);
    }
  }, [segments]);

  // Load preview data when selected segment changes
  useEffect(() => {
    const loadPreview = async () => {
      const activeSeg = segments.find((s) => s.id === selectedSegmentId);
      if (!activeSeg) return;

      setLoadingPreview(true);
      try {
        let rules = activeSeg.rulesJson;
        if (typeof rules === 'string') {
          rules = JSON.parse(rules);
        }
        const res = await previewSegmentRules(rules);
        setCustomerPreview(res);
      } catch (err) {
        console.error('Preview load error:', err);
      }
      setLoadingPreview(false);
    };

    if (selectedSegmentId) {
      loadPreview();
    } else {
      setCustomerPreview(null);
    }
  }, [selectedSegmentId, segments]);

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);

  // Filter customers sample
  const filteredCustomers = customerPreview?.sample.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audiences & Segments</h2>
        <p className="text-sm text-slate-400">View segment rules and review customer matching profiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Segments List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-accent-teal" /> Saved Segments
            </h3>

            {segmentsLoading && segments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 animate-pulse">
                Loading saved segments...
              </div>
            ) : segments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No segments saved yet. Use the Chat Copilot to build and save your first audience!
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {segments.map((seg) => {
                  const isActive = seg.id === selectedSegmentId;
                  const parsedRules = typeof seg.rulesJson === 'string' ? JSON.parse(seg.rulesJson) : seg.rulesJson;

                  return (
                    <button
                      key={seg.id}
                      onClick={() => setSelectedSegmentId(seg.id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all border text-xs flex justify-between items-start ${
                        isActive
                          ? 'bg-gradient-to-tr from-accent-teal/20 to-accent-purple/10 border-accent-teal text-white'
                          : 'bg-slate-900/30 border-obsidian-border hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5 max-w-[85%]">
                        <p className="font-bold text-sm text-slate-100 truncate">{seg.name}</p>
                        <p className="text-slate-400 leading-normal truncate">{seg.description || 'No description'}</p>
                        <div className="flex gap-1 flex-wrap pt-1.5">
                          {parsedRules.cities && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                              {parsedRules.cities.slice(0, 2).join(',')}
                            </span>
                          )}
                          {parsedRules.minSpend && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-accent-teal font-mono text-[9px]">
                              ₹{parsedRules.minSpend}+
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 mt-1 transition-transform ${isActive ? 'translate-x-1 text-accent-teal' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Customer Profiles Preview Table */}
        <div className="lg:col-span-2 space-y-4">
          {selectedSegment ? (
            <div className="glass-card rounded-2xl p-5 flex flex-col h-full min-h-[500px]">
              {/* Segment header and details */}
              <div className="flex justify-between items-start pb-4 border-b border-obsidian-border mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{selectedSegment.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedSegment.description}</p>
                </div>
                {!loadingPreview && customerPreview && (
                  <span className="px-3 py-1 bg-accent-teal/15 text-accent-teal text-xs font-bold rounded-lg border border-accent-teal/15">
                    {customerPreview.count} Profiles Matched
                  </span>
                )}
              </div>

              {/* Natural Query Alert */}
              {selectedSegment.naturalLanguageQuery && (
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-400 mb-4 flex items-center gap-2 font-mono">
                  <Info className="h-4 w-4 text-accent-purple shrink-0" />
                  <span>Query: "{selectedSegment.naturalLanguageQuery}"</span>
                </div>
              )}

              {/* Search bar inside segment */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter customers by name, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-obsidian-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-accent-teal text-slate-200"
                />
              </div>

              {/* Customers list table */}
              <div className="flex-1 overflow-x-auto min-h-[300px]">
                {loadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-accent-teal border-t-transparent animate-spin" />
                    <span className="text-xs text-slate-500 font-mono">Querying database engine...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-20 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-2">
                    <UserCheck className="h-8 w-8 text-slate-600" />
                    <span>No customer records match this search filter within the segment.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-obsidian-border text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3 text-right">Orders</th>
                        <th className="py-2.5 px-3 text-right">Total Spend</th>
                        <th className="py-2.5 px-3">Last Order</th>
                        <th className="py-2.5 px-3">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredCustomers.map((c) => {
                        let parsedTags: string[] = [];
                        try {
                          parsedTags = JSON.parse(c.tags || '[]');
                        } catch (e) {
                          parsedTags = c.tags ? c.tags.split(',') : [];
                        }

                        return (
                          <tr key={c.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-200">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{c.email}</p>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{c.city}</td>
                            <td className="py-3 px-3 text-right font-mono font-medium">{c.totalOrders}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-accent-teal">
                              ₹{c.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                              {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex gap-1 flex-wrap max-w-[150px]">
                                {parsedTags.map((t: string) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/10 text-[9px] uppercase font-bold tracking-wider">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center min-h-[500px] text-center text-slate-500 gap-3 border-dashed border-2 border-slate-800">
              <Users className="h-10 w-10 text-slate-700" />
              <div>
                <p className="font-bold text-slate-400">No segment selected</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Create a new segment from the chat window or select one from the sidebar list to inspect matching customer records.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

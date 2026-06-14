import React, { useEffect } from 'react';
import { useCRMStore } from '../store/crmStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { BarChart3, TrendingUp, Users, DollarSign, Globe, Award } from 'lucide-react';

export default function AnalyticsPage() {
  const { analytics, analyticsLoading, fetchAnalytics } = useCRMStore();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (analyticsLoading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-accent-teal border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Assembling analytics dashboard...</span>
      </div>
    );
  }

  const data = analytics || {
    totalCustomers: 0,
    totalSales: 0,
    salesByCity: [],
    channelPerformance: [],
    salesTimeline: [],
  };

  // Pie chart center styling and coloring
  const PIE_COLORS = ['#10B981', '#F59E0B', '#059669', '#D97706', '#047857'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Executive Dashboard</h2>
        <p className="text-sm text-slate-400">Track company sales metrics, marketing outreach, and attribution analytics.</p>
      </div>

      {/* Top Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-accent-teal">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sales</span>
            <p className="text-2xl font-bold text-slate-100 font-mono">
              ₹{data.totalSales ? Math.round(data.totalSales).toLocaleString() : '0'}
            </p>
          </div>
          <div className="p-3 bg-accent-teal/10 rounded-xl">
            <DollarSign className="h-6 w-6 text-accent-teal" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-accent-purple">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Customers</span>
            <p className="text-2xl font-bold text-slate-100 font-mono">
              {data.totalCustomers ? data.totalCustomers.toLocaleString() : '0'}
            </p>
          </div>
          <div className="p-3 bg-accent-purple/10 rounded-xl">
            <Users className="h-6 w-6 text-accent-purple" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-accent-emerald">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Order Value</span>
            <p className="text-2xl font-bold text-slate-100 font-mono">
              ₹{data.totalCustomers > 0 ? Math.round(data.totalSales / 5).toLocaleString() : '0'}
            </p>
          </div>
          <div className="p-3 bg-accent-emerald/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-accent-emerald" />
          </div>
        </div>
      </div>

      {/* Grid Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Monthly Sales Trend AreaChart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="h-4.5 w-4.5 text-accent-teal" /> Monthly Sales Revenues (₹)
          </h3>

          <div className="h-72 w-full text-xs font-mono">
            {data.salesTimeline && data.salesTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.salesTimeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#4B5563" />
                  <YAxis stroke="#4B5563" tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#F3F4F6' }}
                    formatter={(val: any) => [`₹${val.toLocaleString()}`, 'Revenues']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No orders data found to graph.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Sales By City Pie Chart */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
            <Globe className="h-4.5 w-4.5 text-accent-purple" /> Sales By City Distribution
          </h3>

          <div className="h-56 w-full flex items-center justify-center">
            {data.salesByCity && data.salesByCity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.salesByCity}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="sales"
                    nameKey="city"
                  >
                    {data.salesByCity.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [`₹${val.toLocaleString()}`, 'Sales']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500">No geographical data.</div>
            )}
          </div>

          {/* List display */}
          <div className="space-y-1.5">
            {data.salesByCity.slice(0, 4).map((cityItem: any, index: number) => (
              <div key={cityItem.city} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="font-medium text-slate-300">{cityItem.city}</span>
                </div>
                <span className="font-bold text-slate-200 font-mono">₹{Math.round(cityItem.sales).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Marketing Performance Metrics */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <Award className="h-4.5 w-4.5 text-accent-emerald" /> Channel Communication Success Rates (%)
        </h3>

        <div className="h-64 w-full text-xs font-mono">
          {data.channelPerformance && data.channelPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.channelPerformance} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="channel" stroke="#4B5563" tickFormatter={(val) => val.toUpperCase()} />
                <YAxis stroke="#4B5563" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#F3F4F6' }}
                />
                <Bar dataKey="openRate" name="Open Rate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clickRate" name="Click Rate" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              No delivery analytics. Launch campaigns to generate performance charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

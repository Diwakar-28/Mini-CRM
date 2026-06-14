import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { MessageSquare, Users, Send, BarChart3, Zap } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-obsidian text-slate-100 font-sans">
      {/* Background Mesh Glow */}
      <div className="bg-mesh" />

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-obsidian-border bg-obsidian bg-opacity-70 backdrop-blur-md flex flex-col justify-between p-6 z-10">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gradient-to-tr from-accent-teal to-accent-purple rounded-xl shadow-glow-teal">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white via-slate-200 to-accent-teal bg-clip-text text-transparent">
                XENO CRM
              </h1>
              <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">
                AI-Native Engine
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-2">
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-teal/20 to-accent-purple/10 border-l-4 border-accent-teal text-white shadow-glow-teal'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`
              }
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-semibold text-sm">AI Copilot</span>
            </NavLink>

            <NavLink
              to="/audiences"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-teal/20 to-accent-purple/10 border-l-4 border-accent-teal text-white shadow-glow-teal'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`
              }
            >
              <Users className="h-5 w-5" />
              <span className="font-semibold text-sm">Audiences</span>
            </NavLink>

            <NavLink
              to="/campaigns"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-teal/20 to-accent-purple/10 border-l-4 border-accent-teal text-white shadow-glow-teal'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`
              }
            >
              <Send className="h-5 w-5" />
              <span className="font-semibold text-sm">Campaigns</span>
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-teal/20 to-accent-purple/10 border-l-4 border-accent-teal text-white shadow-glow-teal'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`
              }
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold text-sm">Analytics</span>
            </NavLink>
          </nav>
        </div>

        {/* Footer info */}
        <div className="border-t border-obsidian-border pt-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-accent-teal">
              MK
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Marketer Workspace</p>
              <p className="text-[10px] text-accent-teal font-medium">System Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* Header bar */}
        <header className="h-16 border-b border-obsidian-border bg-obsidian bg-opacity-40 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Connected to CRM Node</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span>Server: localhost:5000</span>
            <span>Simulator: localhost:5001</span>
          </div>
        </header>

        {/* Screen Container */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

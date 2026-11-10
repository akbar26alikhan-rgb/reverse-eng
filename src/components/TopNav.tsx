import React from 'react';
import { Terminal, Shield, Cpu, History, PlayCircle, Layers } from 'lucide-react';

export type ActiveTab = 'investigator' | 'inspector' | 'setup' | 'history' | 'mcp';

interface TopNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isSafeMode: boolean;
  historyCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  isSafeMode,
  historyCount,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between gap-8 shrink-0 z-30">
      {/* Zone 1: Brand wordmark with breadcrumb */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
          AL
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-100 tracking-tight">ArchLens</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="text-slate-400 font-medium">Local Reverse Engineer</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80">
        <button
          type="button"
          onClick={() => onTabChange('investigator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'investigator'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
          Feature Investigator
        </button>

        <button
          type="button"
          onClick={() => onTabChange('inspector')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'inspector'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          Target Inspector
        </button>

        <button
          type="button"
          onClick={() => onTabChange('history')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'history'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          History
          {historyCount > 0 && (
            <span className="font-mono text-[10px] text-slate-300 ml-1">
              {historyCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('setup')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'setup'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          Guided Setup
        </button>

        <button
          type="button"
          onClick={() => onTabChange('mcp')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'mcp'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          MCP &amp; CLI
        </button>
      </nav>

      {/* Zone 3: Primary Action / Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border border-slate-800 px-3 py-1.5 rounded-md bg-slate-900/50">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-300">npx archlens</span>
          <span className="text-slate-600">·</span>
          <span>Local Engine</span>
        </div>

        <button
          type="button"
          onClick={() => onTabChange('investigator')}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          New Investigation
        </button>
      </div>
    </header>
  );
};

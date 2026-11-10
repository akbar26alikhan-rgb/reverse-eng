import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderPlus,
  Database,
  FileCheck,
  Check,
  Clock,
  Terminal,
} from 'lucide-react';
import type { SafeSetupStatus } from '../types.ts';

interface SetupViewProps {
  status: SafeSetupStatus | null;
  isLoading: boolean;
  onRerunSetup: () => Promise<void>;
  onExecuteSetup: (permissions: {
    createWorkspaceDir: boolean;
    initializeHistoryDb: boolean;
    generateMcpConfigs: boolean;
    seedSampleTargets: boolean;
  }) => Promise<void>;
}

export const SetupView: React.FC<SetupViewProps> = ({
  status,
  isLoading,
  onRerunSetup,
  onExecuteSetup,
}) => {
  const [createWorkspace, setCreateWorkspace] = useState(true);
  const [initHistory, setInitHistory] = useState(true);
  const [genMcp, setGenMcp] = useState(true);
  const [seedSamples, setSeedSamples] = useState(true);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const handleApply = async () => {
    await onExecuteSetup({
      createWorkspaceDir: createWorkspace,
      initializeHistoryDb: initHistory,
      generateMcpConfigs: genMcp,
      seedSampleTargets: seedSamples,
    });
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 3000);
  };

  if (!status) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const availableCount = status.installedTools.filter(t => t.isAvailable).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Guided Safe Setup &amp; Machine Readiness
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              Safe Mode Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ArchLens inspects your local environment and asks before changing any files or directories.
          </p>
        </div>

        <button
          type="button"
          onClick={onRerunSetup}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Rerun Diagnostics
        </button>
      </div>

      {/* Tool Readiness Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Environment &amp; Static Analysis Capabilities ({availableCount}/{status.installedTools.length} native)
          </h2>
          <span className="text-[11px] text-slate-500">
            Internal pure-JS engines active for all tools
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {status.installedTools.map(tool => (
            <div
              key={tool.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{tool.name}</span>
                  {tool.isAvailable ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400">
                      <Shield className="w-3.5 h-3.5" />
                      Fallback Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="text-[11px] font-mono p-2 rounded bg-slate-950/80 border border-slate-800/80 text-slate-400">
                {tool.isAvailable ? (
                  <span className="text-emerald-300 truncate block">
                    Path: {tool.path || 'System Builtin'}
                  </span>
                ) : (
                  <span className="text-sky-300 truncate block">
                    Fallback: {tool.fallbackDetails}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guided Permissions Confirmation: "Asks before changing anything" */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            Explicit Permissions &amp; Configuration Plan
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Review the actions ArchLens is allowed to perform on your machine. No system changes occur without your approval.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={createWorkspace}
              onChange={e => setCreateWorkspace(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0 bg-slate-900"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                Create local workspace directory (<code>.archlens/</code>)
              </span>
              <p className="text-[11px] text-slate-400">
                Dedicated non-intrusive directory inside this project for configs, logs, and investigation caches.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={initHistory}
              onChange={e => setInitHistory(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0 bg-slate-900"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Initialize local investigation history database
              </span>
              <p className="text-[11px] text-slate-400">
                Stores your feature questions, evidence cards, and code blueprints in <code>.archlens/investigations.json</code>.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={genMcp}
              onChange={e => setGenMcp(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0 bg-slate-900"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Prepare Model Context Protocol (MCP) server endpoints
              </span>
              <p className="text-[11px] text-slate-400">
                Enables AI agents in Claude Desktop, Cursor, or terminal to invoke ArchLens tools over local STDIO.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={seedSamples}
              onChange={e => setSeedSamples(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0 bg-slate-900"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                Seed representative test targets (Electron asar, Native ELF binary, Web bundle)
              </span>
              <p className="text-[11px] text-slate-400">
                Provides ready-to-inspect apps in <code>./sample-targets/</code> for instant feature reverse engineering.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-900 bg-indigo-400 hover:bg-indigo-300 rounded-md transition-colors flex items-center gap-2"
          >
            {appliedNotice ? <Check className="w-3.5 h-3.5" /> : null}
            {appliedNotice ? 'Permissions Applied & Saved' : 'Confirm & Apply Safe Setup'}
          </button>
          <span className="text-[11px] text-slate-500">
            ArchLens will never execute unverified scripts or send binaries off-machine.
          </span>
        </div>
      </section>

      {/* Audit Log / "See what happened" */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Audit Log (See What Happened)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {status.auditLog.length} recorded events
          </span>
        </div>

        <div className="border border-slate-800 rounded-lg divide-y divide-slate-800/80 bg-slate-950/60 max-h-72 overflow-y-auto">
          {status.auditLog.map((entry, idx) => (
            <div key={idx} className="p-3 text-xs font-mono flex items-start gap-3">
              <span className="text-slate-500 shrink-0 tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{entry.action}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                    {entry.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{entry.details}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import {
  History,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { FeatureInvestigation } from '../types.ts';

interface HistoryViewProps {
  history: FeatureInvestigation[];
  onSelectInvestigation: (inv: FeatureInvestigation) => void;
  onClearHistory: () => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectInvestigation,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = history.filter(h => {
    const q = searchTerm.toLowerCase();
    return (
      h.question.toLowerCase().includes(q) ||
      h.targetName.toLowerCase().includes(q) ||
      h.featureName.toLowerCase().includes(q) ||
      h.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleExport = (inv: FeatureInvestigation) => {
    const md = `# ArchLens Investigation: ${inv.featureName}
**Target:** ${inv.targetName}
**Question:** ${inv.question}
**Confidence:** ${inv.confidenceScore}%

## Executive Summary
${inv.executiveSummary}

## Mechanism Steps
${inv.mechanismWalkthrough.map(s => `${s.step}. ${s.title}: ${s.description}`).join('\n')}

## Starter Code Template
\`\`\`typescript
${inv.recreationBlueprint.codeTemplate}
\`\`\`
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archlens-${inv.featureName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Investigation History &amp; Knowledge Base
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {history.length} records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organized journal of all feature reverse engineering investigations, cited evidence, and recreation blueprints.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded border border-rose-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* Search Input */}
      {history.length > 0 && (
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by feature, app name, or question..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
        </div>
      )}

      {/* History Grid */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {item.featureName}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-300">
                    on <strong>{item.targetName}</strong>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {item.targetKind}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium">
                  "{item.question}"
                </p>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.executiveSummary}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                  <span>Confidence: <strong className="text-emerald-400 tabular-nums">{item.confidenceScore}%</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>{item.evidenceList.length} Evidence Items</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.mechanismWalkthrough.length} Steps</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExport(item)}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Export Markdown Report"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectInvestigation(item)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm"
                >
                  Reopen Report
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/20">
          <History className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">
            No investigations in history
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Feature investigations run via the Web Workbench or terminal CLI will be automatically indexed and preserved here.
          </p>
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-slate-500">
          No investigations matched "{searchTerm}".
        </div>
      )}
    </div>
  );
};

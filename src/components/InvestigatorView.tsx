import React, { useState } from 'react';
import {
  Search,
  Code,
  Copy,
  Check,
  Download,
  Terminal,
  HelpCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { FeatureInvestigation, TargetMetadata } from '../types.ts';

interface InvestigatorViewProps {
  targets: TargetMetadata[];
  selectedTarget: TargetMetadata | null;
  onSelectTarget: (target: TargetMetadata) => void;
  investigation: FeatureInvestigation | null;
  isLoading: boolean;
  onRunInvestigation: (targetPath: string, question: string) => Promise<void>;
}

const SAMPLE_QUESTIONS = [
  'How does search work in this app?',
  'How does IPC handle window events and data dispatch?',
  'How does local caching or in-memory storage operate?',
  'How are keyboard shortcuts and input events bound?',
];

export const InvestigatorView: React.FC<InvestigatorViewProps> = ({
  targets,
  selectedTarget,
  onSelectTarget,
  investigation,
  isLoading,
  onRunInvestigation,
}) => {
  const [question, setQuestion] = useState('How does search work in this app?');
  const [customPath, setCustomPath] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPath = isCustomMode ? customPath : selectedTarget?.path;
    if (targetPath && question.trim()) {
      onRunInvestigation(targetPath, question.trim());
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!investigation) return;
    const md = `# ArchLens Reverse Engineering Report: ${investigation.featureName}
**Target:** ${investigation.targetName} (${investigation.targetKind})  
**Date:** ${new Date(investigation.timestamp).toLocaleString()}  
**Confidence Score:** ${investigation.confidenceScore}%  

---

## 1. Executive Summary
${investigation.executiveSummary}

---

## 2. Mechanism Walkthrough
${investigation.mechanismWalkthrough
  .map(
    s => `### Step ${s.step}: ${s.title} [${s.component}]
${s.description}`
  )
  .join('\n\n')}

---

## 3. Corroborating Evidence
${investigation.evidenceList
  .map(
    e => `#### [${e.category.toUpperCase()}] ${e.title}
- **Source:** ${e.sourceFile} ${e.location ? `(${e.location})` : ''}
- **Explanation:** ${e.explanation}
\`\`\`
${e.snippet}
\`\`\``
  )
  .join('\n\n')}

---

## 4. Recreation Blueprint: ${investigation.recreationBlueprint.title}
**Framework:** ${investigation.recreationBlueprint.targetFramework}  
**Language:** ${investigation.recreationBlueprint.language}  

### Key Architectural Decisions
${investigation.recreationBlueprint.keyArchitecturalDecisions.map(d => `- ${d}`).join('\n')}

### Starter Code
\`\`\`typescript
${investigation.recreationBlueprint.codeTemplate}
\`\`\`

### Quick Usage
\`\`\`typescript
${investigation.recreationBlueprint.usageExample}
\`\`\`
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archlens-${investigation.featureName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Target Selector & Investigation Query Card */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Target Application / Binary
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect local Electron packages, JavaScript bundles, or native binaries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !isCustomMode
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sample Targets ({targets.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isCustomMode
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Local Path
              </button>
            </div>
          </div>

          {/* Target Selection Controls */}
          {!isCustomMode ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {targets.map(t => {
                const isSelected = selectedTarget?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTarget(t)}
                    className={`text-left p-3.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-950/20 shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {t.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        {t.kind}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 truncate">
                      {t.detectedFormat}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{(t.sizeBytes / 1024).toFixed(1)} KB</span>
                      {t.architecture && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{t.architecture}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Local File Path on Machine
              </label>
              <input
                type="text"
                value={customPath}
                onChange={e => setCustomPath(e.target.value)}
                placeholder="/path/to/app.asar or /path/to/binary or ./bundle.js"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Feature Question Input */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                Feature Investigation Question
              </label>
              <span className="text-[11px] text-slate-400">
                Plain English inquiry for AI Agent
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. How does search work in this app?"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-36 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-2 px-4 py-1.5 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:pointer-events-none rounded-md transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    Investigating...
                  </>
                ) : (
                  <>
                    Investigate
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Question Suggestions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Suggestions:</span>
              {SAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded border border-slate-800 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-slate-900/60 rounded-xl border border-slate-800" />
          <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
          <div className="h-80 bg-slate-900/60 rounded-xl border border-slate-800" />
        </div>
      )}

      {/* Investigation Results */}
      {!isLoading && investigation && (
        <div className="space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                  Investigation: {investigation.featureName}
                </h1>
                <span className="text-slate-400 text-xs">on {investigation.targetName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>Confidence: <strong className="text-emerald-400 tabular-nums">{investigation.confidenceScore}%</strong></span>
                <span aria-hidden="true">·</span>
                <span>{investigation.evidenceList.length} Evidence Items</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(investigation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
              >
                {exportSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-slate-400" />}
                {exportSuccess ? 'Exported!' : 'Export Markdown Report'}
              </button>
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(investigation, null, 2), 'inv-json')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
              >
                {copiedSnippet === 'inv-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                Copy JSON
              </button>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              1. Executive Summary (Plain English)
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">
              {investigation.executiveSummary}
            </p>
          </section>

          {/* 2. Mechanism Walkthrough */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              2. Step-by-Step Mechanism Walkthrough
            </h3>
            <div className="space-y-4">
              {investigation.mechanismWalkthrough.map(step => (
                <div
                  key={step.step}
                  className="flex gap-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                    {step.step}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100">
                        {step.title}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        [{step.component}]
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Evidence Board */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-amber-400" />
              3. Corroborating Evidence &amp; Proof Items
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investigation.evidenceList.map(ev => (
                <div
                  key={ev.id}
                  className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ev.category}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {ev.confidence} confidence
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-200">
                      {ev.title}
                    </h5>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Source: {ev.sourceFile} {ev.location && `· ${ev.location}`}
                    </div>
                    <p className="text-xs text-slate-300">
                      {ev.explanation}
                    </p>
                  </div>

                  <div className="relative group">
                    <pre className="p-2.5 rounded bg-slate-900/90 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/80 max-h-36">
                      {ev.snippet}
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleCopy(ev.snippet, ev.id)}
                      className="absolute right-2 top-2 p-1 rounded bg-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy snippet"
                    >
                      {copiedSnippet === ev.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Visual & UI Clues */}
          {investigation.visualClues.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                4. Discovered UI Hierarchy &amp; Interaction Clues
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Identified DOM tree, keyboard focus trapping, and visual interaction states.
              </p>
              {investigation.visualClues.map((vc, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre overflow-x-auto">
                  {vc.data}
                </div>
              ))}
            </section>
          )}

          {/* 5. Clean-Room Recreation Blueprint */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  5. Clean-Room Recreation Blueprint: {investigation.recreationBlueprint.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ready-to-run implementation for {investigation.recreationBlueprint.targetFramework} ({investigation.recreationBlueprint.language})
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(investigation.recreationBlueprint.codeTemplate, 'blueprint')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors shrink-0"
              >
                {copiedSnippet === 'blueprint' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet === 'blueprint' ? 'Copied Code!' : 'Copy Starter Code'}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {investigation.recreationBlueprint.summary}
            </p>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">
                Key Architectural Decisions:
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {investigation.recreationBlueprint.keyArchitecturalDecisions.map((dec, i) => (
                  <li key={i}>{dec}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Starter Code Template:</span>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px]">
                  {investigation.recreationBlueprint.codeTemplate}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Quick Usage Example:</span>
              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                {investigation.recreationBlueprint.usageExample}
              </pre>
            </div>
          </section>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !investigation && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/20">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">
            No active investigation loaded
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Select one of the sample targets above and click "Investigate" to reverse engineer feature mechanisms and generate drop-in code blueprints.
          </p>
        </div>
      )}
    </div>
  );
};

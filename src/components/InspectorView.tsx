import React, { useState } from 'react';
import {
  FileText,
  Layers,
  Cpu,
  Search,
  Filter,
  Code,
  Shield,
  FileCode,
  Folder,
} from 'lucide-react';
import type { TargetMetadata } from '../types.ts';

interface InspectorViewProps {
  selectedTarget: TargetMetadata | null;
  inspectionDetail: any;
  isLoading: boolean;
  onRefreshInspection: () => void;
}

export const InspectorView: React.FC<InspectorViewProps> = ({
  selectedTarget,
  inspectionDetail,
  isLoading,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'files' | 'ipc' | 'strings' | 'symbols'>('overview');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [stringSearch, setStringSearch] = useState('');
  const [stringCategoryFilter, setStringCategoryFilter] = useState<string>('all');

  if (!selectedTarget) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Target Selected</h3>
          <p className="text-xs text-slate-500">
            Select a target in the Feature Investigator tab to inspect its architecture.
          </p>
        </div>
      </div>
    );
  }

  const electron = inspectionDetail?.electron;
  const bundle = inspectionDetail?.bundle;
  const binary = inspectionDetail?.binary;

  // Filtered strings
  const rawStrings = binary?.strings || bundle?.strings || [];
  const filteredStrings = rawStrings.filter((s: any) => {
    const matchesSearch = s.value.toLowerCase().includes(stringSearch.toLowerCase());
    const matchesCat = stringCategoryFilter === 'all' || s.category === stringCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Target Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs shrink-0 mt-0.5">
            {selectedTarget.kind === 'electron' ? 'EL' : selectedTarget.kind === 'javascript' ? 'JS' : 'BIN'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{selectedTarget.name}</h2>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-800 rounded">
                {selectedTarget.kind}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-1">
              <span>{selectedTarget.detectedFormat}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{(selectedTarget.sizeBytes / 1024).toFixed(1)} KB</span>
              {selectedTarget.architecture && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{selectedTarget.architecture}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'overview' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          {electron && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('files');
                  if (!selectedFilePath && electron.fileList.length > 0) {
                    setSelectedFilePath(electron.fileList[0]);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeSubTab === 'files' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Files ({electron.fileList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('ipc')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeSubTab === 'ipc' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IPC Channels ({electron.ipcChannels.length})
              </button>
            </>
          )}
          {rawStrings.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSubTab('strings')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'strings' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strings ({rawStrings.length})
            </button>
          )}
          {binary?.symbols && binary.symbols.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSubTab('symbols')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'symbols' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Symbols ({binary.symbols.length})
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="h-64 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse" />
      )}

      {!isLoading && (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Architecture & Format Breakdown */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  Structural Architecture
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Target Type:</span>
                    <span className="text-slate-200">{selectedTarget.kind}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Detected Format:</span>
                    <span className="text-slate-200">{selectedTarget.detectedFormat}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Binary Size:</span>
                    <span className="text-slate-200 tabular-nums">{(selectedTarget.sizeBytes / 1024).toFixed(2)} KB ({selectedTarget.sizeBytes} bytes)</span>
                  </div>
                  {binary && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Architecture:</span>
                        <span className="text-slate-200">{binary.architecture}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Bit Width / Endian:</span>
                        <span className="text-slate-200">{binary.bitWidth}-bit / {binary.endianness}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Entry Point:</span>
                        <span className="text-emerald-400">{binary.entryPoint}</span>
                      </div>
                    </>
                  )}
                  {bundle && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Bundler Engine:</span>
                        <span className="text-slate-200">{bundle.detectedBundler}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">State Stores:</span>
                        <span className="text-slate-200">{bundle.stateStores.join(', ') || 'Local / None'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Electron / Security Details */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Security &amp; Sandboxing Configuration
                </h3>
                {electron ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-300">Context Isolation:</span>
                      <span className={`font-mono text-[11px] ${electron.securityConfig.contextIsolation ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {electron.securityConfig.contextIsolation ? 'ENABLED (Protected)' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-300">Node Integration in Renderer:</span>
                      <span className={`font-mono text-[11px] ${!electron.securityConfig.nodeIntegration ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {electron.securityConfig.nodeIntegration ? 'ENABLED (Direct Node Access)' : 'DISABLED (Safe Bridge)'}
                      </span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-slate-400">Preload Exposed Bridges:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {electron.preloadBridges.map((b: string) => (
                          <span key={b} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            window.{b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Target operates locally on machine. Native binary symbols and headers were verified with zero remote telemetry.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FILES VIEWER (for Electron) */}
          {activeSubTab === 'files' && electron && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[540px]">
              {/* File List */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 overflow-y-auto space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                  Package Files ({electron.fileList.length})
                </span>
                {electron.fileList.map((file: string) => {
                  const isSelected = selectedFilePath === file;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setSelectedFilePath(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 truncate ${
                        isSelected
                          ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{file}</span>
                    </button>
                  );
                })}
              </div>

              {/* Code Viewer */}
              <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="font-mono text-xs text-slate-300">
                    {selectedFilePath || 'Select a file to view'}
                  </span>
                  <span className="text-[11px] text-slate-500">Read-only preview</span>
                </div>
                <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <pre className="font-mono text-xs text-slate-200 leading-relaxed">
                    {selectedFilePath ? electron.extractedFiles[selectedFilePath] || '// Binary or empty file' : '// Select file on left'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IPC CHANNELS MATRIX */}
          {activeSubTab === 'ipc' && electron && (
            <div className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Discovered IPC Channels ({electron.ipcChannels.length})
                </h3>
                <div className="space-y-3">
                  {electron.ipcChannels.map((c: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            '{c.channel}'
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {c.handlerType}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {c.file} (Line {c.line})
                        </span>
                      </div>
                      <pre className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {c.codeSnippet}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STRINGS TABLE */}
          {activeSubTab === 'strings' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    value={stringSearch}
                    onChange={e => setStringSearch(e.target.value)}
                    placeholder="Search strings and paths..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={stringCategoryFilter}
                    onChange={e => setStringCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="api_endpoint">API Endpoints</option>
                    <option value="ipc_channel">IPC Channels</option>
                    <option value="filesystem_path">Filesystem Paths</option>
                    <option value="config_key">Config Keys</option>
                    <option value="error_message">Errors</option>
                    <option value="symbol">Symbols</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Offset</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">String Content</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStrings.slice(0, 150).map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-500 tabular-nums">
                          0x{s.offset.toString(16).padStart(6, '0')}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-200 select-all truncate max-w-md">
                          {s.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SYMBOLS TABLE */}
          {activeSubTab === 'symbols' && binary?.symbols && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Exported &amp; Internal Symbols ({binary.symbols.length})
              </h3>
              <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Symbol Name</th>
                      <th className="py-2.5 px-3">Demangled Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {binary.symbols.map((sym: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-emerald-400 font-bold">{sym.type}</td>
                        <td className="py-2 px-3 text-slate-200">{sym.name}</td>
                        <td className="py-2 px-3 text-slate-400">{sym.demangled || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

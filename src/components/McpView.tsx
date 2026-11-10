import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Terminal,
  Copy,
  Check,
  Play,
  Layers,
  ArrowRight,
  Code,
  Sparkles,
} from 'lucide-react';

export const McpView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<{
    claudeDesktopConfig: any;
    cursorMcpConfig: any;
    cliPath: string;
    cliUsage: string;
  } | null>(null);

  const [activeTestTool, setActiveTestTool] = useState<string>('archlens_get_setup_status');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch('/api/mcp/configs')
      .then(res => res.json())
      .then(data => setConfigs(data))
      .catch(console.error);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunTest = async (toolName: string) => {
    setIsTesting(true);
    setActiveTestTool(toolName);
    try {
      let params: any = { name: toolName, arguments: {} };
      if (toolName === 'archlens_investigate_feature') {
        params.arguments = {
          filePath: 'sample-targets/sample-notes-app.asar',
          question: 'How does search work in this app?',
        };
      } else if (toolName === 'archlens_inspect_target') {
        params.arguments = {
          filePath: 'sample-targets/sample-fastsearch-cli',
        };
      }

      const res = await fetch('/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params,
        }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Agent MCP (Model Context Protocol) &amp; Terminal Bridge
          </h1>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
            STDIO &amp; JSON-RPC 2.0
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Connect your AI agents (Claude Desktop, Cursor, local LLMs) directly to ArchLens. Agents can invoke local reverse-engineering tools to analyze native binaries, Electron asar archives, and web bundles without data leaving your machine.
        </p>
      </div>

      {/* Quick Setup Cards for Claude & Cursor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Claude Desktop Config */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Claude Desktop Configuration
            </h3>
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(configs?.claudeDesktopConfig, null, 2), 'claude-cfg')}
              className="flex items-center gap-1 text-[11px] font-mono text-purple-300 hover:text-white"
            >
              {copiedId === 'claude-cfg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedId === 'claude-cfg' ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Add this to <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
            {configs ? JSON.stringify(configs.claudeDesktopConfig, null, 2) : '// Loading config...'}
          </pre>
        </div>

        {/* Terminal CLI Execution */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Terminal CLI Integration
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('npx archlens ask "How does search work in this app?" --target sample-targets/sample-notes-app.asar', 'cli-cmd')}
              className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 hover:text-white"
            >
              {copiedId === 'cli-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedId === 'cli-cmd' ? 'Copied' : 'Copy Command'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Run feature reverse-engineering directly from your terminal session:
          </p>
          <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
            {`# 1. Probe and guided setup:\nnpx archlens setup\n\n# 2. Ask feature question:\nnpx archlens ask "How does search work in this app?" \\\n  --target sample-targets/sample-notes-app.asar`}
          </pre>
        </div>
      </div>

      {/* Interactive MCP Tool Playground */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              Interactive MCP Tool Runner
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate an AI agent invoking ArchLens MCP tools locally via JSON-RPC.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleRunTest('archlens_get_setup_status')}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-200"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            archlens_get_setup_status
          </button>
          <button
            type="button"
            onClick={() => handleRunTest('archlens_list_targets')}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-200"
          >
            <Play className="w-3 h-3 text-sky-400" />
            archlens_list_targets
          </button>
          <button
            type="button"
            onClick={() => handleRunTest('archlens_inspect_target')}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-200"
          >
            <Play className="w-3 h-3 text-amber-400" />
            archlens_inspect_target
          </button>
          <button
            type="button"
            onClick={() => handleRunTest('archlens_investigate_feature')}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-slate-200"
          >
            <Play className="w-3 h-3 text-purple-400" />
            archlens_investigate_feature
          </button>
        </div>

        {/* Live Response Panel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Tool Output ({activeTestTool}):</span>
            {testResult && (
              <button
                type="button"
                onClick={() => handleCopy(testResult, 'test-res')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
              >
                {copiedId === 'test-res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Output
              </button>
            )}
          </div>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-96 overflow-auto">
            {isTesting ? '// Executing MCP tool call...' : testResult || '// Click any of the tools above to test JSON-RPC dispatch'}
          </pre>
        </div>
      </section>
    </div>
  );
};

/**
 * ArchLens - Model Context Protocol (MCP) Server
 * Implements standard JSON-RPC 2.0 tool endpoints for AI agents (Claude Desktop, Cursor, local agents).
 * Exposes inspection, feature reverse-engineering, evidence retrieval, and setup diagnostics.
 */

import * as readline from 'node:readline';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { inspectElectronTarget } from './electron-inspector.ts';
import { inspectJavaScriptBundle } from './js-inspector.ts';
import { inspectNativeBinary } from './binary-inspector.ts';
import { investigateFeature, type InspectionData } from './feature-analyzer.ts';
import { SetupManager } from './setup-manager.ts';
import { ensureSampleTargets } from './sample-targets.ts';
import type { TargetMetadata, TargetKind } from '../types.ts';

export const MCP_TOOLS = [
  {
    name: 'archlens_list_targets',
    description: 'List discovered applications, Electron apps, JS bundles, and native binaries available for inspection.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Optional directory path to scan. Defaults to sample-targets directory.' },
      },
    },
  },
  {
    name: 'archlens_inspect_target',
    description: 'Inspect an Electron app (.asar/dir), JavaScript bundle, or native binary. Returns architectural metadata, symbols, IPC channels, and strings.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute or relative path to the app bundle or binary.' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'archlens_investigate_feature',
    description: 'Reverse engineer a specific feature (e.g., "How does search work in this app?"). Returns plain English breakdown, evidence citations, and runnable recreation blueprint.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to target app bundle or binary.' },
        question: { type: 'string', description: 'The question to investigate (e.g. "How does search work in this app?")' },
      },
      required: ['filePath', 'question'],
    },
  },
  {
    name: 'archlens_search_clues',
    description: 'Search for string clues, symbols, and code snippets matching keywords in a target file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Target file path.' },
        keyword: { type: 'string', description: 'Keyword to search for.' },
      },
      required: ['filePath', 'keyword'],
    },
  },
  {
    name: 'archlens_get_setup_status',
    description: 'Get local machine tool readiness (Node, file, strings, nm, asar, Gemini API) and audit logs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleMcpRpc(method: string, params: any, id: string | number | null) {
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'archlens',
          version: '1.0.0',
        },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};
    try {
      const output = await executeMcpTool(toolName, args);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
            },
          ],
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal tool execution error',
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

export async function executeMcpTool(name: string, args: any): Promise<any> {
  const setupManager = SetupManager.getInstance();

  switch (name) {
    case 'archlens_list_targets': {
      const samples = await ensureSampleTargets();
      return {
        targets: samples.map(s => ({
          name: s.name,
          path: s.path,
          kind: s.kind,
          format: s.detectedFormat,
          sizeBytes: s.sizeBytes,
        })),
      };
    }

    case 'archlens_inspect_target': {
      const targetPath = path.resolve(args.filePath);
      const stat = await fs.stat(targetPath);
      const kind = detectTargetKind(targetPath);

      const metadata: TargetMetadata = {
        id: `target-${Date.now()}`,
        name: path.basename(targetPath),
        path: targetPath,
        sizeBytes: stat.size,
        kind,
        detectedFormat: kind,
        createdAt: new Date().toISOString(),
      };

      if (kind === 'electron') {
        const electron = await inspectElectronTarget(targetPath);
        return { metadata, electronSummary: { name: electron.name, files: electron.fileList.length, ipc: electron.ipcChannels } };
      } else if (kind === 'javascript') {
        const bundle = await inspectJavaScriptBundle(targetPath);
        return { metadata, bundleSummary: { bundler: bundle.detectedBundler, modules: bundle.modulesFound.length, stores: bundle.stateStores } };
      } else {
        const binary = await inspectNativeBinary(targetPath);
        return { metadata, binarySummary: { format: binary.format, architecture: binary.architecture, symbolsCount: binary.symbols.length } };
      }
    }

    case 'archlens_investigate_feature': {
      const targetPath = path.resolve(args.filePath);
      const stat = await fs.stat(targetPath);
      const kind = detectTargetKind(targetPath);

      const metadata: TargetMetadata = {
        id: `target-${Date.now()}`,
        name: path.basename(targetPath),
        path: targetPath,
        sizeBytes: stat.size,
        kind,
        detectedFormat: kind,
        createdAt: new Date().toISOString(),
      };

      const inspectionData: InspectionData = { target: metadata };

      if (kind === 'electron') {
        inspectionData.electron = await inspectElectronTarget(targetPath);
        metadata.detectedFormat = 'Electron Application';
      } else if (kind === 'javascript') {
        inspectionData.bundle = await inspectJavaScriptBundle(targetPath);
        metadata.detectedFormat = inspectionData.bundle.detectedBundler;
      } else {
        inspectionData.binary = await inspectNativeBinary(targetPath);
        metadata.detectedFormat = inspectionData.binary.format;
        metadata.architecture = inspectionData.binary.architecture;
      }

      const investigation = await investigateFeature(inspectionData, args.question || 'How does search work in this app?');
      await setupManager.saveInvestigation(investigation);
      return investigation;
    }

    case 'archlens_search_clues': {
      const targetPath = path.resolve(args.filePath);
      const kind = detectTargetKind(targetPath);
      const kw = (args.keyword || '').toLowerCase();

      if (kind === 'native_binary') {
        const binary = await inspectNativeBinary(targetPath);
        return {
          symbols: binary.symbols.filter(s => s.name.toLowerCase().includes(kw)),
          strings: binary.strings.filter(s => s.value.toLowerCase().includes(kw)),
        };
      } else if (kind === 'electron') {
        const electron = await inspectElectronTarget(targetPath);
        return {
          ipcChannels: electron.ipcChannels.filter(c => c.channel.toLowerCase().includes(kw)),
          matchingFiles: electron.fileList.filter(f => f.toLowerCase().includes(kw)),
        };
      } else {
        const bundle = await inspectJavaScriptBundle(targetPath);
        return {
          keyFunctions: bundle.keyFunctions.filter(f => f.name.toLowerCase().includes(kw)),
          snippets: bundle.searchRelatedSnippets,
        };
      }
    }

    case 'archlens_get_setup_status': {
      return await setupManager.getStatus();
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function detectTargetKind(targetPath: string): TargetKind {
  const ext = path.extname(targetPath).toLowerCase();
  if (ext === '.asar') return 'electron';
  if (['.js', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.exe', '.bin', '.so', '.dylib', '.elf'].includes(ext)) return 'native_binary';
  return 'native_binary';
}

/**
 * Start STDIO server for Claude Desktop / Terminal agents
 */
export function startStdioMcpServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async line => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      const res = await handleMcpRpc(msg.method, msg.params, msg.id ?? null);
      process.stdout.write(JSON.stringify(res) + '\n');
    } catch (err: any) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: ' + err.message },
        }) + '\n'
      );
    }
  });
}

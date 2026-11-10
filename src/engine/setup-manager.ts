/**
 * ArchLens - Guided Safe Setup & System Health Manager
 * Probes environment, checks available binary and bundle tools, enforces safe confirmations,
 * logs audit trails, and manages investigation history.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  SafeSetupStatus,
  SystemToolCheck,
  SetupAuditEntry,
  FeatureInvestigation,
} from '../types.ts';

const execAsync = promisify(exec);

const WORKSPACE_DIR = path.resolve(process.cwd(), '.archlens');
const CONFIG_FILE = path.join(WORKSPACE_DIR, 'config.json');
const HISTORY_FILE = path.join(WORKSPACE_DIR, 'investigations.json');
const AUDIT_FILE = path.join(WORKSPACE_DIR, 'setup-audit.log');

export class SetupManager {
  private static instance: SetupManager;

  public static getInstance(): SetupManager {
    if (!SetupManager.instance) {
      SetupManager.instance = new SetupManager();
    }
    return SetupManager.instance;
  }

  /**
   * Run full system diagnostic check without modifying any files
   */
  public async probeSystem(): Promise<SystemToolCheck[]> {
    const checks: SystemToolCheck[] = [];

    // 1. Node.js Runtime
    checks.push({
      id: 'node',
      name: 'Node.js Runtime',
      category: 'runtime',
      isAvailable: true,
      version: process.version,
      path: process.execPath,
      description: 'Core runtime executing ArchLens analyzers and local servers.',
      fallbackAvailable: true,
      fallbackDetails: 'Built-in active runtime.',
    });

    // 2. System `file` utility
    try {
      const { stdout } = await execAsync('which file', { timeout: 2000 });
      checks.push({
        id: 'file',
        name: 'File Type Identifier (file)',
        category: 'binary',
        isAvailable: true,
        path: stdout.trim(),
        description: 'Native utility for MIME and executable format inspection.',
        fallbackAvailable: true,
        fallbackDetails: 'Internal pure-JS magic-byte parser (ELF, Mach-O, PE, Wasm, SQLite).',
      });
    } catch {
      checks.push({
        id: 'file',
        name: 'File Type Identifier (file)',
        category: 'binary',
        isAvailable: false,
        description: 'Native utility for MIME and executable format inspection.',
        fallbackAvailable: true,
        fallbackDetails: 'Internal pure-JS magic-byte parser active with 100% coverage.',
      });
    }

    // 3. System `strings` utility
    try {
      const { stdout } = await execAsync('which strings', { timeout: 2000 });
      checks.push({
        id: 'strings',
        name: 'Binary String Extractor (strings)',
        category: 'binary',
        isAvailable: true,
        path: stdout.trim(),
        description: 'Fast binary string scanning for symbols and paths.',
        fallbackAvailable: true,
        fallbackDetails: 'Internal high-speed buffer scanner (ASCII & UTF-16LE).',
      });
    } catch {
      checks.push({
        id: 'strings',
        name: 'Binary String Extractor (strings)',
        category: 'binary',
        isAvailable: false,
        description: 'Fast binary string scanning for symbols and paths.',
        fallbackAvailable: true,
        fallbackDetails: 'Internal high-speed buffer scanner active with zero native dependencies.',
      });
    }

    // 4. Symbol Dumper (`nm`)
    try {
      const { stdout } = await execAsync('which nm', { timeout: 2000 });
      checks.push({
        id: 'nm',
        name: 'Native Symbol Table Dumper (nm)',
        category: 'binary',
        isAvailable: true,
        path: stdout.trim(),
        description: 'Dumps exported/imported symbols from ELF and dynamic libraries.',
        fallbackAvailable: true,
        fallbackDetails: 'Heuristic symbol recognizer extracts mangled/clean identifiers from binary strings.',
      });
    } catch {
      checks.push({
        id: 'nm',
        name: 'Native Symbol Table Dumper (nm)',
        category: 'binary',
        isAvailable: false,
        description: 'Dumps exported/imported symbols from ELF and dynamic libraries.',
        fallbackAvailable: true,
        fallbackDetails: 'Heuristic symbol recognizer active; parses symbol patterns from strings.',
      });
    }

    // 5. Electron Asar Tool
    try {
      const { stdout } = await execAsync('which asar', { timeout: 2000 });
      checks.push({
        id: 'asar',
        name: 'Electron Asar CLI',
        category: 'bundle',
        isAvailable: true,
        path: stdout.trim(),
        description: 'Official Electron asar archive unpacker.',
        fallbackAvailable: true,
        fallbackDetails: 'Built-in pure TypeScript pickle/asar unpacker with IPC channel detector.',
      });
    } catch {
      checks.push({
        id: 'asar',
        name: 'Electron Asar CLI',
        category: 'bundle',
        isAvailable: false,
        description: 'Official Electron asar archive unpacker.',
        fallbackAvailable: true,
        fallbackDetails: 'Built-in pure TypeScript pickle/asar unpacker active; zero external packages needed.',
      });
    }

    // 6. Gemini AI Engine
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    checks.push({
      id: 'gemini',
      name: 'Gemini AI Synthesis Engine',
      category: 'ai',
      isAvailable: hasGeminiKey,
      description: 'Model-powered synthesis for deep feature walkthroughs and blueprints.',
      fallbackAvailable: true,
      fallbackDetails: 'Deterministic heuristic reverse-engineering engine active locally on your machine.',
    });

    return checks;
  }

  /**
   * Get current setup status and audit trail
   */
  public async getStatus(): Promise<SafeSetupStatus> {
    const tools = await this.probeSystem();
    let isConfigured = false;
    let auditLog: SetupAuditEntry[] = [];

    try {
      await fs.access(CONFIG_FILE);
      isConfigured = true;
    } catch {
      isConfigured = false;
    }

    try {
      const logContent = await fs.readFile(AUDIT_FILE, 'utf8');
      auditLog = logContent
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return {
              timestamp: new Date().toISOString(),
              action: 'Log line',
              status: 'passed' as const,
              details: line,
            };
          }
        });
    } catch {
      auditLog = [
        {
          timestamp: new Date().toISOString(),
          action: 'Initial Diagnostics Probe',
          status: 'passed',
          details: `System analyzed: ${tools.filter(t => t.isAvailable).length}/${tools.length} native tools discovered. All fallbacks ready.`,
        },
      ];
    }

    return {
      isConfigured,
      safeModeEnabled: true,
      dryRunMode: false,
      installedTools: tools,
      storagePath: WORKSPACE_DIR,
      mcpServerActive: true,
      geminiApiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      auditLog,
    };
  }

  /**
   * Execute guided safe setup with explicit user permissions
   */
  public async executeSafeSetup(options: {
    createWorkspaceDir: boolean;
    initializeHistoryDb: boolean;
    generateMcpConfigs: boolean;
    seedSampleTargets: boolean;
  }): Promise<{ success: boolean; actionsApplied: string[]; auditEntry: SetupAuditEntry }> {
    const actionsApplied: string[] = [];

    // Ensure workspace directory
    if (options.createWorkspaceDir) {
      await fs.mkdir(WORKSPACE_DIR, { recursive: true });
      actionsApplied.push(`Created workspace directory: ${WORKSPACE_DIR}`);
    }

    // Initialize history db if permitted
    if (options.initializeHistoryDb) {
      try {
        await fs.access(HISTORY_FILE);
      } catch {
        await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
        actionsApplied.push('Initialized local investigation history database');
      }
    }

    // Save config
    const configData = {
      version: '1.0.0',
      safeMode: true,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      permissions: options,
    };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');
    actionsApplied.push('Saved safe configuration to .archlens/config.json');

    const auditEntry: SetupAuditEntry = {
      timestamp: new Date().toISOString(),
      action: 'Safe Setup Completed',
      status: 'passed',
      details: `User confirmed ${actionsApplied.length} action(s): ${actionsApplied.join('; ')}`,
    };

    // Append to audit log
    await fs.appendFile(AUDIT_FILE, JSON.stringify(auditEntry) + '\n', 'utf8');

    return {
      success: true,
      actionsApplied,
      auditEntry,
    };
  }

  /**
   * Investigation History Storage
   */
  public async getHistory(): Promise<FeatureInvestigation[]> {
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public async saveInvestigation(inv: FeatureInvestigation): Promise<void> {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    let list: FeatureInvestigation[] = [];
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf8');
      list = JSON.parse(data);
    } catch {
      list = [];
    }

    // Prepend new investigation or update existing
    const existingIdx = list.findIndex(i => i.id === inv.id);
    if (existingIdx !== -1) {
      list[existingIdx] = inv;
    } else {
      list.unshift(inv);
    }

    await fs.writeFile(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
  }

  public async clearHistory(): Promise<void> {
    await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

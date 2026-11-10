/**
 * ArchLens - Local Full-Stack Server
 * Serves the React Web Workbench and exposes REST & MCP APIs for local app reverse engineering.
 */

import express, { Request, Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { SetupManager } from './src/engine/setup-manager.ts';
import { ensureSampleTargets } from './src/engine/sample-targets.ts';
import { inspectElectronTarget } from './src/engine/electron-inspector.ts';
import { inspectJavaScriptBundle } from './src/engine/js-inspector.ts';
import { inspectNativeBinary } from './src/engine/binary-inspector.ts';
import { investigateFeature, type InspectionData } from './src/engine/feature-analyzer.ts';
import { handleMcpRpc, executeMcpTool, detectTargetKind } from './src/engine/mcp-server.ts';
import type { TargetMetadata } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const setupManager = SetupManager.getInstance();

// Auto-seed sample targets on boot
ensureSampleTargets().catch(err => {
  console.warn('Sample targets seeding warning:', err);
});

// 1. Setup Status & Diagnostics
app.get('/api/setup/status', async (_req: Request, res: Response) => {
  try {
    const status = await setupManager.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Safe Setup Execution (requires explicit user confirmation of actions)
app.post('/api/setup/execute', async (req: Request, res: Response) => {
  try {
    const { createWorkspaceDir, initializeHistoryDb, generateMcpConfigs, seedSampleTargets } = req.body;
    const result = await setupManager.executeSafeSetup({
      createWorkspaceDir: Boolean(createWorkspaceDir),
      initializeHistoryDb: Boolean(initializeHistoryDb),
      generateMcpConfigs: Boolean(generateMcpConfigs),
      seedSampleTargets: Boolean(seedSampleTargets),
    });
    if (seedSampleTargets) {
      await ensureSampleTargets();
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Targets List
app.get('/api/targets', async (_req: Request, res: Response) => {
  try {
    const targets = await ensureSampleTargets();
    res.json({ targets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Target Inspection
app.post('/api/inspect', async (req: Request, res: Response) => {
  try {
    const { targetPath } = req.body;
    if (!targetPath) {
      res.status(400).json({ error: 'targetPath is required' });
      return;
    }

    const resolved = path.resolve(targetPath);
    const stat = await fs.stat(resolved);
    const kind = detectTargetKind(resolved);

    const metadata: TargetMetadata = {
      id: `target-${Date.now()}`,
      name: path.basename(resolved),
      path: resolved,
      sizeBytes: stat.size,
      kind,
      detectedFormat: kind,
      createdAt: new Date().toISOString(),
    };

    if (kind === 'electron') {
      const electron = await inspectElectronTarget(resolved);
      metadata.detectedFormat = 'Electron Application (Packed Asar / Directory)';
      metadata.fileCount = electron.fileList.length;
      res.json({ metadata, electron });
    } else if (kind === 'javascript') {
      const bundle = await inspectJavaScriptBundle(resolved);
      metadata.detectedFormat = `Client Bundle (${bundle.detectedBundler})`;
      res.json({ metadata, bundle });
    } else {
      const binary = await inspectNativeBinary(resolved);
      metadata.detectedFormat = binary.format;
      metadata.architecture = binary.architecture;
      res.json({ metadata, binary });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Feature Investigation
app.post('/api/investigate', async (req: Request, res: Response) => {
  try {
    const { targetPath, question } = req.body;
    if (!targetPath || !question) {
      res.status(400).json({ error: 'targetPath and question are required' });
      return;
    }

    const resolved = path.resolve(targetPath);
    const stat = await fs.stat(resolved);
    const kind = detectTargetKind(resolved);

    const metadata: TargetMetadata = {
      id: `target-${Date.now()}`,
      name: path.basename(resolved),
      path: resolved,
      sizeBytes: stat.size,
      kind,
      detectedFormat: kind,
      createdAt: new Date().toISOString(),
    };

    const inspectionData: InspectionData = { target: metadata };

    if (kind === 'electron') {
      inspectionData.electron = await inspectElectronTarget(resolved);
      metadata.detectedFormat = 'Electron Application';
      metadata.fileCount = inspectionData.electron.fileList.length;
    } else if (kind === 'javascript') {
      inspectionData.bundle = await inspectJavaScriptBundle(resolved);
      metadata.detectedFormat = `Bundle (${inspectionData.bundle.detectedBundler})`;
    } else {
      inspectionData.binary = await inspectNativeBinary(resolved);
      metadata.detectedFormat = inspectionData.binary.format;
      metadata.architecture = inspectionData.binary.architecture;
    }

    const investigation = await investigateFeature(inspectionData, question);
    await setupManager.saveInvestigation(investigation);

    res.json(investigation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. History
app.get('/api/history', async (_req: Request, res: Response) => {
  try {
    const history = await setupManager.getHistory();
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history', async (_req: Request, res: Response) => {
  try {
    await setupManager.clearHistory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. MCP JSON-RPC Endpoint (for AI agents & web extensions)
app.post('/api/mcp/rpc', async (req: Request, res: Response) => {
  try {
    const { method, params, id } = req.body;
    const rpcResponse = await handleMcpRpc(method, params, id ?? null);
    res.json(rpcResponse);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. MCP Configurations for Claude Desktop & Cursor
app.get('/api/mcp/configs', (_req: Request, res: Response) => {
  const absBinPath = path.resolve(__dirname, 'bin', 'archlens.ts');
  const claudeDesktopConfig = {
    mcpServers: {
      archlens: {
        command: 'npx',
        args: ['-y', 'tsx', absBinPath, 'mcp'],
      },
    },
  };

  const cursorMcpConfig = {
    mcpServers: {
      archlens: {
        type: 'stdio',
        command: 'node',
        args: [absBinPath, 'mcp'],
      },
    },
  };

  res.json({
    claudeDesktopConfig,
    cursorMcpConfig,
    cliPath: absBinPath,
    cliUsage: `npx tsx ${absBinPath} ask "How does search work?" --target sample-targets/sample-notes-app.asar`,
  });
});

// Mount Vite in dev mode or serve static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[ArchLens] Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ArchLens server:', err);
});

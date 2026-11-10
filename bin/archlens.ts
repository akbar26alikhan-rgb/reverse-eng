#!/usr/bin/env node
/**
 * ArchLens CLI - Terminal Interface for Local Reverse Engineering & Feature Investigation
 */

import * as path from 'node:path';
import * as readline from 'node:readline';
import { SetupManager } from '../src/engine/setup-manager.ts';
import { ensureSampleTargets } from '../src/engine/sample-targets.ts';
import { executeMcpTool, startStdioMcpServer } from '../src/engine/mcp-server.ts';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'setup':
      await runCliSetup(args.includes('--rerun'));
      break;

    case 'inspect':
      await runCliInspect(args[1]);
      break;

    case 'ask':
      await runCliAsk(args);
      break;

    case 'history':
      await runCliHistory();
      break;

    case 'samples':
      await runCliSamples();
      break;

    case 'mcp':
      startStdioMcpServer();
      break;

    case 'help':
    default:
      printUsage();
      break;
  }
}

function printUsage() {
  console.log(`
\x1b[1mArchLens\x1b[0m - Local App & Binary Reverse Engineering Assistant

\x1b[36mCommands:\x1b[0m
  archlens setup [--rerun]               Run guided system diagnostics & safe setup
  archlens inspect <file_path>           Inspect an app bundle, .asar, or binary
  archlens ask "<question>" --target <f> Investigate feature and generate recreation blueprint
  archlens history                       View past feature investigations
  archlens samples                       Seed and list bundled test targets
  archlens mcp                           Start Model Context Protocol (MCP) STDIO server

\x1b[36mExamples:\x1b[0m
  npx archlens setup
  npx archlens inspect sample-targets/sample-notes-app.asar
  npx archlens ask "How does search work in this app?" --target sample-targets/sample-notes-app.asar
  npx archlens ask "How does search work?" --target sample-targets/sample-fastsearch-cli
`);
}

async function runCliSetup(isRerun: boolean) {
  const setup = SetupManager.getInstance();
  console.log('\n\x1b[1m\x1b[34m[ArchLens Guided Safe Setup]\x1b[0m');
  console.log('Probing local machine environment and static analysis tools...\n');

  const tools = await setup.probeSystem();

  tools.forEach(t => {
    const symbol = t.isAvailable ? '\x1b[32m✔\x1b[0m' : '\x1b[33m⚡\x1b[0m';
    const status = t.isAvailable ? 'AVAILABLE' : 'FALLBACK ACTIVE';
    console.log(`  ${symbol} \x1b[1m${t.name}\x1b[0m: [${status}]`);
    console.log(`     ${t.description}`);
    if (!t.isAvailable) {
      console.log(`     \x1b[90mFallback: ${t.fallbackDetails}\x1b[0m`);
    }
  });

  console.log('\n\x1b[1mSafe Setup Plan:\x1b[0m');
  console.log('  1. Create local workspace folder: .archlens/');
  console.log('  2. Initialize local investigation history database');
  console.log('  3. Seed representative sample targets (Electron asar, Native ELF, Web bundle)');
  console.log('\x1b[33mNote: ArchLens operates strictly local-first and does not modify system files without permission.\x1b[0m\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Apply setup changes to current directory? (y/N): ', async answer => {
    rl.close();
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const res = await setup.executeSafeSetup({
        createWorkspaceDir: true,
        initializeHistoryDb: true,
        generateMcpConfigs: true,
        seedSampleTargets: true,
      });
      await ensureSampleTargets();
      console.log('\n\x1b[32m✔ Safe Setup Applied Successfully!\x1b[0m');
      res.actionsApplied.forEach(a => console.log(`  + ${a}`));
      console.log('\nYou can now run:');
      console.log('  npx archlens ask "How does search work in this app?" --target sample-targets/sample-notes-app.asar');
    } else {
      console.log('\nSetup aborted. No files were modified.');
    }
  });
}

async function runCliInspect(filePath?: string) {
  if (!filePath) {
    console.error('Error: Please provide a file path to inspect.');
    process.exit(1);
  }

  console.log(`\nInspecting \x1b[36m${filePath}\x1b[0m...`);
  try {
    const result = await executeMcpTool('archlens_inspect_target', { filePath });
    console.log('\n\x1b[1mInspection Summary:\x1b[0m');
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Inspection error:', err.message);
  }
}

async function runCliAsk(args: string[]) {
  const question = args[1];
  const targetIdx = args.indexOf('--target');
  let targetPath = targetIdx !== -1 ? args[targetIdx + 1] : undefined;

  // Fallback: if not --target, check if args[2] is a file path
  if (!targetPath && args[2] && !args[2].startsWith('--')) {
    targetPath = args[2];
  }

  if (!question || !targetPath) {
    console.error('Usage: archlens ask "<question>" --target <path_to_app_or_binary>');
    console.error('   or: archlens ask "<question>" <path_to_app_or_binary>');
    process.exit(1);
  }

  console.log(`\n\x1b[34m[ArchLens Investigation]\x1b[0m`);
  console.log(`Question: \x1b[1m"${question}"\x1b[0m`);
  console.log(`Target:   \x1b[36m${targetPath}\x1b[0m\n`);

  try {
    const inv = await executeMcpTool('archlens_investigate_feature', { filePath: targetPath, question });

    console.log('\x1b[1m1. Executive Summary\x1b[0m');
    console.log(inv.executiveSummary);
    console.log('\n\x1b[1m2. Mechanism Walkthrough\x1b[0m');
    inv.mechanismWalkthrough.forEach((step: any) => {
      console.log(`  \x1b[33mStep ${step.step}\x1b[0m [${step.component}]: \x1b[1m${step.title}\x1b[0m`);
      console.log(`    ${step.description}`);
    });

    console.log('\n\x1b[1m3. Corroborating Evidence\x1b[0m');
    inv.evidenceList.forEach((ev: any) => {
      console.log(`  • \x1b[32m[${ev.category.toUpperCase()}]\x1b[0m \x1b[1m${ev.title}\x1b[0m (${ev.sourceFile})`);
      console.log(`    ${ev.explanation}`);
    });

    console.log('\n\x1b[1m4. Clean-Room Recreation Blueprint\x1b[0m');
    console.log(`  Title: ${inv.recreationBlueprint.title}`);
    console.log(`  Language: ${inv.recreationBlueprint.language}`);
    console.log(`  Summary: ${inv.recreationBlueprint.summary}`);
    console.log('\n\x1b[90m--- Starter Template Preview ---\x1b[0m');
    console.log(inv.recreationBlueprint.codeTemplate.slice(0, 450) + '\n  // ... (Full blueprint saved in investigation history)');

    console.log(`\n\x1b[32m✔ Investigation saved with ID: ${inv.id}\x1b[0m`);
    console.log('Run `npx archlens history` or launch the ArchLens Web Workbench to browse evidence.');
  } catch (err: any) {
    console.error('Investigation failed:', err.message);
  }
}

async function runCliHistory() {
  const setup = SetupManager.getInstance();
  const history = await setup.getHistory();
  console.log(`\n\x1b[1mArchLens Investigation History (${history.length})\x1b[0m\n`);

  if (history.length === 0) {
    console.log('No investigations recorded yet. Run `archlens ask "How does search work?" --target <file>` to start one.');
    return;
  }

  history.forEach((h, i) => {
    console.log(`\x1b[36m[${i + 1}]\x1b[0m \x1b[1m"${h.question}"\x1b[0m on ${h.targetName}`);
    console.log(`    Feature: ${h.featureName} · Confidence: ${h.confidenceScore}% · Evidence: ${h.evidenceList.length} items`);
    console.log(`    Date: ${new Date(h.timestamp).toLocaleString()}`);
  });
}

async function runCliSamples() {
  console.log('Ensuring sample targets are initialized...');
  const samples = await ensureSampleTargets();
  console.log('\n\x1b[32m✔ Sample Targets Ready:\x1b[0m');
  samples.forEach(s => {
    console.log(`  • \x1b[1m${s.name}\x1b[0m (${s.detectedFormat})`);
    console.log(`    Path: ${s.path}`);
  });
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

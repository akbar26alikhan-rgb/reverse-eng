/**
 * ArchLens - Electron Application & Asar Inspector
 * Pure-JS Asar archive unpacker and Electron architecture analyzer.
 * Extracts IPC channels, preload bridges, main/renderer splits, and source modules.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IPCEvidence } from '../types.ts';

export interface AsarFileEntry {
  path: string;
  size: number;
  offset: number;
  isExecutable?: boolean;
}

export interface ElectronAppManifest {
  name: string;
  version: string;
  main: string;
  dependencies: Record<string, string>;
  ipcChannels: IPCEvidence[];
  preloadBridges: string[];
  fileList: string[];
  extractedFiles: Map<string, string>; // path -> content (for text files)
  securityConfig: {
    contextIsolation: boolean;
    nodeIntegration: boolean;
    sandbox: boolean;
  };
}

export async function inspectElectronTarget(targetPath: string): Promise<ElectronAppManifest> {
  const stat = await fs.stat(targetPath);
  
  if (stat.isDirectory()) {
    return inspectElectronDirectory(targetPath);
  }

  // If it is an .asar file or archive
  if (targetPath.endsWith('.asar') || targetPath.endsWith('.archive')) {
    return inspectAsarArchive(targetPath);
  }

  // Fallback: single script
  const content = await fs.readFile(targetPath, 'utf8');
  const files = new Map<string, string>();
  files.set(path.basename(targetPath), content);
  
  return analyzeElectronSourceFiles(files, path.basename(targetPath));
}

/**
 * Pure TypeScript Asar format parser
 * Format:
 * [4 bytes] u32: pickle payload size
 * [4 bytes] u32: header size in bytes + 4
 * [4 bytes] u32: header size in bytes
 * [4 bytes] u32: header string length in bytes
 * [N bytes] JSON string representing file tree
 * [Data]    Concatenated binary files
 */
export async function inspectAsarArchive(asarPath: string): Promise<ElectronAppManifest> {
  const buffer = await fs.readFile(asarPath);
  
  if (buffer.length < 16) {
    throw new Error('Invalid archive: file too small');
  }

  // Parse Chromium Pickle header
  const headerStringLen = buffer.readUInt32LE(12);
  let headerJsonStr = buffer.toString('utf8', 16, 16 + headerStringLen);
  headerJsonStr = headerJsonStr.replace(/\0+$/, '').trim();
  
  let header: { files: Record<string, any> };
  try {
    header = JSON.parse(headerJsonStr);
  } catch (err) {
    // Fallback: try finding first matching JSON object in header
    const firstBrace = buffer.indexOf('{', 16);
    if (firstBrace !== -1) {
      const closingBrace = buffer.lastIndexOf('}');
      if (closingBrace > firstBrace) {
        headerJsonStr = buffer.toString('utf8', firstBrace, closingBrace + 1);
        header = JSON.parse(headerJsonStr);
      } else {
        throw new Error(`Failed to parse Asar header JSON: ${String(err)}`);
      }
    } else {
      throw new Error(`Failed to parse Asar header JSON: ${String(err)}`);
    }
  }

  const padding = (4 - (headerStringLen % 4)) % 4;
  const baseDataOffset = 16 + headerStringLen + padding;
  const fileEntries: AsarFileEntry[] = [];

  function traverse(obj: Record<string, any>, currentPath: string) {
    for (const [key, val] of Object.entries(obj)) {
      const entryPath = currentPath ? `${currentPath}/${key}` : key;
      if (val.files) {
        traverse(val.files, entryPath);
      } else if (typeof val.size === 'number') {
        const offset = typeof val.offset === 'string' ? parseInt(val.offset, 10) : (val.offset || 0);
        fileEntries.push({
          path: entryPath,
          size: val.size,
          offset: baseDataOffset + offset,
          isExecutable: val.executable,
        });
      }
    }
  }

  if (header.files) {
    traverse(header.files, '');
  }

  // Read textual source files from the archive (js, json, html, css, ts, etc.)
  const files = new Map<string, string>();
  for (const entry of fileEntries) {
    const ext = path.extname(entry.path).toLowerCase();
    const isText = ['.js', '.mjs', '.cjs', '.json', '.html', '.ts', '.tsx', '.jsx', '.css', '.md'].includes(ext);
    
    if (isText && entry.size < 5 * 1024 * 1024) { // max 5MB per file
      const start = entry.offset;
      const end = entry.offset + entry.size;
      if (end <= buffer.length) {
        const content = buffer.toString('utf8', start, end);
        files.set(entry.path, content);
      }
    }
  }

  return analyzeElectronSourceFiles(files, path.basename(asarPath));
}

export async function inspectElectronDirectory(dirPath: string): Promise<ElectronAppManifest> {
  const files = new Map<string, string>();
  
  async function scan(currentDir: string, relativePrefix = '') {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' && relativePrefix !== '') {
        continue; // skip deep node_modules to maintain high scan speed
      }
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        await scan(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.mjs', '.cjs', '.json', '.html', '.ts', '.tsx', '.jsx'].includes(ext)) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size < 5 * 1024 * 1024) {
              const content = await fs.readFile(fullPath, 'utf8');
              files.set(relPath, content);
            }
          } catch {
            // ignore unreadable
          }
        }
      }
    }
  }

  await scan(dirPath);
  return analyzeElectronSourceFiles(files, path.basename(dirPath));
}

function analyzeElectronSourceFiles(files: Map<string, string>, rootName: string): ElectronAppManifest {
  let pkgName = rootName;
  let pkgVersion = '1.0.0';
  let mainScript = 'main.js';
  let dependencies: Record<string, string> = {};

  // Check package.json
  const pkgContent = files.get('package.json') || files.get('app/package.json');
  if (pkgContent) {
    try {
      const parsed = JSON.parse(pkgContent);
      pkgName = parsed.name || pkgName;
      pkgVersion = parsed.version || pkgVersion;
      mainScript = parsed.main || mainScript;
      dependencies = parsed.dependencies || {};
    } catch {
      // ignore
    }
  }

  const ipcChannels: IPCEvidence[] = [];
  const preloadBridges: string[] = [];
  const securityConfig = {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };

  // Inspect each file for IPC, Preload, and WebPreferences
  for (const [filePath, code] of files.entries()) {
    // 1. ipcMain.handle('channel', ...)
    const handleRegex = /ipcMain\.handle\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;
    while ((match = handleRegex.exec(code)) !== null) {
      const channel = match[1];
      const line = code.substring(0, match.index).split('\n').length;
      ipcChannels.push({
        channel,
        direction: 'bidirectional',
        handlerType: 'ipcMain.handle',
        file: filePath,
        line,
        codeSnippet: getSnippetAround(code, match.index),
      });
    }

    // 2. ipcMain.on('channel', ...)
    const onRegex = /ipcMain\.on\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = onRegex.exec(code)) !== null) {
      const channel = match[1];
      const line = code.substring(0, match.index).split('\n').length;
      ipcChannels.push({
        channel,
        direction: 'renderer-to-main',
        handlerType: 'ipcMain.on',
        file: filePath,
        line,
        codeSnippet: getSnippetAround(code, match.index),
      });
    }

    // 3. ipcRenderer.invoke('channel', ...)
    const invokeRegex = /ipcRenderer\.invoke\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = invokeRegex.exec(code)) !== null) {
      const channel = match[1];
      const line = code.substring(0, match.index).split('\n').length;
      ipcChannels.push({
        channel,
        direction: 'renderer-to-main',
        handlerType: 'ipcRenderer.invoke',
        file: filePath,
        line,
        codeSnippet: getSnippetAround(code, match.index),
      });
    }

    // 4. ipcRenderer.send('channel', ...)
    const sendRegex = /ipcRenderer\.send\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = sendRegex.exec(code)) !== null) {
      const channel = match[1];
      const line = code.substring(0, match.index).split('\n').length;
      ipcChannels.push({
        channel,
        direction: 'renderer-to-main',
        handlerType: 'ipcRenderer.send',
        file: filePath,
        line,
        codeSnippet: getSnippetAround(code, match.index),
      });
    }

    // 5. contextBridge.exposeInMainWorld('apiName', ...)
    const bridgeRegex = /contextBridge\.exposeInMainWorld\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = bridgeRegex.exec(code)) !== null) {
      preloadBridges.push(match[1]);
    }

    // 6. Security configuration flags
    if (code.includes('nodeIntegration: true')) securityConfig.nodeIntegration = true;
    if (code.includes('contextIsolation: false')) securityConfig.contextIsolation = false;
    if (code.includes('sandbox: false')) securityConfig.sandbox = false;
  }

  return {
    name: pkgName,
    version: pkgVersion,
    main: mainScript,
    dependencies,
    ipcChannels,
    preloadBridges: Array.from(new Set(preloadBridges)),
    fileList: Array.from(files.keys()),
    extractedFiles: files,
    securityConfig,
  };
}

function getSnippetAround(code: string, index: number, linesRadius = 3): string {
  const lines = code.split('\n');
  let charCount = 0;
  let targetLine = 0;
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1;
    if (charCount > index) {
      targetLine = i;
      break;
    }
  }

  const start = Math.max(0, targetLine - linesRadius);
  const end = Math.min(lines.length - 1, targetLine + linesRadius);
  return lines.slice(start, end + 1).join('\n');
}

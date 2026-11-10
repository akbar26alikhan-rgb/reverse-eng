/**
 * ArchLens - JavaScript & Web Bundle Inspector
 * Inspects modern client-side bundles (Webpack, Vite, Rollup, esbuild, Next.js).
 * Recovers modules, analyzes state stores, routes, web workers, and event handlers.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ASTClue, StringClue } from '../types.ts';
import { extractStringsFromBuffer } from './binary-inspector.ts';

export interface JSBundleAnalysis {
  bundleName: string;
  bundleSize: number;
  detectedBundler: 'Webpack' | 'Vite / Rollup' | 'esbuild' | 'Parcel' | 'Unknown';
  modulesFound: string[];
  stateStores: string[];
  apiEndpoints: string[];
  webWorkers: string[];
  keyFunctions: ASTClue[];
  strings: StringClue[];
  hasSourceMap: boolean;
  searchRelatedSnippets: {
    fileOrModule: string;
    snippet: string;
    type: 'index' | 'query' | 'filter' | 'worker' | 'state';
  }[];
}

export async function inspectJavaScriptBundle(filePath: string): Promise<JSBundleAnalysis> {
  const content = await fs.readFile(filePath, 'utf8');
  const buffer = Buffer.from(content);
  const bundleSize = buffer.length;
  const fileName = path.basename(filePath);

  // 1. Detect bundler
  let detectedBundler: JSBundleAnalysis['detectedBundler'] = 'Unknown';
  if (content.includes('webpackChunk') || content.includes('__webpack_require__')) {
    detectedBundler = 'Webpack';
  } else if (content.includes('import.meta') || content.includes('__vite__') || content.includes('@vite')) {
    detectedBundler = 'Vite / Rollup';
  } else if (content.includes('__toESM') || content.includes('__commonJS')) {
    detectedBundler = 'esbuild';
  }

  // 2. Extract modules
  const modulesFound: string[] = [];
  const moduleRegex = /(?:["']\.\/([a-zA-Z0-9_\-./]+(?:\.js|\.ts|\.tsx|\.jsx|\.vue|\.svelte)?)["']|(?:\/\*\* @module ([a-zA-Z0-9_\-./]+) \*\/))/g;
  let match: RegExpExecArray | null;
  while ((match = moduleRegex.exec(content)) !== null) {
    const mod = match[1] || match[2];
    if (mod && !modulesFound.includes(mod)) {
      modulesFound.push(mod);
    }
    if (modulesFound.length >= 150) break;
  }

  // 3. Detect state stores (Redux, Zustand, Pinia, Context, Jotai)
  const stateStores: string[] = [];
  if (content.includes('createStore') || content.includes('configureStore')) stateStores.push('Redux Store');
  if (content.includes('create(') && (content.includes('useStore') || content.includes('set =>'))) stateStores.push('Zustand Store');
  if (content.includes('defineStore')) stateStores.push('Pinia Store');
  if (content.includes('createContext')) stateStores.push('React Context Provider');
  if (content.includes('atom(')) stateStores.push('Jotai / Recoil Atomic State');

  // 4. API Endpoints
  const apiEndpoints: string[] = [];
  const urlRegex = /(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*['"`]([a-zA-Z0-9_\-./:?=&]+)['"`]/g;
  while ((match = urlRegex.exec(content)) !== null) {
    const ep = match[1];
    if (!apiEndpoints.includes(ep)) {
      apiEndpoints.push(ep);
    }
    if (apiEndpoints.length >= 50) break;
  }

  // 5. Web Workers
  const webWorkers: string[] = [];
  const workerRegex = /new\s+Worker\s*\(\s*['"`]([a-zA-Z0-9_\-./]+)['"`]/g;
  while ((match = workerRegex.exec(content)) !== null) {
    if (!webWorkers.includes(match[1])) webWorkers.push(match[1]);
  }

  // 6. Key functions & search-related snippets
  const keyFunctions: ASTClue[] = [];
  const searchRelatedSnippets: JSBundleAnalysis['searchRelatedSnippets'] = [];

  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 3000); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check function definition
    const fnMatch = line.match(/(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/);
    if (fnMatch) {
      const fnName = fnMatch[1] || fnMatch[2];
      if (fnName && fnName.length > 2 && !fnName.startsWith('__')) {
        let score = 10;
        if (/search|query|filter|find|index|trie|score|match/i.test(fnName)) score += 50;
        if (/cache|memo|debounce|throttle/i.test(fnName)) score += 30;
        
        keyFunctions.push({
          kind: 'function',
          name: fnName,
          file: fileName,
          line: i + 1,
          snippet: line.trim().slice(0, 160),
          relevanceScore: score,
        });
      }
    }

    // Identify search implementation patterns
    if (lower.includes('fuse(') || lower.includes('flexsearch') || lower.includes('lunr') || lower.includes('minisearch')) {
      searchRelatedSnippets.push({
        fileOrModule: fileName,
        snippet: line.trim().slice(0, 200),
        type: 'index',
      });
    } else if (lower.includes('debounce') && (lower.includes('search') || lower.includes('query'))) {
      searchRelatedSnippets.push({
        fileOrModule: fileName,
        snippet: line.trim().slice(0, 200),
        type: 'query',
      });
    } else if (lower.includes('.filter(') && (lower.includes('includes') || lower.includes('indexof') || lower.includes('test('))) {
      searchRelatedSnippets.push({
        fileOrModule: fileName,
        snippet: line.trim().slice(0, 200),
        type: 'filter',
      });
    }
  }

  // Sort key functions by relevance
  keyFunctions.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 7. Extract string table
  const strings = extractStringsFromBuffer(buffer, 4, 800);

  return {
    bundleName: fileName,
    bundleSize,
    detectedBundler,
    modulesFound,
    stateStores,
    apiEndpoints,
    webWorkers,
    keyFunctions: keyFunctions.slice(0, 30),
    strings,
    hasSourceMap: content.includes('sourceMappingURL='),
    searchRelatedSnippets: searchRelatedSnippets.slice(0, 15),
  };
}

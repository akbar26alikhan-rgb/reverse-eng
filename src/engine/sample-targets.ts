/**
 * ArchLens - Realistic Sample Targets Generator
 * Seeds real, inspectable targets for testing:
 * 1. Electron Notes App (with asar archive, IPC channels, and full-text search)
 * 2. Native CLI Search Binary (ELF structure, symbol table, and binary strings)
 * 3. Client Web Bundle (minified JS with in-memory fuzzy search indexer)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { TargetMetadata } from '../types.ts';

const SAMPLE_DIR = path.resolve(process.cwd(), 'sample-targets');

export async function ensureSampleTargets(): Promise<TargetMetadata[]> {
  await fs.mkdir(SAMPLE_DIR, { recursive: true });

  const targets: TargetMetadata[] = [];

  // 1. Electron Notes App (Unpacked Directory & Asar)
  const electronDir = path.join(SAMPLE_DIR, 'electron-notes-app');
  await fs.mkdir(path.join(electronDir, 'src'), { recursive: true });

  const electronPkg = {
    name: 'notes-desktop',
    version: '2.4.1',
    description: 'Local-first markdown notes app with instant full-text search',
    main: 'src/main.js',
    dependencies: {
      'sqlite3': '^5.1.7',
      'flexsearch': '^0.7.43',
    },
  };
  await fs.writeFile(path.join(electronDir, 'package.json'), JSON.stringify(electronPkg, null, 2), 'utf8');

  const electronMainJs = `/**
 * Electron Notes App - Main Process
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
const searchIndex = new Map();

function initializeDatabase() {
  console.log('[Main] Initializing SQLite full-text search virtual table...');
  // Simulates FTS5 index setup
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/index.html');
});

// IPC Handler: Instant Full-Text Search
ipcMain.handle('notes:search', async (event, query) => {
  console.log(\`[IPC] Executing search query: "\${query}"\`);
  if (!query || query.trim() === '') return [];

  // Query SQLite inverted index
  const normalizedQuery = query.toLowerCase().trim();
  const results = [
    {
      id: 'doc-101',
      title: 'Distributed System Architecture',
      snippet: 'Discussed local consensus protocols, high-frequency search indexing, and replication...',
      score: 0.98,
      updatedAt: '2026-10-14T09:00:00Z',
    },
    {
      id: 'doc-102',
      title: 'Product Roadmap & Milestones',
      snippet: 'Key deliverables include instant search bar with Cmd+K navigation and offline sync...',
      score: 0.84,
      updatedAt: '2026-10-18T14:30:00Z',
    },
    {
      id: 'doc-103',
      title: 'Electron Performance Optimizations',
      snippet: 'Isolating heavy string searches in dedicated worker threads to sustain 60fps scrolling...',
      score: 0.76,
      updatedAt: '2026-11-01T11:15:00Z',
    },
  ];

  return results.filter(r => 
    r.title.toLowerCase().includes(normalizedQuery) || 
    r.snippet.toLowerCase().includes(normalizedQuery)
  );
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
`;
  await fs.writeFile(path.join(electronDir, 'src', 'main.js'), electronMainJs, 'utf8');

  const electronPreloadJs = `/**
 * Preload Script: Exposes secure IPC channels
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notesApi', {
  searchNotes: (query) => ipcRenderer.invoke('notes:search', query),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
});
`;
  await fs.writeFile(path.join(electronDir, 'src', 'preload.js'), electronPreloadJs, 'utf8');

  const electronRendererJs = `/**
 * Renderer Process: UI and Search Controller
 */
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-list');

let debounceTimer = null;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value;

  // 150ms Debounce to prevent flooding IPC
  debounceTimer = setTimeout(async () => {
    if (!query) {
      resultsContainer.innerHTML = '';
      return;
    }
    const results = await window.notesApi.searchNotes(query);
    renderSearchResults(results, query);
  }, 150);
});

// Shortcut hotkey listener: Cmd+K / Ctrl+K
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

function renderSearchResults(items, query) {
  resultsContainer.innerHTML = items.map(item => \`
    <div class="result-row" data-id="\${item.id}">
      <div class="title">\${item.title}</div>
      <div class="snippet">\${item.snippet}</div>
      <div class="score">Score: \${item.score}</div>
    </div>
  \`).join('');
}
`;
  await fs.writeFile(path.join(electronDir, 'src', 'renderer.js'), electronRendererJs, 'utf8');

  // Package a real binary .asar file for the Electron app
  const asarFilePath = path.join(SAMPLE_DIR, 'sample-notes-app.asar');
  await createSyntheticAsarArchive(asarFilePath, [
    { path: 'package.json', content: JSON.stringify(electronPkg, null, 2) },
    { path: 'src/main.js', content: electronMainJs },
    { path: 'src/preload.js', content: electronPreloadJs },
    { path: 'src/renderer.js', content: electronRendererJs },
  ]);

  targets.push({
    id: 'sample-electron-notes',
    name: 'sample-notes-app.asar',
    path: asarFilePath,
    sizeBytes: (await fs.stat(asarFilePath)).size,
    kind: 'electron',
    detectedFormat: 'Electron Asar Archive (Packed)',
    fileCount: 4,
    createdAt: new Date().toISOString(),
  });

  // 2. Native Search CLI Binary (ELF structured buffer with symbol table and strings)
  const nativeBinPath = path.join(SAMPLE_DIR, 'sample-fastsearch-cli');
  await createSyntheticElfBinary(nativeBinPath);

  targets.push({
    id: 'sample-native-cli',
    name: 'sample-fastsearch-cli',
    path: nativeBinPath,
    sizeBytes: (await fs.stat(nativeBinPath)).size,
    kind: 'native_binary',
    detectedFormat: 'ELF 64-bit LSB executable, x86_64, dynamically linked',
    architecture: 'x86_64 (AMD64)',
    createdAt: new Date().toISOString(),
  });

  // 3. Web Client Bundle (minified JS with fuzzy index and Web Worker)
  const bundlePath = path.join(SAMPLE_DIR, 'sample-dashboard-bundle.js');
  const bundleContent = `/**
 * @license Production Bundle v3.12.0
 * Webpack Chunk: app-dashboard.min.js
 */
(function(modules) {
  var installedModules = {};
  function __webpack_require__(moduleId) {
    if (installedModules[moduleId]) return installedModules[moduleId].exports;
    var module = installedModules[moduleId] = { i: moduleId, l: false, exports: {} };
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    module.l = true;
    return module.exports;
  }
  return __webpack_require__(10);
})([
  /* 0: In-Memory Search Engine */
  function(module, exports) {
    function SearchIndex(options) {
      this.options = options || { threshold: 0.4, tokenize: 'forward' };
      this.invertedIndex = new Map();
      this.documentStore = [];
    }
    SearchIndex.prototype.addDocument = function(doc) {
      this.documentStore.push(doc);
      var tokens = doc.title.toLowerCase().split(/\\s+/);
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (!this.invertedIndex.has(t)) this.invertedIndex.set(t, []);
        this.invertedIndex.get(t).push(doc.id);
      }
    };
    SearchIndex.prototype.search = function(query) {
      var queryTokens = query.toLowerCase().trim().split(/\\s+/);
      var matches = [];
      for (var d = 0; d < this.documentStore.length; d++) {
        var doc = this.documentStore[d];
        var score = 0;
        for (var q = 0; q < queryTokens.length; q++) {
          if (doc.title.toLowerCase().indexOf(queryTokens[q]) !== -1) score += 1.0;
          if (doc.body && doc.body.toLowerCase().indexOf(queryTokens[q]) !== -1) score += 0.4;
        }
        if (score > 0) matches.push({ doc: doc, score: score });
      }
      return matches.sort(function(a, b) { return b.score - a.score; });
    };
    exports.SearchIndex = SearchIndex;
  },
  /* 1: State Store */
  function(module, exports) {
    function createStore(initialState) {
      var state = initialState || { query: '', results: [], isSearching: false };
      var listeners = [];
      return {
        getState: function() { return state; },
        dispatch: function(action) {
          if (action.type === 'SET_QUERY') {
            state.query = action.payload;
            state.isSearching = true;
          } else if (action.type === 'SET_RESULTS') {
            state.results = action.payload;
            state.isSearching = false;
          }
          listeners.forEach(function(l) { l(state); });
        },
        subscribe: function(l) { listeners.push(l); }
      };
    }
    exports.createStore = createStore;
  },
  /* 10: App Entry & Hotkey Hook */
  function(module, exports, __webpack_require__) {
    var Search = __webpack_require__(0);
    var Store = __webpack_require__(1);
    var index = new Search.SearchIndex();
    var store = Store.createStore();
    
    // Web Worker offload
    var searchWorker = new Worker('/workers/search-worker.js');
    searchWorker.onmessage = function(e) {
      store.dispatch({ type: 'SET_RESULTS', payload: e.data });
    };

    window.__APP_SEARCH_ENGINE__ = index;
    console.log('[Bundle] In-memory fuzzy search pipeline mounted.');
  }
]);
//# sourceMappingURL=sample-dashboard-bundle.js.map
`;
  await fs.writeFile(bundlePath, bundleContent, 'utf8');

  targets.push({
    id: 'sample-web-bundle',
    name: 'sample-dashboard-bundle.js',
    path: bundlePath,
    sizeBytes: (await fs.stat(bundlePath)).size,
    kind: 'javascript',
    detectedFormat: 'Minified Webpack Bundle (ES5/ES6)',
    createdAt: new Date().toISOString(),
  });

  return targets;
}

/**
 * Generates a valid pure-JS asar archive
 */
async function createSyntheticAsarArchive(destPath: string, files: { path: string; content: string }[]): Promise<void> {
  const headerObj: { files: Record<string, any> } = { files: {} };
  let currentOffset = 0;
  const fileBuffers: Buffer[] = [];

  for (const f of files) {
    const buf = Buffer.from(f.content, 'utf8');
    fileBuffers.push(buf);

    const parts = f.path.split('/');
    let cur = headerObj.files;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = { files: {} };
      cur = cur[parts[i]].files;
    }
    cur[parts[parts.length - 1]] = {
      size: buf.length,
      offset: currentOffset.toString(),
    };
    currentOffset += buf.length;
  }

  const jsonStr = JSON.stringify(headerObj);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  // Pickle header padding: pad json to multiple of 4
  const padding = (4 - (jsonBuf.length % 4)) % 4;
  const paddedJsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(padding)]);

  const headerPickleSize = paddedJsonBuf.length + 4;

  const headerBuf = Buffer.alloc(16);
  headerBuf.writeUInt32LE(4, 0); // pickle payload size
  headerBuf.writeUInt32LE(headerPickleSize, 4);
  headerBuf.writeUInt32LE(headerPickleSize - 4, 8);
  headerBuf.writeUInt32LE(jsonBuf.length, 12); // unpadded JSON string length

  const fullBuffer = Buffer.concat([headerBuf, paddedJsonBuf, ...fileBuffers]);
  await fs.writeFile(destPath, fullBuffer);
}

/**
 * Generates an ELF 64-bit binary with realistic symbols and string table
 */
async function createSyntheticElfBinary(destPath: string): Promise<void> {
  // ELF Header: 64 bytes
  const elfHeader = Buffer.alloc(64);
  // Magic: 0x7f, 'E', 'L', 'F'
  elfHeader[0] = 0x7f;
  elfHeader[1] = 0x45;
  elfHeader[2] = 0x4c;
  elfHeader[3] = 0x46;
  elfHeader[4] = 2; // 64-bit
  elfHeader[5] = 1; // Little endian
  elfHeader[6] = 1; // ELF version
  elfHeader[7] = 0; // System V ABI
  elfHeader.writeUInt16LE(2, 16); // ET_EXEC
  elfHeader.writeUInt16LE(0x3e, 18); // x86_64
  elfHeader.writeUInt32LE(1, 20); // EV_CURRENT
  elfHeader.writeBigUInt64LE(0x401000n, 24); // Entry point 0x401000

  // String pool simulating compiled C/Rust code for instant search
  const stringPool = [
    'FastSearchCLI v2.0 (x86_64-linux-gnu)',
    'Usage: fastsearch [OPTIONS] <QUERY> [PATH]',
    'SearchIndex_Init',
    'SearchIndex_Query',
    'SearchIndex_RankResults',
    'SearchIndex_Destroy',
    'InvertedTrie_Insert',
    'InvertedTrie_Lookup',
    'FuzzyScore_Levenshtein',
    '/var/cache/fastsearch/index.bin',
    'CONFIG_MAX_RESULTS=50',
    'CONFIG_FUZZY_THRESHOLD=0.35',
    'FATAL: failed to open memory-mapped index file',
    'GLIBC_2.34',
    '__libc_start_main',
    '__stack_chk_fail',
    '_init',
    '_fini',
  ].join('\0') + '\0';

  const stringBuf = Buffer.from(stringPool, 'utf8');
  const finalBuf = Buffer.concat([elfHeader, stringBuf]);
  await fs.writeFile(destPath, finalBuf);
  await fs.chmod(destPath, 0o755);
}

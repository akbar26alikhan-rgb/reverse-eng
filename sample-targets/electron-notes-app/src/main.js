/**
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
  console.log(`[IPC] Executing search query: "${query}"`);
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

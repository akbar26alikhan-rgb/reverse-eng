/**
 * Preload Script: Exposes secure IPC channels
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notesApi', {
  searchNotes: (query) => ipcRenderer.invoke('notes:search', query),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
});

import { contextBridge, ipcRenderer } from 'electron';

// The pages need very little from the main process: which platform this is, and the two file operations
// behind the Excel track's "Open in Excel" and "Check my file" buttons.
contextBridge.exposeInMainWorld('pandasDojoDesktop', {
  platform: process.platform,
});

contextBridge.exposeInMainWorld('dojoNative', {
  saveXlsx: (name: string, data: Uint8Array) => ipcRenderer.invoke('dojo:save-xlsx', { name, data }),
  pickXlsx: () => ipcRenderer.invoke('dojo:pick-xlsx'),
});

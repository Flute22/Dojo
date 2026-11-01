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

// Seed the saved progress from the automatic backup when this profile has none (a reinstall, or a lost data folder).
// This runs before the page's own scripts, so the app reads the restored values on its first paint.
try {
  const PREFIX = 'pandas-dojo.v1.';
  let has = false;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX) && k.endsWith('progress')) has = true;
  }
  if (!has) {
    const keys = ipcRenderer.sendSync('dojo:progress-backup') as Record<string, string> | null;
    if (keys) for (const [k, v] of Object.entries(keys)) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  }
} catch {
  /* storage unavailable: the main process restores after load instead */
}

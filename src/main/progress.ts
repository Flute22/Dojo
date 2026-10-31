import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';

const PREFIX = 'pandas-dojo.v1.';
const MAX_BYTES = 20 * 1024 * 1024;

interface ProgressFile {
  app: 'pandas-dojo';
  format: 1;
  exportedAt: string;
  keys: Record<string, string>;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function exportProgress(win: BrowserWindow): Promise<void> {
  const keys = (await win.webContents.executeJavaScript(`(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(${JSON.stringify(PREFIX)})) out[k] = localStorage.getItem(k);
    }
    return out;
  })()`)) as Record<string, string>;

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export progress',
    defaultPath: `pandas-dojo-progress-${stamp()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return;

  const payload: ProgressFile = {
    app: 'pandas-dojo',
    format: 1,
    exportedAt: new Date().toISOString(),
    keys,
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    dialog.showErrorBox('Export failed', String((e as Error).message ?? e));
    return;
  }
  await dialog.showMessageBox(win, {
    type: 'info',
    message: 'Progress exported',
    detail: `${Object.keys(keys).length} items saved to\n${filePath}`,
  });
}

function parseProgress(text: string): Record<string, string> {
  const data = JSON.parse(text) as unknown;
  const keys = (data as ProgressFile | null)?.keys;
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
    throw new Error('This file does not look like a Dojo progress export.');
  }
  for (const [k, v] of Object.entries(keys)) {
    if (!k.startsWith(PREFIX)) throw new Error(`Unexpected key "${k}". Only ${PREFIX}* keys can be imported.`);
    if (typeof v !== 'string') throw new Error(`The value for "${k}" is not text.`);
  }
  return keys;
}

export async function importProgress(win: BrowserWindow): Promise<void> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import progress',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || filePaths.length === 0) return;

  let keys: Record<string, string>;
  try {
    const stat = fs.statSync(filePaths[0]);
    if (stat.size > MAX_BYTES) throw new Error('That file is too large to be a progress export.');
    keys = parseProgress(fs.readFileSync(filePaths[0], 'utf8'));
  } catch (e) {
    dialog.showErrorBox('Import failed', String((e as Error).message ?? e));
    return;
  }

  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Import and reload', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Replace your current progress?',
    detail: `${Object.keys(keys).length} items will replace the progress, code and settings stored in this app.`,
  });
  if (response !== 0) return;

  await win.webContents.executeJavaScript(`(() => {
    const incoming = ${JSON.stringify(keys)};
    const stale = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(${JSON.stringify(PREFIX)})) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
    for (const [k, v] of Object.entries(incoming)) localStorage.setItem(k, v);
  })()`);
  win.webContents.reloadIgnoringCache();
}

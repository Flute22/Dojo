import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { APP_HOST, SCHEME } from './protocol';

const MAX_BYTES = 25 * 1024 * 1024;
let lastSaved: string | null = null;

/** Only pages of this app may use these file operations. */
function fromApp(frameUrl: string | undefined): boolean {
  try {
    const u = new URL(frameUrl ?? '');
    return u.protocol === `${SCHEME}:` && u.hostname === APP_HOST;
  } catch {
    return false;
  }
}

export function registerExcelFiles(): void {
  // Save the workbook as an .xlsx in a temporary folder and open it with the program registered for .xlsx.
  ipcMain.handle('dojo:save-xlsx', async (event, payload: { name: string; data: Uint8Array }) => {
    if (!fromApp(event.senderFrame?.url)) throw new Error('Not allowed');
    const bytes = Buffer.from(payload.data);
    if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error('Unexpected file size');
    const safe = path.basename(String(payload.name)).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/\.+$/, '');
    const name = safe.toLowerCase().endsWith('.xlsx') ? safe : `${safe || 'workbook'}.xlsx`;
    const dir = path.join(app.getPath('temp'), 'Dojo');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    fs.writeFileSync(file, bytes);
    lastSaved = file;
    const error = await shell.openPath(file); // '' on success
    return { path: file, error };
  });

  // Let the person pick the workbook they saved (the dialog opens on the file we created), and read it.
  ipcMain.handle('dojo:pick-xlsx', async (event) => {
    if (!fromApp(event.senderFrame?.url)) throw new Error('Not allowed');
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Choose your workbook',
      properties: ['openFile'],
      filters: [{ name: 'Excel workbook', extensions: ['xlsx', 'xlsm'] }],
      defaultPath: lastSaved ?? app.getPath('documents'),
    };
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const file = res.filePaths[0];
    const stat = fs.statSync(file);
    if (stat.size > MAX_BYTES) throw new Error('That file is too large to be a practice workbook.');
    return { canceled: false, name: path.basename(file), data: new Uint8Array(fs.readFileSync(file)) };
  });
}

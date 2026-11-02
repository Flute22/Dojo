import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { APP_HOST, SCHEME } from './protocol';

// The step-through window. The trace itself is recorded in the main window, where Python is already warm;
// this module only carries it across and shows it, so the visualizer never runs any code of its own.

const VISUALIZER_URL = `${SCHEME}://${APP_HOST}/tracks/visualize.html`;

let win: BrowserWindow | null = null;
let pending: unknown = null;

function openWindow(parent: BrowserWindow | null): BrowserWindow {
  if (win && !win.isDestroyed()) return win;
  const next = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    show: false,
    backgroundColor: '#F6F4EF',
    title: 'Step through the solution',
    parent: parent ?? undefined,
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win = next;
  next.once('ready-to-show', () => next.show());
  next.on('closed', () => {
    win = null;
    pending = null;
  });
  // Same rules as the main window: stay on app://, and send anything else to the system browser.
  next.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${SCHEME}://${APP_HOST}/`)) return;
    event.preventDefault();
  });
  next.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  void next.loadURL(VISUALIZER_URL);
  return next;
}

export function registerVisualizer(): void {
  // The page hands over a recorded trace and asks for the window.
  ipcMain.handle('dojo:visualize', (event, trace: unknown) => {
    pending = trace;
    const parent = BrowserWindow.fromWebContents(event.sender);
    const target = openWindow(parent);
    if (!target.webContents.isLoading()) target.webContents.send('dojo:trace-changed');
    target.focus();
    return true;
  });
  // The visualizer window asks for whatever is waiting for it.
  ipcMain.handle('dojo:take-trace', () => pending);
}

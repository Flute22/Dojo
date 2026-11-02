import { app, BrowserWindow, Menu, session, shell } from 'electron';
import path from 'node:path';
import { initBackup, registerBackupChannel } from './backup';
import { registerExcelFiles } from './excel-files';
import { registerVisualizer } from './visualizer';
import { buildMenu } from './menu';
import {
  APP_HOST,
  APP_URL,
  SCHEME,
  hasLocalPyodide,
  registerAppProtocol,
  registerSchemePrivileges,
} from './protocol';
import { initUpdater } from './updater';
import { loadWindowState, trackWindowState } from './window-state';

// The flute music resumes on launch if the user left it on, so the page has to
// be allowed to start audio without a click first.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

registerSchemePrivileges();

let mainWindow: BrowserWindow | null = null;

function isAppUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === `${SCHEME}:` && u.hostname === APP_HOST;
  } catch {
    return false;
  }
}

function openExternalSafely(url: string): void {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
      void shell.openExternal(url);
    }
  } catch {
    /* ignore malformed URLs */
  }
}

function createWindow(): void {
  const state = loadWindowState();
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#F6F4EF',
    title: 'Dojo',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  mainWindow = win;
  trackWindowState(win);
  initBackup(win);

  win.once('ready-to-show', () => {
    if (state.maximized) win.maximize();
    win.show();
  });
  win.on('closed', () => {
    mainWindow = null;
  });

  // Keep the window on the app. Anything else opens in the system browser.
  win.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternalSafely(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());

  void win.loadURL(APP_URL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    registerAppProtocol();
    registerBackupChannel();
    registerExcelFiles();
    registerVisualizer();

    // The app needs no device access. Copying snippets, pasting into the Excel grid, and full screen
    // are the only things it asks for.
    const allowed = new Set(['clipboard-sanitized-write', 'clipboard-read', 'fullscreen']);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(allowed.has(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
      return allowed.has(permission);
    });

    if (!hasLocalPyodide()) {
      console.warn(
        '[pandas-dojo] pyodide/ is missing. Run "npm run fetch-pyodide" for offline use; falling back to the CDN.',
      );
    }

    Menu.setApplicationMenu(buildMenu(() => mainWindow));
    createWindow();
    initUpdater(() => mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

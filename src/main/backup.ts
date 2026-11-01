import { app, BrowserWindow, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// Progress lives in the app's browser storage (inside the user-data folder). That folder can be lost when the app is
// uninstalled and installed again, or when its name changes. So a copy of everything the app stores is also kept in a
// plain file in Documents\Dojo, which uninstalling never touches. On start-up, if the storage holds no progress but a
// backup exists, the backup is put back automatically.

const PREFIX = 'pandas-dojo.v1.';
const LATEST = 'Dojo-progress-backup.json';
const PREVIOUS = 'Dojo-progress-backup.previous.json';
const EVERY_MS = 10_000;

type Keys = Record<string, string>;
interface BackupFile {
  app: 'pandas-dojo';
  format: 1;
  savedAt: string;
  appVersion: string;
  keys: Keys;
}

export function backupDir(): string {
  if (process.env.DOJO_BACKUP_DIR) return process.env.DOJO_BACKUP_DIR; // tests
  try {
    return path.join(app.getPath('documents'), 'Dojo');
  } catch {
    return path.join(app.getPath('userData'), 'backup');
  }
}

const hasProgress = (keys: Keys): boolean => Object.keys(keys).some((k) => /progress$/.test(k));

function readBackup(file: string): Keys | null {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as BackupFile;
    const keys = data?.keys;
    if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return null;
    for (const [k, v] of Object.entries(keys)) if (!k.startsWith(PREFIX) || typeof v !== 'string') return null;
    return hasProgress(keys) ? keys : null;
  } catch {
    return null;
  }
}

/** The fullest of the two backup files (a normal save never has fewer items than before, but be careful anyway). */
function bestBackup(): Keys | null {
  const dir = backupDir();
  const a = readBackup(path.join(dir, LATEST));
  const b = readBackup(path.join(dir, PREVIOUS));
  if (a && b) return Object.keys(b).length > Object.keys(a).length ? b : a;
  return a ?? b;
}

async function readStorage(win: BrowserWindow): Promise<Keys> {
  return (await win.webContents.executeJavaScript(`(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(${JSON.stringify(PREFIX)})) out[k] = localStorage.getItem(k);
    }
    return out;
  })()`)) as Keys;
}

let lastSaved = '';

function writeBackup(keys: Keys): void {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const latest = path.join(dir, LATEST);
  // keep the previous good copy, so one bad save can never be the only copy
  if (fs.existsSync(latest) && readBackup(latest)) fs.copyFileSync(latest, path.join(dir, PREVIOUS));
  const payload: BackupFile = { app: 'pandas-dojo', format: 1, savedAt: new Date().toISOString(), appVersion: app.getVersion(), keys };
  const tmp = latest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
  fs.renameSync(tmp, latest);
}

async function save(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) return;
  try {
    const keys = await readStorage(win);
    if (!hasProgress(keys)) return; // never replace a backup with an empty state
    const sig = JSON.stringify(keys);
    if (sig === lastSaved) return;
    writeBackup(keys);
    lastSaved = sig;
  } catch (e) {
    console.warn('[dojo] could not write the progress backup:', e);
  }
}

/** Puts the backup back when the app starts with empty storage. Returns true if it did (the page must reload). */
async function restoreIfEmpty(win: BrowserWindow): Promise<boolean> {
  const keys = await readStorage(win);
  if (hasProgress(keys)) return false;
  const backup = bestBackup();
  if (!backup) return false;
  await win.webContents.executeJavaScript(`(() => {
    const incoming = ${JSON.stringify(backup)};
    for (const [k, v] of Object.entries(incoming)) localStorage.setItem(k, v);
  })()`);
  return true;
}

export function openBackupFolder(): void {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  void shell.openPath(dir);
}

/** The preload asks for this before the page's scripts run, so a reinstall is seeded without reloading the page. */
export function registerBackupChannel(): void {
  ipcMain.on('dojo:progress-backup', (event) => {
    const url = event.senderFrame?.url ?? '';
    event.returnValue = url.startsWith('app://app/') ? bestBackup() : null;
  });
}

export function initBackup(win: BrowserWindow): void {
  let restoredThisRun = false;
  let timer: NodeJS.Timeout | null = null;

  win.webContents.on('did-finish-load', () => {
    void (async () => {
      if (!restoredThisRun) {
        restoredThisRun = true;
        try {
          if (await restoreIfEmpty(win)) {
            win.webContents.reloadIgnoringCache();
            return;
          }
        } catch (e) {
          console.warn('[dojo] could not restore the progress backup:', e);
        }
      }
      await save(win);
      if (!timer) timer = setInterval(() => void save(win), EVERY_MS);
    })();
  });

  // Save once more as the window closes (this also covers "restart to install an update").
  let flushed = false;
  win.on('close', (event) => {
    if (flushed) return;
    event.preventDefault();
    flushed = true;
    if (timer) clearInterval(timer);
    const done = (): void => {
      if (!win.isDestroyed()) win.close();
    };
    const guard = setTimeout(done, 2000);
    void save(win).finally(() => {
      clearTimeout(guard);
      done();
    });
  });
}

import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

const FIRST_CHECK_DELAY_MS = 15 * 1000;
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

let manualCheck = false;
let ready = false;

function log(msg: string, err?: unknown): void {
  console.log(`[updater] ${msg}${err ? ': ' + String((err as Error).message ?? err) : ''}`);
}

/** Wires up background updates. Only active in the packaged app. */
export function initUpdater(getWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;
  ready = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // "Later" still installs on the next quit

  autoUpdater.on('update-available', (info) => {
    log(`update ${info.version} found, downloading`);
    if (manualCheck) {
      const w = getWindow();
      const opts = {
        type: 'info' as const,
        message: `Version ${info.version} is available`,
        detail: 'It is downloading in the background. You will be asked to restart when it is ready.',
      };
      void (w ? dialog.showMessageBox(w, opts) : dialog.showMessageBox(opts));
    }
  });

  autoUpdater.on('update-not-available', () => {
    log('up to date');
    if (manualCheck) {
      const w = getWindow();
      const opts = { type: 'info' as const, message: 'You are up to date', detail: `Pandas Dojo ${app.getVersion()} is the latest version.` };
      void (w ? dialog.showMessageBox(w, opts) : dialog.showMessageBox(opts));
    }
    manualCheck = false;
  });

  autoUpdater.on('error', (err) => {
    log('check failed', err);
    if (manualCheck) {
      dialog.showErrorBox('Could not check for updates', String(err?.message ?? err).split('\n')[0]);
    }
    manualCheck = false;
  });

  autoUpdater.on('update-downloaded', async (info) => {
    manualCheck = false;
    const w = getWindow();
    const opts = {
      type: 'info' as const,
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: `Pandas Dojo ${info.version} is ready`,
      detail: 'Restart to finish updating. Your progress and code are kept. If you choose Later, it installs the next time you close the app.',
    };
    const { response } = await (w ? dialog.showMessageBox(w, opts) : dialog.showMessageBox(opts));
    if (response === 0) autoUpdater.quitAndInstall();
  });

  const check = () => autoUpdater.checkForUpdates().catch((e) => log('check failed', e));
  setTimeout(check, FIRST_CHECK_DELAY_MS);
  setInterval(check, CHECK_EVERY_MS);
}

/** Help → Check for Updates… */
export function checkForUpdatesManually(win: BrowserWindow | null): void {
  if (!ready) {
    const opts = { type: 'info' as const, message: 'Updates are only checked in the installed app.' };
    void (win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts));
    return;
  }
  manualCheck = true;
  autoUpdater.checkForUpdates().catch((e) => {
    log('check failed', e);
    dialog.showErrorBox('Could not check for updates', String((e as Error).message ?? e).split('\n')[0]);
    manualCheck = false;
  });
}

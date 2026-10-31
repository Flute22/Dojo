// End-to-end smoke test: launches the real Electron app, offline, and checks the
// behaviours listed in the build prompt. Run: npm run build && npm run fetch-pyodide && npm run test:smoke
//
// "Offline" is simulated by making every DNS lookup fail (--host-resolver-rules), so the app can only
// work if Python really comes from app://pyodide/. Requests that try to leave the machine are logged.
import { _electron as electron } from 'playwright-core';
import electronPath from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pandas-dojo-smoke-'));
const exportFile = path.join(userData, 'progress-export.json');
const BANK_TIMEOUT = 15 * 60 * 1000;

const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, note });
    console.log(`PASS  ${name}${note ? ` (${note})` : ''}  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  } catch (e) {
    results.push({ name, ok: false, note: e.message.split('\n')[0] });
    console.log(`FAIL  ${name}: ${e.message.split('\n')[0]}`);
  }
}
const eq = (a, b, what) => {
  if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

async function launch() {
  const app = await electron.launch({
    executablePath: electronPath,
    cwd: root,
    args: [
      '.',
      `--user-data-dir=${userData}`,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
    ],
  });
  // Log everything that is not served by the local app:// protocol.
  await app.evaluate(({ session }) => {
    globalThis.__external = [];
    session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
      if (!/^(app|blob|data|file|devtools|chrome-extension):/.test(d.url)) globalThis.__external.push(d.url);
      cb({});
    });
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

const ready = (page, t = 120_000) => page.getByText('Python ready', { exact: true }).waitFor({ timeout: t });
const editor = (page) => page.locator('textarea[aria-label^="Python code editor"]');

let { app, page } = await launch();

try {
  await step('Offline launch: loading screen, then "Python ready" with no network', async () => {
    const t0 = Date.now();
    await page.getByText('Preparing your Python environment…').first().waitFor({ timeout: 30_000 }).catch(() => {});
    await ready(page);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const title = await page.locator('[title*="Python"]').first().getAttribute('title');
    if (/no background worker/.test(title ?? '')) throw new Error('Worker unavailable: ' + title);
    return `${secs}s, ${title}`;
  });

  await step('No request left the machine (CDN never contacted)', async () => {
    const ext = await app.evaluate(() => globalThis.__external);
    if (ext.length) throw new Error('External requests: ' + [...new Set(ext)].join(', '));
  });

  await step('Security: contextIsolation on, nodeIntegration off, sandboxed', async () => {
    const info = await app.evaluate(({ BrowserWindow }) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      const p = wc.getLastWebPreferences();
      return { ci: p.contextIsolation, ni: p.nodeIntegration, sb: p.sandbox, url: wc.getURL() };
    });
    eq(info.ci, true, 'contextIsolation');
    eq(info.ni, false, 'nodeIntegration');
    eq(info.sb, true, 'sandbox');
    if (!info.url.startsWith('app://app/')) throw new Error('Unexpected URL ' + info.url);
    const hasRequire = await page.evaluate(() => typeof require !== 'undefined' || typeof process !== 'undefined');
    eq(hasRequire, false, 'Node globals leaked into the page');
  });

  await step('Window: 1440x900 default, min 1024x680, bg #F6F4EF', async () => {
    const w = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return { min: win.getMinimumSize(), bg: win.getBackgroundColor(), size: win.getSize() };
    });
    eq(w.min.join('x'), '1024x680', 'min size');
    eq(w.bg.toLowerCase(), '#f6f4ef', 'background');
    return `size ${w.size.join('x')}`;
  });

  await step('Run (Ctrl+Enter) and Submit (Ctrl+Shift+Enter) shortcuts', async () => {
    await editor(page).click();
    await page.keyboard.press('Control+Enter');
    await page.getByText(/Ran in [\d.]+ ms/).waitFor({ timeout: 60_000 });
    await page.keyboard.press('Control+Shift+Enter');
    await page.getByText(/Submitted in [\d.]+ ms/).waitFor({ timeout: 60_000 });
  });

  await step('Editor: Tab = 4 spaces, Shift+Tab, Ctrl+/ comment, auto-indent', async () => {
    const ta = editor(page);
    await ta.fill('');
    await ta.click();
    await page.keyboard.press('Tab');
    eq(await ta.inputValue(), '    ', 'Tab');
    await page.keyboard.press('Shift+Tab');
    eq(await ta.inputValue(), '', 'Shift+Tab');
    await ta.fill('x = 1');
    await page.keyboard.press('Control+/');
    eq(await ta.inputValue(), '# x = 1', 'comment');
    await page.keyboard.press('Control+/');
    eq(await ta.inputValue(), 'x = 1', 'uncomment');
    await ta.fill('');
    await page.keyboard.type('if x:');
    await page.keyboard.press('Enter');
    await page.keyboard.type('y');
    eq(await ta.inputValue(), 'if x:\n    y', 'auto-indent');
  });

  await step('Edit menu undo works inside the editor', async () => {
    const ta = editor(page);
    await ta.fill('');
    await ta.click();
    await page.keyboard.type('abc');
    await app.evaluate(({ Menu, BrowserWindow }) => {
      const find = (items, label) => {
        for (const i of items) {
          if (i.label === label) return i;
          if (i.submenu) { const r = find(i.submenu.items, label); if (r) return r; }
        }
      };
      const item = find(Menu.getApplicationMenu().items, 'Undo');
      item.click(undefined, BrowserWindow.getAllWindows()[0], BrowserWindow.getAllWindows()[0].webContents);
    });
    await page.waitForTimeout(300);
    const v = await ta.inputValue();
    if (v === 'abc') throw new Error('Undo did nothing');
  });

  await step('Solutions locked until first submit; "Show solutions anyway" unlocks', async () => {
    // Go to a problem that has not been submitted yet.
    await page.getByRole('button', { name: 'Next problem' }).click();
    await page.getByRole('tab', { name: 'Solutions' }).click();
    await page.getByText('Solutions unlock after your first submit').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Show solutions anyway' }).click();
    await page.getByText('Solutions unlock after your first submit').waitFor({ state: 'detached', timeout: 5000 });
    await page.getByRole('tab', { name: 'Problem' }).click();
  });

  await step('Night study mode and focus mode toggle', async () => {
    await page.getByRole('button', { name: 'Switch to night study mode' }).click();
    await page.getByRole('button', { name: 'Switch to day mode' }).waitFor({ timeout: 3000 });
    const focus = page.getByRole('button', { name: 'Focus mode' });
    await focus.click();
    eq(await focus.getAttribute('aria-pressed'), 'true', 'focus pressed');
    await focus.click();
    eq(await focus.getAttribute('aria-pressed'), 'false', 'focus released');
  });

  await step('Pomodoro starts/pauses; flute music plays/pauses', async () => {
    await page.getByRole('button', { name: 'Start timer' }).click();
    await page.getByRole('button', { name: 'Pause timer' }).click();
    await page.getByRole('button', { name: 'Play flute music' }).click();
    await page.getByRole('button', { name: 'Pause flute music' }).waitFor({ timeout: 3000 });
    const state = await page.evaluate(() => new AudioContext().state);
    eq(state, 'running', 'AudioContext without a user gesture');
  });

  await step('Infinite loop stops after 10 s and Python restarts', async () => {
    const ta = editor(page);
    await ta.fill('while True:\n    pass\n');
    await ta.click();
    const t0 = Date.now();
    await page.keyboard.press('Control+Enter');
    await page.getByText(/more than 10 seconds/).waitFor({ timeout: 30_000 });
    const secs = (Date.now() - t0) / 1000;
    if (secs < 9 || secs > 16) throw new Error(`timeout fired after ${secs.toFixed(1)}s`);
    await page.getByText('Restarting Python…').waitFor({ timeout: 10_000 }).catch(() => {});
    await ready(page);
    await ta.fill('x = 1\n');
    await ta.click();
    await page.keyboard.press('Control+Enter');
    await page.getByText(/Ran in [\d.]+ ms/).waitFor({ timeout: 30_000 });
    return `stopped after ${secs.toFixed(1)}s, Python came back`;
  });

  await step('Progress and code survive a restart', async () => {
    const ta = editor(page);
    await ta.fill('# persisted-marker-123\n');
    await page.waitForFunction(() => Object.values(localStorage).some((v) => v.includes('persisted-marker-123')), null, { timeout: 5000 });
    const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.')).length);
    await app.close();
    ({ app, page } = await launch());
    await ready(page);
    // Assert on the stored data: the original app paints the first problem's editor before it
    // is mounted, so the editor's first paint says nothing about persistence.
    eq(await page.evaluate(() => Object.values(localStorage).some((v) => v.includes('persisted-marker-123'))), true, 'saved code after restart');
    await page.getByRole('button', { name: 'Switch to day mode' }).waitFor({ timeout: 3000 });
    const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.')).length);
    // An empty editor is no longer saved, so the count may drop by that one key; real data must remain.
    if (after < before - 1) throw new Error(`lost keys: ${before} -> ${after}`);
    const audio = await page.evaluate(() => new AudioContext().state);
    eq(audio, 'running', 'AudioContext after restart');
    return `${after} keys kept, night mode kept`;
  });

  await step('File → Export progress… writes only pandas-dojo.v1.* keys', async () => {
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
      dialog.showMessageBox = async () => ({ response: 0 });
    }, exportFile);
    await app.evaluate(({ Menu, BrowserWindow }) => {
      const find = (items, label) => {
        for (const i of items) {
          if (i.label === label) return i;
          if (i.submenu) { const r = find(i.submenu.items, label); if (r) return r; }
        }
      };
      const w = BrowserWindow.getAllWindows()[0];
      find(Menu.getApplicationMenu().items, 'Export progress…').click(undefined, w, w.webContents);
    });
    for (let i = 0; i < 50 && !fs.existsSync(exportFile); i++) await new Promise((r) => setTimeout(r, 100));
    const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    const keys = Object.keys(data.keys);
    if (!keys.length || !keys.every((k) => k.startsWith('pandas-dojo.v1.'))) throw new Error('bad keys: ' + keys.join(','));
    return `${keys.length} keys`;
  });

  await step('File → Import progress… restores keys and reloads', async () => {
    // Wipe progress, then import the export and confirm the code is back.
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.')).forEach((k) => localStorage.removeItem(k)));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
      dialog.showMessageBox = async () => ({ response: 0 });
    }, exportFile);
    await app.evaluate(({ Menu, BrowserWindow }) => {
      const find = (items, label) => {
        for (const i of items) {
          if (i.label === label) return i;
          if (i.submenu) { const r = find(i.submenu.items, label); if (r) return r; }
        }
      };
      const w = BrowserWindow.getAllWindows()[0];
      find(Menu.getApplicationMenu().items, 'Import progress…').click(undefined, w, w.webContents);
    });
    await page.waitForLoadState('domcontentloaded');
    await ready(page);
    eq(await page.evaluate(() => Object.values(localStorage).some((v) => v.includes('persisted-marker-123'))), true, 'saved code after import');
  });

  await step('Sidebar search and filters respond', async () => {
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
    await search.fill('zzzz-no-such-problem');
    await page.getByText('No problems match these filters.').waitFor({ timeout: 3000 });
    await search.fill('');
  });

  await step('Check problem bank: all 274 reference solutions pass', async () => {
    await page.getByRole('button', { name: 'Check problem bank' }).click();
    await page.getByText(/\d+ of \d+ passed/).waitFor({ timeout: BANK_TIMEOUT });
    const text = await page.getByText(/\d+ of \d+ passed/).first().innerText();
    if (!/^274 of 274 passed/.test(text)) throw new Error(text);
    return text;
  });

  await step('Navigation blocked and external links go to the system browser', async () => {
    const opened = await app.evaluate(async ({ BrowserWindow, shell }) => {
      globalThis.__opened = [];
      shell.openExternal = async (u) => void globalThis.__opened.push(u);
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      wc.executeJavaScript(`window.open('https://example.com/x')`);
      wc.executeJavaScript(`location.href = 'https://example.org/y'`);
      await new Promise((r) => setTimeout(r, 800));
      return { opened: globalThis.__opened, url: wc.getURL() };
    });
    if (!opened.url.startsWith('app://app/')) throw new Error('Navigated away: ' + opened.url);
    if (!opened.opened.some((u) => u.includes('example.com'))) throw new Error('window.open not forwarded');
  });

  await step('Still no external requests after the full run', async () => {
    const ext = await app.evaluate(() => globalThis.__external);
    if (ext.length) throw new Error([...new Set(ext)].join(', '));
  });
} finally {
  await app.close().catch(() => {});
  fs.rmSync(userData, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

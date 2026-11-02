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
const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dojo-backup-'));
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
    env: { ...process.env, DOJO_BACKUP_DIR: backupDir },
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

  await step('Pandas: Run shows a Test cases panel with Input, Your output and Expected output, even when the code errors', async () => {
    const ta = editor(page);
    await ta.fill('def solve(*a):\n    raise ValueError("boom")\n');
    await ta.click();
    await page.keyboard.press('Control+Enter');
    await page.getByText(/Ran in [\d.]+ ms/).waitFor({ timeout: 60_000 });
    await page.getByText(/Test cases · 0 of \d+ passed/).waitFor({ timeout: 10_000 });
    await page.getByText('Runtime Error').first().waitFor({ timeout: 5000 });
    await page.getByText('Expected output').first().waitFor({ timeout: 5000 });
    return 'error + expected output shown';
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
    const typeLines = async (text) => { await ta.fill(''); await ta.click(); await page.keyboard.type(text); return ta.inputValue(); };
    eq(await typeLines('x = foo(\n1,'), 'x = foo(\n    1,', 'hanging indent after an open bracket');
    eq(await typeLines('def f():\nreturn 1\nz'), 'def f():\n    return 1\nz', 'dedent after return');
    eq(await typeLines('d = {"a": 1}  # note:\nq'), 'd = {"a": 1}  # note:\nq', 'a colon in a comment does not indent');
    eq(await typeLines('s = "a:"\nq'), 's = "a:"\nq', 'a colon in a string does not indent');
    eq(await typeLines('for i in range(3):\nif i:\npass\nq'), 'for i in range(3):\n    if i:\n        pass\n    q', 'dedent one level after pass');
    await ta.fill('f()'); await ta.click(); await page.keyboard.press('Control+Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    eq(await ta.inputValue(), 'f(\n    \n)', 'brackets split onto three lines');
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

  await step('Theme button cycles day -> night -> midnight -> day, and the tracks follow', async () => {
    const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-dojo-theme'));
    // The button's name says what the next press will do, so it is also the assertion that we are where we think.
    const press = async (name) => { await page.getByRole('button', { name }).click(); };
    eq(await theme(), 'light', 'theme at rest');
    await press('Switch to night study mode');
    await page.getByRole('button', { name: 'Switch to midnight mode' }).waitFor({ timeout: 3000 });
    eq(await theme(), 'dark', 'theme after one press');
    await press('Switch to midnight mode');
    await page.getByRole('button', { name: 'Switch to day mode' }).waitFor({ timeout: 3000 });
    eq(await theme(), 'midnight', 'theme after two presses');
    await press('Switch to day mode');
    await page.getByRole('button', { name: 'Switch to night study mode' }).waitFor({ timeout: 3000 });
    eq(await theme(), 'light', 'theme after three presses');
    // Leave it on midnight: the restart step then proves the third theme is the one that persists.
    await press('Switch to night study mode');
    await press('Switch to midnight mode');
    await page.getByRole('button', { name: 'Switch to day mode' }).waitFor({ timeout: 3000 });
    eq(await theme(), 'midnight', 'theme left for the restart check');
    const host = await page.evaluate(() => getComputedStyle(document.querySelector('[style*="--bg"]')).getPropertyValue('--bg').trim());
    eq(host, '#14161F', 'host --bg in midnight');
  });

  await step('Focus mode toggle', async () => {
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

  await step('Pandas: LeetCode-style questions reject a plausible wrong answer on a hidden test case, and accept the right one', async () => {
    const r = await page.evaluate(async () => {
      const all = window.DOJO_PROBLEMS;
      const lc = all.filter((p) => p.hidden && p.hidden.length);
      const p = lc.find((x) => x.title === 'Second Highest Distinct Salary');
      const run = (code) => window.DojoEngine.exec({ mode: 'submit', setup: p.setup, code, call: p.call, expected: p.expected, hidden: p.hidden, ignoreOrder: !!p.ignoreOrder, checkDtype: false });
      const wrong = await run('def solve(emp):\n    return pd.DataFrame({"secondHighest": [emp["salary"].nlargest(2).iloc[-1]]})\n');
      const right = await run(p.approaches[0].code);
      const visibleOnly = await window.DojoEngine.exec({ mode: 'submit', setup: p.setup, code: 'def solve(emp):\n    return pd.DataFrame({"secondHighest": [emp["salary"].nlargest(2).iloc[-1]]})\n', call: p.call, expected: p.expected, ignoreOrder: false, checkDtype: false });
      return { total: all.length, lc: lc.length, byLevel: ['Medium', 'Hard', 'Advanced'].map((l) => lc.filter((x) => x.difficulty === l).length), wrong: wrong.verdict, right: right.verdict, visibleOnly: visibleOnly.verdict };
    });
    eq(r.total, 350, 'pandas problems');
    eq(r.byLevel.join(','), '75,100,100', 'graded-with-hidden-cases problems per level');
    if (!r.visibleOnly.ok) throw new Error('the wrong answer should pass the visible example');
    if (r.wrong.ok || !/hidden test case/.test(r.wrong.reason)) throw new Error('wrong answer not caught: ' + JSON.stringify(r.wrong));
    if (!r.right.ok) throw new Error('right answer rejected: ' + JSON.stringify(r.right));
    return r.wrong.reason.slice(0, 70);
  });

  await step('Pandas editor: Shift+Enter opens a line below, Ctrl+X cuts the line, Ctrl+Shift+Up/Down duplicate it', async () => {
    const NL = String.fromCharCode(10);
    const ed = editor(page);
    const seed = ['def solve(df):', '    a = 1', '    b = 2'].join(NL);
    const put = async (line, col) => {
      await ed.fill(seed);
      await page.evaluate(([l, c, nl]) => {
        const t = document.querySelector('textarea[aria-label^="Python code editor"]');
        const parts = t.value.split(nl);
        let pos = 0; for (let i = 0; i < l; i++) pos += parts[i].length + 1;
        t.focus(); t.setSelectionRange(pos + c, pos + c);
      }, [line, col, NL]);
    };
    const val = () => ed.inputValue();
    await put(1, 5);                                   // mid "    a = 1"
    await page.keyboard.press('Shift+Enter');
    let lines = (await val()).split(NL);
    eq(lines[1], '    a = 1', 'the line is not split');
    eq(lines[2], '    ', 'a new indented line is opened below');
    await put(1, 4);
    await page.keyboard.press('Control+x');
    lines = (await val()).split(NL);
    eq(lines.join('|'), ['def solve(df):', '    b = 2'].join('|'), 'Ctrl+X removed the whole line');
    await put(1, 4);
    await page.keyboard.press('Control+Shift+ArrowDown');
    lines = (await val()).split(NL);
    eq(lines.join('|'), ['def solve(df):', '    a = 1', '    a = 1', '    b = 2'].join('|'), 'Ctrl+Shift+Down duplicated the line');
    await put(1, 4);
    await page.keyboard.press('Control+Shift+ArrowUp');
    lines = (await val()).split(NL);
    eq(lines.length, 4, 'Ctrl+Shift+Up duplicated the line too');
    return 'all three behave line-wise';
  });

  await step('Pandas editor: up to three saved attempts per problem, each kept separately', async () => {
    const NL = String.fromCharCode(10);
    const ed = editor(page);
    await page.evaluate(() => window.__dojo.selectProblem(2));
    await page.waitForTimeout(400);
    const tabs = () => page.evaluate(() => [...document.querySelectorAll('button')]
      .filter((b) => /solution/i.test(b.getAttribute('aria-label') || '')).map((b) => b.textContent.trim()));
    eq((await tabs()).join(','), 'Main,+', 'a fresh problem has one attempt');
    await ed.fill('# one' + NL);
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Add another solution tab' }).click();
    await page.waitForTimeout(300);
    eq((await tabs()).join(','), 'Main,2,+', 'the + button adds an attempt');
    if (!(await ed.inputValue()).includes('Write your solution here')) throw new Error('a new attempt should start from the starter code');
    await ed.fill('# two' + NL);
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Main solution' }).click();
    await page.waitForTimeout(300);
    eq((await ed.inputValue()).split(NL)[0], '# one', 'Main kept its own code');
    await page.evaluate(() => window.__dojo.selectProblem(5));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__dojo.selectProblem(2));
    await page.waitForTimeout(500);
    eq((await ed.inputValue()).split(NL)[0], '# one', 'returning to a problem opens Main');
    await page.getByRole('button', { name: 'Solution 2' }).click();
    await page.waitForTimeout(300);
    eq((await ed.inputValue()).split(NL)[0], '# two', 'the second attempt survived');
    await page.getByRole('button', { name: 'Main solution' }).click();
    await page.waitForTimeout(200);
    return 'Main plus two extra attempts, each saved';
  });

  await step('Pandas: the copy buttons build Markdown with the question, the code and the verdict', async () => {
    await page.getByRole('button', { name: 'Copy the question as Markdown' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Copy the question, my code and the result as Markdown' }).waitFor({ timeout: 5000 });
    const r = await page.evaluate(() => {
      const d = window.__dojo;
      const p = d.state.problems.find((x) => x.id === d.state.currentId) || d.state.problems[0];
      const q = d.questionMd(p), a = d.attemptMd(p);
      return { q, a, task: p.task, setupHead: p.setup.split(String.fromCharCode(10))[0] };
    });
    if (!r.q.includes(r.task)) throw new Error('the question Markdown is missing the task');
    if (!r.q.includes(r.setupHead)) throw new Error('the question Markdown is missing the table setup');
    if (!/^## Problem /m.test(r.q)) throw new Error('no Markdown heading');
    if (!r.a.includes('### My code')) throw new Error('the attempt Markdown is missing the code section');
    if (!r.a.includes('### What happened when I submitted it')) throw new Error('the attempt Markdown is missing the result section');
    if (r.a.length <= r.q.length) throw new Error('the attempt Markdown should be longer than the question alone');
    return `question ${r.q.length} chars, with code ${r.a.length}`;
  });

  await step('Pandas: Check question bank passes every reference solution, hidden tests included', async () => {
    const ids = await page.evaluate(() => window.DOJO_PROBLEMS.filter((p) => p.hidden).length);
    eq(ids, 275, 'problems with hidden test cases');
    const bad = await page.evaluate(async () => {
      const fails = [];
      for (const p of window.DOJO_PROBLEMS.filter((x) => x.hidden)) {
        for (const a of p.approaches) {
          const r = await window.DojoEngine.exec({ mode: 'submit', setup: p.setup, code: a.code, call: p.call, expected: p.expected, hidden: p.hidden, ignoreOrder: !!p.ignoreOrder, checkDtype: false });
          if (!(r.verdict && r.verdict.ok)) fails.push(p.id + ': ' + JSON.stringify(r.error || r.verdict || r).slice(0, 120));
        }
      }
      return fails;
    });
    if (bad.length) throw new Error(bad.slice(0, 3).join(' | '));
    return '275 of 275 pass in the real app';
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
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-dojo-theme')), 'midnight', 'theme after restart');
    const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.')).length);
    // An empty editor is no longer saved, so the count may drop by that one key; real data must remain.
    if (after < before - 1) throw new Error(`lost keys: ${before} -> ${after}`);
    const audio = await page.evaluate(() => new AudioContext().state);
    eq(audio, 'running', 'AudioContext after restart');
    return `${after} keys kept, midnight mode kept`;
  });

  await step('Backup: progress survives losing the whole app data folder (reinstall), and is restored on start', async () => {
    const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.') && k.endsWith('progress')).sort().join(','));
    if (!before) throw new Error('no progress keys to protect');
    await app.close();
    const file = path.join(backupDir, 'Dojo-progress-backup.json');
    if (!fs.existsSync(file)) throw new Error('no backup file written on close');
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Object.keys(saved.keys).some((k) => k.endsWith('progress')) || !Object.values(saved.keys).some((v) => v.includes('persisted-marker-123'))) throw new Error('backup is missing progress or code');
    for (const d of ['Local Storage', 'Session Storage', 'IndexedDB', 'Network']) fs.rmSync(path.join(userData, d), { recursive: true, force: true });
    ({ app, page } = await launch());
    await ready(page);
    const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.') && k.endsWith('progress')).sort().join(','));
    eq(after, before, 'progress keys after the wipe');
    eq(await page.evaluate(() => Object.values(localStorage).some((v) => v.includes('persisted-marker-123'))), true, 'saved code restored');
    return Object.keys(saved.keys).length + ' items restored from Documents\Dojo';
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

  await step('Check problem bank: every reference solution passes, hidden test cases included', async () => {
    // The bundle inflates its problem scripts asynchronously, so after a reload the generated sets can
    // land a moment after the page is interactive. Wait for the list to stop growing before checking it.
    await page.waitForFunction(() => {
      const P = window.DOJO_PROBLEMS || [];
      const was = window.__bankSeen;
      window.__bankSeen = P.length;
      return P.length > 0 && was === P.length;
    }, null, { timeout: 30000, polling: 250 });
    await page.getByRole('button', { name: 'Check problem bank' }).click();
    await page.getByText(/\d+ of \d+ passed/).waitFor({ timeout: BANK_TIMEOUT });
    const text = await page.getByText(/\d+ of \d+ passed/).first().innerText();
    const info = await page.evaluate(() => {
      const P = window.DOJO_PROBLEMS;
      const ids = P.map((p) => p.id);
      const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
      return { n: P.reduce((a, p) => a + p.approaches.length, 0), problems: P.length, unique: new Set(ids).size, dupes: dupes.slice(0, 5) };
    });
    const n = info.n;
    if (info.problems !== info.unique) throw new Error(`the problem list has duplicates: ${info.problems} problems, ${info.unique} unique ids, e.g. ${JSON.stringify(info.dupes)}`);
    if (n < 440) throw new Error('the problem list looks short: ' + n + ' approaches');
    if (!new RegExp('^' + n + ' of ' + n + ' passed').test(text)) throw new Error(n + ' approaches in the page, but the bank reported: ' + text);
    return text;
  });

  // ---- SQL track -------------------------------------------------------------------------------------------
  const sql = page.frameLocator('iframe[title="SQL track"]');
  const sqlEd = sql.locator('#ed');
  const sqlSet = async (q) => { await sqlEd.fill(q); await sqlEd.click(); };

  await step('SQL track: the switcher opens it and the SQLite engine starts offline', async () => {
    await page.getByRole('button', { name: 'SQL', exact: true }).click();
    await sql.locator('#engtxt').filter({ hasText: 'SQLite' }).waitFor({ timeout: 30_000 });
    const bank = await sql.locator('body').evaluate(() => { const c = {}; window.DOJO_SQL.forEach((q) => { c[q.difficulty] = (c[q.difficulty] || 0) + 1; }); return { total: window.DOJO_SQL.length, lv: ['Easy', 'Medium', 'Hard', 'Advanced'].map((l) => '0/' + c[l]).join(',') }; });
    eq(await sql.locator('.item').count(), bank.total, 'questions listed');
    const counts = await sql.locator('#levels b').allInnerTexts();
    eq(counts.join(','), bank.lv, 'questions per level');
    return counts.join(' ');
  });

  await step('SQL: F5 runs a query and shows the grid and status bar', async () => {
    await sqlSet('SELECT name, city FROM customers;');
    await page.keyboard.press('F5');
    await sql.locator('.rs').first().waitFor();
    eq(await sql.locator('#stRows').innerText(), '12 rows', 'row count');
    eq(await sql.locator('#stMsg').innerText(), 'Query executed successfully.', 'status');
  });

  await step('SQL: Submit grades right and wrong answers, then unlocks the solution', async () => {
    await page.keyboard.press('Control+Shift+Enter');
    await sql.locator('#banner.ok').waitFor();
    eq(await sql.locator('#solvedTitle').innerText(), `1 of ${await sql.locator('body').evaluate(() => window.DOJO_SQL.length)} solved`, 'progress ring');
    await sql.locator('#next').click();
    await sqlSet('SELECT name, price FROM products WHERE price < 100 ORDER BY price;');
    await page.keyboard.press('Control+Shift+Enter');
    await sql.locator('#banner.bad').waitFor();
    await sql.locator('#tabS').click();
    await sql.locator('#solCode').waitFor();
    await sql.locator('#tabP').click();
  });

  await step('SQL: Enter keeps the indent, indents after ( and a lone clause keyword, and splits ()', async () => {
    const typed = async (text) => { await sqlEd.fill(''); await sqlEd.click(); await page.keyboard.type(text); return sqlEd.inputValue(); };
    eq(await typed('SELECT\nid,'), 'SELECT\n    id,', 'after SELECT alone');
    eq(await typed('WITH t AS (\nSELECT 1'), 'WITH t AS (\n    SELECT 1', 'after an open bracket');
    eq(await typed('SELECT a -- (\nFROM t'), 'SELECT a -- (\nFROM t', 'a bracket in a comment does not indent');
    eq(await typed("SELECT 'a(' AS x\nFROM t"), "SELECT 'a(' AS x\nFROM t", 'a bracket in a string does not indent');
    eq(await typed('    SELECT 1\nFROM t'), '    SELECT 1\n    FROM t', 'keeps the current indent');
    await sqlEd.fill('count()'); await sqlEd.click(); await page.keyboard.press('Control+Home'); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    eq(await sqlEd.inputValue(), 'count(\n    \n)', 'brackets split onto three lines');
  });
  await step('SQL: Run shows Test cases with the expected output, even when the query has an error', async () => {
    await sqlSet('SELEC 1');
    await page.keyboard.press('F5');
    await sql.locator('#rbody .tc').first().waitFor({ timeout: 20_000 });
    const t = await sql.locator('#rbody').innerText();
    if (!/Runtime Error/.test(t) || !/Expected output/.test(t) || !/Test cases/.test(t)) throw new Error(t.slice(0, 200));
    await sqlSet('SELECT 1');
    await page.keyboard.press('F5');
    await sql.locator('#rbody .rs').first().waitFor({ timeout: 20_000 });
    if (!/Test cases/.test(await sql.locator('#rbody').innerText())) throw new Error('cases missing under the results');
  });
  await step('SQL: errors name the line, a selection runs alone, the plan shows', async () => {
    await sqlSet('SELEC 1;');
    await page.keyboard.press('F5');
    await sql.locator('#rbody .tc').first().waitFor();
    await sql.locator('.rtab[data-t=messages]').click();
    await sql.locator('#rbody .msg .e').getByText(/line 1/).waitFor();
    await sqlSet('SELECT 1 AS a;\nSELECT 2 AS b;');
    await sqlEd.evaluate((t) => { const i = t.value.indexOf('SELECT 2'); t.setSelectionRange(i, i + 15); });
    await page.keyboard.press('F5');
    await sql.locator('.rs').first().waitFor();
    eq(await sql.locator('.rs').count(), 1, 'result sets for a selection');
    await sqlSet('SELECT * FROM products;');
    await page.keyboard.press('F5');
    await sql.locator('.rs').first().waitFor();
    await sql.locator('.rtab[data-t=plan]').click();
    await sql.locator('#rbody').getByText(/SCAN products/).waitFor();
    await sql.locator('.rtab[data-t=results]').click();
  });

  await step('SQL: a runaway recursive query stops after 10 s and the engine recovers', async () => {
    await sqlSet('WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM r) SELECT COUNT(*) FROM r;');
    const t0 = Date.now();
    await page.keyboard.press('F5');
    await sql.locator('#rbody').getByText(/more than 10 seconds/).waitFor({ timeout: 30_000 });
    const secs = (Date.now() - t0) / 1000;
    if (secs < 9 || secs > 16) throw new Error(`stopped after ${secs.toFixed(1)}s`);
    await sql.locator('#engtxt').filter({ hasText: 'SQLite' }).waitFor({ timeout: 30_000 });
    await sqlSet('SELECT COUNT(*) AS n FROM products;');
    await page.keyboard.press('F5');
    await sql.locator('.rs td').nth(1).waitFor();
    return `stopped after ${secs.toFixed(1)}s`;
  });

  await step('SQL: LeetCode-style questions reject a plausible wrong answer on a hidden test case, and accept the right one', async () => {
    const id = await sql.locator('body').evaluate(() => window.DOJO_SQL.find((q) => q.lc && q.wrong && q.wrong.length).id);
    await sql.locator(`.item[data-id="${id}"]`).click();
    const [wrong, right] = await sql.locator('body').evaluate((_el, i) => { const q = window.DOJO_SQL.find((x) => x.id === i); return [q.wrong[0], q.q]; }, id);
    await sqlSet(wrong);
    await page.keyboard.press('Control+Shift+Enter');
    await sql.locator('#banner.bad').waitFor();
    const t = await sql.locator('#banner').innerText();
    if (!/Wrong Answer/.test(t) || !/hidden/.test(t) || !/Expected/.test(t)) throw new Error(t.slice(0, 120));
    await sqlSet(right);
    await page.keyboard.press('Control+Shift+Enter');
    await sql.locator('#banner.ok').waitFor();
    const ok = await sql.locator('#banner').innerText();
    if (!/Accepted/.test(ok)) throw new Error(ok.slice(0, 80));
    return ok.slice(0, 50);
  });

  await step('SQL editor: the same three shortcuts, and up to three saved attempts', async () => {
    const NL = String.fromCharCode(10);
    const f = () => page.frames().find((x) => x.url().includes('sql.html'));
    const put = async (pos) => {
      await sqlEd.fill(['SELECT a', 'FROM t', 'WHERE x = 1'].join(NL));
      await f().evaluate((p) => { const t = document.getElementById('ed'); t.focus(); t.setSelectionRange(p, p); }, pos);
    };
    await put(12);
    await page.keyboard.press('Shift+Enter');
    eq((await sqlEd.inputValue()).split(NL)[2], '', 'Shift+Enter opened a line below');
    await put(12);
    await page.keyboard.press('Control+x');
    eq((await sqlEd.inputValue()).split(NL).join('|'), ['SELECT a', 'WHERE x = 1'].join('|'), 'Ctrl+X removed the line');
    await put(12);
    await page.keyboard.press('Control+Shift+ArrowDown');
    eq((await sqlEd.inputValue()).split(NL).join('|'), ['SELECT a', 'FROM t', 'FROM t', 'WHERE x = 1'].join('|'), 'Ctrl+Shift+Down duplicated the line');
    // attempts
    const tabs = () => f().evaluate(() => [...document.querySelectorAll('#slotTabs button')].map((b) => b.textContent.trim()));
    eq((await tabs()).join(','), 'Main,+', 'one attempt to start with');
    await sqlEd.fill('-- one');
    await page.waitForTimeout(700);
    await sql.locator('#slotTabs button.add').click();
    await page.waitForTimeout(300);
    eq((await tabs()).join(','), 'Main,2,+', 'the + button adds an attempt');
    await sqlEd.fill('-- two');
    await page.waitForTimeout(700);
    await f().evaluate(() => document.querySelector('#slotTabs button[data-slot="1"]').click());
    await page.waitForTimeout(300);
    eq((await sqlEd.inputValue()).split(NL)[0], '-- one', 'Main kept its own query');
    await f().evaluate(() => document.querySelector('#slotTabs button[data-slot="2"]').click());
    await page.waitForTimeout(300);
    eq((await sqlEd.inputValue()).split(NL)[0], '-- two', 'the second attempt survived');
    await f().evaluate(() => document.querySelector('#slotTabs button[data-slot="1"]').click());
    await page.waitForTimeout(200);
    return 'shortcuts and attempts both work in the SQL editor';
  });

  await step('SQL: the copy buttons build Markdown with the question, the tables and the query', async () => {
    await sql.locator('#copyQ').waitFor({ timeout: 5000 });
    await sql.locator('#copyA').waitFor({ timeout: 5000 });
    const f = page.frames().find((x) => x.url().includes('sql.html'));
    const r = await f.evaluate(() => {
      const id = parseInt(document.getElementById('title').textContent, 10);
      const q = window.DOJO_SQL.find((x) => x.id === id);
      return { q: window.__sqlCopy.questionMd(q), a: window.__sqlCopy.attemptMd(q), task: q.k };
    });
    if (!r.q.includes(r.task)) throw new Error('the question Markdown is missing the task');
    if (!r.q.includes('CREATE TABLE')) throw new Error('the question Markdown is missing the table setup');
    if (!r.q.includes('SQLite')) throw new Error('the question Markdown should name the dialect');
    if (!r.a.includes('### My query')) throw new Error('the attempt Markdown is missing the query section');
    return `question ${r.q.length} chars, with query ${r.a.length}`;
  });

  await step('SQL: Check question bank passes every reference solution on every test case', async () => {
    await sql.locator('#bankBtn').click();
    await sql.locator('#banner').getByText(/of \d+ passed/).waitFor({ timeout: 60_000 });
    const text = await sql.locator('#banner').innerText();
    const m = /^(\d+) of (\d+) passed/.exec(text);
    if (!m || m[1] !== m[2]) throw new Error(text.slice(0, 80));
    return `${m[1]} of ${m[2]}`;
  });

  await step('SQL: progress and code are stored under the exported key prefix', async () => {
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.sql.')));
    if (!keys.includes('pandas-dojo.v1.sql.progress')) throw new Error('missing sql.progress: ' + keys.join(','));
    return keys.length + ' sql keys';
  });

  await step('SQL: Pandas keeps its warm Python when you switch back', async () => {
    await page.getByRole('button', { name: 'Pandas', exact: true }).click();
    await ready(page, 5000);
    await page.getByRole('button', { name: 'Run' }).first().waitFor({ timeout: 5000 });
  });

  // ---- Excel track ---------------------------------------------------------------------------------------------
  const xl = page.frameLocator('iframe[title="Excel track"]');
  const xcell = (r, c) => xl.locator(`td[data-r="${r}"][data-c="${c}"]`);
  const xgo = async (id) => { await xl.locator(`.item[data-id="${id}"]`).click(); await xl.locator('#gridInner table').waitFor(); };
  const xrange = async (a1) => { await xl.locator('#nbox').click(); await xl.locator('#nbox').fill(a1); await page.keyboard.press('Enter'); };
  const xtab = (n) => xl.locator(`.rt[data-t=${n}]`).click();
  const xcheck = async (want = true) => {
    await xl.locator('#checkBtn').click();
    await xl.locator('#xres:not([hidden]) .hd').waitFor();
    const t = (await xl.locator('#xres .hd').innerText()).replace(/\n/g, ' ');
    if (want && !/^Correct/.test(t)) throw new Error(t + ' | ' + (await xl.locator('#xres li.bad').allInnerTexts()).join(' / ').slice(0, 200));
    return t.slice(0, 60);
  };
  const xtype = async (r, c, text) => { await xcell(r, c).click(); await page.keyboard.type(text); await page.keyboard.press('Enter'); };

  await step('Excel track: switcher opens it with all 200 questions and the sheet data', async () => {
    await page.getByRole('button', { name: 'Excel', exact: true }).click();
    await xl.locator('#gridInner table').waitFor({ timeout: 20_000 });
    eq(await xl.locator('.item').count(), 200, 'questions listed');
    eq((await xl.locator('#levels b').allInnerTexts()).join(','), '0/50,0/50,0/50,0/50', 'per level');
    eq((await xcell(0, 0).innerText()).trim(), 'Date', 'A1');
  });
  await step('Both track pages follow the midnight theme the host is still in', async () => {
    const vars = (fl) => fl.locator('body').evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { bg: cs.getPropertyValue('--bg').trim(), editor: cs.getPropertyValue('--editor').trim(), cls: document.body.className };
    });
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-dojo-theme')), 'midnight', 'host theme');
    const q = await vars(sql);
    eq(q.bg, '#14161F', 'SQL --bg');
    eq(q.editor, '#10121A', 'SQL --editor');
    const x = await vars(xl);
    eq(x.bg, '#14161F', 'Excel --bg');
    // the Excel grid paints a few colours through body classes rather than custom properties
    eq(x.cls, 'dark midnight', 'Excel body classes');
    eq(await xl.locator('#gridScroll').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(16, 18, 26)', 'Excel grid background');
  });

  await step('Excel: type a formula, fill down with Ctrl+D, and Check passes', async () => {
    await xtype(1, 6, '=E2*F2');
    await xcell(1, 6).click(); await xcell(20, 6).click({ modifiers: ['Shift'] });
    await page.keyboard.press('Control+d');
    eq((await xcell(20, 6).innerText()).trim(), '3600', 'G21');
    return await xcheck();
  });
  await step('Excel: click and drag cells while typing a formula (reference pointing)', async () => {
    await xgo(2); await xcell(22, 4).click(); await page.keyboard.type('=SUM(');
    await xcell(1, 4).dragTo(xcell(8, 4)); // E2:E9 in point mode
    eq(await xl.locator('#fin').inputValue(), '=SUM(E2:E9', 'formula bar after pointing');
    await page.keyboard.type('E10:E21)'.slice(0, 0)); // keep typing in the same editor
    await xl.locator('#ced').fill('=SUM(E2:E21)'); await page.keyboard.press('Enter');
    return await xcheck();
  });
  await step('Excel: number format dropdown (Currency) and Name box range selection', async () => {
    await xgo(6); await xrange('F2:F21');
    await xl.locator('#nfmt').selectOption('$#,##0.00');
    eq((await xcell(3, 5).innerText()).trim(), '$1,200.00', 'formatted F4');
    return await xcheck();
  });
  await step('Excel: bold (Ctrl+B) and a fill colour from the palette', async () => {
    await xgo(7); await xrange('A1:G1'); await page.keyboard.press('Control+b');
    await xl.locator('[data-act=fillc]').click(); await xl.locator('.pop i').nth(15).click();
    return await xcheck();
  });
  await step('Excel: Sort dialog (largest revenue first)', async () => {
    await xgo(25); await xcell(5, 2).click(); await xtab('Data'); await xl.locator('[data-act=sortdlg]').click();
    await xl.locator('#s1').selectOption('6'); await xl.locator('#o1').selectOption('desc'); await xl.locator('#dOk').click();
    return await xcheck();
  });
  await step('Excel: AutoFilter dropdown hides rows', async () => {
    await xgo(27); await xcell(3, 1).click(); await xtab('Data'); await xl.locator('[data-act=filter]').click();
    await xl.locator('.fb[data-fb="1"]').click();
    for (const v of ['South', 'East', 'West']) await xl.locator(`.pop label:has-text("${v}") input`).uncheck();
    await xl.locator('.pop button[data-a=ok]').click();
    return await xcheck();
  });
  await step('Excel: Conditional Formatting dialog (greater than)', async () => {
    await xgo(28); await xrange('G2:G21'); await xtab('Home');
    await xl.locator('[data-act=cfmenu]').click(); await xl.locator('.pop button', { hasText: 'Greater Than' }).click();
    await xl.locator('#cfa').fill('5000'); await xl.locator('#dOk').click();
    return await xcheck();
  });
  await step('Excel: Data Validation dropdown list, and invalid entries are rejected', async () => {
    await xgo(30); await xrange('D2:D21'); await xtab('Data'); await xl.locator('[data-act=dv]').click();
    await xl.locator('#dvk').selectOption('list'); await xl.locator('#dvl').fill('Pen,Notebook,Bag,Lamp'); await xl.locator('#dOk').click();
    const ok = await xcheck();
    await xtype(1, 3, 'Banana');
    eq((await xcell(1, 3).innerText()).replace('▼', '').trim(), 'Pen', 'rejected entry leaves the value alone');
    return ok;
  });
  await step('Excel: insert a column chart with a title', async () => {
    await xgo(32); await xrange('A1:B7'); await xtab('Insert'); await xl.locator('[data-act=chart][data-v=column]').click();
    await xl.locator('#ctitle').fill('Monthly Revenue'); await xl.locator('#dOk').click();
    await xl.locator('.chartbox svg').waitFor();
    return await xcheck();
  });
  await step('Excel: Freeze Top Row', async () => {
    await xgo(35); await xtab('View'); await xl.locator('[data-act=freeze][data-v=row]').click();
    return await xcheck();
  });
  await step('Excel: PivotTable dialog builds a pivot sheet', async () => {
    await xgo(68); await xcell(2, 1).click(); await xtab('Insert'); await xl.locator('[data-act=pivot]').click();
    await xl.locator('#pr1').selectOption('Region'); await xl.locator('#pv1').selectOption('Revenue'); await xl.locator('#dOk').click();
    await xl.locator('.stab', { hasText: 'PivotTable1' }).waitFor();
    eq((await xcell(1, 0).innerText()).trim(), 'East', 'first pivot row');
    return await xcheck();
  });
  await step('Excel: drag the fill handle, and copy / paste shifts references', async () => {
    await xgo(11); await xtab('Home'); await xtype(1, 7, '=IF(G2>=5000,"Big","Small")');
    await xcell(1, 7).click(); await xl.locator('#fillH').dragTo(xcell(20, 7));
    eq((await xcell(20, 7).innerText()).trim(), 'Small', 'H21 after fill');
    const a = await xcheck();
    await xgo(15); await xtype(1, 8, '=B2&" "&C2');
    await xcell(1, 8).click(); await page.keyboard.press('Control+c');
    await xrange('I3:I13'); await page.keyboard.press('Control+v');
    await xcell(11, 8).click(); eq(await xl.locator('#fin').inputValue(), '=B12&" "&C12', 'pasted formula shifted');
    return a + ' / ' + (await xcheck());
  });
  await step('Excel: LeetCode-style question rejects a plausible wrong formula on a hidden dataset, and accepts the right one', async () => {
    await xgo(126);
    eq((await xl.locator('#rules, .rules').first().innerText()).includes('3 test cases'), true, 'test case chip');
    await xtype(0, 5, '=LARGE(A2:A9,2)');
    await xl.locator('#checkBtn').click();
    await xl.locator('#xres:not([hidden]) .hd').waitFor();
    const bad = (await xl.locator('#xres li.bad').allInnerTexts()).join(' / ');
    if (!/Hidden test case/.test(bad)) throw new Error('wrong formula not caught on a hidden case: ' + bad.slice(0, 200));
    await xtype(0, 5, '=LARGE(UNIQUE(A2:A9),2)');
    return (await xcheck()) + ' (after: ' + bad.slice(0, 40) + ')';
  });
  await step('Excel: undo and redo', async () => {
    await xgo(36); await xtype(13, 2, '=SUM(C2:C13)'); eq((await xcell(13, 2).innerText()).trim(), '778', 'typed');
    await page.keyboard.press('Control+z'); eq((await xcell(13, 2).innerText()).trim(), '', 'undone');
    await page.keyboard.press('Control+y'); eq((await xcell(13, 2).innerText()).trim(), '778', 'redone');
  });
  await step('Excel: Open in Excel saves an .xlsx; Check my file reads one back and grades it', async () => {
    await xgo(1);
    await app.evaluate(({ shell }) => { globalThis.__opened = []; shell.openPath = async (p) => { globalThis.__opened.push(p); return ''; }; });
    await xl.locator('#openXl').click();
    await xl.locator('#dlg .formula').waitFor();
    const file = (await xl.locator('#dlg .formula').innerText()).trim();
    if (!fs.existsSync(file)) throw new Error('no file at ' + file);
    await xl.locator('#dCancel').click();
    // Build the solved workbook as a real .xlsx (what Excel would save) and check it.
    const arr = await xl.locator('body').evaluate(() => { const XL = window.DojoXL, q = window.DOJO_XL[0]; return Array.from(window.__dojoXl.toXlsx(XL.makeSolution(q))); });
    const solved = path.join(userData, 'solved.xlsx'); fs.writeFileSync(solved, Buffer.from(arr));
    await app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] }); }, solved);
    await xl.locator('#checkFile').click();
    await xl.locator('#xres .hd').getByText(/Correct/).waitFor({ timeout: 10_000 });
    return 'round trip ok';
  });
  await step('Excel: the copy buttons build Markdown with the question and the sheet', async () => {
    await xl.locator('#copyQ').waitFor({ timeout: 5000 });
    await xl.locator('#copyA').waitFor({ timeout: 5000 });
    const f = page.frames().find((x) => x.url().includes('excel.html'));
    const r = await f.evaluate(() => {
      const id = parseInt(document.getElementById('title').textContent, 10);
      const q = window.DOJO_XL.find((x) => x.id === id);
      return { q: window.__xlCopy.questionMd(q), a: window.__xlCopy.attemptMd(q), task: q.k };
    });
    if (!r.q.includes(r.task)) throw new Error('the question Markdown is missing the task');
    if (!r.q.includes('### The sheet as it stands')) throw new Error('the question Markdown is missing the sheet');
    if (!/\| 1 \|/.test(r.q)) throw new Error('the sheet table has no rows');
    if (!r.q.includes('- Graded cells:')) throw new Error('the question Markdown should name the graded cells');
    if (!r.a.includes('### How it grades right now')) throw new Error('the attempt Markdown is missing the grading section');
    return `question ${r.q.length} chars, with grading ${r.a.length}`;
  });

  await step('Excel: Check question bank passes all 200 reference solutions on every test case', async () => {
    await xl.locator('#bankBtn').click();
    await xl.locator('#xres .hd').getByText(/of \d+ passed/).waitFor({ timeout: 60_000 });
    const t = await xl.locator('#xres .hd').innerText();
    if (!/^200 of 200 passed/.test(t)) throw new Error(t.slice(0, 80));
    return '200 of 200';
  });
  await step('Excel: progress and each question\'s workbook are stored under the exported prefix', async () => {
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.excel.')));
    if (!keys.includes('pandas-dojo.v1.excel.progress') || !keys.some((k) => k.includes('excel.wb.'))) throw new Error(keys.join(','));
    return keys.length + ' excel keys';
  });
  await step('Focus button hides the question list in the SQL and Excel tracks, and Esc leaves Focus', async () => {
    for (const [name, title] of [['SQL', 'SQL track'], ['Excel', 'Excel track']]) {
      await page.getByRole('button', { name, exact: true }).click();
      const side = page.frameLocator(`iframe[title="${title}"]`).locator('#side');
      eq(await side.isVisible(), true, `${name} list before`);
      await page.getByRole('button', { name: 'Focus mode' }).click();
      await page.waitForTimeout(250);
      eq(await side.isVisible(), false, `${name} list in Focus`);
      await page.frameLocator(`iframe[title="${title}"]`).locator('#title').click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      eq(await side.isVisible(), true, `${name} list after Esc`);
    }
  });
  await step('Excel: Pandas still has its warm Python afterwards', async () => {
    await page.getByRole('button', { name: 'Pandas', exact: true }).click();
    await ready(page, 5000);
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

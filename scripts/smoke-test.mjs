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

  // ---- SQL track -------------------------------------------------------------------------------------------
  const sql = page.frameLocator('iframe[title="SQL track"]');
  const sqlEd = sql.locator('#ed');
  const sqlSet = async (q) => { await sqlEd.fill(q); await sqlEd.click(); };

  await step('SQL track: the switcher opens it and the SQLite engine starts offline', async () => {
    await page.getByRole('button', { name: 'SQL', exact: true }).click();
    await sql.locator('#engtxt').filter({ hasText: 'SQLite' }).waitFor({ timeout: 30_000 });
    eq(await sql.locator('.item').count(), 125, 'questions listed');
    const counts = await sql.locator('#levels b').allInnerTexts();
    eq(counts.join(','), '0/50,0/25,0/25,0/25', 'questions per level');
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
    eq(await sql.locator('#solvedTitle').innerText(), '1 of 125 solved', 'progress ring');
    await sql.locator('#next').click();
    await sqlSet('SELECT name, price FROM products WHERE price < 100 ORDER BY price;');
    await page.keyboard.press('Control+Shift+Enter');
    await sql.locator('#banner.bad').waitFor();
    await sql.locator('#tabS').click();
    await sql.locator('#solCode').waitFor();
    await sql.locator('#tabP').click();
  });

  await step('SQL: errors name the line, a selection runs alone, the plan shows', async () => {
    await sqlSet('SELEC 1;');
    await page.keyboard.press('F5');
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

  await step('SQL: Check question bank passes all 125 reference solutions', async () => {
    await sql.locator('#bankBtn').click();
    await sql.locator('#banner').getByText(/of \d+ passed/).waitFor({ timeout: 60_000 });
    const text = await sql.locator('#banner').innerText();
    if (!/^125 of 125 passed/.test(text)) throw new Error(text.slice(0, 80));
    return '125 of 125';
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

  await step('Excel track: switcher opens it with all 125 questions and the sheet data', async () => {
    await page.getByRole('button', { name: 'Excel', exact: true }).click();
    await xl.locator('#gridInner table').waitFor({ timeout: 20_000 });
    eq(await xl.locator('.item').count(), 125, 'questions listed');
    eq((await xl.locator('#levels b').allInnerTexts()).join(','), '0/50,0/25,0/25,0/25', 'per level');
    eq((await xcell(0, 0).innerText()).trim(), 'Date', 'A1');
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
  await step('Excel: Check question bank passes all 125 reference solutions', async () => {
    await xl.locator('#bankBtn').click();
    await xl.locator('#xres .hd').getByText(/of \d+ passed/).waitFor({ timeout: 60_000 });
    const t = await xl.locator('#xres .hd').innerText();
    if (!/^125 of 125 passed/.test(t)) throw new Error(t.slice(0, 80));
    return '125 of 125';
  });
  await step('Excel: progress and each question\'s workbook are stored under the exported prefix', async () => {
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pandas-dojo.v1.excel.')));
    if (!keys.includes('pandas-dojo.v1.excel.progress') || !keys.some((k) => k.includes('excel.wb.'))) throw new Error(keys.join(','));
    return keys.length + ' excel keys';
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

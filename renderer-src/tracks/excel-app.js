/* Dojo Excel track: question list, panels, grading and the Open in Excel / Check my file options. */
(function () {
  'use strict';
  const XL = window.DojoXL;
  const Q = window.DOJO_XL;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LEVELS = ['Easy', 'Medium', 'Hard', 'Advanced'];

  // ---- storage and theme (same conventions as the SQL track) -----------------------------------------------------------
  const P = 'pandas-dojo.v1.';
  const S = {
    get(k, f) { try { const r = localStorage.getItem(P + k); return r == null ? f : JSON.parse(r); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(P + k); } catch (e) { /* ignore */ } },
  };
  const LIGHT = { '--bg': '#F6F4EF', '--panel': '#FDFCFA', '--sunk': '#EFECE5', '--line': '#E3DED4', '--text': '#2F3437', '--muted': '#5E6569', '--faint': '#8A9195', '--sage': '#A8BFA3', '--sage-ink': '#4E6A49', '--sage-tint': '#E6EEE3', '--slate': '#6B8CAE', '--slate-ink': '#557496', '--slate-text': '#4F6E90', '--slate-tint': '#E4EBF2', '--sand': '#E6D5B8', '--sand-tint': '#F5EDE0', '--sand-ink': '#7A5F33', '--terra': '#97503B', '--terra-tint': '#F5E8E1', '--editor': '#FFFFFF', '--gutter': '#F8F6F2', '--stripe': 'rgba(47,52,55,.025)', '--shadow': 'rgba(47,52,55,.05)', '--grid': '#D9D5CB' };
  const DARK = { '--bg': '#1E2428', '--panel': '#232A2F', '--sunk': '#2A3237', '--line': '#353E44', '--text': '#D3D8D3', '--muted': '#9CA5A7', '--faint': '#6F797D', '--sage': '#A8BFA3', '--sage-ink': '#B4CAAF', '--sage-tint': '#28332D', '--slate': '#7F9DBD', '--slate-ink': '#557496', '--slate-text': '#9DB5CF', '--slate-tint': '#27323C', '--sand': '#C9B48C', '--sand-tint': '#2F2B24', '--sand-ink': '#D8C49C', '--terra': '#D39D88', '--terra-tint': '#352826', '--editor': '#1A1F23', '--gutter': '#1D2327', '--stripe': 'rgba(255,255,255,.018)', '--shadow': 'rgba(0,0,0,.22)', '--grid': '#38424a' };
  function hostTheme() { try { return window.parent.document.documentElement.style.colorScheme === 'dark' ? 'dark' : 'light'; } catch (e) { return S.get('prefs', {}).theme === 'dark' ? 'dark' : 'light'; } }
  function applyTheme() { const dark = hostTheme() === 'dark'; const vars = dark ? DARK : LIGHT; Object.keys(vars).forEach((k) => document.documentElement.style.setProperty(k, vars[k])); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; document.body.classList.toggle('dark', dark); }
  applyTheme();
  try { new MutationObserver(applyTheme).observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['style'] }); } catch (e) { /* standalone */ }

  const st = { id: null, tab: 'problem', f: { lvl: 'All', status: 'all', topic: 'all', q: '' }, progress: S.get('excel.progress', {}), days: S.get('excel.days', []), prefs: S.get('excel.prefs', {}), shownHint: {}, unlocked: {}, sols: {} };
  const byId = (id) => Q.find((q) => q.id === id);
  const current = () => byId(st.id);
  const statusOf = (id) => (st.progress[id] && st.progress[id].status) || 'todo';
  const grid = window.DojoGrid();

  // ---- list and stats -------------------------------------------------------------------------------------------------------
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function streak() {
    const set = new Set(st.days); let n = 0; const d = new Date();
    const key = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    if (!set.has(key(d))) d.setDate(d.getDate() - 1);
    while (set.has(key(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStats() {
    const solved = Q.filter((q) => statusOf(q.id) === 'solved').length, c = 2 * Math.PI * 34;
    $('ringArc').setAttribute('stroke-dasharray', `${(c * solved / Q.length).toFixed(2)} ${c.toFixed(2)}`);
    $('solvedTitle').textContent = `${solved} of ${Q.length} solved`;
    const s = streak(); $('solvedSub').textContent = s > 0 ? `${s}-day streak. Keep it going.` : 'Solve one today to start a streak';
    $('levels').innerHTML = LEVELS.map((l) => { const all = Q.filter((q) => q.difficulty === l), done = all.filter((q) => statusOf(q.id) === 'solved').length; return `<div class="lvl"><span>${l}</span><div class="bar"><i style="width:${all.length ? 100 * done / all.length : 0}%"></i></div><b>${done}/${all.length}</b></div>`; }).join('');
  }
  function filtered() {
    const { lvl, status, topic, q } = st.f; const needle = q.trim().toLowerCase();
    return Q.filter((x) => (lvl === 'All' || x.difficulty === lvl) && (status === 'all' || statusOf(x.id) === status) && (topic === 'all' || x.tg.includes(topic)) && (!needle || (x.t + ' ' + x.tg.join(' ') + ' ' + x.id).toLowerCase().includes(needle)));
  }
  function renderList() {
    const list = filtered();
    $('list').innerHTML = list.length ? list.map((q) => { const s = statusOf(q.id); const tick = s === 'solved' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>' : ''; return `<button class="item${q.id === st.id ? ' sel' : ''}" data-id="${q.id}"><span class="dot ${s}">${tick}</span><span class="nm">${q.id}. ${esc(q.t)}</span><span class="df ${q.difficulty}">${q.difficulty}</span></button>`; }).join('') : '<p style="margin:16px 10px;font-size:13px;color:var(--muted)">No questions match these filters.</p>';
    $('count').textContent = `${Q.length} questions`;
  }
  function buildFilters() {
    $('lvlChips').innerHTML = ['All', 'Easy', 'Medium', 'Hard', 'Adv'].map((l) => { const v = l === 'Adv' ? 'Advanced' : l; return `<button class="chip" data-l="${v}" aria-pressed="${v === st.f.lvl}">${l}</button>`; }).join('');
    $('tgSel').innerHTML = '<option value="all">All topics</option>' + [...new Set(Q.flatMap((q) => q.tg))].sort().map((t) => `<option>${esc(t)}</option>`).join('');
  }

  // ---- question panel ---------------------------------------------------------------------------------------------------------
  function solutionFormulas(q) {
    if (st.sols[q.id]) return st.sols[q.id];
    const sol = XL.makeSolution(q); const out = [];
    (q.chk || []).forEach((spec) => {
      if (!spec.v) return;
      const s = sol.sheet(spec.sheet || q.main || sol.sheets[0].name), g = XL.parseRange(spec.v);
      const raw = sol.raw(s, g.r1, g.c1);
      if (XL.isFormula(raw)) out.push([`${s.name}!${XL.addr(g.r1, g.c1)}`, raw]);
    });
    st.sols[q.id] = out; return out;
  }
  function renderProblem() {
    const q = current(); if (!q) return;
    $('title').textContent = `${q.id}. ${q.t}`;
    const p = st.progress[q.id] || {};
    $('solvedPill').innerHTML = p.status === 'solved' ? '<span class="solvedpill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>Solved</span>' : '';
    $('badges').innerHTML = `<span class="badge d-${q.difficulty}">${q.difficulty}</span>` + q.tg.map((t) => `<span class="badge">${esc(t)}</span>`).join('');
    const unlocked = !!(p.unlocked || st.unlocked[q.id]);
    $('tabP').setAttribute('aria-selected', st.tab === 'problem'); $('tabS').setAttribute('aria-selected', st.tab === 'solutions'); $('lock').style.display = unlocked ? 'none' : '';
    const body = $('pbody');
    if (st.tab === 'solutions') {
      if (!unlocked) { body.innerHTML = '<div class="locked"><h2>Solutions unlock after your first check</h2><p style="font-size:13.5px;line-height:1.6;margin:0 0 14px">Give it an honest try first. Press Check with your best attempt and the solution opens.</p><button class="btn" id="unlockBtn">Show solutions anyway</button></div>'; return; }
      const fs = solutionFormulas(q);
      body.innerHTML = `<div class="lab">Key formulas</div>${fs.length ? fs.map(([a, f]) => `<div class="formula"><b>${esc(a)}</b> &nbsp; ${esc(f)}</div>`).join('') : '<p>This question is about formatting, rules or objects rather than formulas.</p>'}<div class="lab">Why it works</div><p>${esc(q.x)}</p><button class="btn" id="loadSol">Load the solved workbook into the grid</button>`;
      return;
    }
    body.innerHTML = `<p>${esc(q.s)}</p><div class="lab">Your task</div><p class="task">${esc(q.k)}</p>
      <div class="rules"><span class="rule">Graded on the result, not the method${(q.chk || []).some((c) => c.f) ? ', but formulas are required' : ''}</span></div>
      <div class="lab">Hint</div>${st.shownHint[q.id] ? `<div class="hint">${esc(q.h)}</div>` : '<button class="hintbtn" id="hintBtn">Show hint</button>'}`;
    body.scrollTop = 0;
  }

  // ---- workbook per question ---------------------------------------------------------------------------------------------------------
  let saveTimer = null;
  function scheduleSave(wb) { clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (st.id != null) S.set('excel.wb.' + st.id, JSON.stringify(wb.toJSON())); }, 400); }
  grid.onChange = (wb) => scheduleSave(wb);
  function loadWorkbook(q) {
    const saved = S.get('excel.wb.' + q.id, null);
    if (saved) { try { return XL.Workbook.fromJSON(JSON.parse(saved)); } catch (e) { /* fall through */ } }
    return XL.makeStart(q);
  }
  function select(id) {
    if (st.id != null && grid.getWb()) { clearTimeout(saveTimer); S.set('excel.wb.' + st.id, JSON.stringify(grid.getWb().toJSON())); }
    st.id = id; st.tab = 'problem';
    S.set('excel.prefs', Object.assign(st.prefs, { lastId: id }));
    const q = byId(id);
    grid.setWorkbook(loadWorkbook(q));
    $('wbName').textContent = `Book${id} - ${q.t}`;
    $('xres').hidden = true; $('stReady').textContent = 'Ready'; resetArmed = false; $('resetLbl').textContent = 'Reset';
    $('app').classList.remove('drawer');
    renderProblem(); renderList();
    const it = document.querySelector(`.item[data-id="${id}"]`); if (it) it.scrollIntoView({ block: 'nearest' });
  }
  function record(id, ok) {
    const prev = st.progress[id] || {};
    st.progress[id] = { status: ok ? 'solved' : (prev.status === 'solved' ? 'solved' : 'attempted'), attempts: (prev.attempts || 0) + 1, unlocked: true };
    S.set('excel.progress', st.progress);
    if (ok && !st.days.includes(today())) { st.days.push(today()); S.set('excel.days', st.days); }
    renderStats(); renderList(); renderProblem();
  }

  // ---- checking ----------------------------------------------------------------------------------------------------------------------------
  function showResults(results, fileMode) {
    const ok = results.every((r) => r.ok);
    const skipped = results.filter((r) => r.skipped).length;
    const hd = ok ? `<b>Correct.</b> All ${results.length - skipped} check${results.length - skipped === 1 ? '' : 's'} passed${skipped ? ` (${skipped} feature check${skipped === 1 ? '' : 's'} can only be verified in the built-in grid)` : ''}.` : `<b>Not quite.</b> ${results.filter((r) => !r.ok).length} of ${results.length} check${results.length === 1 ? '' : 's'} need attention.`;
    $('xres').hidden = false;
    $('xres').innerHTML = `<div class="hd ${ok ? 'ok' : 'bad'}">${hd}${fileMode ? ' (checked from your file)' : ''}</div><ul>${results.map((r) => `<li class="${r.skipped ? 'skip' : r.ok ? 'ok' : 'bad'}"><i>${r.skipped ? '–' : r.ok ? '✓' : '✗'}</i><span><b>${esc(r.label)}</b>${r.ok ? '' : ': ' + esc(r.msg)}</span></li>`).join('')}</ul>`;
    return ok;
  }
  function check() {
    const q = current(); if (!q) return;
    const wb = grid.getWb();
    try { wb.refreshPivots(); } catch (e) { /* ignore */ }
    grid.render();
    const results = XL.grade(q, wb);
    record(q.id, showResults(results, false));
  }
  $('checkBtn').addEventListener('click', check);
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); } });

  // ---- real Excel ---------------------------------------------------------------------------------------------------------------------------
  const native = () => { try { return window.parent.dojoNative; } catch (e) { return null; } };
  function toXlsx(wb) {
    const book = XLSX.utils.book_new();
    wb.recalc();
    wb.sheets.forEach((s) => {
      const ws = {}; const u = s.used();
      for (let r = 0; r <= u.r2; r++) for (let c = 0; c <= u.c2; c++) {
        const cell = s.get(r, c); const v = wb.valueAt(s, r, c);
        const fmt = wb.fmtAt(s, r, c);
        if ((!cell || cell.raw === null || cell.raw === undefined) && v === null) continue;
        const o = {};
        if (XL.isErr(v)) { o.t = 'e'; o.v = 0; } else if (typeof v === 'number') { o.t = 'n'; o.v = v; } else if (typeof v === 'boolean') { o.t = 'b'; o.v = v; } else { o.t = 's'; o.v = v === null ? '' : String(v); }
        if (cell && XL.isFormula(cell.raw)) o.f = cell.raw.slice(1);
        if (fmt && fmt !== 'General') o.z = fmt;
        ws[XL.addr(r, c)] = o;
      }
      ws['!ref'] = `A1:${XL.addr(Math.max(u.r2, 0), Math.max(u.c2, 0))}`;
      ws['!cols'] = Array.from({ length: u.c2 + 1 }, (_, c) => ({ wpx: s.colW[c] || 90 }));
      XLSX.utils.book_append_sheet(book, ws, s.name.slice(0, 31));
    });
    Object.keys(wb.names).forEach((n) => { book.Workbook = book.Workbook || { Names: [] }; book.Workbook.Names = book.Workbook.Names || []; book.Workbook.Names.push({ Name: n, Ref: wb.names[n] }); });
    return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  }
  function fromXlsx(bytes) {
    const book = XLSX.read(bytes, { type: 'array', cellFormula: true });
    const wb = new XL.Workbook();
    book.SheetNames.forEach((name) => {
      const ws = book.Sheets[name]; const s = wb.addSheet(name);
      const spill = [];
      Object.keys(ws).filter((k) => k[0] !== '!').forEach((k) => { if (ws[k].F) { const g = XL.parseRange(ws[k].F); const a = XL.parseAddr(k); spill.push({ g, r: a.r, c: a.c }); } });
      Object.keys(ws).filter((k) => k[0] !== '!').forEach((k) => {
        const cell = ws[k]; const p = XL.parseAddr(k); if (!p) return;
        if (spill.some((x) => p.r >= x.g.r1 && p.r <= x.g.r2 && p.c >= x.g.c1 && p.c <= x.g.c2 && !(p.r === x.r && p.c === x.c))) return;
        const c = s.ensure(p.r, p.c);
        if (cell.f) c.raw = '=' + cell.f; else c.raw = cell.t === 'n' || cell.t === 's' || cell.t === 'b' ? cell.v : cell.v === undefined ? null : cell.v;
        if (cell.z && cell.z !== 'General') c.s = { fmt: cell.z };
      });
    });
    ((book.Workbook && book.Workbook.Names) || []).forEach((n) => { if (n.Name && n.Ref) wb.names[n.Name.toUpperCase()] = n.Ref; });
    wb.recalc();
    return wb;
  }
  $('openXl').addEventListener('click', async () => {
    const n = native(); const q = current();
    if (!n) { grid.flash('Open in Excel is only available in the desktop app.'); return; }
    try {
      const bytes = toXlsx(grid.getWb());
      const res = await n.saveXlsx(`Dojo-${q.id}-${q.t.replace(/[^A-Za-z0-9]+/g, '-')}.xlsx`, bytes);
      grid.dialog('Workbook opened', `<p class="note">${res.error ? 'The file was saved but no program opened it (' + esc(res.error) + '). Open it yourself from:' : 'Your workbook opened in the program set for .xlsx files (Microsoft Excel if installed).'}</p><div class="formula">${esc(res.path)}</div><p class="note">Make your changes in Excel, <b>save</b> (Ctrl+S), then come back and press <b>Check my file</b>. Colours, charts, PivotTables, conditional formatting and validation cannot be read from the file; use the built-in grid for questions about those.</p>`, () => true, 'Got it');
    } catch (e) { grid.flash('Could not open Excel: ' + (e.message || e)); }
  });
  $('checkFile').addEventListener('click', async () => {
    const n = native(); const q = current();
    if (!n) { grid.flash('Check my file is only available in the desktop app.'); return; }
    try {
      const res = await n.pickXlsx();
      if (!res || res.canceled) return;
      const wb = fromXlsx(res.data);
      const results = XL.grade(q, wb, { fileMode: true });
      record(q.id, showResults(results, true));
    } catch (e) { grid.flash('Could not read that file: ' + (e.message || e)); }
  });

  // ---- bank check and wiring -------------------------------------------------------------------------------------------------------------------
  function checkBank() {
    const fails = [];
    Q.forEach((q) => {
      try {
        const sol = XL.makeSolution(q);
        const back = XL.Workbook.fromJSON(JSON.parse(JSON.stringify(sol.toJSON())));
        XL.grade(q, back, { sol }).filter((x) => !x.ok).forEach((x) => fails.push(`#${q.id} ${q.t}: ${x.label}`));
        const g0 = XL.grade(q, XL.makeStart(q), { sol }); if (g0.every((x) => x.ok)) fails.push(`#${q.id} ${q.t}: passes untouched`);
      } catch (e) { fails.push(`#${q.id} ${q.t}: ${e.message}`); }
    });
    $('xres').hidden = false;
    $('xres').innerHTML = `<div class="hd ${fails.length ? 'bad' : 'ok'}"><b>${Q.length - new Set(fails.map((f) => f.split(':')[0])).size} of ${Q.length} passed.</b> ${fails.length ? '' : 'Every reference solution passes its own checks.'}</div>${fails.length ? '<ul>' + fails.map((f) => `<li class="bad"><i>✗</i><span>${esc(f)}</span></li>`).join('') + '</ul>' : ''}`;
  }
  let resetArmed = false;
  $('resetBtn').addEventListener('click', () => {
    if (!resetArmed) { resetArmed = true; $('resetLbl').textContent = 'Click again to reset'; setTimeout(() => { resetArmed = false; $('resetLbl').textContent = 'Reset'; }, 3000); return; }
    resetArmed = false; $('resetLbl').textContent = 'Reset'; S.del('excel.wb.' + st.id); grid.setWorkbook(XL.makeStart(current())); $('xres').hidden = true;
  });
  $('list').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (b) select(+b.dataset.id); });
  $('lvlChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; st.f.lvl = b.dataset.l; document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.l === st.f.lvl)); renderList(); });
  $('q').addEventListener('input', (e) => { st.f.q = e.target.value; renderList(); });
  $('stSel').addEventListener('change', (e) => { st.f.status = e.target.value; renderList(); });
  $('tgSel').addEventListener('change', (e) => { st.f.topic = e.target.value; renderList(); });
  const step = (d) => { const i = Q.findIndex((q) => q.id === st.id); const n = Q[i + d]; if (n) select(n.id); };
  $('prev').addEventListener('click', () => step(-1)); $('next').addEventListener('click', () => step(1));
  $('tabP').addEventListener('click', () => { st.tab = 'problem'; renderProblem(); });
  $('tabS').addEventListener('click', () => { st.tab = 'solutions'; renderProblem(); });
  $('bankBtn').addEventListener('click', checkBank);
  $('pbody').addEventListener('click', (e) => {
    const q = current();
    if (e.target.id === 'unlockBtn') { st.unlocked[q.id] = true; renderProblem(); }
    else if (e.target.id === 'hintBtn') { st.shownHint[q.id] = true; renderProblem(); }
    else if (e.target.id === 'loadSol') { grid.setWorkbook(XL.makeSolution(q)); scheduleSave(grid.getWb()); }
  });

  buildFilters(); renderStats(); renderList();
  select(byId(st.prefs.lastId) ? st.prefs.lastId : Q[0].id);
  window.__dojoXl = { st, grid, select, check, fromXlsx, toXlsx }; // used by the automated tests
})();

/* Dojo SQL track: question list, SSMS-style query window, grading. Vanilla JS, no framework. */
(function () {
  'use strict';
  const Q = window.DOJO_SQL;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LEVELS = ['Easy', 'Medium', 'Hard', 'Advanced'];
  const TIMEOUT_MS = 10000;

  // ---- storage: same prefix as the rest of the app, so Export / Import progress covers it -----------------
  const P = 'pandas-dojo.v1.';
  const S = {
    get(k, f) { try { const r = localStorage.getItem(P + k); return r == null ? f : JSON.parse(r); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(P + k); } catch (e) { /* ignore */ } },
  };

  // ---- theme: follow the host page (the Pandas page owns the day / night switch) -------------------------------
  const LIGHT = { '--bg': '#F6F4EF', '--panel': '#FDFCFA', '--sunk': '#EFECE5', '--line': '#E3DED4', '--text': '#2F3437', '--muted': '#5E6569', '--faint': '#8A9195', '--sage': '#A8BFA3', '--sage-ink': '#4E6A49', '--sage-tint': '#E6EEE3', '--slate': '#6B8CAE', '--slate-ink': '#557496', '--slate-text': '#4F6E90', '--slate-tint': '#E4EBF2', '--sand': '#E6D5B8', '--sand-tint': '#F5EDE0', '--sand-ink': '#7A5F33', '--terra': '#97503B', '--terra-tint': '#F5E8E1', '--editor': '#FFFFFF', '--gutter': '#F8F6F2', '--stripe': 'rgba(47,52,55,.025)', '--shadow': 'rgba(47,52,55,.05)', '--scrim': 'rgba(246,244,239,.95)', '--syn-p': '#2F3437', '--syn-k': '#4F6E90', '--syn-s': '#56754B', '--syn-n': '#8A642A', '--syn-c': '#80878B', '--syn-b': '#3D6B70', '--syn-f': '#2F3437', '--syn-d': '#97503B' };
  const DARK = { '--bg': '#1E2428', '--panel': '#232A2F', '--sunk': '#2A3237', '--line': '#353E44', '--text': '#D3D8D3', '--muted': '#9CA5A7', '--faint': '#6F797D', '--sage': '#A8BFA3', '--sage-ink': '#B4CAAF', '--sage-tint': '#28332D', '--slate': '#7F9DBD', '--slate-ink': '#557496', '--slate-text': '#9DB5CF', '--slate-tint': '#27323C', '--sand': '#C9B48C', '--sand-tint': '#2F2B24', '--sand-ink': '#D8C49C', '--terra': '#D39D88', '--terra-tint': '#352826', '--editor': '#1A1F23', '--gutter': '#1D2327', '--stripe': 'rgba(255,255,255,.018)', '--shadow': 'rgba(0,0,0,.22)', '--scrim': 'rgba(30,36,40,.95)', '--syn-p': '#D3D8D3', '--syn-k': '#8EA9C6', '--syn-s': '#A8BFA3', '--syn-n': '#D9BF8C', '--syn-c': '#7D878B', '--syn-b': '#8FBDB6', '--syn-f': '#E4E7E2', '--syn-d': '#D39D88' };
  function hostTheme() {
    try { return window.parent.document.documentElement.style.colorScheme === 'dark' ? 'dark' : 'light'; } catch (e) {
      return S.get('prefs', {}).theme === 'dark' ? 'dark' : 'light';
    }
  }
  function applyTheme() {
    const vars = hostTheme() === 'dark' ? DARK : LIGHT;
    Object.keys(vars).forEach((k) => document.documentElement.style.setProperty(k, vars[k]));
    document.documentElement.style.colorScheme = hostTheme();
  }
  applyTheme();
  try {
    new MutationObserver(applyTheme).observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['style'] });
  } catch (e) { /* standalone */ }

  // ---- state --------------------------------------------------------------------------------------------------------
  const st = {
    id: null, tab: 'problem', rtab: 'results', busy: false,
    f: { lvl: 'All', status: 'all', topic: 'all', q: '' },
    progress: S.get('sql.progress', {}), days: S.get('sql.days', []), prefs: S.get('sql.prefs', {}),
    insp: {}, shownHint: {}, last: null, unlocked: {},
  };
  const byId = (id) => Q.find((q) => q.id === id);
  const current = () => byId(st.id);
  const statusOf = (id) => (st.progress[id] && st.progress[id].status) || 'todo';
  const savePrefs = (patch) => { st.prefs = { ...st.prefs, ...patch }; S.set('sql.prefs', st.prefs); };

  // ---- SQL highlighting ---------------------------------------------------------------------------------------------
  const KW = new Set(('SELECT FROM WHERE GROUP BY ORDER HAVING LIMIT OFFSET JOIN INNER LEFT RIGHT FULL OUTER CROSS ON AS AND OR NOT IN IS NULL LIKE BETWEEN EXISTS DISTINCT UNION ALL INTERSECT EXCEPT CASE WHEN THEN ELSE END WITH RECURSIVE OVER PARTITION ASC DESC ROWS RANGE UNBOUNDED PRECEDING FOLLOWING CURRENT ROW CAST USING CREATE TABLE INSERT INTO VALUES UPDATE DELETE SET DROP ALTER VIEW INDEX TOP GLOB ESCAPE NATURAL FILTER').split(' '));
  const TOKEN = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\[[^\]\n]*\]?|"[^"\n]*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|(\s+)|([\s\S])/g;
  function highlight(src) {
    let out = '';
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(src))) {
      if (m[1]) out += `<span class="c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="d">${esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="n">${esc(m[4])}</span>`;
      else if (m[5]) {
        const rest = src.slice(TOKEN.lastIndex).match(/^\s*\(/);
        if (KW.has(m[5].toUpperCase())) out += `<span class="k">${esc(m[5])}</span>`;
        else if (rest) out += `<span class="f">${esc(m[5])}</span>`;
        else out += esc(m[5]);
      } else out += esc(m[0]);
    }
    return out;
  }

  /** Lays a one-line reference solution out over several lines so it can be read. */
  function formatSql(sql) {
    const BREAK = new Set(['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'UNION']);
    const JOIN_START = new Set(['JOIN', 'LEFT', 'INNER', 'CROSS', 'RIGHT', 'FULL']);
    const JOIN_PREV = new Set(['LEFT', 'INNER', 'CROSS', 'RIGHT', 'FULL', 'OUTER']);
    const NL = String.fromCharCode(10);
    const isSpace = (c) => c === ' ' || c === NL || c === String.fromCharCode(9) || c === String.fromCharCode(13);
    const isWordCh = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';
    const tokens = [];
    for (let i = 0; i < sql.length;) {
      const c = sql[i];
      let j = i + 1;
      if (c === "'") { while (j < sql.length && (sql[j] !== "'" || sql[j + 1] === "'")) j += sql[j] === "'" ? 2 : 1; j++; }
      else if (c === '-' && sql[i + 1] === '-') { while (j < sql.length && sql[j] !== NL) j++; }
      else if (isSpace(c)) { while (j < sql.length && isSpace(sql[j])) j++; }
      else if (isWordCh(c)) { while (j < sql.length && isWordCh(sql[j])) j++; }
      tokens.push(isSpace(c) ? ' ' : sql.slice(i, j));
      i = j;
    }
    const stack = []; // 'win' for OVER ( ... ), otherwise 'sub'
    let out = '', prevTok = '', prevWord = '';
    const indent = () => '  '.repeat(stack.filter((x) => x === 'sub').length);
    for (const t of tokens) {
      if (t === ' ') { if (!out.endsWith(' ') && !out.endsWith(NL)) out += ' '; continue; }
      const up = t.toUpperCase();
      const isWord = isWordCh(t[0]);
      const inWindow = stack[stack.length - 1] === 'win';
      let brk = false;
      if (isWord && !inWindow) {
        if (BREAK.has(up)) brk = true;
        else if (JOIN_START.has(up) && !JOIN_PREV.has(prevWord)) brk = true;
        else if (up === 'SELECT' && (prevTok === '(' || prevTok === ')')) brk = true;
      }
      if (brk) out = out.replace(/ +$/, '') + NL + indent();
      if (t === '(') stack.push(prevWord === 'OVER' ? 'win' : 'sub');
      if (t === ')') stack.pop();
      out += t;
      prevTok = t;
      if (isWord) prevWord = up;
    }
    return out.trim();
  }

  // ---- engine (web worker with a timeout, like the Python engine) ----------------------------------------------------
  const engine = {
    worker: null, pending: new Map(), n: 0, ready: false, version: '', failed: null,
    start() {
      this.ready = false;
      this.worker = new Worker('sql-worker.js');
      this.worker.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === 'ready') { this.ready = true; this.version = m.version; setEngine('ok', `SQLite ${m.version}`); }
        else if (m.type === 'fatal') { this.failed = m.message; setEngine('err', 'Engine failed'); }
        else if (m.type === 'result') { const cb = this.pending.get(m.id); if (cb) cb(m); }
      };
      this.worker.onerror = (e) => { this.failed = e.message || 'worker error'; setEngine('err', 'Engine failed'); };
      setEngine('', 'Starting engine…');
    },
    exec(req, timeout = TIMEOUT_MS) {
      return new Promise((resolve) => {
        const id = ++this.n;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          this.pending.forEach((cb) => cb({ internal: 'The engine was restarted.' }));
          this.pending.clear();
          this.worker.terminate();
          this.start();
          resolve({ timeout: true });
        }, timeout);
        this.pending.set(id, (m) => { clearTimeout(timer); this.pending.delete(id); resolve(m); });
        this.worker.postMessage({ id, ...req });
      });
    },
  };
  function setEngine(kind, text) { $('engdot').className = kind; $('engtxt').textContent = text; }

  // ---- code storage -------------------------------------------------------------------------------------------------
  const starter = () => '-- Write your query below, then press F5 (or Ctrl+Enter) to execute it.\n\nSELECT ';
  function loadCode(q) { const c = S.get('sql.code.' + q.id, null); return typeof c === 'string' && c.trim() !== '' ? c : starter(); }
  function saveCode(id, code) {
    if (id == null) return;
    if (code === starter() || code.trim() === '') S.del('sql.code.' + id); else S.set('sql.code.' + id, code);
  }
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveCode(st.id, $('ed').value); $('savedLbl').textContent = 'Saved'; }, 500);
    $('savedLbl').textContent = '';
  }

  // ---- list, stats ----------------------------------------------------------------------------------------------------
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function streak() {
    const set = new Set(st.days); let n = 0; const d = new Date();
    const key = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    if (!set.has(key(d))) d.setDate(d.getDate() - 1);
    while (set.has(key(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStats() {
    const solved = Q.filter((q) => statusOf(q.id) === 'solved').length;
    const c = 2 * Math.PI * 34;
    $('ringArc').setAttribute('stroke-dasharray', `${(c * solved / Q.length).toFixed(2)} ${c.toFixed(2)}`);
    $('solvedTitle').textContent = `${solved} of ${Q.length} solved`;
    const s = streak();
    $('solvedSub').textContent = s > 0 ? `${s}-day streak. Keep it going.` : 'Solve one today to start a streak';
    $('levels').innerHTML = LEVELS.map((l) => {
      const all = Q.filter((q) => q.difficulty === l), done = all.filter((q) => statusOf(q.id) === 'solved').length;
      return `<div class="lvl"><span>${l}</span><div class="bar"><i style="width:${all.length ? (100 * done / all.length) : 0}%"></i></div><b>${done}/${all.length}</b></div>`;
    }).join('');
  }
  function filtered() {
    const { lvl, status, topic, q } = st.f;
    const needle = q.trim().toLowerCase();
    return Q.filter((x) => (lvl === 'All' || x.difficulty === lvl)
      && (status === 'all' || statusOf(x.id) === status)
      && (topic === 'all' || x.tg.includes(topic))
      && (!needle || (x.t + ' ' + x.tg.join(' ') + ' ' + x.id).toLowerCase().includes(needle)));
  }
  function renderList() {
    const list = filtered();
    $('list').innerHTML = list.length ? list.map((q) => {
      const s = statusOf(q.id);
      const tick = s === 'solved' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>' : '';
      return `<button class="item${q.id === st.id ? ' sel' : ''}" data-id="${q.id}"><span class="dot ${s}" aria-label="${s === 'solved' ? 'Solved' : s === 'attempted' ? 'Attempted' : 'Not started'}">${tick}</span><span class="nm">${q.id}. ${esc(q.t)}</span><span class="df ${q.difficulty}">${q.difficulty}</span></button>`;
    }).join('') : '<p style="margin:16px 10px;font-size:13px;color:var(--muted);line-height:1.6">No questions match these filters.</p>';
    $('count').textContent = `${Q.length} questions`;
  }
  function buildFilters() {
    $('lvlChips').innerHTML = ['All', 'Easy', 'Medium', 'Hard', 'Adv'].map((l) => `<button class="chip" data-l="${l === 'Adv' ? 'Advanced' : l}" aria-pressed="${(l === 'Adv' ? 'Advanced' : l) === st.f.lvl}">${l}</button>`).join('');
    const topics = [...new Set(Q.flatMap((q) => q.tg))].sort();
    $('tgSel').innerHTML = '<option value="all">All topics</option>' + topics.map((t) => `<option>${esc(t)}</option>`).join('');
  }

  // ---- problem panel ----------------------------------------------------------------------------------------------------
  const cell = (v) => (v === null || v === undefined ? '<span class="null">NULL</span>' : esc(v));
  function gridHtml(cols, rows, rn) {
    return `<table class="grid"><thead><tr>${rn ? '<th class="rn"></th>' : ''}${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr>${rn ? `<td class="rn">${i + 1}</td>` : ''}${r.map((v) => `<td${typeof v === 'number' ? ' class="num"' : ''}>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function renderProblem() {
    const q = current();
    $('title').textContent = `${q.id}. ${q.t}`;
    const p = st.progress[q.id] || {};
    $('solvedPill').innerHTML = p.status === 'solved' ? '<span class="solvedpill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>Solved</span>' : '';
    $('badges').innerHTML = `<span class="badge d-${q.difficulty}">${q.difficulty}</span>` + q.tg.map((t) => `<span class="badge">${esc(t)}</span>`).join('');
    const unlocked = !!(p.unlocked || st.unlocked[q.id]);
    $('tabP').setAttribute('aria-selected', st.tab === 'problem');
    $('tabS').setAttribute('aria-selected', st.tab === 'solutions');
    $('lock').style.display = unlocked ? 'none' : '';
    const body = $('pbody');
    if (st.tab === 'solutions') {
      if (!unlocked) {
        body.innerHTML = '<div class="locked"><h2>Solutions unlock after your first submit</h2><p style="font-size:14px;line-height:1.6;margin:0 0 14px">Give it an honest try first. Submit your best attempt and the reference solution opens up.</p><button class="btn" id="unlockBtn">Show solutions anyway</button></div>';
        return;
      }
      const sql = formatSql(q.q);
      body.innerHTML = `<div class="lab">Reference solution</div><pre class="code" id="solCode">${highlight(sql)}</pre>
        <div style="display:flex;gap:8px;margin-bottom:6px"><button class="btn" id="copySol">Copy</button><button class="btn" id="loadSol">Load into editor</button></div>
        <div class="lab">Why it works</div><p>${esc(q.x)}</p>`;
      return;
    }
    const ins = st.insp[q.id];
    const tables = ins && ins.tables ? ins.tables.map((t) => `<div class="tbl"><div class="tblh"><b>${esc(t.name)}</b><span>${t.columns.map((c) => esc(c.name) + ' ' + esc((c.type || '').toLowerCase())).join(', ')}</span></div><div class="scroll">${gridHtml(t.columns.map((c) => c.name), t.rows, false)}</div>${t.count > t.rows.length ? `<div class="more">Showing ${t.rows.length} of ${t.count} rows</div>` : ''}</div>`).join('') : '<p>Loading tables…</p>';
    let expected = '';
    if (ins && ins.expected && ins.expected.columns) {
      const e = ins.expected;
      expected = `<div class="lab">Expected output <small>${e.total} × ${e.columns.length}</small></div><div class="tbl"><div class="scroll">${gridHtml(e.columns, e.rows.slice(0, 10), false)}</div>${e.total > 10 ? `<div class="more">+ ${e.total - 10} more row${e.total - 10 === 1 ? '' : 's'}</div>` : ''}</div>`;
    }
    body.innerHTML = `<p>${esc(q.s)}</p><div class="lab">Your task</div><p class="task">${esc(q.k)}</p>
      ${q.n && q.n.length ? `<div class="lab">Notes</div><ul class="notes">${q.n.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="rules"><span class="rule">${q.o ? 'Row order matters' : 'Return the rows in any order'}</span><span class="rule">SQLite syntax</span><span class="rule">Column names are not graded, values are</span>${window.dojoCaseCount(q) > 1 ? `<span class="rule">${window.dojoCaseCount(q)} test cases · ${window.dojoCaseCount(q) - 1} hidden</span>` : ''}</div>
      <div class="lab">Tables <small>${(q.tb || []).length} in this question</small></div>${tables}${expected}
      <div class="lab">Hint</div>${st.shownHint[q.id] ? `<div class="hint">${esc(q.h)}</div>` : '<button class="hintbtn" id="hintBtn">Show hint</button>'}`;
    body.scrollTop = 0;
  }

  // ---- Object Explorer ---------------------------------------------------------------------------------------------------
  const openNodes = new Set(['db', 'tables']);
  function renderTree() {
    const q = current();
    if (!q) return;
    const tables = window.dojoTablesFor(q);
    const tw = (k) => (openNodes.has(k) ? '▾' : '▸');
    let h = `<div class="tn" data-k="db"><span class="tw">${tw('db')}</span>DojoDB</div>`;
    if (openNodes.has('db')) {
      h += `<div class="kids"><div class="tn" data-k="tables"><span class="tw">${tw('tables')}</span>Tables</div>`;
      if (openNodes.has('tables')) {
        h += '<div class="kids">' + Object.keys(tables).map((name) => {
          const open = openNodes.has('t:' + name);
          const cols = tables[name].cols.split(',').map((c) => c.trim()).map((c) => { const [n, ...r] = c.split(/\s+/); return { n, r: r.join(' ') }; });
          return `<div class="tn tbl-n" data-k="t:${name}" data-name="${name}" title="Click to expand, double-click to insert the name"><span class="tw">${tw('t:' + name)}</span>dbo.${esc(name)}</div>`
            + (open ? '<div class="kids">' + cols.map((c) => `<div class="tn col"><span class="tw"></span>${esc(c.n)}<em>${esc(c.r.replace(/ PRIMARY KEY/, ', PK'))}</em></div>`).join('') + '</div>' : '');
        }).join('') + '</div>';
      }
      h += '</div>';
    }
    $('tree').innerHTML = h;
  }

  // ---- editor ------------------------------------------------------------------------------------------------------------------
  const ed = $('ed');
  function paint() {
    $('hl').innerHTML = highlight(ed.value) + '\n';
    const n = ed.value.split('\n').length;
    $('gutter').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
    syncScroll();
  }
  function syncScroll() {
    $('hl').scrollTop = ed.scrollTop; $('hl').scrollLeft = ed.scrollLeft; $('gutter').scrollTop = ed.scrollTop;
  }
  function insertText(text) { ed.focus(); if (!document.execCommand('insertText', false, text)) ed.setRangeText(text, ed.selectionStart, ed.selectionEnd, 'end'); }
  function setCode(code) { ed.value = code; ed.scrollTop = 0; ed.scrollLeft = 0; paint(); }
  function lineBounds() {
    const v = ed.value;
    const start = v.lastIndexOf('\n', ed.selectionStart - 1) + 1;
    let end = v.indexOf('\n', ed.selectionEnd);
    if (end === -1) end = v.length;
    if (ed.selectionEnd > ed.selectionStart && v[ed.selectionEnd - 1] === '\n') end = ed.selectionEnd - 1;
    return [start, end];
  }
  function transformLines(fn) {
    const [a, b] = lineBounds();
    const lines = ed.value.slice(a, b).split('\n');
    const next = lines.map(fn).join('\n');
    ed.setSelectionRange(a, b);
    insertText(next);
    ed.setSelectionRange(a, a + next.length);
  }
  let escArmed = false;
  ed.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F5' || (mod && !e.shiftKey && (e.key === 'Enter' || e.key.toLowerCase() === 'e'))) { e.preventDefault(); run('run'); return; }
    if (mod && e.shiftKey && e.key === 'Enter') { e.preventDefault(); run('submit'); return; }
    if (e.key === 'Escape') { escArmed = true; return; }
    if (e.key === 'Tab') {
      if (escArmed) { escArmed = false; return; }
      e.preventDefault();
      const multi = ed.value.slice(ed.selectionStart, ed.selectionEnd).includes('\n');
      if (e.shiftKey) transformLines((l) => l.replace(/^( {1,4}|\t)/, ''));
      else if (multi) transformLines((l) => '    ' + l);
      else insertText('    ');
      return;
    }
    escArmed = false;
    if (mod && e.key === '/') {
      e.preventDefault();
      const [a, b] = lineBounds();
      const lines = ed.value.slice(a, b).split('\n');
      const all = lines.every((l) => !l.trim() || /^\s*--/.test(l));
      transformLines((l) => (all ? l.replace(/^(\s*)-- ?/, '$1') : l.trim() ? l.replace(/^(\s*)/, '$1-- ') : l));
      return;
    }
    if (e.key === 'Enter' && !mod && !e.shiftKey) {
      const line = ed.value.slice(ed.value.lastIndexOf('\n', ed.selectionStart - 1) + 1, ed.selectionStart);
      const indent = (line.match(/^[ \t]*/) || [''])[0];
      if (indent) { e.preventDefault(); insertText('\n' + indent); }
    }
  });
  ed.addEventListener('input', () => { paint(); scheduleSave(); });
  ed.addEventListener('scroll', syncScroll);

  // ---- running and grading ---------------------------------------------------------------------------------------------------
  const fmtTime = (ms) => { const s = Math.floor(ms / 1000); const p = (n) => String(n).padStart(2, '0'); return `00:${p(Math.floor(s / 60))}:${p(s % 60)}.${String(Math.round(ms % 1000)).padStart(3, '0')}`; };
  function setBusy(b) { st.busy = b; $('runBtn').disabled = b; $('submitBtn').disabled = b; }
  function banner(kind, html) { const b = $('banner'); if (!kind) { b.hidden = true; return; } b.hidden = false; b.className = kind; b.innerHTML = html; }

  function renderResults() {
    const r = st.last;
    const body = $('rbody');
    document.querySelectorAll('.rtab').forEach((t) => t.setAttribute('aria-selected', t.dataset.t === st.rtab));
    if (!r) {
      body.innerHTML = st.rtab === 'results' ? '<div class="empty">Execute a query (F5) to see its rows here. Submit checks your answer against the expected output.</div>' : st.rtab === 'messages' ? '<div class="msg">Nothing has run yet.</div>' : '<div class="empty">Run a SELECT to see how SQLite plans to execute it.</div>';
      return;
    }
    if (st.rtab === 'results') {
      if (r.timeout) { body.innerHTML = '<div class="empty" style="color:var(--terra)">Your query ran for more than 10 seconds, so it was stopped. Check for a recursive CTE with no end or a join with no condition.</div>'; return; }
      let h = '';
      (r.results || []).forEach((rs, i) => {
        h += `<div class="rs"><div class="cap">Result ${i + 1} · ${rs.total} row${rs.total === 1 ? '' : 's'}${rs.truncated ? ` (showing first ${rs.rows.length})` : ''}</div><div class="scroll">${gridHtml(rs.columns, rs.rows, true)}</div></div>`;
      });
      if (r.error) h += `<div class="empty" style="color:var(--terra)">Error on line ${r.error.line}: ${esc(r.error.message)}</div>`;
      if (!h) h = '<div class="empty">No result set. This script returned no rows.</div>';
      body.innerHTML = h;
    } else if (st.rtab === 'messages') {
      let t = (r.messages || []).map(esc).join('\n\n');
      if (r.error) t += `${t ? '\n\n' : ''}<span class="e">Error on line ${r.error.line}:\n${esc(r.error.message)}</span>`;
      if (r.timeout) t = '<span class="e">Execution stopped: the query ran for more than 10 seconds.</span>';
      t += `\n\n${r.error || r.timeout ? 'Completion time: with errors' : 'Query executed successfully'}${r.ms != null ? ` in ${r.ms} ms.` : ''}`;
      body.innerHTML = `<div class="msg">${t}</div>`;
    } else {
      if (!r.plan || !r.plan.length) { body.innerHTML = '<div class="empty">No execution plan: the script has no SELECT, or it ended with an error.</div>'; return; }
      const depth = {};
      body.innerHTML = '<div class="plan">' + r.plan.map((n) => { depth[n.id] = (depth[n.parent] != null ? depth[n.parent] + 1 : 0); return `<div>${'    '.repeat(depth[n.id])}${depth[n.id] ? '└─ ' : ''}${esc(n.detail)}</div>`; }).join('') + '</div>';
    }
  }
  function setStatus(r) {
    const bad = r.error || r.timeout || r.internal;
    $('stMsg').textContent = bad ? 'Query completed with errors.' : 'Query executed successfully.';
    $('status').className = bad ? 'err' : '';
    const last = r.results && r.results[r.results.length - 1];
    $('stRows').textContent = last ? `${last.total} row${last.total === 1 ? '' : 's'}` : '0 rows';
    $('stTime').textContent = fmtTime(r.ms || 0);
  }

  function record(id, ok, submitted) {
    const prev = st.progress[id] || {};
    if (!submitted && prev.status) return;
    st.progress[id] = { status: ok ? 'solved' : (prev.status === 'solved' ? 'solved' : 'attempted'), attempts: (prev.attempts || 0) + (submitted ? 1 : 0), unlocked: prev.unlocked || submitted };
    S.set('sql.progress', st.progress);
    if (ok && submitted && !st.days.includes(today())) { st.days.push(today()); S.set('sql.days', st.days); }
    renderStats(); renderList(); renderProblem();
  }

  async function run(kind) {
    if (st.busy) return;
    const q = current();
    if (!q) return;
    let sql = ed.value;
    if (kind === 'run' && ed.selectionEnd > ed.selectionStart) sql = ed.value.slice(ed.selectionStart, ed.selectionEnd);
    if (!sql.trim()) { banner('info', 'Type a query first.'); return; }
    saveCode(q.id, ed.value);
    setBusy(true);
    $('stMsg').textContent = 'Executing…';
    banner(null);
    const setups = Array.from({ length: window.dojoCaseCount(q) }, (_, i) => window.dojoSetupSql(q, i));
    const res = await engine.exec({ op: kind, setup: setups[0], setups, sql, solution: q.q, ordered: !!q.o });
    setBusy(false);
    st.last = res;
    if (res.internal) { banner('bad', 'Something went wrong in the engine: ' + esc(res.internal)); setStatus(res); renderResults(); return; }
    setStatus(res);
    st.rtab = res.error && !(res.results && res.results.length) ? 'messages' : 'results';
    if (kind === 'submit') {
      const v = res.verdict;
      if (res.timeout) banner('bad', 'Timed out. Your query ran for more than 10 seconds and was stopped.');
      else if (v && v.ok) {
        const n = window.dojoCaseCount(q);
        banner('ok', n > 1 ? `<b>Accepted.</b> Passed all ${n} test cases (1 shown, ${n - 1} hidden).${v.nameNote ? `<div class="sub">${esc(v.nameNote)}</div>` : ''}` : `<b>Correct.</b> Your result matches the expected output.${v.nameNote ? `<div class="sub">${esc(v.nameNote)}</div>` : ''}`);
      } else if (v) {
        let extra = '';
        const ci = v.caseIndex || 0, n = v.caseCount || 1;
        if (ci > 0 && v.exp && v.got) {
          // A hidden dataset failed: show it the way LeetCode does (input, your output, expected).
          const inp = Object.entries(window.dojoTablesFor(q, ci)).map(([name, t]) => `<div class="sub"><b>${esc(name)}</b></div>${gridHtml(t.cols.split(',').map((c) => c.trim().split(/\s+/)[0]), t.rows.slice(0, 10), false)}`).join('');
          extra = `<div class="sub" style="margin-top:6px"><b>Input</b></div>${inp}<div class="sub"><b>Your output</b> (${v.got.total} rows)</div>${gridHtml(v.got.columns, v.got.rows, false)}<div class="sub"><b>Expected</b> (${v.exp.total} rows)</div>${gridHtml(v.exp.columns, v.exp.rows, false)}`;
        } else if (v.yours || v.expected) extra = `<table class="grid"><tbody><tr><td><b>Your row ${v.at}</b></td>${(v.yours || []).map((x) => `<td>${cell(x)}</td>`).join('')}</tr><tr><td><b>Expected</b></td>${(v.expected || []).map((x) => `<td>${cell(x)}</td>`).join('')}</tr></tbody></table>`;
        else if (v.missing || v.extra) {
          const cols = v.expectedColumns || v.userColumns || [];
          if (v.missing && v.missing.length) extra += `<div class="sub">Missing rows (expected, not returned)</div>${gridHtml(cols, v.missing, false)}`;
          if (v.extra && v.extra.length) extra += `<div class="sub">Unexpected rows (returned, not expected)</div>${gridHtml(v.userColumns || cols, v.extra, false)}`;
        }
        const head = n > 1 ? `<b>Wrong Answer.</b> Failed test case ${ci + 1} of ${n}${ci > 0 ? ' (hidden)' : ''}. ` : '<b>Not quite.</b> ';
        banner('bad', `${head}${esc(v.reason)}${extra}`);
      }
      record(q.id, !!(v && v.ok), true);
    } else if (!res.timeout) record(q.id, false, false);
    renderResults();
  }

  async function checkBank() {
    if (st.busy) return;
    setBusy(true);
    $('bankBtn').textContent = 'Checking…';
    const items = Q.map((q) => ({ id: q.id, title: q.t, setups: Array.from({ length: window.dojoCaseCount(q) }, (_, i) => window.dojoSetupSql(q, i)), solution: q.q }));
    const res = await engine.exec({ op: 'bank', items }, 60000);
    setBusy(false);
    $('bankBtn').textContent = 'Check question bank';
    if (res.timeout || res.internal) { banner('bad', 'The check did not finish: ' + (res.internal || 'timed out')); return; }
    const ok = res.total - res.fails.length;
    banner(res.fails.length ? 'bad' : 'ok', `<b>${ok} of ${res.total} passed.</b> ${res.fails.length ? '' : 'Every reference solution runs, returns rows, and gives the same result twice.'}${res.fails.map((f) => `<div class="sub">#${f.id} ${esc(f.title)}: ${esc(f.reason)}</div>`).join('')}`);
    st.last = null; renderResults();
  }

  // ---- navigation ---------------------------------------------------------------------------------------------------------------
  function select(id) {
    if (st.id != null) saveCode(st.id, ed.value);
    st.id = id; st.tab = 'problem'; st.last = null; st.rtab = 'results';
    savePrefs({ lastId: id });
    setCode(loadCode(byId(id)));
    $('fname').textContent = `SQLQuery${id}.sql`;
    $('resetLbl').textContent = 'Reset'; resetArmed = false;
    $('app').classList.remove('drawer');
    banner(null); renderResults(); renderProblem(); renderTree(); renderList();
    $('stMsg').textContent = 'Ready'; $('stRows').textContent = '0 rows'; $('stTime').textContent = '00:00:00'; $('status').className = '';
    const q = byId(id);
    if (!st.insp[id]) {
      engine.exec({ op: 'inspect', setup: window.dojoSetupSql(q), tables: q.tb, solution: q.q }, 30000).then((r) => {
        if (r.tables) { st.insp[id] = r; if (st.id === id) renderProblem(); }
      });
    }
    const it = document.querySelector(`.item[data-id="${id}"]`);
    if (it) it.scrollIntoView({ block: 'nearest' });
  }
  let resetArmed = false;
  function step(d) { const i = Q.findIndex((q) => q.id === st.id); const n = Q[i + d]; if (n) select(n.id); }

  // ---- wiring ---------------------------------------------------------------------------------------------------------------------
  $('list').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (b) select(+b.dataset.id); });
  $('lvlChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; st.f.lvl = b.dataset.l; buildChipsState(); renderList(); });
  function buildChipsState() { document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.l === st.f.lvl)); }
  $('q').addEventListener('input', (e) => { st.f.q = e.target.value; renderList(); });
  $('stSel').addEventListener('change', (e) => { st.f.status = e.target.value; renderList(); });
  $('tgSel').addEventListener('change', (e) => { st.f.topic = e.target.value; renderList(); });
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('drawerBtn').addEventListener('click', () => $('app').classList.toggle('drawer'));
  $('tabP').addEventListener('click', () => { st.tab = 'problem'; renderProblem(); });
  $('tabS').addEventListener('click', () => { st.tab = 'solutions'; renderProblem(); });
  $('pbody').addEventListener('click', (e) => {
    const q = current();
    if (e.target.id === 'unlockBtn') { st.unlocked[q.id] = true; renderProblem(); }
    else if (e.target.id === 'hintBtn') { st.shownHint[q.id] = true; renderProblem(); }
    else if (e.target.id === 'copySol') { navigator.clipboard.writeText(formatSql(q.q)).then(() => { e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1500); }).catch(() => {}); }
    else if (e.target.id === 'loadSol') { setCode(formatSql(q.q)); scheduleSave(); ed.focus(); }
  });
  $('runBtn').addEventListener('click', () => run('run'));
  $('submitBtn').addEventListener('click', () => run('submit'));
  $('resetBtn').addEventListener('click', () => {
    if (!resetArmed) { resetArmed = true; $('resetLbl').textContent = 'Click again to reset'; setTimeout(() => { resetArmed = false; $('resetLbl').textContent = 'Reset'; }, 3000); return; }
    resetArmed = false; $('resetLbl').textContent = 'Reset'; S.del('sql.code.' + st.id); setCode(starter()); ed.focus();
  });
  $('bankBtn').addEventListener('click', checkBank);
  $('rtabs').addEventListener('click', (e) => { const b = e.target.closest('.rtab'); if (b) { st.rtab = b.dataset.t; renderResults(); } });
  $('exToggle').addEventListener('click', () => {
    const c = $('explorer').classList.toggle('collapsed');
    $('exToggle').textContent = c ? '›' : '‹'; savePrefs({ explorerCollapsed: c });
  });
  $('tree').addEventListener('click', (e) => {
    const n = e.target.closest('.tn[data-k]');
    if (!n) return;
    const k = n.dataset.k;
    if (openNodes.has(k)) openNodes.delete(k); else openNodes.add(k);
    renderTree();
  });
  $('tree').addEventListener('dblclick', (e) => { const n = e.target.closest('.tbl-n'); if (n) insertText(n.dataset.name); });
  engine.start();
  if (st.prefs.explorerCollapsed) { $('explorer').classList.add('collapsed'); $('exToggle').textContent = '›'; }

  buildFilters();
  renderStats();
  renderList();
  const first = byId(st.prefs.lastId) ? st.prefs.lastId : Q[0].id;
  select(first);
  window.__dojoSql = { st, engine, run, select }; // used by the automated tests
})();

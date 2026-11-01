/* Dojo SQL worker: runs SQLite (sql.js) off the main thread so a runaway query can be stopped. */
let SQL = null;
let version = '';
const MAX_ROWS = 1000;
const COUNT_CAP = 200000;

const ready = (async () => {
  importScripts(new URL('vendor/sql-wasm.js', self.location.href).href);
  SQL = await initSqlJs({ locateFile: (f) => new URL('vendor/' + f, self.location.href).href });
  const db = new SQL.Database();
  version = db.exec('select sqlite_version()')[0].values[0][0];
  db.close();
  postMessage({ type: 'ready', version });
})().catch((e) => postMessage({ type: 'fatal', message: String((e && e.message) || e) }));

function openDb(setup) {
  const db = new SQL.Database();
  if (setup) db.run(setup);
  return db;
}

function lineOf(text, pos) {
  let n = 1;
  for (let i = 0; i < pos && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Runs a script one statement at a time, like SSMS: result sets, "(n rows affected)" messages, first error. */
function runScript(db, sql) {
  const out = { results: [], messages: [], error: null, plan: null };
  let pos = 0;
  let lastSelect = null;
  try {
    for (const stmt of db.iterateStatements(sql)) {
      const text = stmt.getSQL();
      const at = sql.indexOf(text.trim().slice(0, 40), pos);
      const startPos = at >= 0 ? at : pos;
      pos = startPos + Math.max(1, text.trim().length);
      const line = lineOf(sql, startPos);
      try {
        const cols = stmt.getColumnNames();
        if (cols.length) {
          const rows = [];
          let total = 0;
          while (stmt.step()) {
            if (rows.length < MAX_ROWS) rows.push(stmt.get());
            if (++total >= COUNT_CAP) break;
          }
          out.results.push({ columns: cols, rows, total, truncated: total > rows.length, line });
          out.messages.push(`(${total} row${total === 1 ? '' : 's'} affected)`);
          lastSelect = text;
        } else {
          stmt.step();
          const n = db.getRowsModified();
          out.messages.push(`Commands completed successfully.${n ? ` (${n} row${n === 1 ? '' : 's'} affected)` : ''}`);
        }
      } catch (e) {
        out.error = { message: String((e && e.message) || e), line };
        break;
      }
    }
  } catch (e) {
    out.error = { message: String((e && e.message) || e), line: lineOf(sql, pos) };
  }
  if (lastSelect && !out.error) {
    try {
      const p = db.exec('EXPLAIN QUERY PLAN ' + lastSelect);
      out.plan = p.length ? p[0].values.map((r) => ({ id: r[0], parent: r[1], detail: r[3] })) : [];
    } catch (e) { out.plan = null; }
  }
  return out;
}

/** Final result set of a script (what a question is graded on). */
function finalResult(sql, setup) {
  const db = openDb(setup);
  try {
    const r = runScript(db, sql);
    if (r.error) return { error: r.error };
    const last = r.results[r.results.length - 1];
    return last ? { columns: last.columns, rows: last.rows, total: last.total } : { none: true };
  } finally { db.close(); }
}

const key = (v) => (v === null || v === undefined ? '∅' : typeof v === 'number' ? 'n' + String(Math.round(v * 1e6) / 1e6) : 's' + String(v));
const rowKey = (r) => r.map(key).join('\u0001');

function compare(user, expected, ordered) {
  const nameNote = user.columns.map((c) => c.toLowerCase()).join() !== expected.columns.map((c) => c.toLowerCase()).join()
    ? `Your column names (${user.columns.join(', ')}) differ from the expected ones (${expected.columns.join(', ')}). The values were checked, but match the names in a real interview.` : '';
  if (user.columns.length !== expected.columns.length) {
    return { ok: false, reason: `Expected ${expected.columns.length} column${expected.columns.length === 1 ? '' : 's'} (${expected.columns.join(', ')}) but your query returned ${user.columns.length} (${user.columns.join(', ')}).` };
  }
  const u = user.rows.map(rowKey);
  const e = expected.rows.map(rowKey);
  if (ordered) {
    for (let i = 0; i < Math.max(u.length, e.length); i++) {
      if (u[i] !== e[i]) {
        const base = u.length !== e.length ? `Expected ${e.length} rows but got ${u.length}. ` : '';
        return { ok: false, reason: `${base}Row ${i + 1} differs (the order of rows matters for this question).`, yours: user.rows[i] || null, expected: expected.rows[i] || null, at: i + 1 };
      }
    }
    return { ok: true, nameNote };
  }
  const count = new Map();
  e.forEach((k, i) => count.set(k, (count.get(k) || 0) + 1));
  const extra = [];
  u.forEach((k, i) => {
    if (count.get(k)) count.set(k, count.get(k) - 1); else extra.push(user.rows[i]);
  });
  const missing = [];
  e.forEach((k, i) => {
    const left = count.get(k);
    if (left > 0) { missing.push(expected.rows[i]); count.set(k, left - 1); }
  });
  if (!extra.length && !missing.length) return { ok: true, nameNote };
  const parts = [];
  if (u.length !== e.length) parts.push(`Expected ${e.length} rows but got ${u.length}.`);
  if (missing.length) parts.push(`${missing.length} expected row${missing.length === 1 ? ' is' : 's are'} missing.`);
  if (extra.length) parts.push(`${extra.length} row${extra.length === 1 ? ' is' : 's are'} not expected.`);
  return { ok: false, reason: parts.join(' '), missing: missing.slice(0, 5), extra: extra.slice(0, 5) };
}

/** One result per test case: the visible example, then any hidden datasets. Shown like LeetCode's test-case panel. */
function caseResults(m) {
  const setups = m.setups || [m.setup];
  return setups.map((su, i) => {
    const user = finalResult(m.sql, su), exp = finalResult(m.solution, su);
    const item = { n: i + 1, hidden: i > 0, exp: exp.error ? null : { columns: exp.columns, rows: exp.rows.slice(0, 10), total: exp.total } };
    if (user.error) return Object.assign(item, { ok: false, status: 'Runtime Error', reason: 'Line ' + user.error.line + ': ' + user.error.message });
    if (user.none) return Object.assign(item, { ok: false, status: 'Wrong Answer', reason: 'Your script did not return a result set. End it with a SELECT.' });
    const v = compare(user, exp, !!m.ordered);
    return Object.assign(item, { ok: v.ok, status: v.ok ? 'Accepted' : 'Wrong Answer', reason: v.ok ? '' : v.reason, got: { columns: user.columns, rows: user.rows.slice(0, 10), total: user.total } });
  });
}

onmessage = async (ev) => {
  const m = ev.data;
  await ready;
  if (!SQL) return;
  const t0 = performance.now();
  try {
    if (m.op === 'inspect') {
      const db = openDb(m.setup);
      const tables = m.tables.map((name) => {
        const info = db.exec(`PRAGMA table_info(${name})`)[0].values.map((r) => ({ name: r[1], type: r[2], pk: !!r[5] }));
        const count = db.exec(`SELECT COUNT(*) FROM ${name}`)[0].values[0][0];
        const rows = db.exec(`SELECT * FROM ${name} LIMIT 8`);
        return { name, columns: info, count, rows: rows.length ? rows[0].values : [] };
      });
      db.close();
      const exp = finalResult(m.solution, m.setup);
      postMessage({ type: 'result', id: m.id, tables, expected: exp.error ? { error: exp.error } : { columns: exp.columns, rows: exp.rows.slice(0, 12), total: exp.total } });
    } else if (m.op === 'run') {
      const db = openDb(m.setup);
      const r = runScript(db, m.sql);
      db.close();
      postMessage({ type: 'result', id: m.id, ...r, cases: caseResults(m), ms: Math.round(performance.now() - t0) });
    } else if (m.op === 'submit') {
      // One setup per test case: the visible example first, then any hidden datasets.
      const setups = m.setups || [m.setup];
      const db = openDb(setups[0]);
      const shown = runScript(db, m.sql);
      db.close();
      let verdict = { ok: true, caseCount: setups.length };
      for (let i = 0; i < setups.length; i++) {
        const user = finalResult(m.sql, setups[i]);
        let v;
        if (user.error) v = { ok: false, reason: 'Your query has an error: ' + user.error.message };
        else if (user.none) v = { ok: false, reason: 'Your script did not return a result set. End it with a SELECT.' };
        else {
          const exp = finalResult(m.solution, setups[i]);
          v = compare(user, exp, !!m.ordered);
          if (!v.ok) {
            v.expectedColumns = exp.columns; v.userColumns = user.columns;
            v.exp = { columns: exp.columns, rows: exp.rows.slice(0, 8), total: exp.total };
            v.got = { columns: user.columns, rows: user.rows.slice(0, 8), total: user.total };
          } else v.nameNote = v.nameNote || '';
        }
        if (!v.ok) { verdict = Object.assign(v, { caseIndex: i, caseCount: setups.length }); break; }
        if (i === 0 && v.nameNote) verdict.nameNote = v.nameNote;
      }
      postMessage({ type: 'result', id: m.id, ...shown, verdict, cases: caseResults(m), ms: Math.round(performance.now() - t0) });
    } else if (m.op === 'bank') {
      const fails = [];
      for (const it of m.items) {
        const setups = it.setups || [it.setup];
        for (let i = 0; i < setups.length; i++) {
          const a = finalResult(it.solution, setups[i]);
          const b = finalResult(it.solution, setups[i]);
          const where = setups.length > 1 ? ` (test case ${i + 1})` : '';
          if (a.error) { fails.push({ id: it.id, title: it.title, reason: a.error.message + where }); break; }
          // The visible example must return rows; a hidden case may legitimately return none.
          if (a.none || (i === 0 && !a.rows.length)) { fails.push({ id: it.id, title: it.title, reason: 'returns no rows' + where }); break; }
          if (JSON.stringify(a.rows) !== JSON.stringify(b.rows)) { fails.push({ id: it.id, title: it.title, reason: 'result is not deterministic' + where }); break; }
        }
      }
      postMessage({ type: 'result', id: m.id, total: m.items.length, fails });
    }
  } catch (e) {
    postMessage({ type: 'result', id: m.id, internal: String((e && e.message) || e) });
  }
};

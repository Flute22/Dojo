// Verifies the SQL question bank without any UI: counts, every reference solution on every test case,
// determinism, and (for the LeetCode-style set) that each "wrong" answer passes the visible example but is
// caught by a hidden test case. That last check is what proves the hidden data is doing its job.
//   node scripts/verify-sql.mjs            summary + problems only
//   node scripts/verify-sql.mjs --show     also prints every question's output
//   node scripts/verify-sql.mjs --show 130 prints one question (all of its test cases)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');
const dir = path.join(root, 'renderer-src', 'tracks');

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
const files = ['sql-datasets.js', 'sql-q-easy.js', 'sql-q-medium.js', 'sql-q-hard.js', 'sql-q-advanced.js', 'sql-lc-medium.js', 'sql-lc-hard.js', 'sql-lc-advanced.js', ...['medium', 'hard', 'advanced'].flatMap((l) => ['', '-2', '-3', '-4'].map((n) => `sql-pro-${l}${n}.js`))];
const loaded = files.filter((f) => fs.existsSync(path.join(dir, f)));
for (const f of loaded) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8') + `\n//# sourceURL=${f}`, ctx, { filename: f });
const W = ctx;

const args = process.argv.slice(2);
const show = args.includes('--show');
const only = args.find((a) => /^\d+$/.test(a));
const SQL = await initSqlJs();

const runCase = (q, sqlText, ci) => {
  const db = new SQL.Database();
  try {
    db.run(W.dojoSetupSql(q, ci));
    const res = db.exec(sqlText);
    return res.length ? res[res.length - 1] : { columns: [], values: [] };
  } finally { db.close(); }
};
// Same comparison the app's grader uses: values, numbers to 6 decimals, NULL = NULL, order only when asked.
const key = (v) => (v === null ? '∅' : typeof v === 'number' ? 'n' + String(Math.round(v * 1e6) / 1e6) : 's' + String(v));
const rowKey = (r) => r.map(key).join('\u0001');
const same = (a, b, ordered) => {
  if (a.columns.length !== b.columns.length) return false;
  const x = a.values.map(rowKey), y = b.values.map(rowKey);
  if (x.length !== y.length) return false;
  return JSON.stringify(ordered ? x : x.slice().sort()) === JSON.stringify(ordered ? y : y.slice().sort());
};

const problems = [];
const bad = (q, msg) => problems.push(`#${q.id} ${q.t}: ${msg}`);
const counts = {}, lcCounts = {}, proCounts = {};
const PRO_PER_LEVEL = 50; // the interview-grade set, counted across sql-pro-<level>*.js
const seenTitles = new Set();
const seenSql = new Set();

for (const q of W.DOJO_SQL) {
  const bucket = q.pro ? proCounts : q.lc ? lcCounts : counts;
  bucket[q.difficulty] = (bucket[q.difficulty] || 0) + 1;
  if (seenTitles.has(q.t)) bad(q, 'duplicate title');
  seenTitles.add(q.t);
  const norm = q.q.replace(/\s+/g, ' ').toLowerCase();
  if (seenSql.has(norm)) bad(q, 'duplicate solution');
  seenSql.add(norm);
  for (const f of ['t', 's', 'k', 'q', 'h', 'x', 'db', 'tb', 'tg']) {
    if (q.lc && f === 'db') continue;
    if (!q[f] || (Array.isArray(q[f]) && !q[f].length)) bad(q, `missing field ${f}`);
  }
  const nCases = W.dojoCaseCount(q);
  if (q.lc && nCases < 3) bad(q, `LeetCode-style questions need at least 2 hidden test cases (has ${nCases - 1})`);
  const results = [];
  let failed = false;
  for (let ci = 0; ci < nCases && !failed; ci++) {
    try {
      const r = runCase(q, q.q, ci);
      const r2 = runCase(q, q.q, ci);
      if (JSON.stringify(r.values) !== JSON.stringify(r2.values)) bad(q, `not deterministic (test case ${ci + 1})`);
      if (ci === 0 && !r.values.length) bad(q, 'visible example returns no rows');
      if (new Set(r.columns.map((c) => c.toLowerCase())).size !== r.columns.length) bad(q, 'duplicate column names: ' + r.columns.join(','));
      results.push(r);
    } catch (e) { bad(q, `SQL ERROR on test case ${ci + 1}: ${e.message}`); failed = true; }
  }
  if (failed) continue;
  if (q.o && !/order by/i.test(q.q)) bad(q, 'marked ordered but solution has no ORDER BY');
  // Each wrong answer must pass the visible example and fail at least one hidden case.
  const catchers = new Set();
  (q.wrong || []).forEach((w, wi) => {
    try {
      const vis = same(runCase(q, w, 0), results[0], q.o);
      if (!vis) { bad(q, `wrong answer #${wi + 1} already fails the visible example, so it is not a tempting mistake`); return; }
      let caught = false;
      for (let ci = 1; ci < nCases; ci++) {
        let r;
        try { r = runCase(q, w, ci); } catch (e) { caught = true; catchers.add(ci); continue; }
        if (!same(r, results[ci], q.o)) { caught = true; catchers.add(ci); }
      }
      if (!caught) bad(q, `wrong answer #${wi + 1} passes every test case: the hidden data does not catch it`);
    } catch (e) { bad(q, `wrong answer #${wi + 1} does not run: ${e.message}`); }
  });
  // Every hidden case has to earn its place: it either changes the expected answer, or it is the case that catches
  // a wrong answer (a boundary where the right query is unmoved and a sloppy one is not).
  if (q.lc) {
    const sigs = results.map((r) => JSON.stringify(r.values));
    for (let ci = 1; ci < nCases; ci++) {
      if (sigs[ci] !== sigs[0]) continue;
      if (!catchers.has(ci)) bad(q, `test case ${ci + 1} repeats the example's result and catches no wrong answer, so it adds nothing`);
    }
    if (sigs.slice(1).every((s) => s === sigs[0])) bad(q, 'no hidden case changes the expected answer');
  }
  if (q.lc && !(q.wrong && q.wrong.length)) bad(q, 'LeetCode-style questions need at least one tempting wrong answer to prove the hidden cases work');
  if (show && (!only || +only === q.id)) {
    console.log(`\n#${q.id} [${q.difficulty}${q.lc ? ', LC-style' : ''}] ${q.t}  (${nCases} test case${nCases === 1 ? '' : 's'})`);
    results.forEach((r, ci) => {
      console.log(`  case ${ci + 1}: ${r.values.length} rows × ${r.columns.length}   ${r.columns.join(' | ')}`);
      r.values.slice(0, 4).forEach((row) => console.log('    ' + row.map((v) => (v === null ? 'NULL' : v)).join(' | ')));
    });
  }
}

console.log('\nOriginal set:', JSON.stringify(counts), ' LeetCode-style set:', JSON.stringify(lcCounts), ' Interview-grade set:', JSON.stringify(proCounts), ' total', W.DOJO_SQL.length);
const want = { Easy: 50, Medium: 25, Hard: 25, Advanced: 25 };
for (const k of Object.keys(want)) if (counts[k] !== want[k]) problems.push(`Expected ${want[k]} ${k} in the original set, found ${counts[k]}`);
for (const [lvl, file] of [['Medium', 'sql-lc-medium.js'], ['Hard', 'sql-lc-hard.js'], ['Advanced', 'sql-lc-advanced.js']]) {
  if (loaded.includes(file) && lcCounts[lvl] !== 25) problems.push(`Expected 25 LeetCode-style ${lvl} questions, found ${lcCounts[lvl] || 0}`);
}
for (const [lvl, file] of [['Medium', 'sql-pro-medium.js'], ['Hard', 'sql-pro-hard.js'], ['Advanced', 'sql-pro-advanced.js']]) {
  if (loaded.includes(file) && proCounts[lvl] !== PRO_PER_LEVEL) problems.push(`Expected ${PRO_PER_LEVEL} interview-grade ${lvl} questions, found ${proCounts[lvl] || 0}`);
}
console.log('Loaded:', loaded.join(' '));
// Interview-grade questions must really use several tables.
for (const q of W.DOJO_SQL) if (q.pro && (q.tb || []).length < 3) problems.push(`#${q.id} ${q.t}: interview-grade questions need at least 3 tables (has ${(q.tb || []).length})`);
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
console.log('All questions OK: every solution runs on every test case, is deterministic, and every tempting wrong answer is caught by a hidden case.');

// Verifies the SQL question bank without any UI: counts per level, every reference solution runs on its
// own tables, returns rows, is deterministic, and (with --show) prints each result so it can be read.
//   node scripts/verify-sql.mjs            summary + problems only
//   node scripts/verify-sql.mjs --show     also prints every question's output
//   node scripts/verify-sql.mjs --show 76  prints one question
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
ctx.window = ctx; // as in a browser, window is the global object
vm.createContext(ctx);
for (const f of ['sql-datasets.js', 'sql-q-easy.js', 'sql-q-medium.js', 'sql-q-hard.js', 'sql-q-advanced.js']) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8') + `\n//# sourceURL=${f}`, ctx, { filename: f });
}
const W = ctx;

const args = process.argv.slice(2);
const show = args.includes('--show');
const only = args.find((a) => /^\d+$/.test(a));

const SQL = await initSqlJs();
const run = (q) => {
  const db = new SQL.Database();
  try {
    db.run(W.dojoSetupSql(q));
    const res = db.exec(q.q);
    return res.length ? res[res.length - 1] : { columns: [], values: [] };
  } finally { db.close(); }
};

const problems = [];
const bad = (q, msg) => problems.push(`#${q.id} ${q.t}: ${msg}`);
const counts = {};
const seenTitles = new Set();
const seenSql = new Set();

for (const q of W.DOJO_SQL) {
  counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
  if (seenTitles.has(q.t)) bad(q, 'duplicate title');
  seenTitles.add(q.t);
  const norm = q.q.replace(/\s+/g, ' ').toLowerCase();
  if (seenSql.has(norm)) bad(q, 'duplicate solution');
  seenSql.add(norm);
  for (const f of ['t', 's', 'k', 'q', 'h', 'x', 'db', 'tb', 'tg']) if (!q[f] || (Array.isArray(q[f]) && !q[f].length)) bad(q, `missing field ${f}`);
  let r;
  try {
    r = run(q);
  } catch (e) {
    bad(q, 'SQL ERROR: ' + e.message);
    continue;
  }
  if (!r.values.length) bad(q, 'returns no rows');
  if (new Set(r.columns.map((c) => c.toLowerCase())).size !== r.columns.length) bad(q, 'duplicate column names: ' + r.columns.join(','));
  const r2 = run(q);
  if (JSON.stringify(r.values) !== JSON.stringify(r2.values)) bad(q, 'not deterministic');
  if (!q.o && /order by/i.test(q.q) && !/limit/i.test(q.q) && !/over\s*\(/i.test(q.q)) { /* unordered question that still sorts: fine */ }
  if (q.o && !/order by/i.test(q.q)) bad(q, 'marked ordered but solution has no ORDER BY');
  if (show && (!only || +only === q.id)) {
    console.log(`\n#${q.id} [${q.difficulty}] ${q.t}  (${r.values.length} rows × ${r.columns.length})`);
    console.log('  ' + r.columns.join(' | '));
    r.values.slice(0, 6).forEach((row) => console.log('  ' + row.map((v) => (v === null ? 'NULL' : v)).join(' | ')));
    if (r.values.length > 6) console.log(`  … ${r.values.length - 6} more`);
  }
}

console.log('\nCounts:', JSON.stringify(counts), 'total', W.DOJO_SQL.length);
const want = { Easy: 50, Medium: 25, Hard: 25, Advanced: 25 };
for (const k of Object.keys(want)) if (counts[k] !== want[k]) problems.push(`Expected ${want[k]} ${k}, found ${counts[k]}`);
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
console.log('All questions OK: every solution runs, returns rows, and is deterministic.');

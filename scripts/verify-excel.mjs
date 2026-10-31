// Verifies the Excel question bank without any UI.
//   node scripts/verify-excel.mjs             summary + problems
//   node scripts/verify-excel.mjs --show 12   print the graded ranges of one question
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'renderer-src', 'tracks');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
const files = ['excel-engine.js', 'excel-functions.js', 'excel-wb.js', 'excel-grade.js', 'excel-datasets.js'];
for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const have = ['easy', 'medium', 'hard', 'advanced'].filter((l) => fs.existsSync(path.join(dir, `excel-q-${l}.js`)));
for (const l of have) vm.runInContext(fs.readFileSync(path.join(dir, `excel-q-${l}.js`), 'utf8'), ctx, { filename: `excel-q-${l}.js` });
const haveLc = ['medium', 'hard', 'advanced'].filter((l) => fs.existsSync(path.join(dir, `excel-lc-${l}.js`)));
for (const l of haveLc) vm.runInContext(fs.readFileSync(path.join(dir, `excel-lc-${l}.js`), 'utf8'), ctx, { filename: `excel-lc-${l}.js` });
const XL = ctx.DojoXL, Q = ctx.DOJO_XL;
const args = process.argv.slice(2), show = args.includes('--show'), only = args.find((a) => /^\d+$/.test(a));

const problems = [], counts = {}, lcCounts = {}, titles = new Set();
const sig = (q, wb) => JSON.stringify((q.chk || []).filter((c) => c.v).map((c) => { const s = wb.sheet(c.sheet || q.main || wb.sheets[0].name), r = XL.parseRange(c.v), out = []; for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) out.push(wb.display(s, i, j)); return out; }));
const bad = (q, m) => problems.push(`#${q.id} ${q.t}: ${m}`);
for (const q of Q) {
  counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
  if (q.lc) lcCounts[q.difficulty] = (lcCounts[q.difficulty] || 0) + 1;
  if (titles.has(q.t)) bad(q, 'duplicate title'); titles.add(q.t);
  for (const f of ['t', 's', 'k', 'h', 'x', 'sol', 'chk', 'tg']) if (!q[f] || (Array.isArray(q[f]) && !q[f].length)) bad(q, 'missing ' + f);
  let sol, start;
  try { start = XL.makeStart(q); sol = XL.makeSolution(q); } catch (e) { bad(q, 'BUILD ERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 3).join('\n')); continue; }
  // 1. the solution passes its own checks after a save / load round trip
  let g;
  try { g = XL.grade(q, XL.Workbook.fromJSON(JSON.parse(JSON.stringify(sol.toJSON()))), { sol }); } catch (e) { bad(q, 'GRADE ERROR: ' + e.message); continue; }
  g.filter((x) => !x.ok).forEach((x) => bad(q, 'solution fails its own check "' + x.label + '": ' + x.msg));
  // 2. doing nothing must not pass
  const g0 = XL.grade(q, XL.Workbook.fromJSON(JSON.parse(JSON.stringify(start.toJSON()))), { sol });
  if (g0.every((x) => x.ok)) bad(q, 'the untouched workbook already passes');
  // 2b. LeetCode-style: hidden cases change the answer, the solution passes them, tempting wrong answers fail them
  if (q.lc) {
    if ((q.hidden || []).length < 2) bad(q, 'needs at least 2 hidden test cases');
    if (!(q.wrong || []).length) bad(q, 'needs at least one tempting wrong answer');
    if (!(q.chk || []).some((c) => c.v && c.f)) bad(q, 'needs a formula-checked value range');
    const base = sig(q, sol);
    (q.hidden || []).forEach((p, i) => { const c = sol.clone(); try { p(c); c.recalc(); } catch (e) { bad(q, 'hidden ' + (i + 1) + ' patch error: ' + e.message); return; } if (sig(q, c) === base) bad(q, 'hidden case ' + (i + 1) + ' gives the same answer as the example'); });
    const gh = XL.grade(q, XL.Workbook.fromJSON(JSON.parse(JSON.stringify(sol.toJSON()))), { sol });
    gh.filter((x) => !x.ok).forEach((x) => bad(q, 'solution fails "' + x.label + '": ' + x.msg));
    (q.wrong || []).forEach((w, i) => {
      const wb = XL.makeStart(q); try { w(wb); wb.recalc(); } catch (e) { bad(q, 'wrong answer ' + (i + 1) + ' build error: ' + e.message); return; }
      const vis = XL.grade(q, wb.clone(), { sol, noHidden: true });
      if (!vis.every((x) => x.ok)) { bad(q, 'wrong answer ' + (i + 1) + ' must pass the example but fails "' + vis.find((x) => !x.ok).label + '": ' + vis.find((x) => !x.ok).msg); return; }
      const all = XL.grade(q, wb.clone(), { sol });
      if (all.every((x) => x.ok)) bad(q, 'wrong answer ' + (i + 1) + ' passes every hidden test case');
    });
  }
  // 3. no error values in the graded value ranges
  (q.chk || []).forEach((spec) => {
    if (!spec.v) return;
    const s = sol.sheet(spec.sheet || q.main || sol.sheets[0].name), r = XL.parseRange(spec.v);
    for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) { const v = sol.valueAt(s, i, j); if (XL.isErr(v) && !q.allowErr) bad(q, `error value ${v.err} at ${XL.addr(i, j)}`); }
  });
  if (show && (!only || +only === q.id)) {
    console.log(`\n#${q.id} [${q.difficulty}] ${q.t}`);
    (q.chk || []).forEach((spec) => {
      if (!spec.v) { console.log('  check:', JSON.stringify(spec)); return; }
      const s = sol.sheet(spec.sheet || q.main || sol.sheets[0].name), r = XL.parseRange(spec.v);
      const rows = [];
      for (let i = r.r1; i <= Math.min(r.r2, r.r1 + 5); i++) { const row = []; for (let j = r.c1; j <= r.c2; j++) row.push(sol.display(s, i, j)); rows.push(row.join(' | ')); }
      console.log(`  ${spec.v}${spec.f ? ' (formulas)' : ''}: first cell "${sol.raw(s, r.r1, r.c1)}"`); rows.forEach((x) => console.log('    ' + x)); if (r.r2 - r.r1 > 5) console.log('    …');
    });
  }
}
console.log('\nCounts:', JSON.stringify(counts), 'LeetCode-style:', JSON.stringify(lcCounts), 'total', Q.length);
const want = { Easy: 50, Medium: 25, Hard: 25, Advanced: 25 };
for (const l of have) { const k = { easy: 'Easy', medium: 'Medium', hard: 'Hard', advanced: 'Advanced' }[l]; const lc = haveLc.includes(l) ? 25 : 0; if (counts[k] !== want[k] + lc) problems.push(`Expected ${want[k] + lc} ${k}, found ${counts[k]}`); if (lc && lcCounts[k] !== 25) problems.push(`Expected 25 LeetCode-style ${k}, found ${lcCounts[k] || 0}`); }
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
console.log('All questions OK: each solution passes its own checks, round-trips through save/load, and the untouched sheet fails.');

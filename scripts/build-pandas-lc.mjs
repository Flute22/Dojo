// Builds renderer-src/tracks/pandas-lc.js (the LeetCode-style Pandas questions) from renderer-src/pandas-lc/*.mjs.
//
// Authors write the setup, hidden setups and a reference solution. This script runs the reference solution in the
// real Pandas (Pyodide, offline) on the visible example and on every hidden dataset to produce the expected tables,
// runs every approach through the same judge the app uses, and checks that each tempting `wrong` solution passes the
// visible example but fails a hidden case. Nothing is written unless every check passes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { patchEngineText } from './pandas-patch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// file, difficulty, interview-grade?  The order fixes the problem numbers, so new files go at the end.
const LEVELS = [['medium', 'Medium', false], ['hard', 'Hard', false], ['advanced', 'Advanced', false],
  ...['medium', 'hard', 'advanced'].flatMap((l) => ['', '-2', '-3', '-4'].map((n) => [`pro-${l}${n}`, l[0].toUpperCase() + l.slice(1), true]))];
const PRO_PER_LEVEL = 50; // counted across pandas-lc/pro-<level>*.mjs
const FIRST_ID = 126;

const engine = patchEngineText(fs.readFileSync(path.join(root, 'source', 'dojo-engine.js'), 'utf8').replace(/\r\n/g, '\n'));
const a = engine.indexOf('String.raw`') + 'String.raw`'.length;
const harness = engine.slice(a, engine.indexOf('`;\n\n  // Runs inside'));

const HELPER = String.raw`
import json, math
def _val(v):
    if v is None or v is pd.NaT: return None
    if isinstance(v, (bool, np.bool_)): return bool(v)
    if isinstance(v, (int, np.integer)): return int(v)
    if isinstance(v, (float, np.floating)):
        f = float(v)
        return None if math.isnan(f) else round(f, 10)
    if isinstance(v, pd.Timestamp):
        return v.strftime("%Y-%m-%d") if (v.hour == 0 and v.minute == 0 and v.second == 0 and v.microsecond == 0) else v.strftime("%Y-%m-%d %H:%M:%S")
    return str(v)
def _mkspec(setup, code, call):
    ns = {"pd": pd, "np": np, "__name__": "__main__"}
    exec(setup, ns); exec(code, ns)
    df = eval(call, ns)
    assert isinstance(df, pd.DataFrame), "the reference solution must return a DataFrame"
    assert not isinstance(df.columns, pd.MultiIndex), "flatten the column names"
    assert list(df.index) == list(range(len(df))), "the reference solution must return a default 0..n-1 index (reset_index)"
    assert len(set(map(str, df.columns))) == len(df.columns), "duplicate column names"
    dt = {}
    for c in df.columns:
        k = df[c].dtype
        if pd.api.types.is_float_dtype(k): dt[str(c)] = "float"
        elif pd.api.types.is_datetime64_any_dtype(k): dt[str(c)] = "datetime"
    return json.dumps({"columns": [str(c) for c in df.columns], "rows": [[_val(v) for v in r] for r in df.itertuples(index=False, name=None)], "dtypes": dt})
`;

const { loadPyodide } = require(path.join(root, 'pyodide', 'pyodide.js'));
const py = await loadPyodide({ indexURL: path.join(root, 'pyodide') + path.sep });
await py.loadPackage(['numpy', 'pandas']);
py.runPython(harness);
py.runPython(HELPER);
const mkspec = py.globals.get('_mkspec');
const dojoExec = py.globals.get('_dojo_exec');
const run = (req) => JSON.parse(dojoExec(JSON.stringify(req)));

const problems = [], errors = [];
let id = FIRST_ID;
const counts = {};
for (const [file, label, pro] of LEVELS) {
  const f = path.join(root, 'renderer-src', 'pandas-lc', file + '.mjs');
  if (!fs.existsSync(f)) continue;
  const list = (await import(pathToFileURL(f).href)).default;
  const bucket = (pro ? 'pro ' : '') + label;
  counts[bucket] = (counts[bucket] || 0) + list.length;
  for (const q of list) {
    const tag = `#${id} ${q.t}`;
    const bad = (m) => errors.push(`${tag}: ${m}`);
    try {
      const params = (q.sig.match(/^def solve\((.*)\)\s*->/s) || [, ''])[1].split(/,(?![^\[]*\])/).map((s) => s.split(':')[0].trim()).filter(Boolean);
      const call = `solve(${params.join(', ')})`;
      const spec = (setup) => JSON.parse(mkspec(setup, q.ref, call));
      const expected = spec(q.setup);
      if (!expected.rows.length) bad('the visible example returns no rows');
      const hidden = (q.hidden || []).map((setup) => ({ setup, expected: spec(setup) }));
      if (hidden.length < 2) bad('needs at least 2 hidden datasets');
      if (!(q.wrong || []).length) bad('needs at least one tempting wrong solution');
      if ((q.hints || []).length < 2) bad('needs 2 hints');
      if (pro) {
        const frames = (q.setup.match(/pd\.DataFrame\(/g) || []).length;
        if (frames < 3) bad(`interview-grade questions need at least 3 tables (setup builds ${frames})`);
        if (params.length < 2) bad('interview-grade questions take more than one table as arguments');
      }
      const ignoreOrder = !q.o;
      const req = (code, withHidden) => ({ mode: 'submit', setup: q.setup, code, call, expected, hidden: withHidden ? hidden : undefined, ignoreOrder });
      const approaches = [{ name: q.refName || 'Reference solution', code: q.ref, explanation: q.why, complexity: q.cx || 'O(n log n).', whenToUse: q.use || 'Whenever the rule can be written with vectorised pandas operations.' }];
      if (q.alt) approaches.push({ name: q.alt.name, code: q.alt.code, explanation: q.alt.why, complexity: q.alt.cx || q.cx || 'O(n log n).', whenToUse: q.alt.use || 'When this reads more clearly to you.' });
      approaches.forEach((ap, i) => {
        const r = run(req(ap.code, true));
        if (r.error || !r.verdict || !r.verdict.ok) bad(`approach ${i + 1} fails its own tests: ${JSON.stringify(r.error || r.verdict).slice(0, 300)}`);
      });
      // Each wrong solution must pass the example and be caught by a hidden dataset; note which one catches it.
      const key = (e) => JSON.stringify(e.rows);
      const catchers = new Set();
      (q.wrong || []).forEach((code, i) => {
        const vis = run(req(code, false));
        if (vis.error || !vis.verdict || !vis.verdict.ok) { bad(`wrong solution ${i + 1} must pass the visible example but does not: ${JSON.stringify(vis.error || vis.verdict).slice(0, 240)}`); return; }
        let caught = false;
        hidden.forEach((h, hi) => {
          const r = run({ mode: 'submit', setup: q.setup, code, call, expected, hidden: [h], ignoreOrder });
          if (r.error || !r.verdict || !r.verdict.ok) { caught = true; catchers.add(hi); }
        });
        if (!caught) bad(`wrong solution ${i + 1} passes every hidden dataset: a hidden dataset must catch it`);
      });
      // A hidden dataset earns its place by changing the answer, or by being the one that catches a wrong solution.
      hidden.forEach((h, i) => {
        if (key(h.expected) !== key(expected) || catchers.has(i)) return;
        bad(`hidden dataset ${i + 1} repeats the example's answer and catches no wrong solution, so it adds nothing`);
      });
      if (hidden.length && hidden.every((h) => key(h.expected) === key(expected))) bad('no hidden dataset changes the answer');
      problems.push({
        id: id, title: q.t, difficulty: label, tags: q.tags, story: q.story, task: q.task, setup: q.setup,
        signature: q.sig, call, expected, hidden, hints: q.hints, approaches, mistakes: q.mistakes, ...(pro ? { pro: true } : {}),
        ...(ignoreOrder ? { ignoreOrder: true } : {}),
      });
    } catch (e) { bad(String(e && e.message || e).split('\n').slice(-3).join(' | ').slice(0, 400)); }
    id++;
  }
}

for (const lvl of ['Medium', 'Hard', 'Advanced']) {
  const n = counts['pro ' + lvl] || 0;
  if (n && n !== PRO_PER_LEVEL) errors.push(`Expected ${PRO_PER_LEVEL} interview-grade ${lvl} questions, found ${n}`);
}
if (errors.length) {
  console.error(errors.length + ' problem(s):\n' + errors.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
const out = path.join(root, 'renderer-src', 'tracks', 'pandas-lc.js');
fs.writeFileSync(out, '// Dojo Pandas, LeetCode-style set. GENERATED by scripts/build-pandas-lc.mjs from renderer-src/pandas-lc/*.mjs. Do not edit.\n'
  + 'window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];\nwindow.DOJO_PROBLEMS.push(...' + JSON.stringify(problems) + ');\n');
console.log(`pandas-lc.js written: ${problems.length} problems ${JSON.stringify(counts)}; every approach passes its tests and every wrong solution is caught by a hidden dataset.`);

/* Dojo Excel: worksheet functions. Registered on DojoXL.FN with DojoXL.def. */
(function (root) {
  'use strict';
  const XL = root.DojoXL;
  const { Arr, Ref, E, isErr, toNum, toStr, toBool, cmp, def, lift, serial, fromSerial, formatValue, val, scalar } = XL;
  const NA = () => E('#N/A'), VALUE = () => E('#VALUE!'), NUM = () => E('#NUM!'), DIV0 = () => E('#DIV/0!');

  // ---- helpers --------------------------------------------------------------------------------------------
  const flat = (a) => (a instanceof Arr ? [].concat(...a.rows) : [a]);
  const rowsOf = (a) => (a instanceof Arr ? a.rows : [[a]]);
  const mk = (rows) => new Arr(rows);
  const firstErr = (list) => list.find(isErr);
  /** Numbers from function arguments: ranges and arrays keep only numbers, direct arguments are coerced. */
  function nums(args) {
    const out = [];
    for (const a of args) {
      if (a instanceof Arr) { for (const v of flat(a)) { if (isErr(v)) return v; if (typeof v === 'number') out.push(v); } }
      else if (a === null) continue;
      else if (isErr(a)) return a;
      else { const n = toNum(a); if (isErr(n)) return n; out.push(n); }
    }
    return out;
  }
  const withNums = (f) => (args) => { const n = nums(args); return isErr(n) ? n : f(n); };
  const wild = (pat) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '[\\s\\S]*').replace(/\?/g, '[\\s\\S]').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?') + '$', 'i');
  /** Criteria such as ">5", "<>x", "a*" or a plain value, as used by COUNTIF and friends. */
  function crit(c) {
    c = scalar(c);
    if (isErr(c)) return () => false;
    if (typeof c === 'number') return (v) => (typeof v === 'number' ? v === c : typeof v === 'string' && toNum(v) === c);
    if (typeof c === 'boolean') return (v) => v === c;
    if (c === null) return (v) => v === 0 || v === null;
    const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(c);
    const op = m[1] || '=', o = m[2];
    const n = o === '' ? NaN : toNum(o);
    const isNum = typeof n === 'number' && !isNaN(n) && o.trim() !== '';
    if (op === '=' || op === '<>') {
      const eq = o === '' ? (v) => v === null || v === '' : isNum ? (v) => (typeof v === 'number' ? v === n : typeof v === 'string' && v.toLowerCase() === o.toLowerCase()) : /[*?]/.test(o) ? ((re) => (v) => typeof v === 'string' && re.test(v))(wild(o)) : (v) => typeof v === 'string' && v.toLowerCase() === o.toLowerCase();
      return op === '=' ? eq : (v) => !eq(v);
    }
    const test = (r) => (op === '<' ? r < 0 : op === '>' ? r > 0 : op === '<=' ? r <= 0 : r >= 0);
    if (isNum) return (v) => typeof v === 'number' && test(v < n ? -1 : v > n ? 1 : 0);
    return (v) => typeof v === 'string' && test(cmp(v, o));
  }
  const A = (x) => (x instanceof Arr ? x : mk([[x]]));
  function masks(pairs) {
    // pairs: [range, criteria, range, criteria...]
    const first = A(pairs[0]);
    const H = first.h, W = first.w;
    const keep = Array.from({ length: H }, () => Array(W).fill(true));
    for (let k = 0; k < pairs.length; k += 2) {
      const rg = A(pairs[k]);
      if (rg.h !== H || rg.w !== W) return VALUE();
      const test = crit(pairs[k + 1]);
      for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) if (keep[i][j] && !test(rg.rows[i][j])) keep[i][j] = false;
    }
    return keep;
  }
  const pick = (arr, mask) => { arr = A(arr); const out = []; arr.rows.forEach((r, i) => r.forEach((v, j) => { if (mask[i][j]) out.push(v); })); return out; };
  const numsOnly = (list) => list.filter((v) => typeof v === 'number');
  const eqLoose = (a, b) => (typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b);
  const sortNums = (n) => n.slice().sort((a, b) => a - b);
  function percentile(n, k) { const s = sortNums(n), p = k * (s.length - 1), lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); }
  const sd = (n, sample) => { if (n.length < (sample ? 2 : 1)) return DIV0(); const m = n.reduce((a, b) => a + b, 0) / n.length; return Math.sqrt(n.reduce((a, b) => a + (b - m) ** 2, 0) / (n.length - (sample ? 1 : 0))); };
  function round(x, d, mode) {
    const f = Math.pow(10, d), a = Math.abs(x) * f, s = x < 0 ? -1 : 1;
    const eps = 1e-9 * Math.max(1, a);
    const r = mode === 'up' ? Math.ceil(a - eps) : mode === 'down' ? Math.floor(a + eps) : Math.floor(a + 0.5 + eps);
    return s * r / f;
  }
  const num1 = (f) => ([x]) => { const n = toNum(x); return isErr(n) ? n : f(n); };
  const num2 = (f) => ([x, y]) => { if (isErr(x)) return x; if (isErr(y)) return y; const a = toNum(x), b = toNum(y); return isErr(a) ? a : isErr(b) ? b : f(a, b); };

  // ---- math -----------------------------------------------------------------------------------------------
  def('SUM', withNums((n) => n.reduce((a, b) => a + b, 0)), { keep: 'all' });
  def('PRODUCT', withNums((n) => n.reduce((a, b) => a * b, 1)), { keep: 'all' });
  def('SUMSQ', withNums((n) => n.reduce((a, b) => a + b * b, 0)), { keep: 'all' });
  def('AVERAGE', withNums((n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : DIV0())), { keep: 'all' });
  def('MIN', withNums((n) => (n.length ? Math.min(...n) : 0)), { keep: 'all' });
  def('MAX', withNums((n) => (n.length ? Math.max(...n) : 0)), { keep: 'all' });
  def('MEDIAN', withNums((n) => (n.length ? percentile(n, 0.5) : NUM())), { keep: 'all' });
  def(['MODE', 'MODE.SNGL'], withNums((n) => { const c = new Map(); n.forEach((x) => c.set(x, (c.get(x) || 0) + 1)); let best = null, bc = 1; for (const [x, k] of c) if (k > bc) { best = x; bc = k; } return best === null ? NA() : best; }), { keep: 'all' });
  def(['STDEV', 'STDEV.S'], withNums((n) => sd(n, true)), { keep: 'all' });
  def('STDEV.P', withNums((n) => sd(n, false)), { keep: 'all' });
  def(['VAR', 'VAR.S'], withNums((n) => { const s = sd(n, true); return isErr(s) ? s : s * s; }), { keep: 'all' });
  def('VAR.P', withNums((n) => { const s = sd(n, false); return isErr(s) ? s : s * s; }), { keep: 'all' });
  def('COUNT', (args) => { let c = 0; for (const a of args) { if (a instanceof Arr) c += flat(a).filter((v) => typeof v === 'number').length; else if (a !== null && !isErr(a) && !isErr(toNum(a))) c++; } return c; }, { keep: 'all' });
  def('COUNTA', (args) => args.reduce((c, a) => c + flat(a).filter((v) => v !== null).length, 0), { keep: 'all' });
  def('COUNTBLANK', ([a]) => flat(a).filter((v) => v === null || v === '').length, { keep: 'all' });
  def('LARGE', ([a, k]) => { const n = numsOnly(flat(a)).sort((x, y) => y - x); const i = toNum(k); return isErr(i) || i < 1 || i > n.length ? NUM() : n[i - 1]; }, { keep: [0] });
  def('SMALL', ([a, k]) => { const n = numsOnly(flat(a)).sort((x, y) => x - y); const i = toNum(k); return isErr(i) || i < 1 || i > n.length ? NUM() : n[i - 1]; }, { keep: [0] });
  def(['RANK', 'RANK.EQ'], ([x, a, o]) => { const v = toNum(x); const n = numsOnly(flat(a)); if (!n.includes(v)) return NA(); const asc = o !== undefined && o !== null && toNum(o) !== 0; return 1 + n.filter((y) => (asc ? y < v : y > v)).length; }, { keep: [1] });
  def(['PERCENTILE', 'PERCENTILE.INC'], ([a, k]) => { const n = numsOnly(flat(a)); const p = toNum(k); return !n.length || p < 0 || p > 1 ? NUM() : percentile(n, p); }, { keep: [0] });
  def(['QUARTILE', 'QUARTILE.INC'], ([a, q]) => { const n = numsOnly(flat(a)); const k = toNum(q); return !n.length || k < 0 || k > 4 ? NUM() : percentile(n, k / 4); }, { keep: [0] });
  def('CORREL', ([a, b]) => { const x = flat(a), y = flat(b); const px = [], py = []; x.forEach((v, i) => { if (typeof v === 'number' && typeof y[i] === 'number') { px.push(v); py.push(y[i]); } }); const n = px.length; if (n < 2) return DIV0(); const mx = px.reduce((s, v) => s + v, 0) / n, my = py.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (px[i] - mx) * (py[i] - my); sxx += (px[i] - mx) ** 2; syy += (py[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : DIV0(); }, { keep: 'all' });
  def('SLOPE', ([ys, xs]) => { const y = flat(ys), x = flat(xs); const n = x.length; const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx ? sxy / sxx : DIV0(); }, { keep: 'all' });
  def('INTERCEPT', ([ys, xs]) => { const y = flat(ys), x = flat(xs); const n = x.length; const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxx ? my - (sxy / sxx) * mx : DIV0(); }, { keep: 'all' });
  def('ABS', num1(Math.abs));
  def('SQRT', num1((x) => (x < 0 ? NUM() : Math.sqrt(x))));
  def('EXP', num1(Math.exp));
  def('LN', num1((x) => (x <= 0 ? NUM() : Math.log(x))));
  def('LOG10', num1((x) => (x <= 0 ? NUM() : Math.log10(x))));
  def('LOG', ([x, b]) => { const n = toNum(x), base = b === undefined || b === null ? 10 : toNum(b); return n <= 0 || base <= 0 ? NUM() : Math.log(n) / Math.log(base); });
  def('POWER', num2((a, b) => { const r = Math.pow(a, b); return Number.isFinite(r) ? r : NUM(); }));
  def('MOD', num2((a, b) => (b === 0 ? DIV0() : a - b * Math.floor(a / b))));
  def('QUOTIENT', num2((a, b) => (b === 0 ? DIV0() : Math.trunc(a / b))));
  def('INT', num1(Math.floor));
  def('SIGN', num1(Math.sign));
  def('PI', () => Math.PI);
  def('FACT', num1((x) => { let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; }));
  def('ROUND', ([x, d]) => { const n = toNum(x), k = toNum(d); return isErr(n) ? n : isErr(k) ? k : round(n, k); });
  def('ROUNDUP', ([x, d]) => { const n = toNum(x), k = toNum(d); return isErr(n) ? n : isErr(k) ? k : round(n, k, 'up'); });
  def('ROUNDDOWN', ([x, d]) => { const n = toNum(x), k = toNum(d); return isErr(n) ? n : isErr(k) ? k : round(n, k, 'down'); });
  def('TRUNC', ([x, d]) => { const n = toNum(x), k = d === undefined || d === null ? 0 : toNum(d); return isErr(n) ? n : round(n, k, 'down'); });
  def('CEILING', ([x, s]) => { const n = toNum(x), k = s === undefined ? 1 : toNum(s); return k === 0 ? 0 : Math.ceil(n / k - 1e-12) * k; });
  def('FLOOR', ([x, s]) => { const n = toNum(x), k = s === undefined ? 1 : toNum(s); return k === 0 ? DIV0() : Math.floor(n / k + 1e-12) * k; });
  def('MROUND', num2((n, m) => (m === 0 ? 0 : Math.round(n / m) * m)));
  def('RAND', () => Math.random());
  def('RANDBETWEEN', num2((a, b) => a + Math.floor(Math.random() * (b - a + 1))));
  def('SUMPRODUCT', (args) => {
    const arrs = args.map((a) => (a instanceof Arr ? a : mk([[a]])));
    const H = arrs[0].h, W = arrs[0].w;
    if (arrs.some((a) => a.h !== H || a.w !== W)) return VALUE();
    let s = 0;
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) { let p = 1; for (const a of arrs) { const v = a.rows[i][j]; if (isErr(v)) return v; p *= typeof v === 'number' ? v : 0; } s += p; }
    return s;
  }, { keep: 'all' });
  def('SUMIF', ([rg, c, sr]) => { const m = masks([rg, c]); if (!m || isErr(m)) return m || VALUE(); const src = sr === undefined || sr === null ? rg : sr; const vals = pick(src, m); if (vals.some(isErr)) return vals.find(isErr); return numsOnly(vals).reduce((a, b) => a + b, 0); }, { keep: [0, 2] });
  def('SUMIFS', (a) => { const m = masks(a.slice(1)); if (!m || isErr(m)) return m || VALUE(); const vals = pick(a[0], m); return numsOnly(vals).reduce((x, y) => x + y, 0); }, { keep: (i) => i === 0 || i % 2 === 1 });
  def('COUNTIF', ([rg, c]) => { const m = masks([rg, c]); return !m || isErr(m) ? m || VALUE() : pick(rg, m).length; }, { keep: [0] });
  def('COUNTIFS', (a) => { const m = masks(a); return !m || isErr(m) ? m || VALUE() : pick(a[0], m).length; }, { keep: (i) => i % 2 === 0 });
  def('AVERAGEIF', ([rg, c, ar]) => { const m = masks([rg, c]); if (!m || isErr(m)) return m || VALUE(); const v = numsOnly(pick(ar === undefined || ar === null ? rg : ar, m)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : DIV0(); }, { keep: [0, 2] });
  def('AVERAGEIFS', (a) => { const m = masks(a.slice(1)); if (!m || isErr(m)) return m || VALUE(); const v = numsOnly(pick(a[0], m)); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : DIV0(); }, { keep: (i) => i === 0 || i % 2 === 1 });
  def('MAXIFS', (a) => { const m = masks(a.slice(1)); if (!m || isErr(m)) return m || VALUE(); const v = numsOnly(pick(a[0], m)); return v.length ? Math.max(...v) : 0; }, { keep: (i) => i === 0 || i % 2 === 1 });
  def('MINIFS', (a) => { const m = masks(a.slice(1)); if (!m || isErr(m)) return m || VALUE(); const v = numsOnly(pick(a[0], m)); return v.length ? Math.min(...v) : 0; }, { keep: (i) => i === 0 || i % 2 === 1 });
  def('SUBTOTAL', (raw, cx) => {
    const fnum = toNum(val(cx, raw[0]));
    const base = fnum > 100 ? fnum - 100 : fnum;
    const hide = fnum > 100;
    const vals = [];
    raw.slice(1).forEach((x) => {
      if (x instanceof Ref) {
        const g = XL.refExtent(cx, x);
        for (let r = g.r1; r <= g.r2; r++) { if (x.sheet.hiddenRows && x.sheet.hiddenRows.has(r) && (hide || x.sheet.filteredRows && x.sheet.filteredRows.has(r))) continue; for (let c = g.c1; c <= g.c2; c++) vals.push(XL.cellValue(cx, x.sheet, r, c)); }
      } else vals.push(...flat(val(cx, x)));
    });
    const n = numsOnly(vals);
    switch (base) {
      case 1: return n.length ? n.reduce((a, b) => a + b, 0) / n.length : DIV0();
      case 2: return n.length;
      case 3: return vals.filter((v) => v !== null).length;
      case 4: return n.length ? Math.max(...n) : 0;
      case 5: return n.length ? Math.min(...n) : 0;
      case 9: return n.reduce((a, b) => a + b, 0);
      default: return VALUE();
    }
  }, { refs: true });
  // ROW(A2:A9) and COLUMN(A1:D1) return one number per row / column of the range, like Excel's array result.
  def('ROW', (raw, cx) => { const x = raw[0]; if (!(x instanceof Ref)) return cx.r + 1; const n = x.r2 - x.r1 + 1; return n > 1 ? mk(Array.from({ length: n }, (_, i) => [x.r1 + 1 + i])) : x.r1 + 1; }, { refs: true });
  def('COLUMN', (raw, cx) => { const x = raw[0]; if (!(x instanceof Ref)) return cx.c + 1; const n = x.c2 - x.c1 + 1; return n > 1 ? mk([Array.from({ length: n }, (_, i) => x.c1 + 1 + i)]) : x.c1 + 1; }, { refs: true });
  def('ROWS', ([a]) => (a instanceof Arr ? a.h : 1), { keep: 'all' });
  def('COLUMNS', ([a]) => (a instanceof Arr ? a.w : 1), { keep: 'all' });

  // ---- logic and information ------------------------------------------------------------------------------------------
  def('TRUE', () => true); def('FALSE', () => false);
  def('IF', (t, cx) => {
    const c = val(cx, t[0]());
    if (c instanceof Arr) { const a = t[1] ? val(cx, t[1]()) : true, b = t[2] ? val(cx, t[2]()) : false; return lift([c, a, b], (x, y, z) => { const t2 = toBool(x); return isErr(t2) ? t2 : t2 ? y : z; }); }
    if (isErr(c)) return c;
    const b = toBool(c);
    if (isErr(b)) return b;
    return val(cx, b ? (t[1] ? t[1]() : true) : (t[2] ? t[2]() : false));
  }, { lazy: true });
  def('IFS', (t, cx) => { for (let i = 0; i + 1 < t.length; i += 2) { const c = toBool(scalar(val(cx, t[i]()))); if (isErr(c)) return c; if (c) return val(cx, t[i + 1]()); } return NA(); }, { lazy: true });
  def('IFERROR', (t, cx) => { const v = val(cx, t[0]()); if (v instanceof Arr) { const fb = val(cx, t[1]()); return lift([v, fb], (x, y) => (isErr(x) ? y : x)); } return isErr(v) ? val(cx, t[1]()) : v; }, { lazy: true });
  def('IFNA', (t, cx) => { const v = val(cx, t[0]()); if (v instanceof Arr) { const fb = val(cx, t[1]()); return lift([v, fb], (x, y) => (isErr(x) && x.err === '#N/A' ? y : x)); } return isErr(v) && v.err === '#N/A' ? val(cx, t[1]()) : v; }, { lazy: true });
  def('SWITCH', (t, cx) => { const x = scalar(val(cx, t[0]())); let i = 1; for (; i + 1 < t.length; i += 2) { if (cmp(x, scalar(val(cx, t[i]()))) === 0) return val(cx, t[i + 1]()); } return i < t.length ? val(cx, t[i]()) : NA(); }, { lazy: true });
  def('CHOOSE', (a) => { const i = toNum(a[0]); return isErr(i) || i < 1 || i >= a.length ? VALUE() : a[Math.floor(i)]; }, { keep: 'all' });
  def('LET', (t, cx, node) => {
    const scope = new Map(cx.scope || []);
    const inner = Object.assign({}, cx, { scope });
    const args = node.args;
    for (let i = 0; i + 1 < args.length; i += 2) {
      if (!args[i] || args[i].k !== 'name') return E('#NAME?');
      scope.set(args[i].n.toUpperCase(), val(inner, XL.evaluate(args[i + 1], inner)));
    }
    return val(inner, XL.evaluate(args[args.length - 1], inner));
  }, { lazy: true });
  def('AND', (a) => { const v = flat(mk([[].concat(...a.map((x) => flat(x)))])).filter((x) => x !== null && typeof x !== 'string'); if (v.some(isErr)) return v.find(isErr); return v.length ? v.every((x) => toBool(x) === true) : VALUE(); }, { keep: 'all' });
  def('OR', (a) => { const v = [].concat(...a.map((x) => flat(x))).filter((x) => x !== null && typeof x !== 'string'); if (v.some(isErr)) return v.find(isErr); return v.length ? v.some((x) => toBool(x) === true) : VALUE(); }, { keep: 'all' });
  def('XOR', (a) => [].concat(...a.map((x) => flat(x))).filter((x) => x !== null).reduce((s, x) => s !== (toBool(x) === true), false), { keep: 'all' });
  def('NOT', ([x]) => { const b = toBool(x); return isErr(b) ? b : !b; });
  def('ISBLANK', ([x]) => x === null); def('ISNUMBER', ([x]) => typeof x === 'number'); def('ISTEXT', ([x]) => typeof x === 'string');
  def('ISLOGICAL', ([x]) => typeof x === 'boolean'); def('ISERROR', ([x]) => isErr(x)); def('ISERR', ([x]) => isErr(x) && x.err !== '#N/A');
  def('ISNA', ([x]) => isErr(x) && x.err === '#N/A'); def('NA', () => NA());
  def('ISEVEN', ([x]) => { const n = toNum(x); return isErr(n) ? n : Math.floor(Math.abs(n)) % 2 === 0; });
  def('ISODD', ([x]) => { const n = toNum(x); return isErr(n) ? n : Math.floor(Math.abs(n)) % 2 === 1; });
  def('N', ([x]) => (typeof x === 'number' ? x : x === true ? 1 : 0));

  // ---- text ---------------------------------------------------------------------------------------------------------------
  const S = (f) => (a) => { const e = firstErr(a); return e || f(a.map((x) => x)); };
  def('LEN', ([x]) => toStr(x).length);
  def('UPPER', ([x]) => toStr(x).toUpperCase()); def('LOWER', ([x]) => toStr(x).toLowerCase());
  def('PROPER', ([x]) => toStr(x).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, a, b) => a + b.toUpperCase()));
  def('TRIM', ([x]) => toStr(x).trim().replace(/ {2,}/g, ' '));
  def('CLEAN', ([x]) => toStr(x).replace(/[\x00-\x1f]/g, ''));
  def('LEFT', ([x, n]) => { const k = n === undefined || n === null ? 1 : toNum(n); return isErr(k) || k < 0 ? VALUE() : toStr(x).slice(0, k); });
  def('RIGHT', ([x, n]) => { const k = n === undefined || n === null ? 1 : toNum(n); const s = toStr(x); return isErr(k) || k < 0 ? VALUE() : k === 0 ? '' : s.slice(-k); });
  def('MID', ([x, st, n]) => { const a = toNum(st), k = toNum(n); return isErr(a) || isErr(k) || a < 1 || k < 0 ? VALUE() : toStr(x).substr(a - 1, k); });
  def('CONCATENATE', (a) => a.map(toStr).join(''), { keep: 'all' });
  def('CONCAT', (a) => [].concat(...a.map((x) => flat(x))).map(toStr).join(''), { keep: 'all' });
  def('TEXTJOIN', ([d, ig, ...rest]) => { const items = [].concat(...rest.map((x) => flat(x))); const e = firstErr(items); if (e) return e; const skip = toBool(ig) === true; return items.filter((x) => !(skip && (x === null || x === ''))).map(toStr).join(toStr(d)); }, { keep: 'all' });
  def('REPT', ([x, n]) => { const k = toNum(n); return isErr(k) || k < 0 ? VALUE() : toStr(x).repeat(k); });
  def('EXACT', ([a, b]) => toStr(a) === toStr(b));
  def('CHAR', ([x]) => String.fromCharCode(toNum(x))); def('CODE', ([x]) => toStr(x).charCodeAt(0));
  def('SUBSTITUTE', ([t, o, n, k]) => { const s = toStr(t), old = toStr(o), nw = toStr(n); if (!old) return s; if (k === undefined || k === null) return s.split(old).join(nw); let c = 0; const inst = toNum(k); return s.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (m) => (++c === inst ? nw : m)); });
  def('REPLACE', ([t, st, n, nw]) => { const s = toStr(t), a = toNum(st) - 1, k = toNum(n); return s.slice(0, a) + toStr(nw) + s.slice(a + k); });
  def('FIND', ([f, t, st]) => { const i = toStr(t).indexOf(toStr(f), st === undefined || st === null ? 0 : toNum(st) - 1); return i < 0 ? VALUE() : i + 1; });
  def('SEARCH', ([f, t, st]) => { const s = toStr(t), from = st === undefined || st === null ? 0 : toNum(st) - 1; const m = wild(toStr(f)).source.replace(/^\^|\$$/g, ''); const re = new RegExp(m, 'i'); const r = re.exec(s.slice(from)); return r ? r.index + from + 1 : VALUE(); });
  def('VALUE', ([x]) => { const n = toNum(x); return n; });
  def('TEXT', ([v, f]) => { const n = typeof v === 'number' ? v : toNum(v); return typeof n === 'number' ? formatValue(n, toStr(f)) : toStr(v); });
  def('TEXTBEFORE', ([t, d, k]) => { const s = toStr(t), dl = toStr(d); const n = k === undefined || k === null ? 1 : toNum(k); let idx = -1; for (let i = 0; i < n; i++) { idx = s.indexOf(dl, idx + 1); if (idx < 0) return NA(); } return s.slice(0, idx); });
  def('TEXTAFTER', ([t, d, k]) => { const s = toStr(t), dl = toStr(d); const n = k === undefined || k === null ? 1 : toNum(k); let idx = -1; for (let i = 0; i < n; i++) { idx = s.indexOf(dl, idx + 1); if (idx < 0) return NA(); } return s.slice(idx + dl.length); });
  def('TEXTSPLIT', ([t, cd, rd]) => { const rows = rd === undefined || rd === null ? [toStr(t)] : toStr(t).split(toStr(rd)); return mk(rows.map((r) => (cd === undefined || cd === null ? [r] : r.split(toStr(cd))))); }, { keep: 'all' });

  // ---- dates --------------------------------------------------------------------------------------------------------------------
  def('DATE', ([y, m, d]) => { const Y = toNum(y), M = toNum(m), D = toNum(d); if (isErr(Y) || isErr(M) || isErr(D)) return VALUE(); return Math.round((Date.UTC(Y < 1900 ? Y + 1900 : Y, M - 1, D) - Date.UTC(1899, 11, 30)) / 86400000); });
  const dparts = (x) => { const n = toNum(x); return isErr(n) ? n : fromSerial(n); };
  def('YEAR', ([x]) => { const d = dparts(x); return isErr(d) ? d : d.getUTCFullYear(); });
  def('MONTH', ([x]) => { const d = dparts(x); return isErr(d) ? d : d.getUTCMonth() + 1; });
  def('DAY', ([x]) => { const d = dparts(x); return isErr(d) ? d : d.getUTCDate(); });
  def('HOUR', ([x]) => { const n = toNum(x); return Math.floor(Math.round((n - Math.floor(n)) * 86400) / 3600); });
  def('MINUTE', ([x]) => { const n = toNum(x); return Math.floor((Math.round((n - Math.floor(n)) * 86400) % 3600) / 60); });
  def('TIME', ([h, m, s]) => (toNum(h) * 3600 + toNum(m) * 60 + toNum(s)) / 86400);
  def('WEEKDAY', ([x, t]) => { const d = dparts(x); if (isErr(d)) return d; const w = d.getUTCDay(); const ty = t === undefined || t === null ? 1 : toNum(t); return ty === 2 ? (w + 6) % 7 + 1 : ty === 3 ? (w + 6) % 7 : w + 1; });
  def('WEEKNUM', ([x]) => { const d = dparts(x); if (isErr(d)) return d; const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1); const day = Math.floor((d.getTime() - jan1) / 86400000); return Math.floor((day + new Date(jan1).getUTCDay()) / 7) + 1; });
  def('EOMONTH', ([x, m]) => { const d = dparts(x); if (isErr(d)) return d; return serial(d.getUTCFullYear(), d.getUTCMonth() + 1 + toNum(m) + 1, 0); });
  def('EDATE', ([x, m]) => { const d = dparts(x); if (isErr(d)) return d; const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + toNum(m), 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); return serial(t.getUTCFullYear(), t.getUTCMonth() + 1, Math.min(d.getUTCDate(), last)); });
  def('DAYS', ([e, s]) => toNum(e) - toNum(s));
  def('DATEVALUE', ([x]) => toNum(x));
  def('TODAY', () => { const n = new Date(); return serial(n.getFullYear(), n.getMonth() + 1, n.getDate()); });
  def('NOW', () => { const n = new Date(); return serial(n.getFullYear(), n.getMonth() + 1, n.getDate()) + (n.getHours() * 3600 + n.getMinutes() * 60) / 86400; });
  def('DATEDIF', ([s, e, u]) => {
    const a = dparts(s), b = dparts(e); if (isErr(a)) return a; if (isErr(b)) return b; if (a > b) return NUM();
    const unit = toStr(u).toUpperCase();
    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (b.getUTCDate() < a.getUTCDate()) months--;
    if (unit === 'Y') return Math.floor(months / 12);
    if (unit === 'M') return months;
    if (unit === 'D') return Math.round((b - a) / 86400000);
    if (unit === 'YM') return months % 12;
    if (unit === 'MD') { let d = b.getUTCDate() - a.getUTCDate(); if (d < 0) d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); return d; }
    if (unit === 'YD') { const y = new Date(Date.UTC(b.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())); const t = y > b ? new Date(Date.UTC(b.getUTCFullYear() - 1, a.getUTCMonth(), a.getUTCDate())) : y; return Math.round((b - t) / 86400000); }
    return NUM();
  });
  const holidaySet = (h) => new Set(flat(h || mk([[]])).filter((x) => typeof x === 'number'));
  def('NETWORKDAYS', ([s, e, h]) => { let a = toNum(s), b = toNum(e); if (isErr(a) || isErr(b)) return VALUE(); const hol = holidaySet(h); const sign = a > b ? -1 : 1; if (a > b) [a, b] = [b, a]; let c = 0; for (let d = Math.floor(a); d <= Math.floor(b); d++) { const w = fromSerial(d).getUTCDay(); if (w !== 0 && w !== 6 && !hol.has(d)) c++; } return sign * c; }, { keep: [2] });
  def('WORKDAY', ([s, n, h]) => { let d = Math.floor(toNum(s)); let k = toNum(n); const hol = holidaySet(h); const step = k < 0 ? -1 : 1; k = Math.abs(k); while (k > 0) { d += step; const w = fromSerial(d).getUTCDay(); if (w !== 0 && w !== 6 && !hol.has(d)) k--; } return d; }, { keep: [2] });

  // ---- finance ---------------------------------------------------------------------------------------------------------------------
  const opt = (x, d) => (x === undefined || x === null ? d : toNum(x));
  const PMT = (r, n, pv, fv, t) => (r === 0 ? -(pv + fv) / n : -(r * (pv * Math.pow(1 + r, n) + fv)) / ((1 + r * t) * (Math.pow(1 + r, n) - 1)));
  def('PMT', ([r, n, pv, fv, t]) => PMT(toNum(r), toNum(n), toNum(pv), opt(fv, 0), opt(t, 0)));
  def('FV', ([r, n, p, pv, t]) => { const R = toNum(r), N = toNum(n), P = toNum(p), PV = opt(pv, 0), T = opt(t, 0); return R === 0 ? -(PV + P * N) : -(PV * Math.pow(1 + R, N) + P * (1 + R * T) * (Math.pow(1 + R, N) - 1) / R); });
  def('PV', ([r, n, p, fv, t]) => { const R = toNum(r), N = toNum(n), P = toNum(p), FV = opt(fv, 0), T = opt(t, 0); return R === 0 ? -(FV + P * N) : -(FV + P * (1 + R * T) * (Math.pow(1 + R, N) - 1) / R) / Math.pow(1 + R, N); });
  def('NPER', ([r, p, pv, fv, t]) => { const R = toNum(r), P = toNum(p), PV = toNum(pv), FV = opt(fv, 0), T = opt(t, 0); return R === 0 ? -(PV + FV) / P : Math.log((P * (1 + R * T) - FV * R) / (P * (1 + R * T) + PV * R)) / Math.log(1 + R); });
  def('NPV', ([r, ...rest]) => { const R = toNum(r); const v = numsOnly([].concat(...rest.map((x) => flat(x)))); return v.reduce((s, x, i) => s + x / Math.pow(1 + R, i + 1), 0); }, { keep: 'all' });
  def('IRR', ([a, g]) => { const v = numsOnly(flat(a)); let r = opt(g, 0.1); for (let i = 0; i < 100; i++) { let f = 0, d = 0; v.forEach((x, k) => { f += x / Math.pow(1 + r, k); d -= k * x / Math.pow(1 + r, k + 1); }); if (!d) break; const nr = r - f / d; if (Math.abs(nr - r) < 1e-10) return nr; r = nr; } return NUM(); }, { keep: [0] });
  def('IPMT', ([r, per, n, pv]) => { const R = toNum(r), P = toNum(per), N = toNum(n), PV = toNum(pv); const pmt = PMT(R, N, PV, 0, 0); let bal = PV; for (let k = 1; k < P; k++) bal = bal * (1 + R) + pmt; return -(bal * R); });
  def('PPMT', ([r, per, n, pv]) => { const R = toNum(r), P = toNum(per), N = toNum(n), PV = toNum(pv); const pmt = PMT(R, N, PV, 0, 0); let bal = PV; for (let k = 1; k < P; k++) bal = bal * (1 + R) + pmt; return pmt + bal * R; });

  // ---- lookup and array functions ----------------------------------------------------------------------------------------------------------
  const isVec = (a) => a.h === 1 || a.w === 1;
  const vec = (a) => flat(a);
  function matchPos(x, list, mode) {
    // mode 0 exact (wildcards for text), 1 largest <= x (sorted asc), -1 smallest >= x (sorted desc)
    if (mode === 0) {
      const re = typeof x === 'string' && /[*?]/.test(x) ? wild(x) : null;
      return list.findIndex((v) => (re ? typeof v === 'string' && re.test(v) : x !== null && v !== null && !isErr(v) && cmp(v, x) === 0 && typeof v === typeof x));
    }
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (v === null || typeof v !== typeof x) continue;
      const c = cmp(v, x);
      if (mode === 1 ? c <= 0 : c >= 0) { if (best < 0 || (mode === 1 ? cmp(v, list[best]) >= 0 : cmp(v, list[best]) <= 0)) best = i; }
    }
    return best;
  }
  def('MATCH', ([x, a, t]) => { if (isErr(x)) return x; const list = vec(a); const mode = t === undefined || t === null ? 1 : Math.sign(toNum(t)); const i = matchPos(x, list, mode); return i < 0 ? NA() : i + 1; }, { keep: [1] });
  def('XMATCH', ([x, a, m, s]) => { const list = vec(a); const mm = opt(m, 0); let i; if (opt(s, 1) === -1) { const rev = list.slice().reverse(); const k = matchPos(x, rev, mm === 0 ? 0 : mm); i = k < 0 ? -1 : list.length - 1 - k; } else i = matchPos(x, list, mm === 0 ? 0 : mm); return i < 0 ? NA() : i + 1; }, { keep: [1] });
  def('VLOOKUP', ([x, t, c, ap]) => { if (isErr(x)) return x; const col = toNum(c); if (!(t instanceof Arr) || col < 1 || col > t.w) return col < 1 ? VALUE() : E('#REF!'); const approx = ap === undefined || ap === null ? true : toBool(ap) !== false; const keys = t.rows.map((r) => r[0]); const i = matchPos(x, keys, approx ? 1 : 0); return i < 0 ? NA() : t.rows[i][col - 1]; }, { keep: [1] });
  def('HLOOKUP', ([x, t, r, ap]) => { if (isErr(x)) return x; const row = toNum(r); if (!(t instanceof Arr) || row < 1 || row > t.h) return E('#REF!'); const approx = ap === undefined || ap === null ? true : toBool(ap) !== false; const i = matchPos(x, t.rows[0], approx ? 1 : 0); return i < 0 ? NA() : t.rows[row - 1][i]; }, { keep: [1] });
  def('LOOKUP', ([x, lv, rv]) => { const list = vec(lv); const i = matchPos(x, list, 1); if (i < 0) return NA(); return rv instanceof Arr ? vec(rv)[i] : list[i]; }, { keep: [1, 2] });
  def('XLOOKUP', ([x, la, ra, nf, mm, sm]) => {
    if (isErr(x)) return x;
    if (!(la instanceof Arr)) la = mk([[la]]);
    const list = vec(la); const mode = opt(mm, 0);
    let i;
    if (opt(sm, 1) === -1) { const k = matchPos(x, list.slice().reverse(), 0); i = k < 0 ? -1 : list.length - 1 - k; }
    else if (mode === 0 || mode === 2) i = matchPos(x, list, 0);
    else { i = matchPos(x, list, 0); if (i < 0) i = matchPos(x, list, mode === 1 ? -1 : 1); }
    if (i < 0) return nf === undefined || nf === null ? NA() : nf;
    if (!(ra instanceof Arr)) return ra;
    return la.w === 1 || la.h !== 1 ? (ra.w === 1 ? ra.rows[i][0] : mk([ra.rows[i]])) : (ra.h === 1 ? ra.rows[0][i] : mk(ra.rows.map((r) => [r[i]])));
  }, { keep: [1, 2] });
  def('INDEX', ([a, r, c]) => {
    if (!(a instanceof Arr)) return a;
    let ri = r === undefined || r === null ? 0 : toNum(r), ci = c === undefined || c === null ? 0 : toNum(c);
    if (isErr(ri)) return ri; if (isErr(ci)) return ci;
    if (a.h === 1 && (c === undefined || c === null) && ri > 0) { ci = ri; ri = 1; } else if (a.w === 1 && (c === undefined || c === null) && ri > 0) { ci = 1; }
    if (ri > a.h || ci > a.w || ri < 0 || ci < 0) return E('#REF!');
    if (ri === 0 && ci === 0) return a;
    if (ri === 0) return mk(a.rows.map((row) => [row[ci - 1]]));
    if (ci === 0) return mk([a.rows[ri - 1]]);
    return a.rows[ri - 1][ci - 1];
  }, { keep: [0] });
  def('TRANSPOSE', ([a]) => (a instanceof Arr ? mk(a.rows[0].map((_, j) => a.rows.map((r) => r[j]))) : a), { keep: 'all' });
  def('SEQUENCE', ([r, c, s, st]) => { const R = toNum(r), C = opt(c, 1), S0 = opt(s, 1), ST = opt(st, 1); const rows = []; let k = S0; for (let i = 0; i < R; i++) { const row = []; for (let j = 0; j < C; j++) { row.push(k); k += ST; } rows.push(row); } return mk(rows); });
  def('FILTER', ([a, inc, ifEmpty]) => {
    if (!(a instanceof Arr)) return a;
    const flags = flat(inc);
    const byRow = inc instanceof Arr ? inc.w === 1 || inc.h > 1 : true;
    const keep = [];
    if (byRow) { a.rows.forEach((row, i) => { const f = toBool(flags[i]); if (isErr(f)) { keep.push(f); } else if (f) keep.push(row); }); }
    else { const cols = a.rows[0].map((_, j) => j).filter((j) => toBool(flags[j]) === true); if (cols.length) return mk(a.rows.map((r) => cols.map((j) => r[j]))); }
    const e = keep.find(isErr); if (e) return e;
    if (!keep.length) return ifEmpty === undefined || ifEmpty === null ? E('#CALC!') : ifEmpty;
    return mk(keep);
  }, { keep: 'all' });
  def('UNIQUE', ([a, byCol, once]) => {
    if (!(a instanceof Arr)) return a;
    const rows = toBool(byCol) === true ? a.rows[0].map((_, j) => a.rows.map((r) => r[j])) : a.rows;
    const seen = new Map();
    rows.forEach((r, i) => { const k = JSON.stringify(r.map((v) => (typeof v === 'string' ? v.toLowerCase() : v))); const e = seen.get(k); if (e) e.n++; else seen.set(k, { n: 1, row: r }); });
    let out = [...seen.values()]; if (toBool(once) === true) out = out.filter((e) => e.n === 1);
    if (!out.length) return E('#CALC!');
    const res = out.map((e) => e.row.map((v) => (v === null ? 0 : v))); // Excel shows an empty cell in a spilled result as 0
    return mk(toBool(byCol) === true ? res[0].map((_, j) => res.map((r) => r[j])) : res);
  }, { keep: 'all' });
  const sortRows = (rows, keys) => rows.map((r, i) => ({ r, i })).sort((p, q) => { for (const k of keys) { const c = cmp(p.r[k.col], q.r[k.col]) * k.dir; if (c) return c; } return p.i - q.i; }).map((x) => x.r);
  def('SORT', ([a, idx, ord, byCol]) => { if (!(a instanceof Arr)) return a; const col = opt(idx, 1) - 1, dir = opt(ord, 1); if (toBool(byCol) === true) { const t = a.rows[0].map((_, j) => a.rows.map((r) => r[j])); const s = sortRows(t, [{ col, dir }]); return mk(s[0].map((_, j) => s.map((r) => r[j]))); } return mk(sortRows(a.rows, [{ col, dir }])); }, { keep: 'all' });
  def('SORTBY', (args) => { const a = args[0]; if (!(a instanceof Arr)) return a; const keys = []; const cols = a.rows.map((r) => r.slice()); const by = []; for (let i = 1; i < args.length; i += 2) { by.push({ v: flat(args[i]), dir: i + 1 < args.length ? opt(args[i + 1], 1) : 1 }); } const idx = a.rows.map((_, i) => i).sort((p, q) => { for (const b of by) { const c = cmp(b.v[p], b.v[q]) * b.dir; if (c) return c; } return p - q; }); void keys; return mk(idx.map((i) => cols[i])); }, { keep: 'all' });
  def('TAKE', ([a, n]) => { const k = toNum(n); return mk(k >= 0 ? a.rows.slice(0, k) : a.rows.slice(k)); }, { keep: 'all' });
  def('HSTACK', (a) => { const H = Math.max(...a.map((x) => (x instanceof Arr ? x.h : 1))); return mk(Array.from({ length: H }, (_, i) => [].concat(...a.map((x) => (x instanceof Arr ? (x.rows[i] || Array(x.w).fill(NA())) : [i === 0 ? x : NA()]))))); }, { keep: 'all' });
  def('VSTACK', (a) => mk([].concat(...a.map((x) => (x instanceof Arr ? x.rows : [[x]])))), { keep: 'all' });
  def('CHOOSECOLS', ([a, ...cs]) => mk(a.rows.map((r) => cs.map((c) => r[toNum(c) - 1]))), { keep: 'all' });
})(typeof window !== 'undefined' ? window : globalThis);

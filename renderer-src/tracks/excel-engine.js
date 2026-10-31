/* Dojo Excel: formula engine (values, number formats, parser, evaluator, functions).
   Pure JS with no dependencies, so the same file runs in the page and in the Node verifier. */
(function (root) {
  'use strict';
  const XL = root.DojoXL = root.DojoXL || {};

  // ---- values ---------------------------------------------------------------------------------------
  class Arr { constructor(rows) { this.rows = rows; } get h() { return this.rows.length; } get w() { return this.rows[0].length; } }
  class Ref { constructor(sheet, r1, c1, r2, c2, whole) { this.sheet = sheet; this.r1 = r1; this.c1 = c1; this.r2 = r2; this.c2 = c2; this.whole = whole; } }
  const E = (n) => ({ err: n });
  const isErr = (v) => v !== null && typeof v === 'object' && !(v instanceof Arr) && !(v instanceof Ref) && 'err' in v;
  const ERRORS = ['#N/A', '#VALUE!', '#REF!', '#DIV/0!', '#NUM!', '#NAME?', '#NULL!', '#SPILL!', '#CALC!'];
  Object.assign(XL, { Arr, Ref, E, isErr });

  // ---- addresses --------------------------------------------------------------------------------------
  const colName = (c) => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const colIndex = (s) => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const addr = (r, c) => colName(c) + (r + 1);
  const parseAddr = (a) => { const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(a.trim()); return m ? { r: +m[4] - 1, c: colIndex(m[2]), ac: !!m[1], ar: !!m[3] } : null; };
  const parseRange = (s) => {
    const t = s.replace(/^.*!/, '').replace(/\$/g, '');
    const [a, b] = t.split(':');
    const p = parseAddr(a); const q = b ? parseAddr(b) : p;
    if (!p || !q) return null;
    return { r1: Math.min(p.r, q.r), c1: Math.min(p.c, q.c), r2: Math.max(p.r, q.r), c2: Math.max(p.c, q.c) };
  };
  const rangeStr = (g) => (g.r1 === g.r2 && g.c1 === g.c2 ? addr(g.r1, g.c1) : addr(g.r1, g.c1) + ':' + addr(g.r2, g.c2));
  Object.assign(XL, { colName, colIndex, addr, parseAddr, parseRange, rangeStr });

  // ---- dates --------------------------------------------------------------------------------------------
  const EPOCH = Date.UTC(1899, 11, 30);
  const serial = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000);
  const fromSerial = (s) => new Date(EPOCH + Math.floor(s) * 86400000);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  Object.assign(XL, { serial, fromSerial });

  // ---- coercion --------------------------------------------------------------------------------------------
  const NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
  function toNum(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      const t = v.trim().replace(/,/g, '');
      if (NUM_RE.test(t)) return Number(t);
      if (/^[-+]?(\d+\.?\d*|\.\d+)%$/.test(t)) return Number(t.slice(0, -1)) / 100;
      const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
      if (d) return serial(+d[1], +d[2], +d[3]);
      return E('#VALUE!');
    }
    return v;
  }
  const general = (v) => {
    if (Number.isInteger(v) && Math.abs(v) < 1e11) return String(v);
    if (v !== 0 && (Math.abs(v) >= 1e11 || Math.abs(v) < 1e-9)) return v.toExponential(5).replace(/\.?0+e/, 'E').replace('e', 'E');
    return String(parseFloat(v.toPrecision(11)));
  };
  function toStr(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return general(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return v;
    if (isErr(v)) return v.err;
    return String(v);
  }
  function toBool(v) {
    if (typeof v === 'boolean') return v;
    if (v === null) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') { const u = v.toUpperCase(); if (u === 'TRUE') return true; if (u === 'FALSE') return false; return E('#VALUE!'); }
    return v;
  }
  const rank = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
  function cmp(a, b) {
    if (a === null && b === null) return 0;
    if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
    if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra < rb ? -1 : 1;
    if (typeof a === 'string') { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    return a < b ? -1 : a > b ? 1 : 0;
  }
  Object.assign(XL, { toNum, toStr, toBool, cmp });

  // ---- number formats -----------------------------------------------------------------------------------------
  function roundTo(x, d) { return Number(Math.round(Number(Math.abs(x) + 'e' + d)) + 'e-' + d) * (x < 0 ? -1 : 1); }
  function splitSections(code) { const out = []; let cur = '', q = false; for (const ch of code) { if (ch === '"') q = !q; if (ch === ';' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
  const isDateCode = (s) => /[ymdhs]/i.test(s.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')) && !/[0#?]/.test(s.replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''));
  function fmtDate(v, code) {
    const toks = code.match(/\[[^\]]*\]|"[^"]*"|\\.|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM|A\/P|./gi) || [];
    const d = fromSerial(v), frac = v - Math.floor(v);
    const secs = Math.round(frac * 86400);
    const H = Math.floor(secs / 3600), M = Math.floor((secs % 3600) / 60), S = secs % 60;
    const ampm = toks.some((t) => /^(AM\/PM|A\/P)$/i.test(t));
    const kinds = toks.map((t) => t.toLowerCase());
    return toks.map((t, i) => {
      const k = kinds[i];
      const pad = (n, w = 2) => String(n).padStart(w, '0');
      if (/^\[|^"/.test(t)) return t.replace(/^\[.*\]$/, '').replace(/^"|"$/g, '');
      if (t[0] === '\\') return t.slice(1);
      if (k === 'yyyy') return String(d.getUTCFullYear());
      if (k === 'yy') return pad(d.getUTCFullYear() % 100);
      if (k === 'mmmm') return MONTHS[d.getUTCMonth()];
      if (k === 'mmm') return MONTHS[d.getUTCMonth()].slice(0, 3);
      if (k === 'mm' || k === 'm') {
        let isMin = false;
        for (let j = i - 1; j >= 0; j--) { if (/^(h|hh)$/.test(kinds[j])) { isMin = true; break; } if (/^(yyyy|yy|d|dd|ddd|dddd|mmm|mmmm)$/.test(kinds[j])) break; }
        for (let j = i + 1; j < toks.length && !isMin; j++) { if (/^(s|ss)$/.test(kinds[j])) { isMin = true; break; } if (/^(yyyy|yy|d|dd|ddd|dddd|h|hh)$/.test(kinds[j])) break; }
        const n = isMin ? M : d.getUTCMonth() + 1;
        return k === 'mm' ? pad(n) : String(n);
      }
      if (k === 'dddd') return DAYS[d.getUTCDay()];
      if (k === 'ddd') return DAYS[d.getUTCDay()].slice(0, 3);
      if (k === 'dd') return pad(d.getUTCDate());
      if (k === 'd') return String(d.getUTCDate());
      if (k === 'hh' || k === 'h') { const h = ampm ? (H % 12 || 12) : H; return k === 'hh' ? pad(h) : String(h); }
      if (k === 'ss') return pad(S);
      if (k === 's') return String(S);
      if (k === 'am/pm') return H < 12 ? 'AM' : 'PM';
      if (k === 'a/p') return H < 12 ? 'A' : 'P';
      return t;
    }).join('');
  }
  function fmtNumber(v, section, neg) {
    const lits = [];
    let pat = '', pct = 0;
    let q = false;
    // Pull literals out so only the digit pattern remains.
    const s = section.replace(/\[\$([^\]\-]*)[^\]]*\]/g, (_, cur) => '"' + cur + '"').replace(/\[[^\]]*\]/g, '').replace(/_./g, ' ').replace(/\*./g, '');
    let out = ''; let started = false, ended = false, pre = '', post = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') { const j = s.indexOf('"', i + 1); const lit = s.slice(i + 1, j < 0 ? s.length : j); i = j < 0 ? s.length : j; if (started) { if (/[0#?.,]/.test(pat.slice(-1)) || !ended) { post += lit; ended = true; } else post += lit; } else pre += lit; continue; }
      if (ch === '\\') { const lit = s[++i] || ''; if (started) post += lit; else pre += lit; continue; }
      if (/[0#?,.]/.test(ch) && !ended) { started = true; pat += ch; continue; }
      if (ch === '%') { pct++; if (started) post += '%'; else pre += '%'; continue; }
      if (ch === 'E' || ch === 'e') { post += ch; continue; }
      if (started) { ended = true; post += ch; } else pre += ch;
    }
    let x = Math.abs(v) * Math.pow(100, pct);
    const dot = pat.indexOf('.');
    const ip = dot < 0 ? pat : pat.slice(0, dot), fp = dot < 0 ? '' : pat.slice(dot + 1);
    const dec = (fp.match(/[0#?]/g) || []).length;
    const minDec = (fp.match(/0/g) || []).length;
    const thousands = ip.includes(',');
    const minInt = (ip.match(/0/g) || []).length;
    let fixed = roundTo(x, dec).toFixed(dec);
    let [ints, fr = ''] = fixed.split('.');
    while (fr.length > minDec && fr.endsWith('0')) fr = fr.slice(0, -1);
    if (ints === '0' && minInt === 0 && (ip.replace(/,/g, '').length > 0 || dec > 0) && !fr.length) ints = ip.length ? '' : '0';
    else if (ints === '0' && minInt === 0 && ip.replace(/,/g, '').length > 0) ints = '';
    if (ints.length < minInt) ints = ints.padStart(minInt, '0');
    if (thousands) ints = ints.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    out = ints + (fr.length ? '.' + fr : (dot >= 0 && minDec === 0 && fp.length && false ? '.' : ''));
    if (!pat) out = '';
    const body = pre + out + post;
    return (neg && Number(fixed) !== 0 ? '-' : '') + body;
  }
  function formatValue(v, code) {
    if (v === null || v === undefined) return '';
    if (isErr(v)) return v.err;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return v;
    if (typeof v !== 'number') return String(v);
    if (!code || code === 'General') return general(v);
    if (code === '@') return general(v);
    const secs = splitSections(code);
    let sec = secs[0], neg = v < 0;
    if (secs.length >= 2 && v < 0) { sec = secs[1]; neg = false; }
    if (secs.length >= 3 && v === 0) sec = secs[2];
    if (isDateCode(sec)) return fmtDate(v, sec);
    return fmtNumber(v, sec, neg);
  }
  Object.assign(XL, { formatValue });

  // ---- input parsing -----------------------------------------------------------------------------------------
  /** Turns what a person types into { raw, fmt? }: formulas stay as text, everything else becomes a typed value. */
  function parseInput(text) {
    if (typeof text !== 'string') return { raw: text };
    if (text.startsWith('=') && text.length > 1) return { raw: text };
    if (text.startsWith("'")) return { raw: text.slice(1) };
    const t = text.trim();
    if (t === '') return { raw: null };
    const up = t.toUpperCase();
    if (up === 'TRUE') return { raw: true };
    if (up === 'FALSE') return { raw: false };
    if (NUM_RE.test(t)) return { raw: Number(t) };
    let m;
    if ((m = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.exec(t))) return { raw: Number(t.replace(/,/g, '')), fmt: '#,##0' + (m[2] ? '.' + '0'.repeat(m[2].length - 1) : '') };
    if ((m = /^([-+]?\d+(?:\.(\d+))?)%$/.exec(t))) return { raw: Number(m[1]) / 100, fmt: m[2] ? '0.' + '0'.repeat(m[2].length) + '%' : '0%' };
    if ((m = /^(-?)([$₹€£])\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?$/.exec(t))) return { raw: (m[1] ? -1 : 1) * Number((m[3] + (m[4] || '')).replace(/,/g, '')), fmt: m[2] + '#,##0' + (m[4] ? '.' + '0'.repeat(m[4].length - 1) : '') };
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) return { raw: serial(+m[1], +m[2], +m[3]), fmt: 'yyyy-mm-dd' };
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return { raw: serial(+m[3], +m[1], +m[2]), fmt: 'm/d/yyyy' };
    if ((m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(t))) { const mi = MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === m[2].toLowerCase()); if (mi >= 0) return { raw: serial(+m[3] < 100 ? 2000 + +m[3] : +m[3], mi + 1, +m[1]), fmt: 'd-mmm-yy' }; }
    if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t))) return { raw: (+m[1] * 3600 + +m[2] * 60 + (+m[3] || 0)) / 86400, fmt: 'h:mm' };
    return { raw: text };
  }
  Object.assign(XL, { parseInput });

  // ---- tokenizer and parser -----------------------------------------------------------------------------------
  const CELL_RE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/;
  function tokenize(src) {
    const toks = [];
    let i = 0;
    const n = src.length;
    while (i < n) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      const start = i;
      let m;
      const rest = src.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))) { toks.push({ t: 'num', v: Number(m[0]), s: start, e: start + m[0].length }); i += m[0].length; continue; }
      if (ch === '"') { let j = i + 1, str = ''; while (j < n) { if (src[j] === '"') { if (src[j + 1] === '"') { str += '"'; j += 2; continue; } break; } str += src[j++]; } toks.push({ t: 'str', v: str, s: start, e: j + 1 }); i = j + 1; continue; }
      if (ch === '#') { const e = ERRORS.find((x) => rest.toUpperCase().startsWith(x)); if (e) { toks.push({ t: 'err', v: e, s: start, e: start + e.length }); i += e.length; continue; } }
      // sheet-qualified or plain reference / name / function
      if ((m = /^(?:('(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}|\$?\d+:\$?\d+)(?![A-Za-z0-9_(.])/.exec(rest)) && (m[1] || !/^\d/.test(m[2]) || m[2].includes(':'))) {
        const sheet = m[1] ? m[1].replace(/^'|'$/g, '').replace(/''/g, "'") : null;
        toks.push({ t: 'ref', sheet, ref: m[2], s: start, e: start + m[0].length, refStart: start + (m[1] ? m[1].length + 1 : 0) }); i += m[0].length; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest))) {
        const word = m[0];
        const after = src[i + word.length];
        if (after === '(') { toks.push({ t: 'fn', v: word.toUpperCase(), s: start, e: start + word.length }); i += word.length; continue; }
        toks.push({ t: 'id', v: word, s: start, e: start + word.length }); i += word.length; continue;
      }
      if ((m = /^(<>|<=|>=|[-+*\/^&=<>%(),;{}:])/.exec(rest))) { toks.push({ t: 'op', v: m[0], s: start, e: start + m[0].length }); i += m[0].length; continue; }
      throw new Error('Unexpected character ' + ch);
    }
    return toks;
  }

  function refNode(tk) {
    const r = tk.ref;
    let m;
    const node = { k: 'ref', sheet: tk.sheet };
    if ((m = /^(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})$/.exec(r))) { Object.assign(node, { r1: 0, r2: -1, c1: colIndex(m[2]), c2: colIndex(m[4]), whole: 'col' }); return node; }
    if ((m = /^(\$?)(\d+):(\$?)(\d+)$/.exec(r))) { Object.assign(node, { r1: +m[2] - 1, r2: +m[4] - 1, c1: 0, c2: -1, whole: 'row' }); return node; }
    const [a, b] = r.split(':');
    const p = parseAddr(a), q = b ? parseAddr(b) : p;
    Object.assign(node, { r1: Math.min(p.r, q.r), c1: Math.min(p.c, q.c), r2: Math.max(p.r, q.r), c2: Math.max(p.c, q.c) });
    return node;
  }

  const PREC = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const isOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    const expect = (v) => { if (!isOp(v)) throw new Error('Expected ' + v); p++; };
    function primary() {
      const tk = toks[p++];
      if (!tk) throw new Error('Unexpected end');
      if (tk.t === 'num') return { k: 'num', v: tk.v };
      if (tk.t === 'str') return { k: 'str', v: tk.v };
      if (tk.t === 'err') return { k: 'err', v: tk.v };
      if (tk.t === 'ref') return refNode(tk);
      if (tk.t === 'id') { const u = tk.v.toUpperCase(); if (u === 'TRUE') return { k: 'bool', v: true }; if (u === 'FALSE') return { k: 'bool', v: false }; return { k: 'name', n: tk.v }; }
      if (tk.t === 'fn') {
        expect('(');
        const args = [];
        if (isOp(')')) { p++; return { k: 'fn', n: tk.v, args }; }
        for (;;) {
          if (isOp(',') || isOp(')')) args.push(null); else args.push(expr(1));
          if (isOp(',')) { p++; continue; }
          expect(')'); break;
        }
        return { k: 'fn', n: tk.v, args };
      }
      if (tk.t === 'op' && tk.v === '(') { const e = expr(1); expect(')'); return e; }
      if (tk.t === 'op' && tk.v === '{') {
        const rows = [[]];
        for (;;) {
          rows[rows.length - 1].push(expr(1));
          if (isOp(',')) { p++; continue; }
          if (isOp(';')) { p++; rows.push([]); continue; }
          expect('}'); break;
        }
        return { k: 'arr', rows };
      }
      throw new Error('Unexpected ' + tk.v);
    }
    function unary() {
      if (isOp('-') || isOp('+')) { const op = toks[p++].v; return { k: 'un', op, a: unary() }; }
      let n = primary();
      while (isOp('%')) { p++; n = { k: 'pct', a: n }; }
      return n;
    }
    function expr(min) {
      let left = unary();
      for (;;) {
        const tk = peek();
        if (!tk || tk.t !== 'op' || !(tk.v in PREC) || PREC[tk.v] < min) break;
        p++;
        const right = expr(PREC[tk.v] + 1);
        left = { k: 'bin', op: tk.v, a: left, b: right };
      }
      return left;
    }
    const ast = expr(1);
    if (p < toks.length) throw new Error('Unexpected ' + toks[p].v);
    return ast;
  }

  /** Moves the relative parts of every reference in a formula by (dr, dc), as filling or pasting does. */
  function shiftFormula(f, dr, dc) {
    let toks;
    try { toks = tokenize(f.slice(1)); } catch (e) { return f; }
    let out = '', last = 0;
    const body = f.slice(1);
    for (const tk of toks) {
      if (tk.t !== 'ref') continue;
      out += body.slice(last, tk.refStart);
      const shift = (part) => part.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d+)|(\$?)(\d+)$|(\$?)([A-Za-z]{1,3})$/, (all, a1, col, a2, row, b1, rowOnly, c1, colOnly) => {
        if (col !== undefined) { const c = a1 ? colIndex(col) : colIndex(col) + dc; const r = a2 ? +row - 1 : +row - 1 + dr; return (a1 ? '$' : '') + colName(Math.max(c, 0)) + (a2 ? '$' : '') + (Math.max(r, 0) + 1); }
        if (rowOnly !== undefined) return (b1 ? '$' : '') + (b1 ? +rowOnly : Math.max(+rowOnly + dr, 1));
        return (c1 ? '$' : '') + (c1 ? colOnly : colName(Math.max(colIndex(colOnly) + dc, 0)));
      });
      out += tk.ref.split(':').map(shift).join(':');
      last = tk.e;
    }
    out += body.slice(last);
    return '=' + out;
  }
  Object.assign(XL, { parse, tokenize, shiftFormula });

  // ---- evaluation core -------------------------------------------------------------------------------------------
  const FN = {};
  XL.FN = FN;
  const def = (names, fn, opts) => { (Array.isArray(names) ? names : [names]).forEach((n) => { FN[n] = Object.assign({ fn }, opts || {}); }); };
  XL.def = def;

  function cellValue(cx, sheet, r, c) { return cx.wb._cellValue(sheet, r, c, cx); }
  function refExtent(cx, ref) {
    const sh = ref.sheet;
    const maxR = ref.r2 < 0 ? sh.maxRow : ref.r2;
    const maxC = ref.c2 < 0 ? sh.maxCol : ref.c2;
    return { r1: ref.r1, c1: ref.c1, r2: Math.max(maxR, ref.r1), c2: Math.max(maxC, ref.c1) };
  }
  function derefArr(cx, ref) {
    const g = refExtent(cx, ref);
    const rows = [];
    for (let r = g.r1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(cellValue(cx, ref.sheet, r, c)); rows.push(row); }
    return new Arr(rows);
  }
  function val(cx, x) {
    if (x instanceof Ref) {
      if (x.r1 === x.r2 && x.c1 === x.c2 && !x.whole) return cellValue(cx, x.sheet, x.r1, x.c1);
      const a = derefArr(cx, x);
      return a.h === 1 && a.w === 1 ? a.rows[0][0] : a;
    }
    return x;
  }
  const scalar = (v) => (v instanceof Arr ? v.rows[0][0] : v);
  function shape(a) { return a instanceof Arr ? [a.h, a.w] : [1, 1]; }
  function at(a, i, j) { if (!(a instanceof Arr)) return a; const ii = a.h === 1 ? 0 : i, jj = a.w === 1 ? 0 : j; return ii < a.h && jj < a.w ? a.rows[ii][jj] : E('#N/A'); }
  /** Applies f elementwise, broadcasting scalars and single rows / columns, as Excel does. */
  function lift(args, f) {
    if (!args.some((a) => a instanceof Arr)) return f(...args);
    let h = 1, w = 1;
    args.forEach((a) => { const [x, y] = shape(a); h = Math.max(h, x); w = Math.max(w, y); });
    const rows = [];
    for (let i = 0; i < h; i++) { const row = []; for (let j = 0; j < w; j++) row.push(f(...args.map((a) => at(a, i, j)))); rows.push(row); }
    return new Arr(rows);
  }
  XL.lift = lift;
  function arith(op, a, b) {
    if (isErr(a)) return a; if (isErr(b)) return b;
    const x = toNum(a), y = toNum(b);
    if (isErr(x)) return x; if (isErr(y)) return y;
    switch (op) {
      case '+': return x + y; case '-': return x - y; case '*': return x * y;
      case '/': return y === 0 ? E('#DIV/0!') : x / y;
      case '^': { const r = Math.pow(x, y); return Number.isFinite(r) ? r : E('#NUM!'); }
    }
  }
  function compare(op, a, b) {
    if (isErr(a)) return a; if (isErr(b)) return b;
    const c = cmp(a, b);
    switch (op) { case '=': return c === 0; case '<>': return c !== 0; case '<': return c < 0; case '>': return c > 0; case '<=': return c <= 0; case '>=': return c >= 0; }
  }
  function binop(op, a, b) {
    if (op === '&') return lift([a, b], (x, y) => (isErr(x) ? x : isErr(y) ? y : toStr(x) + toStr(y)));
    if (PREC[op] === 1) return lift([a, b], (x, y) => compare(op, x, y));
    return lift([a, b], (x, y) => arith(op, x, y));
  }

  function evaluate(node, cx) {
    switch (node.k) {
      case 'num': case 'str': case 'bool': return node.v;
      case 'err': return E(node.v);
      case 'ref': {
        const sh = node.sheet ? cx.wb.sheet(node.sheet) : cx.sheet;
        if (!sh) return E('#REF!');
        return new Ref(sh, node.r1, node.c1, node.r2, node.c2, node.whole);
      }
      case 'name': {
        if (cx.scope && cx.scope.has(node.n.toUpperCase())) return cx.scope.get(node.n.toUpperCase());
        const target = cx.wb.names[node.n.toUpperCase()];
        if (!target) return E('#NAME?');
        try { return evaluate(cx.wb._parseCached('=' + target), cx); } catch (e) { return E('#NAME?'); }
      }
      case 'un': { const a = val(cx, evaluate(node.a, cx)); return node.op === '-' ? lift([a], (x) => { if (isErr(x)) return x; const n = toNum(x); return isErr(n) ? n : -n; }) : a; }
      case 'pct': { const a = val(cx, evaluate(node.a, cx)); return lift([a], (x) => { const n = toNum(x); return isErr(n) ? n : n / 100; }); }
      case 'bin': return binop(node.op, val(cx, evaluate(node.a, cx)), val(cx, evaluate(node.b, cx)));
      case 'arr': return new Arr(node.rows.map((r) => r.map((n) => scalar(val(cx, evaluate(n, cx))))));
      case 'fn': return callFn(node, cx);
    }
    return E('#VALUE!');
  }

  function callFn(node, cx) {
    const f = FN[node.n];
    if (!f) return E('#NAME?');
    if (f.lazy) return f.fn(node.args.map((a) => (a ? () => evaluate(a, cx) : () => null)), cx, node);
    const raw = node.args.map((a) => (a ? evaluate(a, cx) : null));
    if (f.refs) return f.fn(raw, cx);
    const args = raw.map((a) => val(cx, a));
    const keep = f.keep;
    const isKept = (i) => keep === 'all' || (Array.isArray(keep) && keep.includes(i)) || (typeof keep === 'function' && keep(i, args.length));
    if (keep === 'all') return f.fn(args, cx);
    // Lift over the arguments that are not kept whole.
    const liftIdx = args.map((a, i) => (a instanceof Arr && !isKept(i) ? i : -1)).filter((i) => i >= 0);
    if (!liftIdx.length) return f.fn(args, cx);
    let h = 1, w = 1;
    liftIdx.forEach((i) => { const [x, y] = shape(args[i]); h = Math.max(h, x); w = Math.max(w, y); });
    const rows = [];
    for (let i = 0; i < h; i++) { const row = []; for (let j = 0; j < w; j++) { const a2 = args.map((a, k) => (liftIdx.includes(k) ? at(a, i, j) : a)); row.push(f.fn(a2, cx)); } rows.push(row); }
    return new Arr(rows);
  }

  Object.assign(XL, { evaluate, val, scalar, derefArr, refExtent, cellValue, binop, at, shape, arith });
})(typeof window !== 'undefined' ? window : globalThis);

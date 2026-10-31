/* Dojo Excel: workbook model and operations (shared by the grid UI, the reference solutions and the grader). */
(function (root) {
  'use strict';
  const XL = root.DojoXL;
  const { Arr, Ref, E, isErr, toNum, toStr, cmp, addr, colName, colIndex, parseAddr, parseRange, rangeStr, parseInput, shiftFormula, formatValue } = XL;
  const KEY = (r, c) => r * 1024 + c;
  const isFormula = (raw) => typeof raw === 'string' && raw.length > 1 && raw[0] === '=';

  class Sheet {
    constructor(wb, name) {
      Object.assign(this, { wb, name, cells: new Map(), colW: {}, userHidden: new Set(), hiddenRows: new Set(), filteredRows: new Set(), filter: null, cf: [], dv: [], charts: [], pivot: null, freeze: { r: 0, c: 0 }, spill: new Map(), spillNew: new Map(), owner: new Map(), ownerNew: new Map(), maxRow: 0, maxCol: 0 });
    }
    get(r, c) { return this.cells.get(KEY(r, c)); }
    ensure(r, c) { let x = this.get(r, c); if (!x) { x = { raw: null, s: null }; this.cells.set(KEY(r, c), x); } return x; }
    _extent() {
      let mr = 0, mc = 0;
      for (const [k, cell] of this.cells) { if (cell.raw !== null && cell.raw !== undefined) { mr = Math.max(mr, Math.floor(k / 1024)); mc = Math.max(mc, k % 1024); } }
      for (const k of this.spill.keys()) { mr = Math.max(mr, Math.floor(k / 1024)); mc = Math.max(mc, k % 1024); }
      this.maxRow = mr; this.maxCol = mc;
    }
    used() { this._extent(); return { r1: 0, c1: 0, r2: this.maxRow, c2: this.maxCol }; }
  }

  class Workbook {
    constructor() { this.sheets = []; this.names = {}; this.gen = 0; this._ast = new Map(); this.nextId = 1; }
    addSheet(name) { const s = new Sheet(this, name || 'Sheet' + (this.sheets.length + 1)); this.sheets.push(s); return s; }
    sheet(name) { if (typeof name !== 'string') return name; const n = name.toLowerCase(); return this.sheets.find((s) => s.name.toLowerCase() === n); }
    _parseCached(raw) {
      let a = this._ast.get(raw);
      if (!a) { try { a = XL.parse(raw.slice(1)); } catch (e) { a = { k: 'err', v: '#NAME?' }; } this._ast.set(raw, a); }
      return a;
    }
    // ---- evaluation -----------------------------------------------------------------------------------------
    _cellValue(sheet, r, c) {
      const cell = sheet.get(r, c);
      if (cell && cell.raw !== null && cell.raw !== undefined) return isFormula(cell.raw) ? this._compute(sheet, cell, r, c) : cell.raw;
      const sp = sheet.spill.get(KEY(r, c));
      return sp === undefined ? null : sp;
    }
    _compute(sheet, cell, r, c) {
      if (cell.gen === this.gen) return cell.v;
      if (cell.busy) return E('#REF!');
      cell.busy = true;
      let v;
      try {
        const cx = { wb: this, sheet, r, c };
        v = XL.val(cx, XL.evaluate(this._parseCached(cell.raw), cx));
      } catch (e) { v = E('#VALUE!'); }
      if (v instanceof Arr) {
        if (v.h === 1 && v.w === 1) v = v.rows[0][0];
        else v = this._spill(sheet, r, c, v);
      }
      if (v === undefined) v = null;
      cell.busy = false; cell.gen = this.gen; cell.v = v;
      return v;
    }
    _spill(sheet, r, c, arr) {
      for (let i = 0; i < arr.h; i++) for (let j = 0; j < arr.w; j++) {
        if (!i && !j) continue;
        const k = KEY(r + i, c + j);
        const t = sheet.get(r + i, c + j);
        if ((t && t.raw !== null && t.raw !== undefined) || (sheet.ownerNew.has(k) && sheet.ownerNew.get(k) !== KEY(r, c)) || c + j >= 1024) return E('#SPILL!');
      }
      for (let i = 0; i < arr.h; i++) for (let j = 0; j < arr.w; j++) { if (i || j) { sheet.spillNew.set(KEY(r + i, c + j), arr.rows[i][j]); sheet.ownerNew.set(KEY(r + i, c + j), KEY(r, c)); } }
      return arr.rows[0][0];
    }
    recalc() {
      let prev = '';
      for (let pass = 0; pass < 3; pass++) {
        this.gen++;
        this.sheets.forEach((s) => { s.spillNew = new Map(); s.ownerNew = new Map(); s._extent(); });
        for (const s of this.sheets) for (const [k, cell] of s.cells) if (isFormula(cell.raw)) this._compute(s, cell, Math.floor(k / 1024), k % 1024);
        let sig = '';
        this.sheets.forEach((s) => { s.spill = s.spillNew; s.owner = s.ownerNew; sig += s.name + [...s.spill].map(([k, v]) => k + ':' + JSON.stringify(v)).join('|'); });
        if (sig === prev) break;
        prev = sig;
      }
      this.sheets.forEach((s) => s._extent());
      this.applyFilters();
    }
    // ---- reading ---------------------------------------------------------------------------------------------
    value(sheetName, a1) { const s = this.sheet(sheetName); const p = parseAddr(a1); return s && p ? this._cellValue(s, p.r, p.c) : null; }
    valueAt(s, r, c) { return this._cellValue(s, r, c); }
    raw(s, r, c) { const cell = s.get(r, c); return cell ? cell.raw : null; }
    style(s, r, c) { const cell = s.get(r, c); return (cell && cell.s) || null; }
    fmtAt(s, r, c) {
      const st = this.style(s, r, c);
      if (st && st.fmt) return st.fmt;
      const o = s.owner.get(KEY(r, c));
      if (o !== undefined) { const st2 = this.style(s, Math.floor(o / 1024), o % 1024); return st2 && st2.fmt; }
      return null;
    }
    display(s, r, c) { return formatValue(this._cellValue(s, r, c), this.fmtAt(s, r, c)); }
    // ---- writing -----------------------------------------------------------------------------------------------
    _sheetOf(x) { const s = this.sheet(x); if (!s) throw new Error('No sheet ' + x); return s; }
    setRaw(sheetName, a1, raw) { const s = this._sheetOf(sheetName); const p = parseAddr(a1); const cell = s.ensure(p.r, p.c); cell.raw = raw; return this; }
    setInput(sheetName, a1, text) {
      const s = this._sheetOf(sheetName); const p = parseAddr(a1); const cell = s.ensure(p.r, p.c);
      const r = parseInput(text);
      cell.raw = r.raw;
      if (r.fmt && !(cell.s && cell.s.fmt)) cell.s = Object.assign({}, cell.s, { fmt: r.fmt });
      return this;
    }
    set(sheetName, a1, v) { return typeof v === 'string' ? this.setInput(sheetName, a1, v) : this.setRaw(sheetName, a1, v); }
    /** Writes a 2D array at a1. Strings are parsed like typed input; null leaves a cell empty. */
    load(sheetName, a1, rows) { const p = parseAddr(a1); rows.forEach((row, i) => row.forEach((v, j) => { if (v !== null && v !== undefined) this.set(sheetName, addr(p.r + i, p.c + j), v); })); return this; }
    each(sheetName, range, fn) { const s = this._sheetOf(sheetName); const g = typeof range === 'string' ? parseRange(range) : range; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) fn(s, r, c); }
    format(sheetName, range, patch) {
      this.each(sheetName, range, (s, r, c) => { const cell = s.ensure(r, c); const st = Object.assign({}, cell.s, patch); Object.keys(st).forEach((k) => { if (st[k] === null || st[k] === false || st[k] === '') delete st[k]; }); cell.s = Object.keys(st).length ? st : null; });
      return this;
    }
    clear(sheetName, range, what) {
      this.each(sheetName, range, (s, r, c) => { const cell = s.get(r, c); if (!cell) return; if (!what || what.contents) cell.raw = null; if (!what || what.formats) cell.s = null; if (cell.raw === null && !cell.s) s.cells.delete(KEY(r, c)); });
      return this;
    }
    /** Copies src to dest (top-left), shifting relative references; cut empties the source. */
    copy(sheetName, srcRange, destA1, opts) {
      const s = this._sheetOf(sheetName), d = this._sheetOf((opts && opts.toSheet) || sheetName);
      const g = parseRange(srcRange), p = parseAddr(destA1);
      const o = opts || {};
      this.recalc();
      const items = [];
      for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const cell = s.get(r, c); items.push({ r: r - g.r1, c: c - g.c1, raw: cell ? cell.raw : null, val: this._cellValue(s, r, c), st: cell && cell.s ? Object.assign({}, cell.s) : null }); }
      if (o.cut) this.clear(sheetName, g);
      const dr = p.r - g.r1, dc = p.c - g.c1;
      items.forEach((it) => {
        const cell = d.ensure(p.r + it.r, p.c + it.c);
        if (!o.formatsOnly) cell.raw = o.values ? it.val : isFormula(it.raw) ? (o.cut ? it.raw : shiftFormula(it.raw, dr, dc)) : it.raw;
        if (!o.values && !o.contentsOnly) cell.s = it.st;
      });
      return this;
    }
    /** Fill: repeat the source range over target, shifting relative references per row / column. */
    fill(sheetName, srcRange, targetRange) {
      const s = this._sheetOf(sheetName), g = parseRange(srcRange), t = parseRange(targetRange);
      const h = g.r2 - g.r1 + 1, w = g.c2 - g.c1 + 1;
      for (let r = t.r1; r <= t.r2; r++) for (let c = t.c1; c <= t.c2; c++) {
        const sr = g.r1 + ((r - t.r1) % h + h) % h, sc = g.c1 + ((c - t.c1) % w + w) % w;
        const cell = s.get(sr, sc);
        const dst = s.ensure(r, c);
        if (cell && isFormula(cell.raw)) dst.raw = shiftFormula(cell.raw, r - sr, c - sc); else dst.raw = cell ? cell.raw : null;
        dst.s = cell && cell.s ? Object.assign({}, cell.s) : dst.s;
      }
      return this;
    }
    fillDown(sheetName, a1First, lastRow) { const p = parseAddr(a1First); return this.fill(sheetName, a1First, addr(p.r, p.c) + ':' + addr(lastRow - 1, p.c)); }
    /** Sets a formula in the top-left cell of the range and fills it across the rest (relative references shift). */
    formula(sheetName, rangeS, f) {
      const g = parseRange(rangeS), a1 = addr(g.r1, g.c1);
      this.setRaw(sheetName, a1, f);
      if (g.r2 > g.r1 || g.c2 > g.c1) this.fill(sheetName, a1, rangeS);
      return this;
    }
    colWidth(sheetName, col, w) { this._sheetOf(sheetName).colW[colIndex(col)] = w; return this; }
    freeze(sheetName, rows, cols) { this._sheetOf(sheetName).freeze = { r: rows, c: cols }; return this; }
    define(name, ref) { this.names[name.toUpperCase()] = ref; return this; }
    // ---- sort and filter -----------------------------------------------------------------------------------------
    sort(sheetName, rangeS, keys, header) {
      const s = this._sheetOf(sheetName), g = parseRange(rangeS);
      const r0 = g.r1 + (header === false ? 0 : 1);
      this.recalc();
      const rows = [];
      for (let r = r0; r <= g.r2; r++) { const cells = []; for (let c = g.c1; c <= g.c2; c++) { const cell = s.get(r, c); cells.push(cell ? { raw: cell.raw, s: cell.s ? Object.assign({}, cell.s) : null } : null); } const vals = []; for (let c = g.c1; c <= g.c2; c++) vals.push(this._cellValue(s, r, c)); rows.push({ r, cells, vals }); }
      const ks = keys.map((k) => ({ i: (typeof k.col === 'number' ? k.col : colIndex(k.col)) - g.c1, dir: k.desc ? -1 : 1 }));
      rows.sort((a, b) => { for (const k of ks) { const x = a.vals[k.i], y = b.vals[k.i]; const bx = x === null || x === '', by = y === null || y === ''; if (bx || by) { if (bx && by) continue; return bx ? 1 : -1; } const c = cmp(x, y) * k.dir; if (c) return c; } return a.r - b.r; });
      rows.forEach((row, i) => { const nr = r0 + i; row.cells.forEach((cell, j) => { const dst = s.ensure(nr, g.c1 + j); dst.raw = cell ? (isFormula(cell.raw) ? shiftFormula(cell.raw, nr - row.r, 0) : cell.raw) : null; dst.s = cell ? cell.s : null; }); });
      this.recalc();
      return this;
    }
    /** spec: { col:'C', kind:'in', values:[...] } | { col, kind:'op', op:'>', val } | { col, kind:'text', op:'contains', val } */
    setFilter(sheetName, rangeS, specs) { const s = this._sheetOf(sheetName); s.filter = specs ? { ref: rangeS, specs } : null; this.applyFilters(); return this; }
    applyFilters() {
      for (const s of this.sheets) {
        s.filteredRows = new Set();
        if (s.filter && s.filter.specs && s.filter.specs.length) {
          const g = parseRange(s.filter.ref);
          for (let r = g.r1 + 1; r <= g.r2; r++) {
            const ok = s.filter.specs.every((sp) => {
              const v = this._cellValue(s, r, typeof sp.col === 'number' ? sp.col : colIndex(sp.col));
              if (sp.kind === 'in') return sp.values.some((x) => (x === null || x === '' ? v === null || v === '' : cmp(v, x) === 0));
              if (sp.kind === 'text') { const t = toStr(v).toLowerCase(), q = String(sp.val).toLowerCase(); return sp.op === 'begins' ? t.startsWith(q) : sp.op === 'ends' ? t.endsWith(q) : sp.op === 'notcontains' ? !t.includes(q) : t.includes(q); }
              const n = typeof v === 'number' ? v : NaN; const x = toNum(sp.val);
              switch (sp.op) { case '>': return n > x; case '<': return n < x; case '>=': return n >= x; case '<=': return n <= x; case '=': return cmp(v, sp.val) === 0; case '<>': return cmp(v, sp.val) !== 0; case 'between': return n >= x && n <= toNum(sp.val2); }
              return true;
            });
            if (!ok) s.filteredRows.add(r);
          }
        }
        s.hiddenRows = new Set([...s.userHidden, ...s.filteredRows]);
      }
    }
    // ---- formatting rules -----------------------------------------------------------------------------------------
    addCF(sheetName, rule) { const s = this._sheetOf(sheetName); s.cf.push(Object.assign({ id: this.nextId++ }, rule)); return this; }
    addDV(sheetName, rule) { const s = this._sheetOf(sheetName); s.dv.push(Object.assign({ id: this.nextId++ }, rule)); return this; }
    addChart(sheetName, chart) { const s = this._sheetOf(sheetName); s.charts.push(Object.assign({ id: this.nextId++, sheet: s.name, anchor: { r: 1, c: 8 } }, chart)); return this; }
    /** Which conditional-format rules apply to each cell: Map key -> style. */
    cfStyles(sheetName) {
      const s = this._sheetOf(sheetName), out = new Map();
      const put = (r, c, st) => { const k = KEY(r, c); out.set(k, Object.assign({}, out.get(k), st)); };
      for (const rule of s.cf) {
        const g = parseRange(rule.range);
        const cells = []; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) cells.push({ r, c, v: this._cellValue(s, r, c) });
        const nums = cells.map((x) => x.v).filter((v) => typeof v === 'number');
        const st = rule.style || { fill: '#FFC7CE', color: '#9C0006' };
        const n1 = toNum(rule.a), n2 = toNum(rule.b);
        const textOf = (v) => toStr(v).toLowerCase();
        const counts = new Map(); cells.forEach((x) => { if (x.v !== null) { const k = typeof x.v + ':' + textOf(x.v); counts.set(k, (counts.get(k) || 0) + 1); } });
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        const sortedDesc = nums.slice().sort((a, b) => b - a);
        const topN = rule.n ? sortedDesc[Math.min(rule.n, sortedDesc.length) - 1] : null;
        const botN = rule.n ? sortedDesc.slice().reverse()[Math.min(rule.n, sortedDesc.length) - 1] : null;
        const min = nums.length ? Math.min(...nums) : 0, max = nums.length ? Math.max(...nums) : 0;
        for (const x of cells) {
          const v = x.v; let hit = false;
          switch (rule.kind) {
            case 'gt': hit = typeof v === 'number' && v > n1; break; case 'lt': hit = typeof v === 'number' && v < n1; break;
            case 'ge': hit = typeof v === 'number' && v >= n1; break; case 'le': hit = typeof v === 'number' && v <= n1; break;
            case 'eq': hit = v !== null && cmp(v, typeof rule.a === 'string' && !isNaN(Number(rule.a)) ? Number(rule.a) : rule.a) === 0; break;
            case 'ne': hit = cmp(v, rule.a) !== 0; break;
            case 'between': hit = typeof v === 'number' && v >= Math.min(n1, n2) && v <= Math.max(n1, n2); break;
            case 'text': hit = v !== null && textOf(v).includes(String(rule.text).toLowerCase()); break;
            case 'begins': hit = v !== null && textOf(v).startsWith(String(rule.text).toLowerCase()); break;
            case 'ends': hit = v !== null && textOf(v).endsWith(String(rule.text).toLowerCase()); break;
            case 'dup': hit = v !== null && counts.get(typeof v + ':' + textOf(v)) > 1; break;
            case 'unique': hit = v !== null && counts.get(typeof v + ':' + textOf(v)) === 1; break;
            case 'top': hit = typeof v === 'number' && topN !== null && v >= topN; break;
            case 'bottom': hit = typeof v === 'number' && botN !== null && v <= botN; break;
            case 'above': hit = typeof v === 'number' && v > avg; break; case 'below': hit = typeof v === 'number' && v < avg; break;
            case 'blank': hit = v === null || v === ''; break; case 'error': hit = isErr(v); break;
            case 'formula': { const f = shiftFormula(rule.formula.startsWith('=') ? rule.formula : '=' + rule.formula, x.r - g.r1, x.c - g.c1); try { const cx = { wb: this, sheet: s, r: x.r, c: x.c }; const res = XL.scalar(XL.val(cx, XL.evaluate(this._parseCached(f), cx))); hit = res === true || (typeof res === 'number' && res !== 0); } catch (e) { hit = false; } break; }
            case 'scale': if (typeof v === 'number' && max > min) { const t = (v - min) / (max - min); put(x.r, x.c, { fill: scaleColor(rule.colors || ['#FFFFFF', '#63BE7B'], t) }); } break;
            case 'bar': if (typeof v === 'number' && max > 0) put(x.r, x.c, { bar: Math.max(0, v - Math.min(0, min)) / (max - Math.min(0, min)), barColor: (rule.colors && rule.colors[0]) || '#638EC6' }); break;
          }
          if (hit) put(x.r, x.c, st);
        }
      }
      return out;
    }
    dvAllowed(sheetName, r, c, v) {
      const s = this._sheetOf(sheetName);
      for (const rule of s.dv) {
        const g = parseRange(rule.range);
        if (r < g.r1 || r > g.r2 || c < g.c1 || c > g.c2) continue;
        if (v === null || v === '') { if (rule.allowBlank === false) return { ok: false, rule }; continue; }
        let ok = true;
        const n = typeof v === 'number' ? v : NaN;
        const a = toNum(rule.a), b = toNum(rule.b);
        const op = (x) => { switch (rule.op || 'between') { case 'between': return x >= Math.min(a, b) && x <= Math.max(a, b); case 'notbetween': return x < Math.min(a, b) || x > Math.max(a, b); case 'gt': return x > a; case 'lt': return x < a; case 'ge': return x >= a; case 'le': return x <= a; case 'eq': return x === a; case 'ne': return x !== a; } return true; };
        if (rule.kind === 'list') ok = this.dvItems(rule, s).some((x) => cmp(x, v) === 0);
        else if (rule.kind === 'whole') ok = Number.isInteger(n) && op(n);
        else if (rule.kind === 'decimal' || rule.kind === 'date') ok = typeof v === 'number' && op(n);
        else if (rule.kind === 'length') ok = op(toStr(v).length);
        else if (rule.kind === 'custom') { try { const f = shiftFormula(rule.formula.startsWith('=') ? rule.formula : '=' + rule.formula, r - g.r1, c - g.c1); const cx = { wb: this, sheet: s, r, c }; const saved = this.raw(s, r, c); const res = XL.scalar(XL.val(cx, XL.evaluate(this._parseCached(f), cx))); void saved; ok = res === true; } catch (e) { ok = false; } }
        if (!ok) return { ok: false, rule };
      }
      return { ok: true };
    }
    dvItems(rule, s) {
      if (typeof rule.list === 'string' && rule.list.startsWith('=')) { const t = rule.list.slice(1); const sh = t.includes('!') ? this.sheet(t.split('!')[0].replace(/^'|'$/g, '')) : s; const g = parseRange(t); const out = []; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const v = this._cellValue(sh, r, c); if (v !== null) out.push(v); } return out; }
      return String(rule.list || '').split(',').map((x) => x.trim()).filter((x) => x !== '').map((x) => (x !== '' && !isNaN(Number(x)) ? Number(x) : x));
    }
    // ---- pivot ---------------------------------------------------------------------------------------------------------
    addPivot(cfg) {
      const target = this.sheet(cfg.target) || this.addSheet(cfg.target || 'PivotTable' + (this.sheets.length + 1));
      cfg.target = target.name;
      this.recalc();
      const grid = pivotGrid(this, cfg);
      for (const [k] of target.cells) target.cells.delete(k);
      grid.rows.forEach((row, i) => row.forEach((v, j) => { if (v !== null && v !== undefined) { const cell = target.ensure(i, j); cell.raw = v; const st = {}; if (grid.bold.has(KEY(i, j))) st.b = true; if (grid.fmt.has(KEY(i, j))) st.fmt = grid.fmt.get(KEY(i, j)); if (Object.keys(st).length) cell.s = st; } }));
      target.pivot = JSON.parse(JSON.stringify(cfg));
      this.recalc();
      return this;
    }
    refreshPivots() { this.sheets.filter((s) => s.pivot).forEach((s) => this.addPivot(Object.assign({}, s.pivot, { target: s.name }))); }
    // ---- JSON ----------------------------------------------------------------------------------------------------------
    toJSON() {
      return { names: this.names, nextId: this.nextId, sheets: this.sheets.map((s) => ({
        name: s.name, colW: s.colW, hidden: [...s.userHidden], filter: s.filter, cf: s.cf, dv: s.dv, charts: s.charts, pivot: s.pivot, freeze: s.freeze,
        cells: [...s.cells].filter(([, c]) => (c.raw !== null && c.raw !== undefined) || c.s).map(([k, c]) => [k, c.raw, c.s]),
      })) };
    }
    static fromJSON(j) {
      const wb = new Workbook(); wb.names = j.names || {}; wb.nextId = j.nextId || 1;
      j.sheets.forEach((sj) => { const s = wb.addSheet(sj.name); s.colW = sj.colW || {}; s.userHidden = new Set(sj.hidden || []); s.filter = sj.filter; s.cf = sj.cf || []; s.dv = sj.dv || []; s.charts = sj.charts || []; s.pivot = sj.pivot; s.freeze = sj.freeze || { r: 0, c: 0 }; sj.cells.forEach(([k, raw, st]) => { s.cells.set(k, { raw, s: st }); }); });
      wb.recalc();
      return wb;
    }
    clone() { return Workbook.fromJSON(JSON.parse(JSON.stringify(this.toJSON()))); }
  }

  function scaleColor(cols, t) {
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const seg = cols.length === 3 ? (t < 0.5 ? [cols[0], cols[1], t * 2] : [cols[1], cols[2], (t - 0.5) * 2]) : [cols[0], cols[cols.length - 1], t];
    const a = hex(seg[0]), b = hex(seg[1]);
    return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * seg[2]).toString(16).padStart(2, '0')).join('');
  }

  // ---- pivot layout ----------------------------------------------------------------------------------------------------------
  const AGG = { sum: 'Sum', count: 'Count', average: 'Average', min: 'Min', max: 'Max' };
  function pivotGrid(wb, cfg) {
    const s = wb.sheet(cfg.src.sheet), g = parseRange(cfg.src.ref);
    const header = []; for (let c = g.c1; c <= g.c2; c++) header.push(toStr(wb._cellValue(s, g.r1, c)));
    const fmts = []; for (let c = g.c1; c <= g.c2; c++) fmts.push(wb.fmtAt(s, g.r1 + 1, c));
    let recs = [];
    for (let r = g.r1 + 1; r <= g.r2; r++) { const o = {}; header.forEach((h, i) => { o[h] = wb._cellValue(s, r, g.c1 + i); }); if (Object.values(o).some((v) => v !== null)) recs.push(o); }
    (cfg.filters || []).forEach((f) => { if (f.values && f.values.length) recs = recs.filter((o) => f.values.some((v) => cmp(o[f.field], v) === 0)); });
    const rowF = cfg.rows || [], colF = (cfg.cols || [])[0], vals = (cfg.vals || []).slice(0, colF ? 1 : 3);
    const uniq = (list, f) => { const seen = []; list.forEach((o) => { const v = o[f]; if (!seen.some((x) => cmp(x, v) === 0)) seen.push(v); }); return seen.sort((a, b) => cmp(a, b)); };
    const agg = (list, v) => {
      const nums = list.map((o) => o[v.field]).filter((x) => typeof x === 'number');
      switch (v.agg || 'sum') { case 'count': return list.filter((o) => o[v.field] !== null).length; case 'average': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; case 'min': return nums.length ? Math.min(...nums) : null; case 'max': return nums.length ? Math.max(...nums) : null; default: return nums.reduce((a, b) => a + b, 0); }
    };
    const vname = (v) => v.name || `${AGG[v.agg || 'sum']} of ${v.field}`;
    const vfmt = (v) => (v.agg === 'count' ? '0' : v.fmt || fmts[header.indexOf(v.field)] || null);
    const rows = [], bold = new Set(), fmt = new Map();
    const B = (r, c) => bold.add(KEY(r, c));
    (cfg.filters || []).forEach((f) => { rows.push([f.field, !f.values || !f.values.length ? '(All)' : f.values.length === 1 ? f.values[0] : '(Multiple Items)']); B(rows.length - 1, 0); });
    if ((cfg.filters || []).length) rows.push([]);
    const tot = cfg.totals || {};
    const showRowTot = tot.rows !== false, showColTot = tot.cols !== false;
    const put = (row, bld) => { rows.push(row); if (bld) row.forEach((_, j) => B(rows.length - 1, j)); };
    const lines = []; // row label lines: [label, records]
    if (rowF.length === 0) lines.push(['', recs, false]);
    else if (rowF.length === 1) uniq(recs, rowF[0]).forEach((v) => lines.push([v, recs.filter((o) => cmp(o[rowF[0]], v) === 0), false]));
    else uniq(recs, rowF[0]).forEach((v) => { const sub = recs.filter((o) => cmp(o[rowF[0]], v) === 0); lines.push([v, sub, true]); uniq(sub, rowF[1]).forEach((w) => lines.push([w, sub.filter((o) => cmp(o[rowF[1]], w) === 0), false, true])); });
    const startData = rows.length + (colF ? 2 : 1);
    if (colF) {
      const items = uniq(recs, colF);
      put([vname(vals[0]), 'Column Labels'], true);
      put(['Row Labels', ...items, ...(showRowTot ? ['Grand Total'] : [])], true);
      lines.forEach(([label, list, isHead, isInner]) => { const cells = items.map((it) => { const sub = list.filter((o) => cmp(o[colF], it) === 0); return sub.length ? agg(sub, vals[0]) : null; }); put([label, ...cells, ...(showRowTot ? [agg(list, vals[0])] : [])], isHead); void isInner; });
      if (showColTot) put(['Grand Total', ...items.map((it) => agg(recs.filter((o) => cmp(o[colF], it) === 0), vals[0])), ...(showRowTot ? [agg(recs, vals[0])] : [])], true);
      for (let r = startData; r < rows.length; r++) for (let c = 1; c < rows[r].length; c++) if (vfmt(vals[0])) fmt.set(KEY(r, c), vfmt(vals[0]));
    } else {
      put([rowF.length ? 'Row Labels' : '', ...vals.map(vname)], true);
      lines.forEach(([label, list, isHead]) => { if (!rowF.length) { put(['', ...vals.map((v) => agg(list, v))], false); } else put([label, ...vals.map((v) => agg(list, v))], isHead); });
      if (showColTot && rowF.length) put(['Grand Total', ...vals.map((v) => agg(recs, v))], true);
      for (let r = startData; r < rows.length; r++) vals.forEach((v, j) => { if (vfmt(v)) fmt.set(KEY(r, j + 1), vfmt(v)); });
    }
    return { rows, bold, fmt };
  }

  // ---- chart data ------------------------------------------------------------------------------------------------------------------
  function chartData(wb, chart) {
    const s = wb.sheet(chart.sheet), g = parseRange(chart.ref);
    const cell = (r, c) => wb._cellValue(s, r, c);
    const rows = []; for (let r = g.r1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(cell(r, c)); rows.push(row); }
    if (chart.byRow) { const t = rows[0].map((_, j) => rows.map((r) => r[j])); return buildSeries(t, chart); }
    return buildSeries(rows, chart);
  }
  function buildSeries(rows, chart) {
    const hasHdr = rows.length > 1 && typeof rows[0][0] !== 'number' && rows[0].slice(1).every((v) => typeof v === 'string');
    const hasCats = rows.length > 1 && rows[0].length > 1 && rows.slice(hasHdr ? 1 : 0).every((r) => typeof r[0] === 'string' || r[0] === null) && !(chart.type === 'scatter');
    const body = rows.slice(hasHdr ? 1 : 0);
    const cats = hasCats || chart.type === 'scatter' ? body.map((r) => r[0]) : body.map((_, i) => i + 1);
    const start = hasCats || chart.type === 'scatter' ? 1 : 0;
    const series = [];
    for (let j = start; j < rows[0].length; j++) series.push({ name: hasHdr ? toStr(rows[0][j]) : 'Series' + (series.length + 1), vals: body.map((r) => (typeof r[j] === 'number' ? r[j] : 0)) });
    return { cats, series };
  }

  Object.assign(XL, { Workbook, Sheet, KEY, isFormula, pivotGrid, chartData, scaleColor });
})(typeof window !== 'undefined' ? window : globalThis);

/* Dojo Excel: the spreadsheet component (grid, formula bar, ribbon, dialogs). */
(function (root) {
  'use strict';
  const XL = root.DojoXL;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const { addr, colName, colIndex, parseAddr, parseRange, rangeStr, KEY, isFormula } = XL;
  const ROWS = 80, COLS = 26, DEFW = 90, HDRW = 44;

  root.DojoGrid = function Grid() {
    const api = { onChange: () => {} };
    let wb = null, si = 0;
    let sel = { r1: 0, c1: 0, r2: 0, c2: 0 }, anchor = { r: 0, c: 0 };
    let editing = null, clip = null, drag = null, fillDrag = null, undo = [], redo = [];
    const shown = { cf: null };

    const sheet = () => wb.sheets[si];
    const norm = (g) => ({ r1: Math.min(g.r1, g.r2), c1: Math.min(g.c1, g.c2), r2: Math.max(g.r1, g.r2), c2: Math.max(g.c1, g.c2) });
    const selNorm = () => norm(sel);
    const snap = () => JSON.stringify(wb.toJSON());
    const restore = (str) => { wb = XL.Workbook.fromJSON(JSON.parse(str)); if (si >= wb.sheets.length) si = 0; };

    function mutate(fn, keepSel) {
      undo.push(snap()); if (undo.length > 60) undo.shift(); redo = [];
      fn();
      wb.recalc();
      render();
      api.onChange(wb);
      void keepSel;
    }
    api.undo = () => { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); wb.recalc(); render(); api.onChange(wb); };
    api.redo = () => { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); wb.recalc(); render(); api.onChange(wb); };
    api.setWorkbook = (w) => { wb = w; si = 0; sel = { r1: 0, c1: 0, r2: 0, c2: 0 }; anchor = { r: 0, c: 0 }; undo = []; redo = []; editing = null; clip = null; autoWidths(); wb.recalc(); render(); };
    api.getWb = () => wb;
    api.render = () => { wb.recalc(); render(); };
    api.setSheet = (i) => { si = i; sel = { r1: 0, c1: 0, r2: 0, c2: 0 }; anchor = { r: 0, c: 0 }; render(); };

    // ---- layout helpers -------------------------------------------------------------------------------------------
    function autoWidths() {
      wb.recalc();
      wb.sheets.forEach((s) => {
        for (let c = 0; c < COLS; c++) {
          if (s.colW[c]) continue;
          let m = 0;
          for (let r = 0; r < 40; r++) { const t = wb.display(s, r, c); const isText = typeof wb.valueAt(s, r, c) === 'string'; if (isText && t.length > m) m = t.length; else if (!isText && t.length * 0.9 > m) m = t.length * 0.9; }
          s.colW[c] = Math.max(66, Math.min(240, Math.round(m * 7.3 + 18)));
        }
      });
    }
    const colW = (s, c) => s.colW[c] || DEFW;
    const cellEl = (r, c) => { const t = $('gridInner').querySelector('table'); return t && t.rows[r + 1] ? t.rows[r + 1].cells[c + 1] : null; };

    // ---- rendering ----------------------------------------------------------------------------------------------------
    function cellCss(s, r, c, v, st, cs) {
      const css = [];
      const fill = (cs && cs.fill) || (st && st.fill);
      const color = (cs && cs.color) || (st && st.color);
      if (fill) css.push('background:' + fill);
      if (color) css.push('color:' + color);
      if ((st && st.b) || (cs && cs.b)) css.push('font-weight:700');
      if (st && st.i) css.push('font-style:italic');
      if (st && st.u) css.push('text-decoration:underline');
      if (st && st.align) css.push('text-align:' + st.align);
      if (st && st.border) css.push('box-shadow:inset 0 0 0 1px #222');
      const fz = s.freeze || { r: 0, c: 0 };
      if (c < fz.c) { let left = HDRW; for (let k = 0; k < c; k++) left += colW(s, k); css.push(`position:sticky;left:${left}px;z-index:2`); }
      if (r < fz.r) css.push(`position:sticky;top:${24 + r * 22}px;z-index:${c < fz.c ? 3 : 2}`);
      void v;
      return css.join(';');
    }
    function render() {
      const s = sheet();
      const inner = $('gridInner');
      const cf = wb.cfStyles(s.name);
      shown.cf = cf;
      let total = HDRW; for (let c = 0; c < COLS; c++) total += colW(s, c);
      let h = `<table class="xl" style="width:${total}px"><colgroup><col style="width:${HDRW}px">`;
      for (let c = 0; c < COLS; c++) h += `<col style="width:${colW(s, c)}px">`;
      h += '</colgroup><thead><tr><th class="rh" data-all="1"></th>';
      const fz = s.freeze || { r: 0, c: 0 };
      for (let c = 0; c < COLS; c++) {
        let st = ''; if (c < fz.c) { let left = HDRW; for (let k = 0; k < c; k++) left += colW(s, k); st = `left:${left}px;z-index:5;`; }
        h += `<th class="ch" data-c="${c}" style="${st}">${colName(c)}<span class="rsz" data-rz="${c}"></span></th>`;
      }
      h += '</tr></thead><tbody>';
      const fb = s.filter ? parseRange(s.filter.ref) : null;
      for (let r = 0; r < ROWS; r++) {
        h += `<tr data-r="${r}"${s.hiddenRows.has(r) ? ' class="h"' : ''}><th data-r="${r}">${r + 1}</th>`;
        for (let c = 0; c < COLS; c++) {
          const v = wb.valueAt(s, r, c), st = wb.style(s, r, c), cs = cf.get(KEY(r, c));
          const text = wb.display(s, r, c);
          const isNum = typeof v === 'number', ctr = typeof v === 'boolean' || XL.isErr(v);
          let cls = isNum ? 'num' : ctr ? 'ctr' : '';
          if (st && st.wrap) cls += ' wrap';
          let extra = '';
          if (cs && cs.bar) extra += `<span class="bar" style="width:${Math.round(cs.bar * 100)}%;background:${cs.barColor || '#638EC6'}"></span>`;
          if (fb && r === fb.r1 && c >= fb.c1 && c <= fb.c2) extra += `<button class="fb" data-fb="${c}" tabindex="-1">▼</button>`;
          h += `<td data-r="${r}" data-c="${c}" class="${cls}" style="${cellCss(s, r, c, v, st, cs)}">${esc(text)}${extra}</td>`;
        }
        h += '</tr>';
      }
      h += '</tbody></table><div id="antBox"></div><div id="selBox"></div><div id="actBox"></div><div id="fillH"></div><input id="ced" spellcheck="false" autocomplete="off">';
      inner.innerHTML = h;
      s.charts.forEach((ch) => addChartBox(inner, ch));
      placeOverlays();
      renderTabs();
      renderRibbonState();
      updateBars();
    }
    function placeOverlays() {
      const g = selNorm();
      const a = cellEl(g.r1, g.c1), b = cellEl(g.r2, g.c2), act = cellEl(anchor.r, anchor.c);
      const box = $('selBox'), ab = $('actBox'), fh = $('fillH');
      if (!a || !b || !act) return;
      const left = a.offsetLeft, top = a.offsetTop, w = b.offsetLeft + b.offsetWidth - a.offsetLeft, hh = b.offsetTop + b.offsetHeight - a.offsetTop;
      const multi = g.r1 !== g.r2 || g.c1 !== g.c2;
      Object.assign(box.style, { left: left + 'px', top: top + 'px', width: w - 1 + 'px', height: hh - 1 + 'px', display: multi ? 'block' : 'none' });
      Object.assign(ab.style, { left: act.offsetLeft + 'px', top: act.offsetTop + 'px', width: act.offsetWidth - 1 + 'px', height: act.offsetHeight - 1 + 'px' });
      Object.assign(fh.style, { left: left + w - 5 + 'px', top: top + hh - 5 + 'px' });
      if (!multi) Object.assign(ab.style, { left: left + 'px', top: top + 'px', width: w - 1 + 'px', height: hh - 1 + 'px' });
      document.querySelectorAll('#gridInner th.sel').forEach((t) => t.classList.remove('sel'));
      for (let c = g.c1; c <= g.c2; c++) { const t = document.querySelector(`#gridInner th.ch[data-c="${c}"]`); if (t) t.classList.add('sel'); }
      for (let r = g.r1; r <= g.r2; r++) { const t = document.querySelector(`#gridInner tbody th[data-r="${r}"]`); if (t) t.classList.add('sel'); }
      const ant = $('antBox');
      if (clip && clip.sheet === sheet().name) {
        const ca = cellEl(clip.range.r1, clip.range.c1), cb = cellEl(clip.range.r2, clip.range.c2);
        if (ca && cb) Object.assign(ant.style, { display: 'block', left: ca.offsetLeft + 'px', top: ca.offsetTop + 'px', width: cb.offsetLeft + cb.offsetWidth - ca.offsetLeft - 1 + 'px', height: cb.offsetTop + cb.offsetHeight - ca.offsetTop - 1 + 'px' });
      } else ant.style.display = 'none';
      updateBars();
    }
    function updateBars() {
      const s = sheet();
      const g = selNorm();
      const multi = g.r1 !== g.r2 || g.c1 !== g.c2;
      $('nbox').value = multi ? rangeStr(g) : addr(anchor.r, anchor.c);
      if (!editing) $('fin').value = wb ? (wb.raw(s, anchor.r, anchor.c) === null ? (wb.valueAt(s, anchor.r, anchor.c) === null ? '' : XL.toStr(wb.valueAt(s, anchor.r, anchor.c))) : rawText(wb.raw(s, anchor.r, anchor.c))) : '';
      // status bar statistics
      let sum = 0, n = 0, cnt = 0;
      if (multi) for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const v = wb.valueAt(s, r, c); if (v !== null && v !== '') cnt++; if (typeof v === 'number') { sum += v; n++; } }
      $('stSum').textContent = n ? `Average: ${XL.formatValue(sum / n, 'General')}    Sum: ${XL.formatValue(sum, 'General')}` : '';
      $('stCount').textContent = multi && cnt ? `Count: ${cnt}` : '';
    }
    const rawText = (raw) => (raw === null || raw === undefined ? '' : typeof raw === 'boolean' ? (raw ? 'TRUE' : 'FALSE') : String(raw));

    // ---- charts -----------------------------------------------------------------------------------------------------------
    const PAL = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E'];
    function chartSvg(ch, W, H) {
      const d = XL.chartData(wb, ch);
      const pad = { l: 44, r: 12, t: ch.title ? 34 : 14, b: d.series.length > 1 || ch.type === 'pie' ? 46 : 28 };
      const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
      let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:Inter,sans-serif;font-size:11px;fill:#444"><rect width="${W}" height="${H}" fill="#fff"/>`;
      if (ch.title) svg += `<text x="${W / 2}" y="20" text-anchor="middle" style="font-size:13px;font-weight:600;fill:#222">${esc(ch.title)}</text>`;
      if (ch.type === 'pie') {
        const vals = d.series[0] ? d.series[0].vals : [], tot = vals.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
        const cx = W / 2, cy = pad.t + ph / 2, rad = Math.min(pw, ph) / 2 - 4;
        let ang = -Math.PI / 2;
        vals.forEach((v, i) => { const a2 = ang + (Math.max(v, 0) / tot) * Math.PI * 2; const x1 = cx + rad * Math.cos(ang), y1 = cy + rad * Math.sin(ang), x2 = cx + rad * Math.cos(a2), y2 = cy + rad * Math.sin(a2); svg += `<path d="M${cx},${cy} L${x1},${y1} A${rad},${rad} 0 ${a2 - ang > Math.PI ? 1 : 0} 1 ${x2},${y2} Z" fill="${PAL[i % 8]}" stroke="#fff"/>`; ang = a2; });
        d.cats.forEach((c, i) => { svg += `<rect x="${8 + (i % 4) * (W / 4)}" y="${H - 30 + Math.floor(i / 4) * 14}" width="9" height="9" fill="${PAL[i % 8]}"/><text x="${20 + (i % 4) * (W / 4)}" y="${H - 21 + Math.floor(i / 4) * 14}">${esc(c)}</text>`; });
        return svg + '</svg>';
      }
      const all = [].concat(...d.series.map((s) => s.vals)); const max = Math.max(1, ...all) * 1.08, min = Math.min(0, ...all);
      const horiz = ch.type === 'bar';
      const sy = (v) => pad.t + ph - ((v - min) / (max - min)) * ph;
      for (let i = 0; i <= 4; i++) { const v = min + ((max - min) * i) / 4, y = sy(v); svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="#e5e5e5"/><text x="${pad.l - 5}" y="${y + 3}" text-anchor="end">${XL.formatValue(Math.round(v * 100) / 100, 'General')}</text>`; }
      const n = d.cats.length || 1, band = pw / n;
      if (horiz) {
        const bh = ph / n;
        d.cats.forEach((c, i) => { svg += `<text x="${pad.l - 5}" y="${pad.t + i * bh + bh / 2 + 3}" text-anchor="end">${esc(String(c).slice(0, 8))}</text>`; d.series.forEach((s, k) => { const w2 = ((s.vals[i] - 0) / (max - 0)) * pw; const bw = (bh * 0.7) / d.series.length; svg += `<rect x="${pad.l}" y="${pad.t + i * bh + bh * 0.15 + k * bw}" width="${Math.max(w2, 0)}" height="${bw - 1}" fill="${PAL[k % 8]}"/>`; }); });
      } else {
        d.cats.forEach((c, i) => { svg += `<text x="${pad.l + i * band + band / 2}" y="${H - pad.b + 14}" text-anchor="middle">${esc(String(c).slice(0, 8))}</text>`; });
        if (ch.type === 'column') d.series.forEach((s, k) => s.vals.forEach((v, i) => { const bw = (band * 0.7) / d.series.length; const x = pad.l + i * band + band * 0.15 + k * bw; svg += `<rect x="${x}" y="${sy(Math.max(v, 0))}" width="${bw - 1}" height="${Math.abs(sy(0) - sy(v))}" fill="${PAL[k % 8]}"/>`; }));
        else d.series.forEach((s, k) => { const pts = s.vals.map((v, i) => [pad.l + i * band + band / 2, sy(v)]); if (ch.type === 'scatter') pts.forEach((p) => { svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${PAL[k % 8]}"/>`; }); else { if (ch.type === 'area') svg += `<path d="M${pts[0][0]},${sy(0)} ${pts.map((p) => 'L' + p[0] + ',' + p[1]).join(' ')} L${pts[pts.length - 1][0]},${sy(0)} Z" fill="${PAL[k % 8]}" opacity=".5"/>`; svg += `<polyline fill="none" stroke="${PAL[k % 8]}" stroke-width="2.2" points="${pts.map((p) => p.join(',')).join(' ')}"/>`; pts.forEach((p) => { svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${PAL[k % 8]}"/>`; }); } });
      }
      svg += `<line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${pad.t + ph}" stroke="#bbb"/><line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(0)}" y2="${sy(0)}" stroke="#bbb"/>`;
      if (d.series.length > 1) d.series.forEach((s, k) => { svg += `<rect x="${pad.l + k * 90}" y="${H - 16}" width="9" height="9" fill="${PAL[k % 8]}"/><text x="${pad.l + 13 + k * 90}" y="${H - 8}">${esc(s.name)}</text>`; });
      return svg + '</svg>';
    }
    function addChartBox(inner, ch) {
      if (!ch.anchor || ch.anchor.x === undefined) {
        const s = sheet(); let x = HDRW; for (let c = 0; c < Math.min((s.maxCol || 0) + 2, COLS - 4); c++) x += colW(s, c);
        ch.anchor = { x, y: 30, w: 380, h: 230 };
      }
      const A = ch.anchor;
      const el = document.createElement('div');
      el.className = 'chartbox'; el.dataset.id = ch.id;
      Object.assign(el.style, { left: A.x + 'px', top: A.y + 'px', width: A.w + 'px', height: A.h + 'px' });
      el.innerHTML = chartSvg(ch, A.w, A.h) + '<div class="cdrag"></div><button class="cx" title="Delete chart">×</button>';
      inner.appendChild(el);
    }

    // ---- selection and editing ---------------------------------------------------------------------------------------------
    function select(r, c, extend) {
      r = Math.max(0, Math.min(ROWS - 1, r)); c = Math.max(0, Math.min(COLS - 1, c));
      if (extend) sel = { r1: anchor.r, c1: anchor.c, r2: r, c2: c }; else { anchor = { r, c }; sel = { r1: r, c1: c, r2: r, c2: c }; }
      placeOverlays();
      const el = cellEl(r, c); const sc = $('gridScroll');
      if (el) { if (el.offsetTop < sc.scrollTop + 24) sc.scrollTop = el.offsetTop - 24; else if (el.offsetTop + el.offsetHeight > sc.scrollTop + sc.clientHeight - 4) sc.scrollTop = el.offsetTop + el.offsetHeight - sc.clientHeight + 12; if (el.offsetLeft < sc.scrollLeft + HDRW) sc.scrollLeft = el.offsetLeft - HDRW; else if (el.offsetLeft + el.offsetWidth > sc.scrollLeft + sc.clientWidth - 4) sc.scrollLeft = el.offsetLeft + el.offsetWidth - sc.clientWidth + 12; }
    }
    function startEdit(initial, fromBar) {
      const s = sheet(); const el = cellEl(anchor.r, anchor.c); if (!el) return;
      const ced = $('ced');
      const text = initial !== undefined ? initial : rawText(wb.raw(s, anchor.r, anchor.c)) || (wb.valueAt(s, anchor.r, anchor.c) === null ? '' : XL.toStr(wb.valueAt(s, anchor.r, anchor.c)));
      editing = { r: anchor.r, c: anchor.c, bar: !!fromBar };
      Object.assign(ced.style, { display: 'block', left: el.offsetLeft + 'px', top: el.offsetTop + 'px', minWidth: el.offsetWidth + 'px', height: el.offsetHeight + 'px' });
      ced.value = text; $('fin').value = text;
      if (fromBar) $('fin').focus(); else { ced.focus(); if (initial === undefined) ced.setSelectionRange(text.length, text.length); }
    }
    function endEdit() { editing = null; const ced = $('ced'); if (ced) ced.style.display = 'none'; $('gridScroll').focus(); }
    function commitEdit(move) {
      if (!editing) return;
      const { r, c } = editing;
      const text = editing.bar ? $('fin').value : $('ced').value;
      const s = sheet();
      const v = XL.parseInput(text);
      const chk = wb.dvAllowed(s.name, r, c, typeof v.raw === 'string' && v.raw.startsWith('=') ? null : v.raw);
      endEdit();
      if (!chk.ok) { flash('That value is not allowed here' + (chk.rule && chk.rule.kind === 'list' ? ' (pick from the list).' : '.')); updateBars(); return; }
      if (text !== rawText(wb.raw(s, r, c))) mutate(() => wb.setInput(s.name, addr(r, c), text));
      if (move === 'down') select(r + 1, c); else if (move === 'right') select(r, c + 1); else if (move === 'up') select(r - 1, c); else select(r, c);
    }
    function cancelEdit() { endEdit(); updateBars(); }
    function flash(msg) { const el = $('stReady'); el.textContent = msg; setTimeout(() => { el.textContent = 'Ready'; }, 2600); }
    api.flash = flash;
    const pointOk = (text, pos) => text.startsWith('=') && /[=(,+\-*/^&<>;{:\s]$/.test(text.slice(0, pos));

    // ---- clipboard / fill -------------------------------------------------------------------------------------------------------------
    function tsv(g) { const s = sheet(); const rows = []; for (let r = g.r1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(wb.display(s, r, c)); rows.push(row.join('\t')); } return rows.join('\n'); }
    function doCopy(cut) { const g = selNorm(); clip = { sheet: sheet().name, range: g, cut: !!cut, tsv: tsv(g) }; try { navigator.clipboard.writeText(clip.tsv); } catch (e) { /* ignore */ } placeOverlays(); }
    async function doPaste() {
      const s = sheet(); const g = selNorm();
      let ext = null;
      try { ext = await navigator.clipboard.readText(); } catch (e) { ext = null; }
      if (clip && (ext === null || ext === clip.tsv)) {
        const src = rangeStr(clip.range), cut = clip.cut;
        const sh = clip.range.r2 - clip.range.r1 + 1, sw = clip.range.c2 - clip.range.c1 + 1;
        const th = g.r2 - g.r1 + 1, tw = g.c2 - g.c1 + 1;
        // As in Excel, a selection that is a whole multiple of the copied block is filled with repeats of it.
        const tilesR = !cut && th > sh && th % sh === 0 ? th / sh : 1, tilesC = !cut && tw > sw && tw % sw === 0 ? tw / sw : 1;
        mutate(() => { for (let i = 0; i < tilesR; i++) for (let j = 0; j < tilesC; j++) wb.copy(clip.sheet, src, addr(g.r1 + i * sh, g.c1 + j * sw), { toSheet: s.name, cut }); });
        if (cut) clip = null;
      } else if (ext) {
        mutate(() => ext.replace(/\r/g, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1).forEach((line, i) => line.split('\t').forEach((t, j) => { if (g.r1 + i < ROWS && g.c1 + j < COLS) wb.setInput(s.name, addr(g.r1 + i, g.c1 + j), t); })));
      }
    }
    function clearSel(what) { const g = selNorm(); mutate(() => wb.clear(sheet().name, g, what)); }
    function fillSel(dir) {
      const g = selNorm();
      if (dir === 'down' && g.r2 > g.r1) mutate(() => wb.fill(sheet().name, rangeStr({ r1: g.r1, c1: g.c1, r2: g.r1, c2: g.c2 }), rangeStr(g)));
      else if (dir === 'down') { const r = g.r1; if (r > 0) mutate(() => wb.fill(sheet().name, rangeStr({ r1: r - 1, c1: g.c1, r2: r - 1, c2: g.c2 }), rangeStr({ r1: r, c1: g.c1, r2: r, c2: g.c2 }))); }
      else if (g.c2 > g.c1) mutate(() => wb.fill(sheet().name, rangeStr({ r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c1 }), rangeStr(g)));
      else if (g.c1 > 0) mutate(() => wb.fill(sheet().name, rangeStr({ r1: g.r1, c1: g.c1 - 1, r2: g.r2, c2: g.c1 - 1 }), rangeStr(g)));
    }
    function autoFill(src, target) {
      const s = sheet(); const vertical = target.r2 > src.r2 || target.r1 < src.r1;
      const h = src.r2 - src.r1 + 1, w = src.c2 - src.c1 + 1;
      mutate(() => {
        // Arithmetic series for 2+ numeric constants (dates are numbers too).
        const vecs = [];
        if (vertical) for (let c = src.c1; c <= src.c2; c++) vecs.push(Array.from({ length: h }, (_, i) => wb.raw(s, src.r1 + i, c)));
        else for (let r = src.r1; r <= src.r2; r++) vecs.push(Array.from({ length: w }, (_, i) => wb.raw(s, r, src.c1 + i)));
        const series = vecs.every((v) => v.length >= 2 && v.every((x) => typeof x === 'number'));
        if (!series || target.r1 < src.r1 || target.c1 < src.c1) { wb.fill(s.name, rangeStr(src), rangeStr(target)); return; }
        wb.fill(s.name, rangeStr(src), rangeStr(src));
        vecs.forEach((v, k) => {
          const step = v[v.length - 1] - v[v.length - 2];
          const count = vertical ? target.r2 - src.r2 : target.c2 - src.c2;
          for (let i = 1; i <= count; i++) { const val = v[v.length - 1] + step * i; if (vertical) { wb.setRaw(s.name, addr(src.r2 + i, src.c1 + k), val); const st = wb.style(s, src.r2, src.c1 + k); if (st) wb.format(s.name, addr(src.r2 + i, src.c1 + k), st); } else { wb.setRaw(s.name, addr(src.r1 + k, src.c2 + i), val); const st = wb.style(s, src.r1 + k, src.c2); if (st) wb.format(s.name, addr(src.r1 + k, src.c2 + i), st); } }
        });
      });
    }
    function currentRegion(r, c) {
      const s = sheet();
      const filled = (i, j) => i >= 0 && j >= 0 && i < ROWS && j < COLS && (wb.valueAt(s, i, j) !== null && wb.valueAt(s, i, j) !== '');
      let g = { r1: r, c1: c, r2: r, c2: c }, changed = true;
      while (changed) {
        changed = false;
        for (const [dr1, dc1, dr2, dc2] of [[-1, 0, 0, 0], [0, -1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {
          const n = { r1: g.r1 + dr1, c1: g.c1 + dc1, r2: g.r2 + dr2, c2: g.c2 + dc2 };
          if (n.r1 < 0 || n.c1 < 0 || n.r2 >= ROWS || n.c2 >= COLS) continue;
          let any = false;
          if (dr1) for (let j = n.c1 - 1; j <= n.c2 + 1; j++) if (filled(n.r1, j)) any = true;
          if (dc1) for (let i = n.r1 - 1; i <= n.r2 + 1; i++) if (filled(i, n.c1)) any = true;
          if (dr2) for (let j = n.c1 - 1; j <= n.c2 + 1; j++) if (filled(n.r2, j)) any = true;
          if (dc2) for (let i = n.r1 - 1; i <= n.r2 + 1; i++) if (filled(i, n.c2)) any = true;
          if (any) { g = n; changed = true; }
        }
      }
      return g;
    }
    api.currentRegion = currentRegion;

    // ---- keyboard -------------------------------------------------------------------------------------------------------------------------
    function jump(r, c, dr, dc) {
      const s = sheet(); const f = (i, j) => { const v = wb.valueAt(s, i, j); return v !== null && v !== ''; };
      let i = r + dr, j = c + dc;
      if (i < 0 || j < 0 || i >= ROWS || j >= COLS) return [r, c];
      if (f(r, c) && f(i, j)) { while (i + dr >= 0 && i + dr < ROWS && j + dc >= 0 && j + dc < COLS && f(i + dr, j + dc)) { i += dr; j += dc; } }
      else { while (i >= 0 && i < ROWS && j >= 0 && j < COLS && !f(i, j)) { i += dr; j += dc; } if (i < 0 || j < 0 || i >= ROWS || j >= COLS) { i = Math.max(0, Math.min(ROWS - 1, i - dr)); j = Math.max(0, Math.min(COLS - 1, j - dc)); } }
      return [i, j];
    }
    function toggle(key) {
      const g = selNorm(); const cur = wb.style(sheet(), anchor.r, anchor.c) || {};
      mutate(() => wb.format(sheet().name, g, { [key]: !cur[key] }));
    }
    $('gridScroll').addEventListener('keydown', (e) => {
      // The in-cell editor lives inside the grid, so its keys bubble up here; the editor already handled them.
      if (editing || (e.target && e.target.id === 'ced')) return;
      const mod = e.ctrlKey || e.metaKey, k = e.key;
      const cur = e.shiftKey ? { r: sel.r2, c: sel.c2 } : { r: anchor.r, c: anchor.c };
      const move = (dr, dc) => { let t; if (mod) t = jump(cur.r, cur.c, dr, dc); else t = [cur.r + dr, cur.c + dc]; select(t[0], t[1], e.shiftKey); };
      if (k === 'ArrowDown') { e.preventDefault(); move(1, 0); } else if (k === 'ArrowUp') { e.preventDefault(); move(-1, 0); } else if (k === 'ArrowLeft') { e.preventDefault(); move(0, -1); } else if (k === 'ArrowRight') { e.preventDefault(); move(0, 1); }
      else if (k === 'Enter') { e.preventDefault(); if (mod) return; select(anchor.r + (e.shiftKey ? -1 : 1), anchor.c); }
      else if (k === 'Tab') { e.preventDefault(); select(anchor.r, anchor.c + (e.shiftKey ? -1 : 1)); }
      else if (k === 'Home') { e.preventDefault(); select(mod ? 0 : cur.r, 0, e.shiftKey); } else if (k === 'PageDown') { e.preventDefault(); select(cur.r + 15, cur.c); } else if (k === 'PageUp') { e.preventDefault(); select(cur.r - 15, cur.c); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); clearSel({ contents: true }); }
      else if (k === 'F2') { e.preventDefault(); startEdit(); }
      else if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? api.redo() : api.undo(); } else if (mod && k.toLowerCase() === 'y') { e.preventDefault(); api.redo(); }
      else if (mod && k.toLowerCase() === 'c') { e.preventDefault(); doCopy(false); } else if (mod && k.toLowerCase() === 'x') { e.preventDefault(); doCopy(true); } else if (mod && k.toLowerCase() === 'v') { e.preventDefault(); doPaste(); }
      else if (mod && k.toLowerCase() === 'd') { e.preventDefault(); fillSel('down'); } else if (mod && k.toLowerCase() === 'r') { e.preventDefault(); fillSel('right'); }
      else if (mod && k.toLowerCase() === 'b') { e.preventDefault(); toggle('b'); } else if (mod && k.toLowerCase() === 'i') { e.preventDefault(); toggle('i'); } else if (mod && k.toLowerCase() === 'u') { e.preventDefault(); toggle('u'); }
      else if (mod && k.toLowerCase() === 'a') { e.preventDefault(); const u = sheet().used(); sel = { r1: 0, c1: 0, r2: Math.max(u.r2, 0), c2: Math.max(u.c2, 0) }; anchor = { r: 0, c: 0 }; placeOverlays(); }
      else if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); startEdit(k); }
    });
    const ced = () => $('ced');
    document.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.id === 'ced') {
        const el = document.activeElement;
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(e.shiftKey ? 'up' : 'down'); } else if (e.key === 'Tab') { e.preventDefault(); commitEdit('right'); } else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
        else if (e.key.startsWith('Arrow') && el.value.startsWith('=') === false && !e.shiftKey) { e.preventDefault(); const dr = e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowRight' ? 'right' : null; if (dr) commitEdit(dr); else if (e.key === 'ArrowLeft') { commitEdit(); select(anchor.r, anchor.c - 1); } }
      } else if (document.activeElement && document.activeElement.id === 'fin' && editing) {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); } else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      } else if (document.activeElement && document.activeElement.id === 'fin' && !editing && e.key === 'Enter') { e.preventDefault(); $('gridScroll').focus(); }
    }, true);
    document.addEventListener('input', (e) => {
      if (e.target.id === 'ced') $('fin').value = e.target.value;
      if (e.target.id === 'fin') { if (!editing) startEdit($('fin').value, true); else $('ced').value = $('fin').value; }
    });
    $('fin').addEventListener('focus', () => { if (!editing) startEdit(rawText(wb.raw(sheet(), anchor.r, anchor.c)) || $('fin').value, true); });
    $('nbox').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const t = $('nbox').value.trim();
      const g = parseRange(t);
      if (g && /^\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?$/.test(t)) { anchor = { r: g.r1, c: g.c1 }; sel = { r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2 }; placeOverlays(); $('gridScroll').focus(); return; }
      if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(t)) {
        const n = t.toUpperCase();
        if (wb.names[n]) { const gg = parseRange(wb.names[n]); anchor = { r: gg.r1, c: gg.c1 }; sel = { r1: gg.r1, c1: gg.c1, r2: gg.r2, c2: gg.c2 }; placeOverlays(); }
        else { const gs = selNorm(); mutate(() => wb.define(t, `${sheet().name}!${rangeStr({ r1: gs.r1, c1: gs.c1, r2: gs.r2, c2: gs.c2 }).split(':').map((a) => a.replace(/([A-Z]+)(\d+)/, '$$$1$$$2')).join(':')}`)); flash(`Named ${t}`); }
        $('gridScroll').focus();
      }
    });

    // ---- mouse ------------------------------------------------------------------------------------------------------------------------------
    const inner = $('gridInner');
    inner.addEventListener('mousedown', (e) => {
      const rz = e.target.closest('[data-rz]');
      if (rz) { const c = +rz.dataset.rz; drag = { kind: 'resize', c, x: e.clientX, w: colW(sheet(), c) }; e.preventDefault(); return; }
      if (e.target.closest('.fb')) return;
      if (e.target.closest('.chartbox')) {
        const box = e.target.closest('.chartbox');
        if (e.target.closest('.cx')) { const id = +box.dataset.id; mutate(() => { sheet().charts = sheet().charts.filter((c) => c.id !== id); }); return; }
        if (e.target.closest('.cdrag')) { const ch = sheet().charts.find((c) => c.id === +box.dataset.id); drag = { kind: 'chart', ch, box, x: e.clientX, y: e.clientY, ax: ch.anchor.x, ay: ch.anchor.y }; e.preventDefault(); }
        return;
      }
      if (e.target.id === 'fillH') { fillDrag = { src: selNorm() }; e.preventDefault(); return; }
      if (e.target.id === 'ced') return;
      const th = e.target.closest('th');
      if (th && th.dataset.all) { sel = { r1: 0, c1: 0, r2: ROWS - 1, c2: COLS - 1 }; anchor = { r: 0, c: 0 }; placeOverlays(); $('gridScroll').focus(); e.preventDefault(); return; }
      if (th && th.dataset.c !== undefined) { if (editing) commitEdit(); const c = +th.dataset.c; sel = e.shiftKey ? { r1: 0, c1: anchor.c, r2: ROWS - 1, c2: c } : { r1: 0, c1: c, r2: ROWS - 1, c2: c }; if (!e.shiftKey) anchor = { r: 0, c }; placeOverlays(); $('gridScroll').focus(); drag = { kind: 'cols' }; e.preventDefault(); return; }
      if (th && th.dataset.r !== undefined) { if (editing) commitEdit(); const r = +th.dataset.r; sel = { r1: r, c1: 0, r2: r, c2: COLS - 1 }; anchor = { r, c: 0 }; placeOverlays(); $('gridScroll').focus(); e.preventDefault(); return; }
      const td = e.target.closest('td');
      if (!td) return;
      const r = +td.dataset.r, c = +td.dataset.c;
      if (editing) {
        const el = editing.bar ? $('fin') : $('ced');
        const pos = el.selectionStart || 0;
        if (pointOk(el.value, pos)) {
          e.preventDefault();
          const ref = addr(r, c);
          el.setRangeText(ref, pos, el.selectionEnd || pos, 'end');
          $('fin').value = $('ced').value = el.value;
          drag = { kind: 'point', r, c, el, start: pos, from: ref };
          return;
        }
        commitEdit();
      }
      select(r, c, e.shiftKey);
      drag = { kind: 'select' };
      $('gridScroll').focus();
    });
    inner.addEventListener('dblclick', (e) => {
      const rz = e.target.closest('[data-rz]');
      if (rz) { const c = +rz.dataset.rz; const s = sheet(); let m = 4; for (let r = 0; r < ROWS; r++) m = Math.max(m, wb.display(s, r, c).length); mutate(() => { s.colW[c] = Math.max(48, Math.min(300, Math.round(m * 7.3 + 16))); }); return; }
      if (e.target.id === 'fillH') { const g = selNorm(); const s = sheet(); const lc = g.c1 > 0 ? g.c1 - 1 : g.c2 + 1; let r = g.r2; while (r + 1 < ROWS && wb.valueAt(s, r + 1, lc) !== null && wb.valueAt(s, r + 1, lc) !== '') r++; if (r > g.r2) autoFill(g, { r1: g.r1, c1: g.c1, r2: r, c2: g.c2 }); return; }
      const td = e.target.closest('td'); if (td && !e.target.closest('.fb')) { select(+td.dataset.r, +td.dataset.c); startEdit(); }
    });
    document.addEventListener('mousemove', (e) => {
      if (!drag && !fillDrag) return;
      if (drag && drag.kind === 'resize') { const w = Math.max(30, drag.w + e.clientX - drag.x); sheet().colW[drag.c] = w; const col = inner.querySelectorAll('col')[drag.c + 1]; if (col) col.style.width = w + 'px'; placeOverlays(); return; }
      if (drag && drag.kind === 'chart') { drag.ch.anchor.x = Math.max(0, drag.ax + e.clientX - drag.x); drag.ch.anchor.y = Math.max(0, drag.ay + e.clientY - drag.y); drag.box.style.left = drag.ch.anchor.x + 'px'; drag.box.style.top = drag.ch.anchor.y + 'px'; return; }
      const td = document.elementFromPoint(e.clientX, e.clientY);
      const cell = td && td.closest ? td.closest('td') : null;
      const hd = td && td.closest ? td.closest('th.ch') : null;
      if (drag && drag.kind === 'select' && cell) select(+cell.dataset.r, +cell.dataset.c, true);
      else if (drag && drag.kind === 'cols' && hd) { sel = { r1: 0, c1: anchor.c, r2: ROWS - 1, c2: +hd.dataset.c }; placeOverlays(); }
      else if (drag && drag.kind === 'point' && cell) { const ref = +cell.dataset.r === drag.r && +cell.dataset.c === drag.c ? addr(drag.r, drag.c) : `${addr(drag.r, drag.c)}:${addr(+cell.dataset.r, +cell.dataset.c)}`; drag.el.setRangeText(ref, drag.start, drag.start + drag.from.length, 'end'); drag.from = ref; $('fin').value = $('ced').value = drag.el.value; }
      else if (fillDrag && cell) { const s0 = fillDrag.src; const r = +cell.dataset.r, c = +cell.dataset.c; fillDrag.target = Math.abs(r - s0.r2) >= Math.abs(c - s0.c2) || c <= s0.c2 && r > s0.r2 ? { r1: s0.r1, c1: s0.c1, r2: Math.max(r, s0.r2), c2: s0.c2 } : { r1: s0.r1, c1: s0.c1, r2: s0.r2, c2: Math.max(c, s0.c2) }; sel = fillDrag.target; placeOverlays(); }
    });
    document.addEventListener('mouseup', () => {
      if (drag && (drag.kind === 'resize' || drag.kind === 'chart')) { undo.push(snap()); api.onChange(wb); }
      if (fillDrag && fillDrag.target) { const t = fillDrag.target, src = fillDrag.src; fillDrag = null; sel = src; autoFill(src, t); } else fillDrag = null;
      if (drag && drag.kind === 'point') { drag = null; return; }
      drag = null;
    });
    inner.addEventListener('click', (e) => {
      const fb = e.target.closest('.fb'); if (fb) { openFilter(+fb.dataset.fb, fb); return; }
      const ar = e.target.closest('.ar'); if (ar) return;
    });
    // validation dropdown arrow for a single selected cell
    function dvArrow() {
      const old = document.querySelector('.ar'); if (old) old.remove();
      const s = sheet(); if (!wb || editing) return;
      const rule = s.dv.find((x) => { const q = parseRange(x.range); return x.kind === 'list' && anchor.r >= q.r1 && anchor.r <= q.r2 && anchor.c >= q.c1 && anchor.c <= q.c2; });
      const td = cellEl(anchor.r, anchor.c);
      if (!rule || !td) return;
      const b = document.createElement('button'); b.className = 'ar'; b.textContent = '▼'; b.tabIndex = -1;
      b.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); const items = wb.dvItems(rule, s); const r = b.getBoundingClientRect(); popup(r.left - 120, r.bottom, items.map((it) => ({ label: XL.toStr(it), fn: () => mutate(() => wb.setRaw(s.name, addr(anchor.r, anchor.c), it)) }))); });
      td.appendChild(b);
    }
    const _place = placeOverlays;
    placeOverlays = function () { _place(); dvArrow(); };

    // ---- popups and dialogs ---------------------------------------------------------------------------------------------------------------------
    let popEl = null;
    function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
    document.addEventListener('mousedown', (e) => { if (popEl && !popEl.contains(e.target)) closePop(); }, true);
    function popup(x, y, items, html) {
      closePop();
      const el = document.createElement('div'); el.className = 'pop';
      el.style.left = Math.max(4, Math.min(x, window.innerWidth - 230)) + 'px'; el.style.top = Math.min(y + 2, window.innerHeight - 120) + 'px';
      if (html) el.innerHTML = html;
      else items.forEach((it) => { if (it === '-') { el.appendChild(document.createElement('hr')); return; } const b = document.createElement('button'); b.textContent = it.label; b.addEventListener('mousedown', (ev) => { ev.preventDefault(); closePop(); it.fn(); }); el.appendChild(b); });
      document.body.appendChild(el); popEl = el; return el;
    }
    function dialog(title, bodyHtml, onOk, okLabel) {
      $('dlg').innerHTML = `<h3>${esc(title)}</h3>${bodyHtml}<div class="ft"><button class="btn" id="dCancel">Cancel</button><button class="btn submit" id="dOk">${okLabel || 'OK'}</button></div>`;
      $('scrim').style.display = 'flex';
      const close = () => { $('scrim').style.display = 'none'; $('gridScroll').focus(); };
      $('dCancel').onclick = close;
      $('dOk').onclick = () => { const r = onOk(); if (r !== false) close(); };
      const first = $('dlg').querySelector('input,select'); if (first) first.focus();
      $('dlg').onkeydown = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); $('dOk').click(); } };
    }
    api.dialog = dialog;
    const val = (id) => $(id).value;
    const opts = (list, sel) => list.map((o) => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');

    // ---- filter popup ---------------------------------------------------------------------------------------------------------------------------------------
    function openFilter(col, anchorEl) {
      const s = sheet(); const g = parseRange(s.filter.ref);
      const vals = []; for (let r = g.r1 + 1; r <= g.r2; r++) { const v = wb.valueAt(s, r, col); if (!vals.some((x) => XL.cmp(x, v) === 0 && (x === null) === (v === null))) vals.push(v); }
      vals.sort((a, b) => XL.cmp(a, b));
      const cur = (s.filter.specs || []).find((x) => (typeof x.col === 'number' ? x.col : colIndex(x.col)) === col && x.kind === 'in');
      const rect = anchorEl.getBoundingClientRect();
      const html = `<button data-a="asc">Sort A to Z</button><button data-a="desc">Sort Z to A</button><hr><button data-a="gt">Number filter: greater than…</button><button data-a="clear">Clear filter</button><hr>` +
        vals.map((v, i) => `<label><input type="checkbox" data-i="${i}" ${!cur || cur.values.some((x) => XL.cmp(x, v) === 0) ? 'checked' : ''}>${esc(v === null ? '(Blanks)' : XL.toStr(v))}</label>`).join('') + '<hr><button data-a="ok" style="font-weight:600">OK</button>';
      const el = popup(rect.left - 80, rect.bottom, null, html);
      el.addEventListener('mousedown', (ev) => {
        const a = ev.target.closest('button'); if (!a) return;
        ev.preventDefault();
        const act = a.dataset.a;
        const specsNoCol = () => (s.filter.specs || []).filter((x) => (typeof x.col === 'number' ? x.col : colIndex(x.col)) !== col);
        if (act === 'asc' || act === 'desc') { closePop(); mutate(() => wb.sort(s.name, s.filter.ref, [{ col, desc: act === 'desc' }], true)); }
        else if (act === 'clear') { closePop(); mutate(() => { s.filter.specs = specsNoCol(); }); }
        else if (act === 'gt') { closePop(); dialog('Number filter', '<div class="f"><label>Is greater than</label><input type="text" id="fv"></div>', () => { const n = parseFloat(val('fv')); if (isNaN(n)) return false; mutate(() => { s.filter.specs = specsNoCol().concat([{ col, kind: 'op', op: '>', val: n }]); }); }); }
        else if (act === 'ok') { const checked = [...el.querySelectorAll('input:checked')].map((x) => vals[+x.dataset.i]); closePop(); mutate(() => { s.filter.specs = specsNoCol().concat(checked.length === vals.length ? [] : [{ col, kind: 'in', values: checked }]); }); }
      });
    }

    // ---- ribbon ---------------------------------------------------------------------------------------------------------------------------------------------------------
    const ico = {
      bold: '<b>B</b>', ital: '<i>I</i>', und: '<u>U</u>', left: '≡', ctr: '☰', right: '≣', wrap: '↵',
      border: '▦', pct: '%', comma: ',', dec1: '.00→', dec0: '←.0', sum: 'Σ', az: 'A↓Z', za: 'Z↓A', filter: '▼',
    };
    const RIBBONS = {
      Home: () => `
        <div class="grp"><div class="row"><button class="rb big" data-act="paste"><span style="font-size:18px">📋</span>Paste</button><div style="display:flex;flex-direction:column;gap:4px;margin-top:2px"><button class="rb" data-act="cut">✂ Cut</button><button class="rb" data-act="copy">⎘ Copy</button></div></div><div class="gl">Clipboard</div></div>
        <div class="grp"><div class="row" style="flex-direction:column;align-items:flex-start;gap:3px"><div style="display:flex;gap:2px"><button class="rb" data-act="b" data-k="b" title="Bold (Ctrl+B)">${ico.bold}</button><button class="rb" data-act="i" data-k="i" title="Italic (Ctrl+I)">${ico.ital}</button><button class="rb" data-act="u" data-k="u" title="Underline (Ctrl+U)">${ico.und}</button><button class="rb" data-act="border" data-k="border" title="All borders">${ico.border}</button></div><div style="display:flex;gap:2px"><button class="rb" data-act="fillc" title="Fill colour">🪣<span class="sw" id="swF" style="background:#FFEB9C"></span></button><button class="rb" data-act="fontc" title="Font colour">A<span class="sw" id="swC" style="background:#C00000"></span></button></div></div><div class="gl">Font</div></div>
        <div class="grp"><div class="row" style="display:grid;grid-template-columns:auto auto;gap:3px"><button class="rb" data-act="al" data-v="left" title="Align left">${ico.left}</button><button class="rb" data-act="al" data-v="center" title="Centre">${ico.ctr}</button><button class="rb" data-act="al" data-v="right" title="Align right">${ico.right}</button><button class="rb" data-act="wrap" data-k="wrap" title="Wrap text">${ico.wrap}</button></div><div class="gl">Alignment</div></div>
        <div class="grp"><div class="row" style="flex-direction:column;align-items:flex-start;gap:3px"><select class="rsel" id="nfmt" title="Number format"><option value="General">General</option><option value="0.00">Number</option><option value="$#,##0.00">Currency</option><option value="0%">Percentage</option><option value="0.00%">Percent 2 dp</option><option value="yyyy-mm-dd">Date yyyy-mm-dd</option><option value="dd-mmm-yyyy">Date dd-mmm-yyyy</option><option value="m/d/yyyy">Date m/d/yyyy</option><option value="h:mm">Time</option><option value="@">Text</option><option value="#,##0">Comma (0 dp)</option><option value="__custom">Custom…</option></select><div style="display:flex;gap:2px"><button class="rb" data-act="nf" data-v="$#,##0.00" title="Currency">$</button><button class="rb" data-act="nf" data-v="0%" title="Percent">${ico.pct}</button><button class="rb" data-act="nf" data-v="#,##0" title="Comma">${ico.comma}</button><button class="rb" data-act="dec" data-v="1" title="More decimals">${ico.dec1}</button><button class="rb" data-act="dec" data-v="-1" title="Fewer decimals">${ico.dec0}</button></div></div><div class="gl">Number</div></div>
        <div class="grp"><div class="row"><button class="rb big" data-act="cfmenu"><span style="font-size:17px">🎨</span>Conditional<br>Formatting ▾</button></div><div class="gl">Styles</div></div>
        <div class="grp"><div class="row"><button class="rb big" data-act="autosum"><span style="font-size:18px">${ico.sum}</span>AutoSum</button><button class="rb big" data-act="sortmenu"><span style="font-size:15px">${ico.az}</span>Sort &amp; Filter ▾</button><button class="rb big" data-act="clearmenu"><span style="font-size:16px">⌫</span>Clear ▾</button></div><div class="gl">Editing</div></div>`,
      Insert: () => `
        <div class="grp"><div class="row"><button class="rb big" data-act="pivot"><span style="font-size:18px">▦</span>PivotTable</button>${sheet().pivot ? '<button class="rb big" data-act="pivotedit"><span style="font-size:18px">✎</span>Edit<br>PivotTable</button><button class="rb big" data-act="pivotrefresh"><span style="font-size:18px">⟳</span>Refresh</button>' : '<button class="rb big" data-act="pivotrefresh"><span style="font-size:18px">⟳</span>Refresh<br>PivotTables</button>'}</div><div class="gl">Tables</div></div>
        <div class="grp"><div class="row"><button class="rb big" data-act="chart" data-v="column"><span style="font-size:18px">📊</span>Column</button><button class="rb big" data-act="chart" data-v="bar"><span style="font-size:18px">☰</span>Bar</button><button class="rb big" data-act="chart" data-v="line"><span style="font-size:18px">📈</span>Line</button><button class="rb big" data-act="chart" data-v="pie"><span style="font-size:18px">◔</span>Pie</button><button class="rb big" data-act="chart" data-v="area"><span style="font-size:18px">◭</span>Area</button><button class="rb big" data-act="chart" data-v="scatter"><span style="font-size:18px">∴</span>Scatter</button></div><div class="gl">Charts (select the data first)</div></div>`,
      Data: () => `
        <div class="grp"><div class="row"><button class="rb big" data-act="sortasc"><span style="font-size:15px">${ico.az}</span>Sort A→Z</button><button class="rb big" data-act="sortdesc"><span style="font-size:15px">${ico.za}</span>Sort Z→A</button><button class="rb big" data-act="sortdlg"><span style="font-size:15px">⇅</span>Sort…</button><button class="rb big${sheet().filter ? ' on' : ''}" data-act="filter"><span style="font-size:15px">${ico.filter}</span>Filter</button></div><div class="gl">Sort &amp; Filter</div></div>
        <div class="grp"><div class="row"><button class="rb big" data-act="dv"><span style="font-size:16px">✔</span>Data<br>Validation</button><button class="rb big" data-act="dedupe"><span style="font-size:16px">⧉</span>Remove<br>Duplicates</button></div><div class="gl">Data Tools</div></div>`,
      View: () => `
        <div class="grp"><div class="row"><button class="rb big" data-act="freeze" data-v="row"><span style="font-size:16px">⬓</span>Freeze<br>Top Row</button><button class="rb big" data-act="freeze" data-v="col"><span style="font-size:16px">◧</span>Freeze<br>First Column</button><button class="rb big" data-act="freeze" data-v="none"><span style="font-size:16px">▭</span>Unfreeze<br>Panes</button></div><div class="gl">Window</div></div>`,
    };
    let ribTab = 'Home';
    function renderRibbonState() {
      const tabs = $('ribtabs');
      tabs.innerHTML = Object.keys(RIBBONS).map((t) => `<button class="rt" role="tab" data-t="${t}" aria-selected="${t === ribTab}">${t}</button>`).join('');
      $('ribbon').innerHTML = RIBBONS[ribTab]();
      const st = wb ? wb.style(sheet(), anchor.r, anchor.c) || {} : {};
      document.querySelectorAll('.rb[data-k]').forEach((b) => b.classList.toggle('on', !!st[b.dataset.k]));
      const nf = $('nfmt'); if (nf) { const f = wb.fmtAt(sheet(), anchor.r, anchor.c) || 'General'; nf.value = [...nf.options].some((o) => o.value === f) ? f : 'General'; }
    }
    $('ribtabs').addEventListener('click', (e) => { const t = e.target.closest('.rt'); if (t) { ribTab = t.dataset.t; renderRibbonState(); } });
    $('ribbon').addEventListener('mousedown', (e) => { if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') e.preventDefault(); });
    $('ribbon').addEventListener('change', (e) => {
      if (e.target.id !== 'nfmt') return;
      const v = e.target.value;
      if (v === '__custom') { dialog('Custom number format', '<p class="note">Examples: 0.00 &nbsp; #,##0 &nbsp; 0.0% &nbsp; dd-mmm-yyyy &nbsp; $#,##0.00 &nbsp; 0.0"x"</p><div class="f"><label>Format code</label><input type="text" id="cfmt" value="0.00"></div>', () => { const code = val('cfmt').trim(); if (!code) return false; setFmt(code); }); return; }
      setFmt(v); $('gridScroll').focus();
    });
    const setFmt = (code) => { const g = selNorm(); mutate(() => wb.format(sheet().name, g, { fmt: code === 'General' ? null : code })); };
    const PALETTE = ['#000000', '#7F7F7F', '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0', '#FFFFFF', '#E6EEE3', '#FFC7CE', '#FFEB9C', '#C6EFCE', '#DDEBF7', '#E4DFEC', '#F8CBAD', '#D9D9D9', '#BFBFBF', '#F4B084', '#FFE699', '#A9D08E', '#9BC2E6', '#B4A7D6', '#F4CCCC'];
    function colorPop(btn, key) {
      const r = btn.getBoundingClientRect();
      const el = popup(r.left, r.bottom, null, `<div class="grid">${PALETTE.map((c) => `<i data-c="${c}" style="background:${c}"></i>`).join('')}</div><button data-c="">No ${key === 'fill' ? 'fill' : 'colour'}</button>`);
      el.addEventListener('mousedown', (e) => { const t = e.target.closest('[data-c]'); if (!t) return; e.preventDefault(); closePop(); const g = selNorm(); mutate(() => wb.format(sheet().name, g, { [key]: t.dataset.c || null })); });
    }
    function cfDialog(kind) {
      const g = selNorm();
      const L = { gt: 'Greater Than', lt: 'Less Than', eq: 'Equal To', between: 'Between', text: 'Text that Contains', dup: 'Duplicate Values', unique: 'Unique Values', top: 'Top 10 Items', bottom: 'Bottom 10 Items', above: 'Above Average', below: 'Below Average', formula: 'New Rule (formula)', scale: 'Colour Scale', bar: 'Data Bars' };
      const presets = [['fill:#FFC7CE|color:#9C0006', 'Light red fill with dark red text'], ['fill:#FFEB9C|color:#9C5700', 'Yellow fill with dark yellow text'], ['fill:#C6EFCE|color:#006100', 'Green fill with dark green text'], ['fill:#FFC7CE|color:', 'Light red fill'], ['fill:|color:#9C0006', 'Red text']];
      const needs = { gt: ['a'], lt: ['a'], eq: ['a'], between: ['a', 'b'], text: ['t'], top: ['n'], bottom: ['n'], formula: ['f'] }[kind] || [];
      dialog(L[kind], `<p class="note">Applies to ${rangeStr(g)}.</p><div class="f">${needs.includes('a') ? '<label>Value</label><input type="text" id="cfa">' : ''}${needs.includes('b') ? '<label>and</label><input type="text" id="cfb">' : ''}${needs.includes('t') ? '<label>Text</label><input type="text" id="cft">' : ''}${needs.includes('n') ? '<label>Number of items</label><input type="text" id="cfn" value="10">' : ''}${needs.includes('f') ? '<label>Formula</label><input type="text" id="cff" placeholder="=$F2=&quot;Late&quot;">' : ''}${kind === 'scale' || kind === 'bar' ? '' : `<label>Format</label><select id="cfs">${opts(presets)}</select>`}</div>`, () => {
        const rule = { range: rangeStr(g), kind };
        if (needs.includes('a')) { const v = val('cfa').trim(); if (v === '') return false; rule.a = isNaN(Number(v)) ? v : Number(v); }
        if (needs.includes('b')) { const v = val('cfb').trim(); if (v === '') return false; rule.b = Number(v); }
        if (needs.includes('t')) { rule.text = val('cft'); if (!rule.text) return false; }
        if (needs.includes('n')) rule.n = Math.max(1, parseInt(val('cfn'), 10) || 10);
        if (needs.includes('f')) { rule.formula = val('cff').trim(); if (!rule.formula) return false; }
        if ($('cfs')) { const st = {}; val('cfs').split('|').forEach((p) => { const [k, v] = p.split(':'); if (v) st[k] = v; }); rule.style = st; }
        if (kind === 'scale') rule.colors = ['#F8696B', '#FFEB84', '#63BE7B'];
        mutate(() => wb.addCF(sheet().name, rule));
      }, 'Apply');
    }
    function dvDialog() {
      const g = selNorm(); const s = sheet();
      const ex = s.dv.find((x) => { const q = parseRange(x.range); return anchor.r >= q.r1 && anchor.r <= q.r2 && anchor.c >= q.c1 && anchor.c <= q.c2; }) || {};
      dialog('Data Validation', `<p class="note">Applies to ${rangeStr(g)}.</p><div class="f"><label>Allow</label><select id="dvk">${opts([['any', 'Any value'], ['whole', 'Whole number'], ['decimal', 'Decimal'], ['list', 'List'], ['date', 'Date'], ['length', 'Text length'], ['custom', 'Custom']], ex.kind || 'any')}</select>
        <label>Data</label><select id="dvo">${opts([['between', 'between'], ['notbetween', 'not between'], ['eq', 'equal to'], ['ne', 'not equal to'], ['gt', 'greater than'], ['lt', 'less than'], ['ge', 'greater than or equal to'], ['le', 'less than or equal to']], ex.op || 'between')}</select>
        <label>Minimum / value</label><input type="text" id="dva" value="${esc(ex.a !== undefined ? ex.a : '')}"><label>Maximum</label><input type="text" id="dvb" value="${esc(ex.b !== undefined ? ex.b : '')}">
        <label>List source</label><input type="text" id="dvl" placeholder="Pen,Notebook,Bag  or  =$A$1:$A$5" value="${esc(ex.list || '')}"><label>Custom formula</label><input type="text" id="dvf" placeholder="=COUNTIF($A:$A,A2)=1" value="${esc(ex.formula || '')}"></div>
        <p class="note">Dates can be typed as 2024-01-31. For a list, separate items with commas or point to a range.</p>`, () => {
        const kind = val('dvk');
        mutate(() => {
          s.dv = s.dv.filter((x) => { const q = parseRange(x.range); return q.r2 < g.r1 || q.r1 > g.r2 || q.c2 < g.c1 || q.c1 > g.c2; });
          if (kind === 'any') return;
          const rule = { range: rangeStr(g), kind, allowBlank: true };
          if (kind === 'list') rule.list = val('dvl'); else if (kind === 'custom') rule.formula = val('dvf'); else { rule.op = val('dvo'); const a = val('dva').trim(), b = val('dvb').trim(); rule.a = a === '' || isNaN(Number(a)) ? a : Number(a); rule.b = b === '' || isNaN(Number(b)) ? b : Number(b); }
          wb.addDV(s.name, rule);
        });
      }, 'OK');
    }
    function sortDialog() {
      const s = sheet(); const g0 = selNorm(); const reg = g0.r1 === g0.r2 && g0.c1 === g0.c2 ? currentRegion(anchor.r, anchor.c) : g0;
      const heads = []; for (let c = reg.c1; c <= reg.c2; c++) heads.push([c, `${wb.display(s, reg.r1, c) || 'Column ' + colName(c)} (${colName(c)})`]);
      dialog('Sort', `<p class="note">Range ${rangeStr(reg)}. The first row is treated as the header.</p><div class="f"><label>Sort by</label><select id="s1">${opts(heads, anchor.c)}</select><label>Order</label><select id="o1">${opts([['asc', 'A to Z / smallest first'], ['desc', 'Z to A / largest first']])}</select><label>Then by</label><select id="s2">${opts([['', '(none)']].concat(heads))}</select><label>Order</label><select id="o2">${opts([['asc', 'A to Z / smallest first'], ['desc', 'Z to A / largest first']])}</select></div>`, () => {
        const keys = [{ col: +val('s1'), desc: val('o1') === 'desc' }]; if (val('s2') !== '') keys.push({ col: +val('s2'), desc: val('o2') === 'desc' });
        mutate(() => wb.sort(s.name, rangeStr(reg), keys, true));
      }, 'OK');
    }
    function pivotDialog(edit) {
      const s = sheet();
      const cfg = edit && s.pivot ? s.pivot : null;
      const srcSheet = cfg ? cfg.src.sheet : s.name;
      const g0 = selNorm();
      const reg = cfg ? parseRange(cfg.src.ref) : (g0.r1 === g0.r2 && g0.c1 === g0.c2 ? currentRegion(anchor.r, anchor.c) : g0);
      const ss = wb.sheet(srcSheet);
      const heads = []; for (let c = reg.c1; c <= reg.c2; c++) heads.push(XL.toStr(wb.valueAt(ss, reg.r1, c)));
      const none = [['', '(none)']].concat(heads.map((h) => [h, h]));
      const aggs = [['sum', 'Sum'], ['count', 'Count'], ['average', 'Average'], ['min', 'Min'], ['max', 'Max']];
      const c0 = cfg || {};
      const v0 = (c0.vals || [])[0] || {}, v1 = (c0.vals || [])[1] || {};
      dialog(edit ? 'Edit PivotTable' : 'Create PivotTable', `<p class="note">Source: ${esc(srcSheet)}!${rangeStr(reg)} (first row = field names).</p><div class="f">
        <label>Rows</label><select id="pr1">${opts(none, (c0.rows || [])[0])}</select><label>then</label><select id="pr2">${opts(none, (c0.rows || [])[1])}</select>
        <label>Columns</label><select id="pc">${opts(none, (c0.cols || [])[0])}</select>
        <label>Values</label><select id="pv1">${opts(none, v0.field)}</select><label>Summarise by</label><select id="pa1">${opts(aggs, v0.agg || 'sum')}</select>
        <label>2nd value</label><select id="pv2">${opts(none, v1.field)}</select><label>Summarise by</label><select id="pa2">${opts(aggs, v1.agg || 'sum')}</select>
        <label>Filter field</label><select id="pf">${opts(none, ((c0.filters || [])[0] || {}).field)}</select><label>Filter value</label><input type="text" id="pfv" placeholder="blank = all (comma-separate several)" value="${esc((((c0.filters || [])[0] || {}).values || []).join(', '))}"></div>
        <p class="note">With a Columns field, only the first value is used.</p>`, () => {
        const rows = [val('pr1'), val('pr2')].filter(Boolean), cols = val('pc') ? [val('pc')] : [];
        const vals = [{ field: val('pv1'), agg: val('pa1') }, { field: val('pv2'), agg: val('pa2') }].filter((v) => v.field);
        if (!vals.length) { flash('Choose a field for Values.'); return false; }
        const filters = val('pf') ? [{ field: val('pf'), values: val('pfv').split(',').map((x) => x.trim()).filter(Boolean).map((x) => (isNaN(Number(x)) ? x : Number(x))) }] : [];
        const target = edit && s.pivot ? s.name : 'PivotTable' + (wb.sheets.filter((x) => x.pivot).length + 1);
        mutate(() => { wb.addPivot({ src: { sheet: srcSheet, ref: rangeStr(reg) }, rows, cols, vals, filters, target }); si = wb.sheets.findIndex((x) => x.name === target); sel = { r1: 0, c1: 0, r2: 0, c2: 0 }; anchor = { r: 0, c: 0 }; });
      }, edit ? 'Update' : 'OK');
    }
    function addChart(type) {
      const g0 = selNorm(); const s = sheet();
      const reg = g0.r1 === g0.r2 && g0.c1 === g0.c2 ? currentRegion(anchor.r, anchor.c) : g0;
      if (reg.r2 === reg.r1 && reg.c2 === reg.c1) { flash('Select the data for the chart first.'); return; }
      dialog('Chart title', `<p class="note">${type[0].toUpperCase() + type.slice(1)} chart of ${s.name}!${rangeStr(reg)}.</p><div class="f"><label>Title</label><input type="text" id="ctitle" placeholder="Chart title"></div>`, () => {
        mutate(() => wb.addChart(s.name, { type, ref: rangeStr(reg), title: val('ctitle').trim(), anchor: undefined }));
      }, 'Insert');
    }
    function toggleFilter() {
      const s = sheet();
      if (s.filter) { mutate(() => { s.filter = null; }); return; }
      const g0 = selNorm(); const reg = g0.r1 === g0.r2 && g0.c1 === g0.c2 ? currentRegion(anchor.r, anchor.c) : g0;
      mutate(() => wb.setFilter(s.name, rangeStr(reg), []));
    }
    function sortCol(desc) {
      const s = sheet(); const reg = currentRegion(anchor.r, anchor.c);
      if (reg.r1 === reg.r2) { flash('Click inside the table you want to sort.'); return; }
      mutate(() => wb.sort(s.name, rangeStr(reg), [{ col: anchor.c, desc }], true));
    }
    function dedupe() {
      const s = sheet(); const g0 = selNorm(); const reg = g0.r1 === g0.r2 && g0.c1 === g0.c2 ? currentRegion(anchor.r, anchor.c) : g0;
      const seen = new Set(), keep = [];
      for (let r = reg.r1 + 1; r <= reg.r2; r++) { const row = []; for (let c = reg.c1; c <= reg.c2; c++) row.push(wb.raw(s, r, c)); const k = JSON.stringify(row.map((x) => (typeof x === 'string' ? x.toLowerCase() : x))); if (!seen.has(k)) { seen.add(k); keep.push(row); } }
      const removed = reg.r2 - reg.r1 - keep.length;
      mutate(() => { for (let r = reg.r1 + 1; r <= reg.r2; r++) for (let c = reg.c1; c <= reg.c2; c++) wb.setRaw(s.name, addr(r, c), null); keep.forEach((row, i) => row.forEach((v, j) => wb.setRaw(s.name, addr(reg.r1 + 1 + i, reg.c1 + j), v))); });
      flash(`${removed} duplicate row${removed === 1 ? '' : 's'} removed.`);
    }
    $('ribbon').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act, v = b.dataset.v, g = selNorm(), s = sheet();
      switch (act) {
        case 'paste': doPaste(); break; case 'cut': doCopy(true); break; case 'copy': doCopy(false); break;
        case 'b': case 'i': case 'u': case 'border': case 'wrap': toggle(b.dataset.k); break;
        case 'fillc': colorPop(b, 'fill'); break; case 'fontc': colorPop(b, 'color'); break;
        case 'al': mutate(() => wb.format(s.name, g, { align: v })); break;
        case 'nf': setFmt(v); break;
        case 'dec': { const cur = wb.fmtAt(s, anchor.r, anchor.c) || 'General'; let f = cur; const d = +v; if (/^General$/.test(f)) f = d > 0 ? '0.0' : '0'; else { const m = /(0|#)(\.(0+))?(%?)/.exec(f); if (m) { const n = (m[3] ? m[3].length : 0) + d; f = f.replace(m[0], m[1] + (n > 0 ? '.' + '0'.repeat(n) : '') + m[4]); } } setFmt(f); break; }
        case 'cfmenu': { const r = b.getBoundingClientRect(); popup(r.left, r.bottom, [{ label: 'Highlight: Greater Than…', fn: () => cfDialog('gt') }, { label: 'Highlight: Less Than…', fn: () => cfDialog('lt') }, { label: 'Highlight: Between…', fn: () => cfDialog('between') }, { label: 'Highlight: Equal To…', fn: () => cfDialog('eq') }, { label: 'Highlight: Text that Contains…', fn: () => cfDialog('text') }, { label: 'Highlight: Duplicate Values', fn: () => cfDialog('dup') }, '-', { label: 'Top 10 Items…', fn: () => cfDialog('top') }, { label: 'Bottom 10 Items…', fn: () => cfDialog('bottom') }, { label: 'Above Average', fn: () => cfDialog('above') }, { label: 'Below Average', fn: () => cfDialog('below') }, '-', { label: 'Colour Scale', fn: () => cfDialog('scale') }, { label: 'Data Bars', fn: () => cfDialog('bar') }, { label: 'New Rule (formula)…', fn: () => cfDialog('formula') }, '-', { label: 'Clear rules from selected cells', fn: () => mutate(() => { s.cf = s.cf.filter((x) => { const q = parseRange(x.range); return q.r2 < g.r1 || q.r1 > g.r2 || q.c2 < g.c1 || q.c1 > g.c2; }); }) }, { label: 'Clear rules from entire sheet', fn: () => mutate(() => { s.cf = []; }) }]); break; }
        case 'autosum': {
          const reg = g; let range = null;
          if (reg.r1 !== reg.r2 || reg.c1 !== reg.c2) { mutate(() => { for (let c = reg.c1; c <= reg.c2; c++) wb.setRaw(s.name, addr(reg.r2 + 1, c), `=SUM(${addr(reg.r1, c)}:${addr(reg.r2, c)})`); }); break; }
          let r = anchor.r - 1; while (r >= 0 && typeof wb.valueAt(s, r, anchor.c) === 'number') r--;
          if (r < anchor.r - 1) range = `${addr(r + 1, anchor.c)}:${addr(anchor.r - 1, anchor.c)}`;
          else { let c = anchor.c - 1; while (c >= 0 && typeof wb.valueAt(s, anchor.r, c) === 'number') c--; if (c < anchor.c - 1) range = `${addr(anchor.r, c + 1)}:${addr(anchor.r, anchor.c - 1)}`; }
          if (range) mutate(() => wb.setRaw(s.name, addr(anchor.r, anchor.c), `=SUM(${range})`)); else flash('Select a cell below or beside the numbers.');
          break;
        }
        case 'sortmenu': { const r = b.getBoundingClientRect(); popup(r.left, r.bottom, [{ label: 'Sort A to Z', fn: () => sortCol(false) }, { label: 'Sort Z to A', fn: () => sortCol(true) }, { label: 'Custom Sort…', fn: sortDialog }, '-', { label: 'Filter on / off', fn: toggleFilter }]); break; }
        case 'clearmenu': { const r = b.getBoundingClientRect(); popup(r.left, r.bottom, [{ label: 'Clear All', fn: () => clearSel({ contents: true, formats: true }) }, { label: 'Clear Formats', fn: () => clearSel({ formats: true }) }, { label: 'Clear Contents', fn: () => clearSel({ contents: true }) }]); break; }
        case 'pivot': pivotDialog(false); break; case 'pivotedit': pivotDialog(true); break;
        case 'pivotrefresh': mutate(() => wb.refreshPivots()); flash('PivotTables refreshed.'); break;
        case 'chart': addChart(v); break;
        case 'sortasc': sortCol(false); break; case 'sortdesc': sortCol(true); break; case 'sortdlg': sortDialog(); break; case 'filter': toggleFilter(); break;
        case 'dv': dvDialog(); break; case 'dedupe': dedupe(); break;
        case 'freeze': mutate(() => { s.freeze = v === 'row' ? { r: 1, c: 0 } : v === 'col' ? { r: 0, c: 1 } : { r: 0, c: 0 }; }); break;
      }
      if (!['paste', 'cfmenu', 'sortmenu', 'clearmenu', 'fillc', 'fontc'].includes(act)) $('gridScroll').focus();
    });

    // ---- sheet tabs ------------------------------------------------------------------------------------------------------------------------------------------------
    function renderTabs() {
      $('sheetbar').innerHTML = wb.sheets.map((s, i) => `<button class="stab" data-i="${i}" aria-selected="${i === si}">${esc(s.name)}</button>`).join('') + '<button id="addSheet" title="New sheet">+</button>';
    }
    $('sheetbar').addEventListener('click', (e) => {
      const t = e.target.closest('.stab'); if (t) { if (editing) commitEdit(); api.setSheet(+t.dataset.i); return; }
      if (e.target.id === 'addSheet') mutate(() => { wb.addSheet(); si = wb.sheets.length - 1; });
    });
    $('sheetbar').addEventListener('dblclick', (e) => {
      const t = e.target.closest('.stab'); if (!t) return;
      const s = wb.sheets[+t.dataset.i];
      dialog('Rename sheet', `<div class="f"><label>Name</label><input type="text" id="rn" value="${esc(s.name)}"></div>`, () => { const n = val('rn').trim(); if (!n || wb.sheet(n) && wb.sheet(n) !== s) return false; mutate(() => { const old = s.name; s.name = n; wb.sheets.forEach((x) => x.charts.forEach((c) => { if (c.sheet === old) c.sheet = n; })); }); });
    });
    $('scrim').addEventListener('mousedown', (e) => { if (e.target.id === 'scrim') $('scrim').style.display = 'none'; });
    api.cell = (r, c) => ({ sheet: sheet(), r, c });
    api.sheetIndex = () => si;
    api.selection = () => ({ sel: selNorm(), anchor });
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);

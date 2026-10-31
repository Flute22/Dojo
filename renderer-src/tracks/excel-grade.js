/* Dojo Excel: grading. A question's reference solution is run on a fresh copy of its workbook; the user's
   workbook is then compared with it for exactly the things the question asks about (its "chk" list). */
(function (root) {
  'use strict';
  const XL = root.DojoXL;
  const { parseRange, addr, toStr, cmp, isErr, formatValue, isFormula, KEY } = XL;

  /** Fresh workbook for a question (data only). */
  XL.makeStart = function (q) {
    const wb = new XL.Workbook();
    q.data(wb);
    wb.recalc();
    return wb;
  };
  XL.makeSolution = function (q) {
    const wb = XL.makeStart(q);
    q.sol(wb);
    wb.recalc();
    return wb;
  };

  const SPECIAL_KEYS = ['f', 'sheet', 'alt', 'exact', 'tol', 'uses', 'label'];
  const normFmt = (f) => String(f || 'General').replace(/\[\$([^\]\-]*)[^\]]*\]/g, '$1').replace(/"/g, '').replace(/_[)\s]/g, '').replace(/\s+/g, '').toLowerCase();
  const eqVal = (a, b, tol) => {
    if (a === '' ) a = null; if (b === '') b = null;
    if (a === null && b === null) return true;
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= (tol !== undefined ? tol : 1e-6 * Math.max(1, Math.abs(b)));
    if (isErr(a) && isErr(b)) return a.err === b.err;
    return a === b;
  };
  const show = (wb, s, r, c, v) => { const f = wb.fmtAt(s, r, c); return v === null || v === undefined ? '(blank)' : typeof v === 'string' ? '"' + v + '"' : formatValue(v, f); };
  const cells = (g) => { const out = []; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) out.push([r, c]); return out; };
  const bool = (x) => !!x;

  /** Returns [{ ok, label, msg, skipped }]. opts.fileMode: only values, formulas and number formats can be read. */
  XL.grade = function (q, user, opts) {
    const o = opts || {};
    const sol = o.sol || XL.makeSolution(q);
    user.recalc();
    const out = [];
    const main = q.main || sol.sheets[0].name;
    const add = (ok, label, msg, skipped) => out.push({ ok: !!ok, label, msg: ok ? '' : msg || '', skipped: !!skipped });

    (q.chk || []).forEach((raw) => {
      const spec = typeof raw === 'string' ? { v: raw } : raw;
      const sname = spec.sheet || main;
      const ss = sol.sheet(sname), us = user.sheet(sname);
      const label = spec.label;
      if (!ss) { add(false, 'config', 'Question setup error: no sheet ' + sname); return; }
      const need = (what) => { if (o.fileMode) { add(true, label || what, '', true); return true; } return false; };
      if (!us) { add(false, label || sname, `The sheet "${sname}" is missing.`); return; }

      if (spec.v) {
        const g = parseRange(spec.v);
        const bad = [], noF = [];
        cells(g).forEach(([r, c]) => {
          const e = sol.valueAt(ss, r, c), v = user.valueAt(us, r, c);
          if (!eqVal(v, e, spec.tol)) bad.push(`${addr(r, c)}: expected ${show(sol, ss, r, c, e)}, got ${show(user, us, r, c, v)}`);
          const sr = sol.raw(ss, r, c);
          if (spec.f && isFormula(sr) && !isFormula(user.raw(us, r, c))) noF.push(addr(r, c));
        });
        const name = label || `Values in ${spec.v}`;
        if (bad.length) add(false, name, bad.slice(0, 3).join('; ') + (bad.length > 3 ? `; and ${bad.length - 3} more` : ''));
        else if (noF.length) add(false, name, `${spec.v} has the right numbers, but they must come from formulas, not typed values (for example ${noF[0]}).`);
        else add(true, name);
        if (spec.uses) {
          const re = new RegExp(spec.uses, 'i');
          const missing = cells(g).filter(([r, c]) => isFormula(sol.raw(ss, r, c)) && !re.test(String(user.raw(us, r, c) || '')));
          add(!missing.length, `Uses ${spec.uses.replace(/\|/g, ' or ')}`, `The formulas in ${spec.v} should use ${spec.uses.replace(/\|/g, ' or ')}.`);
        }
      }
      if (spec.fmt) {
        const g = parseRange(spec.fmt);
        const alts = [].concat(spec.alt || []).map(normFmt);
        const bad = cells(g).filter(([r, c]) => { const e = normFmt(sol.fmtAt(ss, r, c)), u = normFmt(user.fmtAt(us, r, c)); return u !== e && !alts.includes(u); });
        add(!bad.length, label || `Number format of ${spec.fmt}`, `${addr(bad[0] && bad[0][0], bad[0] && bad[0][1])} should be formatted like "${sol.fmtAt(ss, ...(bad[0] || [0, 0])) || 'General'}" but is "${user.fmtAt(us, ...(bad[0] || [0, 0])) || 'General'}".`);
      }
      ['bold', 'italic', 'fill', 'color', 'align', 'border', 'underline', 'wrap'].forEach((k) => {
        if (!spec[k]) return;
        if (need(k)) return;
        const key = { bold: 'b', italic: 'i', fill: 'fill', color: 'color', align: 'align', border: 'border', underline: 'u', wrap: 'wrap' }[k];
        const g = parseRange(spec[k]);
        const bad = cells(g).filter(([r, c]) => { const e = (sol.style(ss, r, c) || {})[key], u = (user.style(us, r, c) || {})[key]; return spec.exact && (k === 'fill' || k === 'color' || k === 'align') ? e !== u : bool(e) !== bool(u); });
        const want = k === 'bold' ? 'bold' : k;
        add(!bad.length, label || `${want} on ${spec[k]}`, `${addr(...(bad[0] || [0, 0]))} should${(sol.style(ss, ...(bad[0] || [0, 0])) || {})[key] ? '' : ' not'} have ${want} formatting.`);
      });
      if (spec.cf) {
        if (need('Conditional formatting')) return;
        const g = parseRange(spec.cf);
        const a = sol.cfStyles(sname), b = user.cfStyles(sname);
        const bad = cells(g).filter(([r, c]) => { const x = a.get(KEY(r, c)), y = b.get(KEY(r, c)); return bool(x && (x.fill || x.color || x.b || x.bar)) !== bool(y && (y.fill || y.color || y.b || y.bar)); });
        add(!bad.length, label || `Conditional formatting on ${spec.cf}`, bad.length ? `${addr(...bad[0])} should${a.get(KEY(...bad[0])) ? '' : ' not'} be highlighted by your conditional formatting (${bad.length} cell${bad.length === 1 ? '' : 's'} differ).` : '');
      }
      if (spec.dv) {
        if (need('Data validation')) return;
        const g = parseRange(spec.dv);
        const sig = (wb, s, r, c) => {
          const rule = s.dv.find((x) => { const q2 = parseRange(x.range); return r >= q2.r1 && r <= q2.r2 && c >= q2.c1 && c <= q2.c2; });
          if (!rule) return null;
          const items = rule.kind === 'list' ? wb.dvItems(rule, s).map((x) => String(x).toLowerCase()).sort().join('|') : '';
          const nb = (x) => (x === undefined || x === null || x === '' ? '' : String(XL.toNum(x)));
          const op = rule.kind === 'list' || rule.kind === 'custom' ? '' : rule.op || 'between';
          return [rule.kind, op, rule.kind === 'custom' ? '' : nb(rule.a), rule.kind === 'custom' ? '' : nb(rule.b), items].join('/');
        };
        const bad = cells(g).filter(([r, c]) => sig(sol, ss, r, c) !== sig(user, us, r, c));
        add(!bad.length, label || `Data validation on ${spec.dv}`, `${addr(...(bad[0] || [0, 0]))} ${sig(user, us, ...(bad[0] || [0, 0])) ? 'has the wrong validation rule' : 'has no data validation'}. Check the type, the allowed values and the range.`);
      }
      if (spec.chart) {
        if (need('Chart')) return;
        // Charts may sit on any sheet (for example next to a PivotTable), so look across the whole workbook.
        const expCharts = [].concat(...sol.sheets.map((x) => x.charts)), userCharts = [].concat(...user.sheets.map((x) => x.charts));
        const exp = expCharts[spec.chart.index || 0];
        const grp = (t) => ({ column: 'bar', bar: 'barh', line: 'line', pie: 'pie', scatter: 'scatter', area: 'area' }[t] || t);
        const norm = (r) => String(r || '').replace(/\$/g, '').toUpperCase();
        const found = userCharts.find((c) => grp(c.type) === grp(exp.type) && norm(c.ref) === norm(exp.ref));
        const anyType = userCharts.find((c) => norm(c.ref) === norm(exp.ref));
        const titleOk = !spec.chart.title || (found && String(found.title || '').trim() !== '');
        add(!!found && titleOk, label || 'Chart', !userCharts.length ? 'Insert a chart for the data.' : !anyType ? `The chart should be built from ${exp.ref}.` : !found ? `The chart type should be "${exp.type}".` : 'Give the chart a title.');
      }
      if (spec.pivot) {
        if (need('PivotTable')) return;
        const ep = sol.sheets.find((s) => s.pivot), up = user.sheets.find((s) => s.pivot);
        const sigp = (p) => JSON.stringify({ src: String(p.src.ref).replace(/\$/g, ''), rows: p.rows || [], cols: p.cols || [], vals: (p.vals || []).map((v) => [v.field, v.agg || 'sum']), filters: (p.filters || []).map((f) => f.field), });
        add(!!up && sigp(ep.pivot) === sigp(up.pivot), label || 'PivotTable', !up ? 'Insert a PivotTable (Insert tab).' : 'The PivotTable has different fields. Check Rows, Columns, Values and how each value is summarised.');
      }
      if (spec.filter) {
        if (need('Filter')) return;
        const a = [...ss.filteredRows].sort().join(), b = [...us.filteredRows].sort().join();
        add(a === b && !!us.filter, label || 'Filter', !us.filter ? 'Turn on a filter (Data tab) and apply the condition.' : 'The filter shows different rows from the expected ones.');
      }
      if (spec.freeze) { if (need('Freeze panes')) return; add(ss.freeze.r === us.freeze.r && ss.freeze.c === us.freeze.c, label || 'Freeze panes', `Freeze ${ss.freeze.r} row(s) and ${ss.freeze.c} column(s) (View menu).`); }
      if (spec.name) {
        if (need('Defined name')) return;
        const n = spec.name.toUpperCase(); const nr = (x) => String(x || '').replace(/\$/g, '').toUpperCase();
        add(nr(user.names[n]) === nr(sol.names[n]), label || `Name ${spec.name}`, `Define the name ${spec.name} for ${nr(sol.names[n])}.`);
      }
      if (spec.exists) add(!!user.sheet(spec.exists), label || `Sheet ${spec.exists}`, `Add a sheet named "${spec.exists}".`);
    });
    // Hidden test cases (LeetCode-style questions): the same workbook with different input data. The user's formulas
    // must recompute to what the reference solution gives on that data, so typed-in answers and sloppy ranges fail.
    const hid = o.noHidden ? [] : q.hidden || [];
    if (hid.length && out.every((x) => x.ok)) {
      hid.forEach((patch, i) => {
        const label = 'Hidden test case ' + (i + 2) + ' of ' + (hid.length + 1);
        let su, uu;
        try { su = sol.clone(); uu = user.clone(); patch(su); patch(uu); su.recalc(); uu.recalc(); } catch (e) { add(false, label, 'Could not run this test case: ' + e.message); return; }
        const bad = [];
        (q.chk || []).forEach((raw) => {
          const spec = typeof raw === 'string' ? { v: raw } : raw;
          if (!spec.v) return;
          const sn = spec.sheet || main, ss = su.sheet(sn), us = uu.sheet(sn);
          if (!ss || !us) return;
          cells(parseRange(spec.v)).forEach(([r, c]) => {
            const e = su.valueAt(ss, r, c), v = uu.valueAt(us, r, c);
            if (!eqVal(v, e, spec.tol)) bad.push((sn !== main ? sn + '!' : '') + addr(r, c) + ': expected ' + show(su, ss, r, c, e) + ', got ' + show(uu, us, r, c, v));
          });
        });
        add(!bad.length, label, 'Your answer matched the example but not this hidden dataset, so the formulas do not work in general (a typed value, a range that is too short, or a wrong rule). ' + bad.slice(0, 2).join('; ') + (bad.length > 2 ? '; and ' + (bad.length - 2) + ' more' : ''));
      });
    }
    out.ok = out.every((x) => x.ok);
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);

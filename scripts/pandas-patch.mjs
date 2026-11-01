// Shared by prepare-renderer.mjs and build-pandas-lc.mjs: teaches the Pandas engine about hidden test cases.
// A problem may carry hidden: [{ setup, expected }]. After the visible example passes, the user's solve() is
// run again on each hidden setup and compared with that case's expected table.
export const JUDGE = `
def _judge(value, req):
    opts = {"ignoreOrder": bool(req.get("ignoreOrder")), "checkDtype": bool(req.get("checkDtype"))}
    hidden = req.get("hidden") or []
    v = _compare(value, req["expected"], opts)
    if not hidden: return v
    total = 1 + len(hidden)
    if not v["ok"]:
        v["reason"] = f"Wrong Answer on the example (test case 1 of {total}). " + v["reason"]
        return v
    for i, h in enumerate(hidden):
        req2 = dict(req)
        req2["setup"] = h["setup"]
        val2, res2 = _call(req2)
        if "error" in res2:
            e = res2["error"]
            return {"ok": False, "reason": f"Runtime Error on hidden test case {i + 2} of {total}: {e['type']}: {e['message']}"}
        v2 = _compare(val2, h["expected"], opts)
        if not v2["ok"]:
            v2["reason"] = f"Wrong Answer on hidden test case {i + 2} of {total} (the example passed). " + v2["reason"]
            return v2
    return {"ok": True, "cases": total}

def _txt(obj, n=15):
    try:
        if isinstance(obj, pd.Series): obj = obj.to_frame()
        if isinstance(obj, pd.DataFrame):
            s = obj.head(n).to_string(max_cols=12, max_colwidth=26)
            if len(obj) > n: s += chr(10) + "... " + str(len(obj) - n) + " more rows"
            return s
        return repr(obj)[:600]
    except Exception:
        return repr(obj)[:600]

def _cases(req, value0, res0):
    opts = {"ignoreOrder": bool(req.get("ignoreOrder")), "checkDtype": bool(req.get("checkDtype"))}
    specs = [{"setup": req["setup"], "expected": req["expected"], "hidden": False}] + [{"setup": h["setup"], "expected": h["expected"], "hidden": True} for h in (req.get("hidden") or [])]
    out = []
    for i, c in enumerate(specs):
        if i == 0:
            value, res = value0, res0
        else:
            r2 = dict(req)
            r2["setup"] = c["setup"]
            value, res = _call(r2)
        item = {"n": i + 1, "hidden": c["hidden"], "setup": c["setup"], "expected": _txt(_expected(c["expected"]))}
        if "error" in res:
            e = res["error"]
            item.update(ok=False, status="Runtime Error", error=e["type"] + ": " + e["message"] + (" (line " + str(e["line"]) + ")" if e.get("line") else ""))
        else:
            cmp = _compare(value, c["expected"], opts)
            item.update(ok=bool(cmp["ok"]), status="Accepted" if cmp["ok"] else "Wrong Answer", reason=cmp.get("reason", ""), got=_txt(value))
        out.append(item)
    return out

def _dojo_exec(req_json):`;

const DEF = 'def _dojo_exec(req_json):';
const OLD = 'res["verdict"] = _compare(value, req["expected"], {"ignoreOrder": bool(req.get("ignoreOrder")), "checkDtype": bool(req.get("checkDtype"))})';

/** text: the engine source (LF line endings). Returns the patched engine source. */
export function patchEngineText(text) {
  if (text.split(DEF).length !== 2 || text.split(OLD).length !== 2) throw new Error('Engine changed; review pandas-patch.mjs.');
  const RET = '        return json.dumps(res, default=str)\n    except Exception as e:\n        return json.dumps({"internal"';
  if (text.split(RET).length !== 2) throw new Error('Engine return changed; review pandas-patch.mjs.');
  return text.replace(DEF, () => JUDGE.trim()).replace(OLD, () => 'res["verdict"] = _judge(value, req)')
    .replace(RET, () => '        if req.get("showCases"):\n            res["cases"] = _cases(req, value, res)\n' + RET);
}

/** The two places in the page that send a problem to the engine pass the hidden cases along. */
export function patchTemplateText(template) {
  const from = 'expected: p.expected, ignoreOrder';
  if (template.split(from).length !== 3) throw new Error('Expected two submit calls in the template; review pandas-patch.mjs.');
  let t = template.split(from).join('expected: p.expected, hidden: p.hidden, ignoreOrder');
  // Run and Submit ask for the per-test-case results (the bank check does not need them).
  const run = 'const r = await E.exec({ mode: kind, setup: p.setup, code, call: p.call, expected: p.expected, hidden: p.hidden,';
  if (t.split(run).length !== 2) throw new Error('Run call not found in the template; review pandas-patch.mjs.');
  t = t.replace(run, () => run + ' showCases: true,');
  // data for the panel
  const DATA = 'conHasTable: !!outTable, out: outTable || { cols: [], rows: [] },';
  if (t.split(DATA).length !== 2) throw new Error('Console data not found in the template; review pandas-patch.mjs.');
  const dataAdd = [
    "casesShow: !!(r && r.cases && r.cases.length) && !v,",
    "casesSummary: r && r.cases ? 'Test cases · ' + r.cases.filter((c) => c.ok).length + ' of ' + r.cases.length + ' passed' : '',",
    "cases: r && r.cases ? r.cases.map((c) => ({",
    "  status: c.status, label: c.hidden ? 'Hidden test case ' + c.n : 'Example test case 1',",
    "  bg: c.ok ? 'var(--sage-tint)' : 'var(--terra-tint)', color: c.ok ? 'var(--sage-ink)' : 'var(--terra)',",
    "  showDetail: !c.hidden || !c.ok, hasReason: !!c.reason, reason: c.reason || '', input: c.setup,",
    "  output: c.error ? c.error : c.got, expected: c.expected,",
    "})) : [],",
  ].join('\n      ');
  t = t.replace(DATA, () => DATA + '\n      ' + dataAdd);
  // the panel itself, just above the problem-bank section
  const PANEL_AT = '          <sc-if value="{{ valShow }}">';
  if (t.split(PANEL_AT).length !== 2) throw new Error('Console panel anchor not found in the template; review pandas-patch.mjs.');
  const pre = "margin:0;padding:8px 10px;border-radius:8px;background:var(--sunk);font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:19px;overflow:auto;white-space:pre;max-height:220px";
  const lab = 'font-size:11.5px;font-weight:600;color:var(--muted);margin:0 0 4px';
  const panel = [
    '          <sc-if value="{{ casesShow }}">',
    '            <div style="display:flex;flex-direction:column;gap:8px">',
    '              <div style="font-size:13.5px;font-weight:600">{{ casesSummary }}</div>',
    '              <sc-for list="{{ cases }}" as="tc" hint-placeholder-count="0">',
    '                <div style="border:1px solid var(--line);border-radius:10px;overflow:hidden">',
    '                  <div style="display:flex;align-items:baseline;gap:10px;padding:8px 12px;background:{{ tc.bg }}"><strong style="font-weight:600;color:{{ tc.color }}">{{ tc.status }}</strong><span style="font-size:12.5px;color:var(--muted)">{{ tc.label }}</span></div>',
    '                  <sc-if value="{{ tc.showDetail }}">',
    '                    <div style="padding:10px 12px;display:flex;flex-direction:column;gap:8px">',
    '                      <sc-if value="{{ tc.hasReason }}"><div style="font-size:12.5px;line-height:1.55">{{ tc.reason }}</div></sc-if>',
    '                      <div><div style="' + lab + '">Input</div><pre style="' + pre + '">{{ tc.input }}</pre></div>',
    '                      <div><div style="' + lab + '">Your output</div><pre style="' + pre + '">{{ tc.output }}</pre></div>',
    '                      <div><div style="' + lab + '">Expected output</div><pre style="' + pre + '">{{ tc.expected }}</pre></div>',
    '                    </div>',
    '                  </sc-if>',
    '                </div>',
    '              </sc-for>',
    '            </div>',
    '          </sc-if>',
    '',
  ].join('\n');
  t = t.replace(PANEL_AT, () => panel + PANEL_AT);
  return t;
}

// ---- Smarter Enter (auto-indent) for the Python editor -----------------------------------------------------------------
const ENTER_OLD = String.raw`    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const line = v.slice(lineStart, s);
      let ind = (line.match(/^ */) || [''])[0];
      if (/:\s*(#.*)?$/.test(line)) ind += '    ';
      else if (/^\s*(return|pass|break|continue|raise)\b/.test(line)) ind = ind.slice(4);
      insert(ta, '\n' + ind);
      return true;
    }`;
const ENTER_NEW = String.raw`    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const line = v.slice(lineStart, s);
      let afterEnd = v.indexOf('\n', s); if (afterEnd < 0) afterEnd = v.length;
      const rest = v.slice(s, afterEnd);
      const base = (line.match(/^[ \t]*/) || [''])[0];
      // Look at the code only: blank out strings and drop the comment, so a ':' or a bracket inside them is ignored.
      let code = '', q = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) { if (ch === '\\') i++; else if (ch === q) q = ''; code += ' '; continue; }
        if (ch === '#') break;
        if (ch === '"' || ch === "'") { q = ch; code += ' '; continue; }
        code += ch;
      }
      code = code.replace(/\s+$/, '');
      const depth = (code.match(/[(\[{]/g) || []).length - (code.match(/[)\]}]/g) || []).length;
      const last = code.slice(-1);
      const pair = { '(': ')', '[': ']', '{': '}' };
      if (pair[last] && rest.replace(/^[ \t]+/, '')[0] === pair[last]) {
        // caret sits between a bracket pair: open an indented line and keep the closing bracket on its own line
        insert(ta, '\n' + base + '    ' + '\n' + base);
        const c = s + 1 + base.length + 4; ta.setSelectionRange(c, c);
        return true;
      }
      let ind = base;
      if (depth > 0 || (depth === 0 && (last === ':' || last === '\\'))) ind += '    ';
      else if (depth === 0 && /^\s*(return|pass|break|continue|raise)\b/.test(code)) ind = base.replace(/(\t| {1,4})$/, '');
      insert(ta, '\n' + ind);
      return true;
    }`;
export function patchEditorText(text) {
  if (text.split(ENTER_OLD).length !== 2) throw new Error('Editor changed; review pandas-patch.mjs (Enter handler).');
  return text.replace(ENTER_OLD, () => ENTER_NEW);
}

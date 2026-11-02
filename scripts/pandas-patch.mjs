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
  return patchTraceText(text.replace(DEF, () => JUDGE.trim())
    .replace(OLD, () => 'res["verdict"] = _judge(value, req)')
    .replace(RET, () => '        if req.get("showCases"):\n            res["cases"] = _cases(req, value, res)\n' + RET));
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
  return patchCaseStudyText(patchVisualizeText(patchTabsText(patchCopyText(patchThemeText(t)))));
}

// ---- third theme: Midnight (approved) ---------------------------------------------------------------
// The page shipped with one light and one dark palette and a button that flips between them. This adds a
// second dark palette and turns the button into a three-way cycle: day -> night -> midnight -> day.
// The track pages (SQL, Excel) only see colorScheme on <html>, which stays "dark" for both dark themes,
// so they also get data-dojo-theme to tell the two apart.
export const MIDNIGHT = {
  '--bg': '#14161F', '--panel': '#1B1E2B', '--sunk': '#222638', '--line': '#2E3348',
  '--text': '#D6DAEA', '--muted': '#99A0BC', '--faint': '#6E7592',
  '--sage': '#9FD6B4', '--sage-ink': '#A9DEBE', '--sage-tint': '#1B2A26',
  '--slate': '#8AB4F8', '--slate-ink': '#4A62AE', '--slate-text': '#A9C6F9', '--slate-tint': '#1C2438',
  '--sand': '#E3C88B', '--sand-tint': '#2A2435', '--sand-ink': '#EBD3A0',
  '--terra': '#F0A2A2', '--terra-tint': '#2E2030',
  '--editor': '#10121A', '--gutter': '#161923',
  '--stripe': 'rgba(255,255,255,.022)', '--shadow': 'rgba(0,0,0,.35)', '--scrim': 'rgba(20,22,31,.95)',
  '--syn-p': '#D6DAEA', '--syn-k': '#8AB4F8', '--syn-s': '#9FD6B4', '--syn-n': '#E3C88B',
  '--syn-c': '#6E7592', '--syn-b': '#86DBD4', '--syn-f': '#E8EBF7', '--syn-d': '#F0A2A2',
};

/** The palette as a `static MIDNIGHT = {...};` line for the page's own component class. */
const midnightStatic = '  static MIDNIGHT = { '
  + Object.entries(MIDNIGHT).map(([k, v]) => `'${k}': '${v}'`).join(', ') + ' };\n';

export function patchThemeText(t) {
  const one = (from, label) => {
    if (t.split(from).length !== 2) throw new Error(`Expected exactly one ${label} in the template; review pandas-patch.mjs.`);
  };
  // 1. the palette, next to the two the page already has
  const afterDark = "'--syn-d': '#D39D88' };\n";
  one(afterDark, 'DARK palette');
  t = t.replace(afterDark, () => afterDark + midnightStatic);
  // 2. pick the palette by name, and publish the choice for the track pages
  const pick = "    const vars = this.state.theme === 'dark' ? Component.DARK : Component.LIGHT;";
  one(pick, 'palette pick');
  t = t.replace(pick, () => [
    "    const palettes = { light: Component.LIGHT, dark: Component.DARK, midnight: Component.MIDNIGHT };",
    "    const vars = palettes[this.state.theme] || Component.LIGHT;",
  ].join('\n'));
  const scheme = "    document.documentElement.style.colorScheme = this.state.theme;";
  one(scheme, 'colorScheme write');
  t = t.replace(scheme, () => [
    "    document.documentElement.style.colorScheme = this.state.theme === 'light' ? 'light' : 'dark';",
    "    document.documentElement.setAttribute('data-dojo-theme', this.state.theme);",
  ].join('\n'));
  // 3. the button cycles through the three
  const toggle = "    const theme = this.state.theme === 'dark' ? 'light' : 'dark';";
  one(toggle, 'theme toggle');
  t = t.replace(toggle, () => "    const order = ['light', 'dark', 'midnight'];\n"
    + "    const theme = order[(order.indexOf(this.state.theme) + 1) % order.length];");
  // 4. the label says what the next press will do; the moon icon shows for both dark themes
  const label = "isDark: s.theme === 'dark', isLight: s.theme !== 'dark', themeLabel: s.theme === 'dark' ? 'Switch to day mode' : 'Switch to night study mode',";
  one(label, 'theme label');
  t = t.replace(label, () => "isDark: s.theme !== 'light', isLight: s.theme === 'light', "
    + "themeLabel: s.theme === 'light' ? 'Switch to night study mode' : (s.theme === 'dark' ? 'Switch to midnight mode' : 'Switch to day mode'),");
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
  return patchShortcutsText(text.replace(ENTER_OLD, () => ENTER_NEW));
}

// ---- copy buttons (approved) -------------------------------------------------------------------------
// Two buttons in the problem header. "Copy question" puts the problem on the clipboard as Markdown so it
// can be pasted into an AI chat; "Copy + my code" adds the editor's code and the grading result, so the
// AI sees the attempt and the failing case too. The page already has copy(text, key) with its own
// "Copied" feedback, so both reuse that. No literal backticks below: the page source is JSON-encoded in
// the bundle, so fences are written as ` escapes that the page's own parser turns back into text.
const COPY_METHODS = String.raw`  mdFence(lang) { return String.fromCharCode(96, 96, 96) + (lang || ''); }
  mdTable(t, limit) {
    if (!t || !t.columns || !t.rows) return '(no table)';
    const shown = t.rows.slice(0, limit);
    const cell = (v) => (v === null || v === undefined ? 'NaN' : String(v));
    const out = ['| ' + t.columns.join(' | ') + ' |', '| ' + t.columns.map(() => '---').join(' | ') + ' |'];
    shown.forEach((r) => out.push('| ' + r.map(cell).join(' | ') + ' |'));
    if (t.rows.length > shown.length) out.push('_... and ' + (t.rows.length - shown.length) + ' more rows_');
    return out.join('\n');
  }
  questionMd(p) {
    const F = this.mdFence;
    return [
      '## Problem ' + p.id + ': ' + p.title,
      '',
      '- Track: Pandas (pandas and NumPy, no other libraries)',
      '- Difficulty: ' + p.difficulty,
      '- Tags: ' + ((p.tags || []).join(', ') || 'none'),
      '- Row order: ' + (p.ignoreOrder ? 'does not matter' : 'matters, sort as the task says'),
      '',
      '### Story',
      p.story,
      '',
      '### Task',
      p.task,
      ...(p.measure && p.measure.length ? ['', '### How this is measured', ...p.measure.map((m) => '- ' + m)] : []),
      '',
      '### Input tables (already defined; do not rebuild them)',
      F('python'),
      p.setup,
      F(),
      '',
      '### Required signature',
      F('python'),
      p.signature || p.call,
      F(),
      '',
      '### Expected result for the example above',
      this.mdTable(p.expected, 12),
      '',
      'Return a DataFrame with a default 0..n-1 index (reset_index) and exactly these columns.',
    ].join('\n');
  }
  resultMd() {
    const F = this.mdFence;
    const r = this.state.result;
    if (!r) return 'Not run yet.';
    if (r.notReady) return 'The Python engine was not ready, so nothing ran.';
    if (r.timeout) return 'The code timed out.';
    if (r.error) {
      return 'It raised an error: ' + (r.error.type || 'Error') + ': ' + (r.error.message || '')
        + (r.error.line ? ' (line ' + r.error.line + ')' : '');
    }
    const v = r.verdict;
    const out = [];
    if (!v) out.push('Ran without grading (Run rather than Submit).');
    else if (v.ok) out.push('Accepted: every test case passed.');
    else {
      out.push('Rejected: ' + (v.reason || 'the answer did not match.'));
      if (v.diff) {
        out.push('First difference: row ' + v.diff.row + ', column "' + v.diff.column
          + '" - expected ' + v.diff.expected + ', got ' + v.diff.got + '.');
      }
    }
    const bad = (r.cases || []).filter((c) => !c.ok);
    if (bad.length) {
      const c = bad[0];
      out.push('', '### The case it fails', c.hidden ? 'Hidden test case ' + c.n + ' (its data is not shown in the app).' : 'The visible example.');
      if (c.reason) out.push('', c.reason);
      out.push('', 'Input:', F('python'), String(c.setup), F(), '', 'My output:', F(), String(c.error || c.got), F(), '', 'Expected:', F(), String(c.expected), F());
    }
    return out.join('\n');
  }
  copyAsk() {
    const r = this.state.result;
    if (!r) return 'I have not run this yet. Walk me through how to approach it, without writing the whole solution for me.';
    if (r.error) return 'Explain what this error means and what in my code caused it, before giving me corrected code.';
    const v = r.verdict;
    if (v && v.ok) return 'This passed. Tell me whether the approach is idiomatic, and whether there is a simpler or faster way.';
    return 'Explain what is wrong and why, before giving me corrected code.';
  }
  attemptMd(p) {
    const F = this.mdFence;
    const ta = this.editorRef.current;
    const code = ta ? ta.value : this.loadCode(p);
    return [
      this.questionMd(p),
      '',
      '### My code',
      F('python'),
      code,
      F(),
      '',
      '### What happened when I submitted it',
      this.resultMd(),
      '',
      this.copyAsk(),
    ].join('\n');
  }
`;

export function patchCopyText(t) {
  const one = (from, label) => {
    if (t.split(from).length !== 2) throw new Error(`Expected exactly one ${label} in the template; review pandas-patch.mjs.`);
  };
  // 1. the Markdown builders, next to the copy helper they reuse
  const helper = '  copy(text, key) {';
  one(helper, 'copy helper');
  t = t.replace(helper, () => COPY_METHODS + helper);
  // 2. the handlers and labels on the problem view-model, plus harmless defaults for the empty state
  const vm = 'heading: `${p.id}. ${p.title}`, difficulty: p.difficulty, diffBg: d.bg, diffColor: d.color,';
  one(vm, 'problem view-model');
  t = t.replace(vm, () => vm + '\n'
    + "      copyQ: () => this.copy(this.questionMd(p), 'q' + p.id), copyQLabel: s.copied === 'q' + p.id ? 'Copied' : 'Copy question',\n"
    + "      copyA: () => this.copy(this.attemptMd(p), 'a' + p.id), copyALabel: s.copied === 'a' + p.id ? 'Copied' : 'Copy + my code',");
  const empty = "} : { heading: '', tags: [], orderNote: '', orderBg: 'transparent' };";
  one(empty, 'empty problem view-model');
  t = t.replace(empty, () => "} : { heading: '', tags: [], orderNote: '', orderBg: 'transparent',"
    + " copyQ: () => {}, copyQLabel: 'Copy question', copyA: () => {}, copyALabel: 'Copy + my code' };");
  // 3. the buttons themselves: on the badges row, pushed right, where there is room for text labels.
  //    The title row is already crowded with the drawer, the heading, the solved pill and the arrows.
  const badges = '          <sc-for list="{{ p.tags }}" as="tg" hint-placeholder-count="1"><span style="font-size:12px;padding:3px 10px;border-radius:999px;background:var(--sunk);color:var(--muted)">{{ tg.name }}</span></sc-for>';
  one(badges, 'problem badges row');
  const btn = 'height:26px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--panel);font-size:11.5px;color:var(--muted);cursor:pointer;white-space:nowrap';
  t = t.replace(badges, () => [
    badges,
    `          <button sc-camel-on-click="{{ p.copyQ }}" aria-label="Copy the question as Markdown" style="${btn};margin-left:auto" style-hover="color:var(--text)">{{ p.copyQLabel }}</button>`,
    `          <button sc-camel-on-click="{{ p.copyA }}" aria-label="Copy the question, my code and the result as Markdown" style="${btn}" style-hover="color:var(--text)">{{ p.copyALabel }}</button>`,
  ].join(String.fromCharCode(10)));
  return t;
}

// ---- editor shortcuts (approved) ---------------------------------------------------------------------
// Three line-wise shortcuts, written without backslash escapes so the bundle's JSON round-trip cannot
// mangle them: NL is a newline, TAB a tab. handleKey returns true when it has handled the key.
export const SHORTCUTS = [
  "    const NL = String.fromCharCode(10), TAB = String.fromCharCode(9);",
  "    const lineEndFrom = (pos) => { const i = v.indexOf(NL, pos); return i < 0 ? v.length : i; };",
  "    const curStart = v.lastIndexOf(NL, s - 1) + 1;",
  "    const curEnd = lineEndFrom(en);",
  "    const indentOf = (line) => { let out = ''; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === ' ' || ch === TAB) out += ch; else break; } return out; };",
  "    const toClipboard = (text) => {",
  "      try { navigator.clipboard.writeText(text); return; } catch (err) { /* fall through */ }",
  "      try { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } catch (err) { /* ignore */ }",
  "    };",
  "    // Shift+Enter: open a new line below, however far into the line the caret is.",
  "    if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {",
  "      e.preventDefault();",
  "      const ind = indentOf(v.slice(curStart, curEnd));",
  "      insert(ta, NL + ind, curEnd, curEnd);",
  "      const c = curEnd + 1 + ind.length;",
  "      ta.setSelectionRange(c, c);",
  "      return true;",
  "    }",
  "    // Ctrl+X with nothing selected: cut the whole line, newline included.",
  "    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X') && s === en) {",
  "      e.preventDefault();",
  "      const to = curEnd < v.length ? curEnd + 1 : curEnd;",
  "      toClipboard(v.slice(curStart, to));",
  "      insert(ta, '', curStart, to);",
  "      const c = Math.min(curStart, ta.value.length);",
  "      ta.setSelectionRange(c, c);",
  "      return true;",
  "    }",
  "    // Ctrl+Shift+Down / Up: duplicate the current line below it, caret on the copy or the original.",
  "    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {",
  "      e.preventDefault();",
  "      const line = v.slice(curStart, curEnd);",
  "      insert(ta, NL + line, curEnd, curEnd);",
  "      const off = s - curStart;",
  "      const c = e.key === 'ArrowDown' ? curEnd + 1 + off : curStart + off;",
  "      ta.setSelectionRange(c, c);",
  "      return true;",
  "    }",
].join('\n');

export function patchShortcutsText(text) {
  // built from char codes so the literal backslash-n survives every round-trip
  const anchor = "    const lineStart = v.lastIndexOf('" + String.fromCharCode(92) + "n', s - 1) + 1;";
  if (text.split(anchor).length !== 2) throw new Error('Editor changed; review pandas-patch.mjs (shortcut anchor).');
  return text.replace(anchor, () => anchor + '\n' + SHORTCUTS);
}

// ---- solution tabs (approved) ------------------------------------------------------------------------
// Up to three saved attempts per problem. Slot 1 keeps the original 'code.<id>' key, so existing work is
// untouched; slots 2 and 3 add a suffix. Run and Submit read the textarea, so they act on whatever tab is
// open without any further change. Opening a problem always starts on Main.
const SLOT_HELPERS = [
  "  slotKey(id, slot) { const n = slot || this.state.codeSlot || 1; return n === 1 ? 'code.' + id : 'code.' + id + '.' + n; }",
  "  slotCount(id) { const n = window.DojoStore.get('slots.' + id, 1); return Math.min(3, Math.max(1, typeof n === 'number' ? n : 1)); }",
  "  switchSlot = (n) => {",
  "    const p = this.current(), ta = this.editorRef.current;",
  "    if (!p || n === this.state.codeSlot) return;",
  "    if (ta) this.saveCode(p.id, ta.value);",
  "    this.setState({ codeSlot: n, result: null, validate: null }, () => this.setCode(this.loadCode(p)));",
  "  };",
  "  addSlot = () => {",
  "    const p = this.current(); if (!p) return;",
  "    const next = this.slotCount(p.id) + 1;",
  "    if (next > 3) return;",
  "    window.DojoStore.set('slots.' + p.id, next);",
  "    this.switchSlot(next);",
  "  };",
].join('\n');

export function patchTabsText(t) {
  const one = (from, label) => {
    if (t.split(from).length !== 2) throw new Error(`Expected exactly one ${label} in the template; review pandas-patch.mjs.`);
  };
  const KEY = "'code.' + ";
  // 1. the helpers
  const starter = '  starter(p) {';
  one(starter, 'starter method');
  t = t.replace(starter, () => SLOT_HELPERS + '\n' + starter);
  // 2. load and save go through the active slot
  const load = "  loadCode(p) { const c = window.DojoStore.get(" + KEY + "p.id, null);";
  one(load, 'loadCode');
  t = t.replace(load, () => '  loadCode(p) { const c = window.DojoStore.get(this.slotKey(p.id), null);');
  // prepare-renderer has already widened this condition to also drop an empty editor, so match that form
  const save = "    if (p && (code === '' || code === this.starter(p))) window.DojoStore.del(" + KEY + "id); else window.DojoStore.set(" + KEY + "id, code);";
  one(save, 'saveCode');
  t = t.replace(save, () => "    if (p && (code === '' || code === this.starter(p))) window.DojoStore.del(this.slotKey(id)); else window.DojoStore.set(this.slotKey(id), code);");
  const reset = "    this.setCode(this.starter(p)); window.DojoStore.del(" + KEY + "p.id);";
  one(reset, 'resetCode');
  t = t.replace(reset, () => '    this.setCode(this.starter(p)); window.DojoStore.del(this.slotKey(p.id));');
  // 3. state, and back to Main whenever a problem is opened
  const st = "    inspect: {}, inputView: 'tables', theme: 'light', focus: false, music: false, volume: 15, mood: 'bhupali',";
  one(st, 'state');
  t = t.replace(st, () => st + '\n    codeSlot: 1,');
  const pick = "    this.setState({ currentId: id, tab: 'problem', result: null, validate: null, drawer: false, resetArmed: false, savedAt: null }, () => {";
  one(pick, 'selectProblem');
  t = t.replace(pick, () => "    this.setState({ currentId: id, tab: 'problem', result: null, validate: null, drawer: false, resetArmed: false, savedAt: null, codeSlot: 1 }, () => {");
  // 4. the view-model for the strip
  const vm = "      savedLabel: s.savedAt ? 'Saved' : '',";
  one(vm, 'editor view-model');
  t = t.replace(vm, () => [
    "      codeTabs: p ? Array.from({ length: this.slotCount(p.id) }, (_, i) => i + 1).map((n) => ({",
    "        label: n === 1 ? 'Main' : String(n), aria: n === 1 ? 'Main solution' : 'Solution ' + n,",
    "        pick: () => this.switchSlot(n),",
    "        bg: s.codeSlot === n ? 'var(--sunk)' : 'transparent', color: s.codeSlot === n ? 'var(--text)' : 'var(--muted)',",
    "        border: s.codeSlot === n ? 'var(--line)' : 'transparent',",
    "      })) : [],",
    "      canAddSlot: !!p && this.slotCount(p.id) < 3, addSlot: this.addSlot,",
    vm,
  ].join('\n'));
  // 5. the strip itself, left of the file name
  const name = `        <span style="font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--muted)">solution.py</span>`;
  one(name, 'editor file name');
  const tabStyle = 'height:24px;padding:0 10px;border-radius:7px;font-size:11.5px;cursor:pointer';
  t = t.replace(name, () => [
    '        <div style="display:flex;align-items:center;gap:3px">',
    `          <sc-for list="{{ codeTabs }}" as="ct" hint-placeholder-count="1"><button sc-camel-on-click="{{ ct.pick }}" aria-label="{{ ct.aria }}" style="${tabStyle};border:1px solid {{ ct.border }};background:{{ ct.bg }};color:{{ ct.color }}">{{ ct.label }}</button></sc-for>`,
    `          <sc-if value="{{ canAddSlot }}"><button sc-camel-on-click="{{ addSlot }}" aria-label="Add another solution tab" title="Add another solution" style="${tabStyle};border:1px dashed var(--line);background:transparent;color:var(--muted)">+</button></sc-if>`,
    '        </div>',
    name,
  ].join(String.fromCharCode(10)));
  return t;
}

// ---- execution tracer (approved) ---------------------------------------------------------------------
// Records what the solution does, line by line, for the step-through window. Only frames compiled as
// "<solution>" are traced, so pandas' own internals stay out of it. Everything is capped: steps, rows,
// items and string length, so a runaway loop cannot produce an unbounded trace.
const TRACER = String.raw`
_T_STEPS, _T_ROWS, _T_ITEMS, _T_CHARS = 300, 8, 20, 60

def _t_cell(x):
    if x is None:
        return ""
    try:
        if isinstance(x, float) and x != x:
            return "NaN"
    except Exception:
        pass
    s = str(x)
    return s if len(s) <= 40 else s[:40] + "..."

def _t_prim(v):
    if v is None:
        return {"t": "prim", "v": "None"}
    if isinstance(v, (bool, np.bool_)):
        return {"t": "prim", "v": "True" if v else "False"}
    if isinstance(v, (int, float, np.integer, np.floating)):
        return {"t": "prim", "v": str(v)}
    if isinstance(v, str):
        s = v if len(v) <= _T_CHARS else v[:_T_CHARS] + "..."
        return {"t": "prim", "v": repr(s)}
    return None

def _t_val(v, heap):
    p = _t_prim(v)
    if p is not None:
        return p
    key = str(id(v))
    if key not in heap:
        heap[key] = {"t": "obj", "cls": type(v).__name__, "repr": "..."}
        heap[key] = _t_obj(v, heap)
    return {"t": "ref", "id": key}

def _t_obj(v, heap):
    if isinstance(v, pd.DataFrame):
        head = v.head(_T_ROWS)
        return {"t": "df", "cols": [str(c) for c in v.columns],
                "index": [str(i) for i in list(head.index)],
                "rows": [[_t_cell(x) for x in r] for r in head.itertuples(index=False, name=None)],
                "shape": [int(v.shape[0]), int(v.shape[1])],
                "more": max(0, int(v.shape[0]) - _T_ROWS)}
    if isinstance(v, pd.Series):
        head = v.head(_T_ITEMS)
        return {"t": "series", "name": "" if v.name is None else str(v.name),
                "index": [str(i) for i in list(head.index)],
                "values": [_t_cell(x) for x in list(head.values)],
                "more": max(0, int(len(v)) - _T_ITEMS)}
    if isinstance(v, np.ndarray):
        flat = list(v.ravel())[:_T_ITEMS]
        return {"t": "array", "shape": [int(x) for x in v.shape],
                "values": [_t_cell(x) for x in flat], "more": max(0, int(v.size) - _T_ITEMS)}
    if isinstance(v, dict):
        items = list(v.items())[:_T_ITEMS]
        return {"t": "dict", "items": [[str(k), _t_val(x, heap)] for k, x in items],
                "more": max(0, len(v) - _T_ITEMS)}
    if isinstance(v, (list, tuple, set, frozenset)):
        kind = "list" if isinstance(v, list) else ("tuple" if isinstance(v, tuple) else "set")
        items = list(v)[:_T_ITEMS]
        return {"t": kind, "items": [_t_val(x, heap) for x in items], "more": max(0, len(v) - _T_ITEMS)}
    return {"t": "obj", "cls": type(v).__name__, "repr": str(v)[:120]}

def _dojo_trace(req):
    import sys
    ns = {"pd": pd, "np": np, "__name__": "__main__"}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(req["setup"], "<setup>", "exec"), ns)
    exec(compile(req["code"], "<solution>", "exec"), ns)
    steps = []
    out = io.StringIO()

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<solution>":
            return None
        if event in ("line", "return") and len(steps) < _T_STEPS:
            heap = {}
            stack = []
            f = frame
            while f is not None and f.f_code.co_filename == "<solution>":
                stack.append({"name": f.f_code.co_name, "line": f.f_lineno,
                              "vars": [[k, _t_val(val, heap)] for k, val in f.f_locals.items() if not k.startswith("__")]})
                f = f.f_back
            stack.reverse()
            steps.append({"line": frame.f_lineno, "event": event, "stack": stack, "heap": heap,
                          "ret": _t_val(arg, heap) if event == "return" else None,
                          "stdout": out.getvalue()[-400:]})
        return tracer

    err = None
    sys.settrace(tracer)
    try:
        with contextlib.redirect_stdout(out):
            eval(compile(req["call"], "<call>", "eval"), ns)
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.settrace(None)
    return {"code": req["code"], "call": req["call"], "steps": steps, "error": err,
            "truncated": len(steps) >= _T_STEPS}
`;

export function patchTraceText(text) {
  const def = 'def _dojo_exec(req_json):';
  if (text.split(def).length !== 2) throw new Error('Engine entry changed; review pandas-patch.mjs (tracer).');
  let t = text.replace(def, () => TRACER.trim() + '\n\n' + def);
  const branch = '        if req.get("mode") == "inspect":';
  if (t.split(branch).length !== 2) throw new Error('Engine dispatch changed; review pandas-patch.mjs (tracer branch).');
  t = t.replace(branch, () => '        if req.get("mode") == "trace":\n'
    + '            return json.dumps(_dojo_trace(req), default=str)\n' + branch);
  return t;
}

// ---- Visualize buttons (approved) --------------------------------------------------------------------
// Records a trace with the engine's trace mode and hands it to the main process, which opens the
// step-through window. One button beside Run for the editor's code, and one on each reference approach,
// so "my code or the reference" is a choice made at the moment of asking rather than a setting.
const VISUALIZE_METHOD = [
  "  visualize = async (code, source) => {",
  "    const p = this.current(), E = window.DojoEngine;",
  "    const native = window.dojoNative;",
  "    if (!p || !native || !native.visualize || this.state.busy) return;",
  "    if (!E || E.status !== 'ready') return;",
  "    this.setState({ busy: 'visualize' });",
  "    let trace = null;",
  "    try {",
  "      trace = await E.exec({ mode: 'trace', setup: p.setup, code: code, call: p.call });",
  "    } catch (err) { trace = null; }",
  "    this.setState({ busy: null });",
  "    if (!trace || !trace.steps || !trace.steps.length) return;",
  "    trace.theme = this.state.theme;",
  "    trace.source = source;",
  "    trace.title = p.id + '. ' + p.title;",
  "    try { await native.visualize(trace); } catch (err) { /* the window refused to open */ }",
  "  };",
].join('\n');

export function patchVisualizeText(t) {
  const one = (from, label) => {
    if (t.split(from).length !== 2) throw new Error(`Expected exactly one ${label} in the template; review pandas-patch.mjs.`);
  };
  // 1. the method
  const anchor = '  copy(text, key) {';
  one(anchor, 'copy helper (visualize)');
  t = t.replace(anchor, () => VISUALIZE_METHOD + '\n' + anchor);
  // 2. the handlers on the view-model
  const vm = "      onRun: () => this.run('run'), onSubmit: () => this.run('submit'),";
  one(vm, 'run handlers');
  t = t.replace(vm, () => "      onVisualize: () => { const ta = this.editorRef.current; if (ta) this.visualize(ta.value, 'mine'); },\n"
    + "      canVisualize: !!p && !!window.dojoNative && !!window.dojoNative.visualize,\n" + vm);
  // 3. the button, left of Run
  const run = '        <button sc-camel-on-click="{{ onRun }}" disabled="{{ cantRun }}"';
  one(run, 'run button');
  const style = 'height:34px;padding:0 12px;display:flex;align-items:center;gap:6px;border-radius:10px;border:1px solid var(--line);background:var(--panel);font-size:13px;font-weight:500;color:var(--text);cursor:pointer';
  t = t.replace(run, () => [
    `        <sc-if value="{{ canVisualize }}"><button sc-camel-on-click="{{ onVisualize }}" disabled="{{ cantRun }}" title="Step through your code in a new window" style="${style}" style-hover="background:var(--sunk)">`,
    '          <svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" sc-camel-stroke-width="1.9" sc-camel-stroke-linecap="round" sc-camel-stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="2"></rect><rect x="3" y="14" width="11" height="6" rx="2"></rect></svg>Visualize</button></sc-if>',
    run,
  ].join(String.fromCharCode(10)));
  // 4. the same on every reference approach, next to its Copy button
  const copyBtn = '<button sc-camel-on-click="{{ a.copy }}" aria-label="Copy code"';
  one(copyBtn, 'approach copy button');
  t = t.replace(copyBtn, () => '<button sc-camel-on-click="{{ a.visualize }}" aria-label="Step through this approach" '
    + 'style="position:absolute;top:8px;right:64px;height:26px;padding:0 9px;border-radius:7px;border:1px solid var(--line);'
    + 'background:var(--panel);font-size:11.5px;color:var(--muted);cursor:pointer" style-hover="color:var(--text)">Visualize</button>'
    + copyBtn);
  const approachVm = "      copy: () => this.copy(a.code, `${p.id}-${i}`),";
  one(approachVm, 'approach view-model');
  t = t.replace(approachVm, () => "      visualize: () => this.visualize(a.code, 'reference'),\n" + approachVm);
  return t;
}

// ---- Case Study section (approved) -------------------------------------------------------------------
// A fifth level after Advanced. The page builds its chips, progress rows and badge colours from
// LEVELS and DIFF, so the section is mostly data; the one new piece of UI is the "How this is measured"
// panel, which shows a problem's `measure` rules between the business question and the return spec.
export function patchCaseStudyText(t) {
  const one = (from, label) => {
    if (t.split(from).length !== 2) throw new Error(`Expected exactly one ${label} in the template; review pandas-patch.mjs.`);
  };
  const levels = "  static LEVELS = ['Easy', 'Medium', 'Hard', 'Advanced'];";
  one(levels, 'LEVELS');
  t = t.replace(levels, () => "  static LEVELS = ['Easy', 'Medium', 'Hard', 'Advanced', 'Case Study'];");
  const adv = "    Advanced: { short: 'Adv', color: 'var(--text)', bg: 'var(--sunk)', bar: 'var(--muted)' },";
  one(adv, 'Advanced style');
  t = t.replace(adv, () => adv + "\n    'Case Study': { short: 'Case', color: 'var(--terra)', bg: 'var(--terra-tint)', bar: 'var(--terra)' },");
  const chip = "label: l === 'Advanced' ? 'Adv' : l,";
  one(chip, 'level chip label');
  t = t.replace(chip, () => "label: l === 'Advanced' ? 'Adv' : l === 'Case Study' ? 'Case' : l,");
  // the rules, on the problem view-model, with harmless defaults for the empty state
  const vm = 'tags: p.tags.map((name) => ({ name })), story: p.story, task: p.task,';
  one(vm, 'problem view-model (measure)');
  t = t.replace(vm, () => vm + ' hasMeasure: !!(p.measure && p.measure.length), measure: (p.measure || []).map((text) => ({ text })),');
  const empty = "copyALabel: 'Copy + my code' };";
  one(empty, 'empty view-model (measure)');
  t = t.replace(empty, () => "copyALabel: 'Copy + my code', hasMeasure: false, measure: [] };");
  // the panel, right after the business question
  const story = '{{ p.story }}</p>';
  one(story, 'story paragraph');
  t = t.replace(story, () => story + String.fromCharCode(10) + [
    '            <sc-if value="{{ p.hasMeasure }}">',
    '              <div style="border-left:3px solid var(--terra);background:var(--terra-tint);border-radius:0 10px 10px 0;padding:10px 14px">',
    '                <div style="font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--terra)">How this is measured</div>',
    '                <ul style="margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.6;color:var(--text)">',
    '                  <sc-for list="{{ p.measure }}" as="m" hint-placeholder-count="2"><li style="margin:2px 0">{{ m.text }}</li></sc-for>',
    '                </ul>',
    '              </div>',
    '            </sc-if>',
  ].join(String.fromCharCode(10)));
  return t;
}

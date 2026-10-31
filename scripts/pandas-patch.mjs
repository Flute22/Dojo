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

def _dojo_exec(req_json):`;

const DEF = 'def _dojo_exec(req_json):';
const OLD = 'res["verdict"] = _compare(value, req["expected"], {"ignoreOrder": bool(req.get("ignoreOrder")), "checkDtype": bool(req.get("checkDtype"))})';

/** text: the engine source (LF line endings). Returns the patched engine source. */
export function patchEngineText(text) {
  if (text.split(DEF).length !== 2 || text.split(OLD).length !== 2) throw new Error('Engine changed; review pandas-patch.mjs.');
  return text.replace(DEF, () => JUDGE.trim()).replace(OLD, () => 'res["verdict"] = _judge(value, req)');
}

/** The two places in the page that send a problem to the engine pass the hidden cases along. */
export function patchTemplateText(template) {
  const from = 'expected: p.expected, ignoreOrder';
  if (template.split(from).length !== 3) throw new Error('Expected two submit calls in the template; review pandas-patch.mjs.');
  return template.split(from).join('expected: p.expected, hidden: p.hidden, ignoreOrder');
}

// Pandas Dojo — Pyodide engine (Web Worker with 10 s timeout, main-thread fallback)
(function () {
  if (window.DojoEngine) return; // guard against double loading
  const BASES = [
    'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/',
    'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
    'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  ];
  const TIMEOUT_MS = 10000;

  const HARNESS = String.raw`
import sys, io, json, time, traceback, warnings, difflib, contextlib, re
import numpy as np
import pandas as pd
pd.set_option("display.width", 120)

_MAXROWS = 60

def _isna(v):
    try:
        r = pd.isna(v)
        return bool(r) if isinstance(r, (bool, np.bool_)) else False
    except Exception:
        return False

def _fmt(v):
    try:
        if v is None: return {"na": "None"}
        if v is pd.NaT: return {"na": "NaT"}
        if v is pd.NA: return {"na": "<NA>"}
        if isinstance(v, (bool, np.bool_)): return str(bool(v))
        if isinstance(v, (float, np.floating)):
            f = float(v)
            if np.isnan(f): return {"na": "NaN"}
            if np.isinf(f): return "inf" if f > 0 else "-inf"
            if f.is_integer() and abs(f) < 1e15: return f"{f:.1f}"
            if abs(f) < 1e-4: return f"{f:.3g}"
            return f"{f:.4f}".rstrip("0").rstrip(".")
        if isinstance(v, (int, np.integer)): return str(int(v))
        if isinstance(v, pd.Timestamp):
            if v.hour == 0 and v.minute == 0 and v.second == 0 and v.microsecond == 0:
                return v.strftime("%Y-%m-%d")
            return v.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(v, np.ndarray): return str(list(v))
        return str(v)
    except Exception:
        return str(v)

def _label(x):
    if isinstance(x, tuple): return " / ".join(str(i) for i in x)
    return str(x)

def _table(obj, maxrows=_MAXROWS):
    if isinstance(obj, pd.Series):
        obj = obj.to_frame(name=obj.name if obj.name is not None else "value")
    n = len(obj)
    head = obj.head(maxrows)
    names = [str(x) for x in obj.index.names if x is not None]
    return {
        "columns": [_label(c) for c in obj.columns],
        "dtypes": [str(t) for t in obj.dtypes],
        "index": [_label(i) for i in head.index],
        "indexName": " / ".join(names),
        "rows": [[_fmt(v) for v in r] for r in head.itertuples(index=False, name=None)],
        "shape": [n, obj.shape[1]],
        "truncated": n > maxrows,
    }

_REMOVED = {
    "append": "DataFrame.append was removed in pandas 2.0. Use pd.concat([df, other]) instead.",
    "iteritems": "iteritems() was removed in pandas 2.0. Use .items() instead.",
    "swapaxes": "swapaxes is deprecated. Use .T or .transpose() instead.",
    "applymap": "applymap is deprecated since pandas 2.1. Use DataFrame.map() instead.",
    "is_monotonic": "Use .is_monotonic_increasing instead.",
    "lookup": "DataFrame.lookup was removed. Use .loc with a mask, or melt + merge.",
    "mad": "mad() was removed. Use (s - s.mean()).abs().mean().",
    "ix": ".ix was removed. Use .loc (labels) or .iloc (positions).",
}
_STR_M = {"lower", "upper", "strip", "lstrip", "rstrip", "split", "contains", "startswith", "endswith", "title", "len", "zfill", "capitalize"}
_DT_A = {"year", "month", "day", "hour", "minute", "dayofweek", "day_name", "date", "quarter", "strftime", "month_name", "weekday", "normalize"}

def _hint(e, ns):
    m = str(e)
    if isinstance(e, KeyError):
        key = str(e.args[0]) if e.args else ""
        cols = []
        for v in list(ns.values()):
            if isinstance(v, pd.DataFrame): cols += [str(c) for c in v.columns]
        close = difflib.get_close_matches(key, list(dict.fromkeys(cols)), n=1, cutoff=0.6)
        tip = "That column or label doesn't exist. Names are case-sensitive and spaces count."
        if close and close[0] != key: tip += f" Did you mean '{close[0]}'?"
        return tip
    if isinstance(e, AttributeError):
        mm = re.search(r"has no attribute '(\w+)'", m)
        a = mm.group(1) if mm else ""
        if a in _REMOVED: return _REMOVED[a]
        if "Can only use .str" in m: return "The column has non-text values (NaN or numbers). Use .astype(str) or fillna('') first."
        if "Can only use .dt" in m: return "The column isn't datetime yet. Convert it with pd.to_datetime(...) first."
        if "Series" in m and a in _STR_M: return f"String methods live on the .str accessor, e.g. s.str.{a}()."
        if "Series" in m and a in _DT_A: return f"Date parts live on the .dt accessor, e.g. s.dt.{a}. Convert with pd.to_datetime first if needed."
        if "NoneType" in m: return "Something returned None. Methods called with inplace=True return None, so assign the result instead."
        return "Check the method or attribute name. dir(obj) lists what exists."
    if isinstance(e, ValueError):
        if "truth value of a" in m: return "Use & | ~ instead of and / or / not, and wrap each condition in parentheses: (df.a > 1) & (df.b < 5)."
        if "Length of values" in m or "Length mismatch" in m: return "The number of values doesn't match the number of rows or columns."
        if "merge on" in m: return "The join keys have different dtypes. Convert one side with astype() before merging."
        if "duplicate" in m: return "There are duplicate labels. Check with df.index.duplicated() or drop_duplicates()."
        return "A value had the wrong shape or content. Print the inputs just before this line."
    if isinstance(e, TypeError):
        if "not supported between instances" in m: return "You're comparing or sorting mixed types (often text mixed with NaN or numbers). Check df.dtypes and clean the column."
        if "unsupported operand" in m: return "You're doing maths with mixed types. Convert with pd.to_numeric() or astype() first."
        if "convert" in m or "agg function failed" in m or "numeric" in m: return "You're aggregating a text column. Select numeric columns or pass numeric_only=True."
        if "NoneType" in m: return "Something is None. Did a step use inplace=True, or did solve() forget to return?"
        if "positional argument" in m: return "solve() was called with a different number of arguments. Keep its signature unchanged."
        return "An operation got a value of the wrong type. Check dtypes with df.dtypes."
    if isinstance(e, NameError):
        mm = re.search(r"name '(\w+)'", m)
        n = mm.group(1) if mm else ""
        if n == "solve": return "Keep the function name solve, because the checker calls it."
        return f"'{n}' isn't defined. Check the spelling. Inside solve(), use the parameter name rather than a variable from the setup."
    if isinstance(e, SyntaxError): return "Python couldn't read the code. Check colons after def/if/for, matching brackets and quotes, and 4-space indentation."
    if isinstance(e, IndexError): return "A position is out of range. Check len(df) before using iloc."
    if isinstance(e, ZeroDivisionError): return "Division by zero. Guard the denominator, or use pandas division, which gives inf/NaN instead of failing."
    t = type(e).__name__
    if t == "IntCastingNaNError": return "NaN can't be cast to int. Fill missing values first, or use the nullable 'Int64' dtype."
    if t == "DataError": return "There's no numeric data to aggregate. Select numeric columns first."
    return "Read the last line of the message. It usually names the exact problem."

def _error(e, code, ns):
    line, where = None, "your code"
    if isinstance(e, SyntaxError):
        if e.filename == "<your code>": line = e.lineno
        elif e.filename == "<setup>": where = "setup"
    else:
        frames = traceback.extract_tb(e.__traceback__)
        for f in reversed(frames):
            if f.filename == "<your code>":
                line = f.lineno
                break
        if line is None and any(f.filename == "<setup>" for f in frames): where = "setup"
    lines = code.splitlines()
    src = lines[line - 1].strip() if line and 0 < line <= len(lines) else None
    if isinstance(e, SyntaxError): msg = e.msg
    elif isinstance(e, KeyError): msg = repr(e.args[0]) if e.args else ""
    else: msg = str(e)
    return {"type": type(e).__name__, "message": msg[:600], "line": line, "source": src, "hint": _hint(e, ns), "where": where}

def _call(req):
    ns = {"__name__": "__main__", "pd": pd, "np": np}
    out = io.StringIO()
    res = {"stdout": "", "warnings": []}
    value = None
    t0 = time.perf_counter()
    with warnings.catch_warnings(record=True) as wl:
        warnings.simplefilter("always")
        try:
            with contextlib.redirect_stdout(out):
                exec(compile(req["setup"], "<setup>", "exec"), ns)
                exec(compile(req["code"], "<your code>", "exec"), ns)
                if not callable(ns.get("solve")):
                    raise NameError("name 'solve' is not defined")
                value = eval(compile(req["call"], "<call>", "eval"), ns)
        except Exception as e:
            res["error"] = _error(e, req["code"], ns)
        seen = set()
        for w in wl:
            key = (w.category.__name__, str(w.message))
            if key in seen or len(seen) >= 5: continue
            seen.add(key)
            res["warnings"].append({"type": w.category.__name__, "message": str(w.message)[:400], "line": w.lineno if w.filename == "<your code>" else None})
    res["ms"] = round((time.perf_counter() - t0) * 1000, 1)
    res["stdout"] = out.getvalue()[-20000:]
    return value, res

def _describe(value):
    if isinstance(value, (pd.DataFrame, pd.Series)): return {"kind": type(value).__name__, "table": _table(value)}
    if value is None: return {"kind": "None"}
    return {"kind": type(value).__name__, "repr": repr(value)[:2000]}

def _expected(spec):
    cols = spec["columns"]
    rows = spec["rows"]
    df = pd.DataFrame({c: [r[i] for r in rows] for i, c in enumerate(cols)}, columns=cols)
    for c, t in (spec.get("dtypes") or {}).items():
        if t == "float": df[c] = df[c].astype(float)
        elif t == "datetime": df[c] = pd.to_datetime(df[c])
        else: df[c] = df[c].astype(t)
    if spec.get("index"): df = df.set_index(spec["index"])
    return df

def _norm(df, check_dtype):
    df = df.copy()
    if check_dtype: return df
    for i in range(df.shape[1]):
        s = df.iloc[:, i]
        dt = s.dtype
        if isinstance(dt, pd.CategoricalDtype): s = s.astype(object)
        elif pd.api.types.is_bool_dtype(dt) and not isinstance(dt, np.dtype): s = s.astype(object)
        elif pd.api.types.is_extension_array_dtype(dt) and pd.api.types.is_numeric_dtype(dt): s = s.astype("float64")
        elif pd.api.types.is_string_dtype(dt) and dt != object: s = s.astype(object)
        if s.dtype == object: s = s.where(s.notna(), np.nan)
        df.isetitem(i, s)
    return df

def _skey(v):
    try:
        if pd.isna(v): return "\uffff"
    except (TypeError, ValueError):
        pass
    return str(v)

def _sorted(df):
    df = df.reset_index(drop=True)
    if df.shape[1] == 0: return df
    keys = {}
    for i in range(df.shape[1]):
        s = df.iloc[:, i]
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            keys[f"k{i}"] = pd.to_numeric(s, errors="coerce").astype(float).round(6)
        else:
            keys[f"k{i}"] = s.map(_skey)
    order = pd.DataFrame(keys).sort_values(list(keys), kind="mergesort", na_position="last").index
    return df.iloc[order].reset_index(drop=True)

def _same(a, b):
    na, nb = _isna(a), _isna(b)
    if na or nb: return na and nb
    num = (int, float, np.integer, np.floating)
    if isinstance(a, num) and isinstance(b, num):
        return bool(np.isclose(float(a), float(b), rtol=1e-5, atol=1e-6))
    try: return bool(a == b)
    except Exception: return str(a) == str(b)

def _first_diff(r, e):
    for i in range(min(len(r), len(e))):
        for j, c in enumerate(e.columns):
            a, b = r.iat[i, j], e.iat[i, j]
            if not _same(a, b):
                return {"row": i, "column": str(c), "expected": _fmt(b), "got": _fmt(a)}
    return None

def _compare(value, spec, opts):
    if value is None: return {"ok": False, "reason": "solve() returned None. Did you forget to return your DataFrame?"}
    if isinstance(value, pd.Series): return {"ok": False, "reason": "solve() returned a Series, but this problem expects a DataFrame. Try .reset_index() or .to_frame()."}
    if not isinstance(value, pd.DataFrame): return {"ok": False, "reason": f"solve() returned a {type(value).__name__}. This problem expects a DataFrame."}
    exp = _expected(spec)
    r = value
    if isinstance(r.columns, pd.MultiIndex):
        return {"ok": False, "reason": "Your result has multi-level column names. Flatten them, for example df.columns = ['_'.join(map(str, c)) for c in df.columns]."}
    check_index = bool(spec.get("index"))
    rc, ec = [str(c) for c in r.columns], [str(c) for c in exp.columns]
    if rc != ec:
        missing = [c for c in ec if c not in rc]
        extra = [c for c in rc if c not in ec]
        parts = []
        if missing:
            parts.append("Missing column(s): " + ", ".join(missing) + ".")
            idx_names = [str(n) for n in r.index.names if n is not None]
            in_idx = [c for c in missing if c in idx_names]
            if in_idx: parts.append(f"'{in_idx[0]}' is in the index. Call .reset_index() to make it a column.")
        if extra: parts.append("Unexpected column(s): " + ", ".join(extra) + ".")
        if not missing and not extra: parts.append("Right columns, wrong order. Expected: " + ", ".join(ec) + ".")
        return {"ok": False, "reason": " ".join(parts)}
    if len(r) != len(exp):
        more = len(r) > len(exp)
        return {"ok": False, "reason": f"Expected {len(exp)} rows, got {len(r)}." + (" Extra rows often come from duplicates or a filter that's too loose." if more else " A filter may be too strict, or rows were dropped.")}
    rr, ee = _norm(r, opts["checkDtype"]), _norm(exp, opts["checkDtype"])
    if check_index:
        rr, ee = rr.reset_index(), ee.reset_index()
    else:
        rr, ee = rr.reset_index(drop=True), ee.reset_index(drop=True)
    rr.columns = [str(c) for c in rr.columns]
    ee.columns = [str(c) for c in ee.columns]
    if opts["ignoreOrder"]:
        rr, ee = _sorted(rr), _sorted(ee)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pd.testing.assert_frame_equal(rr, ee, check_dtype=opts["checkDtype"], check_index_type=False, check_column_type=False, check_exact=False, rtol=1e-5, atol=1e-6)
        return {"ok": True}
    except AssertionError as ae:
        d = _first_diff(rr, ee)
        if d:
            label = "Row" if not opts["ignoreOrder"] else "After sorting both tables, row"
            return {"ok": False, "reason": f"{label} {d['row']}, column '{d['column']}' has a different value.", "diff": d}
        first = str(ae).strip().splitlines()
        return {"ok": False, "reason": (first[0] if first else "The values differ.")[:300]}

def _dojo_exec(req_json):
    req = json.loads(req_json)
    try:
        if req.get("mode") == "inspect":
            ns = {"pd": pd, "np": np}
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(req["setup"], "<setup>", "exec"), ns)
            tables = [{"name": k, "table": _table(v)} for k, v in ns.items() if isinstance(v, pd.DataFrame) and not k.startswith("_")]
            others = [{"name": k, "repr": repr(v)[:800]} for k, v in ns.items() if isinstance(v, (list, dict, tuple)) and not k.startswith("_")]
            return json.dumps({"tables": tables, "others": others}, default=str)
        value, res = _call(req)
        if "error" not in res:
            res["value"] = _describe(value)
            if req.get("mode") == "submit":
                res["verdict"] = _compare(value, req["expected"], {"ignoreOrder": bool(req.get("ignoreOrder")), "checkDtype": bool(req.get("checkDtype"))})
        return json.dumps(res, default=str)
    except Exception as e:
        return json.dumps({"internal": f"{type(e).__name__}: {e}"})
`;

  // Runs inside the worker (stringified) or on the main thread as a fallback.
  function runtime(scope, isWorker) {
    let py = null, execFn = null;
    async function boot(msg) {
      let lastErr = null;
      for (const base of msg.bases) {
        try {
          if (isWorker) scope.importScripts(base + 'pyodide.js');
          scope.postMessage({ type: 'status', stage: 'runtime', detail: 'Starting the Python runtime…' });
          py = await scope.loadPyodide({ indexURL: base });
          break;
        } catch (e) { lastErr = e; py = null; }
      }
      if (!py) throw lastErr || new Error('Could not load Pyodide');
      scope.postMessage({ type: 'status', stage: 'packages', detail: 'Loading pandas and NumPy…' });
      await py.loadPackage(['numpy', 'pandas']);
      scope.postMessage({ type: 'status', stage: 'warmup', detail: 'Warming up…' });
      await py.runPythonAsync(msg.harness);
      execFn = py.globals.get('_dojo_exec');
      const version = py.runPython('import pandas, sys\nf"pandas {pandas.__version__} · Python {sys.version.split()[0]}"');
      scope.postMessage({ type: 'ready', version });
    }
    function handle(msg) {
      if (msg.type === 'boot') {
        boot(msg).catch((e) => scope.postMessage({ type: 'fatal', message: String((e && e.message) || e) }));
      } else if (msg.type === 'exec') {
        let json;
        try { json = execFn(JSON.stringify(msg.req)); } catch (e) { json = JSON.stringify({ internal: String((e && e.message) || e) }); }
        scope.postMessage({ type: 'result', id: msg.id, json });
      }
    }
    return { handle };
  }

  const Engine = {
    status: 'idle', stage: 'idle', detail: '', error: null, version: '', mode: 'worker',
    worker: null, rt: null, pending: new Map(), seq: 0, listeners: new Set(), gotMsg: false,
    on(fn) { this.listeners.add(fn); fn(this.snapshot()); return () => this.listeners.delete(fn); },
    snapshot() { return { status: this.status, stage: this.stage, detail: this.detail, error: this.error, version: this.version, mode: this.mode }; },
    emit(patch) { Object.assign(this, patch); const s = this.snapshot(); this.listeners.forEach((f) => { try { f(s); } catch (e) {} }); },

    start() {
      if (this.status === 'loading' || this.status === 'ready') return;
      this.emit({ status: 'loading', stage: 'download', detail: 'Downloading the Python runtime…', error: null });
      try { this.spawnWorker(); } catch (e) { this.startMainThread(); }
    },
    spawnWorker() {
      const src = 'const rt = (' + runtime.toString() + ')(self, true);\nself.onmessage = (e) => rt.handle(e.data);';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      this.gotMsg = false;
      w.onmessage = (e) => this.onMsg(e.data);
      w.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!this.gotMsg && this.status === 'loading') { try { w.terminate(); } catch (x) {} this.startMainThread(); }
        else this.emit({ status: 'error', error: (e && e.message) || 'The Python worker crashed.' });
      };
      this.worker = w;
      this.mode = 'worker';
      w.postMessage({ type: 'boot', bases: BASES, harness: HARNESS });
    },
    startMainThread() {
      this.mode = 'main';
      this.emit({ detail: 'Downloading the Python runtime (no background worker available)…' });
      const boot = () => {
        this.rt = runtime({ postMessage: (m) => setTimeout(() => this.onMsg(m), 0), importScripts() {}, loadPyodide: (o) => window.loadPyodide(o) }, false);
        this.rt.handle({ type: 'boot', bases: [BASES[0]], harness: HARNESS });
      };
      if (window.loadPyodide) return boot();
      const s = document.createElement('script');
      s.src = BASES[0] + 'pyodide.js';
      s.onload = boot;
      s.onerror = () => this.emit({ status: 'error', error: 'Could not download Python from cdn.jsdelivr.net. Check your connection, then retry.' });
      document.head.appendChild(s);
    },
    onMsg(m) {
      this.gotMsg = true;
      if (m.type === 'status') this.emit({ stage: m.stage, detail: m.detail });
      else if (m.type === 'ready') this.emit({ status: 'ready', stage: 'ready', detail: 'Ready', version: m.version });
      else if (m.type === 'fatal') this.emit({ status: 'error', error: 'Python could not start: ' + m.message });
      else if (m.type === 'result') { const cb = this.pending.get(m.id); if (cb) cb(m.json); }
    },
    exec(req, timeout = TIMEOUT_MS) {
      if (this.status !== 'ready') return Promise.resolve({ notReady: true });
      const id = ++this.seq;
      return new Promise((resolve) => {
        let timer = null;
        const done = (r) => { clearTimeout(timer); this.pending.delete(id); resolve(r); };
        if (this.mode === 'worker') timer = setTimeout(() => { done({ timeout: true }); this.restart(); }, timeout);
        this.pending.set(id, (json) => { let r; try { r = JSON.parse(json); } catch (e) { r = { internal: 'Could not read the result.' }; } done(r); });
        if (this.mode === 'worker') this.worker.postMessage({ type: 'exec', id, req });
        else setTimeout(() => this.rt.handle({ type: 'exec', id, req }), 20);
      });
    },
    restart() {
      try { this.worker && this.worker.terminate(); } catch (e) {}
      const waiting = [...this.pending.values()];
      this.pending.clear();
      waiting.forEach((cb) => cb(JSON.stringify({ internal: 'Python was restarted.' })));
      this.status = 'idle';
      this.emit({ status: 'loading', stage: 'restart', detail: 'Restarting Python after the timeout…' });
      this.spawnWorker();
    },
    retry() { if (this.status === 'error') { this.status = 'idle'; this.start(); } },
    timeoutMs: TIMEOUT_MS,
  };

  window.DojoEngine = Engine;
})();

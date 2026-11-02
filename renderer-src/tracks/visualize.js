// The step-through window. It renders a trace recorded by the Pandas page and runs no Python itself:
// every step is already in the payload, so stepping is instant and nothing here can reach the engine.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const NL = String.fromCharCode(10);

  // The same palettes the tracks use, picked by the name the main page sends with the trace.
  const LIGHT = { '--bg': '#F6F4EF', '--panel': '#FDFCFA', '--sunk': '#EFECE5', '--line': '#E3DED4', '--text': '#2F3437', '--muted': '#5E6569', '--faint': '#8A9195', '--sage': '#A8BFA3', '--sage-ink': '#4E6A49', '--sage-tint': '#E6EEE3', '--slate': '#6B8CAE', '--slate-text': '#4F6E90', '--slate-tint': '#E4EBF2', '--terra': '#97503B' };
  const DARK = { '--bg': '#1E2428', '--panel': '#232A2F', '--sunk': '#2A3237', '--line': '#353E44', '--text': '#D3D8D3', '--muted': '#9CA5A7', '--faint': '#6F797D', '--sage': '#A8BFA3', '--sage-ink': '#B4CAAF', '--sage-tint': '#28332D', '--slate': '#7F9DBD', '--slate-text': '#9DB5CF', '--slate-tint': '#27323C', '--terra': '#D39D88' };
  const MIDNIGHT = { '--bg': '#14161F', '--panel': '#1B1E2B', '--sunk': '#222638', '--line': '#2E3348', '--text': '#D6DAEA', '--muted': '#99A0BC', '--faint': '#6E7592', '--sage': '#9FD6B4', '--sage-ink': '#A9DEBE', '--sage-tint': '#1B2A26', '--slate': '#8AB4F8', '--slate-text': '#A9C6F9', '--slate-tint': '#1C2438', '--terra': '#F0A2A2' };
  const PALETTES = { light: LIGHT, dark: DARK, midnight: MIDNIGHT };

  let trace = null;
  let at = 0;

  function applyTheme(name) {
    const vars = PALETTES[name] || LIGHT;
    Object.keys(vars).forEach((k) => document.documentElement.style.setProperty(k, vars[k]));
    document.documentElement.style.colorScheme = !name || name === 'light' ? 'light' : 'dark';
  }

  // ---- how each kind of object is drawn ---------------------------------------------------------------
  function dfHtml(o) {
    const head = '<tr><th></th>' + o.cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr>';
    const body = o.rows.map((r, i) => '<tr><td class="ix">' + esc(o.index[i] != null ? o.index[i] : i) + '</td>'
      + r.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('');
    const more = o.more ? '<div class="more">and ' + o.more + ' more row' + (o.more === 1 ? '' : 's') + '</div>' : '';
    return '<div class="t">DataFrame ' + o.shape[0] + ' x ' + o.shape[1] + '</div><table>' + head + body + '</table>' + more;
  }
  function seriesHtml(o) {
    const rows = o.values.map((v, i) => '<tr><td class="ix">' + esc(o.index[i]) + '</td><td>' + esc(v) + '</td></tr>').join('');
    const more = o.more ? '<div class="more">and ' + o.more + ' more</div>' : '';
    return '<div class="t">Series' + (o.name ? ' ' + esc(o.name) : '') + '</div><table>' + rows + '</table>' + more;
  }
  function boxesHtml(label, items, cell, more) {
    const cells = items.map((it, i) => '<div class="cellbox"><span class="i">' + i + '</span>' + cell(it) + '</div>').join('');
    const tail = more ? '<div class="more">and ' + more + ' more</div>' : '';
    return '<div class="t">' + esc(label) + '</div><div class="items">'
      + (cells || '<span class="more">empty</span>') + '</div>' + tail;
  }
  function dictHtml(o) {
    const rows = o.items.map((kv) => '<tr><td class="ix">' + esc(kv[0]) + '</td><td>' + valueHtml(kv[1]) + '</td></tr>').join('');
    const more = o.more ? '<div class="more">and ' + o.more + ' more</div>' : '';
    return '<div class="t">dict</div><table>' + (rows || '<tr><td class="more">empty</td></tr>') + '</table>' + more;
  }

  // A value as it appears inside a frame row or a container cell: primitives inline, references as a marker.
  function valueHtml(v) {
    if (!v) return '';
    if (v.t === 'prim') return '<span class="val">' + esc(v.v) + '</span>';
    if (v.t === 'ref') return '<span class="dot" data-from="' + esc(v.id) + '"></span>';
    return '<span class="val">' + esc(v.v || '') + '</span>';
  }

  function objHtml(o) {
    if (o.t === 'df') return dfHtml(o);
    if (o.t === 'series') return seriesHtml(o);
    if (o.t === 'array') return boxesHtml('ndarray ' + o.shape.join(' x '), o.values, esc, o.more);
    if (o.t === 'dict') return dictHtml(o);
    if (o.t === 'list' || o.t === 'tuple' || o.t === 'set') return boxesHtml(o.t, o.items, valueHtml, o.more);
    return '<div class="t">' + esc(o.cls || 'object') + '</div><div class="more">' + esc(o.repr || '') + '</div>';
  }

  // Only the objects the current frames can actually reach, the way Python Tutor shows them.
  function reachable(step) {
    const out = [];
    const seen = new Set();
    const walk = (id) => {
      if (seen.has(id) || !step.heap[id]) return;
      seen.add(id);
      out.push(id);
      const o = step.heap[id];
      (o.items || []).forEach((it) => {
        const v = Array.isArray(it) ? it[1] : it;
        if (v && v.t === 'ref') walk(v.id);
      });
    };
    step.stack.forEach((f) => f.vars.forEach((kv) => { if (kv[1].t === 'ref') walk(kv[1].id); }));
    if (step.ret && step.ret.t === 'ref') walk(step.ret.id);
    return out;
  }

  function renderCode(step) {
    const lines = (trace.code || '').split(NL);
    $('codePane').innerHTML = lines.map((l, i) => {
      const n = i + 1;
      const cls = n === step.line ? (step.event === 'return' ? 'ln on ret' : 'ln on') : 'ln';
      return '<div class="' + cls + '"><span class="n">' + n + '</span><span>' + esc(l || ' ') + '</span></div>';
    }).join('');
    const on = $('codePane').querySelector('.ln.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  function render() {
    if (!trace || !trace.steps.length) return;
    const step = trace.steps[at];
    renderCode(step);
    const frames = step.stack.map((f) => {
      const vars = f.vars.map((kv) => {
        const k = kv[0];
        const v = kv[1];
        return '<div class="v"><span class="k">' + esc(k) + '</span>' + valueHtml(v) + '</div>';
      }).join('');
      return '<div class="frame"><div class="t">' + esc(f.name) + '()</div><div class="vars">'
        + (vars || '<div class="more">no variables yet</div>') + '</div></div>';
    }).join('');
    const retRow = step.event === 'return'
      ? '<div class="frame"><div class="t">returns</div><div class="vars"><div class="v">'
        + valueHtml(step.ret) + '</div></div></div>'
      : '';
    const objs = reachable(step)
      .map((id) => '<div class="obj" data-id="' + esc(id) + '">' + objHtml(step.heap[id]) + '</div>').join('');
    $('cols').innerHTML = '<div class="col"><div class="colhd">Frames</div>' + frames + retRow + '</div>'
      + '<div class="col"><div class="colhd">Objects</div>' + (objs || '<div class="more">nothing yet</div>') + '</div>';
    $('pos').textContent = 'Step ' + (at + 1) + ' of ' + trace.steps.length;
    $('slider').value = String(at);
    $('first').disabled = at === 0;
    $('prev').disabled = at === 0;
    $('last').disabled = at === trace.steps.length - 1;
    $('next').disabled = at === trace.steps.length - 1;
    const text = step.stdout || '';
    $('out').hidden = !text;
    $('out').textContent = text;
    requestAnimationFrame(wires);
  }

  // ---- the arrows from variables to the objects they point at ------------------------------------------
  function wires() {
    const svg = $('wires');
    const stage = $('stage');
    const box = stage.getBoundingClientRect();
    svg.setAttribute('width', String(stage.scrollWidth));
    svg.setAttribute('height', String(stage.scrollHeight));
    let d = '';
    document.querySelectorAll('.dot[data-from]').forEach((dot) => {
      const target = document.querySelector('.obj[data-id="' + dot.dataset.from + '"]');
      if (!target) return;
      const a = dot.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const x1 = a.right - box.left + stage.scrollLeft;
      const y1 = a.top - box.top + a.height / 2 + stage.scrollTop;
      const x2 = b.left - box.left + stage.scrollLeft;
      const y2 = b.top - box.top + Math.min(14, b.height / 2) + stage.scrollTop;
      const mid = x1 + Math.max(24, (x2 - x1) / 2);
      d += '<path d="M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2
        + '" fill="none" stroke="var(--slate)" stroke-width="1.5" opacity="0.75"></path>'
        + '<circle cx="' + x2 + '" cy="' + y2 + '" r="3" fill="var(--slate)"></circle>';
    });
    svg.innerHTML = d;
  }

  // ---- controls ----------------------------------------------------------------------------------------
  const go = (n) => { at = Math.max(0, Math.min(trace.steps.length - 1, n)); render(); };
  $('first').addEventListener('click', () => go(0));
  $('prev').addEventListener('click', () => go(at - 1));
  $('next').addEventListener('click', () => go(at + 1));
  $('last').addEventListener('click', () => go(trace.steps.length - 1));
  $('slider').addEventListener('input', (e) => go(Number(e.target.value)));
  document.addEventListener('keydown', (e) => {
    if (!trace) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(at + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(at - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(trace.steps.length - 1); }
  });
  window.addEventListener('resize', () => requestAnimationFrame(wires));
  $('stage').addEventListener('scroll', () => requestAnimationFrame(wires));

  async function load() {
    const native = window.dojoNative;
    const t = native && native.takeTrace ? await native.takeTrace() : null;
    if (!t || !t.steps || !t.steps.length) {
      document.querySelector('main').innerHTML =
        '<div id="empty">Nothing to show yet. Open a problem in the Pandas track and press Visualize.</div>';
      return;
    }
    trace = t;
    at = 0;
    applyTheme(t.theme);
    $('srcLabel').textContent = t.source === 'reference' ? 'Reference solution' : 'Your code';
    $('slider').max = String(trace.steps.length - 1);
    let warn = '';
    if (t.error) warn = 'Stopped with ' + t.error;
    else if (t.truncated) warn = 'Long run: only the first ' + trace.steps.length + ' steps are shown.';
    $('warn').textContent = warn;
    document.title = 'Step through ' + (t.title || 'the solution');
    render();
  }
  if (window.dojoNative && window.dojoNative.onTraceChanged) window.dojoNative.onTraceChanged(load);
  load();
})();

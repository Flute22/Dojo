// Pandas Dojo — storage + lightweight Python editor helpers
(function () {
  if (window.DojoEditor) return; // guard against double loading
  const PREFIX = 'pandas-dojo.v1.';
  const memory = {};
  const ok = (() => { try { const k = PREFIX + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  window.DojoStore = {
    ok,
    get(key, fallback) {
      try {
        const raw = ok ? localStorage.getItem(PREFIX + key) : memory[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (ok) localStorage.setItem(PREFIX + key, raw); else memory[key] = raw;
        return true;
      } catch (e) { memory[key] = JSON.stringify(value); return false; }
    },
    del(key) { try { if (ok) localStorage.removeItem(PREFIX + key); delete memory[key]; } catch (e) {} },
  };

  const KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
  const BI = new Set('print len range sum min max sorted list dict set tuple int float str bool abs round enumerate zip map filter isinstance type any all pd np self'.split(' '));
  const RE = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rbfuRBFU]{0,2}"(?:\\.|[^"\\\n])*"?|[rbfuRBFU]{0,2}'(?:\\.|[^'\\\n])*'?)|(\b\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?\b|\.\d+\b)|(@\w+)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d#"'@]+|.)/g;
  const COLOR = { p: 'var(--syn-p)', k: 'var(--syn-k)', s: 'var(--syn-s)', n: 'var(--syn-n)', c: 'var(--syn-c)', b: 'var(--syn-b)', f: 'var(--syn-f)', d: 'var(--syn-d)' };

  function tokenize(src) {
    const out = [];
    let m, prevWord = '';
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      const text = m[0];
      if (!text) { RE.lastIndex++; continue; }
      let type = 'p';
      if (m[1]) type = 'c';
      else if (m[2]) type = 's';
      else if (m[3]) type = 'n';
      else if (m[4]) type = 'd';
      else if (m[5]) {
        if (KW.has(text)) type = 'k';
        else if (prevWord === 'def' || prevWord === 'class') type = 'f';
        else if (BI.has(text)) type = 'b';
        else if (src[RE.lastIndex] === '(') type = 'f';
      }
      if (m[5]) prevWord = text; else if (!m[6]) prevWord = '';
      const last = out[out.length - 1];
      if (last && last.type === type && (type === 'p')) last.text += text;
      else if (last && m[6] && last.type === 'p') last.text += text;
      else out.push({ text, type: m[6] ? 'p' : type });
    }
    return out;
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function toHTML(src) {
    return tokenize(src).map((t) => t.type === 'p' ? esc(t.text)
      : `<span style="color:${COLOR[t.type]};${t.type === 'c' ? 'font-style:italic;' : ''}${t.type === 'k' || t.type === 'f' ? 'font-weight:500;' : ''}">${esc(t.text)}</span>`).join('');
  }
  function tokens(src) {
    return tokenize(src).map((t) => ({ text: t.text, c: COLOR[t.type], fs: t.type === 'c' ? 'italic' : 'normal' }));
  }

  // Insert text in a way that keeps the browser's native undo stack.
  function insert(ta, text, from, to) {
    ta.focus();
    if (from != null) ta.setSelectionRange(from, to);
    let done = false;
    try { done = document.execCommand('insertText', false, text); } catch (e) {}
    if (!done) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function handleKey(e, ta) {
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!e.shiftKey && s === en) { insert(ta, ' '.repeat(4 - ((s - lineStart) % 4))); return true; }
      const endAdj = en > s && v[en - 1] === '\n' ? en - 1 : en;
      let lineEnd = v.indexOf('\n', endAdj);
      if (lineEnd < 0) lineEnd = v.length;
      const block = v.slice(lineStart, lineEnd);
      const out = block.split('\n').map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, '') : '    ' + l)).join('\n');
      if (out !== block) insert(ta, out, lineStart, lineEnd);
      ta.setSelectionRange(lineStart, lineStart + out.length);
      return true;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const line = v.slice(lineStart, s);
      let ind = (line.match(/^ */) || [''])[0];
      if (/:\s*(#.*)?$/.test(line)) ind += '    ';
      else if (/^\s*(return|pass|break|continue|raise)\b/.test(line)) ind = ind.slice(4);
      insert(ta, '\n' + ind);
      return true;
    }
    if (e.key === 'Backspace' && s === en && s > lineStart && !e.ctrlKey && !e.metaKey) {
      const before = v.slice(lineStart, s);
      if (/^ +$/.test(before)) {
        e.preventDefault();
        const n = ((before.length - 1) % 4) + 1;
        insert(ta, '', s - n, s);
        return true;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      let lineEnd = v.indexOf('\n', en > s && v[en - 1] === '\n' ? en - 1 : en);
      if (lineEnd < 0) lineEnd = v.length;
      const lines = v.slice(lineStart, lineEnd).split('\n');
      const allC = lines.filter((l) => l.trim()).every((l) => /^\s*# ?/.test(l));
      const out = lines.map((l) => (!l.trim() ? l : allC ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# '))).join('\n');
      insert(ta, out, lineStart, lineEnd);
      ta.setSelectionRange(lineStart, lineStart + out.length);
      return true;
    }
    return false;
  }

  window.DojoEditor = { tokenize, tokens, toHTML, handleKey };
})();

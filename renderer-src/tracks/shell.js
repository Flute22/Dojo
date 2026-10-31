/* Dojo track switcher. Loaded by the (patched) Pandas page. Adds Pandas | SQL | Excel to the header and shows
   the SQL / Excel pages in a panel below it, so the header controls (timer, music, theme) keep working. */
(function () {
  if (window.__dojoTracks) return;
  window.__dojoTracks = true;

  var KEY = 'pandas-dojo.v1.track';
  var TRACKS = [
    { id: 'pandas', label: 'Pandas' },
    { id: 'sql', label: 'SQL', src: 'app://app/tracks/sql.html' },
    { id: 'excel', label: 'Excel', src: 'app://app/tracks/excel.html' },
  ];
  var frames = {};
  var layer = null;
  var active = 'pandas';

  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  var css = document.createElement('style');
  css.id = 'dojo-tracks-css';
  css.textContent = [
    '.dojo-switch{display:flex;gap:2px;padding:3px;margin-left:8px;border-radius:999px;border:1px solid var(--line);background:var(--panel);flex:none}',
    '.dojo-switch button{height:26px;padding:0 13px;border-radius:999px;border:0;background:transparent;font-size:12.5px;color:var(--muted);cursor:pointer;white-space:nowrap}',
    '.dojo-switch button:hover:not(:disabled){background:var(--sunk)}',
    '.dojo-switch button[aria-pressed=true]{background:var(--slate-tint);color:var(--slate-text);font-weight:600}',
    '.dojo-switch button:disabled{opacity:.5;cursor:default}',
    '#dojo-track-layer{position:fixed;left:0;right:0;bottom:0;z-index:50;display:none;background:var(--bg)}',
    '#dojo-track-layer iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--bg);display:none}',
  ].join('\n');
  document.head.appendChild(css);

  function headerEl() { return document.querySelector('header'); }

  function sync() {
    var sw = document.getElementById('dojo-switch');
    if (sw) Array.prototype.forEach.call(sw.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === active)); });
    var h = headerEl();
    if (layer && h) layer.style.top = h.getBoundingClientRect().bottom + 'px';
    if (layer) {
      layer.style.display = active === 'pandas' ? 'none' : 'block';
      TRACKS.forEach(function (t) { if (frames[t.id]) frames[t.id].style.display = t.id === active ? 'block' : 'none'; });
    }
  }

  function show(id) {
    var t = TRACKS.filter(function (x) { return x.id === id; })[0];
    if (!t || t.soon) return;
    active = id;
    if (id !== 'pandas' && !frames[id]) {
      var f = document.createElement('iframe');
      f.src = t.src;
      f.title = t.label + ' track';
      layer.appendChild(f);
      frames[id] = f;
    }
    write(id);
    sync();
    if (id !== 'pandas' && frames[id]) { try { frames[id].focus(); } catch (e) { /* ignore */ } }
  }

  function build() {
    var h = headerEl();
    if (!h) return false;
    if (!document.getElementById('dojo-switch')) {
      var sw = document.createElement('div');
      sw.id = 'dojo-switch';
      sw.className = 'dojo-switch';
      sw.setAttribute('role', 'group');
      sw.setAttribute('aria-label', 'Track');
      TRACKS.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = t.label;
        b.dataset.id = t.id;
        if (t.soon) { b.disabled = true; b.title = 'Coming soon'; }
        b.addEventListener('click', function () { show(t.id); });
        sw.appendChild(b);
      });
      // After the logo block (first child div of the header), before the flexible spacer.
      var logo = null;
      Array.prototype.forEach.call(h.children, function (c) { if (!logo && c.tagName === 'DIV' && /Pandas Dojo|Dojo/.test(c.textContent)) logo = c; });
      if (logo && logo.nextSibling) h.insertBefore(sw, logo.nextSibling); else h.appendChild(sw);
    }
    if (!layer || !layer.isConnected) {
      layer = document.getElementById('dojo-track-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.id = 'dojo-track-layer';
        (h.parentElement || document.body).appendChild(layer);
      }
      Object.keys(frames).forEach(function (k) { layer.appendChild(frames[k]); });
    }
    sync();
    return true;
  }

  var started = false;
  function start() {
    if (!build()) return false;
    if (!started) {
      started = true;
      var saved = read();
      if (saved && saved !== 'pandas') show(saved);
      window.addEventListener('resize', sync);
    }
    return true;
  }

  // The page renders asynchronously, and may re-render the header: keep the switcher in place.
  var obs = new MutationObserver(function () { if (!document.getElementById('dojo-switch') || (layer && !layer.isConnected)) start(); else sync(); });
  function boot() {
    if (!start()) { setTimeout(boot, 100); return; }
    obs.observe(document.body, { childList: true, subtree: true });
  }
  boot();
  window.__dojoShowTrack = show;
})();

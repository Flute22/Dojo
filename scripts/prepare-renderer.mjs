// Builds renderer/Pandas Dojo.html from the untouched source file.
//
// "Pandas Dojo.html" is a self-unpacking bundle: every script (including the
// Python engine) is gzipped + base64 inside a JSON manifest. The only edit made
// here is the engine's list of Pyodide base URLs: app://pyodide/ is inserted as
// the first entry, the CDN entries stay behind it as fallbacks. Fonts and React
// are already embedded in the bundle, so nothing else needs to change.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { patchEngineText, patchTemplateText, patchEditorText } from './pandas-patch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'Pandas Dojo.html');
const outDir = path.join(root, 'renderer');
const out = path.join(outDir, 'Pandas Dojo.html');

const LOCAL = "'app://pyodide/',";
const NEEDLE = "const BASES = [\n    'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/',";
const PATCHED = `const BASES = [\n    ${LOCAL}\n    'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/',`;

const html = fs.readFileSync(src, 'utf8');
const open = '<script type="__bundler/manifest">';
const start = html.indexOf(open);
if (start < 0) throw new Error('Bundle manifest not found in Pandas Dojo.html');
const bodyStart = start + open.length;
const bodyEnd = html.indexOf('</script>', bodyStart);
const rawManifest = html.slice(bodyStart, bodyEnd);
const manifest = JSON.parse(rawManifest);

let patched = 0, lcMerged = 0;
for (const entry of Object.values(manifest)) {
  if (!/javascript/.test(entry.mime)) continue;
  let buf = Buffer.from(entry.data, 'base64');
  if (entry.compressed) buf = zlib.gunzipSync(buf);
  const text = buf.toString('utf8');
  if (text.includes('window.DOJO_PROBLEMS') && /Problems 101/.test(text)) {
    // The generated problems are appended to the last problem script, so they load with it, before the app mounts.
    const lc = fs.readFileSync(path.join(root, 'renderer-src', 'tracks', 'pandas-lc.js'), 'utf8');
    const merged = Buffer.from(text.replace(/\r\n/g, '\n') + '\n' + lc, 'utf8');
    entry.data = (entry.compressed ? zlib.gzipSync(merged, { level: 9 }) : merged).toString('base64');
    lcMerged++;
    continue;
  }
  if (text.includes('window.DojoEditor = {')) {
    const ed = Buffer.from(patchEditorText(text.replace(/\r\n/g, '\n')), 'utf8');
    entry.data = (entry.compressed ? zlib.gzipSync(ed, { level: 9 }) : ed).toString('base64');
    continue;
  }
  if (!text.includes(NEEDLE.split('\n')[0]) || !text.includes('DojoEngine')) continue;

  const normalized = text.replace(/\r\n/g, '\n');
  if (normalized.split(NEEDLE).length !== 2) {
    throw new Error('Expected exactly one BASES list in the engine; the source file changed. Review this script.');
  }
  const next = Buffer.from(patchEngineText(normalized.replace(NEEDLE, PATCHED)), 'utf8');
  entry.data = (entry.compressed ? zlib.gzipSync(next, { level: 9 }) : next).toString('base64');
  patched++;
}
if (patched !== 1) throw new Error(`Patched ${patched} engine scripts, expected 1.`);
if (lcMerged !== 1) throw new Error(`Appended the generated problems to ${lcMerged} scripts, expected 1.`);

fs.mkdirSync(outDir, { recursive: true });
let result = html.slice(0, bodyStart) + JSON.stringify(manifest) + html.slice(bodyEnd);

// Second patch (approved): on a fresh profile the page ends up saving an empty string as problem 1's
// code, and loadCode() treats any stored string as valid, so the editor opens empty instead of showing
// the starter. Never persist an empty editor, and treat an empty saved value as "no saved code".
const tOpen = '<script type="__bundler/template">';
const tStart = result.indexOf(tOpen) + tOpen.length;
const tEnd = result.indexOf('</script>', tStart);
let template = JSON.parse(result.slice(tStart, tEnd));
const EDITS = [
  ["return typeof c === 'string' ? c : this.starter(p); }", "return typeof c === 'string' && c !== '' ? c : this.starter(p); }"],
  ['if (p && code === this.starter(p)) window.DojoStore.del', "if (p && (code === '' || code === this.starter(p))) window.DojoStore.del"],
  // The app is now called Dojo (Pandas, SQL and Excel tracks): page title and header name.
  ['<title>Pandas Dojo</title>', '<title>Dojo</title>'],
  ['white-space:nowrap">Pandas Dojo</div>', 'white-space:nowrap">Dojo</div>'],
];
for (const [from, to] of EDITS) {
  if (template.split(from).length !== 2) throw new Error(`Expected exactly one match in the template for: ${from}`);
  template = template.replace(from, () => to);
}
template = patchTemplateText(template);
// ---- Dojo tracks (SQL, Excel) -----------------------------------------------------------------------------
// Copy the track pages next to the Pandas page, and make them look identical: the bundle embeds Inter and
// JetBrains Mono as base64, so write those out as real font files for the track pages to share.
const tracksOut = path.join(outDir, 'tracks');
fs.rmSync(tracksOut, { recursive: true, force: true });
fs.cpSync(path.join(root, 'renderer-src', 'tracks'), tracksOut, { recursive: true });
fs.mkdirSync(path.join(tracksOut, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(tracksOut, 'vendor'), { recursive: true });
let fontCss = '';
for (const face of template.match(/@font-face\s*\{[^}]*\}/g) || []) {
  const m = face.match(/url\("([0-9a-f-]{36})"\)/);
  if (!m || !manifest[m[1]]) continue;
  const entry = manifest[m[1]];
  const raw = Buffer.from(entry.data, 'base64');
  fs.writeFileSync(path.join(tracksOut, 'fonts', m[1] + '.woff2'), entry.compressed ? zlib.gunzipSync(raw) : raw);
  fontCss += face.replace(m[0], `url("fonts/${m[1]}.woff2")`) + '\n';
}
if (!fontCss) throw new Error('No @font-face rules found in the template; review this script.');
fs.writeFileSync(path.join(tracksOut, 'fonts.css'), fontCss);

// The SQL engine (SQLite compiled to WebAssembly) ships with the app, so SQL works offline too.
const sqljs = path.join(root, 'node_modules', 'sql.js', 'dist');
for (const f of ['sql-wasm.js', 'sql-wasm.wasm']) fs.copyFileSync(path.join(sqljs, f), path.join(tracksOut, 'vendor', f));
// Reading and writing .xlsx files for "Open in Excel" and "Check my file".
fs.copyFileSync(path.join(root, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), path.join(tracksOut, 'vendor', 'xlsx.full.min.js'));

// Load the track switcher with the page. The page's own scripts sit inside its <helmet> block, which its
// runtime moves into <head>; a tag anywhere else is discarded and never runs, so join them there.
const helmetEnd = template.indexOf('</helmet>');
if (helmetEnd < 0) throw new Error('</helmet> not found in the template; review this script.');
template = template.slice(0, helmetEnd) + '<script src="app://app/tracks/shell.js"></script>\n' + template.slice(helmetEnd);

const nextTemplate = JSON.stringify(template).replace(/<\//g, '<\\/');
result = result.slice(0, tStart) + nextTemplate + result.slice(tEnd);
fs.writeFileSync(out, result);
console.log(`renderer/Pandas Dojo.html written (${(result.length / 1024).toFixed(0)} KB). Pyodide URL, editor-starter and track-switcher patches applied; SQL track copied.`);

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

let patched = 0;
for (const entry of Object.values(manifest)) {
  if (!/javascript/.test(entry.mime)) continue;
  let buf = Buffer.from(entry.data, 'base64');
  if (entry.compressed) buf = zlib.gunzipSync(buf);
  const text = buf.toString('utf8');
  if (!text.includes(NEEDLE.split('\n')[0]) || !text.includes('DojoEngine')) continue;

  const normalized = text.replace(/\r\n/g, '\n');
  if (normalized.split(NEEDLE).length !== 2) {
    throw new Error('Expected exactly one BASES list in the engine; the source file changed. Review this script.');
  }
  const next = Buffer.from(normalized.replace(NEEDLE, PATCHED), 'utf8');
  entry.data = (entry.compressed ? zlib.gzipSync(next, { level: 9 }) : next).toString('base64');
  patched++;
}
if (patched !== 1) throw new Error(`Patched ${patched} engine scripts, expected 1.`);

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
];
for (const [from, to] of EDITS) {
  if (template.split(from).length !== 2) throw new Error(`Expected exactly one match in the template for: ${from}`);
  template = template.replace(from, () => to);
}
const nextTemplate = JSON.stringify(template).replace(/<\//g, '<\\/');
result = result.slice(0, tStart) + nextTemplate + result.slice(tEnd);
fs.writeFileSync(out, result);
console.log(`renderer/Pandas Dojo.html written (${(result.length / 1024).toFixed(0)} KB). Pyodide base URL and editor-starter patches applied.`);

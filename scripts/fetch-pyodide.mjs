// Downloads the Pyodide 0.27.7 runtime plus the numpy/pandas wheels into ./pyodide
// so the packaged app never needs the network. Safe to re-run: files that already
// exist with a matching checksum are skipped.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.27.7';
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;
const PACKAGES = ['numpy', 'pandas'];
const CORE = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'pyodide');
fs.mkdirSync(dest, { recursive: true });

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function download(name, expectedSha) {
  const target = path.join(dest, name);
  if (fs.existsSync(target)) {
    const have = fs.readFileSync(target);
    if (expectedSha ? sha256(have) === expectedSha : have.length > 0) {
      console.log(`  ok    ${name}`);
      return;
    }
  }
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE + name);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (expectedSha && sha256(buf) !== expectedSha) throw new Error('checksum mismatch');
      fs.writeFileSync(target, buf);
      console.log(`  get   ${name} (${(buf.length / 1048576).toFixed(2)} MB)`);
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`  retry ${name}: ${e.message}`);
    }
  }
  throw new Error(`Could not download ${name}: ${lastErr?.message}`);
}

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) await fn(queue.shift());
    }),
  );
}

console.log(`Pyodide ${VERSION} -> ${path.relative(root, dest)}/`);
console.log('Core runtime:');
await pool(CORE, 3, (n) => download(n));

const lock = JSON.parse(fs.readFileSync(path.join(dest, 'pyodide-lock.json'), 'utf8'));
if (lock.info?.version !== VERSION) {
  throw new Error(`pyodide-lock.json is version ${lock.info?.version}, expected ${VERSION}`);
}

// Resolve numpy and pandas plus every dependency the lock file lists.
const needed = new Map();
const visit = (name) => {
  const key = name.toLowerCase().replace(/_/g, '-');
  if (needed.has(key)) return;
  const pkg = lock.packages[key];
  if (!pkg) throw new Error(`Package "${name}" is not in pyodide-lock.json`);
  needed.set(key, pkg);
  (pkg.depends ?? []).forEach(visit);
};
PACKAGES.forEach(visit);

console.log(`Wheels (${[...needed.keys()].join(', ')}):`);
await pool([...needed.values()], 4, (pkg) => download(pkg.file_name, pkg.sha256));

fs.writeFileSync(path.join(dest, 'VERSION'), `${VERSION}\n`);
console.log('Done.');

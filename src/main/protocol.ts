import { app, net, protocol } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SCHEME = 'app';
export const APP_HOST = 'app';
export const PYODIDE_HOST = 'pyodide';
export const APP_URL = `${SCHEME}://${APP_HOST}/Pandas%20Dojo.html`;

// The app is a single page that unpacks itself from blob: URLs. Pyodide needs
// WebAssembly and a blob: Web Worker. The dc runtime builds its component
// logic with `new Function`, which is why 'unsafe-eval' is present alongside
// 'wasm-unsafe-eval'. The jsdelivr entries are the engine's fallbacks and are
// never touched when the bundled copy loads.
const CSP = [
  "default-src 'self' app: blob: data:",
  "script-src 'self' app: blob: 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "worker-src 'self' app: blob:",
  "style-src 'self' app: blob: data: 'unsafe-inline'",
  "font-src 'self' app: blob: data:",
  "img-src 'self' app: blob: data:",
  "media-src 'self' app: blob: data:",
  "connect-src 'self' app: blob: data: https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.whl': 'application/zip',
  '.tar': 'application/x-tar',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Must run before app.whenReady(). */
export function registerSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

/** Where the renderer page and the Pyodide runtime live on disk. */
export function resourceRoots(): { renderer: string; pyodide: string } {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return {
    renderer: path.join(base, 'renderer'),
    pyodide: path.join(base, 'pyodide'),
  };
}

export function hasLocalPyodide(): boolean {
  return fs.existsSync(path.join(resourceRoots().pyodide, 'pyodide.js'));
}

function plain(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

/** Must run after app.whenReady(). */
export function registerAppProtocol(): void {
  const roots = resourceRoots();
  const hostRoots: Record<string, string> = {
    [APP_HOST]: roots.renderer,
    [PYODIDE_HOST]: roots.pyodide,
  };

  protocol.handle(SCHEME, async (request) => {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return plain(400, 'Bad request');
    }
    const root = hostRoots[url.hostname];
    if (!root) return plain(404, 'Not found');

    let rel: string;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      return plain(400, 'Bad request');
    }
    if (rel === '/' || rel === '') rel = '/Pandas Dojo.html';

    const file = path.normalize(path.join(root, rel));
    if (file !== root && !file.startsWith(root + path.sep)) return plain(403, 'Forbidden');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return plain(404, 'Not found');

    // net.fetch on a file:// URL gives us streaming and Range support. The
    // response is re-wrapped so we control the MIME type (WebAssembly
    // streaming needs application/wasm) and the CORS/CSP headers.
    const upstream = await net.fetch(pathToFileURL(file).toString(), {
      headers: request.headers,
      bypassCustomProtocolHandlers: true,
    });

    const ext = path.extname(file).toLowerCase();
    const headers = new Headers();
    headers.set('content-type', MIME[ext] ?? 'application/octet-stream');
    headers.set('access-control-allow-origin', '*');
    headers.set('cross-origin-resource-policy', 'cross-origin');
    headers.set('x-content-type-options', 'nosniff');
    for (const h of ['content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (ext === '.html') headers.set('content-security-policy', CSP);

    return new Response(upstream.body, { status: upstream.status, headers });
  });
}

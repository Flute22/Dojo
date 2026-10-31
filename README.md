# Pandas Dojo (desktop)

A native Windows / macOS / Linux build of **Pandas Dojo**, the LeetCode-style pandas practice platform. Python (Pyodide 0.27.7 with pandas and NumPy) runs inside the app, so it works with **no internet connection at all**.

The UI is the original `Pandas Dojo.html`. Nothing about the look or the problems was changed.

## How it is put together

```
Pandas Dojo.html      the original app (source of truth, never edited)
source/               the JS files the HTML was built from (reference only)
scripts/
  prepare-renderer.mjs  builds renderer/Pandas Dojo.html from the original
  fetch-pyodide.mjs     downloads Pyodide 0.27.7 + numpy/pandas wheels into pyodide/
  make-icons.cjs        draws build/icon.{png,ico,icns} and build/icons/*.png
  smoke-test.mjs        end-to-end test that drives the real app offline
src/main/             Electron main process (TypeScript)
src/preload/          minimal preload script
renderer/             generated: the page the window loads   (git-ignored)
pyodide/              generated: the offline Python runtime  (git-ignored)
build/                icons
```

At runtime the window loads `app://app/Pandas Dojo.html`. A privileged `app://` protocol (standard, secure, fetch, CORS) serves two folders: `app://app/` is `renderer/`, and `app://pyodide/` is `pyodide/`. `file://` is not used, so Web Workers, `importScripts`, `fetch` and streaming WebAssembly all work. `.wasm` is served as `application/wasm`.

### The one change to the HTML

`Pandas Dojo.html` is a self-unpacking bundle: its scripts, fonts and React are gzipped inside a JSON manifest. `npm run prepare-renderer` copies it to `renderer/` and makes **a single edit** inside the engine: `app://pyodide/` is inserted at the top of the Pyodide base-URL list. The three jsdelivr URLs stay behind it as fallbacks. The script fails loudly if that list is not found exactly once.

The Inter and JetBrains Mono fonts are already embedded in the bundle, so no font files had to be added and the Google Fonts `<link>` did not need replacing. (The page still has two inert `preconnect` hints to Google; with no network they do nothing.)

### Content Security Policy

Set on the HTML response: scripts and workers may come from `app:` and `blob:`, WebAssembly is allowed (`'wasm-unsafe-eval'`), and `connect-src` allows `app:`, `blob:` and the jsdelivr fallback. `'unsafe-eval'` is also present, which the build prompt did not list: the page's component runtime builds its logic with `new Function`, and the app does not start without it.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run fetch-pyodide     # one-time, ~23 MB: Pyodide runtime + numpy + pandas wheels
npm run dev               # builds, then launches the app
```

`npm run fetch-pyodide` can be re-run safely; files that are already present and match their checksum are skipped. Without it the app still starts, but falls back to the CDN and needs internet.

| Script | What it does |
| --- | --- |
| `npm run dev` | prepare renderer, compile TypeScript, launch Electron (dev tools in the View menu) |
| `npm run build` | prepare renderer and compile TypeScript |
| `npm run fetch-pyodide` | download the offline Python runtime |
| `npm run icons` | regenerate the icons in `build/` |
| `npm run test:smoke` | run the end-to-end checks (see below) |
| `npm run dist` | installers for all platforms |
| `npm run dist:win` / `dist:mac` / `dist:linux` | one platform |

## Building installers

Run `npm run fetch-pyodide` first so the runtime is bundled. Installers are written to `release/`. Pyodide and the renderer ship in `extraResources`, outside the asar.

| OS | Command | Output |
| --- | --- | --- |
| Windows | `npm run dist:win` | NSIS installer, x64 |
| macOS | `npm run dist:mac` | universal DMG (Intel + Apple silicon) |
| Linux | `npm run dist:linux` | AppImage and `.deb` |

electron-builder generally needs to run on the target OS: build the DMG on a Mac, and the Linux packages on Linux (or in Docker/WSL). Installers are unsigned; macOS will ask the user to approve the first launch, and Windows SmartScreen may warn until you add a code-signing certificate.

## Automatic updates

Installed copies check GitHub Releases 15 seconds after launch and every 4 hours. When a newer version exists they download it in the background and ask **Restart now / Later** (Later installs it when the app is next closed). Progress and code are kept. **Help → Check for Updates…** checks on demand. Updates are only checked in the installed app, not in `npm run dev`.

### One-time setup

1. Create a GitHub repository for releases (public, so installed apps can read it without a token), for example `pandas-dojo`.
2. In `electron-builder.yml`, replace `YOUR_GITHUB_USERNAME` (and `repo` if you named it differently) under `publish:`.
3. Create a GitHub personal access token that can write to that repo's contents ("Contents: read and write" for a fine-grained token) and set it in your shell as `GH_TOKEN` before releasing. Never put the token in the project or the app.

Rebuild and reinstall once after step 2 so the installed app knows where to look. Copies installed before that cannot update themselves.

### Shipping a change to everyone

```bash
npm version patch          # 1.0.0 -> 1.0.1 (use minor / major for bigger changes)
npm run release:win        # builds, then uploads the installer + latest.yml to a GitHub release
```

Every installed copy picks it up within a few hours (or straight away on restart + Help → Check for Updates…). Each release must have a higher version number than the last, or nothing updates. `release:mac` and `release:linux` do the same on those systems; they publish to the same release, so run all three for the same version.

`npm run dist:*` only builds locally and never uploads.

### What to know

- **Windows** updates work with the unsigned installer.
- **macOS** cannot auto-update without an Apple Developer ID signature and notarization, so Mac users would need to download new DMGs by hand until you sign.
- **Linux**: the AppImage updates itself; the `.deb` does not (reinstall it).
- Updates are not instant: a device updates the next time it is online and checks. Devices that are switched off update when they are next used.
- Updates download the full installer (about 136 MB, since Python is bundled), with a smaller differential download when possible.
- The updater only trusts the release location compiled into the app, and verifies each download's checksum against `latest.yml`.

## Your data

Progress, saved code, hints, theme, music settings, last problem and streak days are stored in the app's `localStorage` (keys start with `pandas-dojo.v1.`) and persist between launches.

- **File → Export progress…** saves all of those keys to a JSON file.
- **File → Import progress…** replaces them from such a file and reloads the window.

There is no telemetry, account, backend or API key.

## Adding problems

Problems are objects in the `PROBLEMS` array (`window.DOJO_PROBLEMS`) with the same schema as the existing ones, which is documented at the top of `source/problems-easy.js`. To add one:

1. Append your objects to the right file in `source/` (or add a new `problems-*.js`).
2. The shipped app reads problems out of `Pandas Dojo.html`, so re-bundle the HTML from `source/` with the tool you originally built it with, and replace `Pandas Dojo.html` in this folder.
3. Run `npm run dev`, click **Check problem bank** in the sidebar, and make sure every reference solution passes (the count goes up with each problem you add).

`npm run prepare-renderer` re-applies the Pyodide patch automatically.

## Tests

`npm run test:smoke` launches the real app with all DNS lookups blocked (a stand-in for Wi-Fi off) and checks it end to end. It needs `npm run build` and `npm run fetch-pyodide` first, and takes several minutes because it runs all reference solutions.

Checklist covered by the script:

- [ ] Offline launch: loading screen, then "Python ready", with no request leaving the machine
- [ ] Security settings (`contextIsolation`, no `nodeIntegration`, sandbox) and blocked navigation
- [ ] Run / Submit shortcuts (Ctrl+Enter, Ctrl+Shift+Enter)
- [ ] Editor: Tab, Shift+Tab, Ctrl+/, auto-indent, Edit-menu undo
- [ ] Solutions locked until first submit, "Show solutions anyway"
- [ ] Night study mode, focus mode, Pomodoro, flute music without a user gesture
- [ ] Infinite loop stops after 10 s and Python restarts
- [ ] Progress, code and settings survive a restart
- [ ] Export and import of progress
- [ ] Sidebar search
- [ ] **Check problem bank**: all 274 reference solutions pass

Second patch in `prepare-renderer`: the original page, on a fresh profile, saved an empty string as problem 1's code and then loaded it back, so the first editor opened empty (Run said `name 'solve' is not defined`) until you clicked Reset. The patch stops an empty editor from being saved and treats an empty saved value as "no saved code", so the starter code shows. Nothing else about the editor changed.

Things the script cannot judge and that are worth a quick look by hand: that the window looks identical to the original in a browser, that the Pomodoro chime and flute are audible, and a real "Wi-Fi off" launch of the installed build.

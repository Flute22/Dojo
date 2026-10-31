# Prompt: Turn "Pandas Dojo" into a desktop app

Copy everything below the line into Claude Code (or another coding agent), in a folder that contains the files listed in "What you are given".

---

You are a senior desktop-app engineer. Package an existing web app called **Pandas Dojo** as a native desktop app for Windows, macOS and Linux. The UI must look and behave **exactly** like the existing app. Do not redesign, restyle or rewrite the UI. Your job is the desktop shell, offline support and packaging.

## What you are given

- `Pandas Dojo.html`: the complete app in one self-contained file (UI, logic, styles, 125 problems, editor, audio and the Python engine loader). Treat it as the source of truth for the UI.
- (Optional) the source files it was built from: `dojo-engine.js`, `dojo-editor.js`, `dojo-audio.js`, `problems-easy.js`, `problems-easy-2.js`, `problems-medium.js`, `problems-hard.js`, `problems-advanced.js`.

What the app does: a LeetCode-style pandas practice platform. Python runs in the browser through **Pyodide** (pandas and NumPy) inside a Web Worker with a 10-second timeout. Progress, code and settings are saved in `localStorage`. Background flute music is generated with the Web Audio API.

## Requirements

### 1. Shell
- Use **Electron**: latest stable version, with TypeScript for the main and preload scripts.
- Load `Pandas Dojo.html` as the renderer page **unchanged**, from local files. Do not use a remote URL or a dev server in production.
- Window: 1440×900 by default, minimum 1024×680, remembers its size and position, and uses background colour `#F6F4EF` so it does not flash white on launch.
- Show the window only after `ready-to-show`.
- Native menu with:
  - App/File: Quit
  - Edit: undo, redo, cut, copy, paste, select all. These must work inside the code editor.
  - View: Reload, Toggle Full Screen, Zoom In/Out/Reset. Dev Tools only in development builds.
  - Help: About.
- Single instance: launching it again focuses the existing window.
- Security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Block navigation away from the app, and open any external links in the system browser.

### 2. Fully offline Python (most important)
Right now the app downloads Pyodide from `https://cdn.jsdelivr.net/pyodide/v0.27.7/full/`. The desktop app must work with **no internet at all**.
- Download the Pyodide **0.27.7** full distribution as a build step: `pyodide.js`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`, plus the wheel files for `numpy`, `pandas` and their dependencies (`python-dateutil`, `pytz`, `six`, and any others `pyodide-lock.json` lists). Ship them inside the app resources.
- Serve the renderer and Pyodide from a custom secure protocol, for example `app://`, registered with `protocol.handle` and marked privileged (standard, secure, supportFetchAPI, corsEnabled). Web Workers, `importScripts`, `fetch` and WebAssembly streaming must all work. Do **not** use `file://`.
- Change only the list of Pyodide base URLs in the engine so the first entry points to the local copy (`app://pyodide/`). Keep the CDN entries as fallbacks after it. Do not change anything else in the engine.
- Set the `.wasm` MIME type to `application/wasm`.
- Allow `'wasm-unsafe-eval'` and workers from `blob:` in the Content Security Policy.

### 3. Data and storage
- `localStorage` must persist between launches. It holds progress, the last code per problem, hints, theme, music settings, the last opened problem and the streak days. All keys start with `pandas-dojo.v1.`.
- Add a menu item **File → Export progress…** that saves all `pandas-dojo.v1.*` keys to a JSON file.
- Add **File → Import progress…** that restores them from such a file and reloads the window.

### 4. Behaviour to preserve (test each one)
- The loading screen "Preparing your Python environment…", then Python ready. Offline it should take only a few seconds.
- Run, Submit and Reset, with the shortcuts Ctrl/Cmd+Enter (Run) and Ctrl/Cmd+Shift+Enter (Submit).
- Infinite loops stop after 10 s and Python restarts.
- The editor: Tab = 4 spaces, Shift+Tab, Ctrl/Cmd+/ to comment, auto-indent.
- Solutions stay locked until the first submit or "Show solutions anyway". The "View solutions" button opens the Solutions tab.
- Night study mode, focus mode, the Pomodoro timer with its chime, and flute music (play/pause, volume, mood). Allow audio playback without a user gesture so music can resume when the app starts if the user left it on.
- Sidebar filters, search, progress ring, streak, and "Check problem bank". All **274 reference solutions must pass**.

### 5. Packaging
- Use **electron-builder**.
- Targets: Windows NSIS installer (x64), macOS DMG (universal or arm64 + x64), Linux AppImage and .deb.
- App name: **Pandas Dojo**. App ID: `com.pandasdojo.app`.
- Icon: a sage-green (`#A8BFA3`) rounded square with "pd" in dark charcoal (`#2F3437`) monospace. Generate the `.ico`, `.icns` and `.png` sizes.
- Pyodide files must sit in `extraResources` (not inside asar) or be unpacked with `asarUnpack`.
- Add the scripts `npm run dev`, `npm run fetch-pyodide`, `npm run build`, and `npm run dist` (all platforms) or `dist:win`, `dist:mac`, `dist:linux`.

### 6. Deliverables
- A clean project:
  ```
  /src/main      Electron main process
  /src/preload   minimal preload script
  /renderer      the unchanged Pandas Dojo.html
  /scripts       fetch-pyodide script
  /build         icons
  ```
- `README.md` with: how to install dependencies, how to run in development, how to build installers for each OS, and how to add new problems (append objects to the PROBLEMS array with the same schema, then run "Check problem bank").
- A short test checklist that you ran:
  - Offline launch with Wi-Fi off.
  - All 274 solutions pass.
  - Progress survives a restart.
  - Export and import of progress.
  - The 10 s timeout.

## Rules
- Do not change the look of the app: colours, fonts, spacing, layout, copy and animations stay exactly as they are.
- Bundle the fonts (Inter, JetBrains Mono) locally so the UI looks the same offline. Replace only the Google Fonts `<link>` with local `@font-face` files.
- No telemetry, no accounts, no backend, no API keys.
- Ask before making any change to the UI or the problem content.

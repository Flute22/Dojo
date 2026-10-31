# Dojo (desktop)

A native Windows / macOS / Linux app for practising data-analyst interview questions. It has three tracks, chosen with the **Pandas | SQL | Excel** switcher in the header:

- **Pandas**: 125 questions. Python (Pyodide 0.27.7 with pandas and NumPy) runs inside the app.
- **SQL**: 125 original questions (50 easy, 25 medium, 25 hard, 25 advanced) in an SSMS-style query window. SQLite runs inside the app.
- **Excel**: 125 original questions (50 easy, 25 medium, 25 hard, 25 advanced) in a built-in spreadsheet, with an option to work in real Microsoft Excel.

Everything runs on your computer with **no internet connection at all**.

The Pandas page is the original `Pandas Dojo.html`; its look and problems were not changed. The SQL track is built to match it, and shares its theme, fonts and the night / focus / timer / music controls.

## The SQL track

- **Window:** question list and progress on the left, the question and its tables in the middle, and an SSMS-style window on the right: query tab, Execute (F5), Object Explorer (double-click a table to insert its name), editor with syntax colours and line numbers, Results / Messages / Execution plan tabs and a status bar.
- **Running:** F5, Ctrl+E or Ctrl+Enter executes. If text is selected, only the selection runs, as in SSMS. Ctrl+Shift+Enter submits. A query that runs longer than 10 s is stopped and the engine restarts.
- **Grading:** your final result set is compared with the reference solution's. Values are compared (numbers to 6 decimals, NULL equals NULL). Row order is only checked when the question says it matters. Column names are not graded; you get a note if they differ.
- **Solutions:** locked until your first submit, or "Show solutions anyway", like the Pandas track.
- **Dialect:** it is SQLite, not T-SQL. Use `LIMIT` instead of `TOP`, `||` instead of `+` for text, `strftime`/`date()` instead of `DATEPART`/`DATEADD`. Each question says "SQLite syntax".
- **Data:** six small databases (shop, hr, web analytics, bank, ride-hailing, school). Each question creates only the tables it lists, fresh on every run, so nothing you do persists between runs.

### Adding SQL questions

Questions live in `renderer-src/tracks/sql-q-*.js`, one file per level, as objects with these fields: `t` title, `tg` tags, `db` dataset, `tb` tables used, `s` story, `k` task, `q` reference solution, `o` true if row order is graded, `h` hint, `x` explanation. Question numbers follow file order, so appending to a file renumbers the later questions and moves saved progress for them. Datasets are in `sql-datasets.js` (a question may also add its own tables with `extra`).

Then run `npm run verify:sql`: it checks the counts per level, that every reference solution runs, returns rows, is deterministic, and prints the results so you can read them against what you expect. Finally run `npm run build` and use **Check question bank** in the SQL sidebar.

## The Excel track

- **The grid:** a spreadsheet with a ribbon (Home, Insert, Data, View), Name box and formula bar, in-cell editing, click-to-insert references while typing a formula, copy / cut / paste, a fill handle, Ctrl+D / Ctrl+R, undo / redo, column resizing, sheet tabs and a status bar with Sum / Average / Count.
- **Formulas:** a formula engine written for this app, about 170 functions: SUM / SUMIFS / COUNTIFS / AVERAGEIFS / MAXIFS, IF / IFS / IFERROR / SWITCH / LET, VLOOKUP / HLOOKUP / XLOOKUP / INDEX / MATCH, text, dates (DATEDIF, EOMONTH, NETWORKDAYS, WORKDAY), finance (PMT, IPMT, PPMT, NPV, IRR, NPER), statistics, SUMPRODUCT and array arithmetic, and dynamic arrays that spill (FILTER, UNIQUE, SORT, SORTBY, SEQUENCE, TRANSPOSE).
- **Features:** sort (including multi-level), filters with value lists, conditional formatting (highlight rules, top / bottom, duplicates, formula rules, colour scales, data bars), data validation (list, whole, decimal, date, length, custom), PivotTables (up to two row fields, a column field, several values, report filters, grand totals), charts (column, bar, line, area, pie, scatter), freeze panes, defined names.
- **Grading:** each question lists what it checks. Your workbook is compared with the reference solution for exactly those things (values, whether formulas were used, number formats, bold / fill, conditional formatting results, validation rules, charts, PivotTable fields, filter results, freeze panes). Solutions are locked until your first Check. The results list says which check failed and why.
- **Open in Excel / Check my file:** **Open in Excel** saves the current workbook as an `.xlsx` and opens it in the program set for that file type. Edit and save there, then press **Check my file** and pick the file. Only values, formulas and number formats can be read from a file, so questions about colours, conditional formatting, validation, charts and PivotTables are graded in the built-in grid (the results list marks those checks as skipped). Files written by this app do not keep colours or charts either.

### Adding Excel questions

Questions live in `renderer-src/tracks/excel-q-*.js`; starting workbooks in `excel-datasets.js`. A question gives its dataset (`d`), the text, a reference solution (`sol`, written with the same workbook operations the grid uses) and a `chk` list of what to grade. Run `npm run verify:excel` (each solution must pass its own checks after a save / load round trip, and the untouched sheet must fail) and `npm run test:excel` (the formula engine).

## How it is put together

```
Pandas Dojo.html      the original Pandas page (source of truth, never edited)
source/               the JS files that page was built from (reference only)
renderer-src/tracks/  the SQL track (and the track switcher), copied into renderer/ at build time
scripts/
  prepare-renderer.mjs  builds renderer/ from the original page + renderer-src
  fetch-pyodide.mjs     downloads Pyodide 0.27.7 + numpy/pandas wheels into pyodide/
  verify-sql.mjs        checks the 125 SQL questions without any UI
  make-icons.cjs        draws build/icon.{png,ico,icns} and build/icons/*.png
  smoke-test.mjs        end-to-end test that drives the real app offline
src/main/             Electron main process (TypeScript)
src/preload/          minimal preload script
renderer/             generated: the pages the window loads   (git-ignored)
pyodide/              generated: the offline Python runtime   (git-ignored)
build/                icons
```

At runtime the window loads `app://app/Pandas Dojo.html`. A privileged `app://` protocol (standard, secure, fetch, CORS) serves two folders: `app://app/` is `renderer/`, and `app://pyodide/` is `pyodide/`. `file://` is not used, so Web Workers, `importScripts`, `fetch` and streaming WebAssembly all work. `.wasm` is served as `application/wasm`.

### The edits made to the Pandas page

`Pandas Dojo.html` is a self-unpacking bundle: its scripts, fonts and React are gzipped inside a JSON manifest. `npm run prepare-renderer` copies it to `renderer/` and applies these edits, each of which fails the build if its target is not found exactly once:

1. The engine's Pyodide base-URL list gets `app://pyodide/` first (the jsdelivr URLs stay behind it as fallbacks).
2. Editor starter code: the page used to save an empty editor as problem 1's code and then load it back, so the first editor opened empty. An empty editor is no longer saved.
3. The app's name: the page title and header say "Dojo".
4. The track switcher script is loaded with the page.

The Inter and JetBrains Mono fonts are already embedded in the bundle. The build also writes them out as font files so the SQL page can share them. (The page still has two inert `preconnect` hints to Google; with no network they do nothing.)

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

1. Create a GitHub repository for releases (public, so installed apps can read it without a token), for example `Dojo`.
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
- [ ] SQL track: opens offline, F5 runs and shows the grid, Submit grades right and wrong answers, errors name the line, a selection runs alone, the plan shows, a runaway query stops after 10 s and the engine recovers, **Check question bank** passes 125 of 125, progress is stored under the exported prefix, and Pandas keeps its warm Python when you switch back

Second patch in `prepare-renderer`: the original page, on a fresh profile, saved an empty string as problem 1's code and then loaded it back, so the first editor opened empty (Run said `name 'solve' is not defined`) until you clicked Reset. The patch stops an empty editor from being saved and treats an empty saved value as "no saved code", so the starter code shows. Nothing else about the editor changed.

Things the script cannot judge and that are worth a quick look by hand: that the window looks identical to the original in a browser, that the Pomodoro chime and flute are audible, and a real "Wi-Fi off" launch of the installed build.

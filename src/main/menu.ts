import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import { exportProgress, importProgress } from './progress';
import { checkForUpdatesManually } from './updater';

export function showAbout(win?: BrowserWindow | null): void {
  const opts: Electron.MessageBoxOptions = {
    type: 'info',
    title: 'About Dojo',
    message: 'Dojo',
    detail: [
      `Version ${app.getVersion()}`,
      'Practice pandas, SQL and Excel interview questions. Runs entirely on your computer.',
      '',
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
    ].join('\n'),
    buttons: ['OK'],
  };
  if (win) void dialog.showMessageBox(win, opts);
  else void dialog.showMessageBox(opts);
}

export function buildMenu(getWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin';
  const dev = !app.isPackaged;

  const withWindow = (fn: (w: BrowserWindow) => Promise<void>) => () => {
    const w = getWindow();
    if (w) void fn(w);
  };

  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      { label: 'Export progress…', click: withWindow(exportProgress) },
      { label: 'Import progress…', click: withWindow(importProgress) },
      ...(isMac ? [] : ([{ type: 'separator' }, { role: 'quit' }] as MenuItemConstructorOptions[])),
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { label: 'About Dojo', click: () => showAbout(getWindow()) },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    fileMenu,
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        ...(dev
          ? ([{ type: 'separator' }, { role: 'toggleDevTools' }] as MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: 'Help',
      submenu: isMac
        ? [{ label: 'Check for Updates…', click: () => checkForUpdatesManually(getWindow()) }]
        : [
            { label: 'Check for Updates…', click: () => checkForUpdatesManually(getWindow()) },
            { type: 'separator' },
            { label: 'About Dojo', click: () => showAbout(getWindow()) },
          ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

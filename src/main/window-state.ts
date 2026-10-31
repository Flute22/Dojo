import { app, BrowserWindow, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface State {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

const DEFAULTS: State = { width: 1440, height: 900, maximized: false };
const file = () => path.join(app.getPath('userData'), 'window-state.json');

function visibleOnSomeDisplay(s: State): boolean {
  if (s.x === undefined || s.y === undefined) return false;
  const { x, y, width, height } = s;
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return x < a.x + a.width && x + width > a.x && y < a.y + a.height && y + height > a.y;
  });
}

export function loadWindowState(): State {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) } as State;
    if (!visibleOnSomeDisplay(s)) return { ...DEFAULTS, maximized: s.maximized };
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined;
  const save = () => {
    const maximized = win.isMaximized();
    // While maximised or fullscreen, getNormalBounds() keeps the restored size.
    const b = win.getNormalBounds();
    const state: State = { x: b.x, y: b.y, width: b.width, height: b.height, maximized };
    try {
      fs.writeFileSync(file(), JSON.stringify(state));
    } catch {
      /* non-fatal */
    }
  };
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  };
  win.on('resize', later);
  win.on('move', later);
  win.on('maximize', later);
  win.on('unmaximize', later);
  win.on('close', () => {
    clearTimeout(timer);
    save();
  });
}

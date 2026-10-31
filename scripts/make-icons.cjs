// Run with: npm run icons   (uses Electron itself to rasterise, so no native image deps)
// Draws the app icon (sage-green rounded square, charcoal monospace "pd") on a canvas and writes
// build/icon.png, build/icon.ico, build/icon.icns and build/icons/<size>x<size>.png.
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const png2icons = require('png2icons');

const build = path.resolve(__dirname, '..', 'build');
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const DRAW = `(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#A8BFA3';
  g.beginPath();
  g.roundRect(0, 0, 1024, 1024, 230);
  g.fill();
  g.fillStyle = '#2F3437';
  g.font = "700 470px Consolas, 'Cascadia Mono', Menlo, 'DejaVu Sans Mono', 'Courier New', monospace";
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText('pd', 512, 650);
  return c.toDataURL('image/png');
})()`;

app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    fs.mkdirSync(path.join(build, 'icons'), { recursive: true });
    const win = new BrowserWindow({ show: false, width: 200, height: 200 });
    await win.loadURL('data:text/html;charset=utf-8,<html><body></body></html>');
    const dataUrl = await win.webContents.executeJavaScript(DRAW);
    const master = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(build, 'icon.png'), master);

    // Per-size PNGs (electron-builder uses build/icons for the Linux packages).
    const img = nativeImage.createFromBuffer(master);
    for (const s of SIZES) {
      fs.writeFileSync(
        path.join(build, 'icons', `${s}x${s}.png`),
        img.resize({ width: s, height: s, quality: 'best' }).toPNG(),
      );
    }

    const ico = png2icons.createICO(master, png2icons.BICUBIC, 0, false, true);
    const icns = png2icons.createICNS(master, png2icons.BICUBIC, 0);
    if (!ico || !icns) throw new Error('png2icons failed to convert the master PNG');
    fs.writeFileSync(path.join(build, 'icon.ico'), ico);
    fs.writeFileSync(path.join(build, 'icon.icns'), icns);
    console.log('Icons written to', build);
    app.quit();
  })
  .catch((e) => {
    console.error(e);
    app.exit(1);
  });

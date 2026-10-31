import { contextBridge } from 'electron';

// The renderer needs nothing from the main process. This only tells the page
// which desktop platform it is running on.
contextBridge.exposeInMainWorld('pandasDojoDesktop', {
  platform: process.platform,
});

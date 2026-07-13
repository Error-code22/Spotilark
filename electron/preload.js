const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // YouTube
  ytSearch: (query) => ipcRenderer.invoke('yt-search', query),
  ytGetStreamUrl: (videoId) => ipcRenderer.invoke('yt-get-stream-url', videoId),
  ytDownload: (videoId, format) => ipcRenderer.invoke('yt-download', { videoId, format }),
  ytLoginYouTube: () => ipcRenderer.invoke('yt-login-youtube'),
  ytLogoutYouTube: () => ipcRenderer.invoke('yt-logout-youtube'),
  ytAuthStatus: () => ipcRenderer.invoke('yt-auth-status'),

  // File system
  readFile: (path) => ipcRenderer.invoke('fs-read-file', path),
  readDir: (path) => ipcRenderer.invoke('fs-read-dir', path),
  exists: (path) => ipcRenderer.invoke('fs-exists', path),
  writeFile: (path, data) => ipcRenderer.invoke('fs-write-file', path, data),
  mkdir: (path) => ipcRenderer.invoke('fs-mkdir', path),

  // Folder scanning & watching
  selectFolder: () => ipcRenderer.invoke('dialog-select-folder'),
  scanFolder: (path) => ipcRenderer.invoke('fs-scan-folder', path),
  startFolderWatch: (path) => ipcRenderer.invoke('folder-watch-start', path),
  stopFolderWatch: (path) => ipcRenderer.invoke('folder-watch-stop', path),
  listFolderWatches: () => ipcRenderer.invoke('folder-watch-list'),
  onFolderWatchEvent: (callback) => {
    const handler = (_, event) => callback(event);
    ipcRenderer.on('folder-watch-event', handler);
    return () => ipcRenderer.removeListener('folder-watch-event', handler);
  },

  // App paths
  getPaths: () => ipcRenderer.invoke('get-paths'),
});

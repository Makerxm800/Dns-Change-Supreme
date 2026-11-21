const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dnsApi', {
  isElectron: true,
  getPlatformInfo: () => ipcRenderer.invoke('dns:platform-info'),
  getAdapters: () => ipcRenderer.invoke('dns:get-adapters'),
  applyDns: (payload) => ipcRenderer.invoke('dns:apply', payload),
  resetDns: (payload) => ipcRenderer.invoke('dns:reset', payload),
  flushCache: () => ipcRenderer.invoke('dns:flush-cache'),
  pingServer: (payload) => ipcRenderer.invoke('dns:ping', payload),
  pingBatch: (payload) => ipcRenderer.invoke('dns:ping-batch', payload),
  resolveDomain: (payload) => ipcRenderer.invoke('dns:resolve', payload),
  getState: () => ipcRenderer.invoke('store:get-state'),
  saveState: (state) => ipcRenderer.invoke('store:save-state', state),
  updateSettings: (settings) => ipcRenderer.invoke('store:update-settings', settings),
  appendLog: (entry) => ipcRenderer.invoke('store:append-log', entry),
  checkGitUpdates: (opts) => ipcRenderer.invoke('git:check-updates', opts),
  applyGitUpdate: (opts) => ipcRenderer.invoke('git:apply-update', opts),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  relaunchApp: () => ipcRenderer.invoke('app:relaunch'),
});

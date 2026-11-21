import { app, BrowserWindow, ipcMain, Menu, Tray, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDnsConfiguration,
  flushOsDnsCache,
  getSystemPlatformInfo,
  listNetworkAdapters,
  resolveDomain,
  resetDnsToDhcp,
  testDnsServerLatency,
} from './dnsEngine.js';
import { createStore } from './settingsStore.js';
import { applyGitUpdate, checkForGitUpdates } from './gitUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let store = null;

function getStore() {
  if (!store) {
    store = createStore(app.getPath('userData'));
  }
  return store;
}

function syncStartupSetting(settings) {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(settings.launchOnStartup),
      openAsHidden: Boolean(settings.startMinimized),
    });
  } catch {
    // Ignore on unsupported platforms
  }
}

function rebuildTrayMenu() {
  if (!tray) return;
  const st = getStore().load();
  const activeLabel = st.activeServerId ? `Active DNS: ${st.activeServerId}` : 'DNS: Default / DHCP';
  const menu = Menu.buildFromTemplate([
    { label: 'DNS Change Supreme', enabled: false },
    { label: activeLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Flush DNS Cache',
      click: async () => {
        await flushOsDnsCache();
      },
    },
    {
      label: 'Reset to ISP / DHCP',
      click: async () => {
        await resetDnsToDhcp({ autoFlush: st.settings.autoFlushCache });
        const next = getStore().load();
        next.activeServerId = null;
        getStore().save(next);
        rebuildTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit DNS Change Supreme',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`DNS Change Supreme — ${activeLabel}`);
}

function resolveAssetPath(...segments) {
  const unpackedPath = path.join(process.resourcesPath || '', 'app.asar.unpacked', ...segments);
  if (fs.existsSync(unpackedPath)) return unpackedPath;
  const localPath = path.join(appRoot, ...segments);
  if (fs.existsSync(localPath)) return localPath;
  return localPath;
}

function createWindow() {
  const st = getStore().load();
  const iconPath = resolveAssetPath('build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 660,
    title: 'DNS Change Supreme',
    icon: iconPath,
    backgroundColor: '#090d16',
    show: !st.settings.startMinimized,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(path.join(appRoot, 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(appRoot, 'dist', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    const currentSettings = getStore().load().settings;
    if (!isQuitting && currentSettings.minimizeToTrayOnClose && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  try {
    const trayIconPath = resolveAssetPath('build', 'tray-icon.png');
    tray = new Tray(trayIconPath);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    rebuildTrayMenu();
  } catch {
    tray = null;
  }
}

function registerIpc() {
  ipcMain.handle('dns:platform-info', async () => getSystemPlatformInfo());
  ipcMain.handle('dns:get-adapters', async () => listNetworkAdapters());

  ipcMain.handle('dns:apply', async (_e, payload) => {
    const st = getStore().load();
    const res = await applyDnsConfiguration({
      ...payload,
      ipv6Mode: payload.ipv6Mode ?? st.settings.ipv6Mode,
      autoFlush: payload.autoFlush ?? st.settings.autoFlushCache,
    });
    const next = getStore().load();
    next.activeServerId = payload.id || 'custom';
    next.lastUsedServerId = next.activeServerId;
    getStore().save(next);
    getStore().appendLog({
      level: 'success',
      action: 'DNS_APPLY',
      message: `Switched DNS to ${payload.name} (${payload.primary}${payload.secondary ? ` / ${payload.secondary}` : ''})`,
      details: (res.commandsExecuted || []).join('\n'),
    });
    rebuildTrayMenu();
    return res;
  });

  ipcMain.handle('dns:reset', async (_e, payload = {}) => {
    const st = getStore().load();
    const res = await resetDnsToDhcp({
      adapters: payload.adapters,
      autoFlush: payload.autoFlush ?? st.settings.autoFlushCache,
    });
    const next = getStore().load();
    next.activeServerId = null;
    getStore().save(next);
    getStore().appendLog({
      level: 'info',
      action: 'DNS_RESET',
      message: 'Restored DNS to automatic ISP / DHCP',
      details: (res.commandsExecuted || []).join('\n'),
    });
    rebuildTrayMenu();
    return res;
  });

  ipcMain.handle('dns:flush-cache', async () => {
    const res = await flushOsDnsCache();
    getStore().appendLog({
      level: 'info',
      action: 'FLUSH_CACHE',
      message: res.output || 'Flushed OS DNS cache',
    });
    return res;
  });

  ipcMain.handle('dns:ping', async (_e, { ip, domain, timeoutMs }) =>
    testDnsServerLatency(ip, domain, timeoutMs)
  );

  ipcMain.handle('dns:ping-batch', async (_e, { ips, domain, timeoutMs }) => {
    const concurrency = 10;
    const results = [];
    for (let i = 0; i < ips.length; i += concurrency) {
      const slice = ips.slice(i, i + concurrency);
      const batch = await Promise.all(slice.map((ip) => testDnsServerLatency(ip, domain, timeoutMs)));
      results.push(...batch);
    }
    return results;
  });

  ipcMain.handle('dns:resolve', async (_e, { domain, dnsIp }) => resolveDomain(domain, dnsIp));

  ipcMain.handle('store:get-state', async () => getStore().load());
  ipcMain.handle('store:save-state', async (_e, state) => getStore().save(state));
  ipcMain.handle('store:update-settings', async (_e, partial) => {
    const updated = getStore().updateSettings(partial);
    syncStartupSetting(updated.settings);
    getStore().appendLog({
      level: 'info',
      action: 'SETTINGS',
      message: `Updated system settings (${Object.keys(partial).join(', ')})`,
    });
    return updated;
  });
  ipcMain.handle('store:append-log', async (_e, entry) => getStore().appendLog(entry));

  ipcMain.handle('git:check-updates', async (_e, opts = {}) => {
    const st = getStore().load().settings;
    return checkForGitUpdates({
      owner: opts.owner || st.gitRepoOwner,
      repo: opts.repo || st.gitRepoName,
      branch: opts.branch || st.gitBranch,
      appRoot,
    });
  });

  ipcMain.handle('git:apply-update', async (_e, opts = {}) => {
    const st = getStore().load().settings;
    const res = await applyGitUpdate({
      owner: opts.owner || st.gitRepoOwner,
      repo: opts.repo || st.gitRepoName,
      branch: opts.branch || st.gitBranch,
      appRoot,
    });
    getStore().appendLog({
      level: res.ok ? 'success' : 'warn',
      action: 'GIT_UPDATE',
      message: res.message || 'Checked Git update',
    });
    return res;
  });

  ipcMain.handle('app:open-external', async (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('app:relaunch', async () => {
    isQuitting = true;
    app.relaunch();
    app.exit(0);
  });
}

app.whenReady().then(() => {
  const st = getStore().load();
  syncStartupSetting(st.settings);
  registerIpc();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', async () => {
  isQuitting = true;
  try {
    const st = getStore().load();
    if (st.settings.restoreDhcpOnExit && st.activeServerId) {
      await resetDnsToDhcp({ autoFlush: st.settings.autoFlushCache });
      st.activeServerId = null;
      getStore().save(st);
    }
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const st = getStore().load();
    if (!st.settings.minimizeToTrayOnClose || !tray) {
      app.quit();
    }
  }
});

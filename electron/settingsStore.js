import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_SETTINGS = {
  // General & Startup
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTrayOnClose: true,
  autoConnectOnStartup: false,
  restoreDhcpOnExit: false,

  // System & Network
  adapterScope: 'connected', // 'primary' | 'connected' | 'selected'
  selectedAdapters: [],
  autoFlushCache: true,
  ipv6Mode: 'apply', // 'apply' | 'ipv4-only' | 'disable'
  benchmarkDomain: 'cloudflare.com',
  benchmarkTimeoutMs: 1800,
  elevatePromptMode: 'on-demand',

  // Safety & Failover
  confirmBeforeReset: true,
  autoFailover: false,
  failoverCheckIntervalSec: 60,

  // Appearance
  theme: 'dark', // 'dark' | 'midnight' | 'light'
  compactCards: false,
  showIpv6InList: true,
  defaultRegion: 'All',

  // Git / Updates
  gitRepoOwner: 'Makerxm800',
  gitRepoName: 'Dns-Change-Supreme',
  gitBranch: 'main',
  autoCheckUpdates: true,
};

export const DEFAULT_STATE = {
  settings: DEFAULT_SETTINGS,
  favorites: ['cloudflare-std', 'google-std', 'quad9-sec', 'adguard-def', 'cira-private', 'mullvad-std'],
  customServers: [],
  activeServerId: null,
  lastUsedServerId: null,
  logs: [],
};

export function createStore(storageDir) {
  const dir = storageDir || path.join(os.homedir(), '.dns-change-supreme');
  const filePath = path.join(dir, 'config.json');

  function ensureDir() {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function load() {
    ensureDir();
    try {
      if (!fs.existsSync(filePath)) {
        save(DEFAULT_STATE);
        return structuredClone(DEFAULT_STATE);
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
        },
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_STATE.favorites,
        customServers: Array.isArray(parsed.customServers) ? parsed.customServers : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 200) : [],
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function save(data) {
    ensureDir();
    const safe = {
      ...DEFAULT_STATE,
      ...data,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(data.settings || {}),
      },
      logs: Array.isArray(data.logs) ? data.logs.slice(0, 200) : [],
    };
    fs.writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf8');
    return safe;
  }

  function updateSettings(partial) {
    const current = load();
    current.settings = { ...current.settings, ...partial };
    return save(current);
  }

  function appendLog(entry) {
    const current = load();
    const logItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level: entry.level || 'info',
      action: entry.action || 'SYSTEM',
      message: entry.message || '',
      details: entry.details || '',
    };
    current.logs = [logItem, ...current.logs].slice(0, 200);
    save(current);
    return logItem;
  }

  return { filePath, load, save, updateSettings, appendLog };
}

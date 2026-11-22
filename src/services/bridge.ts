import type {
  AppSettings,
  AppState,
  DnsLatencyResult,
  GitUpdateCheckResult,
  LogEntry,
  NetworkAdapter,
  PlatformInfo,
} from '../types/dns';

declare global {
  interface Window {
    dnsApi?: {
      isElectron: boolean;
      getPlatformInfo: () => Promise<PlatformInfo>;
      getAdapters: () => Promise<{ ok: boolean; mode: string; warning?: string; adapters: NetworkAdapter[] }>;
      applyDns: (payload: any) => Promise<any>;
      resetDns: (payload?: any) => Promise<any>;
      flushCache: () => Promise<any>;
      pingServer: (payload: { ip: string; domain?: string; timeoutMs?: number }) => Promise<DnsLatencyResult>;
      pingBatch: (payload: { ips: string[]; domain?: string; timeoutMs?: number }) => Promise<DnsLatencyResult[]>;
      resolveDomain: (payload: { domain: string; dnsIp?: string }) => Promise<any>;
      getState: () => Promise<AppState>;
      saveState: (state: AppState) => Promise<AppState>;
      updateSettings: (partial: Partial<AppSettings>) => Promise<AppState>;
      appendLog: (entry: Partial<LogEntry>) => Promise<LogEntry>;
      checkGitUpdates: (opts?: any) => Promise<GitUpdateCheckResult>;
      applyGitUpdate: (opts?: any) => Promise<any>;
      onUpdateProgress?: (cb: (data: { downloadedBytes: number; totalBytes: number; percent: number | null }) => void) => () => void;
      openExternal: (url: string) => Promise<void>;
      relaunchApp: () => Promise<void>;
    };
  }
}

function getElectronApi() {
  if (typeof window !== 'undefined' && window.dnsApi) {
    return window.dnsApi;
  }
  throw new Error('DNS Changer Pro desktop bridge (window.dnsApi) is unavailable.');
}

export const bridge = {
  isElectron(): boolean {
    return Boolean(typeof window !== 'undefined' && window.dnsApi?.isElectron);
  },

  async getPlatformInfo(): Promise<PlatformInfo> {
    return getElectronApi().getPlatformInfo();
  },

  async getAdapters(): Promise<{ ok: boolean; mode: string; warning?: string; adapters: NetworkAdapter[] }> {
    return getElectronApi().getAdapters();
  },

  async applyDns(payload: {
    id: string;
    name: string;
    primary: string;
    secondary?: string;
    ipv6Primary?: string;
    ipv6Secondary?: string;
    adapters?: string[];
    ipv6Mode?: string;
    autoFlush?: boolean;
  }) {
    return getElectronApi().applyDns(payload);
  },

  async resetDns(payload?: { adapters?: string[]; autoFlush?: boolean }) {
    return getElectronApi().resetDns(payload);
  },

  async flushCache() {
    return getElectronApi().flushCache();
  },

  async pingServer(ip: string, domain?: string, timeoutMs?: number): Promise<DnsLatencyResult> {
    return getElectronApi().pingServer({ ip, domain, timeoutMs });
  },

  async pingBatch(ips: string[], domain?: string, timeoutMs?: number): Promise<DnsLatencyResult[]> {
    return getElectronApi().pingBatch({ ips, domain, timeoutMs });
  },

  async resolveDomain(domain: string, dnsIp?: string) {
    return getElectronApi().resolveDomain({ domain, dnsIp });
  },

  async getState(): Promise<AppState> {
    return getElectronApi().getState();
  },

  async saveState(state: AppState): Promise<AppState> {
    return getElectronApi().saveState(state);
  },

  async updateSettings(partial: Partial<AppSettings>): Promise<AppState> {
    return getElectronApi().updateSettings(partial);
  },

  async appendLog(entry: Partial<LogEntry>): Promise<LogEntry> {
    return getElectronApi().appendLog(entry);
  },

  async checkGitUpdates(opts?: { owner?: string; repo?: string; branch?: string }): Promise<GitUpdateCheckResult> {
    return getElectronApi().checkGitUpdates(opts);
  },

  async applyGitUpdate(opts?: { owner?: string; repo?: string; branch?: string }) {
    return getElectronApi().applyGitUpdate(opts);
  },

  onUpdateProgress(cb: (data: { downloadedBytes: number; totalBytes: number; percent: number | null }) => void): () => void {
    if (typeof window !== 'undefined' && window.dnsApi?.onUpdateProgress) {
      return window.dnsApi.onUpdateProgress(cb);
    }
    return () => {};
  },

  async openExternal(url: string) {
    return getElectronApi().openExternal(url);
  },

  async relaunchApp() {
    return getElectronApi().relaunchApp();
  },
};

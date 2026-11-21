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
      openExternal: (url: string) => Promise<void>;
      relaunchApp: () => Promise<void>;
    };
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const bridge = {
  isElectron(): boolean {
    return Boolean(typeof window !== 'undefined' && window.dnsApi?.isElectron);
  },

  async getPlatformInfo(): Promise<PlatformInfo> {
    if (window.dnsApi) return window.dnsApi.getPlatformInfo();
    return apiFetch<PlatformInfo>('/api/platform');
  },

  async getAdapters(): Promise<{ ok: boolean; mode: string; warning?: string; adapters: NetworkAdapter[] }> {
    if (window.dnsApi) return window.dnsApi.getAdapters();
    return apiFetch('/api/adapters');
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
    if (window.dnsApi) return window.dnsApi.applyDns(payload);
    return apiFetch('/api/dns/apply', { method: 'POST', body: JSON.stringify(payload) });
  },

  async resetDns(payload?: { adapters?: string[]; autoFlush?: boolean }) {
    if (window.dnsApi) return window.dnsApi.resetDns(payload);
    return apiFetch('/api/dns/reset', { method: 'POST', body: JSON.stringify(payload || {}) });
  },

  async flushCache() {
    if (window.dnsApi) return window.dnsApi.flushCache();
    return apiFetch('/api/dns/flush', { method: 'POST' });
  },

  async pingServer(ip: string, domain?: string, timeoutMs?: number): Promise<DnsLatencyResult> {
    if (window.dnsApi) return window.dnsApi.pingServer({ ip, domain, timeoutMs });
    return apiFetch('/api/dns/ping', {
      method: 'POST',
      body: JSON.stringify({ ip, domain, timeoutMs }),
    });
  },

  async pingBatch(ips: string[], domain?: string, timeoutMs?: number): Promise<DnsLatencyResult[]> {
    if (window.dnsApi) return window.dnsApi.pingBatch({ ips, domain, timeoutMs });
    const data = await apiFetch<{ ok: boolean; results: DnsLatencyResult[] }>('/api/dns/ping-batch', {
      method: 'POST',
      body: JSON.stringify({ ips, domain, timeoutMs }),
    });
    return data.results;
  },

  async resolveDomain(domain: string, dnsIp?: string) {
    if (window.dnsApi) return window.dnsApi.resolveDomain({ domain, dnsIp });
    return apiFetch('/api/dns/resolve', {
      method: 'POST',
      body: JSON.stringify({ domain, dnsIp }),
    });
  },

  async getState(): Promise<AppState> {
    if (window.dnsApi) return window.dnsApi.getState();
    return apiFetch('/api/state');
  },

  async saveState(state: AppState): Promise<AppState> {
    if (window.dnsApi) return window.dnsApi.saveState(state);
    return apiFetch('/api/state', { method: 'POST', body: JSON.stringify(state) });
  },

  async updateSettings(partial: Partial<AppSettings>): Promise<AppState> {
    if (window.dnsApi) return window.dnsApi.updateSettings(partial);
    return apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(partial) });
  },

  async appendLog(entry: Partial<LogEntry>): Promise<LogEntry> {
    if (window.dnsApi) return window.dnsApi.appendLog(entry);
    return apiFetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
  },

  async checkGitUpdates(opts?: { owner?: string; repo?: string; branch?: string }): Promise<GitUpdateCheckResult> {
    if (window.dnsApi) return window.dnsApi.checkGitUpdates(opts);
    return apiFetch('/api/git/check', { method: 'POST', body: JSON.stringify(opts || {}) });
  },

  async applyGitUpdate(opts?: { owner?: string; repo?: string; branch?: string }) {
    if (window.dnsApi) return window.dnsApi.applyGitUpdate(opts);
    return apiFetch('/api/git/update', { method: 'POST', body: JSON.stringify(opts || {}) });
  },

  async openExternal(url: string) {
    if (window.dnsApi) return window.dnsApi.openExternal(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  async relaunchApp() {
    if (window.dnsApi) return window.dnsApi.relaunchApp();
    window.location.reload();
  },
};

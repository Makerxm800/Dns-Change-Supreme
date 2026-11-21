export type RegionName =
  | 'Global'
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Middle East & Africa';

export type DnsCategory =
  | 'Speed & Standard'
  | 'Privacy & No-Logs'
  | 'Ad-Blocking'
  | 'Malware & Security'
  | 'Family Safe'
  | 'Uncensored'
  | 'Gaming & Low-Ping';

export interface DnsServer {
  id: string;
  name: string;
  provider: string;
  primary: string;
  secondary: string;
  ipv6Primary?: string;
  ipv6Secondary?: string;
  dohUrl?: string;
  dotHost?: string;
  region: RegionName;
  countryCode: string; // ISO 3166-1 alpha-2 ('US', 'CA', 'DE', 'CH', 'JP', etc. or 'UN' for Global Anycast)
  countryName: string;
  city?: string;
  categories: DnsCategory[];
  dnssec: boolean;
  noLogs: boolean;
  anycast: boolean;
  description: string;
  isCustom?: boolean;
}

export interface DnsLatencyResult {
  ip: string;
  ok: boolean;
  latencyMs: number | null;
  error?: string;
  testedAt?: string;
}

export interface NetworkAdapter {
  name: string;
  description: string;
  type: 'Wi-Fi' | 'Ethernet' | string;
  status: 'Connected' | 'Disconnected' | string;
  ipAddress: string;
  macAddress: string;
  dnsServers: string[];
  ipv6DnsServers: string[];
  isDhcp: boolean;
  isPrimary: boolean;
}

export interface AppSettings {
  launchOnStartup: boolean;
  startMinimized: boolean;
  minimizeToTrayOnClose: boolean;
  autoConnectOnStartup: boolean;
  restoreDhcpOnExit: boolean;
  adapterScope: 'primary' | 'connected' | 'selected';
  selectedAdapters: string[];
  autoFlushCache: boolean;
  ipv6Mode: 'apply' | 'ipv4-only' | 'disable';
  benchmarkDomain: string;
  benchmarkTimeoutMs: number;
  elevatePromptMode: 'on-demand' | 'always';
  confirmBeforeReset: boolean;
  autoFailover: boolean;
  failoverCheckIntervalSec: number;
  theme: 'dark' | 'midnight' | 'light';
  compactCards: boolean;
  showIpv6InList: boolean;
  defaultRegion: string;
  gitRepoOwner: string;
  gitRepoName: string;
  gitBranch: string;
  autoCheckUpdates: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  action: string;
  message: string;
  details?: string;
}

export interface AppState {
  settings: AppSettings;
  favorites: string[];
  customServers: DnsServer[];
  activeServerId: string | null;
  lastUsedServerId: string | null;
  logs: LogEntry[];
}

export interface PlatformInfo {
  platform: string;
  arch: string;
  osLabel: string;
  hostname: string;
  release: string;
  isNativeSupported: boolean;
  isAdmin: boolean;
  mode: 'native' | 'sandbox-preview';
}

export interface GitUpdateCheckResult {
  ok: boolean;
  error?: string;
  version: string;
  isGitRepo: boolean;
  localSha: string | null;
  localBranch: string | null;
  dirty: boolean;
  owner: string;
  repo: string;
  branch: string;
  remoteSha: string | null;
  remoteShortSha: string | null;
  remoteCommitMessage: string;
  remoteAuthor: string;
  remoteDate: string | null;
  remoteUrl: string;
  recentCommits: Array<{
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }>;
  latestRelease: {
    tagName: string;
    name: string;
    publishedAt: string;
    htmlUrl: string;
    body: string;
    assets: Array<{ name: string; size: number; downloadUrl: string }>;
  } | null;
  hasNewRelease: boolean;
  hasNewCommit: boolean;
  localContainsRemote: boolean;
  updateAvailable: boolean;
  checkedAt: string;
}

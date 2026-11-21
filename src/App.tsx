import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Globe, Gauge, PlusCircle, Cpu, Settings as SettingsIcon } from 'lucide-react';
import { DNS_SERVERS } from './data/dnsServers';
import type {
  AppSettings,
  AppState,
  DnsLatencyResult,
  DnsServer,
  GitUpdateCheckResult,
  NetworkAdapter,
  PlatformInfo,
} from './types/dns';
import { bridge } from './services/bridge';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { ServersTab } from './components/ServersTab';
import { BenchmarkTab } from './components/BenchmarkTab';
import { CustomDnsTab } from './components/CustomDnsTab';
import { SystemTab } from './components/SystemTab';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, type ToastMessage } from './components/ToastContainer';

const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTrayOnClose: true,
  autoConnectOnStartup: false,
  restoreDhcpOnExit: false,
  adapterScope: 'connected',
  selectedAdapters: [],
  autoFlushCache: true,
  ipv6Mode: 'apply',
  benchmarkDomain: 'cloudflare.com',
  benchmarkTimeoutMs: 1800,
  elevatePromptMode: 'on-demand',
  confirmBeforeReset: true,
  autoFailover: false,
  failoverCheckIntervalSec: 60,
  theme: 'dark',
  compactCards: false,
  showIpv6InList: true,
  defaultRegion: 'All',
  gitRepoOwner: 'Makerxm800',
  gitRepoName: 'Dns-Change-Supreme',
  gitBranch: 'main',
  autoCheckUpdates: true,
};

const TABS = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'servers', label: 'DNS Servers', icon: Globe },
  { id: 'benchmark', label: 'Speed Test', icon: Gauge },
  { id: 'custom', label: 'Custom DNS', icon: PlusCircle },
  { id: 'system', label: 'System & Network', icon: Cpu },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string>('general');

  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [appState, setAppState] = useState<AppState>({
    settings: DEFAULT_SETTINGS,
    favorites: ['cloudflare-std', 'google-std', 'quad9-sec', 'adguard-def', 'cira-private', 'mullvad-std'],
    customServers: [],
    activeServerId: null,
    lastUsedServerId: null,
    logs: [],
  });

  const [latencies, setLatencies] = useState<Record<string, DnsLatencyResult>>({});
  const [busy, setBusy] = useState(false);
  const [testingBatch, setTestingBatch] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitUpdateCheckResult | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [updateResultMessage, setUpdateResultMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const allServers = useMemo(() => {
    return [...appState.customServers, ...DNS_SERVERS];
  }, [appState.customServers]);

  const activeServer = useMemo(() => {
    if (!appState.activeServerId) return null;
    return allServers.find((s) => s.id === appState.activeServerId) || null;
  }, [allServers, appState.activeServerId]);

  const refreshAdapters = useCallback(async () => {
    try {
      const res = await bridge.getAdapters();
      setAdapters(res.adapters || []);
    } catch {
      // ignore
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const st = await bridge.getState();
      setAppState(st);
      return st;
    } catch {
      return null;
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    setUpdateResultMessage(null);
    try {
      const res = await bridge.checkGitUpdates();
      setGitStatus(res);
      if (res.ok && res.updateAvailable) {
        addToast({
          type: 'info',
          title: 'Git Update Available',
          message: `Latest commit ${res.remoteShortSha}: ${res.remoteCommitMessage}`,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Check Failed', message: err.message });
    } finally {
      setCheckingUpdates(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [pInfo, st] = await Promise.all([bridge.getPlatformInfo(), refreshState()]);
      if (!mounted) return;
      setPlatformInfo(pInfo);
      await refreshAdapters();
      if (st?.settings?.autoCheckUpdates) {
        handleCheckUpdates();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshAdapters, refreshState, handleCheckUpdates]);

  // Keyboard shortcut Ctrl/Cmd + , for Settings Popup
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsSection('general');
        setSettingsOpen(true);
      } else if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  const getTargetAdapterNames = useCallback((): string[] | undefined => {
    const scope = appState.settings.adapterScope;
    if (scope === 'selected' && appState.settings.selectedAdapters.length > 0) {
      return appState.settings.selectedAdapters;
    }
    if (scope === 'primary') {
      const primary = adapters.find((a) => a.isPrimary) || adapters.find((a) => a.status === 'Connected');
      return primary ? [primary.name] : undefined;
    }
    return undefined;
  }, [appState.settings, adapters]);

  const handleApplyServer = async (server: DnsServer) => {
    setBusy(true);
    try {
      await bridge.applyDns({
        id: server.id,
        name: server.name,
        primary: server.primary,
        secondary: server.secondary,
        ipv6Primary: server.ipv6Primary,
        ipv6Secondary: server.ipv6Secondary,
        adapters: getTargetAdapterNames(),
        ipv6Mode: appState.settings.ipv6Mode,
        autoFlush: appState.settings.autoFlushCache,
      });
      await Promise.all([refreshState(), refreshAdapters()]);
      addToast({
        type: 'success',
        title: `Connected to ${server.name}`,
        message: `DNS set to ${server.primary}${server.secondary ? ` / ${server.secondary}` : ''}`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Apply DNS', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleResetDns = async () => {
    if (appState.settings.confirmBeforeReset && activeServer) {
      // Non-blocking clean confirmation if needed, or proceed cleanly
    }
    setBusy(true);
    try {
      await bridge.resetDns({
        adapters: getTargetAdapterNames(),
        autoFlush: appState.settings.autoFlushCache,
      });
      await Promise.all([refreshState(), refreshAdapters()]);
      addToast({
        type: 'info',
        title: 'Restored ISP / DHCP DNS',
        message: 'Network adapters returned to automatic DNS.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Failed', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleFlushCache = async () => {
    setBusy(true);
    try {
      const res = await bridge.flushCache();
      await refreshState();
      addToast({
        type: 'success',
        title: 'DNS Cache Flushed',
        message: res.output || 'System DNS resolver cache cleared.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Flush Failed', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const exists = appState.favorites.includes(id);
    const nextFavs = exists ? appState.favorites.filter((x) => x !== id) : [...appState.favorites, id];
    const nextState = { ...appState, favorites: nextFavs };
    setAppState(nextState);
    await bridge.saveState(nextState);
  };

  const handlePingServer = async (server: DnsServer) => {
    const res = await bridge.pingServer(
      server.primary,
      appState.settings.benchmarkDomain,
      appState.settings.benchmarkTimeoutMs
    );
    setLatencies((prev) => ({
      ...prev,
      [server.primary]: { ...res, testedAt: new Date().toISOString() },
    }));
  };

  const handlePingBatch = async (list: DnsServer[]) => {
    if (list.length === 0) return;
    setTestingBatch(true);
    try {
      const uniqueIps = Array.from(new Set(list.map((s) => s.primary)));
      const results = await bridge.pingBatch(
        uniqueIps,
        appState.settings.benchmarkDomain,
        appState.settings.benchmarkTimeoutMs
      );
      setLatencies((prev) => {
        const next = { ...prev };
        for (const r of results) {
          next[r.ip] = { ...r, testedAt: new Date().toISOString() };
        }
        return next;
      });
      const online = results.filter((r) => r.ok).length;
      addToast({
        type: 'info',
        title: 'DNS Benchmark Complete',
        message: `${online} of ${results.length} DNS servers responded.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Benchmark Error', message: err.message });
    } finally {
      setTestingBatch(false);
    }
  };

  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await bridge.updateSettings(partial);
    setAppState(updated);
  };

  const handleResetDefaultSettings = async () => {
    const updated = await bridge.updateSettings(DEFAULT_SETTINGS);
    setAppState(updated);
    addToast({ type: 'info', title: 'Settings Reset', message: 'Restored default system settings.' });
  };

  const handleImportState = async (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      const merged: AppState = {
        ...appState,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
      const saved = await bridge.saveState(merged);
      setAppState(saved);
      addToast({ type: 'success', title: 'Backup Imported', message: 'Settings and profiles restored.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Invalid Backup File', message: err.message });
    }
  };

  const handleAddOrUpdateCustom = async (server: DnsServer) => {
    const exists = appState.customServers.some((s) => s.id === server.id);
    const nextCustom = exists
      ? appState.customServers.map((s) => (s.id === server.id ? server : s))
      : [server, ...appState.customServers];
    const nextState = { ...appState, customServers: nextCustom };
    const saved = await bridge.saveState(nextState);
    setAppState(saved);
    addToast({ type: 'success', title: 'Custom Profile Saved', message: `${server.name} (${server.primary})` });
  };

  const handleDeleteCustom = async (id: string) => {
    const nextState = {
      ...appState,
      customServers: appState.customServers.filter((s) => s.id !== id),
    };
    const saved = await bridge.saveState(nextState);
    setAppState(saved);
    addToast({ type: 'info', title: 'Custom Profile Removed' });
  };

  const handleClearLogs = async () => {
    const saved = await bridge.saveState({ ...appState, logs: [] });
    setAppState(saved);
  };

  const handleApplyGitUpdate = async () => {
    setApplyingUpdate(true);
    setUpdateResultMessage(null);
    try {
      const res = await bridge.applyGitUpdate();
      setUpdateResultMessage(res.message);
      await refreshState();
      if (res.downloadUrl) {
        bridge.openExternal(res.downloadUrl);
      }
      addToast({
        type: res.ok ? 'success' : 'warn',
        title: res.updated ? 'Updated from Latest Git' : 'Git Update Status',
        message: res.message,
      });
    } catch (err: any) {
      setUpdateResultMessage(err.message);
      addToast({ type: 'error', title: 'Git Update Failed', message: err.message });
    } finally {
      setApplyingUpdate(false);
    }
  };

  const openSettingsModal = (section = 'general') => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const theme = appState.settings.theme;
  const isLight = theme === 'light';
  const rootBg =
    theme === 'light'
      ? 'bg-slate-100 text-slate-900'
      : theme === 'midnight'
        ? 'bg-[#060919] text-slate-100'
        : 'bg-slate-950 text-slate-100';

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${rootBg}`}>
      <Header
        platformInfo={platformInfo}
        activeServer={activeServer}
        gitStatus={gitStatus}
        checkingUpdates={checkingUpdates}
        isLight={isLight}
        onOpenSettings={openSettingsModal}
        onCheckUpdates={handleCheckUpdates}
        onResetDns={handleResetDns}
        busy={busy}
      />

      {/* Home Page Working Tab Bar */}
      <div
        className={`border-b ${
          isLight ? 'bg-white/75 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto">
          <nav className="flex items-center gap-1 py-2" role="tablist" aria-label="Home Navigation Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/35 shadow-sm'
                      : isLight
                        ? 'text-slate-600 hover:bg-slate-200/70 border border-transparent'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'servers' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                      {allServers.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Direct Settings Popup Tab Trigger */}
          <button
            onClick={() => openSettingsModal('general')}
            data-testid="tab-bar-settings-popup-btn"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              isLight
                ? 'border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
            Settings Popup
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            activeServer={activeServer}
            servers={allServers}
            favorites={appState.favorites}
            latencies={latencies}
            adapters={adapters}
            settings={appState.settings}
            platformInfo={platformInfo}
            busy={busy}
            onApplyServer={handleApplyServer}
            onResetDns={handleResetDns}
            onFlushCache={handleFlushCache}
            onToggleFavorite={handleToggleFavorite}
            onPingServer={handlePingServer}
            onGoToTab={setActiveTab}
            onOpenSettings={openSettingsModal}
          />
        )}

        {activeTab === 'servers' && (
          <ServersTab
            servers={allServers}
            activeServerId={appState.activeServerId}
            favorites={appState.favorites}
            latencies={latencies}
            settings={appState.settings}
            busy={busy}
            testingBatch={testingBatch}
            onApplyServer={handleApplyServer}
            onToggleFavorite={handleToggleFavorite}
            onPingServer={handlePingServer}
            onPingVisible={handlePingBatch}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkTab
            servers={allServers}
            activeServerId={appState.activeServerId}
            latencies={latencies}
            settings={appState.settings}
            testingBatch={testingBatch}
            busy={busy}
            onPingServers={handlePingBatch}
            onApplyServer={handleApplyServer}
          />
        )}

        {activeTab === 'custom' && (
          <CustomDnsTab
            customServers={appState.customServers}
            activeServerId={appState.activeServerId}
            settings={appState.settings}
            busy={busy}
            onAddOrUpdateCustom={handleAddOrUpdateCustom}
            onDeleteCustom={handleDeleteCustom}
            onApplyServer={handleApplyServer}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            adapters={adapters}
            platformInfo={platformInfo}
            settings={appState.settings}
            logs={appState.logs}
            busy={busy}
            onRefreshAdapters={refreshAdapters}
            onFlushCache={handleFlushCache}
            onResetDns={handleResetDns}
            onClearLogs={handleClearLogs}
            onOpenSettings={openSettingsModal}
          />
        )}
      </main>

      {/* Settings Popup UI Modal */}
      <SettingsModal
        open={settingsOpen}
        initialSection={settingsSection}
        settings={appState.settings}
        appState={appState}
        adapters={adapters}
        gitStatus={gitStatus}
        checkingUpdates={checkingUpdates}
        applyingUpdate={applyingUpdate}
        updateResultMessage={updateResultMessage}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetDefaultSettings}
        onImportState={handleImportState}
        onCheckUpdates={handleCheckUpdates}
        onApplyGitUpdate={handleApplyGitUpdate}
        onOpenExternal={(url) => bridge.openExternal(url)}
        onRelaunchApp={() => bridge.relaunchApp()}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}

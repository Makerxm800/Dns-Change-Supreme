import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Network,
  Shield,
  Palette,
  GitBranch,
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type {
  AppSettings,
  AppState,
  GitUpdateCheckResult,
  NetworkAdapter,
} from '../types/dns';
import { REGIONS } from '../data/dnsServers';

interface SettingsModalProps {
  open: boolean;
  initialSection?: string;
  settings: AppSettings;
  appState: AppState;
  adapters: NetworkAdapter[];
  gitStatus: GitUpdateCheckResult | null;
  checkingUpdates: boolean;
  applyingUpdate: boolean;
  updateResultMessage: string | null;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onImportState: (jsonText: string) => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  onApplyGitUpdate: () => Promise<void>;
  onOpenExternal: (url: string) => void;
  onRelaunchApp: () => void;
}

const SECTIONS = [
  { id: 'general', label: 'General & Startup', icon: Sliders },
  { id: 'system', label: 'System & Network', icon: Network },
  { id: 'safety', label: 'Safety & Backup', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'updates', label: 'Git App Updates', icon: GitBranch },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  initialSection = 'general',
  settings,
  appState,
  adapters,
  gitStatus,
  checkingUpdates,
  applyingUpdate,
  updateResultMessage,
  onClose,
  onUpdateSettings,
  onResetDefaults,
  onImportState,
  onCheckUpdates,
  onApplyGitUpdate,
  onOpenExternal,
  onRelaunchApp,
}) => {
  const [section, setSection] = useState(initialSection);
  const [repoOwner, setRepoOwner] = useState(settings.gitRepoOwner);
  const [repoName, setRepoName] = useState(settings.gitRepoName);
  const [repoBranch, setRepoBranch] = useState(settings.gitBranch);

  useEffect(() => {
    if (open) {
      setSection(initialSection || 'general');
      setRepoOwner(settings.gitRepoOwner);
      setRepoName(settings.gitRepoName);
      setRepoBranch(settings.gitBranch);
    }
  }, [open, initialSection, settings.gitRepoOwner, settings.gitRepoName, settings.gitBranch]);

  if (!open) return null;

  const isLight = settings.theme === 'light';

  const ToggleRow = ({
    label,
    desc,
    checked,
    onChange,
  }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <div
      className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-sky-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dns-change-supreme-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportState(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      data-testid="settings-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-950 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">System & App Settings</h2>
              <p className="text-xs text-slate-400">
                Configure Windows / macOS network behavior, startup, appearance & Git updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="close-settings-btn"
            className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Sidebar */}
          <aside
            className={`w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-3 flex md:flex-col gap-1 overflow-x-auto ${
              isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-900/30'
            }`}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  data-testid={`settings-nav-${s.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    active
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : isLight
                        ? 'text-slate-600 hover:bg-slate-200/70 border border-transparent'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{s.label}</span>
                  {s.id === 'updates' && gitStatus?.updateAvailable && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400">
                      New
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {section === 'general' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                  Startup & Tray Behavior
                </h3>
                <ToggleRow
                  label="Launch DNS Change Supreme on system login"
                  desc="Automatically starts the app when Windows or macOS boots up."
                  checked={settings.launchOnStartup}
                  onChange={(v) => onUpdateSettings({ launchOnStartup: v })}
                />
                <ToggleRow
                  label="Start minimized to System Tray / Menu Bar"
                  desc="Keep the app quietly in the background tray when launched."
                  checked={settings.startMinimized}
                  onChange={(v) => onUpdateSettings({ startMinimized: v })}
                />
                <ToggleRow
                  label="Minimize to Tray instead of quitting"
                  desc="Clicking the window close button hides the window to the system tray."
                  checked={settings.minimizeToTrayOnClose}
                  onChange={(v) => onUpdateSettings({ minimizeToTrayOnClose: v })}
                />
                <ToggleRow
                  label="Auto-connect last DNS on app launch"
                  desc="Re-applies your last selected DNS server automatically when the app opens."
                  checked={settings.autoConnectOnStartup}
                  onChange={(v) => onUpdateSettings({ autoConnectOnStartup: v })}
                />
                <ToggleRow
                  label="Restore ISP / DHCP DNS on app quit"
                  desc="Automatically resets adapters back to automatic DHCP when exiting the application."
                  checked={settings.restoreDhcpOnExit}
                  onChange={(v) => onUpdateSettings({ restoreDhcpOnExit: v })}
                />
              </div>
            )}

            {section === 'system' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                  Windows & macOS Network Engine
                </h3>

                {/* Adapter Scope */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">Target Network Adapters</div>
                    <div className="text-xs text-slate-400">
                      Choose which network interfaces receive DNS changes (Wi-Fi, Ethernet, USB, etc.)
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'connected', label: 'All Connected', hint: 'Every active adapter' },
                      { id: 'primary', label: 'Primary Only', hint: 'Main internet interface' },
                      { id: 'selected', label: 'Custom Selection', hint: 'Pick specific adapters' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onUpdateSettings({ adapterScope: opt.id as any })}
                        className={`p-3 rounded-xl border text-left transition ${
                          settings.adapterScope === opt.id
                            ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                            : isLight
                              ? 'border-slate-200 bg-white hover:border-slate-300'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[11px] opacity-75">{opt.hint}</div>
                      </button>
                    ))}
                  </div>

                  {settings.adapterScope === 'selected' && (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-xs font-medium text-slate-400">Select Adapters:</div>
                      {adapters.map((a) => {
                        const checked = settings.selectedAdapters.includes(a.name);
                        return (
                          <label
                            key={a.name}
                            className="flex items-center gap-2.5 text-xs p-2 rounded-lg border border-slate-800/70 cursor-pointer hover:bg-slate-800/30"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? settings.selectedAdapters.filter((x) => x !== a.name)
                                  : [...settings.selectedAdapters, a.name];
                                onUpdateSettings({ selectedAdapters: next });
                              }}
                              className="rounded border-slate-600 text-sky-500"
                            />
                            <span className="font-semibold">{a.name}</span>
                            <span className="text-slate-400">({a.type} · {a.status})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* IPv6 Mode */}
                <div
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">IPv6 DNS Handling (Leak Protection)</div>
                  <div className="text-xs text-slate-400">
                    Controls how IPv6 DNS is configured when applying a server.
                  </div>
                  <select
                    value={settings.ipv6Mode}
                    onChange={(e) => onUpdateSettings({ ipv6Mode: e.target.value as any })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-slate-100'
                    }`}
                  >
                    <option value="apply">Apply IPv6 DNS when provider supports IPv6 (Recommended)</option>
                    <option value="ipv4-only">IPv4 DNS Only (Leave IPv6 untouched)</option>
                    <option value="disable">Disable IPv6 DNS / Prevent IPv6 ISP leaks</option>
                  </select>
                </div>

                <ToggleRow
                  label="Auto-flush OS DNS cache on every change"
                  desc="Runs ipconfig /flushdns (Windows) or dscacheutil + mDNSResponder (macOS) immediately."
                  checked={settings.autoFlushCache}
                  onChange={(v) => onUpdateSettings({ autoFlushCache: v })}
                />

                {/* Benchmark Domain & Timeout */}
                <div
                  className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <label className="text-xs font-semibold block mb-1">Benchmark Test Domain</label>
                    <input
                      type="text"
                      value={settings.benchmarkDomain}
                      onChange={(e) => onUpdateSettings({ benchmarkDomain: e.target.value || 'cloudflare.com' })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">DNS Ping Timeout (ms)</label>
                    <input
                      type="number"
                      min={400}
                      max={5000}
                      step={100}
                      value={settings.benchmarkTimeoutMs}
                      onChange={(e) =>
                        onUpdateSettings({ benchmarkTimeoutMs: Math.max(400, Number(e.target.value) || 1800) })
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {section === 'safety' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                  Safety, Backup & Profiles
                </h3>
                <ToggleRow
                  label="Confirm before resetting to ISP / DHCP"
                  desc="Asks for confirmation before clearing your custom DNS servers."
                  checked={settings.confirmBeforeReset}
                  onChange={(v) => onUpdateSettings({ confirmBeforeReset: v })}
                />
                <ToggleRow
                  label="Auto-check GitHub for updates on launch"
                  desc="Checks Makerxm800/Dns-Change-Supreme in the background when opening the app."
                  checked={settings.autoCheckUpdates}
                  onChange={(v) => onUpdateSettings({ autoCheckUpdates: v })}
                />

                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">Backup & Restore Configuration</div>
                  <div className="text-xs text-slate-400">
                    Export or import your system settings, favorite servers, and custom DNS profiles as JSON.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleExportJson}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Backup JSON
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      Import Backup JSON
                      <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
                    </label>
                    <button
                      onClick={onResetDefaults}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Default Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                  Appearance & Preferences
                </h3>

                <div
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">Color Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'dark', label: 'Dark Supreme', preview: 'bg-slate-950 border-slate-700' },
                      { id: 'midnight', label: 'Midnight Indigo', preview: 'bg-[#080b1c] border-indigo-700' },
                      { id: 'light', label: 'Clean Light', preview: 'bg-slate-100 border-slate-300' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onUpdateSettings({ theme: t.id as any })}
                        className={`p-3 rounded-xl border text-left transition ${
                          settings.theme === t.id
                            ? 'border-sky-500 ring-2 ring-sky-500/30'
                            : isLight
                              ? 'border-slate-200 hover:border-slate-300'
                              : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-full h-5 rounded-md border mb-2 ${t.preview}`} />
                        <div className="text-xs font-semibold">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <ToggleRow
                  label="Compact DNS server cards"
                  desc="Show more servers at once with tighter vertical spacing."
                  checked={settings.compactCards}
                  onChange={(v) => onUpdateSettings({ compactCards: v })}
                />
                <ToggleRow
                  label="Show IPv6 addresses on server cards"
                  desc="Displays secondary IPv6 resolver addresses directly inside the server list."
                  checked={settings.showIpv6InList}
                  onChange={(v) => onUpdateSettings({ showIpv6InList: v })}
                />

                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">Default Region Filter</div>
                  <select
                    value={settings.defaultRegion}
                    onChange={(e) => onUpdateSettings({ defaultRegion: e.target.value })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-slate-100'
                    }`}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r === 'All' ? 'All Regions' : r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {section === 'updates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                      Update App from Latest Git
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sync directly with GitHub repository commits and latest Windows/macOS releases.
                    </p>
                  </div>
                  <button
                    onClick={onCheckUpdates}
                    disabled={checkingUpdates}
                    data-testid="check-git-updates-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                    {checkingUpdates ? 'Checking...' : 'Check Latest Git'}
                  </button>
                </div>

                {/* Git Repo Config */}
                <div
                  className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">GitHub Owner</label>
                    <input
                      type="text"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      onBlur={() => onUpdateSettings({ gitRepoOwner: repoOwner.trim() || 'Makerxm800' })}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none ${
                        isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Repository</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      onBlur={() => onUpdateSettings({ gitRepoName: repoName.trim() || 'Dns-Change-Supreme' })}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none ${
                        isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Branch</label>
                    <input
                      type="text"
                      value={repoBranch}
                      onChange={(e) => setRepoBranch(e.target.value)}
                      onBlur={() => onUpdateSettings({ gitBranch: repoBranch.trim() || 'main' })}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none ${
                        isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Status Card */}
                {gitStatus ? (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      gitStatus.ok
                        ? gitStatus.updateAvailable
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {gitStatus.ok ? (
                          gitStatus.updateAvailable ? (
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400" />
                        )}
                        <div>
                          <div className="text-sm font-bold">
                            {!gitStatus.ok
                              ? 'Could not reach GitHub'
                              : gitStatus.updateAvailable
                                ? 'New Git Update Available!'
                                : 'You are running the latest version'}
                          </div>
                          <div className="text-xs text-slate-400">
                            Local v{gitStatus.version}
                            {gitStatus.localSha ? ` · ${gitStatus.localSha.slice(0, 7)}` : ''}
                            {gitStatus.remoteShortSha ? ` → Remote ${gitStatus.remoteShortSha}` : ''}
                          </div>
                        </div>
                      </div>

                      {gitStatus.ok && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={onApplyGitUpdate}
                            disabled={applyingUpdate}
                            data-testid="apply-git-update-btn"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {applyingUpdate ? 'Updating...' : 'Update from Latest Git'}
                          </button>
                          <button
                            onClick={() => onOpenExternal(gitStatus.remoteUrl)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            GitHub
                          </button>
                        </div>
                      )}
                    </div>

                    {updateResultMessage && (
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-2">
                        <span>{updateResultMessage}</span>
                        <button
                          onClick={onRelaunchApp}
                          className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 font-bold text-[11px] shrink-0"
                        >
                          Reload / Relaunch
                        </button>
                      </div>
                    )}

                    {/* Recent Commits */}
                    {gitStatus.recentCommits?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Latest Commits on {gitStatus.owner}/{gitStatus.repo} ({gitStatus.branch})
                        </div>
                        <div className="space-y-1.5">
                          {gitStatus.recentCommits.map((c) => (
                            <div
                              key={c.sha}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
                                isLight ? 'bg-white border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">{c.message}</div>
                                <div className="text-[11px] text-slate-400">
                                  {c.author} · {new Date(c.date).toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => onOpenExternal(c.url)}
                                className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 hover:bg-sky-500/20"
                              >
                                {c.shortSha}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    Click &ldquo;Check Latest Git&rdquo; to inspect remote commits and Windows/macOS builds from{' '}
                    <span className="text-sky-400 font-mono">
                      {settings.gitRepoOwner}/{settings.gitRepoName}
                    </span>
                    .
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

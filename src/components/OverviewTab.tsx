import React from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Zap,
  Trash2,
  RotateCcw,
  Star,
  Globe,
  Wifi,
  Settings,
  ArrowRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import type {
  AppSettings,
  DnsLatencyResult,
  DnsServer,
  NetworkAdapter,
  PlatformInfo,
} from '../types/dns';
import { CountryFlag } from './CountryFlag';

interface OverviewTabProps {
  activeServer: DnsServer | null;
  servers: DnsServer[];
  favorites: string[];
  latencies: Record<string, DnsLatencyResult>;
  adapters: NetworkAdapter[];
  settings: AppSettings;
  platformInfo: PlatformInfo | null;
  busy: boolean;
  onApplyServer: (server: DnsServer) => void;
  onResetDns: () => void;
  onFlushCache: () => void;
  onToggleFavorite: (id: string) => void;
  onPingServer: (server: DnsServer) => void;
  onGoToTab: (tab: string) => void;
  onOpenSettings: (section?: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  activeServer,
  servers,
  favorites,
  latencies,
  adapters,
  settings,
  platformInfo,
  busy,
  onApplyServer,
  onResetDns,
  onFlushCache,
  onToggleFavorite,
  onPingServer,
  onGoToTab,
  onOpenSettings,
}) => {
  const isLight = settings.theme === 'light';
  const connectedAdapters = adapters.filter((a) => a.status === 'Connected');
  const favoriteServers = servers.filter((s) => favorites.includes(s.id)).slice(0, 6);
  const activeLatency = activeServer ? latencies[activeServer.primary] : null;
  const primaryAdapter = connectedAdapters.find((a) => a.isPrimary) || connectedAdapters[0];

  const cardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900/70 border-slate-800 text-slate-100';

  return (
    <div className="animate-tab-enter space-y-6">
      {/* Hero Connection Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
          activeServer
            ? isLight
              ? 'bg-gradient-to-br from-emerald-50 via-white to-sky-50 border-emerald-200 shadow-lg shadow-emerald-500/5'
              : 'bg-gradient-to-br from-emerald-950/50 via-slate-900 to-sky-950/40 border-emerald-500/35 shadow-xl shadow-emerald-500/5'
            : isLight
              ? 'bg-gradient-to-br from-slate-50 via-white to-sky-50 border-slate-200'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 hover:scale-105 ${
                activeServer
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25'
                  : 'bg-slate-800 text-amber-400 border border-slate-700'
              }`}
            >
              {activeServer ? (
                <ShieldCheck className="w-8 h-8 animate-icon-bob" />
              ) : (
                <ShieldOff className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeServer
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeServer ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {activeServer ? 'CUSTOM DNS ACTIVE' : 'ISP DEFAULT (DHCP)'}
                </span>

                {activeLatency?.ok && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25">
                    <Activity className="w-3 h-3" />
                    {activeLatency.latencyMs} ms
                  </span>
                )}
              </div>

              {activeServer ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <CountryFlag
                      code={activeServer.countryCode}
                      countryName={activeServer.countryName}
                      size="lg"
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {activeServer.name}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {activeServer.countryName} · {activeServer.region}
                        {activeServer.city ? ` · ${activeServer.city}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-700/60 text-sky-300">
                      Primary: {activeServer.primary}
                    </span>
                    {activeServer.secondary && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-700/60 text-sky-300">
                        Secondary: {activeServer.secondary}
                      </span>
                    )}
                    {activeServer.ipv6Primary && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-700/60 text-indigo-300">
                        IPv6: {activeServer.ipv6Primary}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Using Automatic ISP DNS
                  </h2>
                  <p className="text-sm text-slate-400 max-w-xl">
                    Pick any verified global or regional DNS server below to boost speed, block ads & malware,
                    or protect your privacy on {platformInfo?.osLabel || 'Windows & macOS'}.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!activeServer ? (
              <button
                onClick={() => {
                  const cf = servers.find((s) => s.id === 'cloudflare-std') || servers[0];
                  if (cf) onApplyServer(cf);
                }}
                disabled={busy}
                data-testid="quick-connect-btn"
                className="btn-press inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                Quick Connect (1.1.1.1)
              </button>
            ) : (
              <button
                onClick={onResetDns}
                disabled={busy}
                data-testid="hero-reset-btn"
                className="btn-press inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold text-xs disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Restore ISP / DHCP
              </button>
            )}

            <button
              onClick={onFlushCache}
              disabled={busy}
              data-testid="hero-flush-btn"
              className={`btn-press inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs disabled:opacity-50 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Trash2 className="w-4 h-4 text-sky-400" />
              Flush DNS Cache
            </button>

            <button
              onClick={() => onGoToTab('servers')}
              className="group btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20"
            >
              Browse All Regions
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* System Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={() => onGoToTab('system')}
          className={`card-hover rounded-2xl border p-4 text-left ${cardBg}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Network Adapters</span>
            <Wifi className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold">{connectedAdapters.length} Connected</div>
          <div className="text-xs text-slate-400 truncate mt-0.5">
            {primaryAdapter ? `${primaryAdapter.name} · ${primaryAdapter.ipAddress}` : `Scope: ${settings.adapterScope}`}
          </div>
        </button>

        <button
          onClick={() => onGoToTab('servers')}
          className={`card-hover rounded-2xl border p-4 text-left ${cardBg}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Global DNS Directory</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold">{servers.length} Servers</div>
          <div className="text-xs text-slate-400 mt-0.5">6 World Regions · Real Flags</div>
        </button>

        <div className={`card-hover rounded-2xl border p-4 ${cardBg}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>System Protection</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold">
            {settings.ipv6Mode === 'apply'
              ? 'IPv4 + IPv6'
              : settings.ipv6Mode === 'disable'
                ? 'IPv6 Blocked'
                : 'IPv4 Only'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Auto-flush: {settings.autoFlushCache ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        <button
          onClick={() => onOpenSettings('system')}
          className={`group card-hover rounded-2xl border p-4 text-left hover:border-sky-500/50 ${cardBg}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>System Engine</span>
            <Settings className="w-4 h-4 text-sky-400 transition-transform duration-300 group-hover:rotate-90" />
          </div>
          <div className="text-base font-bold text-sky-400">Configure Settings</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Startup, Tray, IPv6, Updates
          </div>
        </button>
      </div>

      {/* Quick-Switch Favorites */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Quick-Switch Favorite DNS Servers
            </h3>
            <p className="text-xs text-slate-400">
              One-click connect across top global and regional resolvers
            </p>
          </div>
          <button
            onClick={() => onGoToTab('benchmark')}
            className="group text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
          >
            Run Speed Test{' '}
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {favoriteServers.map((s) => {
            const isActive = activeServer?.id === s.id;
            const lat = latencies[s.primary];
            return (
              <div
                key={s.id}
                className={`card-hover rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    : `${cardBg} hover:border-sky-500/45`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag code={s.countryCode} countryName={s.countryName} size="lg" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{s.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {s.countryName} · {s.region}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(s.id)}
                    className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800/50 active:scale-90 transition-all"
                    title="Remove from favorites"
                  >
                    <Star className="w-4 h-4 fill-amber-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-sky-400">{s.primary} / {s.secondary}</span>
                  <button
                    onClick={() => onPingServer(s)}
                    className={`btn-press px-2.5 py-0.5 rounded-md border ${
                      lat?.ok
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-sky-500'
                    }`}
                  >
                    {lat ? (lat.ok ? `${lat.latencyMs} ms` : 'Timeout') : 'Ping'}
                  </button>
                </div>

                <button
                  onClick={() => onApplyServer(s)}
                  disabled={busy || isActive}
                  className={`btn-press w-full py-2 rounded-xl text-xs font-bold ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/15'
                  }`}
                >
                  {isActive ? 'Connected' : 'Apply DNS'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

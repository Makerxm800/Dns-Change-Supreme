import React from 'react';
import {
  Settings,
  ArrowUpCircle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Monitor,
  Apple,
  Globe,
} from 'lucide-react';
import type { DnsServer, GitUpdateCheckResult, PlatformInfo } from '../types/dns';
import { CountryFlag } from './CountryFlag';

interface HeaderProps {
  platformInfo: PlatformInfo | null;
  activeServer: DnsServer | null;
  gitStatus: GitUpdateCheckResult | null;
  checkingUpdates: boolean;
  isLight: boolean;
  onOpenSettings: (initialSection?: string) => void;
  onCheckUpdates: () => void;
  onResetDns: () => void;
  busy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  platformInfo,
  activeServer,
  gitStatus,
  checkingUpdates,
  isLight,
  onOpenSettings,
  onCheckUpdates,
  onResetDns,
  busy,
}) => {
  const osIcon =
    platformInfo?.platform === 'win32' ? (
      <Monitor className="w-3.5 h-3.5" />
    ) : platformInfo?.platform === 'darwin' ? (
      <Apple className="w-3.5 h-3.5" />
    ) : (
      <Globe className="w-3.5 h-3.5" />
    );

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-200 ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-900'
          : 'bg-slate-950/85 border-slate-800/80 text-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0 group cursor-default">
          <div className="relative shrink-0">
            <img
              src="./icon.png"
              alt="DNS Changer Pro"
              className="w-9 h-9 rounded-xl shadow-md ring-1 ring-sky-400/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
            {activeServer && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight truncate">
                DNS Changer Pro
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25">
                v{gitStatus?.version || '2.1.0'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                {osIcon}
                {platformInfo?.osLabel || 'Detecting OS...'}
              </span>
              {platformInfo?.mode === 'simulation' && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px]">
                  Simulation Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active DNS Pill */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
              activeServer
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
                : isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {activeServer ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 animate-icon-bob" />
                <CountryFlag code={activeServer.countryCode} countryName={activeServer.countryName} size="sm" />
                <span className="truncate max-w-[150px] font-semibold">{activeServer.name}</span>
                <span className="font-mono text-[11px] opacity-80">{activeServer.primary}</span>
                <button
                  onClick={onResetDns}
                  disabled={busy}
                  title="Disconnect & Reset to ISP DHCP"
                  className="ml-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-rose-500/25 hover:text-rose-300 active:scale-95 transition-all text-[10px] font-bold"
                >
                  Reset
                </button>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ISP Default (DHCP)</span>
              </>
            )}
          </div>

          {/* App Update Button */}
          <button
            onClick={() => {
              onCheckUpdates();
              onOpenSettings('updates');
            }}
            data-testid="header-git-update-btn"
            title="Check for App Updates"
            className={`group btn-press relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${
              gitStatus?.updateAvailable
                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/25'
                : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
            }`}
          >
            {checkingUpdates ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <ArrowUpCircle className="w-3.5 h-3.5 text-sky-400 transition-transform duration-200 group-hover:-translate-y-0.5" />
            )}
            <span className="hidden sm:inline">
              {gitStatus?.updateAvailable ? `Update ${gitStatus.latestVersion || ''}` : 'Updates'}
            </span>
            {gitStatus?.updateAvailable && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Single Settings Button */}
          <button
            onClick={() => onOpenSettings('general')}
            data-testid="header-settings-btn"
            className="group btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25"
          >
            <Settings className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};

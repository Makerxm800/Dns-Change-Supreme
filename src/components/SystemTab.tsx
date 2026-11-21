import React, { useState } from 'react';
import {
  Network,
  RefreshCw,
  Trash2,
  RotateCcw,
  Terminal,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  Wifi,
  Cable,
} from 'lucide-react';
import type { AppSettings, LogEntry, NetworkAdapter, PlatformInfo } from '../types/dns';
import { bridge } from '../services/bridge';

interface SystemTabProps {
  adapters: NetworkAdapter[];
  platformInfo: PlatformInfo | null;
  settings: AppSettings;
  logs: LogEntry[];
  busy: boolean;
  onRefreshAdapters: () => Promise<void>;
  onFlushCache: () => Promise<void>;
  onResetDns: () => Promise<void>;
  onClearLogs: () => Promise<void>;
  onOpenSettings: (section?: string) => void;
}

export const SystemTab: React.FC<SystemTabProps> = ({
  adapters,
  platformInfo,
  settings,
  logs,
  busy,
  onRefreshAdapters,
  onFlushCache,
  onResetDns,
  onClearLogs,
  onOpenSettings,
}) => {
  const isLight = settings.theme === 'light';
  const [lookupDomain, setLookupDomain] = useState('example.com');
  const [lookupDnsIp, setLookupDnsIp] = useState('1.1.1.1');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const handleResolveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookingUp(true);
    try {
      const res = await bridge.resolveDomain(lookupDomain, lookupDnsIp.trim() || undefined);
      setLookupResult(res);
    } catch (err: any) {
      setLookupResult({ ok: false, error: err.message });
    } finally {
      setLookingUp(false);
    }
  };

  const surfaceCls = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900/75 border-slate-800 text-slate-100';

  const inputCls = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900'
    : 'bg-slate-950 border-slate-700 text-slate-100';

  return (
    <div className="space-y-5">
      {/* Top System Controls */}
      <div className={`rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${surfaceCls}`}>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            System Network Adapters & OS Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Platform: <strong>{platformInfo?.osLabel || 'Unknown'}</strong> ({platformInfo?.arch}) ·{' '}
            Scope: <strong>{settings.adapterScope}</strong> · IPv6: <strong>{settings.ipv6Mode}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefreshAdapters}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            Refresh Adapters
          </button>
          <button
            onClick={onFlushCache}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Flush OS DNS Cache
          </button>
          <button
            onClick={onResetDns}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All to DHCP
          </button>
          <button
            onClick={() => onOpenSettings('system')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure Engine
          </button>
        </div>
      </div>

      {/* Network Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {adapters.map((a) => (
          <div key={a.name} className={`rounded-2xl border p-4 space-y-2.5 ${surfaceCls}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                  {a.type === 'Wi-Fi' ? <Wifi className="w-4 h-4" /> : <Cable className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate flex items-center gap-2">
                    {a.name}
                    {a.isPrimary && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[10px]">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{a.description}</div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  a.status === 'Connected'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {a.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Local IP / MAC</div>
                <div className="font-mono text-slate-200 mt-0.5 truncate">{a.ipAddress}</div>
                <div className="font-mono text-[10px] text-slate-500 truncate">{a.macAddress}</div>
              </div>
              <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-2.5">
                <div className="text-[10px] text-slate-400 uppercase">Active DNS</div>
                <div className="font-mono text-sky-400 mt-0.5 truncate">
                  {a.dnsServers.length > 0 ? a.dnsServers.join(', ') : 'Automatic (DHCP)'}
                </div>
                {a.ipv6DnsServers.length > 0 && (
                  <div className="font-mono text-[10px] text-indigo-400 truncate">
                    {a.ipv6DnsServers[0]}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live DNS Lookup Diagnostic */}
      <div className={`rounded-2xl border p-5 space-y-3 ${surfaceCls}`}>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold">Live DNS Resolution Test (NSLookup)</h3>
        </div>
        <form onSubmit={handleResolveTest} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={lookupDomain}
            onChange={(e) => setLookupDomain(e.target.value)}
            placeholder="Domain (e.g. cloudflare.com)"
            className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${inputCls}`}
          />
          <input
            type="text"
            value={lookupDnsIp}
            onChange={(e) => setLookupDnsIp(e.target.value)}
            placeholder="Target DNS IP (optional)"
            className={`sm:w-48 rounded-xl border px-3 py-2 text-xs font-mono outline-none ${inputCls}`}
          />
          <button
            type="submit"
            disabled={lookingUp}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
          >
            {lookingUp ? 'Resolving...' : 'Resolve Domain'}
          </button>
        </form>

        {lookupResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              lookupResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {lookupResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="font-mono space-y-0.5">
              <div>
                {lookupResult.domain} via {lookupResult.dnsIp} ({lookupResult.latencyMs} ms)
              </div>
              {lookupResult.ok ? (
                <div>Resolved IPs: {lookupResult.addresses?.join(', ')}</div>
              ) : (
                <div>Error: {lookupResult.error}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity & Command Logs */}
      <div className={`rounded-2xl border p-5 space-y-3 ${surfaceCls}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold">System Activity & Command Log ({logs.length})</h3>
          </div>
          {logs.length > 0 && (
            <button onClick={onClearLogs} className="text-xs text-rose-400 hover:text-rose-300 font-semibold">
              Clear Logs
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {logs.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No activity logged yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.level === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.level === 'warn'
                            ? 'bg-amber-500/20 text-amber-400'
                            : log.level === 'error'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-medium truncate">{log.message}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {log.details && (
                  <pre className="mt-1.5 text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all">
                    {log.details}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

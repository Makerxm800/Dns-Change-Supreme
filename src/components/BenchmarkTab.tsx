import React, { useMemo, useState } from 'react';
import { Gauge, Play, Zap, Trophy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { AppSettings, DnsLatencyResult, DnsServer } from '../types/dns';
import { REGIONS } from '../data/dnsServers';
import { CountryFlag } from './CountryFlag';

interface BenchmarkTabProps {
  servers: DnsServer[];
  activeServerId: string | null;
  latencies: Record<string, DnsLatencyResult>;
  settings: AppSettings;
  testingBatch: boolean;
  busy: boolean;
  onPingServers: (list: DnsServer[]) => Promise<void>;
  onApplyServer: (server: DnsServer) => void;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({
  servers,
  activeServerId,
  latencies,
  settings,
  testingBatch,
  busy,
  onPingServers,
  onApplyServer,
}) => {
  const isLight = settings.theme === 'light';
  const [regionFilter, setRegionFilter] = useState<string>('All');

  const targetServers = useMemo(() => {
    return regionFilter === 'All' ? servers : servers.filter((s) => s.region === regionFilter);
  }, [servers, regionFilter]);

  const ranked = useMemo(() => {
    return [...targetServers].sort((a, b) => {
      const la = latencies[a.primary];
      const lb = latencies[b.primary];
      const va = la?.ok && la.latencyMs !== null ? la.latencyMs : 999999;
      const vb = lb?.ok && lb.latencyMs !== null ? lb.latencyMs : 999999;
      return va - vb;
    });
  }, [targetServers, latencies]);

  const fastest = useMemo(() => {
    return ranked.find((s) => latencies[s.primary]?.ok && latencies[s.primary].latencyMs !== null) || null;
  }, [ranked, latencies]);

  const testedCount = targetServers.filter((s) => Boolean(latencies[s.primary])).length;
  const onlineCount = targetServers.filter((s) => latencies[s.primary]?.ok).length;

  const surfaceCls = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900/75 border-slate-800 text-slate-100';

  return (
    <div className="animate-tab-enter space-y-5">
      {/* Control Header */}
      <div className={`rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${surfaceCls}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold">Live DNS Speed Benchmark</h2>
          </div>
          <p className="text-xs text-slate-400">
            Sends real UDP/53 DNS A-record queries for <span className="font-mono text-sky-400">{settings.benchmarkDomain}</span> to measure real round-trip latency from your network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-slate-950 border-slate-700 text-slate-100'
            }`}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r === 'All' ? 'All Regions' : r}
              </option>
            ))}
          </select>

          <button
            onClick={() => onPingServers(targetServers)}
            disabled={testingBatch}
            data-testid="run-benchmark-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {testingBatch ? 'Benchmarking...' : `Test ${targetServers.length} Servers`}
          </button>

          {fastest && (
            <button
              onClick={() => onApplyServer(fastest)}
              disabled={busy || activeServerId === fastest.id}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
            >
              <Trophy className="w-4 h-4" />
              Apply Fastest ({fastest.name}: {latencies[fastest.primary].latencyMs} ms)
            </button>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${surfaceCls}`}>
          <div className="text-xs text-slate-400">Tested / Target</div>
          <div className="text-xl font-bold mt-1">
            {testedCount} / {targetServers.length}
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${surfaceCls}`}>
          <div className="text-xs text-slate-400">Reachable Online</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{onlineCount}</div>
        </div>
        <div className={`rounded-2xl border p-4 ${surfaceCls}`}>
          <div className="text-xs text-slate-400">Fastest Server</div>
          <div className="text-base font-bold text-sky-400 mt-1 truncate">
            {fastest ? `${fastest.name} (${latencies[fastest.primary].latencyMs} ms)` : 'Run test to measure'}
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className={`rounded-2xl border overflow-hidden ${surfaceCls}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] uppercase tracking-wider text-slate-400 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">DNS Server</th>
                <th className="py-3 px-4">Country / Region</th>
                <th className="py-3 px-4">Primary IP</th>
                <th className="py-3 px-4 w-56">Latency</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {ranked.map((s, idx) => {
                const lat = latencies[s.primary];
                const isActive = activeServerId === s.id;
                const ms = lat?.ok && lat.latencyMs !== null ? lat.latencyMs : null;
                const barWidth = ms !== null ? Math.min(100, Math.max(8, Math.round((ms / 220) * 100))) : 0;

                return (
                  <tr
                    key={s.id}
                    className={
                      isActive
                        ? 'bg-emerald-500/10'
                        : isLight
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-slate-800/30'
                    }
                  >
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.provider}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CountryFlag code={s.countryCode} countryName={s.countryName} size="sm" />
                        <div>
                          <div className="font-medium">{s.countryName}</div>
                          <div className="text-[11px] text-slate-400">{s.region}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400">{s.primary}</td>
                    <td className="py-3 px-4">
                      {!lat ? (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" /> Not tested
                        </span>
                      ) : lat.ok ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ms} ms
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                (ms || 0) < 50
                                  ? 'bg-emerald-400'
                                  : (ms || 0) < 120
                                    ? 'bg-amber-400'
                                    : 'bg-orange-400'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> {lat.error || 'Unreachable'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onApplyServer(s)}
                        disabled={busy || isActive}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        {isActive ? 'Active' : 'Apply'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

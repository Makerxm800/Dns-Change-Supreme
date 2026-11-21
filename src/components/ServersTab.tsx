import React, { useMemo, useState } from 'react';
import {
  Search,
  Star,
  Activity,
  Copy,
  Check,
  Shield,
  Filter,
  RotateCcw,
  Lock,
  Globe,
  Zap,
} from 'lucide-react';
import type { AppSettings, DnsLatencyResult, DnsServer } from '../types/dns';
import { CATEGORIES, REGIONS } from '../data/dnsServers';
import { CountryFlag } from './CountryFlag';

interface ServersTabProps {
  servers: DnsServer[];
  activeServerId: string | null;
  favorites: string[];
  latencies: Record<string, DnsLatencyResult>;
  settings: AppSettings;
  busy: boolean;
  testingBatch: boolean;
  onApplyServer: (server: DnsServer) => void;
  onToggleFavorite: (id: string) => void;
  onPingServer: (server: DnsServer) => void;
  onPingVisible: (visibleServers: DnsServer[]) => void;
}

export const ServersTab: React.FC<ServersTabProps> = ({
  servers,
  activeServerId,
  favorites,
  latencies,
  settings,
  busy,
  testingBatch,
  onApplyServer,
  onToggleFavorite,
  onPingServer,
  onPingVisible,
}) => {
  const isLight = settings.theme === 'light';
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<string>(settings.defaultRegion || 'All');
  const [country, setCountry] = useState<string>('All');
  const [category, setCategory] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyIpv6, setOnlyIpv6] = useState(false);
  const [onlyDoh, setOnlyDoh] = useState(false);
  const [onlyNoLogs, setOnlyNoLogs] = useState(false);
  const [onlyDnssec, setOnlyDnssec] = useState(false);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'latency' | 'name' | 'country' | 'region'>('default');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Countries list derived from current region (or all)
  const availableCountries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    for (const s of servers) {
      if (region !== 'All' && s.region !== region) continue;
      const existing = map.get(s.countryCode);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.countryCode, {
          code: s.countryCode,
          name: s.countryName.replace(/\s*\(.*?\)\s*/g, ''),
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [servers, region]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: servers.length };
    for (const s of servers) {
      counts[s.region] = (counts[s.region] || 0) + 1;
    }
    return counts;
  }, [servers]);

  const filteredServers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = servers.filter((s) => {
      if (region !== 'All' && s.region !== region) return false;
      if (country !== 'All' && s.countryCode !== country) return false;
      if (category !== 'All' && !s.categories.includes(category as any)) return false;
      if (onlyFavorites && !favorites.includes(s.id)) return false;
      if (onlyIpv6 && !s.ipv6Primary) return false;
      if (onlyDoh && !s.dohUrl && !s.dotHost) return false;
      if (onlyNoLogs && !s.noLogs) return false;
      if (onlyDnssec && !s.dnssec) return false;
      if (onlyOnline) {
        const lat = latencies[s.primary];
        if (!lat || !lat.ok) return false;
      }
      if (q) {
        const hay = `${s.name} ${s.provider} ${s.primary} ${s.secondary} ${s.ipv6Primary || ''} ${s.countryName} ${s.countryCode} ${s.city || ''} ${s.region} ${s.categories.join(' ')} ${s.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'latency') {
      return [...list].sort((a, b) => {
        const la = latencies[a.primary];
        const lb = latencies[b.primary];
        const va = la?.ok && la.latencyMs !== null ? la.latencyMs : 999999;
        const vb = lb?.ok && lb.latencyMs !== null ? lb.latencyMs : 999999;
        return va - vb;
      });
    }
    if (sortBy === 'name') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === 'country') {
      return [...list].sort((a, b) => a.countryName.localeCompare(b.countryName));
    }
    if (sortBy === 'region') {
      return [...list].sort((a, b) => a.region.localeCompare(b.region));
    }
    return list;
  }, [
    servers,
    search,
    region,
    country,
    category,
    onlyFavorites,
    onlyIpv6,
    onlyDoh,
    onlyNoLogs,
    onlyDnssec,
    onlyOnline,
    sortBy,
    favorites,
    latencies,
  ]);

  const hasActiveFilters =
    search.trim() !== '' ||
    region !== 'All' ||
    country !== 'All' ||
    category !== 'All' ||
    onlyFavorites ||
    onlyIpv6 ||
    onlyDoh ||
    onlyNoLogs ||
    onlyDnssec ||
    onlyOnline ||
    sortBy !== 'default';

  const clearAllFilters = () => {
    setSearch('');
    setRegion('All');
    setCountry('All');
    setCategory('All');
    setOnlyFavorites(false);
    setOnlyIpv6(false);
    setOnlyDoh(false);
    setOnlyNoLogs(false);
    setOnlyDnssec(false);
    setOnlyOnline(false);
    setSortBy('default');
  };

  const handleCopy = (server: DnsServer) => {
    const text = [server.primary, server.secondary].filter(Boolean).join(', ');
    navigator.clipboard?.writeText(text);
    setCopiedId(server.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const surfaceCls = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900/75 border-slate-800 text-slate-100';

  const inputCls = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
    : 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500';

  return (
    <div className="space-y-4">
      {/* Filter & Search Panel */}
      <div className={`rounded-2xl border p-4 space-y-3.5 ${surfaceCls}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="dns-search-input"
              placeholder="Search DNS name, IP (e.g. 1.1.1.1), country, provider, or feature..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm outline-none focus:border-sky-500 transition ${inputCls}`}
            />
          </div>

          {/* Country Dropdown */}
          <div className="flex items-center gap-2">
            {country !== 'All' && <CountryFlag code={country} size="md" />}
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              data-testid="dns-country-select"
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none focus:border-sky-500 ${inputCls}`}
            >
              <option value="All">All Countries ({availableCountries.length})</option>
              {availableCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} [{c.code}] ({c.count})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            data-testid="dns-sort-select"
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none focus:border-sky-500 ${inputCls}`}
          >
            <option value="default">Sort: Recommended</option>
            <option value="latency">Sort: Fastest Latency (ms)</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="country">Sort: Country</option>
            <option value="region">Sort: Region</option>
          </select>

          {/* Benchmark Visible */}
          <button
            onClick={() => onPingVisible(filteredServers)}
            disabled={testingBatch || filteredServers.length === 0}
            data-testid="ping-visible-btn"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shrink-0"
          >
            <Activity className={`w-4 h-4 ${testingBatch ? 'animate-spin' : ''}`} />
            {testingBatch ? 'Testing...' : `Ping Visible (${filteredServers.length})`}
          </button>
        </div>

        {/* Region Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 inline-flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> Region:
          </span>
          {REGIONS.map((r) => {
            const active = region === r;
            return (
              <button
                key={r}
                onClick={() => {
                  setRegion(r);
                  setCountry('All');
                }}
                data-testid={`region-pill-${r}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  active
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                {r} <span className="opacity-70">({regionCounts[r] || 0})</span>
              </button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 inline-flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Purpose:
          </span>
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                data-testid={`category-pill-${c}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-slate-950/50 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Attribute Check Toggles & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Favorites', state: onlyFavorites, set: setOnlyFavorites },
              { label: 'IPv6 Ready', state: onlyIpv6, set: setOnlyIpv6 },
              { label: 'DoH / DoT', state: onlyDoh, set: setOnlyDoh },
              { label: 'Zero-Log Policy', state: onlyNoLogs, set: setOnlyNoLogs },
              { label: 'DNSSEC', state: onlyDnssec, set: setOnlyDnssec },
              { label: 'Verified Online', state: onlyOnline, set: setOnlyOnline },
            ].map((tog) => (
              <button
                key={tog.label}
                onClick={() => tog.set(!tog.state)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  tog.state
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50'
                    : isLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tog.state ? '✓ ' : ''}
                {tog.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Showing <strong className="text-sky-400">{filteredServers.length}</strong> of {servers.length} servers
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                data-testid="clear-filters-btn"
                className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Server Grid */}
      {filteredServers.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center space-y-3 ${surfaceCls}`}>
          <Globe className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="text-base font-bold">No DNS servers match your current filters</div>
          <p className="text-xs text-slate-400">
            Try clearing your search query or switching back to All Regions / All Countries.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredServers.map((s) => {
            const isActive = activeServerId === s.id;
            const isFav = favorites.includes(s.id);
            const lat = latencies[s.primary];

            return (
              <div
                key={s.id}
                data-testid={`dns-card-${s.id}`}
                className={`rounded-2xl border flex flex-col justify-between transition ${
                  settings.compactCards ? 'p-3.5 gap-2.5' : 'p-4 gap-3'
                } ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    : `${surfaceCls} hover:border-sky-500/45`
                }`}
              >
                {/* Header Row: Flag + Name + Favorite */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CountryFlag code={s.countryCode} countryName={s.countryName} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm truncate">{s.name}</h4>
                        {s.isCustom && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {s.countryName} · <span className="text-sky-400/90">{s.region}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFavorite(s.id)}
                    className={`p-1.5 rounded-lg transition ${
                      isFav ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                    }`}
                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Description */}
                {!settings.compactCards && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{s.description}</p>
                )}

                {/* IPs + Latency */}
                <div
                  className={`rounded-xl border px-3 py-2 space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="truncate">
                      <span className="text-sky-400 font-semibold">{s.primary}</span>
                      {s.secondary && <span className="text-slate-400"> · {s.secondary}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopy(s)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy IPv4 addresses"
                      >
                        {copiedId === s.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onPingServer(s)}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition ${
                          lat?.ok
                            ? lat.latencyMs! < 50
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                              : lat.latencyMs! < 120
                                ? 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                                : 'bg-orange-500/15 border-orange-500/35 text-orange-400'
                            : lat && !lat.ok
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-sky-500'
                        }`}
                      >
                        {lat ? (lat.ok ? `${lat.latencyMs} ms` : lat.error || 'Timeout') : 'Ping'}
                      </button>
                    </div>
                  </div>

                  {settings.showIpv6InList && s.ipv6Primary && (
                    <div className="text-[11px] font-mono text-indigo-400/90 truncate">
                      IPv6: {s.ipv6Primary}
                    </div>
                  )}
                </div>

                {/* Tags & Badges */}
                <div className="flex flex-wrap items-center gap-1">
                  {s.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-800/80 border-slate-700/70 text-slate-300'
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                  {s.noLogs && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Lock className="w-2.5 h-2.5" /> No-Log
                    </span>
                  )}
                  {s.dnssec && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Shield className="w-2.5 h-2.5" /> DNSSEC
                    </span>
                  )}
                </div>

                {/* Connect Button */}
                <button
                  onClick={() => onApplyServer(s)}
                  disabled={busy || isActive}
                  data-testid={`apply-btn-${s.id}`}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 cursor-default'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm shadow-sky-500/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isActive ? 'Currently Active' : 'Connect / Apply DNS'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

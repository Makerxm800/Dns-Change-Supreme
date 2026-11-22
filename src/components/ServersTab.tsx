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
  LayoutGrid,
  List,
  Info,
  X,
  MapPin,
  Server,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [detailServer, setDetailServer] = useState<DnsServer | null>(null);

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
    if (sortBy === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'country') return [...list].sort((a, b) => a.countryName.localeCompare(b.countryName));
    if (sortBy === 'region') return [...list].sort((a, b) => a.region.localeCompare(b.region));
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

  const handleCopyValue = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const surfaceCls = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900/75 border-slate-800 text-slate-100';

  const inputCls = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
    : 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder-slate-500';

  return (
    <div className="animate-tab-enter space-y-4">
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

          {/* Grid / List View Switcher */}
          <div
            className={`inline-flex rounded-xl border p-1 shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              onClick={() => setViewMode('grid')}
              data-testid="view-mode-grid"
              title="Grid View"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                viewMode === 'grid'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              data-testid="view-mode-list"
              title="Detailed List View"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                viewMode === 'list'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Benchmark Visible */}
          <button
            onClick={() => onPingVisible(filteredServers)}
            disabled={testingBatch || filteredServers.length === 0}
            data-testid="ping-visible-btn"
            className="btn-press inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50 shrink-0 shadow-md shadow-sky-500/20"
          >
            <Activity className={`w-4 h-4 ${testingBatch ? 'animate-spin' : ''}`} />
            {testingBatch ? 'Testing...' : `Ping (${filteredServers.length})`}
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
                className={`btn-press px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  active
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm shadow-sky-500/20'
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
                className={`btn-press px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/50">
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
                className={`btn-press px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
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
                className="btn-press inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredServers.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center space-y-3 ${surfaceCls}`}>
          <Globe className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="text-base font-bold">No DNS servers match your current filters</div>
          <p className="text-xs text-slate-400">
            Try clearing your search query or switching back to All Regions / All Countries.
          </p>
          <button
            onClick={clearAllFilters}
            className="btn-press px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServers.map((s) => {
            const isActive = activeServerId === s.id;
            const isFav = favorites.includes(s.id);
            const lat = latencies[s.primary];

            return (
              <div
                key={s.id}
                data-testid={`dns-card-${s.id}`}
                className={`card-hover rounded-2xl border flex flex-col justify-between ${
                  settings.compactCards ? 'p-3.5 gap-2.5' : 'p-4 gap-3'
                } ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : `${surfaceCls} hover:border-sky-500/45`
                }`}
              >
                {/* Header Row: Flag + Name + Details + Favorite */}
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
                      {s.city && (
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> {s.city}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDetailServer(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800/50 active:scale-90 transition-all"
                      title="View full server details (DoH / DoT / IPv6)"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleFavorite(s.id)}
                      className={`p-1.5 rounded-lg active:scale-90 transition-all ${
                        isFav ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                      }`}
                      title={isFav ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
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
                        onClick={() =>
                          handleCopyValue(s.id, [s.primary, s.secondary].filter(Boolean).join(', '))
                        }
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition"
                        title="Copy IPv4 addresses"
                      >
                        {copiedText === s.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onPingServer(s)}
                        className={`btn-press px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
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
                  {(s.dohUrl || s.dotHost) && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      DoH/DoT
                    </span>
                  )}
                </div>

                {/* Connect Button */}
                <button
                  onClick={() => onApplyServer(s)}
                  disabled={busy || isActive}
                  data-testid={`apply-btn-${s.id}`}
                  className={`btn-press w-full py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 cursor-default'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isActive ? 'Currently Active' : 'Connect / Apply DNS'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED LIST VIEW */
        <div className="space-y-2.5">
          {filteredServers.map((s) => {
            const isActive = activeServerId === s.id;
            const isFav = favorites.includes(s.id);
            const lat = latencies[s.primary];
            return (
              <div
                key={s.id}
                data-testid={`dns-row-${s.id}`}
                className={`card-hover rounded-2xl border px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : `${surfaceCls} hover:border-sky-500/45`
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <CountryFlag code={s.countryCode} countryName={s.countryName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm">{s.name}</span>
                      <span className="text-xs text-slate-400">
                        {s.countryName} · {s.region}
                      </span>
                      {s.noLogs && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          No-Log
                        </span>
                      )}
                      {s.dnssec && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-semibold">
                          DNSSEC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{s.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-sky-400">
                    {s.primary}
                    {s.secondary ? ` / ${s.secondary}` : ''}
                  </div>

                  <button
                    onClick={() => onPingServer(s)}
                    className={`btn-press px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold ${
                      lat?.ok
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300'
                    }`}
                  >
                    {lat ? (lat.ok ? `${lat.latencyMs} ms` : 'Timeout') : 'Ping'}
                  </button>

                  <button
                    onClick={() => setDetailServer(s)}
                    className="btn-press p-2 rounded-xl border border-slate-700/80 text-slate-300 hover:text-sky-400"
                    title="Full Server Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onToggleFavorite(s.id)}
                    className={`p-2 rounded-xl border border-slate-700/80 transition ${
                      isFav ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => onApplyServer(s)}
                    disabled={busy || isActive}
                    className={`btn-press px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isActive ? 'Active' : 'Apply'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Server Details Modal */}
      {detailServer && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailServer(null);
          }}
        >
          <div
            className={`animate-modal-pop w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CountryFlag code={detailServer.countryCode} countryName={detailServer.countryName} size="lg" />
                <div>
                  <h3 className="text-lg font-bold">{detailServer.name}</h3>
                  <p className="text-xs text-slate-400">
                    {detailServer.provider} · {detailServer.countryName} · {detailServer.region}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailServer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{detailServer.description}</p>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Primary IPv4', val: detailServer.primary },
                { label: 'Secondary IPv4', val: detailServer.secondary },
                { label: 'Primary IPv6', val: detailServer.ipv6Primary },
                { label: 'Secondary IPv6', val: detailServer.ipv6Secondary },
                { label: 'DoH URL', val: detailServer.dohUrl },
                { label: 'DoT Hostname', val: detailServer.dotHost },
              ]
                .filter((row) => Boolean(row.val))
                .map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <span className="text-slate-400 font-semibold">{row.label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sky-400 truncate">{row.val}</span>
                      <button
                        onClick={() => handleCopyValue(row.label, row.val!)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                      >
                        {copiedText === row.label ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                {detailServer.anycast ? 'Global Anycast' : 'Regional Unicast'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                DNSSEC: {detailServer.dnssec ? 'Yes' : 'No'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Zero-Logs: {detailServer.noLogs ? 'Yes' : 'Standard'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onPingServer(detailServer)}
                className="btn-press px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold"
              >
                Test Ping
              </button>
              <button
                onClick={() => {
                  onApplyServer(detailServer);
                  setDetailServer(null);
                }}
                disabled={busy || activeServerId === detailServer.id}
                className="btn-press flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
              >
                {activeServerId === detailServer.id ? 'Currently Active' : 'Apply This DNS Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

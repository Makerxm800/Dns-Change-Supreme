import React, { useState } from 'react';
import { Plus, Trash2, Zap, Edit3, Check, Globe } from 'lucide-react';
import type { AppSettings, DnsCategory, DnsServer, RegionName } from '../types/dns';
import { CATEGORIES, REGIONS } from '../data/dnsServers';
import { CountryFlag } from './CountryFlag';

interface CustomDnsTabProps {
  customServers: DnsServer[];
  activeServerId: string | null;
  settings: AppSettings;
  busy: boolean;
  onAddOrUpdateCustom: (server: DnsServer) => Promise<void>;
  onDeleteCustom: (id: string) => Promise<void>;
  onApplyServer: (server: DnsServer) => void;
}

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IR', name: 'Iran' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'UN', name: 'Global / Custom' },
];

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const CustomDnsTab: React.FC<CustomDnsTabProps> = ({
  customServers,
  activeServerId,
  settings,
  busy,
  onAddOrUpdateCustom,
  onDeleteCustom,
  onApplyServer,
}) => {
  const isLight = settings.theme === 'light';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [ipv6Primary, setIpv6Primary] = useState('');
  const [region, setRegion] = useState<RegionName>('Global');
  const [countryCode, setCountryCode] = useState('US');
  const [category, setCategory] = useState<DnsCategory>('Speed & Standard');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setProvider('');
    setPrimary('');
    setSecondary('');
    setIpv6Primary('');
    setRegion('Global');
    setCountryCode('US');
    setCategory('Speed & Standard');
    setDescription('');
    setFormError(null);
  };

  const handleEdit = (s: DnsServer) => {
    setEditingId(s.id);
    setName(s.name);
    setProvider(s.provider);
    setPrimary(s.primary);
    setSecondary(s.secondary);
    setIpv6Primary(s.ipv6Primary || '');
    setRegion(s.region);
    setCountryCode(s.countryCode);
    setCategory(s.categories[0] || 'Speed & Standard');
    setDescription(s.description);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Please enter a profile name.');
      return;
    }
    if (!IPV4_REGEX.test(primary.trim())) {
      setFormError('Primary DNS must be a valid IPv4 address (e.g. 1.1.1.1).');
      return;
    }
    if (secondary.trim() && !IPV4_REGEX.test(secondary.trim())) {
      setFormError('Secondary DNS must be a valid IPv4 address.');
      return;
    }

    const countryObj = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
    const profile: DnsServer = {
      id: editingId || `custom-${Date.now()}`,
      name: name.trim(),
      provider: provider.trim() || 'Custom Profile',
      primary: primary.trim(),
      secondary: secondary.trim(),
      ipv6Primary: ipv6Primary.trim() || undefined,
      region,
      countryCode,
      countryName: countryObj?.name || countryCode,
      categories: [category],
      dnssec: true,
      noLogs: true,
      anycast: false,
      description: description.trim() || 'User-defined custom DNS configuration.',
      isCustom: true,
    };
    await onAddOrUpdateCustom(profile);
    resetForm();
  };

  const surfaceCls = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-slate-900/75 border-slate-800 text-slate-100';

  const inputCls = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900'
    : 'bg-slate-950 border-slate-700 text-slate-100';

  return (
    <div className="animate-tab-enter grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Add/Edit Form */}
      <form
        onSubmit={handleSubmit}
        className={`lg:col-span-5 rounded-2xl border p-5 space-y-3.5 h-fit ${surfaceCls}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400" />
            {editingId ? 'Edit Custom DNS Profile' : 'Add Custom DNS Server'}
          </h3>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          )}
        </div>

        {formError && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {formError}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Profile Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home Pi-hole / Work VPN DNS"
            data-testid="custom-name-input"
            className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-sky-500 ${inputCls}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Primary IPv4 *</label>
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              placeholder="1.1.1.1"
              data-testid="custom-primary-input"
              className={`w-full rounded-xl border px-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${inputCls}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Secondary IPv4</label>
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="1.0.0.1"
              data-testid="custom-secondary-input"
              className={`w-full rounded-xl border px-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${inputCls}`}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Primary IPv6 (Optional)</label>
          <input
            type="text"
            value={ipv6Primary}
            onChange={(e) => setIpv6Primary(e.target.value)}
            placeholder="2606:4700:4700::1111"
            className={`w-full rounded-xl border px-3 py-2 text-xs font-mono outline-none focus:border-sky-500 ${inputCls}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Country Flag</label>
            <div className="flex items-center gap-2">
              <CountryFlag code={countryCode} size="md" />
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`flex-1 rounded-xl border px-2.5 py-2 text-xs outline-none ${inputCls}`}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as RegionName)}
              className={`w-full rounded-xl border px-2.5 py-2 text-xs outline-none ${inputCls}`}
            >
              {REGIONS.filter((r) => r !== 'All').map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DnsCategory)}
              className={`w-full rounded-xl border px-2.5 py-2 text-xs outline-none ${inputCls}`}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Provider Label</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Custom"
              className={`w-full rounded-xl border px-2.5 py-2 text-xs outline-none ${inputCls}`}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Notes</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${inputCls}`}
          />
        </div>

        <button
          type="submit"
          data-testid="save-custom-dns-btn"
          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
        >
          {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {editingId ? 'Save Changes' : 'Save Custom DNS Profile'}
        </button>
      </form>

      {/* Saved Custom Profiles */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Saved Custom Profiles ({customServers.length})</h3>
          <span className="text-xs text-slate-400">Also appears in DNS Servers tab</span>
        </div>

        {customServers.length === 0 ? (
          <div className={`rounded-2xl border p-10 text-center space-y-2 ${surfaceCls}`}>
            <Globe className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold">No custom DNS profiles yet</div>
            <p className="text-xs text-slate-400">
              Add your NextDNS custom profile, Pi-hole, Control D personal IP, or corporate resolver on the left.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customServers.map((s) => {
              const isActive = activeServerId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive ? 'border-emerald-500/60 bg-emerald-500/10' : surfaceCls
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CountryFlag code={s.countryCode} countryName={s.countryName} size="lg" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{s.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {s.primary}
                        {s.secondary ? ` · ${s.secondary}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {s.countryName} · {s.region}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
                      title="Edit profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCustom(s.id)}
                      className="p-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 text-rose-400"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onApplyServer(s)}
                      disabled={busy || isActive}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400'
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
      </div>
    </div>
  );
};

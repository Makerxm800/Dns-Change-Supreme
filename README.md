# 🌐 DNS Changer Pro (v2.1.0)

⚡ **DNS Changer Pro** is a modern, fast, cross-platform desktop application for **Windows** (`.exe`) and **macOS** (`.dmg` / `.zip`) that lets you switch DNS resolvers in one click, benchmark real UDP DNS query speeds, manage custom IPv4/IPv6 profiles, inspect live network adapters, and keep the app updated seamlessly.

---

## ✨ What's New in v2.1.0

- 🛠️ **Fixed Windows Active Adapter Detection**: Fixed a PowerShell enum serialization issue (`Status: 2` instead of `'Up'`) that caused connected Wi-Fi/Ethernet adapters to show `0 Connected` on Windows 10/11. Added primary default-route detection for cleaner adapter targeting.
- 🎨 **Smooth Animations & Modern Polish**: Added fluid tab transitions, animated tab icons, crisp hover/click micro-interactions, and smooth modal/toast animations.
- 🗂️ **Grid View & Detailed List View + Server Inspector**: Toggle between **Grid View** and **Detailed List View** in the DNS Servers directory, and open any server's **Details Modal** for full IPv4/IPv6 specs, DoH/DoT capabilities, privacy notes, and instant speed testing.
- 🔄 **Clean In-App App Updater**: Replaced confusing git-commit/prior-version output in packaged desktop builds with a clean release checker that downloads the matching Windows `.exe` or macOS `.dmg`/`.zip` installer with a live progress bar and launches it directly.
- 🧹 **Cleaner Interface**: Removed the duplicate Settings button from the tab bar and hid the legacy desktop menu bar (`File / Edit / View / Window / Help`) on Windows & Linux.

---

## 🚀 Key Features

- 🌍 **57+ Global DNS Presets Across 6 Regions** with crisp vector country flags (`country-flag-icons`):
  - 🌐 **Global**: Cloudflare (`1.1.1.1`), Google (`8.8.8.8`), Quad9 (`9.9.9.9`), AdGuard DNS, Control D, NextDNS, CleanBrowsing, OpenDNS, Mullvad DNS, DNS4EU
  - 🇺🇸🇨🇦 **North America**: CIRA Canadian Shield (🇨🇦 Canada), Hurricane Electric (🇺🇸), Verisign, Neustar UltraDNS
  - 🇧🇷🇦🇷🇨🇱🇨🇴 **South America**: NIC.br (🇧🇷), Telmex/Claro (🇧🇷), NIC Argentina (🇦🇷), NIC Chile (🇨🇱), ETB Colombia (🇨🇴)
  - 🇪🇺🇩🇪🇳🇱🇫🇷🇨🇭🇬🇧🇸🇪🇵🇱🇫🇮🇦🇹 **Europe**: Quad101/DNS.SB (🇩🇪), Mullvad (🇸🇪), LibreDNS (🇬🇷), FDN (🇫🇷), Switch.ch (🇨🇭), UncensoredDNS (🇩🇰), OpenNIC EU (🇳🇱), Yandex DNS (🇷🇺)
  - 🇸🇬🇯🇵🇰🇷🇭🇰🇹🇼🇦🇺🇮🇳🇮🇩 **Asia-Pacific**: Quad101 TWNIC (🇹🇼), IIJ Public DNS (🇯🇵), KT/SK Telecom (🇰🇷), StarHub (🇸🇬), Telstra/Cloudflare AU (🇦🇺), Tata/Airtel (🇮🇳), AliDNS/DNSPod (🇨🇳)
  - 🇦🇪🇸🇦🇹🇷🇮🇱🇿🇦🇪🇬🇳🇬 **Middle East & Africa**: Etisalat (🇦🇪), STC (🇸🇦), TurkTelekom (🇹🇷), Afrihost/Liquid (🇿🇦), MainOne (🇳🇬)
- ⚡ **Real RFC 1035 UDP DNS Speed Benchmark**: Sends authentic DNS A-record queries over UDP port 53 to measure true resolver latency (`ms`) instead of ICMP ping.
- 🛡️ **Custom DNS Profiles**: Create, edit, and save custom IPv4 + IPv6 DNS profiles with category tags and one-click switching.
- 🔌 **Real OS DNS Switching & Flushing**:
  - **Windows**: `netsh interface ip set dns` / `netsh interface ipv6` + `ipconfig /flushdns` (with automatic UAC elevation when needed)
  - **macOS**: `networksetup -setdnsservers` + `dscacheutil -flushcache` & `killall -HUP mDNSResponder` (with native macOS authorization prompt when needed)
- ⚙️ **System Tray & Unified Settings Modal** (`Ctrl/Cmd + ,`):
  - Launch on startup, minimize to tray on close, adapter scope (`Connected`, `Primary`, `Selected`), IPv6 policy, DNS cache auto-flush, Dark / Midnight / Light themes, JSON config export/import, and built-in **App Updates**.

---

## 💻 Platform Downloads

Grab the latest installers from the **[GitHub Releases](../../releases)** page:

| Platform | Files |
| :--- | :--- |
| 🪟 **Windows (64-bit)** | `DNS-Changer-Pro-Setup-2.1.0.exe` (Installer) · `DNS-Changer-Pro-Portable-2.1.0-x64.exe` (Portable) |
| 🍎 **macOS (Apple Silicon & Intel)** | `DNS-Changer-Pro-2.1.0-arm64.dmg` / `.zip` · `DNS-Changer-Pro-2.1.0-x64.dmg` / `.zip` |

---

## 🛠️ Development & Build

### Prerequisites
- **Node.js** `20+` (tested on Node `22`)
- **npm** `10+`

### Run Desktop App (Electron)
```bash
npm install
npm run dev
```

### Type-Check, Test & Build
```bash
npx tsc --noEmit
npm test
npm run build
```

### Package Installers
```bash
npm run build:win   # Windows NSIS + Portable (.exe)
npm run build:mac   # macOS DMG + ZIP (.dmg, .zip)
```

---

## 📁 Project Structure

```text
├── .github/workflows/build.yml   # GitHub Actions CI for Windows & macOS releases
├── build/                        # App & tray PNG/SVG icon assets
├── electron/
│   ├── dnsEngine.js              # Cross-platform OS DNS engine & RFC 1035 UDP benchmark
│   ├── gitUpdater.js             # Release version checker & installer downloader
│   ├── main.js                   # Electron window, tray, IPC & hidden menu bar
│   ├── preload.cjs               # Secure contextBridge API (window.dnsApi)
│   └── settingsStore.js          # Persistent JSON settings & audit logs (~/.dns-changer-pro)
├── src/
│   ├── components/               # Header, OverviewTab, ServersTab, BenchmarkTab, CustomDnsTab, SystemTab, SettingsModal, CountryFlag, ToastContainer
│   ├── data/dnsServers.ts        # 57+ curated DNS presets across 6 world regions
│   ├── services/bridge.ts        # Electron IPC client (window.dnsApi)
│   ├── types/dns.ts              # Shared TypeScript interfaces
│   ├── App.tsx                   # Main app shell & animated tab navigation
│   └── index.css                 # Tailwind CSS + hover/click animation utilities
├── tests/dnsEngine.test.mjs      # Automated Node test suite
├── electron-builder.yml          # Windows & macOS packaging configuration
└── package.json                  # Project manifest & scripts
```

---

## 📄 License

MIT License

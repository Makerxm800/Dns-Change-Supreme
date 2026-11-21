# DNS Changer Pro

A modern, cross-platform desktop **DNS Changer** for **Windows (`.exe`)** and **macOS (`.dmg` / `.app`)** built with Electron, React, TypeScript, and Tailwind CSS.

## Features

- **Real OS DNS Switching Engine (Windows & macOS)**:
  - **Windows**: Automatically detects active network adapters (`Get-NetAdapter` / `Get-DnsClientServerAddress`), switches IPv4 & IPv6 DNS via PowerShell with on-demand UAC elevation, flushes DNS cache (`ipconfig /flushdns`), and restores automatic DHCP on reset.
  - **macOS**: Detects all `networksetup` services (Wi-Fi, Ethernet, USB), applies IPv4 & IPv6 DNS with native administrator prompt (`osascript`), flushes `mDNSResponder` / `dscacheutil`, and restores `Empty` (DHCP) cleanly.
- **Home Page with Working Tabs**:
  - **Home**: Quick-connect dashboard, active DNS & latency status, cache flush, and favorite 1-click switchers.
  - **DNS Servers (All Regions)**: Curated working free public DNS servers across **Global, North America, South America, Europe, Asia-Pacific, and Middle East & Africa**.
  - **Speed Test**: Real UDP port 53 DNS A-record latency benchmark & ranking with 1-click "Apply Fastest".
  - **Custom DNS**: Create, edit, delete, and apply custom DNS profiles with country flags.
  - **System & Network**: Live adapter inspector, NSLookup domain resolver, cache flush, and activity/command logs.
- **Real Country Flags**: Crisp vector SVG flags (`country-flag-icons`) rendered reliably on both Windows and macOS.
- **Full Working Filters & Sorting**: Search by name/IP/provider/country, filter by Region, Country, Category (Speed, Ad-Blocking, Privacy, Security, Family Safe, Uncensored, Gaming), IPv6, DoH/DoT, No-Logs, DNSSEC, Favorites, Online Only, and sort by fastest latency.
- **Settings Popup UI**: Modal dialog (`Ctrl+,` / `Cmd+,`) covering Startup & System Tray, Adapter Scope, IPv6 Leak Protection, Benchmark settings, Theme (`Dark`, `Midnight`, `Light`), JSON Backup/Restore, and **Update App from Latest Git**.
- **Update from Latest Git**: Checks `Makerxm800/Dns-Change-Supreme` commits and releases directly from the app and pulls/downloads updates.

## Development & Live Web Preview

```bash
npm install
npm run dev
```

## Run as Desktop App (Electron)

```bash
npm run electron:dev
```

## Build Windows `.exe` and macOS `.dmg`

```bash
# Windows NSIS Installer (.exe) + Portable (.exe)
npm run build:win

# macOS DMG (.dmg) + ZIP (.zip)
npm run build:mac
```

GitHub Actions (`.github/workflows/build.yml`) also automatically builds `.exe` and `.dmg` artifacts on Windows and macOS runners.

## Run Tests

```bash
npm test
```

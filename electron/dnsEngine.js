import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';
import dgram from 'node:dgram';
import dns from 'node:dns';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export function isValidIPv4(ip) {
  return typeof ip === 'string' && net.isIPv4(ip.trim());
}

export function isValidIPv6(ip) {
  return typeof ip === 'string' && net.isIPv6(ip.trim());
}

export function isValidIp(ip) {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

function sanitizeAdapterName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Invalid network adapter name');
  }
  const cleaned = name.trim();
  if (/[\r\n`$;&|<>]/.test(cleaned)) {
    throw new Error(`Unsafe characters in adapter name: ${cleaned}`);
  }
  return cleaned;
}

/**
 * Builds an RFC 1035 DNS wire-format query packet (Type A, Class IN).
 */
export function buildDnsQueryPacket(domain = 'cloudflare.com', txId = Math.floor(Math.random() * 65535)) {
  const cleanDomain = domain.replace(/\.+$/, '');
  const labels = cleanDomain.split('.').filter(Boolean);
  const qnameParts = [];
  for (const label of labels) {
    const buf = Buffer.from(label, 'utf8');
    if (buf.length > 63) throw new Error('Domain label too long');
    qnameParts.push(Buffer.from([buf.length]), buf);
  }
  qnameParts.push(Buffer.from([0]));
  const qname = Buffer.concat(qnameParts);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(txId & 0xffff, 0);
  header.writeUInt16BE(0x0100, 2); // Standard query with RD=1
  header.writeUInt16BE(1, 4); // QDCOUNT = 1
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);

  const questionTail = Buffer.alloc(4);
  questionTail.writeUInt16BE(1, 0); // QTYPE = A (1)
  questionTail.writeUInt16BE(1, 2); // QCLASS = IN (1)

  return { txId: txId & 0xffff, packet: Buffer.concat([header, qname, questionTail]) };
}

/**
 * Measures real UDP port 53 DNS query latency to a DNS server IP.
 */
export function testDnsServerLatency(ip, domain = 'cloudflare.com', timeoutMs = 1800) {
  return new Promise((resolve) => {
    if (!isValidIp(ip)) {
      resolve({ ok: false, ip, latencyMs: null, error: 'Invalid IP address' });
      return;
    }

    const family = net.isIPv6(ip) ? 'udp6' : 'udp4';
    let socket;
    try {
      socket = dgram.createSocket(family);
    } catch (err) {
      resolve({ ok: false, ip, latencyMs: null, error: err.message });
      return;
    }

    const { txId, packet } = buildDnsQueryPacket(domain);
    let settled = false;
    const start = process.hrtime.bigint();

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, ip, latencyMs: null, error: 'Timeout' });
    }, timeoutMs);

    socket.on('error', (err) => {
      finish({ ok: false, ip, latencyMs: null, error: err.code || err.message });
    });

    socket.on('message', (msg) => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      if (msg.length >= 12) {
        const respId = msg.readUInt16BE(0);
        const flags = msg.readUInt16BE(2);
        const rcode = flags & 0x0f;
        const ancount = msg.readUInt16BE(6);
        if (respId === txId) {
          finish({
            ok: rcode === 0 || rcode === 3,
            ip,
            latencyMs: Math.max(1, Math.round(elapsedMs)),
            rcode,
            answerCount: ancount,
          });
          return;
        }
      }
      finish({
        ok: true,
        ip,
        latencyMs: Math.max(1, Math.round(elapsedMs)),
      });
    });

    socket.send(packet, 53, ip, (err) => {
      if (err) {
        finish({ ok: false, ip, latencyMs: null, error: err.code || err.message });
      }
    });
  });
}

/**
 * Resolves a domain using a specific DNS server (or system default if omitted).
 */
export async function resolveDomain(domain, dnsIp) {
  const cleanDomain = (domain || 'example.com').trim();
  const start = process.hrtime.bigint();
  try {
    const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
    if (dnsIp && isValidIp(dnsIp)) {
      resolver.setServers([dnsIp]);
    }
    const addresses = await resolver.resolve4(cleanDomain);
    const latencyMs = Math.max(1, Math.round(Number(process.hrtime.bigint() - start) / 1e6));
    return { ok: true, domain: cleanDomain, dnsIp: dnsIp || 'System', addresses, latencyMs };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(Number(process.hrtime.bigint() - start) / 1e6));
    return {
      ok: false,
      domain: cleanDomain,
      dnsIp: dnsIp || 'System',
      addresses: [],
      latencyMs,
      error: err.code || err.message,
    };
  }
}

// Track simulated/sandbox state when running in non-privileged Linux sandbox or web preview
let sandboxState = {
  activeDns: null, // { id, name, primary, secondary, ipv6Primary, ipv6Secondary, appliedAt }
  adapters: null,
};

function getMockAdapters() {
  if (sandboxState.adapters) return sandboxState.adapters;
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const ipv4 = addrs.find((a) => a.family === 'IPv4' && !a.internal);
    if (ipv4 || name !== 'lo') {
      const isLoopback = addrs.every((a) => a.internal);
      if (isLoopback) continue;
      list.push({
        name,
        description: `${name} Network Interface`,
        type: /wl|wi-?fi|en0/i.test(name) ? 'Wi-Fi' : 'Ethernet',
        status: ipv4 ? 'Connected' : 'Disconnected',
        ipAddress: ipv4?.address || '—',
        macAddress: addrs[0]?.mac || '00:00:00:00:00:00',
        dnsServers: sandboxState.activeDns
          ? [sandboxState.activeDns.primary, sandboxState.activeDns.secondary].filter(Boolean)
          : [],
        ipv6DnsServers: sandboxState.activeDns
          ? [sandboxState.activeDns.ipv6Primary, sandboxState.activeDns.ipv6Secondary].filter(Boolean)
          : [],
        isDhcp: !sandboxState.activeDns,
        isPrimary: list.length === 0,
      });
    }
  }
  if (list.length === 0) {
    list.push({
      name: process.platform === 'darwin' ? 'Wi-Fi' : 'Ethernet',
      description: 'Primary Network Adapter',
      type: process.platform === 'darwin' ? 'Wi-Fi' : 'Ethernet',
      status: 'Connected',
      ipAddress: '192.168.1.42',
      macAddress: 'A4:83:E7:2F:11:90',
      dnsServers: sandboxState.activeDns
        ? [sandboxState.activeDns.primary, sandboxState.activeDns.secondary].filter(Boolean)
        : [],
      ipv6DnsServers: [],
      isDhcp: !sandboxState.activeDns,
      isPrimary: true,
    });
  }
  return list;
}

// ======================== WINDOWS ENGINE ========================
async function isWindowsAdmin() {
  try {
    await execAsync('net session', { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function runWindowsPowerShell(script, requireAdmin = false) {
  const tmpFile = path.join(os.tmpdir(), `dns-supreme-${Date.now()}-${Math.random().toString(16).slice(2)}.ps1`);
  fs.writeFileSync(tmpFile, script, 'utf8');
  try {
    if (!requireAdmin || (await isWindowsAdmin())) {
      const { stdout, stderr } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpFile],
        { windowsHide: true, timeout: 25000 }
      );
      return { stdout, stderr };
    }
    // Elevate via UAC RunAs
    const escapedTmp = tmpFile.replace(/'/g, "''");
    const launcher = `Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${escapedTmp}' -Verb RunAs -Wait -WindowStyle Hidden`;
    const { stdout, stderr } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', launcher],
      { windowsHide: true, timeout: 45000 }
    );
    return { stdout, stderr };
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
}

async function getWindowsAdapters() {
  const ps = `
    $defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1
    $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Virtual -eq $false -or $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription, InterfaceIndex, @{Name='StatusStr';Expression={$_.Status.ToString()}}, MacAddress, @{Name='MediaTypeStr';Expression={$_.MediaType.ToString()}}
    $ipv4 = Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object InterfaceAlias, ServerAddresses
    $ipv6 = Get-DnsClientServerAddress -AddressFamily IPv6 -ErrorAction SilentlyContinue | Select-Object InterfaceAlias, ServerAddresses
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object InterfaceAlias, IPAddress, PrefixOrigin
    [PSCustomObject]@{
      defaultIfIndex = if ($defaultRoute) { $defaultRoute.InterfaceIndex } else { $null }
      adapters = @($adapters)
      ipv4 = @($ipv4)
      ipv6 = @($ipv6)
      ips = @($ips)
    } | ConvertTo-Json -Depth 4
  `;
  const { stdout } = await runWindowsPowerShell(ps, false);
  const parsed = JSON.parse(stdout || '{}');
  const adapters = Array.isArray(parsed.adapters) ? parsed.adapters : parsed.adapters ? [parsed.adapters] : [];
  const ipv4List = Array.isArray(parsed.ipv4) ? parsed.ipv4 : [];
  const ipv6List = Array.isArray(parsed.ipv6) ? parsed.ipv6 : [];
  const ipList = Array.isArray(parsed.ips) ? parsed.ips : [];
  const defaultIfIndex = parsed.defaultIfIndex;

  const mapped = adapters.map((a) => {
    const d4 = ipv4List.find((x) => x.InterfaceAlias === a.Name);
    const d6 = ipv6List.find((x) => x.InterfaceAlias === a.Name);
    const ipObj = ipList.find((x) => x.InterfaceAlias === a.Name && !String(x.IPAddress).startsWith('169.254'));
    const dns4Raw = d4?.ServerAddresses;
    const dns6Raw = d6?.ServerAddresses;
    const dns4 = Array.isArray(dns4Raw) ? dns4Raw : dns4Raw ? [String(dns4Raw)] : [];
    const dns6 = Array.isArray(dns6Raw) ? dns6Raw : dns6Raw ? [String(dns6Raw)] : [];

    const rawStatus = String(a.StatusStr ?? a.Status ?? '').toLowerCase();
    const isConnected = rawStatus === 'up' || rawStatus === 'connected' || rawStatus === '2';
    const statusStr = isConnected ? 'Connected' : 'Disconnected';
    const isWifi = /wi-?fi|wireless|802\.11|wlan|native80211/i.test(
      `${a.Name} ${a.InterfaceDescription} ${a.MediaTypeStr || a.MediaType || ''}`
    );
    return {
      name: a.Name,
      description: a.InterfaceDescription || a.Name,
      type: isWifi ? 'Wi-Fi' : 'Ethernet',
      status: statusStr,
      ipAddress: ipObj?.IPAddress || '—',
      macAddress: a.MacAddress || '—',
      dnsServers: dns4,
      ipv6DnsServers: dns6,
      isDhcp: dns4.length === 0,
      isPrimary: defaultIfIndex != null ? a.InterfaceIndex === defaultIfIndex : false,
    };
  });

  // Sort Connected adapters first, and guarantee one primary if any connected
  mapped.sort((a, b) => Number(b.status === 'Connected') - Number(a.status === 'Connected'));
  if (!mapped.some((a) => a.isPrimary)) {
    const firstConn = mapped.find((a) => a.status === 'Connected');
    if (firstConn) firstConn.isPrimary = true;
  }
  return mapped;
}

async function applyWindowsDns({ adapters, primary, secondary, ipv6Primary, ipv6Secondary, ipv6Mode, autoFlush }) {
  const lines = [];
  for (const rawName of adapters) {
    const adapter = sanitizeAdapterName(rawName);
    const safeAlias = adapter.replace(/'/g, "''");
    const v4List = [primary, secondary].filter(isValidIPv4);
    if (v4List.length > 0) {
      const addrArr = v4List.map((ip) => `'${ip}'`).join(',');
      lines.push(`Set-DnsClientServerAddress -InterfaceAlias '${safeAlias}' -ServerAddresses @(${addrArr})`);
    }
    if (ipv6Mode === 'apply') {
      const v6List = [ipv6Primary, ipv6Secondary].filter(isValidIPv6);
      if (v6List.length > 0) {
        const addr6Arr = v6List.map((ip) => `'${ip}'`).join(',');
        lines.push(`Set-DnsClientServerAddress -InterfaceAlias '${safeAlias}' -ServerAddresses @(${addr6Arr})`);
      }
    } else if (ipv6Mode === 'disable') {
      lines.push(`Disable-NetAdapterBinding -Name '${safeAlias}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`);
    } else if (ipv6Mode === 'reset') {
      lines.push(`Set-DnsClientServerAddress -InterfaceAlias '${safeAlias}' -ResetServerAddresses -ErrorAction SilentlyContinue`);
    }
  }
  if (autoFlush) {
    lines.push(`ipconfig /flushdns | Out-Null`);
  }
  await runWindowsPowerShell(lines.join('\n'), true);
  return { commandsExecuted: lines };
}

async function resetWindowsDns({ adapters, autoFlush }) {
  const lines = [];
  for (const rawName of adapters) {
    const adapter = sanitizeAdapterName(rawName);
    const safeAlias = adapter.replace(/'/g, "''");
    lines.push(`Set-DnsClientServerAddress -InterfaceAlias '${safeAlias}' -ResetServerAddresses`);
    lines.push(`Enable-NetAdapterBinding -Name '${safeAlias}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue`);
  }
  if (autoFlush) {
    lines.push(`ipconfig /flushdns | Out-Null`);
  }
  await runWindowsPowerShell(lines.join('\n'), true);
  return { commandsExecuted: lines };
}

// ======================== macOS ENGINE ========================
async function runMacPrivilegedShell(shellCommand) {
  try {
    const { stdout, stderr } = await execAsync(shellCommand, { timeout: 20000 });
    return { stdout, stderr };
  } catch (err) {
    // Fallback to native macOS administrator privileges dialog
    const escaped = shellCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const { stdout, stderr } = await execFileAsync(
      'osascript',
      ['-e', `do shell script "${escaped}" with administrator privileges`],
      { timeout: 60000 }
    );
    return { stdout, stderr };
  }
}

async function getMacAdapters() {
  const { stdout: servicesOut } = await execFileAsync('networksetup', ['-listallnetworkservices'], { timeout: 10000 });
  const services = servicesOut
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('An asterisk') && !l.startsWith('*'));

  const result = [];
  for (let i = 0; i < services.length; i++) {
    const name = services[i];
    try {
      const [{ stdout: infoOut }, { stdout: dnsOut }] = await Promise.all([
        execFileAsync('networksetup', ['-getinfo', name]),
        execFileAsync('networksetup', ['-getdnsservers', name]),
      ]);
      const ipMatch = infoOut.match(/^IP address:\s*(.+)$/m);
      const ip = ipMatch ? ipMatch[1].trim() : '—';
      const isConnected = ip !== '—' && ip !== 'none' && isValidIp(ip);
      const dnsLines = dnsOut
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => isValidIp(l));
      const v4 = dnsLines.filter(isValidIPv4);
      const v6 = dnsLines.filter(isValidIPv6);

      result.push({
        name,
        description: `macOS ${name} Service`,
        type: /wi-?fi|airport/i.test(name) ? 'Wi-Fi' : 'Ethernet',
        status: isConnected ? 'Connected' : 'Disconnected',
        ipAddress: isConnected ? ip : '—',
        macAddress: '—',
        dnsServers: v4,
        ipv6DnsServers: v6,
        isDhcp: dnsLines.length === 0,
        isPrimary: isConnected && result.filter((r) => r.status === 'Connected').length === 0,
      });
    } catch {
      // Skip unreadable service
    }
  }
  return result;
}

async function applyMacDns({ adapters, primary, secondary, ipv6Primary, ipv6Secondary, ipv6Mode, autoFlush }) {
  const dnsList = [primary, secondary].filter(isValidIPv4);
  if (ipv6Mode === 'apply') {
    dnsList.push(...[ipv6Primary, ipv6Secondary].filter(isValidIPv6));
  }
  if (dnsList.length === 0) throw new Error('No valid DNS IP provided');

  const cmds = [];
  for (const rawName of adapters) {
    const adapter = sanitizeAdapterName(rawName);
    const quotedAdapter = `'${adapter.replace(/'/g, `'\\''`)}'`;
    cmds.push(`networksetup -setdnsservers ${quotedAdapter} ${dnsList.join(' ')}`);
    if (ipv6Mode === 'disable') {
      cmds.push(`networksetup -setv6off ${quotedAdapter} || true`);
    }
  }
  if (autoFlush) {
    cmds.push('dscacheutil -flushcache; killall -HUP mDNSResponder || true');
  }
  await runMacPrivilegedShell(cmds.join(' && '));
  return { commandsExecuted: cmds };
}

async function resetMacDns({ adapters, autoFlush }) {
  const cmds = [];
  for (const rawName of adapters) {
    const adapter = sanitizeAdapterName(rawName);
    const quotedAdapter = `'${adapter.replace(/'/g, `'\\''`)}'`;
    cmds.push(`networksetup -setdnsservers ${quotedAdapter} Empty`);
    cmds.push(`networksetup -setv6automatic ${quotedAdapter} || true`);
  }
  if (autoFlush) {
    cmds.push('dscacheutil -flushcache; killall -HUP mDNSResponder || true');
  }
  await runMacPrivilegedShell(cmds.join(' && '));
  return { commandsExecuted: cmds };
}

// ======================== PUBLIC UNIFIED API ========================
export async function getSystemPlatformInfo() {
  const platform = process.platform;
  const osLabel =
    platform === 'win32'
      ? 'Windows'
      : platform === 'darwin'
        ? 'macOS'
        : 'Linux';
  const isNativeSupported = platform === 'win32' || platform === 'darwin';
  let isAdmin = false;
  if (platform === 'win32') {
    isAdmin = await isWindowsAdmin();
  } else if (platform === 'darwin') {
    isAdmin = typeof process.getuid === 'function' ? process.getuid() === 0 : false;
  }
  return {
    platform,
    arch: process.arch,
    osLabel,
    hostname: os.hostname(),
    release: os.release(),
    isNativeSupported,
    isAdmin,
    mode: isNativeSupported ? 'native' : 'simulation',
  };
}

export async function listNetworkAdapters() {
  try {
    if (process.platform === 'win32') {
      const adapters = await getWindowsAdapters();
      if (adapters.length > 0) return { ok: true, mode: 'native', adapters };
    } else if (process.platform === 'darwin') {
      const adapters = await getMacAdapters();
      if (adapters.length > 0) return { ok: true, mode: 'native', adapters };
    }
  } catch (err) {
    return {
      ok: true,
      mode: 'fallback',
      warning: err.message,
      adapters: getMockAdapters(),
    };
  }
  return { ok: true, mode: 'preview', adapters: getMockAdapters() };
}

export async function applyDnsConfiguration({
  id,
  name,
  primary,
  secondary,
  ipv6Primary,
  ipv6Secondary,
  adapters,
  ipv6Mode = 'apply',
  autoFlush = true,
}) {
  if (!isValidIPv4(primary)) {
    throw new Error(`Invalid Primary IPv4 address: ${primary}`);
  }
  if (secondary && !isValidIPv4(secondary)) {
    throw new Error(`Invalid Secondary IPv4 address: ${secondary}`);
  }

  let targetAdapters = Array.isArray(adapters) && adapters.length > 0 ? adapters : null;
  if (!targetAdapters) {
    const detected = await listNetworkAdapters();
    const connected = detected.adapters.filter((a) => a.status === 'Connected');
    targetAdapters = (connected.length > 0 ? connected : detected.adapters).map((a) => a.name);
  }

  if (process.platform === 'win32') {
    const res = await applyWindowsDns({
      adapters: targetAdapters,
      primary: primary.trim(),
      secondary: secondary ? secondary.trim() : '',
      ipv6Primary: ipv6Primary ? ipv6Primary.trim() : '',
      ipv6Secondary: ipv6Secondary ? ipv6Secondary.trim() : '',
      ipv6Mode,
      autoFlush,
    });
    return {
      ok: true,
      mode: 'native',
      appliedTo: targetAdapters,
      commandsExecuted: res.commandsExecuted,
    };
  }

  if (process.platform === 'darwin') {
    const res = await applyMacDns({
      adapters: targetAdapters,
      primary: primary.trim(),
      secondary: secondary ? secondary.trim() : '',
      ipv6Primary: ipv6Primary ? ipv6Primary.trim() : '',
      ipv6Secondary: ipv6Secondary ? ipv6Secondary.trim() : '',
      ipv6Mode,
      autoFlush,
    });
    return {
      ok: true,
      mode: 'native',
      appliedTo: targetAdapters,
      commandsExecuted: res.commandsExecuted,
    };
  }

  // Sandbox / Linux preview simulation (records state cleanly and reports exact commands)
  sandboxState.activeDns = {
    id: id || 'custom',
    name: name || primary,
    primary: primary.trim(),
    secondary: secondary ? secondary.trim() : '',
    ipv6Primary: ipv6Primary ? ipv6Primary.trim() : '',
    ipv6Secondary: ipv6Secondary ? ipv6Secondary.trim() : '',
    appliedAt: new Date().toISOString(),
  };
  const simulatedCommands = targetAdapters.map(
    (a) => `[Preview Mode] Applied ${primary}${secondary ? `, ${secondary}` : ''} to "${a}"`
  );
  return {
    ok: true,
    mode: 'preview',
    appliedTo: targetAdapters,
    commandsExecuted: simulatedCommands,
  };
}

export async function resetDnsToDhcp({ adapters, autoFlush = true } = {}) {
  let targetAdapters = Array.isArray(adapters) && adapters.length > 0 ? adapters : null;
  if (!targetAdapters) {
    const detected = await listNetworkAdapters();
    const connected = detected.adapters.filter((a) => a.status === 'Connected');
    targetAdapters = (connected.length > 0 ? connected : detected.adapters).map((a) => a.name);
  }

  if (process.platform === 'win32') {
    const res = await resetWindowsDns({ adapters: targetAdapters, autoFlush });
    return { ok: true, mode: 'native', resetAdapters: targetAdapters, commandsExecuted: res.commandsExecuted };
  }

  if (process.platform === 'darwin') {
    const res = await resetMacDns({ adapters: targetAdapters, autoFlush });
    return { ok: true, mode: 'native', resetAdapters: targetAdapters, commandsExecuted: res.commandsExecuted };
  }

  sandboxState.activeDns = null;
  return {
    ok: true,
    mode: 'preview',
    resetAdapters: targetAdapters,
    commandsExecuted: targetAdapters.map((a) => `[Preview Mode] Restored DHCP DNS on "${a}"`),
  };
}

export async function flushOsDnsCache() {
  if (process.platform === 'win32') {
    const { stdout } = await execAsync('ipconfig /flushdns', { windowsHide: true });
    return { ok: true, mode: 'native', output: stdout.trim() || 'Windows DNS Resolver Cache flushed.' };
  }
  if (process.platform === 'darwin') {
    await runMacPrivilegedShell('dscacheutil -flushcache; killall -HUP mDNSResponder || true');
    return { ok: true, mode: 'native', output: 'macOS DNS cache (mDNSResponder) flushed.' };
  }
  return {
    ok: true,
    mode: 'preview',
    output: '[Preview Mode] DNS cache flush simulated (runs ipconfig /flushdns on Windows, dscacheutil on macOS).',
  };
}

export function getSandboxActiveDns() {
  return sandboxState.activeDns;
}

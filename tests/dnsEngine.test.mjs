import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import {
  buildDnsQueryPacket,
  isValidIPv4,
  isValidIPv6,
  isValidIp,
  applyDnsConfiguration,
  resetDnsToDhcp,
} from '../electron/dnsEngine.js';
import { createStore, DEFAULT_SETTINGS } from '../electron/settingsStore.js';
import { compareSemver, getLocalGitInfo, checkForGitUpdates } from '../electron/gitUpdater.js';
import { createApiServer } from '../server/apiServer.js';

test('IPv4 and IPv6 validators accept valid IPs and reject unsafe inputs', () => {
  assert.equal(isValidIPv4('1.1.1.1'), true);
  assert.equal(isValidIPv4('149.112.121.10'), true);
  assert.equal(isValidIPv4('999.1.1.1'), false);
  assert.equal(isValidIPv4('1.1.1.1; rm -rf /'), false);
  assert.equal(isValidIPv6('2606:4700:4700::1111'), true);
  assert.equal(isValidIPv6('not-an-ip'), false);
  assert.equal(isValidIp('8.8.8.8'), true);
  assert.equal(isValidIp('2001:4860:4860::8888'), true);
});

test('buildDnsQueryPacket generates valid RFC 1035 DNS A query bytes', () => {
  const { txId, packet } = buildDnsQueryPacket('cloudflare.com', 0x1234);
  assert.equal(txId, 0x1234);
  assert.equal(packet.readUInt16BE(0), 0x1234);
  assert.equal(packet.readUInt16BE(2), 0x0100); // RD=1
  assert.equal(packet.readUInt16BE(4), 1); // QDCOUNT=1
  assert.ok(packet.includes(Buffer.from('cloudflare')));
  assert.ok(packet.includes(Buffer.from('com')));
});

test('DNS server directory covers all 6 world regions with valid IPs and ISO country codes', () => {
  const tsSource = fs.readFileSync(path.resolve('src/data/dnsServers.ts'), 'utf8');
  const expectedRegions = [
    'Global',
    'North America',
    'South America',
    'Europe',
    'Asia-Pacific',
    'Middle East & Africa',
  ];
  for (const region of expectedRegions) {
    assert.ok(tsSource.includes(`region: '${region}'`), `Missing region: ${region}`);
  }
  const primaryMatches = [...tsSource.matchAll(/primary:\s*'([^']+)'/g)].map((m) => m[1]);
  const secondaryMatches = [...tsSource.matchAll(/secondary:\s*'([^']+)'/g)].map((m) => m[1]);
  const countryMatches = [...tsSource.matchAll(/countryCode:\s*'([^']+)'/g)].map((m) => m[1]);

  assert.ok(primaryMatches.length >= 35, `Expected at least 35 servers, got ${primaryMatches.length}`);
  for (const ip of primaryMatches) {
    assert.equal(isValidIPv4(ip), true, `Invalid primary IPv4 in catalog: ${ip}`);
  }
  for (const ip of secondaryMatches) {
    assert.equal(isValidIPv4(ip), true, `Invalid secondary IPv4 in catalog: ${ip}`);
  }
  for (const code of countryMatches) {
    assert.match(code, /^[A-Z]{2}$/, `Invalid country code: ${code}`);
  }
});

test('settingsStore persists settings and logs accurately', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dns-supreme-store-'));
  const store = createStore(tmpDir);
  const initial = store.load();
  assert.equal(initial.settings.autoFlushCache, DEFAULT_SETTINGS.autoFlushCache);

  const updated = store.updateSettings({ theme: 'midnight', ipv6Mode: 'disable' });
  assert.equal(updated.settings.theme, 'midnight');
  assert.equal(updated.settings.ipv6Mode, 'disable');

  store.appendLog({ level: 'success', action: 'TEST', message: 'Unit test log' });
  const reloaded = store.load();
  assert.equal(reloaded.logs.length, 1);
  assert.equal(reloaded.logs[0].action, 'TEST');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('gitUpdater compares semver and checks Makerxm800/Dns-Change-Supreme', async () => {
  assert.equal(compareSemver('v2.1.0', '2.0.0'), 1);
  assert.equal(compareSemver('2.0.0', '2.0.0'), 0);
  assert.equal(compareSemver('1.9.5', '2.0.0'), -1);

  const local = await getLocalGitInfo(process.cwd());
  assert.equal(local.isGitRepo, true);
  assert.ok(local.localSha && local.localSha.length === 40);

  const remote = await checkForGitUpdates({
    owner: 'Makerxm800',
    repo: 'Dns-Change-Supreme',
    branch: 'main',
    appRoot: process.cwd(),
  });
  assert.equal(remote.ok, true);
  assert.ok(remote.remoteSha);
  assert.ok(remote.recentCommits.length >= 1);
});

test('DNS apply and reset reject bad IPs and succeed with valid IPs', async () => {
  await assert.rejects(
    () => applyDnsConfiguration({ id: 'bad', name: 'Bad', primary: '999.999.1.1' }),
    /Invalid Primary IPv4/
  );
  const applied = await applyDnsConfiguration({
    id: 'cloudflare-std',
    name: 'Cloudflare',
    primary: '1.1.1.1',
    secondary: '1.0.0.1',
  });
  assert.equal(applied.ok, true);
  const reset = await resetDnsToDhcp();
  assert.equal(reset.ok, true);
});

test('Express API server handles state, DNS switch, settings, and git check', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dns-supreme-api-'));
  const app = createApiServer({ storeDir: tmpDir });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const platRes = await fetch(`${base}/api/platform`);
    assert.equal(platRes.status, 200);
    const plat = await platRes.json();
    assert.ok(plat.platform);

    const applyRes = await fetch(`${base}/api/dns/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'quad9-sec',
        name: 'Quad9 Security',
        primary: '9.9.9.9',
        secondary: '149.112.112.112',
      }),
    });
    assert.equal(applyRes.status, 200);
    const applyJson = await applyRes.json();
    assert.equal(applyJson.ok, true);

    const stRes = await fetch(`${base}/api/state`);
    const stJson = await stRes.json();
    assert.equal(stJson.activeServerId, 'quad9-sec');

    const patchRes = await fetch(`${base}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'light', launchOnStartup: true }),
    });
    const patchJson = await patchRes.json();
    assert.equal(patchJson.settings.theme, 'light');
    assert.equal(patchJson.settings.launchOnStartup, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

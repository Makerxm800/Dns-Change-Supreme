import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDnsConfiguration,
  flushOsDnsCache,
  getSystemPlatformInfo,
  listNetworkAdapters,
  resolveDomain,
  resetDnsToDhcp,
  testDnsServerLatency,
} from '../electron/dnsEngine.js';
import { createStore } from '../electron/settingsStore.js';
import { applyGitUpdate, checkForGitUpdates } from '../electron/gitUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');

export function createApiServer({ storeDir } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const store = createStore(storeDir);

  app.get('/api/platform', async (_req, res) => {
    try {
      res.json(await getSystemPlatformInfo());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/adapters', async (_req, res) => {
    try {
      res.json(await listNetworkAdapters());
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/apply', async (req, res) => {
    try {
      const payload = req.body || {};
      const st = store.load();
      const result = await applyDnsConfiguration({
        ...payload,
        ipv6Mode: payload.ipv6Mode ?? st.settings.ipv6Mode,
        autoFlush: payload.autoFlush ?? st.settings.autoFlushCache,
      });
      const next = store.load();
      next.activeServerId = payload.id || 'custom';
      next.lastUsedServerId = next.activeServerId;
      store.save(next);
      store.appendLog({
        level: 'success',
        action: 'DNS_APPLY',
        message: `Switched DNS to ${payload.name || payload.primary} (${payload.primary}${payload.secondary ? ` / ${payload.secondary}` : ''})`,
        details: (result.commandsExecuted || []).join('\n'),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/reset', async (req, res) => {
    try {
      const payload = req.body || {};
      const st = store.load();
      const result = await resetDnsToDhcp({
        adapters: payload.adapters,
        autoFlush: payload.autoFlush ?? st.settings.autoFlushCache,
      });
      const next = store.load();
      next.activeServerId = null;
      store.save(next);
      store.appendLog({
        level: 'info',
        action: 'DNS_RESET',
        message: 'Restored DNS to automatic ISP / DHCP',
        details: (result.commandsExecuted || []).join('\n'),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/flush', async (_req, res) => {
    try {
      const result = await flushOsDnsCache();
      store.appendLog({
        level: 'info',
        action: 'FLUSH_CACHE',
        message: result.output || 'Flushed OS DNS cache',
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/ping', async (req, res) => {
    try {
      const { ip, domain, timeoutMs } = req.body || {};
      const result = await testDnsServerLatency(ip, domain, timeoutMs);
      res.json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/ping-batch', async (req, res) => {
    try {
      const { ips = [], domain, timeoutMs } = req.body || {};
      const concurrency = 10;
      const results = [];
      for (let i = 0; i < ips.length; i += concurrency) {
        const slice = ips.slice(i, i + concurrency);
        const batch = await Promise.all(slice.map((ip) => testDnsServerLatency(ip, domain, timeoutMs)));
        results.push(...batch);
      }
      res.json({ ok: true, results });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/dns/resolve', async (req, res) => {
    try {
      const { domain, dnsIp } = req.body || {};
      res.json(await resolveDomain(domain, dnsIp));
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/state', (_req, res) => {
    res.json(store.load());
  });

  app.post('/api/state', (req, res) => {
    const saved = store.save(req.body || {});
    res.json(saved);
  });

  app.patch('/api/settings', (req, res) => {
    const updated = store.updateSettings(req.body || {});
    store.appendLog({
      level: 'info',
      action: 'SETTINGS',
      message: `Updated system settings (${Object.keys(req.body || {}).join(', ')})`,
    });
    res.json(updated);
  });

  app.post('/api/logs', (req, res) => {
    const item = store.appendLog(req.body || {});
    res.json(item);
  });

  app.post('/api/git/check', async (req, res) => {
    try {
      const st = store.load().settings;
      const body = req.body || {};
      const result = await checkForGitUpdates({
        owner: body.owner || st.gitRepoOwner,
        repo: body.repo || st.gitRepoName,
        branch: body.branch || st.gitBranch,
        appRoot,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/git/update', async (req, res) => {
    try {
      const st = store.load().settings;
      const body = req.body || {};
      const result = await applyGitUpdate({
        owner: body.owner || st.gitRepoOwner,
        repo: body.repo || st.gitRepoName,
        branch: body.branch || st.gitBranch,
        appRoot,
      });
      store.appendLog({
        level: result.ok ? 'success' : 'warn',
        action: 'GIT_UPDATE',
        message: result.message || 'Checked Git update',
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  if (process.argv.includes('--serve-dist')) {
    const distDir = path.join(appRoot, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const port = Number(process.env.PORT || (process.argv.includes('--serve-dist') ? 4173 : 38420));
  const app = createApiServer();
  app.listen(port, '0.0.0.0', () => {
    console.log(`DNS Changer Pro API server listening on http://0.0.0.0:${port}`);
  });
}

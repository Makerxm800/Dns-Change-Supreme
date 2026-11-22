import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import tls from 'node:tls';

const execFileAsync = promisify(execFile);

function getCombinedCa() {
  const certPaths = ['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem'];
  for (const p of certPaths) {
    try {
      if (fs.existsSync(p)) {
        const extra = fs.readFileSync(p, 'utf8');
        return [...tls.rootCertificates, extra];
      }
    } catch {}
  }
  return undefined;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const ca = getCombinedCa();
    const req = https.get(
      url,
      {
        ...(ca ? { ca } : {}),
        headers: {
          'User-Agent': 'DNS-Changer-Pro-Updater/2.1',
          Accept: 'application/vnd.github+json',
        },
        timeout: 12000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON from GitHub API'));
            }
          } else {
            const err = new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 180)}`);
            err.statusCode = res.statusCode;
            reject(err);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('GitHub request timed out'));
    });
    req.on('error', reject);
  });
}

export function downloadFileWithRedirects(url, destPath, onProgress, maxRedirects = 6) {
  return new Promise((resolve, reject) => {
    const ca = getCombinedCa();
    const request = (currentUrl, redirectsLeft) => {
      const req = https.get(
        currentUrl,
        {
          ...(ca ? { ca } : {}),
          headers: { 'User-Agent': 'DNS-Changer-Pro-Updater/2.1' },
          timeout: 30000,
        },
        (res) => {
          if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.resume();
            if (redirectsLeft <= 0) {
              reject(new Error('Too many redirects while downloading update'));
              return;
            }
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            request(nextUrl, redirectsLeft - 1);
            return;
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            reject(new Error(`Download failed with HTTP ${res.statusCode}`));
            return;
          }

          const totalBytes = Number(res.headers['content-length'] || 0);
          let downloadedBytes = 0;
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (onProgress) {
              const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : null;
              onProgress({ downloadedBytes, totalBytes, percent });
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve({ ok: true, filePath: destPath, size: downloadedBytes }));
          });

          fileStream.on('error', (err) => {
            try {
              fs.unlinkSync(destPath);
            } catch {}
            reject(err);
          });
        }
      );

      req.on('timeout', () => req.destroy(new Error('Download timed out')));
      req.on('error', reject);
    };

    request(url, maxRedirects);
  });
}

export function compareSemver(a, b) {
  const pa = String(a || '0.0.0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export async function getLocalGitInfo(appRoot) {
  let version = '2.1.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
    version = pkg.version || version;
  } catch {}

  const gitDir = path.join(appRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    return { version, isGitRepo: false, localSha: null, localBranch: null, dirty: false };
  }

  try {
    const [{ stdout: shaOut }, { stdout: branchOut }, { stdout: statusOut }] = await Promise.all([
      execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: appRoot, timeout: 8000 }),
      execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: appRoot, timeout: 8000 }),
      execFileAsync('git', ['status', '--porcelain'], { cwd: appRoot, timeout: 8000 }),
    ]);
    return {
      version,
      isGitRepo: true,
      localSha: shaOut.trim(),
      localBranch: branchOut.trim(),
      dirty: statusOut.trim().length > 0,
    };
  } catch {
    return { version, isGitRepo: false, localSha: null, localBranch: null, dirty: false };
  }
}

export function pickPlatformAsset(assets = [], platform = process.platform) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const installers = assets.filter((a) => /\.(exe|dmg|zip|AppImage|deb)$/i.test(a.name));
  if (installers.length === 0) return null;

  if (platform === 'win32') {
    return (
      installers.find((a) => /setup.*\.exe$/i.test(a.name)) ||
      installers.find((a) => /\.exe$/i.test(a.name)) ||
      null
    );
  }
  if (platform === 'darwin') {
    const archHint = process.arch === 'arm64' ? 'arm64' : 'x64';
    return (
      installers.find((a) => a.name.toLowerCase().includes(archHint) && /\.dmg$/i.test(a.name)) ||
      installers.find((a) => /\.dmg$/i.test(a.name)) ||
      installers.find((a) => a.name.toLowerCase().includes(archHint) && /\.zip$/i.test(a.name)) ||
      installers.find((a) => /\.zip$/i.test(a.name)) ||
      null
    );
  }
  return (
    installers.find((a) => /\.(AppImage|deb)$/i.test(a.name)) ||
    installers.find((a) => /setup.*\.exe$/i.test(a.name)) ||
    installers[0] ||
    null
  );
}

export async function checkForGitUpdates({
  owner = 'Makerxm800',
  repo = 'Dns-Changer-Pro',
  branch = 'main',
  appRoot = process.cwd(),
} = {}) {
  const local = await getLocalGitInfo(appRoot);
  const safeOwner = encodeURIComponent(owner.trim());
  const safeRepo = encodeURIComponent(repo.trim());
  const safeBranch = encodeURIComponent(branch.trim());

  const commitsUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}/commits?sha=${safeBranch}&per_page=5`;
  const releaseUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}/releases/latest`;

  const [releaseResult, commitsResult] = await Promise.allSettled([
    fetchJson(releaseUrl),
    fetchJson(commitsUrl),
  ]);

  if (releaseResult.status === 'rejected' && commitsResult.status === 'rejected') {
    return {
      ok: false,
      error: releaseResult.reason?.message || commitsResult.reason?.message || 'Unable to reach update server',
      ...local,
      owner,
      repo,
      branch,
      checkedAt: new Date().toISOString(),
    };
  }

  let latestRelease = null;
  if (releaseResult.status === 'fulfilled' && releaseResult.value) {
    const rel = releaseResult.value;
    const assets = Array.isArray(rel.assets)
      ? rel.assets.map((a) => ({
          name: a.name,
          size: a.size,
          downloadUrl: a.browser_download_url,
        }))
      : [];
    latestRelease = {
      tagName: rel.tag_name,
      name: rel.name || rel.tag_name,
      publishedAt: rel.published_at,
      htmlUrl: rel.html_url,
      body: rel.body || '',
      assets,
      recommendedAsset: pickPlatformAsset(assets),
    };
  }

  const commits = commitsResult.status === 'fulfilled' && Array.isArray(commitsResult.value)
    ? commitsResult.value
    : [];
  const latest = commits[0] || null;
  const remoteSha = latest?.sha || null;

  const hasNewRelease = latestRelease ? compareSemver(latestRelease.tagName, local.version) > 0 : false;
  const hasNewCommit = Boolean(local.isGitRepo && remoteSha && local.localSha && remoteSha !== local.localSha);

  let localContainsRemote = false;
  if (local.isGitRepo && remoteSha) {
    try {
      await execFileAsync('git', ['merge-base', '--is-ancestor', remoteSha, 'HEAD'], {
        cwd: appRoot,
        timeout: 5000,
      });
      localContainsRemote = true;
    } catch {
      localContainsRemote = false;
    }
  }

  // Compare release semver cleanly so newer local builds never falsely show an older release as an update
  const updateAvailable = latestRelease
    ? hasNewRelease
    : Boolean(local.isGitRepo && hasNewCommit && !localContainsRemote);

  return {
    ok: true,
    ...local,
    owner,
    repo,
    branch,
    remoteSha,
    remoteShortSha: remoteSha ? remoteSha.slice(0, 7) : null,
    remoteCommitMessage: latest?.commit?.message || '',
    remoteAuthor: latest?.commit?.author?.name || latest?.author?.login || '',
    remoteDate: latest?.commit?.author?.date || null,
    remoteUrl: latestRelease?.htmlUrl || latest?.html_url || `https://github.com/${owner}/${repo}/releases`,
    recentCommits: commits.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: String(c.commit?.message || '').split('\n')[0],
      author: c.commit?.author?.name || c.author?.login || '',
      date: c.commit?.author?.date || '',
      url: c.html_url,
    })),
    latestRelease,
    latestVersion: latestRelease?.tagName || `v${local.version}`,
    hasNewRelease,
    hasNewCommit,
    localContainsRemote,
    updateAvailable,
    checkedAt: new Date().toISOString(),
  };
}

export async function applyGitUpdate({
  owner = 'Makerxm800',
  repo = 'Dns-Changer-Pro',
  branch = 'main',
  appRoot = process.cwd(),
  downloadsDir,
  onProgress,
} = {}) {
  const status = await checkForGitUpdates({ owner, repo, branch, appRoot });
  if (!status.ok) {
    throw new Error(status.error || 'Failed to check for updates');
  }

  if (status.isGitRepo) {
    const safeBranch = branch.replace(/[^a-zA-Z0-9._/-]/g, '');
    const logs = [];
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    try {
      const { stdout, stderr } = await execFileAsync('git', ['fetch', repoUrl, safeBranch], {
        cwd: appRoot,
        timeout: 30000,
      });
      if (stdout) logs.push(stdout.trim());
      if (stderr) logs.push(stderr.trim());
    } catch (err) {
      throw new Error(`git fetch failed: ${err.message}`);
    }

    if (status.dirty) {
      return {
        ok: false,
        needsCleanTree: true,
        message: 'Local workspace has uncommitted changes. Commit or stash changes before updating.',
        logs,
        status,
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync('git', ['merge', '--ff-only', 'FETCH_HEAD'], {
        cwd: appRoot,
        timeout: 20000,
      });
      if (stdout) logs.push(stdout.trim());
      if (stderr) logs.push(stderr.trim());

      const updatedLocal = await getLocalGitInfo(appRoot);
      return {
        ok: true,
        updated: updatedLocal.localSha !== status.localSha,
        method: 'git-pull',
        message:
          updatedLocal.localSha !== status.localSha
            ? `Updated to latest version (${updatedLocal.localSha?.slice(0, 7)}). Reload the app to apply changes.`
            : 'Already on the latest version.',
        logs,
        newSha: updatedLocal.localSha,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Fast-forward pull skipped (${err.message}).`,
        logs,
        status,
      };
    }
  }

  // Packaged .exe / .dmg mode: download installer directly if downloadsDir is supplied
  const asset = status.latestRelease?.recommendedAsset;
  if (asset && downloadsDir) {
    const destPath = path.join(downloadsDir, asset.name);
    const dl = await downloadFileWithRedirects(asset.downloadUrl, destPath, onProgress);
    return {
      ok: true,
      updated: true,
      method: 'installer-downloaded',
      filePath: dl.filePath,
      fileName: asset.name,
      downloadUrl: asset.downloadUrl,
      message: `Downloaded ${asset.name}. Launching installer now...`,
      status,
    };
  }

  return {
    ok: true,
    updated: false,
    method: 'release-link',
    downloadUrl:
      asset?.downloadUrl ||
      status.latestRelease?.htmlUrl ||
      `https://github.com/${owner}/${repo}/releases/latest`,
    message: asset
      ? `Latest installer (${asset.name}) is ready to download.`
      : `Latest release page is ready.`,
    status,
  };
}

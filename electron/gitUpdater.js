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
          'User-Agent': 'DNS-Change-Supreme-Updater/2.0',
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
            } catch (e) {
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
  let version = '2.0.0';
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

export async function checkForGitUpdates({
  owner = 'Makerxm800',
  repo = 'Dns-Change-Supreme',
  branch = 'main',
  appRoot = process.cwd(),
} = {}) {
  const local = await getLocalGitInfo(appRoot);
  const safeOwner = encodeURIComponent(owner.trim());
  const safeRepo = encodeURIComponent(repo.trim());
  const safeBranch = encodeURIComponent(branch.trim());

  const commitsUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}/commits?sha=${safeBranch}&per_page=6`;
  const releaseUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}/releases/latest`;

  const [commitsResult, releaseResult] = await Promise.allSettled([
    fetchJson(commitsUrl),
    fetchJson(releaseUrl),
  ]);

  if (commitsResult.status === 'rejected') {
    return {
      ok: false,
      error: commitsResult.reason?.message || 'Unable to reach GitHub API',
      ...local,
      owner,
      repo,
      branch,
      checkedAt: new Date().toISOString(),
    };
  }

  const commits = Array.isArray(commitsResult.value) ? commitsResult.value : [];
  const latest = commits[0] || null;
  const remoteSha = latest?.sha || null;

  let latestRelease = null;
  if (releaseResult.status === 'fulfilled' && releaseResult.value) {
    const rel = releaseResult.value;
    latestRelease = {
      tagName: rel.tag_name,
      name: rel.name || rel.tag_name,
      publishedAt: rel.published_at,
      htmlUrl: rel.html_url,
      body: rel.body || '',
      assets: Array.isArray(rel.assets)
        ? rel.assets.map((a) => ({
            name: a.name,
            size: a.size,
            downloadUrl: a.browser_download_url,
          }))
        : [],
    };
  }

  const hasNewRelease = latestRelease ? compareSemver(latestRelease.tagName, local.version) > 0 : false;
  const hasNewCommit = Boolean(remoteSha && local.localSha && remoteSha !== local.localSha);

  // Check if local repo already contains remoteSha (i.e. local branch is ahead/diverged)
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

  const updateAvailable = hasNewRelease || (hasNewCommit && !localContainsRemote);

  return {
    ok: true,
    ...local,
    owner,
    repo,
    branch,
    remoteSha,
    remoteShortSha: remoteSha ? remoteSha.slice(0, 7) : null,
    remoteCommitMessage: latest?.commit?.message || '',
    remoteAuthor: latest?.commit?.author?.name || latest?.author?.login || 'Unknown',
    remoteDate: latest?.commit?.author?.date || null,
    remoteUrl: latest?.html_url || `https://github.com/${owner}/${repo}`,
    recentCommits: commits.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: String(c.commit?.message || '').split('\n')[0],
      author: c.commit?.author?.name || c.author?.login || 'Author',
      date: c.commit?.author?.date || '',
      url: c.html_url,
    })),
    latestRelease,
    hasNewRelease,
    hasNewCommit,
    localContainsRemote,
    updateAvailable,
    checkedAt: new Date().toISOString(),
  };
}

export async function applyGitUpdate({
  owner = 'Makerxm800',
  repo = 'Dns-Change-Supreme',
  branch = 'main',
  appRoot = process.cwd(),
} = {}) {
  const status = await checkForGitUpdates({ owner, repo, branch, appRoot });
  if (!status.ok) {
    throw new Error(status.error || 'Failed to check GitHub updates');
  }

  if (status.isGitRepo) {
    const safeBranch = branch.replace(/[^a-zA-Z0-9._/-]/g, '');
    const logs = [];

    // Fetch latest from remote
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
        message: 'Local workspace has uncommitted changes. Commit or stash your local changes before pulling from git.',
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
            ? `Updated to latest commit ${updatedLocal.localSha?.slice(0, 7)}. Restart app to load updated files.`
            : 'Already up to date with latest Git commit.',
        logs,
        newSha: updatedLocal.localSha,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Fast-forward pull skipped (${err.message}). Your branch may have local commits ahead of ${owner}/${repo}:${safeBranch}.`,
        logs,
        status,
      };
    }
  }

  // Packaged app mode: point to release asset or tarball
  const platformExt = process.platform === 'win32' ? '.exe' : process.platform === 'darwin' ? '.dmg' : '.zip';
  const matchingAsset = status.latestRelease?.assets?.find((a) => a.name.toLowerCase().endsWith(platformExt));
  return {
    ok: true,
    updated: false,
    method: 'release-link',
    downloadUrl:
      matchingAsset?.downloadUrl ||
      status.latestRelease?.htmlUrl ||
      `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`,
    message: matchingAsset
      ? `Latest installer (${matchingAsset.name}) is ready to download from GitHub Releases.`
      : `Latest source archive for ${owner}/${repo} (${branch}) is ready on GitHub.`,
    status,
  };
}

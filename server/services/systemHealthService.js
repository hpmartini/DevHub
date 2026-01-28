import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Cache for health report (5 minute TTL)
let healthCache = null;
let healthCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * System Health Service
 * Checks Node, npm, Git versions, Docker availability, disk space
 */
class SystemHealthService {
  /**
   * Get Node.js version info
   */
  async getNodeInfo() {
    try {
      const { stdout } = await execAsync('node --version');
      const current = stdout.trim().replace(/^v/, '');

      // Detect version manager
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      let manager = 'system';
      if (fs.existsSync(path.join(homeDir, '.nvm'))) manager = 'nvm';
      else if (fs.existsSync(path.join(homeDir, '.volta'))) manager = 'volta';
      else if (fs.existsSync(path.join(homeDir, '.asdf'))) manager = 'asdf';

      // Fetch latest LTS version
      let latest = current;
      let isOutdated = false;
      try {
        const { stdout: distJson } = await execAsync('curl -s --max-time 5 https://nodejs.org/dist/index.json');
        const versions = JSON.parse(distJson);
        const latestLTS = versions.find(v => v.lts !== false);
        if (latestLTS) {
          latest = latestLTS.version.replace(/^v/, '');
          isOutdated = this._compareSemver(current, latest) < 0;
        }
      } catch {
        // Network error, skip version check
      }

      return { current, latest, isOutdated, manager };
    } catch {
      return { current: 'unknown', latest: 'unknown', isOutdated: false, manager: 'system' };
    }
  }

  /**
   * Get npm version info
   */
  async getNpmInfo() {
    try {
      const { stdout } = await execAsync('npm --version');
      const current = stdout.trim();

      let latest = current;
      let isOutdated = false;
      try {
        const { stdout: registryJson } = await execAsync('curl -s --max-time 5 https://registry.npmjs.org/npm/latest');
        const data = JSON.parse(registryJson);
        latest = data.version;
        isOutdated = this._compareSemver(current, latest) < 0;
      } catch {
        // Network error, skip
      }

      return { current, latest, isOutdated };
    } catch {
      return { current: 'unknown', latest: 'unknown', isOutdated: false };
    }
  }

  /**
   * Get Git info
   */
  async getGitInfo() {
    try {
      const { stdout } = await execAsync('git --version');
      const match = stdout.match(/(\d+\.\d+\.\d+)/);
      return { version: match ? match[1] : 'unknown', available: true };
    } catch {
      return { version: null, available: false };
    }
  }

  /**
   * Get Docker info
   */
  async getDockerInfo() {
    try {
      const { stdout } = await execAsync('docker --version');
      const match = stdout.match(/(\d+\.\d+\.\d+)/);
      const version = match ? match[1] : 'unknown';

      // Check if daemon is running
      let daemonRunning = false;
      try {
        await execAsync('docker info', { timeout: 5000 });
        daemonRunning = true;
      } catch {
        // Daemon not running
      }

      return { available: true, version, daemonRunning };
    } catch {
      return { available: false, version: null, daemonRunning: false };
    }
  }

  /**
   * Get disk space for project directories
   */
  async getDiskSpace(directories) {
    const results = [];
    const checked = new Set();

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;

      // Get mount point to avoid duplicate checks
      try {
        const { stdout } = await execAsync(`df -k "${dir}" | tail -1`);
        const parts = stdout.trim().split(/\s+/);
        const mountPoint = parts[parts.length - 1];

        if (checked.has(mountPoint)) continue;
        checked.add(mountPoint);

        const availableKB = parseInt(parts[3], 10);
        const availableGB = Math.round((availableKB / 1024 / 1024) * 10) / 10;

        results.push({
          path: mountPoint,
          availableGB,
          isLow: availableGB < 5,
        });
      } catch {
        // Skip this directory
      }
    }

    return results;
  }

  /**
   * Get full system health report (cached for 5 minutes)
   */
  async getFullHealthReport(directories = []) {
    const now = Date.now();
    if (healthCache && (now - healthCacheTimestamp) < CACHE_TTL) {
      return healthCache;
    }

    const [node, npm, git, docker, disk] = await Promise.all([
      this.getNodeInfo(),
      this.getNpmInfo(),
      this.getGitInfo(),
      this.getDockerInfo(),
      this.getDiskSpace(directories),
    ]);

    healthCache = {
      node,
      npm,
      git,
      docker,
      disk,
      timestamp: new Date().toISOString(),
    };
    healthCacheTimestamp = now;

    return healthCache;
  }

  /**
   * Check if node_modules is stale (lockfile newer than node_modules)
   */
  async checkStaleNodeModules(projectPath) {
    try {
      const lockPath = path.join(projectPath, 'package-lock.json');
      const nmPath = path.join(projectPath, 'node_modules', '.package-lock.json');

      if (!fs.existsSync(lockPath)) return { stale: false, reason: 'no lockfile' };
      if (!fs.existsSync(nmPath)) return { stale: true, reason: 'node_modules missing' };

      const lockStat = fs.statSync(lockPath);
      const nmStat = fs.statSync(nmPath);

      return {
        stale: lockStat.mtimeMs > nmStat.mtimeMs,
        reason: lockStat.mtimeMs > nmStat.mtimeMs ? 'lockfile newer than node_modules' : 'up to date',
      };
    } catch {
      return { stale: false, reason: 'check failed' };
    }
  }

  /**
   * Run npm audit for a project
   */
  async checkSecurityAudit(projectPath) {
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: projectPath,
        timeout: 30000,
      });
      const data = JSON.parse(stdout);
      const meta = data.metadata?.vulnerabilities || {};
      return {
        total: (meta.critical || 0) + (meta.high || 0) + (meta.moderate || 0) + (meta.low || 0),
        critical: meta.critical || 0,
        high: meta.high || 0,
        moderate: meta.moderate || 0,
        low: meta.low || 0,
      };
    } catch (error) {
      // npm audit exits with non-zero when vulnerabilities found
      try {
        const data = JSON.parse(error.stdout || '{}');
        const meta = data.metadata?.vulnerabilities || {};
        return {
          total: (meta.critical || 0) + (meta.high || 0) + (meta.moderate || 0) + (meta.low || 0),
          critical: meta.critical || 0,
          high: meta.high || 0,
          moderate: meta.moderate || 0,
          low: meta.low || 0,
        };
      } catch {
        return { total: 0, critical: 0, high: 0, moderate: 0, low: 0 };
      }
    }
  }

  /**
   * Check for outdated dependencies
   */
  async checkOutdatedDeps(projectPath) {
    try {
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: projectPath,
        timeout: 30000,
      });
      const data = JSON.parse(stdout || '{}');
      return Object.entries(data).map(([name, info]) => ({
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        isMajor: info.current && info.latest && info.current.split('.')[0] !== info.latest.split('.')[0],
      }));
    } catch (error) {
      // npm outdated exits non-zero when outdated deps found
      try {
        const data = JSON.parse(error.stdout || '{}');
        return Object.entries(data).map(([name, info]) => ({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          isMajor: info.current && info.latest && info.current.split('.')[0] !== info.latest.split('.')[0],
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Update Node.js using detected version manager
   */
  async updateNode(targetVersion) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';

    if (fs.existsSync(path.join(homeDir, '.nvm'))) {
      try {
        await execAsync(`bash -l -c "nvm install ${targetVersion} && nvm alias default ${targetVersion}"`, { timeout: 120000 });
        return { success: true, method: 'nvm' };
      } catch (error) {
        return { success: false, method: 'nvm', instructions: `Run: nvm install ${targetVersion} && nvm alias default ${targetVersion}` };
      }
    }

    if (fs.existsSync(path.join(homeDir, '.volta'))) {
      try {
        await execAsync(`volta install node@${targetVersion}`, { timeout: 120000 });
        return { success: true, method: 'volta' };
      } catch (error) {
        return { success: false, method: 'volta', instructions: `Run: volta install node@${targetVersion}` };
      }
    }

    return {
      success: false,
      method: 'system',
      instructions: `Download from https://nodejs.org or run: brew upgrade node`,
    };
  }

  /**
   * Update npm to latest
   */
  async updateNpm() {
    try {
      const { stdout } = await execAsync('npm install -g npm@latest', { timeout: 120000 });
      const versionMatch = stdout.match(/npm@(\d+\.\d+\.\d+)/);
      return { success: true, newVersion: versionMatch ? versionMatch[1] : 'latest' };
    } catch {
      return { success: false, newVersion: null, instructions: 'Run: npm install -g npm@latest' };
    }
  }

  /**
   * Compare semver versions
   * @returns negative if a < b, 0 if equal, positive if a > b
   */
  _compareSemver(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}

export const systemHealthService = new SystemHealthService();
export default SystemHealthService;

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import pidusage from 'pidusage';

// Store running processes
const processes = new Map();

// Event emitter for process events
export const processEvents = new EventEmitter();

// Allowlist of safe commands - prevents command injection
const ALLOWED_COMMANDS = [
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'node',
  'bun',
  'docker',
];

// Allowlist of safe npm script patterns
const ALLOWED_SCRIPT_PATTERNS = [
  /^(run\s+)?(dev|start|serve|develop|preview|build|test)$/,
  /^start$/,
];

// Allowed Docker compose subcommands
const ALLOWED_DOCKER_COMPOSE_PATTERN = /^compose\s+(up|down|restart|build|pull|logs|ps)(\s+.*)?$/;

// Port flag mapping per framework type
const PORT_FLAGS = {
  vite: '--port',
  next: '-p',
  nuxt: '--port',
  vue: '--port',
};

/**
 * Get the port CLI flag for a framework type, if any
 */
function getPortFlag(frameworkType) {
  return PORT_FLAGS[frameworkType] || null;
}

/**
 * Validate that a command is safe to execute
 */
function validateCommand(command) {
  const parts = command.trim().split(/\s+/);
  const baseCmd = parts[0];

  // Check if base command is in allowlist
  if (!ALLOWED_COMMANDS.includes(baseCmd)) {
    throw new Error(`Command '${baseCmd}' is not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}`);
  }

  // For Docker commands, validate compose subcommands
  if (baseCmd === 'docker') {
    const dockerArgs = parts.slice(1).join(' ');
    if (!ALLOWED_DOCKER_COMPOSE_PATTERN.test(dockerArgs)) {
      throw new Error(`Docker command '${dockerArgs}' is not allowed. Only 'compose up/down/restart/build/pull/logs/ps' are permitted.`);
    }
    return true; // Docker commands may contain flags with special chars, skip further checks
  }

  // For npm/yarn/pnpm, validate the script pattern
  if (['npm', 'yarn', 'pnpm'].includes(baseCmd)) {
    const scriptPart = parts.slice(1).join(' ');
    const isValid = ALLOWED_SCRIPT_PATTERNS.some(pattern => pattern.test(scriptPart));
    if (!isValid) {
      throw new Error(`Script '${scriptPart}' is not allowed. Use standard scripts like 'dev', 'start', 'serve'.`);
    }
  }

  // Check for dangerous characters that could enable injection
  const dangerousPatterns = [';', '&&', '||', '|', '`', '$', '>', '<', '\\n', '\\r'];
  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      throw new Error(`Command contains forbidden character: '${pattern}'`);
    }
  }

  return true;
}

/**
 * Get real CPU and memory usage for a process
 */
export async function getProcessStats(pid) {
  try {
    const stats = await pidusage(pid);
    return {
      cpu: stats.cpu,
      memory: stats.memory / 1024 / 1024, // Convert to MB
    };
  } catch {
    return { cpu: 0, memory: 0 };
  }
}

/**
 * Get process info by app ID
 */
export function getProcessInfo(appId) {
  return processes.get(appId);
}

/**
 * Get all running processes
 */
export function getAllProcesses() {
  const result = {};
  for (const [id, info] of processes) {
    result[id] = {
      pid: info.process?.pid,
      status: info.status,
      startTime: info.startTime,
      uptime: info.startTime ? Math.floor((Date.now() - info.startTime) / 1000) : 0,
    };
  }
  return result;
}

/**
 * Start a process for an app
 * @param {string} appId - Unique app identifier
 * @param {string} appPath - Path to the app directory
 * @param {string} command - Command to run
 * @param {number} [port] - Optional port number to set as PORT env variable
 * @param {string} [frameworkType] - Optional framework type for port flag injection
 */
export function startProcess(appId, appPath, command, port, frameworkType) {
  // Validate command before execution (security check)
  validateCommand(command);

  // Inject port flag for frameworks that need CLI flags instead of PORT env
  let effectiveCommand = command;
  if (port && frameworkType) {
    const portFlag = getPortFlag(frameworkType);
    if (portFlag) {
      // Only inject if the flag isn't already in the command
      if (!command.includes(portFlag)) {
        effectiveCommand = `${command} -- ${portFlag} ${port}`;
      }
    }
  }

  // Check if already running
  if (processes.has(appId)) {
    const existing = processes.get(appId);
    if (existing.status === 'RUNNING') {
      throw new Error('Process is already running');
    }
  }

  // Parse command safely
  const parts = effectiveCommand.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  // Set status to starting
  const processInfo = {
    appId,
    appPath,
    command: effectiveCommand,
    originalCommand: command,
    port,
    frameworkType,
    status: 'STARTING',
    startTime: null,
    logs: [],
    process: null,
  };
  processes.set(appId, processInfo);
  processEvents.emit('status', { appId, status: 'STARTING' });

  // Build PATH with local node_modules/.bin and common system paths
  // In Electron packaged apps, the shell PATH may not include standard npm locations
  const localBinPath = path.join(appPath, 'node_modules', '.bin');
  const currentPath = process.env.PATH || '';
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  // Include NVM versioned paths (check for existing NVM_DIR or common patterns)
  const nvmDir = process.env.NVM_DIR || `${homeDir}/.nvm`;

  // Scan for NVM node versions - these MUST come first
  const nvmNodePaths = [];
  try {
    const nvmVersionsPath = `${nvmDir}/versions/node`;
    if (fs.existsSync(nvmVersionsPath)) {
      const versions = fs.readdirSync(nvmVersionsPath);
      versions.sort().reverse().forEach(v => {
        const binPath = `${nvmVersionsPath}/${v}/bin`;
        if (fs.existsSync(binPath)) {
          nvmNodePaths.push(binPath);
        }
      });
    }
  } catch {
    // Ignore errors scanning NVM versions
  }

  // Check if /opt/homebrew/bin/node points to broken Homebrew node
  let excludeHomebrewBin = false;
  try {
    const homebrewNodePath = '/opt/homebrew/bin/node';
    if (fs.existsSync(homebrewNodePath)) {
      const realPath = fs.realpathSync(homebrewNodePath);
      if (realPath.includes('homebrew/Cellar/node')) {
        excludeHomebrewBin = true;
      }
    }
  } catch {
    // Ignore
  }

  // NVM paths first, then other version managers, then system paths
  const commonPaths = [
    ...nvmNodePaths,  // NVM versioned paths FIRST
    `${nvmDir}/current/bin`,
    `${homeDir}/.volta/bin`,
    `${homeDir}/.asdf/shims`,
    `${homeDir}/.bun/bin`,
    `${homeDir}/Library/pnpm`,
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].filter(p => p && fs.existsSync(p));

  // Filter out problematic paths from inherited PATH
  const filteredCurrentPath = (currentPath || '')
    .split(':')
    .filter(p => {
      if (!p) return false;
      if (p.includes('homebrew/Cellar/node')) return false;
      if (p.includes('homebrew/opt/node')) return false;
      if (excludeHomebrewBin && p === '/opt/homebrew/bin') return false;
      return true;
    })
    .join(':');

  const newPath = [localBinPath, ...commonPaths, filteredCurrentPath]
    .filter(Boolean)
    .join(':');

  console.log(`[Process] Starting ${appId}`);
  console.log(`[Process] NVM paths: ${nvmNodePaths.length > 0 ? nvmNodePaths[0] : 'none found'}`);
  console.log(`[Process] PATH (first 3): ${newPath.split(':').slice(0, 3).join(':')}`);

  // Build environment variables, including PORT if specified
  const env = {
    ...process.env,
    PATH: newPath,
    FORCE_COLOR: '1',
  };

  // Set PORT env variable if configured
  if (port) {
    env.PORT = String(port);
  }

  // Spawn the process using bash with --norc --noprofile to prevent
  // loading shell config files that might override our PATH
  const fullCommand = [cmd, ...args].join(' ');
  const childProcess = spawn('/bin/bash', ['--norc', '--noprofile', '-c', fullCommand], {
    cwd: appPath,
    env,
  });

  processInfo.process = childProcess;
  processInfo.startTime = Date.now();
  processInfo.status = 'RUNNING';

  // Handle stdout
  childProcess.stdout.on('data', (data) => {
    const log = data.toString().trim();
    if (log) {
      processInfo.logs.push({
        type: 'stdout',
        message: log,
        timestamp: new Date().toISOString(),
      });
      // Keep last 100 logs
      if (processInfo.logs.length > 100) {
        processInfo.logs = processInfo.logs.slice(-100);
      }
      processEvents.emit('log', { appId, type: 'stdout', message: log });
    }
  });

  // Handle stderr
  childProcess.stderr.on('data', (data) => {
    const log = data.toString().trim();
    if (log) {
      processInfo.logs.push({
        type: 'stderr',
        message: log,
        timestamp: new Date().toISOString(),
      });
      if (processInfo.logs.length > 100) {
        processInfo.logs = processInfo.logs.slice(-100);
      }
      processEvents.emit('log', { appId, type: 'stderr', message: log });
    }
  });

  // Handle process exit
  childProcess.on('exit', (code, signal) => {
    processInfo.status = code === 0 ? 'STOPPED' : 'ERROR';
    processInfo.exitCode = code;
    processInfo.exitSignal = signal;
    processEvents.emit('status', {
      appId,
      status: processInfo.status,
      exitCode: code,
      exitSignal: signal,
    });
  });

  // Handle process error
  childProcess.on('error', (error) => {
    processInfo.status = 'ERROR';
    processInfo.error = error.message;
    processInfo.logs.push({
      type: 'error',
      message: `Process error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
    processEvents.emit('status', { appId, status: 'ERROR', error: error.message });
  });

  processEvents.emit('status', { appId, status: 'RUNNING', pid: childProcess.pid });

  return {
    pid: childProcess.pid,
    status: 'RUNNING',
  };
}

/**
 * Stop a process
 */
export function stopProcess(appId) {
  const processInfo = processes.get(appId);

  if (!processInfo || !processInfo.process) {
    throw new Error('Process not found');
  }

  if (processInfo.status !== 'RUNNING') {
    throw new Error('Process is not running');
  }

  // Kill the process tree
  const pid = processInfo.process.pid;

  try {
    // On Unix, kill the process group
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Fallback to killing just the process
    processInfo.process.kill('SIGTERM');
  }

  processInfo.status = 'STOPPED';
  processInfo.logs.push({
    type: 'system',
    message: '[SYSTEM] Process terminated',
    timestamp: new Date().toISOString(),
  });

  processEvents.emit('status', { appId, status: 'STOPPED' });

  return { status: 'STOPPED' };
}

/**
 * Restart a process
 */
export function restartProcess(appId) {
  const processInfo = processes.get(appId);

  if (!processInfo) {
    throw new Error('Process info not found');
  }

  const { appPath, originalCommand, port, frameworkType } = processInfo;

  // Stop if running
  if (processInfo.status === 'RUNNING') {
    stopProcess(appId);
  }

  // Wait a bit then start
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = startProcess(appId, appPath, originalCommand || processInfo.command, port, frameworkType);
      resolve(result);
    }, 1000);
  });
}

/**
 * Get logs for a process
 */
export function getProcessLogs(appId, limit = 50) {
  const processInfo = processes.get(appId);
  if (!processInfo) {
    return [];
  }
  return processInfo.logs.slice(-limit);
}

/**
 * Clean up all processes on shutdown
 */
export function cleanupAllProcesses() {
  for (const [appId] of processes) {
    try {
      stopProcess(appId);
    } catch {
      // Ignore errors during cleanup
    }
  }
}

// Cleanup on process exit
process.on('exit', cleanupAllProcesses);
process.on('SIGINT', () => {
  cleanupAllProcesses();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupAllProcesses();
  process.exit();
});

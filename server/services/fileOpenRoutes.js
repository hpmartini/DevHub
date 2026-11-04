import express from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { isLoopbackOrigin } from './remoteAccess.js';

/**
 * POST /api/files/open - open a file path clicked in the terminal (#188) with its default macOS app.
 * Runs on the host, so: only existing paths under home or temp, and anything that could launch
 * code is revealed in Finder (`open -R`) instead of opened.
 */
const router = express.Router();

const openLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many file opens, please slow down' },
});

// Bundles, scripts, installers and Finder location files (.fileloc can point at a binary)
const LAUNCHABLE_EXT = new Set([
  '.app',
  '.command',
  '.sh',
  '.bash',
  '.zsh',
  '.csh',
  '.tool',
  '.terminal',
  '.workflow',
  '.action',
  '.pkg',
  '.mpkg',
  '.jar',
  '.scpt',
  '.scptd',
  '.applescript',
  '.prefpane',
  '.saver',
  '.qlgenerator',
  '.fileloc',
  '.webloc',
  '.inetloc',
  '.url',
  '.mobileconfig',
  '.osax',
  '.kext',
  '.plugin',
  '.bundle',
]);

const realRoot = (dir) => {
  try {
    return fs.realpathSync(dir);
  } catch {
    return null;
  }
};

export const defaultRoots = () => [os.homedir(), os.tmpdir(), '/tmp'].map(realRoot).filter(Boolean);

const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Resolve a clicked path to the real file and decide open vs. reveal.
 * @returns {{ path: string, reveal: boolean }}
 */
export function resolveOpenTarget(input, cwd, roots = defaultRoots()) {
  if (typeof input !== 'string' || !input || input.length > 4096 || input.includes('\0')) {
    throw httpError(400, 'path is invalid');
  }
  let target = input;
  if (target === '~' || target.startsWith('~/')) target = path.join(os.homedir(), target.slice(1));
  if (!path.isAbsolute(target)) {
    if (typeof cwd !== 'string' || !path.isAbsolute(cwd) || cwd.includes('\0')) {
      throw httpError(400, 'Relative path needs the session directory');
    }
    target = path.resolve(cwd, target);
  }
  let real;
  try {
    real = fs.realpathSync(target);
  } catch {
    throw httpError(404, `Datei nicht gefunden: ${input}`);
  }
  if (!roots.some((root) => real === root || real.startsWith(root + path.sep))) {
    throw httpError(403, 'Only files under the home or temp directory can be opened');
  }
  const stat = fs.statSync(real);
  // symlinks are resolved, so a link named report.pdf pointing at an .app is judged by the .app
  const launchable =
    LAUNCHABLE_EXT.has(path.extname(real).toLowerCase()) ||
    (stat.isFile() && (stat.mode & 0o111) !== 0);
  return { path: real, reveal: launchable };
}

router.post('/open', openLimiter, (req, res) => {
  if (!isLoopbackOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Cross-origin requests are not allowed' });
  }
  if (process.platform !== 'darwin') {
    return res.status(501).json({ error: 'Opening files is only supported on macOS' });
  }
  const { path: input, cwd } = req.body || {};
  let target;
  try {
    target = resolveOpenTarget(input, cwd);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
  // the resolved path is absolute, so it can never be read as an option
  const args = target.reveal ? ['-R', target.path] : [target.path];
  execFile('open', args, (error) => {
    if (error) return res.status(500).json({ error: `open failed: ${error.message}` });
    res.json({ success: true, action: target.reveal ? 'revealed' : 'opened', path: target.path });
  });
});

export default router;

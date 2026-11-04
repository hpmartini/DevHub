import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';

const execFile = vi.fn((...a) => a.at(-1)?.(null, '', ''));
vi.mock('child_process', async (orig) => {
  const actual = await orig();
  return { ...actual, default: { ...actual, execFile }, execFile };
});

const { default: router, resolveOpenTarget } = await import('../server/services/fileOpenRoutes.js');
const remoteAccess = await import('../server/services/remoteAccess.js');

let dir;
let server;
let base;
const platform = process.platform;

beforeAll(async () => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fileopen-')));
  fs.writeFileSync(path.join(dir, 'report.pdf'), 'x');
  fs.writeFileSync(path.join(dir, 'run.command'), 'echo hi');
  fs.writeFileSync(path.join(dir, 'tool'), '#!/bin/sh');
  fs.chmodSync(path.join(dir, 'tool'), 0o755);
  fs.mkdirSync(path.join(dir, 'Evil.app'));
  fs.symlinkSync(path.join(dir, 'Evil.app'), path.join(dir, 'innocent.pdf'));
  fs.mkdirSync(path.join(dir, 'folder'));
  fs.mkdirSync(path.join(dir, 'Helper.xpc'));
  fs.writeFileSync(path.join(dir, 'notes.py'), 'print(1)');
  fs.writeFileSync(path.join(dir, 'page.html'), '<script></script>');
  // Finder alias (bookmark) named like a PDF; `open` would follow it to its target
  fs.writeFileSync(path.join(dir, 'alias.pdf'), Buffer.from('book\0\0\0\0mark\0\0\0\0', 'latin1'));
  const app = express();
  // same order as server/index.js: token check before the route
  app.use(remoteAccess.requireRemoteToken);
  app.use(express.json());
  app.use('/api/files', router);
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/files/open`;
  Object.defineProperty(process, 'platform', { value: 'darwin' });
});

afterAll(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  Object.defineProperty(process, 'platform', { value: platform });
});

beforeEach(() => execFile.mockClear());

const post = (body, headers = {}) =>
  fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('POST /api/files/open', () => {
  it('opens a file with open <path>', async () => {
    const res = await post({ path: path.join(dir, 'report.pdf') });
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe('opened');
    expect(execFile.mock.calls[0].slice(0, 2)).toEqual(['open', [path.join(dir, 'report.pdf')]]);
  });

  it('opens a folder', async () => {
    const res = await post({ path: 'folder', cwd: dir });
    expect(res.status).toBe(200);
    expect(execFile.mock.calls[0][1]).toEqual([path.join(dir, 'folder')]);
  });

  it.each([
    'run.command',
    'tool',
    'Evil.app',
    'innocent.pdf',
    'Helper.xpc',
    'notes.py',
    'page.html',
    'alias.pdf',
  ])('reveals launchable %s in Finder instead of opening it', async (name) => {
    const res = await post({ path: `./${name}`, cwd: dir });
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe('revealed');
    expect(execFile.mock.calls[0][1][0]).toBe('-R');
  });

  it('rejects a missing file with 404 and runs nothing', async () => {
    const res = await post({ path: path.join(dir, 'nope.pdf') });
    expect(res.status).toBe(404);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('rejects a relative path without a valid cwd', async () => {
    expect((await post({ path: 'report.pdf' })).status).toBe(400);
    expect((await post({ path: 'report.pdf', cwd: 'rel/dir' })).status).toBe(400);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('rejects paths outside home and temp', async () => {
    expect((await post({ path: '/etc/hosts' })).status).toBe(403);
    expect((await post({ path: `${dir}${'/..'.repeat(20)}/etc/hosts` })).status).toBe(403);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('rejects option-like and malformed input', async () => {
    expect((await post({ path: '-a', cwd: dir })).status).toBe(404);
    expect((await post({ path: 42 })).status).toBe(400);
    expect((await post({ path: 'a\0b', cwd: dir })).status).toBe(400);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('refuses cross-origin requests', async () => {
    const res = await post(
      { path: path.join(dir, 'report.pdf') },
      { Origin: 'https://evil.example' }
    );
    expect(res.status).toBe(403);
    expect(execFile).not.toHaveBeenCalled();
  });
});

describe('remote access (AC-5)', () => {
  it('blocks a non-loopback request without pairing token', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileopen-remote-'));
    process.env.DEVORBIT_DATA_PATH = dataDir;
    process.env.DEVORBIT_REMOTE = 'true';
    remoteAccess.resetTokenCache();
    try {
      const res = await post(
        { path: path.join(dir, 'report.pdf') },
        { 'X-Forwarded-For': '100.64.0.7' }
      );
      expect(res.status).toBe(401);
      expect(execFile).not.toHaveBeenCalled();
    } finally {
      delete process.env.DEVORBIT_REMOTE;
      delete process.env.DEVORBIT_DATA_PATH;
      remoteAccess.resetTokenCache();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('accepts the Electron file:// origin only inside Electron', () => {
    const saved = process.env.ELECTRON_MODE;
    try {
      delete process.env.ELECTRON_MODE;
      expect(remoteAccess.isLoopbackOrigin('null')).toBe(false);
      process.env.ELECTRON_MODE = 'true';
      expect(remoteAccess.isLoopbackOrigin('null')).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.ELECTRON_MODE;
      else process.env.ELECTRON_MODE = saved;
    }
  });
});

describe('resolveOpenTarget', () => {
  it('expands ~ against the home directory', () => {
    expect(() => resolveOpenTarget('~/definitely-missing-188.pdf', undefined)).toThrow(
      /nicht gefunden/
    );
  });
});

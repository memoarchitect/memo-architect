import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findJupyter, JupyterManager } from '../jupyter.js';
import { injectJupyterControl, startJupyterControl } from '../jupyter-control.js';
import { architectJupyterCommand } from '../commands/jupyter.js';

// A stand-in for `jupyter`: `lab` serves /api/status behind the token from
// JUPYTER_TOKEN and records its pid; `server list --json` prints what the test
// put in FAKE_JUPYTER_LIST. No real Jupyter, no compiler.
const FAKE = `#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'server') { process.stdout.write(process.env.FAKE_JUPYTER_LIST ?? ''); process.exit(0); }
if (args.includes('--version')) process.exit(process.env.FAKE_NO_LAB ? 1 : 0);
const port = Number(args.find(a => a.startsWith('--port=')).slice(7));
writeFileSync(process.env.FAKE_PID_FILE, JSON.stringify({ pid: process.pid, args, token: process.env.JUPYTER_TOKEN }));
require('node:http').createServer((req, res) => {
    res.statusCode = req.headers.authorization === 'token ' + process.env.JUPYTER_TOKEN ? 200 : 403;
    res.end('{}');
}).listen(port, '127.0.0.1');
process.on('SIGTERM', () => process.exit(0));
`;

const posix = process.platform !== 'win32';
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

let dir: string;
let fake: string;
let env: NodeJS.ProcessEnv;
const pidFile = () => JSON.parse(readFileSync(join(dir, 'pid.json'), 'utf8')) as { pid: number; args: string[]; token: string };

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'memo-jupyter-'));
    fake = join(dir, 'jupyter');
    writeFileSync(fake, FAKE);
    chmodSync(fake, 0o755);
    env = { ...process.env, MEMO_JUPYTER_BIN: fake, FAKE_PID_FILE: join(dir, 'pid.json') };
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe.skipIf(!posix)('JupyterManager', () => {
    it('starts a server on a free port with a random token, in the project analysis folder', async () => {
        const manager = new JupyterManager({ root: join(dir, 'analysis'), env, appOrigins: ['http://127.0.0.1:3000'] });
        const status = await manager.start();
        try {
            expect(status).toMatchObject({ state: 'ready', owned: true });
            if (status.state !== 'ready') return;
            const started = pidFile();
            expect(status.token).toHaveLength(48);
            expect(started.token).toBe(status.token);
            expect(started.args).toContain('--no-browser');
            expect(started.args).toContain('--ip=127.0.0.1');
            expect(started.args).toContain(`--ServerApp.root_dir=${join(dir, 'analysis')}`);
            expect(started.args.join(' ')).not.toContain(status.token);
            expect(started.args.some(a => a.startsWith('--ServerApp.allow_origin_pat='))).toBe(true);
            expect((await fetch(`${status.url}/api/status`)).status).toBe(403);
            expect((await fetch(`${status.url}/api/status`, { headers: { Authorization: `token ${status.token}` } })).status).toBe(200);
        } finally { await manager.stop(); }
    });

    it('reuses the server it started instead of starting another', async () => {
        const manager = new JupyterManager({ root: join(dir, 'analysis'), env });
        try {
            const [first, second] = await Promise.all([manager.start(), manager.start()]);
            expect(second).toEqual(first);
            const pid = pidFile().pid;
            expect(await manager.start()).toEqual(first);
            expect(pidFile().pid).toBe(pid);
        } finally { await manager.stop(); }
    });

    it('stops the server and its process on stop', async () => {
        const manager = new JupyterManager({ root: join(dir, 'analysis'), env });
        await manager.start();
        const { pid } = pidFile();
        expect(alive(pid)).toBe(true);
        await manager.stop();
        expect(alive(pid)).toBe(false);
    });

    it('stops synchronously for an exit handler', async () => {
        const manager = new JupyterManager({ root: join(dir, 'analysis'), env });
        await manager.start();
        const { pid } = pidFile();
        manager.stopSync();
        await new Promise(r => setTimeout(r, 300));
        expect(alive(pid)).toBe(false);
    });

    it('reuses a server someone else started for this folder, and never stops it', async () => {
        const root = join(dir, 'analysis');
        mkdirSync(root);
        const external: Server = createServer((_req, res) => { res.end('{}'); });
        await new Promise<void>(r => external.listen(0, '127.0.0.1', r));
        const { port } = external.address() as { port: number };
        try {
            const manager = new JupyterManager({
                root,
                env: { ...env, FAKE_JUPYTER_LIST: JSON.stringify({ url: `http://127.0.0.1:${port}/`, token: 'theirs', root_dir: root }) + '\n' },
            });
            expect(await manager.start()).toEqual({ state: 'ready', url: `http://127.0.0.1:${port}`, token: 'theirs', owned: false });
            await manager.stop();
            expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(200);
            expect(() => readFileSync(join(dir, 'pid.json'))).toThrow();
        } finally { external.close(); }
    });

    it('says how to install Jupyter when it is not there', async () => {
        const missing = await new JupyterManager({ root: join(dir, 'a'), env: { ...env, MEMO_JUPYTER_BIN: join(dir, 'nope') } }).start();
        expect(missing.state).toBe('not-installed');
        expect(missing).toMatchObject({ message: expect.stringContaining('pip install jupyterlab') });
        expect(missing).toMatchObject({ message: expect.stringContaining('MEMO_JUPYTER_BIN') });
        const noPath = await new JupyterManager({ root: join(dir, 'a'), env: { PATH: join(dir, 'empty') } }).start();
        expect(noPath.state).toBe('not-installed');
    });

    it('treats `jupyter` without JupyterLab as not installed', async () => {
        const status = await new JupyterManager({ root: join(dir, 'a'), env: { ...env, FAKE_NO_LAB: '1' } }).start();
        expect(status).toMatchObject({ state: 'not-installed', message: expect.stringContaining('JupyterLab is not installed') });
    });

    it('reports a server that exits while starting', async () => {
        const status = await new JupyterManager({ root: join(dir, 'a'), env: { ...env, FAKE_PID_FILE: join(dir, 'missing', 'pid.json') } }).start();
        expect(status.state).toBe('failed');
    });
});

describe('findJupyter', () => {
    it('finds it on PATH', () => {
        mkdirSync(join(dir, 'bin'));
        writeFileSync(join(dir, 'bin', 'jupyter'), '');
        expect(findJupyter({ PATH: join(dir, 'bin') }, 'linux')).toBe(join(dir, 'bin', 'jupyter'));
        expect(findJupyter({ PATH: join(dir, 'other') }, 'linux')).toBeUndefined();
    });

    it('honours PATHEXT on Windows', () => {
        mkdirSync(join(dir, 'bin'));
        writeFileSync(join(dir, 'bin', 'jupyter.EXE'), '');
        expect(findJupyter({ PATH: join(dir, 'bin'), PATHEXT: '.COM;.EXE' }, 'win32')).toBe(join(dir, 'bin', 'jupyter.EXE'));
    });

    it('prefers the environment override', () => {
        expect(findJupyter({ MEMO_JUPYTER_BIN: fake, PATH: '' }, 'linux')).toBe(fake);
        expect(findJupyter({ MEMO_JUPYTER_BIN: join(dir, 'nope') }, 'linux')).toBeUndefined();
    });
});

describe.skipIf(!posix)('control endpoint', () => {
    it('answers only the Architect page, with the token, and starts Jupyter on request', async () => {
        const origin = 'http://127.0.0.1:3000';
        const manager = new JupyterManager({ root: join(dir, 'analysis'), env });
        const control = await startJupyterControl(manager, [origin]);
        try {
            expect((await fetch(`${control.url}/jupyter/start`, { method: 'POST' })).status).toBe(403);
            expect((await fetch(`${control.url}/jupyter/start`, { method: 'POST', headers: { 'x-memo-token': control.token } })).status).toBe(403);
            expect((await fetch(`${control.url}/jupyter/start`, { method: 'POST', headers: { origin: 'http://evil.example', 'x-memo-token': control.token } })).status).toBe(403);
            const response = await fetch(`${control.url}/jupyter/start`, { method: 'POST', headers: { origin, 'x-memo-token': control.token } });
            expect(response.headers.get('access-control-allow-origin')).toBe(origin);
            expect(await response.json()).toMatchObject({ state: 'ready', owned: true });
        } finally { await manager.stop(); await control.close(); }
    });
});

describe('injectJupyterControl', () => {
    it('splices the endpoint once', () => {
        const html = '<html><head></head><body></body></html>';
        const once = injectJupyterControl(html, { url: 'http://127.0.0.1:1', token: 't' });
        expect(once).toContain('window.__MEMO_JUPYTER__={"url":"http://127.0.0.1:1","token":"t"}');
        expect(injectJupyterControl(once, { url: 'x', token: 'y' })).toBe(once);
    });
});

describe.skipIf(!posix)('memo-architect jupyter', () => {
    it('prints the URL, runs until terminated, then stops Jupyter', async () => {
        const previous = process.cwd();
        process.chdir(dir);
        const lines: string[] = [];
        const log = console.log;
        console.log = (...parts: unknown[]) => { lines.push(parts.join(' ')); };
        try {
            const done = architectJupyterCommand({ env });
            while (!lines.some(line => line.includes('Ctrl-C'))) await new Promise(r => setTimeout(r, 50));
            const { pid, token } = pidFile();
            expect(lines.join('\n')).toMatch(new RegExp(`http://127\\.0\\.0\\.1:\\d+/lab\\?token=${token}`));
            expect(alive(pid)).toBe(true);
            process.emit('SIGTERM');
            expect(await done).toBe(0);
            expect(alive(pid)).toBe(false);
        } finally { console.log = log; process.chdir(previous); }
    });

    it('exits 1 with the install hint when Jupyter is missing', async () => {
        const errors: string[] = [];
        const error = console.error;
        console.error = (...parts: unknown[]) => { errors.push(parts.join(' ')); };
        try {
            expect(await architectJupyterCommand({ env: { ...env, MEMO_JUPYTER_BIN: join(dir, 'nope') } })).toBe(1);
            expect(errors.join('\n')).toContain('pip install jupyterlab');
        } finally { console.error = error; }
    });
});

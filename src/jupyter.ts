// ─── Architect-owned JupyterLab ──────────────────────────────────────────────
//
// The Analysis view needs a live JupyterLab. Architect starts one the first
// time the view asks, and stops it when the session ends, so nobody types
// `jupyter lab`. Three rules shape this file:
//
//   - A server Architect did not start is never stopped. One already serving
//     this project's `analysis` folder is reused and marked not-owned.
//   - Nothing is hard-coded: the port is whatever was free, the token is
//     random, and the executable is found on PATH (MEMO_JUPYTER_BIN overrides).
//   - Missing Jupyter is a state with a message, never a thrown stack.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn, spawnSync, execFile, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { delimiter, join } from 'node:path';

export type JupyterStatus =
    | { state: 'ready'; url: string; token: string; owned: boolean }
    | { state: 'not-installed'; message: string }
    | { state: 'failed'; message: string };

export const JUPYTER_BIN_ENV = 'MEMO_JUPYTER_BIN';

/** Shown in the UI and the CLI whenever Jupyter cannot be run. */
export function notInstalledMessage(detail: string): string {
    return `${detail} Install it with \`pip install jupyterlab\`. If it is installed but not found `
        + `(for example \`pip install --user\` puts it in a directory that is not on PATH), add that `
        + `directory to PATH or set ${JUPYTER_BIN_ENV} to the \`jupyter\` executable.`;
}

/** The `jupyter` executable: the override, else the first match on PATH (honouring PATHEXT on Windows). */
export function findJupyter(
    env: NodeJS.ProcessEnv = process.env,
    platform: NodeJS.Platform = process.platform,
): string | undefined {
    const override = env[JUPYTER_BIN_ENV];
    if (override) return existsSync(override) ? override : undefined;
    const windows = platform === 'win32';
    const extensions = windows
        ? ['', ...(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)]
        : [''];
    for (const directory of (env.PATH ?? env.Path ?? '').split(windows ? ';' : delimiter).filter(Boolean)) {
        for (const extension of extensions) {
            const candidate = join(directory, `jupyter${extension}`);
            try {
                if (statSync(candidate).isFile()) return candidate;
            } catch { /* not here */ }
        }
    }
    return undefined;
}

function freePort(): Promise<number> {
    return new Promise((resolvePort, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address() as { port: number };
            probe.close(() => resolvePort(port));
        });
    });
}

function run(bin: string, args: string[], env: NodeJS.ProcessEnv): Promise<{ ok: boolean; stdout: string; missing: boolean }> {
    return new Promise(resolveRun => {
        execFile(bin, args, { env, timeout: 30_000, windowsHide: true }, (error, stdout) => {
            resolveRun({
                ok: !error,
                stdout: String(stdout ?? ''),
                missing: (error as NodeJS.ErrnoException | null)?.code === 'ENOENT',
            });
        });
    });
}

function sameDirectory(a: string, b: string): boolean {
    const real = (path: string) => { try { return realpathSync(path); } catch { return path; } };
    return real(a) === real(b);
}

export interface JupyterManagerOptions {
    /** The folder Jupyter serves; created when missing. */
    root: string;
    /** Browser origins allowed to call the server's API (the Architect page). Empty for a standalone server. */
    appOrigins?: string[];
    env?: NodeJS.ProcessEnv;
    /** A fixed port instead of a free one (the standalone command's `--port`). */
    port?: number;
    startupTimeoutMs?: number;
    /** Lines of server output, for the standalone command. */
    onOutput?: (line: string) => void;
}

export class JupyterManager {
    private child: ChildProcess | undefined;
    private pending: Promise<JupyterStatus> | undefined;
    private current: JupyterStatus | undefined;
    private readonly tail: string[] = [];
    private readonly env: NodeJS.ProcessEnv;

    constructor(private readonly options: JupyterManagerOptions) {
        this.env = options.env ?? process.env;
    }

    /** What the last `start` concluded, without starting anything. */
    status(): JupyterStatus | undefined { return this.current; }

    /** Start Jupyter, or return the one already running. Concurrent callers share one start. */
    start(): Promise<JupyterStatus> {
        if (this.current?.state === 'ready' && (this.current.owned ? this.child?.exitCode === null : true)) {
            return Promise.resolve(this.current);
        }
        this.pending ??= this.launch().then(
            status => { this.current = status; this.pending = undefined; return status; },
            error => {
                this.pending = undefined;
                const status: JupyterStatus = { state: 'failed', message: String(error?.message ?? error) };
                this.current = status;
                return status;
            },
        );
        return this.pending;
    }

    private async launch(): Promise<JupyterStatus> {
        const bin = findJupyter(this.env);
        if (!bin) return { state: 'not-installed', message: notInstalledMessage('JupyterLab was not found.') };
        // `jupyter` can exist without `jupyter-lab`, so ask for the part we run.
        const lab = await run(bin, ['lab', '--version'], this.env);
        if (!lab.ok) {
            return {
                state: 'not-installed',
                message: notInstalledMessage(lab.missing ? `${bin} could not be run.` : `${bin} is present but JupyterLab is not installed.`),
            };
        }
        mkdirSync(this.options.root, { recursive: true });

        const existing = await this.runningForProject(bin);
        if (existing) return existing;

        const port = this.options.port ?? await freePort();
        const token = randomBytes(24).toString('hex');
        const args = [
            'lab', '--no-browser', '--ip=127.0.0.1', `--port=${port}`, '--ServerApp.port_retries=0',
            `--ServerApp.root_dir=${this.options.root}`,
        ];
        const origins = this.options.appOrigins ?? [];
        if (origins.length > 0) {
            const escaped = origins.map(origin => origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            args.push(`--ServerApp.allow_origin_pat=^(${escaped.join('|')})$`);
        }
        const child = spawn(bin, args, {
            cwd: this.options.root,
            // The token travels in the environment, not argv, so `ps` does not show it.
            env: { ...this.env, JUPYTER_TOKEN: token },
            // stdin closed: on a TTY Jupyter answers SIGINT with a "shutdown?" prompt instead of exiting.
            stdio: ['ignore', 'pipe', 'pipe'],
            // Own process group on POSIX, so stopping takes the kernels with it. Not on Windows,
            // where it opens a console window.
            detached: process.platform !== 'win32',
            windowsHide: true,
        });
        this.child = child;
        const remember = (chunk: Buffer) => {
            for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
                this.tail.push(line);
                if (this.tail.length > 20) this.tail.shift();
                this.options.onOutput?.(line);
            }
        };
        child.stdout?.on('data', remember);
        child.stderr?.on('data', remember);
        const exited = new Promise<'exit'>(resolveExit => child.once('exit', () => resolveExit('exit')));
        const spawnError = new Promise<Error>(resolveError => child.once('error', resolveError));

        const url = `http://127.0.0.1:${port}`;
        const deadline = Date.now() + (this.options.startupTimeoutMs ?? 60_000);
        while (Date.now() < deadline) {
            const outcome = await Promise.race([
                this.responds(url, token).then((up): 'up' | 'wait' => (up ? 'up' : 'wait')),
                exited, spawnError,
            ]);
            if (outcome === 'up') return { state: 'ready', url, token, owned: true };
            if (outcome === 'exit' || outcome instanceof Error) {
                this.child = undefined;
                const why = outcome instanceof Error ? outcome.message : this.tail.slice(-5).join('\n');
                return { state: 'failed', message: `JupyterLab exited while starting.${why ? `\n${why}` : ''}` };
            }
            await new Promise(r => setTimeout(r, 200));
        }
        await this.stop();
        return { state: 'failed', message: `JupyterLab did not answer within the startup time.\n${this.tail.slice(-5).join('\n')}` };
    }

    private async responds(url: string, token: string): Promise<boolean> {
        try {
            const response = await fetch(`${url}/api/status`, {
                headers: { Authorization: `token ${token}` }, signal: AbortSignal.timeout(2000),
            });
            return response.ok;
        } catch { return false; }
    }

    /** A server somebody else started that already serves this folder. */
    private async runningForProject(bin: string): Promise<JupyterStatus | undefined> {
        const listed = await run(bin, ['server', 'list', '--json'], this.env);
        if (!listed.ok) return undefined;
        for (const line of listed.stdout.split(/\r?\n/)) {
            try {
                const info = JSON.parse(line) as { url?: string; token?: string; root_dir?: string };
                if (info.url && info.root_dir && sameDirectory(info.root_dir, this.options.root)
                    && await this.responds(info.url.replace(/\/$/, ''), info.token ?? '')) {
                    return { state: 'ready', url: info.url.replace(/\/$/, ''), token: info.token ?? '', owned: false };
                }
            } catch { /* not a JSON line */ }
        }
        return undefined;
    }

    /** Stop the server this manager started. A reused server is left alone. */
    async stop(): Promise<void> {
        const child = this.child;
        this.child = undefined;
        if (this.current?.state === 'ready' && this.current.owned) this.current = undefined;
        if (!child || child.exitCode !== null || child.pid === undefined) return;
        const gone = new Promise<void>(resolveGone => child.once('exit', () => resolveGone()));
        this.signal(child.pid, false);
        const timedOut = await Promise.race([gone.then(() => false), new Promise<boolean>(r => setTimeout(() => r(true), 5000))]);
        if (timedOut) { this.signal(child.pid, true); await gone; }
    }

    /** Last-resort kill for a synchronous `exit` handler, where nothing can be awaited. */
    stopSync(): void {
        const child = this.child;
        this.child = undefined;
        if (child && child.exitCode === null && child.pid !== undefined) this.signal(child.pid, true);
    }

    private signal(pid: number, force: boolean): void {
        try {
            if (process.platform === 'win32') {
                spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
            } else {
                process.kill(-pid, force ? 'SIGKILL' : 'SIGTERM');
            }
        } catch { /* already gone */ }
    }
}

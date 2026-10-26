import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { startProjectServer, type PinnedInfo } from '@memoarchitect/tools';
import { injectFeatureGrants, type FeatureGrants } from '../feature-grants.js';
import { JupyterManager } from '../jupyter.js';
import {
    injectJupyterControl, JUPYTER_CONTROL_ENV, startJupyterControl, type JupyterControlInfo,
} from '../jupyter-control.js';

const execFileAsync = promisify(execFile);

type ProjectProcessRunner = (
    file: string,
    args: string[],
) => Promise<{ stdout: string; stderr: string }>;

const runProjectProcess: ProjectProcessRunner = (file, args) => execFileAsync(file, args);

export interface RunningArchitect {
    pid: number;
    command: string;
}

/**
 * Best-effort duplicate detection. A dev server has a supervisor and a runtime
 * child, so callers treat this as an advisory rather than a process count.
 */
export async function runningArchitectsForProject(
    projectDir: string,
    run: ProjectProcessRunner = runProjectProcess,
): Promise<RunningArchitect[]> {
    try {
        const { stdout } = await run('ps', ['-axo', 'pid=,command=']);
        const candidates = stdout.split('\n').flatMap(line => {
            const match = line.trim().match(/^(\d+)\s+(.+)$/);
            return match && /(?:^|\/)memo-architect(?:\.js)?\s+dev\b/.test(match[2])
                && Number(match[1]) !== process.pid
                ? [{ pid: Number(match[1]), command: match[2] }]
                : [];
        });
        const matching = await Promise.all(candidates.map(async candidate => {
            try {
                const { stdout } = await run('lsof', ['-a', '-p', String(candidate.pid), '-d', 'cwd', '-Fn']);
                const cwd = stdout.split('\n').find(line => line.startsWith('n'))?.slice(1);
                return cwd === projectDir ? candidate : undefined;
            } catch {
                return undefined;
            }
        }));
        return matching.filter((candidate): candidate is RunningArchitect => candidate !== undefined);
    } catch {
        return [];
    }
}

function architectPackageRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

function clientRoot(): string {
    const root = architectPackageRoot();
    const sourceRoot = resolve(root, 'packages', 'web');
    return existsSync(resolve(sourceRoot, 'index.html')) ? sourceRoot : root;
}

export interface ArchitectDevOptions {
    port?: number; open?: boolean; featureGrants?: FeatureGrants; keepAlive?: boolean;
    /** Parsed `--toolchain.*` options, passed straight through to MEMO Tools. */
    toolchainOptions?: Record<string, unknown>;
    /** The same flags as argv, so the supervised child runs the same toolchain. */
    toolchainArgv?: string[];
    /**
     * Serve a pinned release or ref, read-only. `dir` is the checked-out or assembled directory,
     * made by MEMO Tools (`pinnedTarget`); `preferencesRoot` is the working project, where the
     * person's role and workspace live. A pinned server is never supervised: it has no watcher to
     * ask for a relaunch, and a parent that opened it owns its life.
     */
    pinned?: { dir: string; info: PinnedInfo; preferencesRoot: string };
}

/**
 * The argv the supervised child is launched with.
 *
 * The child, not this process, serves the client shell and holds the model
 * runtime — so anything the session was started with has to be restated here
 * or it is silently lost. That has bitten grants (the browser lost every
 * experimental surface) and would bite the toolchain the same way, which is
 * why this is one reviewable function rather than a line in a loop.
 */
export function supervisedChildArgs(
    entry: string,
    options: ArchitectDevOptions,
    firstStart: boolean,
): string[] {
    const args = [entry, 'dev', '--port', String(options.port ?? 3000)];
    if (!firstStart || options.open === false) args.push('--no-open');
    if (options.keepAlive) args.push('--keep-alive');
    if (options.featureGrants?.experimental === true) args.push('--experimental');
    args.push(...(options.toolchainArgv ?? []));
    return args;
}

/**
 * The client HTML rewrite: Architect's feature grants, and the Jupyter control
 * endpoint when the supervisor passed one down. Both are spliced in before the
 * bundle so the first paint already knows them.
 */
function clientHtmlTransform(options: ArchitectDevOptions): ((html: string) => string) | undefined {
    let control: JupyterControlInfo | undefined;
    try {
        control = process.env[JUPYTER_CONTROL_ENV]
            ? JSON.parse(process.env[JUPYTER_CONTROL_ENV]!) as JupyterControlInfo : undefined;
    } catch { /* a malformed value means no Jupyter control, not a failed start */ }
    if (!options.featureGrants && !control) return undefined;
    return html => {
        const granted = options.featureGrants ? injectFeatureGrants(html, options.featureGrants) : html;
        return control ? injectJupyterControl(granted, control) : granted;
    };
}

export async function architectDevCommand(options: ArchitectDevOptions): Promise<void> {
    if (options.pinned) {
        process.chdir(options.pinned.dir);
        await startProjectServer({
            port: options.port,
            open: options.open,
            clientRoot: clientRoot(),
            exitWhenIdle: !options.keepAlive,
            toolchainOptions: options.toolchainOptions,
            readOnly: true,
            pinned: options.pinned.info,
            preferencesRoot: options.pinned.preferencesRoot,
            transformClientHtml: options.featureGrants
                ? html => injectFeatureGrants(html, options.featureGrants!)
                : undefined,
        });
        return;
    }
    if (process.env.MEMO_ARCHITECT_RUNTIME_CHILD !== '1') {
        const port = options.port ?? 3000;
        const existing = await runningArchitectsForProject(process.cwd());
        if (existing.length > 0) {
            const pids = existing.map(({ pid }) => pid).join(', ');
            process.stderr.write(
                `⚠ MEMO Architect is already running for this project (PID${existing.length === 1 ? '' : 's'} ${pids}). `
                + `Starting another server on http://127.0.0.1:${port}.\n`,
            );
        }
        // The supervisor owns the session's life, so it owns Jupyter: a relaunch of the runtime
        // child (exit 75) must not restart it, and every way out of this function stops it.
        const appOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
        const jupyter = new JupyterManager({ root: resolve(process.cwd(), 'analysis'), appOrigins });
        const jupyterControl = await startJupyterControl(jupyter, appOrigins);
        process.once('exit', () => jupyter.stopSync());
        let stopping = false;
        let firstStart = true;
        let restartStartedAt: number | undefined;
        let child: ReturnType<typeof spawn> | undefined;
        const stop = () => {
            // A second signal means "now": the default action would skip the exit handler and
            // leave Jupyter, which has its own process group, running.
            if (stopping) { jupyter.stopSync(); process.exit(1); }
            stopping = true;
            child?.kill('SIGTERM');
        };
        process.on('SIGINT', stop);
        process.on('SIGTERM', stop);

        try {
            while (!stopping) {
                const args = supervisedChildArgs(process.argv[1], { ...options, port }, firstStart);
                child = spawn(process.execPath, args, {
                    cwd: process.cwd(), stdio: 'inherit',
                    env: {
                        ...process.env,
                        MEMO_ARCHITECT_RUNTIME_CHILD: '1',
                        [JUPYTER_CONTROL_ENV]: JSON.stringify({ url: jupyterControl.url, token: jupyterControl.token }),
                        ...(restartStartedAt ? { MEMO_RUNTIME_RESTART_STARTED_AT: String(restartStartedAt) } : {}),
                    },
                });
                firstStart = false;
                const [code] = await once(child, 'exit') as [number | null];
                child = undefined;
                if (stopping || code !== 75) {
                    if (code && code !== 0) process.exitCode = code;
                    break;
                }
                restartStartedAt = Date.now();
                process.stderr.write('  Reusable semantics changed; relaunching model runtime...\n');
            }
        } finally {
            await jupyter.stop();
            await jupyterControl.close();
        }
        return;
    }

    await startProjectServer({
        port: options.port,
        open: options.open,
        clientRoot: clientRoot(),
        exitWhenIdle: !options.keepAlive,
        supervisedRuntime: true,
        toolchainOptions: options.toolchainOptions,
        // A pinned view is another `dev` of this same program, so it looks like this one.
        versionChild: {
            entry: process.argv[1],
            args: [...(options.toolchainArgv ?? []), ...(options.featureGrants?.experimental === true ? ['--experimental'] : [])],
        },
        // Tools serves the shell; Architect decides what goes into it.
        transformClientHtml: clientHtmlTransform(options),
    });
}

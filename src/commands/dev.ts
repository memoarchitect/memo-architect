import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startProjectServer } from '@memoarchitect/tools';
import { injectFeatureGrants, type FeatureGrants } from '../feature-grants.js';

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

export async function architectDevCommand(options: ArchitectDevOptions): Promise<void> {
    if (process.env.MEMO_ARCHITECT_RUNTIME_CHILD !== '1') {
        const port = options.port ?? 3000;
        let stopping = false;
        let firstStart = true;
        let restartStartedAt: number | undefined;
        let child: ReturnType<typeof spawn> | undefined;
        const stop = () => { stopping = true; child?.kill('SIGTERM'); };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);

        while (!stopping) {
            const args = supervisedChildArgs(process.argv[1], { ...options, port }, firstStart);
            child = spawn(process.execPath, args, {
                cwd: process.cwd(), stdio: 'inherit',
                env: {
                    ...process.env,
                    MEMO_ARCHITECT_RUNTIME_CHILD: '1',
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
        return;
    }

    await startProjectServer({
        port: options.port,
        open: options.open,
        clientRoot: clientRoot(),
        exitWhenIdle: !options.keepAlive,
        supervisedRuntime: true,
        toolchainOptions: options.toolchainOptions,
        // Tools serves the shell; Architect decides what goes into it.
        transformClientHtml: options.featureGrants
            ? html => injectFeatureGrants(html, options.featureGrants!)
            : undefined,
    });
}

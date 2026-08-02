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

export async function architectDevCommand(options: {
    port?: number; open?: boolean; featureGrants?: FeatureGrants; keepAlive?: boolean;
}): Promise<void> {
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
            const args = [process.argv[1], 'dev', '--port', String(port)];
            if (!firstStart || options.open === false) args.push('--no-open');
            if (options.keepAlive) args.push('--keep-alive');
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
        // Tools serves the shell; Architect decides what goes into it.
        transformClientHtml: options.featureGrants
            ? html => injectFeatureGrants(html, options.featureGrants!)
            : undefined,
    });
}

import { resolve } from 'node:path';
import { JupyterManager } from '../jupyter.js';

export interface ArchitectJupyterOptions {
    port?: number;
    env?: NodeJS.ProcessEnv;
}

/**
 * `memo-architect jupyter`: only JupyterLab, for the project in the current
 * directory. It runs in the foreground, prints where it is, and stops Jupyter
 * when the process is interrupted or terminated. Resolves to the exit code.
 */
export async function architectJupyterCommand(options: ArchitectJupyterOptions = {}): Promise<number> {
    const root = resolve(process.cwd(), 'analysis');
    const manager = new JupyterManager({ root, port: options.port, env: options.env });
    process.once('exit', () => manager.stopSync());
    const status = await manager.start();
    if (status.state !== 'ready') {
        console.error(`\n❌ ${status.message}\n`);
        return 1;
    }
    const link = `${status.url}/lab?token=${status.token}`;
    if (!status.owned) {
        console.log(`\n  JupyterLab is already running for this project (not started by Architect, so it is left running):\n  ➜ ${link}\n`);
        return 0;
    }
    console.log(`\n  JupyterLab serving ${root}\n  ➜ ${link}\n  Press Ctrl-C to stop it.\n`);
    await new Promise<void>(resolveStop => {
        for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => resolveStop());
    });
    await manager.stop();
    return 0;
}

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProjectServer } from '@memoarchitect/tools';

function architectPackageRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

function clientRoot(): string {
    const root = architectPackageRoot();
    const sourceRoot = resolve(root, 'packages', 'web');
    return existsSync(resolve(sourceRoot, 'index.html')) ? sourceRoot : root;
}

export async function architectDevCommand(options: { port?: number; open?: boolean }): Promise<void> {
    // Ctrl+C has to stop the server. This command drives startProjectServer
    // directly rather than going through the Tools dev command, so it does not
    // inherit that command's signal handling and has to register its own —
    // without this the process ignores SIGINT and only a kill will end it.
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(signal, () => {
            process.exit(0);
        });
    }

    await startProjectServer({
        port: options.port,
        open: options.open,
        clientRoot: clientRoot(),
    });
}

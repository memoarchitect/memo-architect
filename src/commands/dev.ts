import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    await startProjectServer({
        port: options.port,
        open: options.open,
        clientRoot: clientRoot(),
        exitWhenIdle: !options.keepAlive,
        // Tools serves the shell; Architect decides what goes into it.
        transformClientHtml: options.featureGrants
            ? html => injectFeatureGrants(html, options.featureGrants!)
            : undefined,
    });
}

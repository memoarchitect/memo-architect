import {
    cpSync,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProjectSnapshot, serializeForInlineScript } from '@memoarchitect/tools';
import { injectFeatureGrants, type FeatureGrants } from '../feature-grants.js';

function architectPackageRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

export async function architectBuildCommand(options: {
    output?: string;
    standalone?: boolean;
    /** Baked into the viewer, so a distributed build keeps the grants it was built with. */
    featureGrants?: FeatureGrants;
}): Promise<void> {
    const snapshot = await buildProjectSnapshot();
    // Two distributions, because one file and many files are different builds,
    // not the same build post-processed: see packages/web/vite.standalone.config.ts.
    const sourceDist = resolve(architectPackageRoot(), options.standalone ? 'dist-standalone' : 'dist');
    if (!existsSync(resolve(sourceDist, 'index.html'))) {
        throw new Error(options.standalone
            ? 'Standalone Architect distribution is missing. Reinstall @memoarchitect/architect or run `pnpm run build:client:standalone`.'
            : 'Architect distribution is missing. Reinstall @memoarchitect/architect or run its build.');
    }

    const outputDir = resolve(snapshot.projectRoot, options.output || 'dist');
    if (outputDir === sourceDist) {
        throw new Error('Output directory cannot overwrite the installed Architect distribution.');
    }
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    // The standalone distribution is the single HTML file and nothing beside
    // it; copying the directory would be copying that one file.
    if (!options.standalone) cpSync(sourceDist, outputDir, { recursive: true });

    const indexPath = resolve(outputDir, 'index.html');
    let html = readFileSync(resolve(sourceDist, 'index.html'), 'utf-8');
    const payload = serializeForInlineScript({
        model: snapshot.model,
        validation: snapshot.validation,
        completeness: snapshot.completeness,
    });
    // Replacer function, not a replacement string: model text containing `$&`
    // or ``$` `` would otherwise be read as a substitution pattern and splice
    // the document into the payload.
    html = html.replace('</head>', () => `<script>window.__MEMO_DATA__=${payload};</script>\n</head>`);
    if (options.featureGrants) html = injectFeatureGrants(html, options.featureGrants);
    writeFileSync(indexPath, html);

    process.stdout.write(`Architect viewer built at ${indexPath}\n`);
}

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
import { buildProjectSnapshot, serializeForInlineScript } from '@memo/tools';

function architectPackageRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

function inlineEntryAssets(html: string, outputDir: string): string {
    html = html.replace(
        /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/g,
        (match, href: string) => {
            const path = resolve(outputDir, href.replace(/^\//, ''));
            return existsSync(path) ? `<style>${readFileSync(path, 'utf-8')}</style>` : match;
        },
    );
    html = html.replace(
        /<script[^>]+src="([^"]+)"[^>]*><\/script>/g,
        (match, src: string) => {
            const path = resolve(outputDir, src.replace(/^\//, ''));
            return existsSync(path) ? `<script type="module">${readFileSync(path, 'utf-8')}</script>` : match;
        },
    );
    return html;
}

export async function architectBuildCommand(options: {
    output?: string;
    standalone?: boolean;
}): Promise<void> {
    const snapshot = await buildProjectSnapshot();
    const sourceDist = resolve(architectPackageRoot(), 'dist');
    if (!existsSync(resolve(sourceDist, 'index.html'))) {
        throw new Error('Architect distribution is missing. Reinstall @memo/architect or run its build.');
    }

    const outputDir = resolve(snapshot.projectRoot, options.output || 'dist');
    if (outputDir === sourceDist) {
        throw new Error('Output directory cannot overwrite the installed Architect distribution.');
    }
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    cpSync(sourceDist, outputDir, { recursive: true });

    const indexPath = resolve(outputDir, 'index.html');
    let html = readFileSync(indexPath, 'utf-8');
    const payload = serializeForInlineScript({
        model: snapshot.model,
        validation: snapshot.validation,
        completeness: snapshot.completeness,
    });
    html = html.replace('</head>', `<script>window.__MEMO_DATA__=${payload};</script>\n</head>`);
    if (options.standalone) html = inlineEntryAssets(html, outputDir);
    writeFileSync(indexPath, html);

    process.stdout.write(`Architect viewer built at ${indexPath}\n`);
}

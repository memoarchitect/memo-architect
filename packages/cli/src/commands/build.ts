// ─── memo build ──────────────────────────────────────────────────────────────
//
// Builds a self-contained static HTML site with the model diagram.
//   1. Load config → parse .sysml → build model → validate
//   2. Build the web app via Vite
//   3. Inject model data as window.__MEMO_DATA__ into the HTML
//
// Output: a single-page app that works offline without a dev server.
// ─────────────────────────────────────────────────────────────────────────────

import { resolve, dirname } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import chalk from 'chalk';
import { findConfigFile, parseFiles, buildMemoModel, modelToDTO } from '@memo/core';
import { evaluateClosureRules } from '@memo/core';
import { computeCompleteness } from '@memo/core';
import type { ViewpointDTO, CosmaLayerDTO } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';

function findSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.memo') {
                files.push(...findSysmlFiles(full));
            } else if (entry.name.endsWith('.sysml')) {
                files.push(full);
            }
        }
    } catch {
        // skip
    }
    return files;
}

export async function buildCommand(options: {
    output?: string;
    singleFile?: boolean;
}): Promise<void> {
    const cwd = process.cwd();
    const outputDir = resolve(cwd, options.output || 'dist');

    console.log(chalk.bold('\n📦 MEMO Build\n'));

    // 1. Find and load config
    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('❌ No memo.config.yaml found. Run `memo init` first.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);
    console.log(chalk.gray(`  Project: ${config.projectName}`));

    // 2. Parse + build model
    console.log(chalk.gray('  Building model...'));
    const sysmlFiles = findSysmlFiles(cwd);
    const { documents, errors } = await parseFiles(sysmlFiles, cwd + '/');
    const model = buildMemoModel(documents, config, errors);
    const validation = evaluateClosureRules(model, config);
    const completeness = computeCompleteness(model, validation, config);

    const viewpoints: ViewpointDTO[] | undefined = config.viewpoints?.map(vp => ({
        id: vp.id,
        label: vp.label,
        visibleKinds: vp.visibleKinds,
        visibleRelationships: vp.visibleRelationships,
        visibleLayers: vp.visibleLayers,
    }));

    const cosmaLayers: CosmaLayerDTO[] | undefined = config.cosmaLayers?.map(cl => ({
        id: cl.id,
        label: cl.label,
        color: cl.color,
    }));

    const dto = modelToDTO(model, { viewpoints, cosmaLayers });

    console.log(chalk.cyan(
        `  ${model.elements.size} elements, ${model.relationships.length} relationships, ` +
        `${validation.violations.length} violations, ${completeness.overall}% complete`
    ));

    // 3. Build embedded data script
    const embeddedData = {
        model: dto,
        validation,
        completeness,
    };
    const dataScript = `<script>window.__MEMO_DATA__=${JSON.stringify(embeddedData)};</script>`;

    // 4. Find pre-built web app or build it
    const webDistPath = resolveWebDist(cwd);
    if (!webDistPath) {
        console.error(chalk.red('❌ Could not find @memo/web dist. Run `pnpm run build` first.'));
        process.exit(1);
    }

    // 5. Copy web dist to output and inject data
    mkdirSync(outputDir, { recursive: true });
    cpSync(webDistPath, outputDir, { recursive: true });

    const indexPath = resolve(outputDir, 'index.html');
    let html = readFileSync(indexPath, 'utf-8');

    // Inject data script before closing </head>
    html = html.replace('</head>', `${dataScript}\n</head>`);

    if (options.singleFile) {
        // Inline all CSS and JS into the HTML for a single file
        html = inlineAssets(html, outputDir);
    }

    writeFileSync(indexPath, html);

    if (options.singleFile) {
        // Remove asset files, keep only index.html
        const assetsDir = resolve(outputDir, 'assets');
        try {
            const { rmSync } = await import('node:fs');
            rmSync(assetsDir, { recursive: true, force: true });
        } catch {
            // ok
        }
    }

    console.log(chalk.green(`\n✅ Built to ${outputDir}`));
    console.log(chalk.gray(`   Open ${resolve(outputDir, 'index.html')} in a browser\n`));
}

function resolveWebDist(cwd: string): string | undefined {
    const tryPaths = [
        resolve(cwd, '../../packages/web/dist'),
        resolve(cwd, '../web/dist'),
        resolve(cwd, 'node_modules/@memo/web/dist'),
    ];

    for (const p of tryPaths) {
        try {
            const files = readdirSync(p);
            if (files.includes('index.html')) return p;
        } catch {
            // not found
        }
    }
    return undefined;
}

function inlineAssets(html: string, baseDir: string): string {
    // Inline CSS
    html = html.replace(
        /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*\/?>/g,
        (_match, href: string) => {
            try {
                const cssPath = resolve(baseDir, href.replace(/^\//, ''));
                const css = readFileSync(cssPath, 'utf-8');
                return `<style>${css}</style>`;
            } catch {
                return _match; // keep original if file not found
            }
        }
    );

    // Inline JS
    html = html.replace(
        /<script[^>]+src="([^"]+)"[^>]*><\/script>/g,
        (_match, src: string) => {
            try {
                const jsPath = resolve(baseDir, src.replace(/^\//, ''));
                const js = readFileSync(jsPath, 'utf-8');
                return `<script type="module">${js}</script>`;
            } catch {
                return _match;
            }
        }
    );

    return html;
}

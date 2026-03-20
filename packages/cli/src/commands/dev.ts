// ─── memo dev ────────────────────────────────────────────────────────────────
//
// Starts the development server:
//   1. Load config → parse .sysml → build model → validate
//   2. Start HTTP server (Vite middleware for web app + WebSocket)
//   3. Watch .sysml and .yaml files for changes → rebuild → broadcast
// ─────────────────────────────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { findConfigFile, parseFiles, buildMemoModel, modelToDTO } from '@memo/core';
import { validateModel } from '@memo/core';
import { computeCompleteness } from '@memo/core';
import type { ServerMessage, ViewpointDTO, CosmaLayerDTO, DiagramDTO, ModelMetadata } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';
import { createDevServer } from '../server/dev-server.js';
import { createFileWatcher } from '../server/file-watcher.js';

/** Gather git info for model metadata */
function getGitInfo(cwd: string): Partial<ModelMetadata> {
    const git = (cmd: string) => {
        try { return execSync(cmd, { cwd, encoding: 'utf8', timeout: 3000 }).trim(); }
        catch { return undefined; }
    };
    return {
        gitUser: git('git config user.name') || undefined,
        gitBranch: git('git rev-parse --abbrev-ref HEAD') || undefined,
        gitCommitShort: git('git rev-parse --short HEAD') || undefined,
    };
}

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

export async function devCommand(options: { port?: number; open?: boolean }): Promise<void> {
    const cwd = process.cwd();
    const port = options.port || 3000;
    const host = '127.0.0.1';

    console.log(chalk.bold('\n🚀 MEMO Dev Server\n'));

    // 1. Find and load config
    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('❌ No memo.config.yaml found. Run `memo init` first.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);
    const gitInfo = getGitInfo(cwd);
    let buildCount = 0;
    console.log(chalk.gray(`Project: ${config.projectName}`));

    // 2. Initial parse + build
    async function rebuild(): Promise<{
        messages: ServerMessage[];
    }> {
        buildCount++;
        const sysmlFiles = findSysmlFiles(cwd);
        const { documents, errors } = await parseFiles(sysmlFiles, cwd + '/');
        const model = buildMemoModel(documents, config, errors);
        const validation = validateModel(model, config);
        const completeness = computeCompleteness(model, validation, config);

        console.log(chalk.cyan(
            `  ${model.elements.size} elements, ${model.relationships.length} relationships, ` +
            `${validation.violations.length} violations, ${completeness.overall}% complete`
        ));

        // Map config viewpoints/cosmaLayers to DTOs
        const viewpoints: ViewpointDTO[] | undefined = config.viewpoints?.map(vp => ({
            id: vp.id,
            label: vp.label,
            visibleKinds: vp.visibleKinds,
            visibleRelationships: vp.visibleRelationships,
            visibleLayers: vp.visibleLayers,
            supportedDiagramTypes: vp.supportedDiagramTypes,
        }));

        // Collect all diagrams from viewpoints + Model Viewpoint auto-diagrams
        // Note: context/decomposition diagrams are now defined in viewpoint configs
        // (context-view, logical-view). Model Viewpoint only holds diagrams that
        // don't fit a specific viewpoint.
        const diagrams: DiagramDTO[] = [
            // Model Viewpoint — cross-cutting overview diagram
            {
                id: 'diag-model-overview', name: 'Full Model Overview', diagramType: 'bdd',
                viewpointId: '__model', auto: true,
                description: 'All model elements — unfiltered view across all layers',
            },
        ];
        // Add diagrams from config viewpoints
        if (config.viewpoints) {
            for (const vp of config.viewpoints) {
                if (vp.diagrams) {
                    for (const d of vp.diagrams) {
                        diagrams.push({
                            id: d.id,
                            name: d.name,
                            diagramType: d.diagramType,
                            viewpointId: d.viewpointId,
                            auto: d.auto,
                            description: d.description,
                            properties: d.properties,
                            elementIds: d.elementIds,
                            relationshipTypes: d.relationshipTypes,
                        });
                    }
                }
            }
        }

        const cosmaLayers: CosmaLayerDTO[] | undefined = config.cosmaLayers?.map(cl => ({
            id: cl.id,
            label: cl.label,
            color: cl.color,
        }));

        // Build metadata with version
        const baseVersion = config.ontologyMetadata?.version || '0.1.0';
        const metadata: ModelMetadata = {
            projectName: config.projectName,
            version: `${baseVersion}-dev.${buildCount}`,
            ...gitInfo,
        };

        const dto = modelToDTO(model, { viewpoints, cosmaLayers, diagrams });
        dto.metadata = metadata;

        return {
            messages: [
                { type: 'model:update', payload: dto },
                { type: 'validation:update', payload: validation },
                { type: 'completeness:update', payload: completeness },
            ],
        };
    }

    const sysmlCount = findSysmlFiles(cwd).length;
    if (sysmlCount === 0) {
        console.log(chalk.yellow('  ⚠ No .sysml files found in this directory.'));
        console.log(chalk.gray('  Create model files in a model/ subdirectory, or run:'));
        console.log(chalk.gray('    memo init <project-name>'));
        console.log(chalk.gray('    memo import template elements\n'));
    }
    console.log(chalk.gray('  Building model...'));
    const initial = await rebuild();

    // 3. Start dev server
    const server = await createDevServer({
        port,
        webPackagePath: resolveWebPackage(cwd),
        initialMessages: initial.messages,
    });

    console.log(chalk.green(`\n  ➜ http://${host}:${port}\n`));

    // 4. Watch for changes
    const watcher = createFileWatcher(cwd, async () => {
        console.log(chalk.gray(`  [${new Date().toLocaleTimeString()}] Rebuilding...`));
        const result = await rebuild();
        server.broadcast(result.messages);
    });

    // 5. Open browser
    if (options.open !== false) {
        const openModule = await import('open');
        openModule.default(`http://${host}:${port}`);
    }

    // Keep alive
    process.on('SIGINT', () => {
        console.log(chalk.gray('\n  Shutting down...'));
        watcher.close();
        server.close();
        process.exit(0);
    });
}

function resolveWebPackage(cwd: string): string {
    // Try workspace path first
    const tryPaths = [
        resolve(cwd, '../../packages/web'),    // from examples/infusion-pump
        resolve(cwd, '../web'),                 // from packages/cli
        resolve(cwd, 'node_modules/@memo/web'), // installed dependency
    ];

    for (const p of tryPaths) {
        try {
            readdirSync(p);
            return p;
        } catch {
            // not found
        }
    }

    return resolve(cwd, '../../packages/web');
}

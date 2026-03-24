// ─── memo ontology ──────────────────────────────────────────────────────────
//
// Commands:
//   memo ontology show        — Show resolved ontology in the terminal
//   memo ontology export owl  — Export ontology as OWL/RDF (Turtle)
//   memo ontology export xml  — Export ontology as OWL/RDF (XML)
//   memo ontology export sysand — Export ontology dependency stack as a SysAnd project
// ─────────────────────────────────────────────────────────────────────────────

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import chalk from 'chalk';
import type { MEMOConfig } from '@memo/core';
import { findConfigFile } from '@memo/core';
import { exportToOwlTurtle, exportToOwlXml } from '@memo/ontology-medical';
import { loadAndResolveConfig, loadConfigChain, type ConfigChainEntry } from '../server/config-resolver.js';

export async function ontologyShowCommand(): Promise<void> {
    const cwd = process.cwd();

    console.log(chalk.bold('\n\u25C9 MEMO Ontology\n'));

    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('\u274C No memo.config.yaml found.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);

    // Show metadata
    if (config.ontologyMetadata) {
        console.log(chalk.cyan('  ID:      ') + config.ontologyMetadata.id);
        console.log(chalk.cyan('  Version: ') + config.ontologyMetadata.version);
        console.log(chalk.cyan('  Desc:    ') + config.ontologyMetadata.description);
    }
    console.log(chalk.cyan('  Extends: ') + (config.extends || 'none'));
    console.log('');

    // Layers
    const layers = config.cosmaLayers || [];
    console.log(chalk.bold(`  Layers (${layers.length}):`));
    for (const l of layers) {
        console.log(`    ${chalk.hex(l.color)('\u25CF')} ${l.label} (${l.id})`);
    }
    console.log('');

    // Kinds by layer
    const kindEntries = Object.entries(config.kinds ?? {});
    console.log(chalk.bold(`  Kinds (${kindEntries.length}):`));
    const byLayer = new Map<string, string[]>();
    for (const [name, def] of kindEntries) {
        const layer = def.layer || 'unknown';
        if (!byLayer.has(layer)) byLayer.set(layer, []);
        byLayer.get(layer)!.push(name);
    }
    for (const l of layers) {
        const kinds = byLayer.get(l.id) || [];
        if (kinds.length > 0) {
            console.log(`    ${chalk.hex(l.color)(l.label)}: ${kinds.join(', ')}`);
        }
    }
    // Show any kinds not in a known layer
    for (const [layer, kinds] of byLayer) {
        if (!layers.find(l => l.id === layer)) {
            console.log(`    ${layer}: ${kinds.join(', ')}`);
        }
    }
    console.log('');

    // Relationships
    const relTypes = config.relationshipTypes ?? [];
    console.log(chalk.bold(`  Relationships (${relTypes.length}):`));
    console.log(`    ${relTypes.map(r => r.name).join(', ')}`);
    console.log('');

    // Closure rules
    console.log(chalk.bold(`  Closure Rules (${config.closureRules.length}):`));
    for (const rule of config.closureRules) {
        const icon = rule.severity === 'error' ? chalk.red('\u2716') : chalk.yellow('\u26A0');
        console.log(`    ${icon} ${rule.id}: ${rule.description}`);
    }
    console.log('');

    // Viewpoints
    const viewpoints = config.viewpoints || [];
    console.log(chalk.bold(`  Viewpoints (${viewpoints.length}):`));
    for (const vp of viewpoints) {
        console.log(`    ${vp.label} (${vp.visibleKinds.length} kinds, ${vp.visibleRelationships.length} rels)`);
    }
    console.log('');
}

export async function ontologyExportOwlCommand(options: {
    output?: string;
    format?: string;
    namespace?: string;
}): Promise<void> {
    const cwd = process.cwd();
    const format = options.format || 'turtle';

    console.log(chalk.bold(`\n\u{1F4E4} MEMO Ontology Export \u2192 OWL/${format.toUpperCase()}\n`));

    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('\u274C No memo.config.yaml found.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);
    const ns = options.namespace || 'https://sysand.dev/ontology/memo#';

    let content: string;
    let ext: string;

    if (format === 'xml' || format === 'rdfxml') {
        content = exportToOwlXml(config as any, ns);
        ext = '.owl';
    } else {
        content = exportToOwlTurtle(config as any, ns);
        ext = '.ttl';
    }

    const outputPath = resolve(cwd, options.output || `ontology${ext}`);
    writeFileSync(outputPath, content);

    const kindCount = Object.keys(config.kinds ?? {}).length;
    const relCount = (config.relationshipTypes ?? []).length;
    console.log(chalk.cyan(`  ${kindCount} kinds, ${relCount} relationships`));
    console.log(chalk.green(`\n\u2705 Exported to ${outputPath}\n`));
}

export async function ontologyExportSysandCommand(options: {
    output?: string;
}): Promise<void> {
    const cwd = process.cwd();

    console.log(chalk.bold('\n\u{1F4E6} MEMO Ontology Export \u2192 SysAnd Project\n'));

    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('\u274C No memo.config.yaml found.'));
        process.exit(1);
    }

    const configChain = loadConfigChain(configPath);
    const currentEntry = configChain[configChain.length - 1];
    const exportEntries = configChain.filter((entry, index) => {
        return index < configChain.length - 1 ||
            !!entry.config.ontologyMetadata ||
            entry.config.projectType === 'ontology' ||
            entry.config.projectType === 'profile';
    });

    if (exportEntries.length === 0) {
        console.error(chalk.red('\u274C No ontology/profile packages found in the current config chain.'));
        process.exit(1);
    }

    const bundleName = sanitizeName(
        currentEntry.config.ontologyMetadata?.id ||
        currentEntry.config.projectName ||
        'memo-ontology'
    );
    const outputDir = resolve(cwd, options.output || `${bundleName}_Project`);
    const packagesDir = resolve(outputDir, 'packages');

    mkdirSync(packagesDir, { recursive: true });

    const exportedPackages = exportEntries.map(entry => exportConfigPackage(entry, packagesDir));

    mkdirSync(resolve(outputDir, 'docs'), { recursive: true });
    writeFileSync(resolve(outputDir, '.project.json'), JSON.stringify(renderProjectJson(currentEntry.config, exportedPackages), null, 2));
    writeFileSync(resolve(outputDir, '.meta.json'), JSON.stringify(renderMetaJson(exportedPackages), null, 2));
    writeFileSync(resolve(outputDir, '.gitignore'), ['sysand_env/', 'output/'].join('\n') + '\n');
    writeFileSync(resolve(outputDir, 'README.md'), renderReadme(currentEntry.config, exportedPackages));
    writeFileSync(resolve(outputDir, 'sysand-lock.toml'), renderSysandLock(currentEntry.config, exportedPackages));
    const structureTree = buildTree(outputDir, outputDir);
    writeFileSync(resolve(outputDir, 'docs', 'model-structure.json'), JSON.stringify(structureTree, null, 2));
    writeFileSync(resolve(outputDir, 'docs', 'model-structure.md'), renderTreeMarkdown(structureTree));

    console.log(chalk.cyan(`  ${exportedPackages.length} packages exported`));
    for (const pkg of exportedPackages) {
        console.log(chalk.gray(`  - ${pkg.id || pkg.name} -> ${pkg.path}`));
    }
    console.log(chalk.green(`\n\u2705 Exported to ${outputDir}\n`));
}

interface ExportedPackage {
    id: string;
    name: string;
    version: string;
    projectType: string;
    path: string;
    extends?: string;
    files: string[];
    sources: ExportedSource[];
}

interface ExportedSource {
    path: string;
    symbols: string[];
}

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: TreeNode[];
}

function exportConfigPackage(entry: ConfigChainEntry, packagesDir: string): ExportedPackage {
    const sourceDir = dirname(entry.configPath);
    const name = sanitizeName(entry.config.ontologyMetadata?.id || basename(sourceDir));
    const targetDir = resolve(packagesDir, name);
    mkdirSync(targetDir, { recursive: true });

    const copied: string[] = [];
    const sources: ExportedSource[] = [];

    cpSync(entry.configPath, resolve(targetDir, basename(entry.configPath)));
    copied.push(basename(entry.configPath));

    for (const folderName of ['sysml', 'templates']) {
        const sourcePath = resolve(sourceDir, folderName);
        if (existsSync(sourcePath)) {
            cpSync(sourcePath, resolve(targetDir, folderName), { recursive: true });
            copied.push(`${folderName}/`);
            if (folderName === 'sysml') {
                sources.push(...collectSysmlSources(resolve(targetDir, folderName), dirname(packagesDir)));
            }
        }
    }

    return {
        id: entry.config.ontologyMetadata?.id || entry.config.projectName,
        name,
        version: entry.config.ontologyMetadata?.version || '0.0.0',
        projectType: entry.config.projectType,
        path: relative(dirname(packagesDir), targetDir),
        extends: entry.config.extends,
        files: copied,
        sources,
    };
}

function renderReadme(currentConfig: MEMOConfig, packages: ExportedPackage[]): string {
    const title = currentConfig.ontologyMetadata?.id || currentConfig.projectName;
    const lines = [
        `# ${title}`,
        '',
        'Generated by `memo ontology export sysand`.',
        '',
        'The export root is laid out as a SysAnd interchange project with `.project.json` and `.meta.json`.',
        '',
        '## Exported Packages',
        '',
    ];

    for (const pkg of packages) {
        lines.push(`- \`${pkg.id}\` (${pkg.version}) -> \`${pkg.path}\``);
    }

    lines.push('', '## Generated Structure', '', '- `.project.json` — SysAnd interchange project descriptor', '- `.meta.json` — SysAnd source index and checksums for exported `.sysml` files', '- `packages/` — exported ontology/profile packages', '- `docs/model-structure.md` — human-readable tree', '- `docs/model-structure.json` — machine-readable tree', '- `sysand-lock.toml` — generated package manifest for the bundled stack', '');
    return lines.join('\n');
}

function renderProjectJson(
    currentConfig: MEMOConfig,
    packages: ExportedPackage[],
): Record<string, unknown> {
    return {
        name: currentConfig.projectName,
        publisher: currentConfig.ontologyMetadata?.author || 'untitled',
        version: currentConfig.ontologyMetadata?.version || packages[packages.length - 1]?.version || '0.0.1',
        usage: [],
    };
}

function renderMetaJson(packages: ExportedPackage[]): Record<string, unknown> {
    const index: Record<string, string> = {};
    const checksum: Record<string, { value: string; algorithm: string }> = {};

    for (const pkg of packages) {
        for (const source of pkg.sources) {
            checksum[source.path] = {
                value: '',
                algorithm: 'NONE',
            };
            for (const symbol of source.symbols) {
                index[symbol] = source.path;
            }
        }
    }

    return {
        index,
        created: new Date().toISOString(),
        checksum,
    };
}

function renderSysandLock(currentConfig: MEMOConfig, packages: ExportedPackage[]): string {
    const lines = [
        'version = 1',
        `root_project = ${tomlString(currentConfig.projectName)}`,
        `generated_by = ${tomlString('memo ontology export sysand')}`,
        '',
    ];

    for (const pkg of packages) {
        lines.push('[[package]]');
        lines.push(`id = ${tomlString(pkg.id)}`);
        lines.push(`name = ${tomlString(pkg.name)}`);
        lines.push(`version = ${tomlString(pkg.version)}`);
        lines.push(`project_type = ${tomlString(pkg.projectType)}`);
        lines.push(`path = ${tomlString(pkg.path)}`);
        if (pkg.extends) {
            lines.push(`extends = ${tomlString(pkg.extends)}`);
        }
        if (pkg.files.length > 0) {
            lines.push(`files = [${pkg.files.map(file => tomlString(file)).join(', ')}]`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

function buildTree(dir: string, rootDir: string): TreeNode {
    const entries = readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.name !== '.DS_Store')
        .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

    const node: TreeNode = {
        name: basename(dir),
        path: relative(rootDir, dir) || '.',
        type: 'directory',
        children: [],
    };

    for (const entry of entries) {
        const fullPath = resolve(dir, entry.name);
        if (entry.isDirectory()) {
            node.children!.push(buildTree(fullPath, rootDir));
        } else {
            node.children!.push({
                name: entry.name,
                path: relative(rootDir, fullPath),
                type: 'file',
            });
        }
    }

    return node;
}

function collectSysmlSources(dir: string, rootDir: string): ExportedSource[] {
    const sources: ExportedSource[] = [];
    const entries = readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.name !== '.DS_Store')
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
        const fullPath = resolve(dir, entry.name);
        if (entry.isDirectory()) {
            sources.push(...collectSysmlSources(fullPath, rootDir));
            continue;
        }
        if (extname(entry.name) !== '.sysml') {
            continue;
        }

        sources.push({
            path: relative(rootDir, fullPath),
            symbols: parseDeclaredPackages(fullPath),
        });
    }

    return sources;
}

function parseDeclaredPackages(filePath: string): string[] {
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.matchAll(/^\s*(?:library\s+)?package\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm);
    return Array.from(new Set(Array.from(matches, match => match[1])));
}


function renderTreeMarkdown(tree: TreeNode): string {
    const lines = ['# Model Structure', '', '```text'];
    lines.push(tree.name);
    renderTreeLines(tree.children || [], '', lines);
    lines.push('```', '');
    return lines.join('\n');
}

function renderTreeLines(children: TreeNode[], prefix: string, lines: string[]): void {
    children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        lines.push(`${prefix}${branch}${child.name}`);
        if (child.type === 'directory' && child.children) {
            renderTreeLines(child.children, `${prefix}${isLast ? '    ' : '│   '}`, lines);
        }
    });
}

function sanitizeName(value: string): string {
    return value
        .replace(/^@/, '')
        .replace(/[\\/]/g, '-')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function tomlString(value: string): string {
    return JSON.stringify(value);
}

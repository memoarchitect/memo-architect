// ─── memo ontology ──────────────────────────────────────────────────────────
//
// Commands:
//   memo ontology show        — Show resolved ontology in the terminal
//   memo ontology export owl  — Export ontology as OWL/RDF (Turtle)
//   memo ontology export xml  — Export ontology as OWL/RDF (XML)
// ─────────────────────────────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import chalk from 'chalk';
import { findConfigFile } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';
import { exportToOwlTurtle, exportToOwlXml } from '@memo/ontology';

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
    const kindEntries = Object.entries(config.kinds);
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
    console.log(chalk.bold(`  Relationships (${config.relationshipTypes.length}):`));
    console.log(`    ${config.relationshipTypes.map(r => r.name).join(', ')}`);
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

    const kindCount = Object.keys(config.kinds).length;
    const relCount = config.relationshipTypes.length;
    console.log(chalk.cyan(`  ${kindCount} kinds, ${relCount} relationships`));
    console.log(chalk.green(`\n\u2705 Exported to ${outputPath}\n`));
}

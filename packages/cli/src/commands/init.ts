// ─── memo init ───────────────────────────────────────────────────────────────
//
// Scaffolds a new MEMO project with:
//   - memo.package.yaml (new format — identity + extends)
//   - model/ directory with a starter .sysml file
//   - memo.lock.yaml (ontology lock)
//
// Supports --ontology flag for ontology selection:
//   memo init my-device --ontology @memo/medical-modeling-profile  (default)
//   memo init my-device --ontology @memo/ontology-medical
//   memo init my-device --ontology @memo/ontology-core
//   memo init --list-ontologies                                    (list available)
// ─────────────────────────────────────────────────────────────────────────────

import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';
import { findConfigFile } from '@memo/core';
import { createLockFile } from '../lock.js';

const DEFAULT_ONTOLOGY = '@memo/medical-modeling-profile';

/** Metadata about an available ontology package */
export interface AvailableOntology {
    name: string;
    version: string;
    type: string;
    description: string;
    extends?: string;
    path: string;
}

/**
 * Discover ontology packages available in the workspace.
 * Scans packages/ directories upward for memo.package.yaml files
 * whose type is "ontology" or "profile".
 */
export function discoverOntologies(fromDir: string): AvailableOntology[] {
    const results: AvailableOntology[] = [];
    let dir = resolve(fromDir);

    // Walk up to find the monorepo root (has packages/ dir)
    while (true) {
        const packagesDir = resolve(dir, 'packages');
        if (existsSync(packagesDir)) {
            try {
                const entries = readdirSync(packagesDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (!entry.isDirectory()) continue;
                    const pkgYaml = resolve(packagesDir, entry.name, 'memo.package.yaml');
                    if (!existsSync(pkgYaml)) continue;

                    try {
                        const raw = readFileSync(pkgYaml, 'utf-8');
                        const parsed = parseYaml(raw);
                        const type = parsed?.type ?? '';
                        if (type === 'ontology' || type === 'profile') {
                            results.push({
                                name: parsed.name ?? entry.name,
                                version: parsed.version ?? '0.0.0',
                                type,
                                description: parsed.description ?? '',
                                extends: parsed.extends,
                                path: pkgYaml,
                            });
                        }
                    } catch {
                        // skip malformed files
                    }
                }
            } catch {
                // skip if packages dir is unreadable
            }
            if (results.length > 0) break;
        }

        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return results;
}

/**
 * List available ontologies to stdout.
 */
export function listOntologiesCommand(): void {
    const ontologies = discoverOntologies(process.cwd());

    if (ontologies.length === 0) {
        console.log(chalk.yellow('No ontology packages found in the workspace.'));
        return;
    }

    console.log(chalk.bold('\nAvailable ontology packages:\n'));
    for (const ont of ontologies) {
        const marker = ont.name === DEFAULT_ONTOLOGY ? chalk.green(' (default)') : '';
        console.log(`  ${chalk.cyan(ont.name)}${marker}`);
        console.log(`    ${chalk.gray(`v${ont.version} · ${ont.type}`)}`);
        if (ont.description) {
            console.log(`    ${chalk.gray(ont.description)}`);
        }
        if (ont.extends) {
            console.log(`    ${chalk.gray(`extends: ${ont.extends}`)}`);
        }
        console.log();
    }

    console.log(chalk.gray(`  Usage: memo init <name> --ontology <package-name>\n`));
}

export interface InitOptions {
    template: string;
    ontology: string;
    listOntologies?: boolean;
}

export async function initCommand(
    name: string | undefined,
    options: InitOptions
): Promise<void> {
    // Handle --list-ontologies
    if (options.listOntologies) {
        listOntologiesCommand();
        return;
    }

    if (!name) {
        console.error(chalk.red('❌ Project name is required. Usage: memo init <name>'));
        process.exit(1);
        return;
    }

    const projectDir = resolve(process.cwd(), name);
    // Use basename for project identity (handles absolute paths from tests)
    const projectName = projectDir.split('/').pop() ?? name;
    const ontology = options.ontology;

    if (existsSync(projectDir)) {
        console.error(chalk.red(`❌ Directory "${name}" already exists.`));
        process.exit(1);
    }

    // Validate that the selected ontology is available (if discoverable)
    const available = discoverOntologies(process.cwd());
    const selectedOnt = available.find(o => o.name === ontology);
    if (available.length > 0 && !selectedOnt) {
        console.error(chalk.red(`❌ Ontology "${ontology}" not found.\n`));
        console.log(chalk.gray('Available ontologies:'));
        for (const o of available) {
            console.log(chalk.gray(`  - ${o.name} (${o.type})`));
        }
        console.log();
        process.exit(1);
    }

    console.log(chalk.bold(`\n📦 Creating MEMO project: ${projectName}\n`));
    if (ontology !== DEFAULT_ONTOLOGY) {
        console.log(chalk.gray(`  Ontology: ${ontology}\n`));
    }

    // Create directory structure
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(resolve(projectDir, 'model'), { recursive: true });

    // Write memo.package.yaml (new format)
    const packageContent = `# ${projectName} — MEMO device model
name: "${projectName}"
version: "0.1.0"
type: device
extends: "${ontology}"
description: "MEMO device model project"
`;

    writeFileSync(resolve(projectDir, 'memo.package.yaml'), packageContent);
    console.log(chalk.gray(`  Created memo.package.yaml (extends ${ontology})`));

    // Determine the correct import package based on ontology selection
    const importPackage = resolveImportPackage(ontology, available);

    // Write starter .sysml file
    const sysmlContent = `// ${projectName} — SysML v2 Model
// Generated by \`memo init\`

package ${toIdentifier(projectName)} {
    import ${importPackage}::*;

    // ─── System Definition ──────────────────────────────────────────

    part ${toIdentifier(projectName)}System : System {
        attribute redefines name = "${projectName}";
    }

    // ─── Example Requirement ────────────────────────────────────────

    requirement mainRequirement : SystemRequirement {
        attribute redefines title = "Main system requirement";
        doc /* TODO: define your first system requirement */
    }

    // ─── Example Hazard ─────────────────────────────────────────────

    requirement exampleHazard : Hazard {
        attribute redefines title = "Example hazard";
        doc /* TODO: identify hazards per ISO 14971 */
    }
}
`;

    writeFileSync(resolve(projectDir, 'model', `${projectName}.sysml`), sysmlContent);
    console.log(chalk.gray(`  Created model/${projectName}.sysml`));

    // Create ontology lock file
    const configPath = findConfigFile(projectDir);
    if (configPath) {
        try {
            const { lock } = createLockFile(configPath);
            console.log(chalk.gray(`  Created memo.lock.yaml (locked to ${lock.ontology} v${lock.version})`));
        } catch (e) {
            console.log(chalk.yellow(`  ⚠ Could not create lock file: ${e instanceof Error ? e.message : e}`));
        }
    }

    console.log(chalk.green(`\n✅ Project created at ./${projectName}`));
    console.log(chalk.gray(`\n  Next steps:`));
    console.log(chalk.gray(`    cd ${projectName}`));
    console.log(chalk.gray(`    memo dev\n`));
}

/**
 * Resolve the SysML import package name based on the selected ontology.
 * Walks up the extends chain to find the topmost medical ontology.
 */
function resolveImportPackage(ontology: string, available: AvailableOntology[]): string {
    // If the ontology is medical-related, import MEMO_Ontology_Medical
    // If it's core-only, import MEMO_Ontology_Core
    const ont = available.find(o => o.name === ontology);
    if (!ont) return 'MEMO_Ontology_Medical'; // safe default

    // Walk extends chain to see what's in the ancestry
    const visited = new Set<string>();
    let current: AvailableOntology | undefined = ont;
    while (current && !visited.has(current.name)) {
        visited.add(current.name);
        if (current.name === '@memo/ontology-medical' || current.extends === '@memo/ontology-medical') {
            return 'MEMO_Ontology_Medical';
        }
        if (current.name === '@memo/ontology-core' && !current.extends) {
            return 'MEMO_Ontology_Core';
        }
        current = current.extends ? available.find(o => o.name === current!.extends) : undefined;
    }

    return 'MEMO_Ontology_Medical';
}

function toIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ─── memo init ───────────────────────────────────────────────────────────────
//
// Scaffolds a new MEMO project with:
//   - memo.package.yaml (new format — identity + extends + ontologies)
//   - model/ directory with a starter .sysml file
//   - memo.lock.yaml (ontology lock)
//
// Supports --ontology flag for ontology selection:
//   memo init my-device --ontology @memo/medical-modeling-profile  (default)
//   memo init my-device --ontology @memo/ontology-core
//   memo init --list-ontologies                                    (list available)
//
// Supports --profile flag for profile-based selection:
//   memo init my-device --profile minimal   (~53 kinds, core only)
//   memo init my-device --profile standard  (~120 kinds, core + risk + sw + dhf)
//   memo init my-device --profile full      (~200+ kinds, all extensions)
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
 * Scans packages/ and packages/ontology-extensions/ directories
 * upward for memo.package.yaml files whose type is "ontology" or "profile".
 */
export function discoverOntologies(fromDir: string): AvailableOntology[] {
    const results: AvailableOntology[] = [];
    let dir = resolve(fromDir);

    // Walk up to find the monorepo root (has packages/ dir)
    while (true) {
        const packagesDir = resolve(dir, 'packages');
        if (existsSync(packagesDir)) {
            // Scan packages/ (top-level ontology packages)
            scanOntologyDir(packagesDir, results);

            // Scan packages/ontology-extensions/ (modular extensions)
            const extDir = resolve(packagesDir, 'ontology-extensions');
            if (existsSync(extDir)) {
                scanOntologyDir(extDir, results);
            }

            if (results.length > 0) break;
        }

        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return results;
}

/** Scan a directory for ontology/profile packages with memo.package.yaml */
function scanOntologyDir(dir: string, results: AvailableOntology[]): void {
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const pkgYaml = resolve(dir, entry.name, 'memo.package.yaml');
            if (!existsSync(pkgYaml)) continue;

            try {
                const raw = readFileSync(pkgYaml, 'utf-8');
                const parsed = parseYaml(raw);
                const type = parsed?.type ?? '';
                if (type === 'ontology' || type === 'profile') {
                    // Don't add duplicates
                    const name = parsed.name ?? entry.name;
                    if (!results.find(r => r.name === name)) {
                        results.push({
                            name,
                            version: parsed.version ?? '0.0.0',
                            type,
                            description: parsed.description ?? '',
                            extends: parsed.extends,
                            path: pkgYaml,
                        });
                    }
                }
            } catch {
                // skip malformed files
            }
        }
    } catch {
        // skip if dir is unreadable
    }
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

/** A profile preset (minimal/standard/full) from medical-modeling-profile/profiles/ */
export interface ProfilePreset {
    name: string;
    description: string;
    extends: string;
    ontologies: string[];
}

/** Load a profile preset YAML from the profiles directory */
export function loadProfile(profileName: string, fromDir: string): ProfilePreset | undefined {
    let dir = resolve(fromDir);
    while (true) {
        const profilePath = resolve(dir, 'packages', 'medical-modeling-profile', 'profiles', `${profileName}.yaml`);
        if (existsSync(profilePath)) {
            try {
                const raw = readFileSync(profilePath, 'utf-8');
                const parsed = parseYaml(raw);
                return {
                    name: parsed.name ?? profileName,
                    description: parsed.description ?? '',
                    extends: parsed.extends ?? '@memo/ontology-core',
                    ontologies: parsed.ontologies ?? [],
                };
            } catch {
                return undefined;
            }
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return undefined;
}

/** List available profiles */
export function listProfiles(fromDir: string): ProfilePreset[] {
    let dir = resolve(fromDir);
    while (true) {
        const profilesDir = resolve(dir, 'packages', 'medical-modeling-profile', 'profiles');
        if (existsSync(profilesDir)) {
            try {
                const files = readdirSync(profilesDir).filter(f => f.endsWith('.yaml'));
                return files.map(f => {
                    const name = f.replace('.yaml', '');
                    return loadProfile(name, fromDir)!;
                }).filter(Boolean);
            } catch {
                return [];
            }
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return [];
}

export interface InitOptions {
    template: string;
    ontology: string;
    profile?: string;
    listOntologies?: boolean;
}

export async function initCommand(
    name: string | undefined,
    options: InitOptions
): Promise<void> {
    // Handle --list-ontologies
    if (options.listOntologies) {
        listOntologiesCommand();

        // Also show available profiles
        const profiles = listProfiles(process.cwd());
        if (profiles.length > 0) {
            console.log(chalk.bold('\nAvailable profiles:\n'));
            for (const p of profiles) {
                console.log(`  ${chalk.cyan(p.name)}`);
                console.log(`    ${chalk.gray(p.description)}`);
                if (p.ontologies.length > 0) {
                    console.log(`    ${chalk.gray(`Extensions: ${p.ontologies.length}`)}`);
                }
                console.log();
            }
            console.log(chalk.gray(`  Usage: memo init <name> --profile minimal|standard|full\n`));
        }
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

    if (existsSync(projectDir)) {
        console.error(chalk.red(`❌ Directory "${name}" already exists.`));
        process.exit(1);
    }

    // Resolve profile or ontology
    let ontology = options.ontology;
    let extensionOntologies: string[] = [];

    if (options.profile) {
        const profile = loadProfile(options.profile, process.cwd());
        if (!profile) {
            console.error(chalk.red(`❌ Profile "${options.profile}" not found.`));
            const available = listProfiles(process.cwd());
            if (available.length > 0) {
                console.log(chalk.gray('\nAvailable profiles:'));
                for (const p of available) {
                    console.log(chalk.gray(`  - ${p.name.toLowerCase().replace(/[^a-z]/g, '').replace('medicaldevice', '')}`));
                }
            }
            process.exit(1);
        }
        ontology = profile.extends;
        extensionOntologies = profile.ontologies;
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
    if (options.profile) {
        console.log(chalk.gray(`  Profile: ${options.profile}`));
        if (extensionOntologies.length > 0) {
            console.log(chalk.gray(`  Extensions: ${extensionOntologies.length}`));
        }
        console.log();
    } else if (ontology !== DEFAULT_ONTOLOGY) {
        console.log(chalk.gray(`  Ontology: ${ontology}\n`));
    }

    // Create directory structure
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(resolve(projectDir, 'model'), { recursive: true });

    // Write memo.package.yaml (new format with optional ontologies array)
    let packageContent = `# ${projectName} — MEMO device model
name: "${projectName}"
version: "0.1.0"
type: device
extends: "${ontology}"
description: "MEMO device model project"
`;

    if (extensionOntologies.length > 0) {
        packageContent += `ontologies:\n`;
        for (const ext of extensionOntologies) {
            packageContent += `  - "${ext}"\n`;
        }
    }

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

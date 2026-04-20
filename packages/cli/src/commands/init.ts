// ─── memo init ───────────────────────────────────────────────────────────────
//
// Scaffolds a new MEMO project with:
//   - memo.package.yaml (new format — identity + extends + ontologies)
//   - model/ directory with a starter .sysml file
//   - memo.lock.yaml (ontology lock)
//
// Supports --ontology flag for ontology selection:
//   memo init my-device --ontology @memo/medical-modeling-profile  (default)
//   memo init my-device --ontology @memo/ontology-medical-arch
//   memo init --list-ontologies                                    (list available)
//
// Supports --profile flag for profile-based selection:
//   memo init my-device --profile minimal   (~53 kinds, core only)
//   memo init my-device --profile standard  (~120 kinds, core + risk + sw + dhf)
//   memo init my-device --profile full      (~200+ kinds, all extensions)
//
// Supports --archetype flag (also set interactively via --wizard):
//   memo init my-device --archetype samd
//   memo init my-device --archetype connected-device
//   memo init my-device --archetype monitoring-device
//   memo init my-device --archetype infusion-like
//
// Interactive wizard (default when no --archetype or --profile given):
//   memo init my-device
// ─────────────────────────────────────────────────────────────────────────────

import { resolve, join, dirname } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';
import { findConfigFile } from '@memo/core';
import { createLockFile } from '../lock.js';

const DEFAULT_ONTOLOGY = '@memo/medical-modeling-profile';

// ─── Archetypes ──────────────────────────────────────────────────────────────

export type DeviceArchetype = 'samd' | 'connected-device' | 'monitoring-device' | 'infusion-like' | 'blank';

interface ArchetypeInfo {
    id: DeviceArchetype;
    label: string;
    description: string;
    templateDir: string;
}

export const ARCHETYPES: ArchetypeInfo[] = [
    {
        id: 'samd',
        label: 'Software as Medical Device (SaMD)',
        description: 'Clinical decision support, diagnostic algorithm, AI/ML tool, mobile medical app',
        templateDir: 'samd',
    },
    {
        id: 'connected-device',
        label: 'Connected / IoT Device',
        description: 'Remote monitoring, wearable, smart device with cloud connectivity and cybersecurity requirements',
        templateDir: 'connected-device',
    },
    {
        id: 'monitoring-device',
        label: 'Monitoring / Diagnostic Device',
        description: 'Patient monitor, ECG, SpO2, vital signs, bedside diagnostic equipment',
        templateDir: 'monitoring-device',
    },
    {
        id: 'infusion-like',
        label: 'Infusion / Drug Delivery Device',
        description: 'Infusion pump, syringe driver, implantable drug delivery, dosing device',
        templateDir: 'infusion-pump',
    },
    {
        id: 'blank',
        label: 'Blank Project',
        description: 'Start from scratch with a minimal SysML shell',
        templateDir: '',
    },
];

// ─── Regulatory posture annotations ─────────────────────────────────────────

type RegulatoryClass = 'class-i' | 'class-ii' | 'class-iii-iib';

interface RegulatoryInfo {
    id: RegulatoryClass;
    label: string;
    standards: string;
}

const REGULATORY_CLASSES: RegulatoryInfo[] = [
    { id: 'class-i',     label: 'Class I / Low Risk',              standards: 'ISO 14971 (risk), IEC 62366 (usability)' },
    { id: 'class-ii',    label: 'Class II / Moderate Risk',        standards: '+ IEC 62304 (software lifecycle), 21 CFR 820' },
    { id: 'class-iii-iib', label: 'Class III / High Risk (EU IIb+)', standards: '+ full DHF, clinical evaluation, PMA/EU MDR' },
];

// ─── Wizard ──────────────────────────────────────────────────────────────────

interface WizardResult {
    archetype: DeviceArchetype;
    regulatoryClass: RegulatoryClass;
}

export async function runWizard(): Promise<WizardResult> {
    const rl = createInterface({ input, output });

    console.log(chalk.bold('\n🧙 MEMO Startup Wizard\n'));
    console.log(chalk.gray('  Answer a few questions and we\'ll scaffold the right starter model.\n'));

    // ── Question 1: Device archetype ─────────────────────────────────────
    console.log(chalk.bold('  What type of medical device are you building?\n'));
    ARCHETYPES.forEach((a, i) => {
        console.log(`  ${chalk.cyan(`${i + 1}.`)} ${chalk.white(a.label)}`);
        console.log(`     ${chalk.gray(a.description)}`);
    });

    let archetypeIndex = -1;
    while (archetypeIndex < 0 || archetypeIndex >= ARCHETYPES.length) {
        const raw = await rl.question(chalk.gray(`\n  Select [1-${ARCHETYPES.length}]: `));
        const parsed = parseInt(raw.trim(), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= ARCHETYPES.length) {
            archetypeIndex = parsed - 1;
        } else {
            console.log(chalk.yellow(`  Please enter a number between 1 and ${ARCHETYPES.length}.`));
        }
    }
    const archetype = ARCHETYPES[archetypeIndex];
    console.log(chalk.green(`  ✓ ${archetype.label}\n`));

    // ── Question 2: Regulatory class ─────────────────────────────────────
    console.log(chalk.bold('  What is your expected regulatory classification?\n'));
    REGULATORY_CLASSES.forEach((rc, i) => {
        console.log(`  ${chalk.cyan(`${i + 1}.`)} ${chalk.white(rc.label)}`);
        console.log(`     ${chalk.gray(rc.standards)}`);
    });

    let regIndex = -1;
    while (regIndex < 0 || regIndex >= REGULATORY_CLASSES.length) {
        const raw = await rl.question(chalk.gray(`\n  Select [1-${REGULATORY_CLASSES.length}]: `));
        const parsed = parseInt(raw.trim(), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= REGULATORY_CLASSES.length) {
            regIndex = parsed - 1;
        } else {
            console.log(chalk.yellow(`  Please enter a number between 1 and ${REGULATORY_CLASSES.length}.`));
        }
    }
    const regulatoryClass = REGULATORY_CLASSES[regIndex];
    console.log(chalk.green(`  ✓ ${regulatoryClass.label}\n`));

    rl.close();

    return {
        archetype: archetype.id,
        regulatoryClass: regulatoryClass.id,
    };
}

// ─── Template resolution ─────────────────────────────────────────────────────

/**
 * Find and return the path to the archetype's starter.sysml (or model.sysml).
 * Walks up from cwd to find the monorepo's medical-modeling-profile/templates/ directory.
 */
export function resolveArchetypeTemplate(archetype: DeviceArchetype, fromDir: string): string | null {
    if (archetype === 'blank') return null;

    const info = ARCHETYPES.find(a => a.id === archetype);
    if (!info || !info.templateDir) return null;

    let dir = resolve(fromDir);
    while (true) {
        const templateDir = resolve(dir, 'packages', 'medical-modeling-profile', 'templates', info.templateDir);
        if (existsSync(templateDir)) {
            // Try starter.sysml first, then model.sysml
            const starterPath = resolve(templateDir, 'starter.sysml');
            if (existsSync(starterPath)) return starterPath;
            const modelPath = resolve(templateDir, 'model.sysml');
            if (existsSync(modelPath)) return modelPath;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

// ─── Regulatory header comment ────────────────────────────────────────────────

function regulatoryComment(regulatoryClass: RegulatoryClass, archetype: DeviceArchetype): string {
    const standards: Record<RegulatoryClass, string[]> = {
        'class-i': ['ISO 14971 (risk management)', 'IEC 62366 (usability engineering)'],
        'class-ii': ['ISO 14971', 'IEC 62366', 'IEC 62304 (software lifecycle)', '21 CFR 820 / ISO 13485'],
        'class-iii-iib': ['ISO 14971', 'IEC 62366', 'IEC 62304', '21 CFR 820 / ISO 13485', 'Clinical evaluation (EU MDR Annex XIV)'],
    };
    const lines = standards[regulatoryClass].map(s => `// • ${s}`).join('\n');
    return `// Regulatory classification: ${REGULATORY_CLASSES.find(r => r.id === regulatoryClass)?.label}
// Applicable standards for this project:
${lines}
//
// Generated by memo init — update intended use statement before sharing.`;
}

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
 * Scans packages/ upward for memo.package.yaml files whose type is
 * "ontology" or "profile".
 */
export function discoverOntologies(fromDir: string): AvailableOntology[] {
    const results: AvailableOntology[] = [];
    let dir = resolve(fromDir);

    while (true) {
        const packagesDir = resolve(dir, 'packages');
        if (existsSync(packagesDir)) {
            scanOntologyDir(packagesDir, results);
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
                    extends: parsed.extends ?? '@memo/ontology-medical-arch',
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
    archetype?: string;
    listOntologies?: boolean;
    wizard?: boolean;
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

        console.log(chalk.bold('Available device archetypes:\n'));
        for (const a of ARCHETYPES) {
            console.log(`  ${chalk.cyan(a.id)}`);
            console.log(`    ${chalk.gray(a.description)}`);
        }
        console.log(chalk.gray(`\n  Usage: memo init <name> --archetype samd|connected-device|monitoring-device|infusion-like\n`));
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

    // ── Resolve archetype + regulatory class ──────────────────────────────
    let archetype: DeviceArchetype = 'blank';
    let regulatoryClass: RegulatoryClass = 'class-ii';

    if (options.archetype) {
        const found = ARCHETYPES.find(a => a.id === options.archetype);
        if (!found) {
            console.error(chalk.red(`❌ Unknown archetype "${options.archetype}".`));
            console.log(chalk.gray('Available: ' + ARCHETYPES.map(a => a.id).join(', ')));
            process.exit(1);
        }
        archetype = found.id;
    } else if (!options.profile && options.ontology === DEFAULT_ONTOLOGY && process.stdin.isTTY) {
        // Interactive terminal — run the startup wizard
        try {
            const wizResult = await runWizard();
            archetype = wizResult.archetype;
            regulatoryClass = wizResult.regulatoryClass;
        } catch {
            archetype = 'blank';
        }
    }
    // Non-TTY (CI, test, pipe) — skip wizard, use blank archetype silently

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
    if (archetype !== 'blank') {
        const archetypeInfo = ARCHETYPES.find(a => a.id === archetype)!;
        console.log(chalk.gray(`  Archetype: ${archetypeInfo.label}`));
    }
    if (options.profile) {
        console.log(chalk.gray(`  Profile: ${options.profile}`));
        if (extensionOntologies.length > 0) {
            console.log(chalk.gray(`  Extensions: ${extensionOntologies.length}`));
        }
    } else if (ontology !== DEFAULT_ONTOLOGY) {
        console.log(chalk.gray(`  Ontology: ${ontology}`));
    }
    console.log();

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

    // Write starter model — from archetype template or generate blank
    const templatePath = resolveArchetypeTemplate(archetype, process.cwd());
    const modelFilePath = resolve(projectDir, 'model', `${projectName}.sysml`);

    if (templatePath) {
        // Copy template and replace package name
        const templateContent = readFileSync(templatePath, 'utf-8');
        const importPackage = resolveImportPackage(ontology, available);
        // Replace the package declaration with the project name
        const firstPackageNameMatch = templateContent.match(/^package\s+\w+/m);
        const firstPackageName = firstPackageNameMatch ? firstPackageNameMatch[0].split(/\s+/)[1] : null;
        let content = templateContent;
        if (firstPackageName) {
            content = content.replace(
                new RegExp(`^package ${firstPackageName}`, 'm'),
                `package ${toIdentifier(projectName)}`
            );
        }
        // Prepend regulatory header
        const header = `// ${projectName} — MEMO Device Model\n// Generated by \`memo init\`\n//\n${regulatoryComment(regulatoryClass, archetype)}\n\n`;
        writeFileSync(modelFilePath, header + content);
        console.log(chalk.gray(`  Created model/${projectName}.sysml (from ${archetype} archetype)`));

        // Print what was scaffolded
        const elementTypes = extractElementSummary(header + content);
        if (elementTypes.length > 0) {
            console.log(chalk.gray(`  Scaffolded: ${elementTypes.join(', ')}`));
        }
    } else {
        // Blank template
        const importPackage = resolveImportPackage(ontology, available);
        const sysmlContent = `// ${projectName} — SysML v2 Model
// Generated by \`memo init\`

package ${toIdentifier(projectName)} {
    import ${importPackage}::*;

    // ─── System Definition ──────────────────────────────────────────

    part ${toIdentifier(projectName)}System : System {
        attribute redefines name = "${projectName}";
    }

    // ─── Example Requirement ────────────────────────────────────────

    requirement mainRequirement : Requirement {
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
        writeFileSync(modelFilePath, sysmlContent);
        console.log(chalk.gray(`  Created model/${projectName}.sysml`));
    }

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
    console.log(chalk.gray(`  Then open http://localhost:3000 — the Dashboard shows your model status.\n`));
}

/**
 * Extract a brief human-readable summary of element types scaffolded.
 */
function extractElementSummary(content: string): string[] {
    const kinds = new Set<string>();
    const patterns = [
        /:\s*Requirement\b/, /:\s*Hazard\b/,
        /:\s*HazardousSituation\b/, /:\s*Harm\b/, /:\s*RiskControl\b/,
        /:\s*Actor\b/, /:\s*Stakeholder\b/, /:\s*UseCase\b/,
        /:\s*System\b/, /:\s*SoftwareComponent\b/, /:\s*Test\b/,
    ];
    const labels: Record<string, string> = {
        Requirement: 'requirements',
        HazardousSituation: 'hazardous situations', Harm: 'harms', RiskControl: 'risk controls',
        Actor: 'actors', Stakeholder: 'stakeholders', UseCase: 'use cases',
        System: 'system architecture', SoftwareComponent: 'software components', Test: 'tests',
    };
    for (const [pattern, label] of Object.entries(labels)) {
        const regex = new RegExp(`:\\s*${pattern}\\b`);
        if (regex.test(content)) kinds.add(label);
    }
    // simpler check
    patterns.forEach((p, i) => {
        if (p.test(content)) {
            const match = p.source.match(/\*\\b\/$/);
        }
    });
    return [...kinds].slice(0, 6);
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
        if (current.name === '@memo/ontology-medical-process' || current.extends === '@memo/ontology-medical-process') {
            return 'MEMO_Ontology_Medical';
        }
        if (current.name === '@memo/ontology-medical-arch' && !current.extends) {
            return 'MEMO_Ontology_Core';
        }
        current = current.extends ? available.find(o => o.name === current!.extends) : undefined;
    }

    return 'MEMO_Ontology_Medical';
}

function toIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

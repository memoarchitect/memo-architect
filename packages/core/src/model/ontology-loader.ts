// ─── Ontology Loader ──────────────────────────────────────────────────────────
//
// Pipeline: parse ontology SysML → populate KindRegistry + RelationshipRegistry.
// Walks the config `extends` chain to find ontology packages, locates their
// `sysml/` directories, parses all SysML files, and populates registries.
//
// Usage:
//   const registries = await loadOntologyRegistries(configPath);
//   const model = buildMemoModel(documents, config, errors, registries);
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { KindRegistry } from './kind-registry.js';
import { RelationshipRegistry } from './relationship-registry.js';
import { parseFiles } from './parser-utils.js';
import type { BuilderRegistries } from './builder.js';

/**
 * Result of loading ontology registries, including diagnostic info.
 */
export interface OntologyLoadResult {
    /** Populated registries for the builder */
    registries: BuilderRegistries;
    /** Number of ontology SysML files parsed */
    fileCount: number;
    /** Ontology package directories that were found and parsed */
    ontologyDirs: string[];
    /** Errors encountered during parsing */
    errors: string[];
}

/**
 * Recursively collect all .sysml files under a directory,
 * excluding index.sysml (which is just imports).
 */
function collectSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...collectSysmlFiles(full));
            } else if (entry.name.endsWith('.sysml') && entry.name !== 'index.sysml') {
                files.push(full);
            }
        }
    } catch {
        // skip inaccessible dirs
    }
    return files;
}

/**
 * Walk the config `extends` chain to find ontology package directories.
 * Returns absolute paths to directories containing `sysml/` subdirectories.
 *
 * Strategy:
 * 1. Start from the config file's directory
 * 2. Follow `extends` references (@memo/package-name → packages/package-name)
 * 3. For each package in the chain, check if it has a sysml/ directory
 * 4. Also check for ontology-core (may not be in extends chain directly)
 */
function findOntologyPackageDirs(configPath: string): string[] {
    const dirs: string[] = [];
    const seen = new Set<string>();

    // 1. Walk the primary extends chain
    walkExtendsChain(configPath, dirs, seen);

    // 2. Load additional ontologies from the config file's `ontologies` array.
    // This allows for a "Base + Plugin" model where users can add multiple domain-specific ontologies.
    try {
        const content = readFileSync(configPath, 'utf-8');
        // Lightweight YAML parsing for ontologies:
        const ontologySection = content.split(/^ontologies:/m)[1];
        if (ontologySection) {
            const matches = ontologySection.matchAll(/^\s*-\s*name:\s*"?([\w@\/-]+)"?/gm);
            for (const match of matches) {
                let ontologyName = match[1];
                // Ensure name has @memo/ prefix for resolution if missing
                if (!ontologyName.startsWith('@memo/')) {
                    ontologyName = `@memo/${ontologyName}`;
                }
                const pkgConfig = resolvePackageConfig(ontologyName, dirname(configPath));
                if (pkgConfig) {
                    walkExtendsChain(pkgConfig, dirs, seen);
                }
            }
        }
    } catch {
        // Skip inaccessible configs
    }

    // 3. Ensure @memo/ontology-core is always included as the foundational backbone
    const coreConfig = resolvePackageConfig('@memo/ontology-core', dirname(configPath));
    if (coreConfig) {
        walkExtendsChain(coreConfig, dirs, seen);
    }

    return dirs;
}

/**
 * Recursively walk the extends chain, collecting ontology package dirs.
 */
function walkExtendsChain(configPath: string, dirs: string[], seen: Set<string>): void {
    const resolvedPath = resolve(configPath);
    if (seen.has(resolvedPath)) return;
    seen.add(resolvedPath);

    // Read the YAML to find extends (lightweight — just look for extends line)
    let extendsPackage: string | undefined;
    let projectType: string | undefined;
    try {
        const content = readFileSync(resolvedPath, 'utf-8');
        const extendsMatch = content.match(/^extends:\s*"?(@memo\/[\w-]+)"?/m);
        if (extendsMatch) {
            extendsPackage = extendsMatch[1];
        }
        // Match both legacy (projectType:) and new format (type:)
        const typeMatch = content.match(/^(?:projectType|type):\s*(\w+)/m);
        if (typeMatch) {
            projectType = typeMatch[1];
        }
    } catch {
        return;
    }

    const packageDir = dirname(resolvedPath);

    // If this package has a sysml/ directory, it's an ontology source
    const sysmlDir = resolve(packageDir, 'sysml');
    if (existsSync(sysmlDir)) {
        dirs.push(packageDir);
    }

    // Follow extends chain
    if (extendsPackage) {
        const parentConfigPath = resolvePackageConfig(extendsPackage, packageDir);
        if (parentConfigPath) {
            walkExtendsChain(parentConfigPath, dirs, seen);
        }
    }

    // If this is an ontology that doesn't extend ontology-core,
    // check if ontology-core exists as a sibling package
    if (projectType === 'ontology' && !extendsPackage) {
        const coreDir = resolve(packageDir, '../ontology-core');
        const coreSysml = resolve(coreDir, 'sysml');
        // Check for any config file format to mark as seen
        const coreConfigKey = resolve(coreDir, 'memo.package.yaml');
        if (existsSync(coreSysml) && !seen.has(coreConfigKey)) {
            dirs.push(coreDir);
            seen.add(coreConfigKey);
        }
    }
}

/** Ordered list of config filenames to search for (new format first, then legacy) */
const CONFIG_SEARCH_ORDER = [
    'memo.package.yaml',
    'memo.package.yml',
    'memo.config.yaml',
    'memo.config.yml',
];

/**
 * Resolve a @memo/package-name to its config file path.
 * Prefers memo.package.yaml (new format), falls back to memo.config.yaml (legacy).
 * Searches: workspace packages (monorepo), then node_modules.
 */
function resolvePackageConfig(packageName: string, fromDir: string): string | undefined {
    const shortName = packageName.replace(/^@memo\//, '');

    let dir = resolve(fromDir);
    while (true) {
        // Try workspace packages
        for (const configName of CONFIG_SEARCH_ORDER) {
            const candidate = resolve(dir, 'packages', shortName, configName);
            if (existsSync(candidate)) return candidate;
        }

        // Try node_modules
        for (const configName of CONFIG_SEARCH_ORDER) {
            const nmCandidate = resolve(dir, 'node_modules', packageName, configName);
            if (existsSync(nmCandidate)) return nmCandidate;
        }

        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return undefined;
}

/**
 * Load ontology registries by walking the config extends chain,
 * finding ontology SysML files, parsing them, and populating
 * KindRegistry + RelationshipRegistry.
 *
 * @param configPath - Path to the project's memo.config.yaml
 * @returns Populated registries and diagnostic info
 */
export async function loadOntologyRegistries(configPath: string): Promise<OntologyLoadResult> {
    const kindRegistry = new KindRegistry();
    const relationshipRegistry = new RelationshipRegistry();
    const errors: string[] = [];

    // Find ontology package directories
    const ontologyDirs = findOntologyPackageDirs(configPath);

    if (ontologyDirs.length === 0) {
        return {
            registries: { kindRegistry, relationshipRegistry },
            fileCount: 0,
            ontologyDirs: [],
            errors: ['No ontology packages with sysml/ directories found in extends chain'],
        };
    }

    // Collect all SysML files from all ontology packages
    const allSysmlFiles: string[] = [];
    for (const pkgDir of ontologyDirs) {
        const sysmlDir = resolve(pkgDir, 'sysml');
        const files = collectSysmlFiles(sysmlDir);
        allSysmlFiles.push(...files);
    }

    if (allSysmlFiles.length === 0) {
        return {
            registries: { kindRegistry, relationshipRegistry },
            fileCount: 0,
            ontologyDirs,
            errors: ['Ontology packages found but no .sysml files in sysml/ directories'],
        };
    }

    // Parse all ontology SysML files
    const parseResult = await parseFiles(allSysmlFiles, '');

    for (const err of parseResult.errors) {
        errors.push(`${err.file}${err.line ? `:${err.line}` : ''}: ${err.message}`);
    }

    // Populate registries from parsed documents
    kindRegistry.populateFromDocuments(parseResult.documents);
    relationshipRegistry.populateFromDocuments(parseResult.documents);

    return {
        registries: { kindRegistry, relationshipRegistry },
        fileCount: allSysmlFiles.length,
        ontologyDirs,
        errors,
    };
}

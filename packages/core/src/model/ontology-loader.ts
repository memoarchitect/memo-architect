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

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { KindRegistry } from './kind-registry.js';
import { RelationshipRegistry } from './relationship-registry.js';
import { parseFiles } from './parser-utils.js';
import type { BuilderRegistries } from './builder.js';

// ─── Ontology Package Metadata (Phase C2) ────────────────────────────────────

export interface OntologyRelationshipInfo {
    name: string;
    sourceKind?: string;    // from first typed `end` in connection def
    targetKind?: string;    // from second typed `end` in connection def
}

export interface OntologyPackageInfo {
    name: string;
    version: string;
    type: 'ontology' | 'profile' | 'extension';
    description: string;
    extends?: string;
    layers: OntologyLayerInfo[];
    kindCount: number;
    relationshipCount: number;
    relationshipTypes: OntologyRelationshipInfo[];
    selected: boolean;
}

export interface OntologyLayerInfo {
    id: string;
    label: string;
    color: string;
    kindCount: number;
    kinds: OntologyKindInfo[];
}

export interface OntologyKindInfo {
    name: string;
    label: string;
    construct: string;
    layer: string;
    instanceCount: number;
    viewpoints: string[];
    description?: string;
    derivesFrom?: string;
    derivedBy?: string[];
    relationships?: Array<{ type: string; targetKind: string; direction: 'outgoing' | 'incoming' }>;
}

/** Layer color palette (mirrors web constants) */
const LAYER_COLORS: Record<string, string> = {
    // ontology-core layers
    purpose: '#6366F1', operational: '#8B5CF6', system: '#7C3AED',
    requirements: '#EC4899', functional: '#F59E0B', logical: '#06B6D4',
    hardware: '#10B981', physical: '#10B981',
    software: '#3B82F6', interfaces: '#14B8A6', analysis: '#F97316',
    verification: '#84CC16', relationships: '#9CA3AF',
    // ontology-medical layers
    risk: '#EF4444', safety: '#F97316', 'design-control': '#8B5CF6',
    operations: '#10B981', ui: '#EC4899', clinical: '#06B6D4',
    // ontology-qms layers
    qms: '#6B7280', 'design-control-qms': '#8B5CF6',
    // ontology-iec62304 layers
    'software-lifecycle': '#3B82F6',
    // ontology-cybersecurity layers
    cybersecurity: '#EF4444', privacy: '#6366F1',
    // ontology-middleware-ros layers
    middleware: '#0EA5E9',
};

/** Parsed kind info from a SysML file */
interface ParsedKindInfo {
    name: string;
    construct: string;
    derivesFrom?: string;
    description?: string;
}

/** Parsed relationship info from a connection def */
interface ParsedRelationshipInfo {
    name: string;
    sourceKind?: string;
    targetKind?: string;
}

/**
 * Parse SysML constructs (part def, requirement def, action def, connection def)
 * from a single SysML file, extracting specialization and doc comments.
 */
function parseConstructsInFile(filePath: string): { kinds: ParsedKindInfo[]; relationships: ParsedRelationshipInfo[] } {
    const kinds: ParsedKindInfo[] = [];
    const relationships: ParsedRelationshipInfo[] = [];
    try {
        const content = readFileSync(filePath, 'utf-8');

        // Match kind definitions with optional :> (specializes) and preceding doc comments
        // Pattern: [doc /* ... */] <construct> def Name [:> SuperType] { ... }
        const kindRegex = /(?:doc\s+\/\*\s*([\s\S]*?)\s*\*\/\s*)?^\s*(?:part|requirement|action|attribute|item|abstract part)\s+def\s+(\w+)(?:\s*:>\s*(\w+))?/gm;
        for (const m of content.matchAll(kindRegex)) {
            const construct = m[0].match(/(?:abstract\s+)?(part|requirement|action|attribute|item)\s+def/)?.[0]?.trim() ?? 'part def';
            kinds.push({
                name: m[2],
                construct,
                derivesFrom: m[3] || undefined,
                description: m[1]?.replace(/\s+/g, ' ').trim() || undefined,
            });
        }

        // Match connection defs with endpoint type annotations
        // Pattern: connection def Name { end name : TypeName [mult]; end name : TypeName [mult]; }
        const connBlockRegex = /(?:connection|binding|allocation)\s+def\s+(\w+)\s*\{([^}]*)\}/g;
        for (const m of content.matchAll(connBlockRegex)) {
            const name = m[1];
            const body = m[2];
            // Extract typed ends: `end <name> : <TypeName> [` — ignore untyped ends like `end subject[1]`
            const endRegex = /end\s+\w+\s*:\s*(\w+)\s*\[/g;
            const typedEnds: string[] = [];
            for (const em of body.matchAll(endRegex)) typedEnds.push(em[1]);
            relationships.push({
                name,
                sourceKind: typedEnds[0],
                targetKind: typedEnds[1],
            });
        }
    } catch { /* skip */ }
    return { kinds, relationships };
}

/**
 * Build layer info by scanning the sysml/ directory tree.
 * Apollo-11 convention: sysml/<layer>/<file>.sysml
 */
function buildLayers(sysmlDir: string): OntologyLayerInfo[] {
    const layers: OntologyLayerInfo[] = [];
    if (!existsSync(sysmlDir)) return layers;

    // First pass: collect all kinds across all layers
    const allParsedKinds: Array<ParsedKindInfo & { layer: string }> = [];

    try {
        for (const entry of readdirSync(sysmlDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const layerId = entry.name;
            const layerDir = join(sysmlDir, layerId);
            const layerKinds: OntologyKindInfo[] = [];

            for (const filePath of collectSysmlFiles(layerDir)) {
                const { kinds } = parseConstructsInFile(filePath);
                for (const k of kinds) {
                    allParsedKinds.push({ ...k, layer: layerId });
                    layerKinds.push({
                        name: k.name,
                        label: k.name.replace(/([A-Z])/g, ' $1').trim(),
                        construct: k.construct,
                        layer: layerId,
                        instanceCount: 0,
                        viewpoints: [],
                        description: k.description,
                        derivesFrom: k.derivesFrom,
                    });
                }
            }

            layers.push({
                id: layerId,
                label: layerId.charAt(0).toUpperCase() + layerId.slice(1).replace(/-/g, ' '),
                color: LAYER_COLORS[layerId] ?? '#6B7280',
                kindCount: layerKinds.length,
                kinds: layerKinds,
            });
        }
    } catch { /* skip */ }

    // Second pass: compute derivedBy (reverse lookup of derivesFrom)
    const derivedByMap = new Map<string, string[]>();
    for (const k of allParsedKinds) {
        if (k.derivesFrom) {
            if (!derivedByMap.has(k.derivesFrom)) derivedByMap.set(k.derivesFrom, []);
            derivedByMap.get(k.derivesFrom)!.push(k.name);
        }
    }
    for (const layer of layers) {
        for (const kind of layer.kinds) {
            kind.derivedBy = derivedByMap.get(kind.name);
        }
    }

    return layers;
}

/**
 * Collect all connection def relationship types from a sysml/ directory tree.
 * Scans all layers (subdirectories) and collects connection def endpoint info.
 */
function buildRelationshipTypes(sysmlDir: string): OntologyRelationshipInfo[] {
    const result: OntologyRelationshipInfo[] = [];
    if (!existsSync(sysmlDir)) return result;
    try {
        for (const entry of readdirSync(sysmlDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const layerDir = join(sysmlDir, entry.name);
            for (const filePath of collectSysmlFiles(layerDir)) {
                const { relationships } = parseConstructsInFile(filePath);
                for (const r of relationships) result.push(r);
            }
        }
    } catch { /* skip */ }
    return result;
}

/**
 * Read a YAML file and extract a simple string field.
 */
function readYamlField(content: string, field: string): string {
    const m = content.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
    return m ? m[1].trim() : '';
}

/**
 * Get the list of selected ontology package names from a project config file.
 */
function readSelectedOntologies(configPath: string): Set<string> {
    const selected = new Set<string>();
    try {
        const content = readFileSync(configPath, 'utf-8');
        const section = content.split(/^ontologies:/m)[1];
        if (section) {
            const matches = section.matchAll(/^\s*-\s*name:\s*["']?([\w@\/-]+)["']?/gm);
            for (const m of matches) selected.add(m[1]);
        }
    } catch { /* skip */ }
    return selected;
}

/**
 * Build OntologyPackageInfo for a single package directory.
 */
function buildPackageInfo(pkgDir: string, selected: boolean): OntologyPackageInfo | null {
    const configCandidates = ['memo.package.yaml', 'memo.package.yml', 'memo.config.yaml', 'memo.config.yml'];
    let configContent = '';
    for (const name of configCandidates) {
        const p = join(pkgDir, name);
        if (existsSync(p)) { configContent = readFileSync(p, 'utf-8'); break; }
    }
    if (!configContent) return null;

    const name = readYamlField(configContent, 'name') || basename(pkgDir);
    const version = readYamlField(configContent, 'version') || '0.0.0';
    const rawType = readYamlField(configContent, 'type') || 'ontology';
    const type = (['ontology', 'profile', 'extension'].includes(rawType) ? rawType : 'ontology') as OntologyPackageInfo['type'];
    const description = readYamlField(configContent, 'description') || '';
    const extendsField = readYamlField(configContent, 'extends') || undefined;

    const sysmlDir = join(pkgDir, 'sysml');
    const layers = buildLayers(sysmlDir);
    const kindCount = layers.reduce((s, l) => s + l.kindCount, 0);
    const relationshipTypes = buildRelationshipTypes(sysmlDir);

    return { name, version, type, description, extends: extendsField, layers, kindCount, relationshipCount: relationshipTypes.length, relationshipTypes, selected };
}

/**
 * Get ontology package metadata for all packages in the project's extends chain
 * plus any available-but-unselected packages under packages/ or node_modules/@memo/.
 *
 * @param projectRoot - Absolute path to the project root (where memo.package.yaml lives)
 */
export function getPackageMetadata(projectRoot: string): OntologyPackageInfo[] {
    const configCandidates = ['memo.package.yaml', 'memo.package.yml', 'memo.config.yaml', 'memo.config.yml'];
    let primaryConfig = '';
    for (const name of configCandidates) {
        const p = join(projectRoot, name);
        if (existsSync(p)) { primaryConfig = p; break; }
    }
    if (!primaryConfig) return [];

    const selectedNames = readSelectedOntologies(primaryConfig);
    const result: OntologyPackageInfo[] = [];
    const seen = new Set<string>();

    // Gather all package directories from monorepo packages/ (walk upward like resolvePackageConfig)
    const candidates: string[] = [];
    let searchDir = resolve(projectRoot);
    while (true) {
        const pkgsDir = join(searchDir, 'packages');
        if (existsSync(pkgsDir)) {
            try {
                for (const entry of readdirSync(pkgsDir, { withFileTypes: true })) {
                    if (!entry.isDirectory()) continue;
                    if (entry.name === 'ontology-extensions') {
                        const extRoot = join(pkgsDir, entry.name);
                        for (const ext of readdirSync(extRoot, { withFileTypes: true })) {
                            if (ext.isDirectory()) candidates.push(join(extRoot, ext.name));
                        }
                    } else {
                        candidates.push(join(pkgsDir, entry.name));
                    }
                }
            } catch { /* skip */ }
            break; // Found a packages/ dir, stop walking up
        }
        const parent = dirname(searchDir);
        if (parent === searchDir) break;
        searchDir = parent;
    }

    // Scan memo_packages/ for locally installed packages
    const memoPkgsDir = join(projectRoot, 'memo_packages');
    if (existsSync(memoPkgsDir)) {
        try {
            for (const entry of readdirSync(memoPkgsDir, { withFileTypes: true })) {
                if (entry.isDirectory()) candidates.push(join(memoPkgsDir, entry.name));
            }
        } catch { /* skip */ }
    }

    // Also scan node_modules/@memo/ for installed packages
    const nmMemo = join(projectRoot, 'node_modules', '@memo');
    if (existsSync(nmMemo)) {
        try {
            for (const entry of readdirSync(nmMemo, { withFileTypes: true })) {
                if (entry.isDirectory()) candidates.push(join(nmMemo, entry.name));
            }
        } catch { /* skip */ }
    }

    for (const pkgDir of candidates) {
        const hasSysml = existsSync(join(pkgDir, 'sysml'));
        if (!hasSysml) continue;
        if (seen.has(pkgDir)) continue;
        seen.add(pkgDir);

        const info = buildPackageInfo(pkgDir, false);
        if (!info) continue;
        // Mark as selected if name is in project's ontologies list, or inferred heuristic
        info.selected = selectedNames.has(info.name) || selectedNames.has(info.name.replace('@memo/', ''));
        result.push(info);
    }

    // Sort: selected first, then by name
    result.sort((a, b) => {
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return result;
}

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
    const extensionStem = shortName.replace(/^ontology-ext-/, '').replace(/^ontology-/, '');

    let dir = resolve(fromDir);
    while (true) {
        // Try workspace packages
        for (const configName of CONFIG_SEARCH_ORDER) {
            const candidate = resolve(dir, 'packages', shortName, configName);
            if (existsSync(candidate)) return candidate;
        }
        for (const configName of CONFIG_SEARCH_ORDER) {
            const extCandidate = resolve(dir, 'packages', 'ontology-extensions', extensionStem, configName);
            if (existsSync(extCandidate)) return extCandidate;
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
    kindRegistry.computeDerivedBy();
    relationshipRegistry.populateFromDocuments(parseResult.documents);

    return {
        registries: { kindRegistry, relationshipRegistry },
        fileCount: allSysmlFiles.length,
        ontologyDirs,
        errors,
    };
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { MEMOConfig, CosmaLayer, ClosureRule, ViewpointDefinition } from './config.js';

const CONFIG_FILENAMES = ['memo.config.yaml', 'memo.config.yml'];
const RENDERING_FILENAMES = ['memo.rendering.yaml', 'memo.rendering.yml'];
const RULES_FILENAMES = ['memo.rules.yaml', 'memo.rules.yml'];

/**
 * Locate the nearest config file by walking up from `startDir`.
 * Returns the resolved path or undefined if not found.
 */
export function findConfigFile(startDir: string): string | undefined {
    let dir = resolve(startDir);
    while (true) {
        for (const name of CONFIG_FILENAMES) {
            const candidate = resolve(dir, name);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
        const parent = dirname(dir);
        if (parent === dir) break; // reached filesystem root
        dir = parent;
    }
    return undefined;
}

/**
 * Load rendering layers from a memo.rendering.yaml file.
 * Returns the layers array, or empty array if file not found.
 */
export function loadRenderingLayers(configDir: string): CosmaLayer[] {
    for (const name of RENDERING_FILENAMES) {
        const candidate = resolve(configDir, name);
        if (existsSync(candidate)) {
            try {
                const raw = readFileSync(candidate, 'utf-8');
                const parsed = parseYaml(raw);
                return parsed?.layers ?? [];
            } catch {
                // skip malformed file
            }
        }
    }
    return [];
}

/**
 * Load closure rules from a memo.rules.yaml file.
 * Returns the closureRules array, or empty array if file not found.
 */
export function loadClosureRules(configDir: string): ClosureRule[] {
    for (const name of RULES_FILENAMES) {
        const candidate = resolve(configDir, name);
        if (existsSync(candidate)) {
            try {
                const raw = readFileSync(candidate, 'utf-8');
                const parsed = parseYaml(raw);
                return parsed?.closureRules ?? [];
            } catch {
                // skip malformed file
            }
        }
    }
    return [];
}

/**
 * Load and parse a MEMOConfig from a YAML file.
 * Also loads `memo.rendering.yaml` if present (layers → cosmaLayers).
 * Also loads `memo.rules.yaml` if present (closureRules).
 * Does NOT resolve `extends` — call `resolveConfig` for that.
 */
export function loadConfig(filePath: string): MEMOConfig {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(raw);

    // Load rendering layers from memo.rendering.yaml (new format)
    const configDir = dirname(filePath);
    const renderingLayers = loadRenderingLayers(configDir);

    // Merge: memo.rendering.yaml layers take precedence, then cosmaLayers from config
    const cosmaLayersFromConfig: CosmaLayer[] = parsed.cosmaLayers ?? [];
    const mergedLayers = renderingLayers.length > 0
        ? dedup([...cosmaLayersFromConfig, ...renderingLayers], l => l.id)
        : cosmaLayersFromConfig;

    // Load closure rules from memo.rules.yaml (new format)
    const rulesFromFile = loadClosureRules(configDir);
    const rulesFromConfig: ClosureRule[] = parsed.closureRules ?? [];
    const mergedRules = rulesFromFile.length > 0
        ? dedup([...rulesFromConfig, ...rulesFromFile], r => r.id)
        : rulesFromConfig;

    // Apply defaults
    return {
        projectName: parsed.projectName ?? 'untitled',
        projectType: parsed.projectType ?? 'device',
        extends: parsed.extends,
        ontologies: parsed.ontologies,
        ontologyMetadata: parsed.ontologyMetadata,
        externalOntologies: parsed.externalOntologies,
        libraries: parsed.libraries,
        cosmaLayers: mergedLayers,
        kinds: parsed.kinds ?? {},
        relationshipTypes: parsed.relationshipTypes ?? [],
        closureRules: mergedRules,
        viewpoints: parsed.viewpoints,
        workflows: parsed.workflows,
        firstRun: parsed.firstRun,
    };
}

/**
 * Resolve the `extends` chain by merging configs.
 * Child properties override parent properties; arrays are concatenated.
 */
export function resolveConfig(
    config: MEMOConfig,
    loader: (packageName: string) => MEMOConfig | undefined
): MEMOConfig {
    if (!config.extends) return config;

    const parent = loader(config.extends);
    if (!parent) {
        console.warn(`Warning: Could not resolve parent config "${config.extends}"`);
        return config;
    }

    const resolvedParent = resolveConfig(parent, loader);

    return mergeConfigs(resolvedParent, config);
}

/** Deduplicate an array by a key function. Last occurrence wins. */
function dedup<T>(arr: T[], key: (item: T) => string): T[] {
    const seen = new Map<string, T>();
    for (const item of arr) {
        seen.set(key(item), item);
    }
    return Array.from(seen.values());
}

/** Merge viewpoints: deduplicate by id, and merge diagrams within shared viewpoints */
function mergeViewpoints(
    parentVps: ViewpointDefinition[] | undefined,
    childVps: ViewpointDefinition[] | undefined
): ViewpointDefinition[] | undefined {
    if (!parentVps && !childVps) return undefined;
    if (!parentVps) return childVps;
    if (!childVps) return parentVps;

    const merged = new Map<string, ViewpointDefinition>();
    for (const vp of parentVps) {
        merged.set(vp.id, { ...vp });
    }
    for (const vp of childVps) {
        if (merged.has(vp.id)) {
            // Child overrides parent viewpoint, but merge diagrams
            const parent = merged.get(vp.id)!;
            const parentDiagrams = parent.diagrams ?? [];
            const childDiagrams = vp.diagrams ?? [];
            const mergedDiagrams = dedup(
                [...parentDiagrams, ...childDiagrams],
                d => d.id
            );
            merged.set(vp.id, {
                ...vp,
                diagrams: mergedDiagrams.length > 0 ? mergedDiagrams : undefined,
                supportedDiagramTypes: vp.supportedDiagramTypes ?? parent.supportedDiagramTypes,
            });
        } else {
            merged.set(vp.id, { ...vp });
        }
    }
    return Array.from(merged.values());
}

/** Deep-merge parent into child. Child takes precedence. Arrays are deduped. */
function mergeConfigs(parent: MEMOConfig, child: MEMOConfig): MEMOConfig {
    return {
        projectName: child.projectName,
        projectType: child.projectType,
        extends: child.extends,
        ontologies: child.ontologies ?? parent.ontologies,
        ontologyMetadata: child.ontologyMetadata ?? parent.ontologyMetadata,
        externalOntologies: [
            ...(parent.externalOntologies ?? []),
            ...(child.externalOntologies ?? []),
        ].length > 0 ? [
            ...(parent.externalOntologies ?? []),
            ...(child.externalOntologies ?? []),
        ] : undefined,
        libraries: [
            ...(parent.libraries ?? []),
            ...(child.libraries ?? []),
        ].length > 0 ? [
            ...(parent.libraries ?? []),
            ...(child.libraries ?? []),
        ] : undefined,
        cosmaLayers: dedup(
            [...(parent.cosmaLayers ?? []), ...(child.cosmaLayers ?? [])],
            l => l.id
        ),
        kinds: { ...parent.kinds, ...child.kinds },
        relationshipTypes: dedup(
            [...parent.relationshipTypes, ...child.relationshipTypes],
            r => r.name
        ),
        closureRules: dedup(
            [...parent.closureRules, ...child.closureRules],
            r => r.id
        ),
        viewpoints: mergeViewpoints(parent.viewpoints, child.viewpoints),
        workflows: child.workflows ?? parent.workflows,
        firstRun: child.firstRun ?? parent.firstRun,
    };
}

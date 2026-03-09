import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { MEMOConfig } from './config.js';

const CONFIG_FILENAMES = ['memo.config.yaml', 'memo.config.yml'];

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
 * Load and parse a MEMOConfig from a YAML file.
 * Does NOT resolve `extends` — call `resolveConfig` for that.
 */
export function loadConfig(filePath: string): MEMOConfig {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseYaml(raw);

    // Apply defaults
    return {
        projectName: parsed.projectName ?? 'untitled',
        projectType: parsed.projectType ?? 'device',
        extends: parsed.extends,
        ontologies: parsed.ontologies,
        cosmaLayers: parsed.cosmaLayers ?? [],
        kinds: parsed.kinds ?? {},
        relationshipTypes: parsed.relationshipTypes ?? [],
        closureRules: parsed.closureRules ?? [],
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

/** Deep-merge parent into child. Child takes precedence. */
function mergeConfigs(parent: MEMOConfig, child: MEMOConfig): MEMOConfig {
    return {
        projectName: child.projectName,
        projectType: child.projectType,
        extends: child.extends,
        ontologies: child.ontologies ?? parent.ontologies,
        cosmaLayers: [
            ...(parent.cosmaLayers ?? []),
            ...(child.cosmaLayers ?? []),
        ],
        kinds: { ...parent.kinds, ...child.kinds },
        relationshipTypes: [
            ...parent.relationshipTypes,
            ...child.relationshipTypes,
        ],
        closureRules: [
            ...parent.closureRules,
            ...child.closureRules,
        ],
        viewpoints: child.viewpoints ?? parent.viewpoints,
        workflows: child.workflows ?? parent.workflows,
        firstRun: child.firstRun ?? parent.firstRun,
    };
}

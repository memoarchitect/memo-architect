// ─── Config Resolver ──────────────────────────────────────────────────────────
//
// Resolves the `extends` chain for MEMO configs.
// Handles: "@memo/medical" → find memo.config.yaml in node_modules/@memo/medical
// or in workspace packages/medical/
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { MEMOConfig } from '@memo/core';
import { loadConfig, resolveConfig } from '@memo/core';

/**
 * Load and fully resolve a config file, following the extends chain.
 */
export function loadAndResolveConfig(configPath: string): MEMOConfig {
    const config = loadConfig(configPath);
    const projectDir = dirname(configPath);

    return resolveConfig(config, (packageName: string) => {
        return resolveParentConfig(packageName, projectDir);
    });
}

/**
 * Try to find and load a parent config by package name.
 * Searches: node_modules, workspace packages, known paths.
 */
function resolveParentConfig(packageName: string, fromDir: string): MEMOConfig | undefined {
    // Strategy 1: node_modules resolution
    const nmPath = resolveFromNodeModules(packageName, fromDir);
    if (nmPath) return loadConfig(nmPath);

    // Strategy 2: workspace packages (monorepo)
    const wsPath = resolveFromWorkspace(packageName, fromDir);
    if (wsPath) return loadConfig(wsPath);

    return undefined;
}

function resolveFromNodeModules(packageName: string, fromDir: string): string | undefined {
    // Walk up from fromDir looking for node_modules/<packageName>/memo.config.yaml
    let dir = resolve(fromDir);
    while (true) {
        const candidate = resolve(dir, 'node_modules', packageName, 'memo.config.yaml');
        if (existsSync(candidate)) return candidate;

        const candidateYml = resolve(dir, 'node_modules', packageName, 'memo.config.yml');
        if (existsSync(candidateYml)) return candidateYml;

        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return undefined;
}

function resolveFromWorkspace(packageName: string, fromDir: string): string | undefined {
    // Map package names to workspace directories
    // @memo/medical → packages/medical, @memo/ontology → packages/ontology
    const shortName = packageName.replace(/^@memo\//, '');

    // Walk up to find the monorepo root (has pnpm-workspace.yaml or packages/ dir)
    let dir = resolve(fromDir);
    while (true) {
        const packagesDir = resolve(dir, 'packages', shortName);
        const candidate = resolve(packagesDir, 'memo.config.yaml');
        if (existsSync(candidate)) return candidate;

        const candidateYml = resolve(packagesDir, 'memo.config.yml');
        if (existsSync(candidateYml)) return candidateYml;

        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return undefined;
}

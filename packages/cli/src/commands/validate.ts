// ─── memo validate ───────────────────────────────────────────────────────────
//
// Parses all .sysml files, builds the model, evaluates closure rules,
// and prints a completeness report.
// ─────────────────────────────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import chalk from 'chalk';
import { findConfigFile, parseFiles, buildMemoModel, loadOntologyRegistries } from '@memo/core';
import type { BuilderRegistries } from '@memo/core';
import { validateModel } from '@memo/core';
import { computeCompleteness } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';
import { checkLockFile } from '../lock.js';

/**
 * Find all .sysml files recursively from a directory.
 */
function findSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.memo') {
                files.push(...findSysmlFiles(full));
            } else if (entry.name.endsWith('.sysml')) {
                files.push(full);
            }
        }
    } catch {
        // Permission errors, etc.
    }
    return files;
}

export async function validateCommand(projectDir?: string): Promise<void> {
    const cwd = resolve(projectDir || process.cwd());
    console.log(chalk.bold('\n📋 MEMO Validate\n'));

    // 1. Find config
    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('❌ No memo config found. Run `memo init` first.'));
        process.exit(1);
    }
    console.log(chalk.gray(`Config: ${configPath}`));

    // 2. Load and resolve config
    const config = loadAndResolveConfig(configPath);
    console.log(chalk.gray(`Project: ${config.projectName} (${config.projectType})`));

    // 2a. Check ontology lock
    const lockCheck = checkLockFile(configPath);
    if (!lockCheck.ok) {
        console.error(chalk.red(`\n❌ ${lockCheck.message}\n`));
        process.exit(1);
    }
    if (lockCheck.locked) {
        console.log(chalk.gray(`Ontology: locked to ${lockCheck.locked.ontology} v${lockCheck.locked.version}`));
    }
    console.log(chalk.gray(`Kinds: ${Object.keys(config.kinds ?? {}).length} | Rules: ${config.closureRules.length} | Relationships: ${(config.relationshipTypes ?? []).length}`));

    // 2b. Load ontology registries (SysML-driven kind/relationship discovery)
    let ontologyRegistries: BuilderRegistries | undefined;
    try {
        const loadResult = await loadOntologyRegistries(configPath);
        if (loadResult.fileCount > 0) {
            ontologyRegistries = loadResult.registries;
            const kr = loadResult.registries.kindRegistry;
            const rr = loadResult.registries.relationshipRegistry;
            console.log(chalk.gray(
                `Ontology: ${kr?.size ?? 0} kinds, ${rr?.size ?? 0} relationships ` +
                `(from ${loadResult.fileCount} SysML files)`
            ));
        }
    } catch (e) {
        console.log(chalk.yellow(`  ⚠ Could not load ontology registries: ${e instanceof Error ? e.message : e}`));
    }

    // 3. Find SysML files
    const sysmlFiles = findSysmlFiles(cwd);
    if (sysmlFiles.length === 0) {
        console.error(chalk.yellow('⚠️  No .sysml files found.'));
        return;
    }
    console.log(chalk.gray(`Files: ${sysmlFiles.length} .sysml files\n`));

    // 4. Parse
    const { documents, errors: parseErrors } = await parseFiles(sysmlFiles, cwd + '/');
    if (parseErrors.length > 0) {
        console.log(chalk.red.bold(`Parse Errors (${parseErrors.length}):`));
        for (const err of parseErrors) {
            const loc = err.line ? `:${err.line}:${err.column || 0}` : '';
            console.log(chalk.red(`  ${err.file}${loc}: ${err.message}`));
        }
        console.log();
    }

    // 5. Build model
    const model = buildMemoModel(documents, config, parseErrors, ontologyRegistries);
    console.log(chalk.cyan(`Model: ${model.elements.size} elements, ${model.relationships.length} relationships\n`));

    // 6. Validate
    const result = validateModel(model, config);

    // Print violations grouped by severity
    const errors = result.violations.filter(v => v.severity === 'error');
    const warnings = result.violations.filter(v => v.severity === 'warning');
    const infos = result.violations.filter(v => v.severity === 'info');

    if (errors.length > 0) {
        console.log(chalk.red.bold(`Errors (${errors.length}):`));
        for (const v of errors) {
            console.log(chalk.red(`  ✖ [${v.ruleId}] ${v.elementKind}/${v.elementName}: ${v.description}`));
        }
        console.log();
    }

    if (warnings.length > 0) {
        console.log(chalk.yellow.bold(`Warnings (${warnings.length}):`));
        for (const v of warnings) {
            console.log(chalk.yellow(`  ⚠ [${v.ruleId}] ${v.elementKind}/${v.elementName}: ${v.description}`));
        }
        console.log();
    }

    if (infos.length > 0) {
        console.log(chalk.blue.bold(`Info (${infos.length}):`));
        for (const v of infos) {
            console.log(chalk.blue(`  ℹ [${v.ruleId}] ${v.elementKind}/${v.elementName}: ${v.description}`));
        }
        console.log();
    }

    // 7. Completeness
    const completeness = computeCompleteness(model, result, config);

    console.log(chalk.bold('Completeness by Layer:'));
    for (const layer of completeness.layers) {
        if (layer.totalElements === 0) continue;
        const pct = layer.percentage;
        const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
        const bar = makeBar(pct);
        console.log(`  ${layer.layerLabel.padEnd(22)} ${color(bar)} ${color(`${pct}%`)} (${layer.completeElements}/${layer.totalElements})`);
    }

    console.log();
    const overallColor = completeness.overall >= 80 ? chalk.green : completeness.overall >= 50 ? chalk.yellow : chalk.red;
    console.log(chalk.bold(`Overall: ${overallColor(completeness.overall + '%')} (${completeness.completeElements}/${completeness.totalElements} elements complete)`));
    console.log(chalk.gray(`Rules: ${result.rulesEvaluated} evaluated, ${result.rulesPassed} passed, ${result.violations.length} violations\n`));

    if (errors.length > 0) {
        process.exitCode = 1;
    }
}

function makeBar(pct: number, width: number = 20): string {
    const filled = Math.round(pct / 100 * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

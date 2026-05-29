// ─── memo rules ──────────────────────────────────────────────────────────────
//
// CLI subcommands for consistency rule management:
//   memo rules list     — list all rules with category and severity
//   memo rules check    — evaluate rules against the current model
//   memo rules explain  — show detailed info for a specific rule
//   memo rules coverage — show coverage rules grouped by standard
// ─────────────────────────────────────────────────────────────────────────────

import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import chalk from 'chalk';
import {
    findConfigFile,
    parseFiles,
    buildMemoModel,
    loadOntologyRegistries,
    RuleRegistry,
    ConstraintInterpreter,
    evaluateClosureRules,
} from '@memo/core';
// parseFiles still needed by rulesCheckCommand for project SysML files
import type { BuilderRegistries, ClosureRule } from '@memo/core';
import { loadAndResolveConfig } from '../server/config-resolver.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function loadContext(projectDir?: string) {
    const cwd = resolve(projectDir || process.cwd());
    const configPath = findConfigFile(cwd);
    if (!configPath) {
        console.error(chalk.red('❌ No memo config found. Run `memo init` first.'));
        process.exit(1);
    }

    const config = loadAndResolveConfig(configPath);

    // Load ontology registries
    let ontologyRegistries: BuilderRegistries | undefined;
    let ruleRegistry: RuleRegistry | undefined;
    try {
        const loadResult = await loadOntologyRegistries(configPath);
        if (loadResult.fileCount > 0) {
            ontologyRegistries = loadResult.registries;

            // Build rule registry from already-parsed ontology documents
            ruleRegistry = new RuleRegistry();
            ruleRegistry.populateFromDocuments(loadResult.parsedDocuments);
        }
    } catch {
        // Ontology loading optional
    }

    // Build constraint interpreter merging config + ontology rules
    const interpreter = new ConstraintInterpreter();
    interpreter.loadFromConfig(config.closureRules);
    if (ruleRegistry) {
        interpreter.loadFromRegistry(ruleRegistry);
    }

    return { cwd, configPath, config, ontologyRegistries, ruleRegistry, interpreter };
}

function severityIcon(severity: string): string {
    switch (severity) {
        case 'error': return chalk.red('✖');
        case 'warning': return chalk.yellow('⚠');
        case 'info': return chalk.blue('ℹ');
        default: return ' ';
    }
}

// ─── memo rules list ─────────────────────────────────────────────────────────

export type RulesFormat = 'text' | 'json';

export async function rulesListCommand(
    projectDir?: string,
    options?: { format?: RulesFormat; category?: string }
): Promise<void> {
    const format = options?.format || 'text';
    const { interpreter, ruleRegistry } = await loadContext(projectDir);

    // Combine all rules from all sources
    const allRules = ruleRegistry?.entries() ?? [];
    const filteredRules = options?.category
        ? allRules.filter(r => r.category === options.category)
        : allRules;

    if (format === 'json') {
        console.log(JSON.stringify(filteredRules, null, 2));
        return;
    }

    console.log(chalk.bold('\n📏 Consistency Rules\n'));

    if (filteredRules.length === 0) {
        console.log(chalk.gray('  No rules found.'));
        return;
    }

    // Group by category
    const byCategory = new Map<string, typeof filteredRules>();
    for (const rule of filteredRules) {
        const cat = rule.category || 'uncategorized';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(rule);
    }

    for (const [category, rules] of byCategory) {
        console.log(chalk.bold.cyan(`  ${category.toUpperCase()} (${rules.length})`));
        for (const rule of rules) {
            const icon = severityIcon(rule.severity);
            const strength = chalk.gray(`[${rule.strength}]`);
            console.log(`    ${icon} ${chalk.white(rule.id)} ${rule.name} ${strength}`);
            console.log(`      ${chalk.gray(rule.description || rule.rationaleText)}`);
        }
        console.log();
    }

    console.log(chalk.gray(`  Total: ${filteredRules.length} rules`));
}

// ─── memo rules check ────────────────────────────────────────────────────────

export async function rulesCheckCommand(
    projectDir?: string,
    options?: { format?: RulesFormat }
): Promise<void> {
    const format = options?.format || 'text';
    const { cwd, config, ontologyRegistries, interpreter } = await loadContext(projectDir);

    // Parse project SysML files
    const sysmlFiles = findSysmlFiles(cwd);
    if (sysmlFiles.length === 0) {
        console.error(chalk.red('❌ No .sysml files found.'));
        process.exit(1);
    }

    const parseResult = await parseFiles(sysmlFiles);
    const model = buildMemoModel(parseResult.documents, config, parseResult.errors, ontologyRegistries);

    // Get merged rules from interpreter
    const rules = interpreter.toClosureRules();
    const result = evaluateClosureRules(model, rules);

    if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(chalk.bold('\n📋 Rule Check Results\n'));
    console.log(chalk.gray(`  Rules evaluated: ${result.rulesEvaluated}`));
    console.log(chalk.gray(`  Rules passed:    ${result.rulesPassed}`));
    console.log(chalk.gray(`  Violations:      ${result.violations.length}`));
    console.log();

    if (result.violations.length === 0) {
        console.log(chalk.green('  ✅ All rules passed!'));
        return;
    }

    // Group violations by rule
    const byRule = new Map<string, typeof result.violations>();
    for (const v of result.violations) {
        if (!byRule.has(v.ruleId)) byRule.set(v.ruleId, []);
        byRule.get(v.ruleId)!.push(v);
    }

    for (const [ruleId, violations] of byRule) {
        const first = violations[0];
        const icon = severityIcon(first.severity);
        console.log(`  ${icon} ${chalk.white(ruleId)}: ${first.description} (${violations.length} violations)`);
        for (const v of violations.slice(0, 5)) {
            console.log(`    ${chalk.gray('→')} ${v.elementKind}/${v.elementName} ${chalk.gray(`(${v.elementId})`)}`);
        }
        if (violations.length > 5) {
            console.log(chalk.gray(`    ... and ${violations.length - 5} more`));
        }
    }
}

// ─── memo rules explain ──────────────────────────────────────────────────────

export async function rulesExplainCommand(
    ruleId: string,
    projectDir?: string,
    options?: { format?: RulesFormat }
): Promise<void> {
    const format = options?.format || 'text';
    const { ruleRegistry, interpreter } = await loadContext(projectDir);

    // Look up in registry first, then in interpreter
    const registryEntry = ruleRegistry?.getRule(ruleId);
    const constraint = interpreter.getConstraints().find(c => c.rule.id === ruleId);

    if (!registryEntry && !constraint) {
        console.error(chalk.red(`❌ Rule "${ruleId}" not found.`));
        process.exit(1);
    }

    if (format === 'json') {
        console.log(JSON.stringify(registryEntry ?? constraint?.rule, null, 2));
        return;
    }

    console.log(chalk.bold(`\n📏 Rule: ${ruleId}\n`));

    if (registryEntry) {
        console.log(`  ${chalk.cyan('Name:')}         ${registryEntry.name}`);
        console.log(`  ${chalk.cyan('Description:')}  ${registryEntry.description}`);
        console.log(`  ${chalk.cyan('Applies to:')}   ${registryEntry.appliesTo}`);
        console.log(`  ${chalk.cyan('Predicate:')}    ${registryEntry.predicate}`);
        console.log(`  ${chalk.cyan('Strength:')}     ${registryEntry.strength}`);
        console.log(`  ${chalk.cyan('Severity:')}     ${registryEntry.severity}`);
        console.log(`  ${chalk.cyan('Category:')}     ${registryEntry.category}`);
        console.log(`  ${chalk.cyan('Rationale:')}    ${registryEntry.rationaleText}`);
        console.log(`  ${chalk.cyan('Source:')}       ${registryEntry.file}`);

        // Show type-specific attributes
        const attrs = registryEntry.attributes;
        if (attrs['relationshipType']) {
            console.log(`  ${chalk.cyan('Relationship:')} ${attrs['relationshipType']}`);
            console.log(`  ${chalk.cyan('Min count:')}    ${attrs['minCount'] ?? '-'}`);
            console.log(`  ${chalk.cyan('Max count:')}    ${attrs['maxCount'] || 'unlimited'}`);
            console.log(`  ${chalk.cyan('Direction:')}    ${attrs['direction'] ?? 'any'}`);
            if (attrs['relatedKinds']) {
                console.log(`  ${chalk.cyan('Related:')}      ${attrs['relatedKinds']}`);
            }
        }
        if (attrs['targetAttribute']) {
            console.log(`  ${chalk.cyan('Attribute:')}    ${attrs['targetAttribute']}`);
        }
        if (attrs['standard']) {
            console.log(`  ${chalk.cyan('Standard:')}     ${attrs['standard']}`);
            console.log(`  ${chalk.cyan('Clause:')}       ${attrs['clause'] ?? '-'}`);
        }
        if (attrs['conditionAttribute']) {
            console.log(`  ${chalk.cyan('Condition:')}    ${attrs['conditionAttribute']} ${attrs['conditionOperator']} ${attrs['conditionValues']}`);
        }
    } else if (constraint) {
        const rule = constraint.rule;
        console.log(`  ${chalk.cyan('Description:')}  ${rule.description}`);
        console.log(`  ${chalk.cyan('Entity:')}       ${rule.entity}`);
        console.log(`  ${chalk.cyan('Severity:')}     ${rule.severity}`);
        console.log(`  ${chalk.cyan('Source:')}       ${constraint.source}`);
        console.log(`  ${chalk.cyan('Rule type:')}    ${rule.rule.type}`);
    }
}

// ─── memo rules coverage ────────────────────────────────────────────────────

export async function rulesCoverageCommand(
    projectDir?: string,
    options?: { format?: RulesFormat }
): Promise<void> {
    const format = options?.format || 'text';
    const { ruleRegistry } = await loadContext(projectDir);

    const coverageRules = ruleRegistry?.byCategory('coverage') ?? [];

    if (format === 'json') {
        // Group by standard
        const grouped: Record<string, typeof coverageRules> = {};
        for (const rule of coverageRules) {
            const std = rule.attributes['standard'] || 'unspecified';
            if (!grouped[std]) grouped[std] = [];
            grouped[std].push(rule);
        }
        console.log(JSON.stringify(grouped, null, 2));
        return;
    }

    console.log(chalk.bold('\n📊 Coverage Rules by Standard\n'));

    if (coverageRules.length === 0) {
        console.log(chalk.gray('  No coverage rules found.'));
        return;
    }

    // Group by standard
    const byStandard = new Map<string, typeof coverageRules>();
    for (const rule of coverageRules) {
        const std = rule.attributes['standard'] || 'unspecified';
        if (!byStandard.has(std)) byStandard.set(std, []);
        byStandard.get(std)!.push(rule);
    }

    for (const [standard, rules] of byStandard) {
        console.log(chalk.bold.cyan(`  ${standard} (${rules.length} rules)`));
        for (const rule of rules) {
            const clause = rule.attributes['clause'] ? chalk.gray(`[${rule.attributes['clause']}]`) : '';
            const icon = severityIcon(rule.severity);
            console.log(`    ${icon} ${chalk.white(rule.id)} ${rule.name} ${clause}`);
            console.log(`      ${chalk.gray(`Checks: ${rule.attributes['coverageTarget'] || rule.appliesTo}`)}`);
        }
        console.log();
    }

    console.log(chalk.gray(`  Total: ${coverageRules.length} coverage rules across ${byStandard.size} standards`));
}

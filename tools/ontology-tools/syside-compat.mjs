// ─── Syside Compatibility Check ─────────────────────────────────────────────
//
// Verifies structural invariants required by Syside (Sensmetry) and other
// standard SysML v2 tools for indexing and cross-package import resolution.
//
// Checks:
//   C1: Package declarations are unique (no two files declare same qualified name)
//   C2: Every import target resolves to a declared package
//   C3: No Langium-only syntax that standard tools cannot parse
//   C4: Directory path structurally consistent with namespace (ADR-1-12 §4)
//   C5: No hyphens in path segments (SysML v2 qualified names forbid them)
//
// Exit code 0 = all pass; 1 = at least one failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectSysmlFiles, REPO_ROOT } from './sysml-reader.mjs';

const ONTOLOGY_DIR = join(REPO_ROOT, 'vendor', 'memo-sysmlv2');
const GPCA_MODEL_DIR = join(REPO_ROOT, 'examples', 'gpca-pump', 'model');

const COLORS = {
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function scanFiles() {
    const files = [
        ...collectSysmlFiles(ONTOLOGY_DIR),
        ...collectSysmlFiles(GPCA_MODEL_DIR),
    ];
    const results = [];
    for (const f of files) {
        const text = readFileSync(f, 'utf-8');
        const relPath = relative(REPO_ROOT, f);

        const pkgMatch = text.match(/^package\s+([\w:]+)\s*\{/m);
        const qualifiedName = pkgMatch ? pkgMatch[1] : null;

        const imports = [];
        const importRe = /(?:private|public)?\s*import\s+([\w:]+)::\*/g;
        let m;
        while ((m = importRe.exec(text)) !== null) {
            imports.push(m[1]);
        }

        results.push({ file: f, relPath, text, qualifiedName, imports });
    }
    return results;
}

function checkC1UniquePackages(entries) {
    const seen = new Map();
    const errors = [];
    for (const e of entries) {
        if (!e.qualifiedName) continue;
        if (seen.has(e.qualifiedName)) {
            errors.push(`Duplicate package "${e.qualifiedName}":\n    ${seen.get(e.qualifiedName)}\n    ${e.relPath}`);
        } else {
            seen.set(e.qualifiedName, e.relPath);
        }
    }
    return errors;
}

function checkC2ImportResolution(entries) {
    const declared = new Set(entries.map(e => e.qualifiedName).filter(Boolean));
    const errors = [];
    for (const e of entries) {
        for (const imp of e.imports) {
            if (!declared.has(imp)) {
                errors.push(`Unresolved import "${imp}::*" in ${e.relPath}`);
            }
        }
    }
    return errors;
}

const LANGIUM_ONLY_PATTERNS = [
    { pattern: /\bentry\s+:/, label: 'Langium entry keyword' },
    { pattern: /\bterminal\s+/, label: 'Langium terminal rule' },
    { pattern: /\bfragment\s+/, label: 'Langium fragment rule' },
    { pattern: /\bhidden\s*\(/, label: 'Langium hidden terminal' },
    { pattern: /\breturns\s+\w+/, label: 'Langium returns clause' },
];

function checkC3NoLangiumSyntax(entries) {
    const errors = [];
    for (const e of entries) {
        const stripped = e.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        for (const { pattern, label } of LANGIUM_ONLY_PATTERNS) {
            if (pattern.test(stripped)) {
                errors.push(`${label} found in ${e.relPath}`);
            }
        }
    }
    return errors;
}

function checkC4DirectoryNamespaceMapping(entries) {
    const errors = [];
    for (const e of entries) {
        if (!e.qualifiedName) continue;
        const segments = e.qualifiedName.split('::');
        if (segments[0] !== 'memo') continue;

        const dirFromFile = dirname(e.relPath);
        const dirSegments = dirFromFile.split('/');

        const ONTOLOGY_PREFIX = 'vendor/memo-sysmlv2/';
        if (e.relPath.startsWith(ONTOLOGY_PREFIX)) {
            const nsLayer = segments[1];
            const innerPath = e.relPath.slice(ONTOLOGY_PREFIX.length);
            const innerDirSegments = dirname(innerPath).split('/');
            const dirLayer = innerDirSegments[0];
            if (dirLayer && nsLayer !== dirLayer && nsLayer !== 'library') {
                errors.push(`Directory/namespace mismatch: ${e.relPath} declares ${e.qualifiedName} (expected dir segment "${nsLayer}", got "${dirLayer}")`);
            }
        }
    }
    return errors;
}

function checkC5NoHyphensInPaths(entries) {
    const errors = [];
    for (const e of entries) {
        if (e.relPath.match(/[^/]+-[^/]+\.sysml/)) {
            errors.push(`Hyphen in filename: ${e.relPath} (SysML v2 qualified names forbid hyphens)`);
        }
    }
    return errors;
}

export function runAllChecks() {
    const entries = scanFiles();
    const checks = [
        { id: 'C1', name: 'Unique package declarations', fn: () => checkC1UniquePackages(entries) },
        { id: 'C2', name: 'Import target resolution', fn: () => checkC2ImportResolution(entries) },
        { id: 'C3', name: 'No Langium-only syntax', fn: () => checkC3NoLangiumSyntax(entries) },
        { id: 'C4', name: 'Directory↔namespace mapping', fn: () => checkC4DirectoryNamespaceMapping(entries) },
        { id: 'C5', name: 'No hyphens in path segments', fn: () => checkC5NoHyphensInPaths(entries) },
    ];

    let totalErrors = 0;
    const results = [];

    for (const check of checks) {
        const errors = check.fn();
        totalErrors += errors.length;
        results.push({ ...check, errors });
    }

    return { entries, results, totalErrors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { entries, results, totalErrors } = runAllChecks();

    console.log(COLORS.bold(`\nSyside Compatibility Check — ${entries.length} files\n`));

    for (const { id, name, errors } of results) {
        if (errors.length === 0) {
            console.log(`  ${COLORS.green('✓')} ${id}: ${name}`);
        } else {
            console.log(`  ${COLORS.red('✗')} ${id}: ${name} (${errors.length} error${errors.length > 1 ? 's' : ''})`);
            for (const err of errors) {
                console.log(`      ${COLORS.red(err)}`);
            }
        }
    }

    console.log();
    if (totalErrors === 0) {
        console.log(COLORS.green('All Syside compatibility checks passed.'));
    } else {
        console.log(COLORS.red(`${totalErrors} error(s) found.`));
    }
    process.exit(totalErrors > 0 ? 1 : 0);
}

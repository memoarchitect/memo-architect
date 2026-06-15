import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { VENDOR_ONTOLOGY_SRC_DIR } from '../model/paths.js';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

const ONTOLOGY_ROOT = resolve(__dirname, '../../../..', VENDOR_ONTOLOGY_SRC_DIR);

// When ONTOLOGY_ROOT is the memo-sysmlv2 submodule, only its flattened ontology
// content is in scope. Skip the submodule's own scaffold: examples/gpca-pump
// (the same reference model the monorepo carries under examples/, scanned
// separately via GPCA_MODEL_DIR), per-package workspace dirs, installed deps,
// build output, and git metadata.
const VENDOR_SKIP_DIRS = new Set(['examples', 'packages', 'node_modules', 'output', '.git', '.turbo']);

function collectSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (VENDOR_SKIP_DIRS.has(entry.name)) continue;
            files.push(...collectSysmlFiles(full));
        } else if (entry.name.endsWith('.sysml')) {
            files.push(full);
        }
    }
    return files;
}

const EXAMPLES_ROOT = resolve(__dirname, '../../../../examples');
const STDLIB_WRAPPER_DIR = resolve(ONTOLOGY_ROOT, 'base', 'stdlib');

const KERNEL_LIBRARY_PACKAGES = [
    'ScalarValues', 'BaseFunctions', 'Collections',
    'ISQBase', 'ISQ', 'SI', 'USCustomary',
    'MeasurementReferences', 'Quantities',
    'Time', 'Duration',
    'Performances', 'Actions', 'Calculations',
    'ControlPerformances', 'TransitionPerformances',
    'StatePerformances', 'Triggers',
    'KerML', 'SysML',
];

const KERNEL_IMPORT_RE = new RegExp(
    `^\\s*(?:private\\s+|public\\s+)?import\\s+(?:all\\s+)?(${KERNEL_LIBRARY_PACKAGES.join('|')})(?:::|;|\\s)`,
    'gm',
);

const sysmlFiles = collectSysmlFiles(ONTOLOGY_ROOT);

describe('SysML v2 Conformance: ontology packages parse with zero diagnostics', () => {
    it('discovers ontology files', () => {
        expect(sysmlFiles.length).toBeGreaterThanOrEqual(30);
    });

    for (const file of sysmlFiles) {
        const rel = relative(ONTOLOGY_ROOT, file);
        it(`${rel} — zero parse errors`, async () => {
            const source = readFileSync(file, 'utf-8');
            const doc = await parse(source);
            const errors = [
                ...doc.parseResult.lexerErrors,
                ...doc.parseResult.parserErrors,
            ];
            if (errors.length > 0) {
                const msgs = errors.slice(0, 10).map((e: any) => e.message);
                throw new Error(
                    `${errors.length} parse error(s) in ${rel}:\n${msgs.join('\n')}`
                );
            }
            expect(errors).toHaveLength(0);
        });
    }
});

describe('DD-2: no kernel-path standard library imports outside stdlib wrapper (ADR-1-13)', () => {
    const roots = [
        { label: 'ontology', dir: ONTOLOGY_ROOT },
        { label: 'examples', dir: EXAMPLES_ROOT },
    ];

    const allFiles: { label: string; file: string }[] = [];
    for (const { label, dir } of roots) {
        if (!existsSync(dir)) continue;
        for (const f of collectSysmlFiles(dir)) {
            if (f.startsWith(STDLIB_WRAPPER_DIR)) continue;
            allFiles.push({ label, file: f });
        }
    }

    it('discovers SysML files to audit', () => {
        expect(allFiles.length).toBeGreaterThanOrEqual(30);
    });

    for (const { label, file } of allFiles) {
        const rel = relative(resolve(__dirname, '../../../..'), file);
        it(`${rel} — no kernel-path imports`, () => {
            const source = readFileSync(file, 'utf-8');
            const violations: string[] = [];
            let m: RegExpExecArray | null;
            KERNEL_IMPORT_RE.lastIndex = 0;
            while ((m = KERNEL_IMPORT_RE.exec(source)) !== null) {
                const line = source.slice(0, m.index).split('\n').length;
                violations.push(`line ${line}: import of '${m[1]}' — use memo::base::stdlib::* instead`);
            }
            if (violations.length > 0) {
                throw new Error(
                    `${violations.length} kernel-path import(s) in ${rel}:\n${violations.join('\n')}`
                );
            }
            expect(violations).toHaveLength(0);
        });
    }
});

const GPCA_MODEL_DIR = resolve(__dirname, '../../../../examples/gpca-pump/model');

describe('DD-4: Syside compatibility — structural invariants', () => {
    // EE-5: packages are declared in nested form (`package memo { package base { … } }`)
    // because qualified names in a package *declaration* are non-standard SysML v2 and
    // are rejected by external tools (sysand/SysIDE/SysON). Full qualified names are
    // therefore reconstructed from the brace-nesting, not the first `package` line.
    // `allPackages` = every declared FQN (wrappers included; wrappers are legitimately
    // split across files). `leafPackages` = content-bearing innermost packages.
    function extractPackages(text: string): { all: string[]; leaves: string[] } {
        const clean = text
            .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
            .replace(/\/\/[^\n]*/g, '')          // line comments
            .replace(/"(?:[^"\\]|\\.)*"/g, '""'); // string literals
        const tokenRe = /(?:library\s+)?package\s+([A-Za-z_]\w*)\s*\{|\{|\}/g;
        const all: string[] = [];
        const leaves: string[] = [];
        // stack frames: package name (string) or null for a non-package brace
        const stack: (string | null)[] = [];
        const hasChild = new Map<string, boolean>();
        let m: RegExpExecArray | null;
        while ((m = tokenRe.exec(clean)) !== null) {
            if (m[1]) {
                const parentSegs = stack.filter((s): s is string => s !== null);
                const fqn = [...parentSegs, m[1]].join('::');
                all.push(fqn);
                if (parentSegs.length > 0) hasChild.set(parentSegs.join('::'), true);
                hasChild.set(fqn, hasChild.get(fqn) ?? false);
                stack.push(m[1]);
            } else if (m[0] === '{') {
                stack.push(null);
            } else {
                stack.pop();
            }
        }
        for (const fqn of all) if (!hasChild.get(fqn)) leaves.push(fqn);
        return { all, leaves };
    }

    function collectAllSysml(): { relPath: string; text: string; allPackages: string[]; leafPackages: string[]; imports: string[] }[] {
        const dirs = [ONTOLOGY_ROOT, GPCA_MODEL_DIR];
        const entries: { relPath: string; text: string; allPackages: string[]; leafPackages: string[]; imports: string[] }[] = [];
        const root = resolve(__dirname, '../../../..');
        for (const dir of dirs) {
            if (!existsSync(dir)) continue;
            for (const f of collectSysmlFiles(dir)) {
                const text = readFileSync(f, 'utf-8');
                const relPath = relative(root, f);
                const { all, leaves } = extractPackages(text);
                const imports: string[] = [];
                const importRe = /(?:private|public)?\s*import\s+([\w:]+)::\*/g;
                let m: RegExpExecArray | null;
                while ((m = importRe.exec(text)) !== null) {
                    imports.push(m[1]);
                }
                entries.push({ relPath, text, allPackages: all, leafPackages: leaves, imports });
            }
        }
        return entries;
    }

    const allEntries = collectAllSysml();
    // Every declared package FQN (wrappers + leaves) across all files is a valid import target.
    const declaredPackages = new Set(allEntries.flatMap(e => e.allPackages));

    it('C1: no duplicate leaf (content-bearing) package declarations', () => {
        // Wrapper packages (memo, memo::base, …) are intentionally shared across files;
        // only the innermost content packages must be unique.
        const seen = new Map<string, string>();
        const dupes: string[] = [];
        for (const e of allEntries) {
            for (const leaf of e.leafPackages) {
                if (seen.has(leaf)) {
                    dupes.push(`"${leaf}" declared in both ${seen.get(leaf)} and ${e.relPath}`);
                } else {
                    seen.set(leaf, e.relPath);
                }
            }
        }
        expect(dupes, dupes.join('\n')).toHaveLength(0);
    });

    it('C2: every import target resolves to a declared package', () => {
        const kernelSet = new Set(KERNEL_LIBRARY_PACKAGES);
        const unresolved: string[] = [];
        for (const e of allEntries) {
            for (const imp of e.imports) {
                if (kernelSet.has(imp)) continue;
                if (!declaredPackages.has(imp)) {
                    unresolved.push(`${e.relPath}: unresolved import "${imp}::*"`);
                }
            }
        }
        expect(unresolved, unresolved.join('\n')).toHaveLength(0);
    });

    it('EE-5: no bare shorthand redefinitions (standard SysML v2 requires `attribute redefines`/`:>>`)', () => {
        // `title = "x";` (a bare feature value with no keyword/operator) is a MEMO
        // grammar extension. Standard SysML v2 requires the redefinition operator:
        // `attribute redefines title = "x";` or `:>> title = "x";`. The MEMO serializer
        // already emits the `attribute redefines` form — authored files must match.
        const violations: string[] = [];
        // A statement line whose first token is immediately followed by ` = ` is a bare
        // assignment; legitimate forms lead with `attribute`/`ref`/`part`/`:>>`, so their
        // first token is the keyword, not the assigned name.
        const re = /^[ \t]+([A-Za-z_]\w*) = [^=]/gm;
        for (const e of allEntries) {
            const stripped = e.text
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/[^\n]*/g, '');
            let m: RegExpExecArray | null;
            re.lastIndex = 0;
            while ((m = re.exec(stripped)) !== null) {
                const line = stripped.slice(0, m.index).split('\n').length;
                violations.push(`${e.relPath}:${line}: bare "${m[1]} = …" — use "attribute redefines ${m[1]} = …"`);
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('EE-5: no qualified names in package declarations (portable SysML v2)', () => {
        // `package memo::a::b { }` is a MEMO grammar extension rejected by external tools.
        // Every package declaration must use a single-identifier name and nest instead.
        const violations: string[] = [];
        for (const e of allEntries) {
            const stripped = e.text
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/[^\n]*/g, '');
            const re = /(?:^|\n)\s*(?:library\s+)?package\s+([A-Za-z_]\w*(?:::[A-Za-z_]\w*)+)\s*\{/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(stripped)) !== null) {
                violations.push(`${e.relPath}: qualified package declaration "${m[1]}" — nest packages instead`);
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('C3: no Langium-only syntax in SysML files', () => {
        const langiumPatterns = [
            { pattern: /\bentry\s+:/, label: 'entry keyword' },
            { pattern: /\bterminal\s+/, label: 'terminal rule' },
            { pattern: /\bfragment\s+/, label: 'fragment rule' },
            { pattern: /\bhidden\s*\(/, label: 'hidden terminal' },
            { pattern: /\breturns\s+\w+/, label: 'returns clause' },
        ];
        const violations: string[] = [];
        for (const e of allEntries) {
            const stripped = e.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
            for (const { pattern, label } of langiumPatterns) {
                if (pattern.test(stripped)) {
                    violations.push(`${e.relPath}: ${label}`);
                }
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('C4: ontology directory segments match namespace segments', () => {
        const mismatches: string[] = [];
        const ONTOLOGY_PREFIX = `${VENDOR_ONTOLOGY_SRC_DIR}/`;
        for (const e of allEntries) {
            if (!e.relPath.startsWith(ONTOLOGY_PREFIX)) continue;
            for (const leaf of e.leafPackages) {
                const nsSegments = leaf.split('::');
                if (nsSegments[0] !== 'memo') continue;
                if (nsSegments[1] === 'library') continue;
                const innerPath = e.relPath.slice(ONTOLOGY_PREFIX.length);
                const dirSegments = dirname(innerPath).split('/');
                const dirLayer = dirSegments[0];
                // Root-level files (e.g. medical_device_library.sysml) have dirname "." — no layer dir to match.
                if (dirLayer === '.') continue;
                if (dirLayer && nsSegments[1] !== dirLayer) {
                    mismatches.push(`${e.relPath}: dir segment "${dirLayer}" vs namespace "${nsSegments[1]}"`);
                }
            }
        }
        expect(mismatches, mismatches.join('\n')).toHaveLength(0);
    });

    it('C5: no hyphens in .sysml filenames (ADR-1-12)', () => {
        const bad = allEntries
            .filter(e => /[^/]+-[^/]+\.sysml/.test(e.relPath))
            .map(e => e.relPath);
        expect(bad, bad.join('\n')).toHaveLength(0);
    });
});

describe('DD-5: sysand publish dry-run — publishable packages', () => {
    const PACKAGE_MAP: { name: string; level: string; dirs: string[]; rootFiles?: string[] }[] = [
        { name: '@memo/sysml-base', level: 'L0', dirs: ['base', 'core'] },
        { name: '@memo/ontology', level: 'L1', dirs: ['architecture', 'compliance', 'viewpoints', 'views'], rootFiles: ['medical_device_library.sysml'] },
        { name: '@memo/methodology-default', level: 'L2', dirs: ['methodology'] },
    ];

    function collectPackageFiles(pkg: typeof PACKAGE_MAP[0]): string[] {
        const files: string[] = [];
        for (const dir of pkg.dirs) {
            const dirPath = resolve(ONTOLOGY_ROOT, dir);
            if (existsSync(dirPath)) files.push(...collectSysmlFiles(dirPath));
        }
        if (pkg.rootFiles) {
            for (const f of pkg.rootFiles) {
                const fp = resolve(ONTOLOGY_ROOT, f);
                if (existsSync(fp)) files.push(fp);
            }
        }
        return files;
    }

    for (const pkg of PACKAGE_MAP) {
        it(`${pkg.name} (${pkg.level}) has SysML files`, () => {
            const files = collectPackageFiles(pkg);
            expect(files.length).toBeGreaterThan(0);
        });

        it(`${pkg.name} (${pkg.level}) all files are readable and non-empty`, () => {
            const files = collectPackageFiles(pkg);
            const empty: string[] = [];
            const unreadable: string[] = [];
            for (const f of files) {
                try {
                    const content = readFileSync(f, 'utf-8');
                    if (content.trim().length === 0) empty.push(relative(ONTOLOGY_ROOT, f));
                } catch {
                    unreadable.push(relative(ONTOLOGY_ROOT, f));
                }
            }
            expect(unreadable, `Unreadable: ${unreadable.join(', ')}`).toHaveLength(0);
            expect(empty, `Empty: ${empty.join(', ')}`).toHaveLength(0);
        });

        it(`${pkg.name} (${pkg.level}) all files parse without errors`, async () => {
            const files = collectPackageFiles(pkg);
            const errors: string[] = [];
            for (const f of files) {
                const source = readFileSync(f, 'utf-8');
                const doc = await parse(source);
                const parseErrors = [
                    ...doc.parseResult.lexerErrors,
                    ...doc.parseResult.parserErrors,
                ];
                if (parseErrors.length > 0) {
                    errors.push(`${relative(ONTOLOGY_ROOT, f)}: ${parseErrors.length} error(s)`);
                }
            }
            expect(errors, errors.join('\n')).toHaveLength(0);
        });

        it(`${pkg.name} (${pkg.level}) produces valid .kpar artifact name`, () => {
            const safeName = pkg.name.replace(/^@/, '').replace(/\//g, '-');
            const kparName = `${safeName}-0.1.0.kpar`;
            expect(kparName).toMatch(/^[a-z0-9-]+-\d+\.\d+\.\d+\.kpar$/);
        });
    }

    it('sysand-publish-dry-run.mjs exits cleanly', async () => {
        const { execSync } = await import('node:child_process');
        const repoRoot = resolve(__dirname, '../../../..');
        const result = execSync('node tools/ontology-tools/sysand-publish-dry-run.mjs', {
            cwd: repoRoot,
            encoding: 'utf-8',
            timeout: 30_000,
        });
        expect(result).toContain('All packages pass dry-run');
        expect(result).toContain('memo-sysml-base-0.1.0.kpar');
        expect(result).toContain('memo-ontology-0.1.0.kpar');
        expect(result).toContain('memo-methodology-default-0.1.0.kpar');
    });
});

describe('DD-6: naming + casing lint (ADR-1-12)', () => {
    const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;
    const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;
    const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

    const DEF_CONSTRUCTS = ['part', 'item', 'enum', 'requirement', 'action', 'port', 'connection', 'attribute', 'view', 'viewpoint'];
    const DEF_RE = new RegExp(
        `(?:^|\\n)\\s*(?:${DEF_CONSTRUCTS.join('|')})\\s+def\\s+(\\w+)`,
        'g',
    );
    const ATTR_RE = /(?:^|\n)\s*attribute\s+(\w+)\s*(?::|;|=)/g;

    function collectAllSysml(): { relPath: string; text: string }[] {
        const dirs = [ONTOLOGY_ROOT, GPCA_MODEL_DIR];
        const entries: { relPath: string; text: string }[] = [];
        const root = resolve(__dirname, '../../../..');
        for (const dir of dirs) {
            if (!existsSync(dir)) continue;
            for (const f of collectSysmlFiles(dir)) {
                entries.push({
                    relPath: relative(root, f),
                    text: readFileSync(f, 'utf-8'),
                });
            }
        }
        return entries;
    }

    const allEntries = collectAllSysml();

    it('discovers SysML files to audit', () => {
        expect(allEntries.length).toBeGreaterThanOrEqual(30);
    });

    it('N1: all type definitions use PascalCase', () => {
        const violations: string[] = [];
        for (const e of allEntries) {
            DEF_RE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = DEF_RE.exec(e.text)) !== null) {
                const name = m[1];
                if (!PASCAL_CASE_RE.test(name)) {
                    const line = e.text.slice(0, m.index).split('\n').length;
                    violations.push(`${e.relPath}:${line}: "${name}" is not PascalCase`);
                }
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('N2: all attribute names use camelCase', () => {
        const violations: string[] = [];
        for (const e of allEntries) {
            ATTR_RE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = ATTR_RE.exec(e.text)) !== null) {
                const name = m[1];
                const preceding = e.text.slice(Math.max(0, m.index - 4), m.index + m[0].length);
                if (/attribute\s+def\s/.test(preceding)) continue;
                if (!CAMEL_CASE_RE.test(name)) {
                    const line = e.text.slice(0, m.index).split('\n').length;
                    violations.push(`${e.relPath}:${line}: "${name}" is not camelCase`);
                }
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('N3: all .sysml filenames use snake_case', () => {
        const violations: string[] = [];
        for (const e of allEntries) {
            const filename = e.relPath.split('/').pop()!.replace('.sysml', '');
            if (!SNAKE_CASE_RE.test(filename)) {
                violations.push(`${e.relPath}: filename "${filename}" is not snake_case`);
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('N4: ontology directory segments use snake_case', () => {
        const ONTOLOGY_PREFIX = `${VENDOR_ONTOLOGY_SRC_DIR}/`;
        const violations: string[] = [];
        for (const e of allEntries) {
            if (!e.relPath.startsWith(ONTOLOGY_PREFIX)) continue;
            const innerPath = e.relPath.slice(ONTOLOGY_PREFIX.length);
            const segments = dirname(innerPath).split('/').filter((s) => s && s !== '.');
            for (const seg of segments) {
                if (!SNAKE_CASE_RE.test(seg)) {
                    violations.push(`${e.relPath}: directory segment "${seg}" is not snake_case`);
                }
            }
        }
        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('lint.mjs exits cleanly with zero P6 violations', async () => {
        const { execSync } = await import('node:child_process');
        const repoRoot = resolve(__dirname, '../../../..');
        const result = execSync('node tools/ontology-tools/lint.mjs', {
            cwd: repoRoot,
            encoding: 'utf-8',
            timeout: 30_000,
        });
        expect(result).toContain('lint passed');
        expect(result).not.toMatch(/P6/);
    });
});

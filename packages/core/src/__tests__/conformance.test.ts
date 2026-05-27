import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

const ONTOLOGY_ROOT = resolve(__dirname, '../../../../ontology');

function collectSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectSysmlFiles(full));
        } else if (entry.name.endsWith('.sysml')) {
            files.push(full);
        }
    }
    return files;
}

const FEEDBACK_ROOT = resolve(__dirname, '../../../../feedback');
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
        { label: 'feedback', dir: FEEDBACK_ROOT },
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
    function collectAllSysml(): { relPath: string; text: string; qualifiedName: string | null; imports: string[] }[] {
        const dirs = [ONTOLOGY_ROOT, GPCA_MODEL_DIR];
        const entries: { relPath: string; text: string; qualifiedName: string | null; imports: string[] }[] = [];
        const root = resolve(__dirname, '../../../..');
        for (const dir of dirs) {
            if (!existsSync(dir)) continue;
            for (const f of collectSysmlFiles(dir)) {
                const text = readFileSync(f, 'utf-8');
                const relPath = relative(root, f);
                const pkgMatch = text.match(/^package\s+([\w:]+)\s*\{/m);
                const qualifiedName = pkgMatch ? pkgMatch[1] : null;
                const imports: string[] = [];
                const importRe = /(?:private|public)?\s*import\s+([\w:]+)::\*/g;
                let m: RegExpExecArray | null;
                while ((m = importRe.exec(text)) !== null) {
                    imports.push(m[1]);
                }
                entries.push({ relPath, text, qualifiedName, imports });
            }
        }
        return entries;
    }

    const allEntries = collectAllSysml();
    const declaredPackages = new Set(allEntries.map(e => e.qualifiedName).filter(Boolean));

    it('C1: no duplicate package declarations', () => {
        const seen = new Map<string, string>();
        const dupes: string[] = [];
        for (const e of allEntries) {
            if (!e.qualifiedName) continue;
            if (seen.has(e.qualifiedName)) {
                dupes.push(`"${e.qualifiedName}" declared in both ${seen.get(e.qualifiedName)} and ${e.relPath}`);
            } else {
                seen.set(e.qualifiedName, e.relPath);
            }
        }
        expect(dupes, dupes.join('\n')).toHaveLength(0);
    });

    it('C2: every import target resolves to a declared package', () => {
        const unresolved: string[] = [];
        for (const e of allEntries) {
            for (const imp of e.imports) {
                if (!declaredPackages.has(imp)) {
                    unresolved.push(`${e.relPath}: unresolved import "${imp}::*"`);
                }
            }
        }
        expect(unresolved, unresolved.join('\n')).toHaveLength(0);
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
        for (const e of allEntries) {
            if (!e.qualifiedName) continue;
            if (!e.relPath.startsWith('ontology/')) continue;
            const nsSegments = e.qualifiedName.split('::');
            if (nsSegments[0] !== 'memo') continue;
            if (nsSegments[1] === 'library') continue;
            const dirSegments = dirname(e.relPath).split('/');
            const dirLayer = dirSegments[1];
            if (dirLayer && nsSegments[1] !== dirLayer) {
                mismatches.push(`${e.relPath}: dir segment "${dirLayer}" vs namespace "${nsSegments[1]}"`);
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

import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

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

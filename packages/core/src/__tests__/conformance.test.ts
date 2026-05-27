import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import { readFileSync, readdirSync } from 'node:fs';
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

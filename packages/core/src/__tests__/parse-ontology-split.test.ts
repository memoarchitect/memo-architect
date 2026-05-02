import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

const ONTOLOGY_DIRS = [
    resolve('/Users/someshkashyap/sandbox/memo/packages/ontology-arch/sysml'),
    resolve('/Users/someshkashyap/sandbox/memo/packages/ontology-process/sysml'),
];

function getSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            files.push(...getSysmlFiles(join(dir, entry.name)));
        } else if (entry.name.endsWith('.sysml')) {
            files.push(join(dir, entry.name));
        }
    }
    return files;
}

// SKIP: in-package ontology-arch/sysml + ontology-process/sysml removed in c22b2e3
// (moved to top-level ontology/). Repoint dirs when re-enabling.
describe.skip('Split ontology files', () => {
    const files: string[] = [];

    it('found expected number of files', () => {
        expect(files.length).toBeGreaterThanOrEqual(15);
    });

    for (const file of files) {
        const relPath = file
            .replace(ONTOLOGY_DIRS[0] + '/', 'ontology-arch/')
            .replace(ONTOLOGY_DIRS[1] + '/', 'ontology-process/');
        it(`parses ${relPath} without errors`, async () => {
            const source = readFileSync(file, 'utf-8');
            const doc = await parse(source);
            const errors = [
                ...doc.parseResult.lexerErrors,
                ...doc.parseResult.parserErrors,
            ];
            if (errors.length > 0) {
                const msgs = errors.slice(0, 5).map((e: any) => e.message);
                throw new Error(
                    `Parse errors in ${relPath} (${errors.length}):\n${msgs.join('\n')}`
                );
            }
            expect(errors).toHaveLength(0);
        });
    }
});

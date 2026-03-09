import { describe, it, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model, PackageDeclaration } from '../language/generated/ast.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

const SYSML_DIR = resolve(
    '/Users/someshkashyap/sandbox/memo-world/memo-architect/sysml'
);
const TEMPLATES_DIR = resolve(
    '/Users/someshkashyap/sandbox/memo-world/memo-medical/src/templates'
);

describe('Real file: memo-ontology.sysml', () => {
    it('parses without errors', async () => {
        const source = readFileSync(resolve(SYSML_DIR, 'memo-ontology.sysml'), 'utf-8');
        const doc = await parse(source);
        const errors = [
            ...doc.parseResult.lexerErrors,
            ...doc.parseResult.parserErrors,
        ];
        if (errors.length > 0) {
            // Show first 5 errors for debugging
            const msgs = errors.slice(0, 5).map((e: any) => e.message);
            throw new Error(`Parse errors (${errors.length}):\n${msgs.join('\n')}`);
        }
        expect(errors).toHaveLength(0);
    });

    it('has expected structure', async () => {
        const source = readFileSync(resolve(SYSML_DIR, 'memo-ontology.sysml'), 'utf-8');
        const doc = await parse(source);
        const model = doc.parseResult.value;

        // Should have one top-level package: MEMO_Ontology
        expect(model.members).toHaveLength(1);
        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.name).toBe('MEMO_Ontology');

        // Count member types
        const byType = new Map<string, number>();
        for (const m of pkg.members) {
            byType.set(m.$type, (byType.get(m.$type) || 0) + 1);
        }

        // Expected counts from the ontology file
        expect(byType.get('PartDefinition')).toBeGreaterThanOrEqual(30); // 30+ part defs
        expect(byType.get('RequirementDefinition')).toBeGreaterThanOrEqual(8); // requirement defs
        expect(byType.get('ActionDefinition')).toBeGreaterThanOrEqual(5); // action defs
        expect(byType.get('ConnectionDefinition')).toBeGreaterThanOrEqual(15); // 16 connection defs
        expect(byType.get('EnumDefinition')).toBeGreaterThanOrEqual(3); // enum defs
        expect(byType.get('PortDefinition')).toBeGreaterThanOrEqual(6); // port defs
        expect(byType.get('InterfaceDefinition')).toBeGreaterThanOrEqual(9); // interface defs
        expect(byType.get('AttributeDefinition')).toBeGreaterThanOrEqual(2); // attribute defs
    });
});

describe('Real file: infusion-pump.sysml', () => {
    it('parses without errors', async () => {
        const source = readFileSync(resolve(TEMPLATES_DIR, 'infusion-pump.sysml'), 'utf-8');
        const doc = await parse(source);
        const errors = [
            ...doc.parseResult.lexerErrors,
            ...doc.parseResult.parserErrors,
        ];
        if (errors.length > 0) {
            const msgs = errors.slice(0, 5).map((e: any) => e.message);
            throw new Error(`Parse errors (${errors.length}):\n${msgs.join('\n')}`);
        }
        expect(errors).toHaveLength(0);
    });

    it('has expected structure', async () => {
        const source = readFileSync(resolve(TEMPLATES_DIR, 'infusion-pump.sysml'), 'utf-8');
        const doc = await parse(source);
        const model = doc.parseResult.value;

        const pkg = model.members[0] as PackageDeclaration;
        expect(pkg.name).toBe('InfusionPump');

        const byType = new Map<string, number>();
        for (const m of pkg.members) {
            byType.set(m.$type, (byType.get(m.$type) || 0) + 1);
        }

        // Expected from infusion-pump.sysml
        expect(byType.get('ImportDeclaration')).toBe(1);
        expect(byType.get('PartUsage')).toBeGreaterThanOrEqual(25); // many part usages
        expect(byType.get('RequirementUsage')).toBeGreaterThanOrEqual(15); // requirement usages
        expect(byType.get('ActionUsage')).toBeGreaterThanOrEqual(8); // action usages
        expect(byType.get('PortUsage')).toBeGreaterThanOrEqual(5); // port usages
        expect(byType.get('ConnectionUsage')).toBeGreaterThanOrEqual(15); // traceability connections
        expect(byType.get('InterfaceDefinition')).toBeGreaterThanOrEqual(3); // inline interface defs
    });
});

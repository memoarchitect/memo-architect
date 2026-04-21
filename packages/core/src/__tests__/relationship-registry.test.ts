import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { RelationshipRegistry, pascalToCamelCase } from '../model/relationship-registry.js';
import { parseFiles } from '../model/parser-utils.js';

function getSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            files.push(...getSysmlFiles(join(dir, entry.name)));
        } else if (entry.name.endsWith('.sysml') && entry.name !== 'index.sysml') {
            files.push(join(dir, entry.name));
        }
    }
    return files;
}

// ─── PascalCase → camelCase Tests ───────────────────────────────────────────

describe('pascalToCamelCase', () => {
    it('converts PascalCase to camelCase', () => {
        expect(pascalToCamelCase('Mitigates')).toBe('mitigates');
        expect(pascalToCamelCase('TraceTo')).toBe('traceTo');
        expect(pascalToCamelCase('HasSubProcedure')).toBe('hasSubProcedure');
        expect(pascalToCamelCase('Aggregation')).toBe('aggregation');
    });

    it('handles single character', () => {
        expect(pascalToCamelCase('A')).toBe('a');
    });

    it('handles empty string', () => {
        expect(pascalToCamelCase('')).toBe('');
    });

    it('handles already camelCase', () => {
        expect(pascalToCamelCase('mitigates')).toBe('mitigates');
    });
});

// ─── RelationshipRegistry Unit Tests ────────────────────────────────────────

describe('RelationshipRegistry', () => {
    it('registers and retrieves relationship types', () => {
        const registry = new RelationshipRegistry();
        registry.register({
            sysmlName: 'Mitigates',
            name: 'mitigates',
            label: 'Mitigates',
            layer: 'crosscutting',
            ends: [
                { name: 'mitigation', type: 'Mitigation' },
                { name: 'risk', type: 'Risk' },
            ],
        });

        expect(registry.has('mitigates')).toBe(true);
        expect(registry.size).toBe(1);

        const rel = registry.getRelType('mitigates');
        expect(rel).toBeDefined();
        expect(rel!.sysmlName).toBe('Mitigates');
        expect(rel!.layer).toBe('crosscutting');
        expect(rel!.ends).toHaveLength(2);
    });

    it('returns undefined for unknown relationship types', () => {
        const registry = new RelationshipRegistry();
        expect(registry.getRelType('nonExistent')).toBeUndefined();
        expect(registry.has('nonExistent')).toBe(false);
    });

    it('converts to RelationshipType for backward compat', () => {
        const registry = new RelationshipRegistry();
        registry.register({
            sysmlName: 'Mitigates',
            name: 'mitigates',
            label: 'Mitigates',
            layer: 'crosscutting',
            ends: [],
        });

        const relType = registry.toRelationshipType('mitigates');
        expect(relType).toEqual({
            name: 'mitigates',
            label: 'Mitigates',
            layer: 'crosscutting',
            color: '',
        });
    });

    it('converts to relationship types array', () => {
        const registry = new RelationshipRegistry();
        registry.register({ sysmlName: 'A', name: 'a', label: 'A', layer: 'l1', ends: [] });
        registry.register({ sysmlName: 'B', name: 'b', label: 'B', layer: 'l2', ends: [] });

        const arr = registry.toRelationshipTypesArray();
        expect(arr).toHaveLength(2);
        expect(arr[0].name).toBe('a');
        expect(arr[1].name).toBe('b');
    });

    it('lists relationship type names', () => {
        const registry = new RelationshipRegistry();
        registry.register({ sysmlName: 'X', name: 'x', label: 'X', layer: 'l', ends: [] });
        registry.register({ sysmlName: 'Y', name: 'y', label: 'Y', layer: 'l', ends: [] });

        expect(registry.relTypeNames()).toContain('x');
        expect(registry.relTypeNames()).toContain('y');
    });
});

// ─── RelationshipRegistry Integration: ontology-arch ────────────────────────────────

describe('RelationshipRegistry integration with ontology-arch', () => {
    let registry: RelationshipRegistry;

    beforeAll(async () => {
        const coreDir = resolve(__dirname, '../../../ontology-arch/sysml');
        const sysmlFiles = getSysmlFiles(coreDir);

        const result = await parseFiles(sysmlFiles, resolve(__dirname, '../../../ontology-arch'));
        expect(result.errors).toHaveLength(0);

        registry = new RelationshipRegistry();
        registry.populateFromDocuments(result.documents);
    });

    it('discovers relationship types from ontology-arch SysML files', () => {
        // ontology-arch has ~42 connection defs across structural/safety/security/etc.
        expect(registry.size).toBeGreaterThanOrEqual(14);
    });

    it('normalizes PascalCase SysML names to camelCase', () => {
        expect(registry.has('aggregation')).toBe(true);
        expect(registry.has('traceTo')).toBe(true);
        expect(registry.has('mitigates')).toBe(true); // mitigates is in ontology-arch (safety section)
    });

    it('resolves layer as crosscutting for relationships directory', () => {
        const agg = registry.getRelType('aggregation');
        expect(agg).toBeDefined();
        expect(agg!.layer).toBe('crosscutting');
    });

    it('preserves original SysML name', () => {
        const traceTo = registry.getRelType('traceTo');
        expect(traceTo).toBeDefined();
        expect(traceTo!.sysmlName).toBe('TraceTo');
    });

    it('generates human-readable labels', () => {
        const traceTo = registry.getRelType('traceTo');
        expect(traceTo).toBeDefined();
        expect(traceTo!.label).toBe('Trace To');

        const exposesInterface = registry.getRelType('exposesInterface');
        expect(exposesInterface).toBeDefined();
        expect(exposesInterface!.label).toBe('Exposes Interface');
    });

    it('extracts end declarations', () => {
        const agg = registry.getRelType('aggregation');
        expect(agg).toBeDefined();
        expect(agg!.ends.length).toBeGreaterThanOrEqual(2);
    });

    it('part defs are NOT registered as relationship types', () => {
        // Part defs belong in KindRegistry, not RelationshipRegistry
        expect(registry.has('hazard')).toBe(false);
        expect(registry.has('system')).toBe(false);
    });
});

// ─── RelationshipRegistry Integration: ontology-process ─────────────────────────────

describe('RelationshipRegistry integration with ontology-process', () => {
    let registry: RelationshipRegistry;

    beforeAll(async () => {
        const processDir = resolve(__dirname, '../../../ontology-process/sysml');
        const sysmlFiles = getSysmlFiles(processDir);

        const result = await parseFiles(sysmlFiles, resolve(__dirname, '../../../ontology-process'));
        expect(result.errors).toHaveLength(0);

        registry = new RelationshipRegistry();
        registry.populateFromDocuments(result.documents);
    });

    it('discovers relationship types from ontology-process SysML files', () => {
        // ontology-process has 5 cross-package bridge connection defs
        expect(registry.size).toBeGreaterThanOrEqual(3);
    });

    it('discovers process-specific relationship types', () => {
        expect(registry.has('tracedTo')).toBe(true);
        expect(registry.has('verifiesArch')).toBe(true);
        expect(registry.has('governedBy')).toBe(true);
    });

    it('normalizes process relationship names correctly', () => {
        const tracedTo = registry.getRelType('tracedTo');
        expect(tracedTo).toBeDefined();
        expect(tracedTo!.sysmlName).toBe('TracedTo');

        const governedBy = registry.getRelType('governedBy');
        expect(governedBy).toBeDefined();
        expect(governedBy!.sysmlName).toBe('GovernedBy');
    });
});

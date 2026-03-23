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
                { name: 'control', type: 'RiskControl' },
                { name: 'hazard', type: 'Hazard' },
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

// ─── RelationshipRegistry Integration: ontology-core ────────────────────────

describe('RelationshipRegistry integration with ontology-core', () => {
    let registry: RelationshipRegistry;

    beforeAll(async () => {
        const coreDir = resolve(__dirname, '../../../ontology-core/sysml');
        const sysmlFiles = getSysmlFiles(coreDir);

        const result = await parseFiles(sysmlFiles, resolve(__dirname, '../../../ontology-core'));
        expect(result.errors).toHaveLength(0);

        registry = new RelationshipRegistry();
        registry.populateFromDocuments(result.documents);
    });

    it('discovers relationship types from ontology-core SysML files', () => {
        // The relationships.sysml file has 42 connection defs
        expect(registry.size).toBeGreaterThanOrEqual(40);
    });

    it('normalizes PascalCase SysML names to camelCase', () => {
        expect(registry.has('aggregation')).toBe(true);
        expect(registry.has('traceTo')).toBe(true);
        expect(registry.has('mitigates')).toBe(false); // mitigates is in medical, not core
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

        const hasSubProcedure = registry.getRelType('hasSubProcedure');
        expect(hasSubProcedure).toBeDefined();
        expect(hasSubProcedure!.label).toBe('Has Sub Procedure');
    });

    it('extracts end declarations', () => {
        const agg = registry.getRelType('aggregation');
        expect(agg).toBeDefined();
        expect(agg!.ends.length).toBeGreaterThanOrEqual(2);
    });

    it('part defs are NOT registered as relationship types', () => {
        // Part defs belong in KindRegistry, not RelationshipRegistry
        expect(registry.has('hazard')).toBe(false);
        expect(registry.has('program')).toBe(false);
    });
});

// ─── RelationshipRegistry Integration: ontology-medical ─────────────────────

describe('RelationshipRegistry integration with ontology-medical', () => {
    let registry: RelationshipRegistry;

    beforeAll(async () => {
        const medicalDir = resolve(__dirname, '../../../ontology-medical/sysml');
        const sysmlFiles = getSysmlFiles(medicalDir);

        const result = await parseFiles(sysmlFiles, resolve(__dirname, '../../../ontology-medical'));
        expect(result.errors).toHaveLength(0);

        registry = new RelationshipRegistry();
        registry.populateFromDocuments(result.documents);
    });

    it('discovers relationship types from ontology-medical SysML files', () => {
        // The medical relationships.sysml has many connection defs
        expect(registry.size).toBeGreaterThanOrEqual(50);
    });

    it('discovers medical-specific relationship types', () => {
        expect(registry.has('mitigates')).toBe(true);
        expect(registry.has('causes')).toBe(true);
        expect(registry.has('leadsTo')).toBe(true);
        expect(registry.has('identifies')).toBe(true);
    });

    it('normalizes medical relationship names correctly', () => {
        const mitigates = registry.getRelType('mitigates');
        expect(mitigates).toBeDefined();
        expect(mitigates!.sysmlName).toBe('Mitigates');
        expect(mitigates!.label).toBe('Mitigates');

        const plansRisk = registry.getRelType('plansRiskManagement');
        expect(plansRisk).toBeDefined();
        expect(plansRisk!.sysmlName).toBe('PlansRiskManagement');
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { resolveLayerFromPath } from '../model/layer-resolver.js';
import { KindRegistry } from '../model/kind-registry.js';
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

// ─── Layer Resolver Tests ────────────────────────────────────────────────────

describe('resolveLayerFromPath', () => {
    it('resolves layer from subdirectory name', () => {
        expect(resolveLayerFromPath('sysml/risk/risk-management.sysml')).toBe('risk');
        expect(resolveLayerFromPath('sysml/operational/operational.sysml')).toBe('operational');
        expect(resolveLayerFromPath('sysml/operational/purpose/business.sysml')).toBe('operational');
    });

    it('maps relationships/ to crosscutting', () => {
        expect(resolveLayerFromPath('sysml/relationships/relationships.sysml')).toBe('crosscutting');
    });

    it('handles full paths with /sysml/ segment', () => {
        expect(resolveLayerFromPath('/some/project/packages/ontology-medical-arch/sysml/software/software.sysml')).toBe('software');
    });

    it('returns unknown for files directly under sysml/', () => {
        expect(resolveLayerFromPath('sysml/index.sysml')).toBe('unknown');
    });

    it('returns unknown for paths without /sysml/', () => {
        expect(resolveLayerFromPath('src/model/builder.ts')).toBe('unknown');
    });

    it('handles Windows-style backslashes', () => {
        expect(resolveLayerFromPath('sysml\\risk\\hazard.sysml')).toBe('risk');
    });
});

// ─── KindRegistry Unit Tests ─────────────────────────────────────────────────

describe('KindRegistry', () => {
    it('registers and retrieves kinds', () => {
        const registry = new KindRegistry();
        registry.register({
            name: 'Hazard',
            label: 'Hazard',
            layer: 'risk',
            sysmlConstruct: 'requirement def',
        });

        expect(registry.has('Hazard')).toBe(true);
        expect(registry.size).toBe(1);

        const kind = registry.getKind('Hazard');
        expect(kind).toBeDefined();
        expect(kind!.layer).toBe('risk');
        expect(kind!.sysmlConstruct).toBe('requirement def');
    });

    it('returns undefined for unknown kinds', () => {
        const registry = new KindRegistry();
        expect(registry.getKind('NonExistent')).toBeUndefined();
        expect(registry.has('NonExistent')).toBe(false);
    });

    it('converts to KindDefinition for backward compat', () => {
        const registry = new KindRegistry();
        registry.register({
            name: 'Hazard',
            label: 'Hazard',
            layer: 'risk',
            sysmlConstruct: 'requirement def',
        });

        const kindDef = registry.toKindDefinition('Hazard');
        expect(kindDef).toEqual({
            label: 'Hazard',
            layer: 'risk',
            sysmlConstruct: 'requirement def',
        });
    });

    it('converts to kinds record', () => {
        const registry = new KindRegistry();
        registry.register({ name: 'A', label: 'A', layer: 'l1', sysmlConstruct: 'part def' });
        registry.register({ name: 'B', label: 'B', layer: 'l2', sysmlConstruct: 'requirement def' });

        const record = registry.toKindsRecord();
        expect(Object.keys(record)).toHaveLength(2);
        expect(record.A.layer).toBe('l1');
        expect(record.B.sysmlConstruct).toBe('requirement def');
    });

    it('lists kind names', () => {
        const registry = new KindRegistry();
        registry.register({ name: 'X', label: 'X', layer: 'l', sysmlConstruct: 'part def' });
        registry.register({ name: 'Y', label: 'Y', layer: 'l', sysmlConstruct: 'part def' });

        expect(registry.kindNames()).toContain('X');
        expect(registry.kindNames()).toContain('Y');
    });
});

// ─── KindRegistry Integration: ontology-medical-arch ─────────────────────────────────

describe('KindRegistry integration with ontology-medical-arch', () => {
    let registry: KindRegistry;

    beforeAll(async () => {
        const coreDir = resolve(__dirname, '../../../ontology-medical-arch/sysml');
        const sysmlFiles = getSysmlFiles(coreDir);

        const result = await parseFiles(sysmlFiles, resolve(__dirname, '../../../ontology-medical-arch'));
        expect(result.errors).toHaveLength(0);

        registry = new KindRegistry();
        registry.populateFromDocuments(result.documents);
    });

    it('discovers kinds from ontology-medical-arch SysML files', () => {
        // Slim core has ~53 kinds (down from 114 after ontology simplification)
        // SysML files may define slightly different counts due to
        // enum defs, attribute defs, etc. that config may not list
        expect(registry.size).toBeGreaterThan(40);
    });

    it('resolves nested operational purpose kinds as operational layer', () => {
        const program = registry.getKind('Program');
        expect(program).toBeDefined();
        expect(program!.layer).toBe('operational');
        expect(program!.sysmlConstruct).toBe('part def');

        const actor = registry.getKind('Actor');
        expect(actor).toBeDefined();
        expect(actor!.layer).toBe('operational');
    });

    it('resolves requirements-layer kinds correctly', () => {
        const req = registry.getKind('Requirement');
        expect(req).toBeDefined();
        expect(req!.layer).toBe('requirements');
        expect(req!.sysmlConstruct).toBe('requirement def');
    });

    it('resolves analysis-layer kinds correctly', () => {
        const constraint = registry.getKind('Constraint');
        expect(constraint).toBeDefined();
        expect(constraint!.layer).toBe('analysis');
        expect(constraint!.sysmlConstruct).toBe('part def');
    });

    it('resolves software-layer kinds correctly', () => {
        const sw = registry.getKind('SoftwareComponent');
        expect(sw).toBeDefined();
        expect(sw!.layer).toBe('software');
    });

    it('resolves system-layer kinds correctly', () => {
        const system = registry.getKind('Subsystem');
        expect(system).toBeDefined();
        expect(system!.layer).toBe('system');
    });

    it('tracks specialization (superType)', () => {
        const operationalEnvironment = registry.getKind('OperationalEnvironment');
        expect(operationalEnvironment).toBeDefined();
        expect(operationalEnvironment!.superType).toBe('OperationalEntity');
    });

    it('connection defs are NOT registered as kinds', () => {
        // Connection defs (e.g. TraceTo, Mitigates) should not be in KindRegistry
        // They belong in RelationshipRegistry (M40)
        expect(registry.has('TraceTo')).toBe(false);
        expect(registry.has('Aggregation')).toBe(false);
    });
});

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadOntologyRegistries } from '../model/ontology-loader.js';

const PACKAGES_DIR = resolve(__dirname, '../../..');

// ─── Ontology Loader Tests ──────────────────────────────────────────────────

describe('loadOntologyRegistries', () => {
    // SKIP: in-package ontology-arch/sysml + ontology-process/sysml removed in c22b2e3
    // (moved to top-level ontology/). Re-enable once loader points to ontology/ tree.
    it.skip('loads registries from medical-modeling-profile config', async () => {
        const configPath = resolve(PACKAGES_DIR, 'medical-modeling-profile/memo.package.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should find ontology-arch and ontology-process SysML dirs
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(2);
        expect(result.fileCount).toBeGreaterThan(10);
        expect(result.errors).toHaveLength(0);

        // KindRegistry should have kinds from both ontology-arch and ontology-process
        const kr = result.registries.kindRegistry!;
        expect(kr.size).toBeGreaterThan(30);

        // Check arch kinds
        expect(kr.has('System')).toBe(true);
        expect(kr.has('Requirement')).toBe(true);
        expect(kr.has('SoftwareComponent')).toBe(true);

        // Check safety kinds
        expect(kr.has('Hazard')).toBe(true);
        expect(kr.has('Mitigation')).toBe(true);

        // RelationshipRegistry should have relationships from both
        const rr = result.registries.relationshipRegistry!;
        expect(rr.size).toBeGreaterThan(30);

        // Arch relationships
        expect(rr.has('aggregation')).toBe(true);
        expect(rr.has('traceTo')).toBe(true);

        // Safety relationships
        expect(rr.has('mitigates')).toBe(true);
        expect(rr.has('causes')).toBe(true);
    });

    // SKIP: examples/infusion-pump/ removed in c22b2e3 (single-example branch decision).
    // Restore fixture or repoint to gpca-pump when builder work resumes.
    it.skip('loads registries from infusion-pump device config', async () => {
        const configPath = resolve(PACKAGES_DIR, '../examples/infusion-pump/memo.config.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should discover ontology packages through extends chain
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(2);
        expect(result.fileCount).toBeGreaterThan(10);

        // Should have all ontology kinds available
        const kr = result.registries.kindRegistry!;
        expect(kr.has('Hazard')).toBe(true);
        expect(kr.has('Actor')).toBe(true);
        expect(kr.has('Requirement')).toBe(true);
    });

    // SKIP: ontology-arch/sysml deleted in c22b2e3 (moved to top-level ontology/).
    it.skip('loads registries from ontology-arch config directly', async () => {
        const configPath = resolve(PACKAGES_DIR, 'ontology-arch/memo.package.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should find just ontology-arch sysml dir
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(1);
        expect(result.fileCount).toBeGreaterThan(5);

        const kr = result.registries.kindRegistry!;
        expect(kr.has('System')).toBe(true);
        expect(kr.has('Requirement')).toBe(true);
        // Should NOT have process-specific kinds
        expect(kr.has('RiskManagementPlan')).toBe(false);
    });
});

// ─── Integration: infusion-pump with ontology registries ────────────────────

// SKIP: depends on examples/infusion-pump/ removed in c22b2e3.
describe.skip('Infusion pump with ontology registries', () => {
    it('builds model using registry-resolved kinds', async () => {
        const { readFileSync } = await import('node:fs');
        const { EmptyFileSystem } = await import('langium');
        const { parseHelper } = await import('langium/test');
        const { createMemoSysMLServices } = await import('../language/memo-sysml-module.js');
        const { buildMemoModel } = await import('../model/builder.js');
        const { loadConfig, resolveConfig } = await import('../model/config-loader.js');
        type Model = import('../language/generated/ast.js').Model;

        const PUMP_FILE = resolve(PACKAGES_DIR, '../examples/infusion-pump/model/infusion-pump.sysml');
        const CONFIG_FILE = resolve(PACKAGES_DIR, 'medical-modeling-profile/memo.package.yaml');

        // Load config — resolveConfig now handles array extends correctly
        const config = resolveConfig(loadConfig(CONFIG_FILE), (packageName: string) => {
            const shortName = packageName.replace(/^@memo\//, '');
            const parentPath = resolve(PACKAGES_DIR, shortName, 'memo.package.yaml');
            try { return loadConfig(parentPath); } catch { return undefined; }
        });

        // Load ontology registries
        const loadResult = await loadOntologyRegistries(CONFIG_FILE);
        expect(loadResult.fileCount).toBeGreaterThan(0);

        // Parse the infusion-pump model
        const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
        const parse = parseHelper<Model>(services);
        const source = readFileSync(PUMP_FILE, 'utf-8');
        const doc = await parse(source);

        // Build WITH registries
        const modelWithRegistries = buildMemoModel(
            [{ document: doc, filePath: 'model/infusion-pump.sysml' }],
            config,
            [],
            loadResult.registries
        );

        // Build WITHOUT registries (config-only, existing behavior)
        const modelWithoutRegistries = buildMemoModel(
            [{ document: doc, filePath: 'model/infusion-pump.sysml' }],
            config
        );

        // Both should produce equivalent models
        expect(modelWithRegistries.elements.size).toBe(modelWithoutRegistries.elements.size);
        expect(modelWithRegistries.relationships.length).toBe(modelWithoutRegistries.relationships.length);

        // Verify specific elements resolved correctly with registries
        const hazard = modelWithRegistries.elements.get('hazOverInfusion');
        expect(hazard).toBeDefined();
        expect(hazard!.kind).toBe('Hazard');

        const clinician = modelWithRegistries.elements.get('clinician');
        expect(clinician).toBeDefined();
        expect(clinician!.kind).toBe('Actor');

        // Verify relationships work
        const mitigates = modelWithRegistries.relationshipsByType.get('mitigates') || [];
        expect(mitigates.length).toBe(3);
    });
});

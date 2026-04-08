import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadOntologyRegistries } from '../model/ontology-loader.js';

const PACKAGES_DIR = resolve(__dirname, '../../..');

// ─── Ontology Loader Tests ──────────────────────────────────────────────────

describe('loadOntologyRegistries', () => {
    it('loads registries from medical-modeling-profile config', async () => {
        const configPath = resolve(PACKAGES_DIR, 'medical-modeling-profile/memo.package.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should find ontology-medical and ontology-core SysML dirs
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(2);
        expect(result.fileCount).toBeGreaterThan(20);
        expect(result.errors).toHaveLength(0);

        // KindRegistry should have kinds from both ontology-core and ontology-medical
        const kr = result.registries.kindRegistry!;
        expect(kr.size).toBeGreaterThan(150); // core has ~130, medical adds more

        // Check core kinds
        expect(kr.has('Program')).toBe(true);
        expect(kr.has('SystemRequirement')).toBe(true);
        expect(kr.has('Subsystem')).toBe(true);

        // Check medical kinds
        expect(kr.has('Hazard')).toBe(true);
        expect(kr.has('RiskControl')).toBe(true);

        // RelationshipRegistry should have relationships from both
        const rr = result.registries.relationshipRegistry!;
        expect(rr.size).toBeGreaterThan(60); // slim core ~16 + medical ~58

        // Core relationships
        expect(rr.has('aggregation')).toBe(true);
        expect(rr.has('traceTo')).toBe(true);

        // Medical relationships
        expect(rr.has('mitigates')).toBe(true);
        expect(rr.has('causes')).toBe(true);
    });

    it('loads registries from infusion-pump device config', async () => {
        const configPath = resolve(PACKAGES_DIR, '../examples/infusion-pump/memo.config.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should discover ontology packages through extends chain
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(2);
        expect(result.fileCount).toBeGreaterThan(20);

        // Should have all ontology kinds available
        const kr = result.registries.kindRegistry!;
        expect(kr.has('Hazard')).toBe(true);
        expect(kr.has('Actor')).toBe(true);
        expect(kr.has('SystemRequirement')).toBe(true);
    });

    it('loads registries from ontology-core config directly', async () => {
        const configPath = resolve(PACKAGES_DIR, 'ontology-core/memo.package.yaml');
        const result = await loadOntologyRegistries(configPath);

        // Should find just ontology-core sysml dir
        expect(result.ontologyDirs.length).toBeGreaterThanOrEqual(1);
        expect(result.fileCount).toBeGreaterThan(10);

        const kr = result.registries.kindRegistry!;
        expect(kr.has('Program')).toBe(true);
        expect(kr.has('SystemRequirement')).toBe(true);
        // Should NOT have medical-specific kinds
        expect(kr.has('RiskControl')).toBe(false);
    });
});

// ─── Integration: infusion-pump with ontology registries ────────────────────

describe('Infusion pump with ontology registries', () => {
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

        // Load config
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

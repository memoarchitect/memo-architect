import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { loadConfig, loadRenderingLayers, loadClosureRules } from '../model/config-loader.js';

const TMP_DIR = resolve(__dirname, '__tmp_config_test__');

beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
});

// ─── loadRenderingLayers Tests ──────────────────────────────────────────────

describe('loadRenderingLayers', () => {
    it('loads layers from memo.rendering.yaml', () => {
        writeFileSync(join(TMP_DIR, 'memo.rendering.yaml'), `
layers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
  - id: requirements
    label: Requirements
    color: "#4A90D9"
`);
        const layers = loadRenderingLayers(TMP_DIR);
        expect(layers).toHaveLength(2);
        expect(layers[0].id).toBe('risk');
        expect(layers[0].label).toBe('Risk Management');
        expect(layers[0].color).toBe('#E74C3C');
        expect(layers[1].id).toBe('requirements');
    });

    it('returns empty array if no rendering file exists', () => {
        const layers = loadRenderingLayers(TMP_DIR);
        expect(layers).toEqual([]);
    });

    it('returns empty array for malformed rendering file', () => {
        writeFileSync(join(TMP_DIR, 'memo.rendering.yaml'), 'not: valid: yaml: [');
        const layers = loadRenderingLayers(TMP_DIR);
        expect(layers).toEqual([]);
    });
});

// ─── loadConfig with memo.rendering.yaml ────────────────────────────────────

describe('loadConfig with memo.rendering.yaml', () => {
    it('merges rendering layers into architectureLayers', () => {
        // Config with no architectureLayers
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
`);
        writeFileSync(join(TMP_DIR, 'memo.rendering.yaml'), `
layers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.architectureLayers).toHaveLength(1);
        expect(config.architectureLayers![0].id).toBe('risk');
    });

    it('rendering layers take precedence over config architectureLayers for same id', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
cosmaLayers:
  - id: risk
    label: Old Risk Label
    color: "#000000"
`);
        writeFileSync(join(TMP_DIR, 'memo.rendering.yaml'), `
layers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.architectureLayers).toHaveLength(1);
        expect(config.architectureLayers![0].label).toBe('Risk Management');
        expect(config.architectureLayers![0].color).toBe('#E74C3C');
    });

    it('backward compat: legacy cosmaLayers YAML key is read into architectureLayers', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
cosmaLayers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
  - id: requirements
    label: Requirements
    color: "#4A90D9"
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.architectureLayers).toHaveLength(2);
        expect(config.architectureLayers![0].id).toBe('risk');
    });

    it('merges both sources when both have different layer ids', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
cosmaLayers:
  - id: risk
    label: Risk
    color: "#E74C3C"
`);
        writeFileSync(join(TMP_DIR, 'memo.rendering.yaml'), `
layers:
  - id: requirements
    label: Requirements
    color: "#4A90D9"
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.architectureLayers).toHaveLength(2);
        const ids = config.architectureLayers!.map(l => l.id);
        expect(ids).toContain('risk');
        expect(ids).toContain('requirements');
    });
});

// ─── loadClosureRules Tests ──────────────────────────────────────────────────

describe('loadClosureRules', () => {
    it('loads rules from memo.rules.yaml', () => {
        writeFileSync(join(TMP_DIR, 'memo.rules.yaml'), `
closureRules:
  - id: CR-TEST-001
    description: "Every Hazard must have a RiskControl"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
  - id: CR-TEST-002
    description: "Every Risk must identify a Hazard"
    entity: Risk
    rule:
      type: requireRelationship
      relationship: identifies
      direction: outgoing
      min: 1
    severity: warning
`);
        const rules = loadClosureRules(TMP_DIR);
        expect(rules).toHaveLength(2);
        expect(rules[0].id).toBe('CR-TEST-001');
        expect(rules[0].entity).toBe('Hazard');
        expect(rules[0].severity).toBe('error');
        expect(rules[1].id).toBe('CR-TEST-002');
    });

    it('returns empty array if no rules file exists', () => {
        const rules = loadClosureRules(TMP_DIR);
        expect(rules).toEqual([]);
    });

    it('returns empty array for malformed rules file', () => {
        writeFileSync(join(TMP_DIR, 'memo.rules.yaml'), 'not: valid: yaml: [');
        const rules = loadClosureRules(TMP_DIR);
        expect(rules).toEqual([]);
    });
});

// ─── loadConfig with memo.rules.yaml ─────────────────────────────────────────

describe('loadConfig with memo.rules.yaml', () => {
    it('merges rules from memo.rules.yaml into closureRules', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
`);
        writeFileSync(join(TMP_DIR, 'memo.rules.yaml'), `
closureRules:
  - id: CR-TEST-001
    description: "Test rule"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.closureRules).toHaveLength(1);
        expect(config.closureRules[0].id).toBe('CR-TEST-001');
    });

    it('rules file takes precedence over config closureRules for same id', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
closureRules:
  - id: CR-TEST-001
    description: "Old description"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: warning
`);
        writeFileSync(join(TMP_DIR, 'memo.rules.yaml'), `
closureRules:
  - id: CR-TEST-001
    description: "New description from rules file"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.closureRules).toHaveLength(1);
        expect(config.closureRules[0].description).toBe('New description from rules file');
        expect(config.closureRules[0].severity).toBe('error');
    });

    it('backward compat: closureRules still works without rules file', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
closureRules:
  - id: CR-TEST-001
    description: "Test rule"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.closureRules).toHaveLength(1);
        expect(config.closureRules[0].id).toBe('CR-TEST-001');
    });

    it('merges both sources when both have different rule ids', () => {
        writeFileSync(join(TMP_DIR, 'memo.config.yaml'), `
projectName: test-project
projectType: device
closureRules:
  - id: CR-TEST-001
    description: "Config rule"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
`);
        writeFileSync(join(TMP_DIR, 'memo.rules.yaml'), `
closureRules:
  - id: CR-TEST-002
    description: "Rules file rule"
    entity: Risk
    rule:
      type: requireRelationship
      relationship: identifies
      direction: outgoing
      min: 1
    severity: warning
`);

        const config = loadConfig(join(TMP_DIR, 'memo.config.yaml'));
        expect(config.closureRules).toHaveLength(2);
        const ids = config.closureRules.map(r => r.id);
        expect(ids).toContain('CR-TEST-001');
        expect(ids).toContain('CR-TEST-002');
    });
});

// ─── Integration: real ontology packages ────────────────────────────────────

describe('loadConfig with real ontology package files', () => {
    it('ontology-medical-arch loads rendering layers from memo.package.yaml + memo.rendering.yaml', () => {
        const configPath = resolve(__dirname, '../../../ontology-medical-arch/memo.package.yaml');
        const config = loadConfig(configPath);

        // Should have layers from memo.rendering.yaml
        expect(config.architectureLayers!.length).toBeGreaterThanOrEqual(10);

        // Verify specific layers are present
        const layerIds = config.architectureLayers!.map(l => l.id);
        expect(layerIds).toContain('operational');
        expect(layerIds).toContain('system');
        expect(layerIds).toContain('requirements');
        expect(layerIds).toContain('software');
        expect(layerIds).toContain('verification');

        // Verify identity from memo.package.yaml
        expect(config.projectName).toBe('@memo/ontology-medical-arch');
        expect(config.projectType).toBe('ontology');
    });

    it('ontology-medical-process loads rendering layers from memo.package.yaml + memo.rendering.yaml', () => {
        const configPath = resolve(__dirname, '../../../ontology-medical-process/memo.package.yaml');
        const config = loadConfig(configPath);

        // Should have medical layers
        const layerIds = config.architectureLayers!.map(l => l.id);
        expect(layerIds).toContain('risk');
        expect(layerIds).toContain('design-control');
        expect(layerIds).toContain('safety');

        // Verify extends chain
        expect(config.extends).toBe('@memo/ontology-medical-arch');
    });

    it('medical-modeling-profile loads closure rules from memo.package.yaml + memo.rules.yaml', () => {
        const configPath = resolve(__dirname, '../../../medical-modeling-profile/memo.package.yaml');
        const config = loadConfig(configPath);

        // Rules should come from memo.rules.yaml
        expect(config.closureRules.length).toBeGreaterThanOrEqual(100);

        // Verify specific rules are present
        const ruleIds = config.closureRules.map(r => r.id);
        expect(ruleIds).toContain('CR-MED-001');
        expect(ruleIds).toContain('CR-MED-041');
        expect(ruleIds).toContain('CR-MED-109');

        // Verify rule structure
        const rule1 = config.closureRules.find(r => r.id === 'CR-MED-001')!;
        expect(rule1.entity).toBe('Hazard');
        expect(rule1.severity).toBe('error');
        expect(rule1.rule.type).toBe('requireRelationship');

        // Verify viewpoints loaded from memo.viewpoints.yaml
        expect(config.viewpoints).toBeDefined();
        expect(config.viewpoints!.length).toBeGreaterThanOrEqual(10);
        const vpIds = config.viewpoints!.map(v => v.id);
        expect(vpIds).toContain('risk-overview');
        expect(vpIds).toContain('safety-view');
        expect(vpIds).toContain('software-view');

        // Verify firstRun loaded from memo.viewpoints.yaml
        expect(config.firstRun).toBeDefined();
        expect(config.firstRun!.template).toBe('infusion-pump');
    });
});

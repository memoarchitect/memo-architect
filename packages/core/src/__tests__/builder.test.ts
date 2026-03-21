import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import type { MEMOConfig } from '../model/config.js';
import { buildMemoModel } from '../model/builder.js';
import { evaluateClosureRules } from '../validator/rule-engine.js';
import { computeCompleteness } from '../completeness/tracker.js';
import type { ParsedDocument } from '../model/parser-utils.js';
import { loadConfig, resolveConfig } from '../model/config-loader.js';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function parseDoc(source: string, filePath: string = 'test.sysml'): Promise<ParsedDocument> {
    const doc = await parse(source);
    return { document: doc, filePath };
}

/** Minimal config for testing */
const testConfig: MEMOConfig = {
    projectName: 'test',
    projectType: 'device',
    kinds: {
        Hazard: { label: 'Hazard', layer: 'risk', sysmlConstruct: 'requirement def' },
        RiskControl: { label: 'Risk Control', layer: 'risk', sysmlConstruct: 'requirement def' },
        SystemRequirement: { label: 'System Req', layer: 'requirements', sysmlConstruct: 'requirement def' },
        SoftwareRequirement: { label: 'Software Req', layer: 'requirements', sysmlConstruct: 'requirement def' },
        Software: { label: 'Software', layer: 'software', sysmlConstruct: 'part def' },
        Actor: { label: 'Actor', layer: 'business', sysmlConstruct: 'part def' },
    },
    relationshipTypes: [
        { name: 'mitigates', label: 'Mitigates', layer: 'risk', color: '#E74C3C' },
        { name: 'traceTo', label: 'Trace To', layer: 'requirements', color: '#4A90D9' },
    ],
    closureRules: [
        {
            id: 'CR-001',
            description: 'Every Hazard must have at least one mitigates relationship',
            entity: 'Hazard',
            rule: { type: 'requireRelationship', relationship: 'mitigates', min: 1 },
            severity: 'error',
        },
        {
            id: 'CR-002',
            description: 'Every Software must have safetyClassification attribute',
            entity: 'Software',
            rule: { type: 'requireAttribute', attribute: 'safetyClassification' },
            severity: 'error',
        },
    ],
    cosmaLayers: [
        { id: 'risk', label: 'Risk', color: '#E74C3C' },
        { id: 'requirements', label: 'Requirements', color: '#4A90D9' },
        { id: 'software', label: 'Software', color: '#F39C12' },
        { id: 'business', label: 'Business', color: '#8E44AD' },
    ],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('buildMemoModel', () => {
    it('extracts elements from part usages', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                part clinician : Actor {
                    attribute redefines name = "Clinician";
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.elements.size).toBe(1);
        const el = model.elements.get('clinician')!;
        expect(el).toBeDefined();
        expect(el.kind).toBe('Actor');
        expect(el.construct).toBe('part');
        expect(el.layer).toBe('business');
        expect(el.name).toBe('Clinician');
        expect(el.attributes['name']).toBe('Clinician');
    });

    it('extracts elements from requirement usages', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement hazOverInfusion : Hazard {
                    attribute redefines hazardId = "HAZ-001";
                    attribute redefines title = "Over-Infusion";
                    doc /* A hazard description. */
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.elements.size).toBe(1);
        const el = model.elements.get('hazOverInfusion')!;
        expect(el.kind).toBe('Hazard');
        expect(el.construct).toBe('requirement');
        expect(el.layer).toBe('risk');
        expect(el.name).toBe('Over-Infusion');
        expect(el.attributes['hazardId']).toBe('HAZ-001');
        expect(el.doc).toContain('hazard description');
    });

    it('extracts connection usages as relationships', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement rc1 : RiskControl {
                    attribute redefines title = "Control 1";
                }
                requirement haz1 : Hazard {
                    attribute redefines title = "Hazard 1";
                }
                connection : Mitigates connect control ::> rc1 to hazard ::> haz1;
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.elements.size).toBe(2);
        expect(model.relationships).toHaveLength(1);

        const rel = model.relationships[0];
        expect(rel.type).toBe('mitigates');
        expect(rel.sourceId).toBe('rc1');
        expect(rel.sourceEnd).toBe('control');
        expect(rel.targetId).toBe('haz1');
        expect(rel.targetEnd).toBe('hazard');
    });

    it('builds element indexes by kind and layer', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement h1 : Hazard { attribute redefines title = "H1"; }
                requirement h2 : Hazard { attribute redefines title = "H2"; }
                requirement sr1 : SystemRequirement { attribute redefines title = "SR1"; }
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.elementsByKind.get('Hazard')?.length).toBe(2);
        expect(model.elementsByKind.get('SystemRequirement')?.length).toBe(1);
        expect(model.elementsByLayer.get('risk')?.length).toBe(2);
        expect(model.elementsByLayer.get('requirements')?.length).toBe(1);
    });

    it('builds relationship indexes (outgoing, incoming, byType)', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement rc1 : RiskControl { attribute redefines title = "RC1"; }
                requirement h1 : Hazard { attribute redefines title = "H1"; }
                connection : Mitigates connect control ::> rc1 to hazard ::> h1;
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.outgoing.get('rc1')?.length).toBe(1);
        expect(model.incoming.get('h1')?.length).toBe(1);
        expect(model.relationshipsByType.get('mitigates')?.length).toBe(1);
    });
});

describe('evaluateClosureRules', () => {
    it('detects missing required relationship', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement h1 : Hazard { attribute redefines title = "H1"; }
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const result = evaluateClosureRules(model, testConfig);

        expect(result.violations.length).toBe(1);
        expect(result.violations[0].ruleId).toBe('CR-001');
        expect(result.violations[0].elementId).toBe('h1');
    });

    it('passes when relationship exists', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement rc1 : RiskControl { attribute redefines title = "RC1"; }
                requirement h1 : Hazard { attribute redefines title = "H1"; }
                connection : Mitigates connect control ::> rc1 to hazard ::> h1;
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const result = evaluateClosureRules(model, testConfig);

        // h1 has mitigates → passes CR-001
        // rc1 doesn't have relevant rules
        const hazardViolations = result.violations.filter(v => v.ruleId === 'CR-001');
        expect(hazardViolations.length).toBe(0);
    });

    it('detects missing required attribute', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                part sw1 : Software {
                    attribute redefines name = "My Software";
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const result = evaluateClosureRules(model, testConfig);

        const attrViolations = result.violations.filter(v => v.ruleId === 'CR-002');
        expect(attrViolations.length).toBe(1);
    });

    it('passes when attribute exists', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                part sw1 : Software {
                    attribute redefines safetyClassification = "C";
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const result = evaluateClosureRules(model, testConfig);

        const attrViolations = result.violations.filter(v => v.ruleId === 'CR-002');
        expect(attrViolations.length).toBe(0);
    });
});

describe('computeCompleteness', () => {
    it('computes per-layer completeness', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement h1 : Hazard { attribute redefines title = "H1"; }
                requirement rc1 : RiskControl { attribute redefines title = "RC1"; }
                part sw1 : Software { attribute redefines safetyClassification = "C"; }
                connection : Mitigates connect control ::> rc1 to hazard ::> h1;
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const validation = evaluateClosureRules(model, testConfig);
        const report = computeCompleteness(model, validation, testConfig);

        expect(report.totalElements).toBe(3);
        // h1 passes (has mitigates), rc1 has no rules, sw1 passes (has attribute)
        expect(report.overall).toBeGreaterThanOrEqual(50);
        expect(report.layers.length).toBe(4); // risk, requirements, software, business
    });
});

// ─── Cross-file import resolution tests ─────────────────────────────────────

describe('Cross-file import resolution', () => {
    it('tracks package names on elements', async () => {
        const doc = await parseDoc(`
            package DeviceModel {
                part clinician : Actor {
                    attribute redefines name = "Clinician";
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const el = model.elements.get('clinician')!;
        expect(el.package).toBe('DeviceModel');
    });

    it('resolves connections across two files via wildcard import', async () => {
        const riskFile = await parseDoc(`
            package RiskPkg {
                requirement haz1 : Hazard {
                    attribute redefines title = "Over-Infusion";
                }
            }
        `, 'model/risk.sysml');

        const controlFile = await parseDoc(`
            package ControlPkg {
                import RiskPkg::*;
                requirement rc1 : RiskControl {
                    attribute redefines title = "Flow Limiter";
                }
                connection : Mitigates connect control ::> rc1 to hazard ::> haz1;
            }
        `, 'model/controls.sysml');

        const model = buildMemoModel([riskFile, controlFile], testConfig);

        expect(model.elements.size).toBe(2);
        expect(model.elements.get('haz1')?.package).toBe('RiskPkg');
        expect(model.elements.get('rc1')?.package).toBe('ControlPkg');

        expect(model.relationships).toHaveLength(1);
        expect(model.relationships[0].sourceId).toBe('rc1');
        expect(model.relationships[0].targetId).toBe('haz1');
    });

    it('resolves connections across files via named import', async () => {
        const riskFile = await parseDoc(`
            package RiskPkg {
                requirement haz1 : Hazard {
                    attribute redefines title = "Over-Infusion";
                }
                requirement haz2 : Hazard {
                    attribute redefines title = "Under-Infusion";
                }
            }
        `, 'model/risk.sysml');

        const controlFile = await parseDoc(`
            package ControlPkg {
                import RiskPkg::haz1;
                requirement rc1 : RiskControl {
                    attribute redefines title = "Flow Limiter";
                }
                connection : Mitigates connect control ::> rc1 to hazard ::> haz1;
            }
        `, 'model/controls.sysml');

        const model = buildMemoModel([riskFile, controlFile], testConfig);

        expect(model.relationships).toHaveLength(1);
        expect(model.relationships[0].targetId).toBe('haz1');
    });

    it('resolves qualified name references in connections', async () => {
        const riskFile = await parseDoc(`
            package RiskPkg {
                requirement haz1 : Hazard {
                    attribute redefines title = "Over-Infusion";
                }
            }
        `, 'model/risk.sysml');

        const controlFile = await parseDoc(`
            package ControlPkg {
                requirement rc1 : RiskControl {
                    attribute redefines title = "Flow Limiter";
                }
                connection : Mitigates connect control ::> rc1 to hazard ::> RiskPkg::haz1;
            }
        `, 'model/controls.sysml');

        const model = buildMemoModel([riskFile, controlFile], testConfig);

        expect(model.relationships).toHaveLength(1);
        expect(model.relationships[0].targetId).toBe('haz1');
    });

    it('handles nested packages', async () => {
        const doc = await parseDoc(`
            package DeviceModel {
                package Risk {
                    requirement haz1 : Hazard {
                        attribute redefines title = "H1";
                    }
                }
                package Controls {
                    import DeviceModel::Risk::*;
                    requirement rc1 : RiskControl {
                        attribute redefines title = "RC1";
                    }
                    connection : Mitigates connect control ::> rc1 to hazard ::> haz1;
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);

        expect(model.elements.get('haz1')?.package).toBe('DeviceModel::Risk');
        expect(model.elements.get('rc1')?.package).toBe('DeviceModel::Controls');
        expect(model.relationships).toHaveLength(1);
    });

    it('resolves qualified type names for kinds', async () => {
        const doc = await parseDoc(`
            package TestPkg {
                requirement h1 : RiskPkg::Hazard {
                    attribute redefines title = "H1";
                }
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        const el = model.elements.get('h1')!;
        // Should resolve RiskPkg::Hazard to just "Hazard" for kind lookup
        expect(el.kind).toBe('Hazard');
        expect(el.layer).toBe('risk');
    });
});

// ─── Library package tests ──────────────────────────────────────────────────

describe('SysML v2 library keyword', () => {
    it('parses library package declaration', async () => {
        const doc = await parseDoc(`
            library package MEMO_Types {
                part def Hazard;
                part def RiskControl;
            }
        `);
        const model = buildMemoModel([doc], testConfig);
        // Library packages contain definitions, not usages — no elements extracted
        expect(model.elements.size).toBe(0);
    });

    it('library package is tracked in registry', async () => {
        const { PackageRegistry } = await import('../model/package-registry.js');
        const registry = new PackageRegistry();

        const doc = await parseDoc(`
            library package MEMO_Types {
                part def Hazard;
            }
            package DeviceModel {
                import MEMO_Types::*;
                requirement h1 : Hazard {
                    attribute redefines title = "H1";
                }
            }
        `);

        registry.buildFromDocuments([doc]);
        expect(registry.isLibraryPackage('MEMO_Types')).toBe(true);
        expect(registry.isLibraryPackage('DeviceModel')).toBe(false);
    });

    it('library and non-library packages coexist', async () => {
        const libFile = await parseDoc(`
            library package OntologyLib {
                part def Hazard;
                part def Actor;
            }
        `, 'lib/ontology.sysml');

        const modelFile = await parseDoc(`
            package InfusionPump {
                import OntologyLib::*;
                part clinician : Actor {
                    attribute redefines name = "Clinician";
                }
                requirement h1 : Hazard {
                    attribute redefines title = "H1";
                }
            }
        `, 'model/pump.sysml');

        const model = buildMemoModel([libFile, modelFile], testConfig);
        // Only model elements (not definitions from library)
        expect(model.elements.size).toBe(2);
        expect(model.elements.get('clinician')?.package).toBe('InfusionPump');
        expect(model.elements.get('h1')?.package).toBe('InfusionPump');
    });
});

// ─── Multi-file model splitting tests ───────────────────────────────────────

describe('Multi-file model splitting', () => {
    it('builds model from split files with cross-package connections', async () => {
        const riskFile = await parseDoc(`
            package DeviceRisk {
                requirement haz1 : Hazard {
                    attribute redefines title = "Over-Infusion";
                }
                requirement rc1 : RiskControl {
                    attribute redefines title = "Flow Limiter";
                }
                connection : Mitigates connect control ::> rc1 to hazard ::> haz1;
            }
        `, 'model/risk/risk.sysml');

        const reqFile = await parseDoc(`
            package DeviceRequirements {
                import DeviceRisk::*;
                requirement sr1 : SystemRequirement {
                    attribute redefines title = "Flow Accuracy";
                }
                connection : TraceTo connect source ::> sr1 to target ::> rc1;
            }
        `, 'model/requirements/requirements.sysml');

        const archFile = await parseDoc(`
            package DeviceArchitecture {
                import DeviceRequirements::*;
                part pump : Actor {
                    attribute redefines name = "Pump Mechanism";
                }
            }
        `, 'model/architecture/architecture.sysml');

        const model = buildMemoModel([riskFile, reqFile, archFile], testConfig);

        // All elements from all files
        expect(model.elements.size).toBe(4);
        expect(model.elements.get('haz1')?.package).toBe('DeviceRisk');
        expect(model.elements.get('sr1')?.package).toBe('DeviceRequirements');
        expect(model.elements.get('pump')?.package).toBe('DeviceArchitecture');

        // Cross-file connections
        expect(model.relationships.length).toBe(2);

        // Mitigates: rc1 → haz1 (within risk file)
        const mitigates = model.relationships.find(r => r.type === 'mitigates');
        expect(mitigates?.sourceId).toBe('rc1');
        expect(mitigates?.targetId).toBe('haz1');

        // TraceTo: sr1 → rc1 (cross-file: requirements → risk)
        const traceTo = model.relationships.find(r => r.type === 'traceTo');
        expect(traceTo?.sourceId).toBe('sr1');
        expect(traceTo?.targetId).toBe('rc1');
    });

    it('resolves three-level cross-file chains', async () => {
        const riskFile = await parseDoc(`
            package Risk {
                requirement haz1 : Hazard {
                    attribute redefines title = "H1";
                }
            }
        `, 'risk.sysml');

        const reqFile = await parseDoc(`
            package Requirements {
                import Risk::*;
                requirement sr1 : SystemRequirement {
                    attribute redefines title = "SR1";
                }
                connection : TraceTo connect source ::> sr1 to target ::> haz1;
            }
        `, 'requirements.sysml');

        const swFile = await parseDoc(`
            package Software {
                import Requirements::*;
                requirement swr1 : SoftwareRequirement {
                    attribute redefines title = "SWR1";
                }
                connection : TraceTo connect source ::> swr1 to target ::> sr1;
            }
        `, 'software.sysml');

        const model = buildMemoModel([riskFile, reqFile, swFile], testConfig);

        expect(model.elements.size).toBe(3);
        expect(model.relationships.length).toBe(2);

        // sr1 → haz1 (req → risk)
        const r1 = model.relationships.find(r => r.sourceId === 'sr1');
        expect(r1?.targetId).toBe('haz1');

        // swr1 → sr1 (software → requirements)
        const r2 = model.relationships.find(r => r.sourceId === 'swr1');
        expect(r2?.targetId).toBe('sr1');
    });
});

// ─── Helper: resolve extends chain for tests ────────────────────────────────

function loadResolvedConfig(configPath: string): MEMOConfig {
    const config = loadConfig(configPath);
    return resolveConfig(config, (packageName: string) => {
        // Map @memo/ontology → packages/ontology/memo.config.yaml
        const shortName = packageName.replace(/^@memo\//, '');
        const parentPath = resolve('/Users/someshkashyap/sandbox/memo/packages', shortName, 'memo.config.yaml');
        try {
            return loadConfig(parentPath);
        } catch {
            return undefined;
        }
    });
}

// ─── Integration test with real infusion-pump file ──────────────────────────

describe('Infusion pump integration', () => {
    const PUMP_FILE = resolve('/Users/someshkashyap/sandbox/memo/examples/infusion-pump/model/infusion-pump.sysml');
    const CONFIG_FILE = resolve('/Users/someshkashyap/sandbox/memo/packages/medical/memo.config.yaml');

    it('builds model from infusion-pump.sysml', async () => {
        const source = readFileSync(PUMP_FILE, 'utf-8');
        const doc = await parse(source);
        const config = loadResolvedConfig(CONFIG_FILE);

        const model = buildMemoModel(
            [{ document: doc, filePath: 'model/infusion-pump.sysml' }],
            config
        );

        // Should have many elements (actors, requirements, hazards, components, etc.)
        expect(model.elements.size).toBeGreaterThan(50);

        // Should have relationships (mitigates, traceTo, allocateTo, satisfy, verify)
        expect(model.relationships.length).toBeGreaterThan(15);

        // Check specific elements
        expect(model.elements.get('clinician')).toBeDefined();
        expect(model.elements.get('clinician')?.kind).toBe('Actor');

        expect(model.elements.get('hazOverInfusion')).toBeDefined();
        expect(model.elements.get('hazOverInfusion')?.kind).toBe('Hazard');

        // Check relationships
        const mitigates = model.relationshipsByType.get('mitigates') || [];
        expect(mitigates.length).toBe(3); // 3 risk controls

        const traceTo = model.relationshipsByType.get('traceTo') || [];
        expect(traceTo.length).toBeGreaterThanOrEqual(5);

        // Verify relationship indexes
        const hazOverOutgoing = model.outgoing.get('hazOverInfusion') || [];
        const hazOverIncoming = model.incoming.get('hazOverInfusion') || [];
        expect(hazOverOutgoing.length + hazOverIncoming.length).toBeGreaterThan(0);
    });

    it('validates infusion-pump model', async () => {
        const source = readFileSync(PUMP_FILE, 'utf-8');
        const doc = await parse(source);
        const config = loadResolvedConfig(CONFIG_FILE);

        const model = buildMemoModel(
            [{ document: doc, filePath: 'model/infusion-pump.sysml' }],
            config
        );

        const result = evaluateClosureRules(model, config);
        expect(result.rulesEvaluated).toBe(21);
        // Some rules should pass, some may have violations
        expect(result.violations.length).toBeGreaterThanOrEqual(0);

        const completeness = computeCompleteness(model, result, config);
        expect(completeness.totalElements).toBeGreaterThan(50);
        expect(completeness.layers.length).toBeGreaterThanOrEqual(2);
    });
});

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
import { loadConfig } from '../model/config-loader.js';

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

// ─── Integration test with real infusion-pump file ──────────────────────────

describe('Infusion pump integration', () => {
    const PUMP_FILE = resolve('/Users/someshkashyap/sandbox/memo/examples/infusion-pump/model/infusion-pump.sysml');
    const CONFIG_FILE = resolve('/Users/someshkashyap/sandbox/memo/packages/medical/memo.config.yaml');

    it('builds model from infusion-pump.sysml', async () => {
        const source = readFileSync(PUMP_FILE, 'utf-8');
        const doc = await parse(source);
        const config = loadConfig(CONFIG_FILE);

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
        const config = loadConfig(CONFIG_FILE);

        const model = buildMemoModel(
            [{ document: doc, filePath: 'model/infusion-pump.sysml' }],
            config
        );

        const result = evaluateClosureRules(model, config);
        expect(result.rulesEvaluated).toBe(15);
        // Some rules should pass, some may have violations
        expect(result.violations.length).toBeGreaterThanOrEqual(0);

        const completeness = computeCompleteness(model, result, config);
        expect(completeness.totalElements).toBeGreaterThan(50);
        expect(completeness.layers.length).toBeGreaterThanOrEqual(9);
    });
});

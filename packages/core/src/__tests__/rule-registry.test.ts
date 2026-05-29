import { describe, it, expect } from 'vitest';
import { RuleRegistry } from '../validator/rule-registry.js';
import { ConstraintInterpreter } from '../validator/constraint-interpreter.js';
import type { ClosureRule } from '../model/config.js';

describe('RuleRegistry', () => {
    it('registers and retrieves rules', () => {
        const registry = new RuleRegistry();
        registry.register({
            id: 'CR-TEST-001',
            name: 'TestRule',
            description: 'A test rule',
            appliesTo: 'Hazard',
            predicate: 'requireRelationship',
            strength: 'required',
            severity: 'error',
            rationaleText: 'Testing',
            category: 'closure',
            attributes: {
                id: 'CR-TEST-001',
                relationshipType: 'mitigates',
                minCount: '1',
                maxCount: '',
                direction: 'any',
                relatedKinds: '',
            },
            file: 'test.sysml',
            superType: 'RelationshipConsistencyRule',
        });

        expect(registry.size).toBe(1);
        expect(registry.has('CR-TEST-001')).toBe(true);

        const entry = registry.getRule('CR-TEST-001');
        expect(entry).toBeDefined();
        expect(entry!.appliesTo).toBe('Hazard');
        expect(entry!.predicate).toBe('requireRelationship');
    });

    it('converts to ClosureRules', () => {
        const registry = new RuleRegistry();
        registry.register({
            id: 'CR-TEST-002',
            name: 'AttrRule',
            description: 'Require severity attribute',
            appliesTo: 'Hazard',
            predicate: 'requireAttribute',
            strength: 'required',
            severity: 'error',
            rationaleText: 'Testing',
            category: 'closure',
            attributes: {
                id: 'CR-TEST-002',
                targetAttribute: 'severity',
            },
            file: 'test.sysml',
            superType: 'AttributeConsistencyRule',
        });

        const closureRules = registry.toClosureRules();
        expect(closureRules).toHaveLength(1);
        expect(closureRules[0].id).toBe('CR-TEST-002');
        expect(closureRules[0].entity).toBe('Hazard');
        expect(closureRules[0].rule.type).toBe('requireAttribute');
        if (closureRules[0].rule.type === 'requireAttribute') {
            expect(closureRules[0].rule.attribute).toBe('severity');
        }
    });

    it('filters by category', () => {
        const registry = new RuleRegistry();
        registry.register({
            id: 'CR-CLOSURE-001', name: 'C1', description: '', appliesTo: 'X',
            predicate: 'requireAttribute', strength: 'required', severity: 'error',
            rationaleText: '', category: 'closure', attributes: { id: 'CR-CLOSURE-001', targetAttribute: 'a' },
            file: 'test.sysml',
        });
        registry.register({
            id: 'COV-001', name: 'C2', description: '', appliesTo: 'Y',
            predicate: 'coverageCheck', strength: 'required', severity: 'warning',
            rationaleText: '', category: 'coverage', attributes: { id: 'COV-001', standard: 'ISO 14971' },
            file: 'test.sysml',
        });

        expect(registry.byCategory('closure')).toHaveLength(1);
        expect(registry.byCategory('coverage')).toHaveLength(1);
        expect(registry.byStandard('ISO 14971')).toHaveLength(1);
    });

    it('skips coverage rules when converting to ClosureRules', () => {
        const registry = new RuleRegistry();
        registry.register({
            id: 'COV-SKIP-001', name: 'CovRule', description: '', appliesTo: 'X',
            predicate: 'coverageCheck', strength: 'required', severity: 'error',
            rationaleText: '', category: 'coverage', attributes: { id: 'COV-SKIP-001' },
            file: 'test.sysml',
        });

        const closureRules = registry.toClosureRules();
        expect(closureRules).toHaveLength(0);
    });
});

describe('ConstraintInterpreter', () => {
    it('loads config rules', () => {
        const interpreter = new ConstraintInterpreter();
        const configRules: ClosureRule[] = [{
            id: 'CR-001',
            description: 'Test',
            entity: 'Hazard',
            rule: { type: 'requireRelationship', relationship: 'mitigates', min: 1 },
            severity: 'error',
        }];

        interpreter.loadFromConfig(configRules);
        expect(interpreter.size).toBe(1);
        expect(interpreter.bySource('config')).toHaveLength(1);
    });

    it('ontology rules replace config rules with same ID', () => {
        const interpreter = new ConstraintInterpreter();

        interpreter.loadFromConfig([{
            id: 'CR-001',
            description: 'From config',
            entity: 'Hazard',
            rule: { type: 'requireRelationship', relationship: 'mitigates', min: 1 },
            severity: 'error',
        }]);

        const registry = new RuleRegistry();
        registry.register({
            id: 'CR-001', name: 'OntologyRule', description: 'From ontology',
            appliesTo: 'Hazard', predicate: 'requireRelationship', strength: 'required',
            severity: 'error', rationaleText: '', category: 'closure',
            attributes: { id: 'CR-001', relationshipType: 'mitigates', minCount: '1' },
            file: 'test.sysml',
        });

        interpreter.loadFromRegistry(registry);

        expect(interpreter.size).toBe(1);
        expect(interpreter.bySource('ontology')).toHaveLength(1);
        expect(interpreter.bySource('config')).toHaveLength(0);
        expect(interpreter.toClosureRules()[0].description).toBe('From ontology');
    });

    it('merges config and ontology rules with different IDs', () => {
        const interpreter = new ConstraintInterpreter();

        interpreter.loadFromConfig([{
            id: 'CR-001',
            description: 'Config rule',
            entity: 'Hazard',
            rule: { type: 'requireRelationship', relationship: 'mitigates', min: 1 },
            severity: 'error',
        }]);

        const registry = new RuleRegistry();
        registry.register({
            id: 'CR-002', name: 'OntologyRule', description: 'Ontology rule',
            appliesTo: 'Software', predicate: 'requireAttribute', strength: 'required',
            severity: 'error', rationaleText: '', category: 'closure',
            attributes: { id: 'CR-002', targetAttribute: 'safetyClass' },
            file: 'test.sysml',
        });

        interpreter.loadFromRegistry(registry);

        expect(interpreter.size).toBe(2);
        expect(interpreter.bySource('config')).toHaveLength(1);
        expect(interpreter.bySource('ontology')).toHaveLength(1);
    });
});

// ─── The rule editor's logic ─────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ClauseFact } from '@memoarchitect/tools/browser';
import {
    EMPTY_FORM, clauseLabel, conditionOf, domainCounts, formGaps, ruleRows, ruleState, searchClauses, suggestTypeName, toPayload,
    type EditorRule, type RuleFormState,
} from '../rules-editor-model';

const clauses: ClauseFact[] = [
    { qualifiedName: 'p::iso14971::c7', standard: 'ISO 14971:2019', clauseNumber: '7', title: 'risk control' },
    { qualifiedName: 'p::iec62304::c5_2', standard: 'IEC 62304:2006+AMD1:2015', clauseNumber: '5.2', title: 'software requirements analysis' },
];
const rule = (over: Partial<EditorRule> = {}): EditorRule => ({
    sourceRuleId: 'CR-MED-001', sourceRuleType: 'HazardMitigationRule', disposition: 'enabled',
    declaredSeverity: 'error', effectiveSeverity: 'error', tailoring: 'assurance', domain: 'medicalDevice',
    enforces: ['p::iso14971::c7'], ...over,
});

describe('ruleState', () => {
    it('says what became of a rule', () => {
        expect(ruleState(rule())).toBe('on');
        expect(ruleState(rule({ disposition: 'disabled' }))).toBe('off');
        expect(ruleState(rule({ disposition: 'replaced' }))).toBe('replaced');
        expect(ruleState(rule({ effectiveSeverity: 'warning' }))).toBe('severity changed');
    });
});

describe('ruleRows', () => {
    const rules = [
        rule(),
        rule({ sourceRuleId: 'CR-MED-021', sourceRuleType: 'SwComponentReqRule', enforces: [] }),
        rule({ sourceRuleId: 'CR-ONT-001', sourceRuleType: 'ContainmentAcyclicRule', domain: 'modelling', tailoring: 'invariant', enforces: [] }),
        rule({ sourceRuleId: 'ORG-001', sourceRuleType: 'TwoControls', domain: 'organisation', enforces: ['p::iso14971::c7'] }),
    ];

    it('names the clauses a rule enforces', () => {
        const [first] = ruleRows(rules, clauses, 'all', '');
        expect(first.id).toBe('CR-MED-001');
        expect(first.clauses[0].label).toBe('ISO 14971:2019 §7');
    });
    it('marks a medical-device rule that traces to nothing, and only that', () => {
        const rows = ruleRows(rules, clauses, 'all', '');
        expect(rows.filter(r => r.untraced).map(r => r.id)).toEqual(['CR-MED-021']);
    });
    it('filters by domain and counts them', () => {
        expect(ruleRows(rules, clauses, 'organisation', '').map(r => r.id)).toEqual(['ORG-001']);
        expect(domainCounts(rules)).toEqual({ all: 4, medicalDevice: 2, modelling: 1, organisation: 1 });
    });
    it('searches the id, the name and the clause', () => {
        expect(ruleRows(rules, clauses, 'all', 'acyclic').map(r => r.id)).toEqual(['CR-ONT-001']);
        expect(ruleRows(rules, clauses, 'all', '14971').map(r => r.id)).toEqual(['CR-MED-001', 'ORG-001']);
    });
    it('shows the qualified name for a clause the model lacks', () => {
        expect(clauseLabel(clauses, 'gone::c1')).toBe('gone::c1');
    });
    it('flags an invariant', () => {
        expect(ruleRows(rules, clauses, 'modelling', '')[0].invariant).toBe(true);
    });
});

describe('searchClauses', () => {
    it('finds a clause by standard, number or topic, and nothing for nothing', () => {
        expect(searchClauses(clauses, '62304 5.2').map(c => c.clauseNumber)).toEqual(['5.2']);
        expect(searchClauses(clauses, 'risk').map(c => c.clauseNumber)).toEqual(['7']);
        expect(searchClauses(clauses, '')).toEqual([]);
        expect(searchClauses(clauses, 'zzz')).toEqual([]);
    });
});

describe('the new-rule form', () => {
    const filled = (over: Partial<RuleFormState> = {}): RuleFormState => ({
        ...EMPTY_FORM, id: 'ORG-001', typeName: 'TwoControls', appliesTo: 'Hazard', relation: 'mitigates', count: '2',
        rationale: 'SOP 4.1', file: 'model/rules.sysml', ...over,
    });

    it('lists what is missing, and nothing once complete', () => {
        expect(formGaps(EMPTY_FORM)).toEqual(['an id', 'a name', 'what it applies to', 'a condition', 'a rationale', 'a file to write it into']);
        expect(formGaps(filled())).toEqual([]);
    });
    it('builds each condition', () => {
        expect(conditionOf(filled())).toEqual({ kind: 'atLeast', relation: 'mitigates', count: 2 });
        expect(conditionOf(filled({ conditionKind: 'atMost', count: '8' }))).toEqual({ kind: 'atMost', relation: 'mitigates', count: 8 });
        expect(conditionOf(filled({ conditionKind: 'attributeSet', attribute: 'safetyClass' }))).toEqual({ kind: 'attributeSet', attribute: 'safetyClass' });
        expect(conditionOf(filled({ conditionKind: 'expression', expression: ' verifiedBy->size() >= 1 ' }))).toEqual({ kind: 'expression', expression: 'verifiedBy->size() >= 1' });
    });
    it('has no condition for a count that is not a whole number or a field left empty', () => {
        expect(conditionOf(filled({ count: '1.5' }))).toBeUndefined();
        expect(conditionOf(filled({ count: '-1' }))).toBeUndefined();
        expect(conditionOf(filled({ count: '' }))).toBeUndefined();
        expect(conditionOf(filled({ conditionKind: 'attributeSet', attribute: '' }))).toBeUndefined();
    });
    it('sends a payload only when complete', () => {
        expect(toPayload(EMPTY_FORM)).toBeUndefined();
        expect(toPayload(filled({ enforces: ['p::iso14971::c7'] }))).toMatchObject({
            id: 'ORG-001', typeName: 'TwoControls', appliesTo: 'Hazard', severity: 'warning',
            condition: { kind: 'atLeast', relation: 'mitigates', count: 2 }, enforces: ['p::iso14971::c7'], file: 'model/rules.sysml',
        });
        expect(toPayload(filled())).not.toHaveProperty('enforces');
    });
    it('suggests a definition name', () => {
        expect(suggestTypeName('org 001')).toBe('Org001');
        expect(suggestTypeName('two  independent controls')).toBe('TwoIndependentControls');
        expect(suggestTypeName('')).toBe('');
    });
});

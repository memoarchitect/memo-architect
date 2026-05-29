import { describe, it, expect } from 'vitest';
import { evaluateNativeConstraint, type NativeConstraint } from '../validator/constraint-eval.js';
import type { MemoModel, MemoElement, MemoRelationship } from '../model/semantic.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function el(id: string, kind: string, attrs: Record<string, string> = {}): MemoElement {
    return { id, name: id, kind, construct: 'action', layer: 'behavior', file: 'test.sysml', attributes: attrs };
}

function rel(id: string, type: string, sourceId: string, targetId: string): MemoRelationship {
    return { id, type, sourceId, sourceEnd: 'a', targetId, targetEnd: 'b', file: 'test.sysml' };
}

function makeModel(elements: MemoElement[], relationships: MemoRelationship[]): MemoModel {
    const byId = new Map(elements.map(e => [e.id, e]));
    const byKind = new Map<string, MemoElement[]>();
    const byLayer = new Map<string, MemoElement[]>();
    const outgoing = new Map<string, MemoRelationship[]>();
    const incoming = new Map<string, MemoRelationship[]>();
    const relByType = new Map<string, MemoRelationship[]>();
    for (const e of elements) {
        (byKind.get(e.kind) ?? byKind.set(e.kind, []).get(e.kind)!).push(e);
        (byLayer.get(e.layer) ?? byLayer.set(e.layer, []).get(e.layer)!).push(e);
    }
    for (const r of relationships) {
        (outgoing.get(r.sourceId) ?? outgoing.set(r.sourceId, []).get(r.sourceId)!).push(r);
        (incoming.get(r.targetId) ?? incoming.set(r.targetId, []).get(r.targetId)!).push(r);
        (relByType.get(r.type) ?? relByType.set(r.type, []).get(r.type)!).push(r);
    }
    return {
        elements: byId, relationships, errors: [],
        elementsByKind: byKind, elementsByLayer: byLayer,
        relationshipsByType: relByType, outgoing, incoming,
    };
}

// Reference fixture: one allocated function, one un-allocated function, one block.
function allocationModel(): MemoModel {
    return makeModel(
        [el('pumpControl', 'Function'), el('idleMonitor', 'Function'), el('controllerBlock', 'LogicalBlock')],
        [rel('r1', 'allocate', 'pumpControl', 'controllerBlock')],
    );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('native constraint evaluator (Epic EE ⊕-0 spike)', () => {
    it('flags the function with no allocation — "allocate->notEmpty()"', () => {
        const c: NativeConstraint = {
            id: 'EE-ALLOC-001',
            description: 'Every function must be allocated to a structural block.',
            appliesToKind: 'Function',
            expression: 'allocate->notEmpty()',
            severity: 'error',
        };
        const violations = evaluateNativeConstraint(c, allocationModel());
        expect(violations).toHaveLength(1);
        expect(violations[0].elementId).toBe('idleMonitor');
        expect(violations[0].ruleId).toBe('EE-ALLOC-001');
        expect(violations[0].severity).toBe('error');
    });

    it('supports size comparison — "allocate->size() >= 1"', () => {
        const c: NativeConstraint = {
            id: 'EE-ALLOC-002', description: 'allocated at least once', appliesToKind: 'Function',
            expression: 'allocate->size() >= 1', severity: 'warning',
        };
        const v = evaluateNativeConstraint(c, allocationModel());
        expect(v.map(x => x.elementId)).toEqual(['idleMonitor']);
    });

    it('supports boolean conjunction across two relationship types', () => {
        // Requirement traceability: must satisfy a need AND mitigate a risk.
        const model = makeModel(
            [
                el('REQ-1', 'Requirement'), el('REQ-2', 'Requirement'),
                el('NEED-1', 'UserNeed'), el('RISK-1', 'Risk'),
            ],
            [
                rel('a', 'satisfy', 'REQ-1', 'NEED-1'), rel('b', 'mitigates', 'REQ-1', 'RISK-1'),
                rel('c', 'satisfy', 'REQ-2', 'NEED-1'), // REQ-2 satisfies need but mitigates no risk
            ],
        );
        const c: NativeConstraint = {
            id: 'EE-TRACE-001', description: 'requirement traces to need and risk', appliesToKind: 'Requirement',
            expression: 'satisfy->notEmpty() and mitigates->notEmpty()', severity: 'error',
        };
        const v = evaluateNativeConstraint(c, model);
        expect(v.map(x => x.elementId)).toEqual(['REQ-2']);
    });

    it('passes vacuously when no element of the subject kind exists', () => {
        const c: NativeConstraint = {
            id: 'EE-X', description: 'n/a', appliesToKind: 'Nonexistent',
            expression: 'allocate->notEmpty()', severity: 'error',
        };
        expect(evaluateNativeConstraint(c, allocationModel())).toHaveLength(0);
    });

    it('rejects an unsupported collection op with a clear error', () => {
        const c: NativeConstraint = {
            id: 'EE-BAD', description: 'bad', appliesToKind: 'Function',
            expression: 'allocate->forAll()', severity: 'error',
        };
        expect(() => evaluateNativeConstraint(c, allocationModel())).toThrow(/Unsupported collection op/);
    });
});

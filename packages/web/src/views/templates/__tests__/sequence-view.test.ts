// ─── Sequence template tests (KK-6 structure logic) ─────────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import {
    buildSequenceModel, itemShortName, resolveLifelineLabel, isStepElement,
} from '../sequence-view';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'FunctionalChainStep',
        construct: 'part',
        layer: 'system',
        file: 'test.sysml',
        attributes: {},
        ...overrides,
    };
}

function rel(type: string, sourceId: string, targetId: string): MemoRelationship {
    return {
        id: `r-${type}-${sourceId}-${targetId}`,
        type, sourceId, targetId,
        sourceEnd: '', targetEnd: '', file: 'test.sysml',
    };
}

function model(elements: MemoElement[], relationships: MemoRelationship[] = []): MemoModelDTO {
    return {
        elements: Object.fromEntries(elements.map(e => [e.id, e])),
        relationships,
        errors: [],
    } as unknown as MemoModelDTO;
}

function step(id: string, order: string, fn: string, item?: string): MemoElement {
    return el(id, {
        attributes: {
            stepOrder: order,
            allocatedFunction: fn,
            ...(item ? { exchangeItem: item } : {}),
        },
    });
}

describe('itemShortName / resolveLifelineLabel / isStepElement', () => {
    it('strips the id prefix from exchange item references', () => {
        expect(itemShortName('DD-002: BolusRequestSignal')).toBe('BolusRequestSignal');
        expect(itemShortName('FlowCommand')).toBe('FlowCommand');
        expect(itemShortName(undefined)).toBeUndefined();
    });

    it('resolves lifeline labels via element attribute ids', () => {
        const fn = el('fnAcquireSensors', {
            kind: 'LogicalFunction',
            name: 'AcquireSensorData',
            attributes: { id: 'FUNC-001' },
        });
        const m = model([fn]);
        expect(resolveLifelineLabel('FUNC-001', m)).toBe('AcquireSensorData');
        expect(resolveLifelineLabel('fnAcquireSensors', m)).toBe('AcquireSensorData');
        expect(resolveLifelineLabel('FUNC-999', m)).toBe('FUNC-999');
    });

    it('recognizes steps by kind suffix or stepOrder attribute', () => {
        expect(isStepElement(el('s', { kind: 'FunctionalChainStep' }))).toBe(true);
        expect(isStepElement(el('s', { kind: 'Custom', attributes: { stepOrder: '2' } }))).toBe(true);
        expect(isStepElement(el('s', { kind: 'FunctionalChain' }))).toBe(false);
    });
});

describe('buildSequenceModel', () => {
    it('groups steps per chain via IncludesStep edges, ordered by stepOrder', () => {
        const chain = el('fc1', { kind: 'FunctionalChain', name: 'BolusChain' });
        const scenario = el('ss1', { kind: 'SystemScenario', name: 'BolusDuringBasal' });
        const s1 = step('s1', '1', 'FUNC-001', 'DD-002: BolusRequestSignal');
        const s2 = step('s2', '2', 'FUNC-006', 'DD-001: PrescriptionRecord');
        const s3 = step('s3', '10', 'FUNC-001');
        const m = model([chain, scenario, s2, s3, s1], [
            rel('includesStep', 'fc1', 's1'),
            rel('includesStep', 'fc1', 's2'),
            rel('includesStep', 'fc1', 's3'),
            rel('realizesScenario', 'fc1', 'ss1'),
        ]);
        const seq = buildSequenceModel(m);
        expect(seq.sections).toHaveLength(1);
        expect(seq.sections[0].chain?.name).toBe('BolusChain');
        expect(seq.sections[0].scenario).toBe('BolusDuringBasal');
        // Numeric ordering (10 after 2), lanes assigned in first-use order
        expect(seq.sections[0].occurrences.map(o => o.step.id)).toEqual(['s1', 's2', 's3']);
        expect(seq.sections[0].occurrences.map(o => o.lane)).toEqual([0, 1, 0]);
        expect(seq.sections[0].occurrences[0].item).toBe('BolusRequestSignal');
        expect(seq.lifelines.map(l => l.id)).toEqual(['FUNC-001', 'FUNC-006']);
    });

    it('collects unclaimed steps into a trailing section', () => {
        const s1 = step('lone', '1', 'FUNC-002');
        const seq = buildSequenceModel(model([s1]));
        expect(seq.sections).toHaveLength(1);
        expect(seq.sections[0].chain).toBeUndefined();
        expect(seq.sections[0].occurrences.map(o => o.step.id)).toEqual(['lone']);
    });
});

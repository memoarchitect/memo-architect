// ─── Sequence template tests (KK-6 structure logic) ─────────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import {
    buildSequenceModel, itemShortName, resolveLifelineLabel, isStepElement, referenceKey,
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

describe('referenceKey', () => {
    it('drops a trailing label but keeps a qualified id whole', () => {
        expect(referenceKey('FUNC-001: AcquireSensorData')).toBe('FUNC-001');
        expect(referenceKey('pkg::pumpController')).toBe('pkg::pumpController');
        expect(referenceKey('pkg::sub::pumpMechanism')).toBe('pkg::sub::pumpMechanism');
    });

    it('gives steps allocated to different qualified parts different lifelines', () => {
        const chain = el('pkg::fc', { kind: 'FunctionalFlow', construct: 'action' });
        const a = el('pkg::fc::a', { kind: 'ActionUsage', construct: 'action', parentAction: 'pkg::fc', allocatedTo: 'pkg::clinician' });
        const b = el('pkg::fc::b', { kind: 'ActionUsage', construct: 'action', parentAction: 'pkg::fc', allocatedTo: 'pkg::pumpController' });
        const seq = buildSequenceModel(model([chain, a, b]), e => e.id === 'pkg::fc');
        expect(seq.lifelines.map(l => l.id)).toEqual(['pkg::clinician', 'pkg::pumpController']);
    });
});

describe('fragments', () => {
    it('finds a fragment by the declared name a step writes', () => {
        const chain = el('pkg::fc', { kind: 'FunctionalFlow', construct: 'action' });
        const loop = el('pkg::monitorLoop', { shortName: 'monitorLoop', name: 'Monitor Loop', kind: 'Part', attributes: { fragmentType: 'loop' } });
        const read = el('pkg::fc::read', { kind: 'ActionUsage', construct: 'action', parentAction: 'pkg::fc', attributes: { fragment: 'monitorLoop' } });
        const seq = buildSequenceModel(model([chain, loop, read]), e => e.id !== 'pkg::fc::read');
        expect(seq.sections[0].fragments.map(f => f.type)).toEqual(['loop']);
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

    it('takes the untyped actions nested in a shown chain as its steps', () => {
        // `action fcsAlarmSense :> fnAcquireSensors { out item sensorVector :> ddSensorVector; }`
        // inside the flow: no step kind, owned through parentAction. The view
        // selects the flow; its steps come with it.
        const chain = el('fc', { kind: 'FunctionalFlow', name: 'AlarmChain', construct: 'action' });
        const nested = (id: string, fn: string, out?: string): MemoElement => el(id, {
            kind: 'ActionUsage', construct: 'action', parentAction: 'fc',
            attributes: { subsets: fn },
            ...(out ? { parameters: [{ name: 'x', direction: 'out', type: out }] } : {}),
        });
        const sense = nested('sense', 'fnAcquireSensors', 'ddSensorVector');
        const evaluate = nested('evaluate', 'fnMonitorAlarm');
        const typed = el('oa', { kind: 'OperativeAction', construct: 'action', parentAction: 'fc' });
        const seq = buildSequenceModel(model([chain, sense, evaluate, typed]), e => e.id === 'fc');

        expect(seq.sections).toHaveLength(1);
        expect(seq.sections[0].chain?.id).toBe('fc');
        expect(seq.sections[0].occurrences.map(o => o.step.id)).toEqual(['sense', 'evaluate']);
        expect(seq.lifelines.map(l => l.id)).toEqual(['fnAcquireSensors', 'fnMonitorAlarm']);
        expect(seq.sections[0].occurrences[0].item).toBe('ddSensorVector');
    });

    it('does not take nested actions of a chain the view does not show', () => {
        const chain = el('fc', { kind: 'FunctionalFlow', construct: 'action' });
        const nested = el('sense', { kind: 'ActionUsage', construct: 'action', parentAction: 'fc' });
        expect(buildSequenceModel(model([chain, nested]), () => false).sections).toEqual([]);
    });

    it('collects unclaimed steps into a trailing section', () => {
        const s1 = step('lone', '1', 'FUNC-002');
        const seq = buildSequenceModel(model([s1]));
        expect(seq.sections).toHaveLength(1);
        expect(seq.sections[0].chain).toBeUndefined();
        expect(seq.sections[0].occurrences.map(o => o.step.id)).toEqual(['lone']);
    });
});

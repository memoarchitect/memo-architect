// ─── Action Flow template tests (KK-4 structure logic) ──────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memo/core';
import {
    collectActionFlowActions, actionPortNames, assignLanes, UNALLOCATED_LANE,
} from '../actionflow-view';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'ActionUsage',
        construct: 'action',
        layer: 'behavior',
        file: 'test.sysml',
        attributes: {},
        ...overrides,
    };
}

function model(elements: MemoElement[], relationships: MemoRelationship[] = []): MemoModelDTO {
    return {
        elements: Object.fromEntries(elements.map(e => [e.id, e])),
        relationships,
        errors: [],
    } as unknown as MemoModelDTO;
}

describe('collectActionFlowActions', () => {
    it('prefers nested step actions over the composite wrapper', () => {
        const m = model([
            el('pipeline'),
            el('sense', { parentAction: 'pipeline' }),
            el('actuate', { parentAction: 'pipeline' }),
        ]);
        expect(collectActionFlowActions(m).map(a => a.id).sort()).toEqual(['actuate', 'sense']);
    });

    it('falls back to parentless actions when no nested steps exist', () => {
        const m = model([el('standalone'), el('other', { kind: 'ModeState', construct: 'part' })]);
        expect(collectActionFlowActions(m).map(a => a.id)).toEqual(['standalone']);
    });

    it('honors the viewpoint filter', () => {
        const m = model([
            el('inView', { parentAction: 'p' }),
            el('outOfView', { parentAction: 'p' }),
        ]);
        const actions = collectActionFlowActions(m, e => e.id === 'inView');
        expect(actions.map(a => a.id)).toEqual(['inView']);
    });
});

describe('actionPortNames', () => {
    it('resolves in/out ports from the typing ActionDefinition', () => {
        const def = el('AcquireSensorData', {
            kind: 'ActionDefinition',
            construct: 'action',
            parameters: [
                { name: 'trigger', direction: 'in', type: 'Signal' },
                { name: 'sensorStatus', direction: 'out', type: 'SensorStatusVector' },
                { name: 'buffer', direction: 'inout', type: 'DataBuffer' },
            ],
        });
        const usage = el('acquireSensors', { attributes: { actionType: 'AcquireSensorData' } });
        const ports = actionPortNames(usage, model([def, usage]));
        expect(ports.inPorts).toEqual(['trigger', 'buffer']);
        expect(ports.outPorts).toEqual(['sensorStatus', 'buffer']);
    });

    it('falls back to the usage\'s own parameters when untyped', () => {
        const usage = el('a', {
            parameters: [{ name: 'x', direction: 'out', type: 'T' }],
        });
        const ports = actionPortNames(usage, model([usage]));
        expect(ports.outPorts).toEqual(['x']);
        expect(ports.inPorts).toEqual([]);
    });
});

describe('assignLanes', () => {
    it('groups actions by allocation target and resolves lane labels', () => {
        const target = el('infusionMgr', { kind: 'SoftwareComponent', construct: 'part', name: 'InfusionManager' });
        const a = el('computeFlow', { allocatedTo: 'infusionMgr' });
        const b = el('enforceLimits', { allocatedTo: 'infusionMgr' });
        const c = el('floating');
        const { laneOf, lanes } = assignLanes([a, b, c], model([target, a, b, c]));
        expect(laneOf.get('computeFlow')).toBe('infusionMgr');
        expect(laneOf.get('enforceLimits')).toBe('infusionMgr');
        expect(laneOf.get('floating')).toBe(UNALLOCATED_LANE);
        expect(lanes.map(l => l.label)).toEqual(['InfusionManager', UNALLOCATED_LANE]);
        // Stable distinct colors per lane
        expect(new Set(lanes.map(l => l.color)).size).toBe(2);
    });
});

// ─── Action Flow template tests (KK-4 structure logic) ──────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memo/tools/browser';
import {
    collectActionFlowActions, actionPortNames, assignLanes, UNALLOCATED_LANE, UNSTAGED_LANE,
    classifyFlowItem, isControlNode, displayElementAtLevel, displayNameAtLevel, commonDisplayLevels,
    findFloatingActions,
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

    it('reveals grandchildren only when their composite action is expanded', () => {
        const m = model([
            el('pipeline'),
            el('process', { parentAction: 'pipeline' }),
            el('finish', { parentAction: 'pipeline' }),
            el('stepA', { parentAction: 'process' }),
            el('stepB', { parentAction: 'process' }),
        ]);

        expect(collectActionFlowActions(m).map(a => a.id)).toEqual(['process', 'finish']);
        expect(collectActionFlowActions(m, undefined, new Set(['process'])).map(a => a.id))
            .toEqual(['stepA', 'stepB', 'finish']);
    });

    it('projects only direct children when a composite action is focused', () => {
        const m = model([
            el('pipeline'),
            el('process', { parentAction: 'pipeline' }),
            el('finish', { parentAction: 'pipeline' }),
            el('stepA', { parentAction: 'process' }),
            el('stepB', { parentAction: 'process' }),
        ]);

        expect(collectActionFlowActions(m, undefined, new Set(), 'process').map(a => a.id))
            .toEqual(['stepA', 'stepB']);
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

    it('can highlight modeled workflow stages', () => {
        const preop = el('verify', { layer: 'operational', attributes: { stage: 'Pre-op' } });
        const postop = el('archive', { layer: 'operations', attributes: { phase: 'Post-op' } });
        const unstaged = el('notify', { layer: 'operations' });
        const m = model([preop, postop, unstaged]);

        expect(assignLanes([preop, postop, unstaged], m, 'stage').lanes.map(l => l.label))
            .toEqual(['Pre-op', 'Post-op', UNSTAGED_LANE]);
        expect(assignLanes([preop, postop, unstaged], m, 'stage').lanes.map(l => l.inspectElementId))
            .toEqual(['verify', 'archive', 'notify']);
    });

    it('infers L1/L2/L3 from composition parents and rolls allocations up', () => {
        const system = el('system', { kind: 'System', construct: 'part', name: 'Pump System' });
        const subsystem = el('delivery', { kind: 'Subsystem', construct: 'part', name: 'Delivery Subsystem' });
        const component = el('motor', { kind: 'Component', construct: 'part', name: 'Motor' });
        const drive = el('drive', { allocatedTo: 'motor' });
        const relationships = [
            { id: 'r1', type: 'composedOf', sourceId: 'system', targetId: 'delivery', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r2', type: 'composedOf', sourceId: 'delivery', targetId: 'motor', sourceEnd: '', targetEnd: '', file: '' },
        ];
        const m = model([system, subsystem, component, drive], relationships);

        expect(displayElementAtLevel('motor', m)).toEqual({ id: 'motor', level: 3 });
        expect(assignLanes([drive], m, 'allocation', 1).lanes[0].label).toBe('Pump System');
        expect(assignLanes([drive], m, 'allocation', 2).lanes[0].label).toBe('Delivery Subsystem');
        expect(assignLanes([drive], m, 'allocation', 3).lanes[0].label).toBe('Motor');
    });

    it('resolves the selected-level ancestor name for the allocated action', () => {
        const system = el('system', { kind: 'System', construct: 'part', name: 'Pump System' });
        const subsystem = el('delivery', { kind: 'Subsystem', construct: 'part', name: 'Delivery Subsystem' });
        const component = el('motor', { kind: 'Component', construct: 'part', name: 'Motor' });
        const relationships = [
            { id: 'r1', type: 'composedOf', sourceId: 'system', targetId: 'delivery', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r2', type: 'composedOf', sourceId: 'delivery', targetId: 'motor', sourceEnd: '', targetEnd: '', file: '' },
        ];
        const m = model([system, subsystem, component], relationships);
        expect(displayNameAtLevel('motor', m, 2)).toBe('Delivery Subsystem');
    });

    it('offers only levels shared by every displayed target', () => {
        const system = el('system', { kind: 'System', construct: 'part' });
        const subsystem = el('subsystem', { kind: 'Subsystem', construct: 'part' });
        const deep = el('deep', { kind: 'Component', construct: 'part' });
        const shallow = el('shallow', { kind: 'Component', construct: 'part' });
        const relationships = [
            { id: 'r1', type: 'composedOf', sourceId: 'system', targetId: 'subsystem', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r2', type: 'composedOf', sourceId: 'subsystem', targetId: 'deep', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r3', type: 'composedOf', sourceId: 'system', targetId: 'shallow', sourceEnd: '', targetEnd: '', file: '' },
        ];
        const m = model([system, subsystem, deep, shallow], relationships);
        expect(commonDisplayLevels(['deep'], m)).toEqual([1, 2, 3]);
        expect(commonDisplayLevels(['deep', 'shallow'], m)).toEqual([1, 2]);
        expect(commonDisplayLevels(['deep', 'system'], m)).toEqual([]);
    });

    it('supports arbitrary Ln hierarchy depth', () => {
        const elements = Array.from({ length: 6 }, (_, index) => el(`n${index + 1}`, {
            kind: index === 0 ? 'System' : 'Component',
            construct: 'part',
        }));
        const relationships = elements.slice(1).map((element, index) => ({
            id: `r${index + 1}`,
            type: 'composedOf',
            sourceId: elements[index].id,
            targetId: element.id,
            sourceEnd: '', targetEnd: '', file: '',
        }));
        const m = model(elements, relationships);

        expect(commonDisplayLevels(['n6'], m)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(displayNameAtLevel('n6', m, 5)).toBe('n5');
    });
});

describe('classifyFlowItem', () => {
    it('classifies data, energy, and material flows for renderer visibility', () => {
        expect(classifyFlowItem('ClinicalDataPacket')).toBe('data');
        expect(classifyFlowItem('BatteryEnergy')).toBe('energy');
        expect(classifyFlowItem('MedicationMaterialBatch')).toBe('material');
    });
});

describe('control nodes (fork/join)', () => {
    it('identifies fork and join builder kinds', () => {
        expect(isControlNode(el('f', { kind: 'ForkNode' }))).toBe(true);
        expect(isControlNode(el('j', { kind: 'JoinNode' }))).toBe(true);
        expect(isControlNode(el('a', { kind: 'ActionUsage' }))).toBe(false);
    });

    it('are collected into the flow like actions', () => {
        const m = model([
            el('flow'),
            el('verify', { parentAction: 'flow' }),
            el('splitPrep', { parentAction: 'flow', kind: 'ForkNode', attributes: { controlKind: 'fork' } }),
            el('prime', { parentAction: 'flow' }),
        ]);
        expect(collectActionFlowActions(m).map(a => a.id).sort())
            .toEqual(['prime', 'splitPrep', 'verify']);
    });

    it('never define a swimlane of their own', () => {
        const target = el('nurse', { kind: 'Actor', construct: 'part', name: 'Nurse' });
        const verify = el('verify', { allocatedTo: 'nurse' });
        const fork = el('splitPrep', { kind: 'ForkNode' });
        const { laneOf, lanes } = assignLanes([verify, fork], model([target, verify, fork]));
        expect(laneOf.get('verify')).toBe('nurse');
        expect(laneOf.has('splitPrep')).toBe(false);
        // No spurious "Unallocated" lane created for the fork bar
        expect(lanes.map(l => l.label)).toEqual(['Nurse']);
    });
});

describe('floating actions', () => {
    it('reports behavioral steps with no flow or succession connection', () => {
        const connected = el('connected');
        const other = el('other');
        const floating = el('floating');
        const relationships: MemoRelationship[] = [{
            id: 's1', type: 'succession', sourceId: 'connected', targetId: 'other',
            sourceEnd: '', targetEnd: '', file: '',
        }];
        const m = model([connected, other, floating], relationships);
        expect(findFloatingActions([connected, other, floating], m).map(action => action.id)).toEqual(['floating']);
    });
});

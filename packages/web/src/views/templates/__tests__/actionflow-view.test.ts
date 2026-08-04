// ─── Action Flow template tests (KK-4 structure logic) ──────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import {
    collectActionFlowActions, collectNestedActionFlowActions,
    actionPortNames, assignLanes, UNALLOCATED_LANE, UNSTAGED_LANE,
    classifyFlowItem, isControlNode, activityNodeType, displayElementAtLevel, displayNameAtLevel, commonDisplayLevels,
    findFloatingActions, flatExpandedGroups, computeActionFlowViewLayout,
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

describe('collectNestedActionFlowActions', () => {
    const nestedModel = () => model([
        el('pipeline'),
        el('process', { parentAction: 'pipeline' }),
        el('finish', { parentAction: 'pipeline' }),
        el('stepA', { parentAction: 'process' }),
        el('stepB', { parentAction: 'process' }),
    ]);

    it('keeps a collapsed composite as a plain action, like the flat projection', () => {
        const projection = collectNestedActionFlowActions(nestedModel());
        expect(projection.actions.map(a => a.id)).toEqual(['process', 'finish']);
        expect(projection.childrenOf.size).toBe(0);
    });

    it('keeps an expanded composite as a frame around its own steps', () => {
        const projection = collectNestedActionFlowActions(
            nestedModel(), undefined, new Set(['process']));

        // The composite survives — that is what separates nested from flat.
        expect(projection.actions.map(a => a.id)).toEqual(['process', 'stepA', 'stepB', 'finish']);
        expect(projection.childrenOf.get('process')).toEqual(['stepA', 'stepB']);
        expect(projection.parentOf.get('stepA')).toBe('process');
        expect(projection.parentOf.has('finish')).toBe(false);
    });

    it('emits a frame before the steps drawn inside it', () => {
        const projection = collectNestedActionFlowActions(
            nestedModel(), undefined, new Set(['process']));
        const order = projection.actions.map(a => a.id);
        expect(order.indexOf('process')).toBeLessThan(order.indexOf('stepA'));
    });

    it('nests recursively through deeper expanded composites', () => {
        const m = model([
            el('pipeline'),
            el('process', { parentAction: 'pipeline' }),
            el('stepA', { parentAction: 'process' }),
            el('inner', { parentAction: 'stepA' }),
        ]);
        const projection = collectNestedActionFlowActions(
            m, undefined, new Set(['process', 'stepA']));
        expect(projection.parentOf.get('inner')).toBe('stepA');
        expect(projection.parentOf.get('stepA')).toBe('process');
    });

    it('projects direct children when a composite action is focused', () => {
        const projection = collectNestedActionFlowActions(
            nestedModel(), undefined, new Set(), 'process');
        expect(projection.actions.map(a => a.id)).toEqual(['stepA', 'stepB']);
        expect(projection.parentOf.size).toBe(0);
    });

    it('honors the viewpoint filter', () => {
        const projection = collectNestedActionFlowActions(
            nestedModel(), e => e.id !== 'stepB', new Set(['process']));
        expect(projection.childrenOf.get('process')).toEqual(['stepA']);
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

describe('SysML v2 activity-node audit', () => {
    it('recognizes standard activity nodes and common importer aliases', () => {
        expect(activityNodeType(el('route', { kind: 'DecisionNodeUsage', construct: 'decision' }))).toBe('decision');
        expect(activityNodeType(el('afterRoute', { kind: 'MergeNode' }))).toBe('merge');
        expect(activityNodeType(el('receive', { kind: 'AcceptActionUsage' }))).toBe('accept');
        expect(activityNodeType(el('send', { kind: 'SendActionUsage' }))).toBe('send');
        expect(activityNodeType(el('stop', { kind: 'TerminateActionUsage' }))).toBe('activityFinal');
        expect(activityNodeType(el('discard', { kind: 'FlowFinalNode' }))).toBe('flowFinal');
    });

    it('keeps decisions, merges, and finals in the visible activity graph', () => {
        const m = model([
            el('activity'),
            el('receive', { parentAction: 'activity', kind: 'AcceptActionUsage' }),
            el('route', { parentAction: 'activity', kind: 'DecisionNodeUsage', construct: 'decision' }),
            el('merge', { parentAction: 'activity', kind: 'MergeNodeUsage', construct: 'merge' }),
            el('stop', { parentAction: 'activity', kind: 'ActivityFinalNodeUsage' }),
        ]);
        expect(collectActionFlowActions(m).map(node => node.id)).toEqual(['receive', 'route', 'merge', 'stop']);
        expect(isControlNode(m.elements.route)).toBe(true);
        expect(isControlNode(m.elements.stop)).toBe(true);
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

describe('flatExpandedGroups', () => {
    /**
     * pipeline (view wrapper) > { sense, deliver } ; deliver > { compute, actuate }.
     * With `deliver` expanded, flat mode splices it out and shows compute/actuate
     * inline — so `deliver` needs a boundary drawn around exactly those two, or it
     * has no `−` button and cannot be collapsed again.
     */
    const nested = () => model([
        el('pipeline'),
        el('sense', { parentAction: 'pipeline' }),
        el('deliver', { parentAction: 'pipeline' }),
        el('compute', { parentAction: 'deliver' }),
        el('actuate', { parentAction: 'deliver' }),
    ]);

    it('is empty when nothing is expanded', () => {
        expect(flatExpandedGroups(nested(), undefined, new Set()).size).toBe(0);
    });

    it('claims the steps an expanded composite contributed to the canvas', () => {
        const groups = flatExpandedGroups(nested(), undefined, new Set(['deliver']));
        expect([...groups.keys()]).toEqual(['deliver']);
        expect(groups.get('deliver')!.sort()).toEqual(['actuate', 'compute']);
    });

    it('reaches through to the rendered leaves when a child is also expanded', () => {
        const m = model([
            el('pipeline'),
            el('outer', { parentAction: 'pipeline' }),
            el('inner', { parentAction: 'outer' }),
            el('leaf', { parentAction: 'inner' }),
        ]);
        const groups = flatExpandedGroups(m, undefined, new Set(['outer', 'inner']));
        // `inner` is spliced out too, so `outer` must claim the leaf that
        // actually reached the canvas rather than the composite in between.
        expect(groups.get('outer')).toEqual(['leaf']);
        expect(groups.get('inner')).toEqual(['leaf']);
    });

    it('draws no boundary for a composite still folded inside a collapsed one', () => {
        // `deliver` is expanded but `pipeline`'s steps are what render; if
        // `deliver` itself is on the canvas as a card it carries its own button.
        const groups = flatExpandedGroups(nested(), undefined, new Set(['pipeline']));
        expect(groups.has('deliver')).toBe(false);
    });

    it('honours the viewpoint filter when resolving members', () => {
        const groups = flatExpandedGroups(
            nested(), el => el.id !== 'actuate', new Set(['deliver']));
        expect(groups.get('deliver')).toEqual(['compute']);
    });

    it('terminates on a parentAction cycle', () => {
        const m = model([
            el('a', { parentAction: 'b' }),
            el('b', { parentAction: 'a' }),
        ]);
        expect(() => flatExpandedGroups(m, undefined, new Set(['a', 'b']))).not.toThrow();
    });
});

// ─── Edge handles must exist on the nodes they name ─────────────────────────
//
// Regression: item-flow edges addressed `out:<param>` / `in:<param>`, but the
// action node drew its parameter pins as decorative spans and rendered only
// unnamed default handles. React Flow drops an edge whose handle id it cannot
// find, and because a succession is suppressed when a flow already connects
// the same pair, those actions ended up joined by nothing at all. This pins
// the naming half of the contract — an edge may only address a port its own
// node declares. The other half, that the node actually renders a handle per
// declared port, is what broke, and is guarded in
// `views/__tests__/action-flow-node-handles.test.tsx`.
describe('computeActionFlowViewLayout: edge handles', () => {
    it('addresses only handles the node data declares', async () => {
        const producer = el('produce', {
            parameters: [{ name: 'payload', direction: 'out', type: 'DataPacket' }],
        } as Partial<MemoElement>);
        const consumer = el('consume', {
            parameters: [{ name: 'payload', direction: 'in', type: 'DataPacket' }],
        } as Partial<MemoElement>);
        const flow: MemoRelationship = {
            id: 'rel-flow-1', type: 'flow',
            sourceId: 'produce', sourceEnd: 'payload',
            targetId: 'consume', targetEnd: 'payload',
            file: 'test.sysml', flowItem: 'DataPacket',
        } as unknown as MemoRelationship;
        const { nodes, edges } = await computeActionFlowViewLayout(
            model([producer, consumer], [flow]));

        const flowEdge = edges.find(edge => edge.id === 'rel-flow-1');
        expect(flowEdge).toBeDefined();
        expect(flowEdge!.sourceHandle).toBe('out:payload');
        expect(flowEdge!.targetHandle).toBe('in:payload');

        const portsOf = (id: string, side: 'inPorts' | 'outPorts') =>
            (nodes.find(node => node.id === id)?.data as { inPorts: string[]; outPorts: string[] })[side];
        for (const edge of edges) {
            if (edge.sourceHandle) {
                expect(portsOf(edge.source, 'outPorts'))
                    .toContain(edge.sourceHandle.replace(/^out:/, ''));
            }
            if (edge.targetHandle) {
                expect(portsOf(edge.target, 'inPorts'))
                    .toContain(edge.targetHandle.replace(/^in:/, ''));
            }
        }
    });
});

// ─── Card sizing: uniform across the reading direction ──────────────────────
//
// Steps line up on the axis the eye follows. Reading left-to-right every card
// shares a width and a long name wraps, making that card taller; reading
// top-to-bottom it flips, so heights match and the name widens its own card.
// Before this, width came from name length alone, so a row of steps had ragged
// edges and no two cards agreed on a size.
describe('computeActionFlowViewLayout: card sizing', () => {
    const long = 'Prime Pump And Load The Reservoir Before Infusion';
    const cards = () => model([
        el('short', { name: 'Act' }),
        el('long', { name: long }),
    ]);
    const sizeOf = (nodes: Awaited<ReturnType<typeof computeActionFlowViewLayout>>['nodes'], id: string) => {
        const style = nodes.find(node => node.id === id)?.style as { width: number; height: number };
        return style;
    };

    it('gives every card one width when the flow reads left-to-right', async () => {
        const { nodes } = await computeActionFlowViewLayout(cards(), { direction: 'horizontal' });
        const short = sizeOf(nodes, 'short');
        const wide = sizeOf(nodes, 'long');
        expect(wide.width).toBe(short.width);
        // The name that no longer fits wraps, and its card grows downward.
        expect(wide.height).toBeGreaterThan(short.height);
    });

    it('flips to one height when the flow reads top-to-bottom', async () => {
        const { nodes } = await computeActionFlowViewLayout(cards(), { direction: 'vertical' });
        const short = sizeOf(nodes, 'short');
        const wide = sizeOf(nodes, 'long');
        expect(wide.height).toBe(short.height);
        expect(wide.width).toBeGreaterThan(short.width);
    });
});

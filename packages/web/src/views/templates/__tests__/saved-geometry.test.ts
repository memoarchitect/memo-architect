// ─── A view draws the geometry it saved ─────────────────────────────────────
//
// Every view keeps the geometry it was drawn with. A view that saved every box
// it draws is drawn as saved, without laying it out; a box new to it lays the
// view out; and a drawing that shows anything unsaved is what gets written.

import { afterEach, describe, it, expect, vi } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { elk } from '../../layout';
import { computeActionFlowViewLayout } from '../actionflow-view';
import { computeStateTransitionLayout } from '../statetransition-view';
import { drawsUnsavedGeometry, savedBoxes } from '../layout-rules';

const model = (elements: MemoElement[], relationships: MemoRelationship[] = []): MemoModelDTO => ({
    elements: Object.fromEntries(elements.map(e => [e.id, e])),
    relationships,
    errors: [],
}) as unknown as MemoModelDTO;

const action = (id: string): MemoElement => ({
    id, name: id, kind: 'ActionUsage', construct: 'action', layer: 'behavior', file: 'test.sysml',
    attributes: {}, parentAction: 'flow',
} as MemoElement);

const state = (id: string, kind = 'ModeState'): MemoElement => ({
    id, name: id, kind, construct: 'state', layer: 'behavior', file: 'test.sysml', attributes: {},
} as MemoElement);

const box = (x: number, y: number) => ({ x, y, width: 160, height: 60, parent: null });

afterEach(() => vi.restoreAllMocks());

describe('savedBoxes', () => {
    it('places every box the view saved in the frame it is drawn in', () => {
        const placed = savedBoxes([{ id: 'a' }, { id: 'b', parent: 'a' }],
            { a: box(0, 0), b: { ...box(10, 20), parent: 'a' } });
        expect(placed?.get('b')).toEqual({ x: 10, y: 20, width: 160, height: 60 });
    });

    it('reads an empty saved parent as the board', () => {
        expect(savedBoxes([{ id: 'a' }], { a: { ...box(0, 0), parent: '' } })?.get('a')).toEqual({ x: 0, y: 0, width: 160, height: 60 });
    });

    it('places nothing when one box is new to the view', () => {
        expect(savedBoxes([{ id: 'a' }, { id: 'c' }], { a: box(0, 0) })).toBeUndefined();
    });

    it('places nothing when a box is drawn in another frame than it was saved in', () => {
        expect(savedBoxes([{ id: 'b', parent: 'a' }], { b: box(10, 20) })).toBeUndefined();
    });
});

describe('drawsUnsavedGeometry', () => {
    const node = { id: 'a', data: { ports: [{ id: 'p' }] } };
    const routed = { id: 'e', data: { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] } };

    it('is false when the view saved every box, port and route it draws', () => {
        expect(drawsUnsavedGeometry([node], [routed], {
            nodes: { a: { x: 0, y: 0, ports: { p: {} } } }, edges: { e: { points: [{}, {}] } },
        })).toBe(false);
    });

    it('is true for a box, a port or a route the view has not saved', () => {
        expect(drawsUnsavedGeometry([node], [], undefined)).toBe(true);
        expect(drawsUnsavedGeometry([node], [], { nodes: { a: { x: 0, y: 0 } } })).toBe(true);
        expect(drawsUnsavedGeometry([node], [routed], { nodes: { a: { x: 0, y: 0, ports: { p: {} } } } })).toBe(true);
    });

    it('does not ask for a route a connector is not drawn with, nor for what is no longer drawn', () => {
        expect(drawsUnsavedGeometry([], [{ id: 'plain', data: {} }], { nodes: { gone: { x: 0, y: 0 } } })).toBe(false);
    });
});

describe('a saved action flow', () => {
    const flow = model([action('sense'), action('act')],
        [{ id: 's1', type: 'succession', sourceId: 'sense', targetId: 'act' } as MemoRelationship]);

    it('is drawn as saved, without laying it out', async () => {
        const layout = vi.spyOn(elk, 'layout');
        const { nodes } = await computeActionFlowViewLayout(flow, {
            swimlanes: false, saved: { nodes: { sense: box(500, 40), act: box(900, 40) } },
        });
        expect(layout).not.toHaveBeenCalled();
        expect(nodes.find(n => n.id === 'sense')!.position).toEqual({ x: 500, y: 40 });
    });

    it('is laid out when it draws a box the view has not saved', async () => {
        const layout = vi.spyOn(elk, 'layout');
        await computeActionFlowViewLayout(flow, { swimlanes: false, saved: { nodes: { sense: box(500, 40) } } });
        expect(layout).toHaveBeenCalled();
    });
});

describe('a saved state machine', () => {
    const machine = model([state('idle'), state('running')]);

    it('is drawn as saved, without laying it out', async () => {
        const layout = vi.spyOn(elk, 'layout');
        const { nodes } = await computeStateTransitionLayout(machine, {
            saved: { nodes: { idle: box(300, 0), running: box(300, 200) } },
        });
        expect(layout).not.toHaveBeenCalled();
        expect(nodes.find(n => n.id === 'running')!.position).toEqual({ x: 300, y: 200 });
    });

    it('is laid out when it draws a state the view has not saved', async () => {
        const layout = vi.spyOn(elk, 'layout');
        await computeStateTransitionLayout(machine, { saved: { nodes: { idle: box(300, 0) } } });
        expect(layout).toHaveBeenCalled();
    });
});

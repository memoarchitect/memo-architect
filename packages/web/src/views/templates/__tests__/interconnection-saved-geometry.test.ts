// ─── A view's saved geometry is reused, not recomputed ──────────────────────
//
// The canvas draws every box, port and route a view has saved where the view
// says, so the template arranging and routing them first is work no one sees.
// These tests drive `computeInterconnectionLayout` with saved geometry: what the
// view places entirely comes back as saved, a route whose ends changed does not,
// and a view that leaves a port unplaced is still laid out.

import { describe, it, expect, vi } from 'vitest';
import { edgeAttachment, type DiagramLayout, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { computeInterconnectionLayout } from '../interconnection-view';
import { forgetLayoutAnswers } from '../../../diagram/layout-answers';

const part = (id: string): MemoElement => ({
    id, name: id, kind: 'HardwareComponent', construct: 'part',
    layer: 'physical', file: 'test.sysml', attributes: {},
});

const port = (id: string, owner: string, direction: 'in' | 'out'): MemoElement => ({
    id, name: id, kind: 'DataPort', construct: 'port',
    layer: 'physical', file: 'test.sysml', attributes: {},
    owner, portSpec: { type: 'DataPort', direction, isConjugated: false } as never,
});

/** Two boards, side by side on the board, joined by one connector. */
function twoBoards(): MemoModelDTO {
    const elements = [part('sender'), part('receiver'), port('out', 'sender', 'out'), port('in', 'receiver', 'in')];
    return {
        elements: Object.fromEntries(elements.map(el => [el.id, el])),
        relationships: [{ id: 'link', type: 'ExchangesWith', sourceId: 'out', targetId: 'in', sourceEnd: '', targetEnd: '', file: 'test.sysml' }],
        errors: [],
    } as unknown as MemoModelDTO;
}

const route = [{ x: 216, y: 90 }, { x: 400, y: 90 }, { x: 400, y: 520 }, { x: 584, y: 520 }];

function savedGeometry(attachment = edgeAttachment({ source: 'sender', target: 'receiver', sourcePortId: 'out', targetPortId: 'in' })) {
    return {
        nodes: {
            sender: { x: 0, y: 0, width: 200, height: 120, ports: { out: { x: 184, y: 50, side: 'right' as const } } },
            receiver: { x: 600, y: 430, width: 200, height: 120, ports: { in: { x: -16, y: 50, side: 'left' as const } } },
        },
        edges: { link: { points: route, attachment } },
    } satisfies Pick<DiagramLayout, 'nodes' | 'edges'>;
}

describe('an interconnection view drawn before', () => {
    it('is arranged and routed once, then read back with no computation', async () => {
        forgetLayoutAnswers();
        const beforeComputing = vi.fn();
        const first = await computeInterconnectionLayout(twoBoards(), { beforeComputing });
        expect(beforeComputing).toHaveBeenCalled();
        beforeComputing.mockClear();
        const again = await computeInterconnectionLayout(twoBoards(), { beforeComputing });
        expect(beforeComputing).not.toHaveBeenCalled();
        expect(again.nodes.map(n => [n.id, n.position])).toEqual(first.nodes.map(n => [n.id, n.position]));
        expect(again.edges.map(e => (e.data as { points: unknown }).points))
            .toEqual(first.edges.map(e => (e.data as { points: unknown }).points));
    });

    it('computes again when a connector is added', async () => {
        forgetLayoutAnswers();
        await computeInterconnectionLayout(twoBoards());
        const beforeComputing = vi.fn();
        const model = twoBoards();
        const more = { ...model,
            elements: { ...model.elements, out2: port('out2', 'sender', 'out'), in2: port('in2', 'receiver', 'in') },
            relationships: [...model.relationships, { ...model.relationships[0], id: 'link2', sourceId: 'out2', targetId: 'in2' }],
        } as MemoModelDTO;
        await computeInterconnectionLayout(more, { beforeComputing });
        expect(beforeComputing).toHaveBeenCalled();
    });
});

describe('saved interconnection geometry', () => {
    it('places the boxes and keeps the route the view saved', async () => {
        const { nodes, edges } = await computeInterconnectionLayout(twoBoards(), { saved: savedGeometry() });
        expect(nodes.find(n => n.id === 'sender')!.position).toEqual({ x: 0, y: 0 });
        expect(nodes.find(n => n.id === 'receiver')!.position).toEqual({ x: 600, y: 430 });
        expect((edges.find(e => e.id === 'link')!.data as { points: unknown }).points).toBe(route);
    });

    it('routes a connector again when its ends changed since it was saved', async () => {
        const { edges } = await computeInterconnectionLayout(twoBoards(), { saved: savedGeometry('stale') });
        expect((edges.find(e => e.id === 'link')!.data as { points: unknown }).points).not.toBe(route);
    });

    it('lays the boards out when the view leaves a port unplaced', async () => {
        const saved = savedGeometry();
        const unplaced = { ...saved, nodes: { ...saved.nodes, receiver: { ...saved.nodes.receiver, ports: {} } } };
        const { nodes, edges } = await computeInterconnectionLayout(twoBoards(), { saved: unplaced });
        expect(nodes.find(n => n.id === 'receiver')!.position).not.toEqual({ x: 600, y: 430 });
        expect((edges.find(e => e.id === 'link')!.data as { points: unknown }).points).not.toBe(route);
    });
});

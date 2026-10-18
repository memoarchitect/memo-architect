import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { captureMovementGeometry, movementGeometryChanges, restoreMovementGeometry } from '../movement-history';

function fixture() {
    const nodes: Node[] = [
        { id: 'parent', position: { x: -50.25, y: 80.125 }, style: { width: 800, height: 400 }, data: {} },
        { id: 'owner', parentId: 'parent', position: { x: 30.125, y: 48.5 },
            width: 300, height: 160, measured: { width: 300, height: 160 },
            style: { width: 300, height: 160, opacity: 0.4 },
            data: { ports: [{ id: 'port', x: -16, y: 74, side: 'left', name: 'Fuel', future: { keep: 1 } }] } },
        { id: 'child', parentId: 'owner', position: { x: 20.75, y: 60.25 }, data: {} },
        { id: 'unrelated', position: { x: 900, y: 400 }, data: { future: 'keep' } },
    ];
    const edges: Edge[] = [{ id: 'route', source: 'owner', target: 'unrelated', data: {
        points: [{ x: -36.125, y: 202.625 }, { x: 700, y: 202.625 }, { x: 900, y: 474 }],
        manualRoute: true, manualLanding: true, sourceT: 0.4625, labelPoint: { x: 700, y: 200 },
    } }];
    return { nodes, edges };
}

describe('movement history geometry boundary', () => {
    it('restores fractional nested frames and their exact manual endpoints together', () => {
        const { nodes, edges } = fixture();
        const before = captureMovementGeometry(nodes, edges);
        const movedNodes = nodes.map(n => n.id === 'owner' ? { ...n, position: { x: 60, y: 60 } } : n);
        const movedEdges = edges.map(e => ({ ...e, data: { ...e.data,
            points: [{ x: -6.25, y: 214.125 }, { x: 700, y: 202.625 }, { x: 900, y: 474 }] } }));
        const after = captureMovementGeometry(movedNodes, movedEdges);
        const changed = movementGeometryChanges(before, after);
        const undone = restoreMovementGeometry(movedNodes, movedEdges, before, changed);
        expect(undone.nodes[1].position).toEqual({ x: 30.125, y: 48.5 });
        expect(undone.nodes[2]).toBe(nodes[2]);
        expect(undone.nodes[3]).toBe(nodes[3]);
        expect(undone.edges[0].data?.points).toEqual(edges[0].data?.points);
        const redone = restoreMovementGeometry(undone.nodes, undone.edges, after, changed);
        expect(redone.nodes[1].position).toEqual({ x: 60, y: 60 });
        expect(redone.edges[0].data?.points).toEqual(movedEdges[0].data?.points);
    });

    it('does not retain mutable live coordinates in an original snapshot', () => {
        const { nodes, edges } = fixture();
        const before = captureMovementGeometry(nodes, edges);
        nodes[1].position.x = 999;
        (nodes[1].data.ports as any[])[0].y = 999;
        (edges[0].data!.points as any[])[0].x = 999;
        const restored = restoreMovementGeometry(nodes, edges, before,
            { nodes: new Set(['owner']), edges: new Set(['route']) });
        expect(restored.nodes[1].position.x).toBe(30.125);
        expect((restored.nodes[1].data.ports as any[])[0].y).toBe(74);
        expect((restored.edges[0].data!.points as any[])[0].x).toBe(-36.125);
    });

    it('keeps current selection, callbacks, opaque fields and port semantic data', () => {
        const { nodes, edges } = fixture();
        const before = captureMovementGeometry(nodes, edges), callback = () => {};
        const current = nodes.map(n => n.id === 'owner' ? { ...n, selected: true,
            data: { ...n.data, onClick: callback, unknown: { fresh: true },
                ports: [{ id: 'port', x: 0, y: 100, side: 'right', size: 48, name: 'Renamed', future: { keep: 2 } }] } } : n);
        const currentEdges = edges.map(e => ({ ...e, selected: true,
            data: { ...e.data, onRouteChange: callback, unknown: { fresh: true } } }));
        const restored = restoreMovementGeometry(current, currentEdges, before,
            { nodes: new Set(['owner']), edges: new Set(['route']) });
        expect(restored.nodes[1].selected).toBe(true);
        expect(restored.nodes[1].data.onClick).toBe(callback);
        expect(restored.nodes[1].data.unknown).toEqual({ fresh: true });
        expect((restored.nodes[1].data.ports as any[])[0]).toEqual({ id: 'port', x: -16, y: 74,
            side: 'left', name: 'Renamed', future: { keep: 2 } });
        expect(restored.edges[0].data?.onRouteChange).toBe(callback);
        expect(restored.edges[0].selected).toBe(true);
    });

    it('selection and opaque data changes alone are not geometry history', () => {
        const { nodes, edges } = fixture();
        const before = captureMovementGeometry(nodes, edges);
        const after = captureMovementGeometry(nodes.map(n => ({ ...n, selected: true,
            data: { ...n.data, newUnknown: 'value' } })), edges.map(e => ({ ...e, selected: true })));
        expect(movementGeometryChanges(before, after)).toEqual({ nodes: new Set(), edges: new Set() });
    });
});

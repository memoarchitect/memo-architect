import { describe, expect, it } from 'vitest';
import { buildScene } from '../renderers/maxgraph/scene';

describe('buildScene', () => {
    it('adapts ReactFlow-shaped nodes with explicit geometry and colors', () => {
        const { nodes } = buildScene([
            {
                id: 'pump',
                type: 'diagramNode',
                position: { x: 10, y: 20 },
                width: 180,
                height: 60,
                data: { label: 'Infusion Pump', kind: 'System', color: '#2DD4A8' },
            },
        ], []);
        expect(nodes).toEqual([{
            id: 'pump', x: 10, y: 20, width: 180, height: 60,
            label: 'Infusion Pump', kind: 'System', color: '#2DD4A8', isFrame: false,
        }]);
    });

    it('estimates size when the node measures itself via CSS', () => {
        const { nodes } = buildScene([
            { id: 'a', position: { x: 0, y: 0 }, data: { label: 'Short', kind: 'Part' } },
        ], []);
        expect(nodes[0].width).toBeGreaterThanOrEqual(130);
        expect(nodes[0].height).toBeGreaterThan(0);
    });

    it('reads size from style and prefers bgColor override over layer color', () => {
        const { nodes } = buildScene([
            {
                id: 'a',
                position: { x: 0, y: 0 },
                style: { width: 240, height: 90 },
                data: { label: 'Styled', kind: '', bgColor: '#FF0000', color: '#00FF00' },
            },
        ], []);
        expect(nodes[0]).toMatchObject({ width: 240, height: 90, color: '#FF0000' });
    });

    it('orders parents before children and keeps relative positions', () => {
        const { nodes } = buildScene([
            { id: 'child', parentId: 'frame', position: { x: 5, y: 6 }, data: { label: 'Child' } },
            { id: 'frame', position: { x: 100, y: 100 }, width: 400, height: 300, data: { label: 'Frame', isFrame: true } },
        ], []);
        expect(nodes.map(n => n.id)).toEqual(['frame', 'child']);
        expect(nodes[0].isFrame).toBe(true);
        expect(nodes[1]).toMatchObject({ parentId: 'frame', x: 5, y: 6 });
    });

    it('drops parentId references to nodes outside the scene', () => {
        const { nodes } = buildScene([
            { id: 'orphan', parentId: 'missing', position: { x: 1, y: 2 }, data: { label: 'Orphan' } },
        ], []);
        expect(nodes[0].parentId).toBeUndefined();
    });

    it('adapts edges with style, label, and interior waypoints only', () => {
        const flowNodes = [
            { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } },
            { id: 'b', position: { x: 300, y: 0 }, data: { label: 'B' } },
        ];
        const { edges } = buildScene(flowNodes, [
            {
                id: 'e1',
                source: 'a',
                target: 'b',
                label: 'flow',
                animated: true,
                style: { stroke: '#3498DB', strokeWidth: 2, strokeDasharray: '5 3' },
                data: { points: [{ x: 0, y: 0 }, { x: 150, y: 40 }, { x: 300, y: 0 }] },
            },
        ]);
        expect(edges).toEqual([{
            id: 'e1', sourceId: 'a', targetId: 'b', label: 'flow',
            color: '#3498DB', strokeWidth: 2, dashed: true, animated: true,
            points: [{ x: 150, y: 40 }],
        }]);
    });

    it('filters edges whose terminals are not in the scene', () => {
        const { edges } = buildScene(
            [{ id: 'a', position: { x: 0, y: 0 }, data: {} }],
            [{ id: 'e1', source: 'a', target: 'ghost' }],
        );
        expect(edges).toEqual([]);
    });
});

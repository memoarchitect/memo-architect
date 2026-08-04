import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { buildMemoModel, modelToDTO, parseFiles } from '@memoarchitect/tools';
import { buildScene } from '../renderers/maxgraph/scene';
import { buildViewpointFilter, computeDiagramScene } from '../renderers/maxgraph/scene-source';

describe('buildScene', () => {
    it('lowers FulfillOrder and projects its real action-flow scene', async () => {
        const workspaceRoot = resolve(import.meta.dirname, '../../../../../../');
        // The single copy of the activity fixture, in the sample project's
        // model alongside the rest of its SysML.
        const fixture = resolve(
            workspaceRoot,
            'memo/examples/sysml-diagram-samples/model/sysml_v2_activity_example.sysml',
        );
        const parsed = await parseFiles([fixture], `${workspaceRoot}/`);
        expect(parsed.errors).toEqual([]);
        const model = modelToDTO(buildMemoModel(parsed.documents, { projectName: 'FulfillOrder' }, parsed.errors));
        const fulfillOrderId = Object.values(model.elements).find(element => element.name === 'FulfillOrder')?.id;
        expect(fulfillOrderId).toBeDefined();
        const scene = await computeDiagramScene({
            model, diagram: { id: 'afd', name: 'FulfillOrder', diagramType: 'afd', viewKind: 'actionflow', elementIds: [] } as any,
            selectedViewpointId: null, hiddenLayers: new Set(),
            actionFlow: { swimlanes: true, laneGrouping: 'allocation', displayLevel: 'all', expandedActionIds: new Set([fulfillOrderId!]), focusActionId: null, visibleFlowKinds: new Set(['control', 'data', 'energy', 'material']), direction: 'horizontal' },
        });
        expect(scene).not.toBeNull();
        const labels = scene!.nodes.map(node => node.label);
        expect(labels).toEqual(expect.arrayContaining(['FulfillOrder', 'receiveOrder', 'sendReceipt', 'routeOrder', 'afterDecision', 'parallelWork', 'readyToNotify']));
        expect(scene!.nodes.map(node => node.glyph)).toEqual(expect.arrayContaining(['accept', 'send', 'decision', 'merge', 'fork', 'join', 'activity-final']));
        expect(scene!.edges.some(edge => edge.label === '[true]')).toBe(true);
        expect(scene!.edges.some(edge => edge.subjectId && edge.color !== '#9CA3AF')).toBe(true);
        expect(scene!.nodes.every(node => node.subjectId.length > 0)).toBe(true);
    });
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
        expect(nodes).toMatchObject([{
            id: 'pump', x: 10, y: 20, width: 180, height: 60,
            label: 'Infusion Pump', kind: 'System', color: '#2DD4A8', isFrame: false,
            subjectId: 'pump', glyph: 'usage', accessibilityText: 'usage Infusion Pump (System)',
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
                data: { routing: 'straight', points: [{ x: 0, y: 0 }, { x: 150, y: 40 }, { x: 300, y: 0 }] },
            },
        ]);
        expect(edges).toMatchObject([{
            id: 'e1', sourceId: 'a', targetId: 'b', label: 'flow',
            color: '#3498DB', strokeWidth: 2, dashed: true, animated: true, routing: 'straight',
            points: [{ x: 150, y: 40 }], subjectId: 'e1',
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

describe('buildViewpointFilter', () => {
    it('treats empty auto-populated membership as viewpoint-derived, not hide-all', () => {
        const model = {
            elements: {}, relationships: [], errors: [],
            viewpoints: [{ id: 'vp-ui', visibleKinds: ['UIElement'], visibleLayers: ['implementation'] }],
        } as any;
        const diagram = {
            id: 'UIE-001', name: 'Layout', diagramType: 'bdd', viewKind: 'geometry',
            viewpointId: 'vp-ui', auto: true, elementIds: [],
        } as any;
        const filter = buildViewpointFilter({
            model, diagram, selectedViewpointId: null, hiddenLayers: new Set(),
        });

        expect(filter?.({ id: 'region', kind: 'UIElement', layer: 'implementation' } as any)).toBe(true);
    });

    it('does not turn an empty viewpoint scope into a hide-all filter', () => {
        const model = {
            elements: {}, relationships: [], errors: [],
            viewpoints: [{ id: 'vp-ui', visibleKinds: [], visibleLayers: [] }],
        } as any;
        const diagram = {
            id: 'UIE-001', name: 'Layout', diagramType: 'bdd', viewKind: 'geometry',
            viewpointId: 'vp-ui', auto: true, elementIds: [],
        } as any;
        const filter = buildViewpointFilter({
            model, diagram, selectedViewpointId: null, hiddenLayers: new Set(),
        });

        expect(filter?.({ id: 'region', kind: 'UIElement', layer: 'implementation' } as any)).toBe(true);
    });
});

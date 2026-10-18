import { describe, expect, it } from 'vitest';
import { dia, shapes } from '@joint/core';
import { buildJointIbd, jointLinkGeometry, jointNodeGeometry } from '../renderers/jointjs/ibd-scene';
import { captureComparisonScene, discardComparisonScene, takeComparisonScene, registerComparisonSource, diagramRendererId, withDiagramRenderer, JOINTJS_RENDERER_ID, MAXGRAPH_RENDERER_ID, REACTFLOW_RENDERER_ID, X6_RENDERER_ID, type ComparisonScene } from '../diagram-renderer-selection';

const scene: ComparisonScene = {
    nodes: [
        { id: 'vehicle', position: { x: 100, y: 60 }, style: { width: 800, height: 600 }, data: { label: 'Vehicle', isContainer: true, ports: [{ id: 'boundary', x: 792, y: 50, side: 'right' }] } },
        { id: 'engine', parentId: 'vehicle', position: { x: 40, y: 80 }, style: { width: 160, height: 100 }, data: { label: 'Engine', ports: [{ id: 'power', x: 152, y: 40, side: 'right' }] } },
        { id: 'gearbox', parentId: 'vehicle', position: { x: 360, y: 80 }, style: { width: 160, height: 100 }, data: { label: 'Gearbox', ports: [{ id: 'in', x: -8, y: 40, side: 'left' }] } },
    ],
    edges: [
        { id: 'drive', source: 'engine', target: 'gearbox', sourceHandle: 'power', targetHandle: 'in', data: {} },
        { id: 'delegation', source: 'vehicle', target: 'gearbox', sourceHandle: 'boundary__inner', targetHandle: 'in', data: {} },
    ],
};

describe('per-diagram renderer pilot', () => {
    it('scopes selection to the chosen diagram, preserving default and fallback behavior', () => {
        const first = withDiagramRenderer(undefined, JOINTJS_RENDERER_ID);
        expect(diagramRendererId(first, REACTFLOW_RENDERER_ID, true)).toBe(JOINTJS_RENDERER_ID);
        expect(diagramRendererId(undefined, REACTFLOW_RENDERER_ID, true)).toBe(REACTFLOW_RENDERER_ID);
        expect(diagramRendererId(first, REACTFLOW_RENDERER_ID, false)).toBe(REACTFLOW_RENDERER_ID);
        expect(diagramRendererId(withDiagramRenderer(undefined, X6_RENDERER_ID), REACTFLOW_RENDERER_ID, true)).toBe(X6_RENDERER_ID);
        expect(diagramRendererId(withDiagramRenderer(undefined, MAXGRAPH_RENDERER_ID), REACTFLOW_RENDERER_ID, true)).toBe(MAXGRAPH_RENDERER_ID);
        expect(diagramRendererId(withDiagramRenderer(first), REACTFLOW_RENDERER_ID, true)).toBe(REACTFLOW_RENDERER_ID);
    });
    it('round-trips renderer choice without altering React Flow manual geometry', () => {
        const base = { nodes: { engine: { x: 10, y: 20 } }, edges: { drive: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] } }, canvas: { snap: true } };
        const chosen = withDiagramRenderer(base, JOINTJS_RENDERER_ID);
        chosen.canvas!.jointjs = { nodes: { engine: { x: 300, y: 200 } } };
        const restored = withDiagramRenderer(JSON.parse(JSON.stringify(chosen)), REACTFLOW_RENDERER_ID);
        expect(restored.nodes).toEqual(base.nodes); expect(restored.edges).toEqual(base.edges);
        expect(restored.canvas?.jointjs?.nodes.engine.x).toBe(300);
        expect(base.canvas).toEqual({ snap: true });
    });
    it('captures only the mounted diagram, consumes once, and removes stale sources', () => {
        const unregister = registerComparisonSource('a', () => scene);
        captureComparisonScene('b'); expect(takeComparisonScene('b')).toBeUndefined();
        captureComparisonScene('a'); expect(takeComparisonScene('a')).toBe(scene);
        expect(takeComparisonScene('a')).toBeUndefined();
        unregister(); captureComparisonScene('a'); expect(takeComparisonScene('a')).toBeUndefined();
    });
    it('invalidates a captured scene when a rapid switch leaves its target before mount', () => {
        const unregister = registerComparisonSource('a', () => scene);
        captureComparisonScene('a'); discardComparisonScene();
        expect(takeComparisonScene('a')).toBeUndefined(); unregister();
    });
    it('conserves endpoint port identities and converts nested positions both ways', () => {
        const { cells } = buildJointIbd(scene);
        const graph = new dia.Graph({}, { cellNamespace: shapes }); graph.resetCells(cells);
        expect(graph.getElements()).toHaveLength(3); expect(graph.getLinks()).toHaveLength(2);
        expect((graph.getCell('engine') as dia.Element).position()).toEqual({ x: 140, y: 140 });
        expect(graph.getCell('engine').get('parent')).toBe('vehicle');
        expect(graph.getCell('drive').get('source').port).toBe('power');
        expect(graph.getCell('delegation').get('source').port).toBe('boundary');
        expect(graph.getCell('delegation').get('router').args.startDirections).toEqual(['left']);
        expect(graph.getCell('delegation').get('router').args.step).toBe(10);
        expect(graph.getCell('delegation').get('router').args.maximumLoops).toBe(2000);
        expect(graph.getCell('delegation').get('router').args.isPointObstacle).toBeTypeOf('function');
        expect((graph.getCell('engine') as dia.Element).attr('headerText/x')).toBe('calc(w/2)');
        expect((graph.getCell('engine') as dia.Element).attr('headerText/textAnchor')).toBe('middle');
        expect((graph.getCell('engine') as dia.Element).attr('header/height')).toBe(44);
        expect((graph.getCell('engine') as dia.Element).attr('body/stroke')).toBe('#e2e8f0');
        expect((graph.getCell('engine') as dia.Element).attr('body/pointerEvents')).toBe('all');
        expect((graph.getCell('vehicle') as dia.Element).attr('body/pointerEvents')).toBe('none');
        expect((graph.getCell('drive') as dia.Link).get('z')).toBe(5);
        (graph.getCell('vehicle') as dia.Element).translate(50, 30);
        expect(jointNodeGeometry(graph, scene).engine).toMatchObject({ x: 40, y: 80 });
        expect(jointNodeGeometry(graph, scene).vehicle).toMatchObject({ x: 150, y: 90 });
        (graph.getCell('engine') as dia.Element).portProp('power', 'args', { x: 156, y: 72 });
        expect(jointNodeGeometry(graph, scene).engine.ports?.power).toMatchObject({ x: 140, y: 56, side: 'right' });
    });
    it('uses saved experimental geometry, and refuses missing ports instead of retargeting to boxes', () => {
        const { cells } = buildJointIbd(scene, { engine: { x: 80, y: 90 } });
        expect((cells.find(c => c.id === 'engine') as dia.Element).position()).toEqual({ x: 180, y: 150 });
        expect(() => buildJointIbd({ ...scene, edges: [{ ...scene.edges[0], sourceHandle: 'misspelled' }] })).toThrow('Missing port');
    });

    it('keeps manual JointJS bend points separate from the React Flow route', () => {
        const { cells } = buildJointIbd(scene, {}, { vertices: { drive: [{ x: 244, y: 190 }, { x: 388, y: 190 }] } });
        const graph = new dia.Graph({}, { cellNamespace: shapes }); graph.resetCells(cells);
        expect((graph.getCell('drive') as dia.Link).vertices()).toEqual([{ x: 244, y: 190 }, { x: 388, y: 190 }]);
        expect(jointLinkGeometry(graph)).toEqual({ drive: [{ x: 244, y: 190 }, { x: 388, y: 190 }] });
    });

    it('draws each directional port glyph inside its JointJS square', () => {
        const directionalScene: ComparisonScene = {
            nodes: [{ id: 'part', position: { x: 0, y: 0 }, style: { width: 100, height: 80 }, data: { label: 'Part', ports: [
                { id: 'input', x: 0, y: 30, side: 'left', direction: 'in' },
                { id: 'output', x: 92, y: 30, side: 'right', direction: 'out' },
                { id: 'bidirectional', x: 45, y: 0, side: 'top', direction: 'inout' },
            ] } }],
            edges: [],
        };
        const part = buildJointIbd(directionalScene).cells[0] as dia.Element;
        expect(part.getPort('input')?.attrs?.portArrow?.d).toContain('M2 5h6');
        expect(part.getPort('output')?.attrs?.portArrow?.d).toContain('M2 5h6');
        expect(part.getPort('bidirectional')?.attrs?.portArrow?.d).toContain('M5 1.5v7');
        expect(part.getPort('input')?.attrs?.portArrow?.transform).toBe('translate(-5,-5)');
        // Boundary squares straddle their edge. Vertical-wall ports begin
        // beneath the 44px title band, even when incoming geometry is stale.
        expect(part.getPort('input')?.args).toMatchObject({ x: 0, y: 60 });
        expect(part.getPort('output')?.args).toMatchObject({ x: 100, y: 60 });
        expect(part.getPort('bidirectional')?.args).toMatchObject({ x: 61, y: 0 });
    });

    it('honours connector caption visibility and renders persisted notes', () => {
        const captioned: ComparisonScene = { ...scene, edges: [{ ...scene.edges[0], label: 'power', data: { showLabel: false } }] };
        const { cells } = buildJointIbd(captioned, {}, {
            flowAnimation: true,
            annotations: { 'annotation-note': { kind: 'note', x: 12, y: 24, text: 'Review this path' } },
        });
        const graph = new dia.Graph({}, { cellNamespace: shapes }); graph.resetCells(cells);
        const link = graph.getCell('drive') as dia.Link;
        expect(link.labels()).toHaveLength(0);
        expect(link.attr('line/strokeDasharray')).toBe('8 6');
        expect(link.attr('line/class')).toBe('memo-joint-flow');
        expect(graph.getCell('annotation-note')).toBeTruthy();
        expect(jointNodeGeometry(graph, captioned)).not.toHaveProperty('annotation-note');
    });

    it('aligns opposing one-to-one ports after automatic part placement', () => {
        const staggered: ComparisonScene = {
            nodes: [
                { id: 'source', position: { x: 0, y: 0 }, style: { width: 120, height: 120 }, data: { label: 'Source', ports: [{ id: 'out', x: 112, y: 30, side: 'right' }] } },
                { id: 'target', position: { x: 260, y: 0 }, style: { width: 120, height: 120 }, data: { label: 'Target', ports: [{ id: 'in', x: -8, y: 70, side: 'left' }] } },
            ],
            edges: [{ id: 'flow', source: 'source', target: 'target', sourceHandle: 'out', targetHandle: 'in', data: {} }],
        };
        const { cells } = buildJointIbd(staggered, {}, { alignFacingPorts: true });
        const source = cells.find(cell => cell.id === 'source') as dia.Element;
        const target = cells.find(cell => cell.id === 'target') as dia.Element;
        const sourceY = Number((source.getPort('out')?.args as { y?: number }).y);
        const targetY = Number((target.getPort('in')?.args as { y?: number }).y) + target.position().y;
        expect(sourceY + source.position().y).toBe(targetY);
    });

    it('faces ports toward a connected peer when the part order is reversed', () => {
        const reversed: ComparisonScene = {
            nodes: [
                { id: 'shaftOut', position: { x: 300, y: 0 }, style: { width: 120, height: 100 }, data: { label: 'Transmission', ports: [{ id: 'shaftTorqueOut', x: 112, y: 42, side: 'right', direction: 'out' }] } },
                { id: 'shaftIn', position: { x: 0, y: 0 }, style: { width: 120, height: 100 }, data: { label: 'Driveshaft', ports: [{ id: 'shaftTorqueIn', x: -8, y: 42, side: 'left', direction: 'in' }] } },
            ],
            edges: [{ id: 'shaft', source: 'shaftOut', target: 'shaftIn', sourceHandle: 'shaftTorqueOut', targetHandle: 'shaftTorqueIn', data: {} }],
        };
        const { cells } = buildJointIbd(reversed, {}, { alignFacingPorts: true });
        const out = cells.find(cell => cell.id === 'shaftOut') as dia.Element;
        const input = cells.find(cell => cell.id === 'shaftIn') as dia.Element;
        expect((out.getPort('shaftTorqueOut')?.args as { x?: number }).x).toBe(0);
        expect((input.getPort('shaftTorqueIn')?.args as { x?: number }).x).toBe(120);
    });
});

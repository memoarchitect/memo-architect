// ─── Interconnection template tests (KK-3 layout logic) ─────────────────────
//
// The ELK geometry pass itself runs only in the browser (Web Worker), so these
// tests lock the pure, model-driven derivations the layout is built from:
// port-side inference, orphan partitioning, drill-down focus projection, and
// the no-overlap invariant of deterministic boundary-port placement.

import { describe, it, expect } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import {
    inferPortRole, portSideFromRole, partitionChildren, focusSubtree,
    distributePorts, isPortElement, INTERCONNECTION_PORT_SIZE,
    classifyIbdFlow, PORT_DIR_COLORS, IBD_FLOW_COLORS,
    buildPortOwnership, projectPortForDisplay, declaredPortRole,
    ibdLabelWidth, applyPortOrder, portIdFromHandle, INNER_HANDLE_SUFFIX, summarizeConnectors, type PortSide,
    PORT_LABEL_STACKED_WIDTH, parsePortSide,
    SIDE_GUTTER, PORT_LABEL_MAX, PORT_LABEL_OFFSET, portCaptionWidth, ibdEdgeLabel,
} from '../interconnection-view';
import { compactnessScore, balancedGridColumns, connectivityOrder, resolvedLayoutScore, resolveGraphLayout, routeOrthogonalEdges } from '../../layout';

function port(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id, name: id, kind: 'DataPort', construct: 'port',
        layer: 'logical', file: 'test.sysml', attributes: {},
        ...overrides,
    };
}

describe('inferPortRole', () => {
    it('honors a declared port direction above everything else', () => {
        expect(inferPortRole(port('p', { portSpec: { direction: 'in' } as never }), 5, 0)).toBe('in');
        expect(inferPortRole(port('p', { portSpec: { direction: 'out' } as never }), 0, 5)).toBe('out');
        // inout binds to the output (right) side
        expect(inferPortRole(port('p', { portSpec: { direction: 'inout' } as never }), 0, 0)).toBe('out');
    });

    it('reads a declared direction from the direction attribute', () => {
        expect(inferPortRole(port('p', { attributes: { direction: 'DirectionKind::in' } }), 0, 9)).toBe('in');
        expect(inferPortRole(port('p', { attributes: { direction: 'DirectionKind::bidirectional' } }), 0, 9)).toBe('out');
    });

    it('falls back to an in/out name convention', () => {
        expect(inferPortRole(port('systemOut'), 0, 3)).toBe('out');
        expect(inferPortRole(port('partBIn'), 3, 0)).toBe('in');
        expect(inferPortRole(port('sensorInput'), 0, 0)).toBe('in');
    });

    it('uses connectivity only when nothing else decides', () => {
        // mostly a source → output; mostly a target → input
        expect(inferPortRole(port('sig'), 3, 1)).toBe('out');
        expect(inferPortRole(port('sig'), 1, 3)).toBe('in');
        expect(inferPortRole(port('sig'), 0, 0)).toBe('in');
    });

    it('maps roles to boundary sides', () => {
        expect(portSideFromRole('in')).toBe('left');
        expect(portSideFromRole('out')).toBe('right');
    });
});

describe('isPortElement', () => {
    it('recognizes port constructs and *Port kinds', () => {
        expect(isPortElement(port('p'))).toBe(true);
        expect(isPortElement(port('p', { construct: 'part', kind: 'FlowPort' }))).toBe(true);
        expect(isPortElement(port('p', { construct: 'part', kind: 'LogicalComponent' }))).toBe(false);
    });
});

describe('connection density summary', () => {
    it('bundles repeated projected endpoint pairs and preserves distinct pairs', () => {
        const relationships = [
            { id: 'r1', type: 'exchangesWith', sourceId: 'p1', targetId: 'p2', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r2', type: 'exchangesWith', sourceId: 'p3', targetId: 'p4', sourceEnd: '', targetEnd: '', file: '' },
            { id: 'r3', type: 'exchangesWith', sourceId: 'p3', targetId: 'other', sourceEnd: '', targetEnd: '', file: '' },
        ];
        const owners: Record<string, string> = { p1: 'a', p3: 'a', p2: 'b', p4: 'b' };
        const summary = summarizeConnectors(relationships, id => owners[id] ?? id);
        expect(summary).toHaveLength(2);
        expect(summary.find(rel => rel.sourceId === 'p1')?.attributes?.bundleCount).toBe('2');
    });
});

describe('partitionChildren', () => {
    const opts = (connected: string[], containers: string[], ported: string[]) => ({
        isConnected: (id: string) => connected.includes(id),
        hasChildParts: (id: string) => containers.includes(id),
        portCount: (id: string) => (ported.includes(id) ? 1 : 0),
    });

    it('grid-packs only unconnected, portless leaves', () => {
        const { flowKids, orphanKids } = partitionChildren(
            ['a', 'b', 'nested', 'orphan'],
            opts(['a', 'b'], ['nested'], ['a']),
        );
        expect(orphanKids).toEqual(['orphan']);
        expect(flowKids).toEqual(['a', 'b', 'nested']);
    });

    it('keeps a container as flow content even with no connectors', () => {
        const { orphanKids } = partitionChildren(['box'], opts([], ['box'], []));
        expect(orphanKids).toEqual([]);
    });

    it('keeps a leaf that owns a port out of the orphan grid', () => {
        const { orphanKids } = partitionChildren(['leaf'], opts([], [], ['leaf']));
        expect(orphanKids).toEqual([]);
    });
});


describe('compactnessScore', () => {
    it('rejects equally sized horizontal and vertical strips', () => {
        const balanced = compactnessScore(600, 500);
        expect(balanced).toBeLessThan(compactnessScore(1200, 250));
        expect(balanced).toBeLessThan(compactnessScore(250, 1200));
    });

    it('still rewards a materially smaller footprint', () => {
        expect(compactnessScore(480, 360)).toBeLessThan(compactnessScore(650, 520));
    });
});

describe('ibdLabelWidth', () => {
    it('does not allow long engineering names to stretch a part card', () => {
        expect(ibdLabelWidth('A')).toBe(96);
        expect(ibdLabelWidth('Part With An Extremely Long Formal Engineering Name That Must Truncate')).toBe(180);
    });
});

describe('balancedGridColumns', () => {
    it('uses both axes for multi-part compositions', () => {
        expect(balancedGridColumns(3)).toBe(2);
        expect(balancedGridColumns(5)).toBe(3);
        expect(balancedGridColumns(8)).toBe(3);
    });

    it('keeps trivial compositions trivial', () => {
        expect(balancedGridColumns(1)).toBe(1);
    });
});

describe('shared layout resolver policy', () => {
    it('places a directed external source to the left of its target', async () => {
        const layout = await resolveGraphLayout({
            id: 'external-flow',
            nodes: [
                { id: 'system', width: 420, height: 280 },
                { id: 'external', width: 184, height: 82 },
            ],
            edges: [{ id: 'flow', source: 'external', target: 'system' }],
        });
        const external = layout.children.find(n => n.id === 'external')!;
        const system = layout.children.find(n => n.id === 'system')!;
        expect(external.x + external.width).toBeLessThanOrEqual(system.x);
    });

    it('preserves a requested left-to-right context flow on an infinite canvas', async () => {
        const layout = await resolveGraphLayout({
            id: 'context-chain',
            nodes: [
                { id: 'machine', width: 520, height: 360 },
                { id: 'cup', width: 184, height: 82 },
                { id: 'supply', width: 184, height: 82 },
            ],
            edges: [
                { id: 'in', source: 'supply', target: 'machine' },
                { id: 'out', source: 'machine', target: 'cup' },
            ],
            directedFlowAxis: 'RIGHT',
        });
        const x = Object.fromEntries(layout.children.map(n => [n.id, n.x]));
        expect(x.supply).toBeLessThan(x.machine);
        expect(x.machine).toBeLessThan(x.cup);
    });

    it('aligns root nodes by semantic port anchors rather than box centres', async () => {
        const layout = await resolveGraphLayout({
            id: 'anchored-context',
            nodes: [
                { id: 'frame', width: 520, height: 360 },
                { id: 'cup', width: 184, height: 168 },
            ],
            edges: [{
                id: 'drink', source: 'frame', target: 'cup',
                sourceAnchorY: 72, targetAnchorY: 84,
            }],
            directedFlowAxis: 'RIGHT',
        });
        const frame = layout.children.find(n => n.id === 'frame')!;
        const cup = layout.children.find(n => n.id === 'cup')!;
        expect(frame.y + 72).toBeCloseTo(cup.y + 84);
    });

    it('chooses a balanced board for a three-part mixed-size chain', async () => {
        const layout = await resolveGraphLayout({
            id: 'mixed-chain',
            nodes: [
                { id: 'a', width: 240, height: 130 },
                { id: 'b', width: 260, height: 82 },
                { id: 'c', width: 184, height: 82 },
            ],
            edges: [
                { id: 'ab', source: 'a', target: 'b' },
                { id: 'bc', source: 'b', target: 'c' },
            ],
        });
        expect(layout.strategy).toBe('balanced-board');
    });

    it('places a three-part process as an input stage with two stacked downstream stages', async () => {
        const layout = await resolveGraphLayout({
            id: 'process-board',
            nodes: [
                { id: 'reservoir', width: 250, height: 130 },
                { id: 'thermal', width: 360, height: 190 },
                { id: 'brew', width: 250, height: 130 },
            ],
            edges: [
                { id: 'water', source: 'reservoir', target: 'thermal' },
                { id: 'heated-water', source: 'thermal', target: 'brew' },
            ],
        });
        const part = Object.fromEntries(layout.children.map(node => [node.id, node]));
        expect(layout.strategy).toBe('balanced-board');
        expect(part.reservoir.x).toBeLessThan(part.thermal.x);
        expect(part.reservoir.x).toBeLessThan(part.brew.x);
        expect(part.thermal.y).toBeLessThan(part.brew.y);
    });

    it('orders a connected chain by connectivity rather than input order', () => {
        const nodes = [
            { id: 'c', width: 100, height: 60 },
            { id: 'a', width: 100, height: 60 },
            { id: 'b', width: 100, height: 60 },
        ];
        const edges = [
            { id: 'ab', source: 'a', target: 'b' },
            { id: 'bc', source: 'b', target: 'c' },
        ];
        expect(connectivityOrder(nodes, edges)).toEqual(['a', 'b', 'c']);
    });

    it('penalizes crossing candidates independently of diagram kind', () => {
        const nodes = [
            { id: 'a', width: 40, height: 40, x: 0, y: 0 },
            { id: 'b', width: 40, height: 40, x: 100, y: 100 },
            { id: 'c', width: 40, height: 40, x: 100, y: 0 },
            { id: 'd', width: 40, height: 40, x: 0, y: 100 },
        ];
        const crossing = { strategy: 'balanced-board' as const, width: 140, height: 140, children: nodes };
        const clean = { ...crossing, children: [
            nodes[0],
            { ...nodes[1], x: 100, y: 0 },
            { ...nodes[2], x: 0, y: 100 },
            nodes[3],
        ] };
        const edges = [{ id: 'ab', source: 'a', target: 'b' }, { id: 'cd', source: 'c', target: 'd' }];
        expect(resolvedLayoutScore(crossing, edges)).toBeGreaterThan(resolvedLayoutScore(clean, edges));
    });

    it('prefers a straight run over an avoidable orthogonal bend', () => {
        const edges = [{ id: 'ab', source: 'a', target: 'b' }];
        const straight = {
            strategy: 'layered-right' as const, width: 340, height: 132,
            children: [
                { id: 'a', width: 140, height: 132, x: 0, y: 0 },
                { id: 'b', width: 140, height: 132, x: 200, y: 0 },
            ],
        };
        const bent = {
            ...straight, height: 220,
            children: [straight.children[0], { ...straight.children[1], y: 88 }],
        };
        expect(resolvedLayoutScore(straight, edges)).toBeLessThan(resolvedLayoutScore(bent, edges));
    });
});

describe('shared orthogonal edge router', () => {
    it('uses a straight segment when the path is clear', () => {
        const routes = routeOrthogonalEdges([{
            id: 'e', source: { x: 0, y: 50 }, target: { x: 300, y: 50 },
            sourceNodeId: 'a', targetNodeId: 'b',
        }], []);
        expect(routes.get('e')).toEqual([{ x: 0, y: 50 }, { x: 300, y: 50 }]);
    });

    it('routes around an intervening component rectangle', () => {
        const obstacle = { id: 'block', x: 120, y: 20, width: 60, height: 60 };
        const routes = routeOrthogonalEdges([{
            id: 'e', source: { x: 0, y: 50 }, target: { x: 300, y: 50 },
            sourceNodeId: 'a', targetNodeId: 'b',
        }], [obstacle]);
        const points = routes.get('e')!;
        expect(points.length).toBeGreaterThan(2);
        expect(points.some(p => p.y < obstacle.y || p.y > obstacle.y + obstacle.height)).toBe(true);
    });

    it('honours fixed endpoint sides before optimizing the remaining route', () => {
        const points = routeOrthogonalEdges([{
            id: 'fixed', source: { x: 100, y: 60 }, target: { x: 260, y: 160 },
            sourceNodeId: 'a', targetNodeId: 'b', sourceSide: 'right', targetSide: 'left',
        }], []).get('fixed')!;
        expect(points[1].x).toBeGreaterThan(points[0].x);
        expect(points.at(-2)!.x).toBeLessThan(points.at(-1)!.x);
    });

    it('enters an anchored endpoint straight and centred, never on a corner', () => {
        // Without a reserved approach the plan may turn one grid step off the
        // port, and the renderer's corner radius then eats the stretch that
        // should read as "this line lands in that square".
        const points = routeOrthogonalEdges([{
            id: 'stubbed', source: { x: 100, y: 60 }, target: { x: 420, y: 300 },
            sourceNodeId: 'a', targetNodeId: 'b', sourceSide: 'right', targetSide: 'left',
        }], [{ id: 'blocker', x: 220, y: 20, width: 80, height: 200 }]).get('stubbed')!;
        expect(points[0]).toEqual({ x: 100, y: 60 });
        expect(points.at(-1)).toEqual({ x: 420, y: 300 });
        // First and last runs are axis-aligned with the port and long enough to
        // clear the glyph (12px) plus the 7px corner radius.
        expect(points[1].y).toBe(points[0].y);
        expect(points[1].x - points[0].x).toBeGreaterThanOrEqual(19);
        expect(points.at(-2)!.y).toBe(points.at(-1)!.y);
        expect(points.at(-1)!.x - points.at(-2)!.x).toBeGreaterThanOrEqual(19);
    });

    it('shrinks the reserved approach rather than overshooting a short connector', () => {
        const points = routeOrthogonalEdges([{
            id: 'short', source: { x: 100, y: 60 }, target: { x: 118, y: 60 },
            sourceNodeId: 'a', targetNodeId: 'b', sourceSide: 'right', targetSide: 'left',
        }], []).get('short')!;
        expect(points[0]).toEqual({ x: 100, y: 60 });
        expect(points.at(-1)).toEqual({ x: 118, y: 60 });
        expect(points.every(p => p.x >= 100 && p.x <= 118)).toBe(true);
    });

    it('uses distinct tracks for parallel connectors when alternatives exist', () => {
        const routes = routeOrthogonalEdges([
            { id: 'one', source: { x: 0, y: 20 }, target: { x: 300, y: 100 }, sourceNodeId: 'a', targetNodeId: 'b' },
            { id: 'two', source: { x: 0, y: 40 }, target: { x: 300, y: 120 }, sourceNodeId: 'c', targetNodeId: 'd' },
        ], []);
        expect(routes.get('one')).not.toEqual(routes.get('two'));
    });
});

describe('port-aware layout', () => {
    const slot = (y: number, side: PortSide) => ({ x: 0, y, side });

    it('re-deals the same slots in the order the engine placed the ports', () => {
        const portPos = new Map([
            ['a', slot(70, 'left')],
            ['b', slot(108, 'left')],
            ['c', slot(146, 'left')],
        ]);
        applyPortOrder(portPos, new Map([['a', 300], ['b', 100], ['c', 200]]));
        expect(portPos.get('b')!.y).toBe(70);
        expect(portPos.get('c')!.y).toBe(108);
        expect(portPos.get('a')!.y).toBe(146);
    });

    it('re-deals a horizontal wall along x, since its y says nothing', () => {
        const portPos = new Map([
            ['a', { x: 100, y: 300, side: 'bottom' as PortSide }],
            ['b', { x: 200, y: 300, side: 'bottom' as PortSide }],
            ['c', { x: 300, y: 300, side: 'bottom' as PortSide }],
        ]);
        applyPortOrder(portPos, new Map(), new Map([['a', 30], ['b', 10], ['c', 20]]));
        expect(portPos.get('b')!.x).toBe(100);
        expect(portPos.get('c')!.x).toBe(200);
        expect(portPos.get('a')!.x).toBe(300);
        // the wall itself never moves
        for (const p of portPos.values()) expect(p.y).toBe(300);
    });

    it('permutes each side independently and leaves unplaced ports alone', () => {
        const portPos = new Map([
            ['in1', slot(70, 'left')],
            ['in2', slot(108, 'left')],
            ['out1', slot(70, 'right')],
            ['loose', slot(146, 'left')],
        ]);
        applyPortOrder(portPos, new Map([['in1', 9], ['in2', 1], ['out1', 5]]));
        expect(portPos.get('in2')!.y).toBe(70);
        expect(portPos.get('in1')!.y).toBe(108);
        expect(portPos.get('out1')!.y).toBe(70);
        expect(portPos.get('loose')!.y).toBe(146);
    });

    it('keeps a ported three-stage exchange in one left-to-right run', async () => {
        // Scored against a near-square footprint this packs into a snaking
        // board, and the last stage has to send a long return connector back
        // across the container.
        const layout = await resolveGraphLayout({
            id: 'ported-container',
            nodes: [
                { id: 'reservoir', width: 250, height: 168, ports: [
                    { id: 'tankIn', side: 'left' }, { id: 'tankOut', side: 'right' },
                ] },
                { id: 'heater', width: 380, height: 260, ports: [
                    { id: 'heatIn', side: 'left' }, { id: 'heatOut', side: 'right' },
                ] },
                { id: 'brew', width: 250, height: 168, ports: [
                    { id: 'brewIn', side: 'left' }, { id: 'brewOut', side: 'right' },
                ] },
            ],
            edges: [
                { id: 'mains', source: 'frameIn', target: 'reservoir', targetPort: 'tankIn' },
                { id: 'hot', source: 'reservoir', target: 'heater', sourcePort: 'tankOut', targetPort: 'heatIn' },
                { id: 'brewed', source: 'heater', target: 'brew', sourcePort: 'heatOut', targetPort: 'brewIn' },
            ],
            graphPorts: [{ id: 'frameIn', side: 'left' }],
            targetAspect: 2.4,
        });
        const part = Object.fromEntries(layout.children.map(node => [node.id, node]));
        expect(part.reservoir.x + part.reservoir.width).toBeLessThanOrEqual(part.heater.x);
        expect(part.heater.x + part.heater.width).toBeLessThanOrEqual(part.brew.x);
        // One run, not two rows.
        expect(layout.height).toBeLessThan(part.heater.height * 1.5);
    });

    it('resolves a ported graph without losing or corrupting a part', async () => {
        const layout = await resolveGraphLayout({
            id: 'ported-integrity',
            nodes: ['a', 'b', 'c', 'd'].map(id => ({
                id, width: 220, height: 150,
                ports: [{ id: `${id}In`, side: 'left' as const }, { id: `${id}Out`, side: 'right' as const }],
            })),
            edges: [
                { id: 'in', source: 'frameIn', target: 'a', targetPort: 'aIn' },
                { id: 'ab', source: 'a', target: 'b', sourcePort: 'aOut', targetPort: 'bIn' },
                { id: 'bc', source: 'b', target: 'c', sourcePort: 'bOut', targetPort: 'cIn' },
                { id: 'bd', source: 'b', target: 'd', sourcePort: 'bOut', targetPort: 'dIn' },
            ],
            graphPorts: [{ id: 'frameIn', side: 'left' }],
            targetAspect: 2.4,
        });
        expect(layout.children.map(node => node.id).sort()).toEqual(['a', 'b', 'c', 'd']);
        expect(layout.children.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    });
});

describe('focusSubtree', () => {
    const children = new Map<string, string[]>([
        ['sys', ['a', 'b']],
        ['a', ['nested']],
    ]);
    const present = () => true;

    it('projects a part and its descendants for drill-down', () => {
        expect([...focusSubtree(children, present, 'a')].sort()).toEqual(['a', 'nested']);
    });

    it('excludes siblings and ancestors of the focus', () => {
        const ids = focusSubtree(children, present, 'a');
        expect(ids.has('sys')).toBe(false);
        expect(ids.has('b')).toBe(false);
    });

    it('respects the present() predicate', () => {
        const ids = focusSubtree(children, id => id !== 'nested', 'a');
        expect([...ids]).toEqual(['a']);
    });
});

describe('classifyIbdFlow', () => {
    it('reads energy / material cues from the flow item', () => {
        expect(classifyIbdFlow('Electrical power')).toBe('energy');
        expect(classifyIbdFlow('thermal load')).toBe('energy');
        expect(classifyIbdFlow('drug fluid')).toBe('material');
        expect(classifyIbdFlow('dose batch')).toBe('material');
    });
    it('treats an unlabelled structural exchange as data', () => {
        expect(classifyIbdFlow(undefined, 'ExchangesWith')).toBe('data');
        expect(classifyIbdFlow('status signal')).toBe('data');
    });
    // `of <itemType>` is optional in SysML v2, so a native flow may carry no
    // item at all. Colouring has to land somewhere sensible rather than throw
    // or fall out of the palette.
    it('treats a native flow with no item as data', () => {
        expect(classifyIbdFlow(undefined, 'flow')).toBe('data');
        expect(IBD_FLOW_COLORS[classifyIbdFlow(undefined, 'flow')]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
    it('recognizes control connectors by type', () => {
        expect(classifyIbdFlow(undefined, 'succession')).toBe('control');
    });
    it('every category has a legend colour', () => {
        for (const k of ['data', 'energy', 'material', 'control'] as const) {
            expect(IBD_FLOW_COLORS[k]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
        for (const d of ['in', 'out', 'inout'] as const) {
            expect(PORT_DIR_COLORS[d]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });
});

describe('ibdEdgeLabel', () => {
    it('prefers the transported item', () => {
        expect(ibdEdgeLabel('UsbTraffic', 'flow')).toBe('UsbTraffic');
        expect(ibdEdgeLabel('Electrical power', 'bind')).toBe('Electrical power');
    });
    // An itemless flow has nothing to add to the arrow. Printing "flow" on
    // every port-to-port connector is the noise the deleted ExchangesWith
    // suppression existed to prevent, and untyped flows are the common case.
    it('says nothing for a connector family carrying no item', () => {
        expect(ibdEdgeLabel(undefined, 'flow')).toBeUndefined();
        expect(ibdEdgeLabel('', 'flow')).toBeUndefined();
        // A delegation is identity, so it never carries an item at all.
        expect(ibdEdgeLabel(undefined, 'bind')).toBeUndefined();
        // Matching goes through toModelType, so the source spelling of a
        // definition name works too — one rule, not three.
        expect(ibdEdgeLabel(undefined, 'Flow')).toBeUndefined();
    });
    it('keeps a relationship type that is a verb worth reading', () => {
        expect(ibdEdgeLabel(undefined, 'Composes')).toBe('Composes');
        expect(ibdEdgeLabel(undefined, 'Mitigates')).toBe('Mitigates');
    });
    it('never returns an empty string for a caller to render', () => {
        expect(ibdEdgeLabel(undefined, '')).toBeUndefined();
        expect(ibdEdgeLabel()).toBeUndefined();
    });
});

describe('buildPortOwnership', () => {
    const rel = (sourceId: string, targetId: string) =>
        ({ type: 'composes', sourceId, targetId });
    const ports = (...ids: string[]) => new Map(ids.map(id => [id, port(id)]));

    it('anchors a boundary port to its part via a composition edge', () => {
        const { ownerPart, parentPort } = buildPortOwnership(
            ports('systemOut'), id => id === 'systemA', [rel('systemA', 'systemOut')]);
        expect(ownerPart.get('systemOut')).toBe('systemA');
        expect(parentPort.size).toBe(0);
    });

    it('resolves a nested port (port owned by a port) to the same part anchor', () => {
        const { ownerPart, parentPort } = buildPortOwnership(
            ports('systemOut', 'alarm'), id => id === 'systemA',
            [rel('systemA', 'systemOut'), rel('systemOut', 'alarm')]);
        expect(parentPort.get('alarm')).toBe('systemOut');
        expect(ownerPart.get('alarm')).toBe('systemA');
    });

    it('resolves deep port chains transitively', () => {
        const { ownerPart } = buildPortOwnership(
            ports('p1', 'p2', 'p3'), id => id === 'block',
            [rel('block', 'p1'), rel('p1', 'p2'), rel('p2', 'p3')]);
        expect(ownerPart.get('p3')).toBe('block');
    });

    it('honors a builder-set owner field over relationships', () => {
        const m = new Map([['p', port('p', { owner: 'block' })]]);
        const { ownerPart } = buildPortOwnership(m, id => id === 'block', []);
        expect(ownerPart.get('p')).toBe('block');
    });

    it('leaves a port that reaches no part without an anchor', () => {
        const { ownerPart } = buildPortOwnership(
            ports('orphanPort', 'loopA', 'loopB'), () => false,
            [rel('loopA', 'loopB'), rel('loopB', 'loopA')]);
        expect(ownerPart.size).toBe(0);
    });
});

describe('projectPortForDisplay', () => {
    const parentPort = new Map([['alarm', 'systemOut'], ['deep', 'alarm']]);

    it("'all' keeps the nested port itself", () => {
        expect(projectPortForDisplay('alarm', 'all', parentPort)).toBe('alarm');
    });

    it("'ports' lifts a nested port to its top-level ancestor", () => {
        expect(projectPortForDisplay('alarm', 'ports', parentPort)).toBe('systemOut');
        expect(projectPortForDisplay('deep', 'ports', parentPort)).toBe('systemOut');
        expect(projectPortForDisplay('systemOut', 'ports', parentPort)).toBe('systemOut');
    });

    it("'none' anchors to the part box instead", () => {
        expect(projectPortForDisplay('alarm', 'none', parentPort)).toBeUndefined();
    });
});

describe('declaredPortRole', () => {
    it('reads declared direction and name suffix, else undefined', () => {
        expect(declaredPortRole(port('p', { portSpec: { direction: 'in' } as never }))).toBe('in');
        expect(declaredPortRole(port('systemOut'))).toBe('out');
        expect(declaredPortRole(port('p', { attributes: { direction: 'DirectionKind::bidirectional' } }))).toBe('out');
        expect(declaredPortRole(port('alarm'))).toBeUndefined();
    });
});

describe('distributePorts (no-overlap invariant)', () => {
    const size = INTERCONNECTION_PORT_SIZE;
    const sideOf = (id: string) => (id.startsWith('in') ? 'left' as const : 'right' as const);

    it('never places a port inside the header band', () => {
        const pos = distributePorts(['in1', 'in2', 'in3'], { width: 200, bodyTop: 46, bodyBottom: 160, sideOf });
        for (const p of pos.values()) {
            expect(p.y + size / 2).toBeGreaterThanOrEqual(46); // centre at/below header
        }
    });

    it('keeps same-side ports at least one pitch apart', () => {
        const pos = distributePorts(['in1', 'in2', 'in3', 'in4'], { width: 200, bodyTop: 40, bodyBottom: 120, sideOf, pitch: 26 });
        const ys = ['in1', 'in2', 'in3', 'in4'].map(id => pos.get(id)!.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(26 - 0.001);
    });

    it('straddles the correct boundary per side', () => {
        const pos = distributePorts(['inA', 'outB'], { width: 300, bodyTop: 40, bodyBottom: 140, sideOf });
        expect(pos.get('inA')!.x).toBeCloseTo(-size / 2);
        expect(pos.get('inA')!.side).toBe('left');
        expect(pos.get('outB')!.x).toBeCloseTo(300 - size / 2);
        expect(pos.get('outB')!.side).toBe('right');
    });

    it('centres a lone port in the body', () => {
        const pos = distributePorts(['in1'], { width: 100, bodyTop: 40, bodyBottom: 140, sideOf });
        expect(pos.get('in1')!.y + size / 2).toBeCloseTo(90); // midpoint of [40,140]
    });

    it('aligns a lone port to an explicit shared centreline', () => {
        const pos = distributePorts(['in1'], {
            width: 180, bodyTop: 46, bodyBottom: 140, sideOf,
            singleCenterY: 72,
        });
        expect(pos.get('in1')!.y + size / 2).toBeCloseTo(72);
    });

    it('deals a horizontal wall across the body and pins it to that edge', () => {
        // The drawing's bottom wall: four mains-side connectors on the case
        // floor. Nothing about them is expressible while ports are dealt only
        // down the left and right walls.
        const wall = ['powerSwitch', 'powerInlet', 'fuseAccess', 'equipotential'];
        const pos = distributePorts(wall, {
            width: 800, height: 500, bodyTop: 48, bodyBottom: 440,
            bodyLeft: 60, bodyRight: 740,
            sideOf: () => 'bottom',
        });
        const xs = wall.map(id => pos.get(id)!.x).sort((a, b) => a - b);
        for (const id of wall) {
            expect(pos.get(id)!.y).toBeCloseTo(500 - size / 2); // straddles the floor
            expect(pos.get(id)!.side).toBe('bottom');
        }
        // dealt across, in order, each clear of its neighbour's caption
        for (let i = 1; i < xs.length; i++) {
            expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PORT_LABEL_STACKED_WIDTH);
        }
        expect(xs[0]).toBeGreaterThanOrEqual(60);
        expect(xs.at(-1)! + size).toBeLessThanOrEqual(740 + size);
    });

    it('straddles the top edge for a top-wall port', () => {
        const pos = distributePorts(['antenna'], {
            width: 300, height: 200, bodyTop: 48, bodyBottom: 180,
            bodyLeft: 20, bodyRight: 280, sideOf: () => 'top',
        });
        expect(pos.get('antenna')!.y).toBeCloseTo(-size / 2);
        expect(pos.get('antenna')!.x + size / 2).toBeCloseTo(150); // midpoint of [20,280]
    });

    it('places all four walls in one pass', () => {
        const sides: Record<string, PortSide> = {
            w: 'left', e: 'right', n: 'top', s: 'bottom',
        };
        const pos = distributePorts(['w', 'e', 'n', 's'], {
            width: 400, height: 300, bodyTop: 48, bodyBottom: 260,
            bodyLeft: 40, bodyRight: 360, sideOf: id => sides[id],
        });
        expect(pos.get('w')!.x).toBeCloseTo(-size / 2);
        expect(pos.get('e')!.x).toBeCloseTo(400 - size / 2);
        expect(pos.get('n')!.y).toBeCloseTo(-size / 2);
        expect(pos.get('s')!.y).toBeCloseTo(300 - size / 2);
    });

    it('extends a horizontal wall group along the wall, not into the box', () => {
        const pos = distributePorts(['panel', 'next'], {
            width: 600, height: 300, bodyTop: 48, bodyBottom: 260,
            bodyLeft: 20, bodyRight: 580, sideOf: () => 'bottom',
            nestedPitch: 20, weightOf: id => (id === 'panel' ? 4 : 1),
        });
        const first = pos.get('panel')!.x + size / 2;
        const second = pos.get('next')!.x + size / 2;
        // three nested squares to the right of the parent, then a full pitch
        expect(second).toBeGreaterThanOrEqual(first + 3 * 20 + PORT_LABEL_STACKED_WIDTH);
        expect(pos.get('panel')!.y).toBeCloseTo(pos.get('next')!.y);
    });

    it('reserves room below a port for its nested ports (group weight)', () => {
        // in1 carries two nested ports (weight 3); in2 must clear the group
        const pos = distributePorts(['in1', 'in2'], {
            width: 100, bodyTop: 40, bodyBottom: 90, sideOf,
            pitch: 26, nestedPitch: 20,
            weightOf: id => (id === 'in1' ? 3 : 1),
        });
        const c1 = pos.get('in1')!.y + size / 2;
        const c2 = pos.get('in2')!.y + size / 2;
        const groupBottom = c1 + 2 * 20; // two nested rows below in1
        expect(c2).toBeGreaterThanOrEqual(groupBottom + 26 - 0.001);
    });
});

describe('summary bundling keys on the rendered endpoint', () => {
    // Summary mode exists to collapse genuinely repeated wiring, not to hide
    // distinct wiring. When ports are drawn, four board outputs each running to
    // their own wall connector are four visible lines; keying the bundle on the
    // owning part instead collapsed them to a single "4 connections" stub and
    // silently deleted three connectors from the drawing.
    const rel = (id: string, sourceId: string, targetId: string) =>
        ({ id, type: 'ExchangesWith', sourceId, targetId, attributes: {} } as never);
    const owner: Record<string, string> = {
        mcuRs485Out: 'board', mcuAudioOut: 'board', mcuDebugIo: 'board',
        rs485Wall: 'case', audioWall: 'case', debugWall: 'case',
    };

    it('keeps connectors between different port pairs of the same two boxes', () => {
        const bundled = summarizeConnectors(
            [rel('r1', 'mcuRs485Out', 'rs485Wall'),
             rel('r2', 'mcuAudioOut', 'audioWall'),
             rel('r3', 'mcuDebugIo', 'debugWall')],
            id => id, // ports are drawn, so each port is its own endpoint
        );
        expect(bundled).toHaveLength(3);
        expect(bundled.every(b => !b.attributes?.bundleCount)).toBe(true);
    });

    it('still bundles when the endpoints really do coincide', () => {
        const bundled = summarizeConnectors(
            [rel('r1', 'mcuRs485Out', 'rs485Wall'),
             rel('r2', 'mcuAudioOut', 'audioWall'),
             rel('r3', 'mcuDebugIo', 'debugWall')],
            id => owner[id], // ports hidden — all three land on the same boxes
        );
        expect(bundled).toHaveLength(1);
        expect(bundled[0].attributes?.bundleCount).toBe('3');
    });
});

describe('boundary port label gutter', () => {
    // The node draws a right-side port caption `PORT_LABEL_OFFSET` clear of the
    // square's far edge, running PORT_LABEL_MAX back into the owner. The
    // template must reserve at least that much, or every boundary caption on a
    // frame overprints the part boxes beside it. These two numbers used to live
    // in separate files behind a "keep in step" comment, and drifted.
    it('reserves enough room for the caption the node actually draws', () => {
        const halfSquareInside = INTERCONNECTION_PORT_SIZE / 2;
        const captionReach =
            INTERCONNECTION_PORT_SIZE + PORT_LABEL_OFFSET + PORT_LABEL_MAX - halfSquareInside;
        expect(SIDE_GUTTER).toBeGreaterThanOrEqual(captionReach);
    });
});

describe('portCaptionWidth with a connector type', () => {
    // A physical port's caption carries the connector FAMILY on a second line.
    // The box has to be sized to whichever line is longer — otherwise a short
    // name like "Serial" gives a 47px pill and "RS-485 serial (isolated)"
    // ellipsises away to nothing, which defeats printing it at all.
    it('widens to the connector type when it is the longer line', () => {
        expect(portCaptionWidth('Serial', 'RS-485 serial (isolated)'))
            .toBeGreaterThan(portCaptionWidth('Serial'));
    });

    it('leaves a caption whose name already dominates unchanged', () => {
        expect(portCaptionWidth('Equipotential Cable', 'USB'))
            .toBe(portCaptionWidth('Equipotential Cable'));
    });

    it('never exceeds the wrap width the side gutter is derived from', () => {
        expect(portCaptionWidth('Microcontroller Programming Port', 'Debug / programming header'))
            .toBeLessThanOrEqual(PORT_LABEL_MAX);
    });

    it('keeps the existing floor for a port with no connector type', () => {
        expect(portCaptionWidth('In')).toBe(44);
    });
});

describe('portIdFromHandle', () => {
    it('recovers the port element id from an outer-face handle', () => {
        expect(portIdFromHandle('portGpcaSwOut')).toBe('portGpcaSwOut');
    });

    it('recovers the port element id from an inner-face handle', () => {
        expect(portIdFromHandle(`portSensorIn${INNER_HANDLE_SUFFIX}`)).toBe('portSensorIn');
    });

    it('returns undefined for a part box face, which is not an element', () => {
        for (const face of ['left', 'right', 'top', 'bottom']) {
            expect(portIdFromHandle(face)).toBeUndefined();
        }
    });

    it('returns undefined when there is no handle', () => {
        expect(portIdFromHandle(null)).toBeUndefined();
        expect(portIdFromHandle(undefined)).toBeUndefined();
        expect(portIdFromHandle('')).toBeUndefined();
    });
});

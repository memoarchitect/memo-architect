// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/tools/browser';
import type { LayoutGraph, LayoutRunOptions } from '../diagram/layout-provider';
import { runLayoutProvider } from '../diagram/layout-providers';
import { LAYER_COLORS, REL_COLORS, SEMANTIC_GROUPS, CONTAINMENT_DEPTH_COLORS } from '../constants';
import { SHADOW, RADIUS, EDGE, FONT } from '../styles/tokens';
import type { DecompositionNodeData } from './DecompositionNode';
import { pickCompartmentEntries } from './templates/composition-tree';

export const elk = {
    /** Compatibility facade while call sites migrate from the ELK-shaped graph contract. */
    layout: (graph: LayoutGraph, options?: LayoutRunOptions): Promise<LayoutGraph> =>
        runLayoutProvider(graph, options),
};

export interface LayoutResult {
    nodes: Node[];
    edges: Edge[];
}

// ─── Shared adaptive layout resolver ─────────────────────────────────────────

export interface ResolverNode { id: string; width: number; height: number }
export interface ResolverEdge {
    id: string;
    source: string;
    target: string;
    /** Local y-coordinate of the semantic connection anchor on each node. */
    sourceAnchorY?: number;
    targetAnchorY?: number;
}
export interface ResolverChild extends ResolverNode { x: number; y: number }
export interface ResolvedGraphLayout {
    strategy: 'layered-right' | 'layered-down' | 'balanced-board' | 'elk-layered';
    width: number;
    height: number;
    children: ResolverChild[];
}

export interface RoutePoint { x: number; y: number }
export interface RouteObstacle { id: string; x: number; y: number; width: number; height: number }
export interface OrthogonalRouteRequest {
    id: string;
    source: RoutePoint;
    target: RoutePoint;
    sourceNodeId: string;
    targetNodeId: string;
    sourceSide?: 'left' | 'right' | 'top' | 'bottom';
    targetSide?: 'left' | 'right' | 'top' | 'bottom';
}

const segmentIntersectsRect = (a: RoutePoint, b: RoutePoint, r: RouteObstacle, pad = 10): boolean => {
    const left = r.x - pad, right = r.x + r.width + pad;
    const top = r.y - pad, bottom = r.y + r.height + pad;
    if (a.y === b.y) return a.y >= top && a.y <= bottom && Math.max(a.x, b.x) >= left && Math.min(a.x, b.x) <= right;
    if (a.x === b.x) return a.x >= left && a.x <= right && Math.max(a.y, b.y) >= top && Math.min(a.y, b.y) <= bottom;
    return false;
};

const sameSegment = (a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): boolean => {
    if (a.y === b.y && c.y === d.y && a.y === c.y) {
        return Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) < Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
    }
    if (a.x === b.x && c.x === d.x && a.x === c.x) {
        return Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) < Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
    }
    return false;
};

const segmentsCrossOrthogonally = (a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): boolean => {
    const h1 = a.y === b.y, h2 = c.y === d.y;
    if (h1 === h2) return false;
    const hA = h1 ? a : c, hB = h1 ? b : d, vA = h1 ? c : a, vB = h1 ? d : b;
    return vA.x > Math.min(hA.x, hB.x) && vA.x < Math.max(hA.x, hB.x)
        && hA.y > Math.min(vA.y, vB.y) && hA.y < Math.max(vA.y, vB.y);
};

/** Plan all routes together so later edges avoid occupied tracks and crossings. */
export function routeOrthogonalEdges(
    requests: OrthogonalRouteRequest[],
    obstacles: RouteObstacle[],
    channelGap = 18,
): Map<string, RoutePoint[]> {
    const result = new Map<string, RoutePoint[]>();
    const occupied: Array<[RoutePoint, RoutePoint]> = [];
    const clearance = Math.max(12, channelGap * 0.75);
    // Long connectors establish the scarce cross-board channels first; local
    // edges can then take nearby alternatives without forcing long detours.
    const orderedRequests = [...requests].sort((a, b) =>
        (Math.abs(b.source.x - b.target.x) + Math.abs(b.source.y - b.target.y))
        - (Math.abs(a.source.x - a.target.x) + Math.abs(a.source.y - a.target.y)));

    for (const request of orderedRequests) {
        const { source: s, target: t } = request;
        const relevant = obstacles.filter(o => o.id !== request.sourceNodeId && o.id !== request.targetNodeId);
        const xCoords = new Set<number>([s.x, t.x, (s.x + t.x) / 2, s.x - channelGap, s.x + channelGap, t.x - channelGap, t.x + channelGap]);
        const yCoords = new Set<number>([s.y, t.y, (s.y + t.y) / 2, s.y - channelGap, s.y + channelGap, t.y - channelGap, t.y + channelGap]);
        for (const obstacle of relevant) {
            xCoords.add(obstacle.x - clearance);
            xCoords.add(obstacle.x + obstacle.width + clearance);
            yCoords.add(obstacle.y - clearance);
            yCoords.add(obstacle.y + obstacle.height + clearance);
        }
        // Existing tracks become candidate coordinates, allowing tidy parallel
        // lanes while the cost function prevents coincident segments.
        for (const [a, b] of occupied) {
            xCoords.add(a.x); xCoords.add(b.x);
            yCoords.add(a.y); yCoords.add(b.y);
        }
        const xs = [...xCoords].sort((a, b) => a - b);
        const ys = [...yCoords].sort((a, b) => a - b);
        const points: RoutePoint[] = [];
        const pointIndex = new Map<string, number>();
        const key = (x: number, y: number) => `${x.toFixed(3)}:${y.toFixed(3)}`;
        const inside = (point: RoutePoint) => relevant.some(o =>
            point.x > o.x - clearance && point.x < o.x + o.width + clearance
            && point.y > o.y - clearance && point.y < o.y + o.height + clearance);
        for (const y of ys) for (const x of xs) {
            const point = { x, y };
            if (inside(point) && key(x, y) !== key(s.x, s.y) && key(x, y) !== key(t.x, t.y)) continue;
            pointIndex.set(key(x, y), points.length);
            points.push(point);
        }
        const adjacency = new Map<number, number[]>();
        const link = (a: number, b: number) => {
            if (!adjacency.has(a)) adjacency.set(a, []);
            if (!adjacency.has(b)) adjacency.set(b, []);
            adjacency.get(a)!.push(b); adjacency.get(b)!.push(a);
        };
        const clear = (a: RoutePoint, b: RoutePoint) => !relevant.some(o => segmentIntersectsRect(a, b, o, clearance - 1));
        for (const y of ys) {
            const row = xs.map(x => pointIndex.get(key(x, y))).filter((i): i is number => i !== undefined);
            for (let i = 1; i < row.length; i++) if (clear(points[row[i - 1]], points[row[i]])) link(row[i - 1], row[i]);
        }
        for (const x of xs) {
            const col = ys.map(y => pointIndex.get(key(x, y))).filter((i): i is number => i !== undefined);
            for (let i = 1; i < col.length; i++) if (clear(points[col[i - 1]], points[col[i]])) link(col[i - 1], col[i]);
        }

        const start = pointIndex.get(key(s.x, s.y));
        const goal = pointIndex.get(key(t.x, t.y));
        type SearchState = { node: number; dir: 'H' | 'V' | 'N'; g: number; f: number; parent?: string };
        const stateKey = (node: number, dir: SearchState['dir']) => `${node}:${dir}`;
        const open: SearchState[] = start === undefined ? [] : [{
            node: start, dir: 'N', g: 0,
            f: Math.abs(s.x - t.x) + Math.abs(s.y - t.y),
        }];
        const bestCost = new Map<string, number>(start === undefined ? [] : [[stateKey(start, 'N'), 0]]);
        const states = new Map<string, SearchState>();
        if (open[0]) states.set(stateKey(open[0].node, open[0].dir), open[0]);
        let found: SearchState | undefined;
        const leavesSide = (a: RoutePoint, b: RoutePoint, side: OrthogonalRouteRequest['sourceSide']) =>
            !side || (side === 'left' && b.x < a.x) || (side === 'right' && b.x > a.x)
            || (side === 'top' && b.y < a.y) || (side === 'bottom' && b.y > a.y);
        while (open.length > 0) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift()!;
            if (current.node === goal) { found = current; break; }
            for (const nextNode of adjacency.get(current.node) ?? []) {
                const a = points[current.node], b = points[nextNode];
                if (current.node === start && !leavesSide(a, b, request.sourceSide)) continue;
                if (nextNode === goal && !leavesSide(b, a, request.targetSide)) continue;
                const dir: 'H' | 'V' = a.y === b.y ? 'H' : 'V';
                const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
                let penalty = current.dir !== 'N' && current.dir !== dir ? 90 : 0;
                for (const [c, d] of occupied) {
                    if (sameSegment(a, b, c, d)) penalty += 4_000;
                    else if (segmentsCrossOrthogonally(a, b, c, d)) penalty += 600;
                }
                // Prefer monotone progress, but never at the expense of routing
                // through an obstacle (the visibility graph forbids that).
                const before = Math.abs(a.x - t.x) + Math.abs(a.y - t.y);
                const after = Math.abs(b.x - t.x) + Math.abs(b.y - t.y);
                if (after > before) penalty += (after - before) * 1.5;
                const g = current.g + length + penalty;
                const nextKey = stateKey(nextNode, dir);
                if (g >= (bestCost.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
                const next: SearchState = { node: nextNode, dir, g, f: g + after, parent: stateKey(current.node, current.dir) };
                bestCost.set(nextKey, g); states.set(nextKey, next); open.push(next);
            }
        }

        let route: RoutePoint[] = [];
        if (found) {
            let cursor: SearchState | undefined = found;
            while (cursor) {
                route.push(points[cursor.node]);
                cursor = cursor.parent ? states.get(cursor.parent) : undefined;
            }
            route.reverse();
        }
        if (route.length < 2) {
            const midX = (s.x + t.x) / 2;
            route = [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t];
        }
        const compact = route.filter((p, i) => i === 0 || i === route.length - 1
            || !((route[i - 1].x === p.x && p.x === route[i + 1].x)
                || (route[i - 1].y === p.y && p.y === route[i + 1].y)));
        result.set(request.id, compact);
        for (let i = 1; i < compact.length; i++) occupied.push([compact[i - 1], compact[i]]);
    }
    return result;
}

/** Base footprint score shared by every diagram template. */
export function compactnessScore(width: number, height: number, targetAspect = 1.5): number {
    if (width <= 0 || height <= 0) return Number.POSITIVE_INFINITY;
    const aspectPenalty = 1 + 1.35 * Math.abs(Math.log((width / height) / targetAspect));
    return width * height * aspectPenalty;
}

/** Column count for a two-dimensional board near the requested aspect. */
export function balancedGridColumns(count: number, targetAspect = 1.25): number {
    if (count <= 1) return Math.max(count, 1);
    return Math.min(count, Math.max(2, Math.round(Math.sqrt(count * targetAspect))));
}

/** Stable connectivity order: sources first, then breadth-first adjacency. */
export function connectivityOrder(nodes: ResolverNode[], edges: ResolverEdge[]): string[] {
    const present = new Set(nodes.map(n => n.id));
    const outgoing = new Map<string, string[]>();
    const indegree = new Map(nodes.map(n => [n.id, 0]));
    for (const edge of edges) {
        if (!present.has(edge.source) || !present.has(edge.target) || edge.source === edge.target) continue;
        if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
        outgoing.get(edge.source)!.push(edge.target);
        indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
    const original = nodes.map(n => n.id);
    const queue = original.filter(id => (indegree.get(id) ?? 0) === 0);
    const ordered: string[] = [];
    const seen = new Set<string>();
    while (queue.length) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        ordered.push(id);
        for (const target of outgoing.get(id) ?? []) {
            indegree.set(target, (indegree.get(target) ?? 1) - 1);
            if (indegree.get(target) === 0) queue.push(target);
        }
    }
    for (const id of original) if (!seen.has(id)) ordered.push(id);
    return ordered;
}

function balancedBoard(nodes: ResolverNode[], edges: ResolverEdge[], gapX: number, gapY: number, targetAspect: number): ResolvedGraphLayout {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const ordered = connectivityOrder(nodes, edges).map(id => byId.get(id)!);
    const cols = balancedGridColumns(nodes.length, targetAspect);
    const rows = Math.ceil(nodes.length / cols);
    const slots = ordered.map((node, index) => {
        const row = Math.floor(index / cols);
        const offset = index % cols;
        // Snake rows keep a connected sequence adjacent at row turns instead
        // of producing a long return connector across the entire board.
        const col = row % 2 === 0 ? offset : cols - 1 - offset;
        return { node, row, col };
    });
    const colWidths = Array.from({ length: cols }, () => 0);
    const rowHeights = Array.from({ length: rows }, () => 0);
    for (const { node, row, col } of slots) {
        colWidths[col] = Math.max(colWidths[col], node.width);
        rowHeights[row] = Math.max(rowHeights[row], node.height);
    }
    const colX = colWidths.map((_, i) => i === 0 ? 0 : colWidths.slice(0, i).reduce((a, b) => a + b, 0) + gapX * i);
    const rowY = rowHeights.map((_, i) => i === 0 ? 0 : rowHeights.slice(0, i).reduce((a, b) => a + b, 0) + gapY * i);
    const children = slots.map(({ node, row, col }) => ({
        ...node,
        x: colX[col] + (colWidths[col] - node.width) / 2,
        y: rowY[row] + (rowHeights[row] - node.height) / 2,
    }));
    return {
        strategy: 'balanced-board',
        width: colWidths.reduce((a, b) => a + b, 0) + gapX * Math.max(cols - 1, 0),
        height: rowHeights.reduce((a, b) => a + b, 0) + gapY * Math.max(rows - 1, 0),
        children,
    };
}

function segmentsCross(a: ResolverChild, b: ResolverChild, c: ResolverChild, d: ResolverChild): boolean {
    const p = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const q = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const r = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
    const s = { x: d.x + d.width / 2, y: d.y + d.height / 2 };
    const orient = (u: typeof p, v: typeof p, w: typeof p) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
    return orient(p, q, r) * orient(p, q, s) < 0 && orient(r, s, p) * orient(r, s, q) < 0;
}

/** Score actual geometry, including connector length and pairwise crossings. */
export function resolvedLayoutScore(layout: ResolvedGraphLayout, edges: ResolverEdge[], targetAspect = 1.5): number {
    const byId = new Map(layout.children.map(n => [n.id, n]));
    let edgeLength = 0;
    let crossings = 0;
    let directionPenalty = 0;
    let bendPenalty = 0;
    const usable = edges.filter(e => byId.has(e.source) && byId.has(e.target));
    for (const edge of usable) {
        const s = byId.get(edge.source)!;
        const t = byId.get(edge.target)!;
        edgeLength += Math.abs((s.x + s.width / 2) - (t.x + t.width / 2))
            + Math.abs((s.y + s.height / 2) - (t.y + t.height / 2));
        const dx = (t.x + t.width / 2) - (s.x + s.width / 2);
        const dy = Math.abs((t.y + t.height / 2) - (s.y + s.height / 2));
        if (dx <= 0) directionPenalty += 55_000;
        directionPenalty += Math.max(0, dy - Math.max(dx, 0)) * 80;
        // When both axes change, an orthogonal connector needs at least one
        // bend. Prefer candidates that align connected ports into straight
        // horizontal runs before spending space on routing lanes.
        if (Math.abs(dx) > 8 && dy > 8) bendPenalty += 18_000;
    }
    for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
        const a = usable[i], b = usable[j];
        if (a.source === b.source || a.source === b.target || a.target === b.source || a.target === b.target) continue;
        if (segmentsCross(byId.get(a.source)!, byId.get(a.target)!, byId.get(b.source)!, byId.get(b.target)!)) crossings++;
    }
    // Score the paths the shared orthogonal router can actually realize for
    // this candidate. Centre-line estimates alone routinely choose compact
    // arrangements that later require long detours or crossing channels.
    const routed = routeOrthogonalEdges(usable.map(edge => {
        const source = byId.get(edge.source)!;
        const target = byId.get(edge.target)!;
        return {
            id: edge.id,
            source: { x: source.x + source.width, y: source.y + source.height / 2 },
            target: { x: target.x, y: target.y + target.height / 2 },
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceSide: 'right' as const,
            targetSide: 'left' as const,
        };
    }), layout.children);
    let routedLength = 0;
    let routedBends = 0;
    let routedCrossings = 0;
    const routedSegments: Array<{ edgeId: string; a: RoutePoint; b: RoutePoint }> = [];
    for (const [edgeId, points] of routed) {
        routedBends += Math.max(0, points.length - 2);
        for (let i = 1; i < points.length; i++) {
            routedLength += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
            routedSegments.push({ edgeId, a: points[i - 1], b: points[i] });
        }
    }
    for (let i = 0; i < routedSegments.length; i++) for (let j = i + 1; j < routedSegments.length; j++) {
        const a = routedSegments[i], b = routedSegments[j];
        if (a.edgeId === b.edgeId) continue;
        if (sameSegment(a.a, a.b, b.a, b.b) || segmentsCrossOrthogonally(a.a, a.b, b.a, b.b)) routedCrossings++;
    }
    return compactnessScore(layout.width, layout.height, targetAspect)
        + edgeLength * 18
        + directionPenalty
        + bendPenalty
        + crossings * Math.max(layout.width * layout.height * 0.35, 50_000)
        + routedLength * 6
        + routedBends * 4_000
        + routedCrossings * Math.max(layout.width * layout.height * 0.45, 70_000);
}

/**
 * Generic layout policy used by templates: evaluate real horizontal, vertical,
 * and balanced-board candidates, then choose from measured geometry.
 */
export async function resolveGraphLayout(options: {
    id: string;
    nodes: ResolverNode[];
    edges: ResolverEdge[];
    targetAspect?: number;
    gapX?: number;
    gapY?: number;
    /** Preserve a semantic flow axis when the view requires ordered lanes. */
    directedFlowAxis?: 'RIGHT' | 'DOWN' | 'AUTO';
    /** Installed layout provider selected for this diagram. */
    layoutProviderId?: string;
}): Promise<ResolvedGraphLayout> {
    const { nodes, edges } = options;
    if (nodes.length === 0) return { strategy: 'balanced-board', width: 0, height: 0, children: [] };
    const targetAspect = options.targetAspect ?? 1.5;
    const gapX = options.gapX ?? 54;
    const gapY = options.gapY ?? 58;
    const layered = (direction: 'RIGHT' | 'DOWN'): ResolvedGraphLayout => {
        const byId = new Map(nodes.map(n => [n.id, n]));
        const ordered = connectivityOrder(nodes, edges).map(nodeId => byId.get(nodeId)!);
        let cursor = 0;
        const crossSize = direction === 'RIGHT'
            ? Math.max(...ordered.map(n => n.height))
            : Math.max(...ordered.map(n => n.width));
        let children = ordered.map(node => {
            const child = {
                ...node,
                x: direction === 'RIGHT' ? cursor : (crossSize - node.width) / 2,
                y: direction === 'DOWN' ? cursor : (crossSize - node.height) / 2,
            };
            cursor += (direction === 'RIGHT' ? node.width + gapX : node.height + gapY);
            return child;
        });
        if (direction === 'RIGHT' && edges.some(e => e.sourceAnchorY !== undefined && e.targetAnchorY !== undefined)) {
            const childById = new Map(children.map(n => [n.id, n]));
            const placedY = new Map<string, number>();
            const anchor = [...children].sort((a, b) => b.width * b.height - a.width * a.height)[0];
            placedY.set(anchor.id, 0);
            let changed = true;
            while (changed) {
                changed = false;
                for (const edge of edges) {
                    if (edge.sourceAnchorY === undefined || edge.targetAnchorY === undefined) continue;
                    const sy = placedY.get(edge.source), ty = placedY.get(edge.target);
                    if (sy !== undefined && ty === undefined) {
                        placedY.set(edge.target, sy + edge.sourceAnchorY - edge.targetAnchorY); changed = true;
                    } else if (ty !== undefined && sy === undefined) {
                        placedY.set(edge.source, ty + edge.targetAnchorY - edge.sourceAnchorY); changed = true;
                    }
                }
            }
            children = children.map(n => ({ ...n, y: placedY.get(n.id) ?? n.y }));
            const minY = Math.min(...children.map(n => n.y));
            children = children.map(n => ({ ...n, y: n.y - minY }));
        }
        const resolvedWidth = Math.max(...children.map(n => n.x + n.width));
        const resolvedHeight = Math.max(...children.map(n => n.y + n.height));
        return {
            strategy: direction === 'RIGHT' ? 'layered-right' : 'layered-down',
            width: resolvedWidth,
            height: resolvedHeight,
            children,
        };
    };
    if (options.directedFlowAxis === 'RIGHT') return layered('RIGHT');
    if (options.directedFlowAxis === 'DOWN') return layered('DOWN');

    const candidates: ResolvedGraphLayout[] = [
        balancedBoard(nodes, edges, gapX, gapY, targetAspect),
        layered('RIGHT'),
        layered('DOWN'),
    ];

    // ELK Layered is the primary topology-aware candidate. MULTI_EDGE wrapping
    // gives it permission to trade a very long strip for a compact board, while
    // crossing minimisation and straight-edge preference remain global rather
    // than being encoded for a particular diagram.
    if (nodes.length >= 3 && edges.length > 0) {
        try {
            const output = await elk.layout({
                id: `resolver-${options.id}`,
                layoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': 'RIGHT',
                    'elk.edgeRouting': 'ORTHOGONAL',
                    'elk.aspectRatio': String(targetAspect),
                    'elk.padding': '[top=0,left=0,bottom=0,right=0]',
                    'elk.spacing.nodeNode': String(gapY),
                    'elk.layered.spacing.nodeNodeBetweenLayers': String(gapX),
                    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                    'elk.layered.nodePlacement.favorStraightEdges': 'true',
                    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
                    'elk.layered.wrapping.strategy': 'MULTI_EDGE',
                    'elk.layered.wrapping.additionalEdgeSpacing': '18',
                    'elk.separateConnectedComponents': 'true',
                    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
                    'elk.randomSeed': '1',
                },
                children: nodes.map(node => ({ id: node.id, width: node.width, height: node.height })),
                edges: edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
            }, { providerId: options.layoutProviderId });
            const rawChildren = output.children ?? [];
            if (rawChildren.length === nodes.length) {
                const byId = new Map(nodes.map(node => [node.id, node]));
                const minX = Math.min(...rawChildren.map(child => child.x ?? 0));
                const minY = Math.min(...rawChildren.map(child => child.y ?? 0));
                const children = rawChildren.map(child => ({
                    ...byId.get(child.id)!,
                    x: (child.x ?? 0) - minX,
                    y: (child.y ?? 0) - minY,
                }));
                candidates.push({
                    strategy: 'elk-layered',
                    width: Math.max(...children.map(child => child.x + child.width)),
                    height: Math.max(...children.map(child => child.y + child.height)),
                    children,
                });
            }
        } catch {
            // The deterministic measured candidates remain available if the
            // worker is unavailable or a graph exposes an unsupported option.
        }
    }
    return candidates.reduce((best, candidate) =>
        resolvedLayoutScore(candidate, edges, targetAspect) < resolvedLayoutScore(best, edges, targetAspect)
            ? candidate : best);
}

export async function computeLayout(
    model: MemoModelDTO,
    options?: {
        viewpointFilter?: (el: MemoElement) => boolean;
        /** Relationship types declared by the view; when given, only these are drawn */
        relationshipTypes?: string[];
        /** Render attribute compartments on nodes (General view template) */
        compartments?: boolean;
        layoutProviderId?: string;
    }
): Promise<LayoutResult> {
    const elements = Object.values(model.elements);
    const visibleElements = options?.viewpointFilter
        ? elements.filter(options.viewpointFilter)
        : elements;

    const visibleIds = new Set(visibleElements.map(e => e.id));

    const declaredRelTypes = options?.relationshipTypes?.length
        ? new Set(options.relationshipTypes.map(t => t.toLowerCase()))
        : undefined;

    const visibleRelationships = model.relationships.filter(
        r => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
            && (!declaredRelTypes || declaredRelTypes.has(r.type.toLowerCase()))
    );

    // Choose direction based on element count — vertical for smaller sets,
    // horizontal for very large models to avoid extreme height
    const n = visibleElements.length;
    const direction = n > 60 ? 'RIGHT' : 'DOWN';

    // Progressive spacing: larger models get tighter layout
    const nodeSpacing = n > 40 ? '24' : n > 20 ? '32' : '40';
    const layerSpacing = n > 40 ? '60' : n > 20 ? '80' : '100';

    // Estimate node width from the longer of name and kind label so long kind
    // tags (e.g. HARDWAREASSEMBLY) don't overflow the box
    const compartmentsByEl = options?.compartments
        ? new Map(visibleElements.map(el => [el.id, pickCompartmentEntries(el)]))
        : undefined;
    const nodeWidth = (el: MemoElement) =>
        Math.max(el.name.length * 7.5 + 48, el.kind.length * 6.8 + 48, 130);
    const nodeHeight = (el: MemoElement) => {
        const entries = compartmentsByEl?.get(el.id);
        return 52 + (entries?.length ? entries.length * 15 + 10 : 0);
    };

    // Build ELK graph — flat layout with relationship-driven layering
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction,
            'elk.spacing.nodeNode': nodeSpacing,
            'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing,
            'elk.layered.spacing.edgeNodeBetweenLayers': '24',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
            // Wrap long chains to prevent extreme width/height
            'elk.layered.wrapping.strategy': 'MULTI_EDGE',
            'elk.layered.wrapping.additionalEdgeSpacing': '16',
            // Pack disconnected islands into a compact block instead of a strip
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '56',
            'elk.aspectRatio': '1.6',
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        children: visibleElements.map(el => ({
            id: el.id,
            width: nodeWidth(el),
            height: nodeHeight(el),
        })),
        edges: visibleRelationships.map((rel, i) => ({
            id: rel.id || `e-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    // Run ELK layout. The MULTI_EDGE wrapping scanline throws
    // "Invalid hitboxes for scanline constraint calculation" on some large
    // graphs (whole-model layouts) — retry without wrapping when ELK fails.
    let layouted: Awaited<ReturnType<typeof elk.layout>>;
    try {
        layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId });
    } catch (err) {
        console.warn('ELK layout failed, retrying without edge wrapping:', err);
        delete (elkGraph.layoutOptions as Record<string, string>)['elk.layered.wrapping.strategy'];
        delete (elkGraph.layoutOptions as Record<string, string>)['elk.layered.wrapping.additionalEdgeSpacing'];
        layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId });
    }

    // Convert to ReactFlow nodes — use 'diagramNode' type for interactive features
    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = model.elements[child.id];
        const color = LAYER_COLORS[el?.layer] || '#666';
        const compartments = compartmentsByEl?.get(child.id);
        return {
            id: child.id,
            type: 'diagramNode',
            position: { x: child.x || 0, y: child.y || 0 },
            data: {
                label: el?.name || child.id,
                kind: el?.kind ?? '',
                layer: el?.layer ?? '',
                construct: el?.construct,
                color,
                ...(compartments?.length ? { compartments } : {}),
            },
        };
    });

    // Convert to ReactFlow edges — styled by relationship type
    const edges: Edge[] = visibleRelationships.map((rel, i) => {
        const relColor = REL_COLORS[rel.type] || '#9CA3AF';
        const typeLower = rel.type.toLowerCase();
        const isFlow = rel.type === 'flow';
        const isSuccession = rel.type === 'succession';
        const isDecomp = typeLower === 'composedof' || typeLower === 'decomposedby'
            || typeLower === 'aggregation' || typeLower === 'composes';
        return {
            id: rel.id || `e-${i}`,
            source: rel.sourceId,
            target: rel.targetId,
            // Structural edges are self-explanatory from the arrow — dropping
            // their repeated labels is what keeps dense trees readable
            label: isDecomp ? undefined : rel.type,
            type: isSuccession ? 'smoothstep' : 'default',
            animated: isFlow,
            style: {
                stroke: relColor,
                strokeWidth: isDecomp ? 2.5 : isFlow ? 2 : EDGE.defaultWidth,
                strokeDasharray: isDecomp ? undefined : isFlow ? undefined : rel.type === 'traceTo' ? '5 3' : undefined,
            },
            labelStyle: {
                fontSize: '10px',
                fill: '#6B7280',
                fontWeight: 500,
            },
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            labelBgStyle: EDGE.labelBgStyle,
            markerEnd: {
                type: isDecomp ? 'arrow' as any : 'arrowclosed' as any,
                color: relColor,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

    return { nodes, edges };
}

// ─── Decomposition Layout ─────────────────────────────────────────────────────
//
// Builds a containment tree from composedOf/aggregation relationships,
// then renders as either IBD (nested boxes) or Tree (hierarchy with edges).
// ─────────────────────────────────────────────────────────────────────────────

/** Structural element kinds eligible for decomposition diagrams */
const STRUCTURAL_KINDS = new Set<string>();
for (const g of SEMANTIC_GROUPS) {
    if (['logical', 'physical'].includes(g.id)) {
        for (const k of g.kinds) STRUCTURAL_KINDS.add(k);
    }
}

export interface DecompositionTree {
    roots: string[];
    childrenMap: Map<string, string[]>;
    elements: Map<string, MemoElement>;
}

export function buildDecompositionTree(model: MemoModelDTO): DecompositionTree {
    const elements = new Map<string, MemoElement>();
    for (const el of Object.values(model.elements)) {
        if (STRUCTURAL_KINDS.has(el.kind)) {
            elements.set(el.id, el);
        }
    }

    // Build parent→children map from composedOf/aggregation relationships
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of model.relationships) {
        if ((rel.type === 'composedOf' || rel.type === 'aggregation') &&
            elements.has(rel.sourceId) && elements.has(rel.targetId)) {
            // source=whole/parent, target=part/child
            if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
            childrenMap.get(rel.sourceId)!.push(rel.targetId);
            hasParent.add(rel.targetId);
        }
    }

    // Roots = structural elements with no parent
    const roots = [...elements.keys()].filter(id => !hasParent.has(id));

    return { roots, childrenMap, elements };
}

// ─── IBD Layout (nested containment) ──────────────────────────────────────────

interface ElkCompoundNode {
    id: string;
    width?: number;
    height?: number;
    children?: ElkCompoundNode[];
    layoutOptions?: Record<string, string>;
}

function buildElkCompoundGraph(
    nodeId: string,
    tree: DecompositionTree,
    depth: number,
    maxDepth: number,
): ElkCompoundNode {
    const el = tree.elements.get(nodeId)!;
    const children = tree.childrenMap.get(nodeId) || [];
    const isLeaf = children.length === 0 || depth >= maxDepth;
    const nodeWidth = Math.max(el.name.length * 8 + 40, 140);

    if (isLeaf) {
        return { id: nodeId, width: nodeWidth, height: 44 };
    }

    return {
        id: nodeId,
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.padding': '[top=44,left=16,bottom=16,right=16]',
            'elk.spacing.nodeNode': '20',
            'elk.layered.spacing.nodeNodeBetweenLayers': '30',
        },
        children: children
            .filter(cid => tree.elements.has(cid))
            .map(cid => buildElkCompoundGraph(cid, tree, depth + 1, maxDepth)),
    };
}

export async function computeIBDLayout(
    model: MemoModelDTO,
    options?: { maxDepth?: number; layoutProviderId?: string }
): Promise<LayoutResult> {
    const maxDepth = options?.maxDepth ?? 99;
    const tree = buildDecompositionTree(model);

    if (tree.roots.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Build compound ELK graph
    const elkGraph: any = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '30',
            'elk.layered.spacing.nodeNodeBetweenLayers': '40',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        },
        children: tree.roots
            .filter(id => tree.elements.has(id))
            .map(id => buildElkCompoundGraph(id, tree, 0, maxDepth)),
    };

    const layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId });

    // Flatten compound layout into ReactFlow nodes with parentId
    const nodes: Node[] = [];

    function flattenNodes(elkNode: any, parentId?: string) {
        const el = tree.elements.get(elkNode.id);
        if (!el) return;

        const color = LAYER_COLORS[el.layer] || '#666';
        const hasChildren = elkNode.children && elkNode.children.length > 0;

        const node: Node = {
            id: elkNode.id,
            position: { x: elkNode.x || 0, y: elkNode.y || 0 },
            data: {
                label: el.name,
                kind: el.kind,
                layer: el.layer,
                color,
            },
            ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            style: hasChildren ? {
                width: elkNode.width,
                height: elkNode.height,
                background: color + '08',
                border: `1.5px solid ${color}40`,
                borderRadius: '10px',
                padding: '0',
                fontSize: '12px',
                fontWeight: 600,
                color: color,
            } : {
                background: '#FFFFFF',
                borderLeft: `3px solid ${color}`,
                borderTop: '1px solid #E5E5E0',
                borderRight: '1px solid #E5E5E0',
                borderBottom: '1px solid #E5E5E0',
                borderRadius: RADIUS.md,
                color: '#1a1a1a',
                fontSize: FONT.md,
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: SHADOW.md,
            },
        };

        nodes.push(node);

        if (elkNode.children) {
            for (const child of elkNode.children) {
                flattenNodes(child, elkNode.id);
            }
        }
    }

    for (const topNode of (layouted.children || [])) {
        flattenNodes(topNode);
    }

    return { nodes, edges: [] };
}

// ─── Tree/SBS Layout (hierarchical tree with edges) ───────────────────────────

export async function computeTreeLayout(
    model: MemoModelDTO,
    options?: { direction?: 'DOWN' | 'RIGHT'; layoutProviderId?: string }
): Promise<LayoutResult> {
    const direction = options?.direction ?? 'DOWN';
    const tree = buildDecompositionTree(model);

    if (tree.roots.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Collect all elements that participate in the tree
    const treeIds = new Set<string>();
    function collectIds(id: string) {
        treeIds.add(id);
        for (const childId of (tree.childrenMap.get(id) || [])) {
            if (tree.elements.has(childId)) collectIds(childId);
        }
    }
    for (const rootId of tree.roots) {
        if (tree.elements.has(rootId)) collectIds(rootId);
    }

    // Build hierarchy edges
    const treeEdges: { id: string; sources: string[]; targets: string[] }[] = [];
    let edgeIdx = 0;
    for (const [parentId, children] of tree.childrenMap) {
        for (const childId of children) {
            if (treeIds.has(parentId) && treeIds.has(childId)) {
                treeEdges.push({
                    id: `te-${edgeIdx++}`,
                    sources: [parentId],
                    targets: [childId],
                });
            }
        }
    }

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'mrtree',
            'elk.direction': direction,
            'elk.spacing.nodeNode': '30',
            'elk.mrtree.searchOrder': 'DFS',
        },
        children: [...treeIds].map(id => {
            const el = tree.elements.get(id)!;
            return {
                id,
                width: Math.max(el.name.length * 8 + 40, 140),
                height: 44,
            };
        }),
        edges: treeEdges,
    };

    const layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId });

    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = tree.elements.get(child.id)!;
        const color = LAYER_COLORS[el.layer] || '#666';
        return {
            id: child.id,
            position: { x: child.x || 0, y: child.y || 0 },
            data: {
                label: el.name,
                kind: el.kind,
                layer: el.layer,
                color,
            },
            style: {
                background: '#FFFFFF',
                borderLeft: `3px solid ${color}`,
                borderTop: '1px solid #E5E5E0',
                borderRight: '1px solid #E5E5E0',
                borderBottom: '1px solid #E5E5E0',
                borderRadius: RADIUS.md,
                color: '#1a1a1a',
                fontSize: FONT.md,
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: SHADOW.md,
            },
        };
    });

    const edges: Edge[] = treeEdges.map((te, i) => ({
        id: `tree-e-${i}`,
        source: te.sources[0],
        target: te.targets[0],
        label: 'composedOf',
        type: 'default',
        style: {
            stroke: REL_COLORS['composedOf'] || '#8E44AD',
            strokeWidth: EDGE.defaultWidth,
        },
        labelStyle: {
            fontSize: FONT.badge,
            fill: '#6B7280',
            fontWeight: 500,
        },
        labelBgPadding: EDGE.labelBgPadding,
        labelBgBorderRadius: EDGE.labelBgRadius,
        labelBgStyle: EDGE.labelBgStyle,
        markerEnd: {
            type: 'arrowclosed' as any,
            color: REL_COLORS['composedOf'] || '#8E44AD',
            width: EDGE.arrowSize,
            height: EDGE.arrowSize,
        },
    }));

    return { nodes, edges };
}

// ─── Interactive Decomposition Layout (tree with expand/collapse) ────────────
//
// Manual recursive layout (memo-sysmlv4 parity) instead of ELK: each node
// places its own children — below it (vertical) or in a column to its right
// (horizontal) — using recursively computed subtree extents. Positions are
// cached across re-layouts so expanding one node never moves the others;
// toggling a node's direction clears its descendants' cache entries.

const TREE_NODE_HEIGHT = 64;
const TREE_H_GAP = 100;          // horizontal gap between sibling subtrees (V mode)
const TREE_V_GAP = 110;          // vertical rank gap parent → children (V mode)
const TREE_HMODE_OFFSET = 300;   // children column offset right of parent (H mode)
const TREE_HMODE_V_GAP = 44;     // vertical gap between stacked children (H mode)

function treeNodeWidth(el: MemoElement): number {
    return Math.max(el.name.length * 8 + 80, 220);
}

export async function computeDecompositionLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        nodeDirections: Map<string, 'vertical' | 'horizontal'>;
        callbacks: {
            onToggleExpand: (id: string) => void;
            onToggleDirection: (id: string) => void;
        };
        layoutProviderId?: string;
        /** Prebuilt hierarchy (view-kind templates); defaults to the structural tree */
        tree?: DecompositionTree;
        /** Sticky positions across re-layouts (canvas-owned); optional */
        positionCache?: Map<string, { x: number; y: number }>;
    }
): Promise<LayoutResult> {
    const tree = options.tree ?? buildDecompositionTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const cache = options.positionCache ?? new Map<string, { x: number; y: number }>();
    const direction = (id: string) => options.nodeDirections.get(id) || 'vertical';
    const childrenOf = (id: string) =>
        (tree.childrenMap.get(id) || []).filter(cid => tree.elements.has(cid));

    // Subtree extent given current expansion + per-node direction
    const dims = (id: string): { width: number; height: number } => {
        const el = tree.elements.get(id)!;
        const w = treeNodeWidth(el);
        const kids = childrenOf(id);
        if (!options.expandedNodes.has(id) || kids.length === 0) {
            return { width: w, height: TREE_NODE_HEIGHT };
        }
        const kd = kids.map(dims);
        if (direction(id) === 'vertical') {
            const totalW = kd.reduce((s, d) => s + d.width, 0) + (kd.length - 1) * TREE_H_GAP;
            const maxH = Math.max(...kd.map(d => d.height));
            return { width: Math.max(w, totalW), height: TREE_NODE_HEIGHT + TREE_V_GAP + maxH };
        }
        const maxW = Math.max(...kd.map(d => d.width));
        const totalH = kd.reduce((s, d) => s + d.height, 0) + (kd.length - 1) * TREE_HMODE_V_GAP;
        return { width: w + TREE_HMODE_OFFSET + maxW, height: Math.max(TREE_NODE_HEIGHT, totalH) };
    };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const compColor = REL_COLORS['composedOf'] || '#8E44AD';

    const place = (id: string, parentId: string | null, centerX: number, centerY: number) => {
        const el = tree.elements.get(id)!;
        const w = treeNodeWidth(el);
        const kids = childrenOf(id);
        const isExpanded = options.expandedNodes.has(id);

        // Cached position wins so already-placed nodes never jump
        let pos = cache.get(id);
        if (!pos) {
            pos = { x: centerX - w / 2, y: centerY - TREE_NODE_HEIGHT / 2 };
            cache.set(id, pos);
        }

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: LAYER_COLORS[el.layer] || '#666',
            isExpanded, hasChildren: kids.length > 0, childCount: kids.length,
            direction: direction(id),
            onToggleExpand: () => options.callbacks.onToggleExpand(id),
            onToggleDirection: () => options.callbacks.onToggleDirection(id),
            showDirectionButton: true, label: el.name,
        };
        nodes.push({
            id, type: 'decompositionNode',
            position: { x: pos.x, y: pos.y },
            data: nodeData as any,
            style: { width: w, height: TREE_NODE_HEIGHT },
        });

        if (parentId) {
            const parentDir = direction(parentId);
            edges.push({
                id: `decomp-${parentId}-${id}`, source: parentId, target: id,
                sourceHandle: parentDir === 'vertical' ? 'bottom' : 'right',
                targetHandle: parentDir === 'vertical' ? 'top' : 'left',
                type: 'smoothstep',
                style: { stroke: compColor, strokeWidth: EDGE.defaultWidth },
                markerEnd: {
                    type: 'arrowclosed' as any,
                    color: compColor,
                    width: EDGE.arrowSize,
                    height: EDGE.arrowSize,
                },
            });
        }

        if (!isExpanded || kids.length === 0) return;
        const kd = kids.map(dims);

        if (direction(id) === 'vertical') {
            // Children spread horizontally below the parent
            const totalW = kd.reduce((s, d) => s + d.width, 0) + (kd.length - 1) * TREE_H_GAP;
            let childX = pos.x + w / 2 - totalW / 2;
            const childCenterY = pos.y + TREE_NODE_HEIGHT + TREE_V_GAP + TREE_NODE_HEIGHT / 2;
            kids.forEach((cid, i) => {
                place(cid, id, childX + kd[i].width / 2, childCenterY);
                childX += kd[i].width + TREE_H_GAP;
            });
        } else {
            // Children stacked in a compact column to the right
            const childX = pos.x + w + TREE_HMODE_OFFSET;
            let childY = pos.y + TREE_NODE_HEIGHT + 20;
            kids.forEach((cid, i) => {
                const cel = tree.elements.get(cid)!;
                place(cid, id, childX + treeNodeWidth(cel) / 2, childY + TREE_NODE_HEIGHT / 2);
                childY += kd[i].height + TREE_HMODE_V_GAP;
            });
        }
    };

    let cursorX = 0;
    for (const rootId of tree.roots) {
        if (!tree.elements.has(rootId)) continue;
        const d = dims(rootId);
        place(rootId, null, cursorX + d.width / 2, 100);
        cursorX += d.width + TREE_H_GAP * 2;
    }

    return { nodes, edges };
}

// ─── Interactive Containment Layout (nested blocks with expand/collapse) ─────

const CONTAINMENT_NODE_WIDTH = 240;
const CONTAINMENT_NODE_HEIGHT = 80;
const CONTAINMENT_MARGIN = 20;

export function computeContainmentLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        callbacks: { onToggleExpand: (id: string) => void };
        /** Prebuilt hierarchy (view-kind templates); defaults to the structural tree */
        tree?: DecompositionTree;
    }
): LayoutResult {
    const tree = options.tree ?? buildDecompositionTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const allNodes: Node[] = [];

    function computeContainment(
        nodeId: string, parentId: string | null,
        depth: number, offsetX: number, offsetY: number,
    ): { width: number; height: number } {
        const el = tree.elements.get(nodeId);
        if (!el) return { width: 0, height: 0 };

        const color = LAYER_COLORS[el.layer] || '#666';
        const children = tree.childrenMap.get(nodeId) || [];
        const hasChildren = children.length > 0;
        const isExpanded = options.expandedNodes.has(nodeId);

        let containerWidth = CONTAINMENT_NODE_WIDTH;
        let containerHeight = CONTAINMENT_NODE_HEIGHT;

        if (isExpanded && hasChildren) {
            let curX = CONTAINMENT_MARGIN;
            let curY = CONTAINMENT_NODE_HEIGHT + CONTAINMENT_MARGIN;
            let maxRowHeight = 0;
            let maxRowWidth = 0;

            for (const childId of children) {
                if (!tree.elements.has(childId)) continue;
                const childResult = computeContainment(childId, nodeId, depth + 1, curX, curY);

                if (curX + childResult.width > 800 && curX > CONTAINMENT_MARGIN) {
                    curX = CONTAINMENT_MARGIN;
                    curY += maxRowHeight + CONTAINMENT_MARGIN;
                    maxRowHeight = 0;
                    removeDescendantNodes(childId);
                    computeContainment(childId, nodeId, depth + 1, curX, curY);
                }

                curX += childResult.width + CONTAINMENT_MARGIN;
                maxRowHeight = Math.max(maxRowHeight, childResult.height);
                maxRowWidth = Math.max(maxRowWidth, curX);
            }

            containerWidth = Math.max(CONTAINMENT_NODE_WIDTH, maxRowWidth);
            containerHeight = curY + maxRowHeight + CONTAINMENT_MARGIN;
        }

        const depthBgColor = CONTAINMENT_DEPTH_COLORS[depth % CONTAINMENT_DEPTH_COLORS.length];

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: color, isExpanded, hasChildren,
            childCount: children.length, direction: 'vertical',
            onToggleExpand: () => options.callbacks.onToggleExpand(nodeId),
            onToggleDirection: () => {},
            showDirectionButton: false, depthBgColor,
            isContainer: hasChildren, label: el.name,
        };

        allNodes.push({
            id: nodeId, type: 'decompositionNode',
            position: { x: offsetX, y: offsetY },
            ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            data: nodeData as any,
            style: {
                width: isExpanded && hasChildren ? containerWidth : CONTAINMENT_NODE_WIDTH,
                height: isExpanded && hasChildren ? containerHeight : CONTAINMENT_NODE_HEIGHT,
            },
        });

        return { width: containerWidth, height: containerHeight };
    }

    function removeDescendantNodes(nodeId: string) {
        const toRemove = new Set<string>([nodeId]);
        const collect = (id: string) => {
            for (const cid of (tree.childrenMap.get(id) || [])) {
                toRemove.add(cid); collect(cid);
            }
        };
        collect(nodeId);
        for (let i = allNodes.length - 1; i >= 0; i--) {
            if (toRemove.has(allNodes[i].id)) allNodes.splice(i, 1);
        }
    }

    let curX = 0;
    for (const rootId of tree.roots) {
        if (!tree.elements.has(rootId)) continue;
        const result = computeContainment(rootId, null, 0, curX, 0);
        curX += result.width + 40;
    }

    // ReactFlow resolves parentId against nodes earlier in the array, but the
    // recursion above emits children before their container — reorder so every
    // parent precedes its children or nesting silently breaks
    const byId = new Map(allNodes.map(n => [n.id, n]));
    const ordered: Node[] = [];
    const emitted = new Set<string>();
    const emit = (n: Node) => {
        if (emitted.has(n.id)) return;
        const parent = n.parentId ? byId.get(n.parentId) : undefined;
        if (parent) emit(parent);
        emitted.add(n.id);
        ordered.push(n);
    };
    for (const n of allNodes) emit(n);

    return { nodes: ordered, edges: [] };
}

// ─── Functional Breakdown Structure (FBS) Layout ────────────────────────────
//
// Builds a decomposition tree from functional kinds (Function,
// Function) linked by decomposedBy/composedOf relationships.
// ─────────────────────────────────────────────────────────────────────────────

/** Functional kinds eligible for FBS diagrams */
const FUNCTIONAL_KINDS = new Set<string>();
for (const g of SEMANTIC_GROUPS) {
    if (g.id === 'functions') {
        for (const k of g.kinds) FUNCTIONAL_KINDS.add(k);
    }
}

export interface FunctionalTree {
    roots: string[];
    childrenMap: Map<string, string[]>;
    elements: Map<string, MemoElement>;
}

export function buildFunctionalTree(model: MemoModelDTO): FunctionalTree {
    const elements = new Map<string, MemoElement>();
    for (const el of Object.values(model.elements)) {
        if (FUNCTIONAL_KINDS.has(el.kind)) {
            elements.set(el.id, el);
        }
    }

    // Build parent→children map from decomposedBy/composedOf relationships
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of model.relationships) {
        // decomposedBy: source=parent, target=child (parent decomposedBy child)
        // composedOf:   source=parent, target=child (parent composedOf child)
        if ((rel.type === 'decomposedBy' || rel.type === 'composedOf') &&
            elements.has(rel.sourceId) && elements.has(rel.targetId)) {
            if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
            childrenMap.get(rel.sourceId)!.push(rel.targetId);
            hasParent.add(rel.targetId);
        }
    }

    const roots = [...elements.keys()].filter(id => !hasParent.has(id));
    return { roots, childrenMap, elements };
}

/**
 * FBS layout with interactive expand/collapse — mirrors computeDecompositionLayout
 * but operates on functional elements rather than structural ones.
 */
export async function computeFBSLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        nodeDirections: Map<string, 'vertical' | 'horizontal'>;
        callbacks: {
            onToggleExpand: (id: string) => void;
            onToggleDirection: (id: string) => void;
        };
        layoutProviderId?: string;
    }
): Promise<LayoutResult> {
    const tree = buildFunctionalTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const visibleIds = new Set<string>();
    const visibleEdges: { parentId: string; childId: string }[] = [];

    function collectVisible(id: string) {
        if (!tree.elements.has(id)) return;
        visibleIds.add(id);
        if (options.expandedNodes.has(id)) {
            for (const childId of (tree.childrenMap.get(id) || [])) {
                if (tree.elements.has(childId)) {
                    visibleEdges.push({ parentId: id, childId });
                    collectVisible(childId);
                }
            }
        }
    }
    for (const rootId of tree.roots) collectVisible(rootId);

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'mrtree',
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '40',
            'elk.mrtree.searchOrder': 'DFS',
        },
        children: [...visibleIds].map(id => {
            const el = tree.elements.get(id)!;
            return { id, width: Math.max(el.name.length * 8 + 80, 220), height: 56 };
        }),
        edges: visibleEdges.map((e, i) => ({
            id: `fbs-${i}`, sources: [e.parentId], targets: [e.childId],
        })),
    };

    const layouted = await elk.layout(elkGraph, { providerId: options.layoutProviderId });

    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = tree.elements.get(child.id)!;
        const color = LAYER_COLORS[el.layer] || '#E67E22';
        const childCount = (tree.childrenMap.get(child.id) || []).length;
        const direction = options.nodeDirections.get(child.id) || 'vertical';

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: color,
            isExpanded: options.expandedNodes.has(child.id),
            hasChildren: childCount > 0, childCount, direction,
            onToggleExpand: () => options.callbacks.onToggleExpand(child.id),
            onToggleDirection: () => options.callbacks.onToggleDirection(child.id),
            showDirectionButton: true, label: el.name,
        };

        return {
            id: child.id, type: 'decompositionNode',
            position: { x: child.x || 0, y: child.y || 0 },
            data: nodeData as any,
        };
    });

    const edges: Edge[] = visibleEdges.map((e, i) => {
        const parentDir = options.nodeDirections.get(e.parentId) || 'vertical';
        return {
            id: `fbs-e-${i}`, source: e.parentId, target: e.childId,
            sourceHandle: parentDir === 'vertical' ? 'bottom' : 'right',
            targetHandle: parentDir === 'vertical' ? 'top' : 'left',
            type: 'default',
            style: { stroke: REL_COLORS['decomposedBy'] || '#D35400', strokeWidth: EDGE.defaultWidth },
            markerEnd: {
                type: 'arrowclosed' as any,
                color: REL_COLORS['decomposedBy'] || '#D35400',
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

    return { nodes, edges };
}

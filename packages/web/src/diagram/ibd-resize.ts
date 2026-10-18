import { rebaseForFrameChange } from './layout-coordinate-migration';

export interface Rect { x: number; y: number; width: number; height: number }
export interface ResizeNode extends Rect { id: string; parentId?: string; hidden?: boolean }
export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export interface ResizeMinimums {
    title?: { width: number; height: number };
    content?: { width: number; height: number };
    /** Measured local port envelopes; generated ELK dimensions deliberately absent. */
    ports?: Rect[];
}
export interface ResizeRequest {
    nodes: readonly ResizeNode[];
    id: string;
    direction: ResizeDirection;
    /** Pointer displacement from the gesture start, never from last clamped result. */
    delta: { x: number; y: number };
    minima?: ResizeMinimums;
    clearance?: number;
}

export function absoluteResizeRect(node: ResizeNode, nodes: readonly ResizeNode[]): Rect {
    const seen = new Set([node.id]);
    let x = node.x, y = node.y, parent = node.parentId;
    while (parent) {
        if (seen.has(parent)) throw new Error('Cyclic resize containment');
        seen.add(parent);
        const owner = nodes.find(n => n.id === parent);
        if (!owner) throw new Error(`Missing resize parent ${parent}`);
        x += owner.x; y += owner.y; parent = owner.parentId;
    }
    return { x, y, width: node.width, height: node.height };
}

type Interval = [number, number];
const intersect = (a: Interval, b: Interval): Interval => [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
const clamp = (v: number, a: Interval) => Math.max(a[0], Math.min(a[1], v));
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
const overlaps = (a: Rect, b: Rect) => Math.min(right(a), right(b)) > Math.max(a.x, b.x)
    && Math.min(bottom(a), bottom(b)) > Math.max(a.y, b.y);

/**
 * Euclidean projection of the moving edge(s) onto legal rectangles. Fixed opposite
 * edges stay fixed. All comparisons use board space; only the result is local.
 * Recovery policy: for an initially overlapping sibling, each intersection axis
 * may shrink or remain unchanged, never grow. This monotone policy permits cleanup
 * without trading a worse penetration on one axis for improvement on another.
 * Ancestors bound containment; only visible peers are obstacles. Hidden children
 * do not impose visible-content minima. Infeasible hard bounds return null.
 */
export function solveIbdResize(request: ResizeRequest): {
    rect: Rect; children: Record<string, { x: number; y: number }>;
} | null {
    const { nodes, id, direction, delta, minima = {}, clearance = 0 } = request;
    if (clearance < 0 || !Number.isFinite(clearance)) throw new Error('Invalid clearance');
    const node = nodes.find(n => n.id === id);
    if (!node) throw new Error(`Missing resize node ${id}`);
    for (const n of nodes) if (![n.x, n.y, n.width, n.height].every(Number.isFinite) || n.width < 0 || n.height < 0) throw new Error('Invalid resize geometry');
    if (![delta.x, delta.y].every(Number.isFinite)) throw new Error('Invalid resize delta');
    const start = absoluteResizeRect(node, nodes);
    const west = direction.includes('w'), east = direction.includes('e');
    const north = direction.includes('n'), south = direction.includes('s');
    const activeX = west || east, activeY = north || south;
    let minW = Math.max(0, minima.title?.width ?? 0, minima.content?.width ?? 0);
    let minH = Math.max(0, minima.title?.height ?? 0, minima.content?.height ?? 0);
    for (const port of minima.ports ?? []) {
        minW = Math.max(minW, right(port)); minH = Math.max(minH, bottom(port));
    }
    let bx: Interval = west ? [-Infinity, right(start) - minW] : [start.x + minW, Infinity];
    let by: Interval = north ? [-Infinity, bottom(start) - minH] : [start.y + minH, Infinity];
    const sx = west ? start.x : right(start), sy = north ? start.y : bottom(start);
    if ((!activeX && start.width < minW) || (!activeY && start.height < minH)) return null;
    if (!activeX) bx = [sx, sx];
    if (!activeY) by = [sy, sy];
    let parent = node.parentId;
    while (parent) {
        const owner = nodes.find(n => n.id === parent)!;
        const bound = absoluteResizeRect(owner, nodes);
        bx = intersect(bx, [bound.x + clearance, right(bound) - clearance]);
        by = intersect(by, [bound.y + clearance, bottom(bound) - clearance]);
        // Fixed edges must also fit containment.
        if ((west ? right(start) : start.x) < bound.x + clearance || (west ? right(start) : start.x) > right(bound) - clearance
            || (north ? bottom(start) : start.y) < bound.y + clearance || (north ? bottom(start) : start.y) > bottom(bound) - clearance) return null;
        parent = owner.parentId;
    }
    const header = minima.title?.height ?? 0;
    const children = nodes.filter(n => n.parentId === id && !n.hidden);
    for (const child of children) {
        const c = absoluteResizeRect(child, nodes);
        bx = intersect(bx, west ? [-Infinity, c.x - clearance] : [right(c) + clearance, Infinity]);
        by = intersect(by, north ? [-Infinity, c.y - header - clearance] : [bottom(c) + clearance, Infinity]);
        if ((west ? right(start) < right(c) + clearance : start.x > c.x - clearance)
            || (north ? bottom(start) < bottom(c) + clearance : start.y > c.y - header - clearance)) return null;
    }
    let regions: { x: Interval; y: Interval }[] = [{ x: bx, y: by }];
    for (const peer of nodes.filter(n => n.id !== id && n.parentId === node.parentId && !n.hidden)) {
        const p = absoluteResizeRect(peer, nodes);
        if (overlaps(start, p)) {
            // Restrict moving edges only where they can increase intersection.
            const limitX: Interval = west ? [start.x > p.x ? start.x : -Infinity, Infinity] : [-Infinity, right(start) < right(p) ? right(start) : Infinity];
            const limitY: Interval = north ? [start.y > p.y ? start.y : -Infinity, Infinity] : [-Infinity, bottom(start) < bottom(p) ? bottom(start) : Infinity];
            regions = regions.map(r => ({ x: intersect(r.x, limitX), y: intersect(r.y, limitY) }));
            continue;
        }
        const choices: { axis: 'x' | 'y'; range: Interval }[] = [];
        if (west) { if (right(start) <= p.x - clearance) choices.push({ axis: 'x', range: [-Infinity, Infinity] }); choices.push({ axis: 'x', range: [right(p) + clearance, Infinity] }); }
        else { choices.push({ axis: 'x', range: [-Infinity, p.x - clearance] }); if (start.x >= right(p) + clearance) choices.push({ axis: 'x', range: [-Infinity, Infinity] }); }
        if (north) { if (bottom(start) <= p.y - clearance) choices.push({ axis: 'y', range: [-Infinity, Infinity] }); choices.push({ axis: 'y', range: [bottom(p) + clearance, Infinity] }); }
        else { choices.push({ axis: 'y', range: [-Infinity, p.y - clearance] }); if (start.y >= bottom(p) + clearance) choices.push({ axis: 'y', range: [-Infinity, Infinity] }); }
        regions = regions.flatMap(r => choices.map(c => ({ ...r, [c.axis]: intersect(r[c.axis], c.range) })))
            .filter(r => r.x[0] <= r.x[1] && r.y[0] <= r.y[1]);
        // Equivalent separating choices recur in dense scenes. Keep one copy.
        regions = regions.filter((r, i, all) => all.findIndex(other =>
            other.x[0] === r.x[0] && other.x[1] === r.x[1]
            && other.y[0] === r.y[0] && other.y[1] === r.y[1]) === i);
    }
    const targetX = sx + (activeX ? delta.x : 0), targetY = sy + (activeY ? delta.y : 0);
    let best: { x: number; y: number; distance: number } | undefined;
    for (const r of regions) {
        if (r.x[0] > r.x[1] || r.y[0] > r.y[1]) continue;
        const x = clamp(targetX, r.x), y = clamp(targetY, r.y);
        const distance = (x - targetX) ** 2 + (y - targetY) ** 2;
        if (!best || distance < best.distance) best = { x, y, distance };
    }
    if (!best) return null;
    const absolute = { x: west ? best.x : start.x, y: north ? best.y : start.y,
        width: west ? right(start) - best.x : best.x - start.x,
        height: north ? bottom(start) - best.y : best.y - start.y };
    const local = rebaseForFrameChange({ ...absolute, parent: null }, node.parentId ?? null,
        parentId => absoluteResizeRect(nodes.find(n => n.id === parentId)!, nodes));
    const rebased: Record<string, { x: number; y: number }> = {};
    for (const child of nodes.filter(n => n.parentId === id)) {
        const c = absoluteResizeRect(child, nodes);
        rebased[child.id] = rebaseForFrameChange({ ...c, parent: null }, id, () => absolute);
    }
    return { rect: { ...local, width: absolute.width, height: absolute.height }, children: rebased };
}

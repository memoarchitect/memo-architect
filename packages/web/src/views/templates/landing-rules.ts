// ─── Connector landings ──────────────────────────────────────────────────────
//
// A landing is a wall plus a position along it (`t`, 0→1). Absolute points are
// DERIVED from the box's current rect, which is the whole reason to store a
// landing rather than a coordinate: move or resize the box and the connector
// still arrives where the author put it, on the same wall, the same fraction
// along. A stored point would sit where the box used to be.
//
// IBD ports are unaffected. A port is a modelled element with its own wall; a
// landing is for connectors between boxes that have no port to land on.
// ─────────────────────────────────────────────────────────────────────────────

export type Side = 'left' | 'right' | 'top' | 'bottom';

export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }

/**
 * Keep a landing off the very corner.
 *
 * A connector landing at t=0 or t=1 meets the box exactly where two walls do,
 * and reads as attached to neither.
 */
export function clamp01(t: unknown, lo = 0.06, hi = 0.94): number {
    const n = Number(t);
    if (!Number.isFinite(n)) return 0.5;
    return Math.max(lo, Math.min(hi, n));
}

/** The point at fraction `t` along `side` of `rect`. */
export function hullPoint(rect: Rect, side: Side, t: number): Point {
    const u = clamp01(t, 0, 1);
    const { x, y, width: w, height: h } = rect;
    if (side === 'left') return { x, y: y + u * h };
    if (side === 'right') return { x: x + w, y: y + u * h };
    if (side === 'top') return { x: x + u * w, y };
    return { x: x + u * w, y: y + h };
}

/** The same landing expressed relative to the box, for a live drag offset. */
export function offsetFromLanding(rect: Rect, side: Side, t: number): Point & { side: Side } {
    const p = hullPoint({ x: 0, y: 0, width: rect.width, height: rect.height }, side, t);
    return { x: p.x, y: p.y, side };
}

/**
 * The nearest point on the box perimeter, and which wall it is on.
 *
 * A pointer dragged INSIDE the box still has to land somewhere: it goes to the
 * nearest wall, so dragging towards an edge does the obvious thing rather than
 * snapping to whichever wall the maths happened to prefer.
 */
export function projectToHull(rect: Rect, point: Point): Point & { side: Side; t: number } {
    const x0 = rect.x;
    const y0 = rect.y;
    const x1 = x0 + rect.width;
    const y1 = y0 + rect.height;
    let x = Math.max(x0, Math.min(x1, point.x));
    let y = Math.max(y0, Math.min(y1, point.y));

    if (point.x > x0 && point.x < x1 && point.y > y0 && point.y < y1) {
        const dl = point.x - x0;
        const dr = x1 - point.x;
        const dt = point.y - y0;
        const db = y1 - point.y;
        const nearest = Math.min(dl, dr, dt, db);
        if (nearest === dl) x = x0;
        else if (nearest === dr) x = x1;
        else if (nearest === dt) y = y0;
        else y = y1;
    }

    const left = Math.abs(x - x0);
    const right = Math.abs(x - x1);
    const top = Math.abs(y - y0);
    const bottom = Math.abs(y - y1);
    const nearest = Math.min(left, right, top, bottom);
    let side: Side;
    let t: number;
    if (nearest === left) { side = 'left'; t = (y - y0) / (rect.height || 1); }
    else if (nearest === right) { side = 'right'; t = (y - y0) / (rect.height || 1); }
    else if (nearest === top) { side = 'top'; t = (x - x0) / (rect.width || 1); }
    else { side = 'bottom'; t = (x - x0) / (rect.width || 1); }

    t = clamp01(t);
    return { ...hullPoint(rect, side, t), side, t };
}

interface LayoutNode {
    id: string;
    position: Point;
    parentId?: string;
    width?: number;
    height?: number;
    measured?: { width?: number; height?: number };
    style?: { width?: number | string; height?: number | string };
}

/**
 * A node's rect in absolute coordinates.
 *
 * React Flow positions a child relative to its parent, so a nested box's own
 * `position` is meaningless on its own — the walk up the parent chain is what
 * turns it into somewhere a pointer can be compared against.
 */
export function absRectFromTree(nodes: LayoutNode[] | undefined, id: string): Rect {
    const byId = new Map((nodes ?? []).map(n => [n.id, n]));
    const node = byId.get(id);
    if (!node) return { x: 0, y: 0, width: 1, height: 1 };
    const width = Number(node.measured?.width || node.width || node.style?.width || 1) || 1;
    const height = Number(node.measured?.height || node.height || node.style?.height || 1) || 1;
    let { x, y } = node.position;
    let parentId = node.parentId;
    while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        x += parent.position.x;
        y += parent.position.y;
        parentId = parent.parentId;
    }
    return { x, y, width, height };
}

export interface Landings {
    manualLanding?: true;
    sourceSide?: Side;
    sourceT?: number;
    targetSide?: Side;
    targetT?: number;
    sourceOffset?: Point & { side: Side };
    targetOffset?: Point & { side: Side };
}

/** The landings a hand-drawn route implies, from its first and last points. */
export function landingsFromPoints(
    nodes: LayoutNode[] | undefined,
    edge: { source?: string; target?: string } | undefined,
    points: Point[] | undefined,
): Landings {
    if (!points || points.length < 2 || !edge?.source || !edge?.target) return {};
    const src = absRectFromTree(nodes, edge.source);
    const tgt = absRectFromTree(nodes, edge.target);
    const s = projectToHull(src, points[0]);
    const t = projectToHull(tgt, points[points.length - 1]);
    return {
        manualLanding: true,
        sourceSide: s.side,
        sourceT: s.t,
        targetSide: t.side,
        targetT: t.t,
        sourceOffset: offsetFromLanding(src, s.side, s.t),
        targetOffset: offsetFromLanding(tgt, t.side, t.t),
    };
}

/** A landing the author placed is not the router's to move. */
export function shouldKeepLanding(edge?: { manualLanding?: boolean; sourceSide?: string; sourceT?: number }): boolean {
    return edge?.manualLanding === true
        || (typeof edge?.sourceSide === 'string' && typeof edge?.sourceT === 'number');
}

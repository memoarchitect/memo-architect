import type { DiagramLayout } from '@memoarchitect/tools/browser';

export const IBD_ROUTING_TYPES = ['manhattan', 'orthogonal', 'straight', 'elbow', 'rounded', 'curved', 'arc'] as const;
export type IbdRoutingType = typeof IBD_ROUTING_TYPES[number];
export type IbdRoutingMode = 'automatic' | 'manual';
export interface RoutePoint { x: number; y: number }
export type RoutingLayout = DiagramLayout;

/** Old sidecars only recorded bends per edge; keep those diagrams manual. */
export function ibdRouting(layout?: DiagramLayout): { type: IbdRoutingType; mode: IbdRoutingMode } {
    const canvas = layout?.canvas;
    return {
        type: canvas?.routingType ?? 'orthogonal',
        mode: canvas?.routingMode ?? (Object.values(layout?.edges ?? {}).some(edge => edge.points?.length && (edge as typeof edge & {manualRoute?:boolean}).manualRoute !== false)
            ? 'manual' : 'automatic'),
    };
}

/** Endpoint motion changes only endpoints, never authored interior breakpoints. */
export function reconnectRoute(points: RoutePoint[], source: RoutePoint, target: RoutePoint): RoutePoint[] {
    return [source, ...points.slice(1, -1).map(point => ({ ...point })), target];
}

export function polylinePath(points: RoutePoint[]): string {
    return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x},${point.y}`).join(' ');
}

/** Native routers can leave a diagonal endpoint stub after port anchoring.
 * Keep their waypoints, adding the missing right-angle bend between them. */
export function orthogonalizeRoute(points: RoutePoint[]): RoutePoint[] {
    if (!points.length) return [];
    const result = [{ ...points[0] }];
    for (const point of points.slice(1)) {
        const previous = result[result.length - 1];
        const dx = Math.abs(point.x - previous.x), dy = Math.abs(point.y - previous.y);
        if (dx > 1e-6 && dy > 1e-6) result.push(dx >= dy
            ? { x: point.x, y: previous.y } : { x: previous.x, y: point.y });
        result.push({ ...point });
    }
    return result;
}

/** Settings author connectors only. Placement and native snapshots have separate owners. */
export function withIbdRouting(layout: DiagramLayout | undefined,
    patch: { type?: IbdRoutingType; mode?: IbdRoutingMode }): DiagramLayout {
    const previous = layout ?? { nodes: {}, edges: {} };
    const next = { ...ibdRouting(previous), ...patch };
    return { ...previous, canvas: { ...previous.canvas, routingType: next.type, routingMode: next.mode } };
}

/** Replace rendered entries, preserving off-screen entries and unrelated namespaces.
 * Each replacement entry must already preserve its own unknown fields.
 */
export function mergeRenderedLayout(previous: DiagramLayout, rendered: DiagramLayout): DiagramLayout {
    return { ...previous, ...rendered,
        nodes: { ...previous.nodes, ...rendered.nodes },
        edges: { ...previous.edges, ...rendered.edges },
        annotations: { ...previous.annotations, ...rendered.annotations },
        canvas: { ...previous.canvas, ...rendered.canvas } };
}

/** A native renderer owns known geometry, not opaque fields on saved entries.
 * Arrays (X6 vertices) are complete values; object entries retain extension keys.
 */
export function mergeNativeEntries<T>(previous: Record<string, T> | undefined,
    rendered: Record<string, T>): Record<string, T> {
    const result = { ...previous };
    for (const [id, value] of Object.entries(rendered)) {
        const old = previous?.[id];
        result[id] = old && value && typeof old === 'object' && typeof value === 'object'
            && !Array.isArray(old) && !Array.isArray(value) ? mergeNativeEntries(old as Record<string, unknown>, value as Record<string, unknown>) as T : value;
    }
    return result;
}


export type RouteSide = 'left' | 'right' | 'top' | 'bottom';
/** Derived drawing geometry; never persisted as authored breakpoints. */
export function attachedRoute(points: RoutePoint[], type: IbdRoutingType,
    sourceSide?: RouteSide, targetSide?: RouteSide, manual = false): RoutePoint[] {
    const smoothManual = manual && points.length > 2 && (type === 'curved' || type === 'arc');
    if (points.length < 2 || (!smoothManual && !['manhattan', 'orthogonal', 'elbow', 'rounded'].includes(type)))
        return points.map(p => ({ ...p }));
    const step = (p: RoutePoint, side?: RouteSide) => ({
        x: p.x + (side === 'right' ? 12 : side === 'left' ? -12 : 0),
        y: p.y + (side === 'bottom' ? 12 : side === 'top' ? -12 : 0),
    });
    const outward = (anchor:RoutePoint,neighbor:RoutePoint,side?:RouteSide) => !manual && (
        side==='right' ? Math.abs(anchor.y-neighbor.y)<1e-6 && neighbor.x>anchor.x
        :side==='left' ? Math.abs(anchor.y-neighbor.y)<1e-6 && neighbor.x<anchor.x
        :side==='bottom' ? Math.abs(anchor.x-neighbor.x)<1e-6 && neighbor.y>anchor.y
        :side==='top' ? Math.abs(anchor.x-neighbor.x)<1e-6 && neighbor.y<anchor.y : false);
    const last=points.length-1;
    const attached = [points[0], ...(outward(points[0],points[1],sourceSide)?[]:[step(points[0],sourceSide)]),
        ...points.slice(1, -1), ...(outward(points[last],points[last-1],targetSide)?[]:[step(points[last],targetSide)]), points[last]];
    return smoothManual ? attached : orthogonalizeRoute(attached);
}

/** Smooth cubic interpolation through every authored point, including endpoints. */
export function cubicRoutePath(points: RoutePoint[]): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
        path += ` C ${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (d.x - b.x) / 6},${c.y - (d.y - b.y) / 6} ${c.x},${c.y}`;
    }
    return path;
}

/** Automatic arc: a quadratic bow; manual arcs interpolate authored points. */
export function arcRoutePath(points: RoutePoint[], manual: boolean): string {
    if (manual && points.length > 2) return cubicRoutePath(points);
    if (points.length < 2) return '';
    const a = points[0], b = points[points.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const bow = Math.min(60, length / 4);
    return `M ${a.x},${a.y} Q ${(a.x + b.x) / 2 - dy / (length || 1) * bow},${(a.y + b.y) / 2 + dx / (length || 1) * bow} ${b.x},${b.y}`;
}


/** A single L between the two outward wall stubs, rather than a centre lane. */
export function elbowRoute(source: RoutePoint, target: RoutePoint, sourceSide?: RouteSide, targetSide?: RouteSide): RoutePoint[] {
    const step = (p: RoutePoint, side?: RouteSide) => ({ x: p.x + (side === 'left' ? -12 : side === 'right' ? 12 : 0),
        y: p.y + (side === 'top' ? -12 : side === 'bottom' ? 12 : 0) });
    const s = step(source, sourceSide), t = step(target, targetSide);
    const bend = sourceSide === 'top' || sourceSide === 'bottom' ? { x: s.x, y: t.y } : { x: t.x, y: s.y };
    return [source, s, bend, t, target];
}

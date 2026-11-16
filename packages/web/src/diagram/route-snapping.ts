// ─── Lining a dragged connector segment up ───────────────────────────────────
//
// A segment dragged by hand rarely lands exactly level with the port it leaves
// or with the connector running beside it. While it is dragged it is drawn to
// the nearest such line within a few pixels, and the line is shown as a guide.
// A segment brought level with its own ends leaves bends with nothing between
// them, which are dropped when the drag ends: the connector comes out straight.
// Pure geometry, so the canvas, the edge and the tests share one definition.

import { compactRoute, type RoutePoint } from '../views/orthogonal-router';
import type { IbdRoutingType } from './ibd-routing';

/** The axis a segment moves along when dragged: a horizontal one moves in y, a vertical one in x. */
export type SnapAxis = 'x' | 'y';

export interface SnapGuide { axis: SnapAxis; value: number }

/** The axis an orthogonal segment is dragged along, or undefined for a diagonal one. */
export function dragAxis(a: RoutePoint, b: RoutePoint): SnapAxis | undefined {
    return a.y === b.y ? 'y' : a.x === b.x ? 'x' : undefined;
}

/**
 * The lines a dragged segment may be drawn to: every end and corner of the
 * other connectors, and of this one except the points that move with it.
 */
export function guideCoordinates(
    axis: SnapAxis, own: readonly RoutePoint[], moving: readonly number[], others: ReadonlyArray<readonly RoutePoint[]>,
): number[] {
    const values = new Set<number>();
    own.forEach((point, index) => { if (!moving.includes(index)) values.add(point[axis]); });
    for (const route of others) for (const point of route) values.add(point[axis]);
    return [...values];
}

/** `value`, or the nearest of `guides` when one lies within `tolerance` of it. */
export function snapCoordinate(value: number, guides: readonly number[], tolerance: number): { value: number; snapped: boolean } {
    let best = value, distance = tolerance;
    for (const guide of guides) {
        const d = Math.abs(guide - value);
        if (d <= distance) { best = guide; distance = d; }
    }
    return { value: best, snapped: best !== value || guides.includes(value) };
}

/** Routing types drawn as straight runs between their points, where a bend with nothing after it can be dropped. */
const STRAIGHT_RUNS: readonly IbdRoutingType[] = ['orthogonal', 'manhattan', 'elbow', 'rounded'];

/** The route with repeated points and bends that no longer turn removed; a curved route is left as drawn. */
export function straightenRoute(points: RoutePoint[], type: IbdRoutingType): RoutePoint[] {
    if (!STRAIGHT_RUNS.includes(type) || points.length <= 2) return points;
    const compact = compactRoute(points);
    return compact.length >= 2 && compact.length < points.length ? compact : points;
}

/**
 * An interior orthogonal segment moved by `delta` along its drag axis, for a
 * keyboard nudge. Undefined for the first and last segments, which end on a
 * port, and for a diagonal one.
 */
export function nudgeSegment(points: readonly RoutePoint[], index: number, delta: number): RoutePoint[] | undefined {
    if (index <= 1 || index >= points.length - 1) return undefined;
    const axis = dragAxis(points[index - 1], points[index]);
    if (!axis) return undefined;
    return points.map((point, i) => i === index - 1 || i === index ? { ...point, [axis]: point[axis] + delta } : { ...point });
}

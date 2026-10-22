// ─── Bending a connector between two walls ───────────────────────────────────
//
// A connector leaves its box straight out of the wall it uses and arrives straight into the other wall, so a
// bent one is a Z (both ends on walls of one orientation) or an L (one horizontal, one vertical). Where the walls
// face away from each other a bend would have to double back on itself; that connector stays one straight
// segment. One function, so the template that first draws a connector and the canvas that re-draws it after a box
// moves agree on its shape.
// ─────────────────────────────────────────────────────────────────────────────

import type { UseCaseEdgeStyle } from './use-case-view';

export type Wall = 'left' | 'right' | 'top' | 'bottom';
export interface BendPoint { x: number; y: number }

const horizontal = (wall: Wall) => wall === 'left' || wall === 'right';
/** The way a path moves as it leaves a wall. */
const leave: Record<Wall, [number, number]> = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
/** The way a path moves as it comes into a wall. */
const arrive: Record<Wall, [number, number]> = { left: [1, 0], right: [-1, 0], top: [0, 1], bottom: [0, -1] };

export function bendConnector(
    from: BendPoint, to: BendPoint, sourceWall: Wall | undefined, targetWall: Wall | undefined, style: UseCaseEdgeStyle | undefined,
): BendPoint[] {
    const straight = [from, to];
    if (!style || style === 'straight' || !sourceWall || !targetWall) return straight;
    const [lx, ly] = leave[sourceWall];
    const [ax, ay] = arrive[targetWall];
    const dx = to.x - from.x, dy = to.y - from.y;
    if (horizontal(sourceWall) && horizontal(targetWall)) {
        if (dx * lx <= 0 || dx * ax <= 0) return straight;
        const middle = (from.x + to.x) / 2;
        return [from, { x: middle, y: from.y }, { x: middle, y: to.y }, to];
    }
    if (!horizontal(sourceWall) && !horizontal(targetWall)) {
        if (dy * ly <= 0 || dy * ay <= 0) return straight;
        const middle = (from.y + to.y) / 2;
        return [from, { x: from.x, y: middle }, { x: to.x, y: middle }, to];
    }
    if (horizontal(sourceWall)) {
        // Out sideways, then into the target's top or bottom.
        if (dx * lx <= 0 || dy * ay <= 0) return straight;
        return [from, { x: to.x, y: from.y }, to];
    }
    if (dy * ly <= 0 || dx * ax <= 0) return straight;
    return [from, { x: from.x, y: to.y }, to];
}

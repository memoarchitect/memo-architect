// ─── Connector routing: shape contract and cost ceiling ──────────────────────
//
// Diagrams are edited live, so the routing cost is part of the contract, not an
// implementation detail. The tidy pass was once cubic in edge count — 200 nodes
// and 200 edges took 199 seconds, and it ran on every frame of a drag. These
// ceilings are deliberately loose (roughly 20x the measured time on a developer
// machine) so they catch a return to super-quadratic growth without failing on
// a slow CI box.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
    routeDirectOrthogonal, routeDirectOrthogonalEdges, routeOrthogonalEdges,
    type OrthogonalRouteRequest, type RouteObstacle, type RoutePoint,
} from '../layout';

/** A grid of boxes wired between deterministic pseudo-random pairs. */
function scenario(nodeCount: number, edgeCount: number) {
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const W = 180, H = 80, GAPX = 120, GAPY = 90;
    const obstacles: RouteObstacle[] = Array.from({ length: nodeCount }, (_, i) => ({
        id: `n${i}`,
        x: (i % cols) * (W + GAPX),
        y: Math.floor(i / cols) * (H + GAPY),
        width: W, height: H,
    }));
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const requests: OrthogonalRouteRequest[] = Array.from({ length: edgeCount }, (_, e) => {
        const a = Math.floor(rnd() * nodeCount);
        const b = Math.floor(rnd() * nodeCount) === a ? (a + 1) % nodeCount : Math.floor(rnd() * nodeCount);
        const oa = obstacles[a], ob = obstacles[b];
        return {
            id: `e${e}`,
            sourceNodeId: oa.id, targetNodeId: ob.id,
            source: { x: oa.x + oa.width, y: oa.y + oa.height / 2 },
            target: { x: ob.x, y: ob.y + ob.height / 2 },
            sourceSide: 'right' as const, targetSide: 'left' as const,
        };
    });
    return { obstacles, requests };
}

const isOrthogonal = (points: RoutePoint[]) => points.every((p, i) =>
    i === 0 || Math.abs(p.x - points[i - 1].x) < 0.01 || Math.abs(p.y - points[i - 1].y) < 0.01);

describe('direct (live) connector routing', () => {
    it('anchors on the requested port points', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
            sourceSide: 'right', targetSide: 'left',
        });
        expect(points[0]).toEqual({ x: 100, y: 50 });
        expect(points[points.length - 1]).toEqual({ x: 400, y: 220 });
    });

    it('keeps every segment axis-aligned', () => {
        const sides = ['left', 'right', 'top', 'bottom'] as const;
        for (const sourceSide of sides) {
            for (const targetSide of sides) {
                const points = routeDirectOrthogonal({
                    id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
                    source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
                    sourceSide, targetSide,
                });
                expect(isOrthogonal(points), `${sourceSide}→${targetSide}`).toBe(true);
            }
        }
    });

    it('leaves each end perpendicular to the side it is anchored to', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
            sourceSide: 'right', targetSide: 'left',
        });
        // First step off a left/right port runs horizontally, and away from the box.
        expect(points[1].y).toBeCloseTo(points[0].y);
        expect(points[1].x).toBeGreaterThan(points[0].x);
        const last = points.length - 1;
        expect(points[last - 1].y).toBeCloseTo(points[last].y);
        expect(points[last - 1].x).toBeLessThan(points[last].x);
    });

    it('draws a single straight run between aligned ports', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 50 },
            sourceSide: 'right', targetSide: 'left',
        });
        expect(points).toEqual([{ x: 100, y: 50 }, { x: 400, y: 50 }]);
    });

    it('costs almost nothing at the scale that runs on every drag frame', () => {
        const { requests } = scenario(400, 400);
        const started = performance.now();
        const routes = routeDirectOrthogonalEdges(requests);
        expect(routes.size).toBe(400);
        expect(performance.now() - started).toBeLessThan(150);
    });
});

describe('tidy connector routing', () => {
    it('returns an orthogonal route for every request', () => {
        const { obstacles, requests } = scenario(40, 40);
        const routes = routeOrthogonalEdges(requests, obstacles);
        expect(routes.size).toBe(40);
        for (const points of routes.values()) {
            expect(points.length).toBeGreaterThanOrEqual(2);
            expect(isOrthogonal(points)).toBe(true);
        }
    });

    it('stays interactive on a large board', () => {
        const { obstacles, requests } = scenario(200, 200);
        const started = performance.now();
        const routes = routeOrthogonalEdges(requests, obstacles);
        expect(routes.size).toBe(200);
        // Measured ~370ms here, against 199_000ms before the pass was bounded.
        expect(performance.now() - started).toBeLessThan(8_000);
    });

    it('grows no worse than quadratically as the board doubles', () => {
        const time = (n: number) => {
            const { obstacles, requests } = scenario(n, n);
            const started = performance.now();
            routeOrthogonalEdges(requests, obstacles);
            return performance.now() - started;
        };
        const small = Math.max(time(100), 1);
        const large = time(200);
        // Cubic growth would be ~8x for a doubling; allow generous headroom
        // above quadratic while still catching a return to cubic.
        expect(large / small).toBeLessThan(7);
    });
});

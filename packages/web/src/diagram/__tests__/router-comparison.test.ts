// ─── Router comparison: bespoke vs libavoid ──────────────────────────────────
//
// Plan item B: spike libavoid behind the LayoutProvider interface, measure it
// against the in-house router on the pump IBD and the 200-node benchmark, and
// decide on evidence. This is that measurement, kept as a test so the numbers
// can be re-run rather than remembered.
//
// It outlived its first purpose. The verdict on libavoid was "do not swap", and
// the reasons it won were then built into the in-house router instead — so this
// file is now the regression guard for that work. `in-house` is
// `routeOrthogonalEdges`; the numbers it replaced are in the plan.
//
// The scored properties are the ones a reader of a board actually pays for:
//   * crossings — two connectors meeting at a right angle. The most expensive
//     thing on a wiring diagram and the reason libavoid is a candidate at all.
//   * bends — every corner is a place the eye has to re-acquire the line.
//   * length — total ink.
//   * obstacle hits — a segment crossing a part box. Not a preference; a route
//     through a box is wrong.
//   * time — the routing budget. The tidy pass runs on demand, but a router
//     that cannot finish is not a router.
//
// Run with `vitest run router-comparison` and read the table it prints.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    routeOrthogonalEdges,
    type OrthogonalRouteRequest, type RouteObstacle, type RoutePoint,
} from '../../views/layout';
import { LibavoidRouteProvider, type LibavoidTuning } from '../providers/libavoid-route-provider';
import type { LayoutGraph } from '../layout-provider';

// ─── Scoring ─────────────────────────────────────────────────────────────────

const HORIZONTAL = (a: RoutePoint, b: RoutePoint) => Math.abs(a.y - b.y) < 0.01;
const VERTICAL = (a: RoutePoint, b: RoutePoint) => Math.abs(a.x - b.x) < 0.01;

const segmentsOf = (points: RoutePoint[]) =>
    points.slice(1).map((p, i) => [points[i], p] as const);

/** A right-angle crossing between two segments that share no endpoint. */
function crosses(
    [a, b]: readonly [RoutePoint, RoutePoint],
    [c, d]: readonly [RoutePoint, RoutePoint],
): boolean {
    const first = HORIZONTAL(a, b), second = HORIZONTAL(c, d);
    if (first === second) return false;
    const [h1, h2] = first ? [a, b] : [c, d];
    const [v1, v2] = first ? [c, d] : [a, b];
    const y = h1.y, x = v1.x;
    const withinH = x > Math.min(h1.x, h2.x) + 0.01 && x < Math.max(h1.x, h2.x) - 0.01;
    const withinV = y > Math.min(v1.y, v2.y) + 0.01 && y < Math.max(v1.y, v2.y) - 0.01;
    return withinH && withinV;
}

const segmentHitsBox = (
    [a, b]: readonly [RoutePoint, RoutePoint],
    o: RouteObstacle,
    pad = 2,
): boolean => {
    const left = o.x + pad, right = o.x + o.width - pad;
    const top = o.y + pad, bottom = o.y + o.height - pad;
    if (HORIZONTAL(a, b)) {
        return a.y > top && a.y < bottom
            && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right;
    }
    if (VERTICAL(a, b)) {
        return a.x > left && a.x < right
            && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
    }
    return false;
};

interface Score {
    routed: number;
    crossings: number;
    bends: number;
    length: number;
    obstacleHits: number;
    nonOrthogonal: number;
    ms: number;
}

function score(
    routes: Map<string, RoutePoint[]>,
    requests: OrthogonalRouteRequest[],
    obstacles: RouteObstacle[],
    ms: number,
): Score {
    const byId = new Map(requests.map(r => [r.id, r]));
    const all = [...routes].map(([id, points]) => ({ id, points }));
    let crossings = 0, bends = 0, length = 0, obstacleHits = 0, nonOrthogonal = 0;
    for (const { points } of all) {
        bends += Math.max(0, points.length - 2);
        for (const seg of segmentsOf(points)) {
            length += Math.abs(seg[1].x - seg[0].x) + Math.abs(seg[1].y - seg[0].y);
            if (!HORIZONTAL(...seg) && !VERTICAL(...seg)) nonOrthogonal++;
        }
    }
    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
            for (const s of segmentsOf(all[i].points)) {
                for (const t of segmentsOf(all[j].points)) {
                    if (crosses(s, t)) crossings++;
                }
            }
        }
    }
    for (const { id, points } of all) {
        const request = byId.get(id);
        for (const seg of segmentsOf(points)) {
            for (const o of obstacles) {
                // A box that owns one of this connector's endpoints cannot be
                // avoided — the connector starts on its boundary.
                if (o.id === request?.sourceNodeId || o.id === request?.targetNodeId) continue;
                if (segmentHitsBox(seg, o)) obstacleHits++;
            }
        }
    }
    return { routed: all.length, crossings, bends, length: Math.round(length), obstacleHits, nonOrthogonal, ms: Math.round(ms) };
}

// ─── The two routers, one input shape ────────────────────────────────────────

const runInHouse = (
    requests: OrthogonalRouteRequest[],
    obstacles: RouteObstacle[],
    priority: 'long-first' | 'short-first',
): Score => {
    const started = performance.now();
    const routes = routeOrthogonalEdges(requests, obstacles, 28, priority);
    return score(routes, requests, obstacles, performance.now() - started);
};

const runLibavoid = async (
    requests: OrthogonalRouteRequest[],
    obstacles: RouteObstacle[],
    tuning: LibavoidTuning = {},
): Promise<Score> => {
    const graph: LayoutGraph = {
        id: 'comparison',
        children: obstacles.map(o => ({ id: o.id, x: o.x, y: o.y, width: o.width, height: o.height })),
        edges: requests.map(r => ({
            id: r.id,
            sources: [r.sourceNodeId],
            targets: [r.targetNodeId],
            sections: [{ id: `${r.id}:0`, startPoint: r.source, endPoint: r.target }],
            sourceSide: r.sourceSide,
            targetSide: r.targetSide,
        })) as LayoutGraph['edges'],
    };
    const provider = new LibavoidRouteProvider(tuning);
    // Exclude the WASM load from the routing budget: it is paid once per session,
    // not once per route, and the bespoke router has no equivalent cost.
    await provider.layout({ id: 'warmup', children: [], edges: [] });
    const started = performance.now();
    const routed = await provider.layout(graph);
    const ms = performance.now() - started;
    const routes = new Map<string, RoutePoint[]>(
        (routed.edges ?? []).map(e => {
            const s = e.sections![0];
            return [e.id, [s.startPoint!, ...(s.bendPoints ?? []), s.endPoint!]];
        }),
    );
    return score(routes, requests, obstacles, ms);
};

// ─── Scenarios ───────────────────────────────────────────────────────────────

/** The 200-node synthetic benchmark, same generator as connector-routing.test.ts. */
function synthetic(nodeCount: number, edgeCount: number) {
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

/**
 * The pump enclosure IBD's real routing problem, captured from the template's
 * own output (`docs/fixtures/pump-ibd-routing.json`). Node-sparse and
 * port-dense — five boards inside a frame, twenty port-to-port connectors —
 * which is the shape the bespoke router was tuned on.
 */
function pumpIbd() {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(resolve(here, 'fixtures/pump-ibd-routing.json'), 'utf8');
    return JSON.parse(raw) as { obstacles: RouteObstacle[]; requests: OrthogonalRouteRequest[] };
}

const table = (label: string, rows: Array<[string, Score]>) => {
    const lines = rows.map(([name, s]) =>
        `  ${name.padEnd(20)} routed=${String(s.routed).padStart(3)}  crossings=${String(s.crossings).padStart(4)}`
        + `  bends=${String(s.bends).padStart(4)}  length=${String(s.length).padStart(7)}`
        + `  hits=${String(s.obstacleHits).padStart(3)}  skew=${String(s.nonOrthogonal).padStart(3)}`
        + `  ${String(s.ms).padStart(6)}ms`);
    // eslint-disable-next-line no-console
    console.log(`\n${label}\n${lines.join('\n')}`);
};

// ─── Measurements ────────────────────────────────────────────────────────────

describe('router comparison (plan item B)', () => {
    it('measures both routers on the pump IBD', async () => {
        const { obstacles, requests } = pumpIbd();
        const inHouse = runInHouse(requests, obstacles, 'short-first');
        const libavoid = await runLibavoid(requests, obstacles);
        table(`pump IBD — ${obstacles.length} obstacles, ${requests.length} connectors`, [
            ['in-house', inHouse], ['libavoid', libavoid],
        ]);
        // Both must actually route every connector, orthogonally.
        for (const s of [inHouse, libavoid]) {
            expect(s.routed).toBe(requests.length);
            expect(s.nonOrthogonal).toBe(0);
        }
        // The point of the work: the in-house router must stay at or below the
        // purpose-built router it was measured against. It was 9 crossings
        // before the lanes and the rip-up pass; libavoid scores 3.
        expect(inHouse.crossings).toBeLessThanOrEqual(3);
        // And it must not buy that by wandering: libavoid's length, plus slack.
        expect(inHouse.length).toBeLessThan(libavoid.length * 1.15);
    });

    /**
     * The scaling sweep — and the reason the 200-node benchmark has no
     * head-to-head number: libavoid did not finish 200 obstacles × 200
     * connectors in 13 minutes, and a 25/50/100 sweep did not clear 100 in a
     * further 12 CPU-minutes. There is nothing to compare up there, so the
     * sweep stays inside the range MEMO's IBDs actually occupy — the pump
     * enclosure is 5 obstacles and 20 connectors — and shows the growth curve
     * from there.
     *
     * Each size is measured twice for libavoid, because this adapter adds a
     * checkpoint pair per connector to emulate a perpendicular port approach
     * (this build exposes no ConnDirFlags). That emulation is the adapter's
     * choice and must not be charged to libavoid silently.
     */
    it('shows how each router scales on the synthetic board', async () => {
        const rows: Array<[string, Score]> = [];
        for (const n of [10, 20, 40]) {
            const { obstacles, requests } = synthetic(n, n);
            rows.push([`in-house n=${n}`, runInHouse(requests, obstacles, 'long-first')]);
            rows.push([`libavoid n=${n}`, await runLibavoid(requests, obstacles)]);
            // Same router, no per-connector checkpoints.
            rows.push([`libavoid n=${n} nostub`, await runLibavoid(requests, obstacles, { portStub: 0 })]);
        }
        table('scaling — synthetic board', rows);
        for (const [, s] of rows) expect(s.nonOrthogonal).toBe(0);
        // A dense random board is the in-house router's weakest case and libavoid
        // still wins it. What must not regress is the ground already taken: 226
        // crossings at n=40 before this work, 144 after.
        const dense = rows.find(([label]) => label === 'in-house n=40')![1];
        expect(dense.crossings).toBeLessThan(180);
    }, 900_000);
});

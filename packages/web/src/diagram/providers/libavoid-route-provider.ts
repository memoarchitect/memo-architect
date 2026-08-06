// ─── libavoid (Adaptagrams) orthogonal connector router — SPIKE ──────────────
//
// Evaluation only. Not registered in the provider registry, not reachable from
// the UI, and deliberately not wired into the IBD template: the decision to
// adopt it belongs to the measurement in `router-comparison.test.ts`, not to
// this file existing. See `plans/memo-architect-ibd-drawing-quality.md` item B.
//
// libavoid is the orthogonal connector router behind Inkscape and Dunnart. It
// builds an orthogonal visibility graph over the obstacles once, then routes
// every connector through an A* search with explicit segment, bend and
// CROSSING penalties, and finally nudges shared paths apart. Crossing
// minimisation is the property MEMO's bespoke router cannot express: that one
// claims corridors greedily, one connector at a time, and a corridor already
// taken is simply unavailable to the next.
//
// Two things to know about the binding, both discovered by probing 0.5.0-beta.5
// rather than from its typings:
//   * enum members arrive as embind objects — the router flag has to be passed
//     as `RouterFlag.OrthogonalRouting.value`, not the member itself;
//   * this build exposes no `ConnDirFlags` and no `JunctionRef`, so a port's
//     side cannot be declared as a pin direction. A checkpoint one stub-length
//     off the port face is the available equivalent — and the measurement says
//     it is a poor one: forcing every connector through two checkpoints roughly
//     DOUBLES the bend count and costs 3-4x the time versus letting libavoid
//     choose its own approach. The stub is kept (a port must be met squarely)
//     and reported separately, because the cost belongs to the missing binding
//     feature, not to libavoid.
//
// Licence note for the adoption decision: libavoid-js is LGPL-2.1-or-later,
// while MEMO Architect is MIT. Shipping the WASM is dynamic linkage, but it
// puts an LGPL artefact in the bundle and that is a distribution question, not
// a technical one — recorded in the descriptor's `license` field.
// ─────────────────────────────────────────────────────────────────────────────

import {
    cloneLayoutGraph,
    type LayoutGraph, type LayoutGraphNode, type LayoutProvider,
} from '../layout-provider';

/** The subset of the libavoid binding this adapter uses. */
interface AvoidPoint { x: number; y: number }
interface AvoidApi {
    Router: new (flags: number) => AvoidRouter;
    RouterFlag: { OrthogonalRouting: { value: number } };
    RoutingParameter: Record<string, unknown>;
    RoutingOption: Record<string, unknown>;
    Point: new (x: number, y: number) => AvoidPoint;
    Rectangle: new (topLeft: AvoidPoint, bottomRight: AvoidPoint) => object;
    ShapeRef: new (router: AvoidRouter, poly: object) => object;
    ConnEnd: new (point: AvoidPoint) => object;
    ConnRef: new (router: AvoidRouter, source: object, target: object) => AvoidConnRef;
    Checkpoint: new (point: AvoidPoint) => object;
    CheckpointVector: new () => { push_back(checkpoint: object): void };
}
interface AvoidRouter {
    processTransaction(): void;
    setRoutingParameter(parameter: unknown, value: number): void;
    setRoutingOption(option: unknown, value: boolean): void;
    delete(): void;
}
interface AvoidConnRef {
    displayRoute(): { size(): number; at(index: number): AvoidPoint };
    setRoutingCheckpoints(checkpoints: object): void;
}

export interface LibavoidTuning {
    /** Cost of an extra bend. libavoid's own default is 50. */
    segmentPenalty?: number;
    /** Cost of crossing another connector — the whole reason to be here. */
    crossingPenalty?: number;
    /** Clearance kept between a route and an obstacle. */
    shapeBufferDistance?: number;
    /** Separation when parallel routes are nudged apart. */
    idealNudgingDistance?: number;
    /** Perpendicular approach reserved at an anchored endpoint; 0 disables it. */
    portStub?: number;
}

const DEFAULT_TUNING: Required<LibavoidTuning> = {
    // A bend costs about as much as 50px of length, a crossing about as much as
    // 4000px: on a board, a reader follows a line across the diagram far more
    // easily than across another line.
    segmentPenalty: 50,
    crossingPenalty: 4_000,
    shapeBufferDistance: 12,
    idealNudgingDistance: 14,
    // Matches the bespoke router's PORT_STUB, so the comparison is not measuring
    // two different approach conventions.
    portStub: 26,
};

let avoidLoad: Promise<AvoidApi> | undefined;

/**
 * Load the WASM once per process. The module resolves to a node build under
 * vitest and a browser build in the bundle, so the import is dynamic — nothing
 * pulls half a megabyte of WASM into the app while this is a spike.
 */
async function loadAvoid(): Promise<AvoidApi> {
    avoidLoad ??= (async () => {
        const { AvoidLib } = await import('libavoid-js');
        await AvoidLib.load();
        return AvoidLib.getInstance() as unknown as AvoidApi;
    })();
    return avoidLoad;
}

const OPPOSITE_STEP: Record<string, { x: number; y: number }> = {
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 },
};

const flatten = (node: Readonly<LayoutGraphNode>, into: LayoutGraphNode[] = []): LayoutGraphNode[] => {
    for (const child of node.children ?? []) {
        into.push(child);
        flatten(child, into);
    }
    return into;
};

/**
 * Routes the graph's edges around its nodes, leaving every node where it is.
 *
 * Endpoints come in on each edge's first section as `startPoint`/`endPoint` —
 * the anchor the view already chose, typically a port face. Bend points go back
 * out the same way. A node with `layoutOptions['memo.route.transparent']` is
 * skipped as an obstacle, which is how a container that ENCLOSES one of its own
 * endpoints avoids walling that endpoint in.
 */
export class LibavoidRouteProvider implements LayoutProvider {
    constructor(private readonly tuning: LibavoidTuning = {}) {}

    readonly descriptor = {
        id: 'memo.layout.libavoid',
        name: 'libavoid orthogonal router (spike)',
        version: '0.5.0-beta.5',
        contractVersion: '1' as const,
        // Not MIT, unlike the rest of the product. Part of the decision.
        license: 'LGPL-2.1-or-later',
        description: 'Obstacle-avoiding orthogonal connector routing with crossing penalties (Adaptagrams).',
        mode: 'preserve' as const,
        capabilities: ['flat-graph', 'explicit-ports', 'orthogonal-routes', 'fixed-nodes', 'deterministic'] as const,
    };

    supports(graph: Readonly<LayoutGraph>) {
        const nodes = flatten(graph);
        const positioned = nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y));
        if (!positioned) {
            return { supported: false, reason: 'libavoid routes connectors only; every node must already be placed' };
        }
        const anchored = (graph.edges ?? []).every(e => e.sections?.[0]?.startPoint && e.sections?.[0]?.endPoint);
        return anchored
            ? { supported: true }
            : { supported: false, reason: 'every edge needs a section carrying startPoint and endPoint' };
    }

    async layout(graph: Readonly<LayoutGraph>): Promise<LayoutGraph> {
        const result = cloneLayoutGraph(graph);
        const edges = result.edges ?? [];
        if (edges.length === 0) return result;

        const tuning = { ...DEFAULT_TUNING, ...this.tuning };
        const Avoid = await loadAvoid();
        const router = new Avoid.Router(Avoid.RouterFlag.OrthogonalRouting.value);
        try {
            router.setRoutingParameter(Avoid.RoutingParameter.segmentPenalty, tuning.segmentPenalty);
            router.setRoutingParameter(Avoid.RoutingParameter.crossingPenalty, tuning.crossingPenalty);
            router.setRoutingParameter(Avoid.RoutingParameter.shapeBufferDistance, tuning.shapeBufferDistance);
            router.setRoutingParameter(Avoid.RoutingParameter.idealNudgingDistance, tuning.idealNudgingDistance);
            // Shared trunks read as one line unless they are pulled apart.
            router.setRoutingOption(Avoid.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, true);
            router.setRoutingOption(Avoid.RoutingOption.nudgeSharedPathsWithCommonEndPoint, true);

            for (const node of flatten(result)) {
                if (node.layoutOptions?.['memo.route.transparent'] === 'true') continue;
                const x = node.x ?? 0, y = node.y ?? 0;
                const width = node.width ?? 0, height = node.height ?? 0;
                if (width <= 0 || height <= 0) continue;
                new Avoid.ShapeRef(router, new Avoid.Rectangle(
                    new Avoid.Point(x, y),
                    new Avoid.Point(x + width, y + height),
                ));
            }

            const connectors = edges.map(edge => {
                const section = edge.sections![0];
                const start = section.startPoint!;
                const end = section.endPoint!;
                const conn = new Avoid.ConnRef(
                    router,
                    new Avoid.ConnEnd(new Avoid.Point(start.x, start.y)),
                    new Avoid.ConnEnd(new Avoid.Point(end.x, end.y)),
                );
                // Reserve the perpendicular approach at each anchored end. With
                // no ConnDirFlags in this build, a checkpoint just off the face
                // is how a connector is made to leave its port squarely instead
                // of hugging the box it just left.
                const stubs = [
                    stubPoint(start, (edge as RouteEdgeHints).sourceSide, tuning.portStub),
                    stubPoint(end, (edge as RouteEdgeHints).targetSide, tuning.portStub),
                ].filter((p): p is { x: number; y: number } => p !== undefined);
                if (stubs.length > 0) {
                    const checkpoints = new Avoid.CheckpointVector();
                    for (const stub of stubs) {
                        checkpoints.push_back(new Avoid.Checkpoint(new Avoid.Point(stub.x, stub.y)));
                    }
                    conn.setRoutingCheckpoints(checkpoints);
                }
                return { edge, conn };
            });

            router.processTransaction();

            for (const { edge, conn } of connectors) {
                const route = conn.displayRoute();
                const points = Array.from({ length: route.size() }, (_, i) => {
                    const p = route.at(i);
                    return { x: p.x, y: p.y };
                });
                edge.sections = [{
                    ...edge.sections![0],
                    startPoint: points[0],
                    endPoint: points[points.length - 1],
                    bendPoints: points.slice(1, -1),
                }];
            }
        } finally {
            router.delete();
        }
        return result;
    }
}

/** Side hints the view may attach to an edge, mirroring OrthogonalRouteRequest. */
interface RouteEdgeHints {
    sourceSide?: 'left' | 'right' | 'top' | 'bottom';
    targetSide?: 'left' | 'right' | 'top' | 'bottom';
}

function stubPoint(
    anchor: { x: number; y: number },
    side: RouteEdgeHints['sourceSide'],
    distance: number,
): { x: number; y: number } | undefined {
    if (distance <= 0) return undefined;
    const step = side ? OPPOSITE_STEP[side] : undefined;
    return step ? { x: anchor.x + step.x * distance, y: anchor.y + step.y * distance } : undefined;
}

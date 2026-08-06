// ─── Orthogonal connector routing ────────────────────────────────────────────
//
// Two routers with one contract:
//
//   * `routeDirectOrthogonal` — one connector, no obstacle avoidance, no search.
//     A fixed handful of operations, for the frames of a drag.
//   * `routeOrthogonalEdges` — the tidy pass. Obstacle-avoiding, crossing-
//     penalised, run on demand.
//
// ─── Why the tidy pass is shaped like this ───────────────────────────────────
//
// Measuring libavoid (Adaptagrams) against the previous tidy pass (see
// `plans/memo-architect-ibd-drawing-quality.md` item B) showed a 37→1 crossing
// difference at 20 nodes. The previous pass already had a crossing penalty, so
// the penalty was never the problem. Three things were:
//
//   1. **No channels to move into.** Its lattice was built from obstacle
//      boundaries alone, so on a sparse board there were only a handful of
//      usable tracks and every connector was forced onto the same ones. A
//      crossing penalty cannot help a search whose alternatives do not exist.
//      This router lays explicit LANES through each corridor between obstacles,
//      which is what gives connectors somewhere else to go.
//   2. **Detouring cost more than crossing.** A non-monotone step was charged
//      1.5x its own length while a crossing cost 600, so going around anything
//      wider than ~400px was the more expensive option and the search crossed
//      on purpose. Crossings are now much more expensive than detours.
//   3. **Greedy order was final.** The first connector to claim a corridor kept
//      it. A bounded rip-up-and-reroute pass now revisits the worst offenders
//      with everyone else's tracks already on the board.
//
// ─── Why it is fast ─────────────────────────────────────────────────────────
//
// The lattice is regular, so it is held in typed arrays and its adjacency is
// implicit — node `j*nx+i` steps to `i±1` / `j±1`, gated by a passability mask.
// There is no adjacency map, no `Map<string, …>`, and no string state key; the
// previous pass built one string per grid point, per neighbour lookup and per
// search state, and that allocation churn was most of its cost.
//
// Crossing and overlap penalties are PRECOMPUTED per lattice step before the
// search starts, into the same flat arrays. The inner loop of A* therefore reads
// a float from an array where it used to run a bucketed segment-intersection
// query per relaxation. That is what pays for both the denser lattice and the
// much higher crossing penalty.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Shared geometry ─────────────────────────────────────────────────────────

export const segmentIntersectsRect = (
    a: RoutePoint, b: RoutePoint, r: RouteObstacle, pad = 10,
): boolean => {
    const left = r.x - pad, right = r.x + r.width + pad;
    const top = r.y - pad, bottom = r.y + r.height + pad;
    if (a.y === b.y) return a.y >= top && a.y <= bottom && Math.max(a.x, b.x) >= left && Math.min(a.x, b.x) <= right;
    if (a.x === b.x) return a.x >= left && a.x <= right && Math.max(a.y, b.y) >= top && Math.min(a.y, b.y) <= bottom;
    return false;
};

export const sameSegment = (a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): boolean => {
    if (a.y === b.y && c.y === d.y && a.y === c.y) {
        return Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) < Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
    }
    if (a.x === b.x && c.x === d.x && a.x === c.x) {
        return Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) < Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
    }
    return false;
};

export const segmentsCrossOrthogonally = (
    a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint,
): boolean => {
    const h1 = a.y === b.y, h2 = c.y === d.y;
    if (h1 === h2) return false;
    const hA = h1 ? a : c, hB = h1 ? b : d, vA = h1 ? c : a, vB = h1 ? d : b;
    return vA.x > Math.min(hA.x, hB.x) && vA.x < Math.max(hA.x, hB.x)
        && hA.y > Math.min(vA.y, vB.y) && hA.y < Math.max(vA.y, vB.y);
};

/**
 * Straight run reserved directly off an anchored endpoint. The search plans
 * from the stub, not the anchor, so the visible connector always enters its
 * port square perpendicular and dead-centre: no corner may be rounded, and no
 * grid-length first step may be taken, within the glyph itself. Sized to clear
 * a port half-width (12px) plus the renderer's 7px corner radius, leaving a
 * visible straight approach outside the square.
 */
const PORT_STUB = 26;

/** Move `distance` away from an endpoint along the side it is anchored to. */
const stepOffSide = (
    point: RoutePoint,
    side: OrthogonalRouteRequest['sourceSide'],
    distance: number,
): RoutePoint =>
    side === 'left' ? { x: point.x - distance, y: point.y }
    : side === 'right' ? { x: point.x + distance, y: point.y }
    : side === 'top' ? { x: point.x, y: point.y - distance }
    : { x: point.x, y: point.y + distance };

/** Drop repeated and collinear interior points so every kept bend is a real corner. */
export function compactRoute(points: RoutePoint[]): RoutePoint[] {
    const deduped = points.filter((p, i) => i === 0
        || Math.abs(p.x - points[i - 1].x) > 0.01 || Math.abs(p.y - points[i - 1].y) > 0.01);
    return deduped.filter((p, i) => i === 0 || i === deduped.length - 1
        || !((deduped[i - 1].x === p.x && p.x === deduped[i + 1].x)
            || (deduped[i - 1].y === p.y && p.y === deduped[i + 1].y)));
}

const isHorizontalSide = (side: OrthogonalRouteRequest['sourceSide']) =>
    side === 'left' || side === 'right';

// ─── Live router ─────────────────────────────────────────────────────────────

/**
 * Route one connector on its own: port to port, leaving each anchored side
 * perpendicular, with at most one elbow. No obstacle avoidance, no awareness
 * of other connectors, no search — a fixed handful of operations per edge.
 *
 * This is what runs while a block is being dragged, where the only thing that
 * matters is that connectors stay glued to their ports and read as a straight
 * or orthogonal run.
 */
export function routeDirectOrthogonal(request: OrthogonalRouteRequest): RoutePoint[] {
    const { source, target, sourceSide, targetSide } = request;
    const span = Math.abs(source.x - target.x) + Math.abs(source.y - target.y);
    const stub = Math.min(PORT_STUB, span / 3);
    const s = sourceSide && stub > 0.5 ? stepOffSide(source, sourceSide, stub) : source;
    const t = targetSide && stub > 0.5 ? stepOffSide(target, targetSide, stub) : target;
    const between: RoutePoint[] =
        Math.abs(s.x - t.x) < 0.5 || Math.abs(s.y - t.y) < 0.5 ? []
        : isHorizontalSide(sourceSide) === isHorizontalSide(targetSide)
            ? (isHorizontalSide(sourceSide) || !sourceSide
                ? [{ x: (s.x + t.x) / 2, y: s.y }, { x: (s.x + t.x) / 2, y: t.y }]
                : [{ x: s.x, y: (s.y + t.y) / 2 }, { x: t.x, y: (s.y + t.y) / 2 }])
        : isHorizontalSide(sourceSide)
            ? [{ x: t.x, y: s.y }]
            : [{ x: s.x, y: t.y }];
    return compactRoute([source, s, ...between, t, target]);
}

/** Route every request independently with {@link routeDirectOrthogonal}. */
export function routeDirectOrthogonalEdges(
    requests: OrthogonalRouteRequest[],
): Map<string, RoutePoint[]> {
    return new Map(requests.map(request => [request.id, routeDirectOrthogonal(request)]));
}

// ─── Costs ───────────────────────────────────────────────────────────────────

/**
 * Running along an existing connector is the worst outcome — two connectors
 * drawn as one line — so it stays the most expensive thing on the board. Unlike
 * the weights below this one is a stated preference, not a measured optimum:
 * the comparison harness scores crossings, and an overlap never scores as one.
 */
const OVERLAP_PENALTY = 12_000;
/**
 * Crossing another connector.
 *
 * Measured, and the result is counter-intuitive enough to record: raising this
 * to 2500 made the drawing WORSE (n=40: 183 crossings at 600, 268 at 2500).
 * An over-priced crossing buys long detours, and a long detour is a long line
 * for every connector routed after it to cross. Minimising my own crossings by
 * lengthening my own route raises everybody else's. 600 is where it settles —
 * the same value the previous router used, which is why the crossing penalty was
 * never the thing that needed fixing.
 */
const CROSSING_PENALTY = 600;
/** Cost of a corner. A route with fewer, longer runs is easier to follow. */
const BEND_PENALTY = 90;
/**
 * Weight on non-monotone progress, keeping detours from wandering. Also
 * measured: 0.75 beat both 0.25 and the previous 1.5.
 */
const DETOUR_WEIGHT = 0.75;

/** Ceiling on states expanded while planning one connector. */
const MAX_ROUTE_EXPANSIONS = 20_000;
/**
 * Lattice budget per axis. 128x128 is 16k nodes, and A* visits a small fraction
 * of them; the typed-array core is cheap enough that the budget is set by how
 * many tracks a crowded board needs, not by what the search can afford.
 */
const MAX_AXIS_COORDS = 96;
/**
 * Heuristic inflation for weighted A*. Left at 1 — admissible, so routes are
 * cost-optimal for the weights above. Inflating it to 1.3-2.2 was measured and
 * bought no useful time (at 200 connectors the pass is bounded by the refine
 * budget, not by the search), so the optimality is kept for free.
 */
const HEURISTIC_WEIGHT = 1;
/**
 * Lanes laid through one corridor between obstacle walls, and their spacing.
 *
 * These two decide how many connectors a corridor can carry side by side, and
 * they are why the previous router could not use its crossing penalty: at the
 * old spacing (`channelGap`, 28) the 48px gap between two rows of boxes fitted
 * ZERO lanes, so every connector through that corridor was forced onto the same
 * track and no penalty could move it. At 10px it fits several.
 */
const MAX_CORRIDOR_LANES = 6;
const LANE_GAP = 10;

// ─── Uniform spatial buckets, for the claimed-track queries ──────────────────

const CELL = 160;
const cellKey = (cx: number, cy: number) => (cx * 73_856_093) ^ (cy * 19_349_663);

function forEachCell(
    minX: number, minY: number, maxX: number, maxY: number,
    visit: (key: number) => void,
): void {
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const y0 = Math.floor(minY / CELL), y1 = Math.floor(maxY / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) visit(cellKey(cx, cy));
}

interface Track { ax: number; ay: number; bx: number; by: number; owner: number; seen: number }

/**
 * The segments already on the board. Queried in bulk — once per connector, to
 * gather what is near it — rather than once per search relaxation.
 */
class TrackIndex {
    private readonly buckets = new Map<number, Track[]>();
    private query = 0;

    add(ax: number, ay: number, bx: number, by: number, owner: number): void {
        const track: Track = { ax, ay, bx, by, owner, seen: 0 };
        forEachCell(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), key => {
            const bucket = this.buckets.get(key);
            if (bucket) bucket.push(track);
            else this.buckets.set(key, [track]);
        });
    }

    /** Every track touching this window, each returned once, excluding one owner. */
    near(minX: number, minY: number, maxX: number, maxY: number, exclude: number): Track[] {
        const stamp = ++this.query;
        const found: Track[] = [];
        forEachCell(minX, minY, maxX, maxY, key => {
            const bucket = this.buckets.get(key);
            if (!bucket) return;
            for (const track of bucket) {
                if (track.seen === stamp || track.owner === exclude) continue;
                track.seen = stamp;
                found.push(track);
            }
        });
        return found;
    }

    /** How many of the tracks near this segment it crosses or runs along. */
    conflicts(a: RoutePoint, b: RoutePoint, exclude: number): number {
        const tracks = this.near(
            Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y), exclude,
        );
        let total = 0;
        for (const t of tracks) {
            const c = { x: t.ax, y: t.ay }, d = { x: t.bx, y: t.by };
            if (sameSegment(a, b, c, d) || segmentsCrossOrthogonally(a, b, c, d)) total++;
        }
        return total;
    }
}

// ─── Typed-array binary min-heap over (f, state) ─────────────────────────────

class StateHeap {
    private f: Float64Array;
    private state: Int32Array;
    private size = 0;

    constructor(capacity: number) {
        this.f = new Float64Array(capacity);
        this.state = new Int32Array(capacity);
    }

    get length(): number { return this.size; }
    clear(): void { this.size = 0; }

    push(f: number, state: number): void {
        if (this.size === this.f.length) {
            const biggerF = new Float64Array(this.size * 2);
            const biggerState = new Int32Array(this.size * 2);
            biggerF.set(this.f); biggerState.set(this.state);
            this.f = biggerF; this.state = biggerState;
        }
        let i = this.size++;
        this.f[i] = f; this.state[i] = state;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.f[parent] <= this.f[i]) break;
            this.swap(parent, i);
            i = parent;
        }
    }

    /** Pops the lowest-f state; its f is left in `poppedF`. */
    poppedF = 0;
    pop(): number {
        const top = this.state[0];
        this.poppedF = this.f[0];
        this.size--;
        if (this.size > 0) {
            this.f[0] = this.f[this.size];
            this.state[0] = this.state[this.size];
            for (let i = 0;;) {
                const left = i * 2 + 1, right = left + 1;
                let smallest = i;
                if (left < this.size && this.f[left] < this.f[smallest]) smallest = left;
                if (right < this.size && this.f[right] < this.f[smallest]) smallest = right;
                if (smallest === i) break;
                this.swap(smallest, i);
                i = smallest;
            }
        }
        return top;
    }

    private swap(a: number, b: number): void {
        const f = this.f[a]; this.f[a] = this.f[b]; this.f[b] = f;
        const s = this.state[a]; this.state[a] = this.state[b]; this.state[b] = s;
    }
}

// ─── Lattice construction ────────────────────────────────────────────────────

/**
 * Sorted, de-duplicated coordinates for one axis: the walls the routes must
 * respect, plus LANES through every corridor wide enough to hold them.
 *
 * The lanes are the point. Obstacle walls alone give a search no alternative to
 * the one track everybody else is already on; a corridor carrying three lanes
 * can hold three connectors side by side without a single crossing. Lane count
 * falls back to fewer, then none, if the axis would otherwise exceed its budget
 * — a denser lattice is worthless if the search cannot afford to explore it.
 */
function axisCoords(
    required: number[],
    walls: number[],
    lattice: ResolvedLattice,
    focusLo: number,
    focusHi: number,
): Float64Array {
    const unique = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const out: number[] = [];
        for (const v of sorted) {
            if (out.length === 0 || Math.abs(v - out[out.length - 1]) > 0.5) out.push(v);
        }
        return out;
    };
    /**
     * Over budget, keep what is NEAREST the connector and drop the far side.
     * Truncating the sorted list instead would keep the leftmost coordinates on
     * the board and throw away the tracks beside the connector itself — measured
     * as a crossing regression on a crowded board, because a connector then has
     * no lane to move into anywhere near where it actually runs.
     */
    const nearestFirst = (values: number[], budget: number) => {
        if (values.length <= budget) return values;
        const distance = (v: number) => v < focusLo ? focusLo - v : v > focusHi ? v - focusHi : 0;
        return [...values]
            .sort((a, b) => distance(a) - distance(b))
            .slice(0, budget)
            .sort((a, b) => a - b);
    };
    const base = unique([...required, ...walls]);
    for (let lanes = lattice.maxLanes; lanes >= 1; lanes--) {
        // A corridor holds `lanes` tracks only if each gets `laneGap` of its own.
        const withLanes: number[] = [...base];
        for (let i = 1; i < base.length; i++) {
            const span = base[i] - base[i - 1];
            const fit = Math.min(lanes, Math.floor(span / lattice.laneGap) - 1);
            for (let k = 1; k <= fit; k++) withLanes.push(base[i - 1] + (span * k) / (fit + 1));
        }
        const merged = unique(withLanes);
        if (merged.length <= lattice.maxAxisCoords) return Float64Array.from(merged);
    }
    // Walls alone are over budget. The required coordinates are the endpoints and
    // cannot be dropped, so they are re-added after the cut.
    return Float64Array.from(unique([
        ...required,
        ...nearestFirst(base, lattice.maxAxisCoords - required.length),
    ]));
}

/** Index of the largest coordinate <= value, or -1. Coordinates are sorted. */
function floorIndex(coords: Float64Array, value: number): number {
    let lo = 0, hi = coords.length - 1, best = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (coords[mid] <= value) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return best;
}

/** Index of an exact coordinate match, or -1. */
function exactIndex(coords: Float64Array, value: number): number {
    const i = floorIndex(coords, value + 0.25);
    return i >= 0 && Math.abs(coords[i] - value) <= 0.25 ? i : -1;
}

// ─── Tidy router ─────────────────────────────────────────────────────────────

export interface RouteCosts {
    crossing?: number;
    overlap?: number;
    bend?: number;
    /** Weight on non-monotone progress. See {@link DETOUR_WEIGHT}. */
    detour?: number;
}

export interface TidyRouteOptions {
    /**
     * Milliseconds the rip-up-and-reroute phase may spend. The first pass always
     * completes; only the improvement phase is bounded, so a board too large to
     * polish still gets routed rather than hanging.
     */
    refineBudgetMs?: number;
    /** Rip-up rounds, each revisiting the worst connectors. */
    refineRounds?: number;
    /** Fraction of the connectors revisited per round. */
    refineFraction?: number;
    /** Cost overrides, for tuning experiments. Defaults are the measured ones. */
    costs?: RouteCosts;
    /** Lattice density overrides, for tuning experiments. */
    lattice?: LatticeOptions;
}

export interface LatticeOptions {
    /**
     * Spacing between LANES laid through one corridor. This is the knob that
     * decides how many connectors a corridor can carry side by side without
     * crossing, so it is the router's most important number — measured, not
     * guessed. Independent of `channelGap`, which is about clearance from a box.
     */
    laneGap?: number;
    maxLanes?: number;
    maxAxisCoords?: number;
    /** Heuristic inflation for weighted A*. See {@link HEURISTIC_WEIGHT}. */
    heuristicWeight?: number;
}

type ResolvedLattice = Required<LatticeOptions>;

const resolveLattice = (lattice: LatticeOptions | undefined): ResolvedLattice => ({
    laneGap: lattice?.laneGap ?? LANE_GAP,
    maxLanes: lattice?.maxLanes ?? MAX_CORRIDOR_LANES,
    maxAxisCoords: lattice?.maxAxisCoords ?? MAX_AXIS_COORDS,
    heuristicWeight: lattice?.heuristicWeight ?? HEURISTIC_WEIGHT,
});

type ResolvedCosts = Required<RouteCosts>;

const resolveCosts = (costs: RouteCosts | undefined): ResolvedCosts => ({
    crossing: costs?.crossing ?? CROSSING_PENALTY,
    overlap: costs?.overlap ?? OVERLAP_PENALTY,
    bend: costs?.bend ?? BEND_PENALTY,
    detour: costs?.detour ?? DETOUR_WEIGHT,
});

/** Plan all routes together so later edges avoid occupied tracks and crossings. */
export function routeOrthogonalEdges(
    requests: OrthogonalRouteRequest[],
    obstacles: RouteObstacle[],
    channelGap = 18,
    priority: 'long-first' | 'short-first' = 'long-first',
    options: TidyRouteOptions = {},
): Map<string, RoutePoint[]> {
    const clearance = Math.max(12, channelGap * 0.75);
    const costs = resolveCosts(options.costs);
    const lattice = resolveLattice(options.lattice);
    const span = (r: OrthogonalRouteRequest) =>
        Math.abs(r.source.x - r.target.x) + Math.abs(r.source.y - r.target.y);
    // Most diagrams benefit from long connectors establishing scarce cross-board
    // channels first. Interconnection diagrams reverse this: local part-to-part
    // exchanges reserve their readable corridors before boundary flows are sent
    // around the outside.
    const order = requests
        .map((request, index) => ({ request, index }))
        .sort((a, b) => (priority === 'long-first' ? 1 : -1) * (span(b.request) - span(a.request)));

    const routes: RoutePoint[][] = new Array(requests.length);
    let claimed = new TrackIndex();
    const scratch = new RouterScratch();

    const claim = (owner: number, route: RoutePoint[]) => {
        for (let i = 1; i < route.length; i++) {
            claimed.add(route[i - 1].x, route[i - 1].y, route[i].x, route[i].y, owner);
        }
    };

    for (const { request, index } of order) {
        const route = planOne(request, obstacles, claimed, index, channelGap, clearance, scratch, costs, lattice);
        routes[index] = route;
        claim(index, route);
    }

    // ── Rip-up and reroute ──
    // Greedy order leaves the connector that claimed a corridor first in
    // possession of it, however badly that serves the rest. Re-planning the
    // worst offenders once everyone else is on the board is where the remaining
    // crossings go; it is bounded so a big diagram cannot spend the afternoon
    // on it.
    const rounds = options.refineRounds ?? 4;
    const fraction = options.refineFraction ?? 1;
    const budget = options.refineBudgetMs ?? 150;
    const startedAt = performance.now();
    for (let round = 0; round < rounds; round++) {
        if (performance.now() - startedAt > budget) break;
        const cost = routes.map((route, owner) => ({ owner, crossings: countConflicts(route, claimed, owner) }));
        const worst = cost.filter(c => c.crossings > 0).sort((a, b) => b.crossings - a.crossings);
        if (worst.length === 0) break;
        const attempts = Math.max(1, Math.min(worst.length, Math.ceil(requests.length * fraction)));
        let improved = false;
        for (let i = 0; i < attempts; i++) {
            if (performance.now() - startedAt > budget) break;
            const owner = worst[i].owner;
            // No index rebuild per attempt: every query already excludes the
            // connector being re-planned, so the shared index IS "everyone
            // else". Rebuilding per attempt was O(all segments) each time and
            // made the phase quadratic in connector count for no gain.
            const candidate = planOne(
                requests[owner], obstacles, claimed, owner, channelGap, clearance, scratch, costs, lattice,
            );
            if (countConflicts(candidate, claimed, owner) < worst[i].crossings) {
                routes[owner] = candidate;
                improved = true;
            }
        }
        if (!improved) break;
        // The index still holds the routes this round replaced; rebuild it once
        // here rather than once per attempt.
        claimed = indexOf(routes);
    }

    const result = new Map<string, RoutePoint[]>();
    requests.forEach((request, index) => result.set(request.id, routes[index]));
    return result;
}

/**
 * A fresh index over every route. `TrackIndex` has no removal — a route spans
 * several buckets and unpicking it from each is more code and more cost than
 * rebuilding, which happens a handful of times per pass, not per connector.
 */
function indexOf(routes: RoutePoint[][]): TrackIndex {
    const index = new TrackIndex();
    for (let owner = 0; owner < routes.length; owner++) {
        for (let k = 1; k < routes[owner].length; k++) {
            index.add(routes[owner][k - 1].x, routes[owner][k - 1].y, routes[owner][k].x, routes[owner][k].y, owner);
        }
    }
    return index;
}

function countConflicts(route: RoutePoint[], index: TrackIndex, owner: number): number {
    let total = 0;
    for (let i = 1; i < route.length; i++) total += index.conflicts(route[i - 1], route[i], owner);
    return total;
}

/**
 * Reusable buffers. One connector's lattice is thrown away as soon as it is
 * routed, and allocating fresh typed arrays per connector would put the pass
 * straight back into the allocator it was moved out of.
 */
class RouterScratch {
    blocked = new Uint8Array(0);
    hClear = new Uint8Array(0);
    vClear = new Uint8Array(0);
    hCost = new Float64Array(0);
    vCost = new Float64Array(0);
    g = new Float64Array(0);
    parent = new Int32Array(0);
    heap = new StateHeap(1024);

    fit(nx: number, ny: number): void {
        const nodes = nx * ny;
        if (this.blocked.length < nodes) {
            this.blocked = new Uint8Array(nodes);
            this.g = new Float64Array(nodes * 3);
            this.parent = new Int32Array(nodes * 3);
        }
        const hSteps = Math.max(0, nx - 1) * ny;
        const vSteps = nx * Math.max(0, ny - 1);
        if (this.hClear.length < hSteps) { this.hClear = new Uint8Array(hSteps); this.hCost = new Float64Array(hSteps); }
        if (this.vClear.length < vSteps) { this.vClear = new Uint8Array(vSteps); this.vCost = new Float64Array(vSteps); }
        this.blocked.fill(0, 0, nodes);
        this.hClear.fill(1, 0, hSteps); this.hCost.fill(0, 0, hSteps);
        this.vClear.fill(1, 0, vSteps); this.vCost.fill(0, 0, vSteps);
        this.g.fill(Number.POSITIVE_INFINITY, 0, nodes * 3);
        this.parent.fill(-1, 0, nodes * 3);
        this.heap.clear();
    }
}

function planOne(
    request: OrthogonalRouteRequest,
    obstacles: RouteObstacle[],
    claimed: TrackIndex,
    owner: number,
    channelGap: number,
    clearance: number,
    scratch: RouterScratch,
    costs: ResolvedCosts,
    lattice: ResolvedLattice,
): RoutePoint[] {
    const anchorSource = request.source, anchorTarget = request.target;
    const reach = Math.abs(anchorSource.x - anchorTarget.x) + Math.abs(anchorSource.y - anchorTarget.y);
    const stub = Math.min(PORT_STUB, reach / 3);
    const stubbedSource = Boolean(request.sourceSide) && stub > 0.5;
    const stubbedTarget = Boolean(request.targetSide) && stub > 0.5;
    const s = stubbedSource ? stepOffSide(anchorSource, request.sourceSide, stub) : anchorSource;
    const t = stubbedTarget ? stepOffSide(anchorTarget, request.targetSide, stub) : anchorTarget;

    // A box that encloses an endpoint cannot be avoided — the connector starts
    // inside it. Treating an ancestor container as an obstacle leaves the search
    // with no route out at all, and the fallback then cuts through everything.
    const encloses = (o: RouteObstacle, p: RoutePoint) =>
        p.x > o.x - clearance && p.x < o.x + o.width + clearance
        && p.y > o.y - clearance && p.y < o.y + o.height + clearance;
    // Only boxes near this connector can shape it, so the lattice grows with the
    // obstruction this connector actually negotiates rather than with the size of
    // the diagram.
    const detourMargin = Math.max(240, reach * 0.35);
    const minX = Math.min(anchorSource.x, anchorTarget.x), maxX = Math.max(anchorSource.x, anchorTarget.x);
    const minY = Math.min(anchorSource.y, anchorTarget.y), maxY = Math.max(anchorSource.y, anchorTarget.y);
    const relevant: RouteObstacle[] = [];
    for (const o of obstacles) {
        if (o.id === request.sourceNodeId || o.id === request.targetNodeId) continue;
        if (o.x + o.width < minX - detourMargin || o.x > maxX + detourMargin) continue;
        if (o.y + o.height < minY - detourMargin || o.y > maxY + detourMargin) continue;
        if (encloses(o, anchorSource) || encloses(o, anchorTarget)) continue;
        relevant.push(o);
    }

    const wallXs: number[] = [], wallYs: number[] = [];
    for (const o of relevant) {
        wallXs.push(o.x - clearance, o.x + o.width + clearance);
        wallYs.push(o.y - clearance, o.y + o.height + clearance);
    }
    // Lanes just outside the endpoints keep a connector from being forced onto
    // the endpoint's own coordinate when that track is already taken.
    const xs = axisCoords(
        [s.x, t.x],
        [...wallXs, minX - channelGap, maxX + channelGap, (s.x + t.x) / 2],
        lattice, Math.min(s.x, t.x), Math.max(s.x, t.x),
    );
    const ys = axisCoords(
        [s.y, t.y],
        [...wallYs, minY - channelGap, maxY + channelGap, (s.y + t.y) / 2],
        lattice, Math.min(s.y, t.y), Math.max(s.y, t.y),
    );
    const nx = xs.length, ny = ys.length;
    const startI = exactIndex(xs, s.x), startJ = exactIndex(ys, s.y);
    const goalI = exactIndex(xs, t.x), goalJ = exactIndex(ys, t.y);
    if (nx < 2 || ny < 2 || startI < 0 || startJ < 0 || goalI < 0 || goalJ < 0) {
        return routeDirectOrthogonal(request);
    }

    scratch.fit(nx, ny);
    const { blocked, hClear, vClear, hCost, vCost, g, parent, heap } = scratch;
    const hStride = nx - 1;
    const vStride = ny - 1;

    // ── Obstacles: mark blocked nodes and impassable steps ──
    // A per-obstacle sweep over the index ranges it covers, rather than a
    // segment/rect test per lattice step.
    const pad = clearance - 1;
    for (const o of relevant) {
        const x0 = o.x - pad, x1 = o.x + o.width + pad;
        const y0 = o.y - pad, y1 = o.y + o.height + pad;
        // nodes strictly inside
        let i0 = floorIndex(xs, x0) + 1, i1 = floorIndex(xs, x1);
        while (i1 >= 0 && i1 < nx && xs[i1] >= x1) i1--;
        let j0 = floorIndex(ys, y0) + 1, j1 = floorIndex(ys, y1);
        while (j1 >= 0 && j1 < ny && ys[j1] >= y1) j1--;
        for (let j = Math.max(0, j0); j <= j1; j++) {
            const row = j * nx;
            for (let i = Math.max(0, i0); i <= i1; i++) blocked[row + i] = 1;
        }
        // horizontal steps whose row is inside the band and whose span overlaps
        const rowFrom = Math.max(0, floorIndex(ys, y0) + 1);
        const rowTo = j1;
        const stepFrom = Math.max(0, floorIndex(xs, x0));
        const stepTo = Math.min(hStride - 1, i1);
        for (let j = rowFrom; j <= rowTo; j++) {
            const base = j * hStride;
            for (let i = stepFrom; i <= stepTo; i++) hClear[base + i] = 0;
        }
        // vertical steps whose column is inside the band and whose span overlaps
        const colFrom = Math.max(0, floorIndex(xs, x0) + 1);
        const colTo = i1;
        const vFrom = Math.max(0, floorIndex(ys, y0));
        const vTo = Math.min(vStride - 1, j1);
        for (let i = colFrom; i <= colTo; i++) {
            const base = i * vStride;
            for (let j = vFrom; j <= vTo; j++) vClear[base + j] = 0;
        }
    }
    // The endpoints themselves must remain usable even if a box reaches them.
    blocked[startJ * nx + startI] = 0;
    blocked[goalJ * nx + goalI] = 0;

    // ── Claimed tracks: precompute the crossing / overlap cost of every step ──
    const window = claimed.near(
        xs[0], ys[0], xs[nx - 1], ys[ny - 1], owner,
    );
    for (const track of window) {
        const vertical = Math.abs(track.ax - track.bx) < 0.01;
        if (vertical) {
            const cx = track.ax;
            const lo = Math.min(track.ay, track.by), hi = Math.max(track.ay, track.by);
            // crosses horizontal steps that straddle cx, on rows strictly inside
            const step = floorIndex(xs, cx);
            const rowFrom = Math.max(0, floorIndex(ys, lo) + 1);
            let rowTo = floorIndex(ys, hi);
            while (rowTo >= 0 && rowTo < ny && ys[rowTo] >= hi) rowTo--;
            if (step >= 0 && step < hStride && xs[step] < cx && xs[step + 1] > cx) {
                for (let j = rowFrom; j <= rowTo; j++) hCost[j * hStride + step] += costs.crossing;
            }
            // runs along vertical steps in the same column
            const col = exactIndex(xs, cx);
            if (col >= 0) {
                const from = Math.max(0, floorIndex(ys, lo));
                const to = Math.min(vStride - 1, rowTo);
                for (let j = from; j <= to; j++) vCost[col * vStride + j] += costs.overlap;
            }
        } else {
            const cy = track.ay;
            const lo = Math.min(track.ax, track.bx), hi = Math.max(track.ax, track.bx);
            const step = floorIndex(ys, cy);
            const colFrom = Math.max(0, floorIndex(xs, lo) + 1);
            let colTo = floorIndex(xs, hi);
            while (colTo >= 0 && colTo < nx && xs[colTo] >= hi) colTo--;
            if (step >= 0 && step < vStride && ys[step] < cy && ys[step + 1] > cy) {
                for (let i = colFrom; i <= colTo; i++) vCost[i * vStride + step] += costs.crossing;
            }
            const row = exactIndex(ys, cy);
            if (row >= 0) {
                const from = Math.max(0, floorIndex(xs, lo));
                const to = Math.min(hStride - 1, colTo);
                for (let i = from; i <= to; i++) hCost[row * hStride + i] += costs.overlap;
            }
        }
    }

    // ── A* over the lattice; state = node * 3 + direction (0 H, 1 V, 2 none) ──
    const startNode = startJ * nx + startI;
    const goalNode = goalJ * nx + goalI;
    const gx = xs[goalI], gy = ys[goalJ];
    const weight = lattice.heuristicWeight;
    const heuristic = (i: number, j: number) => (Math.abs(xs[i] - gx) + Math.abs(ys[j] - gy)) * weight;
    const startState = startNode * 3 + 2;
    g[startState] = 0;
    heap.push(heuristic(startI, startJ), startState);

    // A stub has already left the port; the plan may turn immediately from
    // there, it may only never double back over the glyph it just cleared.
    const sourceSide = request.sourceSide, targetSide = request.targetSide;
    const allowedFromStart = (di: number, dj: number): boolean => {
        if (!sourceSide) return true;
        if (stubbedSource) {
            return sourceSide === 'left' ? di <= 0 : sourceSide === 'right' ? di >= 0
                : sourceSide === 'top' ? dj <= 0 : dj >= 0;
        }
        return sourceSide === 'left' ? di < 0 : sourceSide === 'right' ? di > 0
            : sourceSide === 'top' ? dj < 0 : dj > 0;
    };
    const allowedIntoGoal = (di: number, dj: number): boolean => {
        if (!targetSide) return true;
        // Arriving at the goal, the step must run TOWARD the port face, i.e. the
        // reverse of the direction the port opens in.
        if (stubbedTarget) {
            return targetSide === 'left' ? di >= 0 : targetSide === 'right' ? di <= 0
                : targetSide === 'top' ? dj >= 0 : dj <= 0;
        }
        return targetSide === 'left' ? di > 0 : targetSide === 'right' ? di < 0
            : targetSide === 'top' ? dj > 0 : dj < 0;
    };

    let expansions = 0;
    let foundState = -1;
    while (heap.length > 0) {
        const state = heap.pop();
        const node = (state / 3) | 0;
        if (node === goalNode) { foundState = state; break; }
        if (++expansions > MAX_ROUTE_EXPANSIONS) break;
        const dir = state - node * 3;
        const gHere = g[state];
        // A stale heap entry: a cheaper path to this state was found after this
        // one was pushed. Lazy deletion is cheaper than a decrease-key.
        if (gHere + heuristic(node % nx, (node / nx) | 0) < heap.poppedF - 0.001) continue;
        const i = node % nx, j = (node / nx) | 0;
        for (let move = 0; move < 4; move++) {
            const di = move === 0 ? -1 : move === 1 ? 1 : 0;
            const dj = move === 2 ? -1 : move === 3 ? 1 : 0;
            const ni = i + di, nj = j + dj;
            if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) continue;
            const nextNode = nj * nx + ni;
            if (blocked[nextNode]) continue;
            if (node === startNode && !allowedFromStart(di, dj)) continue;
            if (nextNode === goalNode && !allowedIntoGoal(di, dj)) continue;
            let stepCost: number;
            let length: number;
            const nextDir = di !== 0 ? 0 : 1;
            if (di !== 0) {
                const stepIndex = j * hStride + (di > 0 ? i : ni);
                if (!hClear[stepIndex]) continue;
                stepCost = hCost[stepIndex];
                length = Math.abs(xs[ni] - xs[i]);
            } else {
                const stepIndex = i * vStride + (dj > 0 ? j : nj);
                if (!vClear[stepIndex]) continue;
                stepCost = vCost[stepIndex];
                length = Math.abs(ys[nj] - ys[j]);
            }
            const before = heuristic(i, j);
            const after = heuristic(ni, nj);
            const cost = length + stepCost
                + (dir !== 2 && dir !== nextDir ? costs.bend : 0)
                + (after > before ? (after - before) * costs.detour : 0);
            const nextState = nextNode * 3 + nextDir;
            const tentative = gHere + cost;
            if (tentative >= g[nextState]) continue;
            g[nextState] = tentative;
            parent[nextState] = state;
            heap.push(tentative + after, nextState);
        }
    }

    if (foundState < 0) return routeDirectOrthogonal(request);

    const reversed: RoutePoint[] = [];
    for (let state = foundState; state >= 0; state = parent[state]) {
        const node = (state / 3) | 0;
        reversed.push({ x: xs[node % nx], y: ys[(node / nx) | 0] });
        if (state === startState) break;
    }
    reversed.reverse();
    if (stubbedSource) reversed.unshift(anchorSource);
    if (stubbedTarget) reversed.push(anchorTarget);
    return reversed.length >= 2 ? compactRoute(reversed) : routeDirectOrthogonal(request);
}

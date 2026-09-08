// ─── Sibling layout and context-compass rules ────────────────────────────────
//
// Pure geometry: no ELK, no DOM, no model access. Every function here answers a
// question about boxes and edges, which is what makes them testable without a
// canvas and reusable by the IBD, the context view and the use-case view alike.
//
// These arrived as a patch script that rewrote the published bundle by content
// hash. That patch went stale on the next Architect build and failed silently,
// because a bundle-anchored rewrite cannot survive a re-chunk. The behaviour is
// worth having; the delivery mechanism was not.
// ─────────────────────────────────────────────────────────────────────────────

import { balancedGridColumns } from '../layout';

/** The gap a reader needs between two sibling boxes to see them as separate. */
export const SIBLING_GUTTER = 64;

/** Height of a container's title band; a port drawn inside it reads as a title. */
export const TITLE_BAND = 45;

export interface SiblingNode {
    id: string;
    width: number;
    height: number;
    /** Deployment host, when the model states one — `rosHost`, or an owner. */
    host?: string;
}

export interface SiblingEdge {
    source: string;
    target: string;
    sourcePort?: string;
    targetPort?: string;
}

export type PositionedNode = SiblingNode & { x: number; y: number };

export interface PackedLayout {
    strategy: 'empty' | 'peer-grid' | 'host-columns' | 'layered-right';
    width: number;
    height: number;
    children: PositionedNode[];
    cols?: number;
    rows?: number;
}

export interface Box {
    id?: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Side = 'left' | 'right' | 'top' | 'bottom';

const center = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

// ─── Whether to lay out at all, and what to leave alone ──────────────────────

/** A view whose boxes were dragged keeps them; auto-layout is off from then on. */
export const shouldRunAutoLayout = (canvas?: { autoLayout?: boolean }): boolean =>
    canvas?.autoLayout !== false;

/**
 * A route the author placed by hand is not the router's to replace.
 *
 * Authored `points` count as manual unless the view explicitly says otherwise,
 * because a route that survived a save was drawn on purpose.
 */
export function shouldKeepManualRoute(edge?: { manualRoute?: boolean; points?: unknown[] }): boolean {
    if (edge?.manualRoute === true) return true;
    return Array.isArray(edge?.points) && edge.points.length >= 2 && edge?.manualRoute !== false;
}

/**
 * Children that take part in the flow, and those that stand apart from it.
 *
 * An orphan is connected to nothing, contains nothing and has no ports —
 * all three, because a part with ports is still wired even when this view
 * draws none of its connectors.
 */
export function partitionChildren(
    kids: string[],
    opts: {
        isConnected: (id: string) => boolean;
        hasChildParts: (id: string) => boolean;
        portCount: (id: string) => number;
    },
): { flowKids: string[]; orphanKids: string[] } {
    const orphanKids = kids.filter(id =>
        !opts.isConnected(id) && !opts.hasChildParts(id) && opts.portCount(id) === 0);
    const orphans = new Set(orphanKids);
    return { flowKids: kids.filter(id => !orphans.has(id)), orphanKids };
}

// ─── Arrangements ────────────────────────────────────────────────────────────

/** True when children only talk to the parent frame, or to nobody. */
export function shouldPackPeerGrid(nodeIds: string[], edges: SiblingEdge[]): boolean {
    if (nodeIds.length < 2) return false;
    const ids = new Set(nodeIds);
    return !edges.some(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
}

/**
 * A grid, for children with nothing to say to each other.
 *
 * Running a flow layout over unconnected peers produces a long thin line: the
 * algorithm has no edges to work with and falls back to sequence. A grid says
 * the true thing — these are siblings of equal standing.
 */
export function packPeerGrid(
    nodes: SiblingNode[],
    gapX = SIBLING_GUTTER,
    gapY = SIBLING_GUTTER,
    targetAspect = 1.3,
): PackedLayout {
    const cols = balancedGridColumns(nodes.length, targetAspect);
    const rows = Math.ceil(nodes.length / cols);
    const colW = Array.from({ length: cols }, () => 0);
    const rowH = Array.from({ length: rows }, () => 0);
    nodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        colW[col] = Math.max(colW[col], node.width);
        rowH[row] = Math.max(rowH[row], node.height);
    });
    const colX = colW.map((_, i) => colW.slice(0, i).reduce((a, b) => a + b, 0) + gapX * i);
    const rowY = rowH.map((_, i) => rowH.slice(0, i).reduce((a, b) => a + b, 0) + gapY * i);
    const children = nodes.map((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
            ...node,
            x: colX[col] + (colW[col] - node.width) / 2,
            y: rowY[row] + (rowH[row] - node.height) / 2,
        };
    });
    return {
        strategy: 'peer-grid',
        cols,
        rows,
        width: colW.reduce((a, b) => a + b, 0) + gapX * Math.max(cols - 1, 0),
        height: rowH.reduce((a, b) => a + b, 0) + gapY * Math.max(rows - 1, 0),
        children,
    };
}

/**
 * A column per host, when the model says where things run.
 *
 * Two hosts become two stacks side by side, which is the drawing a reader of a
 * cross-host IBD is looking for: Workstation on one side, CIU on the other, and
 * every connector between them crossing the gap once.
 */
export function packHostColumns(
    nodes: SiblingNode[],
    gapX = SIBLING_GUTTER,
    gapY = SIBLING_GUTTER,
): PackedLayout | null {
    const hosts: string[] = [];
    const byHost = new Map<string, SiblingNode[]>();
    for (const node of nodes) {
        if (!node.host) continue;
        if (!byHost.has(node.host)) { byHost.set(node.host, []); hosts.push(node.host); }
        byHost.get(node.host)!.push(node);
    }
    // One host is not a column layout, it is a stack — and the caller has
    // better arrangements for that.
    if (hosts.length < 2) return null;

    let x = 0;
    const children: PositionedNode[] = [];
    for (const host of hosts) {
        const col = byHost.get(host)!;
        const colW = Math.max(...col.map(n => n.width));
        let y = 0;
        for (const node of col) {
            children.push({ ...node, x: x + (colW - node.width) / 2, y });
            y += node.height + gapY;
        }
        x += colW + gapX;
    }
    return {
        strategy: 'host-columns',
        width: Math.max(...children.map(c => c.x + c.width)),
        height: Math.max(...children.map(c => c.y + c.height)),
        children,
    };
}

/** Left-to-right topological layers: the fallback when no host is known. */
export function packLayeredRight(
    nodes: SiblingNode[],
    edges: SiblingEdge[],
    gapX = SIBLING_GUTTER,
    gapY = SIBLING_GUTTER,
): PackedLayout {
    const ids = nodes.map(n => n.id);
    const present = new Set(ids);
    const outgoing = new Map<string, string[]>(ids.map(id => [id, []]));
    const indegree = new Map<string, number>(ids.map(id => [id, 0]));
    for (const edge of edges) {
        if (!present.has(edge.source) || !present.has(edge.target) || edge.source === edge.target) continue;
        outgoing.get(edge.source)!.push(edge.target);
        indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
    const layers: string[][] = [];
    const remaining = new Set(ids);
    while (remaining.size) {
        const ready = [...remaining].filter(id => (indegree.get(id) ?? 0) === 0);
        // A cycle leaves nothing at indegree zero. Take one node and continue
        // rather than spinning: a drawing of a cyclic graph is still owed.
        const take = ready.length ? ready : [[...remaining][0]];
        layers.push(take);
        for (const id of take) remaining.delete(id);
        for (const id of take) {
            for (const t of outgoing.get(id) ?? []) {
                if (remaining.has(t)) indegree.set(t, (indegree.get(t) ?? 1) - 1);
            }
        }
    }
    const byId = new Map(nodes.map(n => [n.id, n]));
    const children: PositionedNode[] = [];
    let x = 0;
    for (const layer of layers) {
        const colW = Math.max(...layer.map(id => byId.get(id)!.width));
        let y = 0;
        for (const id of layer) {
            const node = byId.get(id)!;
            children.push({ ...node, x: x + (colW - node.width) / 2, y });
            y += node.height + gapY;
        }
        x += colW + gapX;
    }
    return {
        strategy: 'layered-right',
        width: Math.max(...children.map(c => c.x + c.width)),
        height: Math.max(...children.map(c => c.y + c.height)),
        children,
    };
}

/** Peer grid, else host columns, else layers. */
export function arrangeSiblings(
    nodes: SiblingNode[],
    edges: SiblingEdge[],
    options: { gapX?: number; gapY?: number; targetAspect?: number } = {},
): PackedLayout {
    const gapX = options.gapX ?? SIBLING_GUTTER;
    const gapY = options.gapY ?? SIBLING_GUTTER;
    if (nodes.length === 0) return { strategy: 'empty', width: 0, height: 0, children: [] };
    if (shouldPackPeerGrid(nodes.map(n => n.id), edges)) {
        return packPeerGrid(nodes, gapX, gapY, options.targetAspect ?? 1.3);
    }
    return packHostColumns(nodes, gapX, gapY) ?? packLayeredRight(nodes, edges, gapX, gapY);
}

// ─── Ports ───────────────────────────────────────────────────────────────────

/** The wall of `from` that faces `to`. */
export function facingWall(from: Box, to: Box): Side {
    const a = center(from);
    const b = center(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
}

/**
 * Put each connected port on the wall facing its partner.
 *
 * A port placed by direction (in→left, out→right) sends half the connectors
 * around the box they came from. Facing placement is what makes a connector
 * leave towards where it is going.
 */
export function assignFacingPorts(boxes: (Box & { id: string })[], edges: SiblingEdge[]): Map<string, Side> {
    const byId = new Map(boxes.map(b => [b.id, b]));
    const sides = new Map<string, Side>();
    for (const edge of edges) {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target || source.id === target.id) continue;
        if (edge.sourcePort) sides.set(edge.sourcePort, facingWall(source, target));
        if (edge.targetPort) sides.set(edge.targetPort, facingWall(target, source));
    }
    return sides;
}

/** A port drawn inside the title band reads as part of the title. */
export const portInTitleBand = (portY: number, titleBand = TITLE_BAND): boolean => portY < titleBand;

// ─── Context view: who is a person, and which way is out ─────────────────────

/**
 * A human role, not every SysML name ending in `Actor`.
 *
 * `AfferaHospitalEpRecordingSystemActor` is a device; `AfferaMapperActor` is a
 * person. The DTO kind string cannot see what a type specializes, so the device
 * vocabulary is excluded by name — which is a heuristic, and is why the glyph
 * is decided by compass side instead (see `contextCategory`).
 */
export function isHumanKind(kind?: string, construct?: string): boolean {
    const k = String(kind ?? '');
    if (construct === 'actor') return true;
    if (/^(User|Actor)$/i.test(k) || /User$/i.test(k)) return true;
    if (!/Actor$/i.test(k)) return false;
    return !/(System|Catheter|Electrode|Patch|Stimulator|Recording|Visualization|Pump|Generator|Device|NonHuman)/i.test(k);
}

/**
 * The glyph follows the side, not the kind string.
 *
 * Left is where people go, right is where systems go — so a device whose name
 * ends in `Actor` sitting on the right is drawn as a system, which is what it
 * is. Reading the glyph off the kind put stick figures on recording equipment.
 */
export function contextCategory(side: Side | string): 'person' | 'system' | 'environment' {
    if (side === 'left') return 'person';
    if (side === 'right') return 'system';
    return 'environment';
}

export const isStakeholderKind = (kind?: string): boolean => /Stakeholder/i.test(String(kind ?? ''));

export function isEnvironmentKind(kind?: string, name?: string, entityKind?: string): boolean {
    const k = String(kind ?? '');
    if (k === 'UseContext' || /environment|context/i.test(k)) return true;
    if (/environment|context/i.test(String(name ?? ''))) return true;
    return /environment/i.test(String(entityKind ?? ''));
}

/** The authored side wins; otherwise people left, stakeholders bottom, environment top, systems right. */
export function compassSide(
    element: { kind?: string; construct?: string; name?: string; attributes?: Record<string, string> },
    authoredSide?: string,
    options: { environmentSide?: Side } = {},
): Side {
    if (authoredSide === 'left' || authoredSide === 'right' || authoredSide === 'top' || authoredSide === 'bottom') {
        return authoredSide;
    }
    if (isHumanKind(element.kind, element.construct)) return 'left';
    if (isStakeholderKind(element.kind)) return 'bottom';
    if (isEnvironmentKind(element.kind, element.name, element.attributes?.entityKind)) {
        return options.environmentSide ?? 'top';
    }
    return 'right';
}

/** Read a side out of an authored `contextSide`, whatever spelling it used. */
export function parseContextSide(value?: string): Side | undefined {
    const t = String(value ?? '').toLowerCase().replace(/[^a-z]/g, '');
    if (t.endsWith('actor')) return 'left';
    if (t.endsWith('externalsystem')) return 'right';
    if (t.endsWith('environment')) return 'top';
    if (t.endsWith('constraint')) return 'bottom';
    if (t === 'left' || t === 'right' || t === 'top' || t === 'bottom') return t;
    return undefined;
}

// ─── Context view: spokes ────────────────────────────────────────────────────

export interface SpokeDraft {
    id: string;
    source: { x: number; y: number };
    target: { x: number; y: number };
}

/**
 * Hub and spoke is straight lines.
 *
 * An orthogonal router given a star topology produces a maze: every spoke
 * detours around the hub it is pointing at. A context diagram's whole claim is
 * "these things talk to the system", and a straight segment says it.
 */
export function straightSpokes(drafts: SpokeDraft[]): Map<string, { x: number; y: number }[]> {
    return new Map(drafts.map(d => [d.id, [d.source, d.target]]));
}

/** The label sits on its spoke, nudged outward so it is off the system's hull. */
export function spokeLabelPoints(drafts: SpokeDraft[], system: Box): Map<string, { x: number; y: number }> {
    const cx = system.x + system.width / 2;
    const cy = system.y + system.height / 2;
    const labels = new Map<string, { x: number; y: number }>();
    for (const draft of drafts) {
        const mx = (draft.source.x + draft.target.x) / 2;
        const my = (draft.source.y + draft.target.y) / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const len = Math.hypot(dx, dy) || 1;
        labels.set(draft.id, { x: mx + (dx / len) * 22, y: my + (dy / len) * 16 });
    }
    return labels;
}

/** Whether two spokes cross, by orientation test. */
export function spokesCross(a: SpokeDraft, b: SpokeDraft): boolean {
    const orient = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) =>
        (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const o1 = orient(a.source, a.target, b.source);
    const o2 = orient(a.source, a.target, b.target);
    const o3 = orient(b.source, b.target, a.source);
    const o4 = orient(b.source, b.target, a.target);
    return o1 * o2 < 0 && o3 * o4 < 0;
}

// ─── Assertions used by tests and by layout self-checks ──────────────────────

export function boxesOverlap(a: Box, b: Box, gutter = 0): boolean {
    return a.x < b.x + b.width + gutter
        && a.x + a.width + gutter > b.x
        && a.y < b.y + b.height + gutter
        && a.y + a.height + gutter > b.y;
}

/** Throws naming the offending pair, because "layout is wrong" is not a bug report. */
export function assertSiblingGutters(boxes: (Box & { id: string })[], gutter = SIBLING_GUTTER): void {
    const contains = (outer: Box, inner: Box) =>
        inner.x >= outer.x && inner.y >= outer.y
        && inner.x + inner.width <= outer.x + outer.width
        && inner.y + inner.height <= outer.y + outer.height;
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            // Nesting is not an overlap: a child inside its parent is the point.
            if (contains(b, a) || contains(a, b)) continue;
            if (boxesOverlap(a, b, gutter)) {
                throw new Error(`sibling gutter ${gutter}px violated between ${a.id} and ${b.id}`);
            }
        }
    }
}

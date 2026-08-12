// ─── Interconnection View Template (KK-3) ────────────────────────────────────
//
// Standard renderer template for the SysML v2 `interconnection` view kind:
// the classic IBD — a context block drawn as a frame, its parts nested
// inside, ports straddling the boundaries, and typed connectors wired
// port-to-port (Altova UModel IBD as the visual reference).
//
// Layout strategy: recursive bottom-up. Each container lays out its connected
// child parts with a flat ELK layered pass (its own boundary ports lifted in
// as layer-pinned pseudo-nodes so ELK both places them and orders them to
// minimise crossings). Disconnected "orphan" leaves are pulled out of the ELK
// graph and packed into a tidy grid so they never inflate the frame with dead
// space. A header band and per-side label gutters are reserved up front, so a
// port square and its label can never overprint the box header, a neighbouring
// box, or one another. Roots (the context frame plus any external systems it
// exchanges with) are positioned by one more layered pass so cross-boundary
// connectors run cleanly around the frame instead of through it.
//
// Everything is derived from the model — parts, nested parts, ports, port
// directions and typed connectors. No geometry is hand-authored.
//
// Ports without a visible owner are dropped — a boundary port only means
// something on a boundary.
// ─────────────────────────────────────────────────────────────────────────────

import type { NotationLayoutNode as Node, NotationLayoutEdge as Edge } from '../../diagram/notation-scene';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { LAYER_COLORS } from '../../constants';
import { EDGE, FONT } from '../../styles/tokens';
import {
    CONNECTOR_LABEL_HEIGHT, connectorLabelWidth, placeConnectorLabels,
    resolveGraphLayout, routeOrthogonalEdges,
    type LayoutResult, type OrthogonalRouteRequest,
} from '../layout';
import { buildCompositionTree, COMPOSITION_REL_TYPES } from './composition-tree';

/**
 * Inner-handle id suffix. A boundary port renders two coincident handle pairs:
 * the bare `portId` faces the boundary (outer), `portId + INNER_HANDLE_SUFFIX`
 * faces into the owner (inner). Shared with InterconnectionNode.
 */
export const INNER_HANDLE_SUFFIX = '__inner';

/**
 * The port element a connection handle denotes, or undefined when the handle is
 * one of a part box's own faces.
 *
 * A port is a handle on its owner's box rather than a node of its own, so a
 * connector the user draws between two ports arrives carrying only the two owner
 * node ids. Recovering the port from the handle id is what keeps the written
 * relationship saying what the drawing says. The generic box faces
 * ('left', 'right', 'top', 'bottom') are not elements and yield undefined.
 */
export function portIdFromHandle(handleId: string | null | undefined): string | undefined {
    if (!handleId) return undefined;
    if (['left', 'right', 'top', 'bottom'].includes(handleId)) return undefined;
    return handleId.endsWith(INNER_HANDLE_SUFFIX)
        ? handleId.slice(0, -INNER_HANDLE_SUFFIX.length)
        : handleId;
}

// ─── Colour coding (shared with the node renderer + legend) ────────────────────

/** Port direction → colour: in = green, out = amber, inout = blue. */
export const PORT_DIR_COLORS = {
    in: '#16A34A',
    out: '#D97706',
    inout: '#2563EB',
} as const;

export type IbdFlowKind = 'data' | 'energy' | 'material' | 'control';

/** Transported-item category → connector colour. */
export const IBD_FLOW_COLORS: Record<IbdFlowKind, string> = {
    data: '#3498DB',
    energy: '#D97706',
    material: '#16A34A',
    control: '#6B7280',
};

/**
 * Classify a connector by what it transports, from its flow item then its
 * relationship type. Structural exchanges with no declared item read as data
 * (information) by default — the practical-engineering vocabulary shared with
 * the Action Flow view.
 */
export function classifyIbdFlow(flowItem?: string, relType?: string): IbdFlowKind {
    const item = flowItem ?? '';
    if (/energy|power|voltage|current|thermal|heat/i.test(item)) return 'energy';
    if (/material|fluid|gas|liquid|drug|dose|batch|consumable/i.test(item)) return 'material';
    if (relType && /succession|control/i.test(relType)) return 'control';
    return 'data';
}

// ─── Port model ──────────────────────────────────────────────────────────────

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

/** Every wall a port can straddle, in a stable iteration order. */
export const PORT_SIDES = ['left', 'right', 'top', 'bottom'] as const;

/** A wall runs vertically (ports dealt down it) or horizontally (dealt across). */
export const isVerticalWall = (side: PortSide): boolean =>
    side === 'left' || side === 'right';

/** The wall named by a view, or undefined when the view names none. */
export function parsePortSide(value: string | undefined | null): PortSide | undefined {
    return value && (PORT_SIDES as readonly string[]).includes(value)
        ? value as PortSide
        : undefined;
}

export interface PortInfo {
    id: string;
    name: string;
    /** Top-left corner relative to the owning node */
    x: number;
    y: number;
    side: PortSide;
    direction?: 'in' | 'out' | 'inout';
    /** Square edge length; defaults to INTERCONNECTION_PORT_SIZE */
    size?: number;
    /** A SysML nested port (owned by another port), drawn smaller */
    nested?: boolean;
    /**
     * On a parent port, how many nested ports render beneath it. The node uses
     * this to draw one enclosing group behind the cluster, so a boundary
     * feature that carries several ports reads as one feature rather than as
     * a run of unrelated squares.
     */
    nestedCount?: number;
    /** Caption box width, sized to this port's own name (see portCaptionWidth). */
    labelWidth?: number;
}

/** A view element rendered as a boundary port rather than a part box. */
export function isPortElement(el: MemoElement): boolean {
    return el.construct === 'port' || el.kind.endsWith('Port');
}

function portDirection(el: MemoElement): PortInfo['direction'] {
    const spec = el.portSpec?.direction;
    if (spec === 'in' || spec === 'out' || spec === 'inout') return spec;
    const declared = (el.attributes['direction'] ?? '').split('::').pop()?.trim();
    if (declared === 'bidirectional') return 'inout';
    if (declared === 'in' || declared === 'out' || declared === 'inout') return declared;
    return undefined;
}

// ─── Geometry constants (px) ───────────────────────────────────────────────────

// Large enough to remain legible and acquire reliably at normal canvas zoom.
// The semantic anchor remains the square centre, so this is renderer-wide and
// not tied to any particular diagram.
const PORT_SIZE = 24;
/** Port square edge length — shared with InterconnectionNode rendering. */
export const INTERCONNECTION_PORT_SIZE = PORT_SIZE;
/** Nested ports use the same glyph size; nesting is conveyed by grouping. */
export const NESTED_PORT_SIZE = PORT_SIZE;
/** Centre-to-centre spacing parent port → nested ports (shared with the node). */
export const NESTED_PITCH = 30;

export const INTERCONNECTION_HEADER_HEIGHT = 48; // compact container title + separation
const HEADER_BAND = INTERCONNECTION_HEADER_HEIGHT;
const LEAF_HEADER = 44;   // one compact header; long names truncate with a tooltip
const PAD_BOTTOM = 12;
const SIDE_MIN = 14;      // inner padding on a side with no boundary ports
/** Width of a boundary port's caption box (shared with InterconnectionNode). */
export const PORT_LABEL_MAX = 104;
/** Gap between the port square and its caption (shared with InterconnectionNode). */
export const PORT_LABEL_OFFSET = 5;
// Room for a port glyph and its label, derived from how the node actually
// draws them rather than guessed: the square straddles the boundary (half of
// it inside), and the caption hangs `PORT_LABEL_OFFSET` clear of the square's
// far edge. A gutter narrower than this does not "tighten" the diagram — it
// makes every boundary caption overprint the part boxes beside it.
export const SIDE_GUTTER = PORT_LABEL_MAX + PORT_SIZE + PORT_LABEL_OFFSET - PORT_SIZE / 2;

/**
 * Rendered width of a boundary port's caption: its natural width at the node's
 * 10.5px caption font, floored so a one-word name still has a readable pill and
 * capped at the two-line wrap width.
 */
export const portCaptionWidth = (name: string): number =>
    Math.min(Math.max(name.length * 6.1 + 10, 44), PORT_LABEL_MAX);

/**
 * How far a port's caption reaches ABOVE the port's centreline. The node hangs
 * the caption there so the connector, which enters at centre height, does not
 * strike through its own label. A port placed only `header + pitch/2` down
 * therefore prints its caption over the box's title and stereotype — the
 * clearance has to count the caption, not just the square.
 */
export const PORT_CAPTION_CLEARANCE = 30;
const PORT_PITCH = 30;    // minimum port centre-to-centre spacing on one side
/**
 * A port on a horizontal wall wears its caption centred on the square rather
 * than beside it, so neighbours are kept apart by the caption's WIDTH — the
 * vertical pitch would let two 72px captions print over each other.
 */
export const PORT_LABEL_STACKED_WIDTH = 72;
const HORIZONTAL_PORT_PITCH = PORT_LABEL_STACKED_WIDTH + 6;
/** Rendered height of a caption box (10.5px text, up to two lines, padding). */
const PORT_CAPTION_HEIGHT = 26;
/**
 * Room a bottom wall reserves INSIDE its box: the caption sits above the
 * square, so content has to stop clear of it. A top-wall caption hangs above
 * the square and therefore outside the box — see the node renderer — which is
 * what keeps a top-wall port off its owner's title bar, and why the top wall
 * costs no inward room at all.
 */
export const BOTTOM_GUTTER = PORT_SIZE / 2 + PORT_LABEL_OFFSET + PORT_CAPTION_HEIGHT;
const ORPHAN_GAP = 14;    // spacing inside the orphan grid
const ROOT_GAP = 90;      // fallback spacing between disconnected roots

// IBD cards are content-sized, not uniform tiles. A port or a second title
// line grows its owner; an unported leaf remains a compact, movable card.
const LEAF_MIN_W = 112;
const LEAF_MIN_H = 72;

/** Rough text width for sizing (kept in step with the node's font sizes). */
const textWidth = (s: string, px = 7.2) => s.length * px + 20;

/** Stable card width contribution: labels truncate instead of stretching IBDs. */
export const ibdLabelWidth = (name: string): number => Math.min(
    Math.max(textWidth(name, 7.1), 96),
    180,
);

// ─── Pure derivations (unit-tested; ELK layout itself needs the browser) ──────

/**
 * The port role the model states outright: a declared direction (portSpec or
 * `direction` attribute) or an in/out name suffix. Undefined when the model
 * leaves it open — callers then fall back to connectivity or, for a nested
 * port, its parent port's role.
 */
export function declaredPortRole(el: MemoElement): 'in' | 'out' | undefined {
    const spec = el.portSpec?.direction;
    const declared = (spec === 'in' || spec === 'out' || spec === 'inout')
        ? spec
        : (el.attributes['direction'] ?? '').split('::').pop()?.trim();
    if (declared === 'in') return 'in';
    if (declared === 'out' || declared === 'inout' || declared === 'bidirectional') return 'out';
    if (/out(put)?$/i.test(el.name)) return 'out';
    if (/in(put)?$/i.test(el.name)) return 'in';
    return undefined;
}

/**
 * Which boundary a port sits on, derived from the model: the declared port
 * direction wins, then an in/out name convention, then a connectivity fallback
 * (a port that is mostly a connector *source* is an output, else an input).
 */
export function inferPortRole(
    el: MemoElement,
    srcCount: number,
    tgtCount: number,
): 'in' | 'out' {
    return declaredPortRole(el) ?? (srcCount > tgtCount ? 'out' : 'in');
}

/** in-ports straddle the left boundary, out-ports the right. */
export const portSideFromRole = (role: 'in' | 'out'): 'left' | 'right' =>
    role === 'in' ? 'left' : 'right';

/**
 * Split a container's child parts into those that take part in the connector
 * layout and the "orphans" — leaf parts with no ports and no connector — which
 * are grid-packed instead of scattered through an inflated frame.
 */
export function partitionChildren(
    kids: string[],
    opts: {
        isConnected: (id: string) => boolean;
        hasChildParts: (id: string) => boolean;
        portCount: (id: string) => number;
    },
): { flowKids: string[]; orphanKids: string[] } {
    const orphanKids = kids.filter(k =>
        !opts.isConnected(k) && !opts.hasChildParts(k) && opts.portCount(k) === 0);
    const orphanSet = new Set(orphanKids);
    return { flowKids: kids.filter(k => !orphanSet.has(k)), orphanKids };
}

/**
 * Every part that participates in at least one connector, including the
 * containers that own a connected descendant. This lets an IBD call out a
 * structural block that has no modeled interaction without falsely warning on
 * an assembly whose child carries the actual port connection.
 */
// ─── Port ownership & display projection ─────────────────────────────────────

export interface PortOwnership {
    /** port id → the part whose boundary anchors it (transitive through parent ports) */
    ownerPart: Map<string, string>;
    /** nested port id → the port that owns it */
    parentPort: Map<string, string>;
}

/**
 * Resolve who owns each port: a builder-set owner or a composition edge, from
 * either a part (a boundary port) or another port (a SysML nested port). A
 * nested port anchors to the part its ancestor port sits on. Ports that reach
 * no part get no `ownerPart` entry — the caller drops them.
 */
export function buildPortOwnership(
    ports: ReadonlyMap<string, MemoElement>,
    isPart: (id: string) => boolean,
    relationships: { type: string; sourceId: string; targetId: string }[],
): PortOwnership {
    const directPart = new Map<string, string>();
    const parentPort = new Map<string, string>();
    for (const [portId, el] of ports) {
        if (!el.owner) continue;
        if (isPart(el.owner)) directPart.set(portId, el.owner);
        else if (ports.has(el.owner)) parentPort.set(portId, el.owner);
    }
    for (const rel of relationships) {
        if (!COMPOSITION_REL_TYPES.has(rel.type) || !ports.has(rel.targetId)) continue;
        if (directPart.has(rel.targetId) || parentPort.has(rel.targetId)) continue;
        if (isPart(rel.sourceId)) directPart.set(rel.targetId, rel.sourceId);
        else if (ports.has(rel.sourceId)) parentPort.set(rel.targetId, rel.sourceId);
    }
    const ownerPart = new Map<string, string>();
    const resolve = (id: string, seen: Set<string>): string | undefined => {
        const known = ownerPart.get(id) ?? directPart.get(id);
        if (known) { ownerPart.set(id, known); return known; }
        const parent = parentPort.get(id);
        if (!parent || seen.has(parent)) return undefined;
        seen.add(parent);
        const anchor = resolve(parent, seen);
        if (anchor) ownerPart.set(id, anchor);
        return anchor;
    };
    for (const id of ports.keys()) resolve(id, new Set([id]));
    return { ownerPart, parentPort };
}

/** Port visibility modes: nested + top ports, top ports only, or none. */
export type PortDisplay = 'all' | 'ports' | 'none';

/**
 * Which rendered port a connector endpoint anchors to under a display mode:
 * itself ('all'), its top-level ancestor port ('ports' — nested hidden), or
 * none ('none' — the connector lifts to the owning part box).
 */
export function projectPortForDisplay(
    portId: string,
    display: PortDisplay,
    parentPort: ReadonlyMap<string, string>,
): string | undefined {
    if (display === 'none') return undefined;
    if (display === 'all') return portId;
    let cur = portId;
    const seen = new Set([cur]);
    while (parentPort.has(cur)) {
        const parent = parentPort.get(cur)!;
        if (seen.has(parent)) break;
        seen.add(parent);
        cur = parent;
    }
    return cur;
}

/** Parts visible when drilling into one part's own IBD: it and its descendants. */
export function focusSubtree(
    childrenMap: ReadonlyMap<string, string[]>,
    present: (id: string) => boolean,
    rootId: string,
): Set<string> {
    const ids = new Set<string>();
    const visit = (id: string) => {
        if (ids.has(id) || !present(id)) return;
        ids.add(id);
        for (const cid of childrenMap.get(id) ?? []) visit(cid);
    };
    visit(rootId);
    return ids;
}

/**
 * Deal boundary ports along the wall each one declares, with a minimum pitch and
 * strictly clear of the header band. Guarantees a port square (and thus its
 * label) can never overprint the header or another port on the same wall.
 * Returns local top-left + side.
 *
 * All four walls are dealt here. A vertical wall runs a port's slots DOWN the
 * body between `bodyTop`/`bodyBottom`; a horizontal wall runs them ACROSS
 * between `bodyLeft`/`bodyRight`. Which wall a port is on is the caller's
 * decision (the view's, ultimately) — this function only places what it is told.
 */
export function distributePorts(
    ports: string[],
    opts: {
        width: number;
        /** Box height — a bottom-wall port straddles this edge. */
        height?: number;
        bodyTop: number;
        bodyBottom: number;
        /** Span the horizontal walls deal across; defaults to the full width. */
        bodyLeft?: number;
        bodyRight?: number;
        sideOf: (id: string) => PortSide;
        size?: number;
        pitch?: number;
        /** Minimum pitch on a horizontal wall, where captions are the constraint. */
        horizontalPitch?: number;
        /** Rows a port group occupies: 1 + its rendered nested ports. */
        weightOf?: (id: string) => number;
        nestedPitch?: number;
        /** Preferred centreline for a lone port (for cross-node alignment). */
        singleCenterY?: number;
        /** Highest centreline a port may take, so its caption clears the header. */
        minCenterY?: number;
    },
): Map<string, { x: number; y: number; side: PortSide }> {
    const size = opts.size ?? PORT_SIZE;
    const pitch = opts.pitch ?? PORT_PITCH;
    const horizontalPitch = opts.horizontalPitch ?? HORIZONTAL_PORT_PITCH;
    const nestedPitch = opts.nestedPitch ?? NESTED_PITCH;
    const bottomEdge = opts.height ?? opts.bodyBottom;
    const pos = new Map<string, { x: number; y: number; side: PortSide }>();
    for (const side of PORT_SIDES) {
        const group = ports.filter(p => opts.sideOf(p) === side);
        if (group.length === 0) continue;
        const n = group.length;
        const vertical = isVerticalWall(side);
        const from = vertical ? opts.bodyTop : (opts.bodyLeft ?? 0);
        const to = vertical ? opts.bodyBottom : (opts.bodyRight ?? opts.width);
        const step = vertical ? pitch : horizontalPitch;
        const span = Math.max(to - from, 0);
        const minCenter = vertical
            ? (opts.minCenterY ?? from + step / 2)
            : from + step / 2;
        let prevEnd = -Infinity;
        group.forEach((pid, i) => {
            let center = n === 1 && vertical && opts.singleCenterY !== undefined
                ? opts.singleCenterY
                : from + (n === 1 ? span / 2 : (i + 0.5) / n * span);
            center = Math.max(center, minCenter, prevEnd + step);
            // the group's nested ports stack along the same wall, after the parent
            prevEnd = center + ((opts.weightOf?.(pid) ?? 1) - 1) * nestedPitch;
            pos.set(pid, {
                x: vertical
                    ? (side === 'left' ? -size / 2 : opts.width - size / 2)
                    : center - size / 2,
                y: vertical
                    ? center - size / 2
                    : (side === 'top' ? -size / 2 : bottomEdge - size / 2),
                side,
            });
        });
    }
    return pos;
}

/**
 * Re-deal a box's port slots in a crossing-minimised order. The slots
 * themselves — computed by `distributePorts` from the box's header, pitch and
 * label gutters — are kept exactly as they are, so a box never has to grow or
 * risk two labels colliding; only which port sits in which slot changes.
 * Ports the engine did not place keep their slot.
 */
export function applyPortOrder(
    portPos: Map<string, { x: number; y: number; side: PortSide }>,
    placedY: ReadonlyMap<string, number>,
    placedX?: ReadonlyMap<string, number>,
): void {
    for (const side of PORT_SIDES) {
        // A wall is re-dealt along its own axis: down a vertical wall, across a
        // horizontal one. Ordering a bottom wall by y would compare four
        // identical numbers and shuffle nothing.
        const vertical = isVerticalWall(side);
        const placed = vertical ? placedY : placedX;
        if (!placed) continue;
        const ids = [...portPos].filter(([id, p]) => p.side === side && placed.has(id)).map(([id]) => id);
        if (ids.length < 2) continue;
        const slots = ids
            .map(id => vertical ? portPos.get(id)!.y : portPos.get(id)!.x)
            .sort((a, b) => a - b);
        [...ids]
            .sort((a, b) => placed.get(a)! - placed.get(b)!)
            .forEach((id, index) => {
                const p = portPos.get(id)!;
                if (vertical) p.y = slots[index]; else p.x = slots[index];
            });
    }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface InterconnectionOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view; when given, only these are drawn */
    relationshipTypes?: string[];
    /** Parts whose descendants are hidden while the boundary remains visible. */
    collapsedNodes?: ReadonlySet<string>;
    onToggleCollapse?: (id: string) => void;
    /** Re-root the diagram on one part, for browsing the hierarchy downward. */
    onDrillIn?: (id: string) => void;
    /** Drill-down: render only this part's own IBD as the context frame. */
    focusId?: string;
    /** Port visibility: 'all' (nested + top ports, default), 'ports' (top-level
     *  only — nested connectors lift to their parent port), or 'none'
     *  (connectors anchor to part boxes; the frame reflows without ports). */
    portDisplay?: PortDisplay;
    showPortText?: boolean;
    showConnectionText?: boolean;
    /**
     * Walls the view declares, per port id. Which wall a port straddles is a
     * drawing decision, not an architecture fact, so it is authored on the view
     * and fed to automatic layout as a constraint — the engine still places and
     * orders the port, it just does so on the declared wall. Ports the view says
     * nothing about fall back to their direction (in → left, out → right).
     */
    portWalls?: ReadonlyMap<string, PortSide>;
    /** A declared enum's literal colours, keyed by the element attribute value. */
    legend?: { attribute: string; colors: ReadonlyMap<string, string> };
    /** Interactive per-diagram port repositioning. */
    onPortMove?: (ownerId: string, portId: string, y: number, side?: PortSide) => void;
    /** Bind a visible port glyph to the model element it represents. */
    onPortSelect?: (portId: string) => void;
    layoutProviderId?: string;
    /** Deliberate density control: bundle repeated rendered endpoint pairs,
     * show every connector, or suppress wiring while inspecting structure. */
    connectionDisplay?: 'summary' | 'all' | 'none';
}

/** Bundle repeated connectors after endpoint projection. The representative
 * keeps one real connector's ports and carries a count for honest labelling. */
export function summarizeConnectors(
    connectors: MemoRelationship[],
    liftEndpoint: (id: string) => string,
): MemoRelationship[] {
    return [...connectors.reduce((groups, rel) => {
        const key = `${liftEndpoint(rel.sourceId)}\u0000${liftEndpoint(rel.targetId)}`;
        const current = groups.get(key);
        if (!current) groups.set(key, { rel, count: 1 });
        else current.count++;
        return groups;
    }, new Map<string, { rel: MemoRelationship; count: number }>()).values()]
        .map(({ rel, count }) => count === 1 ? rel : ({
            ...rel,
            id: `bundle-${rel.id}`,
            attributes: { ...rel.attributes, bundleCount: String(count) },
        }));
}

// ─── Layout result per part ────────────────────────────────────────────────────

interface PartLayout {
    width: number;
    height: number;
    /** child part id → position relative to this part */
    childPos: Map<string, { x: number; y: number }>;
    /** boundary ports: port id → local top-left + side */
    portPos: Map<string, { x: number; y: number; side: PortSide }>;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export async function computeInterconnectionLayout(
    model: MemoModelDTO,
    options?: InterconnectionOptions,
): Promise<LayoutResult> {
    const all = Object.values(model.elements);
    const visible = options?.viewpointFilter ? all.filter(options.viewpointFilter) : all;

    const portEls = new Map<string, MemoElement>();
    const partEls: MemoElement[] = [];
    for (const el of visible) {
        if (isPortElement(el)) portEls.set(el.id, el);
        else partEls.push(el);
    }
    if (partEls.length === 0) return { nodes: [], edges: [] };

    const portDisplay: PortDisplay = options?.portDisplay ?? 'all';
    const showPorts = portDisplay !== 'none';
    const tree = buildCompositionTree(partEls, model.relationships);

    // ── Drill-down: restrict the visible parts to the focused subtree ──
    const focusId = options?.focusId && tree.elements.has(options.focusId)
        ? options.focusId : undefined;
    const visibleParts = focusId
        ? focusSubtree(tree.childrenMap, id => tree.elements.has(id), focusId)
        : null;
    const partVisible = (id: string) => tree.elements.has(id) && (!visibleParts || visibleParts.has(id));

    const childrenOf = (id: string) => options?.collapsedNodes?.has(id)
        ? []
        : (tree.childrenMap.get(id) ?? []).filter(partVisible);

    // ── Port ownership: builder-set owner wins, else a composition edge; a
    // port owned by another port is a SysML nested port anchored to the same
    // part boundary as its ancestor ──
    const { ownerPart: portOwner, parentPort } = buildPortOwnership(portEls, partVisible, model.relationships);
    // Ownerless ports are meaningless on an IBD — drop them
    for (const portId of [...portEls.keys()]) {
        if (!portOwner.has(portId)) portEls.delete(portId);
    }
    /** A port's top-level ancestor (itself when not nested). */
    const topPortOf = (portId: string): string =>
        projectPortForDisplay(portId, 'ports', parentPort)!;
    // Boundary slots hold only top-level ports; nested ports ride with their
    // parent's slot (visible only in 'all' display).
    const portsByOwner = new Map<string, string[]>();
    for (const [portId, ownerId] of portOwner) {
        if (!portEls.has(portId) || parentPort.has(portId)) continue;
        if (!portsByOwner.has(ownerId)) portsByOwner.set(ownerId, []);
        portsByOwner.get(ownerId)!.push(portId);
    }
    const nestedOf = new Map<string, string[]>();
    if (portDisplay === 'all') {
        for (const [childId] of parentPort) {
            if (!portEls.has(childId)) continue;
            const top = topPortOf(childId);
            if (!portEls.has(top) || top === childId) continue;
            if (!nestedOf.has(top)) nestedOf.set(top, []);
            nestedOf.get(top)!.push(childId);
        }
    }
    /** Boundary rows a top port occupies: itself + its rendered nested ports. */
    const portWeight = (portId: string): number => 1 + (nestedOf.get(portId)?.length ?? 0);

    // ── Connector relationships ──
    const declaredRelTypes = options?.relationshipTypes?.length
        ? new Set(options.relationshipTypes.map(t => t.toLowerCase()))
        : undefined;
    const endpointVisible = (id: string) => portEls.has(id) || partVisible(id);
    const rawConnectors = model.relationships.filter(rel =>
        !COMPOSITION_REL_TYPES.has(rel.type)
        && (!declaredRelTypes || declaredRelTypes.has(rel.type.toLowerCase()))
        && endpointVisible(rel.sourceId) && endpointVisible(rel.targetId)
        && rel.sourceId !== rel.targetId
    );
    /** The part box a connector endpoint anchors to (port → its owner). */
    const liftToPart = (id: string): string => portOwner.get(id) ?? id;
    /**
     * The endpoint a connector visibly lands on under the current port display:
     * the port itself when ports are drawn, otherwise the part box.
     *
     * Summary bundling groups by this, not by the owning part. Two connectors
     * that land on two different ports of the same box are two different lines
     * on the drawing, and collapsing them to one loses wiring the reader can
     * see is distinct — a board whose four outputs each run to their own wall
     * connector would otherwise render as a single "4 connections" stub.
     */
    const summaryEndpoint = (id: string): string =>
        (portEls.has(id) ? projectPortForDisplay(id, portDisplay, parentPort) : undefined)
        ?? liftToPart(id);
    const connectionDisplay = options?.connectionDisplay ?? 'summary';
    const focusedBoundaryPorts = new Set(
        [...portOwner].filter(([, owner]) => owner === options?.focusId).map(([portId]) => portId),
    );
    const summaryConnectors = focusedBoundaryPorts.size > 0
        ? rawConnectors.filter(rel => focusedBoundaryPorts.has(rel.sourceId) || focusedBoundaryPorts.has(rel.targetId))
        : rawConnectors;
    const connectors = connectionDisplay === 'none' ? [] : connectionDisplay === 'all'
        ? rawConnectors
        : summarizeConnectors(summaryConnectors, summaryEndpoint);
    // Render only ports that participate in the visible topology. A connected
    // nested port keeps its ancestor proxy port visible as the group boundary.
    const connectedPortIds = new Set<string>();
    for (const rel of rawConnectors) {
        for (const endpoint of [rel.sourceId, rel.targetId]) {
            if (!portEls.has(endpoint)) continue;
            let current: string | undefined = endpoint;
            while (current && !connectedPortIds.has(current)) {
                connectedPortIds.add(current);
                current = parentPort.get(current);
            }
        }
    }
    for (const [owner, ids] of portsByOwner) {
        portsByOwner.set(owner, ids.filter(id => connectedPortIds.has(id)));
    }
    const implicitOutParts = new Set(rawConnectors.filter(r => partVisible(r.sourceId)).map(r => r.sourceId));
    const implicitInParts = new Set(rawConnectors.filter(r => partVisible(r.targetId)).map(r => r.targetId));

    /** part id → its composition parent (within the visible tree) */
    const parentOf = new Map<string, string>();
    for (const [p, cs] of tree.childrenMap) {
        for (const c of cs) if (partVisible(c)) parentOf.set(c, p);
    }

    // ── Port role: which boundary side a port sits on (see inferPortRole).
    // A nested port with no declared direction inherits its parent port's role
    // (it sits on the parent's boundary slot; the connectivity fallback reads
    // internal wiring backwards for boundary ports). ──
    const roleCache = new Map<string, 'in' | 'out'>();
    const portRole = (portId: string): 'in' | 'out' => {
        const cached = roleCache.get(portId);
        if (cached) return cached;
        const el = portEls.get(portId)!;
        let role = declaredPortRole(el);
        if (!role) {
            const parent = parentPort.get(portId);
            if (parent && portEls.has(parent)) {
                role = portRole(parent);
            } else {
                let src = 0, tgt = 0;
                for (const rel of connectors) {
                    if (rel.sourceId === portId) src++;
                    if (rel.targetId === portId) tgt++;
                }
                role = inferPortRole(el, src, tgt);
            }
        }
        roleCache.set(portId, role);
        return role;
    };
    /**
     * Which wall a port straddles. The view's declaration wins; a nested port
     * with no declaration of its own rides on its parent's wall (it sits in the
     * parent's slot); otherwise the direction decides, in → left, out → right.
     */
    const declaredWalls = options?.portWalls;
    const sideCache = new Map<string, PortSide>();
    const portSideOf = (portId: string): PortSide => {
        const cached = sideCache.get(portId);
        if (cached) return cached;
        const declared = declaredWalls?.get(portId);
        const parent = parentPort.get(portId);
        const side = declared
            ?? (parent && portEls.has(parent) ? portSideOf(parent) : undefined)
            ?? portSideFromRole(portRole(portId));
        sideCache.set(portId, side);
        return side;
    };

    /**
     * Room this box must reserve on each wall: the widest caption actually on
     * that wall, not the widest caption possible.
     *
     * Reserving the full `SIDE_GUTTER` unconditionally cost every box 121px a
     * side even when its ports were called `usbIn` — on a board with ports on
     * both walls that is 242px of white space the diagram never uses, which
     * pushes the whole drawing wider and shrinks the text at fit-to-view.
     *
     * The horizontal walls are not symmetric: a bottom-wall caption is drawn
     * inside the box above its square, so it costs inward room; a top-wall
     * caption hangs above its square, outside the box, so it costs none.
     */
    const wallGutters = (ports: string[]) => {
        const verticalWall = (side: 'left' | 'right') => {
            const captions = ports
                .filter(p => portSideOf(p) === side)
                .map(p => portCaptionWidth(portEls.get(p)?.name ?? ''));
            if (captions.length === 0) return SIDE_MIN;
            return Math.max(...captions) + PORT_SIZE + PORT_LABEL_OFFSET - PORT_SIZE / 2;
        };
        const onWall = (side: PortSide) => ports.some(p => portSideOf(p) === side);
        return {
            left: verticalWall('left'),
            right: verticalWall('right'),
            top: 0,
            bottom: onWall('bottom') ? BOTTOM_GUTTER : 0,
        };
    };
    /** Room a wall's ports demand along it, including their nested groups. */
    const wallExtent = (ports: string[], side: PortSide) => ports
        .filter(p => portSideOf(p) === side)
        .reduce((total, p) => total
            + (isVerticalWall(side) ? PORT_PITCH : HORIZONTAL_PORT_PITCH)
            + (portWeight(p) - 1) * NESTED_PITCH, 0);

    // Header label width for the SysML `name : Type` notation — the name is
    // sized in full (14px bold ≈ 7.6px/char), the type at its 12px render size,
    // capped so a long type name never balloons the box (the renderer
    // ellipsizes the overflow), plus the header's horizontal padding.
    // Names never dictate diagram geometry. Long engineering identifiers are
    // shown in a tooltip and ellipsized in the card; otherwise a single label
    // can turn an otherwise useful IBD into a several-thousand-pixel strip.
    const labelWidth = (el: MemoElement) => ibdLabelWidth(el.name);

    // ── Leaf sizing: a box tall/wide enough for its header, ports and labels ──
    const leafLayout = (el: MemoElement, ports: string[]): PartLayout => {
        const g = wallGutters(ports);
        const bodyH = Math.max(wallExtent(ports, 'left'), wallExtent(ports, 'right'), 0);
        // The first port's caption has to clear the header, so the body starts
        // a caption's height below it rather than immediately under the title.
        const firstCenter = LEAF_HEADER + PORT_CAPTION_CLEARANCE;
        const height = Math.max(firstCenter + bodyH + 8 + g.bottom, LEAF_MIN_H + g.bottom);
        const contentW = labelWidth(el);
        // A horizontal wall's ports need room ACROSS the box, between the
        // vertical walls' caption gutters — a card with four bottom-wall
        // connectors is wide because of them, not because of its name.
        const wallW = Math.max(wallExtent(ports, 'top'), wallExtent(ports, 'bottom'));
        const width = Math.max(g.left + Math.max(contentW, wallW) + g.right, LEAF_MIN_W);
        const portPos = distributePorts(ports, {
            width, height,
            bodyTop: LEAF_HEADER, bodyBottom: height - PAD_BOTTOM / 2 - g.bottom,
            bodyLeft: g.left, bodyRight: width - g.right,
            sideOf: portSideOf, weightOf: portWeight, minCenterY: firstCenter,
            singleCenterY: Math.max((height - g.bottom) / 2, firstCenter),
        });
        return { width, height, childPos: new Map(), portPos };
    };

    // ── Recursive container layout ──
    const layouts = new Map<string, PartLayout>();
    /** ELK's crossing-minimised y per own-port, captured during a container pass. */
    const portElkY = new Map<string, Map<string, number>>();
    /** The same for the horizontal walls, where the ordering axis is x. */
    const portElkX = new Map<string, Map<string, number>>();

    const layoutPart = async (partId: string): Promise<PartLayout> => {
        const kids = childrenOf(partId);
        const ownPorts = showPorts ? (portsByOwner.get(partId) ?? []) : [];
        const el = tree.elements.get(partId)!;

        if (kids.length === 0) {
            const l = leafLayout(el, ownPorts);
            layouts.set(partId, l);
            return l;
        }

        const kidLayouts = new Map<string, PartLayout>();
        for (const cid of kids) kidLayouts.set(cid, await layoutPart(cid));

        const kidSet = new Set(kids);
        const ownPortSet = new Set(ownPorts);
        // Lift any connector endpoint to the direct child of this container it
        // belongs to (or this container's own port — a nested port counts as
        // its top-level ancestor's slot), else undefined.
        const liftHere = (id: string): string | undefined => {
            if (portEls.has(id)) {
                const top = topPortOf(id);
                if (ownPortSet.has(top)) return top;
            }
            let cur: string | undefined = liftToPart(id);
            while (cur && !kidSet.has(cur)) cur = parentOf.get(cur);
            return cur;
        };
        /** The rendered top-level port a connector endpoint anchors to on `kid`. */
        const portOnKid = (endpointId: string, kid: string): string | undefined => {
            if (!portEls.has(endpointId) || portOwner.get(endpointId) !== kid) return undefined;
            const top = topPortOf(endpointId);
            return portsByOwner.get(kid)?.includes(top) ? top : undefined;
        };
        const elkEdges: {
            id: string; source: string; target: string;
            sourcePort?: string; targetPort?: string;
        }[] = [];
        const connectedKids = new Set<string>();
        connectors.forEach((rel, i) => {
            const s = liftHere(rel.sourceId);
            const t = liftHere(rel.targetId);
            if (s && t && s !== t) {
                elkEdges.push({
                    id: `ic-${i}`, source: s, target: t,
                    sourcePort: portOnKid(rel.sourceId, s),
                    targetPort: portOnKid(rel.targetId, t),
                });
                if (kidSet.has(s)) connectedKids.add(s);
                if (kidSet.has(t)) connectedKids.add(t);
            }
        });

        // Orphans: leaf children with no ports and no connector — packed into a
        // grid rather than scattered across an inflated frame.
        const { flowKids: elkKids, orphanKids } = partitionChildren(kids, {
            isConnected: k => connectedKids.has(k),
            hasChildParts: k => (tree.childrenMap.get(k) ?? []).some(partVisible),
            portCount: k => portsByOwner.get(k)?.length ?? 0,
        });

        const g = wallGutters(ownPorts);
        const childPos = new Map<string, { x: number; y: number }>();
        let contentW = 0;
        let contentBottom = 0;

        if (elkKids.length > 0) {
            const kidPorts = (id: string): { id: string; side: PortSide }[] =>
                (portsByOwner.get(id) ?? []).map(portId => ({ id: portId, side: portSideOf(portId) }));
            const resolved = await resolveGraphLayout({
                id: `container-${partId}`,
                nodes: elkKids.map(id => ({
                    id,
                    width: kidLayouts.get(id)!.width,
                    height: kidLayouts.get(id)!.height,
                    ports: kidPorts(id),
                })),
                edges: elkEdges,
                // This container's own boundary ports take part in the same
                // pass, so a pass-through connector is ordered against the
                // internal wiring instead of being placed blind.
                graphPorts: ownPorts.map(portId => ({ id: portId, side: portSideOf(portId) })),
                gapX: 54,
                gapY: 58,
                // IBDs are boards, not process lanes. Compare horizontal,
                // vertical and compact candidates, favouring a square-ish
                // footprint when routing costs are comparable.
                targetAspect: 1.3,
                directedFlowAxis: 'AUTO',
                preferBalancedLayout: true,
                layoutProviderId: options?.layoutProviderId,
            });
            for (const c of resolved.children) {
                const x = c.x + g.left;
                const y = c.y + HEADER_BAND;
                childPos.set(c.id, { x, y });
                contentW = Math.max(contentW, x - g.left + c.width);
                contentBottom = Math.max(contentBottom, y + c.height);
                // Keep the child's own port slots — its box was already sized
                // around them — but hand the slots out in the order the layout
                // engine minimised crossings for. Vertical walls are re-dealt
                // from the engine's y, horizontal walls from its x.
                if (c.portY || c.portX) {
                    applyPortOrder(kidLayouts.get(c.id)!.portPos, c.portY ?? new Map(), c.portX);
                }
            }
            if (resolved.graphPortY) {
                portElkY.set(partId, new Map(
                    [...resolved.graphPortY].map(([portId, y]) => [portId, y + HEADER_BAND]),
                ));
            }
        }

        // ── Crossing-reducing port order (barycentre sweeps) ──
        // Whichever strategy placed the boxes, each port then moves to the
        // slot nearest what it is wired to — the classic Sugiyama port-ordering
        // step, run over the geometry that was actually chosen. Slots are
        // re-dealt, never invented, so no box has to grow.
        if (elkKids.length > 0 && elkEdges.length > 0) {
            const contentCentre = (HEADER_BAND + Math.max(contentBottom, HEADER_BAND)) / 2;
            const ownY = new Map<string, number>(portElkY.get(partId) ?? []);
            const ownX = new Map<string, number>(portElkX.get(partId) ?? []);
            // Both axes are swept: a vertical wall orders by the y of what each
            // port is wired to, a horizontal wall by the x. One axis alone left
            // every bottom-wall port with the same barycentre and no order.
            const endpointPos = (nodeId: string, portId?: string): { x: number; y: number } | undefined => {
                if (ownPortSet.has(nodeId)) {
                    return { x: ownX.get(nodeId) ?? contentW / 2, y: ownY.get(nodeId) ?? contentCentre };
                }
                const pos = childPos.get(nodeId);
                const kidLayout = kidLayouts.get(nodeId);
                if (!pos || !kidLayout) return undefined;
                const port = portId ? kidLayout.portPos.get(portId) : undefined;
                return port
                    ? { x: pos.x + port.x + PORT_SIZE / 2, y: pos.y + port.y + PORT_SIZE / 2 }
                    : { x: pos.x + kidLayout.width / 2, y: pos.y + kidLayout.height / 2 };
            };
            const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
            // Two sweeps: the first orders against the boxes, the second
            // against the ports the first sweep moved.
            for (let sweep = 0; sweep < 2; sweep++) {
                const wiredToY = new Map<string, number[]>();
                const wiredToX = new Map<string, number[]>();
                const record = (portId: string | undefined, at: { x: number; y: number } | undefined) => {
                    if (portId === undefined || at === undefined) return;
                    for (const [bucket, value] of [[wiredToY, at.y], [wiredToX, at.x]] as const) {
                        if (!bucket.has(portId)) bucket.set(portId, []);
                        bucket.get(portId)!.push(value);
                    }
                };
                for (const edge of elkEdges) {
                    const sourceAt = endpointPos(edge.source, edge.sourcePort);
                    const targetAt = endpointPos(edge.target, edge.targetPort);
                    record(edge.sourcePort ?? (ownPortSet.has(edge.source) ? edge.source : undefined), targetAt);
                    record(edge.targetPort ?? (ownPortSet.has(edge.target) ? edge.target : undefined), sourceAt);
                }
                for (const kid of elkKids) {
                    const kidLayout = kidLayouts.get(kid)!;
                    const placedY = new Map<string, number>();
                    const placedX = new Map<string, number>();
                    for (const portId of kidLayout.portPos.keys()) {
                        const ys = wiredToY.get(portId);
                        if (ys?.length) placedY.set(portId, mean(ys));
                        const xs = wiredToX.get(portId);
                        if (xs?.length) placedX.set(portId, mean(xs));
                    }
                    if (placedY.size > 1 || placedX.size > 1) {
                        applyPortOrder(kidLayout.portPos, placedY, placedX);
                    }
                }
                for (const portId of ownPorts) {
                    const ys = wiredToY.get(portId);
                    if (ys?.length) ownY.set(portId, mean(ys));
                    const xs = wiredToX.get(portId);
                    if (xs?.length) ownX.set(portId, mean(xs));
                }
            }
            if (ownY.size > 0) portElkY.set(partId, ownY);
            if (ownX.size > 0) portElkX.set(partId, ownX);
        }

        // ── Orphan grid, packed below the connected content ──
        if (orphanKids.length > 0) {
            const maxColW = Math.max(...orphanKids.map(k => kidLayouts.get(k)!.width));
            const avail = Math.max(contentW, maxColW);
            const cols = Math.max(1, Math.min(orphanKids.length, Math.floor((avail + ORPHAN_GAP) / (maxColW + ORPHAN_GAP)) || 1));
            const gridTop = (contentBottom > 0 ? contentBottom + ORPHAN_GAP : HEADER_BAND);
            let col = 0, rowTop = gridTop, rowH = 0, rowStart = 0;
            for (const k of orphanKids) {
                const kl = kidLayouts.get(k)!;
                const x = g.left + col * (maxColW + ORPHAN_GAP);
                childPos.set(k, { x, y: rowTop });
                contentW = Math.max(contentW, x - g.left + kl.width);
                rowH = Math.max(rowH, kl.height);
                rowStart = Math.max(rowStart, rowTop + kl.height);
                col++;
                if (col >= cols) { col = 0; rowTop += rowH + ORPHAN_GAP; rowH = 0; }
            }
            contentBottom = Math.max(contentBottom, rowStart);
        }

        const headerW = Math.min(labelWidth(el) + 32, 248);
        // A horizontal wall's ports have to fit ACROSS the frame between the
        // vertical caption gutters, and a bottom wall's captions need room
        // inside above the edge, so both walls can widen or deepen the frame.
        const wallW = Math.max(wallExtent(ownPorts, 'top'), wallExtent(ownPorts, 'bottom'));
        let width = Math.max(g.left + Math.max(contentW, wallW) + g.right, headerW, LEAF_MIN_W);
        let height = Math.max(
            contentBottom + PAD_BOTTOM + g.bottom,
            HEADER_BAND + PAD_BOTTOM + 8 + g.bottom,
        );

        // ── Snap own boundary ports onto the frame, keeping the engine's order
        // along each wall and enforcing a minimum pitch (a port's nested ports
        // extend its group along the wall) so labels never overlap ──
        const portPos = new Map<string, { x: number; y: number; side: PortSide }>();
        const elkY = portElkY.get(partId) ?? new Map<string, number>();
        const elkX = portElkX.get(partId) ?? new Map<string, number>();
        for (const side of ['left', 'right'] as const) {
            const group = ownPorts.filter(p => portSideOf(p) === side)
                .sort((a, b) => (elkY.get(a) ?? 0) - (elkY.get(b) ?? 0));
            let prevBottom = -Infinity;
            for (const pid of group) {
                const loneCenter = Math.max((height - g.bottom) / 2, HEADER_BAND + PORT_CAPTION_CLEARANCE);
                const firstCenter = HEADER_BAND + PORT_CAPTION_CLEARANCE;
                let cy = (elkY.get(pid) ?? (group.length === 1 ? loneCenter : firstCenter));
                cy = Math.max(cy, firstCenter, prevBottom + PORT_PITCH);
                const groupBottom = cy + (portWeight(pid) - 1) * NESTED_PITCH;
                prevBottom = groupBottom;
                portPos.set(pid, {
                    x: side === 'left' ? -PORT_SIZE / 2 : width - PORT_SIZE / 2,
                    y: cy - PORT_SIZE / 2,
                    side,
                });
                height = Math.max(height, groupBottom + PORT_PITCH / 2 + PAD_BOTTOM + g.bottom);
            }
        }
        // ── The horizontal walls, dealt across the frame in the order the
        // barycentre sweep settled on. There is no ELK x for a boundary port
        // (its stand-in node is layer-pinned, not placed), so the sweep's
        // barycentre is the ordering signal, and the slots themselves are
        // spread evenly between the vertical gutters. ──
        for (const side of ['top', 'bottom'] as const) {
            const group = ownPorts.filter(p => portSideOf(p) === side)
                .sort((a, b) => (elkX.get(a) ?? 0) - (elkX.get(b) ?? 0));
            if (group.length === 0) continue;
            const from = g.left;
            const to = Math.max(width - g.right, from);
            const span = to - from;
            let prevEnd = -Infinity;
            for (const [index, pid] of group.entries()) {
                let cx = from + (group.length === 1
                    ? span / 2
                    : (index + 0.5) / group.length * span);
                cx = Math.max(cx, from + HORIZONTAL_PORT_PITCH / 2, prevEnd + HORIZONTAL_PORT_PITCH);
                prevEnd = cx + (portWeight(pid) - 1) * NESTED_PITCH;
                portPos.set(pid, { x: cx - PORT_SIZE / 2, y: 0, side });
                width = Math.max(width, prevEnd + HORIZONTAL_PORT_PITCH / 2 + g.right);
            }
        }
        // Ports were snapped to the pre-growth width and height; re-pin the far
        // walls now that both are final. Neither pass changes the other's axis,
        // so one re-pin is enough.
        for (const [, p] of portPos) {
            if (p.side === 'right') p.x = width - PORT_SIZE / 2;
            if (p.side === 'top') p.y = -PORT_SIZE / 2;
            if (p.side === 'bottom') p.y = height - PORT_SIZE / 2;
        }

        const l: PartLayout = { width, height, childPos, portPos };
        layouts.set(partId, l);
        return l;
    };

    const roots = focusId
        ? [focusId]
        : tree.roots.filter(id => partVisible(id));
    for (const rootId of roots) await layoutPart(rootId);

    // ── Position roots (context frame + external systems) with one ELK pass so
    // cross-boundary connectors run around the frame, not through it ──
    const rootPos = new Map<string, { x: number; y: number }>();
    if (roots.length === 1) {
        rootPos.set(roots[0], { x: 0, y: 0 });
    } else {
        const rootOf = (id: string): string | undefined => {
            let cur: string | undefined = liftToPart(id);
            const seen = new Set<string>();
            while (cur && parentOf.has(cur) && !seen.has(cur)) { seen.add(cur); cur = parentOf.get(cur); }
            return cur && roots.includes(cur) ? cur : (roots.includes(id) ? id : cur);
        };
        const rootSet = new Set(roots);
        const rootEdges: { id: string; source: string; target: string; sourceAnchorY?: number; targetAnchorY?: number }[] = [];
        const rootAnchorY = (endpointId: string, rootId: string): number => {
            if (portEls.has(endpointId) && portOwner.get(endpointId) === rootId) {
                const top = topPortOf(endpointId);
                const p = layouts.get(rootId)?.portPos.get(top);
                if (p) return p.y + PORT_SIZE / 2;
            }
            return layouts.get(rootId)!.height / 2;
        };
        connectors.forEach((rel, i) => {
            const s = rootOf(rel.sourceId);
            const t = rootOf(rel.targetId);
            if (s && t && s !== t && rootSet.has(s) && rootSet.has(t)) {
                rootEdges.push({
                    id: `root-${i}`, source: s, target: t,
                    sourceAnchorY: rootAnchorY(rel.sourceId, s),
                    targetAnchorY: rootAnchorY(rel.targetId, t),
                });
            }
        });
        const resolved = await resolveGraphLayout({
            id: 'interconnection-roots',
            nodes: roots.map(id => ({ id, width: layouts.get(id)!.width, height: layouts.get(id)!.height })),
            edges: rootEdges,
            gapX: ROOT_GAP,
            gapY: ROOT_GAP,
            targetAspect: 1.3,
            directedFlowAxis: 'AUTO',
            preferBalancedLayout: true,
            layoutProviderId: options?.layoutProviderId,
        });
        for (const c of resolved.children) rootPos.set(c.id, { x: c.x, y: c.y });
        // Safety net for any root ELK dropped
        let cursorX = 0;
        for (const id of roots) {
            if (!rootPos.has(id)) { rootPos.set(id, { x: cursorX, y: 0 }); cursorX += layouts.get(id)!.width + ROOT_GAP; }
        }
    }

    // ── Port info per owner (local coords, for the node renderer). A port's
    // nested ports render as smaller squares stacked below it, straddling the
    // same boundary edge. ──
    const portInfoByOwner = new Map<string, PortInfo[]>();
    for (const [ownerId, portIds] of portsByOwner) {
        const l = layouts.get(ownerId);
        if (!l) continue;
        const infos: PortInfo[] = [];
        for (const portId of portIds) {
            const p = l.portPos.get(portId);
            if (!p) continue;
            const pel = portEls.get(portId)!;
            const nestedIds = nestedOf.get(portId) ?? [];
            infos.push({
                id: portId, name: pel.name, x: p.x, y: p.y, side: p.side,
                direction: portDirection(pel) ?? portRole(portId),
                nestedCount: nestedIds.length || undefined,
                labelWidth: portCaptionWidth(pel.name),
            });
            // A group runs ALONG its wall: down a vertical wall, across a
            // horizontal one. Stacking a bottom-wall group downward would march
            // its nested ports off the box.
            const vertical = isVerticalWall(p.side);
            const parentCenter = vertical ? p.y + PORT_SIZE / 2 : p.x + PORT_SIZE / 2;
            const inset = (vertical ? p.x : p.y) + (PORT_SIZE - NESTED_PORT_SIZE) / 2;
            nestedIds.forEach((childId, i) => {
                const cel = portEls.get(childId)!;
                const along = parentCenter + NESTED_PITCH * (i + 1) - NESTED_PORT_SIZE / 2;
                infos.push({
                    id: childId,
                    name: cel.name,
                    x: vertical ? inset : along,
                    y: vertical ? along : inset,
                    side: p.side,
                    direction: portDirection(cel) ?? portRole(childId),
                    size: NESTED_PORT_SIZE,
                    nested: true,
                });
            });
        }
        portInfoByOwner.set(ownerId, infos);
    }

    // ── Emit ReactFlow nodes (parents before children, child coords relative) ──
    const nodes: Node[] = [];
    const absolutePos = new Map<string, { x: number; y: number }>();
    const emitPart = (
        partId: string,
        parentId?: string,
        relPos?: { x: number; y: number },
        parentAbs = { x: 0, y: 0 },
        parentBounds?: { width: number; height: number },
        parentIsFrame = false,
    ) => {
        const el = tree.elements.get(partId)!;
        const l = layouts.get(partId)!;
        // Must stay 6-digit hex: the renderer composes alpha suffixes onto it
        // (`color + 'B0'`), and a 3-digit fallback would silently produce an
        // invalid colour that CSSOM drops — border-less, fill-less boxes.
        const legendLiteral = options?.legend && el.attributes[options.legend.attribute]
            ?.split('::').pop();
        const color = (legendLiteral && options?.legend?.colors.get(legendLiteral))
            || LAYER_COLORS[el.layer] || '#64748B';
        const pos = relPos ?? rootPos.get(partId)!;
        const abs = parentId
            ? { x: parentAbs.x + pos.x, y: parentAbs.y + pos.y }
            : pos;
        absolutePos.set(partId, abs);
        const hasChildren = (tree.childrenMap.get(partId) ?? []).some(partVisible);
        const isContainer = hasChildren;
        nodes.push({
            id: partId,
            type: 'interconnectionNode',
            position: pos,
            ...(parentId ? {
                parentId,
                // Direct children of the IBD frame must never overlap its
                // title bar. Nested containers retain React Flow's standard
                // full-parent extent.
                extent: parentIsFrame && parentBounds
                    ? [[0, INTERCONNECTION_HEADER_HEIGHT], [
                        Math.max(0, parentBounds.width - l.width),
                        Math.max(INTERCONNECTION_HEADER_HEIGHT, parentBounds.height - l.height),
                    ]]
                    : 'parent' as const,
            } : {}),
            data: {
                label: el.name,
                kind: el.kind,
                layer: el.layer,
                color,
                isContainer,
                isFrame: !parentId && isContainer,
                hasChildren,
                isCollapsed: options?.collapsedNodes?.has(partId) ?? false,
                onToggleCollapse: hasChildren && options?.onToggleCollapse
                    ? () => options.onToggleCollapse!(partId)
                    : undefined,
                // The frame is the diagram's root; drilling into it is a no-op.
                onDrillIn: hasChildren && !!parentId && options?.onDrillIn
                    ? () => options.onDrillIn!(partId)
                    : undefined,
                ports: portInfoByOwner.get(partId) ?? [],
                showPortText: options?.showPortText !== false,
                implicitIn: showPorts && implicitInParts.has(partId),
                implicitOut: showPorts && implicitOutParts.has(partId),
                onPortMove: options?.onPortMove
                    ? (portId: string, y: number, side?: PortSide) => options.onPortMove!(partId, portId, y, side)
                    : undefined,
                onPortSelect: options?.onPortSelect
                    ? (portId: string) => options.onPortSelect!(portId)
                    : undefined,
                // Preserve this model-derived footprint while the user resizes
                // a node.  A container cannot be shrunk across one of its
                // children, and a leaf cannot crop its port-label gutters.
                minWidth: l.width,
                minHeight: l.height,
            },
            style: { width: l.width, height: l.height },
        });
        for (const [cid, rel] of l.childPos) emitPart(cid, partId, rel, abs, l, !parentId && isContainer);
    };
    for (const rootId of roots) emitPart(rootId);

    // ── Connector edges — anchored to port handles, orthogonal smoothstep ──
    // A port on a container boundary carries an outer face (toward siblings /
    // external systems) and an inner face (toward its own nested parts). Route
    // each connector to whichever face points at its other endpoint so a
    // pass-through port doesn't loop around the frame.
    const isInside = (partId: string, ancestorId: string): boolean => {
        let cur: string | undefined = partId;
        const seen = new Set<string>();
        while (cur && !seen.has(cur)) {
            if (cur === ancestorId) return true;
            seen.add(cur);
            cur = parentOf.get(cur);
        }
        return false;
    };
    const portHandle = (portId: string, otherEndpointId: string): string => {
        const owner = portOwner.get(portId)!;
        const otherPart = liftToPart(otherEndpointId);
        return isInside(otherPart, owner) ? `${portId}${INNER_HANDLE_SUFFIX}` : portId;
    };

    /** The rendered port a connector endpoint anchors to under the current
     *  display mode, or undefined when it lifts to the part box. */
    const renderedPort = (id: string): string | undefined =>
        portEls.has(id) ? projectPortForDisplay(id, portDisplay, parentPort) : undefined;

    // Older models can contain a relationship between part properties rather
    // than between their ports. Keep that semantic relationship intact while
    // drawing it as a port-to-port connector whenever both visible parts own
    // ports. New connections cannot use the generic box handles at all.
    const visiblePortForPart = (ownerId: string, otherId: string, end: 'source' | 'target'): string | undefined => {
        if (!showPorts) return undefined;
        const candidates = portInfoByOwner.get(ownerId) ?? [];
        if (!candidates.length) return undefined;
        const owner = absolutePos.get(ownerId);
        const other = absolutePos.get(otherId);
        const desiredSide: PortSide | undefined = owner && other
            ? Math.abs(other.x - owner.x) >= Math.abs(other.y - owner.y)
                ? other.x >= owner.x ? 'right' : 'left'
                : other.y >= owner.y ? 'bottom' : 'top'
            : undefined;
        const compatibleDirection = (direction: PortInfo['direction']) => end === 'source'
            ? direction === 'out' ? 0 : direction === 'inout' ? 1 : 4
            : direction === 'in' ? 0 : direction === 'inout' ? 1 : 4;
        return [...candidates].sort((a, b) =>
            compatibleDirection(a.direction) - compatibleDirection(b.direction)
            || Number(a.side !== desiredSide) - Number(b.side !== desiredSide)
            || a.id.localeCompare(b.id),
        )[0]?.id;
    };

    type EdgeDraft = { edge: Edge; route: OrthogonalRouteRequest };
    const edgeDrafts: EdgeDraft[] = connectors.flatMap((rel, i) => {
        const source = portEls.has(rel.sourceId) ? portOwner.get(rel.sourceId)! : rel.sourceId;
        const target = portEls.has(rel.targetId) ? portOwner.get(rel.targetId)! : rel.targetId;
        if (!layouts.has(source) || !layouts.has(target)) return [];
        const sourcePort = renderedPort(rel.sourceId) ?? visiblePortForPart(source, target, 'source');
        const targetPort = renderedPort(rel.targetId) ?? visiblePortForPart(target, source, 'target');
        // Colour by transported item; the legend explains the categories.
        const flowKind = classifyIbdFlow(rel.flowItem, rel.type);
        const flowColor = IBD_FLOW_COLORS[flowKind];
        // Prefer the transported item as the label; the ubiquitous unlabelled
        // exchange edges stay clean.
        const bundleCount = Number(rel.attributes?.bundleCount ?? 0);
        const label = bundleCount > 1 ? `${bundleCount} connections` : rel.flowItem
            || (rel.type.toLowerCase() === 'exchangeswith' ? undefined : rel.type);
        // Port endpoints anchor to the port's inner/outer face; a part endpoint
        // anchors to its right (source) / left (target) side so the connector
        // stays a clean horizontal run instead of looping over the box.
        const sourceHandle = sourcePort ? portHandle(sourcePort, rel.targetId) : 'right';
        const targetHandle = targetPort ? portHandle(targetPort, rel.sourceId) : 'left';
        const oppositeSide = (side: PortSide): PortSide => side === 'left' ? 'right'
            : side === 'right' ? 'left' : side === 'top' ? 'bottom' : 'top';
        const endpointSide = (partId: string, portId: string | undefined, handle: string, fallback: PortSide): PortSide => {
            if (!portId) return fallback;
            const side = (portInfoByOwner.get(partId) ?? []).find(port => port.id === portId)?.side ?? fallback;
            return handle.endsWith(INNER_HANDLE_SUFFIX) ? oppositeSide(side) : side;
        };
        const sourceSide = endpointSide(source, sourcePort, sourceHandle, 'right');
        const targetSide = endpointSide(target, targetPort, targetHandle, 'left');
        const id = rel.id || `ic-e-${i}`;
        // A connector meets a port at the face the connector arrives on, not at
        // the square's centre. Anchoring to the centre drew the arrowhead on top
        // of the port glyph — the head covered the very thing it points at, and
        // the tail started under its own square.
        const endpointPoint = (
            partId: string, portId: string | undefined, sourceEnd: boolean, side: PortSide,
        ) => {
            const abs = absolutePos.get(partId)!;
            const l = layouts.get(partId)!;
            if (portId) {
                const info = (portInfoByOwner.get(partId) ?? []).find(p => p.id === portId);
                if (info) {
                    const size = info.size ?? PORT_SIZE;
                    // A port that carries nested ports is drawn as a group, and
                    // the connector belongs to the whole feature — so it meets
                    // the group's centreline, not the parent square that
                    // happens to sit at the start of the stack. The group runs
                    // along its own wall, so the shift follows that axis.
                    const groupShift = (info.nestedCount ?? 0) * NESTED_PITCH / 2;
                    const alongY = isVerticalWall(info.side);
                    const cx = abs.x + info.x + size / 2 + (alongY ? 0 : groupShift);
                    const cy = abs.y + info.y + size / 2 + (alongY ? groupShift : 0);
                    return side === 'left' ? { x: cx - size / 2, y: cy }
                        : side === 'right' ? { x: cx + size / 2, y: cy }
                        : side === 'top' ? { x: cx, y: cy - size / 2 }
                        : { x: cx, y: cy + size / 2 };
                }
            }
            return { x: abs.x + (sourceEnd ? l.width : 0), y: abs.y + l.height / 2 };
        };
        const sourcePoint = endpointPoint(source, sourcePort, true, sourceSide);
        const targetPoint = endpointPoint(target, targetPort, false, targetSide);
        const sourceAbs = absolutePos.get(source)!;
        const targetAbs = absolutePos.get(target)!;
        const edge: Edge = {
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
            type: 'interconnectionEdge',
            className: 'ibd-interconnection-edge',
            // Keep connector corridors visible above the part body. Boundary
            // ports remain their exact endpoints, not hidden under a card.
            zIndex: 5,
            label,
            animated: rel.type === 'flow',
            style: { stroke: flowColor, strokeWidth: Math.max(2, EDGE.defaultWidth) },
            labelStyle: { fontSize: FONT.badge, fill: '#4B5563', fontWeight: 600 },
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            labelBgStyle: { ...EDGE.labelBgStyle, fillOpacity: 0.96, stroke: '#E2E8F0', strokeWidth: 1 },
            markerEnd: {
                type: 'arrowclosed' as never,
                color: flowColor,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
            data: {
                flowCategory: flowKind,
                sourceOffset: { x: sourcePoint.x - sourceAbs.x, y: sourcePoint.y - sourceAbs.y },
                targetOffset: { x: targetPoint.x - targetAbs.x, y: targetPoint.y - targetAbs.y },
                sourcePortId: sourcePort,
                targetPortId: targetPort,
                sourceSide,
                targetSide,
            },
        };
        return [{
            edge,
            route: {
                id,
                source: sourcePoint,
                target: targetPoint,
                sourceNodeId: source,
                targetNodeId: target,
                sourceSide,
                targetSide,
            },
        }];
    });

    const obstacles = nodes
        .filter(n => !(n.data as { isFrame?: boolean }).isFrame)
        .map(n => {
            const abs = absolutePos.get(n.id)!;
            const l = layouts.get(n.id)!;
            return { id: n.id, x: abs.x, y: abs.y, width: l.width, height: l.height };
        });
    // IBDs often have a few long boundary flows alongside many local sibling
    // exchanges.  Claiming local corridors first keeps the readable wiring
    // near its parts; long flows then use distinct outer channels instead of
    // cutting through the middle of the board.
    const routes = routeOrthogonalEdges(edgeDrafts.map(d => d.route), obstacles, 28, 'short-first');
    // Labelled connectors (typed flow items) share one placement pass so two
    // flows through the same corridor don't stack their labels.
    const labelPoints = placeConnectorLabels(
        edgeDrafts.flatMap(({ edge }) => {
            const points = routes.get(edge.id);
            return edge.label && points && points.length >= 2
                ? [{ id: edge.id, points, width: connectorLabelWidth(String(edge.label)), height: CONNECTOR_LABEL_HEIGHT }]
                : [];
        }),
        obstacles,
    );
    const edges = edgeDrafts.map(({ edge }) => ({
        ...edge,
        data: {
            ...edge.data,
            points: routes.get(edge.id) ?? [],
            labelPoint: labelPoints.get(edge.id),
            showLabel: options?.showConnectionText !== false,
        },
    }));

    return { nodes, edges };
}

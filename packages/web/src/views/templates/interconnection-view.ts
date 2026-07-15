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

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS } from '../../constants';
import { EDGE, FONT } from '../../styles/tokens';
import { resolveGraphLayout, routeOrthogonalEdges, type LayoutResult, type OrthogonalRouteRequest } from '../layout';
import { buildCompositionTree, COMPOSITION_REL_TYPES } from './composition-tree';

/**
 * Inner-handle id suffix. A boundary port renders two coincident handle pairs:
 * the bare `portId` faces the boundary (outer), `portId + INNER_HANDLE_SUFFIX`
 * faces into the owner (inner). Shared with InterconnectionNode.
 */
export const INNER_HANDLE_SUFFIX = '__inner';

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
const NESTED_PITCH = 30; // centre-to-centre spacing parent port → nested ports

const HEADER_BAND = 70;   // two-line container title + separation
const LEAF_HEADER = 62;   // supports a two-line engineering name
const PAD_BOTTOM = 18;
const SIDE_MIN = 14;      // inner padding on a side with no boundary ports
const SIDE_GUTTER = 128;  // opposing port labels need independent readable lanes
const PORT_PITCH = 38;    // minimum port centre-to-centre spacing on one side
const ORPHAN_GAP = 18;    // spacing inside the orphan grid
const ROOT_GAP = 90;      // fallback spacing between disconnected roots

const LEAF_MIN_W = 184;
// Tall enough that the geometric centreline clears the title band.
// This lets aligned components connect with genuinely straight port runs.
const LEAF_MIN_H = 168;

/** Rough text width for sizing (kept in step with the node's font sizes). */
const textWidth = (s: string, px = 7.2) => s.length * px + 20;

/** Stable card width contribution: labels truncate instead of stretching IBDs. */
export const ibdLabelWidth = (name: string): number => Math.min(
    Math.max(textWidth(name, 7.1), 132),
    216,
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
 * Place boundary ports down a box body with a minimum pitch, strictly below the
 * header band. Guarantees a port square (and thus its label) can never overprint
 * the header or another port on the same side. Returns local top-left + side.
 */
export function distributePorts(
    ports: string[],
    opts: {
        width: number;
        bodyTop: number;
        bodyBottom: number;
        sideOf: (id: string) => 'left' | 'right';
        size?: number;
        pitch?: number;
        /** Rows a port group occupies: 1 + its rendered nested ports. */
        weightOf?: (id: string) => number;
        nestedPitch?: number;
        /** Preferred centreline for a lone port (for cross-node alignment). */
        singleCenterY?: number;
    },
): Map<string, { x: number; y: number; side: 'left' | 'right' }> {
    const size = opts.size ?? PORT_SIZE;
    const pitch = opts.pitch ?? PORT_PITCH;
    const nestedPitch = opts.nestedPitch ?? NESTED_PITCH;
    const pos = new Map<string, { x: number; y: number; side: 'left' | 'right' }>();
    for (const side of ['left', 'right'] as const) {
        const group = ports.filter(p => opts.sideOf(p) === side);
        const n = group.length;
        const span = Math.max(opts.bodyBottom - opts.bodyTop, 0);
        let prevBottom = -Infinity;
        group.forEach((pid, i) => {
            let cy = n === 1 && opts.singleCenterY !== undefined
                ? opts.singleCenterY
                : opts.bodyTop + (n === 1 ? span / 2 : (i + 0.5) / n * span);
            cy = Math.max(cy, opts.bodyTop + pitch / 2, prevBottom + pitch);
            // the group's nested ports stack below the parent square
            prevBottom = cy + ((opts.weightOf?.(pid) ?? 1) - 1) * nestedPitch;
            pos.set(pid, {
                x: side === 'left' ? -size / 2 : opts.width - size / 2,
                y: cy - size / 2,
                side,
            });
        });
    }
    return pos;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface InterconnectionOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view; when given, only these are drawn */
    relationshipTypes?: string[];
    /** Parts whose descendants are hidden while the boundary remains visible. */
    collapsedNodes?: ReadonlySet<string>;
    onToggleCollapse?: (id: string) => void;
    /** Drill-down: render only this part's own IBD as the context frame. */
    focusId?: string;
    /** Port visibility: 'all' (nested + top ports, default), 'ports' (top-level
     *  only — nested connectors lift to their parent port), or 'none'
     *  (connectors anchor to part boxes; the frame reflows without ports). */
    portDisplay?: PortDisplay;
    /** Interactive per-diagram port repositioning. */
    onPortMove?: (ownerId: string, portId: string, y: number) => void;
    layoutProviderId?: string;
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
    const connectors = model.relationships.filter(rel =>
        !COMPOSITION_REL_TYPES.has(rel.type)
        && (!declaredRelTypes || declaredRelTypes.has(rel.type.toLowerCase()))
        && endpointVisible(rel.sourceId) && endpointVisible(rel.targetId)
        && rel.sourceId !== rel.targetId
    );
    // Render only ports that participate in the visible topology. A connected
    // nested port keeps its ancestor proxy port visible as the group boundary.
    const connectedPortIds = new Set<string>();
    for (const rel of connectors) {
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
    const implicitOutParts = new Set(connectors.filter(r => partVisible(r.sourceId)).map(r => r.sourceId));
    const implicitInParts = new Set(connectors.filter(r => partVisible(r.targetId)).map(r => r.targetId));

    /** The part box a connector endpoint anchors to (port → its owner). */
    const liftToPart = (id: string): string => portOwner.get(id) ?? id;

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
    const portSideOf = (portId: string): 'left' | 'right' => portSideFromRole(portRole(portId));

    const sideGutters = (ports: string[]) => ({
        left: ports.some(p => portSideOf(p) === 'left') ? SIDE_GUTTER : SIDE_MIN,
        right: ports.some(p => portSideOf(p) === 'right') ? SIDE_GUTTER : SIDE_MIN,
    });

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
        const perSide = { left: 0, right: 0 };
        for (const p of ports) {
            perSide[portSideOf(p)] += PORT_PITCH + (portWeight(p) - 1) * NESTED_PITCH;
        }
        const bodyH = Math.max(perSide.left, perSide.right, 12);
        const height = Math.max(LEAF_HEADER + bodyH + 10, LEAF_MIN_H);
        const g = sideGutters(ports);
        const contentW = Math.max(labelWidth(el), 118);
        const width = Math.max(g.left + contentW + g.right, LEAF_MIN_W);
        const portPos = distributePorts(ports, {
            width, bodyTop: LEAF_HEADER, bodyBottom: height - PAD_BOTTOM / 2,
            sideOf: portSideOf, weightOf: portWeight,
            singleCenterY: Math.max(height / 2, LEAF_HEADER + PORT_SIZE / 2),
        });
        return { width, height, childPos: new Map(), portPos };
    };

    // ── Recursive container layout ──
    const layouts = new Map<string, PartLayout>();
    /** ELK's crossing-minimised y per own-port, captured during a container pass. */
    const portElkY = new Map<string, Map<string, number>>();

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
        const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];
        const connectedKids = new Set<string>();
        connectors.forEach((rel, i) => {
            const s = liftHere(rel.sourceId);
            const t = liftHere(rel.targetId);
            if (s && t && s !== t) {
                elkEdges.push({ id: `ic-${i}`, sources: [s], targets: [t] });
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

        const g = sideGutters(ownPorts);
        const childPos = new Map<string, { x: number; y: number }>();
        let contentW = 0;
        let contentBottom = 0;

        if (elkKids.length > 0) {
            const resolved = await resolveGraphLayout({
                id: `container-${partId}`,
                nodes: elkKids.map(id => ({ id, width: kidLayouts.get(id)!.width, height: kidLayouts.get(id)!.height })),
                edges: elkEdges.map(e => ({ id: e.id, source: e.sources[0], target: e.targets[0] })),
                gapX: 54,
                gapY: 58,
                layoutProviderId: options?.layoutProviderId,
            });
            for (const c of resolved.children) {
                const x = c.x + g.left;
                const y = c.y + HEADER_BAND;
                childPos.set(c.id, { x, y });
                contentW = Math.max(contentW, x - g.left + c.width);
                contentBottom = Math.max(contentBottom, y + c.height);
            }
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
        let width = Math.max(g.left + contentW + g.right, headerW, LEAF_MIN_W);
        let height = Math.max(contentBottom + PAD_BOTTOM, HEADER_BAND + PAD_BOTTOM + 8);

        // ── Snap own boundary ports onto the frame, keeping ELK's y order and
        // enforcing a minimum pitch (a port's nested ports extend its group
        // downward) so labels never overlap ──
        const portPos = new Map<string, { x: number; y: number; side: PortSide }>();
        const elkY = portElkY.get(partId) ?? new Map<string, number>();
        for (const side of ['left', 'right'] as const) {
            const group = ownPorts.filter(p => portSideOf(p) === side)
                .sort((a, b) => (elkY.get(a) ?? 0) - (elkY.get(b) ?? 0));
            let prevBottom = -Infinity;
            for (const pid of group) {
                const loneCenter = Math.max(height / 2, HEADER_BAND + PORT_SIZE / 2);
                let cy = (elkY.get(pid) ?? (group.length === 1 ? loneCenter : HEADER_BAND + PORT_PITCH / 2));
                cy = Math.max(cy, HEADER_BAND + PORT_PITCH / 2, prevBottom + PORT_PITCH);
                const groupBottom = cy + (portWeight(pid) - 1) * NESTED_PITCH;
                prevBottom = groupBottom;
                portPos.set(pid, {
                    x: side === 'left' ? -PORT_SIZE / 2 : width - PORT_SIZE / 2,
                    y: cy - PORT_SIZE / 2,
                    side,
                });
                height = Math.max(height, groupBottom + PORT_PITCH / 2 + PAD_BOTTOM);
            }
        }
        // Right-side ports were snapped to the pre-growth width; re-pin x after
        // any height growth doesn't change width, so this is stable.
        for (const [pid, p] of portPos) {
            if (p.side === 'right') p.x = width - PORT_SIZE / 2;
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
            directedFlowAxis: 'RIGHT',
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
            infos.push({ id: portId, name: pel.name, x: p.x, y: p.y, side: p.side, direction: portDirection(pel) ?? portRole(portId) });
            const parentCenterY = p.y + PORT_SIZE / 2;
            const insetX = p.x + (PORT_SIZE - NESTED_PORT_SIZE) / 2;
            (nestedOf.get(portId) ?? []).forEach((childId, i) => {
                const cel = portEls.get(childId)!;
                infos.push({
                    id: childId,
                    name: cel.name,
                    x: insetX,
                    y: parentCenterY + NESTED_PITCH * (i + 1) - NESTED_PORT_SIZE / 2,
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
    ) => {
        const el = tree.elements.get(partId)!;
        const l = layouts.get(partId)!;
        // Must stay 6-digit hex: the renderer composes alpha suffixes onto it
        // (`color + 'B0'`), and a 3-digit fallback would silently produce an
        // invalid colour that CSSOM drops — border-less, fill-less boxes.
        const color = LAYER_COLORS[el.layer] || '#64748B';
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
            ...(parentId ? { parentId, extent: 'parent' as const } : {}),
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
                ports: portInfoByOwner.get(partId) ?? [],
                implicitIn: showPorts && implicitInParts.has(partId),
                implicitOut: showPorts && implicitOutParts.has(partId),
                onPortMove: options?.onPortMove
                    ? (portId: string, y: number) => options.onPortMove!(partId, portId, y)
                    : undefined,
            },
            style: { width: l.width, height: l.height },
        });
        for (const [cid, rel] of l.childPos) emitPart(cid, partId, rel, abs);
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

    type EdgeDraft = { edge: Edge; route: OrthogonalRouteRequest };
    const edgeDrafts: EdgeDraft[] = connectors.flatMap((rel, i) => {
        const sourcePort = renderedPort(rel.sourceId);
        const targetPort = renderedPort(rel.targetId);
        const source = portEls.has(rel.sourceId) ? portOwner.get(rel.sourceId)! : rel.sourceId;
        const target = portEls.has(rel.targetId) ? portOwner.get(rel.targetId)! : rel.targetId;
        if (!layouts.has(source) || !layouts.has(target)) return [];
        // Colour by transported item; the legend explains the categories.
        const flowKind = classifyIbdFlow(rel.flowItem, rel.type);
        const flowColor = IBD_FLOW_COLORS[flowKind];
        // Prefer the transported item as the label; the ubiquitous unlabelled
        // exchange edges stay clean.
        const label = rel.flowItem
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
        const endpointPoint = (partId: string, portId: string | undefined, sourceEnd: boolean) => {
            const abs = absolutePos.get(partId)!;
            const l = layouts.get(partId)!;
            if (portId) {
                const info = (portInfoByOwner.get(partId) ?? []).find(p => p.id === portId);
                if (info) {
                    const size = info.size ?? PORT_SIZE;
                    return { x: abs.x + info.x + size / 2, y: abs.y + info.y + size / 2 };
                }
            }
            return { x: abs.x + (sourceEnd ? l.width : 0), y: abs.y + l.height / 2 };
        };
        const sourcePoint = endpointPoint(source, sourcePort, true);
        const targetPoint = endpointPoint(target, targetPort, false);
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
    const routes = routeOrthogonalEdges(edgeDrafts.map(d => d.route), obstacles);
    const edges = edgeDrafts.map(({ edge }) => ({
        ...edge,
        data: { ...edge.data, points: routes.get(edge.id) ?? [] },
    }));

    return { nodes, edges };
}

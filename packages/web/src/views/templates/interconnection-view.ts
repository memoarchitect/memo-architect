// ─── Interconnection View Template (KK-3) ────────────────────────────────────
//
// Standard renderer template for the SysML v2 `interconnection` view kind:
// the classic IBD — a context block drawn as a frame, its parts nested
// inside, ports straddling the boundaries, and typed connectors wired
// port-to-port (Altova UModel IBD as the visual reference).
//
// Layout strategy: recursive bottom-up. Each container lays out its child
// parts with a flat ELK layered pass (connector endpoints lifted to the
// child that owns them), then sizes itself around the result. This avoids
// ELK's compound INCLUDE_CHILDREN mode, which mis-placed nested children.
// Ports are placed after positions are known: each port goes to the side
// of its owner that faces the average position of its connector partners,
// half-in half-out of the boundary.
//
// Ports without a visible owner are dropped — a boundary port only means
// something on a boundary.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS, REL_COLORS } from '../../constants';
import { EDGE, FONT } from '../../styles/tokens';
import { elk, type LayoutResult } from '../layout';
import { buildCompositionTree, COMPOSITION_REL_TYPES } from './composition-tree';

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
}

/** A view element rendered as a boundary port rather than a part box. */
export function isPortElement(el: MemoElement): boolean {
    return el.construct === 'port' || el.kind.endsWith('Port');
}

function portDirection(el: MemoElement): PortInfo['direction'] {
    const spec = el.portSpec?.direction;
    if (spec === 'in' || spec === 'out' || spec === 'inout') return spec;
    const declared = (el.attributes['direction'] ?? '').split('::').pop()?.trim();
    if (declared === 'in' || declared === 'out' || declared === 'inout') return declared;
    return undefined;
}

const PORT_SIZE = 14;
/** Port square edge length — shared with InterconnectionNode rendering. */
export const INTERCONNECTION_PORT_SIZE = PORT_SIZE;

// Container paddings (px)
const PAD_TOP = 52;      // room for the name/kind header
const PAD_SIDE = 36;     // also breathing room for boundary ports
const PAD_BOTTOM = 28;
const LEAF_HEIGHT = 64;

const leafWidth = (el: MemoElement) => Math.max(el.name.length * 8 + 56, 180);

// ─── Options ─────────────────────────────────────────────────────────────────

export interface InterconnectionOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view; when given, only these are drawn */
    relationshipTypes?: string[];
}

// ─── Layout ──────────────────────────────────────────────────────────────────

interface PartLayout {
    width: number;
    height: number;
    /** child part id → position relative to this part */
    childPos: Map<string, { x: number; y: number }>;
    /** own boundary ports placed by ELK: port id → local pos + side */
    portPos: Map<string, { x: number; y: number; side: PortSide }>;
    /** connector index → ELK orthogonal route in local coords */
    routes: Map<number, { x: number; y: number }[]>;
}

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

    const tree = buildCompositionTree(partEls, model.relationships);
    const childrenOf = (id: string) =>
        (tree.childrenMap.get(id) ?? []).filter(cid => tree.elements.has(cid));

    // ── Port ownership: builder-set owner wins, else a composition edge ──
    const portOwner = new Map<string, string>();
    for (const [portId, portEl] of portEls) {
        if (portEl.owner && tree.elements.has(portEl.owner)) {
            portOwner.set(portId, portEl.owner);
        }
    }
    for (const rel of model.relationships) {
        if (!COMPOSITION_REL_TYPES.has(rel.type)) continue;
        if (portEls.has(rel.targetId) && tree.elements.has(rel.sourceId)
            && !portOwner.has(rel.targetId)) {
            portOwner.set(rel.targetId, rel.sourceId);
        }
    }
    // Ownerless ports are meaningless on an IBD — drop them
    for (const portId of [...portEls.keys()]) {
        if (!portOwner.has(portId)) portEls.delete(portId);
    }
    const portsByOwner = new Map<string, string[]>();
    for (const [portId, ownerId] of portOwner) {
        if (!portEls.has(portId)) continue;
        if (!portsByOwner.has(ownerId)) portsByOwner.set(ownerId, []);
        portsByOwner.get(ownerId)!.push(portId);
    }

    // ── Connector relationships ──
    const declaredRelTypes = options?.relationshipTypes?.length
        ? new Set(options.relationshipTypes.map(t => t.toLowerCase()))
        : undefined;
    const isEndpointVisible = (id: string) => portEls.has(id) || tree.elements.has(id);
    const connectors = model.relationships.filter(rel =>
        !COMPOSITION_REL_TYPES.has(rel.type)
        && (!declaredRelTypes || declaredRelTypes.has(rel.type.toLowerCase()))
        && isEndpointVisible(rel.sourceId) && isEndpointVisible(rel.targetId)
        && rel.sourceId !== rel.targetId
    );

    /** The part box a connector endpoint anchors to (port → its owner). */
    const liftToPart = (id: string): string => portOwner.get(id) ?? id;

    /** part id → its composition parent (within the visible tree) */
    const parentOf = new Map<string, string>();
    for (const [p, cs] of tree.childrenMap) {
        for (const c of cs) parentOf.set(c, p);
    }

    // ── Recursive bottom-up sizing: flat ELK pass per container ──
    const layouts = new Map<string, PartLayout>();

    /** A port's role on its owner's boundary, for layer pinning. */
    const portRole = (portId: string): 'in' | 'out' => {
        const declared = portDirection(portEls.get(portId)!);
        if (declared === 'in') return 'in';
        if (declared === 'out') return 'out';
        let src = 0, tgt = 0;
        for (const rel of connectors) {
            if (rel.sourceId === portId) src++;
            if (rel.targetId === portId) tgt++;
        }
        return tgt > src ? 'out' : 'in';
    };

    const layoutPart = async (partId: string): Promise<PartLayout> => {
        const kids = childrenOf(partId);
        if (kids.length === 0) {
            const el = tree.elements.get(partId)!;
            const l: PartLayout = {
                width: leafWidth(el), height: LEAF_HEIGHT,
                childPos: new Map(), portPos: new Map(), routes: new Map(),
            };
            layouts.set(partId, l);
            return l;
        }

        const kidLayouts = new Map<string, PartLayout>();
        for (const cid of kids) kidLayouts.set(cid, await layoutPart(cid));

        // ELK graph: child parts plus this container's own boundary ports as
        // layer-pinned pseudo-nodes (in → first layer, out → last), so ELK
        // both places the ports and routes port↔part connectors around boxes
        const ownPorts = portsByOwner.get(partId) ?? [];
        const kidSet = new Set(kids);
        const ownPortSet = new Set(ownPorts);
        // walk up until we hit a direct child of this container
        const liftHere = (id: string): string | undefined => {
            if (ownPortSet.has(id)) return id;
            let cur: string | undefined = liftToPart(id);
            while (cur && !kidSet.has(cur)) cur = parentOf.get(cur);
            return cur;
        };
        const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];
        connectors.forEach((rel, i) => {
            const s = liftHere(rel.sourceId);
            const t = liftHere(rel.targetId);
            if (s && t && s !== t) elkEdges.push({ id: `ic-${i}`, sources: [s], targets: [t] });
        });

        const layouted = await elk.layout({
            id: `container-${partId}`,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.edgeRouting': 'ORTHOGONAL',
                'elk.spacing.nodeNode': '44',
                'elk.layered.spacing.nodeNodeBetweenLayers': '84',
                'elk.spacing.edgeNode': '28',
                'elk.spacing.edgeEdge': '14',
                'elk.separateConnectedComponents': 'true',
                'elk.spacing.componentComponent': '48',
            },
            children: [
                ...kids.map(cid => ({
                    id: cid,
                    width: kidLayouts.get(cid)!.width,
                    height: kidLayouts.get(cid)!.height,
                })),
                ...ownPorts.map(pid => ({
                    id: pid,
                    width: PORT_SIZE,
                    height: PORT_SIZE,
                    layoutOptions: {
                        'elk.layered.layering.layerConstraint':
                            portRole(pid) === 'in' ? 'FIRST' : 'LAST',
                    },
                })),
            ],
            edges: elkEdges,
        } as any);

        const childPos = new Map<string, { x: number; y: number }>();
        const rawPortPos = new Map<string, { x: number; y: number }>();
        let maxX = 0, maxY = 0;
        for (const c of layouted.children ?? []) {
            const x = (c.x ?? 0) + PAD_SIDE;
            const y = (c.y ?? 0) + PAD_TOP;
            if (ownPortSet.has(c.id)) {
                rawPortPos.set(c.id, { x, y });
                // ports keep ELK's y — grow the container instead of clamping
                maxY = Math.max(maxY, y + PORT_SIZE);
                continue;
            }
            childPos.set(c.id, { x, y });
            maxX = Math.max(maxX, x + (c.width ?? 0));
            maxY = Math.max(maxY, y + (c.height ?? 0));
        }
        // ELK edge routes in local coords (before boundary snapping) — their
        // bend points can extend past the node extents, so they count toward
        // the container's size or they'd escape the frame
        const rawRoutes = new Map<number, { x: number; y: number }[]>();
        for (const e of (layouted.edges ?? []) as any[]) {
            const relIndex = Number(String(e.id).slice(3));
            const sec = e.sections?.[0];
            if (!sec) continue;
            const pts = [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint]
                .map((p: { x: number; y: number }) => ({ x: p.x + PAD_SIDE, y: p.y + PAD_TOP }));
            for (const p of pts) {
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            rawRoutes.set(relIndex, pts);
        }

        const el = tree.elements.get(partId)!;
        const width = Math.max(maxX + PAD_SIDE, leafWidth(el));
        const height = Math.max(maxY + PAD_BOTTOM, LEAF_HEIGHT);

        // Snap ports onto the boundary: in-ports straddle the left edge,
        // out-ports the right, keeping ELK's crossing-minimized y
        const portPos = new Map<string, { x: number; y: number; side: PortSide }>();
        for (const pid of ownPorts) {
            const raw = rawPortPos.get(pid);
            const side: PortSide = portRole(pid) === 'in' ? 'left' : 'right';
            portPos.set(pid, {
                x: side === 'left' ? -PORT_SIZE / 2 : width - PORT_SIZE / 2,
                y: raw?.y ?? PAD_TOP,
                side,
            });
        }

        // Slide route endpoints horizontally onto the snapped port's inner
        // edge — y is ELK's own, so segments stay orthogonal
        const routes = new Map<number, { x: number; y: number }[]>();
        const innerX = (p: { x: number; side: PortSide }) =>
            p.side === 'left' ? p.x + PORT_SIZE : p.x;
        for (const e of (layouted.edges ?? []) as any[]) {
            const relIndex = Number(String(e.id).slice(3));
            const pts = rawRoutes.get(relIndex);
            if (!pts) continue;
            const srcPort = ownPortSet.has(e.sources?.[0]) ? portPos.get(e.sources[0]) : undefined;
            const tgtPort = ownPortSet.has(e.targets?.[0]) ? portPos.get(e.targets[0]) : undefined;
            if (srcPort) pts[0] = { x: innerX(srcPort), y: pts[0].y };
            if (tgtPort) pts[pts.length - 1] = { x: innerX(tgtPort), y: pts[pts.length - 1].y };
            routes.set(relIndex, pts);
        }

        const l: PartLayout = { width, height, childPos, portPos, routes };
        layouts.set(partId, l);
        return l;
    };

    const roots = tree.roots.filter(id => tree.elements.has(id));
    for (const rootId of roots) await layoutPart(rootId);

    // ── Place roots side by side ──
    const rootPos = new Map<string, { x: number; y: number }>();
    let cursorX = 0;
    for (const rootId of roots) {
        const l = layouts.get(rootId)!;
        rootPos.set(rootId, { x: cursorX, y: 0 });
        cursorX += l.width + 72;
    }

    // ── Absolute rects (for port-side inference) ──
    const absRect = new Map<string, { x: number; y: number; w: number; h: number }>();
    const resolveAbs = (partId: string, origin: { x: number; y: number }) => {
        const l = layouts.get(partId)!;
        absRect.set(partId, { x: origin.x, y: origin.y, w: l.width, h: l.height });
        for (const [cid, rel] of l.childPos) {
            resolveAbs(cid, { x: origin.x + rel.x, y: origin.y + rel.y });
        }
    };
    for (const rootId of roots) resolveAbs(rootId, rootPos.get(rootId)!);

    // ── Absolute orthogonal routes (per owning container) ──
    const absRoutes = new Map<number, { x: number; y: number }[]>();
    for (const [partId, l] of layouts) {
        const origin = absRect.get(partId);
        if (!origin) continue;
        for (const [i, pts] of l.routes) {
            absRoutes.set(i, pts.map(p => ({ x: p.x + origin.x, y: p.y + origin.y })));
        }
    }

    // ── Port placement ──
    // Container ports come straight from ELK (layer-pinned, boundary-snapped);
    // leaf-part ports face the average position of their connector partners.
    const portInfoByOwner = new Map<string, PortInfo[]>();

    for (const [ownerId, portIds] of portsByOwner) {
        const rect = absRect.get(ownerId);
        if (!rect) continue;

        const elkPorts = layouts.get(ownerId)?.portPos;
        if (elkPorts?.size) {
            portInfoByOwner.set(ownerId, portIds.map(portId => {
                const p = elkPorts.get(portId)!;
                const el = portEls.get(portId)!;
                return { id: portId, name: el.name, x: p.x, y: p.y, side: p.side, direction: portDirection(el) };
            }));
            continue;
        }

        // pick a side per port
        const sided = portIds.map(portId => {
            const partners: { x: number; y: number }[] = [];
            for (const rel of connectors) {
                const other = rel.sourceId === portId ? rel.targetId
                    : rel.targetId === portId ? rel.sourceId : undefined;
                if (!other) continue;
                const r = absRect.get(liftToPart(other));
                if (r) partners.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
            }
            const el = portEls.get(portId)!;
            const dir = portDirection(el);
            let side: PortSide;
            if (partners.length === 0) {
                side = dir === 'out' ? 'right' : 'left';
            } else {
                const avg = {
                    x: partners.reduce((s, p) => s + p.x, 0) / partners.length,
                    y: partners.reduce((s, p) => s + p.y, 0) / partners.length,
                };
                const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
                const dx = (avg.x - cx) / Math.max(rect.w / 2, 1);
                const dy = (avg.y - cy) / Math.max(rect.h / 2, 1);
                side = Math.abs(dx) >= Math.abs(dy)
                    ? (dx < 0 ? 'left' : 'right')
                    : (dy < 0 ? 'top' : 'bottom');
            }
            const sortKey = partners.length
                ? partners.reduce((s, p) => s + ((side === 'left' || side === 'right') ? p.y : p.x), 0) / partners.length
                : 0;
            return { portId, side, dir, sortKey };
        });

        // distribute each side's ports evenly, ordered by partner position
        const infos: PortInfo[] = [];
        for (const side of ['left', 'right', 'top', 'bottom'] as PortSide[]) {
            const group = sided.filter(p => p.side === side).sort((a, b) => a.sortKey - b.sortKey);
            group.forEach((p, i) => {
                const along = (i + 1) / (group.length + 1);
                const el = portEls.get(p.portId)!;
                let x: number, y: number;
                if (side === 'left') { x = -PORT_SIZE / 2; y = PAD_TOP / 2 + along * (rect.h - PAD_TOP / 2) - PORT_SIZE / 2; }
                else if (side === 'right') { x = rect.w - PORT_SIZE / 2; y = PAD_TOP / 2 + along * (rect.h - PAD_TOP / 2) - PORT_SIZE / 2; }
                else if (side === 'top') { x = along * rect.w - PORT_SIZE / 2; y = -PORT_SIZE / 2; }
                else { x = along * rect.w - PORT_SIZE / 2; y = rect.h - PORT_SIZE / 2; }
                infos.push({ id: p.portId, name: el.name, x, y, side, direction: p.dir });
            });
        }
        portInfoByOwner.set(ownerId, infos);
    }

    // ── Emit ReactFlow nodes (parents before children, child coords relative) ──
    const nodes: Node[] = [];
    const emitPart = (partId: string, parentId?: string, relPos?: { x: number; y: number }) => {
        const el = tree.elements.get(partId)!;
        const l = layouts.get(partId)!;
        const color = LAYER_COLORS[el.layer] || '#666';
        const pos = relPos ?? rootPos.get(partId)!;
        const isContainer = l.childPos.size > 0;
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
                ports: portInfoByOwner.get(partId) ?? [],
            },
            style: { width: l.width, height: l.height },
        });
        for (const [cid, rel] of l.childPos) emitPart(cid, partId, rel);
    };
    for (const rootId of roots) emitPart(rootId);

    // ── Connector edges ──
    // ELK-routed connectors render their orthogonal waypoints via the
    // 'interconnectionEdge' type; anything ELK didn't route (cross-container
    // spans) falls back to a port-anchored smoothstep.
    const edges: Edge[] = connectors.map((rel, i) => {
        const sourceIsPort = portEls.has(rel.sourceId);
        const targetIsPort = portEls.has(rel.targetId);
        const source = sourceIsPort ? portOwner.get(rel.sourceId)! : rel.sourceId;
        const target = targetIsPort ? portOwner.get(rel.targetId)! : rel.targetId;
        const relColor = REL_COLORS[rel.type] || '#6B7280';
        // Labeled flows per the diagram quality bar: prefer the transported
        // item; fall back to the connector type except for the ubiquitous
        // exchange edges, whose repetition would drown the diagram
        const label = rel.flowItem
            || (rel.type.toLowerCase() === 'exchangeswith' ? undefined : rel.type);
        const route = absRoutes.get(i);
        return {
            id: `ic-e-${i}`,
            source,
            target,
            ...(sourceIsPort ? { sourceHandle: rel.sourceId } : {}),
            ...(targetIsPort ? { targetHandle: rel.targetId } : {}),
            ...(route
                ? { type: 'interconnectionEdge', data: { points: route } }
                : { type: 'smoothstep' }),
            label,
            animated: rel.type === 'flow',
            style: { stroke: relColor, strokeWidth: EDGE.defaultWidth },
            labelStyle: { fontSize: FONT.badge, fill: '#6B7280', fontWeight: 500 },
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            labelBgStyle: EDGE.labelBgStyle,
            markerEnd: {
                type: 'arrowclosed' as any,
                color: relColor,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

    return { nodes, edges };
}

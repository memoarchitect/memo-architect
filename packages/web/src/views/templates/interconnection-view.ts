// ─── Interconnection View Template (KK-3) ────────────────────────────────────
//
// Standard renderer template for the SysML v2 `interconnection` view kind:
// parts with ports on their boundary, typed connectors, nested containment.
//
// Hierarchy comes from the composition relationships among the view's parts
// (memo-sysmlv4 containment mode as the starting point). Port elements are
// pinned to their owner's boundary via ELK port placement; connectors whose
// endpoints are ports anchor to the matching handle. ELK routes the compound
// graph orthogonally so edges avoid node overlap.
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
    /** Position relative to the owning node (port center) */
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

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface InterconnectionOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view; when given, only these are drawn */
    relationshipTypes?: string[];
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
    if (partEls.length === 0 && portEls.size === 0) return { nodes: [], edges: [] };

    const tree = buildCompositionTree(partEls, model.relationships);

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
    const portsByOwner = new Map<string, string[]>();
    for (const [portId, ownerId] of portOwner) {
        if (!portsByOwner.has(ownerId)) portsByOwner.set(ownerId, []);
        portsByOwner.get(ownerId)!.push(portId);
    }
    const standalonePorts = [...portEls.keys()].filter(id => !portOwner.has(id));

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

    // ── ELK compound graph ──
    interface ElkNode {
        id: string;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        children?: ElkNode[];
        ports?: { id: string; width: number; height: number; x?: number; y?: number }[];
        layoutOptions?: Record<string, string>;
    }

    const elkPortsFor = (partId: string): ElkNode['ports'] => {
        const ids = portsByOwner.get(partId);
        if (!ids?.length) return undefined;
        return ids.map(id => ({ id, width: PORT_SIZE, height: PORT_SIZE }));
    };

    const buildElkNode = (partId: string): ElkNode => {
        const el = tree.elements.get(partId)!;
        const children = (tree.childrenMap.get(partId) ?? []).filter(id => tree.elements.has(id));
        const ports = elkPortsFor(partId);
        const base: ElkNode = {
            id: partId,
            ...(ports ? { ports, layoutOptions: { 'elk.portConstraints': 'FREE' } } : {}),
        };
        if (children.length === 0) {
            return {
                ...base,
                width: Math.max(el.name.length * 8 + 56, 170),
                height: 56,
            };
        }
        return {
            ...base,
            layoutOptions: {
                ...base.layoutOptions,
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.padding': '[top=48,left=28,bottom=28,right=28]',
                'elk.spacing.nodeNode': '36',
                'elk.layered.spacing.nodeNodeBetweenLayers': '56',
                'elk.edgeRouting': 'ORTHOGONAL',
            },
            children: children.map(buildElkNode),
        };
    };

    const elkGraph: ElkNode & { edges: { id: string; sources: string[]; targets: string[] }[] } = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': '48',
            'elk.layered.spacing.nodeNodeBetweenLayers': '72',
            'elk.spacing.edgeNode': '24',
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '64',
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        children: [
            ...tree.roots.filter(id => tree.elements.has(id)).map(buildElkNode),
            ...standalonePorts.map(id => ({ id, width: PORT_SIZE + 4, height: PORT_SIZE + 4 })),
        ],
        edges: connectors.map((rel, i) => ({
            id: `ic-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    const layouted = await elk.layout(elkGraph as any);

    // ── Flatten to ReactFlow nodes ──
    const nodes: Node[] = [];

    const portInfoFrom = (elkNode: any, nodeWidth: number, nodeHeight: number): PortInfo[] => {
        const infos: PortInfo[] = [];
        for (const p of elkNode.ports ?? []) {
            const el = portEls.get(p.id);
            if (!el) continue;
            const cx = (p.x ?? 0) + PORT_SIZE / 2;
            const cy = (p.y ?? 0) + PORT_SIZE / 2;
            const side: PortSide =
                cx <= 1 ? 'left'
                : cx >= nodeWidth - 1 ? 'right'
                : cy <= 1 ? 'top'
                : 'bottom';
            infos.push({
                id: p.id,
                name: el.name,
                x: p.x ?? 0,
                y: p.y ?? 0,
                side,
                direction: portDirection(el),
            });
        }
        return infos;
    };

    const flatten = (elkNode: any, parentId?: string) => {
        const el = tree.elements.get(elkNode.id);
        if (el) {
            const color = LAYER_COLORS[el.layer] || '#666';
            const hasChildren = !!elkNode.children?.length;
            const width = elkNode.width ?? 170;
            const height = elkNode.height ?? 56;
            nodes.push({
                id: elkNode.id,
                type: 'interconnectionNode',
                position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
                ...(parentId ? { parentId, extent: 'parent' as const } : {}),
                data: {
                    label: el.name,
                    kind: el.kind,
                    layer: el.layer,
                    color,
                    isContainer: hasChildren,
                    ports: portInfoFrom(elkNode, width, height),
                },
                style: { width, height },
            });
            for (const child of elkNode.children ?? []) flatten(child, elkNode.id);
            return;
        }
        const portEl = portEls.get(elkNode.id);
        if (portEl) {
            // Standalone port — no visible owner, rendered as a free port chip
            nodes.push({
                id: elkNode.id,
                type: 'interconnectionNode',
                position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
                ...(parentId ? { parentId, extent: 'parent' as const } : {}),
                data: {
                    label: portEl.name,
                    kind: portEl.kind,
                    layer: portEl.layer,
                    color: LAYER_COLORS[portEl.layer] || '#1ABC9C',
                    isContainer: false,
                    isFreePort: true,
                    ports: [],
                },
            });
        }
    };
    for (const top of layouted.children ?? []) flatten(top);

    // ── Connector edges (anchor port endpoints to the owner's handle) ──
    const edges: Edge[] = connectors.map((rel, i) => {
        const sourceOwner = portOwner.get(rel.sourceId);
        const targetOwner = portOwner.get(rel.targetId);
        const relColor = REL_COLORS[rel.type] || '#6B7280';
        // Labeled flows per the diagram quality bar: prefer the transported
        // item; fall back to the connector type except for the ubiquitous
        // exchange edges, whose repetition would drown the diagram
        const label = rel.flowItem
            || (rel.type.toLowerCase() === 'exchangeswith' ? undefined : rel.type);
        return {
            id: `ic-e-${i}`,
            source: sourceOwner ?? rel.sourceId,
            target: targetOwner ?? rel.targetId,
            ...(sourceOwner ? { sourceHandle: rel.sourceId } : {}),
            ...(targetOwner ? { targetHandle: rel.targetId } : {}),
            type: 'smoothstep',
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

/** Port square edge length — shared with InterconnectionNode rendering. */
export const INTERCONNECTION_PORT_SIZE = PORT_SIZE;

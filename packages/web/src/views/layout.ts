// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS, REL_COLORS, SEMANTIC_GROUPS, CONTAINMENT_DEPTH_COLORS } from '../constants';
import { SHADOW, RADIUS, EDGE, FONT } from '../styles/tokens';
import type { DecompositionNodeData } from './DecompositionNode';
import { pickCompartmentEntries } from './templates/composition-tree';

// Lazy singleton: the worker is only spawned on first layout, so importing
// this module (e.g. from template unit tests in node) stays side-effect free
let elkInstance: ELK | undefined;
function getElk(): ELK {
    if (!elkInstance) {
        elkInstance = new ELK({
            workerFactory: (_url: string) => new Worker(
                new URL('elkjs/lib/elk-worker.min.js', import.meta.url)
            ),
        } as any);
    }
    return elkInstance;
}

export const elk = {
    layout: (graph: Parameters<ELK['layout']>[0]) => getElk().layout(graph),
};

export interface LayoutResult {
    nodes: Node[];
    edges: Edge[];
}

export async function computeLayout(
    model: MemoModelDTO,
    options?: {
        viewpointFilter?: (el: MemoElement) => boolean;
        /** Relationship types declared by the view; when given, only these are drawn */
        relationshipTypes?: string[];
        /** Render attribute compartments on nodes (General view template) */
        compartments?: boolean;
    }
): Promise<LayoutResult> {
    const elements = Object.values(model.elements);
    const visibleElements = options?.viewpointFilter
        ? elements.filter(options.viewpointFilter)
        : elements;

    const visibleIds = new Set(visibleElements.map(e => e.id));

    const declaredRelTypes = options?.relationshipTypes?.length
        ? new Set(options.relationshipTypes.map(t => t.toLowerCase()))
        : undefined;

    const visibleRelationships = model.relationships.filter(
        r => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
            && (!declaredRelTypes || declaredRelTypes.has(r.type.toLowerCase()))
    );

    // Choose direction based on element count — vertical for smaller sets,
    // horizontal for very large models to avoid extreme height
    const n = visibleElements.length;
    const direction = n > 60 ? 'RIGHT' : 'DOWN';

    // Progressive spacing: larger models get tighter layout
    const nodeSpacing = n > 40 ? '24' : n > 20 ? '32' : '40';
    const layerSpacing = n > 40 ? '60' : n > 20 ? '80' : '100';

    // Estimate node width from the longer of name and kind label so long kind
    // tags (e.g. HARDWAREASSEMBLY) don't overflow the box
    const compartmentsByEl = options?.compartments
        ? new Map(visibleElements.map(el => [el.id, pickCompartmentEntries(el)]))
        : undefined;
    const nodeWidth = (el: MemoElement) =>
        Math.max(el.name.length * 7.5 + 48, el.kind.length * 6.8 + 48, 130);
    const nodeHeight = (el: MemoElement) => {
        const entries = compartmentsByEl?.get(el.id);
        return 52 + (entries?.length ? entries.length * 15 + 10 : 0);
    };

    // Build ELK graph — flat layout with relationship-driven layering
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction,
            'elk.spacing.nodeNode': nodeSpacing,
            'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing,
            'elk.layered.spacing.edgeNodeBetweenLayers': '24',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
            // Wrap long chains to prevent extreme width/height
            'elk.layered.wrapping.strategy': 'MULTI_EDGE',
            'elk.layered.wrapping.additionalEdgeSpacing': '16',
            // Pack disconnected islands into a compact block instead of a strip
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '56',
            'elk.aspectRatio': '1.6',
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        children: visibleElements.map(el => ({
            id: el.id,
            width: nodeWidth(el),
            height: nodeHeight(el),
        })),
        edges: visibleRelationships.map((rel, i) => ({
            id: `e-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    // Run ELK layout. The MULTI_EDGE wrapping scanline throws
    // "Invalid hitboxes for scanline constraint calculation" on some large
    // graphs (whole-model layouts) — retry without wrapping when ELK fails.
    let layouted: Awaited<ReturnType<typeof elk.layout>>;
    try {
        layouted = await elk.layout(elkGraph);
    } catch (err) {
        console.warn('ELK layout failed, retrying without edge wrapping:', err);
        delete (elkGraph.layoutOptions as Record<string, string>)['elk.layered.wrapping.strategy'];
        delete (elkGraph.layoutOptions as Record<string, string>)['elk.layered.wrapping.additionalEdgeSpacing'];
        layouted = await elk.layout(elkGraph);
    }

    // Convert to ReactFlow nodes — use 'diagramNode' type for interactive features
    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = model.elements[child.id];
        const color = LAYER_COLORS[el?.layer] || '#666';
        const compartments = compartmentsByEl?.get(child.id);
        return {
            id: child.id,
            type: 'diagramNode',
            position: { x: child.x || 0, y: child.y || 0 },
            data: {
                label: el?.name || child.id,
                kind: el?.kind ?? '',
                layer: el?.layer ?? '',
                construct: el?.construct,
                color,
                ...(compartments?.length ? { compartments } : {}),
            },
        };
    });

    // Convert to ReactFlow edges — styled by relationship type
    const edges: Edge[] = visibleRelationships.map((rel, i) => {
        const relColor = REL_COLORS[rel.type] || '#9CA3AF';
        const typeLower = rel.type.toLowerCase();
        const isFlow = rel.type === 'flow';
        const isSuccession = rel.type === 'succession';
        const isDecomp = typeLower === 'composedof' || typeLower === 'decomposedby'
            || typeLower === 'aggregation' || typeLower === 'composes';
        return {
            id: `e-${i}`,
            source: rel.sourceId,
            target: rel.targetId,
            // Structural edges are self-explanatory from the arrow — dropping
            // their repeated labels is what keeps dense trees readable
            label: isDecomp ? undefined : rel.type,
            type: isSuccession ? 'smoothstep' : 'default',
            animated: isFlow,
            style: {
                stroke: relColor,
                strokeWidth: isDecomp ? 2.5 : isFlow ? 2 : EDGE.defaultWidth,
                strokeDasharray: isDecomp ? undefined : isFlow ? undefined : rel.type === 'traceTo' ? '5 3' : undefined,
            },
            labelStyle: {
                fontSize: '10px',
                fill: '#6B7280',
                fontWeight: 500,
            },
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            labelBgStyle: EDGE.labelBgStyle,
            markerEnd: {
                type: isDecomp ? 'arrow' as any : 'arrowclosed' as any,
                color: relColor,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

    return { nodes, edges };
}

// ─── Decomposition Layout ─────────────────────────────────────────────────────
//
// Builds a containment tree from composedOf/aggregation relationships,
// then renders as either IBD (nested boxes) or Tree (hierarchy with edges).
// ─────────────────────────────────────────────────────────────────────────────

/** Structural element kinds eligible for decomposition diagrams */
const STRUCTURAL_KINDS = new Set<string>();
for (const g of SEMANTIC_GROUPS) {
    if (['logical', 'physical'].includes(g.id)) {
        for (const k of g.kinds) STRUCTURAL_KINDS.add(k);
    }
}

export interface DecompositionTree {
    roots: string[];
    childrenMap: Map<string, string[]>;
    elements: Map<string, MemoElement>;
}

export function buildDecompositionTree(model: MemoModelDTO): DecompositionTree {
    const elements = new Map<string, MemoElement>();
    for (const el of Object.values(model.elements)) {
        if (STRUCTURAL_KINDS.has(el.kind)) {
            elements.set(el.id, el);
        }
    }

    // Build parent→children map from composedOf/aggregation relationships
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of model.relationships) {
        if ((rel.type === 'composedOf' || rel.type === 'aggregation') &&
            elements.has(rel.sourceId) && elements.has(rel.targetId)) {
            // source=whole/parent, target=part/child
            if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
            childrenMap.get(rel.sourceId)!.push(rel.targetId);
            hasParent.add(rel.targetId);
        }
    }

    // Roots = structural elements with no parent
    const roots = [...elements.keys()].filter(id => !hasParent.has(id));

    return { roots, childrenMap, elements };
}

// ─── IBD Layout (nested containment) ──────────────────────────────────────────

interface ElkCompoundNode {
    id: string;
    width?: number;
    height?: number;
    children?: ElkCompoundNode[];
    layoutOptions?: Record<string, string>;
}

function buildElkCompoundGraph(
    nodeId: string,
    tree: DecompositionTree,
    depth: number,
    maxDepth: number,
): ElkCompoundNode {
    const el = tree.elements.get(nodeId)!;
    const children = tree.childrenMap.get(nodeId) || [];
    const isLeaf = children.length === 0 || depth >= maxDepth;
    const nodeWidth = Math.max(el.name.length * 8 + 40, 140);

    if (isLeaf) {
        return { id: nodeId, width: nodeWidth, height: 44 };
    }

    return {
        id: nodeId,
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.padding': '[top=44,left=16,bottom=16,right=16]',
            'elk.spacing.nodeNode': '20',
            'elk.layered.spacing.nodeNodeBetweenLayers': '30',
        },
        children: children
            .filter(cid => tree.elements.has(cid))
            .map(cid => buildElkCompoundGraph(cid, tree, depth + 1, maxDepth)),
    };
}

export async function computeIBDLayout(
    model: MemoModelDTO,
    options?: { maxDepth?: number }
): Promise<LayoutResult> {
    const maxDepth = options?.maxDepth ?? 99;
    const tree = buildDecompositionTree(model);

    if (tree.roots.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Build compound ELK graph
    const elkGraph: any = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '30',
            'elk.layered.spacing.nodeNodeBetweenLayers': '40',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        },
        children: tree.roots
            .filter(id => tree.elements.has(id))
            .map(id => buildElkCompoundGraph(id, tree, 0, maxDepth)),
    };

    const layouted = await elk.layout(elkGraph);

    // Flatten compound layout into ReactFlow nodes with parentId
    const nodes: Node[] = [];

    function flattenNodes(elkNode: any, parentId?: string) {
        const el = tree.elements.get(elkNode.id);
        if (!el) return;

        const color = LAYER_COLORS[el.layer] || '#666';
        const hasChildren = elkNode.children && elkNode.children.length > 0;

        const node: Node = {
            id: elkNode.id,
            position: { x: elkNode.x || 0, y: elkNode.y || 0 },
            data: {
                label: el.name,
                kind: el.kind,
                layer: el.layer,
                color,
            },
            ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            style: hasChildren ? {
                width: elkNode.width,
                height: elkNode.height,
                background: color + '08',
                border: `1.5px solid ${color}40`,
                borderRadius: '10px',
                padding: '0',
                fontSize: '12px',
                fontWeight: 600,
                color: color,
            } : {
                background: '#FFFFFF',
                borderLeft: `3px solid ${color}`,
                borderTop: '1px solid #E5E5E0',
                borderRight: '1px solid #E5E5E0',
                borderBottom: '1px solid #E5E5E0',
                borderRadius: RADIUS.md,
                color: '#1a1a1a',
                fontSize: FONT.md,
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: SHADOW.md,
            },
        };

        nodes.push(node);

        if (elkNode.children) {
            for (const child of elkNode.children) {
                flattenNodes(child, elkNode.id);
            }
        }
    }

    for (const topNode of (layouted.children || [])) {
        flattenNodes(topNode);
    }

    return { nodes, edges: [] };
}

// ─── Tree/SBS Layout (hierarchical tree with edges) ───────────────────────────

export async function computeTreeLayout(
    model: MemoModelDTO,
    options?: { direction?: 'DOWN' | 'RIGHT' }
): Promise<LayoutResult> {
    const direction = options?.direction ?? 'DOWN';
    const tree = buildDecompositionTree(model);

    if (tree.roots.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Collect all elements that participate in the tree
    const treeIds = new Set<string>();
    function collectIds(id: string) {
        treeIds.add(id);
        for (const childId of (tree.childrenMap.get(id) || [])) {
            if (tree.elements.has(childId)) collectIds(childId);
        }
    }
    for (const rootId of tree.roots) {
        if (tree.elements.has(rootId)) collectIds(rootId);
    }

    // Build hierarchy edges
    const treeEdges: { id: string; sources: string[]; targets: string[] }[] = [];
    let edgeIdx = 0;
    for (const [parentId, children] of tree.childrenMap) {
        for (const childId of children) {
            if (treeIds.has(parentId) && treeIds.has(childId)) {
                treeEdges.push({
                    id: `te-${edgeIdx++}`,
                    sources: [parentId],
                    targets: [childId],
                });
            }
        }
    }

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'mrtree',
            'elk.direction': direction,
            'elk.spacing.nodeNode': '30',
            'elk.mrtree.searchOrder': 'DFS',
        },
        children: [...treeIds].map(id => {
            const el = tree.elements.get(id)!;
            return {
                id,
                width: Math.max(el.name.length * 8 + 40, 140),
                height: 44,
            };
        }),
        edges: treeEdges,
    };

    const layouted = await elk.layout(elkGraph);

    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = tree.elements.get(child.id)!;
        const color = LAYER_COLORS[el.layer] || '#666';
        return {
            id: child.id,
            position: { x: child.x || 0, y: child.y || 0 },
            data: {
                label: el.name,
                kind: el.kind,
                layer: el.layer,
                color,
            },
            style: {
                background: '#FFFFFF',
                borderLeft: `3px solid ${color}`,
                borderTop: '1px solid #E5E5E0',
                borderRight: '1px solid #E5E5E0',
                borderBottom: '1px solid #E5E5E0',
                borderRadius: RADIUS.md,
                color: '#1a1a1a',
                fontSize: FONT.md,
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: SHADOW.md,
            },
        };
    });

    const edges: Edge[] = treeEdges.map((te, i) => ({
        id: `tree-e-${i}`,
        source: te.sources[0],
        target: te.targets[0],
        label: 'composedOf',
        type: 'default',
        style: {
            stroke: REL_COLORS['composedOf'] || '#8E44AD',
            strokeWidth: EDGE.defaultWidth,
        },
        labelStyle: {
            fontSize: FONT.badge,
            fill: '#6B7280',
            fontWeight: 500,
        },
        labelBgPadding: EDGE.labelBgPadding,
        labelBgBorderRadius: EDGE.labelBgRadius,
        labelBgStyle: EDGE.labelBgStyle,
        markerEnd: {
            type: 'arrowclosed' as any,
            color: REL_COLORS['composedOf'] || '#8E44AD',
            width: EDGE.arrowSize,
            height: EDGE.arrowSize,
        },
    }));

    return { nodes, edges };
}

// ─── Interactive Decomposition Layout (tree with expand/collapse) ────────────
//
// Manual recursive layout (memo-sysmlv4 parity) instead of ELK: each node
// places its own children — below it (vertical) or in a column to its right
// (horizontal) — using recursively computed subtree extents. Positions are
// cached across re-layouts so expanding one node never moves the others;
// toggling a node's direction clears its descendants' cache entries.

const TREE_NODE_HEIGHT = 64;
const TREE_H_GAP = 100;          // horizontal gap between sibling subtrees (V mode)
const TREE_V_GAP = 110;          // vertical rank gap parent → children (V mode)
const TREE_HMODE_OFFSET = 300;   // children column offset right of parent (H mode)
const TREE_HMODE_V_GAP = 44;     // vertical gap between stacked children (H mode)

function treeNodeWidth(el: MemoElement): number {
    return Math.max(el.name.length * 8 + 80, 220);
}

export async function computeDecompositionLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        nodeDirections: Map<string, 'vertical' | 'horizontal'>;
        callbacks: {
            onToggleExpand: (id: string) => void;
            onToggleDirection: (id: string) => void;
        };
        /** Prebuilt hierarchy (view-kind templates); defaults to the structural tree */
        tree?: DecompositionTree;
        /** Sticky positions across re-layouts (canvas-owned); optional */
        positionCache?: Map<string, { x: number; y: number }>;
    }
): Promise<LayoutResult> {
    const tree = options.tree ?? buildDecompositionTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const cache = options.positionCache ?? new Map<string, { x: number; y: number }>();
    const direction = (id: string) => options.nodeDirections.get(id) || 'vertical';
    const childrenOf = (id: string) =>
        (tree.childrenMap.get(id) || []).filter(cid => tree.elements.has(cid));

    // Subtree extent given current expansion + per-node direction
    const dims = (id: string): { width: number; height: number } => {
        const el = tree.elements.get(id)!;
        const w = treeNodeWidth(el);
        const kids = childrenOf(id);
        if (!options.expandedNodes.has(id) || kids.length === 0) {
            return { width: w, height: TREE_NODE_HEIGHT };
        }
        const kd = kids.map(dims);
        if (direction(id) === 'vertical') {
            const totalW = kd.reduce((s, d) => s + d.width, 0) + (kd.length - 1) * TREE_H_GAP;
            const maxH = Math.max(...kd.map(d => d.height));
            return { width: Math.max(w, totalW), height: TREE_NODE_HEIGHT + TREE_V_GAP + maxH };
        }
        const maxW = Math.max(...kd.map(d => d.width));
        const totalH = kd.reduce((s, d) => s + d.height, 0) + (kd.length - 1) * TREE_HMODE_V_GAP;
        return { width: w + TREE_HMODE_OFFSET + maxW, height: Math.max(TREE_NODE_HEIGHT, totalH) };
    };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const compColor = REL_COLORS['composedOf'] || '#8E44AD';

    const place = (id: string, parentId: string | null, centerX: number, centerY: number) => {
        const el = tree.elements.get(id)!;
        const w = treeNodeWidth(el);
        const kids = childrenOf(id);
        const isExpanded = options.expandedNodes.has(id);

        // Cached position wins so already-placed nodes never jump
        let pos = cache.get(id);
        if (!pos) {
            pos = { x: centerX - w / 2, y: centerY - TREE_NODE_HEIGHT / 2 };
            cache.set(id, pos);
        }

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: LAYER_COLORS[el.layer] || '#666',
            isExpanded, hasChildren: kids.length > 0, childCount: kids.length,
            direction: direction(id),
            onToggleExpand: () => options.callbacks.onToggleExpand(id),
            onToggleDirection: () => options.callbacks.onToggleDirection(id),
            showDirectionButton: true, label: el.name,
        };
        nodes.push({
            id, type: 'decompositionNode',
            position: { x: pos.x, y: pos.y },
            data: nodeData as any,
            style: { width: w, height: TREE_NODE_HEIGHT },
        });

        if (parentId) {
            const parentDir = direction(parentId);
            edges.push({
                id: `decomp-${parentId}-${id}`, source: parentId, target: id,
                sourceHandle: parentDir === 'vertical' ? 'bottom' : 'right',
                targetHandle: parentDir === 'vertical' ? 'top' : 'left',
                type: 'smoothstep',
                style: { stroke: compColor, strokeWidth: EDGE.defaultWidth },
                markerEnd: {
                    type: 'arrowclosed' as any,
                    color: compColor,
                    width: EDGE.arrowSize,
                    height: EDGE.arrowSize,
                },
            });
        }

        if (!isExpanded || kids.length === 0) return;
        const kd = kids.map(dims);

        if (direction(id) === 'vertical') {
            // Children spread horizontally below the parent
            const totalW = kd.reduce((s, d) => s + d.width, 0) + (kd.length - 1) * TREE_H_GAP;
            let childX = pos.x + w / 2 - totalW / 2;
            const childCenterY = pos.y + TREE_NODE_HEIGHT + TREE_V_GAP + TREE_NODE_HEIGHT / 2;
            kids.forEach((cid, i) => {
                place(cid, id, childX + kd[i].width / 2, childCenterY);
                childX += kd[i].width + TREE_H_GAP;
            });
        } else {
            // Children stacked in a compact column to the right
            const childX = pos.x + w + TREE_HMODE_OFFSET;
            let childY = pos.y + TREE_NODE_HEIGHT + 20;
            kids.forEach((cid, i) => {
                const cel = tree.elements.get(cid)!;
                place(cid, id, childX + treeNodeWidth(cel) / 2, childY + TREE_NODE_HEIGHT / 2);
                childY += kd[i].height + TREE_HMODE_V_GAP;
            });
        }
    };

    let cursorX = 0;
    for (const rootId of tree.roots) {
        if (!tree.elements.has(rootId)) continue;
        const d = dims(rootId);
        place(rootId, null, cursorX + d.width / 2, 100);
        cursorX += d.width + TREE_H_GAP * 2;
    }

    return { nodes, edges };
}

// ─── Interactive Containment Layout (nested blocks with expand/collapse) ─────

const CONTAINMENT_NODE_WIDTH = 240;
const CONTAINMENT_NODE_HEIGHT = 80;
const CONTAINMENT_MARGIN = 20;

export function computeContainmentLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        callbacks: { onToggleExpand: (id: string) => void };
        /** Prebuilt hierarchy (view-kind templates); defaults to the structural tree */
        tree?: DecompositionTree;
    }
): LayoutResult {
    const tree = options.tree ?? buildDecompositionTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const allNodes: Node[] = [];

    function computeContainment(
        nodeId: string, parentId: string | null,
        depth: number, offsetX: number, offsetY: number,
    ): { width: number; height: number } {
        const el = tree.elements.get(nodeId);
        if (!el) return { width: 0, height: 0 };

        const color = LAYER_COLORS[el.layer] || '#666';
        const children = tree.childrenMap.get(nodeId) || [];
        const hasChildren = children.length > 0;
        const isExpanded = options.expandedNodes.has(nodeId);

        let containerWidth = CONTAINMENT_NODE_WIDTH;
        let containerHeight = CONTAINMENT_NODE_HEIGHT;

        if (isExpanded && hasChildren) {
            let curX = CONTAINMENT_MARGIN;
            let curY = CONTAINMENT_NODE_HEIGHT + CONTAINMENT_MARGIN;
            let maxRowHeight = 0;
            let maxRowWidth = 0;

            for (const childId of children) {
                if (!tree.elements.has(childId)) continue;
                const childResult = computeContainment(childId, nodeId, depth + 1, curX, curY);

                if (curX + childResult.width > 800 && curX > CONTAINMENT_MARGIN) {
                    curX = CONTAINMENT_MARGIN;
                    curY += maxRowHeight + CONTAINMENT_MARGIN;
                    maxRowHeight = 0;
                    removeDescendantNodes(childId);
                    computeContainment(childId, nodeId, depth + 1, curX, curY);
                }

                curX += childResult.width + CONTAINMENT_MARGIN;
                maxRowHeight = Math.max(maxRowHeight, childResult.height);
                maxRowWidth = Math.max(maxRowWidth, curX);
            }

            containerWidth = Math.max(CONTAINMENT_NODE_WIDTH, maxRowWidth);
            containerHeight = curY + maxRowHeight + CONTAINMENT_MARGIN;
        }

        const depthBgColor = CONTAINMENT_DEPTH_COLORS[depth % CONTAINMENT_DEPTH_COLORS.length];

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: color, isExpanded, hasChildren,
            childCount: children.length, direction: 'vertical',
            onToggleExpand: () => options.callbacks.onToggleExpand(nodeId),
            onToggleDirection: () => {},
            showDirectionButton: false, depthBgColor,
            isContainer: hasChildren, label: el.name,
        };

        allNodes.push({
            id: nodeId, type: 'decompositionNode',
            position: { x: offsetX, y: offsetY },
            ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            data: nodeData as any,
            style: {
                width: isExpanded && hasChildren ? containerWidth : CONTAINMENT_NODE_WIDTH,
                height: isExpanded && hasChildren ? containerHeight : CONTAINMENT_NODE_HEIGHT,
            },
        });

        return { width: containerWidth, height: containerHeight };
    }

    function removeDescendantNodes(nodeId: string) {
        const toRemove = new Set<string>([nodeId]);
        const collect = (id: string) => {
            for (const cid of (tree.childrenMap.get(id) || [])) {
                toRemove.add(cid); collect(cid);
            }
        };
        collect(nodeId);
        for (let i = allNodes.length - 1; i >= 0; i--) {
            if (toRemove.has(allNodes[i].id)) allNodes.splice(i, 1);
        }
    }

    let curX = 0;
    for (const rootId of tree.roots) {
        if (!tree.elements.has(rootId)) continue;
        const result = computeContainment(rootId, null, 0, curX, 0);
        curX += result.width + 40;
    }

    // ReactFlow resolves parentId against nodes earlier in the array, but the
    // recursion above emits children before their container — reorder so every
    // parent precedes its children or nesting silently breaks
    const byId = new Map(allNodes.map(n => [n.id, n]));
    const ordered: Node[] = [];
    const emitted = new Set<string>();
    const emit = (n: Node) => {
        if (emitted.has(n.id)) return;
        const parent = n.parentId ? byId.get(n.parentId) : undefined;
        if (parent) emit(parent);
        emitted.add(n.id);
        ordered.push(n);
    };
    for (const n of allNodes) emit(n);

    return { nodes: ordered, edges: [] };
}

// ─── Functional Breakdown Structure (FBS) Layout ────────────────────────────
//
// Builds a decomposition tree from functional kinds (Function,
// Function) linked by decomposedBy/composedOf relationships.
// ─────────────────────────────────────────────────────────────────────────────

/** Functional kinds eligible for FBS diagrams */
const FUNCTIONAL_KINDS = new Set<string>();
for (const g of SEMANTIC_GROUPS) {
    if (g.id === 'functions') {
        for (const k of g.kinds) FUNCTIONAL_KINDS.add(k);
    }
}

export interface FunctionalTree {
    roots: string[];
    childrenMap: Map<string, string[]>;
    elements: Map<string, MemoElement>;
}

export function buildFunctionalTree(model: MemoModelDTO): FunctionalTree {
    const elements = new Map<string, MemoElement>();
    for (const el of Object.values(model.elements)) {
        if (FUNCTIONAL_KINDS.has(el.kind)) {
            elements.set(el.id, el);
        }
    }

    // Build parent→children map from decomposedBy/composedOf relationships
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of model.relationships) {
        // decomposedBy: source=parent, target=child (parent decomposedBy child)
        // composedOf:   source=parent, target=child (parent composedOf child)
        if ((rel.type === 'decomposedBy' || rel.type === 'composedOf') &&
            elements.has(rel.sourceId) && elements.has(rel.targetId)) {
            if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
            childrenMap.get(rel.sourceId)!.push(rel.targetId);
            hasParent.add(rel.targetId);
        }
    }

    const roots = [...elements.keys()].filter(id => !hasParent.has(id));
    return { roots, childrenMap, elements };
}

/**
 * FBS layout with interactive expand/collapse — mirrors computeDecompositionLayout
 * but operates on functional elements rather than structural ones.
 */
export async function computeFBSLayout(
    model: MemoModelDTO,
    options: {
        expandedNodes: Set<string>;
        nodeDirections: Map<string, 'vertical' | 'horizontal'>;
        callbacks: {
            onToggleExpand: (id: string) => void;
            onToggleDirection: (id: string) => void;
        };
    }
): Promise<LayoutResult> {
    const tree = buildFunctionalTree(model);
    if (tree.roots.length === 0) return { nodes: [], edges: [] };

    const visibleIds = new Set<string>();
    const visibleEdges: { parentId: string; childId: string }[] = [];

    function collectVisible(id: string) {
        if (!tree.elements.has(id)) return;
        visibleIds.add(id);
        if (options.expandedNodes.has(id)) {
            for (const childId of (tree.childrenMap.get(id) || [])) {
                if (tree.elements.has(childId)) {
                    visibleEdges.push({ parentId: id, childId });
                    collectVisible(childId);
                }
            }
        }
    }
    for (const rootId of tree.roots) collectVisible(rootId);

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'mrtree',
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '40',
            'elk.mrtree.searchOrder': 'DFS',
        },
        children: [...visibleIds].map(id => {
            const el = tree.elements.get(id)!;
            return { id, width: Math.max(el.name.length * 8 + 80, 220), height: 56 };
        }),
        edges: visibleEdges.map((e, i) => ({
            id: `fbs-${i}`, sources: [e.parentId], targets: [e.childId],
        })),
    };

    const layouted = await elk.layout(elkGraph);

    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = tree.elements.get(child.id)!;
        const color = LAYER_COLORS[el.layer] || '#E67E22';
        const childCount = (tree.childrenMap.get(child.id) || []).length;
        const direction = options.nodeDirections.get(child.id) || 'vertical';

        const nodeData: DecompositionNodeData = {
            element: el, layerColor: color,
            isExpanded: options.expandedNodes.has(child.id),
            hasChildren: childCount > 0, childCount, direction,
            onToggleExpand: () => options.callbacks.onToggleExpand(child.id),
            onToggleDirection: () => options.callbacks.onToggleDirection(child.id),
            showDirectionButton: true, label: el.name,
        };

        return {
            id: child.id, type: 'decompositionNode',
            position: { x: child.x || 0, y: child.y || 0 },
            data: nodeData as any,
        };
    });

    const edges: Edge[] = visibleEdges.map((e, i) => {
        const parentDir = options.nodeDirections.get(e.parentId) || 'vertical';
        return {
            id: `fbs-e-${i}`, source: e.parentId, target: e.childId,
            sourceHandle: parentDir === 'vertical' ? 'bottom' : 'right',
            targetHandle: parentDir === 'vertical' ? 'top' : 'left',
            type: 'default',
            style: { stroke: REL_COLORS['decomposedBy'] || '#D35400', strokeWidth: EDGE.defaultWidth },
            markerEnd: {
                type: 'arrowclosed' as any,
                color: REL_COLORS['decomposedBy'] || '#D35400',
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

    return { nodes, edges };
}


// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoRelationship, MemoModelDTO, ActionParameter } from '@memo/core';
import { LAYER_COLORS, REL_COLORS, SEMANTIC_GROUPS, CONTAINMENT_DEPTH_COLORS } from '../constants';
import { SHADOW, RADIUS, EDGE, FONT } from '../styles/tokens';
import type { DecompositionNodeData } from './DecompositionNode';
import type { ActionFlowNodeData } from './ActionFlowNode';

const elk = new ELK({
    workerFactory: (_url: string) => new Worker(
        new URL('elkjs/lib/elk-worker.min.js', import.meta.url)
    ),
} as any);

export interface LayoutResult {
    nodes: Node[];
    edges: Edge[];
}

export async function computeLayout(
    model: MemoModelDTO,
    options?: { viewpointFilter?: (el: MemoElement) => boolean }
): Promise<LayoutResult> {
    const elements = Object.values(model.elements);
    const visibleElements = options?.viewpointFilter
        ? elements.filter(options.viewpointFilter)
        : elements;

    const visibleIds = new Set(visibleElements.map(e => e.id));

    const visibleRelationships = model.relationships.filter(
        r => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
    );

    // Choose direction based on element count — vertical for smaller sets,
    // horizontal for very large models to avoid extreme height
    const n = visibleElements.length;
    const direction = n > 60 ? 'RIGHT' : 'DOWN';

    // Progressive spacing: larger models get tighter layout
    const nodeSpacing = n > 40 ? '24' : n > 20 ? '32' : '40';
    const layerSpacing = n > 40 ? '60' : n > 20 ? '80' : '100';

    // Estimate node width from name length for better layout
    const nodeWidth = (el: MemoElement) => Math.max(el.name.length * 7.5 + 48, 130);
    const nodeHeight = 52;

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
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        children: visibleElements.map(el => ({
            id: el.id,
            width: nodeWidth(el),
            height: nodeHeight,
        })),
        edges: visibleRelationships.map((rel, i) => ({
            id: `e-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    // Run ELK layout
    const layouted = await elk.layout(elkGraph);

    // Convert to ReactFlow nodes — use 'diagramNode' type for interactive features
    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = model.elements[child.id];
        const color = LAYER_COLORS[el?.layer] || '#666';
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
            },
        };
    });

    // Convert to ReactFlow edges — styled by relationship type
    const edges: Edge[] = visibleRelationships.map((rel, i) => {
        const relColor = REL_COLORS[rel.type] || '#9CA3AF';
        const isFlow = rel.type === 'flow';
        const isSuccession = rel.type === 'succession';
        const isDecomp = rel.type === 'composedOf' || rel.type === 'decomposedBy' || rel.type === 'aggregation';
        return {
            id: `e-${i}`,
            source: rel.sourceId,
            target: rel.targetId,
            label: rel.type,
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

export async function computeDecompositionLayout(
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
    const tree = buildDecompositionTree(model);
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
            id: `de-${i}`, sources: [e.parentId], targets: [e.childId],
        })),
    };

    const layouted = await elk.layout(elkGraph);

    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = tree.elements.get(child.id)!;
        const color = LAYER_COLORS[el.layer] || '#666';
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
            id: `decomp-e-${i}`, source: e.parentId, target: e.childId,
            sourceHandle: parentDir === 'vertical' ? 'bottom' : 'right',
            targetHandle: parentDir === 'vertical' ? 'top' : 'left',
            type: 'default',
            style: { stroke: REL_COLORS['composedOf'] || '#8E44AD', strokeWidth: EDGE.defaultWidth },
            markerEnd: {
                type: 'arrowclosed' as any,
                color: REL_COLORS['composedOf'] || '#8E44AD',
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
    });

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
    }
): LayoutResult {
    const tree = buildDecompositionTree(model);
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

    return { nodes: allNodes, edges: [] };
}

// ─── Functional Breakdown Structure (FBS) Layout ────────────────────────────
//
// Builds a decomposition tree from functional kinds (SystemFunction,
// ComponentFunction) linked by decomposedBy/composedOf relationships.
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

// ─── Action Flow Layout ─────────────────────────────────────────────────────
//
// Computes a left-to-right flow diagram for behavior viewpoint.
// Actions are grouped into swim lanes by their allocatedTo part/subsystem.
// Start/done pseudo-nodes use UML activity diagram conventions.
// Flows are directed arrows labeled with item type.
// Successions are thin gray ordering arrows.
// ─────────────────────────────────────────────────────────────────────────────

/** Lane colors for swim-lane assignment */
const LANE_COLORS = [
    '#4A90D9', '#E67E22', '#2ECC71', '#9B59B6',
    '#E74C3C', '#1ABC9C', '#F39C12', '#7B68EE',
];

/**
 * Build an action flow layout from behavior elements in the model.
 * Groups actions into swim lanes by allocation target.
 */
export async function computeActionFlowLayout(
    model: MemoModelDTO,
): Promise<LayoutResult> {
    // Collect behavior elements
    const allElements = Object.values(model.elements);
    const actionDefs = new Map<string, MemoElement>();
    const actionUsages: MemoElement[] = [];
    const compositeActions: MemoElement[] = [];

    for (const el of allElements) {
        if (el.kind === 'ActionDefinition') {
            actionDefs.set(el.id, el);
        } else if (el.kind === 'ActionUsage' || (el.construct === 'action' && el.parentAction)) {
            actionUsages.push(el);
        }
        // Top-level composite actions (no parent, no type = composite)
        if (el.construct === 'action' && !el.parentAction && el.kind === 'ActionUsage') {
            compositeActions.push(el);
        }
    }

    // If no behavior elements, return empty
    if (actionUsages.length === 0 && compositeActions.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Collect the nested action usages (those with parentAction set)
    const nestedActions = actionUsages.filter(el => el.parentAction);
    // Include composite actions (parentless ActionUsage) only if no nested ones exist
    const diagramActions = nestedActions.length > 0 ? nestedActions : actionUsages;

    // Build allocation lanes
    const laneMap = new Map<string, MemoElement[]>(); // laneName → elements
    const laneColorMap = new Map<string, string>();
    let laneIdx = 0;

    for (const el of diagramActions) {
        const lane = el.allocatedTo || 'Unallocated';
        if (!laneMap.has(lane)) {
            laneMap.set(lane, []);
            laneColorMap.set(lane, LANE_COLORS[laneIdx % LANE_COLORS.length]);
            laneIdx++;
        }
        laneMap.get(lane)!.push(el);
    }

    // Find action definition parameters for each nested action
    const actionParamsMap = new Map<string, { inPorts: string[]; outPorts: string[] }>();
    for (const el of diagramActions) {
        // The action's type references an ActionDefinition
        const defId = findActionDefId(el, model);
        const def = defId ? actionDefs.get(defId) : undefined;
        const params = def?.parameters || [];
        actionParamsMap.set(el.id, {
            inPorts: params.filter(p => p.direction === 'in' || p.direction === 'inout').map(p => p.name),
            outPorts: params.filter(p => p.direction === 'out' || p.direction === 'inout').map(p => p.name),
        });
    }

    // Determine composite action for start/done pseudo-nodes
    const parentActionId = nestedActions.length > 0 ? nestedActions[0].parentAction : undefined;

    // Collect flow and succession relationships
    const flowRels = model.relationships.filter(r => r.type === 'flow');
    const succRels = model.relationships.filter(r => r.type === 'succession');

    // Determine if we need start/done pseudo-nodes
    const startId = parentActionId ? `${parentActionId}__start` : '__start';
    const doneId = parentActionId ? `${parentActionId}__done` : '__done';
    const hasStart = succRels.some(r => r.sourceId === startId);
    const hasDone = succRels.some(r => r.targetId === doneId);

    // Build ELK graph
    const portHeight = 18;
    const elkChildren: any[] = [];
    const actionIds = new Set(diagramActions.map(a => a.id));

    // Add pseudo-nodes
    if (hasStart) {
        elkChildren.push({ id: startId, width: 24, height: 24 });
        actionIds.add(startId);
    }
    if (hasDone) {
        elkChildren.push({ id: doneId, width: 24, height: 24 });
        actionIds.add(doneId);
    }

    // Add action nodes
    for (const el of diagramActions) {
        const ports = actionParamsMap.get(el.id) || { inPorts: [], outPorts: [] };
        const portCount = Math.max(ports.inPorts.length, ports.outPorts.length, 0);
        const headerHeight = 36;
        const bodyHeight = portCount * portHeight;
        const allocBadgeHeight = el.allocatedTo ? 20 : 0;
        const nodeHeight = headerHeight + bodyHeight + (bodyHeight > 0 ? 8 : 0) + allocBadgeHeight;
        const nodeWidth = Math.max(el.name.length * 9 + 40, 140);

        elkChildren.push({
            id: el.id,
            width: nodeWidth,
            height: nodeHeight,
        });
    }

    // Build ELK edges from flows and successions
    const elkEdges: any[] = [];
    let edgeIdx = 0;

    for (const rel of flowRels) {
        if (actionIds.has(rel.sourceId) && actionIds.has(rel.targetId)) {
            elkEdges.push({
                id: `ef-${edgeIdx++}`,
                sources: [rel.sourceId],
                targets: [rel.targetId],
            });
        }
    }
    for (const rel of succRels) {
        if (actionIds.has(rel.sourceId) && actionIds.has(rel.targetId)) {
            elkEdges.push({
                id: `es-${edgeIdx++}`,
                sources: [rel.sourceId],
                targets: [rel.targetId],
            });
        }
    }

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '40',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        },
        children: elkChildren,
        edges: elkEdges,
    };

    const layouted = await elk.layout(elkGraph);

    // Convert to ReactFlow nodes
    const nodes: Node[] = (layouted.children || []).map(child => {
        // Start pseudo-node
        if (child.id === startId) {
            const nodeData: ActionFlowNodeData = {
                label: 'Start',
                nodeType: 'start',
                laneColor: '#374151',
                layerColor: '#374151',
                inPorts: [],
                outPorts: [],
            };
            return {
                id: child.id,
                type: 'actionFlowNode',
                position: { x: child.x || 0, y: child.y || 0 },
                data: nodeData as any,
            };
        }

        // Done pseudo-node
        if (child.id === doneId) {
            const nodeData: ActionFlowNodeData = {
                label: 'Done',
                nodeType: 'done',
                laneColor: '#374151',
                layerColor: '#374151',
                inPorts: [],
                outPorts: [],
            };
            return {
                id: child.id,
                type: 'actionFlowNode',
                position: { x: child.x || 0, y: child.y || 0 },
                data: nodeData as any,
            };
        }

        // Action node
        const el = model.elements[child.id];
        const ports = actionParamsMap.get(child.id) || { inPorts: [], outPorts: [] };
        const lane = el?.allocatedTo || 'Unallocated';
        const color = laneColorMap.get(lane) || '#9CA3AF';
        const layerColor = LAYER_COLORS[el?.layer] || '#FF6B6B';

        const nodeData: ActionFlowNodeData = {
            element: el,
            label: el?.name || child.id,
            nodeType: 'action',
            parameters: el?.parameters,
            allocatedTo: el?.allocatedTo,
            laneColor: color,
            layerColor,
            inPorts: ports.inPorts,
            outPorts: ports.outPorts,
        };

        return {
            id: child.id,
            type: 'actionFlowNode',
            position: { x: child.x || 0, y: child.y || 0 },
            data: nodeData as any,
        };
    });

    // Convert to ReactFlow edges
    const edges: Edge[] = [];

    // Flow edges: bezier, animated, labeled with item type
    for (const rel of flowRels) {
        if (!actionIds.has(rel.sourceId) || !actionIds.has(rel.targetId)) continue;
        const isSignalOrInfo = rel.flowItem
            ? /signal|error|status|code|report|alarm|response|command|data|reading/i.test(rel.flowItem)
            : false;

        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            label: rel.flowItem || '',
            type: 'default',
            animated: true,
            style: {
                stroke: '#3498DB',
                strokeWidth: EDGE.flowWidth,
                strokeDasharray: isSignalOrInfo ? '6 3' : undefined,
            },
            labelStyle: {
                fontSize: FONT.badge,
                fill: '#4A90D9',
                fontWeight: 600,
            },
            labelBgStyle: EDGE.labelBgStyle,
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            markerEnd: {
                type: 'arrowclosed' as any,
                color: '#3498DB',
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        });
    }

    // Succession edges: smoothstep (right-angle routing for temporal ordering)
    for (const rel of succRels) {
        if (!actionIds.has(rel.sourceId) || !actionIds.has(rel.targetId)) continue;
        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            type: 'smoothstep',
            animated: false,
            style: {
                stroke: '#D1D5DB',
                strokeWidth: EDGE.successionWidth,
                strokeDasharray: '4 4',
            },
            markerEnd: {
                type: 'arrowclosed' as any,
                color: '#D1D5DB',
                width: 12,
                height: 12,
            },
        });
    }

    return { nodes, edges };
}

/**
 * Find the ActionDefinition id referenced by an action usage.
 * Checks relationships, model elements, and uses naming conventions.
 */
function findActionDefId(usage: MemoElement, model: MemoModelDTO): string | undefined {
    // Look for an action definition with the same type reference
    // The usage's kind might map to an ActionDefinition in the model
    for (const el of Object.values(model.elements)) {
        if (el.kind === 'ActionDefinition') {
            // Check by incoming relationships
            const rels = model.relationships.filter(
                r => r.sourceId === usage.id && r.targetId === el.id && r.type === 'traceTo'
            );
            if (rels.length > 0) return el.id;
        }
    }

    // Fallback: look for an ActionDefinition whose name matches the usage's type
    // The builder stores the type in the kind field for typed usages
    if (usage.kind !== 'ActionUsage') {
        const def = model.elements[usage.kind];
        if (def?.kind === 'ActionDefinition') return def.id;
    }

    // Check all ActionDefinitions to find one whose name was used as the usage type
    for (const el of Object.values(model.elements)) {
        if (el.kind === 'ActionDefinition') {
            // Match if any relationship connects usage to this def
            // or if usage attributes reference this def's name
        }
    }

    return undefined;
}

// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoRelationship, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS, REL_COLORS, SEMANTIC_GROUPS, CONTAINMENT_DEPTH_COLORS } from '../constants';
import type { DecompositionNodeData } from './DecompositionNode';

const elk = new ELK();

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
    const direction = visibleElements.length > 60 ? 'RIGHT' : 'DOWN';

    // Tighter spacing for compact layout
    const nodeSpacing = visibleElements.length > 40 ? '20' : '30';
    const layerSpacing = visibleElements.length > 40 ? '50' : '60';

    // Build ELK graph — flat layout with relationship-driven layering
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction,
            'elk.spacing.nodeNode': nodeSpacing,
            'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing,
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            // Wrap long chains to prevent extreme width/height
            'elk.layered.wrapping.strategy': 'MULTI_EDGE',
            'elk.layered.wrapping.additionalEdgeSpacing': '20',
        },
        children: visibleElements.map(el => ({
            id: el.id,
            width: Math.max(el.name.length * 8 + 40, 120),
            height: 44,
        })),
        edges: visibleRelationships.map((rel, i) => ({
            id: `e-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    // Run ELK layout
    const layouted = await elk.layout(elkGraph);

    // Convert to ReactFlow nodes — compact cards with layer-color left border
    const nodes: Node[] = (layouted.children || []).map(child => {
        const el = model.elements[child.id];
        const color = LAYER_COLORS[el?.layer] || '#666';
        return {
            id: child.id,
            position: { x: child.x || 0, y: child.y || 0 },
            data: {
                label: el?.name || child.id,
                kind: el?.kind,
                layer: el?.layer,
                construct: el?.construct,
                color,
            },
            style: {
                background: '#FFFFFF',
                borderLeft: `3px solid ${color}`,
                borderTop: '1px solid #E5E5E0',
                borderRight: '1px solid #E5E5E0',
                borderBottom: '1px solid #E5E5E0',
                borderRadius: '8px',
                color: '#1a1a1a',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            },
        };
    });

    // Convert to ReactFlow edges
    const edges: Edge[] = visibleRelationships.map((rel, i) => ({
        id: `e-${i}`,
        source: rel.sourceId,
        target: rel.targetId,
        label: rel.type,
        type: 'smoothstep',
        animated: rel.type === 'mitigates' || rel.type === 'verify',
        style: {
            stroke: REL_COLORS[rel.type] || '#9CA3AF',
            strokeWidth: 1.5,
        },
        labelStyle: {
            fontSize: '10px',
            fill: '#6B7280',
            fontWeight: 500,
        },
    }));

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
                borderRadius: '8px',
                color: '#1a1a1a',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                borderRadius: '8px',
                color: '#1a1a1a',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 14px',
                minWidth: '100px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            },
        };
    });

    const edges: Edge[] = treeEdges.map((te, i) => ({
        id: `tree-e-${i}`,
        source: te.sources[0],
        target: te.targets[0],
        label: 'composedOf',
        type: 'smoothstep',
        style: {
            stroke: REL_COLORS['composedOf'] || '#8E44AD',
            strokeWidth: 1.5,
        },
        labelStyle: {
            fontSize: '10px',
            fill: '#6B7280',
            fontWeight: 500,
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
            type: 'smoothstep',
            style: { stroke: REL_COLORS['composedOf'] || '#8E44AD', strokeWidth: 1.5 },
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

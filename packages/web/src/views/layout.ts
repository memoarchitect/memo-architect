// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoRelationship, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS, REL_COLORS } from '../constants';

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

    // Build ELK graph
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '40',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        },
        children: visibleElements.map(el => ({
            id: el.id,
            width: Math.max(el.name.length * 8 + 48, 130),
            height: 48,
        })),
        edges: visibleRelationships.map((rel, i) => ({
            id: `e-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    // Run ELK layout
    const layouted = await elk.layout(elkGraph);

    // Convert to ReactFlow nodes — rounded-rect cards with layer-color left border
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
                borderRadius: '10px',
                color: '#1a1a1a',
                fontSize: '12px',
                fontWeight: 500,
                padding: '10px 14px',
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

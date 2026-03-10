// ─── ELK Layout Helper ────────────────────────────────────────────────────────
//
// Converts MemoModel elements + relationships into ELK graph,
// runs the layout algorithm, and returns positioned ReactFlow nodes/edges.
// ─────────────────────────────────────────────────────────────────────────────

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoRelationship, MemoModelDTO } from '@memo/core';

const elk = new ELK();

const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

const CONSTRUCT_SHAPES: Record<string, string> = {
    part: 'default',
    requirement: 'default',
    action: 'default',
    port: 'default',
};

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

    // Convert to ReactFlow nodes
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
                background: color + '22',
                border: `2px solid ${color}`,
                borderRadius: el?.construct === 'action' ? '12px' : '4px',
                color: '#e2e8f0',
                fontSize: '12px',
                padding: '8px 16px',
                minWidth: '100px',
            },
        };
    });

    // Convert to ReactFlow edges
    const REL_COLORS: Record<string, string> = {
        mitigates: '#E74C3C',
        causes: '#C0392B',
        leadsTo: '#E74C3C',
        identifies: '#D35400',
        traceTo: '#4A90D9',
        satisfy: '#2ECC71',
        verify: '#27AE60',
        allocateTo: '#E67E22',
        aggregation: '#7B68EE',
        composedOf: '#8E44AD',
    };

    const edges: Edge[] = visibleRelationships.map((rel, i) => ({
        id: `e-${i}`,
        source: rel.sourceId,
        target: rel.targetId,
        label: rel.type,
        type: 'smoothstep',
        animated: rel.type === 'mitigates' || rel.type === 'verify',
        style: {
            stroke: REL_COLORS[rel.type] || '#64748b',
            strokeWidth: 1.5,
        },
        labelStyle: {
            fontSize: '10px',
            fill: '#94a3b8',
        },
    }));

    return { nodes, edges };
}

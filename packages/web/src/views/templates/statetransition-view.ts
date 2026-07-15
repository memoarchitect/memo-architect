// ─── State Transition View Template (KK-5) ───────────────────────────────────
//
// Standard renderer template for the SysML v2 `statetransition` view kind:
// states (composite states nested via the composition tree), transitions as
// edges with trigger [guard] / effect labels, and non-state behavior
// elements (properties, timing constraints) as side notes.
//
// Transition elements are modelled as parts carrying `sourceState` /
// `targetState` attributes that reference state *names* — they render as
// edges, not nodes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { EDGE, FONT } from '../../styles/tokens';
import { elk, type LayoutResult } from '../layout';
import { buildCompositionTree } from './composition-tree';

// ─── Classification ──────────────────────────────────────────────────────────

export interface StateTransitionElements {
    /** State and state-machine elements, rendered as (nested) state boxes */
    states: MemoElement[];
    /** Transition elements, rendered as edges */
    transitions: MemoElement[];
    /** Everything else in the view (properties, constraints) — note chips */
    annotations: MemoElement[];
}

/** A view element that renders as a transition edge. */
export function isTransitionElement(el: MemoElement): boolean {
    if (el.attributes['sourceState'] && el.attributes['targetState']) return true;
    return el.kind === 'Transition' || el.kind.endsWith('Transition');
}

/** A view element that renders as a state box (or composite region). */
export function isStateElement(el: MemoElement): boolean {
    return el.kind.endsWith('State') || el.kind.endsWith('Machine') || el.kind.endsWith('Mode');
}

export function classifyStateTransitionElements(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): StateTransitionElements {
    const all = Object.values(model.elements);
    const visible = viewpointFilter ? all.filter(viewpointFilter) : all;
    const states: MemoElement[] = [];
    const transitions: MemoElement[] = [];
    const annotations: MemoElement[] = [];
    for (const el of visible) {
        if (isTransitionElement(el)) transitions.push(el);
        else if (isStateElement(el)) states.push(el);
        else annotations.push(el);
    }
    return { states, transitions, annotations };
}

// ─── Transition edges ────────────────────────────────────────────────────────

export interface ResolvedTransition {
    element: MemoElement;
    sourceId: string;
    targetId: string;
    label: string;
}

const LABEL_MAX = 46;

function clip(text: string): string {
    return text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text;
}

/** UML-style compact label: trigger [guard] — prose guards are clipped. */
export function transitionLabel(el: MemoElement): string {
    const trigger = el.attributes['trigger'] ?? '';
    const guard = el.attributes['guardSummary'] ?? el.attributes['guard'] ?? '';
    const hasGuard = guard && !/^none\b/i.test(guard);
    const base = trigger || el.name;
    return clip(hasGuard ? `${base} [${guard}]` : base);
}

/**
 * Resolve transition elements onto the visible states: `sourceState` /
 * `targetState` match a state's display name or id. Transitions whose
 * endpoints are not in the view are dropped.
 */
export function resolveTransitions(
    transitions: MemoElement[],
    states: MemoElement[],
): ResolvedTransition[] {
    const byName = new Map<string, string>();
    for (const s of states) {
        byName.set(s.name, s.id);
        byName.set(s.id, s.id);
    }
    const resolved: ResolvedTransition[] = [];
    for (const t of transitions) {
        const sourceId = byName.get(t.attributes['sourceState'] ?? '');
        const targetId = byName.get(t.attributes['targetState'] ?? '');
        if (!sourceId || !targetId) continue;
        resolved.push({ element: t, sourceId, targetId, label: transitionLabel(t) });
    }
    return resolved;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const STATE_COLOR = '#FF6B6B';
const NOTE_COLOR = '#95A5A6';

export interface StateTransitionOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    layoutProviderId?: string;
}

export async function computeStateTransitionLayout(
    model: MemoModelDTO,
    options?: StateTransitionOptions,
): Promise<LayoutResult> {
    const { states, transitions, annotations } = classifyStateTransitionElements(
        model, options?.viewpointFilter,
    );
    if (states.length === 0 && annotations.length === 0) return { nodes: [], edges: [] };

    // Composite nesting from composition edges among the states/machines
    const tree = buildCompositionTree(states, model.relationships);
    const resolved = resolveTransitions(transitions, states);

    interface ElkNode {
        id: string;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        children?: ElkNode[];
        layoutOptions?: Record<string, string>;
    }

    const leafSize = (el: MemoElement) => ({
        width: Math.max(el.name.length * 7.5 + 56, 150),
        height: 54,
    });

    const buildElkNode = (id: string): ElkNode => {
        const el = tree.elements.get(id)!;
        const children = (tree.childrenMap.get(id) ?? []).filter(cid => tree.elements.has(cid));
        if (children.length === 0) return { id, ...leafSize(el) };
        return {
            id,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.padding': '[top=48,left=28,bottom=28,right=28]',
                'elk.spacing.nodeNode': '48',
                'elk.layered.spacing.nodeNodeBetweenLayers': '72',
                'elk.edgeRouting': 'ORTHOGONAL',
            },
            children: children.map(buildElkNode),
        };
    };

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': '56',
            'elk.layered.spacing.nodeNodeBetweenLayers': '96',
            'elk.spacing.edgeNode': '28',
            'elk.spacing.edgeLabel': '8',
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '64',
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        // Annotations are laid out manually below the machine (a grid),
        // keeping ELK focused on the connected state graph
        children: tree.roots.filter(id => tree.elements.has(id)).map(buildElkNode),
        edges: resolved.map((t, i) => ({
            id: `st-${i}`,
            sources: [t.sourceId],
            targets: [t.targetId],
        })),
    };

    const layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId }) as ElkNode;

    // ── Flatten to ReactFlow nodes ──
    const nodes: Node[] = [];
    const flatten = (elkNode: ElkNode, parentId?: string) => {
        const el = tree.elements.get(elkNode.id);
        if (el) {
            const isContainer = !!elkNode.children?.length;
            const isMachine = el.kind.endsWith('Machine');
            nodes.push({
                id: elkNode.id,
                type: 'stateNode',
                position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
                ...(parentId ? { parentId, extent: 'parent' as const } : {}),
                data: {
                    label: el.name,
                    kind: el.kind,
                    color: STATE_COLOR,
                    isContainer,
                    isMachine,
                    subtitle: el.attributes['modeKind'],
                },
                style: {
                    width: elkNode.width ?? 150,
                    height: elkNode.height ?? 54,
                },
            });
            for (const child of elkNode.children ?? []) flatten(child, elkNode.id);
            return;
        }
    };
    for (const top of layouted.children ?? []) flatten(top);

    // ── Annotation grid below the state graph ──
    if (annotations.length > 0) {
        let maxY = 0;
        let maxX = 800;
        for (const top of layouted.children ?? []) {
            maxY = Math.max(maxY, (top.y ?? 0) + (top.height ?? 0));
            maxX = Math.max(maxX, (top.x ?? 0) + (top.width ?? 0));
        }
        const noteWidth = 240;
        const noteHeight = 48;
        const gap = 14;
        const perRow = Math.max(2, Math.floor(maxX / (noteWidth + gap)));
        annotations.forEach((note, i) => {
            nodes.push({
                id: note.id,
                type: 'stateNode',
                position: {
                    x: (i % perRow) * (noteWidth + gap),
                    y: maxY + 56 + Math.floor(i / perRow) * (noteHeight + gap),
                },
                data: {
                    label: note.name,
                    kind: note.kind,
                    color: NOTE_COLOR,
                    isNote: true,
                },
                style: { width: noteWidth, height: noteHeight },
            });
        });
    }

    // ── Transition edges ──
    const edges: Edge[] = resolved.map((t, i) => ({
        // A transition is a first-class SysML model element, so preserve its
        // id to let an edge click open the transition's properties.
        id: t.element.id || `st-e-${i}`,
        source: t.sourceId,
        target: t.targetId,
        type: 'smoothstep',
        label: t.label,
        style: { stroke: STATE_COLOR, strokeWidth: EDGE.defaultWidth },
        labelStyle: { fontSize: FONT.badge, fill: '#6B7280', fontWeight: 500 },
        labelBgPadding: EDGE.labelBgPadding,
        labelBgBorderRadius: EDGE.labelBgRadius,
        labelBgStyle: EDGE.labelBgStyle,
        markerEnd: {
            type: 'arrowclosed' as never,
            color: STATE_COLOR,
            width: EDGE.arrowSize,
            height: EDGE.arrowSize,
        },
    }));

    return { nodes, edges };
}

// ─── State Transition View Template (KK-5) ───────────────────────────────────
//
// Standard renderer template for the SysML v2 `statetransition` view kind:
// states (composite states nested via the composition tree), transitions as
// edges with trigger [guard] / effect labels, and non-state behavior
// elements (properties, timing constraints) as side notes.
//
// Native transition usages carry `sourceState` / `targetState` as resolved
// state IDs. Older part-based models carry display names; resolveTransitions
// accepts both while fixtures migrate. They render as edges, not nodes.
// ─────────────────────────────────────────────────────────────────────────────

import type { NotationLayoutNode as Node, NotationLayoutEdge as Edge } from '../../diagram/notation-scene';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { EDGE, FONT } from '../../styles/tokens';
import {
    elk, finishConnectorRoutes,
    type LayoutResult, type RouteObstacle,
} from '../layout';
import { buildCompositionTree, type CompositionTree } from './composition-tree';

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
 * Resolve transition elements onto the visible states. Native transitions use
 * IDs; the display-name fallback keeps legacy part-based models renderable.
 * Transitions whose endpoints are not in the view are dropped.
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

// ─── Nesting projection ──────────────────────────────────────────────────────

/**
 * Which states a machine actually draws, once drill-down and collapse are
 * applied to the composition hierarchy.
 *
 * The two nesting modes are the same projection with different inputs:
 * *nested* keeps composites on the canvas and draws substates inside them,
 * *drill-down* re-roots the diagram at one composite so only its substates
 * are drawn. UML allows both; the model is identical either way.
 */
export interface StateProjection {
    /** States rendered as boxes. */
    visible: Set<string>;
    /** Hidden state → the visible ancestor its transitions lift onto. */
    liftTo: Map<string, string>;
    /** Visible state → how many descendants it is hiding. */
    hiddenCount: Map<string, number>;
    /** Top-level states of the projected diagram. */
    roots: string[];
}

export interface StateNestingOptions {
    /** Drill down: draw only this composite's substates (UML sub-machine view). */
    focusStateId?: string;
    /** Composites drawn as a single box, their substates folded away. */
    collapsedStateIds?: ReadonlySet<string>;
}

export function projectStateHierarchy(
    tree: CompositionTree,
    options: StateNestingOptions = {},
): StateProjection {
    const collapsed = options.collapsedStateIds ?? new Set<string>();
    const focusId = options.focusStateId && tree.elements.has(options.focusStateId)
        ? options.focusStateId
        : undefined;
    const childrenOf = (id: string) =>
        (tree.childrenMap.get(id) ?? []).filter(cid => tree.elements.has(cid));
    // A focused composite with no substates has nothing to drill into — fall
    // back to the whole machine rather than rendering an empty canvas.
    const focusChildren = focusId ? childrenOf(focusId) : [];
    const roots = focusChildren.length > 0
        ? focusChildren
        : tree.roots.filter(id => tree.elements.has(id));

    const visible = new Set<string>();
    const liftTo = new Map<string, string>();
    const hiddenCount = new Map<string, number>();

    const hide = (id: string, anchor: string) => {
        liftTo.set(id, anchor);
        hiddenCount.set(anchor, (hiddenCount.get(anchor) ?? 0) + 1);
        for (const child of childrenOf(id)) hide(child, anchor);
    };
    const walk = (id: string) => {
        visible.add(id);
        const children = childrenOf(id);
        if (collapsed.has(id)) {
            for (const child of children) hide(child, id);
            return;
        }
        for (const child of children) walk(child);
    };
    for (const rootId of roots) walk(rootId);

    return { visible, liftTo, hiddenCount, roots };
}

/** Composition ancestry of a state, outermost first — the drill-down breadcrumb. */
export function stateAncestry(tree: CompositionTree, stateId: string): string[] {
    const parentOf = new Map<string, string>();
    for (const [parent, children] of tree.childrenMap) {
        for (const child of children) if (!parentOf.has(child)) parentOf.set(child, parent);
    }
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = stateId;
    while (current && tree.elements.has(current) && !seen.has(current)) {
        seen.add(current);
        path.unshift(current);
        current = parentOf.get(current);
    }
    return path;
}

/**
 * Re-point transitions onto the states the projection actually draws. A
 * transition into a folded substate attaches to the composite standing in for
 * it; one that becomes internal to a folded composite is dropped, since the
 * composite already advertises hidden substates.
 */
export function liftTransitions(
    resolved: ResolvedTransition[],
    projection: StateProjection,
): ResolvedTransition[] {
    const anchor = (id: string) =>
        projection.visible.has(id) ? id : projection.liftTo.get(id);
    const lifted: ResolvedTransition[] = [];
    for (const transition of resolved) {
        const sourceId = anchor(transition.sourceId);
        const targetId = anchor(transition.targetId);
        if (!sourceId || !targetId) continue;
        const wasSelfTransition = transition.sourceId === transition.targetId;
        if (sourceId === targetId && !wasSelfTransition) continue;
        lifted.push({ ...transition, sourceId, targetId });
    }
    return lifted;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const STATE_COLOR = '#FF6B6B';
const NOTE_COLOR = '#95A5A6';
/** Transitions read as neutral connectors; the coral stays on state accents. */
const TRANSITION_COLOR = '#64748B';

export interface StateTransitionOptions extends StateNestingOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    layoutProviderId?: string;
    /** Fold/unfold a composite state in place (nested mode). */
    onToggleCollapse?: (id: string) => void;
    /** Drill into a composite state's sub-machine (drill-down mode). */
    onDrillIn?: (id: string) => void;
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
    const projection = projectStateHierarchy(tree, {
        focusStateId: options?.focusStateId,
        collapsedStateIds: options?.collapsedStateIds,
    });
    const resolved = liftTransitions(resolveTransitions(transitions, states), projection);
    if (projection.visible.size === 0 && annotations.length === 0) return { nodes: [], edges: [] };

    interface ElkNode {
        id: string;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        children?: ElkNode[];
        layoutOptions?: Record<string, string>;
    }

    // A folded composite carries an extra row (fold toggle + substate count),
    // so it needs more room than a genuine leaf state.
    const leafSize = (el: MemoElement) => ({
        width: Math.max(el.name.length * 7.5 + 56, 150),
        height: (tree.childrenMap.get(el.id) ?? []).some(cid => tree.elements.has(cid)) ? 74 : 54,
    });

    const buildElkNode = (id: string): ElkNode => {
        const el = tree.elements.get(id)!;
        const children = (tree.childrenMap.get(id) ?? []).filter(cid => projection.visible.has(cid));
        if (children.length === 0) return { id, ...leafSize(el) };
        return {
            id,
            layoutOptions: {
                'elk.algorithm': 'layered',
                // UML reading order: the machine flows top-down; back
                // transitions route around the sides instead of weaving long
                // corridors between two horizontal rows.
                'elk.direction': 'DOWN',
                'elk.padding': '[top=48,left=28,bottom=28,right=28]',
                // Roomy corridors: transitions are routed orthogonally after
                // layout and carry beside-the-line trigger labels, so parallel
                // tracks and their labels need real space between states.
                'elk.spacing.nodeNode': '72',
                'elk.layered.spacing.nodeNodeBetweenLayers': '120',
                'elk.spacing.edgeNode': '32',
                'elk.edgeRouting': 'ORTHOGONAL',
                // A machine is full of cycles. Broken arbitrarily they read as
                // a jumble; broken at the transitions the model declares last,
                // the states come out in the order an engineer wrote them —
                // initial state first, returns drawn as the back edges.
                'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
                'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            },
            children: children.map(buildElkNode),
        };
    };

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': '72',
            'elk.layered.spacing.nodeNodeBetweenLayers': '120',
            'elk.spacing.edgeNode': '32',
            'elk.spacing.edgeLabel': '8',
            'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '64',
            'elk.padding': '[top=20, left=20, bottom=20, right=20]',
        },
        // Annotations are laid out manually below the machine (a grid),
        // keeping ELK focused on the connected state graph
        children: projection.roots.map(buildElkNode),
        edges: resolved.map((t, i) => ({
            id: `st-${i}`,
            sources: [t.sourceId],
            targets: [t.targetId],
        })),
    };

    const layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId }) as ElkNode;

    // ── Flatten to ReactFlow nodes ──
    const nodes: Node[] = [];
    /** Absolute canvas rectangles, for orthogonal edge routing. */
    const absRect = new Map<string, { x: number; y: number; width: number; height: number; isContainer: boolean }>();
    const flatten = (elkNode: ElkNode, parentId?: string, parentAbs = { x: 0, y: 0 }) => {
        const el = tree.elements.get(elkNode.id);
        if (el) {
            const isContainer = !!elkNode.children?.length;
            const isMachine = el.kind.endsWith('Machine');
            const abs = { x: parentAbs.x + (elkNode.x ?? 0), y: parentAbs.y + (elkNode.y ?? 0) };
            absRect.set(elkNode.id, {
                ...abs,
                width: elkNode.width ?? 150,
                height: elkNode.height ?? 54,
                isContainer,
            });
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
                    hasChildren: (tree.childrenMap.get(elkNode.id) ?? [])
                        .some(cid => tree.elements.has(cid)),
                    isCollapsed: !!options?.collapsedStateIds?.has(elkNode.id),
                    hiddenCount: projection.hiddenCount.get(elkNode.id) ?? 0,
                    onToggleCollapse: options?.onToggleCollapse
                        ? () => options.onToggleCollapse!(elkNode.id)
                        : undefined,
                    onDrillIn: options?.onDrillIn
                        ? () => options.onDrillIn!(elkNode.id)
                        : undefined,
                },
                style: {
                    width: elkNode.width ?? 150,
                    height: elkNode.height ?? 54,
                },
            });
            for (const child of elkNode.children ?? []) flatten(child, elkNode.id, abs);
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

    // ── Transition edges — the shared connector pipeline routes them around
    // the state boxes and places all trigger labels together ──
    // Containers hold the routed states, so only leaves and notes block routes.
    const obstacles: RouteObstacle[] = [...absRect.entries()]
        .filter(([, r]) => !r.isContainer)
        .map(([id, r]) => ({ id, x: r.x, y: r.y, width: r.width, height: r.height }));
    const finished = finishConnectorRoutes({
        connectors: resolved.map((t, i) => ({
            id: t.element.id || `st-e-${i}`,
            sourceId: t.sourceId,
            targetId: t.targetId,
            label: t.label,
        })),
        rects: absRect,
        obstacles,
        // A wider channel gap than the IBD default: transition labels ride
        // beside their line and must clear neighbouring state borders too.
        channelGap: 26,
    });

    const edges: Edge[] = resolved.map((t, i) => {
        // A transition is a first-class SysML model element, so preserve its
        // id to let an edge click open the transition's properties.
        const id = t.element.id || `st-e-${i}`;
        const route = finished.get(id);
        const shared = {
            id,
            source: t.sourceId,
            target: t.targetId,
            label: t.label,
            style: { stroke: TRANSITION_COLOR, strokeWidth: EDGE.defaultWidth },
            markerEnd: {
                type: 'arrowclosed' as never,
                color: TRANSITION_COLOR,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        };
        if (route) {
            return {
                ...shared,
                type: 'interconnectionEdge',
                data: { points: route.points, labelPoint: route.labelPoint },
            };
        }
        return {
            ...shared,
            type: 'smoothstep',
            labelStyle: { fontSize: FONT.badge, fill: '#6B7280', fontWeight: 500 },
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            labelBgStyle: EDGE.labelBgStyle,
        };
    });

    return { nodes, edges };
}

// ─── Scene source for non-ReactFlow renderers ────────────────────────────────
//
// Reuses the template layout pipeline (views/templates/*, views/layout.ts) to
// compute a positioned scene for the selected diagram, with presentation-only
// defaults instead of DiagramCanvas's interactive option state (no expansion
// toggles, no focus mode, no lane filters). Alternate renderers draw the same
// model through the same layouts — only the drawing engine differs.
// ─────────────────────────────────────────────────────────────────────────────

import type { DiagramDTO, MemoElement, MemoModelDTO, ViewKind } from '@memo/tools/browser';
import { DIAGRAM_TYPE_META, VIEW_KIND_META } from '../../../constants';
import {
    computeLayout, computeContainmentLayout, computeDecompositionLayout, computeFBSLayout,
    buildDecompositionTree, buildFunctionalTree,
} from '../../../views/layout';
import {
    computeGeneralViewLayout, resolveGeneralMode, buildGeneralViewTree,
} from '../../../views/templates/general-view';
import { computeInterconnectionLayout } from '../../../views/templates/interconnection-view';
import { computeActionFlowViewLayout } from '../../../views/templates/actionflow-view';
import type { ActionFlowDisplayLevel, ActionFlowKind, ActionFlowLaneGrouping } from '../../../views/templates/actionflow-view';
import { computeStateTransitionLayout } from '../../../views/templates/statetransition-view';
import { computeSequenceLayout } from '../../../views/templates/sequence-view';
import { buildScene, type DiagramSceneSpec } from './scene';

export interface SceneRequest {
    model: MemoModelDTO;
    diagram: DiagramDTO | null;
    selectedViewpointId: string | null;
    hiddenLayers: ReadonlySet<string>;
    layoutProviderId?: string;
    actionFlow?: {
        swimlanes: boolean;
        laneGrouping: ActionFlowLaneGrouping;
        displayLevel: ActionFlowDisplayLevel;
        expandedActionIds: ReadonlySet<string>;
        focusActionId: string | null;
        visibleFlowKinds: ReadonlySet<ActionFlowKind>;
        direction: 'horizontal' | 'vertical';
    };
}

/** View kinds that render a non-canvas surface and produce no scene. */
export type NonCanvasKind = 'grid' | 'browser' | 'geometry';

export function resolveViewKind(diagram: DiagramDTO | null): ViewKind {
    if (!diagram) return 'general';
    const meta = DIAGRAM_TYPE_META[diagram.diagramType];
    return (diagram.viewKind as ViewKind | undefined) ?? meta?.viewKind ?? 'general';
}

export function nonCanvasKind(kind: ViewKind): NonCanvasKind | null {
    return kind === 'grid' || kind === 'browser' || kind === 'geometry' ? kind : null;
}

/** Same element predicate DiagramCanvas derives from viewpoint + layers + membership. */
export function buildViewpointFilter(request: SceneRequest): ((el: MemoElement) => boolean) | undefined {
    const { model, diagram, selectedViewpointId, hiddenLayers } = request;
    const effectiveVpId = diagram?.viewpointId === '__model'
        ? null
        : (diagram?.viewpointId || selectedViewpointId);

    const hasViewpoint = effectiveVpId && model.viewpoints;
    const hasHidden = hiddenLayers.size > 0;
    const diagramElementIds = diagram?.elementIds ? new Set(diagram.elementIds) : undefined;
    if (!hasViewpoint && !hasHidden && !diagramElementIds) return undefined;

    const vp = hasViewpoint ? model.viewpoints!.find(v => v.id === effectiveVpId) : undefined;
    const vpKinds = vp ? new Set(vp.visibleKinds) : undefined;
    const vpLayers = vp ? new Set(vp.visibleLayers) : undefined;

    return (el: MemoElement) => {
        if (hiddenLayers.has(el.layer)) return false;
        if (diagramElementIds) return diagramElementIds.has(el.id);
        if (vpKinds && vpLayers) return vpKinds.has(el.kind) || vpLayers.has(el.layer);
        return true;
    };
}

const NO_CALLBACKS = { onToggleExpand: () => {}, onToggleDirection: () => {} };

function expandAll(tree: { roots: string[]; childrenMap: Map<string, string[]>; elements: Map<string, unknown> }): Set<string> {
    const all = new Set<string>();
    const walk = (id: string) => {
        if (all.has(id)) return;
        all.add(id);
        for (const child of tree.childrenMap.get(id) ?? []) {
            if (tree.elements.has(child)) walk(child);
        }
    };
    for (const root of tree.roots) if (tree.elements.has(root)) walk(root);
    return all;
}

/**
 * Compute the positioned scene for a diagram. Returns null for non-canvas
 * kinds (grid/browser/geometry) — callers render those surfaces themselves.
 */
export async function computeDiagramScene(request: SceneRequest): Promise<DiagramSceneSpec | null> {
    const { model, diagram, layoutProviderId } = request;
    const viewKind = resolveViewKind(diagram);
    if (nonCanvasKind(viewKind)) return null;

    const viewpointFilter = buildViewpointFilter(request);
    const isDecomp = Boolean(diagram?.properties?.layoutStyle);
    const isFBS = diagram?.properties?.layoutStyle === 'fbs';
    const isGeneralTemplate = viewKind === 'general' && !isDecomp && !isFBS;
    const positionCache = new Map<string, { x: number; y: number }>();

    let result: { nodes: unknown[]; edges: unknown[] };
    if (isFBS) {
        result = await computeFBSLayout(model, {
            expandedNodes: expandAll(buildFunctionalTree(model)),
            nodeDirections: new Map(),
            callbacks: NO_CALLBACKS,
            layoutProviderId,
        });
    } else if (isDecomp) {
        result = computeContainmentLayout(model, {
            expandedNodes: expandAll(buildDecompositionTree(model)),
            callbacks: NO_CALLBACKS,
        });
    } else if (viewKind === 'interconnection') {
        result = await computeInterconnectionLayout(model, {
            viewpointFilter,
            relationshipTypes: diagram?.relationshipTypes,
            collapsedNodes: new Set(),
            onToggleCollapse: () => {},
            portDisplay: 'all',
            onPortMove: () => {},
            layoutProviderId,
        });
    } else if (viewKind === 'actionflow') {
        result = await computeActionFlowViewLayout(model, {
            viewpointFilter,
            swimlanes: request.actionFlow?.swimlanes ?? true,
            laneGrouping: request.actionFlow?.laneGrouping ?? 'allocation',
            displayLevel: request.actionFlow?.displayLevel ?? 'all',
            expandedActionIds: request.actionFlow?.expandedActionIds ?? new Set(),
            onToggleAction: () => {},
            focusActionId: request.actionFlow?.focusActionId ?? undefined,
            visibleFlowKinds: request.actionFlow?.visibleFlowKinds ?? new Set(['control', 'data', 'energy', 'material']),
            direction: request.actionFlow?.direction ?? 'horizontal',
            layoutProviderId,
        });
    } else if (viewKind === 'statetransition') {
        result = await computeStateTransitionLayout(model, { viewpointFilter, layoutProviderId });
    } else if (viewKind === 'sequence') {
        result = computeSequenceLayout(model, { viewpointFilter });
    } else {
        const mode = resolveGeneralMode(diagram?.properties);
        if (isGeneralTemplate && mode !== 'graph') {
            result = await computeGeneralViewLayout(model, {
                mode,
                viewpointFilter,
                expandedNodes: expandAll(buildGeneralViewTree(model, viewpointFilter)),
                nodeDirections: new Map(),
                callbacks: NO_CALLBACKS,
                positionCache,
                layoutProviderId,
            });
        } else {
            result = await computeLayout(model, {
                viewpointFilter,
                relationshipTypes: diagram?.relationshipTypes,
                compartments: isGeneralTemplate,
                layoutProviderId,
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildScene(result.nodes as any[], result.edges as any[]);
}

export function viewKindLabel(kind: ViewKind): string {
    return VIEW_KIND_META[kind]?.label ?? kind;
}

// ─── General View Template (KK-2) ────────────────────────────────────────────
//
// Standard renderer template for the SysML v2 `general` view kind —
// definition/membership structure. Subsumes the legacy bdd/pkg/req/ucd
// renderings with three presentation modes:
//
//   graph        ELK layered graph of the view's elements + relationships,
//                with attribute compartments and kind badges (default)
//   tree         decomposition tree with expand/collapse and per-node
//                V/H direction (memo-sysmlv4 decomposition mode)
//   containment  nested blocks with expand/collapse (memo-sysmlv4
//                containment mode)
//
// Tree and containment derive their hierarchy from the composition
// relationships among the view's own selection, so any General view —
// not just structural ones — gets the interactive modes.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO } from '@memo/core';
import {
    computeLayout, computeDecompositionLayout, computeContainmentLayout,
    type LayoutResult,
} from '../layout';
import { buildCompositionTree, type CompositionTree } from './composition-tree';

export type GeneralViewMode = 'graph' | 'tree' | 'containment';

export const GENERAL_VIEW_MODES: readonly GeneralViewMode[] = ['graph', 'tree', 'containment'];

/**
 * Initial mode for a view: honors a declared `layoutHint` presentation
 * hint ("tree" | "containment" | "graph"), defaults to graph.
 */
export function resolveGeneralMode(properties?: Record<string, string>): GeneralViewMode {
    const hint = properties?.layoutHint;
    return hint === 'tree' || hint === 'containment' || hint === 'graph' ? hint : 'graph';
}

/** The elements a view presents, after its selection/viewpoint filter. */
export function visibleViewElements(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): MemoElement[] {
    const all = Object.values(model.elements);
    return viewpointFilter ? all.filter(viewpointFilter) : all;
}

/** Composition hierarchy over the view's visible elements. */
export function buildGeneralViewTree(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): CompositionTree {
    return buildCompositionTree(visibleViewElements(model, viewpointFilter), model.relationships);
}

export interface GeneralViewOptions {
    mode: GeneralViewMode;
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view (graph mode) */
    relationshipTypes?: string[];
    expandedNodes: Set<string>;
    nodeDirections: Map<string, 'vertical' | 'horizontal'>;
    callbacks: {
        onToggleExpand: (id: string) => void;
        onToggleDirection: (id: string) => void;
    };
    /** Sticky tree positions across re-layouts (canvas-owned) */
    positionCache?: Map<string, { x: number; y: number }>;
    layoutProviderId?: string;
}

/** One standard layout entry point for the General view kind. */
export async function computeGeneralViewLayout(
    model: MemoModelDTO,
    options: GeneralViewOptions,
): Promise<LayoutResult> {
    if (options.mode === 'graph') {
        return computeLayout(model, {
            viewpointFilter: options.viewpointFilter,
            relationshipTypes: options.relationshipTypes,
            compartments: true,
            layoutProviderId: options.layoutProviderId,
        });
    }

    const tree = buildGeneralViewTree(model, options.viewpointFilter);
    if (options.mode === 'tree') {
        return computeDecompositionLayout(model, {
            expandedNodes: options.expandedNodes,
            nodeDirections: options.nodeDirections,
            callbacks: options.callbacks,
            tree,
            positionCache: options.positionCache,
        });
    }
    return computeContainmentLayout(model, {
        expandedNodes: options.expandedNodes,
        callbacks: { onToggleExpand: options.callbacks.onToggleExpand },
        tree,
    });
}

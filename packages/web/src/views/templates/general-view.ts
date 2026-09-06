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

import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import {
    computeLayout, computeDecompositionLayout, computeContainmentLayout,
    type LayoutResult,
} from '../layout';
import {
    buildCompositionTree, isPortUsage, withDefinitionComposition, redundantDefinitionIds,
    COMPOSITION_REL_TYPES, type CompositionTree,
} from './composition-tree';
import { toModelTypeSet } from '@memoarchitect/tools/browser';

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

/**
 * The view's own filter, with port usages taken out.
 *
 * A general view is a DEFINITION-structure diagram, and a port is a feature of
 * the block that declares it, not a peer of it. Ports arrive here because a
 * view's membership is the UNION of `selectionQuery.includeElementKinds` and
 * its `expose` members (see `resolveViewElementIds`) — so `expose <pkg>::*`
 * admits the whole package and the kind list, which can only add, never
 * narrows it back. The result was ports drawn as boxes among the assemblies
 * that own them: 378 of GEN-21's 418 elements, 79 of the IMS physical view's
 * 372.
 *
 * They are not dropped — `portCompartmentEntries` puts them in their owner's
 * compartment, which is where a BDD shows them.
 *
 * Interconnection views are unaffected: ports are the subject there, and that
 * template does not come through here.
 */
export function generalViewFilter(
    viewpointFilter?: (el: MemoElement) => boolean,
): (el: MemoElement) => boolean {
    return el => !isPortUsage(el) && (!viewpointFilter || viewpointFilter(el));
}

/** The elements a view presents, after its selection/viewpoint filter. */
export function visibleViewElements(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): MemoElement[] {
    return Object.values(model.elements).filter(generalViewFilter(viewpointFilter));
}

/**
 * Which of a view's declared relationship types may define parent and child.
 *
 * A view declares one list of relationship types and it serves two purposes:
 * which edges to DRAW, and which express containment. Passing that list
 * straight through as the hierarchy conflated them, so a view declaring
 * `("composes", "memoLink")` — as the IMS physical decomposition does — built
 * its tree from `memoLink` as well, and a generic link became a claim that one
 * block is part of another. Nothing in the model said so.
 *
 * Only composition makes a whole out of a part, so a view may NARROW the
 * composition types it uses and may not add a non-composition one. A view that
 * declares no composition type at all keeps the full set rather than
 * collapsing to a tree of nothing but roots: it has said what to draw, not
 * that it has no hierarchy.
 */
export function hierarchyTypesFor(
    declared: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
    if (!declared?.length) return undefined;
    const composition = [...toModelTypeSet(declared)].filter(t => COMPOSITION_REL_TYPES.has(t));
    return composition.length ? new Set(composition) : undefined;
}

/** Composition hierarchy over the view's visible elements. */
export function buildGeneralViewTree(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
    hierarchyRelationshipTypes?: readonly string[],
): CompositionTree {
    const selected = visibleViewElements(model, viewpointFilter);
    // A definition already represented by one of its usages would otherwise
    // stand beside it holding the same children — see redundantDefinitionIds.
    const redundant = redundantDefinitionIds(selected);
    const elements = redundant.size ? selected.filter(el => !redundant.has(el.id)) : selected;
    const types = hierarchyTypesFor(hierarchyRelationshipTypes);
    const byId = new Map(elements.map(el => [el.id, el]));
    return buildCompositionTree(
        elements,
        withDefinitionComposition(model.relationships, byId, model.elements, types),
        types,
    );
}

/**
 * How many nodes a decomposition may reveal before it stops opening levels.
 *
 * Enough that a real architecture shows its shape on open; small enough that a
 * six-thousand-element model does not try to draw itself at once.
 */
const DEFAULT_EXPANSION_BUDGET = 80;

/**
 * Which nodes a decomposition expands when it first opens.
 *
 * Tree and containment both started fully collapsed, so a 305-element view
 * opened as a single box reading "3 parts (collapsed)" — a decomposition view
 * showing no decomposition, which every user then had to Expand All to read.
 *
 * Levels are opened breadth-first and the whole level is taken or none of it:
 * stopping halfway through would show some siblings expanded and others not,
 * which reads as structure that is not there. Expansion stops when the next
 * level would exceed the budget, so a broad model opens shallow and a narrow
 * one opens deep — both to something that fits.
 */
export function defaultExpandedNodes(
    tree: CompositionTree,
    budget: number = DEFAULT_EXPANSION_BUDGET,
): Set<string> {
    const expanded = new Set<string>();
    let revealed = tree.roots.length;
    let level = tree.roots;
    while (level.length > 0) {
        const withChildren = level.filter(id => (tree.childrenMap.get(id) ?? []).length > 0);
        if (withChildren.length === 0) break;
        const next = withChildren.flatMap(id => tree.childrenMap.get(id) ?? []);
        if (revealed + next.length > budget) break;
        for (const id of withChildren) expanded.add(id);
        revealed += next.length;
        level = next;
    }
    return expanded;
}

export interface GeneralViewOptions {
    mode: GeneralViewMode;
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Relationship types declared by the view (graph mode) */
    relationshipTypes?: string[];
    /** Relationship types that define hierarchy in tree/containment mode. */
    hierarchyRelationshipTypes?: string[];
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
            viewpointFilter: generalViewFilter(options.viewpointFilter),
            relationshipTypes: options.relationshipTypes,
            compartments: true,
            layoutProviderId: options.layoutProviderId,
        });
    }

    const tree = buildGeneralViewTree(model, options.viewpointFilter, options.hierarchyRelationshipTypes);
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

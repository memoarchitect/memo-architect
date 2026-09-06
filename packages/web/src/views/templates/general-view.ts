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
    buildCompositionTree, isPortUsage, definitionIndex, definitionLevelElements, buildOwnershipTest,
    definitionLevelComposition, declaredSubject, subtreeOf, dominantRoot,
    COMPOSITION_REL_TYPES, type CompositionTree,
} from './composition-tree';
import { toModelTypeSet } from '@memoarchitect/tools/browser';
import { resolveLegend } from './legend';

export type GeneralViewMode = 'graph' | 'tree' | 'containment';

export const GENERAL_VIEW_MODES: readonly GeneralViewMode[] = ['graph', 'tree', 'containment'];

/**
 * Initial mode for a view: honors a declared `layoutHint` presentation
 * hint ("tree" | "containment" | "graph"), defaults to graph.
 *
 * A hint asking for a tree is only honoured when there is a hierarchy to draw.
 * The Affera L1 function allocation declares `layoutHint: "tree"` and holds
 * seven functions that compose nothing, so tree mode drew seven orphan boxes
 * with no line between them — a list pretending to be a decomposition. It opens
 * as a graph instead, and the mode toggle is still there for anyone who wants
 * the other view.
 */
export function resolveGeneralMode(
    properties?: Record<string, string>,
    hasHierarchy = true,
): GeneralViewMode {
    const hint = properties?.layoutHint;
    const declared = hint === 'tree' || hint === 'containment' || hint === 'graph' ? hint : 'graph';
    return declared !== 'graph' && !hasHierarchy ? 'graph' : declared;
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
    /** The view element, whose `expose` names what the diagram is OF. */
    viewElement?: MemoElement,
): CompositionTree {
    const types = hierarchyTypesFor(hierarchyRelationshipTypes);
    const definitions = definitionIndex(model.elements);
    // A BDD states facts about TYPES — that a Data Acquisition Board is made of
    // an FPGA — so its nodes are definitions. Usages belong on an IBD, which
    // shows the instances inside one assembly and how they are wired.
    const elements = definitionLevelElements(visibleViewElements(model, viewpointFilter), definitions);
    const full = buildCompositionTree(
        elements,
        definitionLevelComposition(model.relationships, model.elements, definitions, types),
        types,
        // `composes` states ownership and mere relation alike; only the first
        // nests. Without this a function contained the ActionUsage that
        // performs it.
        buildOwnershipTest(model.registries?.kinds),
    );

    // A BDD is a BDD OF something: one root, and everything on it part of that
    // root. Whatever the subject does not reach was pulled in by a broad
    // selection query and is not on this diagram.
    // Nothing to root: the view's elements compose nothing. A function
    // allocation is a list of L1 functions, not a decomposition of one — the
    // Affera L1 view holds seven actions and no composition at all — and
    // picking a "root" there would prune six of them away to leave an
    // arbitrary single box. `hasHierarchy` is the whole test: rooting is a
    // statement about a tree, and there is no tree here.
    if (full.childrenMap.size === 0) return full;

    const subject = declaredSubject(viewElement?.attributes, model.elements);
    const subjectNode = subject
        ? (subject.isDefinition ? subject : definitions.get(
            (subject.attributes.usageType ?? '').split('::').pop()?.trim() ?? '') ?? subject)
        : undefined;
    const rootId = subjectNode && full.elements.has(subjectNode.id)
        ? subjectNode.id
        : dominantRoot(full);
    return rootId ? subtreeOf(full, rootId) : full;
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
    /** The view element, whose `expose` names the diagram's subject. */
    viewElement?: MemoElement;
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

    const tree = buildGeneralViewTree(
        model, options.viewpointFilter, options.hierarchyRelationshipTypes, options.viewElement);
    const legend = resolveLegend(options.viewElement, model);
    if (options.mode === 'tree') {
        return computeDecompositionLayout(model, {
            expandedNodes: options.expandedNodes,
            nodeDirections: options.nodeDirections,
            callbacks: options.callbacks,
            tree,
            positionCache: options.positionCache,
            legend,
        });
    }
    return computeContainmentLayout(model, {
        expandedNodes: options.expandedNodes,
        callbacks: { onToggleExpand: options.callbacks.onToggleExpand },
        tree,
        legend,
    });
}

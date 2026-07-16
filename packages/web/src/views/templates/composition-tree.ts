// ─── Composition Tree ────────────────────────────────────────────────────────
//
// Pure structure derivation shared by the view-kind templates (Epic KK).
// Builds a parent→children hierarchy from the composition relationships
// among a given element set — unlike the legacy builders in layout.ts this
// is not hardcoded to structural/functional kinds, so any General or
// Interconnection view derives its hierarchy from its own selection.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoRelationship } from '@memo/tools/browser';

/**
 * Relationship types that express whole→part composition.
 * For all of them the builder normalizes source=whole/parent,
 * target=part/child (`connect parent ::> X to child ::> Y`).
 */
export const COMPOSITION_REL_TYPES: ReadonlySet<string> = new Set([
    'composedOf', 'composes', 'decomposedBy', 'aggregation',
]);

export interface CompositionTree {
    /** Elements with no parent inside the set, in insertion order */
    roots: string[];
    /** parent id → child ids (only ids present in `elements`) */
    childrenMap: Map<string, string[]>;
    /** All elements participating in the tree (the input set) */
    elements: Map<string, MemoElement>;
}

/**
 * Build a composition hierarchy over `elements` from the composition
 * relationships connecting them. Elements without composition edges
 * remain as isolated roots.
 */
export function buildCompositionTree(
    elements: Iterable<MemoElement>,
    relationships: MemoRelationship[],
): CompositionTree {
    const elementMap = new Map<string, MemoElement>();
    for (const el of elements) elementMap.set(el.id, el);

    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of relationships) {
        if (!COMPOSITION_REL_TYPES.has(rel.type)) continue;
        if (!elementMap.has(rel.sourceId) || !elementMap.has(rel.targetId)) continue;
        if (rel.sourceId === rel.targetId) continue;
        // First composition edge wins — an element keeps a single parent
        if (hasParent.has(rel.targetId)) continue;
        if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
        childrenMap.get(rel.sourceId)!.push(rel.targetId);
        hasParent.add(rel.targetId);
    }

    const roots = [...elementMap.keys()].filter(id => !hasParent.has(id));
    return { roots, childrenMap, elements: elementMap };
}

/** Collect every id reachable from the tree roots (roots included). */
export function collectTreeIds(tree: CompositionTree): Set<string> {
    const ids = new Set<string>();
    const visit = (id: string) => {
        if (ids.has(id) || !tree.elements.has(id)) return;
        ids.add(id);
        for (const cid of tree.childrenMap.get(id) ?? []) visit(cid);
    };
    for (const rootId of tree.roots) visit(rootId);
    return ids;
}

export interface SingleTreeIssue {
    rootIds: string[];
    disconnectedIds: string[];
}

/** BDD integrity: the selected elements must form one connected hierarchy. */
export function validateSingleTree(tree: CompositionTree): SingleTreeIssue | null {
    if (tree.elements.size === 0) return null;
    const reached = new Set<string>();
    const visit = (id: string) => {
        if (reached.has(id)) return;
        reached.add(id);
        for (const childId of tree.childrenMap.get(id) ?? []) visit(childId);
    };
    if (tree.roots[0]) visit(tree.roots[0]);
    const disconnectedIds = [...tree.elements.keys()].filter(id => !reached.has(id));
    return tree.roots.length === 1 && disconnectedIds.length === 0
        ? null
        : { rootIds: tree.roots, disconnectedIds };
}

// ─── Compartments ────────────────────────────────────────────────────────────

/** Attribute keys that never belong in a node compartment. */
const COMPARTMENT_SKIP = new Set([
    'name', 'title', 'description', 'shortDescription', 'longDescription',
    'sourceReference', 'rationaleText', 'semantics', 'protocolSemantics',
    'queryDescription', 'dataSourceDescription', 'documentUsage', 'doc',
]);

export interface CompartmentEntry {
    key: string;
    value: string;
}

/**
 * Pick up to `max` short, meaningful attributes for a node's attribute
 * compartment (General view template). Long prose attributes are skipped;
 * enum references are shown unqualified.
 */
export function pickCompartmentEntries(el: MemoElement, max = 4): CompartmentEntry[] {
    const entries: CompartmentEntry[] = [];
    if (el.shortId) entries.push({ key: 'id', value: el.shortId });
    for (const [key, raw] of Object.entries(el.attributes)) {
        if (entries.length >= max) break;
        if (COMPARTMENT_SKIP.has(key) || key.includes('.')) continue;
        if (key === 'id' && entries.some(e => e.key === 'id')) continue;
        const value = raw.split('::').pop()!.trim();
        if (!value || value.length > 28) continue;
        entries.push({ key, value });
    }
    return entries.slice(0, max);
}

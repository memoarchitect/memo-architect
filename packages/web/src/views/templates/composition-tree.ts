// ─── Composition Tree ────────────────────────────────────────────────────────
//
// Pure structure derivation shared by the view-kind templates (Epic KK).
// Builds a parent→children hierarchy from the composition relationships
// among a given element set — unlike the legacy builders in layout.ts this
// is not hardcoded to structural/functional kinds, so any General or
// Interconnection view derives its hierarchy from its own selection.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';

/**
 * Relationship types that express whole→part composition.
 * For all of them the builder normalizes source=whole/parent,
 * target=part/child (`connect parent ::> X to child ::> Y`).
 */
export const COMPOSITION_REL_TYPES: ReadonlySet<string> = new Set([
    'composedOf', 'composes', 'decomposedBy', 'aggregation',
]);

/**
 * The definition an element stands for: a definition is itself, a usage is the
 * definition that types it.
 *
 * `usageType` is a qualified name (`pkg::sub::Board`), so it is matched on its
 * last segment and then by id or short name.
 */
export function resolveDefinition(
    el: MemoElement,
    definitions: ReadonlyMap<string, MemoElement>,
): MemoElement | undefined {
    if (el.isDefinition) return el;
    // One field, because SysML has one mechanism: `part p : Board` and
    // `action a : CoordinateWorkflows` are both a usage typed by a definition.
    // The builder used to record the action case under `actionType` alone,
    // which is why the function hierarchy resolved nothing; it now writes
    // `usageType` for every usage. `actionType` is still read as a fallback so
    // a model lowered by an older toolchain keeps working.
    const declared = el.attributes.usageType ?? el.attributes.actionType ?? '';
    const name = declared.split('::').pop()?.trim();
    return name ? definitions.get(name) : undefined;
}

/** Definitions indexed by every name a usage may refer to them by. */
export function definitionIndex(
    allElements: Readonly<Record<string, MemoElement>>,
): Map<string, MemoElement> {
    const definitions = new Map<string, MemoElement>();
    for (const el of Object.values(allElements)) {
        if (!el.isDefinition) continue;
        definitions.set(el.id, el);
        if (!definitions.has(el.name)) definitions.set(el.name, el);
    }
    return definitions;
}

/**
 * A block definition diagram shows DEFINITIONS.
 *
 * That is what separates a BDD from an IBD: a BDD states that a Data
 * Acquisition Board is made of an FPGA and a relay board — a fact about the
 * types — while an IBD shows the particular instances inside one assembly and
 * how they are wired. Drawing usages on a BDD produces one box per instance of
 * the same type and no statement about the type at all.
 *
 * So the view's selection, which is overwhelmingly usages, is mapped to the
 * definitions those usages are typed by, and deduplicated. Elements with no
 * resolvable definition are kept as themselves rather than dropped: losing an
 * element silently is worse than showing one the model failed to type.
 */
export function definitionLevelElements(
    elements: Iterable<MemoElement>,
    definitions: ReadonlyMap<string, MemoElement>,
): MemoElement[] {
    const out = new Map<string, MemoElement>();
    for (const el of elements) {
        const def = resolveDefinition(el, definitions);
        const node = def ?? el;
        if (!out.has(node.id)) out.set(node.id, node);
    }
    return [...out.values()];
}

/**
 * Composition edges projected onto the definitions at both ends.
 *
 * This model declares composition in both places — of 2221 `composes` edges,
 * 2134 sit on a usage (`catheterInterfaceUnit` composes its four blocks) and
 * 86 on a definition (`DataAcquisitionBoard` composes its six). Reading either
 * convention alone gives a broken tree: walking usages stopped at the Data
 * Acquisition Board, and walking definitions stopped at the CIU. Projecting
 * both ends onto definitions reads the two as the one fact they express, and
 * collapses those 2221 edges to 69 distinct def-to-def relationships.
 *
 * Duplicates are dropped: four usages of the same board state one fact about
 * the type. How MANY is multiplicity, which belongs on an edge label rather
 * than in a repeated edge.
 */
export function definitionLevelComposition(
    relationships: readonly MemoRelationship[],
    allElements: Readonly<Record<string, MemoElement>>,
    definitions: ReadonlyMap<string, MemoElement>,
    hierarchyRelationshipTypes: ReadonlySet<string> = COMPOSITION_REL_TYPES,
): MemoRelationship[] {
    const seen = new Set<string>();
    const out: MemoRelationship[] = [];
    for (const rel of relationships) {
        if (!hierarchyRelationshipTypes.has(rel.type)) continue;
        const source = allElements[rel.sourceId];
        const target = allElements[rel.targetId];
        if (!source || !target) continue;
        const s = resolveDefinition(source, definitions) ?? source;
        const t = resolveDefinition(target, definitions) ?? target;
        if (s.id === t.id) continue;
        const key = `${s.id}>${t.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...rel, id: `def-${key}`, sourceId: s.id, targetId: t.id });
    }
    return out;
}

/**
 * The element a view is the diagram OF.
 *
 * A block definition diagram is always a BDD of something, so it has one root
 * and everything on it is part of that root. The subject is declared: the CIU
 * physical decomposition exposes
 * `..._hardware_ciu::catheterInterfaceUnit` specifically before widening to
 * `..._physical_architecture_ims::*`, and names `HW-IMS-01` in
 * `includeElementIds`. A wildcard is scope, not subject — it says what may be
 * drawn, not what the diagram is about.
 */
export function declaredSubject(
    viewAttributes: Readonly<Record<string, string>> | undefined,
    allElements: Readonly<Record<string, MemoElement>>,
): MemoElement | undefined {
    if (!viewAttributes) return undefined;
    const byName = new Map<string, MemoElement>();
    for (const el of Object.values(allElements)) if (!byName.has(el.name)) byName.set(el.name, el);
    const find = (reference: string): MemoElement | undefined => {
        const direct = allElements[reference];
        if (direct) return direct;
        const short = reference.split('::').pop()!.trim();
        return allElements[short] ?? byName.get(short)
            ?? Object.values(allElements).find(el =>
                el.attributes.providedId === short || el.shortId === short);
    };
    for (const entry of (viewAttributes.expose ?? '').split(',')) {
        const reference = entry.trim();
        if (!reference || reference.endsWith('::*')) continue;
        const found = find(reference);
        if (found) return found;
    }
    for (const entry of (viewAttributes['selectionQuery.includeElementIds'] ?? '').split(',')) {
        const reference = entry.trim();
        if (!reference) continue;
        const found = find(reference);
        if (found) return found;
    }
    return undefined;
}

/**
 * The subtree under one root, as a tree in its own right.
 *
 * What a BDD of the CIU may show is the CIU and what the CIU is made of.
 * Anything the root does not reach is not part of the subject and is dropped —
 * which is what removes the traceability duplicates and the RFG parts that a
 * model-wide `includeElementKinds` query drags into an IMS view. They are not
 * laid out more tidily; they are not on this diagram.
 */
export function subtreeOf(tree: CompositionTree, rootId: string): CompositionTree {
    if (!tree.elements.has(rootId)) return tree;
    const kept = new Map<string, MemoElement>();
    const childrenMap = new Map<string, string[]>();
    const visit = (id: string) => {
        if (kept.has(id)) return;
        const el = tree.elements.get(id);
        if (!el) return;
        kept.set(id, el);
        const children = (tree.childrenMap.get(id) ?? []).filter(cid => tree.elements.has(cid));
        if (children.length) childrenMap.set(id, children);
        for (const cid of children) visit(cid);
    };
    visit(rootId);
    return { roots: [rootId], childrenMap, elements: kept };
}

/**
 * The root a view is about when it never said.
 *
 * Falls back to the root that reaches the most of the diagram, because a BDD
 * with many parentless blocks is one subject plus a scattering of elements a
 * broad selection query pulled in, and the subject is the one the rest hangs
 * off. Ties keep the first, so the result does not depend on map order.
 */
export function dominantRoot(tree: CompositionTree): string | undefined {
    let best: string | undefined;
    let bestReach = -1;
    for (const rootId of tree.roots) {
        const seen = new Set<string>();
        const visit = (id: string) => {
            if (seen.has(id)) return;
            seen.add(id);
            for (const cid of tree.childrenMap.get(id) ?? []) visit(cid);
        };
        visit(rootId);
        if (seen.size > bestReach) { bestReach = seen.size; best = rootId; }
    }
    return best;
}

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
    hierarchyRelationshipTypes: ReadonlySet<string> = COMPOSITION_REL_TYPES,
): CompositionTree {
    const elementMap = new Map<string, MemoElement>();
    for (const el of elements) elementMap.set(el.id, el);

    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of relationships) {
        if (!hierarchyRelationshipTypes.has(rel.type)) continue;
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

/**
 * Containers sitting at or below `minDepth`, where a root is depth 0.
 *
 * The IBD default-fold set. The frame stays open, while its immediate child
 * containers start folded so the opening diagram is a readable system overview.
 * The reader expands or drills into the one branch they need, instead of opening
 * directly into every nested module and connector. Only containers are returned;
 * folding a leaf means nothing.
 */
export function containersBelowDepth(tree: CompositionTree, minDepth: number): string[] {
    const deep: string[] = [];
    const visit = (id: string, depth: number, seen: Set<string>) => {
        const kids = tree.childrenMap.get(id) ?? [];
        if (kids.length > 0 && depth >= minDepth) deep.push(id);
        for (const kid of kids) {
            if (seen.has(kid)) continue;
            seen.add(kid);
            visit(kid, depth + 1, seen);
        }
    };
    for (const rootId of tree.roots) visit(rootId, 0, new Set([rootId]));
    return deep;
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
/**
 * A port usage — `port p : SomePort`, not `port def SomePort`.
 *
 * Asked of the element's own two fields rather than of its kind, because a
 * kind name is an ontology string resolved at runtime and comparing one to a
 * literal is what `semantic.ts` tells this codebase not to do. Every kind whose
 * registry entry declares `port def` produces elements with `construct: 'port'`
 * — 68 such kinds in the MEMO ontology, and on the IMS physical view the two
 * tests agree on all 79 elements, with no third case either way.
 */
export const isPortUsage = (el: MemoElement): boolean =>
    el.construct === 'port' && !el.isDefinition;

/**
 * A block's ports, as compartment rows.
 *
 * A BDD draws a port as a feature of the block that declares it, never as a
 * box beside it — a port is not a part, and giving it its own node states a
 * peer relationship the model does not contain. The rows come from the owner's
 * own `ownedPorts`, which the builder already populates (145 elements carry
 * one), so this reads structure rather than reconstructing it from edges —
 * which would not work anyway: on the IMS physical view all 79 ports resolve an
 * owner and only 9 of them have an edge of any kind.
 */
export function portCompartmentEntries(
    el: MemoElement,
    model: MemoModelDTO,
    max = 6,
): CompartmentEntry[] {
    const owned = el.ownedPorts ?? [];
    if (owned.length === 0) return [];
    const rows: CompartmentEntry[] = [];
    for (const id of owned) {
        if (rows.length >= max) break;
        const port = model.elements[id];
        if (!port) continue;
        const type = (port.portSpec?.type ?? port.kind).split('::').pop()!.trim();
        rows.push({ key: port.name, value: type });
    }
    // Say how many were not listed rather than silently showing the first six.
    if (owned.length > rows.length) {
        rows.push({ key: '', value: `+${owned.length - rows.length} more ports` });
    }
    return rows;
}

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

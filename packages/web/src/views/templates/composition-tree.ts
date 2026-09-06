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
 * Composition edges a usage inherits from the definition that types it.
 *
 * SysML declares composition on the DEFINITION — `part def DataAcquisitionBoard
 * { part fpga : ...; }` — while a decomposition shows USAGES. Walking
 * usage-to-usage therefore stops one level in: `dataAcquisitionBoard` has no
 * composition edge of its own, and the six parts it is made of hang off
 * `DataAcquisitionBoard` instead. The tree came apart exactly there, and every
 * definition then floated as its own parentless root — 87 of the IMS physical
 * view's 146.
 *
 * So a usage inherits its definition's children, which is the hop the
 * memo-sysmlv4 reference makes when it resolves `partUsage.partDef` and
 * recurses into that definition's own parts.
 *
 * Its own edges win: a usage that overrides part of its definition keeps what
 * it declared, and the definition only fills in what the usage left unsaid.
 *
 * Inherited edges are returned FIRST so they beat the definition's own edge to
 * the child, because `buildCompositionTree` gives each element a single parent
 * and the first edge takes it. In a decomposition of usages the usage is the
 * real parent; leaving the definition to claim it is what left the usage a
 * childless leaf and the definition a parentless root.
 *
 * One consequence is worth stating: two usages of the same definition compete
 * for the same child elements and only the first gets them. A tree cannot put
 * one node under two parents, and these ids are shared model elements, not
 * per-usage copies.
 */
export function withDefinitionComposition(
    relationships: readonly MemoRelationship[],
    elements: Map<string, MemoElement>,
    allElements: Readonly<Record<string, MemoElement>>,
    hierarchyRelationshipTypes: ReadonlySet<string> = COMPOSITION_REL_TYPES,
): MemoRelationship[] {
    // Definitions indexed by the names a usage can refer to them by.
    const definitions = new Map<string, MemoElement>();
    for (const el of Object.values(allElements)) {
        if (!el.isDefinition) continue;
        definitions.set(el.id, el);
        if (!definitions.has(el.name)) definitions.set(el.name, el);
    }

    const childrenOfDefinition = new Map<string, MemoRelationship[]>();
    const declaresOwn = new Set<string>();
    for (const rel of relationships) {
        if (!hierarchyRelationshipTypes.has(rel.type)) continue;
        declaresOwn.add(rel.sourceId);
        const list = childrenOfDefinition.get(rel.sourceId);
        if (list) list.push(rel); else childrenOfDefinition.set(rel.sourceId, [rel]);
    }

    const inherited: MemoRelationship[] = [];
    for (const usage of elements.values()) {
        if (usage.isDefinition || declaresOwn.has(usage.id)) continue;
        const typeName = (usage.attributes.usageType ?? '').split('::').pop()?.trim();
        if (!typeName) continue;
        const definition = definitions.get(typeName);
        if (!definition || definition.id === usage.id) continue;
        for (const rel of childrenOfDefinition.get(definition.id) ?? []) {
            inherited.push({ ...rel, id: `${rel.id}-via-${usage.id}`, sourceId: usage.id });
        }
    }
    return inherited.length ? [...inherited, ...relationships] : [...relationships];
}

/**
 * Definitions whose content is already on the diagram through a usage.
 *
 * Once a usage inherits its definition's composition
 * (`withDefinitionComposition`), keeping the definition too draws the same
 * structure twice: `dataAcquisitionBoard` decomposes into the six parts, and
 * `DataAcquisitionBoard` sits alongside it as a parentless root holding the
 * same six. 87 of the IMS physical view's 146 roots were definitions of
 * usages already present.
 *
 * A definition is dropped ONLY when some usage in the same set is typed by it.
 * A view that shows definitions on purpose — a taxonomy, or a package of types
 * with no instances — keeps every one of them, because nothing there is a
 * duplicate of anything.
 */
export function redundantDefinitionIds(elements: Iterable<MemoElement>): Set<string> {
    const all = [...elements];
    const typed = new Set<string>();
    for (const el of all) {
        if (el.isDefinition) continue;
        const name = (el.attributes.usageType ?? '').split('::').pop()?.trim();
        if (name) typed.add(name);
    }
    const redundant = new Set<string>();
    for (const el of all) {
        if (el.isDefinition && (typed.has(el.id) || typed.has(el.name))) redundant.add(el.id);
    }
    return redundant;
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

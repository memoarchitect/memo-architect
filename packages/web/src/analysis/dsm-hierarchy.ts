// ─── Hierarchical Design Structure Matrix ────────────────────────────────────
//
// A DSM whose axes are *trees*, not flat lists — the Lattix reading of the
// technique. Every row and column is a subsystem that can be expanded into its
// parts or collapsed back into one line, and a collapsed line carries the sum
// of everything beneath it. Two axes are built independently, so functions can
// sit on the rows while the architecture blocks they run on sit on the columns.
//
// Three things stay separate on purpose:
//
//   1. What the axes *contain*  — element kinds, chosen per axis.
//   2. What nesting *means*     — the containment relationships, read from the
//                                 model rather than assumed.
//   3. What a mark *means*      — the dependency relationships (flow, trace,
//                                 allocation, …), also chosen by the caller.
//
// Nothing here hardcodes a kind or relationship name: every list arrives as an
// option and the defaults are derived from what the loaded model actually
// declares. That keeps the matrix honest when the ontology changes underneath.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';

// ─── Tree ────────────────────────────────────────────────────────────────────

/** One node on a DSM axis: a model element, or a package that groups them. */
export interface DsmNode {
    /** Element id, or `pkg:<qualified name>` for a grouping node. */
    id: string;
    name: string;
    kind: string;
    layer: string;
    /** False for package grouping nodes, which stand for no model element. */
    isElement: boolean;
    children: DsmNode[];
    /**
     * Every model element this node speaks for when collapsed: itself plus its
     * whole descendant closure, including descendants that no axis filter let
     * through. A dependency touching any of them lands on this node's line.
     */
    members: string[];
    depth: number;
}

/** A node as it appears on screen once the expand/collapse state is applied. */
export interface DsmAxisEntry {
    node: DsmNode;
    /** 1-based position, the number Lattix prints on both axes. */
    index: number;
    depth: number;
    expandable: boolean;
    expanded: boolean;
    /** Nodes shown above this one that contain it, outermost first. */
    ancestorIds: string[];
    /** How many model elements the line accounts for. */
    memberCount: number;
}

// ─── Cells ───────────────────────────────────────────────────────────────────

/** One aggregated dependency cell. */
export interface DsmAggregateCell {
    /** Number of dependency relationships crossing from the row to the column. */
    strength: number;
    types: string[];
    relationshipIds: string[];
    /**
     * True when at least one endpoint is a collapsed subtree, so the number is
     * a roll-up rather than a single authored link. Editing is refused on these
     * because there is no one relationship for the click to mean.
     */
    aggregated: boolean;
    /** Row and column are the same node — the identity diagonal. */
    diagonal: boolean;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export type DsmOrdering = 'natural' | 'kind' | 'partition' | 'cluster';

export interface DsmAxisSpec {
    /**
     * The one architecture layer this axis lists.
     *
     * An axis has to be semantically homogeneous to mean anything: a matrix
     * whose rows interleave requirements, functions and test cases compares
     * things that are not comparable. The layer is the ontology's own unit of
     * semantic kinship — `System`, `Subsystem` and `LogicalComponent` are three
     * kinds but one logical architecture, and they belong on an axis together.
     */
    layer?: string;
    /** Element kinds allowed on this axis. Empty means every kind. */
    kinds?: string[];
    /**
     * Specific elements allowed on this axis, on top of the kind filter. Empty
     * or absent means every element the kinds let through — a kind filter is
     * how you say "all the functions", this is how you say "these four".
     */
    elementIds?: readonly string[];
    /** Expanded node ids. A node absent from the set renders collapsed. */
    expanded?: ReadonlySet<string>;
    /** Sibling order for this axis. Falls back to the legacy shared order. */
    ordering?: DsmOrdering;
}

export interface HierarchicalDsmOptions {
    rows?: DsmAxisSpec;
    columns?: DsmAxisSpec;
    /** Relationship types that count as a dependency mark. Empty means all. */
    dependencyTypes?: string[];
    /** Relationship types read as parent → child containment. */
    containmentTypes?: string[];
    /** Wrap roots in their SysML package, so packages become subsystems. */
    groupByPackage?: boolean;
    /** Sibling ordering rule, applied inside every parent. */
    ordering?: DsmOrdering;
    /** Count a dependency in both directions, making the matrix symmetric. */
    symmetric?: boolean;
}

export interface DsmStats {
    /** Marks below the diagonal — candidates for rework loops. */
    feedback: number;
    /** Node pairs joined in both directions. */
    couplings: number;
    /** Visible lines with no mark in either direction. */
    isolated: number;
    /** Largest number of dependencies touching one visible line. */
    maxDegree: number;
    /** Dependencies hidden inside collapsed subtrees, shown on the diagonal. */
    internal: number;
}

export interface HierarchicalDsmResult {
    rowRoots: DsmNode[];
    columnRoots: DsmNode[];
    rows: DsmAxisEntry[];
    columns: DsmAxisEntry[];
    matrix: (DsmAggregateCell | null)[][];
    /** Dependency relationships placed somewhere in the matrix. */
    totalDependencies: number;
    /** Dependency relationships that matched the type filter, placed or not. */
    candidateDependencies: number;
    /** Elements in the whole model — the denominator on the identity diagonal. */
    elementCount: number;
    stats: DsmStats;
    /** Every relationship type present in the model, for the type pickers. */
    availableDependencyTypes: string[];
}

// ─── Containment discovery ───────────────────────────────────────────────────

/**
 * Relationship types that read as containment when the model declares them.
 * These are *candidates* offered to the picker, not an assumption: only the
 * ones the loaded model actually uses end up in the default set, and the user
 * can nominate any other type instead.
 */
const CONTAINMENT_HINTS = [
    'composes', 'composedOf', 'decomposedBy', 'aggregation',
    'includes', 'includesStep', 'containsEvent', 'moduleUses',
];

/** The containment types this model actually uses, for a sensible default. */
export function defaultContainmentTypes(model: MemoModelDTO): string[] {
    const present = new Set(model.relationships.map(rel => rel.type));
    return CONTAINMENT_HINTS.filter(type => present.has(type));
}

/** Every relationship type the model declares, sorted for a picker. */
export function relationshipTypesInModel(model: MemoModelDTO): string[] {
    return [...new Set(model.relationships.map(rel => rel.type))].sort();
}

/** Every element kind the model declares, sorted for a picker. */
export function elementKindsInModel(model: MemoModelDTO): string[] {
    return [...new Set(Object.values(model.elements).map(el => el.kind))].sort();
}

/** The layers the model actually populates, with their kinds and sizes. */
export interface LayerSummary {
    layer: string;
    elementCount: number;
    kinds: { kind: string; elementCount: number }[];
}

export function layersInModel(model: MemoModelDTO): LayerSummary[] {
    const byLayer = new Map<string, Map<string, number>>();
    for (const element of Object.values(model.elements)) {
        const layer = element.layer || 'unassigned';
        let kinds = byLayer.get(layer);
        if (!kinds) { kinds = new Map(); byLayer.set(layer, kinds); }
        kinds.set(element.kind, (kinds.get(element.kind) ?? 0) + 1);
    }
    return [...byLayer.entries()]
        .map(([layer, kinds]) => ({
            layer,
            elementCount: [...kinds.values()].reduce((total, count) => total + count, 0),
            kinds: [...kinds.entries()]
                .map(([kind, elementCount]) => ({ kind, elementCount }))
                .sort((a, b) => b.elementCount - a.elementCount || a.kind.localeCompare(b.kind)),
        }))
        .sort((a, b) => b.elementCount - a.elementCount || a.layer.localeCompare(b.layer));
}

/**
 * The layer a DSM should open on: the one with the most dependencies *inside*
 * it, since that is where a structure matrix has something to show.
 *
 * Derived from the model rather than a preferred-layer list, so a project whose
 * substance is in requirements or in hardware opens on that instead of on
 * whatever a hardcoded ordering happened to name first.
 */
export function suggestDsmLayer(model: MemoModelDTO, containmentTypes?: readonly string[]): string | undefined {
    const containment = new Set(containmentTypes ?? defaultContainmentTypes(model));
    const internal = new Map<string, number>();
    for (const rel of model.relationships) {
        if (containment.has(rel.type)) continue;
        const source = model.elements[rel.sourceId];
        const target = model.elements[rel.targetId];
        if (!source || !target || source.layer !== target.layer) continue;
        internal.set(source.layer, (internal.get(source.layer) ?? 0) + 1);
    }
    const layers = layersInModel(model);
    if (layers.length === 0) return undefined;
    // Layers are already ordered by size, so ties fall to the larger one.
    return [...layers].sort((a, b) =>
        (internal.get(b.layer) ?? 0) - (internal.get(a.layer) ?? 0)
        || b.elementCount - a.elementCount
        || a.layer.localeCompare(b.layer))[0].layer;
}

/**
 * The layer pair a traceability matrix should open on: whichever two layers the
 * model links across the most. Trace is a cross-layer question by nature, so
 * the useful default is the busiest crossing rather than one layer twice.
 */
export function suggestTraceLayers(
    model: MemoModelDTO,
    containmentTypes?: readonly string[],
): { rows?: string; columns?: string } {
    const containment = new Set(containmentTypes ?? defaultContainmentTypes(model));
    const pairs = new Map<string, number>();
    for (const rel of model.relationships) {
        if (containment.has(rel.type)) continue;
        const source = model.elements[rel.sourceId];
        const target = model.elements[rel.targetId];
        if (!source || !target || source.layer === target.layer) continue;
        const key = `${source.layer}>${target.layer}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
    const best = [...pairs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!best) {
        const layer = suggestDsmLayer(model, containmentTypes);
        return { rows: layer, columns: layer };
    }
    const [rows, columns] = best[0].split('>');
    return { rows, columns };
}

/**
 * Who contains whom, across the whole model.
 *
 * A declared containment relationship wins over the structural hints, because
 * an author who wrote `Composes` meant it. `parentAction` and `owner` fill in
 * for nested actions and ports, which carry their nesting on the element
 * rather than as a connection.
 */
function buildParentMap(model: MemoModelDTO, containmentTypes: readonly string[]): Map<string, string> {
    const parentOf = new Map<string, string>();
    for (const element of Object.values(model.elements)) {
        const structural = element.parentAction ?? element.owner;
        if (structural && model.elements[structural]) parentOf.set(element.id, structural);
    }
    const types = new Set(containmentTypes);
    for (const rel of model.relationships) {
        if (!types.has(rel.type)) continue;
        if (!model.elements[rel.sourceId] || !model.elements[rel.targetId]) continue;
        if (rel.sourceId === rel.targetId) continue;
        parentOf.set(rel.targetId, rel.sourceId);
    }
    // A containment cycle would make the tree infinite. Break it by dropping
    // the edge that closes the loop, keeping the rest of the chain intact.
    for (const id of [...parentOf.keys()]) {
        const seen = new Set<string>([id]);
        let current = parentOf.get(id);
        while (current) {
            if (seen.has(current)) { parentOf.delete(current); break; }
            seen.add(current);
            current = parentOf.get(current);
        }
    }
    return parentOf;
}

/** Ancestors of `id`, nearest first. */
function ancestorChain(id: string, parentOf: Map<string, string>): string[] {
    const chain: string[] = [];
    const seen = new Set<string>([id]);
    let current = parentOf.get(id);
    while (current && !seen.has(current)) {
        chain.push(current);
        seen.add(current);
        current = parentOf.get(current);
    }
    return chain;
}

// ─── Axis construction ───────────────────────────────────────────────────────

interface AxisBuild {
    roots: DsmNode[];
    /** Element id → the deepest node that owns it, for dependency roll-up. */
    ownerOf: Map<string, DsmNode>;
    /** Node id → its parent node, so a hidden line can walk up to a shown one. */
    parentNodeOf: Map<string, DsmNode>;
}

/**
 * Build one axis tree.
 *
 * An element earns a line when its kind passes the filter. Its ancestors come
 * along even when their own kind does not, because a subsystem that holds
 * matching parts still has to be there to hold them — the ancestor renders as
 * a structural line rather than disappearing and orphaning its children.
 */
function buildAxis(
    model: MemoModelDTO,
    parentOf: Map<string, string>,
    childrenOf: Map<string, string[]>,
    spec: DsmAxisSpec | undefined,
    groupByPackage: boolean,
): AxisBuild {
    const kinds = new Set(spec?.kinds ?? []);
    const chosen = new Set(spec?.elementIds ?? []);
    const matches = (el: MemoElement) =>
        (!spec?.layer || el.layer === spec.layer)
        && (kinds.size === 0 || kinds.has(el.kind))
        && (chosen.size === 0 || chosen.has(el.id));

    const included = new Set<string>();
    for (const element of Object.values(model.elements)) {
        if (!matches(element)) continue;
        included.add(element.id);
        for (const ancestor of ancestorChain(element.id, parentOf)) included.add(ancestor);
    }

    // Descendant closure over the *whole* model, so a collapsed node still
    // speaks for parts that the kind filter kept off the axis.
    const memberCache = new Map<string, string[]>();
    const membersOf = (id: string): string[] => {
        const cached = memberCache.get(id);
        if (cached) return cached;
        const members = [id];
        memberCache.set(id, members);
        for (const child of childrenOf.get(id) ?? []) {
            if (child === id) continue;
            members.push(...membersOf(child));
        }
        return members;
    };

    const nodeCache = new Map<string, DsmNode>();
    const buildNode = (id: string, depth: number): DsmNode => {
        const existing = nodeCache.get(id);
        if (existing) return existing;
        const element = model.elements[id];
        const node: DsmNode = {
            id,
            name: element?.name ?? id,
            kind: element?.kind ?? 'Unknown',
            layer: element?.layer ?? '',
            isElement: true,
            children: [],
            members: membersOf(id),
            depth,
        };
        nodeCache.set(id, node);
        node.children = (childrenOf.get(id) ?? [])
            .filter(child => included.has(child) && child !== id)
            .map(child => buildNode(child, depth + 1));
        return node;
    };

    const rootIds = [...included].filter(id => {
        const parent = parentOf.get(id);
        return !parent || !included.has(parent);
    });
    let roots = rootIds.map(id => buildNode(id, 0));

    if (groupByPackage) roots = groupRootsByPackage(roots, model);

    const ownerOf = new Map<string, DsmNode>();
    const parentNodeOf = new Map<string, DsmNode>();
    // The deepest node containing an element is the one that owns it, so
    // register children before their parent and let the parent claim only what
    // no descendant already took.
    const register = (node: DsmNode, parent: DsmNode | undefined) => {
        if (parent) parentNodeOf.set(node.id, parent);
        node.children.forEach(child => register(child, node));
        for (const member of node.members) if (!ownerOf.has(member)) ownerOf.set(member, node);
    };
    roots.forEach(root => register(root, undefined));

    return { roots, ownerOf, parentNodeOf };
}

/** Wrap roots in nested nodes for their SysML package path. */
function groupRootsByPackage(roots: DsmNode[], model: MemoModelDTO): DsmNode[] {
    const top: DsmNode[] = [];
    const byPath = new Map<string, DsmNode>();

    const packageNode = (segments: string[]): DsmNode => {
        const path = segments.join('::');
        const existing = byPath.get(path);
        if (existing) return existing;
        const node: DsmNode = {
            id: `pkg:${path}`,
            name: segments[segments.length - 1],
            kind: 'Package',
            layer: '',
            isElement: false,
            children: [],
            members: [],
            depth: segments.length - 1,
        };
        byPath.set(path, node);
        if (segments.length === 1) top.push(node);
        else packageNode(segments.slice(0, -1)).children.push(node);
        return node;
    };

    for (const root of roots) {
        const path = model.elements[root.id]?.package;
        if (!path) { top.push(root); continue; }
        packageNode(path.split('::')).children.push(root);
    }

    const settle = (node: DsmNode, depth: number): void => {
        node.depth = depth;
        node.children.forEach(child => settle(child, depth + 1));
        if (!node.isElement) node.members = node.children.flatMap(child => child.members);
    };
    top.forEach(node => settle(node, 0));
    return top;
}

// ─── Ordering ────────────────────────────────────────────────────────────────

/**
 * Order every sibling group in place.
 *
 * `partition` is the classic DSM sequencing move: pull the lines that only feed
 * others to the top so marks fall above the diagonal, leaving genuine cycles
 * as the only feedback left. `cluster` instead keeps mutually dependent
 * siblings adjacent. Both work *within* a parent, so the hierarchy the user
 * expanded is never rearranged out from under them.
 */
function orderTree(
    roots: DsmNode[],
    ordering: DsmOrdering,
    depends: (from: DsmNode, to: DsmNode) => boolean,
): DsmNode[] {
    const byName = (a: DsmNode, b: DsmNode) => a.name.localeCompare(b.name);
    const byKind = (a: DsmNode, b: DsmNode) => a.kind.localeCompare(b.kind) || byName(a, b);

    const orderSiblings = (siblings: DsmNode[]): DsmNode[] => {
        if (siblings.length < 2) return siblings;
        if (ordering === 'natural') return [...siblings].sort(byName);
        if (ordering === 'kind') return [...siblings].sort(byKind);
        if (ordering === 'partition') return sequence(siblings, depends);
        return clusterSiblings(siblings, depends);
    };

    const walk = (nodes: DsmNode[]): DsmNode[] => {
        const ordered = orderSiblings(nodes);
        for (const node of ordered) node.children = walk(node.children);
        return ordered;
    };
    return walk(roots);
}

/** Greedy topological sequencing; ties and cycles fall back to name order. */
function sequence(siblings: DsmNode[], depends: (from: DsmNode, to: DsmNode) => boolean): DsmNode[] {
    const remaining = [...siblings].sort((a, b) => a.name.localeCompare(b.name));
    const ordered: DsmNode[] = [];
    while (remaining.length > 0) {
        // A node is ready when nothing left depends on it being placed first —
        // i.e. it has no remaining predecessor feeding into it.
        const ready = remaining.filter(node =>
            !remaining.some(other => other !== node && depends(other, node)));
        if (ready.length === 0) { ordered.push(...remaining); break; }
        for (const node of ready) {
            ordered.push(node);
            remaining.splice(remaining.indexOf(node), 1);
        }
    }
    return ordered;
}

/** Keep siblings that depend on each other next to each other. */
function clusterSiblings(siblings: DsmNode[], depends: (from: DsmNode, to: DsmNode) => boolean): DsmNode[] {
    const parent = siblings.map((_, index) => index);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
            if (depends(siblings[i], siblings[j]) || depends(siblings[j], siblings[i])) {
                parent[find(i)] = find(j);
            }
        }
    }
    const groups = new Map<number, DsmNode[]>();
    siblings.forEach((node, index) => {
        const root = find(index);
        const bucket = groups.get(root);
        if (bucket) bucket.push(node); else groups.set(root, [node]);
    });
    return [...groups.values()]
        .map(group => group.sort((a, b) => a.name.localeCompare(b.name)))
        .sort((a, b) => b.length - a.length || a[0].name.localeCompare(b[0].name))
        .flat();
}

// ─── Flattening ──────────────────────────────────────────────────────────────

/** Walk the tree into the visible lines, stopping at collapsed nodes. */
export function flattenAxis(roots: DsmNode[], expanded: ReadonlySet<string>): DsmAxisEntry[] {
    const entries: DsmAxisEntry[] = [];
    const visit = (node: DsmNode, depth: number, ancestorIds: string[]) => {
        const expandable = node.children.length > 0;
        const isExpanded = expandable && expanded.has(node.id);
        entries.push({
            node,
            index: entries.length + 1,
            depth,
            expandable,
            expanded: isExpanded,
            ancestorIds,
            memberCount: node.members.length,
        });
        if (!isExpanded) return;
        const nextAncestors = [...ancestorIds, node.id];
        for (const child of node.children) visit(child, depth + 1, nextAncestors);
    };
    roots.forEach(root => visit(root, 0, []));
    return entries;
}

/** Every node id in an axis, for expand-all. */
export function collectNodeIds(roots: DsmNode[], maxDepth = Infinity): string[] {
    const ids: string[] = [];
    const visit = (node: DsmNode, depth: number) => {
        if (depth >= maxDepth) return;
        if (node.children.length > 0) ids.push(node.id);
        node.children.forEach(child => visit(child, depth + 1));
    };
    roots.forEach(root => visit(root, 0));
    return ids;
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeHierarchicalDSM(
    model: MemoModelDTO,
    options: HierarchicalDsmOptions = {},
): HierarchicalDsmResult {
    const containmentTypes = options.containmentTypes ?? defaultContainmentTypes(model);
    const parentOf = buildParentMap(model, containmentTypes);

    const childrenOf = new Map<string, string[]>();
    for (const [child, parent] of parentOf) {
        const bucket = childrenOf.get(parent);
        if (bucket) bucket.push(child); else childrenOf.set(parent, [child]);
    }

    const dependencyTypes = new Set(options.dependencyTypes ?? []);
    const isDependency = (rel: MemoRelationship) =>
        (dependencyTypes.size === 0 || dependencyTypes.has(rel.type))
        && !containmentTypes.includes(rel.type);
    const dependencies = model.relationships.filter(isDependency);

    const groupByPackage = options.groupByPackage ?? false;
    const rowAxis = buildAxis(model, parentOf, childrenOf, options.rows, groupByPackage);
    const columnAxis = buildAxis(model, parentOf, childrenOf, options.columns, groupByPackage);

    // Ordering asks "does A depend on B?" for two candidate siblings at any
    // level. Answering that by scanning relationships per pair is quadratic, so
    // every dependency is projected once onto all node pairs it implies —
    // source node and each of its ancestors against target node and each of
    // its ancestors — and the question becomes a set lookup.
    const dependsIndex = (axis: AxisBuild): ((from: DsmNode, to: DsmNode) => boolean) => {
        const pairs = new Set<string>();
        const chainOf = (elementId: string): string[] => {
            const chain: string[] = [];
            let node = axis.ownerOf.get(elementId);
            while (node) { chain.push(node.id); node = axis.parentNodeOf.get(node.id); }
            return chain;
        };
        const record = (sourceId: string, targetId: string) => {
            for (const source of chainOf(sourceId)) {
                for (const target of chainOf(targetId)) {
                    if (source !== target) pairs.add(`${source}>${target}`);
                }
            }
        };
        for (const rel of dependencies) {
            record(rel.sourceId, rel.targetId);
            if (options.symmetric) record(rel.targetId, rel.sourceId);
        }
        return (from, to) => from !== to && pairs.has(`${from.id}>${to.id}`);
    };

    const ordering = options.ordering ?? 'natural';
    const rowRoots = orderTree(rowAxis.roots, options.rows?.ordering ?? ordering, dependsIndex(rowAxis));
    const columnRoots = orderTree(columnAxis.roots, options.columns?.ordering ?? ordering, dependsIndex(columnAxis));

    const rows = flattenAxis(rowRoots, options.rows?.expanded ?? new Set());
    const columns = flattenAxis(columnRoots, options.columns?.expanded ?? new Set());

    const rowIndex = new Map<string, number>();
    rows.forEach((entry, index) => rowIndex.set(entry.node.id, index));
    const columnIndex = new Map<string, number>();
    columns.forEach((entry, index) => columnIndex.set(entry.node.id, index));

    // A member maps to a visible line only when its owning node is on screen;
    // otherwise walk up until one is. Collapsed subtrees resolve to the line
    // the user can actually see.
    const visibleLine = (
        elementId: string,
        axis: AxisBuild,
        index: Map<string, number>,
    ): number | undefined => {
        let node: DsmNode | undefined = axis.ownerOf.get(elementId);
        const seen = new Set<string>();
        while (node && !seen.has(node.id)) {
            seen.add(node.id);
            const found = index.get(node.id);
            if (found !== undefined) return found;
            node = axis.parentNodeOf.get(node.id);
        }
        return undefined;
    };

    const matrix: (DsmAggregateCell | null)[][] = Array.from(
        { length: rows.length },
        () => Array.from({ length: columns.length }, () => null),
    );

    let totalDependencies = 0;
    let internal = 0;
    const place = (rel: MemoRelationship, sourceId: string, targetId: string) => {
        const row = visibleLine(sourceId, rowAxis, rowIndex);
        const column = visibleLine(targetId, columnAxis, columnIndex);
        if (row === undefined || column === undefined) return;
        const rowEntry = rows[row];
        const columnEntry = columns[column];
        const diagonal = rowEntry.node.id === columnEntry.node.id;
        let cell = matrix[row][column];
        if (!cell) {
            cell = {
                strength: 0, types: [], relationshipIds: [], diagonal,
                aggregated: rowEntry.node.id !== sourceId || columnEntry.node.id !== targetId,
            };
            matrix[row][column] = cell;
        }
        cell.strength++;
        if (rowEntry.node.id !== sourceId || columnEntry.node.id !== targetId) cell.aggregated = true;
        if (!cell.types.includes(rel.type)) cell.types.push(rel.type);
        cell.relationshipIds.push(rel.id);
        if (diagonal) internal++; else totalDependencies++;
    };

    for (const rel of dependencies) {
        place(rel, rel.sourceId, rel.targetId);
        if (options.symmetric) place(rel, rel.targetId, rel.sourceId);
    }

    return {
        rowRoots,
        columnRoots,
        rows,
        columns,
        matrix,
        totalDependencies,
        candidateDependencies: dependencies.length,
        elementCount: Object.keys(model.elements).length,
        stats: analyzeHierarchicalDSM(rows, columns, matrix, internal),
        availableDependencyTypes: relationshipTypesInModel(model),
    };
}

function analyzeHierarchicalDSM(
    rows: DsmAxisEntry[],
    columns: DsmAxisEntry[],
    matrix: (DsmAggregateCell | null)[][],
    internal: number,
): DsmStats {
    const columnOfNode = new Map<string, number>();
    columns.forEach((entry, index) => columnOfNode.set(entry.node.id, index));

    let feedback = 0;
    let couplings = 0;
    let isolated = 0;
    let maxDegree = 0;

    const columnDegree = new Array(columns.length).fill(0);
    rows.forEach((rowEntry, row) => {
        let degree = 0;
        matrix[row].forEach((cell, column) => {
            if (!cell || cell.diagonal) return;
            degree += cell.strength;
            columnDegree[column] += cell.strength;
            // Feedback only means something when the two axes are the same
            // list: a mark is "below the diagonal" relative to the row's own
            // position on the column axis.
            const mirrored = columnOfNode.get(rowEntry.node.id);
            if (mirrored !== undefined && column < mirrored) feedback += cell.strength;
        });
        maxDegree = Math.max(maxDegree, degree);
    });

    rows.forEach((rowEntry, row) => {
        const outgoing = matrix[row].some(cell => cell && !cell.diagonal);
        const mirrored = columnOfNode.get(rowEntry.node.id);
        const incoming = mirrored !== undefined
            && matrix.some(line => line[mirrored] && !line[mirrored]!.diagonal);
        if (!outgoing && !incoming) isolated++;
    });

    for (let row = 0; row < rows.length; row++) {
        const mirrored = columnOfNode.get(rows[row].node.id);
        if (mirrored === undefined) continue;
        for (let column = 0; column < columns.length; column++) {
            const cell = matrix[row][column];
            if (!cell || cell.diagonal || column >= mirrored) continue;
            const backRow = rows.findIndex(entry => entry.node.id === columns[column].node.id);
            if (backRow >= 0 && matrix[backRow][mirrored]) couplings++;
        }
    }

    columnDegree.forEach(degree => { maxDegree = Math.max(maxDegree, degree); });
    return { feedback, couplings, isolated, maxDegree, internal };
}

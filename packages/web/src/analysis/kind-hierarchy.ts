// ─── Ontology kind hierarchy for matrix axes ─────────────────────────────────
//
// An axis picker that lists a layer's kinds as one flat alphabet is telling a
// lie about them: `SecurityRequirement` is a `Requirement`, and picking the
// parent should mean "the whole family". The specialization chain already
// exists in the ontology — every `OntologyKindInfo` carries `derivesFrom` —
// so the picker reads it rather than inventing an ordering of its own.
//
// Nothing here knows a kind name. A project with its own ontology gets its own
// tree, and a kind whose parent is not in the same layer is shown as a root of
// that layer rather than being hidden under an ancestor the user cannot see.
// ─────────────────────────────────────────────────────────────────────────────

import type { OntologyPackageInfo } from '../types/ontology';

/** kind name → its immediate supertype, across every loaded ontology package. */
export type KindParents = ReadonlyMap<string, string>;

/** Build the supertype index from the ontology packages the session loaded. */
export function kindParents(packages: readonly OntologyPackageInfo[]): KindParents {
    const parents = new Map<string, string>();
    for (const pkg of packages) {
        for (const layer of pkg.layers) {
            for (const kind of layer.kinds) {
                if (kind.derivesFrom) parents.set(kind.name, kind.derivesFrom);
            }
        }
    }
    return parents;
}

/** One kind on the picker, with the kinds that specialize it beneath it. */
export interface KindNode {
    kind: string;
    /** Elements of exactly this kind. */
    elementCount: number;
    /** Elements of this kind plus every kind below it — what selecting it means. */
    totalCount: number;
    children: KindNode[];
}

/**
 * Arrange a layer's kinds into their specialization tree.
 *
 * Only kinds the layer actually populates appear: an intermediate supertype
 * with no instances of its own still shows when it has populated descendants,
 * because it is the natural place to select the whole family, and it carries
 * the family's total rather than its own zero.
 */
export function kindTree(
    kinds: readonly { kind: string; elementCount: number }[],
    parents: KindParents,
): KindNode[] {
    const counts = new Map(kinds.map(entry => [entry.kind, entry.elementCount]));
    const present = new Set(counts.keys());

    // An unpopulated supertype earns a place only when it joins *two* branches
    // that would otherwise be separate roots. Pulling in every ancestor instead
    // would bury a whole layer under one abstract name that has no instances,
    // and pulling in none would show two halves of a family as unrelated.
    for (;;) {
        const roots = [...present].filter(kind => !nearestPresent(kind, parents, present));
        const joins = new Set<string>();
        for (const root of roots) {
            for (let up = parents.get(root); up; up = parents.get(up)) {
                if (present.has(up)) break;
                if (roots.filter(other => ancestorOf(up!, other, parents)).length >= 2) { joins.add(up); break; }
            }
        }
        if (joins.size === 0) break;
        for (const join of joins) { present.add(join); counts.set(join, 0); }
    }

    const nodes = new Map<string, KindNode>();
    for (const kind of present) {
        nodes.set(kind, { kind, elementCount: counts.get(kind) ?? 0, totalCount: 0, children: [] });
    }

    const roots: KindNode[] = [];
    for (const node of nodes.values()) {
        const parent = nearestPresent(node.kind, parents, present);
        (parent ? nodes.get(parent)!.children : roots).push(node);
    }

    // Totals first, order second: a branch is ranked by the family it carries,
    // which is not known until its children have been summed.
    const total = (node: KindNode): number => {
        node.totalCount = node.elementCount + node.children.reduce((sum, child) => sum + total(child), 0);
        return node.totalCount;
    };
    const order = (node: KindNode) => { node.children.sort(byCountThenName); node.children.forEach(order); };
    roots.forEach(total);
    roots.forEach(order);
    roots.sort(byCountThenName);
    return roots;
}

/** The nearest proper ancestor of `kind` that is itself on this axis. */
function nearestPresent(kind: string, parents: KindParents, present: ReadonlySet<string>): string | undefined {
    for (let up = parents.get(kind); up; up = parents.get(up)) {
        if (present.has(up)) return up;
    }
    return undefined;
}

function byCountThenName(a: KindNode, b: KindNode): number {
    return b.totalCount - a.totalCount || a.kind.localeCompare(b.kind);
}

function ancestorOf(ancestor: string, kind: string, parents: KindParents): boolean {
    for (let up = parents.get(kind); up; up = parents.get(up)) {
        if (up === ancestor) return true;
    }
    return false;
}

/**
 * Every kind selecting `kind` stands for: itself and everything below it.
 *
 * The axis filter uses this, so choosing `Requirement` on a matrix axis lists
 * the `SecurityRequirement`s too — which is what the tree on screen promised.
 */
export function kindsUnder(kind: string, parents: KindParents, universe: Iterable<string>): string[] {
    const result = [kind];
    for (const candidate of universe) {
        if (candidate !== kind && ancestorOf(kind, candidate, parents)) result.push(candidate);
    }
    return result;
}

/** Flatten a tree to `{kind, depth}` rows, for a picker that renders indentation. */
export function flattenKindTree(roots: readonly KindNode[], depth = 0): { node: KindNode; depth: number }[] {
    return roots.flatMap(node => [{ node, depth }, ...flattenKindTree(node.children, depth + 1)]);
}

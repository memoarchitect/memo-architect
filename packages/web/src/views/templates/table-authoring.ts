// ─── Authoring from a diagram's table ────────────────────────────────────────
//
// What the table mode of a diagram may add to a row, read from the ontology:
// which kinds can go under it, and which links it can take. Nothing here names a
// kind or a relation. A link's category comes from how the ontology declares the
// relation, its legality from the shared resolver, and its scope from the rules
// the server evaluated (`RelationshipEndScopes`).
// ─────────────────────────────────────────────────────────────────────────────

import {
    endAllowedByRules, findRelationshipDefinition, isAuthorableRelationship, legalRelationshipsForElement,
    type KindDefinitionDTO, type MemoElement, type MemoModelDTO, type MemoRelationship, type OntologyRegistriesDTO,
    type RelationshipDefinitionDTO, type RelationshipDirection, type RelationshipEndScopes,
} from '@memoarchitect/tools/browser';
import { buildOwnershipTest, type CompositionTree } from './composition-tree';

export type TableLinkCategory = 'allocation' | 'trace';

/** The ontology says which: `allocate` is how an allocation is written, and a trace relation declares `isTrace`. */
export function linkCategory(definition: RelationshipDefinitionDTO): TableLinkCategory | undefined {
    if (definition.nativeKeyword === 'allocate') return 'allocation';
    return definition.isTrace ? 'trace' : undefined;
}

const ownEnd = (direction: RelationshipDirection) => (direction === 'outgoing' ? 'source' : 'target');
const oppositeEnd = (direction: RelationshipDirection) => (direction === 'outgoing' ? 'target' : 'source');

/**
 * Whether a row may take this relation in this direction: the writer can state it, and the rules on the row's own
 * end allow it. Allocating a row is always of the row: what lands on it is allocated from the other element's row.
 */
export function rowMayHold(
    definition: RelationshipDefinitionDTO, direction: RelationshipDirection, element: Pick<MemoElement, 'kind'>,
    scopes: RelationshipEndScopes | undefined,
): boolean {
    if (!isAuthorableRelationship(definition)) return false;
    if (linkCategory(definition) === 'allocation' && direction === 'incoming') return false;
    return endAllowedByRules(scopes, definition.name, ownEnd(direction), element.kind);
}

/** Whether an element may be at the far end of this relation from the row. */
export function targetMayHold(
    definition: RelationshipDefinitionDTO, direction: RelationshipDirection, element: Pick<MemoElement, 'kind'>,
    scopes: RelationshipEndScopes | undefined,
): boolean {
    return endAllowedByRules(scopes, definition.name, oppositeEnd(direction), element.kind);
}

/** The categories of link a row can take; an empty set means the row offers none. */
export function rowLinkCategories(
    element: Pick<MemoElement, 'kind'>, registries: OntologyRegistriesDTO, scopes: RelationshipEndScopes | undefined,
): Set<TableLinkCategory> {
    const categories = new Set<TableLinkCategory>();
    for (const { definition, directions } of legalRelationshipsForElement(element, registries)) {
        const category = linkCategory(definition);
        if (category && directions.some(direction => rowMayHold(definition, direction, element, scopes))) categories.add(category);
    }
    return categories;
}

export interface RowLink { type: string; label: string; otherId: string; otherName: string; direction: RelationshipDirection }

/** A row's existing allocations and traces. */
export function linksByRow(model: MemoModelDTO, registries: OntologyRegistriesDTO): Map<string, Record<TableLinkCategory, RowLink[]>> {
    const links = new Map<string, Record<TableLinkCategory, RowLink[]>>();
    const of = (id: string) => {
        let entry = links.get(id);
        if (!entry) links.set(id, entry = { allocation: [], trace: [] });
        return entry;
    };
    const nameOf = (id: string) => model.elements[id]?.name ?? id.split('::').pop() ?? id;
    for (const relationship of model.relationships) {
        const definition = findRelationshipDefinition(relationship.type, registries);
        const category = definition && linkCategory(definition);
        if (!definition || !category) continue;
        const add = (at: string, otherId: string, direction: RelationshipDirection) => of(at)[category].push({
            type: definition.name, label: definition.label, otherId, otherName: nameOf(otherId), direction,
        });
        add(relationship.sourceId, relationship.targetId, 'outgoing');
        // An allocation is read from the thing allocated; the part it lands on is not a row's allocation.
        if (category === 'trace') add(relationship.targetId, relationship.sourceId, 'incoming');
    }
    // The model records a native `allocate` on the element as well as, or instead of, as a relationship.
    const allocationName = registries.relationships.find(definition => linkCategory(definition) === 'allocation');
    for (const element of Object.values(model.elements)) {
        if (!element.allocatedTo || !allocationName) continue;
        if (of(element.id).allocation.some(link => link.otherId === element.allocatedTo)) continue;
        of(element.id).allocation.push({
            type: allocationName.name, label: allocationName.label, otherId: element.allocatedTo,
            otherName: nameOf(element.allocatedTo), direction: 'outgoing',
        });
    }
    return links;
}

/** Which kinds a new row under `parent` may have, the likeliest first. */
export function childKindOptions(
    parent: MemoElement,
    siblings: readonly MemoElement[],
    registries: OntologyRegistriesDTO,
    /** A block hierarchy nests by family; a flow's steps are of the parent's layer, whatever their family. */
    scope: 'hierarchy' | 'flow',
): KindDefinitionDTO[] {
    const owns = buildOwnershipTest(registries.kinds);
    const parentLayer = registries.kinds.find(kind => kind.name === parent.kind)?.layer ?? parent.layer;
    const siblingKinds = new Set(siblings.map(sibling => sibling.kind));
    const offered = registries.kinds.filter(kind => {
        if (kind.isAbstract || kind.construct.replace(/\s*def$/, '').trim() !== parent.construct) return false;
        if (siblingKinds.has(kind.name)) return true;
        return scope === 'flow' ? kind.layer === parentLayer : owns(parent, { kind: kind.name } as MemoElement);
    });
    // A sibling of a project's own definition is a usage of that one step; a new step is more likely another of the
    // ontology kind it specializes, so that kind comes first.
    const byName = new Map(registries.kinds.map(kind => [kind.name, kind]));
    const ontologyKindOf = (name: string): string => {
        let current = byName.get(name);
        for (let guard = 0; current?.origin === 'project' && current.superType && guard < 16; guard++) current = byName.get(current.superType);
        return current?.name ?? name;
    };
    const siblingOntologyKinds = new Set([...siblingKinds].map(ontologyKindOf));
    const rank = (kind: KindDefinitionDTO) => (siblingOntologyKinds.has(kind.name) ? 0
        : siblingKinds.has(kind.name) ? 1 : kind.name === parent.kind ? 2 : 3);
    return offered.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
}

/**
 * The name a new usage declares, in lowerCamelCase, from what the user typed. The label keeps what they typed;
 * this is only the identifier. Undefined when the text holds nothing a name can be made from.
 */
export function declaredNameFor(label: string, isTaken: (name: string) => boolean): string | undefined {
    const words = label.match(/[A-Za-z0-9]+/g);
    if (!words) return undefined;
    const joined = words.map((word, index) => (index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1))).join('');
    const base = /^[0-9]/.test(joined) ? `n${joined}` : joined;
    if (!isTaken(base)) return base;
    let suffix = 2;
    while (isTaken(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
}

/** Where a new row goes when it is not added under a particular row. */
export function viewInsertionPoint(tree: CompositionTree, model: MemoModelDTO): { parent?: MemoElement; packageName?: string; file?: string } {
    if (tree.roots.length === 1) return { parent: tree.elements.get(tree.roots[0]) };
    const first = tree.elements.get(tree.roots[0]);
    if (!first) return {};
    const ownerId = first.parentAction ?? first.owner;
    const owner = ownerId ? model.elements[ownerId] : undefined;
    return owner ? { parent: owner } : { packageName: first.package, file: first.file };
}

// ─── Where a step goes in its flow ───────────────────────────────────────────

/** Where a step is put in the order of its siblings: nowhere, first, or after one of them. */
export type StepPlacement = { kind: 'none' } | { kind: 'start' } | { kind: 'after'; afterId: string };

/** The writes that put a step in place: at most one succession moved, and the ones created. */
export interface PlacementWrites {
    move?: { relationshipId: string; sourceId: string; targetId: string };
    create: { sourceId: string; targetId: string }[];
}

/**
 * The successions that put `stepId` where `placement` says, among `siblings` in the order they run. A step put
 * after one that already leads to the next goes between them: that succession is moved to end at the new step,
 * which then leads to the next one, so the flow stays one sequence rather than forking. A succession the compile
 * gave no source range cannot be moved, and the step is then joined on as a branch.
 */
export function placementWrites(
    stepId: string,
    siblings: readonly string[],
    /** The model's successions, from `relationshipsOfType`. */
    allSuccessions: readonly MemoRelationship[],
    placement: StepPlacement,
): PlacementWrites {
    const others = siblings.filter(id => id !== stepId);
    const among = new Set(others);
    const successions = allSuccessions.filter(rel => among.has(rel.sourceId) && among.has(rel.targetId));
    if (placement.kind === 'none' || others.length === 0) return { create: [] };
    if (placement.kind === 'start') {
        const first = others.find(id => !successions.some(rel => rel.targetId === id)) ?? others[0];
        return { create: [{ sourceId: stepId, targetId: first }] };
    }
    const next = successions.filter(rel => rel.sourceId === placement.afterId);
    if (next.length === 1 && next[0].sourceRange) {
        return {
            move: { relationshipId: next[0].id, sourceId: placement.afterId, targetId: stepId },
            create: [{ sourceId: stepId, targetId: next[0].targetId }],
        };
    }
    return { create: [{ sourceId: placement.afterId, targetId: stepId }] };
}

/** Where a new step goes unless the user says otherwise: after the last step, so a flow grows at its end. */
export function defaultPlacement(siblings: readonly string[]): StepPlacement {
    return siblings.length > 0 ? { kind: 'after', afterId: siblings[siblings.length - 1] } : { kind: 'none' };
}

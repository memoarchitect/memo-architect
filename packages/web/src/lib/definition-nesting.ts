import type { MemoElement } from '@memoarchitect/tools/browser';

/**
 * A usage belongs under the definition it is a usage OF.
 *
 * A model-local definition and its usages read as siblings otherwise:
 * `AcquireSensorData` (an ActionDefinition) listed next to `acquireSensors`,
 * which is a usage of it. Nesting the two is what a definition is for, and it
 * is the same rule in both explorer trees — so it lives here rather than in
 * whichever one implemented it first.
 *
 * The link is the usage's `kind`: it names the definition. Only definitions
 * that are themselves elements of this model can parent anything — a usage of
 * an ONTOLOGY kind has no local definition to sit under and stays where it is.
 */

/**
 * True for a definition.
 *
 * `isDefinition` is what the builder sets, and it is the answer: a `part def
 * Pump :> LogicalComponent` carries the kind `LogicalComponent`, so the name
 * of the kind cannot be read as the answer any more. The suffix test remains
 * as a fallback for a model built before the flag existed.
 */
function isDefinitionElement(element: MemoElement): boolean {
    return element.isDefinition ?? /Definition$|Def$/.test(element.kind);
}

/** Model-local definitions, keyed by the name a usage's `kind` would give. */
export function indexLocalDefinitions(elements: Iterable<MemoElement>): Map<string, MemoElement> {
    const byName = new Map<string, MemoElement>();
    for (const element of elements) {
        if (isDefinitionElement(element)) byName.set(element.name || element.id, element);
    }
    return byName;
}

/** The local definition this element is a usage of, if there is one. */
export function definitionOf(
    element: MemoElement,
    definitions: Map<string, MemoElement>,
): MemoElement | undefined {
    const definition = definitions.get(element.kind);
    // Never let a definition parent itself, and never build a cycle: a
    // definition may now specialize another one, so the chain has to be walked
    // rather than only the first step checked.
    if (!definition || definition.id === element.id || definition.kind === element.kind) return undefined;
    const seen = new Set([element.id]);
    for (let cursor: MemoElement | undefined = definition; cursor; cursor = definitions.get(cursor.kind)) {
        if (seen.has(cursor.id)) return undefined;
        seen.add(cursor.id);
    }
    return definition;
}

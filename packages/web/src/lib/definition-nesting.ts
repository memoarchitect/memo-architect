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

/** Model-local definitions, keyed by the name a usage's `kind` would give. */
export function indexLocalDefinitions(elements: Iterable<MemoElement>): Map<string, MemoElement> {
    const byName = new Map<string, MemoElement>();
    for (const element of elements) {
        if (/Definition$|Def$/.test(element.kind)) byName.set(element.name || element.id, element);
    }
    return byName;
}

/** The local definition this element is a usage of, if there is one. */
export function definitionOf(
    element: MemoElement,
    definitions: Map<string, MemoElement>,
): MemoElement | undefined {
    const definition = definitions.get(element.kind);
    // Never let a definition parent itself, and never build a 2-cycle.
    if (!definition || definition.id === element.id || definition.kind === element.kind) return undefined;
    return definition;
}

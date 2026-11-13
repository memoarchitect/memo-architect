import type { MemoModelDTO } from '@memoarchitect/tools/browser';

/**
 * What an ontology definition is called on screen: the `@MemoIdentity` label the
 * ontology gives it, else its declared name, as written. Nothing here derives a
 * name or changes its case; the ontology owns the text.
 */
type Registries = MemoModelDTO['registries'];

const cache = new WeakMap<object, Map<string, string>>();

function labels(registries: Registries): Map<string, string> {
    if (!registries) return new Map();
    let map = cache.get(registries);
    if (!map) {
        map = new Map();
        for (const kind of registries.kinds ?? []) if (kind.label) map.set(kind.name, kind.label);
        for (const relationship of registries.relationships ?? []) {
            if (!relationship.label) continue;
            map.set(relationship.name, relationship.label);
            if (relationship.sysmlName) map.set(relationship.sysmlName, relationship.label);
        }
        cache.set(registries, map);
    }
    return map;
}

/** An element kind (`SoftwareRequirement`) or relationship type (`derivesFrom`, `DerivesFrom`) by its label. */
export function ontologyLabel(registries: Registries, name: string): string {
    return labels(registries).get(name) ?? name;
}

type Model = MemoModelDTO | null | undefined;
const definitionNames = new WeakMap<object, Map<string, string>>();

/**
 * A type as a diagram names it (`name : Type`, «Type»): the ontology's label for an ontology
 * definition, the project definition's own label for one of the project's, else the name as written.
 * A qualified name (`pkg::Board`) is looked up by its last segment.
 */
export function typeLabel(model: Model, type: string): string {
    const name = type.split('::').pop() ?? type;
    const fromOntology = labels(model?.registries).get(name);
    if (fromOntology) return fromOntology;
    if (!model) return name;
    let map = definitionNames.get(model);
    if (!map) {
        map = new Map();
        for (const element of Object.values(model.elements ?? {}) as { isDefinition?: boolean; shortName?: string; name?: string }[]) {
            if (element.isDefinition && element.shortName && element.name && !map.has(element.shortName)) map.set(element.shortName, element.name);
        }
        definitionNames.set(model, map);
    }
    return map.get(name) ?? name;
}

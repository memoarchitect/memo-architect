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

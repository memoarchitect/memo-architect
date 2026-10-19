// ─── Named groups of a DSM ────────────────────────────────────────────────────
//
// A group is declared by what holds it together: a package, a memo-query, or
// the clusters the dependencies themselves form. This turns each declaration
// into the element ids it holds, among the elements on the axis.

import type { MatrixGroupDTO } from '@memoarchitect/tools/browser';
import type { DsmNamedGroup } from '../analysis/dsm-hierarchy';

interface Edge { sourceId: string; targetId: string }

/** Connected components of the dependency graph among `ids`, largest first; a lone element forms none. */
export function dependencyClusters(ids: readonly string[], relationships: readonly Edge[]): string[][] {
    const parent = new Map(ids.map(id => [id, id]));
    const find = (id: string): string => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root)!;
        for (let node = id; node !== root;) { const next = parent.get(node)!; parent.set(node, root); node = next; }
        return root;
    };
    for (const { sourceId, targetId } of relationships) {
        if (parent.has(sourceId) && parent.has(targetId) && sourceId !== targetId) parent.set(find(sourceId), find(targetId));
    }
    const components = new Map<string, string[]>();
    for (const id of ids) components.set(find(id), [...(components.get(find(id)) ?? []), id]);
    return [...components.values()].filter(component => component.length > 1)
        .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

export function resolveGroups(
    groups: readonly MatrixGroupDTO[],
    axisIds: readonly string[],
    packageOf: (id: string) => string | undefined,
    relationships: readonly Edge[],
    /** Ids each memo-query group matched, by the query's text. */
    matchedByQuery: ReadonlyMap<string, readonly string[]>,
): DsmNamedGroup[] {
    const onAxis = new Set(axisIds);
    const resolved: DsmNamedGroup[] = [];
    for (const group of groups) {
        const name = group.name.trim();
        if (!name) continue;
        if (group.groupedBy === 'owningPackage') {
            const wanted = (group.expression ?? '').trim();
            if (!wanted) continue;
            const members = axisIds.filter(id => { const pkg = packageOf(id); return pkg === wanted || Boolean(pkg?.startsWith(`${wanted}::`)); });
            if (members.length > 0) resolved.push({ name, memberIds: new Set(members) });
        } else if (group.groupedBy === 'memoQuery') {
            const members = (matchedByQuery.get((group.expression ?? '').trim()) ?? []).filter(id => onAxis.has(id));
            if (members.length > 0) resolved.push({ name, memberIds: new Set(members) });
        } else {
            dependencyClusters(axisIds, relationships).forEach((component, index) =>
                resolved.push({ name: `${name} ${index + 1}`, memberIds: new Set(component) }));
        }
    }
    return resolved;
}

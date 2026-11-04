// ─── Use cases at two levels ─────────────────────────────────────────────────
//
// A use case is declared clinical or system by its type (`ClinicalUseCase`, `SystemUseCase`); the
// model DTO's `operationalLevels` says which. Clinical use cases are listed first, as their own
// group; the system use cases they include nest under them, and an included case is not also
// listed at the top. The rest are listed under the system (or system of systems) that holds them,
// from the workspace membership. Membership no longer decides the level: it only says where a
// system use case is held. A model with no level declared, or with no System, still lists what it
// has in one flat group, and a case nothing holds is listed last rather than hidden.
// ─────────────────────────────────────────────────────────────────────────────

import type { OperationalLevel, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';

export interface UseCaseEntry { id: string; depth: number }
export interface UseCaseGroup {
    id: string;
    /** Undefined for the flat group of a model with no System. */
    label: string | undefined;
    entries: UseCaseEntry[];
}

export function groupUseCases(
    useCaseIds: readonly string[],
    includes: readonly { sourceId: string; targetId: string }[],
    membership: WorkspaceMembershipDTO | undefined,
    nameOf: (id: string) => string,
    levelOf: (id: string) => OperationalLevel | undefined = () => undefined,
): UseCaseGroup[] {
    const ids = new Set(useCaseIds);
    const children = new Map<string, string[]>();
    const included = new Set<string>();
    for (const edge of includes) {
        if (!ids.has(edge.sourceId) || !ids.has(edge.targetId)) continue;
        children.set(edge.sourceId, [...(children.get(edge.sourceId) ?? []), edge.targetId]);
        included.add(edge.targetId);
    }
    const emitted = new Set<string>();
    const walk = (id: string, depth: number, into: UseCaseEntry[], path: Set<string>) => {
        // A case is listed once: where it is first reached, under the case that includes it.
        if (path.has(id) || emitted.has(id)) return;
        emitted.add(id);
        into.push({ id, depth });
        for (const child of [...(children.get(id) ?? [])].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))) {
            walk(child, depth + 1, into, new Set(path).add(id));
        }
    };
    const rooted = (roots: string[]): UseCaseEntry[] => {
        const entries: UseCaseEntry[] = [];
        for (const id of [...roots].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))) walk(id, 0, entries, new Set());
        return entries;
    };

    const clinical = useCaseIds.filter(id => !included.has(id) && levelOf(id) === 'clinical');
    const groups: UseCaseGroup[] = [];
    if (clinical.length > 0) groups.push({ id: 'clinical', label: 'Clinical', entries: rooted(clinical) });
    const rest = useCaseIds.filter(id => !emitted.has(id) && !clinical.includes(id));

    if (!membership || membership.missingSystem) {
        const entries = rooted(rest.filter(id => !included.has(id)));
        const remaining = rooted(rest.filter(id => !emitted.has(id)));
        const label = clinical.length > 0 ? 'System' : undefined;
        if (entries.length + remaining.length > 0 || groups.length === 0) groups.push({ id: 'all', label, entries: [...entries, ...remaining] });
        return groups;
    }

    const scopeOf = new Map(membership.workspaces.map(workspace => [workspace.root, workspace]));
    const heldBy = (id: string) => (membership.membership[id] ?? []).map(root => scopeOf.get(root)).filter(Boolean) as { root: string; scope: string; name: string }[];

    // A case is listed under the system that holds it, or under the system of systems when only that does.
    const bySystem = new Map<string, string[]>();
    const orphans: string[] = [];
    for (const id of rest) {
        if (included.has(id)) continue;
        const held = heldBy(id);
        const homes = held.some(w => w.scope === 'system') ? held.filter(w => w.scope === 'system') : held.filter(w => w.scope === 'sos');
        if (homes.length === 0) { orphans.push(id); continue; }
        for (const home of homes) bySystem.set(home.root, [...(bySystem.get(home.root) ?? []), id]);
    }
    const order = (root: string) => `${scopeOf.get(root)!.scope === 'sos' ? '0' : '1'}${scopeOf.get(root)!.name}`;
    for (const [root, roots] of [...bySystem].sort(([a], [b]) => order(a).localeCompare(order(b)))) {
        groups.push({ id: `system:${root}`, label: scopeOf.get(root)!.name, entries: rooted(roots) });
    }
    // What nothing holds comes first, with the cases it includes nested under it. Anything still unlisted
    // after that (included only by a case outside the list) is not hidden; it is listed last, once.
    const unassigned = rooted(orphans);
    unassigned.push(...rooted(useCaseIds.filter(id => !emitted.has(id))));
    if (unassigned.length > 0) groups.push({ id: 'unassigned', label: 'Unassigned', entries: unassigned });
    return groups;
}

// ─── Use cases at two levels (plan A6, rule O8) ──────────────────────────────
//
// A clinical procedure is a use case the system of systems holds and no system does; the system use
// cases it includes (`includesStep`) nest under it, and an included case is not also listed at the
// top. A system use case nothing includes is listed under its system, below the procedures. Level
// comes from the workspace membership, not from `useCaseKind` (which has no "system" value) and not
// from the subject. With no membership (no System in the model) there is one flat group.
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';

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

    if (!membership || membership.missingSystem) {
        const entries = rooted(useCaseIds.filter(id => !included.has(id)));
        const rest = rooted(useCaseIds.filter(id => !emitted.has(id)));
        return [{ id: 'all', label: undefined, entries: [...entries, ...rest] }];
    }

    const scopeOf = new Map(membership.workspaces.map(workspace => [workspace.root, workspace]));
    const heldBy = (id: string) => (membership.membership[id] ?? []).map(root => scopeOf.get(root)).filter(Boolean) as { root: string; scope: string; name: string }[];

    const groups: UseCaseGroup[] = [];
    const procedures = useCaseIds.filter(id => {
        const held = heldBy(id);
        return !included.has(id) && held.some(w => w.scope === 'sos') && !held.some(w => w.scope === 'system');
    });
    if (procedures.length > 0) groups.push({ id: 'procedures', label: 'Procedures', entries: rooted(procedures) });

    const bySystem = new Map<string, string[]>();
    const orphans: string[] = [];
    for (const id of useCaseIds) {
        if (included.has(id) || procedures.includes(id)) continue;
        const systems = heldBy(id).filter(w => w.scope === 'system');
        if (systems.length === 0) { orphans.push(id); continue; }
        for (const system of systems) bySystem.set(system.root, [...(bySystem.get(system.root) ?? []), id]);
    }
    for (const [root, roots] of [...bySystem].sort(([a], [b]) => (scopeOf.get(a)!.name).localeCompare(scopeOf.get(b)!.name))) {
        groups.push({ id: `system:${root}`, label: scopeOf.get(root)!.name, entries: rooted(roots) });
    }
    // What nothing holds comes first, with the cases it includes nested under it. Anything still unlisted
    // after that (included only by a case outside the list) is not hidden; it is listed last, once.
    const unassigned = rooted(orphans);
    unassigned.push(...rooted(useCaseIds.filter(id => !emitted.has(id))));
    if (unassigned.length > 0) groups.push({ id: 'unassigned', label: 'Unassigned', entries: unassigned });
    return groups;
}

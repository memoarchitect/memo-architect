// ─── Which system does this belong to? ───────────────────────────────────────
//
// Which system an ELEMENT belongs to is the workspace membership's answer (memo-tools, plan T2),
// not computed here. What is left is grouping items that name a system themselves, such as a DHF
// document with a `systemId`.
//
// A system-of-systems project has more than one device in it, and a flat list
// of use cases or DHF documents across all of them is unreadable: the reader
// cannot tell which pump a use case is about. Both surfaces group by system,
// and anything that does not resolve to one is filed under Global rather than
// hidden — an untraced use case is a finding, not something to drop.
//
// The kind names are read from the ontology's specialization chain, not
// matched by string: any kind deriving from `System` (a project's own
// `InfusionSystem`, say) is a system root here without this file being
// touched. `SYSTEM_ROOT_KINDS` names only the ontology's two structural roots,
// which is the one thing that cannot be derived from the chain itself.
// ─────────────────────────────────────────────────────────────────────────────

import type { KindParents } from '../analysis/kind-hierarchy';

/** Where an element lands when nothing ties it to a system. */
export const GLOBAL_SYSTEM = 'Global';

/**
 * The ontology's structural roots for "a system". Everything deriving from
 * either is one too, resolved through `derivesFrom`.
 */
export const SYSTEM_ROOT_KINDS = ['System', 'SystemOfSystems'] as const;

/** Whether `kind` is, or specializes, one of the system roots. */
export function isSystemKind(kind: string, parents: KindParents, roots: readonly string[] = SYSTEM_ROOT_KINDS): boolean {
    if (roots.includes(kind)) return true;
    for (let up = parents.get(kind); up; up = parents.get(up)) {
        if (roots.includes(up)) return true;
    }
    return false;
}

export interface SystemResolution {
    /** The system's element id, or undefined for Global. */
    systemId?: string;
    /** What the group header reads. */
    label: string;
}

/**
 * Group anything that carries an element by system, Global last.
 *
 * Systems are ordered by name so the sidebar does not reshuffle when a
 * document is added, and Global is pinned to the bottom because it is the
 * residue rather than a peer.
 */
export function groupBySystem<T>(
    items: readonly T[],
    systemOf: (item: T) => SystemResolution,
): { label: string; systemId?: string; items: T[] }[] {
    const groups = new Map<string, { label: string; systemId?: string; items: T[] }>();
    for (const item of items) {
        const resolution = systemOf(item);
        const key = resolution.systemId ?? GLOBAL_SYSTEM;
        let group = groups.get(key);
        if (!group) { group = { label: resolution.label, systemId: resolution.systemId, items: [] }; groups.set(key, group); }
        group.items.push(item);
    }
    return [...groups.values()].sort((a, b) =>
        (a.systemId ? 0 : 1) - (b.systemId ? 0 : 1) || a.label.localeCompare(b.label));
}

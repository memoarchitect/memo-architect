// ─── How the Model explorer groups its roots ─────────────────────────────────
//
// Five readings of one model (plan A6). The tree below a group is the explorer's own (kind, then
// package, then composition); a mode only decides the groups at the top.
//
//   layer             today's: the ontology's domains. In the system of systems' workspace the
//                     elements no workspace holds are pulled into an Unassigned group, because
//                     an element nothing links is a finding and belongs where the whole picture is.
//   system            one group per workspace that holds the element: the system of systems, then
//                     each system by name, then Unassigned. A shared element is listed under every
//                     system that holds it, which is also what the workspace selector shows.
//   definitionUsage   two groups, flat: a definition and a usage are different things.
//   package           one group per top-level package.
//   navigator         not a grouping: the SoS -> system -> subsystem -> component drill-down.
//
// Which workspaces hold an element is `workspaceMembership` from memo-tools. Nothing here resolves
// a system on its own.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';

export type ExplorerMode = 'layer' | 'system' | 'definitionUsage' | 'package' | 'navigator';

export const EXPLORER_MODES: { id: ExplorerMode; label: string }[] = [
    { id: 'layer', label: 'By layer' },
    { id: 'system', label: 'By system' },
    { id: 'definitionUsage', label: 'Definitions vs usages' },
    { id: 'package', label: 'By package' },
    { id: 'navigator', label: 'System navigator' },
];

export interface ExplorerPartition {
    id: string;
    label: string;
    color: string;
    /** Below 900 the group leads; at or above, it follows the ontology's domains. */
    rank: number;
}

const UNASSIGNED: ExplorerPartition = { id: 'unassigned', label: 'Unassigned', color: '#F59E0B', rank: 1000 };

export interface ExplorerModeOptions {
    mode: ExplorerMode;
    membership: WorkspaceMembershipDTO | undefined;
    /** The chosen workspace root, or null for the whole model. */
    workspace: string | null;
}

/** The elements held by more than one system, for the Shared badge (shown in every mode). */
export function sharedIds(membership: WorkspaceMembershipDTO | undefined): ReadonlySet<string> {
    return new Set(membership?.shared ?? []);
}

/**
 * The groups an element is listed under, or undefined to leave it to the ontology's domains.
 * A list because a shared element sits under each system that holds it.
 */
export function partitionsOf(el: MemoElement, options: ExplorerModeOptions): ExplorerPartition[] | undefined {
    const { mode, membership, workspace } = options;
    const unassigned = new Set(membership?.unassigned ?? []);
    switch (mode) {
        case 'layer': {
            const chosen = membership?.workspaces.find(candidate => candidate.root === workspace);
            return chosen?.scope === 'sos' && unassigned.has(el.id) ? [UNASSIGNED] : undefined;
        }
        case 'system': {
            if (!membership || membership.missingSystem) return undefined;
            const roots = membership.membership[el.id] ?? [];
            const held = membership.workspaces
                .filter(candidate => roots.includes(candidate.root) && (!workspace || candidate.root === workspace))
                .map(candidate => ({
                    id: `ws:${candidate.root}`, label: candidate.name,
                    color: candidate.scope === 'sos' ? '#6366F1' : '#0EA5E9',
                    rank: candidate.scope === 'sos' ? 0 : 1,
                }));
            return held.length > 0 ? held : [UNASSIGNED];
        }
        case 'definitionUsage':
            return [el.isDefinition
                ? { id: 'definitions', label: 'Definitions', color: '#6B7280', rank: 0 }
                : { id: 'usages', label: 'Usages', color: '#8B5CF6', rank: 1 }];
        case 'package': {
            const top = (el.package ?? '').split('::')[0];
            return [top ? { id: `pkg:${top}`, label: top, color: '#6B7280', rank: 0 } : { id: 'pkg:', label: '(no package)', color: '#9CA3AF', rank: 2 }];
        }
        default:
            return undefined;
    }
}

/** Whether a mode lists definitions and usages as separate rows rather than folding one under the other. */
export const isFlatMode = (mode: ExplorerMode): boolean => mode === 'definitionUsage';

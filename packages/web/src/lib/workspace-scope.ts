// ─── Which part of the model a workspace shows ───────────────────────────────
//
// A workspace is the system of systems, or one system. It is not declared: memo-tools computes
// it from the links (`workspaceMembership` on the model, plan T2) and this file only reads that
// answer. Choosing one narrows what the pages list to the elements it holds; choosing none shows
// the whole model.
//
//   - a system's workspace holds what the system holds, shared elements included (a part two
//     systems use is in both);
//   - the system of systems' workspace also holds the Unassigned group: elements that no system
//     or system of systems holds. They are shown where the whole picture is, not hidden, because
//     an element nothing links is a finding.
//
// A relationship is kept when both of its ends are.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO, ValidationResult, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';

export interface WorkspaceOption {
    root: string;
    name: string;
    scope: 'system' | 'sos';
}

/** The workspaces the model offers: the system(s) of systems first, then the systems, by name. */
export function workspaceOptions(membership: WorkspaceMembershipDTO | undefined): WorkspaceOption[] {
    if (!membership) return [];
    const rank = (option: WorkspaceOption) => (option.scope === 'sos' ? 0 : 1);
    return [...membership.workspaces].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The set of element ids a workspace shows, or undefined when the whole model is shown. */
export function idsInWorkspace(membership: WorkspaceMembershipDTO | undefined, workspace: string | null): Set<string> | undefined {
    if (!workspace || !membership) return undefined;
    const chosen = membership.workspaces.find(candidate => candidate.root === workspace);
    if (!chosen) return undefined;
    const ids = new Set<string>();
    for (const [id, roots] of Object.entries(membership.membership)) {
        if (roots.includes(workspace)) ids.add(id);
    }
    if (chosen.scope === 'sos') for (const id of membership.unassigned) ids.add(id);
    return ids;
}

const cache = new WeakMap<MemoModelDTO, Map<string, MemoModelDTO>>();

/**
 * The model as a workspace shows it. The same object when no workspace is chosen, or the chosen
 * one is not in the model (a saved choice for a system that was since removed), so the pages
 * never go empty because of a stale preference.
 */
export function scopeModel(model: MemoModelDTO, workspace: string | null): MemoModelDTO {
    const ids = idsInWorkspace(model.workspaceMembership, workspace);
    if (!ids || !workspace) return model;
    let byWorkspace = cache.get(model);
    if (!byWorkspace) cache.set(model, byWorkspace = new Map());
    const cached = byWorkspace.get(workspace);
    if (cached) return cached;
    const elements = Object.fromEntries(Object.entries(model.elements).filter(([id]) => ids.has(id)));
    const scoped: MemoModelDTO = {
        ...model,
        elements,
        relationships: model.relationships.filter(relationship => ids.has(relationship.sourceId) && ids.has(relationship.targetId)),
    };
    byWorkspace.set(workspace, scoped);
    return scoped;
}

/**
 * The validation result for a workspace: the one memo-tools computed for it, or the whole result
 * when none is chosen or none was sent. Never a client-side filter of the whole result by element;
 * see `useScopedValidation`.
 */
export function validationForWorkspace<T extends Pick<ValidationResult, 'byWorkspace'>>(validation: T | null, workspace: string | null): T | null {
    return ((workspace && validation?.byWorkspace?.[workspace]) as T | undefined) || validation;
}

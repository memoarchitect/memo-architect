// ─── The viewpoints a role sees ──────────────────────────────────────────────
//
// A viewpoint names the stakeholders it is written for (ISO/IEC/IEEE 42010),
// and memo-tools resolves a role to exactly those (`viewpointsForRole`). A list
// filtered by role shows those, plus two more kinds of viewpoint:
//
//   - one that names no stakeholder. Most project-authored viewpoints declare
//     none, and hiding them would empty the views list for every role;
//   - the viewpoint that frames a kept one, so a constituent's viewpoint still
//     sits under the system-of-systems viewpoint it nests in.
//
// What is hidden is the viewpoint, never its views' membership: a view of a
// hidden viewpoint is not "uncategorized".
// ─────────────────────────────────────────────────────────────────────────────

import { viewpointsForRole, type RoleViewDTO, type ViewpointDTO } from '@memoarchitect/tools/browser';

export function viewpointsVisibleToRole<T extends ViewpointDTO>(
    viewpoints: readonly T[], role: string | null,
    /** The method's role views (O12): for a role one names, they are the whole list, not an addition to it. */
    roleViews: readonly RoleViewDTO[] = [],
): T[] {
    if (!role) return [...viewpoints];
    const remapped = roleViews.some(view => view.stakeholder === role);
    const kept = new Set<string>(viewpointsForRole(viewpoints, role, roleViews).map(viewpoint => viewpoint.id));
    // A viewpoint that names no stakeholder is shown to every role, unless the method said what this one sees.
    for (const viewpoint of viewpoints) {
        if (!remapped && (viewpoint.stakeholders ?? []).length === 0) kept.add(viewpoint.id);
    }
    const byId = new Map(viewpoints.map(viewpoint => [viewpoint.id, viewpoint]));
    for (const id of [...kept]) {
        const seen = new Set<string>([id]);
        for (let parent = byId.get(id)?.parentId; parent && !seen.has(parent); parent = byId.get(parent)?.parentId) {
            seen.add(parent);
            kept.add(parent);
        }
    }
    return viewpoints.filter(viewpoint => kept.has(viewpoint.id));
}

/** `safetyEngineer` → `Safety Engineer`: the usage name, read as words. */
export function roleLabel(role: string): string {
    const words = role.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

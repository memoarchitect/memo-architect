// ─── A release diff, for a role ──────────────────────────────────────────────
//
// A role is a set of viewpoints (plan O12), and a viewpoint admits kinds (`visibleKinds`). A change to an
// element is shown to a role when its kind, or a kind it specializes, is one a viewpoint of the role
// admits. Read from the model's viewpoints and its kind registry, never from a kind-to-page table here.
// A viewpoint that admits no kind in particular admits all, so a role with one sees everything.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, type MemoModelDTO, type ModelDiffSummary } from '@memoarchitect/tools/browser';
import { viewpointsVisibleToRole } from './role-viewpoints';

export interface RoleDiff {
    diff: ModelDiffSummary;
    /** How many changes the role's viewpoints do not admit. */
    hidden: number;
}

export function diffForRole(diff: ModelDiffSummary, model: MemoModelDTO, role: string | null): RoleDiff {
    if (!role) return { diff, hidden: 0 };
    const visible = viewpointsVisibleToRole(model.viewpoints ?? [], role);
    if (visible.length === 0 || visible.some(viewpoint => viewpoint.visibleKinds.length === 0)) return { diff, hidden: 0 };
    const admitted = [...new Set(visible.flatMap(viewpoint => viewpoint.visibleKinds))];
    const kinds = indexKinds(model.registries?.kinds ?? []);
    const admits = (kind: string) => admitted.some(allowed => kindConformsTo(kind, allowed, kinds));
    const added = diff.added.filter(e => admits(e.kind));
    const removed = diff.removed.filter(e => admits(e.kind));
    const changed = diff.changed.filter(e => admits(e.kind));
    // A link is shown when the element at either end is.
    const showsLink = (r: { source: string; target: string }) => [r.source, r.target].some(name =>
        Object.values(model.elements).some(e => e.name === name && admits(e.kind)));
    const addedRels = diff.addedRels.filter(showsLink);
    const removedRels = diff.removedRels.filter(showsLink);
    const total = (d: ModelDiffSummary) => d.added.length + d.removed.length + d.changed.length + d.addedRels.length + d.removedRels.length;
    const shown: ModelDiffSummary = { ...diff, added, removed, changed, addedRels, removedRels };
    return { diff: shown, hidden: total(diff) - total(shown) };
}

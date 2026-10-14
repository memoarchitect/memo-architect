// ─── Projects (plan O7, A10) ─────────────────────────────────────────────────
//
// A project is a change set in an iteration. It feeds the release records it contributes to (`feeds`), and a
// variant records the project that introduced it (`introducedBy`). Read from the relations the builder made; the
// kind is matched through the kind registry, so a specialization counts.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, relationshipsOfType, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { idsInWorkspace } from './workspace-scope';

export const PROJECT_KIND = 'Project';

export interface ProjectRow {
    id: string;
    name: string;
    trackerLink?: string;
    /** The releases it feeds, with the commit each pins. */
    feeds: { id: string; name: string; commit: string }[];
    /** The variants it introduced. */
    introduced: { id: string; name: string }[];
}

export function projectRows(model: MemoModelDTO, workspace: string | null): ProjectRow[] {
    const kinds = indexKinds(model.registries?.kinds ?? []);
    const inWorkspace = idsInWorkspace(model.workspaceMembership, workspace);
    const nameOf = (id: string) => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
    const feeds = relationshipsOfType(model, 'feeds');
    const introduced = relationshipsOfType(model, 'introducedBy');
    return Object.values(model.elements)
        .filter(e => kindConformsTo(e.kind, PROJECT_KIND, kinds) && (!inWorkspace || inWorkspace.has(e.id)))
        .map(e => ({
            id: e.id, name: nameOf(e.id), trackerLink: e.attributes.trackerLink || undefined,
            feeds: feeds.filter(r => r.sourceId === e.id).map(r => ({ id: r.targetId, name: nameOf(r.targetId), commit: (model.elements[r.targetId]?.attributes.modelCommit ?? '').slice(0, 7) })),
            introduced: introduced.filter(r => r.targetId === e.id).map(r => ({ id: r.sourceId, name: nameOf(r.sourceId) })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** The project that introduced a variant, by name, when one is recorded. */
export function introducingProject(model: MemoModelDTO, variantId: string): string | undefined {
    const link = relationshipsOfType(model, 'introducedBy').find(r => r.sourceId === variantId);
    return link ? model.elements[link.targetId]?.name || link.targetId : undefined;
}

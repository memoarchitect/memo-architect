// ─── Diagram references in markdown ──────────────────────────────────────────
//
// `{{diagram:ref}}` is written by hand, so it matches tolerantly: exact id or
// short id, then case/punctuation-insensitive id or name with an optional
// "view" suffix, then containment ({{diagram:software-architecture}} finds
// "GPCA_SoftwareArchitectureView").
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';

type Diagram = NonNullable<MemoModelDTO['diagrams']>[number];

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/view$/, '');

export function resolveDiagramRef(model: MemoModelDTO | null, ref: string): Diagram | undefined {
    const diagrams = model?.diagrams ?? [];
    const wanted = norm(ref);
    return diagrams.find(d => d.id === ref || (d as { shortId?: string }).shortId === ref)
        ?? diagrams.find(d => norm(d.id) === wanted || norm(d.name) === wanted)
        ?? diagrams.find(d => wanted.length >= 6 && (norm(d.name).includes(wanted) || norm(d.id).includes(wanted)));
}

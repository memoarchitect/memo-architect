// ─── The suspect-links queue (plan A9) ───────────────────────────────────────
//
// A link a person authored to an imported element is suspect once the element's
// revision is no longer the one the link was made against, or the element has
// left its source. memo-tools decides that from the model (`computeSuspectLinks`);
// this file shapes it for the page and applies the workspace.
//
// Suspects are computed over the WHOLE model and filtered afterwards. Narrowing
// the model first drops the imported end of a link whose other end is in the
// workspace, and with it the suspect: the same failure as the satisfy edges a
// narrowed model once hid.
// ─────────────────────────────────────────────────────────────────────────────

import { computeSuspectLinks, type MemoModelDTO, type SuspectLink } from '@memoarchitect/tools/browser';
import { idsInWorkspace } from './workspace-scope';

export interface SuspectRow {
    relationshipId: string;
    relationshipType: string;
    reason: SuspectLink['reason'];
    /** The imported record the link is suspect about. */
    elementId: string;
    elementLabel: string;
    sourceSystem: string;
    sourceIdentifier: string;
    /** The element at the other end of the link. */
    otherId: string;
    otherLabel: string;
    /** The revision the link was made against, and the record's revision now. */
    baseline: string;
    current: string | undefined;
    /** The file the link is declared in. */
    file: string;
}

const labelOf = (model: MemoModelDTO, id: string): string => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);

/**
 * The queue for a workspace: every suspect link with an end in it, or all of them
 * when none is chosen. Withdrawn records come first (they need the link removed),
 * then by record.
 */
export function suspectRows(model: MemoModelDTO, workspace: string | null): SuspectRow[] {
    const inWorkspace = idsInWorkspace(model.workspaceMembership, workspace);
    const rows: SuspectRow[] = [];
    for (const suspect of computeSuspectLinks(model)) {
        const relationship = model.relationships.find(r => r.id === suspect.relationshipId);
        if (!relationship) continue;
        if (inWorkspace && !inWorkspace.has(relationship.sourceId) && !inWorkspace.has(relationship.targetId)) continue;
        const otherId = suspect.end === 'source' ? relationship.targetId : relationship.sourceId;
        const attributes = model.elements[suspect.elementId]?.attributes ?? {};
        rows.push({
            relationshipId: suspect.relationshipId,
            relationshipType: suspect.relationshipType,
            reason: suspect.reason,
            elementId: suspect.elementId,
            elementLabel: labelOf(model, suspect.elementId),
            sourceSystem: attributes['externalReference.sourceSystem'] ?? '',
            sourceIdentifier: attributes['externalReference.identifier'] ?? '',
            otherId,
            otherLabel: labelOf(model, otherId),
            baseline: suspect.baseline,
            current: suspect.current,
            file: relationship.file,
        });
    }
    const rank = (row: SuspectRow) => (row.reason === 'source-withdrawn' ? 0 : 1);
    return rows.sort((a, b) => rank(a) - rank(b) || a.sourceIdentifier.localeCompare(b.sourceIdentifier)
        || a.relationshipId.localeCompare(b.relationshipId));
}

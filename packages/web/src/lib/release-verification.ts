// ─── What verifies a release, inferred ────────────────────────────────────────
//
// A release of an item is verified by the verification cases that verify the
// requirements the item carries. Nothing here is picked: the requirements are the
// ones in the item's workspace (what is scoped to it, satisfied by it or allocated
// to it), and a case counts when a requirement in that workspace is verifiedBy it.
// A requirement no case verifies is reported, because that is the gap a release
// record would otherwise hide.

import { relationshipsOfType, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { idsInWorkspace } from './workspace-scope';

export interface InferredVerification {
    /** False when the item is not a system or system of systems whose workspace the model knows. */
    known: boolean;
    caseIds: string[];
    requirementCount: number;
    uncoveredRequirementIds: string[];
}

export function inferVerification(
    model: MemoModelDTO,
    itemId: string,
    isRequirement: (kind: string) => boolean,
    isVerificationCase: (kind: string) => boolean,
): InferredVerification {
    const members = idsInWorkspace(model.workspaceMembership, itemId);
    if (!members) return { known: false, caseIds: [], requirementCount: 0, uncoveredRequirementIds: [] };
    const requirements = [...members].filter(id => model.elements[id] && isRequirement(model.elements[id].kind));
    const required = new Set(requirements);
    const cases = new Set<string>();
    const covered = new Set<string>();
    for (const relationship of relationshipsOfType(model, 'verifiedBy')) {
        const verifier = model.elements[relationship.targetId];
        if (!required.has(relationship.sourceId) || !verifier || !isVerificationCase(verifier.kind)) continue;
        cases.add(relationship.targetId);
        covered.add(relationship.sourceId);
    }
    return {
        known: true,
        caseIds: [...cases].sort((a, b) => (model.elements[a]?.name ?? a).localeCompare(model.elements[b]?.name ?? b)),
        requirementCount: requirements.length,
        uncoveredRequirementIds: requirements.filter(id => !covered.has(id)),
    };
}

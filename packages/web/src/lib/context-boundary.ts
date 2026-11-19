import { operationalConforms, type MemoModelDTO } from '@memoarchitect/tools/browser';

export function authoredBoundaryContext(model: MemoModelDTO, boundaryId: string) {
    const definitionOf = model.workspaceMembership?.definitionOf ?? {};
    const matches = (id: string) => id === boundaryId || Boolean(model.elements[id] && definitionOf[id] === boundaryId);
    const participants = new Map<string, Set<string>>();
    const contexts = new Set<string>();
    for (const edge of model.relationships) {
        if (!matches(edge.targetId) || !model.elements[edge.sourceId]) continue;
        if (edge.type.toLowerCase() === 'interactsincontext') {
            const labels = participants.get(edge.sourceId) ?? new Set<string>();
            if (edge.attributes?.interactionLabel) labels.add(edge.attributes.interactionLabel);
            participants.set(edge.sourceId, labels);
        }
        if (edge.type.toLowerCase() === 'appliesincontext' && operationalConforms(model, edge.sourceId, 'UseContext')) contexts.add(edge.sourceId);
    }
    const settings = [...contexts].map(id => {
        const usage = model.elements[id];
        const type = model.elements[definitionOf[id] ?? usage.provenance?.classifier?.qualifiedName ?? ''];
        return { id, name: type?.name ?? usage.name, doc: usage.doc || type?.doc,
            attributes: { ...type?.attributes, ...usage.attributes } };
    });
    return { participants, settings };
}

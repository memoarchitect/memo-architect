import { compatibleRelationshipTargets, type MemoElement, type MemoModelDTO, type RelationshipDirection } from '@memoarchitect/tools/browser';

export function pathwayRelationship(model: MemoModelDTO, selected: MemoElement, type: string, direction: RelationshipDirection,
    peerAllowed: (element: MemoElement) => boolean) {
    const outgoing = direction === 'outgoing';
    const linkedIds = new Set(model.relationships
        .filter(edge => edge.type === type && (outgoing ? edge.sourceId : edge.targetId) === selected.id)
        .map(edge => outgoing ? edge.targetId : edge.sourceId));
    const linked = [...linkedIds].flatMap(id => model.elements[id] ? [model.elements[id]] : []);
    const definition = model.registries?.relationships.find(item => item.name === type && !item.isAbstract);
    const peers = definition && model.registries
        ? compatibleRelationshipTargets(selected, definition, direction, model, model.registries).map(item => item.element)
            .filter(item => !linkedIds.has(item.id) && peerAllowed(item))
        : [];
    const status = linked.length ? 'Linked' : !definition ? 'Check unavailable for this profile' : peers.length ? 'Ready to link' : 'Link later';
    return { linked, peers, status };
}

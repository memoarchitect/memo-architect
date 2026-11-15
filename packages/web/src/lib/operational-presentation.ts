import { includedUseCases, operationalChildren, type MemoModelDTO } from '@memoarchitect/tools/browser';

/** Only the selected goal's include closure and explicitly bound actor/subject context. */
export function useCaseMembers(model: MemoModelDTO, id: string): string[] {
    const cases = new Set<string>(); const queue = [id];
    while (queue.length) { const at = queue.pop()!; if (cases.has(at)) continue; cases.add(at); queue.push(...includedUseCases(model, at).map(child => child.id)); }
    const members = new Set(cases);
    for (const edge of model.relationships) {
        if (edge.type === 'hasSubject' && cases.has(edge.sourceId)) members.add(edge.targetId);
        if (edge.type === 'participatesIn') {
            if (cases.has(edge.targetId)) members.add(edge.sourceId);
            if (cases.has(edge.sourceId)) members.add(edge.targetId);
        }
    }
    return [...members].filter(id => !!model.elements[id]);
}
export function actionMembers(model: MemoModelDTO, id: string): string[] {
    const members = new Set([id]); const queue = [id];
    while (queue.length) for (const child of operationalChildren(model, queue.pop()!)) if (!members.has(child.id)) { members.add(child.id); queue.push(child.id); }
    return [...members];
}

/** Native owned function usages, including references whose canonical function is in this scope. */
export function functionMembers(model: MemoModelDTO, id: string, canonicalIds: ReadonlySet<string>): string[] {
    const members = new Set([id]); const queue = [id];
    const aliases = new Map(model.relationships.filter(edge => edge.type === 'subsets').map(edge => [edge.sourceId, edge.targetId]));
    const canonical = (id: string) => { const seen = new Set<string>(); while (aliases.has(id) && !seen.has(id)) { seen.add(id); id = aliases.get(id)!; } return id; };
    while (queue.length) for (const child of operationalChildren(model, queue.pop()!)) if (!child.isDefinition && canonicalIds.has(canonical(child.id)) && !members.has(child.id)) { members.add(child.id); queue.push(child.id); }
    return [...members];
}

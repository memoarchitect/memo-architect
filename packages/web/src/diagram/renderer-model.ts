import type { MemoModelDTO } from '@memoarchitect/tools/browser';

// The server republishes after in-source layout writes settle. The document
// still receives that fresh DTO; native canvases retain their semantic input
// and history owner until a semantic source or ontology/view contract changes.
const owners = new WeakMap<MemoModelDTO, MemoModelDTO>();
function contract(model: MemoModelDTO): string | undefined {
    if (!model.sourceHashes || !Object.keys(model.sourceHashes).length) return undefined;
    return JSON.stringify({ sources: Object.entries(model.sourceHashes).sort(([a], [b]) => a.localeCompare(b)),
        // Build counters and Git badges change after a layout-only rebuild.
        metadata: { modelName: model.metadata?.modelName, projectName: model.metadata?.projectName },
        ontologyHash: (model as MemoModelDTO & { ontologyHash?: string }).ontologyHash,
        registries: model.registries, enumerations: model.enumerations,
        diagrams: model.diagrams, viewpoints: model.viewpoints, architectureLayers: model.architectureLayers, errors: model.errors });
}
export function retainRendererModel(previous: MemoModelDTO | null, next: MemoModelDTO): void {
    const key = contract(next);
    owners.set(next, previous && key !== undefined && key === contract(previous)
        ? rendererModel(previous)! : next);
}
export function rendererModel(model: MemoModelDTO | null): MemoModelDTO | null {
    return model ? owners.get(model) ?? model : null;
}

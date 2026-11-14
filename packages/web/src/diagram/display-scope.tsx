import { createContext, useContext, useMemo } from 'react';
import { functionalDisplayIds, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { idsInWorkspace, scopeModel } from '../lib/workspace-scope';
import { rendererModel } from './renderer-model';

/** A display projection; canonical views, source and mutation targets stay in the store. */
export const DiagramDisplayScope = createContext<string | null>(null);

export function projectDiagramModel(model: MemoModelDTO, workspace: string | null): MemoModelDTO {
    if (!workspace) return model;
    const ids = functionalDisplayIds(model, workspace, idsInWorkspace(model.workspaceMembership, workspace) ?? new Set<string>());
    const scoped = scopeModel(model, workspace);
    return {
        ...scoped,
        elements: Object.fromEntries(Object.entries(model.elements).filter(([id]) => ids.has(id))),
        relationships: model.relationships.filter(edge => ids.has(edge.sourceId) && ids.has(edge.targetId)),
        diagrams: model.diagrams?.map(diagram => ({ ...diagram, elementIds: diagram.elementIds?.filter(id => ids.has(id)) })),
    };
}

export function useDiagramDisplayModel(retain = false) {
    const workspace = useContext(DiagramDisplayScope);
    const current = useModelStore(state => state.model);
    const model = retain ? rendererModel(current) : current;
    return useMemo(() => model ? projectDiagramModel(model, workspace) : null, [model, workspace]);
}

/** Editing visible membership must retain the authored members outside the display scope. */
export function mergeScopedMembers(model: MemoModelDTO, workspace: string | null, diagramId: string, members: readonly string[]): string[] {
    if (!workspace) return [...members];
    const visible = functionalDisplayIds(model, workspace, idsInWorkspace(model.workspaceMembership, workspace) ?? new Set<string>());
    const hidden = model.diagrams?.find(diagram => diagram.id === diagramId)?.elementIds?.filter(id => !visible.has(id)) ?? [];
    return [...new Set([...hidden, ...members])];
}

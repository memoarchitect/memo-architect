import { functionalStructure, indexKinds, kindConformsTo, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { askText, alertDialog } from '../components/AppDialogs';
import { useModelStore } from '../store/model-store';
import { sendElementCreate } from '../store/ws-client';

export function componentFunctionWorkspace(model: MemoModelDTO, componentId: string, chosen: string | null): string | undefined {
    const element = model.elements[componentId];
    if (!element || element.isDefinition || !kindConformsTo(element.kind, 'LogicalComponent', indexKinds(model.registries?.kinds ?? []))) return undefined;
    const roots = model.workspaceMembership?.membership[componentId] ?? [];
    if (chosen && roots.includes(chosen)) return chosen;
    const systems = model.workspaceMembership?.workspaces.filter(workspace => workspace.scope === 'system' && roots.includes(workspace.root)) ?? [];
    return systems.length === 1 ? systems[0].root : undefined;
}

/** The server chooses the declared name and returns the compiler's canonical identity. */
export async function createNativeFunction(workspace: string, componentId?: string) {
    const state = useModelStore.getState();
    if (!state.model || !state.connected || state.pinned) return;
    const home = functionalStructure(state.model, workspace).home;
    if (!home) return;
    const component = componentId ? state.model.elements[componentId] : undefined;
    const componentSourceHash = component ? state.model.sourceHashes?.[component.file] : undefined;
    const name = componentId ? await askText('Name the component function:') : '';
    if (name === null || (componentId && !name.trim())) return;
    try {
        const result = await sendElementCreate({ id: '', name, kind: componentId ? 'ComponentFunction' : 'SystemFunction', construct: 'action',
            file: home.file, functionContext: { workspace, ...(componentId ? { componentId, ...(componentSourceHash ? { componentSourceHash } : {}) } : {}) } });
        if (!result.success) throw new Error(result.error ?? 'The function could not be created.');
        if (result.elementId) useModelStore.getState().inspectElement(result.elementId);
    } catch (error) { await alertDialog(error instanceof Error ? error.message : String(error)); }
}

export function createComponentFunction(componentId: string) {
    const state = useModelStore.getState();
    const workspace = state.model && componentFunctionWorkspace(state.model, componentId, state.workspace);
    if (workspace) return createNativeFunction(workspace, componentId);
}

import { functionalStructure, functionalFlowSteps, indexKinds, kindConformsTo, type FunctionalWriteContext, type MemoModelDTO } from '@memoarchitect/tools/browser';
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

/** Keep authoring in the guided task while the server validates and chooses source identities. */
export async function writeFunctionalWork(context: FunctionalWriteContext, name = '') {
    const state = useModelStore.getState();
    if (!state.model || !state.connected || state.pinned) throw new Error('Connect to a writable model first.');
    const structure = functionalStructure(state.model, context.workspace);
    const homeId = context.flowId ?? context.componentFunctionId ?? context.parentFunctionId;
    const home = homeId ? state.model.elements[homeId] : structure.home;
    if (!home) throw new Error('Choose a system with a writable function source.');
    const component = context.componentId ? state.model.elements[context.componentId] : undefined;
    const result = await sendElementCreate({ id: '', name, kind: context.operation === 'flow' ? 'FunctionalFlow' : 'SystemFunction', construct: 'action', file: home.file,
        functionContext: { ...context, ...(component ? { componentSourceHash: state.model.sourceHashes?.[component.file] } : {}) } });
    if (!result.success) throw new Error(result.error ?? 'The change could not be saved.');
    // A write acknowledgement can precede the watcher's model broadcast. Keep the next task
    // from submitting a stale source hash while the new semantic state is still on its way.
    const ready = (model: MemoModelDTO | null) => {
        if (!model || !result.elementId || !model.elements[result.elementId]) return false;
        if (context.operation === 'root') return model.relationships.some(edge => edge.type === 'functionalRoot' && edge.sourceId === context.workspace && edge.targetId === result.elementId);
        if (context.operation === 'flow' || context.operation === 'update-flow') {
            const actual = functionalFlowSteps(model, result.elementId).steps;
            return actual.length === context.steps?.length && actual.every((item, index) => item.functionId === context.steps![index].functionId && (!context.steps![index].stepId || item.step.id === context.steps![index].stepId));
        }
        return (!context.systemFunctionId || model.relationships.some(edge => edge.type === 'realizes' && edge.sourceId === result.elementId && edge.targetId === context.systemFunctionId))
            && (!context.componentId || model.relationships.some(edge => edge.type === 'allocatedTo' && edge.sourceId === result.elementId && edge.targetId === context.componentId));
    };
    if (!ready(useModelStore.getState().model)) await new Promise<void>((resolve, reject) => {
        const unsubscribe = useModelStore.subscribe(next => { if (ready(next.model)) { clearTimeout(timer); unsubscribe(); resolve(); } });
        const timer = setTimeout(() => { unsubscribe(); reject(new Error('The change was saved. Reload the model before making another change; its refreshed state has not arrived yet.')); }, 30_000);
        // Cover a broadcast between the initial check and subscribing.
        if (ready(useModelStore.getState().model)) { clearTimeout(timer); unsubscribe(); resolve(); }
    });
    return result.elementId;
}

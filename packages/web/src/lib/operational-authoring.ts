import { functionalFlowSteps, type MemoModelDTO, type OperationalWriteContext } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { sendElementCreate } from '../store/ws-client';

export function operationalHome(model: MemoModelDTO, context: OperationalWriteContext) {
    const ids = [context.sourceId, context.parentStepId, context.scenarioId, context.workflowId, context.useCaseId, context.subjectId, context.homeId, context.workspace];
    return ids.flatMap(id => id && model.elements[id] ? [model.elements[id]] : []).find(element => element.package && element.provenance?.declaration.writable !== false)
        ?? Object.values(model.elements).find(element => element.package && element.provenance?.declaration.writable !== false && element.file);
}

/** Wait for the semantic broadcast as well as the write acknowledgement before enabling the next action. */
export async function writeOperational(context: OperationalWriteContext, name = '') {
    const state = useModelStore.getState();
    if (!state.model || !state.connected || state.pinned) throw new Error('Connect to a writable model first.');
    const home = operationalHome(state.model, context); if (!home) throw new Error('Choose a writable project source.');
    const result = await sendElementCreate({ id: '', name, kind: 'OperativeAction', construct: 'action', file: home.file,
        operationalContext: { ...context, homeId: context.homeId ?? home.id, relatedSourceHashes: state.model.sourceHashes } });
    if (!result.success) throw new Error(result.error ?? 'The operational change could not be saved.');
    const ready = (model: MemoModelDTO | null) => {
        if (!model || !result.elementId || !model.elements[result.elementId]) return false;
        const edge = (type: string, sourceId?: string, targetId?: string) => model.relationships.some(edge => edge.type === type && edge.sourceId === sourceId && edge.targetId === targetId);
        switch (context.operation) {
            case 'include': return edge('includesStep', context.sourceId, context.targetId);
            case 'link-workflow': return edge('realizesUseCase', context.workflowId, context.useCaseId);
            case 'refine': return edge('realizes', context.sourceId, context.targetId);
            case 'realize-flow': return edge('realizes', context.targetId, context.sourceId);
            case 'perform-function': return edge('performs', context.sourceId, context.targetId);
            case 'performer': return edge('performs', context.performerId, context.sourceId);
            case 'sequence': return JSON.stringify(functionalFlowSteps(model, context.parentStepId ?? context.scenarioId!).steps.map(item => item.step.id)) === JSON.stringify(context.stepIds ?? []);
            case 'workflow': return edge('realizesUseCase', result.elementId, context.useCaseId);
            case 'use-case': return !context.useCaseId || edge('includesStep', context.useCaseId, result.elementId);
            default: return true;
        }
    };
    if (!ready(useModelStore.getState().model)) await new Promise<void>((resolve, reject) => {
        const unsubscribe = useModelStore.subscribe(next => { if (ready(next.model)) { clearTimeout(timer); unsubscribe(); resolve(); } });
        const timer = setTimeout(() => { unsubscribe(); reject(new Error('The change was saved. Reload the model before editing again; its refreshed state has not arrived yet.')); }, 30_000);
        if (ready(useModelStore.getState().model)) { clearTimeout(timer); unsubscribe(); resolve(); }
    });
    return result.elementId;
}

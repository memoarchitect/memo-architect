import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { canonicalFunctionId, functionalCatalog, functionalFlowSteps, includedUseCases, operationalCatalog, operationalChildren, operationalConforms, operationalWorkLevel, workflowCases, wouldIncludeCycle, type MemoModelDTO, type OperationalWriteContext, type OperationalWorkLevel } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { operationalHome, writeOperational } from '../lib/operational-authoring';
import { diagramTypeFor, kindsOfLayer, type GuideLayer } from '../lib/pathways';
import { DiagramActionSubject, DiagramDisplayScope } from '../diagram/display-scope';
import { PaletteKindsContext } from './DiagramPalette';
import { COLOR } from '../styles/tokens';
const DiagramEditor = lazy(() => import('./DiagramEditor').then(module => ({ default: module.DiagramEditor })));
const button: CSSProperties = { padding: '7px 11px', border: `1px solid ${COLOR.border}`, borderRadius: 6, color: COLOR.primary, background: 'white', cursor: 'pointer', font: 'inherit' };
const input: CSSProperties = { ...button, width: '100%', boxSizing: 'border-box', cursor: 'text', marginTop: 5 };
const card: CSSProperties = { padding: 18, border: `1px solid ${COLOR.border}`, borderRadius: 8, background: 'white' };
const muted: CSSProperties = { color: COLOR.muted, fontSize: 14, lineHeight: 1.5, margin: '8px 0' };
const heading: CSSProperties = { fontSize: 20, margin: '0 0 12px', fontWeight: 650 };
type Element = MemoModelDTO['elements'][string];
type Role = 'case' | 'workflow' | 'scenario' | 'step';
type Action = { operation: OperationalWriteContext['operation']; context: Partial<OperationalWriteContext>; title: string; options?: Element[] };

/** The operational spine is native ownership plus use-case inclusion and workflow realization. */
export function OperationalWorkbench({ model, row, workspace, canWrite }: { model: MemoModelDTO; row: GuideLayer; workspace: string | null; canWrite: boolean }) {
    const tasks = row.tasks ?? [];
    const [taskId, setTaskId] = useState(tasks[0]?.id);
    const task = tasks.find(task => task.id === taskId) ?? tasks[0];
    const level: OperationalWorkLevel = task?.level === 'system' ? 'system' : 'clinical';
    const [selectedId, setSelectedId] = useState<string>();
    const pendingSelection = useRef<{ id: string; workspace: string | null; taskId: string }>();
    const [filter, setFilter] = useState(''); const [review, setReview] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<Action>(); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
    const [diagramId, setDiagramId] = useState<string>();
    const contextKey = useRef(''); contextKey.current = `${workspace ?? ''}:${taskId}:${selectedId ?? ''}`;
    const root = workspace ? model.elements[workspace] : undefined;
    const conforms = (id: string, kind: string) => operationalConforms(model, id, kind);
    const role = (id: string): Role | undefined => conforms(id, 'UseCase') ? 'case' : conforms(id, 'OperationalWorkflow') ? 'workflow' : conforms(id, 'OperativeScenario') ? 'scenario' : model.elements[id]?.construct === 'action' ? 'step' : undefined;
    const taskScope = level === 'system' ? workspace : null;
    const useCases = useMemo(() => task ? operationalCatalog(model, task.subjectKind, taskScope) : [], [model, task, taskScope]);
    const workflows = useMemo(() => operationalCatalog(model, task?.workflowKind ?? 'OperationalWorkflow', taskScope), [model, task?.workflowKind, taskScope]);
    const allWorkflows = useMemo(() => operationalCatalog(model, 'OperationalWorkflow'), [model]);
    const hierarchy = useMemo(() => {
        const children = new Map<string, string[]>();
        const owned = new Map<string, Element[]>();
        for (const element of Object.values(model.elements)) { const owner = element.owner ?? element.parentAction; if (owner) { if (!owned.has(owner)) owned.set(owner, []); owned.get(owner)!.push(element); } }
        for (const element of Object.values(model.elements)) {
            let ids: string[] = [];
            if (operationalConforms(model, element.id, 'UseCase')) ids = [...includedUseCases(model, element.id).map(child => child.id), ...allWorkflows.filter(workflow => workflowCases(model, workflow.id).includes(element.id)).map(workflow => workflow.id)];
            else if (operationalConforms(model, element.id, 'OperationalWorkflow')) ids = (owned.get(element.id) ?? []).filter(child => operationalConforms(model, child.id, 'OperativeScenario')).map(child => child.id);
            else if (element.construct === 'action') ids = (owned.get(element.id) ?? []).filter(child => child.construct === 'action' && !/Fork|Join|Decision|Merge|InitialNode|FinalNode/.test(child.kind)).map(child => child.id);
            if (operationalWorkLevel(model, element.id) === 'clinical') ids.push(...model.relationships.filter(edge => edge.type === 'realizes' && edge.targetId === element.id && operationalWorkLevel(model, edge.sourceId) === 'system'
                && ['UseCase', 'OperationalWorkflow', 'OperativeScenario', 'OperativeAction'].some(kind => operationalConforms(model, element.id, kind) && operationalConforms(model, edge.sourceId, kind))).map(edge => edge.sourceId));
            children.set(element.id, [...new Set(ids)]);
        }
        const own = new Set(useCases.map(useCase => useCase.id));
        const included = new Set(useCases.flatMap(useCase => includedUseCases(model, useCase.id).filter(child => own.has(child.id)).map(child => child.id)));
        const roots = useCases.filter(useCase => !included.has(useCase.id)).map(useCase => useCase.id);
        if (!roots.length && useCases.length) roots.push(...own);
        const unlinked = workflows.filter(workflow => !workflowCases(model, workflow.id).length).map(workflow => workflow.id);
        const unplaced = operationalCatalog(model, 'OperativeScenario', taskScope).filter(scenario => !operationalConforms(model, scenario.owner ?? scenario.parentAction ?? '', 'OperationalWorkflow')).filter(scenario => !operationalWorkLevel(model, scenario.id) || operationalWorkLevel(model, scenario.id) === level).map(scenario => scenario.id);
        const visible = new Set<string>(); const queue = [...roots, ...unlinked, ...unplaced];
        while (queue.length) { const id = queue.pop()!; if (visible.has(id)) continue; visible.add(id); queue.push(...children.get(id) ?? []); }
        return { children, roots, unlinked, unplaced, visible };
    }, [model, allWorkflows, useCases, workflows, taskScope, level]);
    const selected = selectedId && hierarchy.visible.has(selectedId) ? model.elements[selectedId] : undefined;
    const selectedRole = selected ? role(selected.id) : undefined;
    const ownSelection = !!selected && (level === 'clinical' || !!workspace && !!model.workspaceMembership?.membership[selected.id]?.includes(workspace));
    const writable = canWrite && !busy && ownSelection && selected?.provenance?.declaration.writable !== false && operationalWorkLevel(model, selected!.id) === level;
    const selectedLevel = selected ? operationalWorkLevel(model, selected.id) : undefined;
    const sourceWorkspace = selected && model.workspaceMembership?.workspaces.find(scope => model.workspaceMembership?.membership[selected.id]?.includes(scope.root));
    const functions = functionalCatalog(model, workspace);
    const flows = functionalCatalog(model, workspace, 'FunctionalFlow');
    const newWrite = canWrite && !busy && (level === 'clinical' || !!workspace);
    const base = { workspace, level };
    useEffect(() => { const pending = pendingSelection.current; setSelectedId(pending?.workspace === workspace && pending?.taskId === taskId ? pending.id : undefined); pendingSelection.current = undefined; setAction(undefined); setDiagramId(undefined); setNotice(''); setFilter(''); setReview(false); }, [workspace, taskId]);
    useEffect(() => { if (!diagramId) useModelStore.getState().inspectElement(null); else useModelStore.getState().selectDiagram(diagramId); }, [diagramId, workspace, taskId, selectedId]);
    useEffect(() => {
        if (!selectedId) return;
        const ancestors = new Set<string>(); const queue = [selectedId];
        while (queue.length) { const id = queue.pop()!; for (const [parent, children] of hierarchy.children) if (children.includes(id) && !ancestors.has(parent)) { ancestors.add(parent); queue.push(parent); } }
        setExpanded(previous => new Set([...previous, ...ancestors]));
    }, [selectedId, hierarchy]);
    const save = async (work: () => Promise<string | undefined>, after?: (id?: string) => void) => {
        if (busy || !canWrite) return; const started = contextKey.current; setBusy(true); setNotice('');
        try { const id = await work(); if (contextKey.current === started) { after?.(id); setNotice('Saved to the model.'); } }
        catch (error) { if (contextKey.current === started) setNotice(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };
    const choose = (id: string) => { setSelectedId(id); setAction(undefined); setNotice(''); setExpanded(previous => new Set([...previous, id])); };
    const goToWork = (id: string) => {
        if (conforms(id, 'FunctionalFlow')) {
            const functional = useModelStore.getState().guide?.layers.find(layer => layer.workbench === 'functional');
            if (functional) {
                const scopes = model.workspaceMembership?.workspaces.filter(scope => functionalCatalog(model, scope.root, 'FunctionalFlow').some(flow => flow.id === id)) ?? [];
                const targetWorkspace = scopes.find(scope => scope.root === workspace)?.root ?? scopes.find(scope => scope.scope === 'system')?.root ?? scopes[0]?.root ?? null;
                useModelStore.getState().setWorkspace(targetWorkspace); useModelStore.getState().inspectElement(id); useModelStore.getState().setActiveView({ type: 'pathway', layer: functional.name });
            }
            return;
        }
        const targetLevel = operationalWorkLevel(model, id); const targetTask = tasks.find(task => task.level === targetLevel); if (!targetTask) return;
        const targetWorkspace = targetLevel === 'system' ? model.workspaceMembership?.workspaces.find(scope => scope.scope === 'system' && model.workspaceMembership?.membership[id]?.includes(scope.root))?.root
            ?? model.workspaceMembership?.workspaces.find(scope => model.workspaceMembership?.membership[id]?.includes(scope.root))?.root ?? workspace : workspace;
        if (targetWorkspace === workspace && targetTask.id === taskId) { choose(id); return; }
        pendingSelection.current = { id, workspace: targetWorkspace, taskId: targetTask.id }; useModelStore.getState().setWorkspace(targetWorkspace); setTaskId(targetTask.id);
    };
    const begin = (operation: Action['operation'], title: string, context: Partial<OperationalWriteContext> = {}, options?: Element[]) => { setAction({ operation, title, context, options }); setNotice(''); };
    const create = (op: 'use-case' | 'workflow' | 'scenario' | 'step' | 'context') => {
        const context: Partial<OperationalWriteContext> = op === 'workflow' ? { useCaseId: selected!.id } : op === 'scenario' ? { workflowId: selected!.id }
            : op === 'step' ? selectedRole === 'scenario' ? { scenarioId: selected!.id } : { parentStepId: selected!.id }
            : op === 'use-case' && selectedRole === 'case' ? { useCaseId: selected!.id } : {};
        begin(op, op === 'context' ? 'Add a clinical subject' : op === 'use-case' ? `Add a ${level} use case` : op === 'workflow' ? 'Add a workflow for this goal' : op === 'scenario' ? 'Add a scenario to this workflow' : selectedRole === 'step' ? 'Decompose this step' : 'Add a scenario step', context);
    };
    const openDiagram = () => {
        if (!selected || !task?.viewpoint) return;
        const existing = model.diagrams?.find(diagram => diagram.viewKind === task.viewpoint?.viewKind && diagram.elementIds?.includes(selected.id)
            && !Object.values(model.elements).some(element => element.id !== selected.id && conforms(element.id, 'OperativeScenario') && diagram.elementIds?.includes(element.id)));
        if (existing) { setDiagramId(existing.id); return; }
        void save(async () => {
            const members = new Set([selected.id]); const queue = [selected.id];
            while (queue.length) for (const child of operationalChildren(model, queue.pop()!)) if (!members.has(child.id)) { members.add(child.id); queue.push(child.id); }
            let reason: string | undefined; const guide = useModelStore.getState().guide;
            const id = await useModelStore.getState().createDiagram({ name: selected.name, viewpointId: task.viewpoint!.id, viewKind: task.viewpoint!.viewKind ?? 'actionflow', diagramType: diagramTypeFor(task.viewpoint!.viewKind), elementIds: [...members], elementKinds: guide ? kindsOfLayer(guide, row) : [], properties: { autoPopulate: 'false' }, activate: false, onError: error => { reason = error; } });
            if (!id) throw new Error(reason ?? 'The scenario diagram could not be created.'); return id;
        }, id => setDiagramId(id));
    };
    const needsReview = (id: string) => {
        const elementRole = role(id); const children = hierarchy.children.get(id) ?? [];
        if (elementRole === 'case') return !children.some(child => role(child) === 'workflow');
        if (elementRole === 'workflow') return !operationalChildren(model, id).some(child => conforms(child.id, 'OperativeScenario'));
        if (elementRole === 'scenario') return !functionalFlowSteps(model, id).steps.length;
        if (elementRole === 'step' && conforms(id, 'OperativeAction')) {
            const performers = model.relationships.filter(edge => edge.type === 'performs' && edge.targetId === id).flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []);
            if (!performers.length) return true;
            return level === 'system' && performers.some(performer => (conforms(performer.id, 'System') || conforms(performer.id, 'SystemOfSystems')) && performer.attributes.origin?.split('::').at(-1) !== 'external')
                && !model.relationships.some(edge => edge.type === 'performs' && edge.sourceId === id && conforms(edge.targetId, 'SystemFunction'));
        }
        return false;
    };
    const matches = (id: string, path = new Set<string>()): boolean => {
        if (path.has(id)) return false; path.add(id);
        return ((!filter || model.elements[id]?.name.toLowerCase().includes(filter.toLowerCase())) && (!review || needsReview(id))) || (hierarchy.children.get(id) ?? []).some(child => matches(child, new Set(path)));
    };
    const tree = (id: string, path = new Set<string>()): React.ReactNode => {
        if (path.has(id) || !matches(id)) return null; const element = model.elements[id]; if (!element) return null;
        const children = hierarchy.children.get(id) ?? []; const open = !!filter || review || expanded.has(id);
        const crossLevel = operationalWorkLevel(model, id) && operationalWorkLevel(model, id) !== level;
        const context = level === 'system' && workspace && !model.workspaceMembership?.membership[id]?.includes(workspace);
        const badge = role(id) === 'case' ? 'Use case' : role(id) === 'workflow' ? 'Workflow' : role(id) === 'scenario' ? `${(element.attributes.scenarioKind ?? 'nominal').split('::').at(-1)} scenario` : conforms(id, 'OperativeAction') ? 'Step' : 'Function call';
        return <li key={id} style={{ margin: '5px 0' }}><div style={{ display: 'flex', gap: 4 }}>{!!children.length && <button type="button" aria-label={`${open ? 'Collapse' : 'Expand'} ${element.name}`} aria-expanded={open} style={{ ...button, padding: 6 }} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{open ? '⌄' : '›'}</button>}
            <button type="button" style={{ ...button, textAlign: 'left', flex: 1, background: selectedId === id ? '#e8f8f3' : 'white' }} aria-pressed={selectedId === id} onClick={() => choose(id)}><span>{element.name}</span><small style={{ display: 'block', color: COLOR.muted }}>{badge}{crossLevel ? ' · System context' : context ? ' · Other system' : ''}{review && needsReview(id) ? ' · Needs review' : ''}</small></button></div>
            {open && !!children.length && <ul style={{ listStyle: 'none', paddingLeft: 18 }}>{children.map(child => tree(child, new Set([...path, id])))}</ul>}</li>;
    };
    const title = selectedRole === 'case' ? 'Goal and use specification' : selectedRole === 'workflow' ? 'Work analysis' : selectedRole === 'scenario' ? 'Scenario path' : 'Operational step';
    const creationButtons = selectedRole === 'case' ? <><button style={button} disabled={!writable} onClick={() => create('workflow')}>+ Workflow</button><button style={button} disabled={!writable} onClick={() => create('use-case')}>+ Included use case</button><button style={button} disabled={!writable} onClick={() => begin('include', 'Include an existing use case', { sourceId: selected!.id }, operationalCatalog(model, task!.subjectKind).filter(candidate => !wouldIncludeCycle(model, selected!.id, candidate.id)))}>Reuse a use case</button></>
        : selectedRole === 'workflow' ? <><button style={button} disabled={!writable} onClick={() => create('scenario')}>+ Scenario</button><button style={button} disabled={!writable} onClick={() => begin('link-workflow', 'Connect this workflow to a use case', { workflowId: selected!.id }, useCases)}>Link to use case</button></>
        : selectedRole === 'scenario' || selectedRole === 'step' && conforms(selected!.id, 'OperativeAction') ? <><button style={button} disabled={!writable} onClick={() => create('step')}>{selectedRole === 'scenario' ? '+ Step' : '+ Substep'}</button><button style={button} disabled={!writable} onClick={() => begin('reuse-step', 'Reuse an existing step', selectedRole === 'scenario' ? { scenarioId: selected!.id } : { parentStepId: selected!.id }, operationalCatalog(model, 'OperativeAction').filter(candidate => operationalWorkLevel(model, candidate.id) === level && candidate.id !== selected!.id && canonicalFunctionId(model, candidate.id) === candidate.id))}>Reuse a step</button></> : null;
    const clinicalTask = tasks.find(task => task.level === 'clinical');
    const clinicalKind = selectedRole === 'case' ? clinicalTask?.subjectKind : selectedRole === 'workflow' ? clinicalTask?.workflowKind : selectedRole === 'scenario' ? clinicalTask?.scenarioKind : clinicalTask?.stepKind;
    const refinements = selected ? model.relationships.filter(edge => edge.type === 'realizes' && (edge.sourceId === selected.id || edge.targetId === selected.id)).filter(edge => !conforms(edge.sourceId, 'ComponentFunction')) : [];
    const performedFunctions = selected ? model.relationships.filter(edge => edge.type === 'performs' && edge.sourceId === selected.id && conforms(edge.targetId, 'SystemFunction')) : [];
    const performers = selected ? model.relationships.filter(edge => edge.type === 'performs' && edge.targetId === selected.id).flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []) : [];
    if (diagramId) return <section style={{ flex: 1, minHeight: 500, display: 'flex', flexDirection: 'column' }}><div style={{ padding: 12 }}><button style={button} onClick={() => setDiagramId(undefined)}>‹ Back to operational work</button></div><Suspense fallback={<p>Opening scenario diagram…</p>}><PaletteKindsContext.Provider value={useModelStore.getState().guide ? kindsOfLayer(useModelStore.getState().guide!, row) : []}><DiagramDisplayScope.Provider value={level === 'clinical' ? null : workspace}><DiagramActionSubject.Provider value={selected?.id ?? null}><DiagramEditor diagramId={diagramId} /></DiagramActionSubject.Provider></DiagramDisplayScope.Provider></PaletteKindsContext.Provider></Suspense></section>;
    return <section data-testid="operational-workbench" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}><div style={{ maxWidth: 1440, margin: 'auto' }}>
        <h1 style={{ ...heading, fontSize: 24 }}>{row.label}</h1><nav aria-label="Operational tasks" style={{ display: 'flex', gap: 8 }}>{tasks.filter(task => task.primary).map(candidate => <button key={candidate.id} style={{ ...button, background: candidate.id === task?.id ? '#e8f8f3' : 'white' }} aria-pressed={candidate.id === task?.id} onClick={() => setTaskId(candidate.id)}>{candidate.label}</button>)}</nav>
        <p style={muted}>{task?.objective}</p><p style={muted}>{level === 'clinical' ? 'Clinical baseline · independent of the selected product' : root ? `Working on ${root.name}` : 'Whole model · choose one system above to add or connect work'}</p>
        {notice && <p role="status" style={{ margin: '12px 0' }}>{notice}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(370px, 1.5fr)', gap: 18, alignItems: 'start' }}>
            <section aria-label="Operational hierarchy" style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h2 style={heading}>Goals and paths</h2><button style={button} disabled={!newWrite} onClick={() => { setSelectedId(undefined); begin('use-case', `Add a ${level} use case`); }}>+ Use case</button></div>
                <input aria-label="Filter operational work" style={input} placeholder="Find a goal, workflow or step…" value={filter} onChange={event => setFilter(event.target.value)} /><label style={{ display: 'block', margin: '10px 0', fontSize: 14 }}><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)} /> Needs a next action</label>
                <div style={{ maxHeight: '64vh', overflow: 'auto' }}><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.roots.map(id => tree(id))}</ul>{!!hierarchy.unlinked.length && <><h3 style={{ marginTop: 16 }}>Unlinked workflows</h3><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.unlinked.map(id => tree(id))}</ul></>}{!!hierarchy.unplaced.length && <><h3 style={{ marginTop: 16 }}>Scenarios needing a workflow</h3><p style={muted}>These existing scenarios have no owning workflow. Their clinical or system level may be unresolved.</p><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.unplaced.map(id => tree(id))}</ul></>}</div>
                {!hierarchy.roots.length && !hierarchy.unlinked.length && !hierarchy.unplaced.length && <p style={muted}>Start with a goal. Add its workflow, then nominal and alternate scenario paths.</p>}
            </section>
            <section aria-label="Current operational task" style={card}>
                {action ? <OperationalForm key={`${action.operation}:${selectedId ?? ''}`} action={action} model={model} level={level} workspace={workspace} disabled={!newWrite || busy} onCancel={() => setAction(undefined)} onContext={() => create('context')} onSave={(context, name) => void save(() => writeOperational({ ...base, ...action.context, ...context, operation: action.operation }, name), id => { setAction(undefined); if (id) setSelectedId(id); })} />
                : !selected ? <><h2 style={heading}>Start from the goal</h2><p style={muted}>A use case states the goal. A workflow analyzes the work, and each scenario describes one path through its steps.</p><p style={muted}>Select existing work to review it, or add a use case.</p>{level === 'clinical' && <button style={button} disabled={!newWrite} onClick={() => create('context')}>+ Clinical subject</button>}</>
                : <><small style={muted}>{title}</small><h2 style={heading}>{selected.name}</h2>
                    {(selectedLevel && selectedLevel !== level || !ownSelection && level === 'system') && <p style={muted}>This is linked {selectedLevel ?? 'system'} work shown as context. <button style={button} onClick={() => goToWork(selected.id)}>Work on {sourceWorkspace?.name ?? selectedLevel ?? 'this context'}</button></p>}
                    {!selectedLevel && <p style={muted}>Place this scenario in a matching workflow to establish its level. Existing identities and source are preserved.</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>{creationButtons}<button style={button} disabled={!ownSelection || !!selectedLevel && selectedLevel !== level} onClick={() => useModelStore.getState().inspectElement(selected.id)}>Details…</button></div>
                    {['goalStatement', 'entryCondition', 'completionCondition', 'trigger', 'preCondition', 'postCondition', 'expectedResult', 'taskGoal'].filter(key => selected.attributes[key]).map(key => <p key={key} style={muted}><strong>{fieldLabel(key)}:</strong> {selected.attributes[key]}</p>)}
                    {selectedRole === 'case' && <><p style={muted}><strong>Subject:</strong> {model.relationships.filter(edge => edge.type === 'hasSubject' && edge.sourceId === selected.id).map(edge => model.elements[edge.targetId]?.name ?? edge.targetId).join(', ') || 'Not specified'}</p><p style={muted}>Workflows below this goal realize it; included use cases retain their own identities and system subjects.</p></>}
                    {selectedRole === 'workflow' && <p style={muted}><strong>Realizes:</strong> {workflowCases(model, selected.id).map(id => model.elements[id]?.name ?? id).join(', ') || 'No use case linked yet'}. Nominal and alternate scenarios are separate paths through this workflow.</p>}
                    {(selectedRole === 'scenario' || selectedRole === 'step' && !!operationalChildren(model, selected.id).filter(child => child.construct === 'action').length) && <ScenarioSequence key={selected.id + JSON.stringify(functionalFlowSteps(model, selected.id).steps.map(item => item.step.id))} model={model} id={selected.id} writable={writable} onSelect={choose} onDiagram={openDiagram} onSave={stepIds => void save(() => writeOperational({ ...base, ...(selectedRole === 'scenario' ? { scenarioId: selected.id } : { parentStepId: selected.id }), operation: 'sequence', stepIds }))} />}
                    {selectedRole === 'step' && conforms(selected.id, 'OperativeAction') && <><h3 style={{ marginTop: 18, fontWeight: 650 }}>Who performs this step?</h3><p style={muted}>{performers.map(performer => performer.name).join(', ') || 'No performer linked yet.'}</p><button style={button} disabled={!writable} onClick={() => begin('performer', 'Choose the performer', { sourceId: selected.id }, Object.values(model.elements).filter(element => ['User', 'OperationalEntity', ...(level === 'system' ? ['System', 'SystemOfSystems'] : [])].some(kind => conforms(element.id, kind)) && (!element.isDefinition || element.id === workspace) && element.provenance?.declaration.writable !== false))}>Set performer</button></>}
                    {level === 'system' && selectedLevel === 'system' && <><h3 style={{ marginTop: 20, fontWeight: 650 }}>Clinical baseline</h3><p style={muted}>Connect this system work to the clinical intent it refines.</p><button style={button} disabled={!writable || !clinicalKind} onClick={() => begin('refine', 'Refine clinical work', { sourceId: selected.id }, operationalCatalog(model, clinicalKind ?? 'UseCase').filter(element => operationalWorkLevel(model, element.id) === 'clinical' && canonicalFunctionId(model, element.id) === element.id))}>Link clinical counterpart</button></>}
                    {!!refinements.length && <ul style={{ paddingLeft: 18, marginTop: 10 }}>{refinements.map(edge => <li key={edge.id} style={muted}><button style={button} onClick={() => goToWork(edge.sourceId)}>{model.elements[edge.sourceId]?.name}</button> → <button style={button} onClick={() => goToWork(edge.targetId)}>{model.elements[edge.targetId]?.name}</button>{conforms(edge.sourceId, 'FunctionalFlow') ? ' · Functional flow realization' : ' · Refines'}{conforms(edge.sourceId, 'FunctionalFlow') && <ol style={{ paddingLeft: 20 }}>{functionalFlowSteps(model, edge.sourceId).steps.map(item => <li key={item.step.id}>{model.elements[item.functionId ?? '']?.name ?? item.step.name}</li>)}</ol>}</li>)}</ul>}
                    {level === 'system' && selectedLevel === 'system' && (selectedRole === 'scenario' || selectedRole === 'step' && conforms(selected.id, 'OperativeAction')) && <><h3 style={{ marginTop: 20, fontWeight: 650 }}>Functional behavior</h3>
                        {selectedRole === 'step' && <><p style={muted}>Which system functions carry out this activity?</p><ul style={{ paddingLeft: 18 }}>{performedFunctions.map(edge => <li key={edge.id} style={muted}>{model.elements[edge.targetId]?.name}</li>)}</ul><button style={button} disabled={!writable} onClick={() => begin('perform-function', 'Connect a system function', { sourceId: selected.id }, functions)}>+ System function</button></>}
                        <p style={muted}>{selectedRole === 'scenario' ? 'Link a functional flow here only when it realizes this whole scenario. Activity-level links are the default.' : 'A functional flow can realize this activity. This retains the direct system-function links above.'}</p><button style={button} disabled={!writable} onClick={() => begin('realize-flow', selectedRole === 'scenario' ? 'Realize the whole scenario with a flow' : 'Realize this activity with a flow', { sourceId: selected.id }, flows)}>{selectedRole === 'scenario' ? 'Link flow to whole scenario…' : '+ Functional flow'}</button>
                        <button style={{ ...button, marginLeft: 8 }} onClick={() => { const functional = useModelStore.getState().guide?.layers.find(layer => layer.workbench === 'functional'); if (functional) useModelStore.getState().setActiveView({ type: 'pathway', layer: functional.name }); }}>Go to Functional</button>
                    </>}
                </>}
            </section>
        </div>
    </div></section>;
}
function fieldLabel(key: string) { const labels: Record<string, string> = { preCondition: 'Precondition', postCondition: 'Postcondition', goalStatement: 'Goal', taskGoal: 'Step purpose' }; return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase()); }
function OperationalForm({ action, model, level, workspace, disabled, onCancel, onContext, onSave }: { action: Action; model: MemoModelDTO; level: OperationalWorkLevel; workspace: string | null; disabled: boolean; onCancel: () => void; onContext: () => void; onSave: (context: Partial<OperationalWriteContext>, name: string) => void }) {
    const [name, setName] = useState(''); const [choice, setChoice] = useState(''); const [kind, setKind] = useState<'nominal' | 'alternate'>('nominal'); const [fields, setFields] = useState<Record<string, string>>({});
    const [subject, setSubject] = useState(level === 'system' ? workspace ?? '' : '');
    const create = ['context', 'use-case', 'workflow', 'scenario', 'step'].includes(action.operation);
    const subjects = level === 'clinical' ? operationalCatalog(model, 'OperationalEntity') : (model.workspaceMembership?.workspaces ?? []).flatMap(scope => model.elements[scope.root] ? [model.elements[scope.root]] : []);
    const keys = action.operation === 'use-case' ? ['goalStatement'] : action.operation === 'workflow' ? ['entryCondition', 'completionCondition'] : action.operation === 'scenario' ? ['preCondition', 'postCondition'] : action.operation === 'step' ? ['taskGoal'] : action.operation === 'context' ? ['responsibility'] : [];
    const submit = (event: FormEvent) => { event.preventDefault(); const context: Partial<OperationalWriteContext> = create ? { fields, ...(action.operation === 'use-case' ? { subjectId: subject } : {}), ...(action.operation === 'scenario' ? { scenarioKind: kind } : {}) } : action.operation === 'link-workflow' ? { useCaseId: choice } : action.operation === 'performer' ? { performerId: choice } : { targetId: choice }; onSave(context, name); };
    return <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}><h2 style={heading}>{action.title}</h2>
        {create && <label>Name<input autoFocus required style={input} value={name} onChange={event => setName(event.target.value)} /></label>}
        {action.operation === 'use-case' && <><label>{level === 'clinical' ? 'Clinical subject' : 'Supported system'}<select aria-label={level === 'clinical' ? 'Clinical subject' : 'Supported system'} required style={input} value={subject} disabled={level === 'system' && !action.context.useCaseId} onChange={event => setSubject(event.target.value)}><option value="">Choose a subject…</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>{level === 'clinical' && <><p style={muted}>Choose the care team or operational setting, independently of any product.</p><button type="button" style={button} onClick={onContext}>+ Clinical subject</button></>}</>}
        {action.operation === 'scenario' && <label>Path<select aria-label="Scenario path" style={input} value={kind} onChange={event => setKind(event.target.value as 'nominal' | 'alternate')}><option value="nominal">Nominal</option><option value="alternate">Alternate / recovery</option></select></label>}
        {keys.map(key => <label key={key}>{fieldLabel(key)}<textarea style={input} rows={2} value={fields[key] ?? ''} onChange={event => setFields({ ...fields, [key]: event.target.value })} /></label>)}
        {!create && <><label>{action.operation === 'performer' ? 'Performer' : action.operation === 'realize-flow' ? 'Functional flow' : action.operation === 'perform-function' ? 'System function' : action.operation === 'refine' ? 'Clinical counterpart' : action.operation === 'link-workflow' ? 'Use case' : 'Existing work'}<select aria-label="Connect existing work" required style={input} value={choice} onChange={event => setChoice(event.target.value)}><option value="">Choose existing work…</option>{action.options?.map(element => <option key={element.id} value={element.id}>{element.name}{model.elements[element.owner ?? element.parentAction ?? ''] ? ` · ${model.elements[element.owner ?? element.parentAction ?? ''].name}` : ''}</option>)}</select></label>{!action.options?.length && <p style={muted}>No matching work exists yet. Add it in its own task, then connect it here.</p>}</>}
        {action.operation === 'realize-flow' && <p style={muted}>The flow realizes the selected operational work. Its functions remain canonical system functions; existing activity-to-function links are retained.</p>}
        <div style={{ display: 'flex', gap: 8 }}><button style={button} disabled={disabled || (create ? !name.trim() || action.operation === 'use-case' && !subject : !choice)}>{create ? 'Create' : 'Connect'}</button><button type="button" style={button} onClick={onCancel}>Cancel</button></div>
    </form>;
}
function ScenarioSequence({ model, id, writable, onSelect, onDiagram, onSave }: { model: MemoModelDTO; id: string; writable: boolean; onSelect: (id: string) => void; onDiagram: () => void; onSave: (ids: string[]) => void }) {
    const current = functionalFlowSteps(model, id); const [steps, setSteps] = useState(current.steps.map(item => item.step.id));
    const move = (index: number, delta: number) => { const next = [...steps]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; setSteps(next); };
    return <section style={{ marginTop: 18 }}><h3 style={{ fontWeight: 650 }}>Steps in this path</h3>{!steps.length && <p style={muted}>Add the first step of this path.</p>}<ol style={{ paddingLeft: 20 }}>{steps.map((stepId, index) => <li key={stepId} style={{ margin: '8px 0' }}><button style={button} onClick={() => onSelect(stepId)}>{model.elements[stepId]?.name}</button>{canonicalFunctionId(model, stepId) !== stepId && <small style={muted}> · Reuses {model.elements[canonicalFunctionId(model, stepId)]?.name}</small>}{!current.branching && <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}><button style={button} aria-label={`Move step ${index + 1} up`} disabled={!writable || index === 0} onClick={() => move(index, -1)}>↑</button><button style={button} aria-label={`Move step ${index + 1} down`} disabled={!writable || index === steps.length - 1} onClick={() => move(index, 1)}>↓</button><button style={button} aria-label={`Remove step ${index + 1}`} disabled={!writable} onClick={() => setSteps(steps.filter(id => id !== stepId))}>Remove</button></span>}</li>)}</ol>
        {current.branching ? <p style={muted}>Review branches and guarded paths in the diagram editor.</p> : <button style={button} disabled={!writable || JSON.stringify(steps) === JSON.stringify(current.steps.map(item => item.step.id))} onClick={() => onSave(steps)}>Save sequence</button>} <button style={button} onClick={onDiagram}>Open scenario diagram</button>
    </section>;
}

import { Link, useNavigate } from 'react-router-dom';
import { diagramUrl } from '../router';
import { actionMembers, useCaseMembers } from '../lib/operational-presentation';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { canonicalFunctionId, functionalCatalog, functionalFlowsInScope, functionalFlowSteps, includedUseCases, operationalCatalog, operationalChildren, operationalConforms, operationalWorkLevel, workflowCases, wouldIncludeCycle, type MemoModelDTO, type OperationalWriteContext, type OperationalWorkLevel } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { operationalHome, writeOperational } from '../lib/operational-authoring';
import { diagramTypeFor, kindsOfLayer, type GuideLayer } from '../lib/pathways';
import { DiagramUseCaseSubject, DiagramActionSubject, DiagramDisplayScope } from '../diagram/display-scope';
import { DiagramEmbedContext } from '../diagram/diagram-embed-context';
import { PaletteKindsContext } from './DiagramPalette';
import { COLOR } from '../styles/tokens';
import { ControlIcon, SegmentedControl } from '../components/TraceControls';
import { pathwayRelationship } from '../lib/pathway-relationship';
import { LinkCoverageTable, type LinkCoverageRow } from './LinkCoverage';
import { ScenarioPage } from './ScenarioPage';
import { UseCaseProfile } from './UseCaseProfile';
import { ElementChip } from '../components/ElementChip';
import { confirmDialog } from '../components/AppDialogs';
import './pathway-workbench.css';
const DiagramCanvas = lazy(() => import('./DiagramCanvas').then(module => ({ default: module.DiagramCanvas })));
const DiagramEditor = lazy(() => import('./DiagramEditor').then(module => ({ default: module.DiagramEditor })));
const button: CSSProperties = { padding: '7px 11px', border: `1px solid ${COLOR.border}`, borderRadius: 6, color: COLOR.primary, background: 'white', cursor: 'pointer', font: 'inherit' };
const input: CSSProperties = { ...button, width: '100%', boxSizing: 'border-box', cursor: 'text', marginTop: 5 };
const card: CSSProperties = { padding: 18, border: `1px solid ${COLOR.border}`, borderRadius: 8, background: 'white' };
const muted: CSSProperties = { color: COLOR.muted, fontSize: 14, lineHeight: 1.5, margin: '8px 0' };
const heading: CSSProperties = { fontSize: 20, margin: '0 0 12px', fontWeight: 650 };
type Element = MemoModelDTO['elements'][string];
type Role = 'case' | 'workflow' | 'scenario' | 'step';
type Category = Exclude<Role, 'step'>;
type Presentation = 'overview' | 'table' | 'hierarchy' | 'visual';
// `counterpartWorkspace` marks a refinement started from the clinical end: the chosen system work is the source,
// the link is saved with it, and it is checked in that system's workspace.
type Action = { operation: OperationalWriteContext['operation']; context: Partial<OperationalWriteContext>; title: string; options?: Element[]; counterpartWorkspace?: Record<string, string> };

/** The operational spine is native ownership plus use-case inclusion and workflow realization. */
export function OperationalWorkbench({ model, row, workspace, canWrite, entry, onContext, onFunctional, onLevelChange, onSelection }: {
    model: MemoModelDTO; row: GuideLayer; workspace: string | null; canWrite: boolean;
    entry?: { work?: OperationalWorkLevel; artifactId?: string; createCase?: boolean };
    onContext?: (systemId: string) => void;
    onFunctional?: (artifactId?: string) => void;
    onLevelChange?: (level: OperationalWorkLevel) => void;
    onSelection?: (artifactId: string | undefined, level: OperationalWorkLevel) => void;
}) {
    const tasks = row.tasks ?? [];
    const [taskId, setTaskId] = useState(tasks.find(task => entry?.work && task.level === entry.work)?.id ?? tasks[0]?.id);
    const task = tasks.find(task => task.id === taskId) ?? tasks[0];
    const level: OperationalWorkLevel = task?.level === 'operational' ? 'operational' : 'clinical';
    useEffect(() => { onLevelChange?.(level); }, [level, onLevelChange]);
    const [category, setCategory] = useState<Category>(() => {
        const id = entry?.artifactId;
        if (!id || operationalConforms(model, id, 'UseCase')) return 'case';
        return operationalConforms(model, id, 'Workflow') ? 'workflow' : 'scenario';
    });
    const [presentation, setPresentation] = useState<Presentation>('overview');
    const openingVisual = useRef<string>();
    const [selectedId, setSelectedId] = useState(entry?.artifactId);
    const pendingSelection = useRef<{ id: string; workspace: string | null; taskId: string }>();
    // While following a link to the other level, the old selection is still set for one render: report only where it lands.
    useEffect(() => { if (!pendingSelection.current) onSelection?.(selectedId, level); }, [selectedId, level, onSelection]);
    const [filter, setFilter] = useState(''); const [review, setReview] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<Action>(); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
    const [diagramId, setDiagramId] = useState<string>();
    const contextKey = useRef(''); contextKey.current = `${workspace ?? ''}:${taskId}:${category}:${presentation}:${selectedId ?? ''}`;
    const root = workspace ? model.elements[workspace] : undefined;
    const conforms = (id: string, kind: string) => operationalConforms(model, id, kind);
    const role = (id: string): Role | undefined => conforms(id, 'UseCase') ? 'case' : conforms(id, 'Workflow') ? 'workflow' : conforms(id, 'OperativeScenario') ? 'scenario' : model.elements[id]?.construct === 'action' ? 'step' : undefined;
    const taskScope = level === 'operational' ? workspace : null;
    const useCases = useMemo(() => task ? operationalCatalog(model, task.subjectKind, taskScope) : [], [model, task, taskScope]);
    const workflows = useMemo(() => operationalCatalog(model, task?.workflowKind ?? 'Workflow', taskScope), [model, task?.workflowKind, taskScope]);
    const allWorkflows = useMemo(() => operationalCatalog(model, 'Workflow'), [model]);
    const scenarios = useMemo(() => operationalCatalog(model, task?.scenarioKind ?? 'OperativeScenario', taskScope).filter(scenario => operationalWorkLevel(model, scenario.id) === level), [model, task?.scenarioKind, taskScope, level]);
    const typed = category === 'case' ? useCases : category === 'workflow' ? workflows : scenarios;
    const typeLabel = category === 'case' ? 'use cases' : category === 'workflow' ? 'workflows' : 'scenarios';
    // The level words are the method's: each work task carries its level and its label.
    const levelName = (at?: OperationalWorkLevel) => tasks.find(item => item.level === at)?.label ?? at ?? 'Unclassified';
    const levelLabel = levelName(level);
    const hierarchy = useMemo(() => {
        const children = new Map<string, string[]>();
        const owned = new Map<string, Element[]>();
        for (const element of Object.values(model.elements)) { const owner = element.owner ?? element.parentAction; if (owner) { if (!owned.has(owner)) owned.set(owner, []); owned.get(owner)!.push(element); } }
        for (const element of Object.values(model.elements)) {
            let ids: string[] = [];
            if (operationalConforms(model, element.id, 'UseCase')) ids = [...includedUseCases(model, element.id).map(child => child.id), ...allWorkflows.filter(workflow => workflowCases(model, workflow.id).includes(element.id)).map(workflow => workflow.id)];
            else if (operationalConforms(model, element.id, 'Workflow')) ids = (owned.get(element.id) ?? []).filter(child => operationalConforms(model, child.id, 'OperativeScenario')).map(child => child.id);
            else if (element.construct === 'action') ids = (owned.get(element.id) ?? []).filter(child => child.construct === 'action' && !/Fork|Join|Decision|Merge|InitialNode|FinalNode/.test(child.kind)).map(child => child.id);
            if (operationalWorkLevel(model, element.id) === 'clinical') ids.push(...model.relationships.filter(edge => edge.type === 'realizes' && edge.targetId === element.id && operationalWorkLevel(model, edge.sourceId) === 'operational'
                && ['UseCase', 'Workflow', 'OperativeScenario', 'OperativeAction'].some(kind => operationalConforms(model, element.id, kind) && operationalConforms(model, edge.sourceId, kind))).map(edge => edge.sourceId));
            children.set(element.id, [...new Set(ids)]);
        }
        const own = new Set(useCases.map(useCase => useCase.id));
        const included = new Set(useCases.flatMap(useCase => includedUseCases(model, useCase.id).filter(child => own.has(child.id)).map(child => child.id)));
        const roots = useCases.filter(useCase => !included.has(useCase.id)).map(useCase => useCase.id);
        if (!roots.length && useCases.length) roots.push(...own);
        const unlinked = workflows.filter(workflow => !workflowCases(model, workflow.id).length).map(workflow => workflow.id);
        const unplaced = operationalCatalog(model, 'OperativeScenario', taskScope).filter(scenario => !operationalConforms(model, scenario.owner ?? scenario.parentAction ?? '', 'Workflow')).filter(scenario => !operationalWorkLevel(model, scenario.id) || operationalWorkLevel(model, scenario.id) === level).map(scenario => scenario.id);
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
    // A tree's parent function groups the system's responsibilities; an activity performs one of them, not the group.
    const functions = useMemo(() => {
        const roots = new Set(model.relationships.filter(edge => edge.type === 'functionalRoot').map(edge => edge.targetId));
        return functionalCatalog(model, workspace).filter(fn => !roots.has(fn.id));
    }, [model, workspace]);
    const flows = functionalFlowsInScope(model, workspace);
    const newWrite = canWrite && !busy && (level === 'clinical' || !!workspace);
    const base = { workspace, level };
    const previousSelectionScope = useRef<{ workspace: string | null; taskId?: string }>();
    const entryVisible = entry?.artifactId ? hierarchy.visible.has(entry.artifactId) : false;
    useEffect(() => {
        const previous = previousSelectionScope.current;
        if (previous?.workspace === workspace && previous.taskId === taskId) return;
        if (!previous) {
            if (entry?.artifactId && !entryVisible) return;
            if (entry?.createCase && level === 'operational' && !workspace) return;
            previousSelectionScope.current = { workspace, taskId };
            if (entry?.artifactId) choose(entry.artifactId);
            if (entry?.createCase && canWrite) begin('use-case', `Add a ${level} use case`);
            return;
        }
        previousSelectionScope.current = { workspace, taskId };
        const pending = pendingSelection.current; setSelectedId(pending?.workspace === workspace && pending?.taskId === taskId ? pending.id : undefined); pendingSelection.current = undefined; setAction(undefined); setDiagramId(undefined); setNotice(''); setFilter(''); setReview(false); }, [workspace, taskId, entryVisible]);
    // The scenario page inspects what it selects, as a click on any diagram does; elsewhere a change of selection
    // clears the properties panel unless a diagram is open.
    const onScenarioPage = presentation !== 'hierarchy' && (selectedRole === 'scenario' || selectedRole === 'step');
    useEffect(() => {
        if (onScenarioPage) return;
        if (!diagramId || presentation !== 'visual' || category === 'workflow') useModelStore.getState().inspectElement(null); else useModelStore.getState().selectDiagram(diagramId);
    }, [diagramId, workspace, taskId, selectedId, presentation, category, onScenarioPage]);
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
    const categoryOf = (id: string): Category => { const current = useModelStore.getState().model ?? model; return operationalConforms(current, id, 'UseCase') ? 'case' : operationalConforms(current, id, 'Workflow') ? 'workflow' : 'scenario'; };
    const choose = (id: string) => { setCategory(categoryOf(id)); setSelectedId(id); setAction(undefined); setNotice(''); setExpanded(previous => new Set([...previous, id])); };
    const goToWork = (id: string) => {
        if (onFunctional && (conforms(id, 'SystemFunction') || conforms(id, 'FunctionalFlow'))) {
            onFunctional(id);
            return;
        }
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
        const targetWorkspace = targetLevel === 'operational' ? model.workspaceMembership?.workspaces.find(scope => scope.scope === 'system' && model.workspaceMembership?.membership[id]?.includes(scope.root))?.root
            ?? model.workspaceMembership?.workspaces.find(scope => model.workspaceMembership?.membership[id]?.includes(scope.root))?.root ?? workspace : workspace;
        if (targetWorkspace === workspace && targetTask.id === taskId) { choose(id); return; }
        setCategory(categoryOf(id)); pendingSelection.current = { id, workspace: targetWorkspace, taskId: targetTask.id }; useModelStore.getState().setWorkspace(targetWorkspace); setTaskId(targetTask.id);
    };
    const begin = (operation: Action['operation'], title: string, context: Partial<OperationalWriteContext> = {}, options?: Element[]) => { setAction({ operation, title, context, options }); setNotice(''); };
    const create = (op: 'use-case' | 'workflow' | 'scenario' | 'step' | 'context') => {
        const context: Partial<OperationalWriteContext> = op === 'workflow' ? { useCaseId: selected!.id } : op === 'scenario' ? { workflowId: selected!.id }
            : op === 'step' ? selectedRole === 'scenario' ? { scenarioId: selected!.id } : { parentStepId: selected!.id }
            : op === 'use-case' && selectedRole === 'case' ? { useCaseId: selected!.id } : {};
        begin(op, op === 'context' ? 'Add a clinical subject' : op === 'use-case' ? `Add a ${level} use case` : op === 'workflow' ? 'Add a workflow for this goal' : op === 'scenario' ? 'Add a scenario to this workflow' : selectedRole === 'step' ? 'Decompose this step' : 'Add a scenario step', context);
    };
    const selectedAncestors: string[] = []; let ancestor = selectedId; const ancestorSeen = new Set<string>();
    while (ancestor && !ancestorSeen.has(ancestor)) { ancestorSeen.add(ancestor); selectedAncestors.push(ancestor); const element: Element | undefined = model.elements[ancestor]; ancestor = element?.owner ?? element?.parentAction; }
    const visualSubject = typed.find(element => element.id === selectedId) ?? typed.find(element => selectedAncestors.includes(element.id)) ?? (!selectedId ? typed[0] : undefined);
    const visualKey = `${workspace ?? ''}:${taskId}:${category}:${visualSubject?.id ?? ''}`;
    const showVisual = () => { if (!typed.some(element => element.id === selectedId) && visualSubject) setSelectedId(visualSubject.id); setAction(undefined); setPresentation('visual'); };
    const openDiagram = (subject = visualSubject, create = false, as: Category = category) => {
        if (!subject || as === 'workflow') return;
        const viewpoint = as === 'case' ? row.viewpoints.find(viewpoint => viewpoint.name === 'vpUseCase') : task?.viewpoint;
        if (!viewpoint) { if (create) setNotice('The method has no viewpoint for this presentation.'); return; }
        const members = as === 'case' ? useCaseMembers(model, subject.id) : actionMembers(model, subject.id);
        const allowed = new Set(members); const diagramType = as === 'case' ? 'ucd' : viewpoint.viewKind === 'actionflow' ? 'ofd' : diagramTypeFor(viewpoint.viewKind);
        const existing = model.diagrams?.find(diagram => (as === 'case' ? diagram.diagramType === 'ucd' : diagram.viewKind === viewpoint.viewKind)
            && diagram.elementIds?.includes(subject.id) && members.every(id => diagram.elementIds?.includes(id))
            && diagram.elementIds.every(id => allowed.has(id) || as === 'scenario' && model.elements[id]?.construct !== 'action'));
        if (existing) { setDiagramId(existing.id); return; }
        if (!create || !canWrite) return;
        void save(async () => {
            let reason: string | undefined; const guide = useModelStore.getState().guide;
            const id = await useModelStore.getState().createDiagram({ name: `${subject.name} — ${as === 'case' ? 'Use case diagram' : 'Scenario diagram'}`, viewpointId: viewpoint.id, viewKind: viewpoint.viewKind ?? 'actionflow', diagramType,
                elementIds: members, elementKinds: as === 'case' ? [task!.subjectKind, 'User', 'MemoActor', 'OperationalEntity', 'System', 'SystemOfSystems'] : guide ? kindsOfLayer(guide, row) : [], properties: { autoPopulate: 'false' }, activate: false, onError: error => { reason = error; } });
            if (!id) throw new Error(reason ?? 'The diagram could not be created.'); return id;
        }, id => setDiagramId(id));
    };
    useEffect(() => { setDiagramId(undefined); openingVisual.current = undefined; }, [visualKey]);
    useEffect(() => {
        if (presentation !== 'visual' || category === 'workflow' || !visualSubject || busy || openingVisual.current === visualKey) return;
        openingVisual.current = visualKey; openDiagram(visualSubject);
    }, [presentation, visualKey, busy, canWrite]);
    const changeCategory = (next: Category) => { setCategory(next); setSelectedId(undefined); setAction(undefined); setFilter(''); setNotice(''); };
    const addTyped = () => { setSelectedId(undefined); begin(category === 'case' ? 'use-case' : category, `Add a ${level} ${category === 'case' ? 'use case' : category}`); };
    const needsReview = (id: string) => {
        const elementRole = role(id); const children = hierarchy.children.get(id) ?? [];
        if (elementRole === 'case') return !children.some(child => role(child) === 'workflow');
        if (elementRole === 'workflow') return !operationalChildren(model, id).some(child => conforms(child.id, 'OperativeScenario'));
        if (elementRole === 'scenario') return !functionalFlowSteps(model, id).steps.length;
        if (elementRole === 'step' && conforms(id, 'OperativeAction')) {
            const performers = model.relationships.filter(edge => edge.type === 'performs' && edge.targetId === id).flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []);
            if (!performers.length) return true;
            return level === 'operational' && performers.some(performer => (conforms(performer.id, 'System') || conforms(performer.id, 'SystemOfSystems')) && performer.attributes.origin?.split('::').at(-1) !== 'external')
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
        const context = level === 'operational' && workspace && !model.workspaceMembership?.membership[id]?.includes(workspace);
        const badge = role(id) === 'case' ? 'Use case' : role(id) === 'workflow' ? 'Workflow' : role(id) === 'scenario' ? `${(element.attributes.scenarioKind ?? 'nominal').split('::').at(-1)} scenario` : conforms(id, 'OperativeAction') ? 'Step' : 'Function call';
        return <li key={id} style={{ margin: '5px 0' }}><div style={{ display: 'flex', gap: 4 }}>{!!children.length && <button type="button" aria-label={`${open ? 'Collapse' : 'Expand'} ${element.name}`} aria-expanded={open} style={{ ...button, padding: 6 }} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{open ? '⌄' : '›'}</button>}
            <button type="button" style={{ ...button, textAlign: 'left', flex: 1, background: selectedId === id ? '#e8f8f3' : 'white' }} aria-pressed={selectedId === id} onClick={() => choose(id)}><span>{element.name}</span><small style={{ display: 'block', color: COLOR.muted }}>{badge}{crossLevel ? ' · System context' : context ? ' · Other system' : ''}{review && needsReview(id) ? ' · Needs review' : ''}</small></button></div>
            {open && !!children.length && <ul style={{ listStyle: 'none', paddingLeft: 18 }}>{children.map(child => tree(child, new Set([...path, id])))}</ul>}</li>;
    };
    const title = selectedRole === 'case' ? 'Goal and use specification' : selectedRole === 'scenario' ? 'Scenario path' : 'Operational step';
    const creationButtons = selectedRole === 'case' ? <><button style={button} disabled={!writable} onClick={() => create('workflow')}>+ Workflow</button><button style={button} disabled={!writable} onClick={() => create('use-case')}>+ Included use case</button><button style={button} disabled={!writable} onClick={() => begin('include', 'Include an existing use case', { sourceId: selected!.id }, operationalCatalog(model, task!.subjectKind).filter(candidate => !wouldIncludeCycle(model, selected!.id, candidate.id)))}>Reuse a use case</button></>
        : selectedRole === 'scenario' || selectedRole === 'step' && conforms(selected!.id, 'OperativeAction') ? <>{(presentation !== 'overview' || selectedRole === 'step') && <button style={button} disabled={!writable} onClick={() => create('step')}>{selectedRole === 'scenario' ? '+ Step' : '+ Substep'}</button>}<button style={button} disabled={!writable} onClick={() => begin('reuse-step', 'Reuse an existing step', selectedRole === 'scenario' ? { scenarioId: selected!.id } : { parentStepId: selected!.id }, operationalCatalog(model, 'OperativeAction').filter(candidate => operationalWorkLevel(model, candidate.id) === level && candidate.id !== selected!.id && canonicalFunctionId(model, candidate.id) === candidate.id))}>Reuse a step</button></> : null;
    const clinicalTask = tasks.find(task => task.level === 'clinical');
    const subjectIds = selectedRole === 'case' ? model.relationships.filter(edge =>
        edge.type === 'hasSubject' && edge.sourceId === selected!.id && model.elements[edge.targetId],
    ).map(edge => edge.targetId) : [];
    const [overviewAnchor, setOverviewAnchor] = useState<string>();
    const overviewWorkflow = selectedRole === 'workflow' ? selected?.id : selectedAncestors.find(id => role(id) === 'workflow');
    const linkedCases = overviewWorkflow ? workflowCases(model, overviewWorkflow) : [];
    const overviewCase = selectedRole === 'case' && selected ? selected
        : useCases.find(item => item.id === overviewAnchor && linkedCases.includes(item.id))
        ?? useCases.find(item => linkedCases.includes(item.id));
    const [coverageOpen, setCoverageOpen] = useState(false);
    // System activities checked for a direct system function. A flow that realizes the activity is shown as
    // indirect coverage, never as a function the activity performs.
    const functionCoverage = useMemo((): LinkCoverageRow[] => {
        if (level !== 'operational' || !coverageOpen) return [];
        const local = new Set(functions.map(fn => fn.id));
        return operationalCatalog(model, 'OperativeAction', taskScope)
            .filter(activity => operationalWorkLevel(model, activity.id) !== 'clinical' && canonicalFunctionId(model, activity.id) === activity.id)
            .map(activity => {
                const realizingFlows = model.relationships.filter(edge => edge.type === 'realizes' && edge.targetId === activity.id && conforms(edge.sourceId, 'FunctionalFlow'))
                    .flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []);
                const unplaced = !operationalWorkLevel(model, activity.id);
                return { key: activity.id, item: activity, relationship: 'Performs a system function', ...(unplaced ? { note: 'Not placed in a clinical or operational workflow' } : {}),
                    coverage: pathwayRelationship(model, activity, 'performs', 'outgoing', element => local.has(element.id)),
                    ...(realizingFlows.length ? { indirect: { status: 'Via a functional flow', related: realizingFlows.map(flow => flow.name).join(', ') } } : {}) };
            });
    }, [model, level, coverageOpen, taskScope, functions]);
    const openOverviewItem = (id: string) => { setOverviewAnchor(overviewCase?.id); choose(id); };
    const backToUseCases = () => { setOverviewAnchor(undefined); setSelectedId(undefined); setAction(undefined); setCategory('case'); };
    // A workflow selected in the overview shows its use case's page, where its scenarios are listed under it.
    const pageCase = presentation !== 'overview' ? undefined : selectedRole === 'case' ? selected : selectedRole === 'workflow' ? overviewCase : undefined;
    const showOverviewDetails = !!action || !!selected && !pageCase;
    const [caseFilter, setCaseFilter] = useState('');
    const [caseDepthPreset, setCaseDepthPreset] = useState('all');
    const [collapsedCases, setCollapsedCases] = useState<Set<string>>(() => new Set());
    const [caseShow, setCaseShow] = useState<'all' | 'with'>('all');
    const caseBranches = useMemo(() => {
        const query = caseFilter.trim().toLowerCase();
        const scopeIds = new Set(useCases.map(item => item.id));
        const visited = new Set<string>();
        type CatalogRow = { item: Element; depth: number; parent?: Element; key: string; ancestorKeys: string[]; childCount: number; count: number; total: number; inScope: boolean };
        // A row stays when it, or a case it includes, has a workflow; cases with workflows sort first at every level.
        const branch = (item: Element, ancestors: readonly Element[], ancestorMatches = false): CatalogRow[] => {
            if (ancestors.some(parent => parent.id === item.id)) return [];
            visited.add(item.id);
            const matches = !query || item.name.toLowerCase().includes(query);
            const childBranches = includedUseCases(model, item.id)
                .map(child => branch(child, [...ancestors, item], ancestorMatches || matches))
                .filter(rows => rows.length > 0)
                .sort((a, b) => Number(b[0].total > 0) - Number(a[0].total > 0));
            const children = childBranches.flat();
            if (!matches && !ancestorMatches && children.length === 0) return [];
            const count = (hierarchy.children.get(item.id) ?? []).filter(id => operationalConforms(model, id, 'Workflow')).length;
            const total = count + childBranches.reduce((sum, rows) => sum + rows[0].total, 0);
            if (caseShow === 'with' && total === 0) return [];
            return [{
                item, depth: ancestors.length, parent: ancestors.at(-1),
                key: JSON.stringify([...ancestors.map(parent => parent.id), item.id]),
                ancestorKeys: ancestors.map((_, index) => JSON.stringify(ancestors.slice(0, index + 1).map(parent => parent.id))),
                childCount: childBranches.length, count, total,
                inScope: scopeIds.has(item.id),
            }, ...children];
        };
        const roots = hierarchy.roots.flatMap(id => model.elements[id] ? [branch(model.elements[id], [])] : []);
        for (const item of useCases) {
            if (!visited.has(item.id)) roots.push(branch(item, []));
        }
        return roots.filter(rows => rows.length > 0).sort((a, b) => Number(b[0].total > 0) - Number(a[0].total > 0));
    }, [model, useCases, hierarchy, caseFilter, caseShow]);
    const searchingCases = Boolean(caseFilter.trim());
    const visibleBranches = searchingCases ? caseBranches
        : caseBranches.map(rows => rows.filter(row => !row.ancestorKeys.some(key => collapsedCases.has(key))));
    const caseRows = visibleBranches.flat();
    const parentRows = caseBranches.flatMap(rows => rows.filter(row => row.childCount > 0));
    const maximumLevel = Math.max(1, ...caseBranches.flatMap(rows => rows.map(row => row.depth + 1)));
    const showThroughLevel = (preset: string) => {
        setCaseDepthPreset(preset);
        setCollapsedCases(new Set(parentRows.filter(row => preset !== 'all' && row.depth + 1 >= Number(preset)).map(row => row.key)));
    };
    const caseBranchToggle = (key: string, name: string, childCount: number) => {
        if (!childCount) return null;
        const open = searchingCases || !collapsedCases.has(key);
        return <button type="button" className="pathway-case-toggle" aria-expanded={open} disabled={searchingCases}
            aria-label={`${open ? 'Collapse' : 'Expand'} included cases for ${name}`}
            onClick={() => {
                setCaseDepthPreset('custom');
                setCollapsedCases(previous => {
                    const next = new Set(previous);
                    if (next.has(key)) next.delete(key); else next.add(key);
                    return next;
                });
            }}>
            <span aria-hidden="true">{open ? '▾' : '▸'}</span> <span>{childCount}</span>
        </button>;
    };
    const overviewScenario = selectedAncestors.find(id => role(id) === 'scenario');
    const scenarioCount = (id: string) => (hierarchy.children.get(id) ?? []).filter(child => role(child) === 'scenario').length;
    const overviewWorkflows = overviewCase ? (hierarchy.children.get(overviewCase.id) ?? []).filter(id => role(id) === 'workflow')
        .sort((a, b) => Number(scenarioCount(b) > 0) - Number(scenarioCount(a) > 0)) : [];
    const [workflowShow, setWorkflowShow] = useState<'all' | 'with'>('all');
    const shownWorkflows = workflowShow === 'with' ? overviewWorkflows.filter(id => scenarioCount(id) > 0) : overviewWorkflows;
    const canAddUnder = (id: string) => newWrite && model.elements[id]?.provenance?.declaration.writable !== false
        && operationalWorkLevel(model, id) === level && (level === 'clinical' || !!workspace && !!model.workspaceMembership?.membership[id]?.includes(workspace));
    const [caseLayout, setCaseLayout] = useState<'list' | 'grid' | 'diagram'>('list');
    const scopeDiagramName = level === 'clinical' ? 'Clinical use cases' : root?.name ?? `${levelLabel} use cases`;
    const scopeViewpoint = row.viewpoints.find(viewpoint => viewpoint.name === 'vpUseCase');
    const scopedCases = useMemo(() => useCaseMembers(model, useCases.map(item => item.id)), [model, useCases]);
    const existingScopeDiagram = model.diagrams?.find(diagram => diagram.diagramType === 'ucd'
        && diagram.name === scopeDiagramName && diagram.elementIds?.length === scopedCases.length
        && scopedCases.every(id => diagram.elementIds?.includes(id)));
    const saveScopeDiagram = () => {
        if (!newWrite || !scopeViewpoint || !scopedCases.length) return;
        void save(async () => {
            let reason: string | undefined;
            const id = await useModelStore.getState().createDiagram({
                name: scopeDiagramName, diagramType: 'ucd', viewKind: scopeViewpoint.viewKind ?? 'general',
                viewpointId: scopeViewpoint.id, elementIds: scopedCases,
                elementKinds: task ? [task.subjectKind, 'User', 'MemoActor', 'OperationalEntity', 'System', 'SystemOfSystems'] : [],
                properties: { autoPopulate: 'false', layoutHint: 'use-case:catalog' }, activate: false,
                onError: error => { reason = error; },
            });
            if (!id) throw new Error(reason ?? 'The use case diagram could not be saved.');
            return id;
        }, () => setNotice('Use case diagram saved.'));
    };
    const caseActors = (id: string) => model.relationships.flatMap(edge => {
        if (edge.type !== 'participatesIn') return [];
        const actor = model.elements[edge.sourceId === id ? edge.targetId : edge.targetId === id ? edge.sourceId : ''];
        return actor ? [actor.name] : [];
    });
    // A workflow has no page of its own: its scenarios are listed under it here, and its own links are in this menu.
    const workflowMenu = (id: string): { label: string; run: () => void; disabled?: boolean }[] => {
        const own = canAddUnder(id);
        return [
            { label: 'Properties…', run: () => useModelStore.getState().inspectElement(id) },
            ...(own ? [{ label: 'Link to a use case…', disabled: busy, run: () => begin('link-workflow', 'Connect this workflow to a use case', { workflowId: id }, useCases) }] : []),
            ...(level === 'clinical' && canWrite ? [{ label: `Link ${levelName('operational').toLowerCase()} work…`, disabled: busy, run: () => linkSystemCounterpart(id, systemTask?.workflowKind) }] : []),
            ...(level === 'operational' && own ? [{ label: `Link ${levelName('clinical').toLowerCase()} work…`, disabled: busy, run: () => begin('refine', 'Link the clinical work it realizes', { sourceId: id },
                operationalCatalog(model, clinicalTask?.workflowKind ?? 'Workflow').filter(element => operationalWorkLevel(model, element.id) === 'clinical' && canonicalFunctionId(model, element.id) === element.id)) }] : []),
        ];
    };
    // One workflow: its scenarios listed under it, + Scenario, and its own links in the ⋯ menu. The use case page
    // lists these, and a workflow selected anywhere else shows the same group.
    const workflowGroup = (id: string) => {
        const workflow = model.elements[id];
        if (!workflow) return null;
        const scenarios = (hierarchy.children.get(id) ?? []).filter(child => role(child) === 'scenario').flatMap(child => model.elements[child] ? [model.elements[child]] : []);
        const menu = workflowMenu(id);
        return <li key={id} className="pathway-workflow-group" aria-label={`${workflow.name} workflow`} aria-current={id === overviewWorkflow ? 'true' : undefined}>
            <div className="pathway-workflow-group-head">
                <span className="pathway-icon" aria-hidden="true">{ControlIcon.workflow}</span>
                <span><strong>{workflow.name}</strong>{workflow.doc && <small>{workflow.doc}</small>}</span>
                <CountBadge icon={ControlIcon.scenario} count={scenarios.length} one="scenario" many="scenarios" />
                {canAddUnder(id) && <button type="button" className="pathway-button" aria-label={`Add a scenario to ${workflow.name}`} disabled={busy}
                    onClick={() => begin('scenario', 'Add a scenario to this workflow', { workflowId: id })}>{ControlIcon.plus} Scenario</button>}
                <details className="pathway-row-menu">
                    <summary aria-label={`More actions for ${workflow.name}`}>⋯</summary>
                    <div role="menu">{menu.map(item => <button key={item.label} type="button" role="menuitem" disabled={item.disabled}
                        onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); item.run(); }}>{item.label}</button>)}</div>
                </details>
            </div>
            {scenarios.length ? <ul className="pathway-operational-rows">{scenarios.map(scenario =>
                <li key={scenario.id}><button type="button" className="pathway-operational-row" onClick={() => openOverviewItem(scenario.id)}>
                    <span className="pathway-icon" aria-hidden="true">{ControlIcon.scenario}</span>
                    <span><strong>{scenario.name}</strong>{(scenario.attributes.expectedResult || scenario.doc) && <small>{scenario.attributes.expectedResult || scenario.doc}</small>}</span>
                    <span className="pathway-operational-pill">{scenarioPath(scenario)}</span><span aria-hidden="true">›</span>
                </button></li>)}</ul> : <p className="pathway-operational-empty">No scenarios yet.</p>}
        </li>;
    };
    const overviewMap = overviewCase && <section aria-label="Use case workflow map" className="pathway-operational-panel">
        <header className="pathway-operational-panel-head">
            <div><h2>Workflows</h2><p>How this goal is accomplished.</p></div>
            {overviewWorkflows.length > 0 && <SegmentedControl ariaLabel="Show workflows" value={workflowShow} onChange={setWorkflowShow} options={[
                { id: 'all', label: 'All', icon: ControlIcon.list },
                { id: 'with', label: 'With scenarios', icon: ControlIcon.scenario, title: 'Only workflows that have a scenario' },
            ]} />}
            {canAddUnder(overviewCase.id) && <button type="button" className="pathway-button pathway-button--primary" onClick={() => {
                openOverviewItem(overviewCase.id); begin('workflow', 'Add a workflow for this goal', { useCaseId: overviewCase.id });
            }}>+ Workflow</button>}
        </header>
        {shownWorkflows.length ? <ul className="pathway-workflow-groups">{shownWorkflows.map(workflowGroup)}</ul> : <p className="pathway-operational-empty">{overviewWorkflows.length ? 'No workflow of this goal has a scenario yet.' : 'No workflows linked to this goal yet.'}</p>}
    </section>;
    const linkedWorkflows = selectedRole === 'case' ? (hierarchy.children.get(selected!.id) ?? []).filter(id => role(id) === 'workflow') : [];
    const clinicalKind = selectedRole === 'case' ? clinicalTask?.subjectKind : selectedRole === 'workflow' ? clinicalTask?.workflowKind : selectedRole === 'scenario' ? clinicalTask?.scenarioKind : clinicalTask?.stepKind;
    const refinements = selected ? model.relationships.filter(edge => edge.type === 'realizes' && (edge.sourceId === selected.id || edge.targetId === selected.id)).filter(edge => !conforms(edge.sourceId, 'ComponentFunction')) : [];
    const systemTask = tasks.find(task => task.level === 'operational');
    const systemKind = selectedRole === 'case' ? systemTask?.subjectKind : selectedRole === 'workflow' ? systemTask?.workflowKind : selectedRole === 'scenario' ? systemTask?.scenarioKind : systemTask?.stepKind;
    const otherLevel = selectedLevel === 'clinical' ? 'operational' : selectedLevel === 'operational' ? 'clinical' : undefined;
    const isCounterpart = (edge: MemoModelDTO['relationships'][number], id: string) => {
        const other = edge.sourceId === id ? edge.targetId : edge.sourceId;
        return !conforms(edge.sourceId, 'FunctionalFlow') && !!otherLevel && operationalWorkLevel(model, other) === otherLevel;
    };
    const directCounterparts = selected ? refinements.filter(edge => isCounterpart(edge, selected.id)) : [];
    // A goal, workflow or scenario without its own counterpart can still be covered by links between its steps.
    const stepCounterparts = useMemo(() => {
        if (!selected || !otherLevel || selectedRole === 'step' || directCounterparts.length) return [];
        const roots = selectedRole === 'case' ? (hierarchy.children.get(selected.id) ?? []).filter(id => operationalConforms(model, id, 'Workflow')) : [selected.id];
        const steps = new Map<string, Element>(); const seen = new Set<string>(); const queue = [...roots];
        while (queue.length) {
            const id = queue.pop()!; if (seen.has(id)) continue; seen.add(id);
            for (const child of operationalChildren(model, id)) { queue.push(child.id); if (conforms(child.id, 'OperativeAction')) steps.set(child.id, child); }
        }
        return [...steps.values()].flatMap(step => {
            const canonical = canonicalFunctionId(model, step.id) ?? step.id;
            return model.relationships.filter(edge => edge.type === 'realizes' && (edge.sourceId === canonical || edge.targetId === canonical) && isCounterpart(edge, canonical))
                .flatMap(edge => { const other = model.elements[edge.sourceId === canonical ? edge.targetId : edge.sourceId]; return other && conforms(other.id, 'OperativeAction') ? [{ key: `${step.id}:${edge.id}`, step, other }] : []; });
        });
    }, [model, selected, selectedRole, otherLevel, directCounterparts.length, hierarchy]);
    // The scenario a step belongs to: the nearest owner that is a scenario.
    const scenarioOf = (id: string): Element | undefined => {
        let parent = model.elements[id]?.owner ?? model.elements[id]?.parentAction;
        for (const seen = new Set<string>(); parent && !seen.has(parent); parent = model.elements[parent]?.owner ?? model.elements[parent]?.parentAction) {
            seen.add(parent);
            if (conforms(parent, 'OperativeScenario')) return model.elements[parent];
        }
        return undefined;
    };
    const systemNameOf = (id: string) => {
        const root = model.workspaceMembership?.workspaces.find(scope => scope.scope === 'system' && model.workspaceMembership?.membership[id]?.includes(scope.root))?.root;
        return root ? model.elements[root]?.name : undefined;
    };
    const stepsUnder = (id: string) => {
        const steps = new Set<string>(); const queue = [id];
        while (queue.length) for (const child of operationalChildren(model, queue.pop()!)) if (conforms(child.id, 'OperativeAction') && !steps.has(child.id)) { steps.add(child.id); queue.push(child.id); }
        return steps;
    };
    // On a scenario: one table per counterpart scenario, one row per step of this scenario, every step it is linked to on the right.
    const stepCounterpartGroups = useMemo(() => {
        const groups = new Map<string, { key: string; scenario?: Element; system?: string; rows: Map<string, { step: Element; others: Element[] }> }>();
        for (const { step, other } of stepCounterparts) {
            const scenario = scenarioOf(other.id);
            const key = scenario?.id ?? '';
            const group = groups.get(key) ?? { key, scenario, system: otherLevel === 'operational' ? systemNameOf(other.id) : undefined, rows: new Map() };
            const row: { step: Element; others: Element[] } = group.rows.get(step.id) ?? { step, others: [] };
            if (!row.others.some(existing => existing.id === other.id)) row.others.push(other);
            group.rows.set(step.id, row); groups.set(key, group);
        }
        return [...groups.values()].map(group => ({ ...group, rows: [...group.rows.values()] }));
    }, [model, stepCounterparts, otherLevel]);
    // On a workflow or use case: the step evidence lives on its scenarios, so each scenario gets one line saying how far it is covered.
    const scenarioCoverage = useMemo(() => {
        const entries = new Map<string, { key: string; scenario?: Element; linked: Set<string>; systems: Set<string> }>();
        for (const { step, other } of stepCounterparts) {
            const scenario = scenarioOf(step.id);
            const key = scenario?.id ?? '';
            const entry = entries.get(key) ?? { key, scenario, linked: new Set<string>(), systems: new Set<string>() };
            entry.linked.add(step.id);
            const system = otherLevel === 'operational' ? systemNameOf(other.id) : undefined;
            if (system) entry.systems.add(system);
            entries.set(key, entry);
        }
        return [...entries.values()].map(entry => ({ ...entry, total: entry.scenario ? stepsUnder(entry.scenario.id).size : entry.linked.size }));
    }, [model, stepCounterparts, otherLevel]);
    const systemWorkspaceOf = (id: string) => {
        const roots = model.workspaceMembership?.membership[id] ?? [];
        if (workspace && roots.includes(workspace)) return workspace;
        return model.workspaceMembership?.workspaces.find(scope => scope.scope === 'system' && roots.includes(scope.root))?.root ?? roots[0];
    };
    const linkSystemCounterpart = (targetId = selected?.id, kind = systemKind) => {
        if (!targetId) return;
        const candidates = operationalCatalog(model, kind ?? 'UseCase').filter(element => operationalWorkLevel(model, element.id) === 'operational'
            && canonicalFunctionId(model, element.id) === element.id && element.provenance?.declaration.writable !== false && !!systemWorkspaceOf(element.id)
            && (!workspace || !!model.workspaceMembership?.membership[element.id]?.includes(workspace)));
        setAction({ operation: 'refine', title: 'Link operational work that realizes it', context: { targetId }, options: candidates,
            counterpartWorkspace: Object.fromEntries(candidates.map(element => [element.id, systemWorkspaceOf(element.id)!])) });
        setNotice('');
    };
    const performedFunctions = selected ? model.relationships.filter(edge => edge.type === 'performs' && edge.sourceId === selected.id && conforms(edge.targetId, 'SystemFunction')) : [];
    const performedTargets = new Set(selectedRole === 'step' ? model.relationships.filter(edge =>
        edge.type === 'performs' && edge.sourceId === selected?.id,
    ).map(edge => edge.targetId) : []);
    const flowOccurrences = performedTargets.size ? functionalCatalog(model, null, 'FunctionalFlow').flatMap(flow => functionalFlowSteps(model, flow.id).steps
        .filter(item => performedTargets.has(item.step.id)).map(item => ({ flow, step: item.step }))) : [];
    const performers = selected ? model.relationships.filter(edge => edge.type === 'performs' && edge.targetId === selected.id).flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []) : [];
    const isScenarioPage = presentation === 'overview' && selectedRole === 'scenario';
    // A scenario, or a step inside one, opens the scenario page: its steps, one diagram, and the selection's properties.
    const pageScenario = selected && presentation !== 'hierarchy' ? (selectedRole === 'scenario' ? selected : selectedRole === 'step' ? scenarioOf(selected.id) : undefined) : undefined;
    const pageKey = pageScenario ? `page:${workspace ?? ''}:${taskId}:${pageScenario.id}` : '';
    useEffect(() => {
        if (!pageKey || !pageScenario || busy || openingVisual.current === pageKey) return;
        openingVisual.current = pageKey; openDiagram(pageScenario, false, 'scenario');
    }, [pageKey, busy, visualKey]);
    // A selection on the scenario page opens the app's properties panel, as a click on any diagram does.
    const inspectOnPage = (id: string) => { choose(id); useModelStore.getState().inspectElement(id); };
    // The page draws the scenario alone, read-only, with its performers as lanes and the selected step
    // highlighted. Edit diagram opens the saved diagram on its own page, which offers the way back here.
    const navigate = useNavigate();
    const [editWhenSaved, setEditWhenSaved] = useState(false);
    const editDiagram = (id: string) => {
        const diagram = useModelStore.getState().model?.diagrams?.find(candidate => candidate.id === id);
        if (!diagram || !pageScenario) return;
        useModelStore.getState().setDiagramReturn({ diagramId: diagram.id, label: pageScenario.name, path: `${window.location.pathname}${window.location.search}` });
        navigate(diagramUrl(diagram.diagramType, diagram.shortId ?? diagram.id));
    };
    useEffect(() => { if (editWhenSaved && diagramId) { setEditWhenSaved(false); editDiagram(diagramId); } }, [editWhenSaved, diagramId]);
    const pageStepIds = pageScenario ? functionalFlowSteps(model, pageScenario.id).steps.map(item => item.step.id) : [];
    const scenarioPreview = pageScenario && <section aria-label="Scenario diagram" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button type="button" className="pathway-button" disabled={busy || !diagramId && !canWrite} onClick={() => { if (diagramId) editDiagram(diagramId); else { setEditWhenSaved(true); openDiagram(pageScenario, true, 'scenario'); } }}>{diagramId ? 'Edit diagram' : 'Create diagram'}</button>
        </div>
        <div className="pathway-operative-canvas" style={{ flex: 1, minHeight: 440 }}>
            <Suspense fallback={<p role="status">Opening scenario diagram…</p>}>
                <DiagramEmbedContext.Provider value={{
                    diagramId: `scenario-page:${pageScenario.id}`, readOnly: true,
                    previewDiagram: { id: `scenario-page:${pageScenario.id}`, name: pageScenario.name, diagramType: 'ofd', viewKind: 'actionflow', viewpointId: '__model', auto: true, elementIds: actionMembers(model, pageScenario.id) },
                    highlightIds: selectedId && selectedId !== pageScenario.id ? [selectedId] : [],
                    onExplore: item => { if (item.type === 'element' && pageStepIds.includes(item.id)) inspectOnPage(item.id); },
                    // The walkthrough selects each step it reaches, so the bar and the properties follow it.
                    onWalkStep: id => { if (id && pageStepIds.includes(id)) inspectOnPage(id); },
                }}><DiagramActionSubject.Provider value={pageScenario.id}><DiagramCanvas key={`scenario-page:${pageScenario.id}`} /></DiagramActionSubject.Provider></DiagramEmbedContext.Provider>
            </Suspense>
        </div>
    </section>;
    const scenarioDiagram = scenarioPreview;
    const performerCandidates = () => Object.values(model.elements).filter(element => ['User', 'OperationalEntity', ...(level === 'operational' ? ['System', 'SystemOfSystems'] : [])].some(kind => conforms(element.id, kind)) && (!element.isDefinition || element.id === workspace) && element.provenance?.declaration.writable !== false);
    const linkClinicalWork = () => begin('refine', 'Link the clinical work it realizes', { sourceId: selected!.id }, operationalCatalog(model, clinicalKind ?? 'UseCase').filter(element => operationalWorkLevel(model, element.id) === 'clinical' && canonicalFunctionId(model, element.id) === element.id));
    const artifactDetails = selected && <>
        {selected.doc && <p style={muted}>{selected.doc}</p>}
        <dl className="pathway-operational-facts">
            {['goalStatement', 'successOutcome', 'trigger', 'preCondition', 'postCondition', 'expectedResult', 'taskGoal'].filter(key => selected.attributes[key]).map(key =>
                <div key={key}><dt>{key === 'goalStatement' ? 'Goal' : fieldLabel(key)}</dt><dd>{selected.attributes[key]}</dd></div>)}
        </dl>
        <div className="pathway-scenario-actions">{creationButtons}<button style={button} disabled={!ownSelection || !!selectedLevel && selectedLevel !== level}
            onClick={() => useModelStore.getState().inspectElement(selected.id)}>Details…</button></div>
    </>;
    const actionForm = action && <OperationalForm key={`${action.operation}:${selectedId ?? ''}`} action={action} model={model} level={level} levelTask={task} workspace={workspace} disabled={!newWrite || busy} onCancel={() => setAction(undefined)} onContext={() => create('context')} onSave={(context, name) => void save(() => writeOperational({ ...base, ...action.context, ...context, operation: action.operation }, name), id => { setAction(undefined); if (action.counterpartWorkspace) { if (selected) choose(selected.id); } else if (id) choose(id); })} />;
    const detail = (<section aria-label="Current operational task" style={card}>
                {action ? actionForm
                : !selected ? <><h2 style={heading}>{category === 'case' ? 'What should someone accomplish?' : category === 'workflow' ? 'What work supports the goal?' : 'What happens along this path?'}</h2><p style={muted}>{typed.length ? `Select ${category === 'case' ? 'a use case' : `a ${category}`} to see its details.` : `Use Add ${category === 'case' ? 'use case' : category} to start.`}</p></>
                : <>{selectedRole !== 'workflow' && <><small style={muted}>{levelName(selectedLevel)} {selectedRole === 'case' ? 'use case' : selectedRole === 'scenario' ? 'scenario' : 'step'} · {title}</small><h2 style={heading}>{selected.name}</h2></>}
                    {selectedRole === 'scenario' && <span className="pathway-operational-pill">{scenarioPath(selected)}</span>}
                    {(selectedLevel && selectedLevel !== level || !ownSelection && level === 'operational') && <p style={muted}>This is linked {selectedLevel ?? 'operational'} work shown as context. <button style={button} onClick={() => goToWork(selected.id)}>Work on {sourceWorkspace?.name ?? selectedLevel ?? 'this context'}</button></p>}
                    {!selectedLevel && <p style={muted}>Place this scenario in a matching workflow to establish its level. Existing identities and source are preserved.</p>}
                    {!isScenarioPage && selectedRole !== 'workflow' && artifactDetails}
                    {presentation !== 'overview' && linkedWorkflows.length > 0 && <section aria-label="Workflows for this goal"><h3>Workflows for this goal</h3><ul>{linkedWorkflows.map(id =>
                        <li key={id}><button type="button" style={button} onClick={() => choose(id)}>{model.elements[id]?.name}</button></li>)}</ul></section>}
                    {selectedRole === 'case' && <details className="pathway-related"><summary>Model subject</summary><p style={muted}> {subjectIds.length ? subjectIds.map((id, index) => <span key={id}>{index > 0 && ', '}{onContext && model.workspaceMembership?.workspaces.some(scope => scope.root === (model.workspaceMembership?.definitionOf[id] ?? id))
                        ? <button type="button" style={button} onClick={() => onContext(model.workspaceMembership?.definitionOf[id] ?? id)}>Open {model.elements[id].name} context</button> : model.elements[id].name}</span>) : 'Not specified'}</p></details>}
                    {selectedRole === 'workflow' && <>
                        <div style={{ ...muted, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><strong>Realizes:</strong> {workflowCases(model, selected.id).length ? workflowCases(model, selected.id).flatMap(id => model.elements[id] ? [
                            <ElementChip key={id} model={model} element={model.elements[id]} onClick={() => { setPresentation('overview'); openOverviewItem(id); }} />] : []) : 'No use case linked yet. Use ⋯ to link one.'}</div>
                        <ul className="pathway-workflow-groups">{workflowGroup(selected.id)}</ul>
                    </>}
                    {(selectedRole === 'scenario' || selectedRole === 'step' && !!operationalChildren(model, selected.id).filter(child => child.construct === 'action').length) && <ScenarioSequence key={selected.id + JSON.stringify(functionalFlowSteps(model, selected.id).steps.map(item => item.step.id))} model={model} id={selected.id} writable={writable} flowFirst={isScenarioPage} details={isScenarioPage ? artifactDetails : undefined} onAdd={() => create('step')} onSelect={choose} onDiagram={() => { setCategory('scenario'); if (selectedRole === 'scenario') setSelectedId(selected!.id); setPresentation('visual'); }} onSave={stepIds => void save(() => writeOperational({ ...base, ...(selectedRole === 'scenario' ? { scenarioId: selected.id } : { parentStepId: selected.id }), operation: 'sequence', stepIds }))} />}
                    {selectedRole === 'step' && conforms(selected.id, 'OperativeAction') && <><h3 style={{ marginTop: 18, fontWeight: 650 }}>Who performs this step?</h3><p style={muted}>{performers.map(performer => performer.name).join(', ') || 'No performer linked yet.'}</p><button style={button} disabled={!writable} onClick={() => begin('performer', 'Choose the performer', { sourceId: selected.id }, Object.values(model.elements).filter(element => ['User', 'OperationalEntity', ...(level === 'operational' ? ['System', 'SystemOfSystems'] : [])].some(kind => conforms(element.id, kind)) && (!element.isDefinition || element.id === workspace) && element.provenance?.declaration.writable !== false))}>Set performer</button></>}
                    {level === 'operational' && selectedLevel === 'operational' && selectedRole !== 'workflow' && <><h3 style={{ marginTop: 20, fontWeight: 650 }}>Realizes clinical work</h3><p style={muted}>Link this operational work to the clinical work it realizes.</p><button style={button} disabled={!writable || !clinicalKind} onClick={() => begin('refine', 'Refine clinical work', { sourceId: selected.id }, operationalCatalog(model, clinicalKind ?? 'UseCase').filter(element => operationalWorkLevel(model, element.id) === 'clinical' && canonicalFunctionId(model, element.id) === element.id))}>Link clinical work</button></>}
                    {level === 'clinical' && selectedLevel === 'clinical' && selectedRole !== 'workflow' && (selectedRole !== 'step' || conforms(selected.id, 'OperativeAction')) && <><h3 style={{ marginTop: 20, fontWeight: 650 }}>Realized by operational work</h3><p style={muted}>Operational work that realizes this clinical work. The link is saved with the operational work.</p><button style={button} disabled={!canWrite || busy || !systemKind} onClick={() => linkSystemCounterpart()}>Link operational work</button></>}
                    {stepCounterparts.length > 0 && selectedRole !== 'workflow' && selectedLevel && otherLevel && (() => {
                        const own = levelName(selectedLevel);
                        const other = levelName(otherLevel);
                        const roleWord = selectedRole === 'case' ? 'use case' : selectedRole;
                        return <section aria-label="Covered via linked steps" className="pathway-related">
                            <h3 style={{ marginTop: 20, fontWeight: 650 }}>{other} counterparts, step by step</h3>
                            <p style={muted}>No {otherLevel} {roleWord} is linked to this {roleWord} as a whole. {selectedRole === 'scenario'
                                ? `Some of its steps are linked to ${otherLevel} steps one by one.`
                                : `Some steps of its scenarios are linked to ${otherLevel} steps one by one. Open a scenario to see which.`}</p>
                            {selectedRole === 'scenario' ? stepCounterpartGroups.map(group => <div key={group.key} style={{ marginTop: 12 }}>
                                <p style={muted}><strong>{other} scenario:</strong> {group.scenario ? <button style={button} onClick={() => goToWork(group.scenario!.id)}>{group.scenario.name}</button> : 'not placed in a scenario'}{group.system && <> · {group.system}</>}</p>
                                <table aria-label={`Steps linked to ${group.scenario?.name ?? 'unplaced steps'}`} style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                                    <thead><tr style={{ textAlign: 'left', color: COLOR.muted }}><th style={{ padding: '4px 8px 4px 0', fontWeight: 600 }}>{own} step</th><th style={{ padding: '4px 0', fontWeight: 600 }}>{otherLevel === 'operational' ? `Realized by ${otherLevel} step` : `Realizes ${otherLevel} step`}</th></tr></thead>
                                    <tbody>{group.rows.map(({ step, others }) => <tr key={step.id} style={{ borderTop: `1px solid ${COLOR.border}`, verticalAlign: 'top' }}>
                                        <td style={{ padding: '6px 8px 6px 0' }}><button style={button} onClick={() => choose(step.id)}>{step.name}</button></td>
                                        <td style={{ padding: '6px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>{others.map(item => <button key={item.id} style={button} onClick={() => goToWork(item.id)}>{item.name}</button>)}</td>
                                    </tr>)}</tbody>
                                </table>
                            </div>) : <ul style={{ paddingLeft: 18 }}>{scenarioCoverage.map(entry => <li key={entry.key} style={muted}>
                                {entry.scenario ? <button style={button} onClick={() => choose(entry.scenario!.id)}>{entry.scenario.name}</button> : 'Steps not placed in a scenario'} — {entry.linked.size} of {entry.total} {entry.total === 1 ? 'step' : 'steps'} {entry.linked.size === 1 ? 'has' : 'have'} {`${/^[aeiou]/i.test(other) ? 'an' : 'a'} ${other.toLowerCase()} counterpart`}{entry.systems.size ? ` in ${[...entry.systems].join(', ')}` : ''}
                            </li>)}</ul>}
                        </section>;
                    })()}
                    {selectedRole === 'workflow' && !!refinements.length && <h3 style={{ marginTop: 20, fontWeight: 650 }}>{selectedLevel === 'clinical' ? `Realized by ${levelName('operational').toLowerCase()} work` : `Realizes ${levelName('clinical').toLowerCase()} work`}</h3>}
                    {!!refinements.length && <ul style={{ paddingLeft: 18, marginTop: 10 }}>{refinements.map(edge => <li key={edge.id} style={{ ...muted, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>{model.elements[edge.sourceId] && <ElementChip model={model} element={model.elements[edge.sourceId]} onClick={() => goToWork(edge.sourceId)} />} → {model.elements[edge.targetId] && <ElementChip model={model} element={model.elements[edge.targetId]} onClick={() => goToWork(edge.targetId)} />}{conforms(edge.sourceId, 'FunctionalFlow') ? ' · Functional flow realization' : ' · Refines'}{conforms(edge.sourceId, 'FunctionalFlow') && <ol style={{ paddingLeft: 20 }}>{functionalFlowSteps(model, edge.sourceId).steps.map(item => <li key={item.step.id}>{model.elements[item.functionId ?? '']?.name ?? item.step.name}</li>)}</ol>}</li>)}</ul>}
                    {level === 'operational' && selectedLevel === 'operational' && (selectedRole === 'scenario' || selectedRole === 'step' && conforms(selected.id, 'OperativeAction')) && <><h3 style={{ marginTop: 20, fontWeight: 650 }}>Functional behavior</h3>
                        {selectedRole === 'step' && <><p style={muted}>Which system functions carry out this activity?</p><ul style={{ paddingLeft: 18 }}>{performedFunctions.map(edge => <li key={edge.id} style={muted}>{onFunctional
                            ? <button type="button" className="pathway-button" onClick={() => onFunctional(edge.targetId)}>{model.elements[edge.targetId]?.name}</button>
                            : model.elements[edge.targetId]?.name}</li>)}</ul><button style={button} disabled={!writable} onClick={() => begin('perform-function', 'Connect a system function', { sourceId: selected.id }, functions)}>+ System function</button></>}
                        {flowOccurrences.length > 0 && <section aria-label="Functional flow steps used here">
                            <h4>Flow steps used here</h4>
                            <div className="pathway-resources">{flowOccurrences.map(({ flow, step }) => <button key={step.id} type="button" className="pathway-resource" onClick={() => goToWork(flow.id)}>
                                <span><strong>{step.name}</strong><small>{flow.name}</small></span>
                            </button>)}</div>
                        </section>}
                        <p style={muted}>{selectedRole === 'scenario' ? 'Link a functional flow here only when it realizes this whole scenario. Activity-level links are the default.' : 'A functional flow can realize this activity. This retains the direct system-function links above.'}</p><button style={button} disabled={!writable} onClick={() => begin('realize-flow', selectedRole === 'scenario' ? 'Realize the whole scenario with a flow' : 'Realize this activity with a flow', { sourceId: selected.id }, flows)}>{selectedRole === 'scenario' ? 'Link flow to whole scenario…' : '+ Functional flow'}</button>
                        <button style={{ ...button, marginLeft: 8 }} onClick={() => { if (onFunctional) { onFunctional(); return; } const functional = useModelStore.getState().guide?.layers.find(layer => layer.workbench === 'functional'); if (functional) useModelStore.getState().setActiveView({ type: 'pathway', layer: functional.name }); }}>Go to Functional</button>
                    </>}
                </>}
            </section>);
    const visibleItems = typed.filter(element => (!filter || element.name.toLowerCase().includes(filter.toLowerCase())) && (presentation === 'overview' || !review || needsReview(element.id)));
    const catalog = presentation === 'hierarchy' ? (<section aria-label="Operational hierarchy" style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h2 style={heading}>Goals and paths</h2><button style={button} disabled={!newWrite} onClick={() => { setSelectedId(undefined); begin('use-case', `Add a ${level} use case`); }}>+ Use case</button></div>
                <input aria-label="Filter operational work" style={input} placeholder="Find a goal, workflow or step…" value={filter} onChange={event => setFilter(event.target.value)} /><label style={{ display: 'block', margin: '10px 0', fontSize: 14 }}><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)} /> Needs a next action</label>
                <div style={{ maxHeight: '64vh', overflow: 'auto' }}><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.roots.map(id => tree(id))}</ul>{!!hierarchy.unlinked.length && <><h3 style={{ marginTop: 16 }}>Unlinked workflows</h3><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.unlinked.map(id => tree(id))}</ul></>}{!!hierarchy.unplaced.length && <><h3 style={{ marginTop: 16 }}>Scenarios needing a workflow</h3><p style={muted}>These existing scenarios have no owning workflow. Their clinical or system level may be unresolved.</p><ul style={{ listStyle: 'none', padding: 0 }}>{hierarchy.unplaced.map(id => tree(id))}</ul></>}</div>
                {!hierarchy.roots.length && !hierarchy.unlinked.length && !hierarchy.unplaced.length && <p style={muted}>Start with a goal. Add its workflow, then nominal and alternate scenario paths.</p>}
            </section>) : <OperationalTable model={model} level={levelLabel} category={category} items={visibleItems} selectedId={selectedId} onSelect={choose} onAdd={addTyped} canWrite={newWrite} filter={filter} setFilter={setFilter} review={review} setReview={setReview} />;
    return <section className="pathway-workspace" data-testid="operational-workbench" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}><div style={{ maxWidth: presentation === 'visual' ? undefined : 1440, margin: 'auto' }}>
        {!pageScenario && (!selected || presentation !== 'overview') && <header className="pathway-header">
            <div><h1>{levelLabel} {presentation === 'overview' ? 'use cases' : typeLabel}</h1><p>{level === 'clinical' ? 'Clinical baseline · independent of the selected product' : root ? root.name : 'Choose a system to add or connect work'}</p></div>
            <button type="button" className="pathway-button pathway-button--primary" disabled={!newWrite} onClick={presentation === 'overview' ? () => {
                backToUseCases(); begin('use-case', `Add a ${level} use case`);
            } : addTyped}>{ControlIcon.plus} Add {presentation === 'overview' || category === 'case' ? 'use case' : category}</button>
        </header>}
        {notice && !pageScenario && <p role="status" style={muted}>{notice}</p>}
        {pageScenario && <ScenarioPage model={model} scenario={pageScenario} selectedId={selectedId} levelName={levelName} writable={writable} diagram={scenarioDiagram} form={actionForm || undefined} notice={notice}
            onSelect={inspectOnPage} onOpenWork={goToWork} onBack={() => { backToUseCases(); setPresentation('overview'); }}
            onNewStep={() => begin('step', 'Add a scenario step', { scenarioId: pageScenario.id })}
            onExistingStep={() => begin('reuse-step', 'Add an existing step', { scenarioId: pageScenario.id }, operationalCatalog(model, 'OperativeAction').filter(candidate => operationalWorkLevel(model, candidate.id) === level && canonicalFunctionId(model, candidate.id) === candidate.id && !functionalFlowSteps(model, pageScenario.id).steps.some(item => item.step.id === candidate.id)))}
            onPerformer={() => begin('performer', 'Choose the performer', { sourceId: selected!.id }, performerCandidates())}
            onLink={level === 'clinical' ? () => linkSystemCounterpart() : linkClinicalWork}
            onLinkFunction={level === 'operational' ? () => begin('perform-function', 'Link a function that realizes this step', { sourceId: selected!.id }, functions) : undefined}
            onOpenFunction={onFunctional ? id => onFunctional(id) : undefined}
            onAllProperties={id => useModelStore.getState().inspectElement(id)}
            onSave={async (element, fields) => { try { await writeOperational({ ...base, operation: 'fields', sourceId: element.id, fields }); return undefined; } catch (error) { return error instanceof Error ? error.message : String(error); } }} />}
        {!pageScenario && !isScenarioPage && <div className="pathway-toolbar">
            <nav className="pathway-segments" aria-label="Operational tasks">{tasks.filter(task => task.primary).map(candidate => <button type="button" key={candidate.id}
                aria-pressed={candidate.id === task?.id} onClick={() => setTaskId(candidate.id)}>{candidate.label}</button>)}</nav>
            {presentation !== 'overview' && <nav className="pathway-segments" aria-label="Operational element types">{([
                ['case', 'Use cases', useCases.length], ['workflow', 'Workflows', workflows.length], ['scenario', 'Scenarios', scenarios.length],
            ] as const).map(([key, label, count]) => <button key={key} type="button" aria-pressed={category === key} onClick={() => changeCategory(key)}>{label} ({count})</button>)}</nav>}
            <details className="pathway-view-picker" open={presentation !== 'overview' ? true : undefined}>
                <summary>{ControlIcon.grid} Views</summary>
                <nav className="pathway-segments" aria-label="Presentation">{([
                    ['overview', 'Overview'], ['visual', 'Visual'], ['table', 'Table'], ['hierarchy', 'Hierarchy'],
                ] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={presentation === mode}
                    onClick={event => {
                        if (mode === 'overview') event.currentTarget.closest('details')?.removeAttribute('open');
                        if (mode === 'visual') showVisual(); else setPresentation(mode);
                    }}>{label}</button>)}</nav>
            </details>
        </div>}
        {!pageScenario && (presentation !== 'visual' ? presentation === 'overview' ? <section aria-label={`${levelLabel} use cases overview`}>
            {selected ? <>
                <nav className="pathway-operational-breadcrumb" aria-label="Operational path">
                    <button type="button" onClick={backToUseCases}>All use cases</button>
                    {overviewCase && <><span aria-hidden="true">›</span><button type="button" aria-current={pageCase ? 'page' : undefined} onClick={() => openOverviewItem(overviewCase.id)}>{overviewCase.name}</button></>}
                    {!pageCase && overviewScenario && <><span aria-hidden="true">›</span><button type="button"
                        onClick={() => openOverviewItem(overviewScenario)}>{model.elements[overviewScenario]?.name}</button></>}
                </nav>
                {pageCase && !action && <UseCaseProfile model={model} useCase={pageCase} levelName={levelName} busy={busy}
                    writable={canAddUnder(pageCase.id)} workflows={overviewMap}
                    onSaveFields={async fields => { try { await writeOperational({ ...base, operation: 'fields', sourceId: pageCase.id, fields }); return undefined; } catch (error) { return error instanceof Error ? error.message : String(error); } }}
                    onAddActor={() => begin('actor', 'Add an actor', { sourceId: pageCase.id }, Object.values(model.elements).filter(element => conforms(element.id, 'OperationalParticipant') && !element.isDefinition
                        && !model.relationships.some(edge => edge.type === 'participatesIn' && edge.sourceId === element.id && edge.targetId === pageCase.id)))}
                    onInclude={() => begin('include', 'Include an existing use case', { sourceId: pageCase.id }, operationalCatalog(model, task!.subjectKind, level === 'operational' ? workspace : null).filter(candidate => candidate.id !== pageCase.id && !wouldIncludeCycle(model, pageCase.id, candidate.id)))}
                    onNewIncluded={() => begin('use-case', 'Add an included use case', { useCaseId: pageCase.id })}
                    onRemove={(relation, id) => void (async () => {
                        const item = model.elements[id]?.name ?? id;
                        if (!await confirmDialog({ title: relation === 'participatesIn' ? `Remove ${item} as an actor?` : `Stop including ${item}?`, message: `The line is removed from ${pageCase.name}. ${item} itself is kept.`, confirmLabel: 'Remove', danger: true })) return;
                        await save(() => writeOperational({ ...base, operation: 'unlink', sourceId: pageCase.id, targetId: id, relation }));
                    })()}
                    onOpenCase={id => openOverviewItem(id)}
                    onLinkOther={() => level === 'clinical' ? linkSystemCounterpart(pageCase.id, systemTask?.subjectKind)
                        : begin('refine', 'Link the clinical use case it realizes', { sourceId: pageCase.id }, operationalCatalog(model, clinicalTask?.subjectKind ?? 'UseCase').filter(element => operationalWorkLevel(model, element.id) === 'clinical' && canonicalFunctionId(model, element.id) === element.id))}
                    onOpenWork={goToWork}
                    onDiagram={() => { choose(pageCase.id); setPresentation('visual'); }}
                    onProperties={() => useModelStore.getState().inspectElement(pageCase.id)}
                    onContext={onContext} />}
                {showOverviewDetails && detail}
            </> : action ? detail : <>
                <div className="pathway-operational-stats" aria-label="Operational work totals">
                    {[[ControlIcon.goal, useCases.length, 'Use cases'], [ControlIcon.workflow, workflows.length, 'Workflows'], [ControlIcon.scenario, scenarios.length, 'Scenarios']].map(([icon, count, label]) =>
                        <div key={String(label)}><span className="pathway-icon" aria-hidden="true">{icon}</span><span><strong>{count}</strong><small>{label}</small></span></div>)}
                </div>
                {level === 'operational' && <div style={{ margin: '0 0 12px' }}>
                    <button type="button" className="pathway-button" aria-expanded={coverageOpen} onClick={() => setCoverageOpen(open => !open)}>
                        {coverageOpen ? 'Hide functional coverage' : 'Review functional coverage'}</button>
                    {coverageOpen && <LinkCoverageTable label="System activity function coverage" rows={functionCoverage}
                        empty={functionCoverage.length ? 'Every listed activity performs a system function or is realized by a flow.' : 'No operational activities in this scope yet.'}
                        onSelect={id => { setCoverageOpen(false); choose(id); }} />}
                </div>}
                <section className="pathway-operational-panel" aria-label="Use case catalog">
                    <div className="pathway-gallery-heading pathway-operational-panel-head">
                        <h2>Choose a goal</h2>
                        {caseLayout !== 'diagram' && <input aria-label="Find a use case" type="search" placeholder="Find a use case…" value={caseFilter} onChange={event => setCaseFilter(event.target.value)} />}
                        {caseLayout !== 'diagram' && <SegmentedControl ariaLabel="Show use cases" value={caseShow} onChange={setCaseShow} options={[
                            { id: 'all', label: 'All', icon: ControlIcon.list },
                            { id: 'with', label: 'With workflows', icon: ControlIcon.workflow, title: 'Only use cases that have a workflow, or include one that does' },
                        ]} />}
                        <div className="pathway-context-view-switch" aria-label="Use case layout">
                            <button type="button" aria-pressed={caseLayout === 'list'} onClick={() => setCaseLayout('list')}>List</button>
                            <button type="button" aria-pressed={caseLayout === 'grid'} onClick={() => setCaseLayout('grid')}>Grid</button>
                            <button type="button" aria-pressed={caseLayout === 'diagram'} onClick={() => setCaseLayout('diagram')}>Use case diagram</button>
                        </div>
                    </div>
                    {caseLayout !== 'diagram' && parentRows.length > 0 && !searchingCases && <div className="pathway-case-tree-controls">
                        <label>Show through level
                            <select className="pathway-button" value={caseDepthPreset} onChange={event => showThroughLevel(event.target.value)}>
                                <option value="all">All levels</option>
                                {Array.from({ length: maximumLevel }, (_, index) => index + 1).map(level =>
                                    <option key={level} value={level}>Level {level}{level === 1 ? ' · top level' : ''}</option>)}
                                {caseDepthPreset === 'custom' && <option value="custom" disabled>Custom</option>}
                            </select>
                        </label>
                        <button type="button" className="pathway-button" onClick={() => showThroughLevel('all')}>Expand all</button>
                        <button type="button" className="pathway-button" onClick={() => showThroughLevel('1')}>Collapse all</button>
                    </div>}
                    {caseLayout === 'diagram' ? <section aria-label="Use case diagram" className="pathway-operational-scope-diagram">
                        <header className="pathway-operational-panel-head"><h3>{scopeDiagramName}</h3>
                            {existingScopeDiagram ? <Link className="pathway-button" to={diagramUrl('ucd', existingScopeDiagram.shortId ?? existingScopeDiagram.id)}>Open saved diagram</Link>
                                : newWrite && scopeViewpoint && scopedCases.length > 0 && <button type="button" className="pathway-button" onClick={saveScopeDiagram}>Save use case diagram</button>}
                        </header>
                        {scopedCases.length > 0 ? <div className="pathway-operative-canvas">
                            <Suspense fallback={<p role="status">Opening use case diagram…</p>}>
                                <DiagramEmbedContext.Provider value={{
                                    diagramId: `use-case-catalog:${level}:${workspace ?? ''}`, readOnly: true,
                                    previewDiagram: {
                                        id: `use-case-catalog:${level}:${workspace ?? ''}`, name: scopeDiagramName,
                                        diagramType: 'ucd', viewKind: 'general', viewpointId: '__model', auto: true,
                                        properties: { autoPopulate: 'false', layoutHint: 'use-case:catalog' }, elementIds: scopedCases,
                                    },
                                    onExplore: item => {
                                        if (item.type === 'element' && scopedCases.includes(item.id) && role(item.id) === 'case' && hierarchy.visible.has(item.id)) openOverviewItem(item.id);
                                    },
                                }}><DiagramCanvas key={`${level}:${workspace ?? ''}`} /></DiagramEmbedContext.Provider>
                            </Suspense>
                        </div> : <p className="pathway-operational-empty">Add a use case to populate this diagram.</p>}
                    </section> : caseLayout === 'list' ? <div className="pathway-operational-table"><table>
                        <thead><tr><th>Use case</th><th>Level</th><th>Purpose</th><th>Actors</th><th>Workflows</th><th aria-label="Open the use case" /></tr></thead>
                        <tbody>{caseRows.map(({ item, count, key, depth, parent, inScope, childCount }) => <tr key={key} className={parent ? 'pathway-case-child-row' : undefined}>
                            <th scope="row"><div className="pathway-case-branch-item" style={{ '--case-indent': `${Math.min(depth, 6) * 16}px` } as CSSProperties}>
                                <div className="pathway-case-row-main">
                                    {caseBranchToggle(key, item.name, childCount)}
                                    <button type="button" className="pathway-operational-case-link" onClick={() => openOverviewItem(item.id)}>
                                        {!parent && <span className="pathway-icon" aria-hidden="true">{ControlIcon.goal}</span>}{item.name}
                                    </button>
                                </div>
                                {parent && <small>Included by {parent.name}{!inScope ? ' · Linked case' : ''}</small>}
                            </div></th>
                            <td><span className="pathway-case-level">Level {depth + 1}</span></td>
                            <td>{item.attributes.goalStatement || item.doc || '—'}</td>
                            <td><div className="pathway-operational-actors">{[...new Set(caseActors(item.id))].map(name => <span key={name} className="pathway-operational-pill">{name}</span>)}</div>{!caseActors(item.id).length && '—'}</td>
                            <td><CountBadge icon={ControlIcon.workflow} count={count} one="workflow" many="workflows" /></td>
                            <td><button type="button" className="pathway-button" aria-label={`Open ${item.name}`} onClick={() => openOverviewItem(item.id)}>Open →</button></td>
                        </tr>)}</tbody>
                    </table></div> : <div className="pathway-operational-grid">{visibleBranches.map(rows =>
                        <article className="pathway-case-branch-card" key={rows[0].key} aria-label={`${rows[0].item.name} use case group`}>
                            {rows.map(({ item, count, key, depth, parent, inScope, childCount }) =>
                                <div key={key} className="pathway-case-branch-item pathway-case-tile-row"
                                    style={{ '--case-indent': `${Math.min(depth, 5) * 12}px` } as CSSProperties}>
                                    <button className="pathway-icon-tile" type="button" onClick={() => openOverviewItem(item.id)}>
                                    <span className="pathway-case-tile-title">{!parent && <span className="pathway-icon" aria-hidden="true">{ControlIcon.goal}</span>}
                                        <strong>{item.name}</strong><span className="pathway-case-level">Level {depth + 1}</span></span>
                                    {parent && <small>Included by {parent.name}{!inScope ? ' · Linked case' : ''}</small>}
                                    {!parent && item.attributes.goalStatement && item.attributes.goalStatement !== item.name && <span>{item.attributes.goalStatement}</span>}
                                    <small><CountBadge icon={ControlIcon.workflow} count={count} one="workflow" many="workflows" /> <span aria-hidden="true">→</span></small>
                                    </button>
                                    {caseBranchToggle(key, item.name, childCount)}
                                </div>)}
                        </article>)}</div>}
                    {caseLayout !== 'diagram' && !caseRows.length && <p className="pathway-operational-empty">{caseFilter ? 'No matching use cases.' : caseShow === 'with' && useCases.length ? 'No use case has a workflow yet.' : 'No use cases yet.'}</p>}
                </section>
            </>}
        </section> : <div className="pathway-columns">{catalog}{detail}</div>
            : <><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}><label>{category === 'case' ? 'Use case' : category === 'scenario' ? 'Scenario' : 'Workflow'} <select aria-label="Visual subject" style={button} value={visualSubject?.id ?? ''} onChange={event => { choose(event.target.value); setDiagramId(undefined); }}><option value="">{typed.length ? `Choose a ${category === 'case' ? 'use case' : category}…` : `No ${typeLabel}`}</option>{typed.map(element => <option key={element.id} value={element.id}>{element.name}</option>)}</select></label><button className="pathway-button" onClick={() => setPresentation('overview')}>‹ Back to operational work</button></div>
                {action && <div style={{ marginBottom: 16 }}>{detail}</div>}
                <div className={selected && category !== 'workflow' && !action ? 'pathway-columns pathway-columns--canvas' : undefined}>
                {!visualSubject ? <p style={muted}>Create or select a {category === 'case' ? 'use case' : category} to see its visual presentation.</p> : category === 'workflow' ? <WorkflowStructure model={model} workflow={visualSubject} onScenario={id => { choose(id); setPresentation('visual'); }} onAdd={() => begin('scenario', 'Add a scenario to this workflow', { workflowId: visualSubject.id })} writable={newWrite && visualSubject.provenance?.declaration.writable !== false} />
                    : diagramId ? <section aria-label={category === 'case' ? 'Use case diagram' : 'Scenario diagram'} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 365px)', minHeight: 550 }}><Suspense fallback={<p>Opening diagram…</p>}><PaletteKindsContext.Provider value={category === 'case' ? [task!.subjectKind, 'User', 'MemoActor', 'OperationalEntity'] : useModelStore.getState().guide ? kindsOfLayer(useModelStore.getState().guide!, row) : []}><DiagramDisplayScope.Provider value={category === 'case' || level === 'clinical' ? null : workspace}><DiagramUseCaseSubject.Provider value={category === 'case' ? visualSubject.id : null}><DiagramActionSubject.Provider value={category === 'scenario' ? visualSubject.id : null}><DiagramEditor key={diagramId} diagramId={diagramId} /></DiagramActionSubject.Provider></DiagramUseCaseSubject.Provider></DiagramDisplayScope.Provider></PaletteKindsContext.Provider></Suspense></section>
                    : <section aria-label={category === 'case' ? 'Use case preview' : 'Scenario diagram setup'} className="pathway-context-preview">
                        {category === 'case' && <CasePreview model={model} goal={visualSubject} />}
                        <div className="pathway-header" style={{ marginTop: 12 }}>
                            <p>{busy ? 'Opening diagram…' : category === 'case' ? 'Preview from the model' : 'This scenario has no saved diagram.'}</p>
                            {!busy && canWrite && <button type="button" className="pathway-button" onClick={() => openDiagram(visualSubject, true)}>Create diagram</button>}
                        </div>
                    </section>}
                {selected && category !== 'workflow' && !action && detail}
                </div>
            </>)}

    </div></section>;
}
function CasePreview({ model, goal }: { model: MemoModelDTO; goal: Element }) {
    const subject = model.relationships.find(edge => edge.type === 'hasSubject' && edge.sourceId === goal.id)?.targetId;
    const actorIds = new Set(model.relationships.flatMap(edge => {
        if (edge.type !== 'participatesIn') return [];
        if (edge.targetId === goal.id) return [edge.sourceId];
        if (edge.sourceId === goal.id) return [edge.targetId];
        return [];
    }));
    const actors = [...actorIds].flatMap(id => model.elements[id] ? [model.elements[id]] : []);
    const includes = includedUseCases(model, goal.id);
    return <div className="pathway-case-preview">
        {actors.length > 0 && <div><h3>Participants</h3><ul>{actors.map(actor => <li key={actor.id}>{actor.name}</li>)}</ul></div>}
        <div className="pathway-context-subject">
            <small>{subject && model.elements[subject] ? model.elements[subject].name : 'Use case'}</small>
            <h3>{goal.name}</h3>
            {includes.length > 0 && <div><small>Includes</small><ul>{includes.map(item => <li key={item.id}>{item.name}</li>)}</ul></div>}
        </div>
    </div>;
}

function fieldLabel(key: string) { const labels: Record<string, string> = { preCondition: 'Precondition', postCondition: 'Postcondition', goalStatement: 'What are you trying to accomplish?', successOutcome: 'Observable result', taskGoal: 'Step purpose' }; return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase()); }
function OperationalForm({ action, model, level, levelTask, workspace, disabled, onCancel, onContext, onSave }: { action: Action; model: MemoModelDTO; level: OperationalWorkLevel; levelTask?: { subjectKind?: string; workflowKind?: string }; workspace: string | null; disabled: boolean; onCancel: () => void; onContext: () => void; onSave: (context: Partial<OperationalWriteContext>, name: string) => void }) {
    const [name, setName] = useState(''); const [choice, setChoice] = useState(''); const [kind, setKind] = useState<'nominal' | 'alternate'>('nominal'); const [fields, setFields] = useState<Record<string, string>>({});
    const [subject, setSubject] = useState(level === 'operational' ? workspace ?? '' : '');
    const [parentId, setParentId] = useState('');
    const [destination, setDestination] = useState('');
    const choosingDestination = action.operation === 'use-case' && !action.context.useCaseId;
    const subjectElement = model.elements[subject];
    const localWork = choosingDestination ? operationalCatalog(model, 'UseCase', level === 'operational' ? workspace : null)
        .filter(element => operationalWorkLevel(model, element.id) === level) : [];
    const realizedCases = choosingDestination ? new Set(model.relationships.filter(edge => edge.type === 'realizesUseCase').map(edge => edge.targetId)) : undefined;
    const rootedWork = localWork.filter(element => realizedCases?.has(element.id));
    const destinations = new Map<string, Element>();
    if (choosingDestination) {
        for (const element of [...rootedWork, ...localWork, subjectElement, ...Object.values(model.elements)]) {
            if (!element?.package || !element.file || element.provenance?.declaration.writable !== true) continue;
            // The writer uses the subject package when the declaration shares its file.
            if (element.file === subjectElement?.file && element.package !== subjectElement.package) continue;
            const key = JSON.stringify([element.file, element.package]);
            if (!destinations.has(key)) destinations.set(key, element);
        }
    }
    const preferredDestination = destinations.has(destination) ? destination : destinations.keys().next().value;
    const destinationId = preferredDestination ? destinations.get(preferredDestination)?.id : undefined;
    const parentKind = (action.operation === 'workflow' ? levelTask?.subjectKind : levelTask?.workflowKind) ?? (action.operation === 'workflow' ? 'UseCase' : 'Workflow');
    const needsParent = action.operation === 'workflow' && !action.context.useCaseId || action.operation === 'scenario' && !action.context.workflowId;
    const parents = needsParent ? operationalCatalog(model, parentKind, level === 'operational' ? workspace : null) : [];
    const create = ['context', 'use-case', 'workflow', 'scenario', 'step'].includes(action.operation);
    const subjects = level === 'clinical' ? operationalCatalog(model, 'OperationalEntity') : (model.workspaceMembership?.workspaces ?? []).flatMap(scope => model.elements[scope.root] ? [model.elements[scope.root]] : []);
    const keys = action.operation === 'use-case' ? ['goalStatement', 'successOutcome'] : action.operation === 'workflow' ? [] : action.operation === 'scenario' ? ['preCondition', 'postCondition'] : action.operation === 'step' ? ['taskGoal'] : action.operation === 'context' ? ['responsibility'] : [];
    const context: Partial<OperationalWriteContext> = create ? { fields, ...(needsParent ? action.operation === 'workflow' ? { useCaseId: parentId } : { workflowId: parentId } : {}), ...(action.operation === 'use-case' ? { subjectId: subject, ...(destinationId ? { homeId: destinationId } : {}) } : {}), ...(action.operation === 'scenario' ? { scenarioKind: kind } : {}) } : action.operation === 'link-workflow' ? { useCaseId: choice } : action.operation === 'performer' ? { performerId: choice }
        : action.counterpartWorkspace ? (choice ? { sourceId: choice, level: 'operational', workspace: action.counterpartWorkspace[choice] ?? null } : {}) : { targetId: choice };
    const request = { level, workspace, ...action.context, ...context, operation: action.operation };
    const home = operationalHome(model, request);
    const performer = request.performerId ? model.elements[request.performerId] : undefined;
    const additionalSource = performer && performer.file !== home?.file ? performer.file : undefined;
    const submit = (event: FormEvent) => { event.preventDefault(); onSave(context, name); };
    return <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}><h2 style={heading}>{action.title}</h2>
        {create && <label>{action.operation === 'use-case' ? 'Goal name' : 'Name'}<input autoFocus required style={input} value={name} onChange={event => setName(event.target.value)} /></label>}
        {action.operation === 'use-case' && keys.map(key => <label key={key}>{fieldLabel(key)}<textarea style={input} rows={2} value={fields[key] ?? ''} onChange={event => setFields({ ...fields, [key]: event.target.value })} /></label>)}
        {action.operation === 'use-case' && <><label>{level === 'clinical' ? 'Clinical subject' : 'Supported system'}<select aria-label={level === 'clinical' ? 'Clinical subject' : 'Supported system'} required style={input} value={subject} disabled={level === 'operational' && !action.context.useCaseId} onChange={event => setSubject(event.target.value)}><option value="">Choose a subject…</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>{level === 'clinical' && <><p style={muted}>Choose the care team or operational setting, independently of any product.</p><button type="button" style={button} onClick={onContext}>+ Clinical subject</button></>}</>}
        {choosingDestination && destinations.size > 1 && <label>Save in <select aria-label="Save in" style={input} value={preferredDestination}
            onChange={event => setDestination(event.target.value)}>{[...destinations].map(([key, element]) =>
                <option key={key} value={key}>{element.package} · {element.file}</option>)}</select></label>}
        {needsParent && <label>{action.operation === 'workflow' ? 'Use case' : 'Workflow'}<select aria-label="Parent work" required style={input} value={parentId} onChange={event => setParentId(event.target.value)}><option value="">Choose a {action.operation === 'workflow' ? 'use case' : 'workflow'}…</option>{parents.map(parent => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select>{!parents.length && <p style={muted}>Add a {action.operation === 'workflow' ? 'use case' : 'workflow'} first, then return here.</p>}</label>}
        {action.operation === 'scenario' && <label>Path<select aria-label="Scenario path" style={input} value={kind} onChange={event => setKind(event.target.value as 'nominal' | 'alternate')}><option value="nominal">Nominal</option><option value="alternate">Alternate / recovery</option></select></label>}
        {action.operation !== 'use-case' && keys.map(key => <label key={key}>{fieldLabel(key)}<textarea style={input} rows={2} value={fields[key] ?? ''} onChange={event => setFields({ ...fields, [key]: event.target.value })} /></label>)}
        {!create && <><label>{action.operation === 'performer' ? 'Performer' : action.operation === 'realize-flow' ? 'Functional flow' : action.operation === 'perform-function' ? 'System function' : action.operation === 'refine' ? action.counterpartWorkspace ? 'Operational work' : 'Clinical work' : action.operation === 'link-workflow' || action.operation === 'include' ? 'Use case' : action.operation === 'actor' ? 'Actor' : 'Existing work'}<select aria-label="Connect existing work" required style={input} value={choice} onChange={event => setChoice(event.target.value)}><option value="">Choose existing work…</option>{action.options?.map(element => <option key={element.id} value={element.id}>{element.name}{model.elements[element.owner ?? element.parentAction ?? ''] ? ` · ${model.elements[element.owner ?? element.parentAction ?? ''].name}` : ''}</option>)}</select></label>{!action.options?.length && <p style={muted}>No matching work exists yet. Add it in its own task, then connect it here.</p>}</>}
        {action.operation === 'realize-flow' && <p style={muted}>The flow realizes the selected operational work. Its functions remain canonical system functions; existing activity-to-function links are retained.</p>}
        {home && (!action.counterpartWorkspace || choice) && <p style={muted}>Primary save location <code>{home.file}</code> · {home.package}{additionalSource && <> and <code>{additionalSource}</code></>}</p>}
        <div style={{ display: 'flex', gap: 8 }}><button style={button} disabled={disabled || !home || needsParent && !parentId || (create ? !name.trim() || action.operation === 'use-case' && !subject : !choice)}>{create ? 'Create' : 'Connect'}</button><button type="button" style={button} onClick={onCancel}>Cancel</button></div>
    </form>;
}
function scenarioPath(element: Element) {
    const kind = element.attributes.scenarioKind?.split('::').at(-1);
    return kind === 'alternate' ? 'Alternate' : kind === 'nominal' ? 'Nominal' : 'Scenario';
}

function ScenarioSequence({ model, id, writable, flowFirst, details, onAdd, onSelect, onDiagram, onSave }: {
    model: MemoModelDTO; id: string; writable: boolean; flowFirst: boolean; details?: ReactNode; onAdd: () => void; onSelect: (id: string) => void;
    onDiagram: () => void; onSave: (ids: string[]) => void;
}) {
    const current = functionalFlowSteps(model, id);
    const [steps, setSteps] = useState(current.steps.map(item => item.step.id));
    const [tab, setTab] = useState<'overview' | 'steps' | 'flow'>(flowFirst ? 'flow' : 'overview');
    const tabs = flowFirst
        ? [['flow', 'Operational flow'], ['steps', `Steps (${steps.length})`], ['overview', 'Scenario details']] as const
        : [['overview', 'Overview'], ['steps', `Steps (${steps.length})`], ['flow', 'Operational flow']] as const;
    const diagram = useMemo(() => ({
        id: `operational-preview:${id}`, name: model.elements[id]?.name ?? 'Operational flow',
        diagramType: 'ofd', viewKind: 'actionflow', viewpointId: '__model', auto: true,
        elementIds: actionMembers(model, id),
    }), [model, id]);
    const authored = current.steps.map(item => item.step.id);
    const changed = steps.length !== authored.length || steps.some((step, index) => step !== authored[index]);
    const names = (stepId: string) => [...new Set(model.relationships.flatMap(edge => {
        if (edge.type !== 'performs' || edge.targetId !== stepId || !model.elements[edge.sourceId]) return [];
        return [model.elements[edge.sourceId].name];
    }))].join(', ');
    const move = (index: number, delta: number) => {
        const next = [...steps];
        [next[index], next[index + delta]] = [next[index + delta], next[index]];
        setSteps(next);
    };
    return <>
        <nav className="pathway-operational-tabs" aria-label="Scenario view">
            {tabs.map(([key, label]) =>
                <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}
        </nav>
        {flowFirst && tab === 'overview' && <section aria-label="Scenario details">{details}</section>}
        <div className={`pathway-scenario-studio${tab === 'overview' && !flowFirst ? '' : ' pathway-scenario-studio--single'}${flowFirst ? ' pathway-scenario-studio--flow-first' : ''}`}>
        {(tab === 'steps' || tab === 'overview' && !flowFirst) && <section className="pathway-operational-panel" aria-label="Scenario steps">
            <header className="pathway-operational-panel-head"><h3>Scenario steps ({steps.length})</h3>
                <button type="button" className="pathway-button" disabled={!writable} onClick={onAdd}>Add step</button>
            </header>
            {steps.length > 0 ? <div className="pathway-operational-table"><table><thead><tr><th>#</th><th>Responsibility</th><th>Action</th><th aria-label="Reorder or remove" /></tr></thead>
                <tbody>{steps.map((stepId, index) => <tr key={stepId}>
                    <td>{index + 1}</td><td>{names(stepId) || model.elements[model.elements[stepId]?.allocatedTo ?? '']?.name || '—'}</td>
                    <td><button type="button" className="pathway-operational-case-link" onClick={() => onSelect(stepId)}>{model.elements[stepId]?.name}</button>
                        {canonicalFunctionId(model, stepId) !== stepId && <small style={muted}>Reuses {model.elements[canonicalFunctionId(model, stepId)]?.name}</small>}</td>
                    <td>{!current.branching && writable && <div className="pathway-step-controls">
                        <button type="button" className="pathway-button" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                        <button type="button" className="pathway-button" aria-label={`Move step ${index + 1} down`} disabled={index === steps.length - 1} onClick={() => move(index, 1)}>↓</button>
                        <button type="button" className="pathway-button" aria-label={`Remove step ${index + 1}`} onClick={() => setSteps(steps.filter(id => id !== stepId))}>Remove</button>
                    </div>}</td>
                </tr>)}</tbody></table></div> : <p className="pathway-operational-empty">Add the first step of this path.</p>}
            {changed && writable && <div className="pathway-operational-panel-head"><button className="pathway-button pathway-button--primary" onClick={() => onSave(steps)}>Save sequence</button><button className="pathway-button" onClick={() => setSteps(authored)}>Reset</button></div>}
        </section>}
        {(tab === 'flow' || tab === 'overview' && !flowFirst) && <section className="pathway-operational-panel" aria-label="Operational flow">
            <header className="pathway-operational-panel-head"><h3>Operational flow</h3><div className="pathway-scenario-actions">
                {flowFirst && writable && <button type="button" className="pathway-button pathway-button--primary" onClick={onAdd}>Add step</button>}
                <button type="button" className="pathway-button" onClick={onDiagram}>Open scenario diagram</button>
            </div></header>
            {changed && <p className="pathway-operational-empty">Save the sequence to update the diagram.</p>}
            {authored.length ? <div className="pathway-operative-canvas">
                <Suspense fallback={<p role="status">Opening operational flow…</p>}>
                    <DiagramEmbedContext.Provider value={{ diagramId: diagram.id, previewDiagram: diagram, readOnly: true,
                        onExplore: item => { if (item.type === 'element' && authored.includes(item.id)) onSelect(item.id); } }}>
                        <DiagramActionSubject.Provider value={id}>
                            <DiagramCanvas />
                        </DiagramActionSubject.Provider>
                    </DiagramEmbedContext.Provider>
                </Suspense>
            </div> : <p className="pathway-operational-empty">The flow appears here as you add steps.</p>}
        </section>}
        </div>
    </>;
}

function OperationalTable({ model, level, category, items, selectedId, onSelect, onAdd, canWrite, filter, setFilter, review, setReview }: { model: MemoModelDTO; level: string; category: Category; items: Element[]; selectedId?: string; onSelect: (id: string) => void; onAdd: () => void; canWrite: boolean; filter: string; setFilter: (value: string) => void; review: boolean; setReview: (value: boolean) => void }) {
    const names = (ids: string[]) => ids.map(id => model.elements[id]?.name ?? id).join(', ') || '—';
    const title = category === 'case' ? 'use case' : category;
    const columns = category === 'case' ? ['Goal', 'Subject', 'Workflows'] : category === 'workflow' ? ['Use case', 'Scenarios', 'Nominal scenario'] : ['Workflow', 'Path', 'Steps'];
    const cell = (element: Element) => category === 'case' ? [element.attributes.goalStatement || '—', names(model.relationships.filter(edge => edge.type === 'hasSubject' && edge.sourceId === element.id).map(edge => edge.targetId)), String(model.relationships.filter(edge => edge.type === 'realizesUseCase' && edge.targetId === element.id).length)]
        : category === 'workflow' ? [names(workflowCases(model, element.id)), String(operationalChildren(model, element.id).filter(child => operationalConforms(model, child.id, 'OperativeScenario')).length), operationalChildren(model, element.id).find(child => operationalConforms(model, child.id, 'OperativeScenario') && !/alternate$/.test(child.attributes.scenarioKind ?? ''))?.name ?? '—']
        : [names([element.owner ?? element.parentAction ?? ''].filter(Boolean)), (element.attributes.scenarioKind ?? 'nominal').split('::').at(-1) ?? 'nominal', String(functionalFlowSteps(model, element.id).steps.length)];
    return <section aria-label={`${level} ${title} table`} style={{ ...card, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h3 style={heading}>{level} {category === 'case' ? 'use cases' : category === 'workflow' ? 'workflows' : 'scenarios'}</h3><button style={button} disabled={!canWrite} onClick={onAdd}>+ {level} {title}</button></div>
        <input aria-label="Filter operational work" placeholder={`Find a ${title}…`} style={input} value={filter} onChange={event => setFilter(event.target.value)} /><label style={{ display: 'block', margin: '10px 0' }}><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)} /> Needs a next action</label>
        <div style={{ overflow: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}><thead><tr>{['Name', ...columns].map(column => <th key={column} style={{ padding: 9, textAlign: 'left', borderBottom: `1px solid ${COLOR.border}` }}>{column}</th>)}</tr></thead><tbody>{items.map(element => <tr key={element.id} style={{ background: selectedId === element.id ? '#e8f8f3' : 'white' }}><td style={{ padding: 9, borderBottom: `1px solid ${COLOR.border}` }}><button style={{ ...button, textAlign: 'left' }} onClick={() => onSelect(element.id)}>{element.name}</button></td>{cell(element).map((value, index) => <td key={index} style={{ padding: 9, borderBottom: `1px solid ${COLOR.border}`, color: COLOR.muted }}>{value}</td>)}</tr>)}</tbody></table></div>
        {!items.length && <p style={muted}>No matching {level.toLowerCase()} {category === 'case' ? 'use cases' : `${category}s`}. Add a {title} or change the filter.</p>}
    </section>;
}

/** A workflow is work analysis owning alternative paths, not a sequence of all its scenarios. */
function WorkflowStructure({ model, workflow, onScenario, onAdd, writable }: { model: MemoModelDTO; workflow: Element; onScenario: (id: string) => void; onAdd: () => void; writable: boolean }) {
    const scenarios = operationalChildren(model, workflow.id).filter(element => operationalConforms(model, element.id, 'OperativeScenario'));
    return <section aria-label="Workflow structure" style={{ ...card, minHeight: 380 }}><h3 style={heading}>Workflow structure</h3><p style={muted}>Each scenario is an alternative path through this body of work. Open a scenario to see its steps.</p>
        <figure style={{ margin: '24px 0' }}><div style={{ ...card, maxWidth: 380, margin: 'auto', background: '#e8f8f3', textAlign: 'center' }}><strong>{workflow.name}</strong><p style={muted}>Workflow · realizes {workflowCases(model, workflow.id).map(id => model.elements[id]?.name ?? id).join(', ') || 'no linked use case'}</p></div>
            {!!scenarios.length && <><div aria-hidden="true" style={{ height: 28, borderLeft: `2px solid ${COLOR.border}`, width: 1, margin: 'auto' }} /><p style={{ ...muted, textAlign: 'center' }}>Owns scenario paths</p><div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', borderTop: `2px solid ${COLOR.border}`, paddingTop: 20 }}>{scenarios.map(scenario => <button key={scenario.id} style={{ ...card, ...button, width: 270, textAlign: 'left', borderTop: '4px solid #0f766e', padding: 18 }} onClick={() => onScenario(scenario.id)}><small style={muted}>{(scenario.attributes.scenarioKind ?? 'nominal').split('::').at(-1)} scenario</small><strong style={{ display: 'block', margin: '8px 0' }}>{scenario.name}</strong><span style={muted}>{functionalFlowSteps(model, scenario.id).steps.length} steps · Open scenario →</span></button>)}</div></>}
        </figure><div style={{ textAlign: 'center' }}>{!scenarios.length && <p style={muted}>This workflow has no scenarios yet.</p>}<button style={button} disabled={!writable} onClick={onAdd}>+ Scenario</button></div>
    </section>;
}

/** A child count with the child kind's icon; none is shown muted so the rows that have children stand out. */
function CountBadge({ icon, count, one, many }: { icon: ReactNode; count: number; one: string; many: string }) {
    return <span className={`pathway-count-badge${count ? '' : ' pathway-count-badge--none'}`} aria-label={`${count} ${count === 1 ? one : many}`}>
        <span aria-hidden="true">{icon}</span><span aria-hidden="true">{count}</span>
    </span>;
}

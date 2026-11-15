import { actionMembers, functionMembers } from '../lib/operational-presentation';
import { lazy, Suspense, useEffect, useMemo, useState, useRef, type CSSProperties, type FormEvent } from 'react';
import { canonicalFunctionId, functionalCatalog, functionalFlowSteps, functionalStructure, realizingFunctions, indexKinds, kindConformsTo, type MemoModelDTO, type FunctionalStepInput } from '@memoarchitect/tools/browser';
import type { GuideLayer } from '../lib/pathways';
import { kindsOfLayer, diagramTypeFor } from '../lib/pathways';
import { useModelStore } from '../store/model-store';
import { writeFunctionalWork } from '../lib/functional-authoring';
import { DiagramActionSubject, DiagramDisplayScope } from '../diagram/display-scope';
import { PaletteKindsContext } from './DiagramPalette';
import { COLOR } from '../styles/tokens';
const DiagramEditor = lazy(() => import('./DiagramEditor').then(module => ({ default: module.DiagramEditor })));
const button: CSSProperties = { padding: '8px 12px', background: 'white', border: `1px solid ${COLOR.border}`, borderRadius: 6, color: COLOR.primary, font: 'inherit', cursor: 'pointer' };
const input: CSSProperties = { ...button, cursor: 'text', width: '100%', boxSizing: 'border-box' };
const card: CSSProperties = { background: 'white', border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: 20 };

/** Task choices and semantic roles come from the active method, not a layer-name switch. */
export function FunctionalWorkbench({ model, row, workspace, canWrite }: { model: MemoModelDTO; row: GuideLayer; workspace: string | null; canWrite: boolean }) {
    const tasks = row.tasks ?? [];
    const treeTask = tasks.find(task => task.kind === 'decomposition');
    const flowTask = tasks.find(task => task.kind === 'sequence');
    const realizationTask = tasks.find(task => task.kind === 'realization');
    const [openingFlow] = useState(() => { const id = useModelStore.getState().selectedElementId; return id && functionalCatalog(model, workspace, 'FunctionalFlow').some(flow => flow.id === id) ? id : undefined; });
    const openingFlowRef = useRef(openingFlow);
    const [taskId, setTaskId] = useState(openingFlow ? flowTask?.id : treeTask?.id ?? tasks[0]?.id);
    const task = tasks.find(task => task.id === taskId) ?? treeTask;
    const contextRef = useRef('');
    const [presentation, setPresentation] = useState<'details' | 'visual'>('details');
    const openingVisual = useRef<string>();
    const [selectedId, setSelectedId] = useState<string | undefined>(openingFlow);
    contextRef.current = `${workspace ?? ''}:${task?.id ?? ''}:${presentation}:${selectedId ?? ''}`;
    const [filter, setFilter] = useState('');
    const [review, setReview] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [diagramId, setDiagramId] = useState<string>();
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const structure = useMemo(() => workspace ? functionalStructure(model, workspace) : undefined, [model, workspace]);
    const functions = useMemo(() => functionalCatalog(model, workspace, treeTask?.subjectKind), [model, workspace, treeTask?.subjectKind]);
    const flows = useMemo(() => functionalCatalog(model, workspace, flowTask?.subjectKind ?? 'FunctionalFlow'), [model, workspace, flowTask?.subjectKind]);
    const componentFunctions = useMemo(() => functionalCatalog(model, workspace, realizationTask?.implementationKind ?? 'ComponentFunction'), [model, workspace, realizationTask?.implementationKind]);
    const registry = useMemo(() => indexKinds(model.registries?.kinds ?? []), [model.registries]);
    const components = Object.values(model.elements).filter(element => !element.isDefinition && kindConformsTo(element.kind, realizationTask?.allocationKind ?? 'LogicalComponent', registry)
        && (!workspace || model.workspaceMembership?.membership[element.id]?.includes(workspace)));
    const gaps = (id: string) => { const implementations = realizingFunctions(model, id, realizationTask?.implementationKind); return !implementations.length || implementations.some(item => !item.components.length); };
    const flowMode = task?.kind === 'sequence';
    const items = flowMode ? flows : functions;
    const selected = items.find(item => item.id === selectedId);
    const visible = items.filter(element => element.name.toLowerCase().includes(filter.toLowerCase()) && (!review || flowMode || gaps(element.id)));
    useEffect(() => { setSelectedId(openingFlowRef.current); openingFlowRef.current = undefined; setDiagramId(undefined); setAdding(false); setNotice(''); setFilter(''); }, [workspace]);
    useEffect(() => { if (diagramId && presentation === 'visual') selectDiagram(diagramId); }, [diagramId, selectDiagram, presentation]);
    useEffect(() => { if (!diagramId || presentation !== 'visual') useModelStore.getState().inspectElement(null); }, [diagramId, workspace, taskId, selectedId, presentation]);
    const save = async (work: () => Promise<string | undefined>, after?: (id?: string) => void) => {
        if (busy || !canWrite) return;
        const started = contextRef.current;
        setBusy(true); setNotice('');
        try { const id = await work(); if (contextRef.current === started) { after?.(id); setNotice('Saved to the model.'); } }
        catch (error) { if (contextRef.current === started) setNotice(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };
    const changeTask = (id: string) => { setTaskId(id); setSelectedId(undefined); setAdding(false); setDiagramId(undefined); setFilter(''); setReview(false); setNotice(''); };
    const visualSubject = selected ?? (!selectedId ? (flowMode ? flows[0] : structure?.root ?? functions[0]) : undefined);
    const visualKey = `${workspace ?? ''}:${task?.id}:${visualSubject?.id ?? ''}`;
    const showVisual = () => { if (!selected && visualSubject) setSelectedId(visualSubject.id); setAdding(false); setPresentation('visual'); };
    const openVisualDiagram = (create = false) => {
        if (!visualSubject) return;
        const viewpoint = flowMode ? flowTask?.viewpoint : treeTask?.viewpoint;
        if (!viewpoint) { if (create) setNotice('The method has no viewpoint for this diagram.'); return; }
        const members = flowMode ? actionMembers(model, visualSubject.id) : functionMembers(model, visualSubject.id, new Set(functions.map(fn => fn.id)));
        const allowed = new Set(members);
        const existing = model.diagrams?.find(diagram =>
            (flowMode ? ['afd', 'act', 'ffd'].includes(diagram.diagramType) && diagram.viewKind === viewpoint.viewKind
                : diagram.diagramType === 'bdd' && diagram.properties?.layoutHint === 'tree')
            && diagram.elementIds?.length === allowed.size && diagram.elementIds.every(id => allowed.has(id))
            && members.every(id => diagram.elementIds?.includes(id)));
        if (existing) { setDiagramId(existing.id); return; }
        if (!create || !canWrite) return;
        void save(async () => {
            let reason: string | undefined; const guide = useModelStore.getState().guide;
            const id = await useModelStore.getState().createDiagram({ name: `${visualSubject.name} — ${flowMode ? 'Activity diagram' : 'Function BDD'}`, viewpointId: viewpoint.id,
                viewKind: viewpoint.viewKind ?? (flowMode ? 'actionflow' : 'general'), diagramType: flowMode ? 'afd' : 'bdd',
                elementIds: members, elementKinds: flowMode ? guide ? kindsOfLayer(guide, row) : [] : [treeTask?.subjectKind ?? 'SystemFunction'],
                properties: { autoPopulate: 'false', ...(!flowMode ? { layoutHint: 'tree', styleHint: `expanded:${visualSubject.id}` } : {}) }, activate: false, onError: error => { reason = error; } });
            if (!id) throw new Error(reason ?? 'The diagram could not be created.'); return id;
        }, id => setDiagramId(id));
    };
    useEffect(() => { setDiagramId(undefined); openingVisual.current = undefined; }, [visualKey]);
    useEffect(() => { if (presentation !== 'visual' || !visualSubject || busy || openingVisual.current === visualKey) return; openingVisual.current = visualKey; openVisualDiagram(); }, [presentation, visualKey, busy, canWrite]);
    const openFlowDiagram = showVisual;
    const root = structure?.root;
    const parentOf = (id: string) => { const element = model.elements[id]; const owner = element?.parentAction ?? element?.owner; return owner ? canonicalFunctionId(model, owner) : undefined; };
    // Native perform aliases beneath an adopted root are tree references to canonical declarations.
    const parents = new Map(functions.map(fn => [fn.id, parentOf(fn.id)]));
    for (const edge of model.relationships.filter(edge => edge.type === 'subsets')) {
        const alias = model.elements[edge.sourceId]; const parent = alias?.parentAction ?? alias?.owner;
        if (parent && functions.some(fn => fn.id === parent) && functions.some(fn => fn.id === edge.targetId) && !functions.some(fn => fn.id === parents.get(edge.targetId))) parents.set(edge.targetId, parent);
    }
    const treeRow = (id: string, ancestors: Set<string>): React.ReactNode => {
        if (ancestors.has(id)) return null;
        const element = model.elements[id]; if (!element) return null;
        const children = functions.filter(fn => parents.get(fn.id) === id);
        const matches = visible.some(fn => fn.id === id);
        const descendants = (child: string, seen = new Set<string>()): boolean => { if (seen.has(child)) return false; seen.add(child); return visible.some(fn => fn.id === child) || functions.some(fn => parents.get(fn.id) === child && descendants(fn.id, seen)); };
        if (!matches && !children.some(child => descendants(child.id))) return null;
        const open = !!filter || review || id === root?.id || expanded.has(id);
        return <li key={id}><div style={{ display: 'flex', gap: 4 }}>{!!children.length && id !== root?.id && <button type="button" aria-label={`${open ? 'Collapse' : 'Expand'} ${element.name}`} aria-expanded={open} style={button} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>{open ? '⌄' : '›'}</button>}<button style={{ ...button, width: '100%', textAlign: 'left', marginBottom: 5, background: selectedId === id ? '#e8f8f3' : 'white' }} aria-pressed={selectedId === id} onClick={() => { setSelectedId(id); setAdding(false); }}>{element.name}{review && gaps(id) ? ' · Needs review' : ''}</button></div>
            {open && !!children.length && <ul style={{ listStyle: 'none', paddingLeft: 18 }}>{children.map(child => treeRow(child.id, new Set([...ancestors, id])))}</ul>}</li>;
    };
    const detail = (<section aria-label="Current functional task" style={card}>
                    {adding && root && workspace && !flowMode ? <FunctionForm key={selectedId ?? root.id} parentId={selected && functions.some(fn => fn.id === selected.id) ? selected.id : root.id} functions={functions} disabled={!canWrite || busy} onCancel={() => setAdding(false)} onSave={(name, parentFunctionId) => void save(() => writeFunctionalWork({ workspace, operation: 'system-function', parentFunctionId }, name), id => { setSelectedId(id); setAdding(false); })} />
                    : flowMode && (adding || selected && flows.some(flow => flow.id === selected.id)) ? <FlowForm key={adding ? 'new' : selected!.id + JSON.stringify(functionalFlowSteps(model, selected!.id))} model={model} flowId={adding ? undefined : selected!.id} functions={functions.filter(fn => fn.id !== root?.id)} disabled={!canWrite || busy || !workspace || !root} onCancel={() => { setAdding(false); setSelectedId(undefined); }} canOpenDiagram={!!flowTask?.viewpoint} onDiagram={openFlowDiagram} onSave={(name, steps) => void save(() => writeFunctionalWork({ workspace: workspace!, operation: adding ? 'flow' : 'update-flow', ...(adding ? {} : { flowId: selected!.id }), steps }, name), id => { setSelectedId(id); setAdding(false); })} />
                    : selected && !flowMode ? <FunctionDetail key={selected.id} model={model} id={selected.id} workspace={workspace ?? ''} components={components} componentFunctions={componentFunctions} disabled={!canWrite || busy || !workspace || !root} realizationKind={realizationTask?.implementationKind} reviewDescription={realizationTask?.review} save={save} onAddChild={() => setAdding(true)} />
                    : <><h2 style={{ fontSize: 20 }}>{flowMode ? 'How should the functions work together?' : 'What does this system need to do?'}</h2><p>{flowMode ? 'Choose a flow to review its steps, or create one from existing system functions.' : 'Choose a function to review its purpose, decomposition and implementation.'}</p></>}
                </section>);
    return <section data-testid="functional-workbench" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: presentation === 'visual' ? undefined : 1400, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, margin: '0 0 16px' }}>{row.label}</h1>
            <nav aria-label="Functional tasks" style={{ display: 'flex', gap: 8 }}>{tasks.filter(item => item.primary).map(item => <button key={item.id} style={{ ...button, background: task?.id === item.id ? '#e8f8f3' : 'white', fontWeight: task?.id === item.id ? 700 : 400 }} aria-pressed={task?.id === item.id} onClick={() => changeTask(item.id)}>{item.label}</button>)}</nav>
            <p style={{ color: COLOR.muted }}>{task?.objective}</p>
            {notice && <p role="status">{notice}</p>}
            {!workspace && <p>Showing the whole model. Choose one system above to add functions and flows.</p>}
            {workspace && !root && <div style={card}><h2>Start with one parent function</h2><p>Group this system’s responsibilities beneath an explicit function. Existing functions keep their identities.</p><button style={button} disabled={!canWrite || busy} onClick={() => void save(() => writeFunctionalWork({ workspace, operation: 'root' }))}>Set up parent function</button></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}><strong>{flowMode ? 'Functional flows' : 'Functional decomposition'}</strong><span style={{ flex: 1 }} /><nav aria-label="Functional presentation" style={{ display: 'flex', gap: 5 }}><button style={{ ...button, background: presentation === 'details' ? '#e8f8f3' : 'white' }} aria-pressed={presentation === 'details'} onClick={() => setPresentation('details')}>{flowMode ? 'Table' : 'Tree'}</button><button style={{ ...button, background: presentation === 'visual' ? '#e8f8f3' : 'white' }} aria-pressed={presentation === 'visual'} onClick={showVisual}>Visual</button></nav></div>
            {presentation === 'details' ? <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(330px, 1.4fr)', gap: 18, alignItems: 'start' }}>
                <section aria-label={flowMode ? 'Functional flows' : 'Functional tree'} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><h2 style={{ fontSize: 18, marginTop: 0 }}>{task?.label}</h2><button style={button} disabled={!canWrite || busy || !workspace || !root} onClick={() => setAdding(true)}>{flowMode ? '+ Flow' : '+ Function'}</button></div>
                    <input aria-label={flowMode ? 'Filter flows' : 'Filter functions'} placeholder={flowMode ? 'Find a flow…' : 'Find a function…'} style={input} value={filter} onChange={event => setFilter(event.target.value)} />
                    {!flowMode && <label style={{ display: 'block', margin: '12px 0' }}><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)} /> Needs realization or allocation</label>}
                    {flowMode ? <ul style={{ listStyle: 'none', padding: 0 }}>{visible.map(flow => <li key={flow.id}><button style={{ ...button, width: '100%', textAlign: 'left', marginTop: 8, background: selectedId === flow.id ? '#e8f8f3' : 'white' }} onClick={() => { setSelectedId(flow.id); setAdding(false); }}>{flow.name}<small style={{ display: 'block', color: COLOR.muted }}>{functionalFlowSteps(model, flow.id).steps.length} steps</small></button></li>)}</ul> : <ul style={{ listStyle: 'none', padding: 0 }}>{functions.filter(fn => !functions.some(parent => parent.id === parents.get(fn.id))).map(fn => treeRow(fn.id, new Set()))}</ul>}
                    {!visible.length && <p>{filter ? 'No matching work.' : flowMode ? 'Create a flow using functions from the tree.' : 'No functions need review.'}</p>}
                </section>
                {detail}
            </div> : <><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}><strong>{flowMode ? 'Activity diagram' : 'BDD · native function decomposition'}</strong><label> Visual subject <select aria-label="Functional visual subject" style={button} value={visualSubject?.id ?? ''} onChange={event => { setSelectedId(event.target.value); setAdding(false); }}><option value="">Choose a {flowMode ? 'flow' : 'function'}…</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button style={button} disabled={!canWrite || busy || !workspace || !root} onClick={() => setAdding(true)}>{flowMode ? '+ Flow' : '+ Function'}</button><button style={button} onClick={() => setPresentation('details')}>{flowMode ? '‹ Back to functional flows' : '‹ Back to functional tree'}</button></div>
                {adding && <div style={{ maxWidth: 700, marginBottom: 16 }}>{detail}</div>}
                {!visualSubject ? <p>Choose or create a {flowMode ? 'functional flow' : 'system function'} to see its diagram.</p> : diagramId ? <section aria-label={flowMode ? 'Functional activity diagram' : 'Function BDD'} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 330px)', minHeight: 550 }}><Suspense fallback={<p>Opening diagram…</p>}><PaletteKindsContext.Provider value={flowMode ? useModelStore.getState().guide ? kindsOfLayer(useModelStore.getState().guide!, row) : [] : [treeTask?.subjectKind ?? 'SystemFunction']}><DiagramDisplayScope.Provider value={workspace}><DiagramActionSubject.Provider value={flowMode ? visualSubject.id : null}><DiagramEditor key={diagramId} diagramId={diagramId} /></DiagramActionSubject.Provider></DiagramDisplayScope.Provider></PaletteKindsContext.Provider></Suspense></section> : <p>{busy ? 'Opening the selected diagram…' : 'No saved diagram matches this selection.'} {!busy && canWrite && <button style={button} onClick={() => openVisualDiagram(true)}>Create diagram</button>}</p>}
            </>}
        </div>
    </section>;
}

type Element = MemoModelDTO['elements'][string];
function FunctionForm({ parentId, functions, disabled, onSave, onCancel }: { parentId: string; functions: Element[]; disabled: boolean; onSave: (name: string, parent: string) => void; onCancel: () => void }) {
    const [name, setName] = useState(''); const [parent, setParent] = useState(parentId);
    return <form onSubmit={event => { event.preventDefault(); onSave(name, parent); }}><h2>Add a system function</h2><label>Function name<input autoFocus required style={input} value={name} onChange={event => setName(event.target.value)} /></label><label>Parent function<select aria-label="Parent function" style={input} value={parent} onChange={event => setParent(event.target.value)}>{functions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}</select></label><p><button style={button} disabled={disabled || !name.trim()}>Add function</button> <button type="button" style={button} onClick={onCancel}>Cancel</button></p></form>;
}
function FunctionDetail({ model, id, workspace, components, componentFunctions, disabled, realizationKind, reviewDescription, save, onAddChild }: { model: MemoModelDTO; id: string; workspace: string; components: Element[]; componentFunctions: Element[]; disabled: boolean; realizationKind?: string; reviewDescription?: string; save: (work: () => Promise<string | undefined>, after?: (id?: string) => void) => Promise<void>; onAddChild: () => void }) {
    const element = model.elements[id];
    const implementations = realizingFunctions(model, id, realizationKind);
    const [mode, setMode] = useState<'new' | 'existing' | null>(null);
    const [name, setName] = useState(''); const [implementation, setImplementation] = useState(''); const [component, setComponent] = useState('');
    const existingAllocations = mode === 'existing' ? model.relationships.filter(edge => edge.type === 'allocatedTo' && edge.sourceId === implementation).map(edge => edge.targetId) : [];
    const chosenComponent = existingAllocations[0] ?? component;
    const submit = (event: FormEvent) => { event.preventDefault(); void save(() => writeFunctionalWork({ workspace, operation: mode === 'existing' ? 'link-realization' : 'component-function', systemFunctionId: id, ...(mode === 'existing' ? { componentFunctionId: implementation } : {}), componentId: chosenComponent }, name), () => { setMode(null); setName(''); setImplementation(''); setComponent(''); }); };
    return <><h2 style={{ marginTop: 0 }}>{element.name}</h2><p style={{ whiteSpace: 'pre-wrap', color: COLOR.muted }}>{element.doc || 'No purpose described yet.'}</p><button style={button} disabled={disabled} onClick={onAddChild}>+ Child function</button>
        <h3>Realization and allocation</h3><p style={{ color: COLOR.muted }}>{reviewDescription}</p>
        {implementations.length ? <ul style={{ paddingLeft: 18 }}>{implementations.map(item => <li key={item.element.id} style={{ marginBottom: 12 }}><strong>{item.element.name}</strong> → {item.components.length ? item.components.map(component => component.name).join(', ') : <><span>Needs a component</span> <button style={button} disabled={disabled} onClick={() => { setImplementation(item.element.id); setMode('existing'); }}>Allocate…</button></>}</li>)}</ul> : <p>This system function has no component function realizing it yet.</p>}
        {!mode ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button style={button} disabled={disabled} onClick={() => { setMode('new'); setImplementation(''); setComponent(''); }}>+ Component function</button><button style={button} disabled={disabled || !componentFunctions.length} onClick={() => setMode('existing')}>Use existing component function</button></div> : <form onSubmit={submit}>
            <h4>{mode === 'new' ? 'Realize this system function' : 'Link and allocate a component function'}</h4>
            {mode === 'new' ? <label>Component function name<input required style={input} value={name} onChange={event => setName(event.target.value)} /></label> : <label>Component function<select aria-label="Component function" required style={input} value={implementation} onChange={event => setImplementation(event.target.value)}><option value="">Choose a component function…</option>{componentFunctions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}</select></label>}
            <label>Allocated component<select aria-label="Allocated component" required disabled={!!existingAllocations.length} style={input} value={chosenComponent} onChange={event => setComponent(event.target.value)}><option value="">Choose a component…</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
            {!components.length && <p>Add a logical component in the Logical layer first.</p>}
            <p><button style={button} disabled={disabled || !chosenComponent || (mode === 'new' ? !name.trim() : !implementation)}>Save realization and allocation</button> <button type="button" style={button} onClick={() => { setMode(null); setImplementation(''); setComponent(''); setName(''); }}>Cancel</button></p>
        </form>}
    </>;
}
function FlowForm({ model, flowId, functions, disabled, onSave, onCancel, onDiagram, canOpenDiagram }: { model: MemoModelDTO; flowId?: string; functions: Element[]; disabled: boolean; onSave: (name: string, steps: FunctionalStepInput[]) => void; onCancel: () => void; onDiagram: () => void; canOpenDiagram: boolean }) {
    const current = flowId ? functionalFlowSteps(model, flowId) : undefined;
    const [name, setName] = useState(flowId ? model.elements[flowId].name : '');
    const [steps, setSteps] = useState<FunctionalStepInput[]>(current?.steps.map(item => ({ stepId: item.step.id, functionId: item.functionId ?? '' })) ?? []);
    const [next, setNext] = useState('');
    const complex = current?.branching || current?.steps.some(step => !step.functionId);
    const move = (index: number, delta: number) => { const updated = [...steps]; [updated[index], updated[index + delta]] = [updated[index + delta], updated[index]]; setSteps(updated); };
    return <form onSubmit={event => { event.preventDefault(); onSave(name, steps); }}><h2 style={{ marginTop: 0 }}>{flowId ? name : 'Create a functional flow'}</h2>
        {!flowId && <label>Flow name<input required style={input} value={name} onChange={event => setName(event.target.value)} /></label>}
        <p>Each step performs an existing system function. A function can be used in more than one flow.</p>
        <div style={{ overflow: 'auto', margin: '12px 0' }}><table aria-label="Functional flow steps" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ padding: 8, textAlign: 'left' }}>Step</th><th style={{ padding: 8, textAlign: 'left' }}>System function</th><th style={{ padding: 8, textAlign: 'left' }}>Order</th></tr></thead><tbody>{steps.map((step, index) => <tr key={step.stepId ?? `new-${index}`}><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}>{index + 1}</td><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}>{model.elements[step.functionId]?.name ?? model.elements[step.stepId ?? '']?.name ?? 'Unresolved function'}</td><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}>{!complex && <span style={{ display: 'inline-flex', gap: 4 }}><button type="button" style={button} aria-label={`Move step ${index + 1} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" style={button} aria-label={`Move step ${index + 1} down`} disabled={disabled || index === steps.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" style={button} aria-label={`Remove step ${index + 1}`} disabled={disabled} onClick={() => setSteps(steps.filter((_, at) => at !== index))}>Remove</button></span>}</td></tr>)}</tbody></table></div>
        {complex ? <p>This flow contains richer behavior. Open its diagram to review and edit it.</p> : <><label>Add a step using<select aria-label="Add a step using" style={input} value={next} onChange={event => setNext(event.target.value)}><option value="">Choose a system function…</option>{functions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}</select></label><button type="button" style={{ ...button, marginTop: 8 }} disabled={disabled || !next} onClick={() => { setSteps([...steps, { functionId: next }]); setNext(''); }}>Add step</button></>}
        <p>{!complex && <button style={button} disabled={disabled || !steps.length || !name.trim()}>{flowId ? 'Save sequence' : 'Create flow'}</button>} {flowId && <button type="button" style={button} disabled={!canOpenDiagram} onClick={onDiagram}>Open flow diagram</button>} <button type="button" style={button} onClick={onCancel}>Close</button></p>
    </form>;
}

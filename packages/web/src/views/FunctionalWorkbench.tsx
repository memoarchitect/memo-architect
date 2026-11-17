import { actionMembers, functionMembers } from '../lib/operational-presentation';
import { lazy, Suspense, useEffect, useMemo, useState, useRef, type CSSProperties, type FormEvent } from 'react';
import { canonicalFunctionId, functionalCatalog, functionalFlowFunctions, functionalFlowsInScope, functionalFlowSteps, functionalScopes, functionalStructure, realizingFunctions, operationalWorkLevel, indexKinds, kindConformsTo, type MemoModelDTO, type FunctionalStepInput } from '@memoarchitect/tools/browser';
import type { GuideLayer } from '../lib/pathways';
import { kindsOfLayer, diagramTypeFor } from '../lib/pathways';
import { useModelStore } from '../store/model-store';
import { writeFunctionalWork } from '../lib/functional-authoring';
import { DiagramActionSubject, DiagramDisplayScope } from '../diagram/display-scope';
import { PaletteKindsContext } from './DiagramPalette';
import { COLOR } from '../styles/tokens';
import './pathway-workbench.css';
const DiagramEditor = lazy(() => import('./DiagramEditor').then(module => ({ default: module.DiagramEditor })));
const button: CSSProperties = { padding: '8px 12px', background: 'white', border: `1px solid ${COLOR.border}`, borderRadius: 6, color: COLOR.primary, font: 'inherit', cursor: 'pointer' };
const input: CSSProperties = { ...button, cursor: 'text', width: '100%', boxSizing: 'border-box' };
const card: CSSProperties = { background: 'white', border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: 20 };

/** Task choices and semantic roles come from the active method, not a layer-name switch. */
export function FunctionalWorkbench({ model, row, workspace, canWrite, artifactId, onOperational, onFunctional, onLogical, onSelection }: {
    model: MemoModelDTO; row: GuideLayer; workspace: string | null; canWrite: boolean;
    artifactId?: string; onOperational?: (id: string) => void; onFunctional?: (id: string) => void; onLogical?: (id: string) => void;
    onSelection?: (artifactId: string | undefined) => void;
}) {
    const tasks = row.tasks ?? [];
    const treeTask = tasks.find(task => task.kind === 'decomposition');
    const flowTask = tasks.find(task => task.kind === 'sequence');
    const realizationTask = tasks.find(task => task.kind === 'realization');
    const [startingId] = useState(() => {
        const selected = useModelStore.getState().selectedElementId;
        return artifactId ?? (selected && functionalFlowsInScope(model, workspace, flowTask?.subjectKind ?? 'FunctionalFlow').some(flow => flow.id === selected) ? selected : undefined);
    });
    const startsWithFlow = startingId && functionalCatalog(model, null, flowTask?.subjectKind ?? 'FunctionalFlow').some(flow => flow.id === startingId);
    const previousScope = useRef(workspace);
    const [taskId, setTaskId] = useState(startsWithFlow ? flowTask?.id : treeTask?.id ?? tasks[0]?.id);
    const task = tasks.find(task => task.id === taskId) ?? treeTask;
    const contextRef = useRef('');
    const [presentation, setPresentation] = useState<'details' | 'visual'>('details');
    const openingVisual = useRef<string>();
    const [selectedId, setSelectedId] = useState<string | undefined>(startingId);
    useEffect(() => { onSelection?.(selectedId); }, [selectedId, onSelection]);
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
    const functions = useMemo(() => workspace ? functionalCatalog(model, workspace, treeTask?.subjectKind) : [], [model, workspace, treeTask?.subjectKind]);
    const flows = useMemo(() => functionalFlowsInScope(model, workspace, flowTask?.subjectKind ?? 'FunctionalFlow'), [model, workspace, flowTask?.subjectKind]);
    const allFlows = useMemo(() => functionalCatalog(model, null, flowTask?.subjectKind ?? 'FunctionalFlow'), [model, flowTask?.subjectKind]);
    const stepFunctions = useMemo(() => functionalFlowFunctions(model), [model]);
    const owners = useMemo(() => functionalScopes(model).roots, [model]);
    const systemsFor = (id: string) => [...(owners.get(id) ?? [])].map(owner => model.elements[owner]?.name ?? owner);
    const participatingSystems = (flowId: string) => [...new Set(functionalFlowSteps(model, flowId).steps.flatMap(
        step => step.functionId ? systemsFor(step.functionId) : [],
    ))];
    const componentFunctions = useMemo(() => functionalCatalog(model, workspace, realizationTask?.implementationKind ?? 'ComponentFunction'), [model, workspace, realizationTask?.implementationKind]);
    const registry = useMemo(() => indexKinds(model.registries?.kinds ?? []), [model.registries]);
    const components = Object.values(model.elements).filter(element => !element.isDefinition && kindConformsTo(element.kind, realizationTask?.allocationKind ?? 'LogicalComponent', registry)
        && (!workspace || model.workspaceMembership?.membership[element.id]?.includes(workspace)));
    const gaps = (id: string) => { const implementations = realizingFunctions(model, id, realizationTask?.implementationKind); return !implementations.length || implementations.some(item => !item.components.length); };
    const flowMode = task?.kind === 'sequence';
    const items = flowMode ? flows : functions;
    const selected = items.find(item => item.id === selectedId);
    const visible = items.filter(element => element.name.toLowerCase().includes(filter.toLowerCase()) && (!review || flowMode || gaps(element.id)));
    useEffect(() => {
        if (previousScope.current === workspace) return;
        previousScope.current = workspace;
        setSelectedId(artifactId);
        setDiagramId(undefined);
        setAdding(false);
        setNotice('');
        setFilter('');
    }, [workspace, artifactId]);
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
    const openFunction = (id: string) => {
        if (!treeTask) return;
        if (!functions.some(fn => fn.id === id)) { onFunctional?.(id); return; }
        changeTask(treeTask.id);
        setSelectedId(id);
        setPresentation('details');
    };
    const openFlow = (id: string) => {
        if (!flowTask) return;
        if (!flows.some(flow => flow.id === id)) { onFunctional?.(id); return; }
        changeTask(flowTask.id);
        setSelectedId(id);
        setPresentation('details');
    };
    const root = structure?.root;
    const parentOf = (id: string) => { const element = model.elements[id]; const owner = element?.parentAction ?? element?.owner; return owner ? canonicalFunctionId(model, owner) : undefined; };
    // Native perform aliases beneath an adopted root are tree references to canonical declarations.
    const parents = new Map(functions.map(fn => [fn.id, parentOf(fn.id)]));
    for (const edge of model.relationships.filter(edge => edge.type === 'subsets')) {
        const alias = model.elements[edge.sourceId]; const parent = alias?.parentAction ?? alias?.owner;
        if (parent && functions.some(fn => fn.id === parent) && functions.some(fn => fn.id === edge.targetId) && !functions.some(fn => fn.id === parents.get(edge.targetId))) parents.set(edge.targetId, parent);
    }
    useEffect(() => {
        if (!selectedId || flowMode) return;
        const ancestors = new Set<string>();
        for (let id = parents.get(selectedId); id && !ancestors.has(id); id = parents.get(id)) ancestors.add(id);
        if (ancestors.size) setExpanded(current => new Set([...current, ...ancestors]));
    }, [selectedId, workspace, flowMode, model]);
    const relatedFlows = !flowMode && selected ? allFlows.filter(flow => (onFunctional || flows.some(local => local.id === flow.id)) &&
        functionalFlowSteps(model, flow.id).steps.some(step => step.functionId === selected.id)) : [];
    // A flow step is an occurrence of a function. Operational work linked to a step is listed under that
    // step and its flow, never as work linked to the function itself.
    const operationalLinks: { id: string; via?: { flowId: string; flow: string; step: string } }[] = [];
    if (selected) {
        const direct = new Set([selected.id]);
        const occurrences = new Map<string, { flowId: string; flow: string; step: string }>();
        for (const flow of flowMode ? [selected] : allFlows) for (const item of functionalFlowSteps(model, flow.id).steps) {
            if (flowMode || item.functionId === selected.id) occurrences.set(item.step.id, { flowId: flow.id, flow: flow.name, step: item.step.name });
        }
        const seen = new Set<string>();
        const add = (id: string, target: string) => {
            if (!operationalWorkLevel(model, id) || seen.has(`${id}:${target}`)) return;
            seen.add(`${id}:${target}`);
            if (direct.has(target)) operationalLinks.unshift({ id }); else operationalLinks.push({ id, via: occurrences.get(target)! });
        };
        for (const edge of model.relationships) {
            if (edge.type === 'performs' && (direct.has(edge.targetId) || occurrences.has(edge.targetId))) add(edge.sourceId, edge.targetId);
            if (edge.type === 'realizes' && (direct.has(edge.sourceId) || occurrences.has(edge.sourceId))) add(edge.targetId, edge.sourceId);
        }
    }
    const directLinks = operationalLinks.filter(link => !link.via);
    const occurrenceLinks = operationalLinks.filter(link => link.via);
    const operationalButton = (id: string) => onOperational
        ? <button type="button" className="pathway-resource" onClick={() => onOperational(id)}>{model.elements[id].name}</button>
        : <span>{model.elements[id].name}</span>;
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
    const addLabel = flowMode ? '+ Flow' : '+ Function';
    const canAdd = canWrite && !busy && !!workspace && !!root;
    const detail = (<section aria-label="Current functional task" style={card}>
                    {adding && root && workspace && !flowMode ? <FunctionForm key={selectedId ?? root.id} parentId={selected && functions.some(fn => fn.id === selected.id) ? selected.id : root.id} functions={functions} disabled={!canWrite || busy} onCancel={() => setAdding(false)} onSave={(name, parentFunctionId) => void save(() => writeFunctionalWork({ workspace, operation: 'system-function', parentFunctionId }, name), id => { setSelectedId(id); setAdding(false); })} />
                    : flowMode && (adding || selected && flows.some(flow => flow.id === selected.id)) ? <FlowForm key={adding ? 'new' : selected!.id + JSON.stringify(functionalFlowSteps(model, selected!.id))} model={model} flowId={adding ? undefined : selected!.id} functions={stepFunctions} systemsFor={systemsFor}
                        canOpenFunction={id => !!onFunctional || functions.some(fn => fn.id === id)} disabled={!canWrite || busy || !workspace || adding && !root || selected?.provenance?.declaration.writable === false} onCancel={() => { setAdding(false); setSelectedId(undefined); }} canOpenDiagram={!!flowTask?.viewpoint} onDiagram={presentation === 'visual' ? undefined : showVisual}
                        onFunction={openFunction} destination={(adding ? structure?.home : selected)?.file} onSave={(name, steps) => void save(() => writeFunctionalWork({ workspace: workspace!, operation: adding ? 'flow' : 'update-flow', ...(adding ? {} : { flowId: selected!.id }), steps }, name), id => { setSelectedId(id); setAdding(false); })} />
                    : selected && !flowMode ? <FunctionDetail key={selected.id} model={model} id={selected.id} workspace={workspace ?? ''} components={components} componentFunctions={componentFunctions} disabled={!canWrite || busy || !workspace || !root} realizationKind={realizationTask?.implementationKind} reviewDescription={realizationTask?.review} onLogical={realizationTask?.implementationKind === 'ComponentFunction' ? onLogical : undefined} save={save} onAddChild={() => setAdding(true)} />
                    : <><h2 style={{ fontSize: 20 }}>{flowMode ? 'How should the functions work together?' : 'What does this system need to do?'}</h2><p>{flowMode ? 'Choose a flow to review its steps, or create one from existing system functions.' : 'Choose a function to review its purpose, decomposition and implementation.'}</p></>}
                    {!adding && !!relatedFlows.length && <section className="pathway-related" aria-label="Flows using this function"><h3>Used in flows</h3>
                        <div className="pathway-resources">{relatedFlows.map(flow => <button key={flow.id} type="button" className="pathway-resource" onClick={() => openFlow(flow.id)}>{flow.name}</button>)}</div>
                    </section>}
                    {!adding && !!operationalLinks.length && <section className="pathway-related" aria-label="Related operational work"><h3>Related operational work</h3>
                        {!!directLinks.length && <><p style={{ color: COLOR.muted, margin: '4px 0' }}>{flowMode ? 'Activities and scenarios this flow realizes' : 'Activities that perform this function directly'}</p>
                            <div className="pathway-resources">{directLinks.map(link => <span key={link.id}>{operationalButton(link.id)}</span>)}</div></>}
                        {!!occurrenceLinks.length && <><p style={{ color: COLOR.muted, margin: '10px 0 4px' }}>{flowMode ? 'Activities linked to one step of this flow' : 'Activities linked to one use of this function in a flow, not to the function itself'}</p>
                            <ul aria-label="Operational work linked to a flow step" style={{ listStyle: 'none', padding: 0, margin: 0 }}>{occurrenceLinks.map(link => <li key={`${link.id}:${link.via!.flowId}:${link.via!.step}`} style={{ marginBottom: 6 }}>
                                {operationalButton(link.id)} <small style={{ color: COLOR.muted }}>step <strong>{link.via!.step}</strong>{!flowMode && <> in {onFunctional || flows.some(flow => flow.id === link.via!.flowId)
                                    ? <button type="button" className="pathway-button" onClick={() => openFlow(link.via!.flowId)}>{link.via!.flow}</button> : link.via!.flow}</>}</small></li>)}</ul></>}
                    </section>}
                </section>);
    return <section className="pathway-workspace" data-testid="functional-workbench" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: presentation === 'visual' ? undefined : 1400, margin: '0 auto' }}>
            <header className="pathway-header">
                <div><h1>{task?.label ?? row.label}</h1><p>{workspace ? flowMode ? `Flows involving ${model.elements[workspace]?.name ?? workspace}` : model.elements[workspace]?.name : 'Whole model'}</p></div>
                <div>
                    <button type="button" className="pathway-button pathway-button--primary" disabled={!canAdd} onClick={() => setAdding(true)}>{addLabel}</button>
                    {flowMode && workspace && !root && canWrite && treeTask && <button type="button" className="pathway-button" style={{ marginLeft: 8 }}
                        onClick={() => changeTask(treeTask.id)}>Set up the function tree</button>}
                </div>
            </header>
            <div className="pathway-toolbar">
                <nav aria-label="Functional tasks" className="pathway-segments">{tasks.filter(item => item.primary).map(item => <button key={item.id} type="button" aria-pressed={task?.id === item.id} onClick={() => changeTask(item.id)}>{item.label}</button>)}</nav>
                <nav aria-label="Functional presentation" className="pathway-segments"><button type="button" aria-pressed={presentation === 'details'} onClick={() => setPresentation('details')}>{flowMode ? 'Table' : 'Tree'}</button><button type="button" aria-pressed={presentation === 'visual'} onClick={showVisual}>Visual</button></nav>
            </div>
            {notice && <p role="status">{notice}</p>}
            {!workspace && flowMode && <p>Choose where to save the flow. Its steps can use functions from any system.</p>}
            {!workspace && !flowMode && <section style={card} aria-label="Choose a system function tree">
                <h2 style={{ marginTop: 0 }}>Choose a system function tree</h2>
                <div className="pathway-resources pathway-resources--browse">{model.workspaceMembership?.workspaces.map(system =>
                    <button key={system.root} type="button" className="pathway-resource"
                        onClick={() => useModelStore.getState().setWorkspace(system.root)}>{system.name}</button>)}</div>
            </section>}
            {workspace && !root && !flowMode && <div style={card}><h2>Set up the function tree</h2><p>The parent function groups what this system needs to do.</p>{structure?.home?.file && <p>Save in <code>{structure.home.file}</code></p>}<button className="pathway-button" disabled={!canWrite || busy} onClick={() => void save(() => writeFunctionalWork({ workspace, operation: 'root' }))}>Set up parent function</button></div>}
            {(workspace || flowMode) && (presentation === 'details' ? <div className="pathway-columns">
                <section aria-label={flowMode ? 'Functional flows' : 'Functional tree'} style={{ ...card, minWidth: 0 }}>
                    <input aria-label={flowMode ? 'Filter flows' : 'Filter functions'} placeholder={flowMode ? 'Find a flow…' : 'Find a function…'} style={input} value={filter} onChange={event => setFilter(event.target.value)} />
                    {!flowMode && <label style={{ display: 'block', margin: '12px 0' }}><input type="checkbox" checked={review} onChange={event => setReview(event.target.checked)} /> Needs realization or allocation</label>}
                    <div className="pathway-resources--browse">
                        {flowMode ? <div className="pathway-resources">{visible.map(flow => {
                            const steps = functionalFlowSteps(model, flow.id).steps;
                            const systems = participatingSystems(flow.id);
                            return <button key={flow.id} type="button" className="pathway-resource" aria-label={flow.name} aria-pressed={selectedId === flow.id}
                                onClick={() => { setSelectedId(flow.id); setAdding(false); }}><span><strong>{flow.name}</strong><small>{steps.length} steps{systems.length ? ` · ${systems.join(', ')}` : ''}</small></span></button>;
                        })}</div>
                            : <ul style={{ listStyle: 'none', padding: 0 }}>{functions.filter(fn => !functions.some(parent => parent.id === parents.get(fn.id))).map(fn => treeRow(fn.id, new Set()))}</ul>}
                    </div>
                    {!visible.length && <p>{filter ? 'No matching work.' : flowMode ? 'Create a flow using functions from the tree.' : review ? 'No functions need review.' : 'No functions in this scope yet.'}</p>}
                </section>
                {detail}
            </div> : <><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}><label>{flowMode ? 'Flow' : 'Function'} <select aria-label="Functional visual subject" style={button} value={visualSubject?.id ?? ''} onChange={event => { setSelectedId(event.target.value); setAdding(false); }}><option value="">Choose a {flowMode ? 'flow' : 'function'}…</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
                {adding && <div style={{ maxWidth: 700, marginBottom: 16 }}>{detail}</div>}
                <div className={selected && !adding ? 'pathway-columns pathway-columns--canvas' : undefined}>
                {!visualSubject ? <p>Choose or create a {flowMode ? 'functional flow' : 'system function'} to see its diagram.</p> : diagramId ? <section aria-label={flowMode ? 'Functional activity diagram' : 'Function BDD'} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 330px)', minHeight: 550 }}><Suspense fallback={<p>Opening diagram…</p>}><PaletteKindsContext.Provider value={flowMode ? useModelStore.getState().guide ? kindsOfLayer(useModelStore.getState().guide!, row) : [] : [treeTask?.subjectKind ?? 'SystemFunction']}><DiagramDisplayScope.Provider value={flowMode ? null : workspace}><DiagramActionSubject.Provider value={flowMode ? visualSubject.id : null}><DiagramEditor key={diagramId} diagramId={diagramId} /></DiagramActionSubject.Provider></DiagramDisplayScope.Provider></PaletteKindsContext.Provider></Suspense></section> : <section className="pathway-context-preview" aria-label={flowMode ? 'Flow preview' : 'Function decomposition preview'}>
                    <div className="pathway-context-subject"><strong>{visualSubject.name}</strong></div>
                    {flowMode ? <ul>{functionalFlowSteps(model, visualSubject.id).steps.map(({ step, functionId }) => <li key={step.id}>
                        {step.name}{functionId && model.elements[functionId] && <small> · Performs {model.elements[functionId].name}</small>}
                    </li>)}</ul> : <div className="pathway-resources">{functions.filter(fn => parents.get(fn.id) === visualSubject.id).map(fn =>
                        <button key={fn.id} type="button" className="pathway-resource" onClick={() => setSelectedId(fn.id)}>{fn.name}</button>)}</div>}
                    <div className="pathway-header"><p>{busy ? 'Opening diagram…' : 'Preview from the model'}</p>{!busy && canWrite && <button type="button" className="pathway-button" onClick={() => openVisualDiagram(true)}>Create diagram</button>}</div>
                </section>}
                {selected && !adding && detail}
                </div>
            </>)}
        </div>
    </section>;
}

type Element = MemoModelDTO['elements'][string];
function FunctionForm({ parentId, functions, disabled, onSave, onCancel }: { parentId: string; functions: Element[]; disabled: boolean; onSave: (name: string, parent: string) => void; onCancel: () => void }) {
    const [name, setName] = useState(''); const [parent, setParent] = useState(parentId);
    return <form onSubmit={event => { event.preventDefault(); onSave(name, parent); }}><h2>Add a system function</h2><label>Function name<input autoFocus required style={input} value={name} onChange={event => setName(event.target.value)} /></label><label>Parent function<select aria-label="Parent function" style={input} value={parent} onChange={event => setParent(event.target.value)}>{functions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}</select></label>{functions.find(fn => fn.id === parent)?.file && <p>Save in <code>{functions.find(fn => fn.id === parent)?.file}</code></p>}<p><button style={button} disabled={disabled || !name.trim()}>Add function</button> <button type="button" style={button} onClick={onCancel}>Cancel</button></p></form>;
}
function FunctionDetail({ model, id, workspace, components, componentFunctions, disabled, realizationKind, reviewDescription, onLogical, save, onAddChild }: { model: MemoModelDTO; id: string; workspace: string; components: Element[]; componentFunctions: Element[]; disabled: boolean; realizationKind?: string; reviewDescription?: string; onLogical?: (id: string) => void; save: (work: () => Promise<string | undefined>, after?: (id?: string) => void) => Promise<void>; onAddChild: () => void }) {
    const element = model.elements[id];
    const implementations = realizingFunctions(model, id, realizationKind);
    const [mode, setMode] = useState<'new' | 'existing' | null>(null);
    const [name, setName] = useState(''); const [implementation, setImplementation] = useState(''); const [component, setComponent] = useState('');
    const existingAllocations = mode === 'existing' ? model.relationships.filter(edge => edge.type === 'allocatedTo' && edge.sourceId === implementation).map(edge => edge.targetId) : [];
    const chosenComponent = existingAllocations[0] ?? component;
    const submit = (event: FormEvent) => { event.preventDefault(); void save(() => writeFunctionalWork({ workspace, operation: mode === 'existing' ? 'link-realization' : 'component-function', systemFunctionId: id, ...(mode === 'existing' ? { componentFunctionId: implementation } : {}), componentId: chosenComponent }, name), () => { setMode(null); setName(''); setImplementation(''); setComponent(''); }); };
    return <><h2 style={{ marginTop: 0 }}>{element.name}</h2><p style={{ whiteSpace: 'pre-wrap', color: COLOR.muted }}>{element.doc || 'No purpose described yet.'}</p><button style={button} disabled={disabled} onClick={onAddChild}>+ Child function</button>
        <h3>Realization and allocation</h3><p style={{ color: COLOR.muted }}>{reviewDescription}</p>
        {implementations.length ? <ul style={{ paddingLeft: 18 }}>{implementations.map(item => <li key={item.element.id} style={{ marginBottom: 12 }}>{onLogical ? <button type="button" style={button} onClick={() => onLogical(item.element.id)}>{item.element.name}</button> : <strong>{item.element.name}</strong>} → {item.components.length ? item.components.map(component => component.name).join(', ') : <><span>Needs a component</span> <button style={button} disabled={disabled} onClick={() => { setImplementation(item.element.id); setMode('existing'); }}>Allocate…</button></>}</li>)}</ul> : <p>This system function has no component function realizing it yet.</p>}
        {!mode ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button style={button} disabled={disabled} onClick={() => { setMode('new'); setImplementation(''); setComponent(''); }}>+ Component function</button><button style={button} disabled={disabled || !componentFunctions.length} onClick={() => setMode('existing')}>Use existing component function</button></div> : <form onSubmit={submit}>
            <h4>{mode === 'new' ? 'Realize this system function' : 'Link and allocate a component function'}</h4>
            {mode === 'new' ? <label>Component function name<input required style={input} value={name} onChange={event => setName(event.target.value)} /></label> : <label>Component function<select aria-label="Component function" required style={input} value={implementation} onChange={event => setImplementation(event.target.value)}><option value="">Choose a component function…</option>{componentFunctions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}</select></label>}
            <label>Allocated component<select aria-label="Allocated component" required disabled={!!existingAllocations.length} style={input} value={chosenComponent} onChange={event => setComponent(event.target.value)}><option value="">Choose a component…</option>{components.map(component => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
            {!components.length && <p>Add a logical component in the Logical layer first.</p>}
            <p><button style={button} disabled={disabled || !chosenComponent || (mode === 'new' ? !name.trim() : !implementation)}>Save realization and allocation</button> <button type="button" style={button} onClick={() => { setMode(null); setImplementation(''); setComponent(''); setName(''); }}>Cancel</button></p>
        </form>}
    </>;
}
function FlowForm({ model, flowId, functions, disabled, onSave, onCancel, onDiagram, canOpenDiagram, onFunction, destination, systemsFor, canOpenFunction }: { model: MemoModelDTO; flowId?: string; functions: Element[]; disabled: boolean; onSave: (name: string, steps: FunctionalStepInput[]) => void; onCancel: () => void; onDiagram?: () => void; canOpenDiagram: boolean; onFunction: (id: string) => void; destination?: string; systemsFor: (id: string) => string[]; canOpenFunction: (id: string) => boolean }) {
    const current = flowId ? functionalFlowSteps(model, flowId) : undefined;
    const [name, setName] = useState(flowId ? model.elements[flowId].name : '');
    const [steps, setSteps] = useState<FunctionalStepInput[]>(current?.steps.map(item => ({ stepId: item.step.id, functionId: item.functionId ?? '' })) ?? []);
    const [next, setNext] = useState('');
    const bySystem = new Map<string, Element[]>();
    for (const fn of functions) {
        const label = systemsFor(fn.id).join(', ') || 'System unassigned';
        const group = bySystem.get(label) ?? [];
        group.push(fn);
        bySystem.set(label, group);
    }
    const allocations = new Map<string, string[]>();
    for (const edge of model.relationships) {
        if (edge.type === 'allocatedTo' && model.elements[edge.targetId]) {
            const owners = allocations.get(edge.sourceId) ?? [];
            if (!owners.includes(edge.targetId)) owners.push(edge.targetId);
            allocations.set(edge.sourceId, owners);
        }
    }
    const complex = current?.branching || current?.steps.some(step => !step.functionId);
    const move = (index: number, delta: number) => { const updated = [...steps]; [updated[index], updated[index + delta]] = [updated[index + delta], updated[index]]; setSteps(updated); };
    return <form onSubmit={event => { event.preventDefault(); onSave(name, steps); }}><h2 style={{ marginTop: 0 }}>{flowId ? name : 'Create a functional flow'}</h2>
        {!flowId && <label>Flow name<input required style={input} value={name} onChange={event => setName(event.target.value)} /></label>}
        <p>Add steps by choosing existing system functions. A flow can use functions from several systems.</p>
        <div style={{ overflow: 'auto', margin: '12px 0' }}><table aria-label="Functional flow steps" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ padding: 8, textAlign: 'left' }}>Step</th><th style={{ padding: 8, textAlign: 'left' }}>System function</th><th style={{ padding: 8, textAlign: 'left' }}>Order</th></tr></thead><tbody>{steps.map((step, index) => <tr key={step.stepId ?? `new-${index}`}><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}><strong>{model.elements[step.stepId ?? '']?.name ?? `Step ${index + 1}`}</strong>
            {!!allocations.get(step.stepId ?? '')?.length && <small style={{ display: 'block', color: COLOR.muted }}>Assigned in this flow to {allocations.get(step.stepId ?? '')!.map(id => model.elements[id].name).join(', ')}</small>}
        </td><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}>{model.elements[step.functionId] && canOpenFunction(step.functionId)
            ? <button type="button" className="pathway-button" onClick={() => onFunction(step.functionId)}>{model.elements[step.functionId].name}</button>
            : model.elements[step.functionId]?.name ?? 'Unresolved function'}
            {step.functionId && !!systemsFor(step.functionId).length && <small style={{ display: 'block', color: COLOR.muted }}>{systemsFor(step.functionId).join(', ')}</small>}</td><td style={{ padding: 8, borderTop: `1px solid ${COLOR.border}` }}>{!complex && <span style={{ display: 'inline-flex', gap: 4 }}><button type="button" style={button} aria-label={`Move step ${index + 1} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" style={button} aria-label={`Move step ${index + 1} down`} disabled={disabled || index === steps.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" style={button} aria-label={`Remove step ${index + 1}`} disabled={disabled} onClick={() => setSteps(steps.filter((_, at) => at !== index))}>Remove</button></span>}</td></tr>)}</tbody></table></div>
        {complex ? <p>This flow contains richer behavior. Open its diagram to review and edit it.</p> : <><label>Add a step using<select aria-label="Add a step using" style={input} value={next} onChange={event => setNext(event.target.value)}><option value="">Choose a system function…</option>{[...bySystem].sort(([a], [b]) => a.localeCompare(b)).map(([label, group]) => <optgroup key={label} label={label}>{group.map(fn =>
            <option key={fn.id} value={fn.id}>{fn.name}</option>)}</optgroup>)}</select></label><button type="button" style={{ ...button, marginTop: 8 }} disabled={disabled || !next} onClick={() => { setSteps([...steps, { functionId: next }]); setNext(''); }}>Add step</button></>}
        {!complex && destination && <p>Save in <code>{destination}</code></p>}
        <p>{!complex && <button style={button} disabled={disabled || !steps.length || !name.trim()}>{flowId ? 'Save sequence' : 'Create flow'}</button>} {flowId && onDiagram && <button type="button" style={button} disabled={!canOpenDiagram} onClick={onDiagram}>Open flow diagram</button>} <button type="button" style={button} onClick={onCancel}>Close</button></p>
    </form>;
}

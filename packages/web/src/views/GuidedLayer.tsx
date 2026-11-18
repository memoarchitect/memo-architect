import { ContextWorkbench } from './ContextWorkbench';
import { OperationalWorkbench } from './OperationalWorkbench';
import { FunctionalWorkbench } from './FunctionalWorkbench';
import { LogicalResponsibilities } from './LogicalResponsibilities';
import { ImplementationLinks } from './ImplementationLinks';
import { DisciplineGuides } from './DisciplineGuides';
import type { DisciplineMode } from '../lib/discipline-guides';
import { DeploymentLinks, DeploymentWorkbench } from './DeploymentWorkbench';
import { LayerElementBrowser } from './LayerElementBrowser';
import { functionalDisplayIds, functionalScope, functionalStructure, functionalScopes, operationalConforms, operationalWorkLevel, functionalCatalog, functionalFlowsInScope } from '@memoarchitect/tools/browser';
import { createNativeFunction } from '../lib/functional-authoring';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { useGuideEvaluation } from '../lib/use-guide';
import { axesOf, currentStep, diagramTypeFor, elementsOfKinds, kindsOfLayer, layerViews, scopePath, scopeTree, stepsOfLayer, type GuideLayer } from '../lib/pathways';
import { words, type GuideStepStatus } from '../lib/guide-view';
import { idsInWorkspace, workspaceOptions } from '../lib/workspace-scope';
import { isFeatureEnabled } from '../config/feature-flags';
import { AddRelationshipDialog } from '../components/AddRelationshipDialog';
import { askText } from '../components/AppDialogs';
import { COLOR, FONT } from '../styles/tokens';
import { viewToPath } from '../view-routes';
import { diagramUrl, elementUrl } from '../router';
import { PaletteKindsContext } from './DiagramPalette';
import { DiagramDisplayScope } from '../diagram/display-scope';

const DiagramCanvas = lazy(() => import('./DiagramCanvas').then(module => ({ default: module.DiagramCanvas })));
const DiagramEditor = lazy(() => import('./DiagramEditor').then(module => ({ default: module.DiagramEditor })));
const button: CSSProperties = { border: `1px solid ${COLOR.border}`, borderRadius: 6, background: '#fff', color: COLOR.primary, padding: '7px 10px', cursor: 'pointer', font: 'inherit', fontSize: FONT.sm };
const link: CSSProperties = { border: 0, padding: '4px 0', background: 'transparent', textAlign: 'left', color: '#0f766e', cursor: 'pointer', font: 'inherit', fontSize: FONT.sm };
const panel: CSSProperties = { padding: 16, overflow: 'auto', flexShrink: 0, background: '#fff' };
type Viewpoint = GuideLayer['viewpoints'][number];

/** The method's guidance and the authored editor share a layer and a working scope. */
export function GuidedLayer({ layer }: { layer: string }) {
    const navigate = useNavigate();
    const model = useModelStore(s => s.model);
    const guide = useModelStore(s => s.guide);
    const workspace = useModelStore(s => s.workspace);
    const setWorkspace = useModelStore(s => s.setWorkspace);
    const lastStep = useModelStore(s => s.lastStep);
    const setLastStep = useModelStore(s => s.setLastStep);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const createDiagram = useModelStore(s => s.createDiagram);
    const selectElement = useModelStore(s => s.selectElement);
    const createRelationship = useModelStore(s => s.createRelationship);
    const pinned = useModelStore(s => s.pinned);
    const connected = useModelStore(s => s.connected);
    const problem = useGuideEvaluation();
    const [railOpen, setRailOpen] = useState(true);
    useEffect(() => setRailOpen(true), [layer]);
    const [viewpointsOpen, setViewpointsOpen] = useState(true);
    const [browserTab, setBrowserTab] = useState<'elements' | 'views'>('elements');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [linkFrom, setLinkFrom] = useState<string | null>(null);
    const row = guide?.layers.find(candidate => candidate.name === layer);
    const contextWorkbench = row?.name === 'layerContext';
    const operationalLayer = guide?.layers.find(candidate => candidate.workbench === 'operational');
    const taskWorkbench = row?.workbench === 'functional' || row?.workbench === 'operational';
    const steps = useMemo(() => guide && row ? stepsOfLayer(guide, row) : [], [guide, row]);
    const step = currentStep(steps, lastStep);
    const options = useMemo(() => workspaceOptions(model?.workspaceMembership), [model?.workspaceMembership]);
    const chosen = options.find(candidate => candidate.root === workspace);
    const operationalEntry = activeView.type === 'pathway' && activeView.layer === layer ? activeView : undefined;
    // A selection made inside a workbench is written to the address so a bookmark or Back returns to it. That write
    // must not remount the workbench, so the key stays the one it was opened with until a link brings other work.
    // A selection the workbench made itself keeps it mounted; any other address (a link, Back, Forward) opens it afresh,
    // including a return to the address it was first opened with.
    const followed = useRef<{ key: string; entry: string }>();
    const opened = useRef<{ key: string; entry: string }>();
    const openings = useRef(0);
    const entryKey = JSON.stringify([row?.id, operationalEntry?.work, operationalEntry?.artifactId, operationalEntry?.createCase]);
    if (followed.current?.entry !== entryKey && opened.current?.entry !== entryKey) {
        followed.current = undefined;
        opened.current = { entry: entryKey, key: `${entryKey}#${openings.current++}` };
    }
    const operationalKey = followed.current?.entry === entryKey ? followed.current.key : opened.current!.key;
    const renderedKey = useRef(operationalKey); renderedKey.current = operationalKey;
    const follow = useCallback((artifactId: string | undefined, work?: 'clinical' | 'operational') => {
        const current = useModelStore.getState().activeView;
        if (current.type !== 'pathway' || current.layer !== layer) return;
        if (current.artifactId === artifactId && (!work || current.work === work) && !current.createCase) return;
        const next = { type: 'pathway' as const, layer, ...(current.diagramId ? { diagramId: current.diagramId } : {}), ...(work ?? current.work ? { work: work ?? current.work } : {}), ...(artifactId ? { artifactId } : {}) };
        followed.current = { key: renderedKey.current, entry: JSON.stringify([row?.id, next.work, next.artifactId, undefined]) };
        opened.current = undefined;
        setActiveView(next);
    }, [layer, row?.id, setActiveView]);
    const [levelSelection, setLevelSelection] = useState<{ key: string; level: 'clinical' | 'operational' }>();
    const onOperationalLevel = useCallback((level: 'clinical' | 'operational') => {
        setLevelSelection(previous => previous?.key === operationalKey && previous.level === level ? previous : { key: operationalKey, level });
    }, [operationalKey]);
    const operationalMode = levelSelection?.key === operationalKey ? levelSelection.level
        : operationalEntry?.work ?? row?.tasks?.[0]?.level;
    const operationalWorkbench = row?.workbench === 'operational';
    const requiresSystem = contextWorkbench || (operationalWorkbench && operationalMode === 'operational');
    const showScope = !operationalWorkbench || requiresSystem;
    const defaultSystemScope = requiresSystem && !chosen ? options[0] : undefined;
    useEffect(() => {
        if (defaultSystemScope) setWorkspace(defaultSystemScope.root);
    }, [defaultSystemScope, setWorkspace]);
    const scope = model && chosen ? scopePath(scopeTree(model), chosen.root).map(node => node.name).join(' › ') || chosen.name
        : requiresSystem ? defaultSystemScope?.name ?? 'Choose a system boundary' : workspace ? 'Loading selected system…' : 'Whole model';
    const inScope = useMemo(() => { const ids = idsInWorkspace(model?.workspaceMembership, workspace); return model && workspace && ids ? functionalDisplayIds(model, workspace, ids) : ids; }, [model, workspace]);
    const views = useMemo(() => model && row ? layerViews(model, row).filter(({ diagram }) => !inScope
        || diagram.elementIds?.some(id => inScope.has(id) || id === workspace)) : [], [model, row, inScope, workspace]);
    const uniqueViews = useMemo(() => [...new Map(views.map(view => [view.diagram.id, view])).values()], [views]);
    const requested = activeView.type === 'pathway' && activeView.layer === layer ? activeView.diagramId : undefined;
    const preferredKind = row?.viewpoints.find(viewpoint => viewpoint.name === step?.guideViewpoint)?.viewKind;
    const openView = uniqueViews.find(view => view.diagram.id === requested)
        ?? uniqueViews.find(view => view.viewpoint.name === step?.guideViewpoint)
        ?? uniqueViews.find(view => preferredKind && view.diagram.viewKind === preferredKind) ?? uniqueViews[0];
    // A project may attach its authored context diagram to a custom viewpoint.
    const [boundaryChoice, setBoundaryChoice] = useState<string>();
    const contextDiagrams = contextWorkbench ? model?.diagrams?.filter(diagram => diagram.diagramType === 'context') : undefined;
    const diagramBoundary = (diagram: NonNullable<typeof contextDiagrams>[number]) => {
        const ids = [diagram.properties?.subjectElement, ...(diagram.elementIds ?? [])];
        return ids.find(id => id && model && (operationalConforms(model, id, 'SystemOfSystems') || operationalConforms(model, id, 'System')));
    };
    const requestedArtifact = activeView.type === 'pathway' && activeView.layer === layer ? activeView.artifactId : undefined;
    const boundaryId = chosen?.root ?? boundaryChoice ?? requestedArtifact
        ?? (contextDiagrams?.length ? diagramBoundary(contextDiagrams[0]) : undefined);
    // An authored product context can orient a reader working on a child system.
    // Keep its subject explicit and prefer a diagram authored for the selected system.
    const contextAncestors = new Map<string, number>();
    if (contextWorkbench && model && boundaryId) {
        const definitions = model.workspaceMembership?.definitionOf ?? {};
        const paths = scopePath(scopeTree(model), boundaryId);
        paths.slice(0, -1).reverse().forEach((node, index) => contextAncestors.set(node.root, index + 1));
        for (const element of Object.values(model.elements)) {
            if (element.id !== boundaryId && definitions[element.id] !== boundaryId) continue;
            const seen = new Set([element.id]);
            let parent = element.owner;
            for (let distance = 1; parent && !seen.has(parent); distance++) {
                seen.add(parent);
                for (const id of [parent, definitions[parent]]) {
                    if (id) contextAncestors.set(id, Math.min(contextAncestors.get(id) ?? Infinity, distance));
                }
                parent = model.elements[parent]?.owner;
            }
        }
    }
    const matchingContext = contextDiagrams?.flatMap(diagram => {
        const id = diagramBoundary(diagram);
        if (!id) return [];
        const definition = model?.workspaceMembership?.definitionOf[id] ?? id;
        const distance = id === boundaryId || definition === boundaryId ? 0
            : Math.min(contextAncestors.get(id) ?? Infinity, contextAncestors.get(definition) ?? Infinity);
        return Number.isFinite(distance) ? [{ diagram, distance, subject: model?.elements[id]?.name }] : [];
    }).sort((a, b) => a.distance - b.distance);
    const contextView = matchingContext?.find(({ diagram }) => diagram.id === requested) ?? matchingContext?.[0];
    const contextDiagram = contextView?.diagram;
    const displayedDiagram = contextWorkbench ? contextDiagram : openView?.diagram;
    const paletteKinds = guide && row ? kindsOfLayer(guide, row) : [];
    const contextPalette = [...new Set([...paletteKinds, 'System', 'SystemOfSystems'])];
    const layerElements = model ? elementsOfKinds(model, paletteKinds, workspace) : [];
    const functionScope = model && workspace ? functionalScope(model, workspace) : undefined;
    const functionRoot = model && workspace ? functionalStructure(model, workspace).root : undefined;
    const admitsSystemFunctions = paletteKinds.includes('SystemFunction') || paletteKinds.includes('MemoFunction');
    const kindLabel = (kind: string) => model?.registries?.kinds.find(definition => definition.name === kind)?.label ?? words(kind);
    const canWrite = connected && !pinned;
    const goToRow = (name: string, diagramId?: string) => {
        const view = { type: 'pathway' as const, layer: name, ...(diagramId ? { diagramId } : {}) };
        setActiveView(view); navigate(viewToPath(view)!);
    };
    // Source follows the editor prop; the visual canvas follows this shared selection.
    useEffect(() => { if (!taskWorkbench) selectDiagram(displayedDiagram?.id ?? null); }, [displayedDiagram?.id, taskWorkbench, selectDiagram]);
    useEffect(() => { setNotice(null); setLinkFrom(null); }, [layer, workspace]);
    const openElement = (id: string) => {
        if (!model?.elements[id]) return;
        selectElement(id); navigate(elementUrl(model.elements[id]));
    };
    const advance = () => {
        const following = steps[steps.findIndex(candidate => candidate.id === step?.id) + 1];
        if (following) setLastStep(following.id);
    };
    const newView = async (viewpoint: Viewpoint) => {
        const subject = model?.elements[(contextWorkbench ? boundaryId : chosen?.root) ?? ''];
        if (!subject) { setNotice('Choose a system above before creating a view.'); return; }
        if (!canWrite || creating) return;
        setCreating(true); setNotice(null);
        const targetWorkspace = workspace;
        const baseName = `${subject.name} — ${viewpoint.label}`;
        let name = baseName;
        for (let suffix = 2; model.diagrams?.some(diagram => diagram.name === name); suffix++) name = `${baseName} ${suffix}`;
        let reason: string | undefined;
        try {
            const id = await createDiagram({ name, viewpointId: viewpoint.id,
                viewKind: viewpoint.viewKind ?? 'general', diagramType: contextWorkbench ? 'context' : diagramTypeFor(viewpoint.viewKind),
                elementIds: [subject.id], elementKinds: contextWorkbench ? contextPalette : paletteKinds, properties: { autoPopulate: 'false' }, activate: false, onError: message => { reason = message; } });
            if (!id) { setNotice(reason ?? 'The view could not be created. Check Problems for the compiler diagnostics.'); return; }
            const current = useModelStore.getState();
            if (current.activeView.type === 'pathway' && current.activeView.layer === layer && current.workspace === targetWorkspace) goToRow(layer, id);
        } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
        finally { setCreating(false); }
    };
    const goToOperational = (work: 'clinical' | 'operational', artifactId?: string, createCase?: boolean) => {
        if (!operationalLayer) return;
        useModelStore.getState().inspectElement(null);
        const view = { type: 'pathway' as const, layer: operationalLayer.name, work, artifactId, createCase };
        const path = viewToPath(view)!;
        const memberships = artifactId ? model?.workspaceMembership?.membership[artifactId] : undefined;
        const scope = memberships?.length && (!workspace || !memberships.includes(workspace)) ? memberships[0] : workspace;
        if (scope && scope !== workspace) setWorkspace(scope);
        setActiveView(view);
        navigate(scope ? `${path}&workspace=${encodeURIComponent(scope)}` : path);
    };
    const goToFunctional = (artifactId?: string) => {
        const functional = guide?.layers.find(candidate => candidate.workbench === 'functional');
        if (!functional) return;
        useModelStore.getState().inspectElement(null);
        const view = { type: 'pathway' as const, layer: functional.name, artifactId };
        const path = viewToPath(view)!;
        let scope = workspace;
        if (model && artifactId && (!scope || ![...functionalCatalog(model, scope), ...functionalFlowsInScope(model, scope)]
            .some(item => item.id === artifactId))) {
            const roots = functionalScopes(model).roots.get(artifactId);
            scope = roots?.values().next().value ?? model.workspaceMembership?.membership[artifactId]?.[0] ?? null;
        }
        if (scope !== workspace) setWorkspace(scope);
        setActiveView(view);
        navigate(scope ? `${path}${path.includes('?') ? '&' : '?'}workspace=${encodeURIComponent(scope)}` : path);
    };
    const goToStructuralArtifact = (layerName: 'layerLogical' | 'layerImplementation' | 'layerRealization', artifactId: string) => {
        const view = { type: 'pathway' as const, layer: layerName, artifactId };
        const path = viewToPath(view)!;
        useModelStore.getState().inspectElement(null);
        let scope = workspace;
        if (model) {
            const memberships = functionalScopes(model).roots.get(artifactId) ?? new Set(model.workspaceMembership?.membership[artifactId]);
            if (!scope || !memberships.has(scope)) scope = memberships.values().next().value ?? scope;
        }
        if (scope !== workspace) setWorkspace(scope);
        setActiveView(view);
        navigate(scope ? `${path}&workspace=${encodeURIComponent(scope)}` : path);
    };
    const goToLogical = (id: string) => goToStructuralArtifact('layerLogical', id);
    const goToImplementation = (id: string) => goToStructuralArtifact('layerImplementation', id);
    const goToDeployment = (id: string) => goToStructuralArtifact('layerRealization', id);
    const realizationLayer = guide?.layers.find(candidate => candidate.name === 'layerRealization');
    const engineeringLayer = layer === 'layerImplementation' || layer === 'layerRealization' ? layer : undefined;
    const [discipline, setDiscipline] = useState<{ layer: string; mode: DisciplineMode }>();
    const disciplineMode = discipline?.layer === layer ? discipline.mode : 'all';
    const implementationLayer = guide?.layers.find(candidate => candidate.name === 'layerImplementation');
    const addElement = async (kind: string) => {
        const name = await askText(`Name the ${kindLabel(kind).toLowerCase()}:`);
        if (name?.trim()) useModelStore.getState().addElement(kind, name.trim(), (workspace ? model?.elements[workspace]?.package : undefined) ?? '');
    };
    const newViewButton = (viewpoint: Viewpoint) => viewpoint.viewKind ? <button type="button" style={button} disabled={!canWrite || creating} onClick={() => void newView(viewpoint)}>{creating ? 'Creating view…' : `New ${viewpoint.label.toLowerCase()} view`}</button> : null;
    const elementButton = (id: string) => <button key={id} type="button" style={link} onClick={() => openElement(id)}>{model?.elements[id]?.name ?? id}</button>;
    const starting = steps.length > 0 && !steps.some(candidate => candidate.state === 'done');
    const inputs = model && steps[0] ? elementsOfKinds(model, steps[0].inputKinds, workspace) : [];
    const linksFor = (item: GuideStepStatus) => <StepLinks key={item.id} step={item} steps={guide?.steps ?? []} elementName={id => model?.elements[id]?.name ?? id} onElement={openElement} onLink={canWrite ? setLinkFrom : undefined} />;
    return <main data-testid="guided-layer" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: 'var(--color-bg)', color: COLOR.primary }}>
        <header style={{ padding: '12px 18px', borderBottom: `1px solid ${COLOR.border}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#fff' }}>
            <button type="button" style={link} onClick={() => { setActiveView({ type: 'guide' }); navigate('/method'); }}>‹ Method map</button>
            <label style={{ fontSize: FONT.sm }}>Layer{' '}<select aria-label="Layer" style={button} value={layer} onChange={event => goToRow(event.target.value)}>
                {axesOf(guide).map(axis => <optgroup key={axis} label={words(axis)}>{guide?.layers.filter(candidate => candidate.axis === axis).map(candidate => <option key={candidate.id} value={candidate.name}>{candidate.label}</option>)}</optgroup>)}
            </select></label>
            {showScope && <><label style={{ fontSize: FONT.sm }}>Working on{' '}<select aria-label="Working scope" disabled={!model?.workspaceMembership} style={{ ...button, maxWidth: 300 }} value={workspace ?? ''} onChange={event => setWorkspace(event.target.value || null)}>
                {requiresSystem ? <>
                    {!chosen && <option value={workspace ?? ''}>{defaultSystemScope ? 'Selecting system…' : 'Choose a system boundary'}</option>}
                    {(['sos', 'system'] as const).map(kind => options.some(option => option.scope === kind) &&
                        <optgroup key={kind} label={kind === 'sos' ? 'Systems of systems' : 'Systems'}>
                            {options.filter(option => option.scope === kind).map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                        </optgroup>)}
                </> : <>
                    <option value="">Whole model</option>
                    {workspace && !chosen && <option value={workspace}>Selected system (loading…)</option>}
                    {options.map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                </>}
            </select></label>
            <span data-testid="layer-scope" style={{ fontSize: FONT.xs, color: COLOR.muted }}>{scope}</span></>}<span style={{ flex: 1 }} />
            {!contextWorkbench && !taskWorkbench && steps.length > 0 && <button type="button" style={button} aria-expanded={railOpen} onClick={() => setRailOpen(value => !value)}>{railOpen ? 'Hide guidance' : 'Show guidance'}</button>}
            {!contextWorkbench && !taskWorkbench && <button type="button" style={button} aria-expanded={viewpointsOpen} onClick={() => setViewpointsOpen(value => !value)}>{viewpointsOpen ? 'Hide layer browser' : 'Show layer browser'}</button>}
        </header>
        {problem && <p role="alert" style={{ margin: 12, color: '#B42318' }}>{problem}</p>}{notice && <p role="status" style={{ margin: 12 }}>{notice}</p>}
        {!guide || !model || (workspace && !chosen) ? <p style={{ padding: 20 }}>Reading the method…</p> : !row ? <p style={{ padding: 20 }}>This layer is not part of the selected method. Choose another layer above.</p> : contextWorkbench ? <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <ContextWorkbench key={workspace ?? ''} model={model} workspace={workspace} canWrite={canWrite} guided
                boundaryId={boundaryId} onBoundary={setBoundaryChoice}
                diagram={contextDiagram} diagramSubject={contextView?.distance ? contextView.subject : undefined}
                diagramHref={contextDiagram ? `${diagramUrl(contextDiagram.diagramType ?? 'context', contextDiagram.id)}${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''}` : undefined}
                onOperational={operationalLayer ? goToOperational : undefined}
                onView={!contextDiagram && canWrite && boundaryId && row.viewpoints[0] && !creating ? () => void newView(row.viewpoints[0]) : undefined}
                canvas={contextDiagram ? <Suspense fallback={<p role="status">Opening context diagram…</p>}>
                    <DiagramCanvas key={contextDiagram.id} />
                </Suspense> : undefined} />
        </div> : row.workbench === 'operational' ? <OperationalWorkbench key={operationalKey} model={model} row={row}
            workspace={defaultSystemScope?.root ?? workspace} canWrite={canWrite} entry={operationalEntry} onLevelChange={onOperationalLevel} onSelection={follow}
            onFunctional={goToFunctional} onContext={guide.layers.some(candidate => candidate.name === 'layerContext') ? systemId => {
                useModelStore.getState().inspectElement(null);
                setWorkspace(systemId);
                const view = { type: 'pathway' as const, layer: 'layerContext' };
                setActiveView(view);
                navigate(`${viewToPath(view)}?workspace=${encodeURIComponent(systemId)}`);
            } : undefined} /> : row.workbench === 'functional' ? <FunctionalWorkbench key={operationalKey} model={model} row={row} workspace={workspace} canWrite={canWrite}
            artifactId={requestedArtifact} onSelection={follow} onFunctional={goToFunctional} onLogical={guide.layers.some(candidate => candidate.name === 'layerLogical') ? goToLogical : undefined} onOperational={operationalLayer ? id => { const level = operationalWorkLevel(model, id); if (level) goToOperational(level, id); } : undefined} /> : <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            {steps.length > 0 && railOpen && <aside aria-label="Layer guidance" data-testid="guide-rail" style={{ ...panel, width: 270, borderRight: `1px solid ${COLOR.border}` }}>
                <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{row.label}</h1><p style={{ fontSize: FONT.sm, color: COLOR.muted }}>{row.purpose}</p>
                {starting && <section aria-label="Start here" style={{ padding: 12, background: '#eef8f5', borderRadius: 8, marginBottom: 16 }}>
                    <h2 style={{ fontSize: FONT.md, margin: '0 0 8px' }}>Start here</h2>
                    {row.importable && isFeatureEnabled('import') && <button type="button" style={button} onClick={() => { setActiveView({ type: 'import' }); navigate('/import'); }}>Import…</button>}
                    {inputs.length > 0 && <><p style={{ fontSize: FONT.sm }}>Work from your existing {steps[0].inputKinds.map(kindLabel).join(', ').toLowerCase()}:</p><div style={{ display: 'grid' }}>{inputs.map(element => elementButton(element.id))}</div></>}
                    {row.viewpoints[0] && <div style={{ marginTop: 10 }}>{newViewButton(row.viewpoints[0])}</div>}
                </section>}
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>{steps.map((item, index) => <li key={item.id} style={{ borderLeft: `3px solid ${item.id === step?.id ? '#0f766e' : 'transparent'}`, padding: '10px 8px', background: item.id === step?.id ? '#eef8f5' : 'transparent', borderRadius: 4 }}>
                    <button type="button" style={{ ...link, color: COLOR.primary, fontWeight: item.id === step?.id ? 700 : 400 }} aria-current={item.id === step?.id ? 'step' : undefined} onClick={() => setLastStep(item.id)}><span aria-label={item.state === 'done' ? 'Done' : undefined}>{item.state === 'done' ? '✓' : index + 1}</span>{' '}{item.label ?? words(item.name)}</button>
                    {item.id === step?.id && <><p style={{ fontSize: FONT.sm, lineHeight: 1.6 }}>{item.objective}</p>{linksFor(item)}{item.exitCriteria && <p style={{ fontSize: FONT.sm }}>Done when: {item.exitCriteria}</p>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button type="button" style={button} disabled={index === steps.length - 1} onClick={advance}>Next step ›</button><button type="button" style={link} disabled={index === steps.length - 1} onClick={advance}>Skip for now</button></div>
                    </>}
                </li>)}</ol>
            </aside>}
            {(!railOpen || steps.length === 0) && <nav aria-label="Method layers" style={{ ...panel, width: 190, borderRight: `1px solid ${COLOR.border}` }}>{axesOf(guide).map(axis => <section key={axis}><h2 style={{ fontSize: FONT.sm }}>{words(axis)}</h2>{guide.layers.filter(candidate => candidate.axis === axis).map(candidate => <button type="button" key={candidate.id} aria-current={candidate.name === layer ? 'page' : undefined} style={{ ...link, display: 'block', fontWeight: candidate.name === layer ? 700 : 400 }} onClick={() => goToRow(candidate.name)}>{candidate.label}</button>)}</section>)}</nav>}
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                {(!railOpen || steps.length === 0) && <section aria-label="Your work" style={{ padding: 18 }}><h1 style={{ fontSize: 20, marginTop: 0 }}>{row.label}</h1><p>{row.purpose}</p><h2 style={{ fontSize: 18 }}>Your work</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{steps.map(item => <article key={item.id} style={{ background: '#fff', border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: 14 }}>
                        <h3 style={{ fontSize: FONT.md, marginTop: 0 }}>{item.label ?? words(item.name)}</h3><p style={{ fontSize: FONT.sm }}>{item.objective}</p>
                        <div style={{ display: 'grid', maxHeight: 150, overflow: 'auto' }}>{elementsOfKinds(model, item.outputKinds, workspace).map(element => elementButton(element.id))}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{item.outputKinds.map(kind => <button type="button" key={kind} style={button} disabled={!canWrite} onClick={() => void addElement(kind)}>+ {kindLabel(kind)}</button>)}</div>
                        {row.viewpoints.find(viewpoint => viewpoint.name === item.guideViewpoint) && <div style={{ marginTop: 8 }}>{newViewButton(row.viewpoints.find(viewpoint => viewpoint.name === item.guideViewpoint)!)}</div>}
                    </article>)}</div><h2 style={{ fontSize: 18 }}>Links with other teams</h2>{steps.some(item => item.links.length > 0) ? steps.filter(item => item.links.length > 0).map(linksFor) : <p style={{ fontSize: FONT.sm }}>This layer declares no cross-team link checks.</p>}
                </section>}
                {layer === 'layerLogical' && (chosen ? <LogicalResponsibilities key={`${chosen.root}:${requestedArtifact ?? ''}`} model={model}
                    workspace={chosen.root} artifactId={requestedArtifact} canWrite={canWrite} onSelect={goToLogical}
                    onFunctional={guide.layers.some(candidate => candidate.workbench === 'functional') ? goToFunctional : undefined}
                    implementationLinks={implementationLayer ? componentId => <ImplementationLinks key={componentId} logical model={model} workspace={chosen.root}
                        implementationKinds={kindsOfLayer(guide, implementationLayer)} artifactId={componentId} canWrite={canWrite}
                        onSelect={goToLogical} onPeer={goToImplementation} /> : undefined} />
                    : <p style={{ padding: 20 }}>Choose a system to work on component responsibilities.</p>)}
                {engineeringLayer && <DisciplineGuides key={`${engineeringLayer}:${model.metadata?.modelName ?? model.metadata?.projectName ?? ''}`}
                    layer={engineeringLayer} model={model} workspace={workspace} mode={disciplineMode}
                    onMode={mode => setDiscipline({ layer, mode })} onOpen={openElement} />}
                {layer === 'layerImplementation' && implementationLayer && <ImplementationLinks key={`${workspace ?? ''}:${requestedArtifact ?? ''}`}
                    logical={false} model={model} workspace={workspace} discipline={disciplineMode} implementationKinds={kindsOfLayer(guide, implementationLayer)}
                    artifactId={requestedArtifact} canWrite={canWrite} onSelect={goToImplementation}
                    onPeer={guide.layers.some(candidate => candidate.name === 'layerLogical') ? goToLogical : undefined}
                    deploymentLinks={realizationLayer && kindsOfLayer(guide, realizationLayer).includes('SoftwareDeploymentUnit') ? selected =>
                        <DeploymentLinks model={model} workspace={workspace} selected={selected} canWrite={canWrite}
                            direction="outgoing" onPeer={goToDeployment} /> : undefined} />}
                {layer === 'layerRealization' && paletteKinds.some(kind => ['SoftwareDeploymentUnit', 'ProcessingNode', 'RuntimeEnvironment'].includes(kind)) &&
                    <DeploymentWorkbench key={`${workspace ?? ''}:${requestedArtifact ?? ''}`} model={model} workspace={workspace}
                        artifactId={requestedArtifact} canWrite={canWrite} discipline={disciplineMode} realizationKinds={paletteKinds} onSelect={goToDeployment}
                        onModule={implementationLayer ? goToImplementation : undefined} />}
                {admitsSystemFunctions && chosen && <section aria-label="Parent function" style={{ padding: '8px 12px', background: '#eef8f5', fontSize: FONT.sm }}>Parent function: {functionRoot ? elementButton(functionRoot.id) : <button style={button} disabled={!canWrite} onClick={() => void createNativeFunction(chosen.root)}>Set up parent function</button>}</section>}
                <div role="tablist" aria-label="Views in this layer" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${COLOR.border}`, background: '#fff' }}>{uniqueViews.map(({ diagram }) => <button type="button" key={diagram.id} role="tab" aria-selected={diagram.id === openView?.diagram.id} style={{ ...button, background: diagram.id === openView?.diagram.id ? '#e8f8f3' : '#fff' }} onClick={() => goToRow(layer, diagram.id)}>{diagram.name}</button>)}</div>
                {openView ? <section aria-label={openView.diagram.name} style={{ display: 'flex', flex: 1, minHeight: 450, flexDirection: 'column' }}>{selectedDiagramId === openView.diagram.id && <Suspense fallback={<p style={{ padding: 18 }}>Opening view…</p>}><PaletteKindsContext.Provider value={paletteKinds}><DiagramDisplayScope.Provider value={workspace}><DiagramEditor key={`${openView.diagram.id}:${workspace ?? 'whole'}`} diagramId={openView.diagram.id} /></DiagramDisplayScope.Provider></PaletteKindsContext.Provider></Suspense>}</section> : <section style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 20 }}>Work in {row.label.toLowerCase()}</h2><p style={{ fontSize: FONT.sm }}>{row.purpose}</p><p style={{ fontSize: FONT.sm }}>There are no authored views for this layer in {chosen?.name ?? 'the whole model'} yet.</p>
                    {!chosen && <p style={{ fontSize: FONT.sm }}>Choose a system above to create its first view.</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{row.viewpoints.map(viewpoint => <div key={viewpoint.id}>{newViewButton(viewpoint)}</div>)}</div>
                    <h3 style={{ fontSize: FONT.md }}>Existing work</h3><div style={{ display: 'grid', maxHeight: 260, overflow: 'auto' }}>{elementsOfKinds(model, paletteKinds, workspace).map(element => elementButton(element.id))}</div>
                </section>}
            </div>
            {viewpointsOpen && <aside aria-label="Viewpoints in this layer" style={{ ...panel, width: 230, borderLeft: `1px solid ${COLOR.border}` }}><div role="tablist" aria-label="Layer browser"><button role="tab" aria-selected={browserTab === 'elements'} style={button} onClick={() => setBrowserTab('elements')}>Elements ({layerElements.length})</button><button role="tab" aria-selected={browserTab === 'views'} style={button} onClick={() => setBrowserTab('views')}>Viewpoints</button></div>
                {browserTab === 'elements' ? <LayerElementBrowser model={model} elements={layerElements} workspace={workspace} scopeLabel={chosen?.name ?? 'Whole model'} layerLabel={row.label} rootId={admitsSystemFunctions ? functionRoot?.id : undefined} shared={functionScope?.shared} context={functionScope?.context} unassigned={functionScope?.unassigned} canWrite={canWrite} kindLabel={kindLabel} onElement={openElement} /> : <><h2 style={{ fontSize: FONT.md, margin: '14px 0' }}>Viewpoints in this layer</h2>{row.viewpoints.filter(viewpoint => viewpoint.viewKind || views.some(view => view.viewpoint.id === viewpoint.id)).map(viewpoint => <section key={viewpoint.id} style={{ padding: '12px 8px', borderRadius: 6, background: viewpoint.name === step?.guideViewpoint ? '#eef8f5' : 'transparent', borderBottom: `1px solid ${COLOR.border}` }}>
                <h3 style={{ fontSize: FONT.sm, margin: 0 }}>{viewpoint.label}</h3><p style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '4px 0' }}>{viewpoint.viewKind ? `${words(viewpoint.viewKind)} view` : 'Existing authored views'}</p>{views.filter(view => view.viewpoint.id === viewpoint.id).map(({ diagram }) => <button type="button" key={diagram.id} style={{ ...link, display: 'block', fontWeight: diagram.id === openView?.diagram.id ? 700 : 400 }} onClick={() => goToRow(layer, diagram.id)}>{diagram.name}</button>)}<div style={{ marginTop: 8 }}>{newViewButton(viewpoint)}</div>
            </section>)}</>}</aside>}
        </div>}
        {linkFrom && model?.elements[linkFrom] && model.registries && <AddRelationshipDialog element={model.elements[linkFrom]} model={model} registries={model.registries} diagramId={openView?.diagram.id} onCancel={() => setLinkFrom(null)} onConfirm={request => createRelationship({ ...request, selectedElementId: linkFrom, diagramId: openView?.diagram.id })} />}
    </main>;
}

function StepLinks({ step, steps, elementName, onElement, onLink }: { step: GuideStepStatus; steps: GuideStepStatus[]; elementName: (id: string) => string; onElement: (id: string) => void; onLink?: (id: string) => void }) {
    return <div style={{ fontSize: FONT.sm }}>{step.links.map(item => <div key={item.rule} style={{ margin: '8px 0' }}>
        {item.state === 'ready' && <><p style={{ marginBottom: 4 }}>Ready to link:</p>{item.unlinked.map(id => <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><button type="button" style={link} onClick={() => onElement(id)}>{elementName(id)}</button>{onLink && <button type="button" style={link} onClick={() => onLink(id)}>Add link…</button>}</div>)}</>}
        {item.state === 'waiting' && <p>Waiting for {item.waitingFor.length ? item.waitingFor.map(id => { const producer = steps.find(candidate => candidate.id === id); return producer?.label ?? (producer ? words(producer.name) : 'the related work'); }).join(', ') : 'the related work to be modelled'}.</p>}
        {item.state === 'linked' && <p>The work is linked to the other layer.</p>}{item.state === 'unknown' && <p>This link check is unavailable in the selected methodology.</p>}
    </div>)}</div>;
}

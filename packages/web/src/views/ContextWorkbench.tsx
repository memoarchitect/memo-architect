import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { operationalCatalog, operationalConforms, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { sendElementCreate } from '../store/ws-client';
import { sysmlIdentifier } from '../authoring';
import { useModelStore } from '../store/model-store';
import { COLOR } from '../styles/tokens';
import { authoredBoundaryContext } from '../lib/context-boundary';
import { DiagramEmbedContext, type DiagramEmbed } from '../diagram/diagram-embed-context';
import { ControlIcon } from '../components/TraceControls';
import { GuidedContextSetup } from './GuidedContextSetup';
import './pathway-workbench.css';

const kinds = [
    ['System', 'System'],
    ['SystemOfSystems', 'System of systems'],
    ['OperationalEntity', 'Organization or care setting'],
    ['MemoActor', 'External actor'],
    ['User', 'User'],
] as const;
const boundary = { border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: 16, background: 'white' };

export function ContextWorkbench({ model, workspace, boundaryId, onBoundary, canWrite, guided, diagram, diagramSubject, diagramHref, onView, onOperational, canvas }: {
    model: MemoModelDTO;
    workspace: string | null;
    boundaryId?: string;
    onBoundary: (id: string) => void;
    canWrite: boolean;
    guided?: boolean;
    diagram?: { id: string; name: string; elementIds?: string[] };
    diagramSubject?: string;
    diagramHref?: string;
    onView?: () => void;
    canvas?: ReactNode;
    onOperational?: (level: 'clinical' | 'operational', artifactId?: string, createCase?: boolean) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [participantId, setParticipantId] = useState<string>();
    const system = model.elements[boundaryId ?? workspace ?? ''];
    const boundaryOptions = workspace ? [] : [...new Map([
        ...operationalCatalog(model, 'SystemOfSystems'), ...operationalCatalog(model, 'System'),
    ].map(element => [element.id, element])).values()];
    const definitionOf = model.workspaceMembership?.definitionOf ?? {};
    const cases = system ? operationalCatalog(model, 'OperationalUseCase').filter(goal => model.relationships.some(
        edge => edge.type === 'hasSubject' && edge.sourceId === goal.id && (edge.targetId === system.id || definitionOf[edge.targetId] === system.id),
    )) : [];
    const context = authoredBoundaryContext(model, system?.id ?? '');
    const participants = [...context.participants.keys()].flatMap(id => {
        const element = model.elements[id];
        return element && !element.isDefinition ? [element] : [];
    });
    const participantName = (item: typeof participants[number]) => {
        if (item.name !== (item.shortName ?? item.id.split('::').at(-1))) return item.name;
        const definition = definitionOf[item.id] ?? item.provenance?.classifier?.qualifiedName ?? '';
        return model.elements[definition]?.name ?? item.name;
    };
    const selected = participants.find(item => item.id === participantId) ?? system;
    const systems = participants.filter(item => operationalConforms(model, item.id, 'System') || operationalConforms(model, item.id, 'SystemOfSystems'));
    const people = participants.filter(item => !systems.includes(item));
    const [selection, setSelection] = useState<Parameters<NonNullable<DiagramEmbed['onExplore']>>[0]>();
    const interaction = selection?.type === 'relationship' ? model.relationships.find(edge => edge.id === selection.id) : undefined;
    const focus = selection?.type === 'element' ? model.elements[selection.id] : undefined;
    const focusLabels = focus ? [...(context.participants.get(focus.id) ?? [])] : [];
    const setting = context.settings[0];
    const diagramParticipants = [...new Set([...(diagram?.elementIds ?? []), ...participants.map(item => item.id)])]
        .flatMap(id => model.elements[id] ? [model.elements[id]] : [])
        .filter(item => item.id !== system?.id && ['User', 'MemoActor', 'OperationalEntity', 'System', 'SystemOfSystems']
            .some(kind => operationalConforms(model, item.id, kind)))
        .sort((a, b) => participantName(a).localeCompare(participantName(b)));
    const [detailsOpen, setDetailsOpen] = useState(false);
    const showSetup = guided && system;
    const showParticipants = (label: string, items: typeof participants) => items.length > 0 && <div>
        <h3 style={{ fontSize: 13, margin: '12px 0 6px' }}>{label}</h3>
        <div className="pathway-icon-grid pathway-icon-grid--context">{items.map(item =>
            <button key={item.id} type="button" className="pathway-icon-tile" aria-pressed={selected?.id === item.id} onClick={() => setParticipantId(item.id)}>
                <span className="pathway-icon" aria-hidden="true">{systems.includes(item) ? ControlIcon.system : ControlIcon.person}</span>
                <strong>{participantName(item)}</strong>
                {context.participants.get(item.id)?.size ? <small style={{ display: 'block' }}>{[...context.participants.get(item.id)!].join(' · ')}</small> : null}
            </button>)}</div>
    </div>;
    return <section className={`pathway-workspace pathway-context-workspace${showSetup ? ' pathway-context-workspace--studio' : ''}`} aria-label="System context">
        {!showSetup && <header className="pathway-header">
            <div><h1>System context</h1>
                <p>{system?.name ?? 'Choose a system to see its setting and interactions.'}</p></div>
            <div className="pathway-context-actions">
                {onOperational && !diagram && !showSetup && <button type="button" className={`pathway-button${system ? ' pathway-button--primary' : ''}`} onClick={() => onOperational('clinical')}>Continue to clinical use cases <span aria-hidden="true">→</span></button>}
            </div>
        </header>}
        {showSetup && <GuidedContextSetup key={system.id} model={model} system={system} canWrite={canWrite}
            diagram={diagram} diagramSubject={diagramSubject} diagramHref={diagramHref} onCreateDiagram={onView}
            onClinical={onOperational && (() => onOperational('clinical'))}
            onSystemGoals={onOperational && (() => onOperational('operational'))} />}
        {!showSetup && diagram && system && <section className="pathway-context-diagram" aria-label="Context diagram">
            <header>
                <div><h2>{diagram.name}</h2>{diagramSubject && <p>Wider context for {diagramSubject}</p>}</div>
                <button type="button" className="pathway-button" aria-controls="context-facts" aria-expanded={detailsOpen}
                    onClick={() => setDetailsOpen(open => !open)}>{detailsOpen ? 'Hide context details' : 'Show context details'}</button>
            </header>
            <div className="pathway-context-explorer">
                <div className="pathway-context-canvas" aria-label={diagram.name}>
                    <DiagramEmbedContext.Provider value={{ diagramId: diagram.id, readOnly: true, onExplore: setSelection }}>
                        {canvas}
                    </DiagramEmbedContext.Provider>
                </div>
                <aside className="pathway-context-inspector" aria-label="Explore the system context">
                    <div className="pathway-context-inspector-head">
                        <h3>{guided ? 'Check the system boundary' : 'Explore the boundary'}</h3>
                        <p>{guided
                            ? 'Check where this system is used, who interacts with it, and what they exchange. Select a person, system, or connection to review it.'
                            : 'Select a person, system, or connection to see its details.'}</p>
                        <label>Find a participant
                            <select value={diagramParticipants.some(item => item.id === focus?.id) ? focus?.id : ''} onChange={event => setSelection(
                                event.target.value ? { type: 'element', id: event.target.value } : undefined)}>
                                <option value="">Choose a person or system</option>
                                {diagramParticipants.map(item => <option key={item.id} value={item.id}>{participantName(item)}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="pathway-context-selection" aria-live="polite">
                        {interaction ? <>
                            <h3>{interaction.attributes?.interactionLabel || interaction.type}</h3>
                            <p>{model.elements[interaction.sourceId]?.name} → {model.elements[interaction.targetId]?.name}</p>
                        </> : focus ? <>
                            <h3>{participantName(focus)}</h3>
                            {focusLabels.length ? <p>{focusLabels.join(' · ')}</p> : focus.id !== system.id && diagramSubject
                                ? <p>No direct interaction with {system.name} is recorded for this element.</p> : null}
                            {focus.doc && <p>{focus.doc}</p>}
                        </> : <>
                            <h3>Where it’s used</h3>
                            <p>{setting?.attributes.careSetting || setting?.attributes.environment || setting?.name || 'No setting recorded for this system.'}</p>
                        </>}
                        {(focus || interaction) && <button className="pathway-button" type="button" onClick={() => setSelection(undefined)}>Clear selection</button>}
                    </div>
                    <div className="pathway-context-next">
                        <h3>{guided ? 'Next: define the goals' : 'System goals'}</h3>
                        {guided && <p>Once the boundary is clear, describe what people need to accomplish.</p>}
                        {onOperational && cases.map(goal => <button className="pathway-resource" type="button" key={goal.id} onClick={() => onOperational('operational', goal.id)}>
                            <strong>{goal.name}</strong>
                        </button>)}
                        {onOperational && <button className="pathway-button pathway-button--primary" type="button" onClick={() => onOperational('clinical')}>{guided ? 'Continue to clinical use cases' : 'Explore clinical goals'} →</button>}
                        {diagramHref && <Link className="pathway-button" to={diagramHref}>{canWrite ? 'Edit boundary and interactions' : 'Open full diagram'}</Link>}
                    </div>
                </aside>
            </div>
        </section>}
        {!showSetup && <div id="context-facts" hidden={Boolean(diagram && system && !detailsOpen)}>
        <div className="pathway-toolbar" style={{ margin: '0 0 16px' }}>
            {boundaryOptions.length > 0 ? <label>Boundary{' '}<select className="pathway-button" value={system?.id ?? ''} onChange={event => onBoundary(event.target.value)}>
                <option value="">Choose a system boundary…</option>
                {boundaryOptions.map(element => <option key={element.id} value={element.id}>{element.name}</option>)}
            </select></label> : <strong>System boundary</strong>}
            <div className="pathway-segments">
                {canWrite && <button type="button" aria-expanded={adding} onClick={() => setAdding(!adding)}>{adding ? 'Close form' : system ? '+ Add participant' : '+ Add system or participant'}</button>}
                {onView && <button type="button" onClick={onView}>Save a context diagram</button>}
            </div>
        </div>
        {adding && <ContextCreate key={system?.id ?? ''} model={model} workspace={workspace} boundaryId={system?.id} canWrite={canWrite}
            onCreate={id => { if (!workspace) onBoundary(id); }} />}
        {system ? <div className="pathway-columns pathway-columns--canvas">
            <section aria-label="Boundary overview" style={{ ...boundary, minWidth: 0 }}>
                {context.settings.map(setting => <section key={setting.id} className="pathway-setting" aria-label={setting.name}>
                    <h3><span className="pathway-icon" aria-hidden="true">{ControlIcon.location}</span>{setting.name}</h3>
                    <dl>{([['careSetting', 'Care setting'], ['environment', 'Environment'], ['jurisdiction', 'Jurisdiction'], ['connectedUse', 'Connected use']] as const)
                        .filter(([key]) => setting.attributes[key] !== undefined).map(([key, label]) =>
                            <div key={key} style={{ marginTop: 8 }}><dt style={{ fontWeight: 600 }}>{label}</dt><dd>{setting.attributes[key]}</dd></div>)}</dl>
                    {setting.doc && <details style={{ marginTop: 8 }}><summary>Context description</summary><p>{setting.doc}</p></details>}
                </section>)}
                {!diagram && <div>
                    <div className="pathway-context-banner"><button type="button" className="pathway-button" aria-pressed={selected?.id === system.id} onClick={() => setParticipantId(undefined)}>{ControlIcon.system} {system.name}</button></div>
                    {showParticipants('People and organizations', people)}
                    {showParticipants('Neighboring systems', systems)}
                    {!participants.length && !context.settings.length && <p style={{ margin: '0 0 16px' }}>Add the people or systems involved in this boundary.</p>}
                </div>}
                {diagram && participants.length > 0 && <details className="pathway-related">
                    <summary>Participants ({participants.length})</summary>
                    {showParticipants('People and organizations', people)}
                    {showParticipants('Neighboring systems', systems)}
                </details>}
            </section>
            <section aria-label="Related operational work" style={boundary}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Related system goals</h2>
                {cases.length ? <div className="pathway-resources">{cases.map(goal => <button key={goal.id} className="pathway-resource" type="button" disabled={!onOperational}
                    onClick={() => onOperational?.('operational', goal.id)}><span><strong>{goal.name}</strong>{goal.attributes.goalStatement && <small>{goal.attributes.goalStatement}</small>}</span></button>)}</div>
                    : <p>No related system goals are recorded here yet.</p>}
                {canWrite && workspace && onOperational && <button className="pathway-button" style={{ marginTop: 12 }} type="button" onClick={() => onOperational('operational', undefined, true)}>Add an operational use case</button>}
                {selected?.file && <details className="pathway-related"><summary>Model details</summary><p>{selected.name}</p><code style={{ overflowWrap: 'anywhere' }}>{selected.file}</code></details>}
            </section>
        </div> : <div className="pathway-context-preview"><strong>Choose a system boundary</strong><p>Use the boundary menu or choose a system in Working on.</p></div>}
        </div>}
    </section>;
}

function ContextCreate({ model, workspace, boundaryId, canWrite, onCreate }: {
    model: MemoModelDTO; workspace: string | null; boundaryId?: string; canWrite: boolean; onCreate: (id: string) => void;
}) {
    const system = model.elements[boundaryId ?? ''];
    const available = kinds.filter(([kind]) => model.registries?.kinds.some(definition => definition.name === kind));
    const [kind, setKind] = useState<string>((system ? available.find(([kind]) => kind === 'MemoActor') : available.find(([kind]) => kind === 'System'))?.[0] ?? available[0]?.[0] ?? '');
    const [name, setName] = useState('');
    const [destination, setDestination] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const sources = [...new Map(Object.values(model.elements).flatMap(element => element.package && element.file && element.provenance?.declaration.writable
        ? [[JSON.stringify([element.file, element.package]), element] as const] : [])).entries()];
    const defaultDestination = sources.find(([, element]) => element.file === system?.file && element.package === system?.package)?.[0];
    const home = sources.find(([key]) => key === (destination || defaultDestination))?.[1];
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canWrite || !home || !kind || !name.trim() || busy) return;
        const state = useModelStore.getState();
        if (!state.connected || state.pinned || state.workspace !== workspace) return;
        const prefix = `${home.package}::`;
        const siblings = Object.keys(state.model?.elements ?? {}).filter(id => id.startsWith(prefix)).map(id => id.slice(prefix.length));
        const shortName = sysmlIdentifier(name.trim(), siblings);
        setBusy(true);
        setNotice('');
        try {
            const result = await sendElementCreate({ id: `${prefix}${shortName}`, shortName, name: name.trim(), kind,
                construct: 'part', package: home.package, file: home.file, attributes: {} });
            if (!result.success) throw new Error(result.error ?? 'The participant could not be saved.');
            setName('');
            setNotice(`Saved to ${result.sourceFile ?? home.file}.`);
            if (kind === 'System' || kind === 'SystemOfSystems') onCreate(`${prefix}${shortName}`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };
    return <form onSubmit={submit} style={{ ...boundary, display: 'grid', gap: 10 }}>
        <label>Kind <select aria-label="Participant kind" value={kind} onChange={event => setKind(event.target.value)}>{available.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Name <input required value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Save in <select required value={destination || defaultDestination || ''} onChange={event => setDestination(event.target.value)}>
            <option value="">Choose a writable package…</option>
            {sources.map(([key, element]) => <option key={key} value={key}>{element.package} · {element.file}</option>)}
        </select></label>
        {!sources.length && <p>Open a writable project package before adding a participant.</p>}
        <div><button disabled={!canWrite || busy || !kind || !home || !name.trim()}>{busy ? 'Saving…' : kind === 'System' || kind === 'SystemOfSystems' ? 'Save system' : 'Save participant'}</button></div>
        {notice && <p role="status">{notice}</p>}
    </form>;
}

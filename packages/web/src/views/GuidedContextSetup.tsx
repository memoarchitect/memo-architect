import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PathwayPartCreate } from './PathwayPartCreate';
import { ScopedContextDiagram } from './ScopedContextDiagram';
import type { DiagramEmbed } from '../diagram/diagram-embed-context';
import { operationalCatalog, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { scopePath, scopeTree } from '../lib/pathways';
import { elementUrl } from '../router';
import { confirmDialog } from '../components/AppDialogs';
import { ControlIcon } from '../components/TraceControls';
import { useModelStore, type RelationshipCreateInput } from '../store/model-store';

type Element = MemoModelDTO['elements'][string];
type Relationship = MemoModelDTO['relationships'][number];
type Category = 'actor' | 'system' | 'setting' | 'environment';
const headings = { actor: 'Actors', system: 'External systems', setting: 'Use contexts' };
const labels = { actor: 'actor', system: 'external system', setting: 'use context', environment: 'environment' };

const creationKinds = { actor: ['MemoActor', 'User'], system: ['System'], setting: ['UseContext'], environment: ['UseEnvironment'] };

export function GuidedContextSetup({ model, system, canWrite, diagram, diagramSubject, diagramHref, onCreateDiagram, onClinical, onSystemGoals }: {
    model: MemoModelDTO; system: Element; canWrite: boolean;
    diagram?: { id: string; name: string }; diagramSubject?: string; diagramHref?: string;
    onCreateDiagram?: () => void; onClinical?: () => void; onSystemGoals?: () => void;
}) {
    const [view, setView] = useState<'diagram' | 'table'>('diagram');
    const [selection, setSelection] = useState<Parameters<NonNullable<DiagramEmbed['onExplore']>>[0]>();
    const [picker, setPicker] = useState<{ category: Category; settingId?: string }>();
    const [removing, setRemoving] = useState<Category>();
    const [candidateId, setCandidateId] = useState('');
    const [boundaryId, setBoundaryId] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ error: boolean; message: string }>();
    const definitionOf = model.workspaceMembership?.definitionOf ?? {};
    const nameOf = (element: Element) => element.name === (element.shortName ?? element.id.split('::').at(-1))
        ? model.elements[definitionOf[element.id] ?? element.provenance?.classifier?.qualifiedName ?? '']?.name ?? element.name
        : element.name;
    const targets = system.isDefinition
        ? Object.entries(definitionOf).filter(([id, definition]) => definition === system.id && model.elements[id] && !model.elements[id].isDefinition)
            .map(([id]) => model.elements[id]).sort((a, b) => a.id.localeCompare(b.id))
        : [system];
    const scopeIds = new Set([system.id, ...targets.map(item => item.id)]);
    const relations = model.relationships.filter(edge => scopeIds.has(edge.targetId) && model.elements[edge.sourceId]);
    const interactions = relations.filter(edge => edge.type.toLowerCase() === 'interactsincontext');
    const settings = relations.filter(edge => edge.type.toLowerCase() === 'appliesincontext');
    const systemIds = new Set(['System', 'SystemOfSystems'].flatMap(kind => operationalCatalog(model, kind).map(element => element.id)));
    const forSetting = (id: string) => model.relationships.filter(edge => edge.sourceId === id
        && edge.type.toLowerCase() === 'situatedin' && model.elements[edge.targetId]);
    const choices = picker ? [
        ...new Map((picker.category === 'actor' ? ['User', 'MemoActor', 'OperationalEntity']
            : picker.category === 'system' ? ['System', 'SystemOfSystems']
            : picker.category === 'setting' ? ['UseContext'] : ['UseEnvironment'])
            .flatMap(kind => operationalCatalog(model, kind)).map(element => [element.id, element])).values(),
    ].filter(element => !scopeIds.has(element.id)
        && !(picker.category === 'setting' ? settings : interactions).some(edge => edge.sourceId === element.id)
        && (!picker.settingId || !forSetting(picker.settingId).some(edge => edge.targetId === element.id))
        && (picker.category !== 'actor' || !systemIds.has(element.id)))
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b))) : [];
    const settingIds = [...new Set(settings.map(edge => edge.sourceId))];
    const openPicker = (category: Category, settingId?: string) => {
        const linkedTargets = [...new Set([...interactions, ...settings].map(edge => edge.targetId))]
            .filter(id => targets.some(target => target.id === id));
        setBoundaryId(targets.length === 1 ? targets[0].id : linkedTargets.length === 1 ? linkedTargets[0] : '');
        setCandidateId('');
        setNotice(undefined);
        setRemoving(undefined);
        setPicker({ category, settingId });
    };
    const readyToWrite = () => {
        const state = useModelStore.getState();
        return canWrite && state.connected && !state.pinned && state.model === model;
    };
    const save = async (action: () => Promise<{ success: boolean; error?: string }>, success: string) => {
        setBusy(true);
        setNotice(undefined);
        try {
            const outcome = await action();
            setNotice(outcome.success ? { error: false, message: success }
                : { error: true, message: outcome.error ?? 'The change could not be saved.' });
            return outcome.success;
        } finally { setBusy(false); }
    };
    const linkContext = async (id: string, created = false) => {
        if (!picker) return;
        const current = useModelStore.getState();
        if (!current.connected || current.pinned || !current.model?.elements[id]) return;
        const request: RelationshipCreateInput | undefined = picker.settingId
            ? { type: 'situatedIn', direction: 'outgoing', sourceId: picker.settingId, targetId: id }
            : targets.some(target => target.id === boundaryId)
                ? { type: picker.category === 'setting' ? 'appliesInContext' : 'interactsInContext',
                    direction: 'incoming', sourceId: id, targetId: boundaryId }
                : undefined;
        if (!request) return;
        if (await save(async () => {
            const result = await useModelStore.getState().createRelationship(request);
            return !result.success && created ? { ...result, error: `Created the item. Linking failed. ${result.error ?? 'Use Add link to retry.'}` } : result;
        }, created ? 'Item created and linked.' : 'Link added.')) {
            setPicker(active => active === picker ? undefined : active);
        } else if (created) {
            setCandidateId(id);
        }
    };
    const add = async (event: FormEvent) => {
        event.preventDefault();
        if (!picker || busy || !readyToWrite() || !choices.some(item => item.id === candidateId)) return;
        await linkContext(candidateId);
    };
    const remove = async (edge: Relationship, name: string) => {
        if (busy || !readyToWrite()) return;
        setBusy(true);
        try {
            if (!await confirmDialog({ title: `Remove ${name}?`, message: 'This removes the link. The element stays in the model.',
                confirmLabel: 'Remove link', danger: true }) || !readyToWrite()) return;
            if (await save(() => useModelStore.getState().deleteRelationship(edge.id), 'Link removed.')) setRemoving(undefined);
        } finally { setBusy(false); }
    };
    const removeButton = (edge: Relationship, name: string) => canWrite && <button type="button"
        className="pathway-context-remove" aria-label={`Remove ${name}`} disabled={busy}
        onClick={() => void remove(edge, name)}>Remove</button>;

    const sections = [
        { category: 'actor' as const, icon: ControlIcon.person, rows: interactions.filter(edge => !systemIds.has(edge.sourceId)), empty: 'No actors linked.' },
        { category: 'system' as const, icon: ControlIcon.system, rows: interactions.filter(edge => systemIds.has(edge.sourceId)), empty: 'No external systems linked.' },
        { category: 'setting' as const, icon: ControlIcon.location, rows: settings, empty: 'No use context linked.' },
    ];
    const showLinkOptions = picker && (choices.length > 0 || (!picker.settingId && targets.length !== 1)
        || (picker.category === 'environment' && settingIds.length > 1));
    const form = picker && showLinkOptions && <div className="pathway-context-link-form">
        {picker.category === 'environment' && settingIds.length > 1 && <label>Use context
            <select required value={picker.settingId} onChange={event => {
                setPicker({ category: 'environment', settingId: event.target.value });
                setCandidateId('');
            }}>
                {settingIds.map(id => <option key={id} value={id}>{nameOf(model.elements[id])}</option>)}
            </select>
        </label>}
        {!picker.settingId && targets.length > 1 && <label>System occurrence
            <select required value={boundaryId} onChange={event => setBoundaryId(event.target.value)}>
                <option value="">Choose where this system is used</option>
                {targets.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}
            </select>
        </label>}
        {!picker.settingId && !targets.length && <p>Create an occurrence of this system before linking its context.</p>}
        {choices.length > 0 && <form onSubmit={add} aria-label={`Add ${labels[picker.category]}`}>
            <label>{`Choose an existing ${labels[picker.category]}`}
                <select required value={candidateId} onChange={event => setCandidateId(event.target.value)}>
                    <option value="">Select from the model</option>
                    {choices.map(item => <option key={item.id} value={item.id}>{nameOf(item)}{item.package ? ` · ${item.package}` : ''}</option>)}
                </select>
            </label>
            <button className="pathway-button pathway-button--primary" disabled={busy || !candidateId || (!picker.settingId && !boundaryId)}>Add link</button>
            <button type="button" className="pathway-button" disabled={busy} onClick={() => setPicker(undefined)}>Cancel</button>
        </form>}
    </div>;

    const removalRows = removing === 'environment' ? settingIds.flatMap(forSetting)
        : sections.find(section => section.category === removing)?.rows ?? [];
    const table = <div className="pathway-context-setup">
        {sections.map(({ category, icon, rows, empty }) => <section className="pathway-context-group" key={category} aria-label={headings[category]}>
            <header>
                <span className="pathway-icon" aria-hidden="true">{icon}</span>
                <h2>{headings[category]}</h2>
                <span className="pathway-context-count" aria-label={`${rows.length} links`}>{rows.length}</span>

            </header>
            {rows.length === 0 && <p className="pathway-context-empty">{empty}</p>}
            {rows.length > 0 && <ul>{rows.map(edge => {
                const item = model.elements[edge.sourceId];
                const name = nameOf(item);
                const attributes = { ...model.elements[definitionOf[item.id] ?? item.provenance?.classifier?.qualifiedName ?? '']?.attributes, ...item.attributes };
                const details = category === 'setting'
                    ? [...new Set([attributes.careSetting, attributes.environment].filter(Boolean))].join(' · ')
                    : edge.attributes?.interactionLabel;
                return <li key={edge.id}>
                    <div className="pathway-context-row">
                        <div><button type="button" className="pathway-context-name" onClick={() => {
                            setPicker(undefined);
                            setSelection({ type: 'relationship', id: edge.id });
                        }}>{name}</button>{details && <small>{details}</small>}</div>
                        {removeButton(edge, name)}
                    </div>
                    {category === 'setting' && <div className="pathway-context-environments">
                        {forSetting(item.id).map(link => <div className="pathway-context-row" key={link.id}>
                            <span>{nameOf(model.elements[link.targetId])}</span>{removeButton(link, nameOf(model.elements[link.targetId]))}
                        </div>)}


                    </div>}
                </li>;
            })}</ul>}

        </section>)}
    </div>;

    const childSystems = scopePath(scopeTree(model), system.id).at(-1)?.children ?? [];
    const selectedEdge = selection?.type === 'relationship' ? model.relationships.find(edge => edge.id === selection.id) : undefined;
    const selectedElement = selection?.type === 'element' ? model.elements[selection.id] : undefined;
    const detail = selectedElement ?? system;
    const selectedLinks = selectedEdge ? [selectedEdge] : selectedElement
        ? [...interactions, ...settings].filter(edge => edge.sourceId === selectedElement.id)
        : [];
    const editableLinks = new Set([...interactions, ...settings, ...settings.flatMap(edge => forSetting(edge.sourceId))].map(edge => edge.id));

    return <div className="pathway-context-studio">
        <aside className="pathway-context-studio-panel pathway-context-palette" aria-label="Context summary">
            <h2>Context summary</h2>
            {[...sections, {
                category: 'environment' as const, icon: ControlIcon.location, rows: settingIds.flatMap(forSetting),
            }].map(({ category, icon, rows }) => {
                const needsUseContext = category === 'environment' && !settingIds.length;
                const count = new Set(rows.map(edge => category === 'environment' ? edge.targetId : edge.sourceId)).size;
                return <div key={category} className={`pathway-context-tool pathway-context-tool--${category === 'environment' ? 'setting' : category}`}>
                    <span aria-hidden="true">{icon}</span>
                    <strong>{labels[category][0].toUpperCase() + labels[category].slice(1)}</strong>
                    <small>{count}</small>
                    {category === 'setting' && <p className="pathway-context-tool-hint">The situation in which the system is used, such as home monitoring.</p>}
                    {category === 'environment' && <p className="pathway-context-tool-hint">{needsUseContext && canWrite
                        ? 'Link a use context to add an environment.'
                        : 'Conditions of use, such as lighting and noise.'}</p>}
                    {canWrite && <div className="pathway-context-tile-actions">
                        <button type="button" aria-label={`Add ${labels[category]}`} title={`Add ${labels[category]}`}
                            disabled={busy || needsUseContext} aria-pressed={picker?.category === category}
                            onClick={() => openPicker(category, category === 'environment' ? settingIds[0] : undefined)}>+</button>
                        <button type="button" aria-label={`Remove ${labels[category]} link`} title={`Remove ${labels[category]} link`}
                            disabled={busy || !rows.length} aria-pressed={removing === category}
                            onClick={() => { setPicker(undefined); setNotice(undefined); setRemoving(category); }}>−</button>
                    </div>}
                </div>;
            })}
        </aside>
        <section className="pathway-context-studio-panel pathway-context-stage" aria-label="Context workspace">
            <header>
                <div><small className="pathway-context-studio-label">Direct context</small><h2>{system.name}</h2></div>
                <div className="pathway-context-view-switch" aria-label="Context view">
                    <button type="button" aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>Diagram</button>
                    <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
                </div>
                {diagramHref && <Link className="pathway-button" to={diagramHref}>{diagramSubject ? 'Open wider context diagram' : canWrite ? 'Edit authored diagram' : 'Open authored diagram'}</Link>}
            </header>
            {view === 'diagram' ? <div className="pathway-context-canvas" aria-label={`Direct context diagram for ${system.name}`}>
                <ScopedContextDiagram key={`${system.id}:${[...interactions, ...settings].map(edge => edge.id).join(',')}`}
                    model={model} system={system} links={[...interactions, ...settings]} systems={systemIds} label={nameOf}
                    onExplore={value => { setPicker(undefined); setSelection(value); }} />
            </div> : table}
            <footer className="pathway-context-actions">

                {!diagram && onCreateDiagram && <button className="pathway-button" type="button" onClick={onCreateDiagram}>Create context diagram</button>}
                {onSystemGoals && <button type="button" className="pathway-button" onClick={onSystemGoals}>System use cases</button>}
                {onClinical && <button type="button" className="pathway-button pathway-button--primary" onClick={onClinical}>Clinical use cases →</button>}
            </footer>
        </section>
        <aside className="pathway-context-studio-panel pathway-context-properties" aria-label="Context details">
            {notice && <p className="pathway-context-notice" role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
            {picker ? <>
                <h2>Add {labels[picker.category]}</h2>
                {form}
                <PathwayPartCreate key={picker.category} model={model} partKinds={creationKinds[picker.category]}
                    initiallyOpen={!choices.length} disabled={busy || (!picker.settingId && !boundaryId)}
                    preferredFile={picker.settingId ? model.elements[picker.settingId]?.file : (model.elements[boundaryId]?.file ?? system.file)}
                    addLabel={`Create new ${labels[picker.category]}`} saveLabel="Create and link"
                    onCreated={id => linkContext(id, true)} onCancel={() => { if (!choices.length) setPicker(undefined); }} />
            </> : removing ? <>
                <h2>Remove {labels[removing]} link</h2>
                <ul className="pathway-context-removal-list">{removalRows.map(edge => {
                    const item = model.elements[removing === 'environment' ? edge.targetId : edge.sourceId];
                    const other = model.elements[removing === 'environment' ? edge.sourceId : edge.targetId];
                    return <li className="pathway-context-row" key={edge.id}>
                        <span>{nameOf(item)}{removalRows.length > 1 && other ? ` · ${other.id}` : ''}</span>
                        {removeButton(edge, nameOf(item))}
                    </li>;
                })}</ul>
                <button type="button" className="pathway-button" disabled={busy} onClick={() => setRemoving(undefined)}>Cancel</button>
            </> : <>
                <h2>{selectedEdge ? 'Interaction' : selectedElement ? 'Element' : 'Selected system'}</h2>
                <div className="pathway-context-properties-summary">
                    <strong>{selectedEdge ? selectedEdge.attributes?.interactionLabel || selectedEdge.type : nameOf(detail)}</strong>
                    {selectedEdge ? <p>{model.elements[selectedEdge.sourceId]?.name} → {model.elements[selectedEdge.targetId]?.name}</p>
                        : <><p>{detail.kind.replace(/([a-z])([A-Z])/g, '$1 $2')}</p>{detail.doc && <p>{detail.doc}</p>}</>}
                </div>
                {!selection && <>
                    {childSystems.length > 0 && <details open className="pathway-context-properties-section">
                        <summary>Owned systems ({childSystems.length})</summary>
                        {childSystems.map(child => <Link key={child.root} to={elementUrl(model.elements[child.root])}>{ControlIcon.system}{child.name}</Link>)}
                    </details>}
                    <details open className="pathway-context-properties-section">
                        <summary>Direct context links ({interactions.length + settings.length})</summary>
                        {[...interactions, ...settings].map(edge => <button type="button" key={edge.id}
                            onClick={() => setSelection({ type: 'relationship', id: edge.id })}>
                            {nameOf(model.elements[edge.sourceId])}
                        </button>)}
                        {!interactions.length && !settings.length && <p>No context links for this system yet.</p>}
                        {diagramSubject && <p>For interactions recorded at the parent system, open its wider context diagram.</p>}
                    </details>
                </>}
                {selectedLinks.filter(edge => editableLinks.has(edge.id)).map(edge =>
                    <div className="pathway-context-row" key={edge.id}>
                        <span>{edge.attributes?.interactionLabel || model.elements[edge.sourceId]?.name}</span>
                        {removeButton(edge, model.elements[edge.sourceId]?.name ?? 'link')}
                    </div>)}
                {selection && <button type="button" className="pathway-button" onClick={() => setSelection(undefined)}>Show selected system</button>}
            </>}
        </aside>
    </div>;
}

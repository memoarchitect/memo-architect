import { useState, type FormEvent } from 'react';
import { compatibleRelationshipTargets, indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { ImplementationCreate } from './ImplementationCreate';
import './pathway-workbench.css';

export function ImplementationLinks({ model, workspace, implementationKinds, logical, artifactId, canWrite, onSelect, onPeer }: {
    model: MemoModelDTO; workspace: string | null; implementationKinds: readonly string[]; logical: boolean;
    artifactId?: string; canWrite: boolean; onSelect: (id: string) => void; onPeer?: (id: string) => void;
}) {
    const [candidateId, setCandidateId] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ message: string; error: boolean }>();
    const registry = indexKinds(model.registries?.kinds ?? []);
    const memberships = model.workspaceMembership?.membership;
    const isInScope = (element: MemoElement) => !workspace || memberships?.[element.id]?.includes(workspace);
    const elements = Object.values(model.elements).filter(element => !element.isDefinition && element.construct === 'part');
    const components = elements.filter(element => isInScope(element) && memberships?.[element.id]?.length
        && kindConformsTo(element.kind, 'LogicalComponent', registry));
    const isImplementation = (element: MemoElement) => implementationKinds.some(kind => kindConformsTo(element.kind, kind, registry));
    const implementations = elements.filter(element => isImplementation(element)
        && (isInScope(element) || !memberships?.[element.id]?.length));
    const items = logical ? components : implementations;
    const selected = items.find(item => item.id === artifactId);
    const edges = model.relationships.filter(edge => edge.type === 'realizedBy' && (logical ? edge.sourceId : edge.targetId) === selected?.id);
    const linked = [...new Set(edges.map(edge => logical ? edge.targetId : edge.sourceId))].flatMap(id => model.elements[id] ? [model.elements[id]] : []);
    const definition = model.registries?.relationships.find(item => item.name === 'realizedBy' && !item.isAbstract);
    const allowed = new Set((logical ? implementations : components).map(item => item.id));
    const linkedIds = new Set(linked.map(item => item.id));
    const direction = logical ? 'outgoing' : 'incoming';
    const peers = selected && definition && model.registries
        ? compatibleRelationshipTargets(selected, definition, direction, model, model.registries).map(item => item.element)
            .filter(item => allowed.has(item.id) && !linkedIds.has(item.id))
        : [];
    const candidate = peers.find(peer => peer.id === candidateId);
    const source = logical ? selected : candidate;
    const target = logical ? candidate : selected;
    const destination = source?.provenance?.declaration.writable === false ? undefined : source?.file;
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canWrite || busy || !source || !target || !destination) return;
        setBusy(true);
        setNotice(undefined);
        try {
            const result = await useModelStore.getState().createRelationship({
                type: 'realizedBy', sourceId: source.id, targetId: target.id, owningFile: destination,
                direction,
            });
            setNotice({ message: result.success ? 'Link saved.' : result.error ?? 'The link could not be saved.', error: !result.success });
            if (result.success) setCandidateId('');
        } finally { setBusy(false); }
    };

    return <section className="pathway-workspace" aria-label={logical ? 'Implementation links' : 'Implementation items'} style={{ padding: 20 }}>
        <h2>{logical ? 'Implementation links' : 'Software and hardware'}</h2>
        {!logical && <label>Implementation item{' '}
            <select value={selected?.id ?? ''} onChange={event => onSelect(event.target.value)}>
                <option value="" disabled>{items.length ? 'Choose software or hardware…' : 'No software or hardware in this scope'}</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
        </label>}
        {!logical && canWrite && <ImplementationCreate model={model} implementationKinds={implementationKinds} onCreated={onSelect} />}
        {selected && <div className="pathway-related">
            {!logical && <h3>{selected.name}</h3>}
            <h4>{logical ? 'Realized by' : 'Logical components realized'}</h4>
            <p>{linked.length ? 'Linked' : !definition ? 'Check unavailable for this profile' : peers.length ? 'Ready to link' : 'Link later'}</p>
            {linked.map(item => onPeer && (logical ? isImplementation(item) : !!memberships?.[item.id]?.length)
                ? <button type="button" className="pathway-resource" key={item.id} onClick={() => onPeer(item.id)}>{item.name}</button>
                : <p key={item.id}>{item.name}</p>)}
            {canWrite && peers.length > 0 && <form className="pathway-context-link-form" onSubmit={event => void submit(event)}>
                <label>{logical ? 'Implementation target' : 'Logical component'}{' '}
                    <select required value={candidateId} onChange={event => { setCandidateId(event.target.value); setNotice(undefined); }}>
                        <option value="">Choose an existing item…</option>
                        {peers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </label>{' '}
                <button className="pathway-button pathway-button--primary" disabled={busy || !destination}>
                    {logical ? 'Link implementation target' : 'Link logical component'}
                </button>
                {destination ? <p>Save the allocation in <code>{destination}</code>.</p>
                    : source && <p>The logical component has no writable source file.</p>}
            </form>}
            <details><summary>Source</summary><code>{selected.file}</code></details>
        </div>}
        {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
    </section>;
}

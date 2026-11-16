import { useState, type FormEvent } from 'react';
import { compatibleRelationshipTargets, type MemoElement, type MemoModelDTO, type RelationshipDirection } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';

export function PathwayAllocation({ model, selected, canWrite, type, direction, heading, peerLabel, linkLabel, peerAllowed, onPeer, canOpenPeer }: {
    model: MemoModelDTO; selected: MemoElement; canWrite: boolean;
    type: string; direction: RelationshipDirection; heading: string; peerLabel: string; linkLabel: string;
    peerAllowed: (element: MemoElement) => boolean; onPeer?: (id: string) => void;
    canOpenPeer?: (element: MemoElement) => boolean;
}) {
    const [candidateId, setCandidateId] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ message: string; error: boolean }>();
    const outgoing = direction === 'outgoing';
    const linkedIds = new Set(model.relationships
        .filter(edge => edge.type === type && (outgoing ? edge.sourceId : edge.targetId) === selected.id)
        .map(edge => outgoing ? edge.targetId : edge.sourceId));
    const linked = [...linkedIds].flatMap(id => model.elements[id] ? [model.elements[id]] : []);
    const definition = model.registries?.relationships.find(item => item.name === type && !item.isAbstract);
    const peers = definition && model.registries
        ? compatibleRelationshipTargets(selected, definition, direction, model, model.registries).map(item => item.element)
            .filter(item => !linkedIds.has(item.id) && peerAllowed(item))
        : [];
    const candidate = peers.find(peer => peer.id === candidateId);
    const source = outgoing ? selected : candidate;
    const target = outgoing ? candidate : selected;
    const destination = source?.provenance?.declaration.writable === false ? undefined : source?.file;
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canWrite || busy || !source || !target || !destination) return;
        setBusy(true);
        setNotice(undefined);
        try {
            const result = await useModelStore.getState().createRelationship({
                type, sourceId: source.id, targetId: target.id, owningFile: destination, direction,
            });
            setNotice({ message: result.success ? 'Link saved.' : result.error ?? 'The link could not be saved.', error: !result.success });
            if (result.success) setCandidateId('');
        } finally { setBusy(false); }
    };

    return <section className="pathway-related" aria-label={heading}>
        <h4>{heading}</h4>
        <p>{linked.length ? 'Linked' : !definition ? 'Check unavailable for this profile' : peers.length ? 'Ready to link' : 'Link later'}</p>
        {linked.map(item => onPeer && (canOpenPeer?.(item) ?? true)
            ? <button type="button" className="pathway-resource" key={item.id} onClick={() => onPeer(item.id)}>{item.name}</button>
            : <p key={item.id}>{item.name}</p>)}
        {canWrite && peers.length > 0 && <form className="pathway-context-link-form" onSubmit={event => void submit(event)}>
            <label>{peerLabel}{' '}
                <select required value={candidateId} onChange={event => { setCandidateId(event.target.value); setNotice(undefined); }}>
                    <option value="">Choose an existing item…</option>
                    {peers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            </label>{' '}
            <button className="pathway-button pathway-button--primary" disabled={busy || !candidate || !destination}>{linkLabel}</button>
            {candidate && (destination ? <p>Save the allocation in <code>{destination}</code>.</p>
                : <p>The allocation source has no writable file.</p>)}
        </form>}
        {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
    </section>;
}

import { useState, type FormEvent } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { awaitSavedElement } from '../store/await-element';
import { useModelStore } from '../store/model-store';
import { sendElementCreate } from '../store/ws-client';
import { declaredNameFor } from './templates/table-authoring';

export function PathwayPartCreate({ model, partKinds, addLabel, saveLabel, onCreated, initiallyOpen = false, preferredFile, disabled = false, onCancel }: {
    model: MemoModelDTO; partKinds: readonly string[]; addLabel: string; saveLabel: string; onCreated: (id: string) => void | Promise<void>;
    initiallyOpen?: boolean; preferredFile?: string; disabled?: boolean; onCancel?: () => void;
}) {
    const [open, setOpen] = useState(initiallyOpen);
    const [name, setName] = useState('');
    const [kindName, setKindName] = useState('');
    const [destination, setDestination] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const kinds = model.registries?.kinds.filter(kind => partKinds.includes(kind.name) && !kind.isAbstract) ?? [];
    const sources = new Map(Object.values(model.elements)
        .filter(element => element.package && element.file.endsWith('.sysml')
            && model.sourceHashes?.[element.file] && element.provenance?.declaration.writable !== false)
        .map(element => [JSON.stringify([element.package, element.file]), element]));
    const preferred = [...sources].find(([, item]) => item.file === preferredFile)?.[0];
    const selectedDestination = destination || preferred || (sources.size === 1 ? sources.keys().next().value : '') || '';
    const source = sources.get(selectedDestination);
    const kind = kinds.length === 1 ? kinds[0] : kinds.find(item => item.name === kindName);
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (disabled || busy || !source?.package || !kind || !name.trim()) return;
        const label = name.trim();
        const qualify = (shortName: string) => `${source.package}::${shortName}`;
        const shortName = declaredNameFor(label, value => Boolean(model.elements[qualify(value)]));
        if (!shortName) { setError('Use at least one letter or digit in the name.'); return; }
        const id = qualify(shortName);
        const { activeView, workspace } = useModelStore.getState();
        setBusy(true);
        setError('');
        try {
            const result = await sendElementCreate({ id, shortName, name: label, kind: kind.name, construct: 'part',
                layer: kind.layer, file: source.file, package: source.package, attributes: {} });
            if (!result.success) throw new Error(result.error ?? 'The item could not be saved.');
            if (!useModelStore.getState().model?.elements[id]) await awaitSavedElement(id);
            setOpen(false);
            setName('');
            const current = useModelStore.getState();
            if (current.activeView === activeView && current.workspace === workspace) await onCreated(id);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        } finally { setBusy(false); }
    };

    if (!kinds.length || !sources.size) return null;
    if (!open) return <button type="button" className="pathway-button" onClick={() => setOpen(true)}>{addLabel}</button>;
    return <form className="pathway-context-link-form" onSubmit={event => void save(event)} aria-label={addLabel}>
        <label>Name <input required value={name} onChange={event => setName(event.target.value)} /></label>
        {kinds.length > 1 && <label>Kind <select required value={kindName} onChange={event => setKindName(event.target.value)}>
            <option value="">Choose a kind…</option>
            {kinds.map(item => <option key={item.name} value={item.name}>{item.label ?? item.name}</option>)}
        </select></label>}
        <label>Save in <select required value={selectedDestination} onChange={event => setDestination(event.target.value)}>
            <option value="">Choose a source package…</option>
            {[...sources].map(([key, item]) => <option key={key} value={key}>{item.package} · {item.file}</option>)}
        </select></label>
        <button className="pathway-button pathway-button--primary" disabled={disabled || busy || !source || !kind || !name.trim()}>{saveLabel}</button>
        <button type="button" className="pathway-button" disabled={busy} onClick={() => { setOpen(false); setError(''); onCancel?.(); }}>Cancel</button>
        {error && <p role="alert">{error}</p>}
    </form>;
}

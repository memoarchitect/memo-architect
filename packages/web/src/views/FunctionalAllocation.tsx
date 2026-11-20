import { useMemo, useState } from 'react';
import { indexKinds, kindConformsTo, realizingFunctions, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { allocationIndex, allocationSummary, allocationTargets, readableId } from '../lib/functional-allocation';
import './pathway-workbench.css';

type Element = MemoModelDTO['elements'][string];
export interface FunctionRow { element: Element; depth: number }

/**
 * Where each function of one system is allocated: a workspace to allocate one function at a time (pick or drag
 * it onto a target), and a matrix of every function against every target. The allowed target kinds are the
 * method's; this page never names one.
 */
export function FunctionalAllocation({ model, workspace, rows, kinds, realizationKind, canWrite, onOpen }: {
    model: MemoModelDTO; workspace: string; rows: FunctionRow[]; kinds: readonly string[]; realizationKind?: string;
    canWrite: boolean; onOpen: (id: string) => void;
}) {
    const createRelationship = useModelStore(s => s.createRelationship);
    const [mode, setMode] = useState<'workspace' | 'matrix'>('workspace');
    const [picked, setPicked] = useState('');
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const functions = useMemo(() => rows.map(row => row.element), [rows]);
    const index = useMemo(() => allocationIndex(model), [model]);
    const targets = useMemo(() => allocationTargets(model, workspace, kinds, functions), [model, workspace, kinds, functions]);
    const summary = allocationSummary(model, functions);
    const open = functions.filter(fn => !(index.get(fn.id) ?? []).length);
    const name = (id: string) => model.elements[id]?.name ?? id;
    const label = (id: string) => [name(id), readableId(model.elements[id])].filter(Boolean).join(' · ');
    const allocate = async (functionId: string, targetId: string) => {
        if (!canWrite || busy || !functionId || !targetId) return;
        if ((index.get(functionId) ?? []).includes(targetId)) { setNotice(`${name(functionId)} is already allocated to ${name(targetId)}.`); return; }
        setBusy(true); setNotice('');
        const result = await createRelationship({ type: 'allocatedTo', sourceId: functionId, targetId, direction: 'outgoing', selectedElementId: functionId });
        setBusy(false);
        setNotice(result.success ? `Allocated ${name(functionId)} to ${name(targetId)}.` : result.error ?? 'The allocation could not be saved.');
        if (result.success) { setPicked(''); setTarget(''); }
    };
    const chips = (id: string) => {
        const allocated = index.get(id) ?? [];
        return allocated.length
            ? <span className="fx-chip fx-chip--ok">{allocated.map(item => readableId(model.elements[item]) || name(item)).join(', ')}</span>
            : <span className="fx-chip fx-chip--open">Not allocated</span>;
    };
    const realizedBy = (id: string) => realizingFunctions(model, id, realizationKind)
        .map(item => `${item.element.name}${item.components.length ? ` · ${item.components.map(component => component.name).join(', ')}` : ''}`);
    const systems = targets.filter(item => item.system);
    const parts = targets.filter(item => !item.system);
    const ownSystem = (id: string) => model.workspaceMembership?.definitionOf?.[id] === workspace;
    const columns = [...systems.filter(item => ownSystem(item.element.id) || functions.some(fn => (index.get(fn.id) ?? []).includes(item.element.id))), ...parts];
    // Targets grouped by the kinds the method allows, in its order, under the ontology's own labels.
    const registry = indexKinds(model.registries?.kinds ?? []);
    const placed = new Set<string>();
    const groups = kinds.map(kind => {
        const items = targets.filter(item => !placed.has(item.element.id) && kindConformsTo(item.element.kind, kind, registry));
        items.forEach(item => placed.add(item.element.id));
        return { kind, label: registry.get(kind)?.label ?? kind, items };
    });
    const other = targets.filter(item => !placed.has(item.element.id));
    if (other.length) groups.push({ kind: '', label: 'Already allocated to', items: other });
    const percent = summary.total ? Math.round(100 * summary.allocated / summary.total) : 0;
    const definitionName = (id: string) => { const definition = model.elements[model.workspaceMembership?.definitionOf?.[id] ?? '']; return definition && definition.name !== name(id) ? definition.name : undefined; };
    const targetButton = (item: (typeof targets)[number]) => {
        const count = functions.filter(fn => (index.get(fn.id) ?? []).includes(item.element.id)).length;
        return <button key={item.element.id} type="button" className="fx-target" disabled={!canWrite || busy}
            aria-label={`Allocate to ${item.element.name}`} data-drop={picked ? 'ready' : undefined}
            onDragOver={event => { if (canWrite) event.preventDefault(); }}
            onDrop={event => { event.preventDefault(); void allocate(event.dataTransfer.getData('text/plain'), item.element.id); }}
            onClick={() => picked ? void allocate(picked, item.element.id) : setTarget(item.element.id)}>
            <span>{item.element.name}{definitionName(item.element.id) && <span className="fx-muted fx-small fx-block">{definitionName(item.element.id)}</span>}</span><span className="fx-id">{[readableId(item.element), count ? `${count}` : ''].filter(Boolean).join(' · ')}</span>
        </button>;
    };
    return <section aria-label="Allocation" className="fx-stack">
        <div className="fx-bar">
            <div><h2 className="fx-title">Where each function is allocated</h2>
                <p className="fx-muted">A function goes to a system, a system of systems or a logical component, and may go to more than one.</p></div>
            <nav aria-label="Allocation view" className="pathway-segments">
                <button type="button" aria-pressed={mode === 'workspace'} onClick={() => setMode('workspace')}>Allocate</button>
                <button type="button" aria-pressed={mode === 'matrix'} onClick={() => setMode('matrix')}>Matrix</button>
            </nav>
        </div>
        {notice && <p role="status" className="fx-notice">{notice}</p>}
        {mode === 'workspace' ? <>
            <div className="fx-grid3">
                <section className="fx-card" aria-label="Functions and their allocation">
                    <div className="fx-card-head"><h3>Functional tree</h3><span className="fx-chip fx-chip--ok">{summary.allocated} allocated</span>{!!open.length && <span className="fx-chip fx-chip--open">{open.length} not</span>}</div>
                    <ul className="fx-list">{rows.map(row => <li key={row.element.id} style={{ paddingLeft: row.depth * 16 }}>
                        <button type="button" className="fx-row" onClick={() => onOpen(row.element.id)}><span className="fx-name">{row.element.name}</span><span className="fx-id">{readableId(row.element)}</span>{chips(row.element.id)}</button>
                    </li>)}</ul>
                </section>
                <section className="fx-card fx-card--soft" aria-label="Not allocated">
                    <div className="fx-card-head"><h3>Not allocated ({open.length})</h3></div>
                    <p className="fx-muted fx-small">Pick a function, then a target. Or drag it onto a target.</p>
                    {open.length ? <ul className="fx-list">{open.map(fn => <li key={fn.id}>
                        <button type="button" draggable={canWrite} aria-pressed={picked === fn.id} className="fx-row fx-row--card"
                            onDragStart={event => { event.dataTransfer.setData('text/plain', fn.id); setPicked(fn.id); }}
                            onClick={() => setPicked(current => current === fn.id ? '' : fn.id)}>
                            <span className="fx-name">{fn.name}</span><span className="fx-id">{readableId(fn)}</span></button>
                    </li>)}</ul> : <p>Every function is allocated.</p>}
                </section>
                <section className="fx-card" aria-label="Allocation targets">
                    <div className="fx-card-head"><h3>Allocation targets</h3></div>
                    {groups.map(group => !!group.items.length && <div key={group.kind}><h4 className="fx-group">{group.label}</h4>{group.items.map(targetButton)}</div>)}
                    {!targets.length && <p className="fx-muted fx-small">Nothing in the model can take an allocation yet.</p>}
                </section>
            </div>
            <div className="fx-grid2">
                <form className="fx-card" aria-label="Allocate a function" onSubmit={event => { event.preventDefault(); void allocate(picked, target); }}>
                    <h3>Allocate a function</h3>
                    <label className="fx-field">Function<select aria-label="Function to allocate" value={picked} onChange={event => setPicked(event.target.value)}>
                        <option value="">Choose a function…</option>{rows.map(row => <option key={row.element.id} value={row.element.id}>{' '.repeat(row.depth * 2)}{label(row.element.id)}</option>)}</select></label>
                    <label className="fx-field">Allocate to<select aria-label="Allocation target" value={target} onChange={event => setTarget(event.target.value)}>
                        <option value="">Choose a target…</option>{targets.map(item => <option key={item.element.id} value={item.element.id}>{label(item.element.id)}</option>)}</select></label>
                    <p><button type="submit" className="pathway-button pathway-button--primary" disabled={!canWrite || busy || !picked || !target}>Allocate</button></p>
                </form>
                <section className="fx-card" aria-label="Allocations in this system">
                    <h3>Allocations in {name(workspace)}</h3>
                    <div className="fx-scroll"><table className="fx-table"><thead><tr><th>ID</th><th>Function</th><th>Allocated to</th><th>Realized by</th></tr></thead>
                        <tbody>{functions.filter(fn => (index.get(fn.id) ?? []).length || realizedBy(fn.id).length).map(fn => <tr key={fn.id}>
                            <td className="fx-id">{readableId(fn)}</td><td><button type="button" className="pathway-button" onClick={() => onOpen(fn.id)}>{fn.name}</button></td>
                            <td>{(index.get(fn.id) ?? []).map(name).join(', ') || '—'}</td><td>{realizedBy(fn.id).join('; ') || '—'}</td></tr>)}</tbody></table></div>
                </section>
            </div>
        </> : <section className="fx-card" aria-label="Allocation matrix">
            <div className="fx-scroll"><table className="fx-table fx-matrix">
                <thead><tr><th scope="col">Function</th>{columns.map(item => <th key={item.element.id} scope="col">{definitionName(item.element.id) ?? item.element.name}<span className="fx-id">{readableId(item.element)}</span></th>)}<th scope="col">Realized by</th></tr></thead>
                <tbody>{rows.map(row => {
                    const allocated = index.get(row.element.id) ?? [];
                    return <tr key={row.element.id} className={allocated.length ? undefined : 'fx-gap'}>
                        <th scope="row" style={{ paddingLeft: 12 + row.depth * 16 }}><button type="button" className="fx-link" onClick={() => onOpen(row.element.id)}>{row.element.name}</button> <span className="fx-id">{readableId(row.element)}</span></th>
                        {columns.map(item => <td key={item.element.id}>{allocated.includes(item.element.id)
                            ? <span className="fx-tick" title={`${row.element.name} is allocated to ${item.element.name}`}>✓</span>
                            : <button type="button" className="fx-add" disabled={!canWrite || busy} aria-label={`Allocate ${row.element.name} to ${item.element.name}`} onClick={() => void allocate(row.element.id, item.element.id)}>+</button>}</td>)}
                        <td className="fx-realized">{realizedBy(row.element.id).join('; ') || (allocated.length ? '—' : 'Not allocated')}</td>
                    </tr>;
                })}</tbody>
            </table></div>
            <div className="fx-footer"><span><strong>{summary.allocated}</strong> allocated</span><span className="fx-warn"><strong>{summary.total - summary.allocated}</strong> not allocated</span><span className="fx-spacer" /><span>Coverage <strong className="fx-big">{percent}%</strong></span></div>
        </section>}
    </section>;
}

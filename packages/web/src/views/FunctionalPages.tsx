import { useMemo, useState } from 'react';
import { functionTrees, functionalFlowSteps, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { readableId, type AllocationSummary } from '../lib/functional-allocation';
import type { FunctionRow } from './FunctionalAllocation';
import './pathway-workbench.css';

type Element = MemoModelDTO['elements'][string];

/**
 * A system with no function tree yet. Its functions are the tree it is given: one already in the model that no
 * system has (written as the system's FunctionalRoot, nothing copied or moved), or a new one.
 */
export function FunctionTreeChooser({ model, workspace, candidates, home, disabled, onAdopt, onStart }: {
    model: MemoModelDTO; workspace: string; candidates: number; home?: string; disabled: boolean;
    onAdopt: (rootFunctionId: string) => void; onStart: () => void;
}) {
    const name = model.elements[workspace]?.name ?? workspace;
    const trees = useMemo(() => functionTrees(model).sort((a, b) => a.root.name.localeCompare(b.root.name)), [model]);
    // Trees already allocated to this system come first: they are its functions, only not yet named its tree.
    const free = [...trees.filter(tree => tree.systems.includes(workspace)), ...trees.filter(tree => !tree.systems.length)];
    const taken = trees.filter(tree => tree.systems.length && !tree.systems.includes(workspace));
    const [query, setQuery] = useState('');
    const [chosen, setChosen] = useState(free[0]?.root.id ?? '');
    const shown = free.filter(tree => `${tree.root.name} ${readableId(tree.root)}`.toLowerCase().includes(query.toLowerCase()));
    const picked = free.find(tree => tree.root.id === chosen) ?? free[0];
    const children = (id: string) => Object.values(model.elements).filter(element => (element.parentAction ?? element.owner) === id && element.construct === 'action');
    return <section aria-label="Give this system a function tree" className="fx-stack">
        <div className="fx-card"><h2 className="fx-title">{name} has no function tree yet</h2>
            <p className="fx-muted">A system's functions are the function tree it is given. Use a tree that already exists in the model, or start a new one.</p></div>
        <div className="fx-grid2 fx-grid2--wide">
            <section className="fx-card" aria-label="Use a function tree that already exists">
                <h3>Use a function tree that already exists</h3>
                <p className="fx-muted fx-small">Trees already allocated to {name}, then trees no system has. The tree stays where it is declared; {name} is linked to its top function.</p>
                {free.length ? <>
                    <input aria-label="Find a tree" className="fx-input" placeholder="Find a tree by name or id" value={query} onChange={event => setQuery(event.target.value)} />
                    <ul className="fx-list" role="radiogroup" aria-label="Function trees">{shown.map(tree => <li key={tree.root.id}>
                        <label className={`fx-option${picked?.root.id === tree.root.id ? ' fx-option--on' : ''}`}>
                            <input type="radio" name="function-tree" checked={picked?.root.id === tree.root.id} onChange={() => setChosen(tree.root.id)} />
                            <span><strong>{tree.root.name}</strong> <span className="fx-id">{readableId(tree.root)}</span>
                                <span className="fx-muted fx-small fx-block">{tree.size} {tree.size === 1 ? 'function' : 'functions'} · {tree.depth} {tree.depth === 1 ? 'level' : 'levels'}{tree.systems.includes(workspace) ? ` · allocated to ${name}` : ''}</span></span>
                        </label></li>)}</ul>
                    {picked && <div className="fx-preview" aria-label="Tree preview"><h4 className="fx-group">Preview · {picked.root.name}</h4>
                        <ul className="fx-list">{children(picked.root.id).slice(0, 8).map(child => <li key={child.id} className="fx-small">{child.name} <span className="fx-id">{readableId(child)}</span></li>)}</ul></div>}
                    <p><button type="button" className="pathway-button pathway-button--primary" disabled={disabled || !picked} onClick={() => picked && onAdopt(picked.root.id)}>Use this tree for {name}</button></p>
                </> : <p>Every function tree in the model already belongs to a system.</p>}
                {!!taken.length && <details className="fx-small"><summary>Trees other systems already have ({taken.length})</summary>
                    <ul className="fx-list">{taken.map(tree => <li key={tree.root.id}>{tree.root.name} <span className="fx-id">{readableId(tree.root)}</span> · {tree.systems.map(id => model.elements[id]?.name ?? id).join(', ')}</li>)}</ul></details>}
            </section>
            <section className="fx-card" aria-label="Start a new tree">
                <h3>Start a new tree</h3>
                <p className="fx-muted fx-small">Creates the top function that sums up what {name} is for. Rename it and break it down on the next page.</p>
                {!!candidates && <p className="fx-small">{candidates === 1 ? 'The function already allocated to this system is' : `The ${candidates} functions already allocated to this system are`} placed under it as references. Each stays declared where it is now.</p>}
                <p><button type="button" className="pathway-button" disabled={disabled} onClick={onStart}>Start the function tree</button></p>
                {home && <details className="fx-small fx-muted"><summary>Where this is saved</summary><code>{home}</code></details>}
            </section>
        </div>
    </section>;
}

/** The Functional layer at a glance: how much is done, and where to go next. */
export function FunctionalOverview({ model, systemName, rows, flows, allocations, summary, treeLabel, flowLabel, canAllocate, onTree, onFlows, onAllocation, onOpen }: {
    model: MemoModelDTO; systemName: string; rows: FunctionRow[]; flows: Element[]; allocations: Map<string, string[]>; summary: AllocationSummary;
    treeLabel?: string; flowLabel?: string; canAllocate: boolean; onTree: () => void; onFlows: () => void; onAllocation: () => void; onOpen: (id: string) => void;
}) {
    const inFlows = new Set(flows.flatMap(flow => functionalFlowSteps(model, flow.id).steps.map(step => step.functionId).filter(Boolean) as string[]));
    const unused = rows.filter(row => row.depth > 0 && !inFlows.has(row.element.id));
    const open = summary.total - summary.allocated;
    const byTarget = new Map<string, number>();
    for (const row of rows) for (const target of allocations.get(row.element.id) ?? []) byTarget.set(target, (byTarget.get(target) ?? 0) + 1);
    const targets = [...byTarget].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const most = Math.max(1, ...byTarget.values(), open);
    const percent = summary.total ? Math.round(100 * summary.allocated / summary.total) : 0;
    const depth = rows.reduce((max, row) => Math.max(max, row.depth + 1), 0);
    const first = flows[0];
    return <section aria-label="Functional overview" className="fx-stack">
        <div className="fx-grid4">
            <div className="fx-card fx-stat"><span className="fx-muted fx-small">Functions</span><strong>{summary.total}</strong><span className="fx-muted fx-small">{depth} {depth === 1 ? 'level' : 'levels'} deep</span></div>
            <div className="fx-card fx-stat"><span className="fx-muted fx-small">Allocated</span><strong className="fx-ok">{summary.allocated} <small>of {summary.total}</small></strong><span className="fx-meter"><span style={{ width: `${percent}%` }} /></span></div>
            <div className="fx-card fx-stat"><span className="fx-muted fx-small">Have a written purpose</span><strong>{summary.withPurpose} <small>of {summary.total}</small></strong><span className="fx-muted fx-small">{summary.total - summary.withPurpose} still to write</span></div>
            <div className="fx-card fx-stat"><span className="fx-muted fx-small">Functional flows</span><strong>{flows.length}</strong><span className="fx-muted fx-small">{unused.length} {unused.length === 1 ? 'function' : 'functions'} in no flow</span></div>
        </div>
        <div className="fx-grid2">
            <section className="fx-card" aria-label="Function tree summary">
                <div className="fx-card-head"><h3>{treeLabel ?? 'Functional tree'}</h3><button type="button" className="pathway-button" onClick={onTree}>Open →</button></div>
                <p className="fx-muted fx-small">What {systemName} must do, from its top function down.</p>
                <ul className="fx-list">{rows.filter(row => row.depth <= 1).slice(0, 8).map(row => {
                    const below = rows.filter(other => other.depth > row.depth && isUnder(other.element.id, row.element.id, rows));
                    const openBelow = below.filter(other => !(allocations.get(other.element.id) ?? []).length).length;
                    return <li key={row.element.id} style={{ paddingLeft: row.depth * 18 }}><button type="button" className="fx-row" aria-label={row.element.name} onClick={() => onOpen(row.element.id)}>
                        <span className="fx-name">{row.element.name}</span><span className="fx-id">{readableId(row.element)}</span>
                        {openBelow ? <span className="fx-chip fx-chip--open">{openBelow} not allocated</span> : below.length ? <span className="fx-muted fx-small">{below.length} below</span> : null}
                    </button></li>;
                })}</ul>
            </section>
            <section className="fx-card" aria-label="Where functions are allocated">
                <div className="fx-card-head"><h3>Where functions are allocated</h3>{canAllocate && <button type="button" className="pathway-button pathway-button--primary" onClick={onAllocation}>Allocate functions</button>}</div>
                <ul className="fx-list fx-bars">{targets.map(([id, count]) => <li key={id}><span className="fx-name">{model.elements[id]?.name ?? id}</span><span className="fx-id">{readableId(model.elements[id])}</span>
                    <span className="fx-meter"><span style={{ width: `${Math.round(100 * count / most)}%` }} /></span><span className="fx-small">{count}</span></li>)}
                    {!!open && <li className="fx-warn"><span className="fx-name">Not allocated</span><span /><span /><strong className="fx-small">{open}</strong></li>}</ul>
                {!targets.length && !open && <p className="fx-muted">No function yet.</p>}
            </section>
            <section className="fx-card" aria-label="Functional flows summary">
                <div className="fx-card-head"><h3>{flowLabel ?? 'Functional flows'}</h3><button type="button" className="pathway-button" onClick={onFlows}>Open →</button></div>
                <p className="fx-muted fx-small">The order functions run in. Each step is a function from the tree.</p>
                {first ? <><div className="fx-strip">{functionalFlowSteps(model, first.id).steps.slice(0, 5).map((step, index) => <span key={step.step.id} className="fx-strip-step">{index > 0 && <span aria-hidden="true">→</span>}<span className="fx-box">{step.functionId ? model.elements[step.functionId]?.name ?? step.step.name : step.step.name}</span></span>)}</div>
                    <p className="fx-muted fx-small">{first.name}{flows.length > 1 ? ` · and ${flows.length - 1} more` : ''}</p></> : <p className="fx-muted">No flow yet.</p>}
            </section>
            <section className="fx-card" aria-label="Next steps">
                <div className="fx-card-head"><h3>Next steps</h3></div>
                {!!open && canAllocate && <div className="fx-next fx-next--warn"><span>Allocate {open} {open === 1 ? 'function' : 'functions'}</span><button type="button" className="pathway-button" onClick={onAllocation}>Allocate</button></div>}
                {summary.total > summary.withPurpose && <div className="fx-next"><span>Write what {summary.total - summary.withPurpose} {summary.total - summary.withPurpose === 1 ? 'function' : 'functions'} must do</span><button type="button" className="pathway-button" onClick={onTree}>Review</button></div>}
                {!!unused.length && <div className="fx-next"><span>Use {unused.length} {unused.length === 1 ? 'function' : 'functions'} in a flow</span><button type="button" className="pathway-button" onClick={onFlows}>Open flows</button></div>}
                {!open && summary.total === summary.withPurpose && !unused.length && <p className="fx-muted">Nothing outstanding in this layer.</p>}
            </section>
        </div>
    </section>;
}

/** Whether `id` sits below `ancestor` in the tree order: the rows after the ancestor, deeper than it, until one is not. */
function isUnder(id: string, ancestor: string, rows: FunctionRow[]): boolean {
    const start = rows.findIndex(row => row.element.id === ancestor);
    if (start < 0) return false;
    for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index++) if (rows[index].element.id === id) return true;
    return false;
}

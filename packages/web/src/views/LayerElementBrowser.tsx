import { useEffect, useMemo, useRef, useState } from 'react';
import { functionalScope, indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { componentFunctionWorkspace, createComponentFunction } from '../lib/functional-authoring';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    model: MemoModelDTO;
    elements: MemoElement[];
    workspace: string | null;
    scopeLabel: string;
    layerLabel: string;
    rootId?: string;
    shared?: ReadonlySet<string>;
    context?: ReadonlySet<string>;
    unassigned?: ReadonlySet<string>;
    canWrite: boolean;
    kindLabel: (kind: string) => string;
    onElement: (id: string) => void;
}

/** Method taxonomy, native functional decomposition and component allocations in the current system. */
export function LayerElementBrowser({ model, elements, workspace, scopeLabel, layerLabel, rootId, shared, context, unassigned, canWrite, kindLabel, onElement }: Props) {
    const [filter, setFilter] = useState('');
    const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!menu) return;
        const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
        document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
    }, [menu]);
    useEffect(() => setMenu(null), [workspace, layerLabel]);
    const functionKinds = useMemo(() => indexKinds(model.registries?.kinds ?? []), [model.registries]);
    const scopedFunctions = useMemo(() => workspace ? functionalScope(model, workspace).visible : undefined, [model, workspace]);
    const allocatedFunction = (id: string) => !!model.elements[id]
        && (!scopedFunctions || scopedFunctions.has(id))
        && kindConformsTo(model.elements[id].kind, 'MemoFunction', functionKinds);
    const visible = new Set(elements.map(element => element.id));
    const matches = (element: MemoElement) => !filter || `${element.name} ${kindLabel(element.kind)}`.toLowerCase().includes(filter.toLowerCase());
    const elementButton = (element: MemoElement) => <button type="button" style={{ border: 0, padding: '4px 0', background: 'transparent', textAlign: 'left', color: '#0f766e', cursor: 'pointer', fontSize: FONT.sm }}
        onClick={() => onElement(element.id)} onContextMenu={event => {
            if (canWrite && componentFunctionWorkspace(model, element.id, workspace)) {
                event.preventDefault(); setMenu({ id: element.id, x: event.clientX, y: event.clientY });
            }
        }}>{element.name}{shared?.has(element.id) && <small style={{ color: COLOR.muted }}> · shared</small>}{context?.has(element.id) && <small style={{ color: COLOR.muted }}> · context</small>}{unassigned?.has(element.id) && <small style={{ color: COLOR.muted }}> · unassigned</small>}</button>;
    const hierarchy = useMemo(() => {
        const children = new Map<string, string[]>(); const references = new Map<string, string>();
        for (const edge of model.relationships) {
            if (edge.type === 'composes') children.set(edge.sourceId, [...(children.get(edge.sourceId) ?? []), edge.targetId]);
            if (edge.type === 'subsets') references.set(edge.sourceId, edge.targetId);
        }
        return { children, references };
    }, [model.relationships]);
    const childrenOf = (id: string) => [...new Set([
        ...(hierarchy.children.get(id) ?? []),
        ...(hierarchy.children.get(hierarchy.references.get(id) ?? '') ?? []),
    ])].filter(child => visible.has(child));
    const treeIds = new Set<string>();
    const collect = (id: string) => {
        if (treeIds.has(id)) return;
        treeIds.add(id);
        const referenced = hierarchy.references.get(id); if (referenced && visible.has(referenced)) treeIds.add(referenced);
        childrenOf(id).forEach(collect);
    };
    if (rootId && visible.has(rootId)) collect(rootId);
    const branch = (id: string, ancestors = new Set<string>()): React.ReactNode => {
        const element = model.elements[id];
        if (!element || ancestors.has(id)) return null;
        const path = new Set([...ancestors, id]);
        const children = childrenOf(id);
        return <li key={id}>{elementButton(element)}{children.length > 0 && <ul style={{ listStyle: 'none', paddingLeft: 14, borderLeft: `1px solid ${COLOR.border}` }}>{children.map(child => branch(child, path))}</ul>}</li>;
    };
    const groups = [...new Set(elements.filter(element => !treeIds.has(element.id)).map(element => element.kind))].sort((a, b) => kindLabel(a).localeCompare(kindLabel(b)));
    return <section aria-label="Elements in this layer">
        <p style={{ fontSize: FONT.xs, color: COLOR.muted }}>{scopeLabel} · {layerLabel}</p>
        <input aria-label="Filter layer elements" placeholder="Filter elements…" value={filter} onChange={event => setFilter(event.target.value)} style={{ padding: 7, width: '100%', boxSizing: 'border-box', border: `1px solid ${COLOR.border}`, borderRadius: 6 }} />
        {treeIds.size > 0 && !filter && <section aria-label="Functional breakdown"><h3 style={{ fontSize: FONT.sm }}>Functional breakdown</h3><ul style={{ listStyle: 'none', padding: 0 }}>{branch(rootId!)}</ul></section>}
        {(filter ? [...new Set(elements.map(element => element.kind))] : groups).map(kind => {
            const members = elements.filter(element => element.kind === kind && (filter || !treeIds.has(element.id)) && matches(element));
            return members.length > 0 ? <details key={kind} open={!!filter || groups.length < 4} style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: FONT.sm }}>{kindLabel(kind)} ({members.length})</summary>
                <div style={{ display: 'grid', paddingLeft: 8 }}>{members.sort((a, b) => a.name.localeCompare(b.name)).map(element => <div key={element.id}>
                    {elementButton(element)}
                    {model.relationships.filter(edge => edge.type === 'allocatedTo' && edge.targetId === element.id && allocatedFunction(edge.sourceId)).map(edge => <div key={edge.id} style={{ paddingLeft: 14, borderLeft: `1px solid ${COLOR.border}` }}>{elementButton(model.elements[edge.sourceId])}</div>)}
                </div>)}</div>
            </details> : null;
        })}
        {!elements.length && <p style={{ fontSize: FONT.sm }}>No elements in this layer are linked to the selected scope yet.</p>}
        {menu && <div ref={menuRef} role="menu" style={{ position: 'fixed', left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 70), zIndex: 1000, padding: 8, background: '#fff', border: `1px solid ${COLOR.border}`, boxShadow: '0 4px 18px #0002' }}>
            <button role="menuitem" onClick={() => { const id = menu.id; setMenu(null); void createComponentFunction(id); }}>Create component function…</button>
        </div>}
    </section>;
}

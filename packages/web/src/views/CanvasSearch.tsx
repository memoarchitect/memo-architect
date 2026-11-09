// ─── Finding a box on the open diagram ────────────────────────────────────────
//
// Press / or the magnifier, type, and Enter or a click takes the camera to the box and selects it. It searches what is
// drawn: a step folded inside a composite is not on the canvas until the composite is opened.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from '@xyflow/react';
import { searchCanvas, type SearchModel, type SearchNode } from '../lib/canvas-search';
import { COLOR, FONT } from '../styles/tokens';

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function CanvasSearch({ nodes, model, onPick }: { nodes: readonly SearchNode[]; model: SearchModel | null; onPick: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const hits = useMemo(() => searchCanvas(nodes, query, model), [nodes, query, model]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
            event.preventDefault();
            setOpen(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
    useEffect(() => { if (open) input.current?.focus(); }, [open]);
    useEffect(() => setActive(0), [query]);

    const close = () => { setOpen(false); setQuery(''); };
    const pick = (id: string) => { onPick(id); close(); };
    const shell = { background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.14)' };

    if (!open) {
        return (
            <Panel position="top-center">
                <button type="button" data-testid="canvas-search-open" aria-label="Search this diagram" title="Search this diagram (/)" onClick={() => setOpen(true)}
                    style={{ ...shell, width: 28, height: 28, cursor: 'pointer', color: COLOR.muted, fontSize: FONT.sm, padding: 0 }}>⌕</button>
            </Panel>
        );
    }
    return (
        <Panel position="top-center">
            <div style={{ ...shell, width: 300 }}>
                <input ref={input} data-testid="canvas-search" aria-label="Search this diagram" placeholder="Find on this diagram…" value={query}
                    onChange={event => setQuery(event.target.value)}
                    onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as globalThis.Node | null)) close(); }}
                    onKeyDown={event => {
                        if (event.key === 'Escape') close();
                        else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, hits.length - 1)); }
                        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
                        else if (event.key === 'Enter' && hits[active]) pick(hits[active].id);
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '6px 10px', fontSize: FONT.sm }} />
                {query.trim() && (
                    <div role="listbox" aria-label="Boxes found" style={{ borderTop: `1px solid ${COLOR.borderLight}`, maxHeight: 260, overflowY: 'auto' }}>
                        {hits.length === 0 && <div style={{ padding: '6px 10px', fontSize: FONT.xs, color: COLOR.muted }}>Nothing on this diagram by that name.</div>}
                        {hits.map((hit, index) => (
                            <button key={hit.id} type="button" role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={() => pick(hit.id)}
                                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: '4px 10px', background: index === active ? COLOR.borderLight : 'transparent' }}>
                                <span style={{ fontSize: FONT.sm, color: COLOR.primary }}>{hit.name}</span>
                                {hit.detail && <span style={{ marginLeft: 8, fontSize: FONT.xs, color: COLOR.muted }}>{hit.detail}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
}

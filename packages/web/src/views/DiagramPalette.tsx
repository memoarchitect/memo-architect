// ─── Diagram Elements Navigator ──────────────────────────────────────────────
// Lists the actual elements included in the selected diagram, grouped by kind.
// Selecting an entry drives the shared model selection and canvas highlight.

import { useMemo, useState } from 'react';
import type { MemoElement } from '@memo/tools/browser';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

interface DiagramPaletteProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    elementIds?: readonly string[];
    /** Retained for call-site compatibility; contents are diagram elements. */
    eligibleKinds?: Set<string>;
}

export function DiagramPalette({ collapsed, onToggleCollapse, elementIds = [] }: DiagramPaletteProps) {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const inspectElement = useModelStore(s => s.inspectElement);
    const [search, setSearch] = useState('');
    const [collapsedKinds, setCollapsedKinds] = useState<Set<string>>(new Set());

    const groups = useMemo(() => {
        if (!model) return [];
        const query = search.trim().toLowerCase();
        const byKind = new Map<string, MemoElement[]>();
        // Allocation targets are visible as lane backgrounds and therefore
        // are diagram elements even when the view's IncludedIn list contains
        // only the actions/functions that reference them.
        const visibleIds = new Set(elementIds);
        for (const id of elementIds) {
            const allocatedTo = model.elements[id]?.allocatedTo;
            if (allocatedTo) visibleIds.add(allocatedTo);
        }
        for (const id of visibleIds) {
            const element = model.elements[id];
            if (!element) continue;
            if (query && !element.name.toLowerCase().includes(query)
                && !element.kind.toLowerCase().includes(query)) continue;
            if (!byKind.has(element.kind)) byKind.set(element.kind, []);
            byKind.get(element.kind)!.push(element);
        }
        return [...byKind.entries()]
            .map(([kind, elements]) => ({
                kind,
                elements: elements.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => a.kind.localeCompare(b.kind));
    }, [model, elementIds, search]);

    const toggleKind = (kind: string) => setCollapsedKinds(previous => {
        const next = new Set(previous);
        if (next.has(kind)) next.delete(kind); else next.add(kind);
        return next;
    });

    if (collapsed) {
        return (
            <button
                className="flex flex-col items-center py-2 gap-1 cursor-pointer"
                style={{ width: 36, border: 0, borderRight: '1px solid #E5E5E0', background: '#FAFAF8', flexShrink: 0 }}
                onClick={onToggleCollapse}
                title="Expand diagram elements"
                aria-label="Expand diagram elements"
            >
                <span style={{ color: '#6B7280', fontSize: 18 }}>›</span>
                <span style={{ fontSize: 10, color: '#6B7280', writingMode: 'vertical-rl' }}>Diagram Elements</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden" style={{ width: 240, borderRight: '1px solid #E5E5E0', background: '#FAFAF8', flexShrink: 0 }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0', flexShrink: 0 }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Diagram Elements</span>
                <button onClick={onToggleCollapse} title="Collapse diagram elements" aria-label="Collapse diagram elements"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, lineHeight: 1 }}>‹</button>
            </div>

            <div className="px-2 pt-2 pb-1" style={{ flexShrink: 0 }}>
                <input value={search} onChange={event => setSearch(event.target.value)}
                    placeholder="Search elements…" className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{ fontSize: FONT.xs, background: '#F0F0ED', border: '1px solid #E5E5E0', color: '#374151' }} />
            </div>

            <div className="flex-1 overflow-y-auto py-1">
                {groups.map(group => {
                    const isCollapsed = collapsedKinds.has(group.kind);
                    const color = LAYER_COLORS[group.elements[0]?.layer] ?? '#6B7280';
                    return (
                        <div key={group.kind}>
                            <button onClick={() => toggleKind(group.kind)} className="w-full flex items-center gap-1.5 px-2 py-1"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                <span style={{ fontSize: 10, color }}>{isCollapsed ? '▶' : '▼'}</span>
                                <span className="truncate" style={{ fontSize: 10, color, fontWeight: 700 }}>{group.kind}</span>
                                <span style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 'auto' }}>{group.elements.length}</span>
                            </button>
                            {!isCollapsed && group.elements.map(element => {
                                const selected = selectedElementId === element.id;
                                return (
                                    <button key={element.id} onClick={() => inspectElement(element.id)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
                                        style={{
                                            border: 'none', cursor: 'pointer', fontSize: FONT.xs,
                                            background: selected ? '#DDF7EF' : 'transparent',
                                            color: selected ? '#116149' : '#374151',
                                            fontWeight: selected ? 600 : 400,
                                        }} title={`Highlight ${element.name} in diagram`}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                                        <span className="truncate flex-1">{element.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
                {groups.length === 0 && (
                    <div className="p-3 text-center" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>
                        {search ? 'No matching elements' : 'No elements in this diagram'}
                    </div>
                )}
            </div>
        </div>
    );
}

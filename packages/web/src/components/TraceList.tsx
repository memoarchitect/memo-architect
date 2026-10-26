// ─── The list view of a traceability matrix ───────────────────────────────────
//
// The layout of a traceability report: an Item, and the items it links to, one per line. Every row is laid out
// only when it scrolls into view, so a long list stays light.

import { useMemo, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { elementIdTitle } from '../lib/trace-labels';
import type { TraceLinks } from '../lib/trace-axis';
import { NO_TABLE_FILTER, filterTraceRows, linkedKinds, type TraceTableFilter } from '../lib/trace-table';
import { TraceTableFilters } from './TraceTableFilters';
import { COLOR, FONT } from '../styles/tokens';

/**
 * The traceability report's layout: an Item, and the items it links to, one per line. Every row is laid out
 * only when it scrolls into view, so a long list stays light.
 */
/** An element as its id and its title: the id in its own chip, so a long title never swallows it. */
function IdTitle({ element, fallback }: { element: Parameters<typeof elementIdTitle>[0]; fallback: string }) {
    const { id, title } = elementIdTitle(element, fallback);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            {id && <span className="font-mono" style={{ flexShrink: 0, color: COLOR.muted, background: COLOR.surfaceAlt, padding: '0 6px', borderRadius: 5, fontSize: FONT.xs }}>{id}</span>}
            <span>{title}</span>
        </span>
    );
}

export function TraceList({ model, rowIds, links, onSelect, selectedId }: {
    model: MemoModelDTO;
    rowIds: readonly string[];
    links: TraceLinks;
    onSelect: (id: string) => void;
    selectedId: string | null;
}) {
    const cell = { padding: '7px 12px', fontSize: FONT.xs, lineHeight: 1.5 } as const;
    const [filter, setFilter] = useState<TraceTableFilter>(NO_TABLE_FILTER);
    const kinds = useMemo(() => linkedKinds(model, rowIds, links), [model, rowIds, links]);
    const visible = useMemo(() => filterTraceRows(model, rowIds, links, filter), [model, rowIds, links, filter]);
    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TraceTableFilters filter={filter} onChange={setFilter} kinds={kinds} shown={visible.length} total={rowIds.length} />
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '14px' }}>
            <div style={{ minWidth: 640, border: `1px solid ${COLOR.border}`, borderRadius: '6px', background: COLOR.surface }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) 3fr', position: 'sticky', top: 0, zIndex: 5, background: COLOR.surfaceAlt, borderBottom: `1px solid ${COLOR.border}`, fontWeight: 600, color: COLOR.primary }}>
                    <div style={cell}>Item</div>
                    <div style={cell}>Links</div>
                </div>
                {visible.length === 0 && (
                    <div style={{ ...cell, padding: '24px 12px', color: COLOR.faint, textAlign: 'center' }}>No row matches these filters.</div>
                )}
                {visible.map(id => {
                    const linked = links.byRow.get(id) ?? [];
                    return (
                        <div
                            key={id}
                            style={{
                                display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) 3fr', borderBottom: `1px solid ${COLOR.borderLight}`,
                                contentVisibility: 'auto', containIntrinsicSize: `auto ${24 + Math.max(1, linked.length) * 20}px`,
                                background: selectedId === id ? '#E8F8F3' : undefined,
                            }}
                        >
                            <div style={{ ...cell, fontWeight: 600, color: COLOR.primary, cursor: 'pointer' }} onClick={() => onSelect(id)}>
                                <IdTitle element={model.elements[id]} fallback={id} />
                            </div>
                            <div style={{ ...cell, color: COLOR.secondary }}>
                                {linked.length === 0
                                    ? <span style={{ color: COLOR.faint, fontStyle: 'italic' }}>No links</span>
                                    : linked.map(other => (
                                        <div key={other} onClick={() => onSelect(other)} style={{ cursor: 'pointer' }}>
                                            <IdTitle element={model.elements[other]} fallback={other} />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
}

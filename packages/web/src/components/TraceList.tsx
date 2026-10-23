// ─── The list view of a traceability matrix ───────────────────────────────────
//
// The layout of a traceability report: an Item, and the items it links to, one per line. Every row is laid out
// only when it scrolls into view, so a long list stays light.

import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import type { TraceLinks } from '../lib/trace-axis';
import { COLOR, FONT } from '../styles/tokens';

/** An element as a report names it: its id and its title. */
function itemLabel(element: MemoElement | undefined, id: string): string {
    if (!element) return id;
    return element.shortId && !element.name.startsWith(element.shortId) ? `${element.shortId} ${element.name}` : element.name;
}

/**
 * The traceability report's layout: an Item, and the items it links to, one per line. Every row is laid out
 * only when it scrolls into view, so a long list stays light.
 */
export function TraceList({ model, rowIds, links, onSelect, selectedId }: {
    model: MemoModelDTO;
    rowIds: readonly string[];
    links: TraceLinks;
    onSelect: (id: string) => void;
    selectedId: string | null;
}) {
    const cell = { padding: '7px 12px', fontSize: FONT.xs, lineHeight: 1.5 } as const;
    return (
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '14px' }}>
            <div style={{ minWidth: 640, border: `1px solid ${COLOR.border}`, borderRadius: '6px', background: COLOR.surface }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) 3fr', position: 'sticky', top: 0, zIndex: 5, background: COLOR.surfaceAlt, borderBottom: `1px solid ${COLOR.border}`, fontWeight: 600, color: COLOR.primary }}>
                    <div style={cell}>Item</div>
                    <div style={cell}>Links</div>
                </div>
                {rowIds.map(id => {
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
                                {itemLabel(model.elements[id], id)}
                            </div>
                            <div style={{ ...cell, color: COLOR.secondary }}>
                                {linked.length === 0
                                    ? <span style={{ color: COLOR.faint, fontStyle: 'italic' }}>No links</span>
                                    : linked.map(other => (
                                        <div key={other} onClick={() => onSelect(other)} style={{ cursor: 'pointer' }}>
                                            {itemLabel(model.elements[other], other)}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

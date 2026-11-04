// ─── BDD table ───────────────────────────────────────────────────────────────
//
// The table presentation of a block definition view: one row per element,
// indented by depth, with a caret on any row that has children — a
// spreadsheet outline. Collapse state is the canvas's own `expandedNodes`, so
// it carries over from tree and containment.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { MemoElement } from '@memoarchitect/tools/browser';
import type { CompositionTree } from './templates/composition-tree';
import { flattenBddRows } from './templates/bdd-table';

const INDENT = 18;
const LINE = '#E5E5E0';

export function BddTableView({ tree, expanded, definitions, onToggle, onInspect }: {
    tree: CompositionTree;
    expanded: ReadonlySet<string>;
    definitions?: ReadonlyMap<string, MemoElement>;
    onToggle: (id: string) => void;
    onInspect?: (id: string) => void;
}) {
    const rows = useMemo(() => flattenBddRows(tree, expanded, definitions), [tree, expanded, definitions]);
    const header = { padding: '6px 10px', textAlign: 'left' as const, fontWeight: 600, fontSize: 11, color: '#374151', background: '#F0F0ED', borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, position: 'sticky' as const, top: 0, zIndex: 1 };
    const cell = { padding: '4px 10px', fontSize: 12, borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, whiteSpace: 'nowrap' as const };
    return (
        <div role="treegrid" aria-label="Block hierarchy table" data-bdd-table="true"
            style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'auto', background: '#FFFFFF' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
                <thead>
                    <tr>
                        <th style={{ ...header, width: '45%' }}>Name</th>
                        <th style={header}>Kind</th>
                        <th style={header}>Typed by</th>
                        <th style={header}>Id</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const branch = row.childCount > 0;
                        const typedBy = (row.element.attributes.usageType ?? '').split('::').pop() ?? '';
                        return (
                            <tr key={row.id} role="row" aria-level={row.depth + 1}
                                aria-expanded={branch ? row.expanded : undefined}
                                style={{ background: row.depth === 0 ? '#F7F9FA' : undefined }}>
                                <td style={{ ...cell, paddingLeft: 10 + row.depth * INDENT }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        {branch ? (
                                            <button type="button" onClick={() => onToggle(row.id)}
                                                aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.name}`}
                                                title={row.expanded ? 'Collapse' : 'Expand'}
                                                style={{ width: 16, height: 16, lineHeight: '14px', padding: 0, border: '1px solid #9AA5AF', borderRadius: 3, background: '#FFFFFF', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                {row.expanded ? '−' : '+'}
                                            </button>
                                        ) : <span style={{ width: 16, display: 'inline-block' }} />}
                                        <a role="link" tabIndex={0} onClick={() => onInspect?.(row.id)}
                                            onKeyDown={event => { if (event.key === 'Enter') onInspect?.(row.id); }}
                                            style={{ cursor: onInspect ? 'pointer' : 'default', fontWeight: row.depth === 0 ? 700 : 500, color: '#1B3A4B' }}>
                                            {row.name}
                                        </a>
                                        {branch && !row.expanded && (
                                            <span style={{ color: '#8CA0B1', fontSize: 11 }}>{row.childCount} hidden</span>
                                        )}
                                    </span>
                                </td>
                                <td style={cell}>{row.element.kind}</td>
                                <td style={cell}>{typedBy}</td>
                                <td style={{ ...cell, color: '#5B6470' }}>{row.element.attributes.providedId ?? ''}</td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && (
                        <tr><td colSpan={4} style={{ ...cell, color: '#8CA0B1' }}>This view has no elements.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

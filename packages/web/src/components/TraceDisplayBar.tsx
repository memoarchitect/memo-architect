// ─── How a built traceability matrix is shown ─────────────────────────────────
//
// Matrix or list, which rows and columns are shown (all, those with links, the gaps), the cell size, and whether
// links can be edited. Stateless: it shows the choices it is given and reports a change.

import type { ReactNode } from 'react';
import type { LineFilter, TraceView } from '../lib/trace-axis';
import { COLOR, FONT } from '../styles/tokens';

export interface TraceDisplayBarProps {
    view: TraceView;
    onView: (view: TraceView) => void;
    rowFilter: LineFilter;
    onRowFilter: (filter: LineFilter) => void;
    emptyRows: number;
    columnFilter: LineFilter;
    onColumnFilter: (filter: LineFilter) => void;
    emptyColumns: number;
    cellSize: number;
    onCellSize: (size: number) => void;
    editing: boolean;
    onEditing: (editing: boolean) => void;
    /** Writing links needs the dev server. */
    connected: boolean;
    /** What leads the bar: the name of the saved matrix and what can be done to it. */
    leading?: ReactNode;
    divided?: boolean;
}

export function TraceDisplayBar(props: TraceDisplayBarProps) {
    const { view, connected, editing } = props;
    return (
        <div className="flex items-center gap-4 px-4 py-2" style={{ flexWrap: 'wrap', borderTop: props.divided ? `1px solid ${COLOR.borderLight}` : undefined }}>
            {props.leading}
            <div role="group" aria-label="View" style={{ display: 'inline-flex', border: `1px solid ${COLOR.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                {(['matrix', 'list'] as const).map(option => (
                    <button
                        key={option} type="button" onClick={() => props.onView(option)} aria-pressed={view === option}
                        title={option === 'matrix' ? 'Rows against columns' : 'Each row with the items it links to'}
                        style={{
                            padding: '4px 14px', fontSize: FONT.xs, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: view === option ? COLOR.accent : COLOR.surface,
                            color: view === option ? '#fff' : COLOR.muted,
                        }}
                    >
                        {option === 'matrix' ? 'Matrix' : 'List'}
                    </button>
                ))}
            </div>
            <LineFilterControl label="Rows" value={props.rowFilter} onChange={props.onRowFilter} emptyCount={props.emptyRows} />
            <LineFilterControl label="Columns" value={props.columnFilter} onChange={props.onColumnFilter} emptyCount={props.emptyColumns} disabled={view === 'list'} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: FONT.xs, color: COLOR.muted }} title="Cell size">
                Zoom
                <input type="range" min={14} max={44} step={2} value={props.cellSize} onChange={event => props.onCellSize(Number(event.target.value))} style={{ width: '80px', accentColor: COLOR.accent }} />
            </label>
            <label
                title={connected
                    ? 'Click cells to add or remove trace links. Only leaf-to-leaf cells can be edited.'
                    : 'The dev server is unreachable, so nothing can be written to the model.'}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs,
                    padding: '4px 9px', borderRadius: '5px',
                    border: `1px solid ${editing ? COLOR.accent : COLOR.border}`,
                    background: editing ? '#E8F8F3' : COLOR.surface,
                    color: connected ? COLOR.primary : COLOR.faint,
                    cursor: connected ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}
            >
                <input type="checkbox" checked={editing} disabled={!connected} onChange={event => props.onEditing(event.target.checked)} style={{ accentColor: COLOR.accent }} />
                Edit trace
            </label>
        </div>
    );
}

/** All lines, those with links, or those with none (the gaps), and how many have none. */
export function LineFilterControl({ label, value, onChange, emptyCount, disabled = false }: {
    label: string; value: LineFilter; onChange: (next: LineFilter) => void; emptyCount: number; disabled?: boolean;
}) {
    const options: { id: LineFilter; text: string; title: string }[] = [
        { id: 'all', text: 'All', title: `Every ${label.toLowerCase().replace(/s$/, '')}` },
        { id: 'linked', text: 'With links', title: `Only ${label.toLowerCase()} that have a link` },
        { id: 'empty', text: `No links · ${emptyCount.toLocaleString()}`, title: `Only ${label.toLowerCase()} with no link: the gaps` },
    ];
    return (
        <div role="group" aria-label={`${label} shown`} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: disabled ? 0.45 : 1 }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>{label}</span>
            <span style={{ display: 'inline-flex', border: `1px solid ${COLOR.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                {options.map(option => (
                    <button
                        key={option.id} type="button" disabled={disabled} onClick={() => onChange(option.id)} aria-pressed={value === option.id} title={option.title}
                        style={{
                            padding: '3px 10px', fontSize: FONT.xs, fontWeight: 600, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                            background: value === option.id ? (option.id === 'empty' ? '#F59E0B' : COLOR.accent) : COLOR.surface,
                            color: value === option.id ? '#fff' : COLOR.muted,
                        }}
                    >
                        {option.text}
                    </button>
                ))}
            </span>
        </div>
    );
}

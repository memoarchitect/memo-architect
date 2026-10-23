// ─── How a built traceability matrix is shown ─────────────────────────────────
//
// Table or matrix, which rows and columns are shown (all, those with links, the gaps), the cell size, and whether
// links can be edited. These are settings, so they are drawn as settings (trays and a switch, see TraceControls);
// what can be done to the matrix (save it, edit it) arrives as `leading` and `trailing` and is drawn as actions.
// Stateless: it shows the choices it is given and reports a change.

import type { ReactNode } from 'react';
import type { LineFilter, TraceView } from '../lib/trace-axis';
import { ControlIcon, SegmentedControl, Switch, type SegmentOption } from './TraceControls';
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
    /** What leads the bar: the name of the saved matrix. */
    leading?: ReactNode;
    /** What can be done to the matrix: save it, edit it. */
    trailing?: ReactNode;
    divided?: boolean;
}

const VIEWS: readonly SegmentOption<TraceView>[] = [
    { id: 'list', label: 'Table', icon: ControlIcon.list, title: 'Each row with the items it links to' },
    { id: 'matrix', label: 'Matrix', icon: ControlIcon.grid, title: 'Rows against columns' },
];

const lineOptions = (noun: string, emptyCount: number): readonly SegmentOption<LineFilter>[] => [
    { id: 'all', label: 'All', title: `Every ${noun}` },
    { id: 'linked', label: 'With links', title: `Only ${noun}s that have a link` },
    { id: 'empty', label: `No links · ${emptyCount.toLocaleString()}`, title: `Only ${noun}s with no link: the gaps`, tone: 'warn' },
];

/** A setting with a name: which lines are shown. */
function Setting({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>{label}</span>
            {children}
        </div>
    );
}

export function TraceDisplayBar(props: TraceDisplayBarProps) {
    const { view, connected, editing } = props;
    return (
        <div className="flex items-center gap-4 px-4 py-2" style={{ flexWrap: 'wrap', borderTop: props.divided ? `1px solid ${COLOR.borderLight}` : undefined }}>
            {props.leading}
            <SegmentedControl ariaLabel="View" options={VIEWS} value={view} onChange={props.onView} />
            <Setting label="Rows">
                <SegmentedControl ariaLabel="Rows shown" options={lineOptions('row', props.emptyRows)} value={props.rowFilter} onChange={props.onRowFilter} />
            </Setting>
            <Setting label="Columns">
                <SegmentedControl
                    ariaLabel="Columns shown" options={lineOptions('column', props.emptyColumns)} value={props.columnFilter}
                    onChange={props.onColumnFilter} disabled={view === 'list'}
                />
            </Setting>
            {view === 'matrix' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }} title="Cell size">
                    Zoom
                    <input type="range" min={14} max={44} step={2} value={props.cellSize} onChange={event => props.onCellSize(Number(event.target.value))} style={{ width: '80px', accentColor: COLOR.accent }} />
                </label>
            )}
            {view === 'matrix' && (
                <Switch
                    label="Edit trace" checked={editing} onChange={props.onEditing} disabled={!connected}
                    title={connected
                        ? 'Click cells to add or remove trace links. Only leaf-to-leaf cells can be edited.'
                        : 'The dev server is unreachable, so nothing can be written to the model.'}
                />
            )}
            {props.trailing && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{props.trailing}</span>}
        </div>
    );
}

// How one axis of an open matrix is read: expand or collapse its subsystems and
// sort their siblings. What the axis HOLDS is the definition's business and is
// edited in MatrixAxisEditor; these change only how it is laid out.

import type { DsmOrdering } from '../analysis/dsm-hierarchy';
import { Icon, IconButton, ToolbarCluster } from '../views/DiagramToolbarControls';
import { COLOR, FONT } from '../styles/tokens';

export const ORDERINGS: { value: DsmOrdering; label: string; title: string }[] = [
    { value: 'natural', label: 'Name', title: 'Alphabetical inside every parent' },
    { value: 'kind', label: 'Element type', title: 'Grouped by element type, then name' },
    { value: 'partition', label: 'Partition', title: 'Sequence siblings so dependencies sit above the diagonal, leaving only real cycles as feedback' },
    { value: 'cluster', label: 'Cluster', title: 'Keep mutually dependent siblings adjacent' },
];


export const selectStyle = {
    border: `1px solid ${COLOR.border}`, borderRadius: '5px',
    padding: '2px 5px', background: COLOR.surface, fontSize: FONT.xs, color: COLOR.primary,
} as const;


/** Axis controls belong to the axis they change; they never silently reshape the other one. */
export function AxisExpansionControls({
    axis, onExpandAll, onCollapseAll, onExpandToDepth, showLabel = true, showDepth = true, compact = false,
}: {
    axis: 'rows' | 'columns';
    onExpandAll: (axis: 'rows' | 'columns') => void;
    onCollapseAll: (axis: 'rows' | 'columns') => void;
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
    showLabel?: boolean;
    showDepth?: boolean;
    compact?: boolean;
}) {
    const singular = axis === 'rows' ? 'row' : 'column';
    const label = axis === 'rows' ? 'Rows' : 'Columns';
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            {showLabel && <span style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{label}</span>}
            <ToolbarCluster>
                <IconButton
                    icon={<Icon.expand />}
                    onClick={() => onExpandAll(axis)}
                    title={`Expand every ${singular} subsystem`}
                    ariaLabel={`Expand all ${axis}`}
                />
                <IconButton
                    icon={<Icon.collapse />}
                    onClick={() => onCollapseAll(axis)}
                    title={`Collapse ${axis} to their top-level subsystems`}
                    ariaLabel={`Collapse all ${axis}`}
                />
            </ToolbarCluster>
            {showDepth && <AxisDepthSelect axis={axis} onExpandToDepth={onExpandToDepth} compact={compact} />}
        </div>
    );
}

function AxisDepthSelect({ axis, onExpandToDepth, compact = false }: {
    axis: 'rows' | 'columns';
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
    compact?: boolean;
}) {
    return (
        <select
                defaultValue=""
                aria-label={`Expand ${axis} to depth`}
                title={`Expand ${axis} to a specific depth`}
                onChange={event => {
                    const depth = Number(event.target.value);
                    if (depth > 0) onExpandToDepth(axis, depth);
                    event.currentTarget.value = '';
                }}
                style={compact ? { ...selectStyle, width: '82px' } : selectStyle}
            >
                <option value="">Depth…</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
        </select>
    );
}



interface Props {
    axis: 'rows' | 'columns';
    ordering: DsmOrdering;
    onOrderingChange: (ordering: DsmOrdering) => void;
    onExpandAll: (axis: 'rows' | 'columns') => void;
    onCollapseAll: (axis: 'rows' | 'columns') => void;
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
}

export function AxisViewControls({ axis, ordering, onOrderingChange, onExpandAll, onCollapseAll, onExpandToDepth }: Props) {
    return (
        <section style={{
            display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', boxSizing: 'border-box', padding: '6px 8px',
            border: `1px solid ${COLOR.border}`, borderRadius: '9px', background: '#FAFBFC',
        }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 700, color: COLOR.secondary }}>{axis === 'rows' ? 'Rows' : 'Columns'}</span>
            <AxisExpansionControls axis={axis} onExpandAll={onExpandAll} onCollapseAll={onCollapseAll} onExpandToDepth={onExpandToDepth} showLabel={false} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: FONT.xs, color: COLOR.muted }} title={`Sort ${axis} siblings`}>
                Sort
                <select
                    value={ordering} onChange={event => onOrderingChange(event.target.value as DsmOrdering)}
                    aria-label={`Sort ${axis} siblings`} title={ORDERINGS.find(entry => entry.value === ordering)?.title} style={selectStyle}
                >
                    {ORDERINGS.map(entry => <option key={entry.value} value={entry.value} title={entry.title}>{entry.label}</option>)}
                </select>
            </label>
        </section>
    );
}

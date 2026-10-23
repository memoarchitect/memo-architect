// ─── Filters for analysing the traceability table ─────────────────────────────
//
// Search, coverage against one kind of linked item (the gaps), and an order, with how many rows are left. It holds
// no state and does no filtering: it shows the filter it is given and reports a change (see lib/trace-table).

import { SegmentedControl, TextAction, type SegmentOption } from './TraceControls';
import { NO_TABLE_FILTER, isFiltering, type CoverageMode, type LinkedKind, type TraceSort, type TraceTableFilter } from '../lib/trace-table';
import { COLOR, FONT } from '../styles/tokens';

const SORTS: readonly { id: TraceSort; label: string }[] = [
    { id: 'order', label: 'Order as built' },
    { id: 'most', label: 'Most links first' },
    { id: 'fewest', label: 'Fewest links first' },
    { id: 'name', label: 'Name' },
];

const COVERAGE: readonly SegmentOption<CoverageMode>[] = [
    { id: 'linked', label: 'Linked', title: 'Rows that have a link to this kind' },
    { id: 'missing', label: 'Missing', title: 'Rows with no link to this kind: the gaps', tone: 'warn' },
];

const field = {
    padding: '5px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.xs,
    color: COLOR.primary, background: COLOR.surface,
} as const;

export function TraceTableFilters({ filter, onChange, kinds, shown, total }: {
    filter: TraceTableFilter;
    onChange: (next: TraceTableFilter) => void;
    kinds: readonly LinkedKind[];
    shown: number;
    total: number;
}) {
    const covered = filter.coverage?.kind ?? '';
    return (
        <div className="flex items-center gap-3 px-4 py-2" style={{ flexWrap: 'wrap', borderBottom: `1px solid ${COLOR.borderLight}`, background: COLOR.surface }}>
            <input
                type="search" value={filter.search} onChange={event => onChange({ ...filter, search: event.target.value })}
                placeholder="Search items and links…" aria-label="Search the table" style={{ ...field, width: '210px' }}
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>
                Coverage
                <select
                    aria-label="Coverage of" value={covered} style={field}
                    onChange={event => onChange({ ...filter, coverage: event.target.value ? { kind: event.target.value, mode: filter.coverage?.mode ?? 'missing' } : null })}
                >
                    <option value="">Any link</option>
                    {kinds.map(entry => <option key={entry.kind} value={entry.kind}>to {entry.kind} · {entry.rows.toLocaleString()} linked</option>)}
                </select>
            </label>
            {filter.coverage && (
                <SegmentedControl
                    ariaLabel="Coverage" options={COVERAGE} value={filter.coverage.mode}
                    onChange={mode => onChange({ ...filter, coverage: { kind: filter.coverage!.kind, mode } })}
                />
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>
                Sort
                <select aria-label="Sort" value={filter.sort} style={field} onChange={event => onChange({ ...filter, sort: event.target.value as TraceSort })}>
                    {SORTS.map(sort => <option key={sort.id} value={sort.id}>{sort.label}</option>)}
                </select>
            </label>
            <span style={{ marginLeft: 'auto', fontSize: FONT.xs, color: COLOR.muted }}>
                {shown === total ? `${total.toLocaleString()} rows` : `${shown.toLocaleString()} of ${total.toLocaleString()} rows`}
                {isFiltering(filter) && <> · <TextAction onClick={() => onChange(NO_TABLE_FILTER)}>Clear</TextAction></>}
            </span>
        </div>
    );
}

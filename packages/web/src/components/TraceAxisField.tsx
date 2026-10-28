// ─── One axis of the traceability matrix ──────────────────────────────────────
//
// The shared types-or-memo-query card, fed with an axis and how many elements it selects. The card does the
// drawing; this only translates between the axis the screen keeps and the filter the card edits.

import { AxisFilterCard, type FilterState } from './AxisFilterCard';
import type { TypeFilterOption } from './TypeFilterSelect';
import type { AxisSelection } from '../lib/trace-axis';
import { axisToQuery } from '../lib/trace-axis';
import type { TraceAxisIds } from '../lib/use-trace-axis';

const toFilter = (axis: AxisSelection): FilterState => ({ kinds: axis.kinds, contains: axis.contains ?? '', advanced: Boolean(axis.advanced), raw: axis.query });

export function TraceAxisField({ title, axis, onChange, kindOptions, kindParents, selection }: {
    title: string;
    axis: AxisSelection;
    onChange: (next: AxisSelection) => void;
    kindOptions: TypeFilterOption[];
    kindParents?: ReadonlyMap<string, string>;
    selection: TraceAxisIds;
}) {
    return (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <AxisFilterCard
                title={title}
                filter={toFilter(axis)}
                kindOptions={kindOptions}
                kindParents={kindParents}
                emptyHint="Choose element types, or part of a name."
                counting={selection.counting}
                evaluation={{ query: axisToQuery(axis), count: selection.ids.length, preview: [], error: selection.error }}
                onChange={filter => onChange(filter.advanced
                    // switching to a query starts from the one the types stand for; switching back keeps the types
                    ? { kinds: filter.kinds, contains: filter.contains, query: filter.raw, advanced: true }
                    : { kinds: filter.kinds, contains: filter.contains, query: axis.query, advanced: false })}
            />
        </div>
    );
}

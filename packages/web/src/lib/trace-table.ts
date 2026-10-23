// ─── Analysing the traceability table ─────────────────────────────────────────
//
// A trace table is read to find what is missing: which requirements link to no risk, which needs link to nothing
// but one requirement. These are the filters for that, kept apart from drawing so they can be tested and reused:
// a text search, a coverage test against one kind of linked item, and an order.

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { elementLabel } from './trace-labels';
import type { TraceLinks } from './trace-axis';

export type TraceSort = 'order' | 'most' | 'fewest' | 'name';
export type CoverageMode = 'linked' | 'missing';

export interface TraceTableFilter {
    /** Words that must all appear in the row's label, or in the label of one of its links. */
    search: string;
    /** Rows that do (`linked`) or do not (`missing`) link to an item of this kind. */
    coverage: { kind: string; mode: CoverageMode } | null;
    sort: TraceSort;
}

export const NO_TABLE_FILTER: TraceTableFilter = { search: '', coverage: null, sort: 'order' };

export const isFiltering = (filter: TraceTableFilter): boolean =>
    filter.search.trim() !== '' || filter.coverage !== null || filter.sort !== 'order';

export interface LinkedKind { kind: string; rows: number }

/** The kinds the rows link to, each with how many rows link to one. These are what coverage can be asked about. */
export function linkedKinds(model: MemoModelDTO, rowIds: readonly string[], links: TraceLinks): LinkedKind[] {
    const rowsPerKind = new Map<string, number>();
    for (const id of rowIds) {
        const kinds = new Set((links.byRow.get(id) ?? []).map(other => model.elements[other]?.kind).filter((kind): kind is string => Boolean(kind)));
        for (const kind of kinds) rowsPerKind.set(kind, (rowsPerKind.get(kind) ?? 0) + 1);
    }
    return [...rowsPerKind].map(([kind, rows]) => ({ kind, rows })).sort((a, b) => a.kind.localeCompare(b.kind));
}

/** The rows that pass the filter, in the order asked for. */
export function filterTraceRows(
    model: MemoModelDTO, rowIds: readonly string[], links: TraceLinks, filter: TraceTableFilter,
): string[] {
    const words = filter.search.toLowerCase().split(/\s+/).filter(Boolean);
    const label = (id: string) => elementLabel(model.elements[id], id).toLowerCase();
    const kindsOf = (id: string) => new Set((links.byRow.get(id) ?? []).map(other => model.elements[other]?.kind));

    let rows = rowIds.filter(id => {
        if (filter.coverage) {
            const has = kindsOf(id).has(filter.coverage.kind);
            if (has !== (filter.coverage.mode === 'linked')) return false;
        }
        if (words.length === 0) return true;
        const text = [label(id), ...(links.byRow.get(id) ?? []).map(label)].join(' ');
        return words.every(word => text.includes(word));
    });

    const count = (id: string) => links.byRow.get(id)?.length ?? 0;
    if (filter.sort === 'most') rows = [...rows].sort((a, b) => count(b) - count(a));
    else if (filter.sort === 'fewest') rows = [...rows].sort((a, b) => count(a) - count(b));
    else if (filter.sort === 'name') rows = [...rows].sort((a, b) => label(a).localeCompare(label(b)));
    return rows;
}

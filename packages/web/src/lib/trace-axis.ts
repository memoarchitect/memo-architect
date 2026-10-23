// ─── Row and column selection for the traceability matrix ─────────────────────
//
// A matrix axis is one or more ontology element types, or a memo-query. Types are worked out in the
// browser from the model it already holds, so choosing them is instant; a query is run by the server.
// A built matrix is kept per model so coming back to the screen does not compute it again.

import type { MatrixDefinitionDTO, MemoModelDTO } from '@memoarchitect/tools/browser';
import { filterFromQuery, queryFromFilter } from './matrix-views';
import { kindsUnder, type KindParents } from '../analysis/kind-hierarchy';
import { defaultContainmentTypes, type HierarchicalDsmResult } from '../analysis/dsm-hierarchy';

export interface AxisSelection {
    /** Element types on the axis; each stands for the type and everything that specializes it. */
    kinds: string[];
    /** A memo-query, used instead of the types when `advanced` is on. */
    query: string;
    /** The axis is written as a query rather than picked as types. */
    advanced?: boolean;
}

export const EMPTY_AXIS: AxisSelection = { kinds: [], query: '' };

/** The grid draws only what is in view, so the limit is the memory and time of building it, not the browser. */
export const TRACE_MAX_CELLS = 1_000_000;

/**
 * The elements an axis of types selects, ordered by type then name. An axis written as a query is
 * evaluated by the server (see `useTraceAxis`), so it selects nothing here.
 */
export function selectAxis(model: MemoModelDTO | null, axis: AxisSelection, parents?: KindParents): string[] {
    if (!model || axis.advanced || axis.kinds.length === 0) return [];
    const universe = new Set<string>();
    for (const element of Object.values(model.elements)) universe.add(element.kind);
    const kinds = new Set<string>();
    for (const kind of axis.kinds) {
        for (const under of parents ? kindsUnder(kind, parents, universe) : [kind]) kinds.add(under);
    }
    return Object.values(model.elements)
        .filter(element => kinds.has(element.kind))
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
        .map(element => element.id);
}

/** Why a pair of axes is not built, or null when it may be. */
export function traceLimit(rows: number, columns: number): string | null {
    if (rows === 0 || columns === 0) return null;
    const cells = rows * columns;
    if (cells <= TRACE_MAX_CELLS) return null;
    return `${rows.toLocaleString()} rows × ${columns.toLocaleString()} columns is ${cells.toLocaleString()} cells, `
        + `more than the ${TRACE_MAX_CELLS.toLocaleString()} this matrix builds. Narrow an axis.`;
}

// ─── Saved as a view ──────────────────────────────────────────────────────────

/** The memo-query an axis is saved as: the query as written, or the one the types stand for. */
export const axisToQuery = (axis: AxisSelection): string => (axis.advanced ? axis.query.trim() : queryFromFilter(axis.kinds, ''));

/**
 * The axis a saved query stands for: types when it is only `kind:`, otherwise the query itself, which
 * opens as a query to edit. (A name condition from an older view is kept as the query it is.)
 */
export function axisFromQuery(query: string | undefined): AxisSelection {
    const text = (query ?? '').trim();
    const filter = filterFromQuery(text);
    if (filter && !filter.contains) return { kinds: filter.kinds, query: text };
    return { kinds: [], query: text, advanced: true };
}

/** What a saved traceability matrix states for a selection. Nothing is written for an empty field. */
export function matrixFromSelection(selection: { rows: AxisSelection; columns: AxisSelection; linkTypes: string[] }, system?: string): MatrixDefinitionDTO {
    const rowQuery = axisToQuery(selection.rows);
    const columnQuery = axisToQuery(selection.columns);
    return {
        ...(system ? { system } : {}),
        ...(rowQuery ? { rowAxis: { query: rowQuery } } : {}),
        ...(columnQuery ? { columnAxis: { query: columnQuery } } : {}),
        ...(selection.linkTypes.length > 0 ? { linkTypes: selection.linkTypes } : {}),
    };
}

// ─── What is linked to what ───────────────────────────────────────────────────

export interface TraceLinks {
    /** For each row element, the column elements it is linked to, in axis order. */
    byRow: Map<string, string[]>;
    /** For each column element, the row elements it is linked to, in axis order. */
    byColumn: Map<string, string[]>;
}

/**
 * The links between the rows and the columns, read the way the matrix reads them: a link counts in either
 * direction, structure (containment) is not a trace, and `linkTypes` (empty means any) narrows what counts.
 * One pass over the relationships, so it is cheap enough to run on every selection.
 */
export function traceLinks(
    model: MemoModelDTO, rowIds: readonly string[], columnIds: readonly string[], linkTypes: readonly string[],
): TraceLinks {
    const containment = new Set(defaultContainmentTypes(model));
    const types = new Set(linkTypes);
    const rowOrder = new Map(rowIds.map((id, index) => [id, index]));
    const columnOrder = new Map(columnIds.map((id, index) => [id, index]));
    const rowSets = new Map<string, Set<string>>();
    const columnSets = new Map<string, Set<string>>();
    const add = (map: Map<string, Set<string>>, key: string, value: string) => {
        const set = map.get(key);
        if (set) set.add(value); else map.set(key, new Set([value]));
    };
    for (const relation of model.relationships) {
        if (containment.has(relation.type) || (types.size > 0 && !types.has(relation.type))) continue;
        const { sourceId: a, targetId: b } = relation;
        if (a === b) continue;
        if (rowOrder.has(a) && columnOrder.has(b)) { add(rowSets, a, b); add(columnSets, b, a); }
        if (rowOrder.has(b) && columnOrder.has(a)) { add(rowSets, b, a); add(columnSets, a, b); }
    }
    const ordered = (sets: Map<string, Set<string>>, order: Map<string, number>) =>
        new Map([...sets].map(([key, set]) => [key, [...set].sort((x, y) => order.get(x)! - order.get(y)!)]));
    return { byRow: ordered(rowSets, columnOrder), byColumn: ordered(columnSets, rowOrder) };
}

/** Which lines of an axis are shown: all of them, those with links, or those with none (the gaps). */
export type LineFilter = 'all' | 'linked' | 'empty';

export function applyLineFilter(ids: readonly string[], linked: ReadonlyMap<string, unknown>, filter: LineFilter): string[] {
    if (filter === 'all') return [...ids];
    return ids.filter(id => linked.has(id) === (filter === 'linked'));
}

// ─── The display choices, kept across reloads ─────────────────────────────────

export type TraceView = 'matrix' | 'list';

export interface TraceDisplay {
    view: TraceView;
    rowFilter: LineFilter;
    columnFilter: LineFilter;
}

const STORAGE_KEY = 'memo-architect.traceability-display.v1';

const lineFilter = (value: unknown): LineFilter => (value === 'linked' || value === 'empty' ? value : 'all');

export function loadDisplay(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): TraceDisplay {
    try {
        const value = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') as Partial<TraceDisplay>;
        return { view: value.view === 'list' ? 'list' : 'matrix', rowFilter: lineFilter(value.rowFilter), columnFilter: lineFilter(value.columnFilter) };
    } catch {
        return { view: 'matrix', rowFilter: 'all', columnFilter: 'all' };
    }
}

export function saveDisplay(display: TraceDisplay, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(display)); } catch { /* storage full or blocked: a convenience */ }
}

function safeStorage(): Storage | undefined {
    try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

// ─── A built matrix, kept per model ───────────────────────────────────────────

const MAX_KEPT = 6;
const built = new WeakMap<object, Map<string, HierarchicalDsmResult>>();

/** The matrix already built for this model and request, if any. The model changing drops them all. */
export function builtMatrix(model: object, key: string): HierarchicalDsmResult | undefined {
    const kept = built.get(model);
    const found = kept?.get(key);
    if (found && kept) { kept.delete(key); kept.set(key, found); } // most recently used last
    return found;
}

export function keepMatrix(model: object, key: string, result: HierarchicalDsmResult): void {
    let kept = built.get(model);
    if (!kept) built.set(model, kept = new Map());
    kept.set(key, result);
    while (kept.size > MAX_KEPT) kept.delete(kept.keys().next().value as string);
}

/** Everything that changes what the matrix looks like, as one string. */
export function matrixKey(parts: {
    rowIds: readonly string[]; columnIds: readonly string[]; linkTypes: readonly string[];
    expandedRows: ReadonlySet<string>; expandedColumns: ReadonlySet<string>;
}): string {
    return [
        parts.rowIds.join(','), parts.columnIds.join(','), [...parts.linkTypes].sort().join(','),
        [...parts.expandedRows].sort().join(','), [...parts.expandedColumns].sort().join(','),
    ].join('|');
}

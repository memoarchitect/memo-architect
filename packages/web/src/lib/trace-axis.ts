// ─── Row and column selection for the traceability matrix ─────────────────────
//
// A matrix axis is chosen the simple way: one or more element types, and an optional name filter.
// The selection is worked out in the browser from the model it already holds, so choosing is instant
// and needs no server round trip. The last selection is remembered, and a built matrix is kept per
// model so coming back to the screen does not compute it again.

import type { MatrixDefinitionDTO, MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { filterFromQuery, queryFromFilter } from './matrix-views';
import { kindsUnder, type KindParents } from '../analysis/kind-hierarchy';
import { defaultContainmentTypes, type HierarchicalDsmResult } from '../analysis/dsm-hierarchy';

export interface AxisSelection {
    /** Element types on the axis; each stands for the type and everything that specializes it. */
    kinds: string[];
    /** Words that must all appear in an element's name, id, short id or package. Empty means no filter. */
    text: string;
}

export const EMPTY_AXIS: AxisSelection = { kinds: [], text: '' };

/** The grid draws only what is in view, so the limit is the memory and time of building it, not the browser. */
export const TRACE_MAX_CELLS = 1_000_000;

/** The elements an axis selects: its types (with subtypes) narrowed by the text, ordered by type then name. */
export function selectAxis(model: MemoModelDTO | null, axis: AxisSelection, parents?: KindParents): string[] {
    if (!model || axis.kinds.length === 0) return [];
    const universe = new Set<string>();
    for (const element of Object.values(model.elements)) universe.add(element.kind);
    const kinds = new Set<string>();
    for (const kind of axis.kinds) {
        for (const under of parents ? kindsUnder(kind, parents, universe) : [kind]) kinds.add(under);
    }
    const words = axis.text.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (element: MemoElement) => {
        if (words.length === 0) return true;
        const haystack = `${element.name} ${element.id} ${element.shortId ?? ''} ${element.package ?? ''}`.toLowerCase();
        return words.every(word => haystack.includes(word));
    };
    return Object.values(model.elements)
        .filter(element => kinds.has(element.kind) && matches(element))
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
        .map(element => element.id);
}

/** Why a pair of axes is not built, or null when it may be. */
export function traceLimit(rows: number, columns: number): string | null {
    if (rows === 0 || columns === 0) return null;
    const cells = rows * columns;
    if (cells <= TRACE_MAX_CELLS) return null;
    return `${rows.toLocaleString()} rows × ${columns.toLocaleString()} columns is ${cells.toLocaleString()} cells, `
        + `more than the ${TRACE_MAX_CELLS.toLocaleString()} this matrix builds. Narrow an axis with a name filter.`;
}

// ─── Saved as a view ──────────────────────────────────────────────────────────

/** The memo-query an axis is saved as; empty when it has no types and no text. */
export const axisToQuery = (axis: AxisSelection): string => queryFromFilter(axis.kinds, axis.text);

/** The axis a saved query stands for, or null when it is not one of ours (a hand-written query). */
export function axisFromQuery(query: string | undefined): AxisSelection | null {
    const filter = filterFromQuery(query ?? '');
    return filter ? { kinds: filter.kinds, text: filter.contains } : null;
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

/** The ids that have at least one link, keeping their order. */
export function withLinks(ids: readonly string[], linked: ReadonlyMap<string, unknown>): string[] {
    return ids.filter(id => linked.has(id));
}

// ─── The last selection, kept across reloads ──────────────────────────────────

export type TraceView = 'matrix' | 'list';

export interface TraceSelection {
    rows: AxisSelection;
    columns: AxisSelection;
    linkTypes: string[];
    view?: TraceView;
    hideEmptyRows?: boolean;
    hideEmptyColumns?: boolean;
}

const STORAGE_KEY = 'memo-architect.traceability-selection.v1';

export function loadSelection(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): TraceSelection | null {
    try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<TraceSelection>;
        const axis = (a: Partial<AxisSelection> | undefined): AxisSelection => ({
            kinds: Array.isArray(a?.kinds) ? a!.kinds!.filter(k => typeof k === 'string') : [],
            text: typeof a?.text === 'string' ? a.text : '',
        });
        return {
            rows: axis(value.rows),
            columns: axis(value.columns),
            linkTypes: Array.isArray(value.linkTypes) ? value.linkTypes.filter(t => typeof t === 'string') : [],
            view: value.view === 'list' ? 'list' : 'matrix',
            hideEmptyRows: value.hideEmptyRows === true,
            hideEmptyColumns: value.hideEmptyColumns === true,
        };
    } catch {
        return null;
    }
}

export function saveSelection(selection: TraceSelection, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(selection)); } catch { /* storage full or blocked: the selection is a convenience */ }
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

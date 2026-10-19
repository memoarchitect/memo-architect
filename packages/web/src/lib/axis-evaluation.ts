// ─── Evaluating a matrix axis ─────────────────────────────────────────────────
//
// An axis is hand-picked elements, a memo-query, or both. The query is run by
// the server (`query:run`, the DHF query executor); this module only joins its
// answer with the picked ids and decides whether the result may be drawn.

import type { AxisQueryResult } from '@memoarchitect/tools/browser';
import { requestAxisQuery } from '../store/ws-client';
import { AXIS_ID_LIMIT, MATRIX_CELL_CAP, type AxisDraft } from './matrix-views';

export interface AxisEvaluation {
    /** The query text this was evaluated for, so a later edit is seen to make it stale. */
    query: string;
    /** Distinct elements on the axis. */
    count: number;
    /** Every id, when the axis is small enough to be sent by id. */
    ids?: string[];
    preview: AxisQueryResult['preview'];
    error?: string;
}

/** Join the picked ids with the elements a query matched. Pure, so it is tested without a server. */
export function joinAxis(picked: readonly string[], matched: AxisQueryResult | undefined): AxisEvaluation & { query: '' } {
    if (!matched) return { query: '', count: new Set(picked).size, ids: [...new Set(picked)], preview: [] };
    if (matched.error) return { query: '', count: 0, preview: [], error: matched.error };
    if (!matched.ids) {
        // Too many to send by id: the count stands, the ids are withheld, and the axis cannot be drawn.
        return { query: '', count: matched.count, preview: matched.preview };
    }
    const ids = [...new Set([...picked, ...matched.ids])];
    return { query: '', count: ids.length, ids, preview: matched.preview };
}

export async function evaluateAxis(axis: AxisDraft, previewLimit = 25): Promise<AxisEvaluation> {
    const query = axis.query.trim();
    if (!query) return { ...joinAxis(axis.elementIds, undefined), query };
    try {
        const matched = await requestAxisQuery(query, { idLimit: AXIS_ID_LIMIT, previewLimit });
        return { ...joinAxis(axis.elementIds, matched), query };
    } catch (e) {
        return { query, count: 0, preview: [], error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * Why a pair of axes may not be drawn, or null when it may. The grid draws every
 * cell it is given, so the product is capped; a wider axis is refused, never
 * silently sliced.
 */
export function refusalFor(rows: AxisEvaluation, columns: AxisEvaluation, cap = MATRIX_CELL_CAP): string | null {
    if (rows.error || columns.error) return null; // reported on the axis itself
    for (const [name, axis] of [['rows', rows], ['columns', columns]] as const) {
        if (!axis.ids && axis.count > 0) {
            return `The ${name} axis holds ${axis.count.toLocaleString()} elements, more than the ${AXIS_ID_LIMIT.toLocaleString()} one axis can list. Narrow its query.`;
        }
    }
    const cells = rows.count * columns.count;
    if (cells > cap) {
        return `${rows.count.toLocaleString()} rows × ${columns.count.toLocaleString()} columns is ${cells.toLocaleString()} cells, `
            + `more than the ${cap.toLocaleString()} this grid draws. Narrow an axis.`;
    }
    return null;
}

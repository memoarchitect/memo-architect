// ─── The elements an axis selects ─────────────────────────────────────────────
//
// An axis of types is read from the model in the browser: instant. An axis written as a memo-query is run
// by the server (the same executor the documents use), so it is debounced while typing and reports that it
// is counting; the count is what the screen shows beside it and what Build waits for.

import { useEffect, useMemo, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { KindParents } from '../analysis/kind-hierarchy';
import { evaluateAxis } from './axis-evaluation';
import { selectAxis, type AxisSelection } from './trace-axis';

export interface TraceAxisIds {
    ids: string[];
    /** A query is being run. */
    counting: boolean;
    /** Why the axis cannot be used (a query the server refused, or one that selects too many). */
    error?: string;
}

const QUERY_DELAY_MS = 350;

/** What the server answered, and for which query in which workspace. */
export interface QueriedAxis extends TraceAxisIds {
    query: string;
    workspace: string | null;
}

/**
 * The axis as the screen may use it. An answer to another query is not this axis yet: it is still counting. The
 * query changes in the same render as the request to build on it, before the effect that runs the new query has
 * marked it as counting, so an answer that is not checked against its query is the previous axis passed off as
 * this one (choosing a second quick trace built it on the first one's columns).
 */
export function settledAxis(queried: QueriedAxis, query: string, workspace: string | null): TraceAxisIds {
    if (!query) return { ids: [], counting: false };
    if (queried.query !== query || queried.workspace !== workspace) return { ids: [], counting: true };
    return { ids: queried.ids, counting: queried.counting, ...(queried.error ? { error: queried.error } : {}) };
}

export function useTraceAxis(
    model: MemoModelDTO | null, axis: AxisSelection, parents: KindParents, workspace: string | null,
): TraceAxisIds {
    const fromTypes = useMemo(() => selectAxis(model, axis, parents), [model, axis, parents]);
    const [queried, setQueried] = useState<QueriedAxis>({ ids: [], counting: false, query: '', workspace: null });
    const query = axis.advanced ? axis.query.trim() : '';

    useEffect(() => {
        if (!axis.advanced || !query) return undefined;
        let cancelled = false;
        const timer = setTimeout(() => {
            void evaluateAxis({ query, elementIds: [] }, 0, workspace ?? undefined).then(result => {
                if (cancelled) return;
                const elements = model?.elements ?? {};
                const ids = (result.ids ?? []).filter(id => elements[id])
                    .sort((a, b) => elements[a].kind.localeCompare(elements[b].kind) || elements[a].name.localeCompare(elements[b].name));
                setQueried({
                    ids, counting: false, query, workspace,
                    error: result.error ?? (result.ids ? undefined : `The query selects ${result.count.toLocaleString()} elements, too many to list. Narrow it.`),
                });
            });
        }, QUERY_DELAY_MS);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [axis.advanced, query, workspace, model]);

    return axis.advanced ? settledAxis(queried, query, workspace) : { ids: fromTypes, counting: false };
}

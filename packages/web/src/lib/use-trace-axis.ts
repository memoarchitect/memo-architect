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

export function useTraceAxis(
    model: MemoModelDTO | null, axis: AxisSelection, parents: KindParents, workspace: string | null,
): TraceAxisIds {
    const fromTypes = useMemo(() => selectAxis(model, axis, parents), [model, axis, parents]);
    const [queried, setQueried] = useState<TraceAxisIds>({ ids: [], counting: false });
    const query = axis.advanced ? axis.query.trim() : '';

    useEffect(() => {
        if (!axis.advanced) return undefined;
        if (!query) { setQueried({ ids: [], counting: false }); return undefined; }
        let cancelled = false;
        setQueried(current => ({ ...current, counting: true, error: undefined }));
        const timer = setTimeout(() => {
            void evaluateAxis({ query, elementIds: [] }, 0, workspace ?? undefined).then(result => {
                if (cancelled) return;
                const elements = model?.elements ?? {};
                const ids = (result.ids ?? []).filter(id => elements[id])
                    .sort((a, b) => elements[a].kind.localeCompare(elements[b].kind) || elements[a].name.localeCompare(elements[b].name));
                setQueried({
                    ids, counting: false,
                    error: result.error ?? (result.ids ? undefined : `The query selects ${result.count.toLocaleString()} elements, too many to list. Narrow it.`),
                });
            });
        }, QUERY_DELAY_MS);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [axis.advanced, query, workspace, model]);

    return axis.advanced ? queried : { ids: fromTypes, counting: false };
}

// ─── Which quick traces the chosen system can answer ──────────────────────────
//
// A quick trace is offered as working only when the system holds something for both of its sides. Each side is
// counted the way the matrix counts it: types in the browser, a memo-query by the server in that system's
// workspace. A query shared by several traces is run once.

import { useEffect, useMemo, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { KindParents } from '../analysis/kind-hierarchy';
import { evaluateAxis } from './axis-evaluation';
import { selectAxis, type AxisSelection } from './trace-axis';
import type { TracePreset } from './trace-presets';

/** Rows and columns a quick trace holds in the chosen system; absent while a side is being counted. */
export type PresetCounts = ReadonlyMap<string, { rows: number; columns: number }>;

const queryOf = (axis: AxisSelection) => (axis.advanced ? axis.query.trim() : '');

/** The counts of every preset, from the type counts and the answers to their queries. Pure, so it is tested alone. */
export function presetCounts(
    presets: readonly TracePreset[], countTypes: (axis: AxisSelection) => number, answered: ReadonlyMap<string, number>,
): PresetCounts {
    const counts = new Map<string, { rows: number; columns: number }>();
    const count = (axis: AxisSelection) => (queryOf(axis) ? answered.get(queryOf(axis)) : countTypes(axis));
    for (const preset of presets) {
        const rows = count(preset.rows);
        const columns = count(preset.columns);
        if (rows !== undefined && columns !== undefined) counts.set(preset.id, { rows, columns });
    }
    return counts;
}

export function usePresetCounts(
    presets: readonly TracePreset[], model: MemoModelDTO | null, parents: KindParents, workspace: string | null,
): PresetCounts {
    const queries = useMemo(
        () => [...new Set(presets.flatMap(preset => [queryOf(preset.rows), queryOf(preset.columns)]).filter(Boolean))],
        [presets],
    );
    const [answered, setAnswered] = useState<{ workspace: string | null; counts: Map<string, number> }>({ workspace: null, counts: new Map() });

    useEffect(() => {
        if (!model) return undefined;
        let cancelled = false;
        void Promise.all(queries.map(async query => {
            const result = await evaluateAxis({ query, elementIds: [] }, 0, workspace ?? undefined);
            return [query, result.error ? 0 : result.count] as const;
        })).then(entries => {
            if (!cancelled) setAnswered({ workspace, counts: new Map(entries) });
        });
        return () => { cancelled = true; };
    }, [queries, workspace, model]);

    return useMemo(() => presetCounts(
        presets,
        axis => selectAxis(model, axis, parents).length,
        answered.workspace === workspace ? answered.counts : new Map(),
    ), [presets, model, parents, workspace, answered]);
}

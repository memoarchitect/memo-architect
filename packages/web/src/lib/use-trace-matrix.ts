// ─── Building the matrix ──────────────────────────────────────────────────────
//
// Given a request (the elements on each axis and the relations that count), this builds the matrix and says
// what it is doing: it narrows the lines to those with links, or to the gaps; shows progress while it works;
// keeps what it built so asking again is instant; and refuses a request it cannot answer, saying why. The
// screen hands it a request and reads back the result; how it is computed is not the screen's concern.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { computeHierarchicalDSM, type HierarchicalDsmResult } from '../analysis/dsm-hierarchy';
import type { ProgressState } from '../components/ProgressBar';
import { applyLineFilter, builtMatrix, keepMatrix, matrixKey, traceLimit, traceLinks, type LineFilter, type TraceLinks, type TraceView } from './trace-axis';

/** The request a built matrix answers. */
export interface TraceRequest { rowIds: string[]; columnIds: string[]; linkTypes: string[] }

export interface TraceMatrixOptions {
    model: MemoModelDTO | null;
    view: TraceView;
    rowFilter: LineFilter;
    columnFilter: LineFilter;
}

export interface TraceMatrix {
    /** What was last asked for; null until something is. */
    committed: TraceRequest | null;
    /** What is on screen: the request narrowed by the line filters. */
    shown: TraceRequest | null;
    links: TraceLinks | null;
    emptyRows: number;
    emptyColumns: number;
    result: HierarchicalDsmResult | null;
    progress: ProgressState | null;
    /** Why there is nothing to draw, when there is a reason. */
    refusal: string | null;
    commit: (request: TraceRequest) => void;
    /** Forget the request and its result. */
    clear: () => void;
    toggleRow: (id: string) => void;
    toggleColumn: (id: string) => void;
    /** Let another part of the screen (evaluating a saved matrix) use the same progress line and message. */
    report: (progress: ProgressState | null, refusal?: string | null) => void;
}

/** Let the browser paint the progress bar before a block of synchronous work starts. */
const paint = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

const toggled = (current: Set<string>, id: string) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
};

export function useTraceMatrix({ model, view, rowFilter, columnFilter }: TraceMatrixOptions): TraceMatrix {
    const [committed, setCommitted] = useState<TraceRequest | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
    const [result, setResult] = useState<HierarchicalDsmResult | null>(null);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [refusal, setRefusal] = useState<string | null>(null);

    const commit = useCallback((request: TraceRequest) => {
        setExpandedRows(new Set());
        setExpandedColumns(new Set());
        setCommitted(request);
    }, []);
    const clear = useCallback(() => {
        setCommitted(null);
        setResult(null);
        setProgress(null);
        setRefusal(null);
        setExpandedRows(new Set());
        setExpandedColumns(new Set());
    }, []);
    const report = useCallback((next: ProgressState | null, message: string | null = null) => {
        setProgress(next);
        setRefusal(message);
    }, []);

    const links = useMemo<TraceLinks | null>(
        () => (model && committed ? traceLinks(model, committed.rowIds, committed.columnIds, committed.linkTypes) : null),
        [model, committed],
    );
    const emptyRows = committed && links ? committed.rowIds.length - links.byRow.size : 0;
    const emptyColumns = committed && links ? committed.columnIds.length - links.byColumn.size : 0;
    const shown = useMemo<TraceRequest | null>(() => (committed && links ? {
        rowIds: applyLineFilter(committed.rowIds, links.byRow, rowFilter),
        columnIds: applyLineFilter(committed.columnIds, links.byColumn, columnFilter),
        linkTypes: committed.linkTypes,
    } : null), [committed, links, rowFilter, columnFilter]);

    useEffect(() => {
        if (view !== 'matrix' || !model || !shown) return undefined;
        // An empty axis would mean "everything" to the engine: say there is nothing instead.
        if (shown.rowIds.length === 0 || shown.columnIds.length === 0) {
            setResult(null); setProgress(null);
            setRefusal(rowFilter === 'empty' || columnFilter === 'empty'
                ? 'Nothing is empty: every row and column has links.'
                : 'No links between these rows and columns. Show all the lines, or change the selection.');
            return undefined;
        }
        const key = matrixKey({ ...shown, expandedRows, expandedColumns });
        const kept = builtMatrix(model, key);
        if (kept) { setResult(kept); setProgress(null); setRefusal(null); return undefined; }
        const why = traceLimit(shown.rowIds.length, shown.columnIds.length);
        if (why) { setRefusal(why); setResult(null); return undefined; }

        let cancelled = false;
        void (async () => {
            setRefusal(null);
            setProgress({
                label: `Selected ${shown.rowIds.length.toLocaleString()} rows × ${shown.columnIds.length.toLocaleString()} columns`,
                step: 1, steps: 2,
            });
            await paint();
            if (cancelled) return;
            setProgress({ label: 'Building the matrix', step: 2, steps: 2 });
            await paint();
            if (cancelled) return;
            const built = computeHierarchicalDSM(model, {
                rows: { elementIds: shown.rowIds, expanded: expandedRows, ordering: 'natural' },
                columns: { elementIds: shown.columnIds, expanded: expandedColumns, ordering: 'natural' },
                dependencyTypes: shown.linkTypes,
                // Trace is read as a link between two elements, not as a direction: a requirement verified by
                // a test and a test verifying a requirement are the same coverage fact.
                symmetric: true,
            });
            keepMatrix(model, key, built);
            if (cancelled) return;
            setResult(built);
            setProgress(null);
        })();
        return () => { cancelled = true; };
    }, [view, model, shown, rowFilter, columnFilter, expandedRows, expandedColumns]);

    return {
        committed, shown, links, emptyRows, emptyColumns, result, progress, refusal,
        commit, clear, report,
        toggleRow: useCallback((id: string) => setExpandedRows(current => toggled(current, id)), []),
        toggleColumn: useCallback((id: string) => setExpandedColumns(current => toggled(current, id)), []),
    };
}

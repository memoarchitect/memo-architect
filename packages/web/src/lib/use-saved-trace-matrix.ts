// ─── A traceability matrix kept in the model ──────────────────────────────────
//
// A matrix worth keeping is declared in the model as a view (so it is listed with the others and opens from the
// panel). This owns that life: finding the one the screen is open on, putting its rows, columns and relations
// back in the draft when it opens, telling whether the draft has changed since, and writing it back or saving
// it as a new one. It reaches the matrix builder only through a narrow interface, so it does not know how a
// matrix is built.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import type { ProgressState } from '../components/ProgressBar';
import { evaluateAxis } from './axis-evaluation';
import { MATRIX_VIEW_DEFINITIONS, axisFrom, stableMatrix } from './matrix-views';
import { axisFromQuery, axisToQuery, matrixFromSelection } from './trace-axis';
import type { TraceDraft } from './use-trace-draft';
import type { TraceRequest } from './use-trace-matrix';

/** What the saved-matrix logic asks of whatever builds the matrix. */
export interface TraceBuilder {
    /** Build the draft once its axes have been counted. */
    requestBuild(): void;
    /** Show a request that was already worked out. */
    commit(request: TraceRequest): void;
    report(progress: ProgressState | null, refusal?: string | null): void;
}

export type SaveStatus = { kind: 'ok' | 'error'; message: string } | null;

export function useSavedTraceMatrix(draft: TraceDraft, builder: TraceBuilder) {
    const wholeModel = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const createMatrixView = useModelStore(s => s.createMatrixView);
    const updateMatrixView = useModelStore(s => s.updateMatrixView);
    const createPackage = useModelStore(s => s.createPackage);

    const [status, setStatus] = useState<SaveStatus>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    /** Set when the open matrix was saved with picked elements, which the pickers cannot show. */
    const [customNote, setCustomNote] = useState<string | null>(null);
    /** The package a New started in, offered when the matrix is saved. */
    const [newPackage, setNewPackage] = useState('');

    const definitionId = activeView.type === 'traceability' ? activeView.definitionId : undefined;
    const definition = useMemo(
        () => (definitionId
            ? wholeModel?.diagrams?.find(d => d.elementId === definitionId && d.viewDefinition === MATRIX_VIEW_DEFINITIONS.traceability)
            : undefined),
        [wholeModel?.diagrams, definitionId],
    );
    const packageChoices = useMemo(
        () => [...new Set((wholeModel?.diagrams ?? []).map(d => d.package).filter((name): name is string => Boolean(name)))].sort(),
        [wholeModel?.diagrams],
    );

    // Opening a matrix puts its rows, columns and relations in the draft and builds it. One saved with picked
    // elements cannot be shown as pickers, so its axes are evaluated and it is shown as it is.
    const openedId = definition?.elementId;
    useEffect(() => {
        if (!definition) { setCustomNote(null); return undefined; }
        const matrix = definition.matrix ?? {};
        const picked = (matrix.rowAxis?.elementIds?.length ?? 0) + (matrix.columnAxis?.elementIds?.length ?? 0) > 0;
        draft.replace({ linkTypes: matrix.linkTypes ?? [], system: matrix.system });
        setStatus(null);
        if (!picked) {
            setCustomNote(null);
            draft.replace({ rowAxis: axisFromQuery(matrix.rowAxis?.query), columnAxis: axisFromQuery(matrix.columnAxis?.query) });
            builder.requestBuild();
            return undefined;
        }
        let cancelled = false;
        void (async () => {
            builder.report({ label: 'Evaluating the saved matrix', step: 1, steps: 2 });
            const [rows, columns] = await Promise.all([
                evaluateAxis(axisFrom(matrix.rowAxis), 0, matrix.system),
                evaluateAxis(axisFrom(matrix.columnAxis), 0, matrix.system),
            ]);
            if (cancelled) return;
            const error = rows.error ?? columns.error;
            if (error || !rows.ids || !columns.ids) {
                builder.report(null, error ?? 'The saved matrix holds too many elements to show. Narrow it.');
                return;
            }
            builder.report(null);
            draft.clear();
            setCustomNote('This matrix was saved with picked elements, so it is shown but its rows and columns cannot be edited here.');
            builder.commit({ rowIds: rows.ids, columnIds: columns.ids, linkTypes: matrix.linkTypes ?? [] });
        })();
        return () => { cancelled = true; };
    }, [openedId]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentMatrix = useMemo(
        () => matrixFromSelection({ rows: draft.rowAxis, columns: draft.columnAxis, linkTypes: draft.linkTypes }, draft.system),
        [draft.rowAxis, draft.columnAxis, draft.linkTypes, draft.system],
    );
    const savable = connected && axisToQuery(draft.rowAxis) !== '' && axisToQuery(draft.columnAxis) !== '';
    const unsaved = Boolean(definition) && !customNote && stableMatrix(definition?.matrix) !== stableMatrix(currentMatrix);

    /** Write the draft back to the matrix that is open. */
    const save = useCallback(async () => {
        if (!definition?.elementId) return;
        setSaving(true);
        const outcome = await updateMatrixView(definition.elementId, { matrix: currentMatrix });
        setSaving(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Saved to “${definition.name}”.` }
            : { kind: 'error', message: outcome.error ?? 'The matrix could not be saved.' });
    }, [definition, updateMatrixView, currentMatrix]);

    /** Save the draft as a new matrix, in a package when one is named, and open it. Resolves true when it was saved. */
    const saveAs = useCallback(async (value: { name: string; package: string }): Promise<boolean> => {
        setSaving(true);
        setSaveError(null);
        try {
            let packageName = value.package || undefined;
            if (packageName && !packageChoices.includes(packageName)) {
                const segments = packageName.split('::');
                const made = await createPackage(segments[segments.length - 1], segments.length > 1 ? segments.slice(0, -1).join('::') : undefined);
                if (!made.success) throw new Error(made.error ?? 'The package could not be created.');
                packageName = made.qualifiedName ?? packageName;
            }
            const outcome = await createMatrixView({
                name: value.name, viewDefinition: MATRIX_VIEW_DEFINITIONS.traceability, package: packageName, matrix: currentMatrix,
            });
            if (!outcome.success) throw new Error(outcome.error ?? 'The matrix could not be saved.');
            setStatus({ kind: 'ok', message: `Saved as “${value.name}”. It is listed under Traceability matrices.` });
            // Open it, so the panel marks it and the next Save updates it.
            if (outcome.elementId) setActiveView({ type: 'traceability', definitionId: outcome.elementId });
            return true;
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error));
            return false;
        } finally {
            setSaving(false);
        }
    }, [packageChoices, createPackage, createMatrixView, currentMatrix, setActiveView]);

    /** New: leave the matrix that is open, remembering the package the New was started in. */
    const startNew = useCallback((packageName?: string) => {
        setActiveView({ type: 'traceability' });
        setCustomNote(null);
        setStatus(null);
        setNewPackage(packageName ?? '');
    }, [setActiveView]);

    return {
        definition, definitionId, packageChoices, newPackage,
        savable, unsaved, customNote, saving, saveError, status,
        save, saveAs, startNew, clearSaveError: () => setSaveError(null), setStatus,
    };
}

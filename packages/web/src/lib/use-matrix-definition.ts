// ─── The matrix a screen is open on ───────────────────────────────────────────
//
// Both matrix screens open on nothing and draw nothing until a definition is
// selected in their tree or created there. This hook is the state they share:
//
//   definition — the view the active view names, from `model.diagrams`;
//   draft      — what is being edited (axes, options); loaded when a different
//                definition opens, and never rewritten under an edit;
//   snapshot   — the element ids each axis evaluated to the last time the
//                matrix was rendered. Editing an axis changes the draft, not the
//                grid, until Render is pressed, so a half-typed query cannot
//                redraw a large matrix on every keystroke;
//   save       — writes the draft into the definition's own declaration.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiagramDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { useScopedModel } from '../store/scoped-model';
import { evaluateAxis, refusalFor, type AxisEvaluation } from './axis-evaluation';
import { resolveGroups } from './matrix-groups';
import type { DsmNamedGroup } from '../analysis/dsm-hierarchy';
import { requestAxisQuery } from '../store/ws-client';
import {
    draftFrom, draftToMatrix, EMPTY_DRAFT, MATRIX_VIEW_DEFINITIONS, stableMatrix,
    type MatrixDraft, type MatrixScreen,
} from './matrix-views';

export interface MatrixSnapshot {
    rowIds: string[];
    columnIds: string[];
    /** Picked ids that are no longer in the model, per axis. */
    missingRows: number;
    missingColumns: number;
    /** DSM only: the critical elements, to mark on the axis and in the cell inspector. */
    criticalIds: ReadonlySet<string>;
    /** DSM only: the named groups, resolved to the elements they hold. */
    groups: DsmNamedGroup[];
}

export type Notice = { kind: 'ok' | 'error'; message: string } | null;

export function useMatrixDefinition(screen: MatrixScreen) {
    const model = useScopedModel();
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const updateMatrixView = useModelStore(s => s.updateMatrixView);

    const definitionId = activeView.type === screen ? activeView.definitionId : undefined;
    const definition: DiagramDTO | undefined = useMemo(
        () => (definitionId
            ? model?.diagrams?.find(d => d.elementId === definitionId && d.viewDefinition === MATRIX_VIEW_DEFINITIONS[screen])
            : undefined),
        [model?.diagrams, definitionId, screen],
    );

    const [draft, setDraft] = useState<MatrixDraft>(EMPTY_DRAFT);
    const [editing, setEditing] = useState(false);
    const [rowEvaluation, setRowEvaluation] = useState<AxisEvaluation | undefined>();
    const [columnEvaluation, setColumnEvaluation] = useState<AxisEvaluation | undefined>();
    const [snapshot, setSnapshot] = useState<MatrixSnapshot | null>(null);
    const [refusal, setRefusal] = useState<string | null>(null);
    const [rendering, setRendering] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const token = useRef(0);
    const openAsCreated = useRef(false);
    const elementsRef = useRef(model?.elements);
    elementsRef.current = model?.elements;
    const relationshipsRef = useRef(model?.relationships);
    relationshipsRef.current = model?.relationships;

    const savedSignature = stableMatrix(definition?.matrix);
    const draftSignature = stableMatrix(draftToMatrix(draft, screen));
    const dirty = Boolean(definition) && savedSignature !== draftSignature;

    /** Evaluate both axes and draw the matrix, or say why it was not drawn. */
    const render = useCallback(async (from: MatrixDraft) => {
        const mine = ++token.current;
        setRendering(true);
        setSnapshot(null);
        setRefusal(null);
        const rowAxis = screen === 'dsm' ? from.axis : from.rowAxis;
        const columnAxis = screen === 'dsm' ? from.axis : from.columnAxis;
        const rows = await evaluateAxis(rowAxis);
        const columns = screen === 'dsm' ? rows : await evaluateAxis(columnAxis);
        if (mine !== token.current) return;
        setRowEvaluation(rows);
        setColumnEvaluation(columns);
        setRendering(false);
        if (rows.error || columns.error) return;
        const elements = elementsRef.current ?? {};
        const present = (ids: string[] | undefined) => (ids ?? []).filter(id => elements[id]);
        const why = refusalFor(rows, columns);
        if (why) { setRefusal(why); return; }
        const rowIds = present(rows.ids);
        const columnIds = present(columns.ids);
        // The DSM-only options are evaluated with the axis, so a render is one coherent reading.
        let criticalIds = new Set<string>();
        let groups: DsmNamedGroup[] = [];
        if (screen === 'dsm') {
            const critical = await evaluateAxis(from.criticalElements);
            if (mine !== token.current) return;
            if (critical.error) { setNotice({ kind: 'error', message: `Critical elements: ${critical.error}` }); }
            criticalIds = new Set(critical.ids ?? []);
            const matched = new Map<string, readonly string[]>();
            for (const group of from.groups.filter(entry => entry.groupedBy === 'memoQuery' && entry.expression?.trim())) {
                const found = await requestAxisQuery(group.expression!.trim(), { idLimit: 5000, previewLimit: 0 }).catch(() => undefined);
                if (found?.ids) matched.set(group.expression!.trim(), found.ids);
            }
            if (mine !== token.current) return;
            groups = resolveGroups(from.groups, rowIds, id => elements[id]?.package, relationshipsRef.current ?? [], matched);
        }
        setSnapshot({
            criticalIds, groups,
            rowIds, columnIds,
            missingRows: (rows.ids?.length ?? 0) - rowIds.length,
            missingColumns: (columns.ids?.length ?? 0) - columnIds.length,
        });
    }, [screen]);

    // A different definition opens: load its draft and draw it. Creating one
    // opens it for editing; selecting an existing one does not.
    const openedId = definition?.elementId;
    useEffect(() => {
        token.current++;
        setSnapshot(null);
        setRefusal(null);
        setRowEvaluation(undefined);
        setColumnEvaluation(undefined);
        setNotice(null);
        setRendering(false);
        if (!openedId) { setDraft(EMPTY_DRAFT); setEditing(false); return; }
        const loaded = draftFrom(definition?.matrix);
        setDraft(loaded);
        setEditing(openAsCreated.current);
        openAsCreated.current = false;
        void render(loaded);
        // Only a change of definition reloads; the definition object itself changes with every model update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openedId]);

    // The declaration changed under us (a save, or an edit to the file) and there is nothing unsaved to lose.
    useEffect(() => {
        if (!definition || dirty) return;
        const incoming = draftFrom(definition.matrix);
        if (stableMatrix(draftToMatrix(incoming, screen)) !== draftSignature) setDraft(incoming);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedSignature]);

    const select = useCallback((elementId: string | null, created = false) => {
        openAsCreated.current = created;
        setActiveView({ type: screen, ...(elementId ? { definitionId: elementId } : {}) });
    }, [screen, setActiveView]);

    const save = useCallback(async () => {
        if (!definition?.elementId) return;
        setSaving(true);
        setNotice(null);
        const result = await updateMatrixView(definition.elementId, { matrix: draftToMatrix(draft, screen) });
        setSaving(false);
        setNotice(result.success
            ? { kind: 'ok', message: `Saved “${definition.name}” to ${definition.package ?? 'its package'}.` }
            : { kind: 'error', message: result.error ?? 'The matrix was not saved.' });
    }, [definition, draft, screen, updateMatrixView]);

    return {
        definition, definitionId, draft, setDraft, editing, setEditing, dirty, select,
        rowEvaluation, columnEvaluation, setRowEvaluation, setColumnEvaluation,
        snapshot, refusal, rendering, render: () => render(draft),
        save, saving, notice, setNotice,
    };
}

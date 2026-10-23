// ─── Traceability Matrix ─────────────────────────────────────────────────────
//
// Pick the rows, pick the columns, get the matrix. Each axis is one or more
// element types and an optional name filter; Relations narrows which links
// count. Nothing else stands between the choice and the grid.
//
// Two options shape what is shown: rows or columns with no links can be hidden,
// and the grid can be switched to a plain list (an item, and the items it links
// to), the layout of a traceability report.
//
// Choosing is instant (it reads the model already in the browser), building
// shows its progress, the grid draws only what is in view so it never freezes,
// and a built matrix is kept so returning to the screen does not compute it
// again. The last selection is remembered across reloads.
//
// A selection can be saved as a view: it is declared in the model, listed in the
// Traceability matrices panel on the left, and opening it from there brings the same rows, columns and relations
// back. (The list/hide-empty options are display choices, remembered on this
// machine, not part of the saved view.)
//
// Authoring is unchanged: with "Edit trace" on, click a cell to inspect or
// remove the links behind it, or add one. The types offered for a pair are the
// ones `legalRelationshipTypes` says are legal, so a link this view offers is a
// link the server accepts.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    legalRelationshipTypes,
    type LegalRelationshipOption,
    type MemoRelationship,
} from '@memoarchitect/tools/browser';
import { getRegistries, useModelStore } from '../store/model-store';
import {
    computeHierarchicalDSM,
    relationshipTypesInModel,
    type DsmAggregateCell,
    type DsmAxisEntry,
    type HierarchicalDsmResult,
} from '../analysis/dsm-hierarchy';
import { ProgressBar, type ProgressState } from '../components/ProgressBar';
import { MatrixDefinitionTree } from '../components/MatrixDefinitionTree';
import { HierarchicalMatrix, type MatrixCellStyle } from '../components/HierarchicalMatrix';
import { TypeFilterSelect, type TypeFilterOption } from '../components/TypeFilterSelect';
import { kindParents } from '../analysis/kind-hierarchy';
import { scopeModel } from '../lib/workspace-scope';
import { evaluateAxis } from '../lib/axis-evaluation';
import { MATRIX_VIEW_DEFINITIONS, axisFrom, stableMatrix } from '../lib/matrix-views';
import {
    EMPTY_AXIS, axisFromQuery, matrixFromSelection, builtMatrix, keepMatrix, loadSelection, matrixKey, saveSelection, selectAxis, traceLimit, traceLinks, withLinks,
    type AxisSelection, type TraceLinks, type TraceView,
} from '../lib/trace-axis';
import type { MemoElement } from '@memoarchitect/tools/browser';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

// ─── View ────────────────────────────────────────────────────────────────────

interface CellFocus {
    row: DsmAxisEntry;
    column: DsmAxisEntry;
    cell: DsmAggregateCell | null;
}

type Status = { kind: 'ok' | 'error'; message: string } | null;

/** The request a built matrix answers: the elements on each axis and the relations that count. */
interface Committed { rowIds: string[]; columnIds: string[]; linkTypes: string[] }

/** Let the browser paint the progress bar before a block of synchronous work starts. */
const paint = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

const NO_IDS: string[] = [];

export function TraceabilityMatrix() {
    const wholeModel = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    // The model as the workspace chosen in the header shows it.
    const model = useMemo(() => (wholeModel ? scopeModel(wholeModel, workspace ?? null) : null), [wholeModel, workspace]);
    const connected = useModelStore(s => s.connected);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const createRelationship = useModelStore(s => s.createRelationship);
    const deleteRelationship = useModelStore(s => s.deleteRelationship);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const createMatrixView = useModelStore(s => s.createMatrixView);
    const updateMatrixView = useModelStore(s => s.updateMatrixView);
    const createPackage = useModelStore(s => s.createPackage);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const parents = useMemo(() => kindParents(availableOntologies), [availableOntologies]);
    const registries = useMemo(() => getRegistries(model), [model]);

    // The selection, applied by Build. Only the display choices are remembered from the last visit: a selection
    // worth keeping is saved as a view, and opens from the panel.
    const restored = useRef(loadSelection());
    const [rowAxis, setRowAxis] = useState<AxisSelection>(EMPTY_AXIS);
    const [columnAxis, setColumnAxis] = useState<AxisSelection>(EMPTY_AXIS);
    const [linkTypes, setLinkTypes] = useState<string[]>([]);
    // The builder (axes, relations, Build, Save) is out of the way until New or Edit view asks for it.
    const [builderOpen, setBuilderOpen] = useState(false);
    /** The package a New started in, offered when the matrix is saved. */
    const [newPackage, setNewPackage] = useState('');
    const [view, setView] = useState<TraceView>(restored.current?.view ?? 'matrix');
    const [hideEmptyRows, setHideEmptyRows] = useState(restored.current?.hideEmptyRows ?? false);
    const [hideEmptyColumns, setHideEmptyColumns] = useState(restored.current?.hideEmptyColumns ?? false);
    const [committed, setCommitted] = useState<Committed | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

    const [result, setResult] = useState<HierarchicalDsmResult | null>(null);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [refusal, setRefusal] = useState<string | null>(null);

    // Clicking cells to add or remove trace links; separate from choosing the axes.
    const [editing, setEditing] = useState(false);
    const [cellSize, setCellSize] = useState(30);
    const [focus, setFocus] = useState<CellFocus | null>(null);
    const [status, setStatus] = useState<Status>(null);
    const [linkQuery, setLinkQuery] = useState('');
    const [busy, setBusy] = useState(false);

    // The saved view this screen is open on, when it was opened from the explorer or just saved.
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
    const [saveDialog, setSaveDialog] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    /** Set when the open view was saved with a query this screen cannot show as fields. */
    const [customNote, setCustomNote] = useState<string | null>(null);
    const pendingBuild = useRef(false);

    // ── Choosing ─────────────────────────────────────────────────────────────

    const kindOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model) return [];
        const counts = new Map<string, number>();
        for (const element of Object.values(model.elements)) counts.set(element.kind, (counts.get(element.kind) ?? 0) + 1);
        return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, hint: String(count) }));
    }, [model]);

    const linkOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model) return [];
        const counts = new Map<string, number>();
        for (const relation of model.relationships) counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
        return relationshipTypesInModel(model).map(value => ({ value, hint: String(counts.get(value) ?? 0), color: relationshipColor(value) }));
    }, [model]);

    // Counted live as the choice is made: the selection is a filter over the model already held.
    const rowIds = useMemo(() => selectAxis(model, rowAxis, parents), [model, rowAxis, parents]);
    const columnIds = useMemo(() => selectAxis(model, columnAxis, parents), [model, columnAxis, parents]);
    const limit = traceLimit(rowIds.length, columnIds.length);
    const canBuild = rowIds.length > 0 && columnIds.length > 0 && !limit;
    const stale = useMemo(() => !committed
        || committed.rowIds.join(',') !== rowIds.join(',')
        || committed.columnIds.join(',') !== columnIds.join(',')
        || [...committed.linkTypes].sort().join(',') !== [...linkTypes].sort().join(','),
    [committed, rowIds, columnIds, linkTypes]);

    // The selection and the view options are remembered as they change, so a reload comes back to them.
    useEffect(() => {
        saveSelection({ rows: rowAxis, columns: columnAxis, linkTypes, view, hideEmptyRows, hideEmptyColumns });
    }, [rowAxis, columnAxis, linkTypes, view, hideEmptyRows, hideEmptyColumns]);

    const build = useCallback(() => {
        if (!canBuild) return;
        setExpandedRows(new Set());
        setExpandedColumns(new Set());
        setFocus(null);
        setCommitted({ rowIds, columnIds, linkTypes });
    }, [canBuild, rowAxis, columnAxis, linkTypes, rowIds, columnIds]);

    // Opening a saved view puts its rows, columns and relations in the pickers and builds it. A view saved
    // with a hand-written query or picked elements cannot be shown as fields, so its axes are evaluated.
    const openedId = definition?.elementId;
    useEffect(() => {
        if (!definition) { setCustomNote(null); return undefined; }
        setBuilderOpen(false);
        const matrix = definition.matrix ?? {};
        const rows = axisFromQuery(matrix.rowAxis?.query);
        const columns = axisFromQuery(matrix.columnAxis?.query);
        const picked = (matrix.rowAxis?.elementIds?.length ?? 0) + (matrix.columnAxis?.elementIds?.length ?? 0) > 0;
        setLinkTypes(matrix.linkTypes ?? []);
        setStatus(null);
        if (rows && columns && !picked) {
            setCustomNote(null);
            setRowAxis(rows);
            setColumnAxis(columns);
            pendingBuild.current = true;
            return undefined;
        }
        let cancelled = false;
        void (async () => {
            setProgress({ label: 'Evaluating the saved view', step: 1, steps: 2 });
            const [rowResult, columnResult] = await Promise.all([
                evaluateAxis(axisFrom(matrix.rowAxis), 0, matrix.system),
                evaluateAxis(axisFrom(matrix.columnAxis), 0, matrix.system),
            ]);
            if (cancelled) return;
            setProgress(null);
            const error = rowResult.error ?? columnResult.error;
            if (error || !rowResult.ids || !columnResult.ids) {
                setRefusal(error ?? 'The saved view holds too many elements to show. Narrow it.');
                return;
            }
            setRowAxis(EMPTY_AXIS);
            setColumnAxis(EMPTY_AXIS);
            setCustomNote('This view was saved with a hand-written query or picked elements, so it is shown but not edited as fields.');
            setExpandedRows(new Set());
            setExpandedColumns(new Set());
            setCommitted({ rowIds: rowResult.ids, columnIds: columnResult.ids, linkTypes: matrix.linkTypes ?? [] });
        })();
        return () => { cancelled = true; };
    }, [openedId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!pendingBuild.current || !canBuild) return;
        pendingBuild.current = false;
        build();
    }, [canBuild, build, rowIds, columnIds]);

    // ── Saving ───────────────────────────────────────────────────────────────

    const system = workspace ?? undefined;
    const currentMatrix = useMemo(
        () => matrixFromSelection({ rows: rowAxis, columns: columnAxis, linkTypes }, system),
        [rowAxis, columnAxis, linkTypes, system],
    );
    const savable = connected && rowAxis.kinds.length > 0 && columnAxis.kinds.length > 0;
    const unsaved = Boolean(definition) && !customNote && stableMatrix(definition?.matrix) !== stableMatrix(currentMatrix);

    const saveChanges = useCallback(async () => {
        if (!definition?.elementId) return;
        setSaving(true);
        const outcome = await updateMatrixView(definition.elementId, { matrix: currentMatrix });
        setSaving(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Saved to “${definition.name}”.` }
            : { kind: 'error', message: outcome.error ?? 'The view could not be saved.' });
    }, [definition, updateMatrixView, currentMatrix]);

    const saveAsNew = useCallback(async (value: { name: string; package: string }) => {
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
            if (!outcome.success) throw new Error(outcome.error ?? 'The view could not be saved.');
            setSaveDialog(false);
            setStatus({ kind: 'ok', message: `Saved as “${value.name}”. It is listed under Traceability matrices.` });
            // Open the new view, so the explorer marks it and the next Save updates it.
            if (outcome.elementId) setActiveView({ type: 'traceability', definitionId: outcome.elementId });
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error));
        } finally {
            setSaving(false);
        }
    }, [packageChoices, createPackage, createMatrixView, currentMatrix, setActiveView]);

    /** New: an empty selection, with the builder open to fill it in. */
    const startNew = useCallback((packageName?: string) => {
        setActiveView({ type: 'traceability' });
        setRowAxis(EMPTY_AXIS);
        setColumnAxis(EMPTY_AXIS);
        setLinkTypes([]);
        setCommitted(null);
        setResult(null);
        setProgress(null);
        setRefusal(null);
        setCustomNote(null);
        setStatus(null);
        setFocus(null);
        setExpandedRows(new Set());
        setExpandedColumns(new Set());
        setNewPackage(packageName ?? '');
        setBuilderOpen(true);
    }, [setActiveView]);

    // ── What is linked, and what is shown ────────────────────────────────────

    const links = useMemo<TraceLinks | null>(
        () => (model && committed ? traceLinks(model, committed.rowIds, committed.columnIds, committed.linkTypes) : null),
        [model, committed],
    );
    const emptyRows = committed && links ? committed.rowIds.length - links.byRow.size : 0;
    const emptyColumns = committed && links ? committed.columnIds.length - links.byColumn.size : 0;
    /** What is on screen: the built axes, less the lines with no links when asked. */
    const shown = useMemo<Committed | null>(() => (committed && links ? {
        rowIds: hideEmptyRows ? withLinks(committed.rowIds, links.byRow) : committed.rowIds,
        columnIds: hideEmptyColumns ? withLinks(committed.columnIds, links.byColumn) : committed.columnIds,
        linkTypes: committed.linkTypes,
    } : null), [committed, links, hideEmptyRows, hideEmptyColumns]);

    // ── Building ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (view !== 'matrix' || !model || !shown) return undefined;
        // An empty axis would mean "everything" to the engine: say there is nothing instead.
        if (shown.rowIds.length === 0 || shown.columnIds.length === 0) {
            setResult(null); setProgress(null);
            setRefusal('No links between these rows and columns. Show the empty lines, or change the selection.');
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
                // Trace is read as a link between two elements, not as a direction:
                // a requirement verified by a test and a test verifying a
                // requirement are the same coverage fact.
                symmetric: true,
            });
            keepMatrix(model, key, built);
            if (cancelled) return;
            setResult(built);
            setProgress(null);
        })();
        return () => { cancelled = true; };
    }, [view, model, shown, expandedRows, expandedColumns]);

    // ── Editing ──────────────────────────────────────────────────────────────

    const activeTypes = committed?.linkTypes ?? NO_IDS;

    /** The relationship objects behind a focused cell, in model order. */
    const focusedRelationships = useMemo<MemoRelationship[]>(() => {
        if (!model || !focus) return [];
        // Resolved against the live model, not against the cell captured when
        // the user clicked: adding or removing a link has to be visible in the
        // panel that did it, and the matrix behind it has already moved on.
        const rowId = focus.row.node.id;
        const columnId = focus.column.node.id;
        const leafPair = focus.row.node.children.length === 0 && focus.column.node.children.length === 0;
        if (leafPair) {
            const types = new Set(activeTypes);
            return model.relationships.filter(rel =>
                (types.size === 0 || types.has(rel.type))
                && ((rel.sourceId === rowId && rel.targetId === columnId)
                    || (rel.sourceId === columnId && rel.targetId === rowId)));
        }
        // An aggregate mark has no single pair to resolve, so it keeps the
        // relationship ids the roll-up gave it.
        const ids = new Set(focus.cell?.relationshipIds ?? []);
        return model.relationships.filter(rel => ids.has(rel.id));
    }, [model, focus, activeTypes]);

    /**
     * Link types legal between the focused pair. Only leaf-to-leaf cells can be
     * authored: when either side is a collapsed subsystem the mark stands for
     * several elements and there is no single pair for a new link to join.
     */
    const legalOptions = useMemo<LegalRelationshipOption[]>(() => {
        if (!model || !focus || !registries) return [];
        const source = model.elements[focus.row.node.id];
        const target = model.elements[focus.column.node.id];
        if (!source || !target || source.id === target.id) return [];
        return legalRelationshipTypes(source, target, registries);
    }, [model, focus, registries]);

    /**
     * The ontology is generous: dozens of relations are legal between any two
     * MemoParts, and an unranked list buries the one the user came for. The
     * types the matrix is currently reading as trace go first and are marked,
     * because those are the links that will actually show up in this view.
     */
    const traceTypes = useMemo(() => {
        const names = new Set<string>();
        for (const type of activeTypes) {
            names.add(type);
            names.add(type.charAt(0).toUpperCase() + type.slice(1));
        }
        return names;
    }, [activeTypes]);

    const rankedOptions = useMemo(() => {
        const needle = linkQuery.trim().toLowerCase();
        return legalOptions
            .filter(option => !needle || option.definition.name.toLowerCase().includes(needle))
            .sort((a, b) => {
                const preference = Number(traceTypes.has(b.definition.name)) - Number(traceTypes.has(a.definition.name));
                return preference !== 0 ? preference : a.definition.name.localeCompare(b.definition.name);
            });
    }, [legalOptions, linkQuery, traceTypes]);

    const editable = Boolean(
        focus
        && focus.row.node.isElement
        && focus.column.node.isElement
        && !focus.row.expanded
        && !focus.column.expanded
        && focus.row.node.children.length === 0
        && focus.column.node.children.length === 0,
    );

    const addLink = useCallback(async (option: LegalRelationshipOption) => {
        setBusy(true);
        setStatus(null);
        const outcome = await createRelationship({
            type: option.definition.name,
            sourceId: option.sourceId,
            targetId: option.targetId,
            direction: option.direction,
            diagramId: selectedDiagramId ?? undefined,
        });
        setBusy(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Trace written to ${outcome.sourceFile ?? 'the model'}.` }
            : { kind: 'error', message: outcome.error ?? 'The trace could not be created.' });
    }, [createRelationship, selectedDiagramId]);

    const removeLink = useCallback(async (relationshipId: string) => {
        setBusy(true);
        setStatus(null);
        const outcome = await deleteRelationship(relationshipId);
        setBusy(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Trace removed from ${outcome.sourceFile ?? 'the model'}.` }
            : { kind: 'error', message: outcome.error ?? 'The trace could not be removed.' });
    }, [deleteRelationship]);

    const toggleTrace = useCallback(async (row: DsmAxisEntry, column: DsmAxisEntry) => {
        if (!editing || !connected || !model || !registries
            || !row.node.isElement || !column.node.isElement
            || row.node.children.length > 0 || column.node.children.length > 0
            || row.node.id === column.node.id) return;

        // A direct toggle is safe only when the active relation filter names
        // one concrete relationship. Otherwise the inspector lets the user
        // choose instead of inventing a type.
        if (activeTypes.length !== 1) return;
        const type = activeTypes[0];
        const existing = model.relationships.find(rel => rel.type === type
            && ((rel.sourceId === row.node.id && rel.targetId === column.node.id)
                || (rel.sourceId === column.node.id && rel.targetId === row.node.id)));
        if (existing) {
            if (existing.named === false) {
                setStatus({ kind: 'error', message: 'This trace has no declared name, so it cannot be removed until it is named in SysML.' });
                return;
            }
            await removeLink(existing.id);
            return;
        }
        const source = model.elements[row.node.id];
        const target = model.elements[column.node.id];
        if (!source || !target) return;
        const option = legalRelationshipTypes(source, target, registries)
            .find(candidate => candidate.definition.name === type);
        if (!option) {
            setStatus({ kind: 'error', message: `${type} is not legal between these element types.` });
            return;
        }
        await addLink(option);
    }, [editing, connected, model, registries, activeTypes, addLink, removeLink]);

    // ── Rendering ────────────────────────────────────────────────────────────

    const renderCell = useCallback((cell: DsmAggregateCell | null, row: DsmAxisEntry, column: DsmAxisEntry): MatrixCellStyle => {
        // Traceability has no meaningful self-link diagonal. Keeping it blank
        // avoids presenting an internal roll-up count as a trace link.
        if (cell?.diagonal) return {};
        if (cell) {
            const color = '#65A30D';
            const intensity = Math.min(0.14 + cell.strength * 0.13, 0.55);
            return {
                // A check means exactly one trace. A number is only shown
                // when this pair (or a collapsed subtree) contains 2+ links.
                text: cell.strength === 1 ? '✓' : String(cell.strength),
                color,
                background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                title: `${row.node.name} ↔ ${column.node.name}\n${cell.types.join(', ')}${editing ? '\nClick to inspect or remove' : ''}`,
            };
        }
        if (!editing) return {};
        const linkable = row.node.isElement && column.node.isElement
            && row.node.children.length === 0 && column.node.children.length === 0
            && row.node.id !== column.node.id;
        return linkable
            ? { actionable: true, title: `Click to trace ${row.node.name} → ${column.node.name}` }
            : {};
    }, [editing]);

    const coverage = useMemo(() => {
        if (!result) return { traced: 0, total: 0 };
        let traced = 0;
        let total = 0;
        result.rows.forEach((entry, index) => {
            if (entry.node.children.length > 0) return;
            total++;
            if (result.matrix[index].some(cell => cell && !cell.diagonal)) traced++;
        });
        return { traced, total };
    }, [result]);

    if (!model) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                No model loaded
            </div>
        );
    }

    const building = progress !== null;
    const message = refusal
        ?? limit
        ?? (rowIds.length === 0 || columnIds.length === 0
            ? (builderOpen
                ? 'Choose the element types for the rows and the columns, then Build matrix.'
                : 'Select a traceability matrix on the left, or click + New to create one.')
            : null);

    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#FAFAF8' }}>
        {/* The saved traceability matrices, by package. Selecting one opens it here. */}
        <MatrixDefinitionTree
            screen="traceability" noun="traceability matrix" plural="traceability matrices" title="Traceability matrices"
            selectedId={definitionId}
            onSelect={id => setActiveView(id ? { type: 'traceability', definitionId: id } : { type: 'traceability' })}
            onNew={startNew}
        />
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FAFAF8', position: 'relative', minWidth: 0 }}>
            {(builderOpen || committed || building || status || customNote) && (
            <div style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
                {/* ── Build a matrix: shown by New, or by Edit view on a saved one ── */}
                {builderOpen && (
                <div className="flex items-end gap-4 px-4 py-3" style={{ flexWrap: 'wrap' }}>
                    <AxisPicker
                        label="Rows" axis={rowAxis} onChange={setRowAxis} options={kindOptions} count={rowIds.length}
                        onSubmit={build}
                    />
                    <AxisPicker
                        label="Columns" axis={columnAxis} onChange={setColumnAxis} options={kindOptions} count={columnIds.length}
                        onSubmit={build}
                    />
                    <div style={{ display: 'grid', gap: '3px' }}>
                        <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>Relations</span>
                        <TypeFilterSelect
                            label="" describedAs="Relations" allLabel="Any relationship" options={linkOptions} selected={linkTypes}
                            onChange={setLinkTypes} title="Relationships counted as trace" width={170}
                        />
                    </div>
                    <button
                        type="button" onClick={build} disabled={!canBuild || building}
                        style={{
                            padding: '7px 16px', borderRadius: '6px', fontSize: FONT.sm, fontWeight: 600,
                            border: `1px solid ${canBuild ? COLOR.accent : COLOR.border}`,
                            background: canBuild && stale ? COLOR.accent : COLOR.surface,
                            color: canBuild && stale ? '#fff' : COLOR.muted,
                            cursor: canBuild && !building ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {building ? 'Building…' : result && !stale ? 'Rebuild' : 'Build matrix'}
                    </button>
                    <span style={{ flex: 1 }} />
                    {definition && (
                        <button
                            type="button" onClick={() => { void saveChanges(); }} disabled={!savable || !unsaved || saving}
                            title={unsaved ? `Write these rows, columns and relations to “${definition.name}”` : 'Nothing has changed since it was saved'}
                            style={saveButton(savable && unsaved && !saving, true)}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    )}
                    <button
                        type="button" onClick={() => { setSaveError(null); setSaveDialog(true); }} disabled={!savable || saving}
                        title={connected
                            ? 'Keep this selection as a matrix in the model; it is listed in the panel on the left'
                            : 'The dev server is unreachable, so nothing can be written to the model.'}
                        style={saveButton(savable && !saving, !definition)}
                    >
                        {definition ? 'Save as…' : 'Save'}
                    </button>
                    {committed && (
                        <button type="button" onClick={() => setBuilderOpen(false)} style={saveButton(true, false)} title="Hide these options">Done</button>
                    )}
                </div>
                )}
                {/* ── How the built matrix is shown ── */}
                {committed && (
                <div className="flex items-center gap-4 px-4 py-2" style={{ flexWrap: 'wrap', borderTop: builderOpen ? `1px solid ${COLOR.borderLight}` : undefined }}>
                    {definition && (
                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }} title={definition.elementId}>
                            <strong style={{ color: COLOR.primary, fontSize: FONT.sm }}>{definition.name}</strong>{unsaved ? ' · unsaved changes' : ''}
                        </span>
                    )}
                    {definition && !builderOpen && (
                        <button type="button" onClick={() => setBuilderOpen(true)} style={saveButton(connected, false)} title="Change the rows, columns and relations">Edit view</button>
                    )}
                    <div role="group" aria-label="View" style={{ display: 'inline-flex', border: `1px solid ${COLOR.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                        {(['matrix', 'list'] as const).map(option => (
                            <button
                                key={option} type="button" onClick={() => setView(option)} aria-pressed={view === option}
                                title={option === 'matrix' ? 'Rows against columns' : 'Each row with the items it links to'}
                                style={{
                                    padding: '4px 14px', fontSize: FONT.xs, fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: view === option ? COLOR.accent : COLOR.surface,
                                    color: view === option ? '#fff' : COLOR.muted,
                                }}
                            >
                                {option === 'matrix' ? 'Matrix' : 'List'}
                            </button>
                        ))}
                    </div>
                    <EmptyToggle label="Hide empty rows" count={emptyRows} checked={hideEmptyRows} onChange={setHideEmptyRows} disabled={!committed} />
                    <EmptyToggle
                        label="Hide empty columns" count={emptyColumns} checked={hideEmptyColumns} onChange={setHideEmptyColumns}
                        disabled={!committed || view === 'list'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: FONT.xs, color: COLOR.muted }} title="Cell size">
                        Zoom
                        <input type="range" min={14} max={44} step={2} value={cellSize} onChange={event => setCellSize(Number(event.target.value))} style={{ width: '80px', accentColor: COLOR.accent }} />
                    </label>
                    <label
                        title={connected
                            ? 'Click cells to add or remove trace links. Only leaf-to-leaf cells can be edited.'
                            : 'The dev server is unreachable, so nothing can be written to the model.'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs,
                            padding: '4px 9px', borderRadius: '5px',
                            border: `1px solid ${editing ? COLOR.accent : COLOR.border}`,
                            background: editing ? '#E8F8F3' : COLOR.surface,
                            color: connected ? COLOR.primary : COLOR.faint,
                            cursor: connected ? 'pointer' : 'not-allowed', fontWeight: 600,
                        }}
                    >
                        <input
                            type="checkbox" checked={editing} disabled={!connected}
                            onChange={event => { setEditing(event.target.checked); setFocus(null); }}
                            style={{ accentColor: COLOR.accent }}
                        />
                        Edit trace
                    </label>
                </div>
                )}
                {customNote && (
                    <div style={{ padding: '5px 16px', fontSize: '11px', color: '#92400E', background: '#FFFBEB', borderTop: `1px solid ${COLOR.borderLight}` }}>{customNote}</div>
                )}
                {building && (
                    <div style={{ padding: '0 16px 10px' }}><ProgressBar progress={progress} /></div>
                )}
                {status && (
                    <div style={{
                        padding: '5px 16px', fontSize: '11px',
                        color: status.kind === 'ok' ? '#0F766E' : '#B91C1C',
                        background: status.kind === 'ok' ? '#ECFDF5' : '#FEF2F2',
                        borderTop: `1px solid ${COLOR.borderLight}`,
                    }}>
                        {status.message}
                    </div>
                )}
            </div>
            )}

            {/* ── Matrix ── */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, opacity: view === 'matrix' && building && result ? 0.5 : 1 }}>
            {view === 'list' ? (
                model && shown && links ? (
                    <TraceList
                        model={model} rowIds={shown.rowIds} links={links} onSelect={selectElement} selectedId={selectedElementId}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center px-8 text-center" role="status" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                        {message}
                    </div>
                )
            ) : !result ? (
                <div className="flex-1 flex items-center justify-center px-8 text-center" role="status" style={{ color: refusal ? '#B45309' : COLOR.faint, fontSize: FONT.sm }}>
                    {building ? 'Building…' : message}
                </div>
            ) : (
            <HierarchicalMatrix
                result={result}
                onToggleRow={id => setExpandedRows(current => toggled(current, id))}
                onToggleColumn={id => setExpandedColumns(current => toggled(current, id))}
                onSelectElement={selectElement}
                selectedElementId={selectedElementId}
                renderCell={renderCell}
                onCellClick={(row, column, cell) => { setFocus({ row, column, cell }); setLinkQuery(''); }}
                onCellDoubleClick={(row, column) => { void toggleTrace(row, column); }}
                cellSize={cellSize}
                showColumnNames
                cornerHeader={
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>Traceability Matrix</span>
                        <span style={{ fontSize: '11px', color: COLOR.faint, marginTop: '2px' }}>
                            {result.rows.length.toLocaleString()} × {result.columns.length.toLocaleString()} · {result.totalDependencies} link{result.totalDependencies === 1 ? '' : 's'}
                            {coverage.total > 0 && ` · ${coverage.traced}/${coverage.total} rows traced (${Math.round(coverage.traced / coverage.total * 100)}%)`}
                        </span>
                    </div>
                }
            />
            )}
            </div>

            {/* ── Link inspector / editor ── */}
            {focus && (
                <div style={{
                    position: 'fixed', bottom: '76px', right: '20px', zIndex: 100,
                    width: '330px', maxHeight: '52vh', overflowY: 'auto',
                    padding: '12px 14px', borderRadius: '9px', background: COLOR.surface,
                    border: `1px solid ${COLOR.border}`, boxShadow: '0 6px 22px rgba(0,0,0,0.14)',
                    fontSize: FONT.xs,
                }}>
                    <div className="flex items-start justify-between gap-2">
                        <div style={{ fontWeight: 600, color: COLOR.primary }}>
                            {focus.row.node.name} {'↔'} {focus.column.node.name}
                        </div>
                        <button onClick={() => setFocus(null)} style={{ color: COLOR.faint, background: 'none', border: 'none', cursor: 'pointer' }}>{'✕'}</button>
                    </div>

                    {focusedRelationships.length > 0 ? (
                        <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {focusedRelationships.map(rel => (
                                <div key={rel.id} className="flex items-center justify-between gap-2" style={{ padding: '4px 6px', borderRadius: '5px', background: COLOR.surfaceAlt }}>
                                    <span style={{ color: relationshipColor(rel.type), fontWeight: 500 }}>{rel.type}</span>
                                    <span style={{ flex: 1, color: COLOR.faint, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {model.elements[rel.sourceId]?.name ?? rel.sourceId} {'→'} {model.elements[rel.targetId]?.name ?? rel.targetId}
                                    </span>
                                    {editing && (
                                        <button
                                            disabled={busy || rel.named === false}
                                            onClick={() => void removeLink(rel.id)}
                                            title={rel.named === false
                                                ? 'This connection has no declared name, so it cannot be addressed for deletion. Name it in the source first.'
                                                : 'Remove this trace link'}
                                            style={{
                                                fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                                border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C',
                                                cursor: busy || rel.named === false ? 'not-allowed' : 'pointer',
                                                opacity: rel.named === false ? 0.5 : 1,
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ marginTop: '8px', color: COLOR.muted }}>No trace between these two.</div>
                    )}

                    {focus.cell?.aggregated && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: COLOR.faint }}>
                            This mark sums a collapsed subsystem. Expand both sides to edit individual links.
                        </div>
                    )}

                    {editing && (
                        <div style={{ marginTop: '11px', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: '9px' }}>
                            <div style={{ fontSize: '11px', color: COLOR.muted, marginBottom: '6px' }}>Add a trace link</div>
                            {!editable ? (
                                <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                    Both sides must be individual elements. Expand the subsystems first.
                                </div>
                            ) : legalOptions.length === 0 ? (
                                <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                    The ontology allows no relationship between {focus.row.node.kind} and {focus.column.node.kind}.
                                </div>
                            ) : (
                                <>
                                    {legalOptions.length > 8 && (
                                        <input
                                            value={linkQuery}
                                            onChange={event => setLinkQuery(event.target.value)}
                                            placeholder={`Filter ${legalOptions.length} legal types…`}
                                            aria-label="Filter link types"
                                            style={{
                                                width: '100%', marginBottom: '7px', padding: '4px 7px',
                                                border: `1px solid ${COLOR.border}`, borderRadius: '5px',
                                                fontSize: '11px', outline: 'none', color: COLOR.primary,
                                            }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {rankedOptions.map(option => {
                                            const preferred = traceTypes.has(option.definition.name);
                                            return (
                                                <button
                                                    key={`${option.definition.name}-${option.direction}`}
                                                    disabled={busy}
                                                    onClick={() => void addLink(option)}
                                                    title={`${model.elements[option.sourceId]?.name ?? option.sourceId} → ${model.elements[option.targetId]?.name ?? option.targetId}`}
                                                    style={{
                                                        fontSize: '11px', padding: '3px 8px', borderRadius: '5px',
                                                        border: `1px solid ${preferred ? COLOR.accent : COLOR.border}`,
                                                        background: preferred ? '#E8F8F3' : COLOR.surface,
                                                        color: COLOR.primary, cursor: busy ? 'wait' : 'pointer',
                                                        fontWeight: preferred ? 600 : 400,
                                                    }}
                                                >
                                                    {option.definition.name}
                                                    <span style={{ color: COLOR.faint, marginLeft: '4px' }}>
                                                        {option.direction === 'outgoing' ? '→' : '←'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {rankedOptions.length === 0 && (
                                            <span style={{ fontSize: '11px', color: COLOR.faint }}>
                                                No legal type matches {'“'}{linkQuery}{'”'}.
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
            {saveDialog && (
                <SaveViewDialog
                    packages={packageChoices} busy={saving} error={saveError}
                    initialName={definition ? `${definition.name} copy` : ''} initialPackage={definition ? '' : newPackage}
                    onSubmit={value => { void saveAsNew(value); }} onClose={() => setSaveDialog(false)}
                />
            )}
        </div>
        </div>
    );
}

const saveButton = (enabled: boolean, primary: boolean): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: '6px', fontSize: FONT.xs, fontWeight: 600,
    border: `1px solid ${enabled && primary ? COLOR.accent : COLOR.border}`,
    background: enabled && primary ? COLOR.accent : COLOR.surface,
    color: enabled && primary ? '#fff' : COLOR.muted,
    cursor: enabled ? 'pointer' : 'not-allowed',
});

/** Name, and optionally the package, for a view being saved. */
function SaveViewDialog({ packages, busy, error, initialName, initialPackage, onSubmit, onClose }: {
    packages: string[]; busy: boolean; error: string | null; initialName: string; initialPackage: string;
    onSubmit: (value: { name: string; package: string }) => void; onClose: () => void;
}) {
    const [name, setName] = useState(initialName);
    const [packageName, setPackageName] = useState(initialPackage);
    const trimmed = name.trim();
    const validPackage = packageName === '' || /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/.test(packageName);
    const field: React.CSSProperties = {
        padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm,
        color: COLOR.primary, width: '100%', boxSizing: 'border-box',
    };
    return (
        <div role="dialog" aria-modal="true" aria-label="Save view" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
            <form
                onSubmit={event => { event.preventDefault(); if (trimmed && validPackage && !busy) onSubmit({ name: trimmed, package: packageName }); }}
                style={{ width: '380px', maxWidth: '92vw', display: 'grid', gap: '12px', padding: '18px', borderRadius: '10px', background: COLOR.surface, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
            >
                <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLOR.primary }}>Save traceability matrix</div>
                <label style={{ display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>
                    Name
                    <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Needs to requirements" style={field} />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>
                    Package <span style={{ fontWeight: 400, color: COLOR.faint }}>optional, where the view is declared</span>
                    <input value={packageName} onChange={event => setPackageName(event.target.value)} list="trace-save-packages" placeholder="views::traceability" style={field} />
                    <datalist id="trace-save-packages">{packages.map(name => <option key={name} value={name} />)}</datalist>
                    {!validPackage && <span style={{ color: '#B91C1C', fontWeight: 400 }}>Use letters, digits and underscores, with :: between packages.</span>}
                </label>
                {error && <div role="alert" style={{ fontSize: FONT.xs, color: '#B91C1C' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onClose} disabled={busy} style={saveButton(!busy, false)}>Cancel</button>
                    <button type="submit" disabled={!trimmed || !validPackage || busy} style={saveButton(Boolean(trimmed) && validPackage && !busy, true)}>
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    );
}

/** One axis: its element types, an optional name filter, and how many elements that selects. */
function AxisPicker({ label, axis, onChange, options, count, onSubmit }: {
    label: string;
    axis: AxisSelection;
    onChange: (next: AxisSelection) => void;
    options: TypeFilterOption[];
    count: number;
    onSubmit: () => void;
}) {
    return (
        <div style={{ display: 'grid', gap: '3px' }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>
                {label} <span style={{ fontWeight: 400, color: COLOR.faint }}>· {count.toLocaleString()} element{count === 1 ? '' : 's'}</span>
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
                <TypeFilterSelect
                    label="" describedAs={`${label} types`} allLabel="Choose types" options={options} selected={axis.kinds}
                    onChange={kinds => onChange({ ...axis, kinds })} width={190} title={`Element types for the ${label.toLowerCase()}`}
                />
                <input
                    value={axis.text} onChange={event => onChange({ ...axis, text: event.target.value })}
                    onKeyDown={event => { if (event.key === 'Enter') onSubmit(); }}
                    placeholder="Name contains…" aria-label={`${label} name filter`}
                    style={{
                        width: '150px', padding: '5px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px',
                        fontSize: FONT.xs, outline: 'none', color: COLOR.primary,
                    }}
                />
            </div>
        </div>
    );
}

/** A checkbox that says how many lines it would hide. */
function EmptyToggle({ label, count, checked, onChange, disabled }: {
    label: string; count: number; checked: boolean; onChange: (next: boolean) => void; disabled: boolean;
}) {
    return (
        <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs, fontWeight: 600,
            color: disabled ? COLOR.faint : COLOR.primary, cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} style={{ accentColor: COLOR.accent }} />
            {label}
            {!disabled && <span style={{ fontWeight: 400, color: COLOR.faint }}>· {count.toLocaleString()} empty</span>}
        </label>
    );
}

/** An element as a report names it: its id and its title. */
function itemLabel(element: MemoElement | undefined, id: string): string {
    if (!element) return id;
    return element.shortId && !element.name.startsWith(element.shortId) ? `${element.shortId} ${element.name}` : element.name;
}

/**
 * The traceability report's layout: an Item, and the items it links to, one per line. Every row is laid out
 * only when it scrolls into view, so a long list stays light.
 */
function TraceList({ model, rowIds, links, onSelect, selectedId }: {
    model: MemoModelDTO;
    rowIds: readonly string[];
    links: TraceLinks;
    onSelect: (id: string) => void;
    selectedId: string | null;
}) {
    const cell = { padding: '7px 12px', fontSize: FONT.xs, lineHeight: 1.5 } as const;
    return (
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '14px' }}>
            <div style={{ minWidth: 640, border: `1px solid ${COLOR.border}`, borderRadius: '6px', background: COLOR.surface }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) 3fr', position: 'sticky', top: 0, zIndex: 5, background: COLOR.surfaceAlt, borderBottom: `1px solid ${COLOR.border}`, fontWeight: 600, color: COLOR.primary }}>
                    <div style={cell}>Item</div>
                    <div style={cell}>Links</div>
                </div>
                {rowIds.map(id => {
                    const linked = links.byRow.get(id) ?? [];
                    return (
                        <div
                            key={id}
                            style={{
                                display: 'grid', gridTemplateColumns: 'minmax(260px, 2fr) 3fr', borderBottom: `1px solid ${COLOR.borderLight}`,
                                contentVisibility: 'auto', containIntrinsicSize: `auto ${24 + Math.max(1, linked.length) * 20}px`,
                                background: selectedId === id ? '#E8F8F3' : undefined,
                            }}
                        >
                            <div style={{ ...cell, fontWeight: 600, color: COLOR.primary, cursor: 'pointer' }} onClick={() => onSelect(id)}>
                                {itemLabel(model.elements[id], id)}
                            </div>
                            <div style={{ ...cell, color: COLOR.secondary }}>
                                {linked.length === 0
                                    ? <span style={{ color: COLOR.faint, fontStyle: 'italic' }}>No links</span>
                                    : linked.map(other => (
                                        <div key={other} onClick={() => onSelect(other)} style={{ cursor: 'pointer' }}>
                                            {itemLabel(model.elements[other], other)}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function toggled(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
}

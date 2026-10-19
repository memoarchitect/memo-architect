// ─── Design Structure Matrix (DSM) View ─────────────────────────────────────
//
// Dependencies between elements, read as a matrix whose axes are the model's
// own containment hierarchy: every row and column is a subsystem that expands
// into its parts and collapses back into one line carrying their sum.
//
// Three questions the user answers, rather than the tool assuming:
//
//   Rows / Columns — which element types each axis lists. They need not match:
//                    functions down the side and architecture blocks across the
//                    top is a normal, and useful, configuration.
//   Dependency     — which relationships put a mark in a cell. Flow, trace and
//                    allocation say different things and rarely belong in the
//                    same reading.
//   Nesting        — which relationships mean containment, so the hierarchy is
//                    the one the model declares.
//
// Traceability editing is deliberately *not* here — it is its own view, because
// reading a dependency structure and authoring trace links are different jobs
// with different risks.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { legalRelationshipTypes } from '@memoarchitect/tools/browser';
import { getRegistries, useModelStore } from '../store/model-store';
import { useScopedModel } from '../store/scoped-model';
import {
    collectNodeIds,
    computeHierarchicalDSM,
    defaultContainmentTypes,
    layersInModel,
    relationshipTypesInModel,
    type DsmAggregateCell,
    type DsmAxisEntry,
    type DsmOrdering,
    type LayerSummary,
} from '../analysis/dsm-hierarchy';
import { analyzeConsistency } from '../analysis/consistency';
import { downloadDsmCsv, downloadDsmXlsx } from '../analysis/dsm-export';
import { HierarchicalMatrix, type MatrixCellStyle } from '../components/HierarchicalMatrix';
import { TypeFilterSelect, type TypeFilterOption } from '../components/TypeFilterSelect';
import { ToolbarPopover } from '../components/ToolbarPopover';
import { AxisScopeSelect, describeScope, type AxisScope } from '../components/AxisScopeSelect';
import { Icon, IconToggle } from './DiagramToolbarControls';
import { MatrixDefinitionTree } from '../components/MatrixDefinitionTree';
import { MatrixDefinitionBar } from '../components/MatrixDefinitionBar';
import { MatrixAxisEditor } from '../components/MatrixAxisEditor';
import { MatrixGroupsEditor } from '../components/MatrixGroupsEditor';
import { AxisViewControls } from '../components/AxisViewControls';
import { useMatrixDefinition } from '../lib/use-matrix-definition';
import { ProgressBar } from '../components/ProgressBar';
import type { AxisEvaluation } from '../lib/axis-evaluation';
import { elementFilterOptions, scopeKinds } from '../components/element-options';
import { kindParents, type KindParents } from '../analysis/kind-hierarchy';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

/** Mark colour: the first relationship type, so a mixed cell still reads as mixed. */
function markColor(cell: DsmAggregateCell): string {
    return cell.types.length > 0 ? relationshipColor(cell.types[0]) : '#475569';
}

const NO_IDS: string[] = [];

export function DSMView() {
    const model = useScopedModel();
    const connected = useModelStore(s => s.connected);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const setAnalysisIssues = useModelStore(s => s.setAnalysisIssues);
    const registries = useMemo(() => getRegistries(model), [model]);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    // The picker nests kinds by the ontology's specialization chain, so the
    // axis has to honour the same reading: `Requirement` means its subkinds too.
    const parents = useMemo(() => kindParents(availableOntologies), [availableOntologies]);

    // The definition this screen is open on, and the draft being edited. Nothing
    // is selected, evaluated or drawn until a definition is chosen in the tree.
    const matrix = useMatrixDefinition('dsm');
    const { definition, draft, setDraft, snapshot } = matrix;
    const dependencyTypes = draft.dependencyTypes;
    const setDependencyTypes = useCallback((next: string[]) => setDraft(current => ({ ...current, dependencyTypes: next })), [setDraft]);
    // An empty list means "the model's own composition relationships".
    const containmentTypes = draft.containmentTypes.length > 0 ? draft.containmentTypes : null;
    const setContainmentTypes = useCallback((next: string[] | null) => setDraft(current => ({ ...current, containmentTypes: next ?? [] })), [setDraft]);
    const symmetric = draft.symmetric ?? false;
    const setSymmetric = useCallback((next: boolean) => setDraft(current => ({ ...current, symmetric: next })), [setDraft]);
    const [criticalEvaluation, setCriticalEvaluation] = useState<AxisEvaluation | undefined>();
    // Elements hidden with the eye on the grid. A view of the last render, not part of the definition.
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    useEffect(() => setHiddenIds(new Set()), [snapshot]);
    const axisIds = useMemo(() => (snapshot?.rowIds ?? NO_IDS).filter(id => !hiddenIds.has(id)), [snapshot, hiddenIds]);
    const rowElements = axisIds;
    const columnElements = axisIds;
    const [groupByPackage, setGroupByPackage] = useState(false);
    // Rows equal columns, so one ordering reads both.
    const ordering: DsmOrdering = draft.ordering ?? 'natural';
    const rowOrdering = ordering;
    const columnOrdering = ordering;
    const setOrdering = useCallback((next: DsmOrdering) => setDraft(current => ({ ...current, ordering: next })), [setDraft]);
    // Column names remain visible by default, but render straight and inside
    // their own header cells rather than diagonally across neighbouring cells.
    const [showColumnNames, setShowColumnNames] = useState(true);
    const [cellSize, setCellSize] = useState(39);
    const [linkAxes, setLinkAxes] = useState(true);
    const [toolbarPlacement, setToolbarPlacement] = useState<'top' | 'left'>('top');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
    const [inspected, setInspected] = useState<{ row: DsmAxisEntry; column: DsmAxisEntry; cell: DsmAggregateCell } | null>(null);

    const relationshipOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model) return [];
        const counts = new Map<string, number>();
        for (const rel of model.relationships) counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1);
        return relationshipTypesInModel(model).map(type => ({
            value: type, hint: String(counts.get(type) ?? 0), color: relationshipColor(type),
        }));
    }, [model]);

    // Hand-picking offers every element; the list is built only while a definition is being edited.
    const pickable = useMemo(() => (matrix.editing ? elementFilterOptions(model, {}, parents) : []), [matrix.editing, model, parents]);

    const legalDependencyOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model || !registries) return [];
        // A cross product of the two axes, so it is asked only of an axis that
        // has been rendered, and that the cell cap has already bounded.
        if (!snapshot) return relationshipOptions;
        const allowed = new Set<string>();
        for (const rowId of snapshot.rowIds) {
            const row = model.elements[rowId];
            if (!row) continue;
            for (const columnId of snapshot.columnIds) {
                const column = model.elements[columnId];
                if (column && row.id !== column.id) for (const option of legalRelationshipTypes(row, column, registries)) allowed.add(option.definition.name);
            }
        }
        return relationshipOptions.filter(option => allowed.has(option.value));
    }, [model, registries, snapshot, relationshipOptions]);

    const effectiveContainment = useMemo(
        () => containmentTypes ?? (model ? defaultContainmentTypes(model) : []),
        [containmentTypes, model],
    );

    // The element filter reads the exact containment relations the DSM uses,
    // so filtering and expanding tell the same structural story.
    const filterParentOf = useMemo(() => {
        const parentOf = new Map<string, string>();
        if (!model) return parentOf;
        for (const element of Object.values(model.elements)) {
            const parent = element.parentAction ?? element.owner;
            if (parent && model.elements[parent]) parentOf.set(element.id, parent);
        }
        const containment = new Set(effectiveContainment);
        for (const relationship of model.relationships) {
            if (containment.has(relationship.type) && relationship.sourceId !== relationship.targetId
                && model.elements[relationship.sourceId] && model.elements[relationship.targetId]) {
                parentOf.set(relationship.targetId, relationship.sourceId);
            }
        }
        return parentOf;
    }, [model, effectiveContainment]);

    /**
     * The same list, with the nesting relations called out. A relation that
     * builds the tree cannot also be a mark inside it — the engine drops it —
     * so picking one silently empties the matrix unless the picker says why.
     */
    const dependencyOptions = useMemo<TypeFilterOption[]>(() => {
        const nesting = new Set(effectiveContainment);
        return legalDependencyOptions.map(option => nesting.has(option.value)
            ? { ...option, label: `${option.value} (nesting)`, hint: 'builds the tree' }
            : option);
    }, [legalDependencyOptions, effectiveContainment]);

    /** How many tucked-away settings are off their default, so Options says so. */
    const changedOptions = [
        containmentTypes !== null, !linkAxes, !showColumnNames, groupByPackage, symmetric,
    ].filter(Boolean).length;

    const result = useMemo(() => {
        // Nothing is computed until a definition has been rendered: an empty axis
        // means "everything" to the engine, and everything squared is the model.
        if (!model || !snapshot || axisIds.length === 0) return null;
        return computeHierarchicalDSM(model, {
            rows: { elementIds: rowElements, expanded: expandedRows, ordering: rowOrdering },
            columns: { elementIds: columnElements, expanded: expandedColumns, ordering: columnOrdering },
            dependencyTypes,
            containmentTypes: effectiveContainment,
            groupByPackage,
            symmetric,
            groups: snapshot?.groups,
        });
    }, [model, snapshot, axisIds, rowElements, columnElements, dependencyTypes, effectiveContainment, groupByPackage, rowOrdering, columnOrdering, symmetric, expandedRows, expandedColumns]);

    const toggleRow = useCallback((nodeId: string) => {
        setExpandedRows(current => toggled(current, nodeId));
        if (linkAxes) setExpandedColumns(current => toggled(current, nodeId));
    }, [linkAxes]);

    const toggleColumn = useCallback((nodeId: string) => {
        setExpandedColumns(current => toggled(current, nodeId));
        if (linkAxes) setExpandedRows(current => toggled(current, nodeId));
    }, [linkAxes]);

    const setAxisExpansion = useCallback((axis: 'rows' | 'columns', expanded: Set<string>) => {
        if (axis === 'rows') setExpandedRows(expanded);
        else setExpandedColumns(expanded);
    }, []);

    const expandAxis = useCallback((axis: 'rows' | 'columns') => {
        if (!result) return;
        setAxisExpansion(axis, new Set(collectNodeIds(axis === 'rows' ? result.rowRoots : result.columnRoots)));
    }, [result, setAxisExpansion]);

    const collapseAxis = useCallback((axis: 'rows' | 'columns') => {
        setAxisExpansion(axis, new Set());
    }, [setAxisExpansion]);

    const expandAxisToDepth = useCallback((axis: 'rows' | 'columns', depth: number) => {
        if (!result) return;
        setAxisExpansion(axis, new Set(collectNodeIds(axis === 'rows' ? result.rowRoots : result.columnRoots, depth)));
    }, [result, setAxisExpansion]);

    const hideAxisElement = useCallback((axis: 'rows' | 'columns', elementId: string) => {
        const visibleEntries = axis === 'rows' ? result?.rows : result?.columns;
        // A parent remains structurally visible while one of its children is
        // shown. Hiding it therefore hides its entire displayed subtree.
        const hidden = visibleEntries?.find(entry => entry.node.id === elementId)?.node.members ?? [elementId];
        setHiddenIds(current => new Set([...current, ...hidden]));
    }, [result]);

    const exportXlsx = useCallback(async () => {
        if (!model || !result) return;
        // The workbook needs every line, not only the currently visible ones,
        // so its native Excel outline controls can expand both hierarchies.
        const workbookResult = computeHierarchicalDSM(model, {
            rows: { elementIds: rowElements, ordering: rowOrdering, expanded: new Set(collectNodeIds(result.rowRoots)) },
            columns: { elementIds: columnElements, ordering: columnOrdering, expanded: new Set(collectNodeIds(result.columnRoots)) },
            dependencyTypes,
            containmentTypes: effectiveContainment,
            groupByPackage,
            symmetric,
            groups: snapshot?.groups,
        });
        await downloadDsmXlsx(workbookResult);
    }, [model, result, rowElements, columnElements, dependencyTypes, effectiveContainment, groupByPackage, rowOrdering, columnOrdering, symmetric]);

    // Consistency findings belong in the bottom Problems bar, not in the grid.
    const consistency = useMemo(() => (model ? analyzeConsistency(model) : null), [model]);
    useEffect(() => {
        if (!consistency) return;
        setAnalysisIssues(consistency.issues.map(issue => ({
            id: issue.id,
            source: 'DSM',
            severity: issue.severity,
            elementId: issue.elementId,
            elementName: issue.elementName,
            message: issue.message,
            tag: issue.type === 'unallocated-function' ? 'unallocated'
                : issue.type === 'cross-component-flow' ? 'cross-boundary'
                    : 'no functions',
        })));
        return () => setAnalysisIssues([]);
    }, [consistency, setAnalysisIssues]);

    const renderCell = useCallback((cell: DsmAggregateCell | null): MatrixCellStyle => {
        if (!cell) return {};
        if (cell.diagonal) {
            return { text: String(cell.strength), color: COLOR.muted, background: '#E3E8EE' };
        }
        const color = markColor(cell);
        const intensity = Math.min(0.14 + cell.strength * 0.13, 0.55);
        return {
            text: String(cell.strength),
            color,
            background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
        };
    }, []);

    if (!model) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                No model loaded
            </div>
        );
    }

    const leftToolbar = toolbarPlacement === 'left';
    const axisGroupStyle: CSSProperties = leftToolbar
        ? {
            display: 'grid', gap: '8px', width: '100%',
        }
        : { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', marginTop: '2px' };

    const tree = (
        <MatrixDefinitionTree
            screen="dsm" noun="design structure matrix" plural="design structure matrices" title="Design structure matrices"
            selectedId={matrix.definitionId} onSelect={matrix.select}
        />
    );

    // Nothing renders, and nothing is computed, until a definition is selected or created.
    if (!definition) {
        return (
            <div className="flex-1 flex overflow-hidden" style={{ background: '#F7F7F5' }}>
                {tree}
                <div className="flex-1 flex items-center justify-center px-8 text-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                    {matrix.definitionId
                        ? 'That definition is not in the model: it may have been moved, renamed or deleted. Select one in the tree.'
                        : 'Select a design structure matrix in the tree, or create one with New in a package.'}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#F7F7F5' }}>
        {tree}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F7F7F5', position: 'relative', minWidth: 0 }}>
            <MatrixDefinitionBar
                definition={definition} editing={matrix.editing} onEditingChange={matrix.setEditing} dirty={matrix.dirty}
                connected={connected} rendering={matrix.rendering} saving={matrix.saving}
                onRender={() => { void matrix.render(); }} onSave={() => { void matrix.save(); }} notice={matrix.notice}
            />
            {matrix.editing && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', padding: '8px 12px', borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
                    <MatrixAxisEditor
                        label="Rows and columns" draft={draft.axis} editable elementOptions={pickable}
                        onChange={axis => setDraft(current => ({ ...current, axis }))}
                        evaluation={matrix.rowEvaluation} onEvaluated={evaluation => { matrix.setRowEvaluation(evaluation); matrix.setColumnEvaluation(evaluation); }}
                        missing={snapshot?.missingRows}
                    />
                    <MatrixAxisEditor
                        label="Critical elements" draft={draft.criticalElements} editable elementOptions={pickable}
                        onChange={criticalElements => setDraft(current => ({ ...current, criticalElements }))}
                        evaluation={criticalEvaluation} onEvaluated={setCriticalEvaluation}
                    />
                    <MatrixGroupsEditor groups={draft.groups} onChange={groups => setDraft(current => ({ ...current, groups }))} />
                </div>
            )}
            {/* ── Toolbar ──
                Two rows, not three: what the matrix *is* (its axes and what
                counts as a dependency) stays on screen, and the settings you
                choose once live behind Options. ── */}
            <div style={toolbarPlacement === 'top'
                ? { borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface, position: 'relative' }
                : {
                    position: 'absolute', inset: '0 auto 0 0', width: '250px', zIndex: 30,
                    overflowY: 'auto', overflowX: 'hidden', borderRight: `1px solid ${COLOR.border}`,
                    background: COLOR.surface, boxShadow: '2px 0 10px rgba(15, 23, 42, 0.06)',
                }}>
                <div className="flex items-center gap-3 px-4 py-2" style={leftToolbar
                    ? {
                        flexDirection: 'column', alignItems: 'stretch', gap: '10px', position: 'relative',
                        minHeight: '100%', padding: '54px 12px 14px', boxSizing: 'border-box',
                    }
                    : { flexWrap: 'wrap', rowGap: '2px', position: 'relative', paddingRight: '52px' }}>
                    <span style={{ position: 'absolute', top: '9px', right: '12px' }}>
                        <IconToggle
                            icon={leftToolbar ? <Icon.arrowUp /> : <Icon.panelCollapse />}
                            onClick={() => setToolbarPlacement(current => current === 'top' ? 'left' : 'top')}
                            title={leftToolbar ? 'Move toolbar to top' : 'Move toolbar to left'}
                        />
                    </span>
                    <div style={axisGroupStyle}>
                        <AxisViewControls
                            axis="rows" ordering={ordering} onOrderingChange={setOrdering}
                            onExpandAll={expandAxis} onCollapseAll={collapseAxis} onExpandToDepth={expandAxisToDepth}
                        />
                    </div>

                <div className="flex items-center gap-3" style={leftToolbar
                    ? {
                        width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gridTemplateRows: 'auto auto', alignItems: 'center', columnGap: '10px', rowGap: '8px',
                        padding: '8px', boxSizing: 'border-box', border: `1px solid ${COLOR.border}`,
                        borderRadius: '9px', background: '#FAFBFC',
                    }
                    : {
                        flex: '0 0 auto', alignSelf: 'stretch', alignContent: 'space-between',
                        display: 'grid', gridTemplateColumns: 'max-content max-content max-content', gridTemplateRows: 'auto auto',
                        alignItems: 'center', columnGap: '10px', rowGap: '5px', boxSizing: 'border-box',
                        padding: '6px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '9px', background: '#FAFBFC',
                    }}>
                    <ToolbarPopover
                        label={leftToolbar ? <><Icon.filter /> Rel.</> : <><Icon.filter /> Relations</>}
                        ariaLabel="Filter dependency relationships"
                        title="Relationships that put a mark in a cell"
                        width={260}
                        fullWidth={leftToolbar}
                    >
                        <TypeFilterSelect
                            label="Dependency" allLabel="Any relationship" options={dependencyOptions} width={180}
                            selected={dependencyTypes} onChange={setDependencyTypes} describedAs="dependency relationships"
                            title="Relationships that put a mark in a cell — flow, trace, allocation, …"
                        />
                    </ToolbarPopover>
                    <ToolbarPopover
                        label={<Icon.tools />}
                        ariaLabel="DSM options"
                        badge={changedOptions > 0 ? String(changedOptions) : undefined}
                        title="Settings you set once: how nesting is derived, how the axes are grouped, what the header shows"
                        fullWidth={leftToolbar}
                    >
                        <TypeFilterSelect
                            label="Nesting" allLabel="Auto (composition)" options={relationshipOptions} width={150}
                            selected={containmentTypes ?? []} onChange={next => setContainmentTypes(next.length === 0 ? null : next)}
                            describedAs="nesting relationships"
                            title="Relationships read as parent → child containment, which is what builds the tree"
                        />
                        <label style={checkboxStyle} title="Expanding a subsystem on one axis expands the same one on the other">
                            <input type="checkbox" checked={linkAxes} onChange={event => setLinkAxes(event.target.checked)} style={{ accentColor: COLOR.accent }} />
                            Linked axes
                        </label>
                        <label style={checkboxStyle} title="Show column names above the grid as well as their numbers">
                            <input type="checkbox" checked={showColumnNames} onChange={event => setShowColumnNames(event.target.checked)} style={{ accentColor: COLOR.accent }} />
                            Column names
                        </label>
                        <label style={checkboxStyle} title="Group top-level elements under their SysML package">
                            <input type="checkbox" checked={groupByPackage} onChange={event => setGroupByPackage(event.target.checked)} style={{ accentColor: COLOR.accent }} />
                            Group by package
                        </label>
                        <label style={checkboxStyle} title="Count every dependency in both directions, making the matrix symmetric">
                            <input type="checkbox" checked={symmetric} onChange={event => setSymmetric(event.target.checked)} style={{ accentColor: COLOR.accent }} />
                            Both directions
                        </label>
                    </ToolbarPopover>

                    <ToolbarPopover label={<Icon.download />} ariaLabel="Export DSM" title="Export the DSM" width={220} fullWidth={leftToolbar}>
                        <button onClick={() => result && downloadDsmCsv(result)} style={exportOptionStyle}>
                            CSV <span style={{ color: COLOR.faint }}>current visible matrix</span>
                        </button>
                        <button onClick={() => { void exportXlsx(); }} style={exportOptionStyle}>
                            Excel (.xlsx) <span style={{ color: COLOR.faint }}>with expandable hierarchy</span>
                        </button>
                    </ToolbarPopover>

                    <label style={{
                        ...checkboxStyle, gap: '5px', gridColumn: leftToolbar ? '1 / -1' : undefined,
                        justifyContent: leftToolbar ? 'center' : undefined,
                    }} title="Cell size">
                        Zoom
                        <input
                            type="range" min={14} max={44} step={2} value={cellSize}
                            onChange={event => setCellSize(Number(event.target.value))}
                            style={{ width: '76px', accentColor: COLOR.accent }}
                        />
                    </label>

                </div>
                </div>
            </div>

            {/* ── Matrix ── */}
            <div style={{
                display: 'flex', flex: 1, minHeight: 0, minWidth: 0,
                marginLeft: leftToolbar ? '250px' : 0,
                width: leftToolbar ? 'calc(100% - 250px)' : undefined,
            }}>
                {!result ? (
                    <div className="flex-1 flex items-center justify-center px-8 text-center" role="status" style={{ color: matrix.refusal ? '#B45309' : COLOR.faint, fontSize: FONT.sm }}>
                        {matrix.rendering && matrix.progress
                            ? <ProgressBar progress={matrix.progress} />
                            : matrix.rendering
                                ? 'Evaluating the axis…'
                            : matrix.refusal
                                ?? matrix.rowEvaluation?.error
                                ?? (snapshot ? 'The axis selects no elements. Edit the definition and Render.' : 'Define the axis, then Render.')}
                    </div>
                ) : (
                <HierarchicalMatrix
                    result={result}
                    highlightIds={snapshot?.criticalIds}
                    onToggleRow={toggleRow}
                    onToggleColumn={toggleColumn}
                    onSelectElement={selectElement}
                    selectedElementId={selectedElementId}
                    renderCell={renderCell}
                    onCellClick={(row, column, cell) => {
                        if (cell) setInspected({ row, column, cell });
                        selectElement(row.node.id);
                    }}
                    cellSize={cellSize}
                    showColumnNames={showColumnNames}
                    onHideRow={id => hideAxisElement('rows', id)}
                    onHideColumn={id => hideAxisElement('columns', id)}
                    cornerHeader={
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                            <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>
                                Design Structure Matrix
                            </span>
                            <span style={{ fontSize: '11px', color: COLOR.faint, marginTop: '2px' }}>
                                {result.rows.length} {'×'} {result.columns.length} {'·'} {result.totalDependencies} dependencies
                                {result.stats.internal > 0 && ` · ${result.stats.internal} internal`}
                            </span>
                            <div style={{
                                display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10px', color: COLOR.muted,
                                borderTop: `1px solid ${COLOR.border}`, marginTop: '5px', paddingTop: '4px',
                            }}>
                                {[
                                    ['feedback', result.stats.feedback, 'Marks below the diagonal — candidates for rework loops'],
                                    ['coupled', result.stats.couplings, 'Pairs that depend on each other in both directions'],
                                    ['isolated', result.stats.isolated, 'Lines with no dependency either way'],
                                    ['max degree', result.stats.maxDegree, 'Most dependencies touching one line'],
                                ].map(([label, value, title]) => (
                                    <span key={label as string} title={title as string}>
                                        <strong style={{ color: COLOR.primary }}>{value}</strong> {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    }
                    footer={
                    <div style={{ marginTop: '18px', display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: COLOR.muted }}>
                        {[...new Set(result.matrix.flat().flatMap(cell => cell?.types ?? []))].sort().map(type => (
                            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: relationshipColor(type) }} />
                                {type}
                            </span>
                        ))}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#E3E8EE' }} />
                            diagonal: dependencies inside the subsystem
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '2px', background: '#94A3B8' }} />
                            subsystem boundary
                        </span>
                    </div>
                    }
                />
                )}
            </div>

            {/* ── Cell inspector ── */}
            {inspected && (
                <div style={{
                    position: 'fixed', bottom: '76px', right: '20px', zIndex: 100,
                    width: '300px', padding: '12px 14px', borderRadius: '9px',
                    background: COLOR.surface, border: `1px solid ${COLOR.border}`,
                    boxShadow: '0 6px 22px rgba(0,0,0,0.14)', fontSize: FONT.xs,
                }}>
                    <div className="flex items-start justify-between gap-2">
                        <div style={{ fontWeight: 600, color: COLOR.primary }}>
                            {inspected.row.node.name} {'→'} {inspected.column.node.name}
                        </div>
                        <button onClick={() => setInspected(null)} style={{ color: COLOR.faint, background: 'none', border: 'none', cursor: 'pointer' }}>{'✕'}</button>
                    </div>
                    {(['row', 'column'] as const).map(side => {
                        const entry = inspected[side];
                        const hits = entry.node.members.filter(member => snapshot?.criticalIds.has(member));
                        return hits.length > 0 ? (
                            <div key={side} style={{ color: '#B45309', fontWeight: 600, marginTop: '4px' }}>
                                ★ {side === 'row' ? 'Row' : 'Column'} {hits.length === 1 && entry.node.isElement ? 'is a critical element' : `holds ${hits.length} critical element${hits.length === 1 ? '' : 's'}`}
                            </div>
                        ) : null;
                    })}
                    <div style={{ color: COLOR.muted, margin: '6px 0' }}>
                        {inspected.cell.strength} dependenc{inspected.cell.strength === 1 ? 'y' : 'ies'}
                        {inspected.cell.aggregated && ' · rolled up from collapsed parts'}
                        {inspected.cell.diagonal && ' · internal to this subsystem'}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {inspected.cell.types.map(type => (
                            <span key={type} style={{
                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                background: `${relationshipColor(type)}20`,
                                color: relationshipColor(type), fontWeight: 500,
                            }}>{type}</span>
                        ))}
                    </div>
                    {inspected.cell.aggregated && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: COLOR.faint }}>
                            Expand both sides to see which parts are actually joined.
                        </div>
                    )}
                </div>
            )}
        </div>
        </div>
    );
}

function toggled(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
}

export const checkboxStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: FONT.xs, color: COLOR.muted, whiteSpace: 'nowrap',
} as const;

const exportOptionStyle = {
    display: 'flex', justifyContent: 'space-between', gap: '12px', width: '100%',
    padding: '6px 7px', border: 'none', borderRadius: '5px', background: 'transparent',
    cursor: 'pointer', fontSize: FONT.xs, color: COLOR.primary, textAlign: 'left' as const,
} as const;

const statStyle = {
    padding: '4px 8px', borderRadius: '5px', border: `1px solid ${COLOR.border}`,
    background: COLOR.surface, fontSize: '11px', color: COLOR.muted, whiteSpace: 'nowrap' as const,
};

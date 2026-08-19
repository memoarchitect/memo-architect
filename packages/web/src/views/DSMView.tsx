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
import {
    collectNodeIds,
    computeHierarchicalDSM,
    defaultContainmentTypes,
    layersInModel,
    relationshipTypesInModel,
    suggestDsmLayer,
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
import { Icon, IconButton, IconToggle, ToolbarCluster } from './DiagramToolbarControls';
import { elementFilterOptions, scopeKinds } from '../components/element-options';
import { kindParents, type KindParents } from '../analysis/kind-hierarchy';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

const ORDERINGS: { value: DsmOrdering; label: string; title: string }[] = [
    { value: 'natural', label: 'Name', title: 'Alphabetical inside every parent' },
    { value: 'kind', label: 'Element type', title: 'Grouped by element type, then name' },
    { value: 'partition', label: 'Partition', title: 'Sequence siblings so dependencies sit above the diagonal, leaving only real cycles as feedback' },
    { value: 'cluster', label: 'Cluster', title: 'Keep mutually dependent siblings adjacent' },
];

/** Mark colour: the first relationship type, so a mixed cell still reads as mixed. */
function markColor(cell: DsmAggregateCell): string {
    return cell.types.length > 0 ? relationshipColor(cell.types[0]) : '#475569';
}

export function DSMView() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const setAnalysisIssues = useModelStore(s => s.setAnalysisIssues);
    const registries = useMemo(() => getRegistries(model), [model]);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    // The picker nests kinds by the ontology's specialization chain, so the
    // axis has to honour the same reading: `Requirement` means its subkinds too.
    const parents = useMemo(() => kindParents(availableOntologies), [availableOntologies]);

    const [rowScope, setRowScope] = useState<AxisScope>({});
    const [columnScope, setColumnScope] = useState<AxisScope>({});
    const [rowElements, setRowElements] = useState<string[]>([]);
    const [columnElements, setColumnElements] = useState<string[]>([]);
    const [dependencyTypes, setDependencyTypes] = useState<string[]>([]);
    const [containmentTypes, setContainmentTypes] = useState<string[] | null>(null);
    const [groupByPackage, setGroupByPackage] = useState(false);
    const [rowOrdering, setRowOrdering] = useState<DsmOrdering>('natural');
    const [columnOrdering, setColumnOrdering] = useState<DsmOrdering>('natural');
    const [symmetric, setSymmetric] = useState(false);
    // Column names remain visible by default, but render straight and inside
    // their own header cells rather than diagonally across neighbouring cells.
    const [showColumnNames, setShowColumnNames] = useState(true);
    const [cellSize, setCellSize] = useState(39);
    const [linkAxes, setLinkAxes] = useState(true);
    const [toolbarPlacement, setToolbarPlacement] = useState<'top' | 'left'>('top');
    const [activeAxisFilter, setActiveAxisFilter] = useState<'rows' | 'columns' | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
    const [inspected, setInspected] = useState<{ row: DsmAxisEntry; column: DsmAxisEntry; cell: DsmAggregateCell } | null>(null);

    const layers = useMemo(() => (model ? layersInModel(model) : []), [model]);

    const relationshipOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model) return [];
        const counts = new Map<string, number>();
        for (const rel of model.relationships) counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1);
        return relationshipTypesInModel(model).map(type => ({
            value: type, hint: String(counts.get(type) ?? 0), color: relationshipColor(type),
        }));
    }, [model]);

    const rowElementOptions = useMemo(() => elementFilterOptions(model, rowScope, parents), [model, rowScope, parents]);
    const columnElementOptions = useMemo(() => elementFilterOptions(model, columnScope, parents), [model, columnScope, parents]);
    const rowKinds = useMemo(() => scopeKinds(rowScope, model, parents), [rowScope, model, parents]);
    const columnKinds = useMemo(() => scopeKinds(columnScope, model, parents), [columnScope, model, parents]);

    /** True once the user has actually narrowed an axis. */
    const axesChosen = Boolean(
        rowScope.layer || rowScope.kind || rowElements.length
        || columnScope.layer || columnScope.kind || columnElements.length);

    const legalDependencyOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model || !registries) return [];
        // This is a CROSS PRODUCT: every row against every column, asking the
        // ontology which relationships are legal between them. With no axis
        // chosen both sides are the whole model, so opening the DSM on a large
        // project paid |elements|^2 `legalRelationshipTypes` calls before the
        // user had expressed any intent at all -- 724 elements on gpca-pump is
        // over half a million pairs, on mount.
        //
        // Until an axis is narrowed there is nothing to narrow the relationship
        // list BY, so the unfiltered list is also the correct answer. The work
        // starts when the user's choice makes it meaningful.
        if (!axesChosen) return relationshipOptions;
        const matchesScope = (element: { id: string; layer: string; kind: string }, scope: AxisScope, kinds: string[], picked: string[]) =>
            (!scope.layer || element.layer === scope.layer)
            && (kinds.length === 0 || kinds.includes(element.kind))
            && (picked.length === 0 || picked.includes(element.id));
        const rows = Object.values(model.elements).filter(element => matchesScope(element, rowScope, rowKinds, rowElements));
        const columns = Object.values(model.elements).filter(element => matchesScope(element, columnScope, columnKinds, columnElements));
        const allowed = new Set<string>();
        for (const row of rows) for (const column of columns) {
            if (row.id !== column.id) for (const option of legalRelationshipTypes(row, column, registries)) allowed.add(option.definition.name);
        }
        return relationshipOptions.filter(option => allowed.has(option.value));
    }, [model, registries, rowScope, columnScope, rowKinds, columnKinds, rowElements, columnElements, relationshipOptions, axesChosen]);

    // A kind that is no longer on the axis must not keep its elements on it:
    // the picked list is pruned to what the kind filter still allows, so the
    // two controls can never disagree about what the axis contains.
    useEffect(() => {
        const allowed = new Set(rowElementOptions.map(option => option.value));
        setRowElements(current => current.length === 0 || current.every(id => allowed.has(id))
            ? current
            : current.filter(id => allowed.has(id)));
    }, [rowElementOptions]);
    useEffect(() => {
        const allowed = new Set(columnElementOptions.map(option => option.value));
        setColumnElements(current => current.length === 0 || current.every(id => allowed.has(id))
            ? current
            : current.filter(id => allowed.has(id)));
    }, [columnElementOptions]);

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

    useEffect(() => {
        const allowed = new Set(dependencyOptions.map(option => option.value));
        setDependencyTypes(current => current.every(type => allowed.has(type)) ? current : current.filter(type => allowed.has(type)));
    }, [dependencyOptions]);

    /** How many tucked-away settings are off their default, so Options says so. */
    const changedOptions = [
        containmentTypes !== null, !linkAxes, !showColumnNames, groupByPackage, symmetric,
    ].filter(Boolean).length;

    const result = useMemo(() => {
        if (!model) return null;
        return computeHierarchicalDSM(model, {
            rows: { layer: rowScope.layer, kinds: rowKinds, elementIds: rowElements, expanded: expandedRows, ordering: rowOrdering },
            columns: { layer: columnScope.layer, kinds: columnKinds, elementIds: columnElements, expanded: expandedColumns, ordering: columnOrdering },
            dependencyTypes,
            containmentTypes: effectiveContainment,
            groupByPackage,
            symmetric,
        });
    }, [model, rowScope, columnScope, rowKinds, columnKinds, rowElements, columnElements, dependencyTypes, effectiveContainment, groupByPackage, rowOrdering, columnOrdering, symmetric, expandedRows, expandedColumns]);

    // Open on something worth looking at: a DSM's subject is one layer against
    // itself, and the layer chosen is the one whose elements actually depend on
    // each other. Both are model-derived — a project whose substance is in
    // requirements opens on requirements, not on whatever a fixed list named.
    const [seeded, setSeeded] = useState(false);
    useEffect(() => {
        if (seeded || !model) return;
        const layer = suggestDsmLayer(model, effectiveContainment);
        if (!layer) return;
        setRowScope({ layer });
        setColumnScope({ layer });
        setSeeded(true);
    }, [model, effectiveContainment, seeded]);

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
        const options = axis === 'rows' ? rowElementOptions : columnElementOptions;
        const setElements = axis === 'rows' ? setRowElements : setColumnElements;
        const visibleEntries = axis === 'rows' ? result?.rows : result?.columns;
        // A parent remains structurally visible while one of its children is
        // selected. Hiding it therefore hides its entire displayed subtree.
        const hidden = new Set(visibleEntries?.find(entry => entry.node.id === elementId)?.node.members ?? [elementId]);
        setElements(current => {
            // An empty selection means “all”; materialize that visible set
            // before removing one item so an eye click and the filter agree.
            const visible = current.length === 0 ? options.map(option => option.value) : current;
            return visible.filter(id => !hidden.has(id));
        });
    }, [result, rowElementOptions, columnElementOptions]);

    const exportXlsx = useCallback(async () => {
        if (!model || !result) return;
        // The workbook needs every line, not only the currently visible ones,
        // so its native Excel outline controls can expand both hierarchies.
        const workbookResult = computeHierarchicalDSM(model, {
            rows: {
                layer: rowScope.layer, kinds: rowKinds, elementIds: rowElements, ordering: rowOrdering,
                expanded: new Set(collectNodeIds(result.rowRoots)),
            },
            columns: {
                layer: columnScope.layer, kinds: columnKinds, elementIds: columnElements, ordering: columnOrdering,
                expanded: new Set(collectNodeIds(result.columnRoots)),
            },
            dependencyTypes,
            containmentTypes: effectiveContainment,
            groupByPackage,
            symmetric,
        });
        await downloadDsmXlsx(workbookResult);
    }, [model, result, rowScope, columnScope, rowElements, columnElements, dependencyTypes, effectiveContainment, groupByPackage, rowOrdering, columnOrdering, symmetric]);

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

    if (!model || !result) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                No model loaded
            </div>
        );
    }

    const { stats } = result;
    const leftToolbar = toolbarPlacement === 'left';
    const axisGroupStyle: CSSProperties = leftToolbar
        ? {
            display: 'grid', gap: '8px', width: '100%',
        }
        : { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', marginTop: '2px' };

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F7F7F5', position: 'relative' }}>
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
                        <AxisControlGroup
                            axis="rows" layers={layers} scope={rowScope} onScopeChange={setRowScope}
                            elements={rowElements} onElementsChange={setRowElements} elementOptions={rowElementOptions}
                            ordering={rowOrdering} onOrderingChange={setRowOrdering}
                            onExpandAll={expandAxis} onCollapseAll={collapseAxis} onExpandToDepth={expandAxisToDepth}
                            leftDock={leftToolbar} filterOpen={activeAxisFilter === 'rows'}
                            onFilterOpenChange={open => setActiveAxisFilter(open ? 'rows' : null)}
                            parentOf={filterParentOf} kindParents={parents}
                        />
                        <AxisControlGroup
                            axis="columns" layers={layers} scope={columnScope} onScopeChange={setColumnScope}
                            elements={columnElements} onElementsChange={setColumnElements} elementOptions={columnElementOptions}
                            ordering={columnOrdering} onOrderingChange={setColumnOrdering}
                            onExpandAll={expandAxis} onCollapseAll={collapseAxis} onExpandToDepth={expandAxisToDepth}
                            leftDock={leftToolbar} filterOpen={activeAxisFilter === 'columns'}
                            onFilterOpenChange={open => setActiveAxisFilter(open ? 'columns' : null)}
                            parentOf={filterParentOf} kindParents={parents}
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
                        <button onClick={() => downloadDsmCsv(result)} style={exportOptionStyle}>
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
                <HierarchicalMatrix
                    result={result}
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
                                {stats.internal > 0 && ` · ${stats.internal} internal`}
                            </span>
                            <div style={{
                                display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10px', color: COLOR.muted,
                                borderTop: `1px solid ${COLOR.border}`, marginTop: '5px', paddingTop: '4px',
                            }}>
                                {[
                                    ['feedback', stats.feedback, 'Marks below the diagonal — candidates for rework loops'],
                                    ['coupled', stats.couplings, 'Pairs that depend on each other in both directions'],
                                    ['isolated', stats.isolated, 'Lines with no dependency either way'],
                                    ['max degree', stats.maxDegree, 'Most dependencies touching one line'],
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
    );
}

function toggled(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
}

/** One self-contained axis group: scope, element filter, order and tree controls. */
export function AxisControlGroup({
    axis, layers, scope, onScopeChange, elements, onElementsChange, elementOptions,
    ordering, onOrderingChange, onExpandAll, onCollapseAll, onExpandToDepth, leftDock,
    filterOpen, onFilterOpenChange, parentOf, kindParents,
}: {
    axis: 'rows' | 'columns';
    layers: LayerSummary[];
    /** kind → supertype, so the scope picker can nest the layer's kinds. */
    kindParents?: KindParents;
    scope: AxisScope;
    onScopeChange: (scope: AxisScope) => void;
    elements: string[];
    onElementsChange: (elements: string[]) => void;
    elementOptions: TypeFilterOption[];
    ordering: DsmOrdering;
    onOrderingChange: (ordering: DsmOrdering) => void;
    onExpandAll: (axis: 'rows' | 'columns') => void;
    onCollapseAll: (axis: 'rows' | 'columns') => void;
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
    leftDock: boolean;
    filterOpen: boolean;
    onFilterOpenChange: (open: boolean) => void;
    parentOf: ReadonlyMap<string, string>;
}) {
    const label = axis === 'rows' ? 'Rows' : 'Columns';
    if (leftDock) {
        return (
            <section style={{
                display: 'grid', gap: '5px', padding: '6px 8px', borderRadius: '8px',
                border: `1px solid ${COLOR.borderLight}`, background: COLOR.surfaceAlt,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: FONT.xs, fontWeight: 700, color: COLOR.secondary }}>{label}</span>
                    <AxisScopeSelect
                        label="" layers={layers} value={scope} onChange={onScopeChange} width={138} kindParents={kindParents}
                        describedAs={`${axis} scope`}
                        title={`What the ${axis} list — one architecture layer, or one element type within it.`}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <ToolbarPopover
                        label={<Icon.filter />} ariaLabel={`Filter ${axis} elements`} title={`Filter elements on the ${axis} axis`} width={255}
                        open={filterOpen} onOpenChange={onFilterOpenChange}
                    >
                        <TypeFilterSelect
                            label="Elements" allLabel={`all ${elementOptions.length}`} options={elementOptions}
                            selected={elements} onChange={onElementsChange} width={170} describedAs={`${axis} elements`}
                            placeholder="Filter by name, kind or id…" parentOf={parentOf}
                        />
                    </ToolbarPopover>
                    <AxisExpansionControls axis={axis} onExpandAll={onExpandAll} onCollapseAll={onCollapseAll} onExpandToDepth={onExpandToDepth} showLabel={false} showDepth={false} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <AxisDepthSelect axis={axis} onExpandToDepth={onExpandToDepth} compact />
                    <select
                        value={ordering}
                        onChange={event => onOrderingChange(event.target.value as DsmOrdering)}
                        aria-label={`Sort ${axis} siblings`}
                        title={ORDERINGS.find(entry => entry.value === ordering)?.title}
                        style={{ ...selectStyle, width: '112px' }}
                    >
                        {ORDERINGS.map(entry => <option key={entry.value} value={entry.value} title={entry.title}>{entry.label}</option>)}
                    </select>
                </div>
            </section>
        );
    }
    return (
        <section style={{
            display: 'grid', gridTemplateRows: 'auto auto', gap: '4px', boxSizing: 'border-box', padding: '6px 8px',
            border: `1px solid ${COLOR.border}`, borderRadius: '9px', background: '#FAFBFC',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 700, color: COLOR.secondary }}>{label}</span>
                <AxisScopeSelect
                    label="" layers={layers} value={scope} onChange={onScopeChange} width={150} kindParents={kindParents}
                    describedAs={`${axis} scope`}
                    title={`What the ${axis} list — one architecture layer, or one element type within it.`}
                />
                <ToolbarPopover
                    label={<Icon.filter />} ariaLabel={`Filter ${axis} elements`} title={`Filter elements on the ${axis} axis`} width={255}
                    open={filterOpen} onOpenChange={onFilterOpenChange}
                >
                    <TypeFilterSelect
                        label="Elements" allLabel={`all ${elementOptions.length}`} options={elementOptions}
                        selected={elements} onChange={onElementsChange} width={170} describedAs={`${axis} elements`}
                        placeholder="Filter by name, kind or id…" parentOf={parentOf}
                    />
                </ToolbarPopover>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <AxisExpansionControls axis={axis} onExpandAll={onExpandAll} onCollapseAll={onCollapseAll} onExpandToDepth={onExpandToDepth} showLabel={false} />
                <label style={{ ...checkboxStyle, gap: '5px' }} title={`Sort ${axis} siblings`}>
                    Sort
                    <select
                        value={ordering}
                        onChange={event => onOrderingChange(event.target.value as DsmOrdering)}
                        aria-label={`Sort ${axis} siblings`}
                        title={ORDERINGS.find(entry => entry.value === ordering)?.title}
                        style={selectStyle}
                    >
                        {ORDERINGS.map(entry => (
                            <option key={entry.value} value={entry.value} title={entry.title}>{entry.label}</option>
                        ))}
                    </select>
                </label>
            </div>
        </section>
    );
}

/** Axis controls belong to the axis they change; they never silently reshape the other one. */
function AxisExpansionControls({
    axis, onExpandAll, onCollapseAll, onExpandToDepth, showLabel = true, showDepth = true, compact = false,
}: {
    axis: 'rows' | 'columns';
    onExpandAll: (axis: 'rows' | 'columns') => void;
    onCollapseAll: (axis: 'rows' | 'columns') => void;
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
    showLabel?: boolean;
    showDepth?: boolean;
    compact?: boolean;
}) {
    const singular = axis === 'rows' ? 'row' : 'column';
    const label = axis === 'rows' ? 'Rows' : 'Columns';
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            {showLabel && <span style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{label}</span>}
            <ToolbarCluster>
                <IconButton
                    icon={<Icon.expand />}
                    onClick={() => onExpandAll(axis)}
                    title={`Expand every ${singular} subsystem`}
                    ariaLabel={`Expand all ${axis}`}
                />
                <IconButton
                    icon={<Icon.collapse />}
                    onClick={() => onCollapseAll(axis)}
                    title={`Collapse ${axis} to their top-level subsystems`}
                    ariaLabel={`Collapse all ${axis}`}
                />
            </ToolbarCluster>
            {showDepth && <AxisDepthSelect axis={axis} onExpandToDepth={onExpandToDepth} compact={compact} />}
        </div>
    );
}

function AxisDepthSelect({ axis, onExpandToDepth, compact = false }: {
    axis: 'rows' | 'columns';
    onExpandToDepth: (axis: 'rows' | 'columns', depth: number) => void;
    compact?: boolean;
}) {
    return (
        <select
                defaultValue=""
                aria-label={`Expand ${axis} to depth`}
                title={`Expand ${axis} to a specific depth`}
                onChange={event => {
                    const depth = Number(event.target.value);
                    if (depth > 0) onExpandToDepth(axis, depth);
                    event.currentTarget.value = '';
                }}
                style={compact ? { ...selectStyle, width: '82px' } : selectStyle}
            >
                <option value="">Depth…</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
        </select>
    );
}

const checkboxStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: FONT.xs, color: COLOR.muted, whiteSpace: 'nowrap',
} as const;

const selectStyle = {
    border: `1px solid ${COLOR.border}`, borderRadius: '5px',
    padding: '2px 5px', background: COLOR.surface, fontSize: FONT.xs, color: COLOR.primary,
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

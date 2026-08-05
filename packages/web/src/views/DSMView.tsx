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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
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
} from '../analysis/dsm-hierarchy';
import { analyzeConsistency } from '../analysis/consistency';
import { HierarchicalMatrix, type MatrixCellStyle } from '../components/HierarchicalMatrix';
import { TypeFilterSelect, type TypeFilterOption } from '../components/TypeFilterSelect';
import { ToolbarPopover } from '../components/ToolbarPopover';
import { AxisScopeSelect, describeScope, type AxisScope } from '../components/AxisScopeSelect';
import { elementFilterOptions } from '../components/element-options';
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

    const [rowScope, setRowScope] = useState<AxisScope>({});
    const [columnScope, setColumnScope] = useState<AxisScope>({});
    const [rowElements, setRowElements] = useState<string[]>([]);
    const [columnElements, setColumnElements] = useState<string[]>([]);
    const [dependencyTypes, setDependencyTypes] = useState<string[]>([]);
    const [containmentTypes, setContainmentTypes] = useState<string[] | null>(null);
    const [groupByPackage, setGroupByPackage] = useState(false);
    const [ordering, setOrdering] = useState<DsmOrdering>('natural');
    const [symmetric, setSymmetric] = useState(false);
    const [showColumnNames, setShowColumnNames] = useState(true);
    const [cellSize, setCellSize] = useState(26);
    const [linkAxes, setLinkAxes] = useState(true);
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

    const rowElementOptions = useMemo(() => elementFilterOptions(model, rowScope), [model, rowScope]);
    const columnElementOptions = useMemo(() => elementFilterOptions(model, columnScope), [model, columnScope]);

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

    /**
     * The same list, with the nesting relations called out. A relation that
     * builds the tree cannot also be a mark inside it — the engine drops it —
     * so picking one silently empties the matrix unless the picker says why.
     */
    const dependencyOptions = useMemo<TypeFilterOption[]>(() => {
        const nesting = new Set(effectiveContainment);
        return relationshipOptions.map(option => nesting.has(option.value)
            ? { ...option, label: `${option.value} (nesting)`, hint: 'builds the tree' }
            : option);
    }, [relationshipOptions, effectiveContainment]);

    /** How many tucked-away settings are off their default, so Options says so. */
    const changedOptions = [
        containmentTypes !== null, !linkAxes, !showColumnNames, groupByPackage, symmetric,
    ].filter(Boolean).length;

    const result = useMemo(() => {
        if (!model) return null;
        return computeHierarchicalDSM(model, {
            rows: { layer: rowScope.layer, kinds: rowScope.kind ? [rowScope.kind] : [], elementIds: rowElements, expanded: expandedRows },
            columns: { layer: columnScope.layer, kinds: columnScope.kind ? [columnScope.kind] : [], elementIds: columnElements, expanded: expandedColumns },
            dependencyTypes,
            containmentTypes: effectiveContainment,
            groupByPackage,
            ordering,
            symmetric,
        });
    }, [model, rowScope, columnScope, rowElements, columnElements, dependencyTypes, effectiveContainment, groupByPackage, ordering, symmetric, expandedRows, expandedColumns]);

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

    // Then expand the first level, so the matrix opens showing structure rather
    // than one collapsed line per tree.
    const [expandedSeeded, setExpandedSeeded] = useState(false);
    useEffect(() => {
        if (expandedSeeded || !seeded || !result) return;
        const roots = result.rowRoots.filter(node => node.children.length > 0).map(node => node.id);
        const columnRoots = result.columnRoots.filter(node => node.children.length > 0).map(node => node.id);
        if (roots.length === 0 && columnRoots.length === 0) return;
        setExpandedRows(new Set(roots));
        setExpandedColumns(new Set(columnRoots));
        setExpandedSeeded(true);
    }, [result, seeded, expandedSeeded]);

    const toggleRow = useCallback((nodeId: string) => {
        setExpandedRows(current => toggled(current, nodeId));
        if (linkAxes) setExpandedColumns(current => toggled(current, nodeId));
    }, [linkAxes]);

    const toggleColumn = useCallback((nodeId: string) => {
        setExpandedColumns(current => toggled(current, nodeId));
        if (linkAxes) setExpandedRows(current => toggled(current, nodeId));
    }, [linkAxes]);

    const expandAll = useCallback(() => {
        if (!result) return;
        setExpandedRows(new Set(collectNodeIds(result.rowRoots)));
        setExpandedColumns(new Set(collectNodeIds(result.columnRoots)));
    }, [result]);

    const collapseAll = useCallback(() => {
        setExpandedRows(new Set());
        setExpandedColumns(new Set());
    }, []);

    const expandToDepth = useCallback((depth: number) => {
        if (!result) return;
        setExpandedRows(new Set(collectNodeIds(result.rowRoots, depth)));
        setExpandedColumns(new Set(collectNodeIds(result.columnRoots, depth)));
    }, [result]);

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

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F7F7F5' }}>
            {/* ── Toolbar ──
                Two rows, not three: what the matrix *is* (its axes and what
                counts as a dependency) stays on screen, and the settings you
                choose once live behind Options. ── */}
            <div style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
                <div className="flex items-center gap-3 px-4 py-2" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>
                        Design Structure Matrix
                    </span>
                    <span style={{ fontSize: '11px', color: COLOR.faint }}>
                        {result.rows.length} {'×'} {result.columns.length} {'·'} {result.totalDependencies} dependencies
                        {stats.internal > 0 && ` · ${stats.internal} internal`}
                    </span>
                    <div className="flex-1" />
                    <AxisScopeSelect
                        label="Rows" layers={layers} value={rowScope} onChange={setRowScope}
                        describedAs="row scope"
                        title="What the rows list — one architecture layer, or one element type within it. An axis holds one semantic type so the marks between rows and columns can be read as a structure."
                    />
                    <TypeFilterSelect
                        label="of" allLabel={`all ${rowElementOptions.length}`} options={rowElementOptions}
                        selected={rowElements} onChange={setRowElements} width={110} describedAs="row elements"
                        placeholder="Filter by name, kind or id…"
                        title="The individual elements listed down the side. Type to narrow; each word narrows further."
                    />
                    <AxisScopeSelect
                        label="Columns" layers={layers} value={columnScope} onChange={setColumnScope}
                        describedAs="column scope"
                        title="What the columns list — one architecture layer, or one element type within it."
                    />
                    <TypeFilterSelect
                        label="of" allLabel={`all ${columnElementOptions.length}`} options={columnElementOptions}
                        selected={columnElements} onChange={setColumnElements} width={110} describedAs="column elements"
                        placeholder="Filter by name, kind or id…"
                        title="The individual elements listed across the top. Type to narrow; each word narrows further."
                    />
                    <TypeFilterSelect
                        label="Dependency" allLabel="Any relationship" options={dependencyOptions} width={140}
                        selected={dependencyTypes} onChange={setDependencyTypes} describedAs="dependency relationships"
                        title="Relationships that put a mark in a cell — flow, trace, allocation, …"
                    />
                </div>

                <div className="flex items-center gap-3 px-4 pb-2" style={{ flexWrap: 'wrap' }}>
                    <div className="flex items-center gap-1">
                        <button onClick={expandAll} style={buttonStyle} title="Expand every subsystem on both axes">Expand all</button>
                        <button onClick={collapseAll} style={buttonStyle} title="Collapse back to the top-level subsystems">Collapse all</button>
                        {[1, 2, 3].map(depth => (
                            <button key={depth} onClick={() => expandToDepth(depth)} style={buttonStyle} title={`Expand ${depth} level${depth > 1 ? 's' : ''} deep`}>
                                L{depth}
                            </button>
                        ))}
                    </div>

                    <label style={{ ...checkboxStyle, gap: '5px' }}>
                        Order
                        <select
                            value={ordering}
                            onChange={event => setOrdering(event.target.value as DsmOrdering)}
                            title={ORDERINGS.find(entry => entry.value === ordering)?.title}
                            style={selectStyle}
                        >
                            {ORDERINGS.map(entry => (
                                <option key={entry.value} value={entry.value} title={entry.title}>{entry.label}</option>
                            ))}
                        </select>
                    </label>

                    <label style={{ ...checkboxStyle, gap: '5px' }} title="Cell size">
                        Zoom
                        <input
                            type="range" min={14} max={44} step={2} value={cellSize}
                            onChange={event => setCellSize(Number(event.target.value))}
                            style={{ width: '76px', accentColor: COLOR.accent }}
                        />
                    </label>

                    <ToolbarPopover
                        label="Options"
                        badge={changedOptions > 0 ? String(changedOptions) : undefined}
                        title="Settings you set once: how nesting is derived, how the axes are grouped, what the header shows"
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

                    <div className="flex-1" />

                    {/* One line rather than four chips: these are read together
                        or not at all. */}
                    <div style={{ fontSize: '11px', color: COLOR.muted, display: 'flex', gap: '10px', whiteSpace: 'nowrap' }}>
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
            </div>

            {/* ── Matrix ── */}
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

const buttonStyle = {
    padding: '3px 8px', borderRadius: '5px', border: `1px solid ${COLOR.border}`,
    background: COLOR.surface, fontSize: '11px', color: COLOR.secondary, cursor: 'pointer',
} as const;

const checkboxStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: FONT.xs, color: COLOR.muted, whiteSpace: 'nowrap',
} as const;

const selectStyle = {
    border: `1px solid ${COLOR.border}`, borderRadius: '5px',
    padding: '2px 5px', background: COLOR.surface, fontSize: FONT.xs, color: COLOR.primary,
} as const;

const statStyle = {
    padding: '4px 8px', borderRadius: '5px', border: `1px solid ${COLOR.border}`,
    background: COLOR.surface, fontSize: '11px', color: COLOR.muted, whiteSpace: 'nowrap' as const,
};

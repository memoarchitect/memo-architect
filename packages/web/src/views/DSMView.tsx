// ─── Design Structure Matrix (DSM) View ─────────────────────────────────────
//
// Interactive N×N matrix showing dependencies between functional elements.
// Color-coded cells indicate relationship type; hover for details.
// Supports clustering and allocation overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useModelStore } from '../store/model-store';
import { analyzeDSM, computeDSM, reorderDSM, type DSMResult, type DSMCell } from '../analysis/dsm';
import { analyzeConsistency, type ConsistencyIssue } from '../analysis/consistency';
import { LAYER_COLORS, REL_COLORS } from '../constants';

/** Color for a DSM cell based on relationship types */
function cellColor(cell: DSMCell): string {
    // Use first relationship type's color
    for (const t of cell.types) {
        if (REL_COLORS[t]) return REL_COLORS[t];
    }
    return '#6B7280';
}

/** Lighter background for cell based on count intensity */
function cellBg(cell: DSMCell): string {
    const color = cellColor(cell);
    const alpha = Math.min(0.15 + cell.count * 0.15, 0.6);
    return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

const CELL_SIZE = 36;
const LABEL_WIDTH = 160;

export function DSMView() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const setAnalysisIssues = useModelStore(s => s.setAnalysisIssues);

    const [showClusters, setShowClusters] = useState(true);
    const [showAllocation, setShowAllocation] = useState(false);
    const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
    const [rowKind, setRowKind] = useState('__all__');
    const [columnKind, setColumnKind] = useState('__all__');
    const [hierarchyParentKind, setHierarchyParentKind] = useState('__flat__');
    const [includedGroups, setIncludedGroups] = useState<Set<string>>(new Set());
    const [excludedGroups, setExcludedGroups] = useState<Set<string>>(new Set());

    const availableKinds = useMemo(() => [...new Set(Object.values(model?.elements ?? {}).map(element => element.kind))].sort(), [model]);
    const availableGroups = useMemo(() => [...new Set(Object.values(model?.elements ?? {}).map(element => element.attributes?.group).filter((group): group is string => Boolean(group)))].sort(), [model]);
    const rowKinds = rowKind === '__all__' ? availableKinds : [rowKind];
    const columnKinds = columnKind === '__all__' ? availableKinds : [columnKind];
    const isSquareSelection = rowKind === columnKind;

    const dsm = useMemo<DSMResult | null>(() => {
        if (!model) return null;
        const raw = computeDSM(model, {
            rowKinds,
            columnKinds,
            includeGroups: [...includedGroups],
            excludeGroups: [...excludedGroups],
            hierarchyParentKind: hierarchyParentKind === '__flat__' ? undefined : hierarchyParentKind,
        });
        return showClusters && isSquareSelection ? reorderDSM(raw) : raw;
    }, [model, showClusters, rowKinds, columnKinds, isSquareSelection, includedGroups, excludedGroups, hierarchyParentKind]);

    const dsmAnalysis = useMemo(() => dsm ? analyzeDSM(dsm) : null, [dsm]);

    const setGroupMode = useCallback((group: string, mode: 'include' | 'exclude' | 'all') => {
        setIncludedGroups(current => {
            const next = new Set(current);
            if (mode === 'include') next.add(group); else next.delete(group);
            return next;
        });
        setExcludedGroups(current => {
            const next = new Set(current);
            if (mode === 'exclude') next.add(group); else next.delete(group);
            return next;
        });
    }, []);

    const consistency = useMemo(() => {
        if (!model) return null;
        return analyzeConsistency(model);
    }, [model]);

    // Push consistency issues to the bottom Problems bar
    useEffect(() => {
        if (!consistency) return;
        setAnalysisIssues(consistency.issues.map(i => ({
            id: i.id,
            source: 'DSM',
            severity: i.severity,
            elementId: i.elementId,
            elementName: i.elementName,
            message: i.message,
            tag: i.type === 'unallocated-function' ? 'unallocated'
                : i.type === 'cross-component-flow' ? 'cross-boundary'
                : 'no functions',
        })));
        return () => setAnalysisIssues([]);
    }, [consistency, setAnalysisIssues]);

    const onCellHover = useCallback((row: number, col: number) => {
        setHoveredCell({ row, col });
    }, []);

    const onCellLeave = useCallback(() => {
        setHoveredCell(null);
    }, []);

    if (!model || !dsm) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                <p>No model loaded</p>
            </div>
        );
    }

    if (dsm.rowElementIds.length === 0 || dsm.columnElementIds.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ maxWidth: '320px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>{'\u25A4'}</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        No Matching Elements
                    </h3>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>
                        Choose row and column element types that exist in the model.
                    </p>
                </div>
            </div>
        );
    }

    const rowCount = dsm.rowElementIds.length;
    const columnCount = dsm.columnElementIds.length;

    // Cluster boundaries for visual grouping
    const clusterBoundaries = new Set<number>();
    if (showClusters && isSquareSelection && dsm.clusters.size > 1) {
        let idx = 0;
        for (const [, members] of dsm.clusters) {
            idx += members.length;
            if (idx < rowCount) clusterBoundaries.add(idx);
        }
    }

    // Hovered cell tooltip info
    const tooltipInfo = hoveredCell ? (() => {
        const cell = dsm.matrix[hoveredCell.row][hoveredCell.col];
        const rowEl = dsm.elements[dsm.rowElementIds[hoveredCell.row]];
        const colEl = dsm.elements[dsm.columnElementIds[hoveredCell.col]];
        return { cell, rowEl, colEl };
    })() : null;

    return (
        <div className="flex-1 flex flex-col" style={{ background: '#F7F7F5' }}>
            {/* Toolbar */}
            <div
                className="flex items-center gap-3 px-4 py-2"
                style={{ borderBottom: '1px solid #E5E5E0', background: '#FFFFFF' }}
            >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    Design Structure Matrix
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {rowCount} rows × {columnCount} columns, {dsm.totalDependencies} dependencies
                </span>

                <div className="flex-1" />

                <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                    Rows
                    <select value={rowKind} onChange={event => setRowKind(event.target.value)} style={{ border: '1px solid #E5E5E0', borderRadius: 4, padding: '2px 5px', background: '#FFFFFF' }}>
                        <option value="__all__">All element types</option>
                        {availableKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                </label>
                <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }} title="Roll child dependencies up to the nearest matching parent">
                    Hierarchy
                    <select value={hierarchyParentKind} onChange={event => setHierarchyParentKind(event.target.value)} style={{ border: '1px solid #E5E5E0', borderRadius: 4, padding: '2px 5px', background: '#FFFFFF' }}>
                        <option value="__flat__">Flat</option>
                        {availableKinds.map(kind => <option key={kind} value={kind}>Parent: {kind}</option>)}
                    </select>
                </label>
                {availableGroups.length > 0 && (
                    <details style={{ position: 'relative', fontSize: '12px', color: '#6B7280' }}>
                        <summary style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Groups{includedGroups.size || excludedGroups.size ? ` (${includedGroups.size + excludedGroups.size})` : ''}
                        </summary>
                        <div style={{ position: 'absolute', right: 0, top: '22px', zIndex: 20, width: '235px', padding: '10px', background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,.12)' }}>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Include limits the matrix; exclude always removes.</div>
                            {availableGroups.map(group => {
                                const mode = includedGroups.has(group) ? 'include' : excludedGroups.has(group) ? 'exclude' : 'all';
                                return <label key={group} className="flex items-center justify-between gap-2" style={{ padding: '3px 0' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group}>{group}</span>
                                    <select aria-label={`${group} filter`} value={mode} onChange={event => setGroupMode(group, event.target.value as 'include' | 'exclude' | 'all')} style={{ border: '1px solid #E5E5E0', borderRadius: 3, padding: '1px 3px', background: '#FFF' }}>
                                        <option value="all">All</option><option value="include">Include</option><option value="exclude">Exclude</option>
                                    </select>
                                </label>;
                            })}
                            {(includedGroups.size > 0 || excludedGroups.size > 0) && <button onClick={() => { setIncludedGroups(new Set()); setExcludedGroups(new Set()); }} style={{ marginTop: '7px', fontSize: '11px', color: '#2563EB' }}>Clear filters</button>}
                        </div>
                    </details>
                )}
                <label className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                    Columns
                    <select value={columnKind} onChange={event => setColumnKind(event.target.value)} style={{ border: '1px solid #E5E5E0', borderRadius: 4, padding: '2px 5px', background: '#FFFFFF' }}>
                        <option value="__all__">All element types</option>
                        {availableKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                </label>

                {/* Cluster toggle */}
                <label className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                    <input
                        type="checkbox"
                        checked={showClusters}
                        onChange={e => setShowClusters(e.target.checked)}
                        disabled={!isSquareSelection}
                        style={{ accentColor: '#2DD4A8' }}
                    />
                    Cluster{!isSquareSelection ? ' (same type only)' : ''}
                </label>

                {/* Allocation overlay toggle */}
                <label className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                    <input
                        type="checkbox"
                        checked={showAllocation}
                        onChange={e => setShowAllocation(e.target.checked)}
                        style={{ accentColor: '#E67E22' }}
                    />
                    Allocation
                </label>
            </div>

            {/* Matrix */}
            <div className="flex-1 overflow-auto p-4">
                {dsmAnalysis && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {[
                            ['Feedback', dsmAnalysis.feedbackDependencies, 'dependencies below the diagonal'],
                            ['Couplings', dsmAnalysis.coupledPairs, 'pairs with dependencies in both directions'],
                            ['Isolated', dsmAnalysis.isolatedElements, 'elements with no visible dependencies'],
                            ['Max degree', dsmAnalysis.maxDegree, 'largest direct dependency count'],
                        ].map(([label, value, title]) => <div key={label as string} title={title as string} style={{ padding: '5px 8px', borderRadius: 5, border: '1px solid #E5E5E0', background: '#FFF', fontSize: '11px', color: '#6B7280' }}><strong style={{ color: '#374151' }}>{value}</strong> {label}</div>)}
                    </div>
                )}
                <div style={{ display: 'inline-block', position: 'relative' }}>
                    {/* Column headers (rotated) */}
                    <div style={{ display: 'flex', marginLeft: LABEL_WIDTH, marginBottom: '4px' }}>
                        {dsm.columnElementIds.map((id, colIdx) => {
                            const el = dsm.elements[id];
                            const isHovered = hoveredCell?.col === colIdx;
                            return (
                                <div
                                    key={id}
                                    style={{
                                        width: CELL_SIZE,
                                        height: LABEL_WIDTH - 20,
                                        position: 'relative',
                                        borderRight: clusterBoundaries.has(colIdx + 1)
                                            ? '2px solid #2DD4A8'
                                            : undefined,
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: CELL_SIZE / 2,
                                            transformOrigin: 'bottom left',
                                            transform: 'rotate(-60deg)',
                                            whiteSpace: 'nowrap',
                                            fontSize: '11px',
                                            fontWeight: isHovered ? 600 : 400,
                                            color: isHovered ? '#1a1a1a' : '#6B7280',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => selectElement(id)}
                                    >
                                        {el.name}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rows */}
                    {dsm.rowElementIds.map((rowId, rowIdx) => {
                        const rowEl = dsm.elements[rowId];
                        const isRowHovered = hoveredCell?.row === rowIdx;
                        const isSelected = selectedElementId === rowId;
                        const isClusterBoundary = clusterBoundaries.has(rowIdx);

                        return (
                            <div
                                key={rowId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderTop: isClusterBoundary ? '2px solid #2DD4A8' : undefined,
                                }}
                            >
                                {/* Row label */}
                                <div
                                    style={{
                                        width: LABEL_WIDTH,
                                        paddingRight: '8px',
                                        fontSize: '11px',
                                        fontWeight: isRowHovered || isSelected ? 600 : 400,
                                        color: isRowHovered || isSelected ? '#1a1a1a' : '#6B7280',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'right',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '6px',
                                        height: CELL_SIZE,
                                    }}
                                    onClick={() => selectElement(rowId)}
                                    title={`${rowEl.name} (${rowEl.kind})`}
                                >
                                    {showAllocation && rowEl.allocatedTo && (
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                padding: '1px 4px',
                                                borderRadius: '3px',
                                                background: '#E67E2220',
                                                color: '#E67E22',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {rowEl.allocatedTo}
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            width: '3px',
                                            height: '14px',
                                            borderRadius: '2px',
                                            background: LAYER_COLORS[rowEl.layer] || '#9CA3AF',
                                            flexShrink: 0,
                                        }}
                                    />
                                    {rowEl.name}
                                    {rowEl.memberCount && rowEl.memberCount > 1 && <span style={{ fontSize: '9px', color: '#9CA3AF' }}>({rowEl.memberCount})</span>}
                                </div>

                                {/* Cells */}
                                {dsm.columnElementIds.map((colId, colIdx) => {
                                    const cell = dsm.matrix[rowIdx][colIdx];
                                    const isDiagonal = rowId === colId;
                                    const isCellHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                                    const isHighlighted = hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx;

                                    return (
                                        <div
                                            key={colId}
                                            onMouseEnter={() => onCellHover(rowIdx, colIdx)}
                                            onMouseLeave={onCellLeave}
                                            onClick={() => {
                                                if (cell) selectElement(rowId);
                                            }}
                                            style={{
                                                width: CELL_SIZE,
                                                height: CELL_SIZE,
                                                border: '1px solid #E5E5E0',
                                                borderRight: clusterBoundaries.has(colIdx + 1)
                                                    ? '2px solid #2DD4A8'
                                                    : '1px solid #E5E5E0',
                                                background: isDiagonal
                                                    ? '#F3F4F6'
                                                    : cell
                                                        ? cellBg(cell)
                                                        : isHighlighted
                                                            ? '#FAFAFA'
                                                            : '#FFFFFF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: cell ? 'pointer' : 'default',
                                                transition: 'background 100ms ease',
                                                outline: isCellHovered && cell
                                                    ? `2px solid ${cellColor(cell)}`
                                                    : undefined,
                                                outlineOffset: '-2px',
                                            }}
                                        >
                                            {cell && !isDiagonal && (
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        color: cellColor(cell),
                                                    }}
                                                >
                                                    {cell.count > 1 ? cell.count : '\u25CF'}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Tooltip */}
                {tooltipInfo?.cell && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: '80px',
                            right: '20px',
                            background: '#FFFFFF',
                            border: '1px solid #E5E5E0',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            fontSize: '12px',
                            zIndex: 100,
                            maxWidth: '280px',
                        }}
                    >
                        <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>
                            {tooltipInfo.rowEl.name}
                        </div>
                        <div style={{ color: '#6B7280', marginBottom: '4px' }}>
                            {'\u2192'} {tooltipInfo.colEl.name}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {tooltipInfo.cell.types.map(t => (
                                <span
                                    key={t}
                                    style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: (REL_COLORS[t] || '#6B7280') + '20',
                                        color: REL_COLORS[t] || '#6B7280',
                                        fontWeight: 500,
                                    }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                        {tooltipInfo.cell.flowItems.length > 0 && (
                            <div style={{ marginTop: '4px', color: '#9CA3AF', fontSize: '11px' }}>
                                Items: {tooltipInfo.cell.flowItems.join(', ')}
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div
                    style={{
                        marginTop: '20px',
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap',
                        fontSize: '11px',
                        color: '#6B7280',
                    }}
                >
                    {['flow', 'decomposedBy', 'composedOf', 'allocateTo', 'succession'].map(t => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '2px',
                                    background: REL_COLORS[t] || '#6B7280',
                                }}
                            />
                            {t}
                        </div>
                    ))}
                    {showClusters && dsm.clusters.size > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                                style={{
                                    width: '10px',
                                    height: '2px',
                                    background: '#2DD4A8',
                                }}
                            />
                            cluster boundary
                        </div>
                    )}
                </div>

                {/* DSM consistency issues are surfaced in the bottom Problems bar */}
            </div>
        </div>
    );
}

// ─── Hierarchical Matrix ─────────────────────────────────────────────────────
//
// The grid both the DSM and the traceability matrix draw on. Rows and columns
// are trees: each line can be expanded into its parts or collapsed back into a
// single line carrying the sum beneath it.
//
// Two rendering choices carry most of the readability:
//
//   • Columns are identified by *number*, the way Lattix does it. A wall of
//     diagonal names next to a wall of grid lines is unreadable; the number is
//     unambiguous and the name is one hover away. The optional names are
//     straight vertical labels, contained in their own header cells.
//
//   • Nesting is drawn as *boundaries*, not decoration. A rule appears where a
//     subsystem starts, heavier for shallower nesting, so the block structure
//     of the model is visible without any line running the height of the page.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { DsmAggregateCell, DsmAxisEntry, HierarchicalDsmResult } from '../analysis/dsm-hierarchy';
import { LAYER_COLORS } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

/** What one cell should look like. Returned by the owning view. */
export interface MatrixCellStyle {
    text?: string;
    color?: string;
    background?: string;
    title?: string;
    /** Draw the cell as clickable even when empty — traceability editing. */
    actionable?: boolean;
}

export interface HierarchicalMatrixProps {
    result: HierarchicalDsmResult;
    onToggleRow: (nodeId: string) => void;
    onToggleColumn: (nodeId: string) => void;
    onSelectElement?: (elementId: string) => void;
    selectedElementId?: string | null;
    /** Cell appearance. Defaults to the strength number in the DSM's palette. */
    renderCell?: (cell: DsmAggregateCell | null, row: DsmAxisEntry, column: DsmAxisEntry) => MatrixCellStyle;
    onCellClick?: (row: DsmAxisEntry, column: DsmAxisEntry, cell: DsmAggregateCell | null) => void;
    onCellDoubleClick?: (row: DsmAxisEntry, column: DsmAxisEntry, cell: DsmAggregateCell | null) => void;
    /** Pixel size of one cell; the zoom control writes this. */
    cellSize?: number;
    showColumnNames?: boolean;
    /** Hide one visible element through the same selection that powers its filter. */
    onHideRow?: (elementId: string) => void;
    onHideColumn?: (elementId: string) => void;
    /** Content for the empty corner above row labels and left of column headers. */
    cornerHeader?: ReactNode;
    /** Extra content rendered under the grid, e.g. a legend. */
    footer?: ReactNode;
}

const LABEL_WIDTH = 300;
/** Longest column name drawn in the header before it is elided. */
const MAX_HEADER_NAME = 24;
/** Above this many cells the browser, not the analysis, becomes the bottleneck. */
const CELL_BUDGET = 90_000;

/** Rule weight for a boundary that opens a subsystem at `depth`. */
function boundary(depth: number): string {
    if (depth <= 0) return `2px solid ${'#94A3B8'}`;
    if (depth === 1) return `1px solid ${'#B6C4D0'}`;
    return `1px solid ${COLOR.borderLight}`;
}

/** Where each visible line opens a new group, and how deep that group sits. */
function boundaryDepths(entries: DsmAxisEntry[]): (number | null)[] {
    return entries.map((entry, index) => {
        if (index === 0) return null;
        const previous = entries[index - 1];
        // A line that is not a child of the line above it starts a new block;
        // the shallower of the two depths is what the eye reads as the level.
        if (entry.ancestorIds.includes(previous.node.id)) return null;
        return Math.min(entry.depth, previous.depth);
    });
}

export function HierarchicalMatrix({
    result, onToggleRow, onToggleColumn, onSelectElement, selectedElementId,
    renderCell, onCellClick, onCellDoubleClick, cellSize = 26, showColumnNames = false, onHideRow, onHideColumn, cornerHeader, footer,
}: HierarchicalMatrixProps) {
    const [hover, setHover] = useState<{ row: number; column: number } | null>(null);
    const { rows, columns, matrix } = result;

    const rowBoundaries = useMemo(() => boundaryDepths(rows), [rows]);
    const columnBoundaries = useMemo(() => boundaryDepths(columns), [columns]);
    const matrixFontSize = Math.max(10, Math.round(cellSize * 0.34));
    const labelFontSize = Math.max(11, Math.round(cellSize * 0.34));

    /** Top-level block each line belongs to, used for the intra-block tint. */
    const rootOf = (entry: DsmAxisEntry) => entry.ancestorIds[0] ?? entry.node.id;

    // Optional vertical names set the header's height, so one very long name
    // would push the whole grid down the page. Names are elided past a sensible
    // length — the full one is in the header's tooltip and row label opposite.
    const headerName = (name: string) =>
        name.length > MAX_HEADER_NAME ? `${name.slice(0, MAX_HEADER_NAME - 1)}…` : name;
    const longestHeader = Math.min(MAX_HEADER_NAME, Math.max(0, ...columns.map(entry => entry.node.name.length)));
    const headerHeight = Math.max(cornerHeader ? 76 : 0, showColumnNames
        // The vertical label font grows with zoom. Reserve two extra glyphs
        // for the expand/collapse marker so it never spills into a neighbour.
        ? 42 + (longestHeader + 2) * labelFontSize * 0.62
        : 44);

    if (rows.length === 0 || columns.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', maxWidth: '340px' }}>
                    <div style={{ fontSize: '34px', opacity: 0.35, marginBottom: '10px' }}>{'▦'}</div>
                    <h3 style={{ fontSize: FONT.md, fontWeight: 600, color: COLOR.secondary, marginBottom: '6px' }}>
                        Nothing to plot
                    </h3>
                    <p style={{ fontSize: FONT.xs, color: COLOR.faint, lineHeight: 1.6 }}>
                        No element matches the chosen row and column types. Widen either axis, or clear the type filter to see the whole model.
                    </p>
                </div>
            </div>
        );
    }

    const overBudget = rows.length * columns.length > CELL_BUDGET;

    return (
        <div style={{ padding: '14px', overflow: 'auto', flex: 1 }}>
            {overBudget && (
                <div style={{
                    marginBottom: '10px', padding: '8px 10px', borderRadius: '6px',
                    background: '#FEF3C7', border: '1px solid #FCD34D',
                    fontSize: FONT.xs, color: '#92400E',
                }}>
                    {rows.length.toLocaleString()} × {columns.length.toLocaleString()} is past what stays
                    responsive to draw. Collapse a few subsystems, or narrow the row and column types.
                </div>
            )}

            {!overBudget && (
                <div style={{ display: 'inline-block', minWidth: '100%' }}>
                    {/* ── Column headers ── */}
                    <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: COLOR.surface }}>
                        <div style={{
                            width: LABEL_WIDTH, flexShrink: 0, height: headerHeight,
                            display: 'flex', alignItems: cornerHeader ? 'stretch' : 'flex-end', justifyContent: 'flex-end', gap: '5px',
                            padding: cornerHeader ? '8px 12px' : '0 8px 3px 0',
                            fontSize: '10px', color: COLOR.faint,
                            background: cornerHeader ? COLOR.surfaceAlt : undefined,
                            borderRight: cornerHeader ? `1px solid ${COLOR.border}` : undefined,
                            borderBottom: `1px solid ${COLOR.border}`,
                        }}>
                            {cornerHeader ?? <span>{rows.length} rows {'×'} {columns.length} cols</span>}
                        </div>
                        {columns.map((entry, index) => {
                            const isHovered = hover?.column === index;
                            return (
                                <div
                                    key={entry.node.id}
                                    onClick={() => entry.expandable ? onToggleColumn(entry.node.id) : onSelectElement?.(entry.node.id)}
                                    onMouseEnter={() => setHover({
                                        row: rows.findIndex(row => row.node.id === entry.node.id),
                                        column: index,
                                    })}
                                    onMouseLeave={() => setHover(null)}
                                    title={`${entry.index}. ${entry.node.name} (${entry.node.kind})${entry.expandable ? ' — click to expand' : ''}`}
                                    style={{
                                        width: cellSize, flexShrink: 0, height: headerHeight,
                                        position: 'relative', cursor: 'pointer',
                                        borderLeft: columnBoundaries[index] === null ? undefined : boundary(columnBoundaries[index]!),
                                        borderRight: index === columns.length - 1 ? boundary(0) : undefined,
                                        borderBottom: `1px solid ${COLOR.border}`,
                                        background: isHovered ? '#EAF7F3' : 'transparent',
                                    }}
                                >
                                    {showColumnNames && (
                                        <div style={{
                                            position: 'absolute', top: '42px', bottom: '4px', left: 0, right: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                                            overflow: 'hidden', fontSize: `${labelFontSize}px`, lineHeight: 1,
                                            color: isHovered ? COLOR.primary : COLOR.muted,
                                            // Header typography is independent of whether this
                                            // particular node happens to have children. That keeps
                                            // cross-layer trace columns visually consistent with DSM.
                                            fontWeight: 600,
                                        }}>
                                            {entry.expandable ? (entry.expanded ? '− ' : '+ ') : ''}{headerName(entry.node.name)}
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute', top: '3px', width: '100%', left: 0,
                                        display: 'block',
                                        textAlign: 'center', fontSize: `${Math.max(10, matrixFontSize - 2)}px`,
                                        color: isHovered ? COLOR.primary : COLOR.faint,
                                        fontWeight: isHovered ? 700 : 400,
                                    }}>
                                        <span>{entry.index}</span>
                                    </div>
                                    {entry.node.isElement && onHideColumn && (
                                        <span style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(-50%)' }}>
                                            <VisibilityButton title={`Hide ${entry.node.name} column`} ariaLabel={`Hide ${entry.node.name} column`} onClick={() => onHideColumn(entry.node.id)} />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Rows ── */}
                    {rows.map((rowEntry, row) => {
                        const rowHovered = hover?.row === row;
                        const isSelected = selectedElementId === rowEntry.node.id;
                        return (
                            <div
                                key={rowEntry.node.id}
                                style={{
                                    display: 'flex',
                                    borderTop: rowBoundaries[row] === null ? undefined : boundary(rowBoundaries[row]!),
                                    borderBottom: row === rows.length - 1 ? boundary(0) : undefined,
                                }}
                            >
                                <RowLabel
                                    entry={rowEntry}
                                    height={cellSize}
                                    fontSize={labelFontSize}
                                    onHide={rowEntry.node.isElement && onHideRow ? () => onHideRow(rowEntry.node.id) : undefined}
                                    hovered={rowHovered}
                                    selected={isSelected}
                                    onToggle={() => onToggleRow(rowEntry.node.id)}
                                    onSelect={() => onSelectElement?.(rowEntry.node.id)}
                                />
                                {columns.map((columnEntry, column) => {
                                    const cell = matrix[row][column];
                                    const style = renderCell
                                        ? renderCell(cell, rowEntry, columnEntry)
                                        : defaultCellStyle(cell);
                                    const highlighted = hover?.row === row || hover?.column === column;
                                    const sameBlock = rootOf(rowEntry) === rootOf(columnEntry);
                                    // The identity diagonal is always shaded to orient the
                                    // eye. It shows a number only when a real dependency
                                    // resolves within that displayed subsystem.
                                    const identity = rowEntry.node.id === columnEntry.node.id;
                                    const background = style.background
                                        ?? (identity ? '#E3E8EE'
                                            : highlighted ? '#F1F7F5'
                                                : sameBlock ? '#FAFBFC' : COLOR.surface);
                                    const text = style.text;
                                    const clickable = Boolean(cell) || style.actionable;

                                    return (
                                        <div
                                            key={columnEntry.node.id}
                                            onMouseEnter={() => setHover({ row, column })}
                                            onMouseLeave={() => setHover(null)}
                                            onClick={clickable ? () => onCellClick?.(rowEntry, columnEntry, cell) : undefined}
                                            onDoubleClick={clickable ? () => onCellDoubleClick?.(rowEntry, columnEntry, cell) : undefined}
                                            title={style.title ?? cellTitle(cell, rowEntry, columnEntry)}
                                            style={{
                                                width: cellSize, height: cellSize, flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: `${matrixFontSize}px`, fontWeight: 600,
                                                color: style.color ?? (identity ? COLOR.faint : COLOR.secondary),
                                                background,
                                                borderRight: column === columns.length - 1
                                                    ? boundary(0)
                                                    : `1px solid ${COLOR.borderLight}`,
                                                borderBottom: `1px solid ${COLOR.borderLight}`,
                                                borderLeft: columnBoundaries[column] === null ? undefined : boundary(columnBoundaries[column]!),
                                                cursor: clickable ? 'pointer' : 'default',
                                                outline: hover?.row === row && hover?.column === column
                                                    ? `2px solid ${COLOR.accent}` : undefined,
                                                outlineOffset: '-2px',
                                            }}
                                        >
                                            {text}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
            {footer}
        </div>
    );
}

function VisibilityButton({ title, ariaLabel, onClick }: { title: string; ariaLabel: string; onClick: () => void }) {
    return (
        <button
            type="button" title={title} aria-label={ariaLabel} onClick={event => { event.stopPropagation(); onClick(); }}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px',
                padding: 0, border: 'none', borderRadius: '4px', background: 'rgba(255,255,255,0.82)',
                color: COLOR.muted, cursor: 'pointer',
            }}
        >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" />
                <circle cx="8" cy="8" r="2" />
            </svg>
        </button>
    );
}

/** The tree cell: indent guides, expander, name, aggregate size, index. */
function RowLabel({ entry, height, fontSize, hovered, selected, onToggle, onSelect, onHide }: {
    entry: DsmAxisEntry;
    height: number;
    fontSize: number;
    hovered: boolean;
    selected: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onHide?: () => void;
}) {
    const indent = entry.depth * 14;
    const labelStyle: CSSProperties = {
        width: LABEL_WIDTH, flexShrink: 0, height,
        display: 'flex', alignItems: 'center', gap: '5px',
        paddingLeft: `${6 + indent}px`, paddingRight: '7px',
        position: 'sticky', left: 0, zIndex: 10,
        background: selected ? '#E8F8F3' : hovered ? '#F1F7F5' : COLOR.surface,
        borderRight: `1px solid ${COLOR.border}`,
        borderBottom: `1px solid ${COLOR.borderLight}`,
        fontSize: `${fontSize}px`,
        color: hovered || selected ? COLOR.primary : COLOR.secondary,
        fontWeight: entry.expandable ? 600 : 400,
    };

    return (
        <div style={labelStyle}>
            <span style={{ fontSize: `${Math.max(10, fontSize - 3)}px`, color: COLOR.faint, width: '18px', textAlign: 'center', flexShrink: 0 }}>
                {entry.index}
            </span>
            <span style={{ width: '18px', height: '18px', flexShrink: 0 }}>
                {onHide && <VisibilityButton title={`Hide ${entry.node.name} row`} ariaLabel={`Hide ${entry.node.name} row`} onClick={onHide} />}
            </span>
            <button
                type="button"
                onClick={entry.expandable ? onToggle : undefined}
                aria-label={entry.expandable ? `${entry.expanded ? 'Collapse' : 'Expand'} ${entry.node.name}` : undefined}
                disabled={!entry.expandable}
                style={{
                    width: '13px', height: '13px', flexShrink: 0, padding: 0, lineHeight: '11px',
                    borderRadius: '3px', fontSize: `${Math.max(11, fontSize - 2)}px`,
                    border: entry.expandable ? `1px solid ${COLOR.border}` : '1px solid transparent',
                    background: entry.expandable ? COLOR.surface : 'transparent',
                    color: COLOR.muted, cursor: entry.expandable ? 'pointer' : 'default',
                }}
            >
                {entry.expandable ? (entry.expanded ? '−' : '+') : ''}
            </button>
            <span style={{
                width: '3px', height: '13px', borderRadius: '2px', flexShrink: 0,
                background: entry.node.isElement ? (LAYER_COLORS[entry.node.layer] || '#9CA3AF') : '#CBD5E1',
            }} />
            <span
                onClick={onSelect}
                title={`${entry.node.name} (${entry.node.kind})`}
                style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
                {entry.node.name}
            </span>
            {entry.expandable && !entry.expanded && entry.memberCount > 1 && (
                <span style={{ fontSize: `${Math.max(10, fontSize - 3)}px`, color: COLOR.faint }} title={`${entry.memberCount} elements rolled up`}>
                    {entry.memberCount}
                </span>
            )}
        </div>
    );
}

function defaultCellStyle(cell: DsmAggregateCell | null): MatrixCellStyle {
    if (!cell) return {};
    if (cell.diagonal) return { text: String(cell.strength), color: COLOR.muted };
    return { text: String(cell.strength), color: COLOR.primary };
}

function cellTitle(cell: DsmAggregateCell | null, row: DsmAxisEntry, column: DsmAxisEntry): string {
    const pair = `${row.node.name} → ${column.node.name}`;
    if (!cell) {
        return row.node.id === column.node.id
            ? `${row.node.name}: no internal dependencies`
            : pair;
    }
    if (cell.diagonal) return `${row.node.name}: ${cell.strength} internal dependenc${cell.strength === 1 ? 'y' : 'ies'}`;
    const kinds = cell.types.join(', ');
    return `${pair}\n${cell.strength} dependenc${cell.strength === 1 ? 'y' : 'ies'} (${kinds})${cell.aggregated ? '\nrolled up from collapsed parts' : ''}`;
}

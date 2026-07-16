// ─── GridView ────────────────────────────────────────────────────────────────
//
// Renderer for the Grid view template (KK-7): the standard table/matrix
// surface for grid-kind views (FMEA, allocation, traceability, risk).
// Table mode shows per-kind sections with sortable, auto-derived columns;
// matrix mode marks the relationships among the view's elements. Element
// names link to the element detail view.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { DiagramDTO, MemoElement, MemoModelDTO } from '@memo/tools/browser';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, REL_COLORS, VIEW_KIND_META } from '../constants';
import { FONT } from '../styles/tokens';
import {
    buildGridTable, buildGridMatrix, sortSection, GRID_CELL_MAX,
    type GridSection,
} from './templates/grid-view';

interface GridViewProps {
    diagram: DiagramDTO;
    model: MemoModelDTO;
    viewpointFilter?: (el: MemoElement) => boolean;
}

type GridMode = 'table' | 'matrix';

const HEADER_CELL: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: FONT.xs,
    fontWeight: 600,
    color: '#374151',
    textAlign: 'left',
    borderBottom: '2px solid #E5E5E0',
    background: '#FAFAF8',
    position: 'sticky',
    top: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
};

const BODY_CELL: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: FONT.xs,
    color: '#374151',
    borderBottom: '1px solid #F0F0ED',
    verticalAlign: 'top',
};

function clip(v: string): string {
    return v.length > GRID_CELL_MAX ? `${v.slice(0, GRID_CELL_MAX - 1)}…` : v;
}

// ─── Table section ───────────────────────────────────────────────────────────

function TableSection({ section, search }: { section: GridSection; search: string }) {
    const selectElement = useModelStore(s => s.selectElement);
    // Sort key: -1 = element name column
    const [sortCol, setSortCol] = useState(-1);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const rows = useMemo(() => {
        const sorted = sortSection(section, sortCol, sortDir);
        if (!search) return sorted;
        const lower = search.toLowerCase();
        return sorted.filter(r =>
            r.element.name.toLowerCase().includes(lower)
            || r.values.some(v => v?.toLowerCase().includes(lower)));
    }, [section, sortCol, sortDir, search]);

    if (rows.length === 0) return null;
    const color = LAYER_COLORS[section.rows[0]?.element.layer] || '#6B7280';

    const toggleSort = (col: number) => {
        if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortCol(col); setSortDir('asc'); }
    };
    const arrow = (col: number) =>
        sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    return (
        <div style={{ marginBottom: 28 }}>
            <div className="flex items-center gap-2 mb-1">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                <span style={{ fontSize: FONT.sm, fontWeight: 700, color: '#1B3A4B' }}>{section.kind}</span>
                <span style={{ fontSize: FONT.xs, color: '#9CA3AF' }}>{rows.length}</span>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E5E0' }}>
                <thead>
                    <tr>
                        <th style={HEADER_CELL} onClick={() => toggleSort(-1)}>Element{arrow(-1)}</th>
                        {section.columns.map((c, ci) => (
                            <th key={c} style={HEADER_CELL} onClick={() => toggleSort(ci)}>
                                {c}{arrow(ci)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.element.id}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <td style={{ ...BODY_CELL, whiteSpace: 'nowrap' }}>
                                <button
                                    onClick={() => selectElement(r.element.id)}
                                    style={{
                                        background: 'none', border: 'none', padding: 0,
                                        fontSize: FONT.xs, fontWeight: 600, color: '#1B6FD9',
                                        cursor: 'pointer', textDecoration: 'none',
                                    }}
                                    title="Open element detail"
                                >
                                    {r.element.name}
                                </button>
                            </td>
                            {r.values.map((v, vi) => (
                                <td key={vi} style={BODY_CELL} title={v && v.length > GRID_CELL_MAX ? v : undefined}>
                                    {v ? clip(v) : <span style={{ color: '#D1D5DB' }}>—</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Matrix ──────────────────────────────────────────────────────────────────

function MatrixTable({ elements, model, relationshipTypes }: {
    elements: MemoElement[];
    model: MemoModelDTO;
    relationshipTypes?: string[];
}) {
    const selectElement = useModelStore(s => s.selectElement);
    const matrix = useMemo(
        () => buildGridMatrix(elements, model.relationships, relationshipTypes),
        [elements, model.relationships, relationshipTypes],
    );

    if (!matrix) {
        return (
            <div style={{ color: '#9CA3AF', fontSize: FONT.sm, padding: 24 }}>
                No relationships among this view's elements.
            </div>
        );
    }

    const nameBtn = (el: MemoElement, vertical = false): React.ReactNode => (
        <button
            onClick={() => selectElement(el.id)}
            style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: '10px', fontWeight: 600, color: '#374151',
                ...(vertical ? { writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', maxHeight: 120 } : {}),
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
            }}
            title={`${el.kind} · open detail`}
        >
            {el.name}
        </button>
    );

    return (
        <div>
            <div className="flex gap-3 mb-2" style={{ fontSize: FONT.xs, color: '#6B7280' }}>
                {matrix.relTypes.map(t => (
                    <span key={t} className="flex items-center gap-1">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: REL_COLORS[t] || '#6B7280', display: 'inline-block' }} />
                        {t}
                    </span>
                ))}
            </div>
            <table style={{ borderCollapse: 'collapse', background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                <thead>
                    <tr>
                        <th style={{ ...HEADER_CELL, cursor: 'default' }} />
                        {matrix.cols.map(c => (
                            <th key={c.id} style={{ ...HEADER_CELL, cursor: 'default', verticalAlign: 'bottom', padding: '8px 4px' }}>
                                {nameBtn(c, true)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.rows.map(r => (
                        <tr key={r.id}>
                            <td style={{ ...BODY_CELL, whiteSpace: 'nowrap', background: '#FAFAF8' }}>{nameBtn(r)}</td>
                            {matrix.cols.map(c => {
                                const types = matrix.cells.get(`${r.id}|${c.id}`);
                                return (
                                    <td key={c.id} style={{ ...BODY_CELL, textAlign: 'center', padding: '4px 6px' }}
                                        title={types?.join(', ')}>
                                        {types?.map(t => (
                                            <span key={t} style={{
                                                width: 9, height: 9, borderRadius: '50%', margin: 1,
                                                background: REL_COLORS[t] || '#6B7280', display: 'inline-block',
                                            }} />
                                        ))}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function GridView({ diagram, model, viewpointFilter }: GridViewProps) {
    const [mode, setMode] = useState<GridMode>('table');
    const [search, setSearch] = useState('');

    const elements = useMemo(() => {
        const all = Object.values(model.elements);
        return viewpointFilter ? all.filter(viewpointFilter) : all;
    }, [model, viewpointFilter]);

    const sections = useMemo(() => buildGridTable(elements), [elements]);
    const kindMeta = VIEW_KIND_META.grid;

    return (
        <div className="flex-1 overflow-auto" style={{ background: '#F7F7F5' }}>
            <div style={{ padding: '16px 20px', maxWidth: 1240 }}>
                {/* ── Header ── */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: kindMeta.color + '20', color: kindMeta.color, fontSize: FONT.badge }}
                        title={kindMeta.fullName}>
                        {kindMeta.label}
                    </span>
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color: '#1a1a1a' }}>{diagram.name}</span>
                    <span style={{ fontSize: FONT.xs, color: '#9CA3AF' }}>{elements.length} elements</span>
                    <div className="flex rounded overflow-hidden ml-2" style={{ border: '1px solid #E5E5E0' }}>
                        {(['table', 'matrix'] as GridMode[]).map(m => (
                            <button key={m}
                                onClick={() => setMode(m)}
                                className="px-2 py-0.5 text-xs font-medium capitalize"
                                style={{
                                    background: mode === m ? '#1B3A4B' : '#FFFFFF',
                                    color: mode === m ? '#FFFFFF' : '#6B7280',
                                    border: 'none', cursor: 'pointer',
                                }}>
                                {m}
                            </button>
                        ))}
                    </div>
                    {mode === 'table' && (
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter rows…"
                            className="px-2 py-1 rounded focus:outline-none ml-auto"
                            style={{ fontSize: FONT.xs, border: '1px solid #E5E5E0', background: '#FFFFFF', color: '#1a1a1a', width: 200 }}
                        />
                    )}
                </div>

                {/* ── Body ── */}
                {mode === 'table'
                    ? sections.map(s => <TableSection key={s.kind} section={s} search={search} />)
                    : <MatrixTable elements={elements} model={model} relationshipTypes={diagram.relationshipTypes} />}

                {mode === 'table' && sections.length === 0 && (
                    <div style={{ color: '#9CA3AF', fontSize: FONT.sm, padding: 24 }}>
                        This view selects no elements.
                    </div>
                )}
            </div>
        </div>
    );
}

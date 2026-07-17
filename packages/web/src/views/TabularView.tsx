import { useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS } from '../constants';
import { FONT } from '../styles/tokens';
import type { MemoElement } from '@memoarchitect/tools/browser';

// ─── Types ─────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';
type SortKey = 'name' | 'kind' | 'layer' | 'status' | string;

// ─── Helpers ───────────────────────────────────────────────────────────────

function StatusDot({ element }: { element: MemoElement }) {
    const hasDoc = Boolean(element.doc?.trim());
    const attrCount = Object.keys(element.attributes).length;
    // Simple completeness heuristic: doc + ≥1 attribute = complete
    const complete = hasDoc && attrCount >= 1;
    const partial = hasDoc || attrCount >= 1;
    const color = complete ? '#2DD4A8' : partial ? '#F39C12' : '#E5E5E0';
    const title = complete ? 'Complete' : partial ? 'Partial' : 'Empty';
    return (
        <span
            className="inline-block rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, backgroundColor: color, cursor: 'default' }}
            title={title}
        />
    );
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <span style={{ color: '#D1D5DB', fontSize: '10px', marginLeft: 3 }}>⇅</span>;
    return <span style={{ color: '#1B3A4B', fontSize: '10px', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

// ─── TabularView ───────────────────────────────────────────────────────────

export function TabularView() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);

    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [search, setSearch] = useState('');
    const [layerFilter, setLayerFilter] = useState<string>('');
    const [kindFilter, setKindFilter] = useState<string>('');

    // Determine scoping: from current viewpoint, active diagram, or all elements
    const scopedElements = useMemo((): MemoElement[] => {
        if (!model) return [];

        const all = Object.values(model.elements);

        if (activeView.type === 'tabular' && activeView.diagramId) {
            const diag = model.diagrams?.find(d => d.id === activeView.diagramId);
            if (diag?.elementIds?.length) {
                const ids = new Set(diag.elementIds);
                return all.filter(el => ids.has(el.id));
            }
        }

        if (selectedViewpointId) {
            const vp = model.viewpoints?.find(v => v.id === selectedViewpointId);
            if (vp) {
                const layers = vp.visibleLayers?.length ? new Set(vp.visibleLayers) : null;
                const kinds = vp.visibleKinds?.length ? new Set(vp.visibleKinds) : null;
                return all.filter(el =>
                    (!layers || layers.has(el.layer)) &&
                    (!kinds || kinds.has(el.kind))
                );
            }
        }

        return all;
    }, [model, activeView, selectedViewpointId]);

    // Collect dynamic attribute columns (most common across scoped elements)
    const dynamicColumns = useMemo(() => {
        const freq = new Map<string, number>();
        for (const el of scopedElements) {
            for (const key of Object.keys(el.attributes)) {
                freq.set(key, (freq.get(key) ?? 0) + 1);
            }
        }
        // Show attribute columns that appear in ≥10% of rows, up to 4 cols
        const threshold = Math.max(1, scopedElements.length * 0.1);
        return [...freq.entries()]
            .filter(([, count]) => count >= threshold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([key]) => key);
    }, [scopedElements]);

    // Unique layers and kinds for filter dropdowns
    const allLayers = useMemo(() => [...new Set(scopedElements.map(e => e.layer))].sort(), [scopedElements]);
    const allKinds = useMemo(() => [...new Set(scopedElements.map(e => e.kind))].sort(), [scopedElements]);

    // Filter + sort
    const rows = useMemo(() => {
        const lower = search.toLowerCase();
        let filtered = scopedElements.filter(el => {
            if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) return false;
            if (layerFilter && el.layer !== layerFilter) return false;
            if (kindFilter && el.kind !== kindFilter) return false;
            return true;
        });

        filtered.sort((a, b) => {
            let av = '';
            let bv = '';
            if (sortKey === 'name') { av = a.name; bv = b.name; }
            else if (sortKey === 'kind') { av = a.kind; bv = b.kind; }
            else if (sortKey === 'layer') { av = a.layer; bv = b.layer; }
            else if (sortKey === 'status') {
                // sort by completeness
                const score = (el: MemoElement) => {
                    const hasDoc = Boolean(el.doc?.trim());
                    const hasAttr = Object.keys(el.attributes).length >= 1;
                    return hasDoc && hasAttr ? 2 : hasDoc || hasAttr ? 1 : 0;
                };
                av = String(score(a));
                bv = String(score(b));
            } else {
                av = a.attributes[sortKey] ?? '';
                bv = b.attributes[sortKey] ?? '';
            }
            const cmp = av.localeCompare(bv, undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return filtered;
    }, [scopedElements, search, layerFilter, kindFilter, sortKey, sortDir]);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    }

    const scopeLabel = useMemo(() => {
        if (!model) return '';
        if (activeView.type === 'tabular' && activeView.diagramId) {
            const diag = model.diagrams?.find(d => d.id === activeView.diagramId);
            return diag ? `Diagram: ${diag.name}` : 'Diagram';
        }
        if (selectedViewpointId) {
            const vp = model.viewpoints?.find(v => v.id === selectedViewpointId);
            return vp ? `Viewpoint: ${vp.label}` : 'Viewpoint';
        }
        return 'All Elements';
    }, [model, activeView, selectedViewpointId]);

    const Th = ({ col, label, width }: { col: string; label: string; width?: number | string }) => (
        <th
            onClick={() => handleSort(col)}
            className="px-3 py-2 text-left cursor-pointer select-none"
            style={{
                fontSize: '11px', fontWeight: 600, color: '#374151',
                background: '#F7F7F5', borderBottom: '1px solid #E5E5E0',
                whiteSpace: 'nowrap', width,
                position: 'sticky', top: 0, zIndex: 1,
            }}
        >
            {label}
            <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </th>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#FFFFFF' }}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B3A4B' }}>Tabular View</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{scopeLabel}</div>
                </div>

                <div className="flex-1" />

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search elements…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-3 py-1.5 rounded-lg focus:outline-none"
                    style={{
                        width: 220, fontSize: FONT.xs, color: '#1a1a1a',
                        border: '1px solid #E5E5E0', background: '#FFFFFF',
                    }}
                />

                {/* Layer filter */}
                <select
                    value={layerFilter}
                    onChange={e => setLayerFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg focus:outline-none"
                    style={{ fontSize: FONT.xs, color: '#374151', border: '1px solid #E5E5E0', background: '#FFFFFF', cursor: 'pointer' }}
                >
                    <option value="">All layers</option>
                    {allLayers.map(l => (
                        <option key={l} value={l}>{LAYER_LABELS[l] ?? l}</option>
                    ))}
                </select>

                {/* Kind filter */}
                <select
                    value={kindFilter}
                    onChange={e => setKindFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg focus:outline-none"
                    style={{ fontSize: FONT.xs, color: '#374151', border: '1px solid #E5E5E0', background: '#FFFFFF', cursor: 'pointer' }}
                >
                    <option value="">All kinds</option>
                    {allKinds.map(k => (
                        <option key={k} value={k}>{k}</option>
                    ))}
                </select>

                {/* Row count */}
                <div style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {rows.length} / {scopedElements.length} elements
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: 28 }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: 40 }} />
                        <col style={{ width: '20%' }} />
                        {dynamicColumns.map((k) => (
                            <col key={k} style={{ width: '10%' }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th style={{ background: '#F7F7F5', borderBottom: '1px solid #E5E5E0', position: 'sticky', top: 0, zIndex: 1 }} />
                            <Th col="name" label="Name" />
                            <Th col="kind" label="Kind" />
                            <Th col="layer" label="Layer" />
                            <Th col="status" label="" width={40} />
                            <Th col="doc" label="Description" />
                            {dynamicColumns.map(k => (
                                <Th key={k} col={k} label={k} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6 + dynamicColumns.length}
                                    className="py-16 text-center"
                                    style={{ fontSize: '13px', color: '#9CA3AF' }}>
                                    {search || layerFilter || kindFilter
                                        ? 'No elements match the current filters'
                                        : 'No elements in scope'}
                                </td>
                            </tr>
                        )}
                        {rows.map((el) => {
                            const isSelected = el.id === selectedElementId;
                            const layerColor = LAYER_COLORS[el.layer] ?? '#9CA3AF';
                            const docExcerpt = el.doc?.trim().slice(0, 100) ?? '';

                            return (
                                <tr
                                    key={el.id}
                                    onClick={() => selectElement(el.id)}
                                    className="cursor-pointer"
                                    style={{
                                        background: isSelected ? '#2DD4A812' : 'transparent',
                                        borderBottom: '1px solid #F0F0ED',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F7F7F5'; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {/* Selection indicator */}
                                    <td className="px-2">
                                        {isSelected && (
                                            <span style={{ color: '#2DD4A8', fontSize: '10px' }}>▶</span>
                                        )}
                                    </td>

                                    {/* Name + shortId */}
                                    <td className="px-3 py-2">
                                        <div style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1B3A4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {el.name}
                                        </div>
                                        {el.shortId && (
                                            <div style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                                                {el.shortId}
                                            </div>
                                        )}
                                    </td>

                                    {/* Kind */}
                                    <td className="px-3 py-2">
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                                            {el.kind}
                                        </span>
                                    </td>

                                    {/* Layer chip */}
                                    <td className="px-3 py-2">
                                        <span
                                            className="px-1.5 py-0.5 rounded"
                                            style={{
                                                fontSize: '10px', fontWeight: 600,
                                                background: layerColor + '1A',
                                                color: layerColor,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {LAYER_LABELS[el.layer] ?? el.layer}
                                        </span>
                                    </td>

                                    {/* Status dot */}
                                    <td className="px-3 py-2 text-center">
                                        <StatusDot element={el} />
                                    </td>

                                    {/* Doc excerpt */}
                                    <td className="px-3 py-2">
                                        <span style={{
                                            fontSize: FONT.xs, color: '#6B7280',
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        } as React.CSSProperties}>
                                            {docExcerpt}
                                        </span>
                                    </td>

                                    {/* Dynamic attribute columns */}
                                    {dynamicColumns.map(k => (
                                        <td key={k} className="px-3 py-2">
                                            <span style={{ fontSize: FONT.xs, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {el.attributes[k] ?? ''}
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── LayerTable ───────────────────────────────────────────────────────────────
//
// Sortable table view for ontology layers. Each row shows layer name, kind count,
// construct types, and instance count. Click to expand individual kinds.
// Implements Issue #158 table view.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

type SortKey = 'label' | 'kindCount' | 'instanceCount';
type SortDir = 'asc' | 'desc';

interface LayerTableProps {
    layers: OntologyLayerInfo[];
    selectedKind: string | null;
    onKindClick: (kind: string | null) => void;
}

export function LayerTable({ layers, selectedKind, onKindClick }: LayerTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('label');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    function toggleRow(id: string) {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const sorted = [...layers].sort((a, b) => {
        const aInst = a.kinds.reduce((s, k) => s + k.instanceCount, 0);
        const bInst = b.kinds.reduce((s, k) => s + k.instanceCount, 0);
        let cmp = 0;
        if (sortKey === 'label') cmp = a.label.localeCompare(b.label);
        else if (sortKey === 'kindCount') cmp = a.kindCount - b.kindCount;
        else if (sortKey === 'instanceCount') cmp = aInst - bInst;
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span style={{ fontSize: '10px', color: sortKey === k ? '#1B3A4B' : '#D1D5DB', marginLeft: '3px' }}>
            {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
    );

    return (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
            {/* Header */}
            <div
                className="grid text-xs font-medium"
                style={{
                    gridTemplateColumns: '1fr 80px 80px',
                    background: '#F7F7F5',
                    borderBottom: '1px solid #E5E5E0',
                    padding: '8px 16px',
                    color: '#6B7280',
                    position: 'sticky',
                    top: 0,
                }}
            >
                <button className="text-left flex items-center" onClick={() => handleSort('label')}>
                    Layer <SortIcon k="label" />
                </button>
                <button className="text-right flex items-center justify-end" onClick={() => handleSort('kindCount')}>
                    Kinds <SortIcon k="kindCount" />
                </button>
                <button className="text-right flex items-center justify-end" onClick={() => handleSort('instanceCount')}>
                    In Model <SortIcon k="instanceCount" />
                </button>
            </div>

            {/* Rows */}
            {sorted.map((layer, i) => {
                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                const isExpanded = expandedRows.has(layer.id);
                const totalInstances = layer.kinds.reduce((s, k) => s + k.instanceCount, 0);

                return (
                    <div key={layer.id} style={{ borderTop: i > 0 ? '1px solid #F0F0ED' : 'none' }}>
                        {/* Main row */}
                        <div
                            className="grid items-center cursor-pointer"
                            style={{
                                gridTemplateColumns: '1fr 80px 80px',
                                padding: '10px 16px',
                                background: i % 2 === 0 ? '#FAFAF8' : '#FFFFFF',
                            }}
                            onClick={() => toggleRow(layer.id)}
                            onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#FAFAF8' : '#FFFFFF'}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                                    {layer.label}
                                </span>
                                <span style={{ color: '#D1D5DB', fontSize: '10px', marginLeft: 'auto', paddingRight: '8px' }}>
                                    {isExpanded ? '▾' : '▸'}
                                </span>
                            </div>
                            <div className="text-xs text-right" style={{ color: '#374151' }}>
                                {layer.kindCount}
                            </div>
                            <div className="text-xs text-right" style={{ color: totalInstances > 0 ? '#1B3A4B' : '#D1D5DB' }}>
                                {totalInstances > 0 ? totalInstances : '—'}
                            </div>
                        </div>

                        {/* Expanded: individual kinds sub-table */}
                        {isExpanded && (
                            <div style={{ background: `${color}05`, borderTop: `1px solid ${color}20` }}>
                                {layer.kinds.map(kind => {
                                    const isSelected = selectedKind === kind.name;
                                    return (
                                        <div
                                            key={kind.name}
                                            className="grid items-center cursor-pointer"
                                            style={{
                                                gridTemplateColumns: '1fr 80px 80px',
                                                padding: '6px 16px 6px 36px',
                                                background: isSelected ? '#EFF6FF' : 'transparent',
                                                borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                                            }}
                                            onClick={() => onKindClick(isSelected ? null : kind.name)}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F7F7F5'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs" style={{ color: '#374151' }}>{kind.name}</span>
                                                <span className="text-xs" style={{ color: '#D1D5DB' }}>{kind.construct}</span>
                                            </div>
                                            <div className="text-xs text-right" style={{ color: '#9CA3AF' }}>–</div>
                                            <div className="text-xs text-right" style={{ color: kind.instanceCount > 0 ? '#1B3A4B' : '#D1D5DB' }}>
                                                {kind.instanceCount > 0 ? kind.instanceCount : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

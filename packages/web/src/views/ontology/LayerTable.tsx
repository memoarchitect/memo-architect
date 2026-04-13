// ─── LayerTable ───────────────────────────────────────────────────────────────
//
// Enhanced sortable table view for ontology layers and kinds.
// Features: search filter, column filters (layer, construct), flatten toggle,
// new columns (description, derives-from, derived-by count), CSV export.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import type { OntologyLayerInfo, OntologyKindInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

type SortKey = 'name' | 'layer' | 'construct' | 'instanceCount' | 'derivesFrom' | 'derivedByCount';
type SortDir = 'asc' | 'desc';

interface LayerTableProps {
    layers: OntologyLayerInfo[];
    selectedKind: string | null;
    onKindClick: (kind: string | null) => void;
}

export function LayerTable({ layers, selectedKind, onKindClick }: LayerTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [flattened, setFlattened] = useState(false);
    const [layerFilter, setLayerFilter] = useState<string>('all');
    const [constructFilter, setConstructFilter] = useState<string>('all');
    const [showLayerDropdown, setShowLayerDropdown] = useState(false);
    const [showConstructDropdown, setShowConstructDropdown] = useState(false);

    // Flatten all kinds from all layers
    const allKinds = useMemo(() =>
        layers.flatMap(l => l.kinds.map(k => ({ ...k, layerLabel: l.label, layerColor: (LAYER_COLORS as Record<string, string>)[l.id] ?? l.color ?? '#6B7280' }))),
        [layers]
    );

    // Unique values for filter dropdowns
    const uniqueLayers = useMemo(() => [...new Set(layers.map(l => l.id))], [layers]);
    const uniqueConstructs = useMemo(() => [...new Set(allKinds.map(k => k.construct))], [allKinds]);

    // Filter
    const filteredKinds = useMemo(() => {
        let result = allKinds;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(k =>
                k.name.toLowerCase().includes(term) ||
                k.label.toLowerCase().includes(term) ||
                k.layer.toLowerCase().includes(term) ||
                (k.description?.toLowerCase().includes(term) ?? false) ||
                (k.derivesFrom?.toLowerCase().includes(term) ?? false)
            );
        }
        if (layerFilter !== 'all') {
            result = result.filter(k => k.layer === layerFilter);
        }
        if (constructFilter !== 'all') {
            result = result.filter(k => k.construct === constructFilter);
        }
        return result;
    }, [allKinds, searchTerm, layerFilter, constructFilter]);

    // Sort
    const sortedKinds = useMemo(() => {
        return [...filteredKinds].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'name': cmp = a.name.localeCompare(b.name); break;
                case 'layer': cmp = a.layer.localeCompare(b.layer); break;
                case 'construct': cmp = a.construct.localeCompare(b.construct); break;
                case 'instanceCount': cmp = a.instanceCount - b.instanceCount; break;
                case 'derivesFrom': cmp = (a.derivesFrom ?? '').localeCompare(b.derivesFrom ?? ''); break;
                case 'derivedByCount': cmp = (a.derivedBy?.length ?? 0) - (b.derivedBy?.length ?? 0); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredKinds, sortKey, sortDir]);

    // Group by layer (when not flattened)
    const groupedByLayer = useMemo(() => {
        if (flattened) return null;
        const groups = new Map<string, typeof sortedKinds>();
        for (const kind of sortedKinds) {
            if (!groups.has(kind.layer)) groups.set(kind.layer, []);
            groups.get(kind.layer)!.push(kind);
        }
        return groups;
    }, [sortedKinds, flattened]);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    }

    const exportCsv = useCallback(() => {
        const rows = [['Name', 'Layer', 'Construct', 'Instances', 'Derives From', 'Derived By', 'Description']];
        for (const k of sortedKinds) {
            rows.push([
                k.name, k.layer, k.construct,
                String(k.instanceCount), k.derivesFrom ?? '',
                (k.derivedBy ?? []).join('; '),
                k.description ?? '',
            ]);
        }
        const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ontology-kinds.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [sortedKinds]);

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span style={{ fontSize: '10px', color: sortKey === k ? '#1B3A4B' : '#D1D5DB', marginLeft: '3px' }}>
            {sortKey === k ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u21C5'}
        </span>
    );

    const renderKindRow = (kind: typeof allKinds[0], i: number) => {
        const isSelected = selectedKind === kind.name;
        return (
            <div
                key={`${kind.layer}:${kind.name}`}
                className="grid items-center cursor-pointer text-xs"
                style={{
                    gridTemplateColumns: '1.5fr 100px 90px 60px 120px 60px',
                    padding: '7px 16px',
                    background: isSelected ? '#EFF6FF' : (i % 2 === 0 ? '#FAFAF8' : '#FFFFFF'),
                    borderLeft: isSelected ? `3px solid ${kind.layerColor}` : '3px solid transparent',
                    transition: 'background 100ms ease',
                }}
                onClick={() => onKindClick(isSelected ? null : kind.name)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F7FF'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#EFF6FF' : (i % 2 === 0 ? '#FAFAF8' : '#FFFFFF'); }}
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: kind.layerColor }} />
                    <span style={{ color: '#1a1a1a', fontWeight: isSelected ? 600 : 400 }}>{kind.name}</span>
                </div>
                <span className="capitalize" style={{ color: '#6B7280' }}>{kind.layer}</span>
                <span className="font-mono" style={{ color: '#9CA3AF' }}>{kind.construct}</span>
                <span className="text-right" style={{ color: kind.instanceCount > 0 ? '#1B3A4B' : '#D1D5DB' }}>
                    {kind.instanceCount > 0 ? kind.instanceCount : '\u2014'}
                </span>
                <span className="truncate" style={{ color: kind.derivesFrom ? '#2563EB' : '#D1D5DB' }}>
                    {kind.derivesFrom ?? '\u2014'}
                </span>
                <span className="text-right" style={{ color: (kind.derivedBy?.length ?? 0) > 0 ? '#374151' : '#D1D5DB' }}>
                    {(kind.derivedBy?.length ?? 0) > 0 ? kind.derivedBy!.length : '\u2014'}
                </span>
            </div>
        );
    };

    return (
        <div className="mb-6">
            {/* Toolbar: Search + Filters + Flatten + Export */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search kinds..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-md flex-1 min-w-[140px]"
                    style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', outline: 'none', maxWidth: '240px' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                    onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                />

                {/* Layer filter */}
                <div className="relative">
                    <button
                        onClick={() => { setShowLayerDropdown(!showLayerDropdown); setShowConstructDropdown(false); }}
                        className="px-2.5 py-1.5 text-xs rounded-md"
                        style={{ border: '1px solid #E5E7EB', background: layerFilter !== 'all' ? '#EFF6FF' : '#F9FAFB', color: '#374151' }}
                    >
                        Layer: {layerFilter === 'all' ? 'All' : layerFilter}
                    </button>
                    {showLayerDropdown && (
                        <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg py-1 z-20" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', minWidth: '120px' }}>
                            <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" style={{ color: '#374151' }} onClick={() => { setLayerFilter('all'); setShowLayerDropdown(false); }}>All</button>
                            {uniqueLayers.map(l => (
                                <button key={l} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize" style={{ color: '#374151' }} onClick={() => { setLayerFilter(l); setShowLayerDropdown(false); }}>{l}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Construct filter */}
                <div className="relative">
                    <button
                        onClick={() => { setShowConstructDropdown(!showConstructDropdown); setShowLayerDropdown(false); }}
                        className="px-2.5 py-1.5 text-xs rounded-md"
                        style={{ border: '1px solid #E5E7EB', background: constructFilter !== 'all' ? '#EFF6FF' : '#F9FAFB', color: '#374151' }}
                    >
                        Construct: {constructFilter === 'all' ? 'All' : constructFilter}
                    </button>
                    {showConstructDropdown && (
                        <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg py-1 z-20" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', minWidth: '140px' }}>
                            <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" style={{ color: '#374151' }} onClick={() => { setConstructFilter('all'); setShowConstructDropdown(false); }}>All</button>
                            {uniqueConstructs.map(c => (
                                <button key={c} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-mono" style={{ color: '#374151' }} onClick={() => { setConstructFilter(c); setShowConstructDropdown(false); }}>{c}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Flatten toggle */}
                <button
                    onClick={() => setFlattened(!flattened)}
                    className="px-2.5 py-1.5 text-xs rounded-md"
                    style={{ border: '1px solid #E5E7EB', background: flattened ? '#1B3A4B' : '#F9FAFB', color: flattened ? '#2DD4A8' : '#374151' }}
                >
                    {flattened ? 'Grouped' : 'Flatten'}
                </button>

                {/* CSV export */}
                <button
                    onClick={exportCsv}
                    className="px-2.5 py-1.5 text-xs rounded-md ml-auto"
                    style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151' }}
                    title="Export as CSV"
                >
                    Export CSV
                </button>

                {/* Count indicator */}
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {filteredKinds.length} / {allKinds.length} kinds
                </span>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                {/* Header */}
                <div
                    className="grid text-xs font-medium"
                    style={{
                        gridTemplateColumns: '1.5fr 100px 90px 60px 120px 60px',
                        background: '#F7F7F5',
                        borderBottom: '1px solid #E5E5E0',
                        padding: '8px 16px',
                        color: '#6B7280',
                        position: 'sticky',
                        top: 0,
                        zIndex: 5,
                    }}
                >
                    <button className="text-left flex items-center" onClick={() => handleSort('name')}>
                        Kind <SortIcon k="name" />
                    </button>
                    <button className="text-left flex items-center" onClick={() => handleSort('layer')}>
                        Layer <SortIcon k="layer" />
                    </button>
                    <button className="text-left flex items-center" onClick={() => handleSort('construct')}>
                        Construct <SortIcon k="construct" />
                    </button>
                    <button className="text-right flex items-center justify-end" onClick={() => handleSort('instanceCount')}>
                        # <SortIcon k="instanceCount" />
                    </button>
                    <button className="text-left flex items-center" onClick={() => handleSort('derivesFrom')}>
                        Derives From <SortIcon k="derivesFrom" />
                    </button>
                    <button className="text-right flex items-center justify-end" onClick={() => handleSort('derivedByCount')}>
                        Subs <SortIcon k="derivedByCount" />
                    </button>
                </div>

                {/* Rows */}
                {flattened ? (
                    sortedKinds.map((kind, i) => renderKindRow(kind, i))
                ) : (
                    groupedByLayer && [...groupedByLayer.entries()].map(([layerId, kinds]) => {
                        const layer = layers.find(l => l.id === layerId);
                        const color = (LAYER_COLORS as Record<string, string>)[layerId] ?? '#6B7280';
                        return (
                            <div key={layerId}>
                                {/* Layer group header */}
                                <div
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                                    style={{ background: `${color}08`, borderTop: '1px solid #E5E5E0', color: color }}
                                >
                                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                                    {layer?.label ?? layerId}
                                    <span className="font-normal" style={{ color: '#9CA3AF' }}>({kinds.length})</span>
                                </div>
                                {kinds.map((kind, i) => renderKindRow(kind, i))}
                            </div>
                        );
                    })
                )}

                {sortedKinds.length === 0 && (
                    <div className="py-8 text-center text-xs" style={{ color: '#9CA3AF' }}>
                        No kinds match the current filters
                    </div>
                )}
            </div>
        </div>
    );
}

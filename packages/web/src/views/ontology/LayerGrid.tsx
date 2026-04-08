// ─── LayerGrid ────────────────────────────────────────────────────────────────
//
// Visual card grid for ontology layers. Each card shows layer name, kind count,
// and expandable kind pills. Implemented in full for Issue #158.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

interface LayerGridProps {
    layers: OntologyLayerInfo[];
    selectedKind: string | null;
    onKindClick: (kind: string | null) => void;
}

export function LayerGrid({ layers, selectedKind, onKindClick }: LayerGridProps) {
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

    function toggleLayer(id: string) {
        setExpandedLayers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    if (layers.length === 0) {
        return (
            <div className="flex items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
                <div className="text-center">
                    <div className="text-2xl mb-2">⊟</div>
                    <div className="text-xs">No layers found in this ontology</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid gap-3 mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
            {layers.map(layer => {
                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                const isExpanded = expandedLayers.has(layer.id);

                return (
                    <div
                        key={layer.id}
                        className="rounded-xl overflow-hidden"
                        style={{ background: '#FFFFFF', border: `2px solid ${color}30` }}
                    >
                        {/* Layer header */}
                        <div
                            className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
                            style={{ background: `${color}10`, borderBottom: `1px solid ${color}20` }}
                            onClick={() => toggleLayer(layer.id)}
                        >
                            <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium flex-1" style={{ color: '#1a1a1a' }}>
                                {layer.label}
                            </span>
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                {layer.kindCount}
                            </span>
                            <span style={{ color: '#D1D5DB', fontSize: '11px' }}>
                                {isExpanded ? '▾' : '▸'}
                            </span>
                        </div>

                        {/* Kind pills */}
                        {isExpanded && (
                            <div className="p-3 flex flex-wrap gap-1.5">
                                {layer.kinds.map(kind => {
                                    const isSelected = selectedKind === kind.name;
                                    return (
                                        <button
                                            key={kind.name}
                                            onClick={() => onKindClick(isSelected ? null : kind.name)}
                                            className="px-2 py-0.5 text-xs rounded-full transition-all"
                                            style={{
                                                background: isSelected ? `${color}20` : '#F0F0ED',
                                                color: isSelected ? color : '#374151',
                                                border: isSelected ? `1px solid ${color}40` : '1px solid transparent',
                                                fontWeight: isSelected ? 600 : 400,
                                            }}
                                            title={`${kind.instanceCount} instances`}
                                        >
                                            {kind.name}
                                            {kind.instanceCount > 0 && (
                                                <span className="ml-1 opacity-60">({kind.instanceCount})</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Collapsed: just show kind count hint */}
                        {!isExpanded && layer.kindCount > 0 && (
                            <div className="px-4 py-2 text-xs" style={{ color: '#9CA3AF' }}>
                                {layer.kinds.slice(0, 3).map(k => k.name).join(', ')}
                                {layer.kindCount > 3 && ` +${layer.kindCount - 3} more`}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

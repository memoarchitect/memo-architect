// ─── LayerGrid ────────────────────────────────────────────────────────────────
//
// Visual card grid for ontology layers, sorted by V-cycle lifecycle order.
// Layers are split into two groups: System Definition and Implementation &
// Verification, mirroring the V-cycle shape used in medical device engineering.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS, LAYER_ORDER } from '../../constants';

// V-cycle split: definition (left arm) vs implementation+verification (right arm)
const DEFINITION_LAYERS = new Set(['business', 'requirements', 'risk', 'functional', 'behavior', 'logical']);
const VERIFICATION_LAYERS = new Set(['physical', 'software', 'interfaces', 'verification', 'ui']);

const LAYER_RANK = Object.fromEntries(LAYER_ORDER.map((id, i) => [id, i]));

function sortByLifecycle(layers: OntologyLayerInfo[]): OntologyLayerInfo[] {
    return [...layers].sort((a, b) => {
        const ra = LAYER_RANK[a.id] ?? 99;
        const rb = LAYER_RANK[b.id] ?? 99;
        return ra - rb;
    });
}

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
            if (next.has(id)) next.delete(id); else next.add(id);
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

    const sorted = sortByLifecycle(layers);
    const definitionLayers = sorted.filter(l => DEFINITION_LAYERS.has(l.id) || (!VERIFICATION_LAYERS.has(l.id) && LAYER_RANK[l.id] < 6));
    const verificationLayers = sorted.filter(l => VERIFICATION_LAYERS.has(l.id));
    // Any layers not in either set (e.g. unknown custom layers) go at the end
    const otherLayers = sorted.filter(l => !DEFINITION_LAYERS.has(l.id) && !VERIFICATION_LAYERS.has(l.id));

    const renderCard = (layer: OntologyLayerInfo) => {
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
    };

    return (
        <div className="mb-6">
            {/* V-cycle two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {/* Left arm: System Definition */}
                <div>
                    <div
                        className="flex items-center gap-2 mb-3"
                        style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                        <span style={{ flex: 1, height: '1px', background: '#E5E5E0' }} />
                        System Definition ↓
                    </div>
                    <div className="flex flex-col gap-3">
                        {definitionLayers.map(renderCard)}
                    </div>
                </div>

                {/* Right arm: Implementation & Verification */}
                <div>
                    <div
                        className="flex items-center gap-2 mb-3"
                        style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                        Implementation & Verification ↑
                        <span style={{ flex: 1, height: '1px', background: '#E5E5E0' }} />
                    </div>
                    <div className="flex flex-col gap-3">
                        {verificationLayers.map(renderCard)}
                    </div>
                </div>
            </div>

            {/* Unknown/custom layers below */}
            {otherLayers.length > 0 && (
                <div className="mt-6">
                    <div
                        className="flex items-center gap-2 mb-3"
                        style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                        <span style={{ flex: 1, height: '1px', background: '#E5E5E0' }} />
                        Other
                        <span style={{ flex: 1, height: '1px', background: '#E5E5E0' }} />
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                        {otherLayers.map(renderCard)}
                    </div>
                </div>
            )}
        </div>
    );
}

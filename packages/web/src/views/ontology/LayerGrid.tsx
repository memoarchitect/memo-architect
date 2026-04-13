// ─── LayerGrid ────────────────────────────────────────────────────────────────
//
// Swimlane-based visual grid for ontology layers, grouped into 6 domain
// categories matching the draw.io ontology reference:
//   1. Purpose & Operational
//   2. Requirements & Constraints
//   3. Architecture (functional, logical, physical)
//   4. Risk
//   5. V&V & Evidence
//   6. DHF Outputs
// Layers not in any group appear in "Other".
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS, LAYER_ORDER } from '../../constants';

// ─── Swimlane group definitions ──────────────────────────────────────────────

interface LayerGroup {
    id: string;
    label: string;
    color: string;
    layerIds: string[];
}

const LAYER_GROUPS: LayerGroup[] = [
    {
        id: 'purpose-operational',
        label: 'Purpose & Operational',
        color: '#6366F1',
        layerIds: ['purpose', 'business', 'operational'],
    },
    {
        id: 'requirements',
        label: 'Requirements & Constraints',
        color: '#EC4899',
        layerIds: ['requirements'],
    },
    {
        id: 'architecture',
        label: 'Architecture',
        color: '#06B6D4',
        layerIds: ['functional', 'behavior', 'logical', 'physical', 'software', 'interfaces', 'ui'],
    },
    {
        id: 'risk',
        label: 'Risk',
        color: '#EF4444',
        layerIds: ['risk', 'safety', 'cybersecurity'],
    },
    {
        id: 'vv-evidence',
        label: 'V&V & Evidence',
        color: '#84CC16',
        layerIds: ['verification', 'analysis'],
    },
    {
        id: 'dhf-outputs',
        label: 'DHF Outputs',
        color: '#F59E0B',
        layerIds: ['design-control', 'qms', 'software-lifecycle', 'operations', 'clinical', 'privacy'],
    },
];

const LAYER_RANK = Object.fromEntries(LAYER_ORDER.map((id, i) => [id, i]));

function sortByLifecycle(layers: OntologyLayerInfo[]): OntologyLayerInfo[] {
    return [...layers].sort((a, b) => (LAYER_RANK[a.id] ?? 99) - (LAYER_RANK[b.id] ?? 99));
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
                    <div className="text-2xl mb-2">&#8863;</div>
                    <div className="text-xs">No layers found in this ontology</div>
                </div>
            </div>
        );
    }

    // Classify layers into groups
    const groupedLayerIds = new Set(LAYER_GROUPS.flatMap(g => g.layerIds));
    const otherLayers = sortByLifecycle(layers.filter(l => !groupedLayerIds.has(l.id)));

    const renderKindPill = (kind: { name: string; instanceCount: number }, layerColor: string) => {
        const isSelected = selectedKind === kind.name;
        return (
            <button
                key={kind.name}
                onClick={() => onKindClick(isSelected ? null : kind.name)}
                className="px-2 py-0.5 text-xs rounded-full transition-all"
                style={{
                    background: isSelected ? `${layerColor}20` : '#F0F0ED',
                    color: isSelected ? layerColor : '#374151',
                    border: isSelected ? `1px solid ${layerColor}40` : '1px solid transparent',
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
    };

    const renderLayerCard = (layer: OntologyLayerInfo) => {
        const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
        const isExpanded = expandedLayers.has(layer.id);

        return (
            <div key={layer.id} className="rounded-lg overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${color}25` }}>
                <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                    style={{ background: `${color}08`, borderBottom: isExpanded ? `1px solid ${color}15` : 'none' }}
                    onClick={() => toggleLayer(layer.id)}
                >
                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium flex-1" style={{ color: '#1a1a1a' }}>{layer.label}</span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{layer.kindCount}</span>
                    <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
                {isExpanded && (
                    <div className="p-2.5 flex flex-wrap gap-1.5">
                        {layer.kinds.map(kind => renderKindPill(kind, color))}
                    </div>
                )}
                {!isExpanded && layer.kindCount > 0 && (
                    <div className="px-3 py-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                        {layer.kinds.slice(0, 3).map(k => k.name).join(', ')}
                        {layer.kindCount > 3 && ` +${layer.kindCount - 3} more`}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mb-6 space-y-5">
            {LAYER_GROUPS.map(group => {
                const groupLayers = sortByLifecycle(layers.filter(l => group.layerIds.includes(l.id)));
                if (groupLayers.length === 0) return null;

                return (
                    <div key={group.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${group.color}20`, background: `${group.color}04` }}>
                        {/* Swimlane header */}
                        <div
                            className="flex items-center gap-2 px-4 py-2.5"
                            style={{ borderBottom: `1px solid ${group.color}15`, background: `${group.color}08` }}
                        >
                            <span className="w-1 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                            <span
                                className="text-xs font-semibold"
                                style={{ color: group.color, letterSpacing: '0.03em', textTransform: 'uppercase' }}
                            >
                                {group.label}
                            </span>
                            <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
                                {groupLayers.reduce((s, l) => s + l.kindCount, 0)} kinds
                            </span>
                        </div>

                        {/* Layer cards inside swimlane */}
                        <div className="p-3 space-y-2">
                            {groupLayers.map(renderLayerCard)}
                        </div>
                    </div>
                );
            })}

            {/* Other/custom layers */}
            {otherLayers.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E5E020', background: '#F9FAFB' }}>
                    <div
                        className="flex items-center gap-2 px-4 py-2.5"
                        style={{ borderBottom: '1px solid #E5E5E0', background: '#F3F4F6' }}
                    >
                        <span className="w-1 h-4 rounded-full" style={{ backgroundColor: '#6B7280' }} />
                        <span className="text-xs font-semibold" style={{ color: '#6B7280', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                            Other
                        </span>
                        <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
                            {otherLayers.reduce((s, l) => s + l.kindCount, 0)} kinds
                        </span>
                    </div>
                    <div className="p-3 space-y-2">
                        {otherLayers.map(renderLayerCard)}
                    </div>
                </div>
            )}
        </div>
    );
}

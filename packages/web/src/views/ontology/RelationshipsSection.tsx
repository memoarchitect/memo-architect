// ─── RelationshipsSection ─────────────────────────────────────────────────────
//
// Collapsible section showing all relationship types from the focused ontology.
// Each row has a colored badge + source/target layers + highlight button.
// Implements Issue #159.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from '../../store/model-store';
import type { OntologyPackageInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

interface RelationshipsSectionProps {
    ontology: OntologyPackageInfo;
}

interface RelInfo {
    name: string;
    sourceLayer: string;
    targetLayer: string;
    color: string;
}

export function RelationshipsSection({ ontology }: RelationshipsSectionProps) {
    const showRelationships = useModelStore(s => s.showOntologyRelationships);
    const toggleRelationships = useModelStore(s => s.toggleOntologyRelationships);
    const highlightedType = useModelStore(s => s.highlightedRelationshipType);
    const setHighlightedType = useModelStore(s => s.setHighlightedRelationshipType);
    const model = useModelStore(s => s.model);

    // Infer relationships from model if ontology has none defined
    const relationships: RelInfo[] = (() => {
        if (!model) return [];
        const relMap = new Map<string, RelInfo>();
        for (const rel of model.relationships) {
            if (relMap.has(rel.type)) continue;
            const sourceEl = model.elements[rel.sourceId];
            const targetEl = model.elements[rel.targetId];
            const sourceLayer = sourceEl?.layer ?? 'unknown';
            const targetLayer = targetEl?.layer ?? 'unknown';
            const color = (LAYER_COLORS as Record<string, string>)[sourceLayer] ?? '#6B7280';
            relMap.set(rel.type, { name: rel.type, sourceLayer, targetLayer, color });
        }
        return [...relMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    })();

    if (relationships.length === 0) return null;

    return (
        <div className="mt-2">
            {/* Section header */}
            <button
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg mb-1 text-left"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                onClick={toggleRelationships}
            >
                <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                    Relationships ({relationships.length})
                </span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {showRelationships ? 'Hide ▲' : 'Show ▼'}
                </span>
            </button>

            {/* Relationship rows */}
            {showRelationships && (
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid #E5E5E0', background: '#FFFFFF' }}
                >
                    {relationships.map((rel, i) => {
                        const isHighlighted = highlightedType === rel.name;
                        return (
                            <div
                                key={rel.name}
                                className="flex items-center gap-3 px-4 py-2.5"
                                style={{
                                    borderTop: i > 0 ? '1px solid #F0F0ED' : 'none',
                                    background: isHighlighted ? '#EFF6FF' : 'transparent',
                                }}
                            >
                                {/* Badge */}
                                <span
                                    className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
                                    style={{
                                        background: `${rel.color}15`,
                                        color: rel.color,
                                        border: `1px solid ${rel.color}30`,
                                    }}
                                >
                                    {rel.name}
                                </span>

                                {/* Source → target */}
                                <span className="text-xs flex-1 truncate" style={{ color: '#9CA3AF' }}>
                                    {rel.sourceLayer} → {rel.targetLayer}
                                </span>

                                {/* Highlight toggle */}
                                <button
                                    onClick={() => setHighlightedType(rel.name)}
                                    className="px-2 py-0.5 text-xs rounded-md transition-all flex-shrink-0"
                                    style={{
                                        background: isHighlighted ? `${rel.color}20` : '#F0F0ED',
                                        color: isHighlighted ? rel.color : '#9CA3AF',
                                        border: isHighlighted ? `1px solid ${rel.color}40` : '1px solid transparent',
                                    }}
                                    title={isHighlighted ? 'Clear highlight' : 'Highlight this relationship type'}
                                >
                                    {isHighlighted ? '◉' : '○'} highlight
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

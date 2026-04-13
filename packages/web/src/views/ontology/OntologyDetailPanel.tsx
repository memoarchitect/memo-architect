// ─── OntologyDetailPanel ──────────────────────────────────────────────────────
//
// Right panel of the Ontology Viewer. Shows:
//   1. OntologyHome card (name, desc, counts)
//   2. Visual/Table toggle + LayerGrid or LayerTable
//   3. RelationshipsSection (collapsible)
//
// All sub-components are lazy-loaded; they are wired in as Issues 6 & 7 are
// implemented. Until then this panel renders the home card and a layer list.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useMemo } from 'react';
import { useModelStore } from '../../store/model-store';
import { OntologyHome } from './OntologyHome';
import { KindPropertiesPanel } from './KindPropertiesPanel';
import type { OntologyPackageInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

const LayerGrid = lazy(() => import('./LayerGrid').then(m => ({ default: m.LayerGrid })));
const LayerTable = lazy(() => import('./LayerTable').then(m => ({ default: m.LayerTable })));
const RelationshipsSection = lazy(() => import('./RelationshipsSection').then(m => ({ default: m.RelationshipsSection })));

interface OntologyDetailPanelProps {
    ontology: OntologyPackageInfo;
    onBack?: () => void;
}

export function OntologyDetailPanel({ ontology, onBack }: OntologyDetailPanelProps) {
    const viewMode = useModelStore(s => s.ontologyViewMode);
    const setOntologyViewMode = useModelStore(s => s.setOntologyViewMode);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const showRelationships = useModelStore(s => s.showOntologyRelationships);
    const toggleRelationships = useModelStore(s => s.toggleOntologyRelationships);
    const model = useModelStore(s => s.model);

    // Enrich kind instanceCounts from model
    const enrichedOntology: OntologyPackageInfo = useMemo(() => ({
        ...ontology,
        layers: ontology.layers.map(layer => ({
            ...layer,
            kinds: layer.kinds.map(kind => ({
                ...kind,
                instanceCount: model
                    ? Object.values(model.elements).filter(el => el.kind === kind.name).length
                    : 0,
                viewpoints: model?.viewpoints
                    ?.filter(vp => vp.visibleKinds.includes(kind.name))
                    .map(vp => vp.id) ?? [],
            })),
        })),
    }), [ontology, model]);

    // Find the selected kind info for properties panel
    const selectedKindInfo = useMemo(() => {
        if (!selectedKind) return null;
        for (const layer of enrichedOntology.layers) {
            const found = layer.kinds.find(k => k.name === selectedKind);
            if (found) return found;
        }
        return null;
    }, [selectedKind, enrichedOntology.layers]);

    const activeStyle: React.CSSProperties = { background: '#1B3A4B', color: '#2DD4A8', border: '1px solid transparent' };
    const inactiveStyle: React.CSSProperties = { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' };

    return (
        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                {/* Breadcrumb with back navigation */}
                {onBack && (
                    <div className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: '#9CA3AF' }}>
                        <button onClick={onBack} className="hover:underline" style={{ color: '#2563EB' }}>
                            Ontology Library
                        </button>
                        <span>/</span>
                        <span style={{ color: '#374151' }}>{ontology.name}</span>
                    </div>
                )}

                {/* Ontology summary home card */}
                <OntologyHome ontology={enrichedOntology} />

                {/* Toolbar: Visual/Table toggle + Relationships toggle */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Layers:</span>
                    <button
                        onClick={() => setOntologyViewMode('visual')}
                        className="px-2.5 py-1 text-xs rounded-md font-medium"
                        style={viewMode === 'visual' ? activeStyle : inactiveStyle}
                    >
                        Visual
                    </button>
                    <button
                        onClick={() => setOntologyViewMode('table')}
                        className="px-2.5 py-1 text-xs rounded-md font-medium"
                        style={viewMode === 'table' ? activeStyle : inactiveStyle}
                    >
                        Table
                    </button>
                    <span className="mx-1" style={{ width: '1px', height: '16px', background: '#E5E5E0' }} />
                    <button
                        onClick={toggleRelationships}
                        className="px-2.5 py-1 text-xs rounded-md font-medium"
                        style={showRelationships ? activeStyle : inactiveStyle}
                    >
                        {showRelationships ? 'Hide' : 'Show'} Relationships
                    </button>
                </div>

                {/* Layer view */}
                <Suspense fallback={<LayerFallback layers={enrichedOntology.layers} />}>
                    {viewMode === 'visual'
                        ? <LayerGrid layers={enrichedOntology.layers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                        : <LayerTable layers={enrichedOntology.layers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                    }
                </Suspense>

                {/* Relationships section (hidden by default, toggled via toolbar) */}
                {showRelationships && (
                    <Suspense fallback={null}>
                        <RelationshipsSection ontology={enrichedOntology} />
                    </Suspense>
                )}
            </div>

            {/* Kind properties slide-in panel */}
            {selectedKindInfo && (
                <KindPropertiesPanel
                    kind={selectedKindInfo}
                    layers={enrichedOntology.layers}
                    onKindClick={setSelectedKind}
                    onClose={() => setSelectedKind(null)}
                />
            )}
        </div>
    );
}

/** Inline fallback layer grid rendered while lazy chunks load */
function LayerFallback({ layers }: { layers: OntologyPackageInfo['layers'] }) {
    return (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {layers.map(layer => {
                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                return (
                    <div
                        key={layer.id}
                        className="rounded-xl p-4"
                        style={{ background: '#FFFFFF', border: `2px solid ${color}30` }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{layer.label}</span>
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{layer.kindCount} kinds</div>
                    </div>
                );
            })}
        </div>
    );
}

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

import { lazy, Suspense } from 'react';
import { useModelStore } from '../../store/model-store';
import { OntologyHome } from './OntologyHome';
import type { OntologyPackageInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

const LayerGrid = lazy(() => import('./LayerGrid').then(m => ({ default: m.LayerGrid })));
const LayerTable = lazy(() => import('./LayerTable').then(m => ({ default: m.LayerTable })));
const RelationshipsSection = lazy(() => import('./RelationshipsSection').then(m => ({ default: m.RelationshipsSection })));

interface OntologyDetailPanelProps {
    ontology: OntologyPackageInfo;
}

export function OntologyDetailPanel({ ontology }: OntologyDetailPanelProps) {
    const viewMode = useModelStore(s => s.ontologyViewMode);
    const setOntologyViewMode = useModelStore(s => s.setOntologyViewMode);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const model = useModelStore(s => s.model);

    // Enrich kind instanceCounts from model
    const enrichedOntology: OntologyPackageInfo = {
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
    };

    const activeStyle: React.CSSProperties = { background: '#1B3A4B', color: '#2DD4A8', border: '1px solid transparent' };
    const inactiveStyle: React.CSSProperties = { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' };

    return (
        <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
            {/* Ontology summary home card */}
            <OntologyHome ontology={enrichedOntology} />

            {/* Visual / Table toggle */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Layers:</span>
                <button
                    onClick={() => setOntologyViewMode('visual')}
                    className="px-2.5 py-1 text-xs rounded-md font-medium"
                    style={viewMode === 'visual' ? activeStyle : inactiveStyle}
                >
                    ⊞ Visual
                </button>
                <button
                    onClick={() => setOntologyViewMode('table')}
                    className="px-2.5 py-1 text-xs rounded-md font-medium"
                    style={viewMode === 'table' ? activeStyle : inactiveStyle}
                >
                    ≡ Table
                </button>
            </div>

            {/* Layer view */}
            <Suspense fallback={<LayerFallback layers={enrichedOntology.layers} />}>
                {viewMode === 'visual'
                    ? <LayerGrid layers={enrichedOntology.layers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                    : <LayerTable layers={enrichedOntology.layers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                }
            </Suspense>

            {/* Relationships section */}
            <Suspense fallback={null}>
                <RelationshipsSection ontology={enrichedOntology} />
            </Suspense>
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

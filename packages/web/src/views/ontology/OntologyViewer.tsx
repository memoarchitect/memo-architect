// ─── OntologyViewer ───────────────────────────────────────────────────────────
//
// Routes between two sub-views:
//   1. Landing page (OntologyDecompositionDiagram) — shows ontology hierarchy
//   2. Detail page (OntologyDetailPanel) — shows focused ontology layers & kinds
//
// The landing page is shown for { type: 'ontology' }.
// The detail page is shown for { type: 'ontology-detail', packageName }.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useMemo } from 'react';
import { useModelStore } from '../../store/model-store';
import { LAYER_ORDER } from '../../constants';
import { OntologyDetailPanel } from './OntologyDetailPanel';

const OntologyDecompositionDiagram = lazy(() => import('./OntologyDecompositionDiagram'));

const LAYER_RANK = Object.fromEntries(LAYER_ORDER.map((id, i) => [id, i]));

export function OntologyViewer() {
    const activeView = useModelStore(s => s.activeView);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setActiveView = useModelStore(s => s.setActiveView);
    const model = useModelStore(s => s.model);

    // Determine if we're in detail mode
    const isDetailView = activeView.type === 'ontology-detail';
    const detailPackageName = isDetailView ? (activeView as { packageName: string }).packageName : null;

    // Find the focused ontology for detail view
    const focusedOntology = detailPackageName
        ? availableOntologies.find(o => o.name === detailPackageName)
        : null;

    // Derive a synthetic ontology from model elements when package not found
    const derivedOntology = useMemo(() => {
        if (focusedOntology) return null;
        if (!isDetailView) return null;
        if (!model) return null;
        const layerMap = new Map<string, string[]>();
        for (const el of Object.values(model.elements)) {
            if (!layerMap.has(el.layer)) layerMap.set(el.layer, []);
            if (!layerMap.get(el.layer)!.includes(el.kind)) {
                layerMap.get(el.layer)!.push(el.kind);
            }
        }
        const layers = [...layerMap.entries()]
            .sort(([a], [b]) => (LAYER_RANK[a] ?? 99) - (LAYER_RANK[b] ?? 99))
            .map(([layer, kinds]) => ({
                id: layer,
                label: layer.charAt(0).toUpperCase() + layer.slice(1),
                color: '#6B7280',
                kindCount: kinds.length,
                kinds: kinds.map(k => ({
                    name: k,
                    label: k.replace(/([A-Z])/g, ' $1').trim(),
                    construct: 'part def',
                    layer,
                    instanceCount: 0,
                    viewpoints: [],
                })),
            }));
        return {
            name: '@memo/model (inferred)',
            version: '\u2013',
            type: 'ontology' as const,
            description: 'Ontology inferred from loaded model elements.',
            layers,
            kindCount: layers.reduce((s, l) => s + l.kindCount, 0),
            relationshipCount: 0,
            relationshipTypes: [],
            selected: true,
        };
    }, [focusedOntology, isDetailView, model]);

    const displayOntology = focusedOntology ?? derivedOntology;

    // Detail view
    if (isDetailView && displayOntology) {
        return (
            <OntologyDetailPanel
                ontology={displayOntology}
                onBack={() => setActiveView({ type: 'ontology' })}
            />
        );
    }

    // Landing page: decomposition diagram
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading ontology library...</span>
            </div>
        }>
            <OntologyDecompositionDiagram />
        </Suspense>
    );
}

export default OntologyViewer;

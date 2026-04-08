// ─── OntologyViewer (new two-panel shell) ─────────────────────────────────────
//
// Replaces the old OntologyViewer flat layout.
// Left panel:  OntologySelectionPanel (package checkboxes)
// Right panel: OntologyDetailPanel (home card, layers, relationships)
//
// When no ontology is focused yet, auto-focuses the first selected package.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useModelStore } from '../../store/model-store';
import { OntologySelectionPanel } from './OntologySelectionPanel';
import { OntologyDetailPanel } from './OntologyDetailPanel';

export function OntologyViewer() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);
    const focusedOntologyId = useModelStore(s => s.focusedOntologyId);
    const setFocusedOntology = useModelStore(s => s.setFocusedOntology);
    const model = useModelStore(s => s.model);

    // Auto-focus first selected ontology if none is focused
    useEffect(() => {
        if (!focusedOntologyId && availableOntologies.length > 0) {
            const firstSelected = availableOntologies.find(o => selectedOntologies.has(o.name));
            if (firstSelected) setFocusedOntology(firstSelected.name);
            else setFocusedOntology(availableOntologies[0].name);
        }
    }, [availableOntologies, focusedOntologyId, selectedOntologies, setFocusedOntology]);

    const focusedOntology = availableOntologies.find(o => o.name === focusedOntologyId);

    // Derive a synthetic ontology from model elements when no packages loaded
    const derivedOntology = (() => {
        if (focusedOntology) return null;
        if (!model) return null;
        // Build a synthetic package from model element kinds
        const layerMap = new Map<string, string[]>();
        for (const el of Object.values(model.elements)) {
            if (!layerMap.has(el.layer)) layerMap.set(el.layer, []);
            if (!layerMap.get(el.layer)!.includes(el.kind)) {
                layerMap.get(el.layer)!.push(el.kind);
            }
        }
        const layers = [...layerMap.entries()].map(([layer, kinds]) => ({
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
            version: '–',
            type: 'ontology' as const,
            description: 'Ontology inferred from loaded model elements. Connect to a dev server to see package metadata.',
            layers,
            kindCount: layers.reduce((s, l) => s + l.kindCount, 0),
            relationshipCount: 0,
            selected: true,
        };
    })();

    const displayOntology = focusedOntology ?? derivedOntology;

    if (!displayOntology) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-3xl mb-3">◉</div>
                    <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>
                        No model loaded
                    </div>
                    <div className="text-xs">Start the dev server to load ontology packages</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: ontology package selection panel */}
            <OntologySelectionPanel />

            {/* Right: detail panel for focused ontology */}
            <OntologyDetailPanel ontology={displayOntology} />
        </div>
    );
}

export default OntologyViewer;

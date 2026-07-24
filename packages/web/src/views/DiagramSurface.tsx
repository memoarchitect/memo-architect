// ─── DiagramSurface ───────────────────────────────────────────────────────────
//
// Renderer-agnostic mount point for the diagram canvas. Resolves the active
// renderer provider from the registry (feature flag: ?renderer= URL param →
// localStorage → VITE_MEMO_DIAGRAM_RENDERER → ReactFlow default), lazy-loads
// its canvas component, and offers a runtime switcher when more than one
// renderer is registered.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy, useMemo, useSyncExternalStore } from 'react';
import { rendererRegistry } from '../diagram/renderers';
import { DEFAULT_RENDERER_ID } from '../diagram/renderer-provider';
import {
    selectedRendererId, setSelectedRendererId, subscribeRendererSelection,
} from '../diagram/renderer-selection';

function CanvasLoadingFallback() {
    return (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5', color: '#9CA3AF', fontSize: 13 }}>
            Loading renderer…
        </div>
    );
}


export function DiagramSurface() {
    const requestedId = useSyncExternalStore(subscribeRendererSelection, selectedRendererId, selectedRendererId);
    // Stale flags (uninstalled renderer) resolve to the default provider
    const activeId = rendererRegistry.has(requestedId) ? requestedId : DEFAULT_RENDERER_ID;

    const Canvas = useMemo(
        () => lazy(() => rendererRegistry.loadComponent(activeId).then(component => ({ default: component }))),
        [activeId],
    );

    // Registered renderers for the runtime switcher. ReactFlow is the default
    // authoring surface; maxGraph remains available for its retained-mode
    // canvas, alignment guides, and image export.
    const renderers = rendererRegistry.list();

    // Same sizing contract as the canvases it hosts: DiagramCanvas roots use
    // `flex flex-1`, so this wrapper must be a flex item AND a flex container
    // (a plain block collapses the canvas to its content height).
    return (
        <div className="relative flex flex-1 overflow-hidden">
            <Suspense fallback={<CanvasLoadingFallback />}>
                <Canvas />
            </Suspense>
            {renderers.length > 1 && (
                <div
                    role="group"
                    aria-label="Diagram renderer"
                    className="absolute bottom-3 left-1/2 z-10 flex items-center overflow-hidden rounded-lg"
                    style={{ transform: 'translateX(-50%)', border: '1px solid #E5E5E0', background: '#FFFFFF', boxShadow: '0 2px 8px rgba(15,23,42,0.10)' }}
                >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', padding: '0 8px' }}>Renderer</span>
                    {renderers.map(descriptor => {
                        const active = descriptor.id === activeId;
                        return (
                            <button
                                key={descriptor.id}
                                onClick={() => setSelectedRendererId(descriptor.id)}
                                aria-pressed={active}
                                title={descriptor.description}
                                style={{
                                    fontSize: 12, fontWeight: 600, padding: '5px 12px', border: 'none', cursor: 'pointer',
                                    background: active ? '#1B3A4B' : 'transparent',
                                    color: active ? '#FFFFFF' : '#6B7280',
                                }}
                            >
                                {descriptor.name}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

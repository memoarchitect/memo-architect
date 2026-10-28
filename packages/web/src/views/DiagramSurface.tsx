// ─── DiagramSurface ───────────────────────────────────────────────────────────
//
// Renderer-agnostic mount point for the diagram canvas. Resolves the active
// renderer provider from deployment/runtime configuration and lazy-loads its
// canvas component. Renderer engines are an implementation choice, not a view
// authoring choice, so this surface intentionally exposes no engine switcher.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy, useMemo, useSyncExternalStore } from 'react';
import { rendererRegistry } from '../diagram/renderers';
import { DEFAULT_RENDERER_ID } from '../diagram/renderer-provider';
import { selectedRendererId, subscribeRendererSelection } from '../diagram/renderer-selection';

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

    // Same sizing contract as the canvases it hosts: DiagramCanvas roots use
    // `flex flex-1`, so this wrapper must be a flex item AND a flex container
    // (a plain block collapses the canvas to its content height).
    return (
        <div className="relative flex flex-1 overflow-hidden">
            <Suspense fallback={<CanvasLoadingFallback />}>
                <Canvas />
            </Suspense>
        </div>
    );
}

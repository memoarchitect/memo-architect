// ─── DiagramSurface ───────────────────────────────────────────────────────────
//
// Renderer-agnostic mount point for the diagram canvas. Resolves the active
// renderer provider from the registry (feature flag: ?renderer= URL param →
// localStorage → VITE_MEMO_DIAGRAM_RENDERER → ReactFlow default), lazy-loads
// its canvas component, and offers a runtime switcher when more than one
// renderer is registered.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy, useMemo, useSyncExternalStore } from 'react';
import { rendererRegistry, listRenderers } from '../diagram/renderers';
import { DEFAULT_RENDERER_ID } from '../diagram/renderer-provider';
import {
    selectedRendererId, setSelectedRendererId, subscribeRendererSelection,
} from '../diagram/renderer-selection';
import { FONT } from '../styles/tokens';

function CanvasLoadingFallback() {
    return (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5', color: '#9CA3AF', fontSize: FONT.sm }}>
            Loading renderer…
        </div>
    );
}

function RendererSwitcher({ activeId }: { activeId: string }) {
    const descriptors = listRenderers();
    if (descriptors.length < 2) return null;
    return (
        <div
            className="absolute bottom-3 right-3 z-10 flex items-center overflow-hidden rounded-lg"
            style={{ border: '1px solid #E5E5E0', background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            title="Diagram rendering engine"
        >
            {descriptors.map(descriptor => {
                const active = descriptor.id === activeId;
                return (
                    <button
                        key={descriptor.id}
                        onClick={() => setSelectedRendererId(descriptor.id)}
                        title={`${descriptor.engine} — ${descriptor.description}`}
                        style={{
                            fontSize: FONT.xs, padding: '4px 10px', fontWeight: 600,
                            border: 'none', cursor: active ? 'default' : 'pointer',
                            background: active ? '#2DD4A8' : 'transparent',
                            color: active ? '#FFFFFF' : '#6B7280',
                        }}
                    >
                        {descriptor.name}
                    </button>
                );
            })}
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
            <RendererSwitcher activeId={activeId} />
        </div>
    );
}

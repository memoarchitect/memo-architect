// ─── DiagramSurface ───────────────────────────────────────────────────────────
//
// Renderer-agnostic mount point for the diagram canvas. Resolves the active
// renderer provider from deployment/runtime configuration and lazy-loads its
// canvas component. Renderer engines are an implementation choice, not a view
// authoring choice except for the explicitly scoped IBD comparison pilot.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore, getDiagram } from '../store/model-store';
import { sendDiagramLayoutUpdate } from '../store/ws-client';
import { resolveViewKind } from '../diagram/renderers/maxgraph/scene-source';
import { captureComparisonScene, discardComparisonScene, diagramRendererId, withDiagramRenderer, type PilotLayout, JOINTJS_RENDERER_ID, MAXGRAPH_RENDERER_ID, REACTFLOW_RENDERER_ID, X6_RENDERER_ID } from '../diagram/diagram-renderer-selection';
import { Suspense, lazy, useEffect, useMemo, useSyncExternalStore } from 'react';
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
    const inheritedId = useSyncExternalStore(subscribeRendererSelection, selectedRendererId, selectedRendererId);
    const diagramId = useModelStore(s => s.selectedDiagramId);
    const model = useModelStore(s => s.model);
    const layout = useModelStore(s => diagramId ? s.diagramLayouts[diagramId] : undefined) as PilotLayout | undefined;
    const diagram = getDiagram(model, diagramId);
    const isIbd = resolveViewKind(diagram) === 'interconnection';
    useEffect(() => { discardComparisonScene(); }, [diagramId]);
    const requestedId = diagramRendererId(layout, inheritedId, isIbd);
    function changeRenderer(renderer: string) {
        if (!diagramId) return;
        if (renderer === JOINTJS_RENDERER_ID) captureComparisonScene(diagramId);
        else discardComparisonScene();
        const updated = withDiagramRenderer(useModelStore.getState().diagramLayouts[diagramId], renderer || undefined);
        useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
        sendDiagramLayoutUpdate(diagramId, updated);
    }
    // Stale flags (uninstalled renderer) resolve to the default provider
    const activeId = rendererRegistry.has(requestedId) ? requestedId : DEFAULT_RENDERER_ID;

    // JointJS is an IBD drawing engine, not a second editor shell. Mount it
    // inside DiagramCanvas so the existing IBD palette, toolbar, source-editor
    // controls, selection controls, and Properties behaviour stay identical.
    const Canvas = useMemo(
        () => activeId === JOINTJS_RENDERER_ID
            ? lazy(() => import('./DiagramCanvas').then(component => ({ default: component.DiagramCanvas })))
            : lazy(() => rendererRegistry.loadComponent(activeId).then(component => ({ default: component }))),
        [activeId],
    );

    // Same sizing contract as the canvases it hosts: DiagramCanvas roots use
    // `flex flex-1`, so this wrapper must be a flex item AND a flex container
    // (a plain block collapses the canvas to its content height).
    return (
        <div className="relative flex flex-col flex-1 overflow-hidden">
            {isIbd && diagramId && <div className="flex items-center gap-3 border-b px-4 py-2 bg-white text-xs">
                <label className="flex items-center gap-2">Renderer for this diagram
                    <select aria-label="Renderer for this diagram" value={layout?.canvas?.renderer ?? ''}
                        onChange={event => changeRenderer(event.target.value)} className="border rounded px-2 py-1">
                        <option value="">Default</option>
                        <option value={REACTFLOW_RENDERER_ID}>React Flow + ELK</option>
                        <option value={JOINTJS_RENDERER_ID}>JointJS IBD</option>
                        <option value={X6_RENDERER_ID}>AntV X6 IBD</option>
                        <option value={MAXGRAPH_RENDERER_ID}>maxGraph</option>
                    </select>
                </label>
                <span className="text-slate-500">{activeId === REACTFLOW_RENDERER_ID
                    ? 'ELK automatic layout with React Flow authoring'
                    : activeId === JOINTJS_RENDERER_ID ? 'JointJS native move, port and segment editing; no shared routing types, resize or Undo'
                    : activeId === MAXGRAPH_RENDERER_ID ? 'maxGraph shared placement, selection, alignment and export; no port editing or Undo'
                    : 'X6 native placement and routes; explicit type mappings, native history; no resize'}</span>
            </div>}
            <Suspense key={`${diagramId}:${activeId}`} fallback={<CanvasLoadingFallback />}>
                <Canvas />
            </Suspense>
        </div>
    );
}

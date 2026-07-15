// ─── Diagram renderer provider contract ──────────────────────────────────────
//
// A renderer provider owns the diagram drawing surface — the engine that turns
// the computed scene (template layouts + sidecar overrides) into pixels and
// interactions. Providers are registered in renderer-registry and selected via
// a feature flag (renderer-selection), mirroring the layout-provider layer:
//
//   layout providers  → WHERE nodes go        (ELK, Dagre, Fixed)
//   renderer providers → HOW the scene is drawn (ReactFlow, maxGraph)
//
// The provider surface is a full React canvas component (store-connected, like
// DiagramCanvas) rather than a draw(scene) function: rendering engines differ
// too much in interaction models (React nodes vs. retained-mode cells) for a
// narrower contract to survive its second implementation.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from 'react';

export type RendererCapability =
    /** Full authoring surface: create elements, draw edges, context menus. */
    | 'interactive-editing'
    /** Renders every spec view kind (general/interconnection/actionflow/…). */
    | 'all-view-kinds'
    /** Node drag with persistence to the diagram sidecar layout. */
    | 'manual-layout'
    /** Undo/redo of canvas edits. */
    | 'undo-redo'
    /** Minimap navigation aid. */
    | 'minimap'
    /** Orthogonal edge routing with draggable waypoints. */
    | 'orthogonal-routes'
    /** Native image export of the drawn scene. */
    | 'export-image';

export interface RendererDescriptor {
    /** Stable id, e.g. 'memo.renderer.reactflow'. Feature flag values use this. */
    id: string;
    name: string;
    /** Underlying engine + version, e.g. 'ReactFlow (@xyflow/react 12)'. */
    engine: string;
    version: string;
    contractVersion: '1';
    license: string;
    description: string;
    capabilities: readonly RendererCapability[];
}

/**
 * Canvas components are self-contained: they read the model, selection and
 * diagram layouts from the store and push edits over the WebSocket client.
 */
export type DiagramCanvasComponent = ComponentType<Record<string, never>>;

export interface DiagramRendererProvider {
    readonly descriptor: RendererDescriptor;
    /** Lazily import the canvas — keeps engines out of each other's chunks. */
    loadComponent(): Promise<DiagramCanvasComponent>;
}

export const DEFAULT_RENDERER_ID = 'memo.renderer.reactflow';

export function hasRendererCapabilities(
    descriptor: RendererDescriptor,
    required: readonly RendererCapability[],
): boolean {
    const available = new Set(descriptor.capabilities);
    return required.every(capability => available.has(capability));
}

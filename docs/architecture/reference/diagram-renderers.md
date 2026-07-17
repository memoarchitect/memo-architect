# Diagram Renderer Providers

The diagram drawing surface in `@memoarchitect/architect` is pluggable. A **renderer
provider** owns how the computed scene is drawn and interacted with; the
semantic model, template layout pipeline (ELK + view-kind templates), and the
`.viewlayout` sidecar are shared by all renderers. This mirrors the layout
provider layer:

| Layer | Question it answers | Providers |
| --- | --- | --- |
| Layout providers (`diagram/layout-provider.ts`) | Where do nodes go? | ELK, Dagre, Fixed |
| Renderer providers (`diagram/renderer-provider.ts`) | How is the scene drawn? | ReactFlow, maxGraph |

Decision record: [ADR-1-20](../../decisions/adr/ADR-1-20-maxgraph-diagram-renderer.md)
(gated maxGraph migration) and [ADR-1-21](../../decisions/adr/ADR-1-21-modular-capability-provider-architecture.md)
(capability-provider architecture).

## Module map

```
packages/web/src/diagram/
  renderer-provider.ts        contract: descriptor, capabilities, component loader
  renderer-registry.ts        registration, capability filtering, memoized loads
  renderer-selection.ts       feature flag resolution + runtime switching
  renderers.ts                registry instance; registers both providers
  renderers/maxgraph/
    scene.ts                  pure adapter: ReactFlow-shaped layout output → cell specs
    scene-source.ts           per-view-kind scene dispatch with presentation defaults
    MaxGraphCanvas.tsx        @maxgraph/core canvas host
packages/web/src/views/
  DiagramSurface.tsx          renderer-agnostic mount point + runtime switcher
  DiagramCanvas.tsx           the ReactFlow provider's canvas (authoring surface)
```

`App.tsx` and `DiagramEditor.tsx` mount `DiagramSurface`, never a concrete
canvas. Canvas components are lazy-loaded so each engine stays out of the
other's chunk.

## Registered providers

| Id | Engine | Capabilities |
| --- | --- | --- |
| `memo.renderer.reactflow` (default) | ReactFlow (`@xyflow/react`) | full authoring: editing, palette, undo/redo, minimap, orthogonal route editing |
| `memo.renderer.maxgraph` | maxGraph (`@maxgraph/core`, draw.io engine lineage) | all view kinds, manual layout (drag → sidecar), SVG export; read-mostly |

Both draw the same model through the same template layouts; only the drawing
engine differs. The maxGraph provider renders with presentation defaults (no
expansion toggles, lane filters, or focus mode) and delegates grid/browser
kinds to their dedicated non-canvas surfaces.

## Feature flag

Selection precedence (first match wins):

1. `?renderer=maxgraph` (or a full id) — per-tab override
2. `localStorage['memo.diagram.renderer']` — user preference, set by the
   on-canvas switcher (bottom-right pill, shown when ≥2 providers registered)
3. `VITE_MEMO_DIAGRAM_RENDERER` — deployment default at build time
4. `memo.renderer.reactflow`

Unknown/stale ids fall back to the default provider. Short names are expanded
to `memo.renderer.<name>`.

## Adding a renderer

1. Implement a store-connected canvas component (see `MaxGraphCanvas.tsx`;
   reuse `scene-source.ts` to obtain positioned scenes).
2. Register a `DiagramRendererProvider` in `renderers.ts` with an honest
   capability list and a lazy `loadComponent`.
3. Renderer-specific imports stay inside `renderers/<engine>/` — templates and
   application code must not import engine types (ADR-1-20 constraint 1).

// ─── Diagram profile resolution — single source of truth ─────────────────────
//
// "Which template renders this diagram?" used to be answered three times,
// independently, and not always the same way: the ReactFlow template
// registry (./templates.ts) matched on a 7-field ad hoc context; the
// maxGraph static-scene renderer (./renderers/maxgraph/scene-source.ts)
// re-implemented the same if/else chain by hand; and DiagramCanvas.tsx
// derived its own copies of the same booleans for toolbar gating. Two of
// the branches in all three copies (`layoutStyle === 'fbs'` / any other
// `layoutStyle`) were unreachable dead code: nothing anywhere sets
// `DiagramDTO.properties.layoutStyle` (the view-deriver's presentation-hint
// allowlist never included it), so `isFBSDiagram`/`isDecompDiagram` were
// always false and the FBS/Decomposition/Containment top-level templates
// could never be selected. The general/tree/containment presentation modes
// they were duplicating are already served, correctly and reachably, by the
// `general` view kind's own tree/containment mode (views/templates/general-view.ts) —
// see that file's module doc for why it is the one place decomposition-style
// rendering belongs.
//
// This module is now the ONLY place that maps a view's declared `viewKind` /
// legacy `diagramType` to a template selector. Every renderer calls it
// instead of keeping its own copy, so they cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

import type { ViewKind } from '@memoarchitect/tools/browser';
import type { GeneralViewMode } from '../views/templates/general-view';

/**
 * Every template a diagram can resolve to. Precedence is the order tested in
 * `resolveDiagramProfile`, not registration order in a registry — one
 * function, one order, read top to bottom.
 */
export const DIAGRAM_PROFILES = [
    'usecase', 'context',
    'interconnection', 'actionflow', 'statetransition', 'sequence',
    'general', 'standard',
] as const;

export type DiagramProfile = (typeof DIAGRAM_PROFILES)[number];

export interface DiagramProfileInput {
    viewKind?: ViewKind | string;
    /** Legacy per-view type key ('ucd', 'context', …) — see constants.ts DIAGRAM_TYPE_META. */
    diagramType?: string;
    /** The general template's own presentation mode; irrelevant to every other profile. */
    generalMode: GeneralViewMode;
}

/**
 * Resolve which template a diagram renders through. `ucd`/`context` are
 * legacy diagramType keys that both resolve to the `general` view kind (see
 * memo-tools view-kinds.ts DIAGRAM_TYPE_TO_VIEW_KIND) but get their own
 * specialized layout, so they are checked ahead of the viewKind switch.
 * `general` only takes over from `standard` once it has left graph mode —
 * graph mode is the plain relationship-graph rendering `standard` already
 * gives every other view kind, so there is nothing specialized to switch to.
 */
export function resolveDiagramProfile({ viewKind, diagramType, generalMode }: DiagramProfileInput): DiagramProfile {
    if (diagramType === 'ucd') return 'usecase';
    if (diagramType === 'context') return 'context';
    if (viewKind === 'interconnection') return 'interconnection';
    if (viewKind === 'actionflow') return 'actionflow';
    if (viewKind === 'statetransition') return 'statetransition';
    if (viewKind === 'sequence') return 'sequence';
    if (viewKind === 'general' && generalMode !== 'graph') return 'general';
    return 'standard';
}

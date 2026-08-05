// ─── Diagram toolbar capabilities ───────────────────────────────────────────
//
// A diagram declares what its toolbar can do here.  DiagramCanvas renders the
// common operations once and asks this registry before rendering a contextual
// operation, rather than allowing every view to grow its own toolbar branch.

import type { ViewKind } from '@memoarchitect/tools/browser';

export type DiagramToolbarOperation =
    | 'grid'
    | 'route'
    | 'export'
    | 'autoLayout'
    | 'expandCollapse'
    | 'flowSwimlanes'
    | 'flowHierarchy'
    | 'flowNesting'
    | 'flowDirection'
    | 'flowLegend'
    | 'flowFilters'
    | 'interconnectionPorts'
    | 'interconnectionConnections'
    | 'generalMode'
    | 'useCaseOptions';

const COMMON: readonly DiagramToolbarOperation[] = [
    'grid', 'route', 'export', 'autoLayout',
];

const CONTEXTUAL: Partial<Record<ViewKind, readonly DiagramToolbarOperation[]>> = {
    actionflow: [
        'expandCollapse', 'flowSwimlanes', 'flowHierarchy', 'flowNesting',
        'flowDirection', 'flowLegend', 'flowFilters',
    ],
    interconnection: ['expandCollapse', 'interconnectionPorts', 'interconnectionConnections'],
    statetransition: ['expandCollapse'],
    general: ['expandCollapse', 'generalMode', 'useCaseOptions'],
};

/** Returns the complete, explicit set of operations for a diagram view. */
export function toolbarOperationsFor(viewKind: ViewKind | undefined): ReadonlySet<DiagramToolbarOperation> {
    return new Set([...COMMON, ...(viewKind ? CONTEXTUAL[viewKind] ?? [] : [])]);
}


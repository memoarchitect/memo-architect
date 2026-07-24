// ─── Diagram template provider contract ──────────────────────────────────────
//
// A template turns the model into a laid-out scene for one presentation —
// a view kind (interconnection, actionflow, …) or a diagram type (ucd,
// context). Providers are selected per diagram by `matches`; the first
// registered match wins, so registration order encodes precedence exactly
// like the if/else chain it replaces. The layer mirrors the other two
// provider layers:
//
//   layout providers   → WHERE nodes go            (ELK, Dagre, Fixed)
//   template providers → WHAT the scene contains    (per view kind)
//   renderer providers → HOW the scene is drawn     (ReactFlow, maxGraph)
//
// Option slices are typed from the template functions themselves
// (Parameters<…>), so a template's option surface has a single source of
// truth and the hosting canvas assembles one slice bag for all providers.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type {
    LayoutResult,
    computeContainmentLayout, computeDecompositionLayout, computeFBSLayout, computeLayout,
} from '../views/layout';
import type { computeGeneralViewLayout } from '../views/templates/general-view';
import type { computeInterconnectionLayout } from '../views/templates/interconnection-view';
import type { computeActionFlowViewLayout } from '../views/templates/actionflow-view';
import type { computeStateTransitionLayout } from '../views/templates/statetransition-view';
import type { computeSequenceLayout } from '../views/templates/sequence-view';
import type { computeUseCaseViewLayout } from '../views/templates/use-case-view';

/** Everything the selection predicate may discriminate on. */
export interface TemplateSelectionContext {
    viewKind?: string;
    diagramType?: string;
    isFBSDiagram: boolean;
    isDecompDiagram: boolean;
    isGeneralTemplate: boolean;
    generalMode: string;
    layoutStyle: string;
}

/**
 * Per-template option slices, assembled once by the hosting canvas. Each
 * provider reads only its own slice; slice types come straight from the
 * template functions so they cannot drift.
 */
export interface TemplateOptionSlices {
    fbs: Parameters<typeof computeFBSLayout>[1];
    decomposition: Parameters<typeof computeDecompositionLayout>[1];
    containment: Parameters<typeof computeContainmentLayout>[1];
    useCase: Parameters<typeof computeUseCaseViewLayout>[1];
    /** Context view frames one named system. */
    contextSystemName?: string;
    interconnection: Parameters<typeof computeInterconnectionLayout>[1];
    actionflow: Parameters<typeof computeActionFlowViewLayout>[1];
    statetransition: Parameters<typeof computeStateTransitionLayout>[1];
    sequence: Parameters<typeof computeSequenceLayout>[1];
    general: Parameters<typeof computeGeneralViewLayout>[1];
    standard: Parameters<typeof computeLayout>[1];
}

export interface DiagramTemplateDescriptor {
    /** Stable id, e.g. 'memo.template.interconnection'. */
    id: string;
    name: string;
    /** Short label for layout progress and error surfaces, e.g. 'Interconnection'. */
    label: string;
    contractVersion: '1';
    /** Whether emitted nodes receive the canvas's interactive wiring. */
    interactive: boolean;
    description: string;
}

export interface DiagramTemplateProvider {
    readonly descriptor: DiagramTemplateDescriptor;
    /** Selection predicate; first registered match wins. */
    matches(context: TemplateSelectionContext): boolean;
    /** Sync results apply immediately; promises run bounded with a spinner. */
    compute(model: MemoModelDTO, options: TemplateOptionSlices): LayoutResult | Promise<LayoutResult>;
}

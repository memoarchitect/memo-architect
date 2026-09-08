// ─── Built-in diagram templates ──────────────────────────────────────────────
//
// Registration order mirrors DIAGRAM_PROFILES precedence in ./diagram-profile.ts
// (the enum a diagram resolves to before a template is ever selected); the
// standard template is the catch-all and must stay last.
//
// FBS, standalone Decomposition, and standalone Containment templates used to
// register here too, gated on `properties.layoutStyle`. Nothing ever set that
// property — the view-deriver's presentation-hint allowlist never included it
// — so they could never be selected; removed along with their now-orphaned
// computeFBSLayout/buildFunctionalTree call sites (2026-09-08). The
// tree/containment presentation they were duplicating is what the `general`
// template's own mode switch (views/templates/general-view.ts) already does,
// reachably, over any general view's own selection.
// ─────────────────────────────────────────────────────────────────────────────

import { computeLayout } from '../views/layout';
import { computeGeneralViewLayout } from '../views/templates/general-view';
import { computeInterconnectionLayout } from '../views/templates/interconnection-view';
import { computeActionFlowViewLayout } from '../views/templates/actionflow-view';
import { computeStateTransitionLayout } from '../views/templates/statetransition-view';
import { computeSequenceLayout } from '../views/templates/sequence-view';
import { computeUseCaseViewLayout } from '../views/templates/use-case-view';
import { computeContextViewLayout } from '../views/templates/context-view';
import { TemplateRegistry } from './template-registry';
import type { DiagramTemplateProvider } from './template-provider';

export const templateRegistry = new TemplateRegistry();

const builtIns: DiagramTemplateProvider[] = [
    {
        descriptor: {
            id: 'memo.template.usecase', name: 'Use Case', label: 'Use case',
            contractVersion: '1', interactive: false,
            description: 'Actors outside a system boundary, use cases inside (KK-7).',
        },
        matches: ctx => ctx.diagramProfile === 'usecase',
        compute: (model, o) => computeUseCaseViewLayout(model, o.useCase),
    },
    {
        descriptor: {
            id: 'memo.template.context', name: 'System Context', label: 'Context',
            contractVersion: '1', interactive: false,
            description: 'Black-box system of interest with external actors and peer systems.',
        },
        matches: ctx => ctx.diagramProfile === 'context',
        compute: (model, o) => computeContextViewLayout(model, o.context.systemName, o.context),
    },
    {
        descriptor: {
            id: 'memo.template.interconnection', name: 'Interconnection', label: 'Interconnection',
            contractVersion: '1', interactive: false,
            description: 'IBD — parts with boundary ports, typed connectors, nested containment (KK-3).',
        },
        matches: ctx => ctx.diagramProfile === 'interconnection',
        compute: (model, o) => computeInterconnectionLayout(model, o.interconnection),
    },
    {
        descriptor: {
            id: 'memo.template.actionflow', name: 'Action Flow', label: 'Action flow',
            contractVersion: '1', interactive: false,
            description: 'Actions with parameter ports, item flows, successions, optional swimlanes (KK-4).',
        },
        matches: ctx => ctx.diagramProfile === 'actionflow',
        compute: (model, o) => computeActionFlowViewLayout(model, o.actionflow),
    },
    {
        descriptor: {
            id: 'memo.template.statetransition', name: 'State Transition', label: 'State transition',
            contractVersion: '1', interactive: false,
            description: 'Nested states with routed transition edges and trigger [guard] labels (KK-5).',
        },
        matches: ctx => ctx.diagramProfile === 'statetransition',
        compute: (model, o) => computeStateTransitionLayout(model, o.statetransition),
    },
    {
        descriptor: {
            id: 'memo.template.sequence', name: 'Sequence', label: 'Sequence',
            contractVersion: '1', interactive: false,
            description: 'Lifelines with chronological messages (KK-6).',
        },
        matches: ctx => ctx.diagramProfile === 'sequence',
        compute: (model, o) => computeSequenceLayout(model, o.sequence),
    },
    {
        descriptor: {
            id: 'memo.template.general', name: 'General (structured)', label: 'General',
            contractVersion: '1', interactive: true,
            description: 'General template tree/containment modes (KK-2).',
        },
        matches: ctx => ctx.diagramProfile === 'general',
        compute: (model, o) => computeGeneralViewLayout(model, o.general),
    },
    {
        descriptor: {
            id: 'memo.template.standard', name: 'Standard Graph', label: 'Standard',
            contractVersion: '1', interactive: true,
            description: 'Relationship graph with optional compartments — the catch-all.',
        },
        matches: () => true,
        compute: (model, o) => computeLayout(model, o.standard),
    },
];
for (const provider of builtIns) templateRegistry.register(provider);

export function registerDiagramTemplate(provider: DiagramTemplateProvider, beforeId?: string): void {
    templateRegistry.register(provider, beforeId);
}

export function listDiagramTemplates() {
    return templateRegistry.list();
}

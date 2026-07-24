// ─── Built-in diagram templates ──────────────────────────────────────────────
//
// Registration order is selection precedence — it reproduces, exactly, the
// dispatch order of the if/else chain this registry replaced. The standard
// template is the catch-all and must stay last.
// ─────────────────────────────────────────────────────────────────────────────

import {
    computeContainmentLayout, computeDecompositionLayout, computeFBSLayout, computeLayout,
} from '../views/layout';
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
            id: 'memo.template.fbs', name: 'Functional Breakdown', label: 'FBS',
            contractVersion: '1', interactive: true,
            description: 'Functional breakdown structure — functions per realising component.',
        },
        matches: ctx => ctx.isFBSDiagram,
        compute: (model, o) => computeFBSLayout(model, o.fbs),
    },
    {
        descriptor: {
            id: 'memo.template.decomposition', name: 'Decomposition Tree', label: 'Decomposition',
            contractVersion: '1', interactive: true,
            description: 'Expandable decomposition tree over composition relationships.',
        },
        matches: ctx => ctx.isDecompDiagram && ctx.layoutStyle === 'decomposition',
        compute: (model, o) => computeDecompositionLayout(model, o.decomposition),
    },
    {
        descriptor: {
            id: 'memo.template.containment', name: 'Containment Blocks', label: 'Containment',
            contractVersion: '1', interactive: true,
            description: 'Nested containment blocks over composition relationships.',
        },
        matches: ctx => ctx.isDecompDiagram,
        compute: (model, o) => computeContainmentLayout(model, o.containment),
    },
    {
        descriptor: {
            id: 'memo.template.usecase', name: 'Use Case', label: 'Use case',
            contractVersion: '1', interactive: false,
            description: 'Actors outside a system boundary, use cases inside (KK-7).',
        },
        matches: ctx => ctx.diagramType === 'ucd',
        compute: (model, o) => computeUseCaseViewLayout(model, o.useCase),
    },
    {
        descriptor: {
            id: 'memo.template.context', name: 'System Context', label: 'Context',
            contractVersion: '1', interactive: false,
            description: 'Black-box system of interest with external actors and peer systems.',
        },
        matches: ctx => ctx.diagramType === 'context',
        compute: (model, o) => computeContextViewLayout(model, o.contextSystemName),
    },
    {
        descriptor: {
            id: 'memo.template.interconnection', name: 'Interconnection', label: 'Interconnection',
            contractVersion: '1', interactive: false,
            description: 'IBD — parts with boundary ports, typed connectors, nested containment (KK-3).',
        },
        matches: ctx => ctx.viewKind === 'interconnection',
        compute: (model, o) => computeInterconnectionLayout(model, o.interconnection),
    },
    {
        descriptor: {
            id: 'memo.template.actionflow', name: 'Action Flow', label: 'Action flow',
            contractVersion: '1', interactive: false,
            description: 'Actions with parameter ports, item flows, successions, optional swimlanes (KK-4).',
        },
        matches: ctx => ctx.viewKind === 'actionflow',
        compute: (model, o) => computeActionFlowViewLayout(model, o.actionflow),
    },
    {
        descriptor: {
            id: 'memo.template.statetransition', name: 'State Transition', label: 'State transition',
            contractVersion: '1', interactive: false,
            description: 'Nested states with routed transition edges and trigger [guard] labels (KK-5).',
        },
        matches: ctx => ctx.viewKind === 'statetransition',
        compute: (model, o) => computeStateTransitionLayout(model, o.statetransition),
    },
    {
        descriptor: {
            id: 'memo.template.sequence', name: 'Sequence', label: 'Sequence',
            contractVersion: '1', interactive: false,
            description: 'Lifelines with chronological messages (KK-6).',
        },
        matches: ctx => ctx.viewKind === 'sequence',
        compute: (model, o) => computeSequenceLayout(model, o.sequence),
    },
    {
        descriptor: {
            id: 'memo.template.general', name: 'General (structured)', label: 'General',
            contractVersion: '1', interactive: true,
            description: 'General template tree/containment modes (KK-2).',
        },
        matches: ctx => ctx.isGeneralTemplate && ctx.generalMode !== 'graph',
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

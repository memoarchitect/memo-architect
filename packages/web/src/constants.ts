// ─── Shared Design Constants ─────────────────────────────────────────────────
//
// Single source of truth for architecture layer colors and design tokens.
// ─────────────────────────────────────────────────────────────────────────────

import type { ViewKind } from '@memo/tools/browser';

export const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    behavior: '#FF6B6B',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

export const LAYER_LABELS: Record<string, string> = {
    business: 'Business Analysis',
    requirements: 'Requirements',
    risk: 'Risk Management',
    functional: 'Functional Analysis',
    behavior: 'Behavior',
    logical: 'Logical Architecture',
    physical: 'Physical Architecture',
    software: 'Software Architecture',
    interfaces: 'Interfaces & Ports',
    verification: 'Verification',
    ui: 'UI Wireframe',
};

export const LAYER_ORDER = [
    'business', 'requirements', 'risk', 'functional', 'behavior', 'logical',
    'physical', 'software', 'interfaces', 'verification', 'ui',
] as const;

export const REL_COLORS: Record<string, string> = {
    mitigates: '#E74C3C',
    causes: '#C0392B',
    leadsTo: '#E74C3C',
    identifies: '#D35400',
    traceTo: '#4A90D9',
    satisfy: '#2ECC71',
    verify: '#27AE60',
    allocateTo: '#E67E22',
    aggregation: '#7B68EE',
    composedOf: '#8E44AD',
    decomposedBy: '#D35400',
    flow: '#3498DB',
    succession: '#95A5A6',
};

// ─── Semantic V-Cycle Grouping ──────────────────────────────────────────────
// Groups similar kinds together for a meaningful catalog view.
// Order follows the V-cycle: business → requirements → functional → logical
// → physical → software → interfaces → verification → risk → ui

export interface SemanticGroup {
    id: string;
    label: string;
    color: string;
    kinds: string[];
}

export const SEMANTIC_GROUPS: SemanticGroup[] = [
    {
        id: 'stakeholders',
        label: 'Stakeholders & Goals',
        color: '#8E44AD',
        kinds: ['Actor', 'Stakeholder', 'Goal', 'Concern', 'Responsibility', 'Capability'],
    },
    {
        id: 'requirements',
        label: 'Requirements',
        color: '#4A90D9',
        kinds: ['Requirement', 'Requirement', 'Requirement', 'Requirement',
            'DesignSpecification', 'Requirement', 'Standard', 'RegulatoryRequirement'],
    },
    {
        id: 'use-cases',
        label: 'Use Cases & Scenarios',
        color: '#E67E22',
        kinds: ['UseCase', 'Scenario', 'UserActivity', 'UIFunction'],
    },
    {
        id: 'functions',
        label: 'Functions',
        color: '#D35400',
        kinds: ['Function', 'Function'],
    },
    {
        id: 'behavior',
        label: 'Behavior',
        color: '#FF6B6B',
        kinds: ['ActionDefinition', 'ActionUsage', 'ItemDefinition'],
    },
    {
        id: 'logical',
        label: 'Logical Architecture',
        color: '#7B68EE',
        kinds: ['System', 'SystemExternal', 'Subsystem', 'Component', 'LogicalComponent',
            'LogicalComponentExternal', 'EnvironmentElement'],
    },
    {
        id: 'decisions',
        label: 'Architecture Decisions',
        color: '#6C5CE7',
        kinds: ['ArchitectureDecision', 'ArchitectureRationale', 'QualityAttribute', 'Question'],
    },
    {
        id: 'physical',
        label: 'Physical Architecture',
        color: '#95A5A6',
        kinds: ['PhysicalComponent', 'ElectricalComponent', 'MechanicalComponent',
            'PhysicalModule', 'HardwareNode', 'ComputingDevice',
            'FPGA', 'Catheter', 'Microcontroller', 'SingleBoardComputer'],
    },
    {
        id: 'software',
        label: 'Software Architecture',
        color: '#F39C12',
        kinds: ['Software', 'SoftwareComponent', 'SoftwareModule',
            'Firmware', 'Docker', 'OperatingSystem', 'RosNode'],
    },
    {
        id: 'interfaces',
        label: 'Interfaces & Ports',
        color: '#1ABC9C',
        kinds: ['Port', 'Port', 'Port', 'Port', 'Port',
            'Interface', 'SoftwareInterface', 'SoftwareProvidedInterface',
            'SoftwareRequiredInterface', 'DataType', 'RosTopic', 'RosService'],
    },
    {
        id: 'risk',
        label: 'Risk Management',
        color: '#E74C3C',
        kinds: ['Hazard', 'HazardousSituation', 'Harm', 'Risk', 'RiskControl', 'SafetyGoal'],
    },
    {
        id: 'verification',
        label: 'Verification & Testing',
        color: '#2ECC71',
        kinds: ['Test'],
    },
    {
        id: 'ui',
        label: 'UI Wireframes',
        color: '#3498DB',
        kinds: ['UIScreen', 'UIPanel', 'UIElement'],
    },
];

/** Map kind → semantic group for fast lookup */
export const KIND_TO_GROUP: Record<string, SemanticGroup> = {};
for (const g of SEMANTIC_GROUPS) {
    for (const k of g.kinds) {
        KIND_TO_GROUP[k] = g;
    }
}

/** All valid ontology-defined kind names (flat set for fast lookup) */
export const VALID_ONTOLOGY_KINDS: Set<string> = new Set(Object.keys(KIND_TO_GROUP));

/** All valid ontology kinds sorted alphabetically (for dropdowns) */
export const VALID_ONTOLOGY_KINDS_SORTED: string[] = [...VALID_ONTOLOGY_KINDS].sort();

/**
 * Kinds the model builder synthesizes for native SysML v2 constructs
 * (`action def`, `action`, `item def`), each carrying a builder-assigned
 * layer. Per rulebook B1 behavior is modeled with native actions, so these
 * kinds are deliberately absent from the ontology packages — the explorer
 * groups them by the element's own layer instead of "Not in Ontology".
 */
export const BUILDER_SYNTHESIZED_KINDS: Set<string> = new Set([
    'ActionDefinition', 'ActionUsage', 'ItemDefinition',
]);

// ─── SysML v2 View Kind Metadata ────────────────────────────────────────────
// The eight standard spec view kinds — every diagram resolves to exactly one
// (Epic KK). The canonical diagramType → viewKind mapping lives in
// @memo/tools/browser (view-kinds.ts).

export interface ViewKindMeta {
    label: string;
    fullName: string;
    color: string;
}

export const VIEW_KIND_META: Record<ViewKind, ViewKindMeta> = {
    general:         { label: 'GEN',  fullName: 'General View',          color: '#7B68EE' },
    interconnection: { label: 'INT',  fullName: 'Interconnection View',  color: '#1ABC9C' },
    actionflow:      { label: 'ACT',  fullName: 'Action Flow View',      color: '#F39C12' },
    statetransition: { label: 'STM',  fullName: 'State Transition View', color: '#FF6B6B' },
    sequence:        { label: 'SEQ',  fullName: 'Sequence View',         color: '#3498DB' },
    grid:            { label: 'GRID', fullName: 'Grid View',             color: '#2ECC71' },
    browser:         { label: 'BRW',  fullName: 'Browser View',          color: '#95A5A6' },
    geometry:        { label: 'GEO',  fullName: 'Geometry View',         color: '#8E44AD' },
};

// ─── Diagram Type Metadata ──────────────────────────────────────────────────
// Legacy diagram type labels and colors for UI badges. Each key carries the
// spec view kind it resolves to. Diagram instances now come from config
// viewpoints (via model DTO), not from this file.

export interface DiagramTypeMeta {
    code: string;
    label: string;
    fullName: string;
    color: string;
    viewKind: ViewKind;
}

export const DIAGRAM_TYPE_META: Record<string, DiagramTypeMeta> = {
    bdd:  { code: 'BDD',  label: 'BDD',  fullName: 'Block Definition Diagram', color: '#7B68EE', viewKind: 'general' },
    ibd:  { code: 'IBD',  label: 'IBD',  fullName: 'Internal Block Diagram',   color: '#1ABC9C', viewKind: 'interconnection' },
    req:  { code: 'REQ',  label: 'REQ',  fullName: 'Requirements Diagram',     color: '#4A90D9', viewKind: 'general' },
    ucd:  { code: 'UCD',  label: 'UCD',  fullName: 'Use Case Diagram',         color: '#E67E22', viewKind: 'general' },
    act:  { code: 'ACT',  label: 'ACT',  fullName: 'Activity Diagram',         color: '#F39C12', viewKind: 'actionflow' },
    afd:  { code: 'AFD',  label: 'AFD',  fullName: 'Action Flow Diagram',      color: '#FF6B6B', viewKind: 'actionflow' },
    ofd:  { code: 'OFD',  label: 'OFD',  fullName: 'Operational Flow Diagram', color: '#F39C12', viewKind: 'actionflow' },
    ffd:  { code: 'FFD',  label: 'FFD',  fullName: 'Functional Flow Diagram',  color: '#F39C12', viewKind: 'actionflow' },
    pkg:  { code: 'PKG',  label: 'PKG',  fullName: 'Package Diagram',          color: '#95A5A6', viewKind: 'general' },
    par:  { code: 'PAR',  label: 'PAR',  fullName: 'Parametric Diagram',       color: '#2ECC71', viewKind: 'interconnection' },
    risk: { code: 'RISK', label: 'RISK', fullName: 'Risk Diagram',             color: '#E74C3C', viewKind: 'general' },
    stm:  { code: 'STM',  label: 'STM',  fullName: 'State Transition Diagram', color: '#FF6B6B', viewKind: 'statetransition' },
    seq:  { code: 'SEQ',  label: 'SEQ',  fullName: 'Sequence Diagram',         color: '#3498DB', viewKind: 'sequence' },
    fmea: { code: 'FMEA', label: 'FMEA', fullName: 'FMEA Matrix',              color: '#E74C3C', viewKind: 'grid' },
    alloc: { code: 'ALLOC', label: 'ALLOC', fullName: 'Allocation Matrix',     color: '#E67E22', viewKind: 'grid' },
    'threat-model': { code: 'THREAT', label: 'THREAT', fullName: 'Threat Model Diagram', color: '#C0392B', viewKind: 'general' },
};

export type ActionFlowDiagramType = 'afd' | 'ofd' | 'ffd';

/** One canonical resolver used by both the explorer badge and canvas header. */
export function resolveActionFlowDiagramType(
    diagram: { diagramType: string },
): ActionFlowDiagramType {
    const declared = diagram.diagramType.trim().toLowerCase();
    if (declared === 'ofd' || declared === 'ffd') return declared;
    return 'afd';
}

// ─── Containment Depth Colors ────────────────────────────────────────────────
// Background tints for nested containment diagram levels.

export const CONTAINMENT_DEPTH_COLORS = [
    '#FFFFFF',   // depth 0 — white
    '#f8fafc',   // depth 1 — slate-50
    '#f0f9ff',   // depth 2 — sky-50
    '#fdf2f8',   // depth 3 — pink-50
    '#f0fdf4',   // depth 4 — green-50
];

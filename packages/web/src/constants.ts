// ─── Shared Design Constants ─────────────────────────────────────────────────
//
// Single source of truth for CoSMA layer colors and design tokens.
// ─────────────────────────────────────────────────────────────────────────────

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
        kinds: ['UserNeed', 'SystemRequirement', 'SoftwareRequirement', 'HardwareRequirement',
            'DesignSpecification', 'OtherRequirement', 'Standard', 'RegulatoryRequirement'],
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
        kinds: ['SystemFunction', 'ComponentFunction'],
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
        kinds: ['Port', 'PortEthernet', 'PortUSB', 'PortSerial', 'PortPower',
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

// ─── Diagram Type Metadata ──────────────────────────────────────────────────
// SysML v2 diagram type labels and colors for UI badges.
// Diagram instances now come from config viewpoints (via model DTO),
// not from this file.

export interface DiagramTypeMeta {
    code: string;
    label: string;
    fullName: string;
    color: string;
}

export const DIAGRAM_TYPE_META: Record<string, DiagramTypeMeta> = {
    bdd:  { code: 'BDD',  label: 'BDD',  fullName: 'Block Definition Diagram', color: '#7B68EE' },
    ibd:  { code: 'IBD',  label: 'IBD',  fullName: 'Internal Block Diagram',   color: '#1ABC9C' },
    req:  { code: 'REQ',  label: 'REQ',  fullName: 'Requirements Diagram',     color: '#4A90D9' },
    ucd:  { code: 'UCD',  label: 'UCD',  fullName: 'Use Case Diagram',         color: '#E67E22' },
    act:  { code: 'ACT',  label: 'ACT',  fullName: 'Activity Diagram',         color: '#F39C12' },
    afd:  { code: 'AFD',  label: 'AFD',  fullName: 'Action Flow Diagram',      color: '#FF6B6B' },
    pkg:  { code: 'PKG',  label: 'PKG',  fullName: 'Package Diagram',          color: '#95A5A6' },
    par:  { code: 'PAR',  label: 'PAR',  fullName: 'Parametric Diagram',       color: '#2ECC71' },
    risk: { code: 'RISK', label: 'RISK', fullName: 'Risk Diagram',             color: '#E74C3C' },
};

// ─── Containment Depth Colors ────────────────────────────────────────────────
// Background tints for nested containment diagram levels.

export const CONTAINMENT_DEPTH_COLORS = [
    '#FFFFFF',   // depth 0 — white
    '#f8fafc',   // depth 1 — slate-50
    '#f0f9ff',   // depth 2 — sky-50
    '#fdf2f8',   // depth 3 — pink-50
    '#f0fdf4',   // depth 4 — green-50
];

// ─── Shared Design Constants ─────────────────────────────────────────────────
//
// Single source of truth for architecture layer colors and design tokens.
// ─────────────────────────────────────────────────────────────────────────────

import type { ViewKind } from '@memoarchitect/tools/browser';

export const LAYER_COLORS: Record<string, string> = {
    operational: '#0F766E',
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
    operational: 'Operational Analysis',
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

/**
 * Ontology order for the layers a *viewpoint* declares in `includedLayers`.
 *
 * This is a different vocabulary from LAYER_ORDER below, which orders the
 * layers an *element* belongs to. Mixing them is why viewpoints used to sort
 * arbitrarily: almost none of these names appear in LAYER_ORDER.
 *
 * The sequence is the ontology's own, read off the section order of the
 * viewpoint catalog in memo/src/viewpoints/catalog/memo_viewpoint_catalog.sysml
 * (VP-CAT-001…027): content and context → operational world → functional →
 * logical → implementation → interaction and behavior → assurance.
 */
export const VIEWPOINT_LAYER_ORDER = [
    'context',
    'operational',
    'system', 'system_of_systems',
    'functions',
    'logical_structure', 'logical', 'interfaces',
    'software_structure', 'hardware_structure', 'physical',
    'ui', 'behavior',
    'requirements', 'risk', 'cybersecurity', 'human_factors',
    'verification', 'assurance', 'architecture',
] as const;

export const LAYER_ORDER = [
    'operational', 'business', 'requirements', 'risk', 'functional', 'behavior', 'logical',
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

// ─── SysML v2 View Kind Metadata ────────────────────────────────────────────
// The eight standard spec view kinds — every diagram resolves to exactly one
// (Epic KK). The canonical diagramType → viewKind mapping lives in
// @memoarchitect/tools/browser (view-kinds.ts).

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
    context: { code: 'CTX', label: 'CTX', fullName: 'System Context Diagram',  color: '#5DADE2', viewKind: 'general' },
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

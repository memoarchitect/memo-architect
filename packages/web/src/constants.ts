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

/**
 * Sub-group order inside an explorer layer group.
 *
 * These are ONTOLOGY namespaces (the sub-group ids `buildKindToSubGroupMap`
 * produces), not the `layer` values in LAYER_ORDER above — a different
 * vocabulary again. Alphabetical order put Cybersecurity above Functional and
 * Verification above Logical, which is neither the order the methodology is
 * read in nor the order the layers are drawn in. Anything unlisted sorts after
 * these, alphabetically.
 */
export const EXPLORER_SUBGROUP_ORDER = [
    'operational', 'functional', 'behavior', 'logical', 'implementation', 'realization',
    'requirements', 'safety-risk', 'verification-validation', 'cybersecurity', 'human-factors',
] as const;

export const REL_COLORS: Record<string, string> = {
    mitigates: '#E74C3C',
    causes: '#C0392B',
    leadsTo: '#E74C3C',
    identifies: '#D35400',
    traceTo: '#4A90D9',
    satisfiedBy: '#2ECC71',
    verifiedBy: '#27AE60',
    allocatedTo: '#E67E22',
    aggregation: '#7B68EE',
    composedOf: '#8E44AD',
    decomposedBy: '#D35400',
    flow: '#3498DB',
    succession: '#95A5A6',
};

/**
 * A stable colour for any relationship type, named in REL_COLORS or not.
 *
 * The ontology declares far more relationships than the palette above names,
 * and it grows: hardcoding the list would silently render every new relation
 * the same grey, which in a matrix reads as "one kind of link" when it is not.
 * Unnamed types hash into a fixed palette instead — arbitrary, but stable
 * across reloads and distinct between neighbours, which is all a legend needs.
 */
const FALLBACK_REL_COLORS = [
    '#2563EB', '#0891B2', '#7C3AED', '#DB2777', '#EA580C',
    '#0D9488', '#65A30D', '#9333EA', '#C2410C', '#1D4ED8',
];

export function relationshipColor(type: string): string {
    const named = REL_COLORS[type];
    if (named) return named;
    let hash = 0;
    for (let index = 0; index < type.length; index++) {
        hash = (hash * 31 + type.charCodeAt(index)) >>> 0;
    }
    return FALLBACK_REL_COLORS[hash % FALLBACK_REL_COLORS.length];
}

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

/**
 * One monotone ramp for nested containment: the outermost level is darkest and
 * each level inside it is lighter, ending white at a block that holds nothing.
 *
 * Depth reads as recession — an inner box looks lifted out of the one holding
 * it, and a leaf, being white, reads as the surface rather than another
 * container. The earlier ramp ran the other way, darkening as it went deeper,
 * which buried the parts a reader is actually looking for under the heaviest
 * tint. The one before that cycled hues — slate, sky, pink, green — so a pink
 * box inside a blue one read as a category rather than a level.
 *
 * A block with no children is always white regardless of how deep it sits;
 * these tints are for containers. The ramp is clamped, not cycled, so a level
 * can never take the colour of one outside it.
 *
 * It is deliberately shallow — the outermost tint is only a few percent off
 * white, and each step closer again. A container is a backdrop for the blocks
 * inside it, so it has to sit behind them; the first attempt started at
 * `#D9DDE4`, which read as a filled slab and competed with its own contents.
 */
export const CONTAINMENT_DEPTH_COLORS = [
    '#ECEEF1',   // L0 — the outermost container, darkest of the ramp
    '#F1F3F5',
    '#F6F7F9',
    '#FAFBFC',
    '#FDFDFE',   // deeper levels clamp here
];

/** A block that holds nothing sits on the surface. */
export const CONTAINMENT_LEAF_COLOR = '#FFFFFF';

// ─── The ontology's own top-level split is the explorer's first level ───────
//
// `memo/src` divides into `architecture/` and `assurance/` before it divides
// into anything else, and that split is what a reader is orienting by first:
// what the device IS versus what is claimed ABOUT it. The construct is the
// category WITHIN that, so `Items` appears under both — InterfaceItem is
// architecture, Hazard is assurance — which is the distinction that was lost
// when every item shared one branch.
// ────────────────────────────────────────────────────────────────────────────

export const EXPLORER_DOMAIN_ORDER = [
    'architecture', 'assurance', 'artifacts', 'methodology', 'core',
] as const;

export const DOMAIN_LABELS: Record<string, string> = {
    architecture: 'Architecture',
    assurance: 'Assurance',
    artifacts: 'Artifacts',
    methodology: 'Methodology',
    core: 'Core',
};

export const DOMAIN_COLORS: Record<string, string> = {
    architecture: '#7B68EE',
    assurance: '#E74C3C',
    artifacts: '#0891B2',
    methodology: '#65A30D',
    core: '#6B7280',
};

/**
 * The domain a LAYER belongs to, for elements whose kind the ontology never
 * declared and which therefore have no namespace to read it from. Native SysML
 * kinds (`ItemDefinition`, `ActionDefinition`) arrive this way, and without
 * this every one of them would pile up outside both domains.
 */
export const LAYER_DOMAIN: Record<string, string> = {
    operational: 'architecture',
    functional: 'architecture',
    behavior: 'architecture',
    logical: 'architecture',
    implementation: 'architecture',
    realization: 'architecture',
    decisions: 'architecture',
    requirements: 'assurance',
    'safety-risk': 'assurance',
    cybersecurity: 'assurance',
    'verification-validation': 'assurance',
    'human-factors': 'assurance',
    artifacts: 'artifacts',
    methodology: 'methodology',
    core: 'core',
    // No layer at all. Enumerations are the only thing that reaches here once
    // views, viewpoints and connections are excluded, and the ontology keeps
    // them in `core/enumerations` — a value type belongs to neither the
    // architecture nor the claims made about it.
    '': 'core',
};

/**
 * Layer ids as the MODEL spells them, which is not how `LAYER_ORDER` spells
 * them: the builder emits `safety_risk` and `verification_validation`, while
 * `LAYER_ORDER` carries the viewpoint vocabulary's `risk` and `verification`
 * and never names `implementation`, `realization` or `core` at all. Rule 2
 * orders by the layer an element actually reports, so it needs this list.
 * Compared with separators normalised, so `safety_risk` and `safety-risk`
 * are one entry. Anything unlisted sorts after these, alphabetically.
 */
export const EXPLORER_LAYER_ORDER = [
    'core', 'operational', 'functional', 'behavior', 'logical',
    'implementation', 'realization', 'requirements', 'safety-risk',
    'verification-validation', 'cybersecurity', 'human-factors', 'methodology',
] as const;

/** `safety_risk`, `safety-risk` and `Safety Risk` are the same layer. */
export const normalizeLayerId = (layer: string): string =>
    layer.trim().toLowerCase().replace(/[\s_]+/g, '-');

// ─── SysML v2 Edge Style Registry ─────────────────────────────────────────────
//
// Maps connection def names → visual styles for relationship visualization.
// Every one of the 72 connector types in ontology-core + ontology-medical is
// covered here. Unlisted types fall back to their category default.
//
// Marker names match IDs defined in the SVG <defs> block in RelationshipOverlay.
// ─────────────────────────────────────────────────────────────────────────────

export type LineStyle   = 'solid' | 'dashed';
export type SourceMarker = 'none' | 'diamond-open' | 'diamond-filled';
export type TargetMarker = 'arrow' | 'triangle-open' | 'filled-arrow' | 'circle' | 'none';
export type EdgeCategory = 'structural' | 'dependency' | 'behavioral' | 'domain';

export interface SysmlEdgeStyle {
    lineStyle: LineStyle;
    sourceMarker: SourceMarker;
    targetMarker: TargetMarker;
    /** SysML stereotype label shown in guillemets, e.g. "satisfy" */
    stereotype?: string;
    category: EdgeCategory;
    color: string;
    domain: string;       // human-readable domain name (for grouping)
    domainColor: string;  // chip/header background
}

// ─── Domain color palette (matches draw.io ontology reference) ────────────────

export const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    core:          { bg: '#E5E7EB', text: '#374151' },
    risk:          { bg: '#f8cecc', text: '#991b1b' },
    clinical:      { bg: '#cce5ff', text: '#1e40af' },
    operations:    { bg: '#d5e8d4', text: '#166534' },
    fmea:          { bg: '#ffe6cc', text: '#92400e' },
    cybersecurity: { bg: '#e1d5e7', text: '#6b21a8' },
    privacy:       { bg: '#dae8fc', text: '#1d4ed8' },
    dhf:           { bg: '#fff2cc', text: '#78350f' },
    usability:     { bg: '#fce7f3', text: '#9d174d' },
};

// ─── Edge stroke colors per category/domain ──────────────────────────────────

const C = {
    grey:          '#9CA3AF',
    structuralBlue: '#374151',
    risk:          '#DC2626',
    clinical:      '#3B82F6',
    ops:           '#16A34A',
    fmea:          '#D97706',
    cyber:         '#7C3AED',
    privacy:       '#2563EB',
    dhf:           '#B45309',
    usability:     '#DB2777',
};

// ─── Helper to build an entry ─────────────────────────────────────────────────

function e(
    domain: keyof typeof DOMAIN_COLORS,
    category: EdgeCategory,
    lineStyle: LineStyle,
    sourceMarker: SourceMarker,
    targetMarker: TargetMarker,
    color: string,
    stereotype?: string,
): SysmlEdgeStyle {
    return {
        lineStyle, sourceMarker, targetMarker, stereotype,
        category, color,
        domain, domainColor: DOMAIN_COLORS[domain].bg,
    };
}

// ─── Style registry ───────────────────────────────────────────────────────────

export const EDGE_STYLES: Record<string, SysmlEdgeStyle> = {
    // ── Core SysML structural ──────────────────────────────────────────────────
    Aggregation:      e('core', 'structural',  'solid',  'diamond-open',   'none',          C.structuralBlue),
    ComposedOf:       e('core', 'structural',  'solid',  'diamond-filled', 'none',          C.structuralBlue),
    DecomposedBy:     e('core', 'structural',  'solid',  'diamond-open',   'none',          C.structuralBlue),
    Association:      e('core', 'structural',  'solid',  'none',           'arrow',         C.grey),

    // ── Core SysML behavioral ─────────────────────────────────────────────────
    Flow:             e('core', 'behavioral',  'solid',  'none',           'filled-arrow',  C.structuralBlue),
    Succession:       e('core', 'behavioral',  'solid',  'none',           'arrow',         C.structuralBlue),
    ExposesInterface: e('core', 'behavioral',  'solid',  'none',           'circle',        C.grey),

    // ── Core SysML dependency / trace ─────────────────────────────────────────
    Extends:          e('core', 'dependency',  'dashed', 'none',           'triangle-open', C.grey,          'extends'),
    Realization:      e('core', 'dependency',  'dashed', 'none',           'triangle-open', C.grey),
    Dependency:       e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey),
    TraceTo:          e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'trace'),
    Refines:          e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'refine'),
    Derives:          e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'deriveReqt'),
    Satisfy:          e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'satisfy'),
    Verify:           e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'verify'),
    AllocateTo:       e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'allocate'),
    Constrains:       e('core', 'dependency',  'dashed', 'none',           'arrow',         C.grey,          'constrain'),

    // ── Risk chain (ISO 14971) ────────────────────────────────────────────────
    Mitigates:                    e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    Causes:                       e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    LeadsTo:                      e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    Identifies:                   e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    TriggersHazardousSituation:   e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    PlansRiskManagement:          e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    AssessesResidualRisk:         e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    WeighsAgainstBenefit:         e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    ConcludesBenefitRisk:         e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    ConcludesOverallResidualRisk: e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),
    MonitorsRiskSubject:          e('risk', 'domain', 'dashed', 'none', 'arrow', C.risk),

    // ── Clinical ──────────────────────────────────────────────────────────────
    PlansClinicalEvaluation:  e('clinical', 'domain', 'dashed', 'none', 'arrow', C.clinical),
    EvaluatesClinicalClaim:   e('clinical', 'domain', 'dashed', 'none', 'arrow', C.clinical),
    SupportsClinicalClaim:    e('clinical', 'domain', 'dashed', 'none', 'arrow', C.clinical),
    ClaimsClinicalBenefit:    e('clinical', 'domain', 'dashed', 'none', 'arrow', C.clinical),
    ClaimsForUse:             e('clinical', 'domain', 'dashed', 'none', 'arrow', C.clinical),

    // ── Operations (manufacturing / installation / service) ───────────────────
    ManufacturesSubject:  e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),
    InstallsSubject:      e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),
    ServicesSubject:      e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),
    MaintainsSubject:     e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),
    CalibratesSubject:    e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),
    QualifiesInstallation:e('operations', 'domain', 'dashed', 'none', 'arrow', C.ops),

    // ── FMEA / FTA ────────────────────────────────────────────────────────────
    AnalyzesFailureMode:   e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    HasFailureCause:       e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    ResultsInFailureEffect:e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    EscalatesToRisk:       e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    DetectsFailureMode:    e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    DefinesTopEvent:       e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    UsesGate:              e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    ContributesToEvent:    e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),
    ContributesToHazard:   e('fmea', 'domain', 'dashed', 'none', 'arrow', C.risk),
    TriggersHazardousSituationFmea: e('fmea', 'domain', 'dashed', 'none', 'arrow', C.fmea),

    // ── Cybersecurity ────────────────────────────────────────────────────────
    ModelsThreat:          e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    ThreatensAsset:        e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    ExploitsVulnerability: e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    MitigatesThreat:       e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    SecuresInterface:      e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    MaintainsSbom:         e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    SupportsSecureUpdate:  e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),
    ClassifiesData:        e('cybersecurity', 'domain', 'dashed', 'none', 'arrow', C.cyber),

    // ── Privacy ───────────────────────────────────────────────────────────────
    ProcessesData:                e('privacy', 'domain', 'dashed', 'none', 'arrow', C.privacy),
    ProvidesPrivacyNotice:        e('privacy', 'domain', 'dashed', 'none', 'arrow', C.privacy),
    AssessesPrivacyImpact:        e('privacy', 'domain', 'dashed', 'none', 'arrow', C.privacy),
    RespondsToDataSubjectRequest: e('privacy', 'domain', 'dashed', 'none', 'arrow', C.privacy),

    // ── DHF / QMS ─────────────────────────────────────────────────────────────
    GovernsActivity:          e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    ProducesWorkProduct:      e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    Evidences:                e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    Documents:                e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    EvaluatesRequirement:     e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    AppliesStandardRequirement:e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    ImplementsRiskControl:    e('dhf', 'domain', 'dashed', 'none', 'arrow', C.dhf),
    ProtectsEssentialPerformance: e('dhf', 'domain', 'dashed', 'none', 'arrow', C.risk),

    // ── Usability (IEC 62366) ─────────────────────────────────────────────────
    AddressesUseError:        e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    AnalyzesUseError:         e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    ExposesUseError:          e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    SpecifiesScenario:        e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    Preserves:                e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    SupportsOperatingFunction:e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
    DefinesLossCondition:     e('usability', 'domain', 'dashed', 'none', 'arrow', C.usability),
};

// ─── Category fallback defaults ───────────────────────────────────────────────

const CATEGORY_DEFAULTS: Record<EdgeCategory, SysmlEdgeStyle> = {
    structural: e('core', 'structural', 'solid',  'none', 'arrow',  C.grey),
    dependency: e('core', 'dependency', 'dashed', 'none', 'arrow',  C.grey),
    behavioral: e('core', 'behavioral', 'solid',  'none', 'filled-arrow', C.structuralBlue),
    domain:     e('core', 'domain' as never, 'dashed', 'none', 'arrow', C.grey),
};

/** Get the edge style for a connection def name. Falls back to category default. */
export function getEdgeStyle(name: string): SysmlEdgeStyle {
    return EDGE_STYLES[name] ?? CATEGORY_DEFAULTS.domain;
}

// ─── Domain group definitions (for the filter list) ──────────────────────────

export interface DomainGroup {
    id: string;
    label: string;
    color: { bg: string; text: string };
    types: string[];
}

export const DOMAIN_GROUPS: DomainGroup[] = [
    {
        id: 'core',
        label: 'Core SysML',
        color: DOMAIN_COLORS.core,
        types: [
            'Aggregation', 'ComposedOf', 'DecomposedBy', 'Association',
            'Flow', 'Succession', 'ExposesInterface',
            'Extends', 'Realization', 'Dependency', 'TraceTo', 'Refines', 'Derives',
            'Satisfy', 'Verify', 'AllocateTo', 'Constrains',
        ],
    },
    {
        id: 'risk',
        label: 'Risk Chain (ISO 14971)',
        color: DOMAIN_COLORS.risk,
        types: [
            'Mitigates', 'Causes', 'LeadsTo', 'Identifies',
            'TriggersHazardousSituation', 'PlansRiskManagement',
            'AssessesResidualRisk', 'WeighsAgainstBenefit',
            'ConcludesBenefitRisk', 'ConcludesOverallResidualRisk', 'MonitorsRiskSubject',
        ],
    },
    {
        id: 'clinical',
        label: 'Clinical',
        color: DOMAIN_COLORS.clinical,
        types: [
            'PlansClinicalEvaluation', 'EvaluatesClinicalClaim',
            'SupportsClinicalClaim', 'ClaimsClinicalBenefit', 'ClaimsForUse',
        ],
    },
    {
        id: 'fmea',
        label: 'FMEA / FTA',
        color: DOMAIN_COLORS.fmea,
        types: [
            'AnalyzesFailureMode', 'HasFailureCause', 'ResultsInFailureEffect',
            'EscalatesToRisk', 'DetectsFailureMode', 'DefinesTopEvent',
            'UsesGate', 'ContributesToEvent', 'ContributesToHazard',
        ],
    },
    {
        id: 'cybersecurity',
        label: 'Cybersecurity',
        color: DOMAIN_COLORS.cybersecurity,
        types: [
            'ModelsThreat', 'ThreatensAsset', 'ExploitsVulnerability',
            'MitigatesThreat', 'SecuresInterface', 'MaintainsSbom',
            'SupportsSecureUpdate', 'ClassifiesData',
        ],
    },
    {
        id: 'usability',
        label: 'Usability (IEC 62366)',
        color: DOMAIN_COLORS.usability,
        types: [
            'AddressesUseError', 'AnalyzesUseError', 'ExposesUseError',
            'SpecifiesScenario', 'Preserves', 'SupportsOperatingFunction', 'DefinesLossCondition',
        ],
    },
    {
        id: 'privacy',
        label: 'Privacy',
        color: DOMAIN_COLORS.privacy,
        types: [
            'ProcessesData', 'ProvidesPrivacyNotice',
            'AssessesPrivacyImpact', 'RespondsToDataSubjectRequest',
        ],
    },
    {
        id: 'dhf',
        label: 'DHF / QMS',
        color: DOMAIN_COLORS.dhf,
        types: [
            'GovernsActivity', 'ProducesWorkProduct', 'Evidences', 'Documents',
            'EvaluatesRequirement', 'AppliesStandardRequirement',
            'ImplementsRiskControl', 'ProtectsEssentialPerformance',
        ],
    },
    {
        id: 'operations',
        label: 'Operations',
        color: DOMAIN_COLORS.operations,
        types: [
            'ManufacturesSubject', 'InstallsSubject', 'ServicesSubject',
            'MaintainsSubject', 'CalibratesSubject', 'QualifiesInstallation',
        ],
    },
];

// ─── Short ID helpers (web-side copy) ────────────────────────────────────────
//
// Duplicates kindToPrefix / prefixToFamily from @memo/core so the web bundle
// never imports runtime code from core (core uses node:fs which can't run in
// a browser). Keep in sync with memo-tools/packages/core/src/model/short-id.ts.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_PREFIX_OVERRIDES: Record<string, string> = {
    Hazard: 'HZD', HazardousEvent: 'HZD-EVT', HazardousSituation: 'HZD-SIT',
    Risk: 'RISK', RiskControl: 'RISK-CTL', MitigationMeasure: 'MIT', ResidualRisk: 'RRISK',
    StakeholderRequirement: 'STK-REQ', Requirement: 'REQ',
    SoftwareSpecification: 'SW-SPEC', InterfaceRequirement: 'REQ',
    PerformanceRequirement: 'PERF-REQ', SafetyRequirement: 'SAF-REQ',
    RegulatoryRequirement: 'REG-REQ', FunctionalRequirement: 'REQ',
    NonFunctionalRequirement: 'NFR',
    SystemComponent: 'SYS-COMP', SoftwareComponent: 'SW-COMP', HardwareComponent: 'HW-COMP',
    Subsystem: 'SUBSYS', Module: 'MOD', Interface: 'IF', Port: 'PORT',
    Action: 'ACT', ActionDefinition: 'ACT-DEF', UseCase: 'UC',
    Stakeholder: 'STK', OperationalScenario: 'OPS', Mission: 'MSNS', Capability: 'CAP',
    DesignInput: 'DI', DesignOutput: 'DO', VerificationActivity: 'VER',
    ValidationActivity: 'VAL', TestCase: 'TC',
    Item: 'ITM', Part: 'PART',
};

function abbreviateWord(word: string): string {
    if (word.length <= 3) return word.toUpperCase();
    return (word[0] + word.slice(1).replace(/[aeiouAEIOU]/g, '')).slice(0, 3).toUpperCase();
}

export function kindToPrefix(kind: string): string {
    if (KIND_PREFIX_OVERRIDES[kind]) return KIND_PREFIX_OVERRIDES[kind];
    const words = kind.replace(/([A-Z])/g, ' $1').trim().split(' ').filter(Boolean);
    return words.length === 0 ? 'EL' : words.map(abbreviateWord).join('-');
}

export function prefixToFamily(prefix: string): string {
    return prefix.split('-')[0];
}

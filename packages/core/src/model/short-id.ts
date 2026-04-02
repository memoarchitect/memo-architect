// ─── Short ID generation for MEMO elements ───────────────────────────────────
//
// Generates stable, human-readable short IDs in the form {KIND-PREFIX}-{SEQ},
// e.g. "SW-REQ-4291", "HZD-1823", "SYS-COMP-7432".
//
// The prefix is derived deterministically from the kind name (CamelCase split).
// The sequence number is a hash of the element's SysML id — stable across
// rebuilds as long as the element name in the source file doesn't change.
//
// URL family = first segment of the prefix (SW-REQ → SW, HZD → HZD).
// This determines the grouping in /catalog/:family/ routes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Well-known overrides for common medical-device kinds.
 * Auto-generation handles everything else.
 */
const KIND_PREFIX_OVERRIDES: Record<string, string> = {
    // Risk
    Hazard: 'HZD',
    HazardousEvent: 'HZD-EVT',
    HazardousSituation: 'HZD-SIT',
    Risk: 'RISK',
    RiskControl: 'RISK-CTL',
    MitigationMeasure: 'MIT',
    ResidualRisk: 'RRISK',
    // Requirements
    StakeholderRequirement: 'STK-REQ',
    SystemRequirement: 'SYS-REQ',
    SoftwareRequirement: 'SW-REQ',
    HardwareRequirement: 'HW-REQ',
    SoftwareSpecification: 'SW-SPEC',
    InterfaceRequirement: 'IF-REQ',
    PerformanceRequirement: 'PERF-REQ',
    SafetyRequirement: 'SAF-REQ',
    RegulatoryRequirement: 'REG-REQ',
    FunctionalRequirement: 'FUNC-REQ',
    NonFunctionalRequirement: 'NFR',
    // Architecture
    SystemComponent: 'SYS-COMP',
    SoftwareComponent: 'SW-COMP',
    HardwareComponent: 'HW-COMP',
    Subsystem: 'SUBSYS',
    Module: 'MOD',
    Interface: 'IF',
    Port: 'PORT',
    // Actions / behavior
    Action: 'ACT',
    ActionDefinition: 'ACT-DEF',
    UseCase: 'UC',
    // Operational
    Stakeholder: 'STK',
    OperationalScenario: 'OPS',
    Mission: 'MSNS',
    Capability: 'CAP',
    // Compliance / DHF
    DesignInput: 'DI',
    DesignOutput: 'DO',
    VerificationActivity: 'VER',
    ValidationActivity: 'VAL',
    TestCase: 'TC',
    // Generic fallbacks
    Item: 'ITM',
    Part: 'PART',
};

/**
 * Split a CamelCase string into its constituent words.
 * e.g. "SoftwareRequirement" → ["Software", "Requirement"]
 */
function splitCamelCase(s: string): string[] {
    return s.replace(/([A-Z])/g, ' $1').trim().split(' ').filter(Boolean);
}

/**
 * Abbreviate a single word to a short prefix token.
 * Takes the first 2-3 letters, removing vowels if >3 chars.
 */
function abbreviateWord(word: string): string {
    if (word.length <= 3) return word.toUpperCase();
    // Drop interior vowels to get consonant abbreviation
    const consonants = word[0] + word.slice(1).replace(/[aeiouAEIOU]/g, '');
    return consonants.slice(0, 3).toUpperCase();
}

/**
 * Derive a kind prefix from a kind name using CamelCase splitting + abbreviation.
 * e.g. "SoftwareRequirement" → "SW-REQ", "Hazard" → "HZD"
 */
function derivePrefix(kind: string): string {
    const words = splitCamelCase(kind);
    if (words.length === 0) return 'EL';
    return words.map(abbreviateWord).join('-');
}

/**
 * Get the kind prefix for an element kind.
 * Returns a well-known override if available, otherwise auto-derives from CamelCase.
 */
export function kindToPrefix(kind: string): string {
    return KIND_PREFIX_OVERRIDES[kind] ?? derivePrefix(kind);
}

/**
 * The URL family segment — first hyphen-separated token of the prefix.
 * e.g. "SW-REQ" → "SW", "HZD-EVT" → "HZD", "SYS-COMP" → "SYS"
 */
export function prefixToFamily(prefix: string): string {
    return prefix.split('-')[0];
}

/**
 * djb2 hash — fast, non-cryptographic, deterministic.
 * Produces a stable 32-bit integer for any string.
 */
function djb2(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) ^ s.charCodeAt(i);
        h = h >>> 0; // keep unsigned 32-bit
    }
    return h;
}

/**
 * Generate a stable 4-digit sequence number from an element id.
 * Range: 1000–9999 (always 4 digits).
 */
function sequenceNumber(elementId: string): number {
    return (djb2(elementId) % 9000) + 1000;
}

/**
 * Generate the short ID for a MemoElement.
 * Format: {KIND-PREFIX}-{4-digit-hash}
 * e.g. "SW-REQ-4291", "HZD-1823", "SYS-COMP-7432"
 */
export function generateShortId(kind: string, elementId: string): string {
    const prefix = kindToPrefix(kind);
    const seq = sequenceNumber(elementId);
    return `${prefix}-${seq}`;
}

/**
 * Parse a shortId back to its prefix and sequence components.
 * e.g. "SW-REQ-4291" → { prefix: "SW-REQ", seq: 4291 }
 * Returns null if the format is unrecognised.
 */
export function parseShortId(shortId: string): { prefix: string; seq: number } | null {
    const match = shortId.match(/^(.+)-(\d{4})$/);
    if (!match) return null;
    return { prefix: match[1], seq: parseInt(match[2], 10) };
}

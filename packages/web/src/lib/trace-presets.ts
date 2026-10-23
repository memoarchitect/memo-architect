// ─── Quick traces ─────────────────────────────────────────────────────────────
//
// The traces a medical device file is asked for, one click each. A preset is only data (rows and columns, each
// a set of types or a memo-query); the registry holds them and can be extended with more without changing
// what is here, so a project with its own traces adds them where it configures the screen.

import type { AxisSelection } from './trace-axis';

export interface TracePreset {
    id: string;
    label: string;
    rows: AxisSelection;
    columns: AxisSelection;
}

export class TracePresetRegistry {
    constructor(private readonly presets: readonly TracePreset[]) {
        const ids = new Set<string>();
        for (const preset of presets) {
            if (ids.has(preset.id)) throw new Error(`Two quick traces are called "${preset.id}".`);
            ids.add(preset.id);
        }
    }

    all(): readonly TracePreset[] {
        return this.presets;
    }

    find(id: string): TracePreset | undefined {
        return this.presets.find(preset => preset.id === id);
    }

    /** A registry with these added after the ones here. */
    extendedWith(more: readonly TracePreset[]): TracePresetRegistry {
        return new TracePresetRegistry([...this.presets, ...more]);
    }
}

/** The requirements declared with this `requirementType` (software, hardware, system), as a memo-query. */
export const requirementsOfType = (type: 'system' | 'software' | 'hardware'): AxisSelection => ({
    kinds: [], query: `kind: Requirement\nwhere: requirementType == "RequirementTypeKind::${type}"`, advanced: true,
});

export const typesOf = (...kinds: string[]): AxisSelection => ({ kinds, query: '' });

/**
 * Risk, as a software trace means it: the hazards of the hazard analysis. A failure mode is a row of the hardware
 * design FMEA, so it belongs to a hardware trace; leaving it out of a software one is what keeps hardware risks from
 * showing under software requirements, although Matrix links some software requirements to FMEA rows.
 */
const RISK = ['Hazard'];
/** Risk, as a hardware trace means it: the hazards, and the failure modes of the hardware design FMEA. */
const HARDWARE_RISK = ['Hazard', 'FailureMode'];

export const DEFAULT_TRACE_PRESETS = new TracePresetRegistry([
    { id: 'need-system', label: 'User need → System requirement', rows: typesOf('Need'), columns: requirementsOfType('system') },
    { id: 'need-software', label: 'User need → Software requirement', rows: typesOf('Need'), columns: requirementsOfType('software') },
    { id: 'need-hardware', label: 'User need → Hardware requirement', rows: typesOf('Need'), columns: requirementsOfType('hardware') },
    { id: 'risk-software', label: 'Risk → Software requirement', rows: typesOf(...RISK), columns: requirementsOfType('software') },
    { id: 'risk-hardware', label: 'Risk → Hardware requirement', rows: typesOf(...HARDWARE_RISK), columns: requirementsOfType('hardware') },
    { id: 'software-need-risk', label: 'Software requirement → User need and Risk', rows: requirementsOfType('software'), columns: typesOf('Need', ...RISK) },
    { id: 'hardware-need-risk', label: 'Hardware requirement → User need and Risk', rows: requirementsOfType('hardware'), columns: typesOf('Need', ...HARDWARE_RISK) },
    { id: 'requirement-test', label: 'Requirement → Test case', rows: typesOf('Requirement'), columns: typesOf('VerificationCase') },
]);

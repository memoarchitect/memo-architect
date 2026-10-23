import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACE_PRESETS, TracePresetRegistry, requirementsOfType, typesOf } from '../trace-presets';
import { axisToQuery } from '../trace-axis';

describe('TracePresetRegistry', () => {
    const a = { id: 'a', label: 'A', rows: typesOf('Need'), columns: typesOf('Requirement') };
    const b = { id: 'b', label: 'B', rows: typesOf('Requirement'), columns: typesOf('VerificationCase') };

    it('holds its presets in order and finds one by id', () => {
        const registry = new TracePresetRegistry([a, b]);
        expect(registry.all().map(preset => preset.id)).toEqual(['a', 'b']);
        expect(registry.find('b')).toBe(b);
        expect(registry.find('missing')).toBeUndefined();
    });

    it('refuses two with the same id', () => {
        expect(() => new TracePresetRegistry([a, { ...b, id: 'a' }])).toThrow(/"a"/);
    });

    it('is extended without changing the original', () => {
        const base = new TracePresetRegistry([a]);
        const more = base.extendedWith([b]);
        expect(base.all()).toHaveLength(1);
        expect(more.all().map(preset => preset.id)).toEqual(['a', 'b']);
    });
});

describe('the default quick traces', () => {
    it('are the traces a medical device file is asked for, each with rows and columns', () => {
        expect(DEFAULT_TRACE_PRESETS.all().map(preset => preset.label)).toEqual(expect.arrayContaining([
            'User need → System requirement', 'User need → Software requirement', 'User need → Hardware requirement',
            'Risk → Software requirement', 'Risk → Hardware requirement',
        ]));
        for (const preset of DEFAULT_TRACE_PRESETS.all()) {
            for (const axis of [preset.rows, preset.columns]) expect(axisToQuery(axis)).not.toBe('');
        }
    });

    it('split software, hardware and system requirements by their declared type', () => {
        const queryOf = (id: string) => DEFAULT_TRACE_PRESETS.find(id)!.columns.query;
        expect(queryOf('need-software')).toContain('requirementType == "RequirementTypeKind::software"');
        expect(queryOf('need-hardware')).toContain('RequirementTypeKind::hardware');
        expect(queryOf('need-system')).toContain('RequirementTypeKind::system');
        expect(requirementsOfType('software').advanced).toBe(true);
    });

    it('can trace several kinds at once', () => {
        expect(DEFAULT_TRACE_PRESETS.find('hardware-need-risk')!.columns.kinds).toEqual(expect.arrayContaining(['Need', 'Hazard', 'FailureMode']));
    });

    it('keeps the hardware FMEA\'s failure modes out of a software trace, and in a hardware one', () => {
        const kindsOf = (id: string) => [...DEFAULT_TRACE_PRESETS.find(id)!.rows.kinds, ...DEFAULT_TRACE_PRESETS.find(id)!.columns.kinds];
        for (const id of ['risk-software', 'software-need-risk']) {
            expect(kindsOf(id)).toContain('Hazard');
            expect(kindsOf(id)).not.toContain('FailureMode');
        }
        for (const id of ['risk-hardware', 'hardware-need-risk']) expect(kindsOf(id)).toEqual(expect.arrayContaining(['Hazard', 'FailureMode']));
    });
});

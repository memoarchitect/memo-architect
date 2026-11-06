import { describe, expect, it } from 'vitest';
import { EMPTY_AXIS, noMatchMessage } from '../trace-axis';
import { requirementsOfType, typesOf } from '../trace-presets';

describe('noMatchMessage', () => {
    it('says which chosen axis matched nothing', () => {
        expect(noMatchMessage({ axis: typesOf('Need'), count: 45 }, { axis: requirementsOfType('system'), count: 0 }, null))
            .toBe('No element in this model matches the columns, so there is nothing to trace.');
    });

    it('names the system and both axes when neither matched', () => {
        expect(noMatchMessage({ axis: typesOf('Need'), count: 0 }, { axis: typesOf('Risk'), count: 0 }, 'System A'))
            .toBe('No element in System A matches the rows or the columns, so there is nothing to trace.');
    });

    it('leaves an axis that is not chosen yet to the builder', () => {
        expect(noMatchMessage({ axis: EMPTY_AXIS, count: 0 }, { axis: typesOf('Risk'), count: 0 }, null)).toBeNull();
    });

    it('is null when both axes selected something', () => {
        expect(noMatchMessage({ axis: typesOf('Need'), count: 1 }, { axis: typesOf('Risk'), count: 2 }, null)).toBeNull();
    });
});

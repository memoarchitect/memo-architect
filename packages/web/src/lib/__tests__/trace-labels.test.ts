import { describe, expect, it } from 'vitest';
import { elementLabel } from '../trace-labels';

describe('elementLabel', () => {
    it('leads with the id the model shows, which is the reference the import authored', () => {
        expect(elementLabel({ displayId: 'SPEC-1059', shortId: 'REQ-2381', name: 'Ability to change 3D view' }, 'x')).toBe('SPEC-1059 Ability to change 3D view');
        expect(elementLabel({ displayId: 'REQ-156', shortId: 'NDX-104', name: 'Display data' }, 'x')).toBe('REQ-156 Display data');
    });

    it('falls back to the short id, then to the title alone', () => {
        expect(elementLabel({ shortId: 'HZD-1', name: 'Fire' }, 'x')).toBe('HZD-1 Fire');
        expect(elementLabel({ name: 'Fire' }, 'x')).toBe('Fire');
    });

    it('does not say the id twice', () => {
        expect(elementLabel({ displayId: 'SPEC-7', name: 'SPEC-7 Pace routing' }, 'x')).toBe('SPEC-7 Pace routing');
    });

    it('names an element that is not in the model by the id it was asked for', () => {
        expect(elementLabel(undefined, 'ghost_1')).toBe('ghost_1');
    });
});

import { describe, expect, it } from 'vitest';
import { isRemovable } from '../relationship-removable';

describe('isRemovable', () => {
    const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } } as never;

    it('accepts a named declaration', () => {
        expect(isRemovable({ named: true })).toBe(true);
    });

    it('accepts an anonymous statement the compile recorded a range for', () => {
        expect(isRemovable({ named: false, sourceRange: range })).toBe(true);
    });

    it('refuses one with neither a name nor a range', () => {
        expect(isRemovable({ named: false })).toBe(false);
        expect(isRemovable({})).toBe(false);
    });
});

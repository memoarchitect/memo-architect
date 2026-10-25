import { describe, expect, it } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { columnCell, columnLabel, parseColumns } from '../query-columns';

const table = {
    prefixes: { milli: 0.001 },
    units: { second: { factor: 1, powers: { s: 1 } }, s: { factor: 1, powers: { s: 1 } }, kilogram: { factor: 1000, powers: { g: 1 } } },
    symbols: { prefixes: {}, units: {} },
};
const element = (attributes: Record<string, string>) => ({ id: 'a', name: 'Loop', kind: 'SoftwareComponent', layer: 'implementation', attributes }) as unknown as MemoElement;

describe('preview columns', () => {
    it('reads a field and an optional unit', () => {
        expect(parseColumns('name, wcetMs in milli*second')).toEqual([{ field: 'name' }, { field: 'wcetMs', unit: 'milli*second' }]);
        expect(parseColumns('')).toBeUndefined();
        expect(columnLabel({ field: 'wcetMs', unit: 'milli*second' })).toBe('wcetMs (milli*second)');
    });

    it('shows each quantity in the named unit, with the shipped table', () => {
        const unit = { field: 'wcetMs', unit: 'milli*second' };
        expect(columnCell(element({ wcetMs: '1 [s]' }), unit, table)).toBe('1000');
        expect(columnCell(element({ wcetMs: '2.5 [milli*second]' }), unit, table)).toBe('2.5');
        expect(columnCell(element({}), unit, table)).toBe('—');
        expect(columnCell(element({ wcetMs: 'fast' }), unit, table)).toMatch(/not a quantity/);
        expect(columnCell(element({ wcetMs: '2 [kilogram]' }), unit, table)).toMatch(/not a quantity in milli\*second/);
        expect(columnCell(element({}), { field: 'name' }, table)).toBe('Loop');
    });
});

import { describe, expect, it } from 'vitest';
import { joinAxis, limitFor, type AxisEvaluation } from '../axis-evaluation';
import { MATRIX_LIMITS } from '../matrix-views';

const axis = (count: number, withIds = true): AxisEvaluation => ({
    query: 'kind: X', count, ...(withIds ? { ids: Array.from({ length: count }, (_, i) => `e${i}`) } : {}), preview: [],
});

describe('joinAxis', () => {
    it('is the picked ids when there is no query', () => {
        expect(joinAxis(['a', 'a', 'b'], undefined)).toMatchObject({ count: 2, ids: ['a', 'b'] });
    });
    it('unites picked ids with matched ones', () => {
        const joined = joinAxis(['a', 'b'], { count: 2, ids: ['b', 'c'], preview: [] });
        expect(joined.ids).toEqual(['a', 'b', 'c']);
        expect(joined.count).toBe(3);
    });
    it('keeps the count of a query too large to send, and withholds the ids', () => {
        const joined = joinAxis([], { count: 9000, preview: [] });
        expect(joined.count).toBe(9000);
        expect(joined.ids).toBeUndefined();
    });
    it('carries the query error', () => {
        expect(joinAxis([], { count: 0, preview: [], error: 'bad' }).error).toBe('bad');
    });
});

describe('limitFor', () => {
    const limits = { ...MATRIX_LIMITS, traceabilityMaxCells: 20_000, dsmMaxElements: 100 };
    it('allows a traceability product within the cap', () => {
        expect(limitFor('traceability', axis(100), axis(100), limits)).toBeNull();
    });
    it('refuses a traceability product above the cap and says what to do', () => {
        const message = limitFor('traceability', axis(300), axis(100), limits);
        expect(message).toMatch(/30,000 cells/);
        expect(message).toMatch(/Narrow/);
    });
    it('refuses an axis that is too large to list', () => {
        expect(limitFor('traceability', axis(9000, false), axis(10), limits)).toMatch(/Narrow its query/);
    });
    it('limits a DSM by its element count, from the configured limit', () => {
        expect(limitFor('dsm', axis(100), axis(100), limits)).toBeNull();
        expect(limitFor('dsm', axis(101), axis(101), limits)).toMatch(/supports up to 100 elements for now/);
        expect(limitFor('dsm', axis(150), axis(150), { ...limits, dsmMaxElements: 200 })).toBeNull();
    });
    it('leaves a query error to the axis that has it', () => {
        expect(limitFor('traceability', { ...axis(0), error: 'bad' }, axis(10), limits)).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';
import { joinAxis, refusalFor, type AxisEvaluation } from '../axis-evaluation';

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

describe('refusalFor', () => {
    it('allows a product within the cap', () => {
        expect(refusalFor(axis(100), axis(100), 20_000)).toBeNull();
    });
    it('refuses a product above the cap and says what to do', () => {
        const message = refusalFor(axis(300), axis(100), 20_000);
        expect(message).toMatch(/30,000 cells/);
        expect(message).toMatch(/Narrow/);
    });
    it('refuses an axis that is too large to list', () => {
        expect(refusalFor(axis(9000, false), axis(10), 20_000)).toMatch(/Narrow its query/);
    });
    it('leaves a query error to the axis that has it', () => {
        expect(refusalFor({ ...axis(0), error: 'bad' }, axis(10))).toBeNull();
    });
});

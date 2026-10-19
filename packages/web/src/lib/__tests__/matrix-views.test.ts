import { describe, expect, it } from 'vitest';
import { draftFrom, draftToMatrix, stableMatrix } from '../matrix-views';

describe('matrix draft', () => {
    it('round-trips a traceability definition and writes no DSM options for it', () => {
        const matrix = { rowAxis: { query: 'kind: A' }, columnAxis: { elementIds: ['p::x'] }, linkTypes: ['verifiedBy'] };
        const draft = { ...draftFrom(matrix), symmetric: true, ordering: 'cluster' as const };
        expect(draftToMatrix(draft, 'traceability')).toEqual(matrix);
    });
    it('writes the DSM options for a DSM and nothing for an empty axis', () => {
        const draft = { ...draftFrom({ axis: { query: 'kind: A' } }), symmetric: false, ordering: 'cluster' as const };
        expect(draftToMatrix(draft, 'dsm')).toEqual({ axis: { query: 'kind: A' }, symmetric: false, ordering: 'cluster' });
        expect(draftToMatrix(draftFrom(undefined), 'dsm')).toEqual({});
    });
    it('compares definitions regardless of key order', () => {
        expect(stableMatrix({ linkTypes: ['a'], rowAxis: { query: 'q' } })).toBe(stableMatrix({ rowAxis: { query: 'q' }, linkTypes: ['a'] }));
    });
});

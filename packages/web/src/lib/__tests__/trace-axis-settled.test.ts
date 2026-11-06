import { describe, expect, it } from 'vitest';
import { settledAxis } from '../use-trace-axis';

const answer = (query: string, ids: string[], workspace: string | null = null) => ({ ids, counting: false, query, workspace });

describe('an axis read from a query', () => {
    it('is still counting while the answer it holds is to another query', () => {
        // Choosing a second quick trace changes the query in the same render that asks to build: the first trace's
        // columns must not be taken for the second's.
        expect(settledAxis(answer('kind: Requirement\nwhere: requirementType == "hardware"', ['hw1']), 'kind: Requirement\nwhere: requirementType == "software"', null))
            .toEqual({ ids: [], counting: true });
    });

    it('is still counting while the answer is for another workspace', () => {
        expect(settledAxis(answer('kind: Need', ['n1'], 'sys::A'), 'kind: Need', 'sys::B')).toEqual({ ids: [], counting: true });
    });

    it('is the answer once it is to this query in this workspace', () => {
        expect(settledAxis(answer('kind: Need', ['n1', 'n2'], 'sys::A'), 'kind: Need', 'sys::A')).toEqual({ ids: ['n1', 'n2'], counting: false });
    });

    it('is empty, not counting, with no query', () => {
        expect(settledAxis(answer('kind: Need', ['n1']), '', null)).toEqual({ ids: [], counting: false });
    });
});

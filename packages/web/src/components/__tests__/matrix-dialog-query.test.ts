import { describe, expect, it } from 'vitest';
import { queryFromFilter } from '../MatrixDefinitionDialog';

describe('queryFromFilter', () => {
    it('is empty with no filter', () => expect(queryFromFilter([], '  ')).toBe(''));
    it('names one type', () => expect(queryFromFilter(['Requirement'], '')).toBe('kind: Requirement'));
    it('names several types as a list', () => expect(queryFromFilter(['A', 'B'], '')).toBe('kind: [A, B]'));
    it('adds a name filter and drops quotes that would end the string', () => {
        expect(queryFromFilter(['A'], 'say "hi"')).toBe('kind: A\nwhere: name contains "say hi"');
    });
});

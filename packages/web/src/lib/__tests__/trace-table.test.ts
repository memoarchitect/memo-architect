import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { NO_TABLE_FILTER, filterTraceRows, isFiltering, linkedKinds } from '../trace-table';
import type { TraceLinks } from '../trace-axis';

const el = (id: string, kind: string, name: string, displayId?: string) => ({ id, kind, name, layer: 'x', attributes: {}, displayId });
const model = {
    elements: {
        s1: el('s1', 'Requirement', 'Camera pose', 'SPEC-1'),
        s2: el('s2', 'Requirement', 'Edit points', 'SPEC-2'),
        s3: el('s3', 'Requirement', 'Power off', 'SPEC-3'),
        s4: el('s4', 'Requirement', 'No links at all', 'SPEC-4'),
        n1: el('n1', 'Need', 'Display data', 'REQ-10'),
        h1: el('h1', 'Hazard', 'User confusion', 'HZ-1'),
        h2: el('h2', 'Hazard', 'Device fails', 'HZ-2'),
    },
    relationships: [],
} as unknown as MemoModelDTO;
const rows = ['s1', 's2', 's3', 's4'];
const links: TraceLinks = {
    byRow: new Map([['s1', ['n1']], ['s2', ['n1', 'h1']], ['s3', ['h1', 'h2']]]),
    byColumn: new Map(),
};
const filter = (patch: Partial<typeof NO_TABLE_FILTER>) => ({ ...NO_TABLE_FILTER, ...patch });

describe('linkedKinds', () => {
    it('lists the kinds the rows link to, with how many rows link to one', () => {
        expect(linkedKinds(model, rows, links)).toEqual([{ kind: 'Hazard', rows: 2 }, { kind: 'Need', rows: 2 }]);
    });
});

describe('filterTraceRows', () => {
    it('keeps every row in order when nothing is asked', () => {
        expect(filterTraceRows(model, rows, links, NO_TABLE_FILTER)).toEqual(rows);
        expect(isFiltering(NO_TABLE_FILTER)).toBe(false);
    });

    it('finds the gaps: rows with no link to a kind, which includes rows with no link at all', () => {
        expect(filterTraceRows(model, rows, links, filter({ coverage: { kind: 'Hazard', mode: 'missing' } }))).toEqual(['s1', 's4']);
        expect(filterTraceRows(model, rows, links, filter({ coverage: { kind: 'Need', mode: 'missing' } }))).toEqual(['s3', 's4']);
    });

    it('finds the covered rows too', () => {
        expect(filterTraceRows(model, rows, links, filter({ coverage: { kind: 'Hazard', mode: 'linked' } }))).toEqual(['s2', 's3']);
    });

    it('searches the row and what it links to, every word, by label', () => {
        expect(filterTraceRows(model, rows, links, filter({ search: 'confusion' }))).toEqual(['s2', 's3']);   // a link's title
        expect(filterTraceRows(model, rows, links, filter({ search: 'spec-3' }))).toEqual(['s3']);             // the row's id
        expect(filterTraceRows(model, rows, links, filter({ search: 'edit hz-1' }))).toEqual(['s2']);          // both words
        expect(filterTraceRows(model, rows, links, filter({ search: 'nothing like it' }))).toEqual([]);
    });

    it('combines coverage and search', () => {
        expect(filterTraceRows(model, rows, links, filter({ search: 'REQ-10', coverage: { kind: 'Hazard', mode: 'missing' } }))).toEqual(['s1']);
    });

    it('orders by how many links a row has, or by label', () => {
        expect(filterTraceRows(model, rows, links, filter({ sort: 'most' })).slice(0, 2).sort()).toEqual(['s2', 's3']);
        expect(filterTraceRows(model, rows, links, filter({ sort: 'fewest' }))[0]).toBe('s4');
        expect(filterTraceRows(model, rows, links, filter({ sort: 'name' }))).toEqual(['s1', 's2', 's3', 's4']);
        expect(isFiltering(filter({ sort: 'most' }))).toBe(true);
    });
});

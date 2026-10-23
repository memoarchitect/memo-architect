import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { HierarchicalDsmResult } from '../../analysis/dsm-hierarchy';
import {
    EMPTY_AXIS, TRACE_MAX_CELLS, applyLineFilter, axisFromQuery, axisToQuery, builtMatrix, keepMatrix, loadDisplay,
    matrixFromSelection, matrixKey, saveDisplay, selectAxis, traceLimit, traceLinks,
} from '../trace-axis';
import { visibleRange } from '../../components/HierarchicalMatrix';

const element = (id: string, kind: string, name: string, extra: Record<string, unknown> = {}) =>
    ({ id, kind, name, layer: 'x', attributes: {}, ...extra });

const model = {
    elements: {
        r1: element('r1', 'Requirement', 'Display location'),
        r2: element('r2', 'Requirement', 'Alert operator'),
        s1: element('s1', 'SecurityRequirement', 'Encrypt storage'),
        t1: element('t1', 'TestCase', 'Location test'),
        a1: element('a1', 'AfferaHexaFlowSystem', 'HexaFlow'),
    },
    relationships: [],
} as unknown as MemoModelDTO;

const types = (...kinds: string[]) => ({ kinds, query: '' });

describe('selectAxis', () => {
    it('selects nothing until a type is chosen', () => {
        expect(selectAxis(model, EMPTY_AXIS)).toEqual([]);
        expect(selectAxis(null, types('Requirement'))).toEqual([]);
    });

    it('selects a type, ordered by type then name', () => {
        expect(selectAxis(model, types('Requirement', 'TestCase'))).toEqual(['r2', 'r1', 't1']);
    });

    it('includes the specializations of a chosen type when the hierarchy is known', () => {
        const parents = new Map([['SecurityRequirement', 'Requirement']]);
        expect(selectAxis(model, types('Requirement'), parents)).toEqual(['r2', 'r1', 's1']);
        expect(selectAxis(model, types('Requirement'))).toEqual(['r2', 'r1']);
    });

    it('leaves an axis written as a query to the server', () => {
        expect(selectAxis(model, { kinds: ['Requirement'], query: 'kind: Requirement', advanced: true })).toEqual([]);
    });
});

describe('traceLimit', () => {
    it('allows an empty or normal pair and refuses one past the limit, saying what to do', () => {
        expect(traceLimit(0, 5000)).toBeNull();
        expect(traceLimit(45, 768)).toBeNull();
        expect(traceLimit(1000, TRACE_MAX_CELLS / 1000)).toBeNull();
        expect(traceLimit(1001, TRACE_MAX_CELLS / 1000)).toMatch(/Narrow an axis/);
    });
});

describe('the remembered display choices', () => {
    const store = () => {
        const data = new Map<string, string>();
        return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    };

    it('round-trips and survives bad data', () => {
        const storage = store();
        // nothing remembered: the table
        expect(loadDisplay(storage)).toEqual({ view: 'list', rowFilter: 'all', columnFilter: 'all' });
        saveDisplay({ view: 'matrix', rowFilter: 'empty', columnFilter: 'linked' }, storage);
        expect(loadDisplay(storage)).toEqual({ view: 'matrix', rowFilter: 'empty', columnFilter: 'linked' });
        storage.setItem('memo-architect.traceability-display.v1', '{not json');
        expect(loadDisplay(storage)).toEqual({ view: 'list', rowFilter: 'all', columnFilter: 'all' });
        storage.setItem('memo-architect.traceability-display.v1', JSON.stringify({ view: 'x', rowFilter: 'bogus' }));
        expect(loadDisplay(storage)).toEqual({ view: 'list', rowFilter: 'all', columnFilter: 'all' });
    });
});

describe('the kept matrices', () => {
    const result = {} as HierarchicalDsmResult;
    const key = (rows: string[]) => matrixKey({ rowIds: rows, columnIds: ['c'], linkTypes: ['b', 'a'], expandedRows: new Set(), expandedColumns: new Set() });

    it('answers the same request from memory, and a changed model from nothing', () => {
        const kept = { relationships: [] };
        keepMatrix(kept, key(['a']), result);
        expect(builtMatrix(kept, key(['a']))).toBe(result);
        expect(builtMatrix(kept, key(['b']))).toBeUndefined();
        expect(builtMatrix({ relationships: [] }, key(['a']))).toBeUndefined();
    });

    it('does not depend on the order relations were picked in', () => {
        const a = matrixKey({ rowIds: ['r'], columnIds: ['c'], linkTypes: ['x', 'y'], expandedRows: new Set(), expandedColumns: new Set() });
        const b = matrixKey({ rowIds: ['r'], columnIds: ['c'], linkTypes: ['y', 'x'], expandedRows: new Set(), expandedColumns: new Set() });
        expect(a).toBe(b);
    });

    it('keeps only the most recently used few', () => {
        const kept = {};
        for (let i = 0; i < 10; i++) keepMatrix(kept, key([`r${i}`]), result);
        expect(builtMatrix(kept, key(['r0']))).toBeUndefined();
        expect(builtMatrix(kept, key(['r9']))).toBe(result);
    });
});

describe('visibleRange', () => {
    it('is the lines in view plus a margin, clamped to the grid', () => {
        const [first, last] = visibleRange(3000, 600, 44, 30, 1000, 6);
        expect(first).toBe(Math.floor((3000 - 44) / 30) - 6);
        expect(last).toBe(Math.ceil((3000 + 600 - 44) / 30) + 6);
        expect(visibleRange(0, 600, 44, 30, 1000, 6)[0]).toBe(0);
        expect(visibleRange(1e9, 600, 44, 30, 1000, 6)).toEqual([1000, 1000]);
        expect(visibleRange(0, 600, 44, 30, 5, 6)).toEqual([0, 5]);
    });

    it('draws a bounded number of lines however large the grid', () => {
        const [first, last] = visibleRange(123456, 900, 300, 30, 1_000_000);
        expect(last - first).toBeLessThan(60);
    });
});

describe('traceLinks', () => {
    const linked = {
        elements: {
            n1: element('n1', 'Need', 'N1'), n2: element('n2', 'Need', 'N2'), n3: element('n3', 'Need', 'N3'),
            s1: element('s1', 'Spec', 'S1'), s2: element('s2', 'Spec', 'S2'), s3: element('s3', 'Spec', 'S3'),
        },
        relationships: [
            { id: 'a', type: 'derivesFrom', sourceId: 's2', targetId: 'n1' },   // a link counts in either direction
            { id: 'b', type: 'derivesFrom', sourceId: 'n1', targetId: 's1' },
            { id: 'c', type: 'verifiedBy', sourceId: 'n2', targetId: 's1' },
            { id: 'd', type: 'composes', sourceId: 'n1', targetId: 's3' },       // structure is not a trace
            { id: 'e', type: 'derivesFrom', sourceId: 'n1', targetId: 'n2' },    // both ends on the rows only
        ],
    } as unknown as MemoModelDTO;
    const rows = ['n1', 'n2', 'n3'];
    const columns = ['s1', 's2', 's3'];

    it('lists each row\'s links in column order, and each column\'s in row order', () => {
        const links = traceLinks(linked, rows, columns, []);
        expect(links.byRow.get('n1')).toEqual(['s1', 's2']);
        expect(links.byRow.get('n2')).toEqual(['s1']);
        expect(links.byColumn.get('s1')).toEqual(['n1', 'n2']);
        expect(links.byColumn.get('s2')).toEqual(['n1']);
    });

    it('counts only the chosen relations', () => {
        const links = traceLinks(linked, rows, columns, ['verifiedBy']);
        expect(links.byRow.get('n2')).toEqual(['s1']);
        expect(links.byRow.has('n1')).toBe(false);
    });

    it('filters lines to all, those with links, or the gaps', () => {
        const links = traceLinks(linked, rows, columns, []);
        expect(applyLineFilter(rows, links.byRow, 'all')).toEqual(['n1', 'n2', 'n3']);
        expect(applyLineFilter(rows, links.byRow, 'linked')).toEqual(['n1', 'n2']);
        expect(applyLineFilter(rows, links.byRow, 'empty')).toEqual(['n3']);
        expect(applyLineFilter(columns, links.byColumn, 'empty')).toEqual(['s3']);
    });
});

describe('a selection saved as a view', () => {
    it('is saved as the query the explorer and server read, and read back as the same types', () => {
        const axis = types('Need', 'Requirement');
        expect(axisToQuery(axis)).toBe('kind: [Need, Requirement]');
        expect(axisFromQuery(axisToQuery(axis))).toEqual({ kinds: ['Need', 'Requirement'], query: 'kind: [Need, Requirement]' });
        expect(axisFromQuery('kind: Risk')).toMatchObject({ kinds: ['Risk'] });
        expect(axisFromQuery('kind: Risk').advanced).toBeUndefined();
    });

    it('keeps a query it did not make as a query to edit, exactly as written', () => {
        const query = 'kind: Requirement\nwhere: requirementType == "RequirementTypeKind::software"';
        expect(axisFromQuery(query)).toEqual({ kinds: [], query, advanced: true });
        expect(axisToQuery(axisFromQuery(query))).toBe(query);
        // a name condition (an older view) is a query too
        expect(axisFromQuery('kind: A\nwhere: name contains "x"').advanced).toBe(true);
        // nothing saved for an axis opens as an empty type picker
        expect(axisFromQuery(undefined)).toEqual({ kinds: [], query: '' });
    });

    it('writes only what is stated', () => {
        expect(matrixFromSelection({ rows: EMPTY_AXIS, columns: EMPTY_AXIS, linkTypes: [] })).toEqual({});
        expect(matrixFromSelection({ rows: types('Need'), columns: types('Requirement'), linkTypes: ['derivesFrom'] }, 'sys::S')).toEqual({
            system: 'sys::S', rowAxis: { query: 'kind: Need' }, columnAxis: { query: 'kind: Requirement' }, linkTypes: ['derivesFrom'],
        });
    });
});

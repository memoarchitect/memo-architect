// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { downloadDsmXlsx } from './dsm-export';
import type { HierarchicalDsmResult } from './dsm-hierarchy';
import { columnName, xlsxBytes } from './xlsx-writer';

const node = (id: string, name: string) => ({ id, name, kind: 'Part' });
const cell = (strength: number) => ({ strength });

/** The first sheet of a workbook: its rows (number, attributes, cell values by column letter) and its columns. */
function readSheet(bytes: Uint8Array) {
    const parts = unzipSync(bytes);
    const document = new DOMParser().parseFromString(strFromU8(parts['xl/worksheets/sheet1.xml']), 'application/xml');
    expect(document.querySelector('parsererror')).toBeNull();
    const rows = [...document.querySelectorAll('sheetData > row')].map(row => ({
        number: Number(row.getAttribute('r')),
        outlineLevel: Number(row.getAttribute('outlineLevel') ?? 0),
        hidden: row.getAttribute('hidden') === '1',
        values: Object.fromEntries([...row.querySelectorAll('c')].map(c => [
            c.getAttribute('r')!.replace(/\d+/g, ''),
            c.getAttribute('t') === 'inlineStr' ? c.querySelector('t')!.textContent : Number(c.querySelector('v')!.textContent),
        ])),
    }));
    const columns = [...document.querySelectorAll('cols > col')].map(col => ({
        outlineLevel: Number(col.getAttribute('outlineLevel') ?? 0), hidden: col.getAttribute('hidden') === '1',
    }));
    return { parts, rows, columns, workbook: strFromU8(parts['xl/workbook.xml']) };
}

describe('downloadDsmXlsx', () => {
    it('writes a workbook whose values and outline levels are the matrix on screen', async () => {
        const result = {
            rows: [
                { node: node('a', 'Alpha'), depth: 0, index: 1 },
                { node: node('b', 'Beta'), depth: 1, index: 2 },
            ],
            columns: [
                { node: node('a', 'Alpha'), depth: 0, index: 1 },
                { node: node('b', 'Beta'), depth: 1, index: 2 },
            ],
            matrix: [[cell(1), cell(3)], [null, cell(1)]],
        } as unknown as HierarchicalDsmResult;

        let blob: Blob | undefined;
        // jsdom has neither; the page's own download path calls both.
        URL.createObjectURL = (value: Blob | MediaSource) => { blob = value as Blob; return 'blob:x'; };
        URL.revokeObjectURL = () => undefined;
        HTMLAnchorElement.prototype.click = () => undefined;

        await downloadDsmXlsx(result);

        const bytes = await new Promise<Uint8Array>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
            reader.readAsArrayBuffer(blob!);
        });
        const { rows, columns, workbook } = readSheet(bytes);
        expect(workbook).toContain('name="DSM"');
        expect(rows[0].values).toEqual({ A: 'Row', B: 'Element type', C: 'Row index', D: '1. Alpha', E: '2. Beta' });
        expect(rows[1].values).toEqual({ A: 'Alpha', B: 'Part', C: 1, D: '1', E: 3 });
        expect(rows[2].values).toEqual({ A: '  Beta', B: 'Part', C: 2, E: '1' });
        expect(rows.map(r => [r.outlineLevel, r.hidden])).toEqual([[0, false], [0, false], [1, true]]);
        expect(columns.map(c => [c.outlineLevel, c.hidden])).toEqual([[0, false], [0, false], [0, false], [0, false], [1, true]]);
    });
});

describe('xlsx writer', () => {
    it('names columns past Z and escapes what XML reserves', () => {
        expect([1, 26, 27, 52, 703].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'AAA']);
        const { rows, workbook } = readSheet(xlsxBytes('A & B', [{ cells: ['<x> & "y"', 7] }], [{ width: 10 }, { width: 10 }]));
        expect(workbook).toContain('name="A &amp; B"');
        expect(rows[0].values).toEqual({ A: '<x> & "y"', B: 7 });
    });
});

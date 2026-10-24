// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Workbook } from 'exceljs';
import { downloadDsmXlsx } from './dsm-export';
import type { HierarchicalDsmResult } from './dsm-hierarchy';

const node = (id: string, name: string) => ({ id, name, kind: 'Part' });
const cell = (strength: number) => ({ strength });

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
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

        await downloadDsmXlsx(result);

        const workbook = new Workbook();
        const bytes = await new Promise<ArrayBuffer>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.readAsArrayBuffer(blob!);
        });
        await workbook.xlsx.load(bytes);
        const sheet = workbook.getWorksheet('DSM')!;
        expect(sheet.getRow(1).values).toEqual([undefined, 'Row', 'Element type', 'Row index', '1. Alpha', '2. Beta']);
        expect(sheet.getRow(2).values).toEqual([undefined, 'Alpha', 'Part', 1, '1', 3]);
        expect(sheet.getRow(3).values).toEqual([undefined, '  Beta', 'Part', 2, '', '1']);
        expect([sheet.getRow(2).outlineLevel, sheet.getRow(3).outlineLevel]).toEqual([0, 1]);
        expect(sheet.getRow(3).hidden).toBe(true);
        expect(sheet.getColumn(5).hidden).toBe(true);
    });
});

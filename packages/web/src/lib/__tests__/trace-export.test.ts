import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { exportFileName, traceDocxBlob, traceExportLines, traceXlsxBytes } from '../trace-export';

const model = {
    elements: {
        need1: { id: 'need1', name: 'Pump starts on demand', kind: 'Need', displayId: 'N-1' },
        need2: { id: 'need2', name: 'Pump stops safely', kind: 'Need', displayId: 'N-2' },
        req1: { id: 'req1', name: 'Start within two seconds', kind: 'Requirement', displayId: 'R-1' },
        req2: { id: 'req2', name: 'Report the start', kind: 'Requirement', displayId: 'R-2' },
    },
} as any;
const links = { byRow: new Map([['need1', ['req1', 'req2']]]), byColumn: new Map() } as any;

describe('downloading a trace table', () => {
    it('writes a line per item and link, and a line of its own for an item with none', () => {
        expect(traceExportLines(model, ['need1', 'need2'], links)).toEqual([
            { itemId: 'N-1', item: 'Pump starts on demand', linkedId: 'R-1', linked: 'Start within two seconds' },
            { itemId: 'N-1', item: 'Pump starts on demand', linkedId: 'R-2', linked: 'Report the start' },
            { itemId: 'N-2', item: 'Pump stops safely', linkedId: '', linked: '' },
        ]);
    });

    it('keeps the rows in the order they are shown', () => {
        expect(traceExportLines(model, ['need2', 'need1'], links).map(line => line.itemId)).toEqual(['N-2', 'N-1', 'N-1']);
    });

    it('writes a workbook whose sheet holds the header and every line', async () => {
        const bytes = await traceXlsxBytes(traceExportLines(model, ['need1', 'need2'], links));
        const files = unzipSync(bytes);
        const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
        for (const text of ['Item ID', 'Linked item', 'Pump starts on demand', 'Report the start', 'Pump stops safely']) {
            expect(sheet).toContain(text);
        }
    });

    it('writes a Word document with the item once above its links', async () => {
        const blob = await traceDocxBlob('Needs to requirements', 'Pump, from the model.', traceExportLines(model, ['need1', 'need2'], links));
        const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
        const body = strFromU8(files['word/document.xml']);
        expect(body.split('Pump starts on demand').length - 1).toBe(1);
        expect(body).toContain('Start within two seconds');
        expect(body).toContain('No links');
    });

    it('names the file after the matrix', () => {
        expect(exportFileName('User need → Software requirement', 'xlsx')).toBe('User need to Software requirement.xlsx');
        expect(exportFileName('a/b: c', 'docx')).toBe('a b c.docx');
    });
});

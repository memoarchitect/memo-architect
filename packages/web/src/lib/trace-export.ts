// ─── Downloading a traceability table ─────────────────────────────────────────
//
// The table as it is shown (its rows, filters and order) as a spreadsheet or a Word document, for a review or a
// design history file. Each line is one item and one item it links to; an item with no link has a line of its own,
// so a gap is in the download as it is on the screen. Both files are written with the writers the DSM and the
// document downloads already use.

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { docxToBlob } from '@memoarchitect/tools/browser';
import { elementIdTitle } from './trace-labels';
import type { TraceLinks } from './trace-axis';

export interface TraceExportLine {
    itemId: string;
    item: string;
    linkedId: string;
    linked: string;
}

/** One line per item and linked item, in the order of `rowIds`; an item with no link gets one line with empty link cells. */
export function traceExportLines(model: MemoModelDTO, rowIds: readonly string[], links: TraceLinks): TraceExportLine[] {
    const lines: TraceExportLine[] = [];
    const named = (id: string) => {
        const { id: ref, title } = elementIdTitle(model.elements[id], id);
        return { ref: ref ?? '', title };
    };
    for (const rowId of rowIds) {
        const row = named(rowId);
        const linked = links.byRow.get(rowId) ?? [];
        if (linked.length === 0) lines.push({ itemId: row.ref, item: row.title, linkedId: '', linked: '' });
        for (const other of linked) {
            const target = named(other);
            lines.push({ itemId: row.ref, item: row.title, linkedId: target.ref, linked: target.title });
        }
    }
    return lines;
}

/** A file name from the matrix's name: what a person would type, without characters a file system refuses. */
export function exportFileName(title: string, extension: 'xlsx' | 'docx'): string {
    const base = title.replace(/[→]/g, 'to').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Traceability matrix';
    return `${base}.${extension}`;
}

const HEADERS = ['Item ID', 'Item', 'Linked ID', 'Linked item'] as const;

/** The spreadsheet's bytes: a header line, then one line per item and link. */
export async function traceXlsxBytes(lines: readonly TraceExportLine[]): Promise<Uint8Array> {
    const { xlsxBytes } = await import('../analysis/xlsx-writer');
    return xlsxBytes('Traceability', [
        { cells: [...HEADERS] },
        ...lines.map(line => ({ cells: [line.itemId, line.item, line.linkedId, line.linked] })),
    ], [{ width: 12 }, { width: 60 }, { width: 12 }, { width: 60 }]);
}

/** The Word document: the title, what it shows, and the table, with the item written once above its links. */
export function traceDocxBlob(title: string, subtitle: string, lines: readonly TraceExportLine[]): Promise<Blob> {
    const cell = (value: string, bold = false) => ({ content: [{ type: 'text' as const, value, ...(bold ? { bold } : {}) }] });
    const rows = lines.map((line, index) => {
        const first = index === 0 || lines[index - 1].itemId !== line.itemId || lines[index - 1].item !== line.item;
        return {
            cells: [
                cell(first ? line.itemId : ''), cell(first ? line.item : '', first),
                cell(line.linkedId), cell(line.linked || (first ? 'No links' : '')),
            ],
        };
    });
    return docxToBlob({
        frontmatter: { documentId: title, title, generatedAt: new Date().toISOString() },
        sections: [{
            id: 'trace', title,
            blocks: [
                { type: 'paragraph', content: [{ type: 'text', value: subtitle }] },
                { type: 'table', headers: HEADERS.map(header => ({ content: [{ type: 'text', value: header }], header: true })), rows },
            ],
        }],
        status: 'complete', totalElements: lines.length, totalGaps: 0,
    });
}

function save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

export async function downloadTraceXlsx(title: string, lines: readonly TraceExportLine[]): Promise<void> {
    const bytes = await traceXlsxBytes(lines);
    save(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), exportFileName(title, 'xlsx'));
}

export async function downloadTraceDocx(title: string, subtitle: string, lines: readonly TraceExportLine[]): Promise<void> {
    save(await traceDocxBlob(title, subtitle, lines), exportFileName(title, 'docx'));
}

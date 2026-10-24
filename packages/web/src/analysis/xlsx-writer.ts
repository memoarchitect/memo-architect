// ─── A minimal .xlsx writer ──────────────────────────────────────────────────
//
// One sheet of strings and numbers, with Excel's row and column outline levels, hidden lines and column
// widths: what the DSM export needs and nothing more. It is a zip of five XML parts (ECMA-376 Part 1,
// SpreadsheetML), written with fflate, so the export depends on no spreadsheet library.

import { strToU8, zipSync } from 'fflate';

export type XlsxCell = string | number;

export interface XlsxLine {
    cells: readonly XlsxCell[];
    /** Excel outline level, 0 to 7. */
    outlineLevel?: number;
    hidden?: boolean;
    /** Height in points. */
    height?: number;
}

export interface XlsxColumn {
    /** Width in characters. */
    width: number;
    outlineLevel?: number;
    hidden?: boolean;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const escapeXml = (text: string): string =>
    // Control characters other than tab, newline and carriage return are not legal XML 1.0.
    // eslint-disable-next-line no-control-regex
    text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Column letters for a 1-based index: 1 is A, 27 is AA. */
export function columnName(index: number): string {
    let name = '';
    for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    return name;
}

function cellXml(value: XlsxCell, row: number, column: number): string {
    const ref = `${columnName(column)}${row}`;
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    const text = String(value);
    if (text === '') return '';
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

/** The bytes of a workbook with one sheet. */
export function xlsxBytes(sheetName: string, lines: readonly XlsxLine[], columns: readonly XlsxColumn[]): Uint8Array {
    const maxRowLevel = Math.max(0, ...lines.map(line => line.outlineLevel ?? 0));
    const maxColumnLevel = Math.max(0, ...columns.map(column => column.outlineLevel ?? 0));
    const cols = columns.map((column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"`
        + `${column.outlineLevel ? ` outlineLevel="${column.outlineLevel}"` : ''}${column.hidden ? ' hidden="1"' : ''}/>`).join('');
    const rows = lines.map((line, index) => {
        const number = index + 1;
        const attributes = `${line.height ? ` ht="${line.height}" customHeight="1"` : ''}`
            + `${line.outlineLevel ? ` outlineLevel="${line.outlineLevel}"` : ''}${line.hidden ? ' hidden="1"' : ''}`;
        return `<row r="${number}"${attributes}>${line.cells.map((value, column) => cellXml(value, number, column + 1)).join('')}</row>`;
    }).join('');
    const sheet = `${XML_HEAD}<worksheet xmlns="${NS}"><sheetPr><outlinePr summaryBelow="0" summaryRight="0"/></sheetPr>`
        + `<sheetFormatPr defaultRowHeight="15" outlineLevelRow="${maxRowLevel}" outlineLevelCol="${maxColumnLevel}"/>`
        + `${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData></worksheet>`;
    const workbook = `${XML_HEAD}<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
        + `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    return zipSync({
        '[Content_Types].xml': strToU8(`${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
            + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            + '<Default Extension="xml" ContentType="application/xml"/>'
            + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
        '_rels/.rels': strToU8(`${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
            + `<Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
        'xl/workbook.xml': strToU8(workbook),
        'xl/_rels/workbook.xml.rels': strToU8(`${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
            + `<Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
        'xl/worksheets/sheet1.xml': strToU8(sheet),
    });
}

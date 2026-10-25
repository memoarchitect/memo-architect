// ─── Columns of a memo-query block, as the preview reads them ────────────────
//
// `columns: name, wcetMs in milli*second` — a field, optionally shown in one
// unit. The conversion uses the unit table the model ships (the library's, read
// by the tools that built it), so the preview and an exported document print the
// same number.
// ─────────────────────────────────────────────────────────────────────────────

import { convertQuantity, unitTableFromDTO, type MemoElement, type UnitTableDTO } from '@memoarchitect/tools/browser';

export interface PreviewColumn { field: string; unit?: string }

/** The columns a block names, or undefined when it names none. */
export function parseColumns(text: string): PreviewColumn[] | undefined {
    const parts = text.replace(/^\[|\]$/g, '').split(',').map(c => c.trim()).filter(Boolean);
    if (parts.length === 0) return undefined;
    return parts.map(part => {
        const m = part.match(/^(\S+)\s+in\s+(.+)$/i);
        return m ? { field: m[1], unit: m[2].trim() } : { field: part };
    });
}

export function columnLabel(column: PreviewColumn): string {
    return column.unit ? `${column.field} (${column.unit})` : column.field;
}

/** One cell: the element's field, in the column's unit when it has one. A value that cannot be converted says why. */
export function columnCell(element: MemoElement, column: PreviewColumn, table: UnitTableDTO | undefined): string {
    const record = element as unknown as Record<string, unknown>;
    const raw = record[column.field] ?? element.attributes?.[column.field];
    const value = raw === undefined || raw === null || raw === '' ? '' : String(raw);
    if (!value) return '—';
    if (!column.unit) return value;
    if (!table) return value;
    try {
        return String(convertQuantity(value, column.unit, unitTableFromDTO(table)));
    } catch (e) {
        return `⚠ ${e instanceof Error ? e.message : String(e)}`;
    }
}

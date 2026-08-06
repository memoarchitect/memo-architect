// ─── DSM spreadsheet export ─────────────────────────────────────────────────
//
// CSV is deliberately used instead of a proprietary workbook format: Excel,
// Numbers and LibreOffice all open it directly, and it contains exactly the
// matrix the user is currently reading (filters, sort order and expansion).

import type { DsmAggregateCell, HierarchicalDsmResult } from './dsm-hierarchy';

function quote(value: string | number): string {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function visibleDiagonal(cell: DsmAggregateCell | null): string {
    return cell ? String(cell.strength) : '';
}

/** Create a UTF-8 CSV that spreadsheet apps open as the current DSM view. */
export function dsmMatrixCsv(result: HierarchicalDsmResult): string {
    const header = [
        'Row', 'Element type', 'Row index',
        ...result.columns.map(column => `${column.index}. ${column.node.name}`),
    ];
    const lines: (string | number)[][] = [header];

    result.rows.forEach((row, rowIndex) => {
        const values: (string | number)[] = [
            `${'  '.repeat(row.depth)}${row.node.name}`,
            row.node.kind,
            row.index,
        ];
        result.columns.forEach((column, columnIndex) => {
            const cell = result.matrix[rowIndex][columnIndex];
            values.push(row.node.id === column.node.id
                ? visibleDiagonal(cell)
                : cell ? String(cell.strength) : '');
        });
        lines.push(values);
    });

    // BOM makes Excel reliably recognize UTF-8 names on all supported hosts.
    return `\uFEFF${lines.map(line => line.map(quote).join(',')).join('\r\n')}\r\n`;
}

/** Trigger a browser download of the current DSM as an Excel-compatible CSV. */
export function downloadDsmCsv(result: HierarchicalDsmResult, filename = 'memo-dsm.csv'): void {
    const blob = new Blob([dsmMatrixCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Download a real Excel workbook. Row and column outline levels mirror the
 * DSM trees; child lines start hidden, so Excel opens at the collapsed view
 * and its outline controls expand either axis independently.
 */
export async function downloadDsmXlsx(result: HierarchicalDsmResult, filename = 'memo-dsm.xlsx'): Promise<void> {
    const XLSX = await import('xlsx');
    const values: (string | number)[][] = [[
        'Row', 'Element type', 'Row index',
        ...result.columns.map(column => `${column.index}. ${column.node.name}`),
    ]];

    result.rows.forEach((row, rowIndex) => {
        const line: (string | number)[] = [
            `${'  '.repeat(row.depth)}${row.node.name}`,
            row.node.kind,
            row.index,
        ];
        result.columns.forEach((column, columnIndex) => {
            const cell = result.matrix[rowIndex][columnIndex];
            line.push(row.node.id === column.node.id
                ? visibleDiagonal(cell)
                : cell ? cell.strength : '');
        });
        values.push(line);
    });

    const sheet = XLSX.utils.aoa_to_sheet(values);
    sheet['!rows'] = [
        { hpx: 24 },
        ...result.rows.map(row => ({ level: Math.min(7, row.depth), hidden: row.depth > 0 })),
    ];
    sheet['!cols'] = [
        { wch: 34 }, { wch: 22 }, { wch: 11 },
        ...result.columns.map(column => ({
            wch: Math.max(8, Math.min(26, column.node.name.length + 2)),
            level: Math.min(7, column.depth),
            hidden: column.depth > 0,
        })),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'DSM');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
    const url = URL.createObjectURL(new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ─── Grid View Template (KK-7) ───────────────────────────────────────────────
//
// Standard data preparation for the SysML v2 `grid` view kind — the one
// table/matrix renderer subsuming the legacy fmea, allocation, traceability,
// and risk-matrix renderings.
//
//   table   per-kind sections; columns auto-derived from the attributes the
//           section's rows actually carry (frequency-ranked, prose skipped)
//   matrix  rows × columns from the relationships among the view's elements
//
// Rendering lives in views/GridView.tsx; everything here is pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memo/core';

// ─── Table ───────────────────────────────────────────────────────────────────

/** Attribute keys that never make useful grid columns. */
const GRID_SKIP = new Set([
    'name', 'title', 'description', 'shortDescription', 'longDescription',
    'sourceReference', 'rationaleText', 'semantics', 'queryDescription',
    'dataSourceDescription', 'doc',
]);

const MAX_COLUMNS = 7;
/** Values longer than this are clipped in cells (full text via tooltip). */
export const GRID_CELL_MAX = 80;

export interface GridRow {
    element: MemoElement;
    /** Values aligned with the section's columns (unqualified enums) */
    values: (string | undefined)[];
}

export interface GridSection {
    kind: string;
    columns: string[];
    /** Per-column: true when every non-empty value parses as a number */
    numeric: boolean[];
    rows: GridRow[];
}

function cellValue(el: MemoElement, key: string): string | undefined {
    const raw = el.attributes[key];
    if (raw === undefined) return undefined;
    const value = raw.includes('::') ? raw.split('::').pop()!.trim() : raw;
    return value || undefined;
}

/** Frequency-ranked attribute columns for one kind's rows. */
export function pickColumns(rows: MemoElement[]): string[] {
    const freq = new Map<string, number>();
    for (const el of rows) {
        for (const key of Object.keys(el.attributes)) {
            if (GRID_SKIP.has(key) || key.includes('.')) continue;
            freq.set(key, (freq.get(key) ?? 0) + 1);
        }
    }
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_COLUMNS)
        .map(([key]) => key);
}

/**
 * Build per-kind table sections over the view's visible elements.
 * Sections are ordered by row count (dominant kind first).
 */
export function buildGridTable(elements: MemoElement[]): GridSection[] {
    const byKind = new Map<string, MemoElement[]>();
    for (const el of elements) {
        if (!byKind.has(el.kind)) byKind.set(el.kind, []);
        byKind.get(el.kind)!.push(el);
    }

    const sections: GridSection[] = [];
    for (const [kind, rows] of byKind) {
        const columns = pickColumns(rows);
        const gridRows: GridRow[] = rows.map(el => ({
            element: el,
            values: columns.map(c => cellValue(el, c)),
        }));
        const numeric = columns.map((_, ci) => {
            const present = gridRows.map(r => r.values[ci]).filter((v): v is string => v !== undefined);
            return present.length > 0 && present.every(v => Number.isFinite(Number(v)));
        });
        sections.push({ kind, columns, numeric, rows: gridRows });
    }
    return sections.sort((a, b) => b.rows.length - a.rows.length);
}

/** Sort a section's rows by column index (numeric-aware); -1 sorts by name. */
export function sortSection(
    section: GridSection,
    columnIndex: number,
    dir: 'asc' | 'desc',
): GridRow[] {
    const sign = dir === 'asc' ? 1 : -1;
    const sorted = [...section.rows].sort((a, b) => {
        if (columnIndex < 0) return a.element.name.localeCompare(b.element.name) * sign;
        const av = a.values[columnIndex];
        const bv = b.values[columnIndex];
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return 1;   // empty cells always sink
        if (bv === undefined) return -1;
        if (section.numeric[columnIndex]) return (Number(av) - Number(bv)) * sign;
        return av.localeCompare(bv) * sign;
    });
    return sorted;
}

// ─── Matrix ──────────────────────────────────────────────────────────────────

export interface GridMatrix {
    rows: MemoElement[];
    cols: MemoElement[];
    /** `${rowId}|${colId}` → relationship types connecting the pair */
    cells: Map<string, string[]>;
    /** Relationship types present, for the legend */
    relTypes: string[];
}

/**
 * Relationship matrix over the view's elements. When the view declares
 * relationship types only those are marked; rows are the source side,
 * columns the target side. Returns undefined when no relationship among
 * the visible elements qualifies.
 */
export function buildGridMatrix(
    elements: MemoElement[],
    relationships: MemoRelationship[],
    declaredRelTypes?: string[],
): GridMatrix | undefined {
    const byId = new Map(elements.map(e => [e.id, e]));
    const declared = declaredRelTypes?.length
        ? new Set(declaredRelTypes.map(t => t.toLowerCase()))
        : undefined;

    const qualifying = relationships.filter(r =>
        byId.has(r.sourceId) && byId.has(r.targetId)
        && r.sourceId !== r.targetId
        && (!declared || declared.has(r.type.toLowerCase())));
    if (qualifying.length === 0) return undefined;

    const rowIds = new Set<string>();
    const colIds = new Set<string>();
    const cells = new Map<string, string[]>();
    const relTypes = new Set<string>();
    for (const r of qualifying) {
        rowIds.add(r.sourceId);
        colIds.add(r.targetId);
        relTypes.add(r.type);
        const key = `${r.sourceId}|${r.targetId}`;
        if (!cells.has(key)) cells.set(key, []);
        if (!cells.get(key)!.includes(r.type)) cells.get(key)!.push(r.type);
    }

    const byName = (a: MemoElement, b: MemoElement) =>
        a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
    return {
        rows: [...rowIds].map(id => byId.get(id)!).sort(byName),
        cols: [...colIds].map(id => byId.get(id)!).sort(byName),
        cells,
        relTypes: [...relTypes].sort(),
    };
}

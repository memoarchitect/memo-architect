// ─── Matrix views ─────────────────────────────────────────────────────────────
//
// A traceability matrix and a design structure matrix are declared views: a
// `view` usage typed by one of two `view def`s the ontology provides
// (memo/src/viewpoints/matrix/memo_matrix_views.sysml). Each screen manages the
// views typed by its own definition, and nothing here lists kinds: the
// elements an axis holds come from a query or from hand-picked ids.

import type { DiagramDTO, MatrixAxisDTO, MatrixDefinitionDTO, MatrixGroupDTO } from '@memoarchitect/tools/browser';

export type MatrixScreen = 'traceability' | 'dsm';

/** The `view def` each screen manages. */
export const MATRIX_VIEW_DEFINITIONS: Record<MatrixScreen, string> = {
    traceability: 'MemoTraceabilityMatrixView',
    dsm: 'MemoDependencyMatrixView',
};

/** The screen that opens a view, or undefined when it is not a matrix view. */
export function matrixScreenOf(diagram: Pick<DiagramDTO, 'viewDefinition'>): MatrixScreen | undefined {
    return (Object.keys(MATRIX_VIEW_DEFINITIONS) as MatrixScreen[])
        .find(screen => MATRIX_VIEW_DEFINITIONS[screen] === diagram.viewDefinition);
}

/**
 * The most cells a matrix will draw: rows times columns, counted in elements.
 * The grid draws every cell it is given, so this is a limit of the grid, not of
 * the model or of SysML. Past it the screen asks for a narrower axis.
 */
export const MATRIX_CELL_CAP = 20_000;

/** The most elements one axis can hold and still be sent back by id. */
export const AXIS_ID_LIMIT = 5_000;

/** An axis as it is edited: query text and hand-picked ids, either of them empty. */
export interface AxisDraft {
    query: string;
    elementIds: string[];
}

export const EMPTY_AXIS: AxisDraft = { query: '', elementIds: [] };

export const axisFrom = (axis: MatrixAxisDTO | undefined): AxisDraft => ({
    query: axis?.query ?? '',
    elementIds: axis?.elementIds ?? [],
});

/** What is saved for an axis; undefined when the axis is empty, so nothing is written for it. */
export function axisToDto(axis: AxisDraft): MatrixAxisDTO | undefined {
    const query = axis.query.trim();
    if (!query && axis.elementIds.length === 0) return undefined;
    return { ...(query ? { query } : {}), ...(axis.elementIds.length > 0 ? { elementIds: axis.elementIds } : {}) };
}

export const sameAxis = (a: AxisDraft, b: AxisDraft): boolean =>
    a.query.trim() === b.query.trim()
    && a.elementIds.length === b.elementIds.length
    && a.elementIds.every((id, index) => id === b.elementIds[index]);

/** The definition as the declaration states it, for the dirty check. */
export const stableMatrix = (matrix: MatrixDefinitionDTO | undefined): string =>
    JSON.stringify(matrix ?? {}, (_key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
            : value);

// ─── The draft a screen edits ────────────────────────────────────────────────


/** Everything a matrix definition holds, in the shape a screen edits it. */
export interface MatrixDraft {
    rowAxis: AxisDraft;
    columnAxis: AxisDraft;
    /** The one axis of a DSM, where rows equal columns. */
    axis: AxisDraft;
    linkTypes: string[];
    dependencyTypes: string[];
    containmentTypes: string[];
    symmetric: boolean | undefined;
    ordering: MatrixDefinitionDTO['ordering'];
    groups: MatrixGroupDTO[];
    criticalElements: AxisDraft;
}

export const EMPTY_DRAFT: MatrixDraft = {
    rowAxis: EMPTY_AXIS, columnAxis: EMPTY_AXIS, axis: EMPTY_AXIS,
    linkTypes: [], dependencyTypes: [], containmentTypes: [],
    symmetric: undefined, ordering: undefined, groups: [], criticalElements: EMPTY_AXIS,
};

export function draftFrom(matrix: MatrixDefinitionDTO | undefined): MatrixDraft {
    return {
        rowAxis: axisFrom(matrix?.rowAxis),
        columnAxis: axisFrom(matrix?.columnAxis),
        axis: axisFrom(matrix?.axis),
        linkTypes: matrix?.linkTypes ?? [],
        dependencyTypes: matrix?.dependencyTypes ?? [],
        containmentTypes: matrix?.containmentTypes ?? [],
        symmetric: matrix?.symmetric,
        ordering: matrix?.ordering,
        groups: matrix?.groups ?? [],
        criticalElements: axisFrom(matrix?.criticalElements),
    };
}

/**
 * What the declaration should state. A traceability matrix states only the
 * fields its definition has; the DSM-only options are never written for it,
 * and an empty field is not written at all.
 */
export function draftToMatrix(draft: MatrixDraft, screen: MatrixScreen): MatrixDefinitionDTO {
    const list = (values: string[]) => (values.length > 0 ? values : undefined);
    const fields: MatrixDefinitionDTO = screen === 'traceability'
        ? {
            rowAxis: axisToDto(draft.rowAxis), columnAxis: axisToDto(draft.columnAxis), linkTypes: list(draft.linkTypes),
        }
        : {
            axis: axisToDto(draft.axis), dependencyTypes: list(draft.dependencyTypes),
            containmentTypes: list(draft.containmentTypes), symmetric: draft.symmetric, ordering: draft.ordering,
            groups: draft.groups.length > 0 ? draft.groups : undefined, criticalElements: axisToDto(draft.criticalElements),
        };
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as MatrixDefinitionDTO;
}

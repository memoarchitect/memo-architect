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
 * What each screen will draw, in one place. The screens, the create dialog and
 * the refusal messages all read these, so a limit is changed here and nowhere
 * else. They are limits of the grid this screen draws, not of SysML or the model.
 */
export interface MatrixLimits {
    traceabilityMaxCells: number;
    dsmMaxElements: number;
    axisIdLimit: number;
}

export const MATRIX_LIMITS: MatrixLimits = {
    /** A traceability matrix: rows times columns, counted in elements. */
    traceabilityMaxCells: 20_000,
    /** A DSM: elements on its one axis (rows equal columns). */
    dsmMaxElements: 100,
    /** The most elements one axis can hold and still be sent back by id. */
    axisIdLimit: 5_000,
};

/** The most elements one axis can hold and still be sent back by id. */
export const AXIS_ID_LIMIT = MATRIX_LIMITS.axisIdLimit;

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
    /** The system (workspace root) the matrix is about; undefined shows the workspace chosen in the header. */
    system: string | undefined;
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
    system: undefined,
    rowAxis: EMPTY_AXIS, columnAxis: EMPTY_AXIS, axis: EMPTY_AXIS,
    linkTypes: [], dependencyTypes: [], containmentTypes: [],
    symmetric: undefined, ordering: undefined, groups: [], criticalElements: EMPTY_AXIS,
};

export function draftFrom(matrix: MatrixDefinitionDTO | undefined): MatrixDraft {
    return {
        system: matrix?.system,
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
            system: draft.system, rowAxis: axisToDto(draft.rowAxis), columnAxis: axisToDto(draft.columnAxis), linkTypes: list(draft.linkTypes),
        }
        : {
            system: draft.system, axis: axisToDto(draft.axis), dependencyTypes: list(draft.dependencyTypes),
            containmentTypes: list(draft.containmentTypes), symmetric: draft.symmetric, ordering: draft.ordering,
            groups: draft.groups.length > 0 ? draft.groups : undefined, criticalElements: axisToDto(draft.criticalElements),
        };
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as MatrixDefinitionDTO;
}

// ─── The filter a simple axis stands for ─────────────────────────────────────

/** What the two builder fields (element types, part of a name) stand for, as the memo-query the executor reads. */
export function queryFromFilter(kinds: readonly string[], contains: string): string {
    const lines: string[] = [];
    if (kinds.length === 1) lines.push(`kind: ${kinds[0]}`);
    else if (kinds.length > 1) lines.push(`kind: [${kinds.join(', ')}]`);
    const text = contains.trim().replaceAll('"', '');
    if (text) lines.push(`where: name contains "${text}"`);
    return lines.join('\n');
}

/**
 * The two builder fields a query was made from, or null when the query says more than they can (a hand-written
 * query, other conditions): such an axis is evaluated, not edited as fields.
 */
export function filterFromQuery(query: string): { kinds: string[]; contains: string } | null {
    const kinds: string[] = [];
    let contains = '';
    let sawKind = false;
    let sawWhere = false;
    for (const raw of query.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const kind = /^kind:\s*(?:\[([^\]]*)\]|([^\s,\[\]]+))$/.exec(line);
        if (kind && !sawKind) {
            sawKind = true;
            kinds.push(...(kind[1] !== undefined ? kind[1].split(',').map(k => k.trim()).filter(Boolean) : [kind[2]]));
            continue;
        }
        const where = /^where:\s*name contains "([^"]*)"$/.exec(line);
        if (where && !sawWhere) { sawWhere = true; contains = where[1]; continue; }
        return null;
    }
    return { kinds, contains };
}

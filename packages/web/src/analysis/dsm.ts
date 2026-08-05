// ─── Design Structure Matrix (DSM) — Browser-safe copy ──────────────────────
//
// Pure computation on MemoModelDTO — no Node.js dependencies.
// Canonical implementation lives in @memoarchitect/tools/browser/src/analysis/dsm.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO, MemoElement } from '@memoarchitect/tools/browser';

/** A single cell in the DSM matrix */
export interface DSMCell {
    count: number;
    types: string[];
    flowItems: string[];
}

/** DSM computation result */
export interface DSMResult {
    /** Legacy square-matrix alias for rowElementIds. */
    elementIds: string[];
    rowElementIds: string[];
    columnElementIds: string[];
    elements: Record<string, { name: string; kind: string; layer: string; allocatedTo?: string; group?: string; memberCount?: number }>;
    matrix: (DSMCell | null)[][];
    clusters: Map<number, string[]>;
    totalDependencies: number;
}

export interface DSMOptions {
    kinds?: string[];
    rowKinds?: string[];
    columnKinds?: string[];
    relationshipTypes?: string[];
    cluster?: boolean;
    /** Only elements in these authored groups are shown. Empty means all groups. */
    includeGroups?: string[];
    /** Authored groups to hide, applied after includeGroups. */
    excludeGroups?: string[];
    /** Roll children up to their nearest parent of this kind. */
    hierarchyParentKind?: string;
}

export interface DSMAnalysis {
    /** Relationships below the diagonal after ordering, often feedback candidates. */
    feedbackDependencies: number;
    /** Pairs with dependencies in both directions. */
    coupledPairs: number;
    /** Elements with no incoming or outgoing dependency. */
    isolatedElements: number;
    /** The greatest number of direct dependencies touching one element. */
    maxDegree: number;
}

const DEFAULT_KINDS = ['Function', 'Function', 'ActionDefinition', 'ActionUsage'];
const DEFAULT_REL_TYPES = ['flow', 'decomposedBy', 'composedOf', 'allocateTo', 'succession'];

export function computeDSM(model: MemoModelDTO, options?: DSMOptions): DSMResult {
    const rowKinds = new Set(options?.rowKinds ?? options?.kinds ?? DEFAULT_KINDS);
    const columnKinds = new Set(options?.columnKinds ?? options?.kinds ?? DEFAULT_KINDS);
    const relTypes = new Set(options?.relationshipTypes ?? DEFAULT_REL_TYPES);
    const shouldCluster = options?.cluster ?? true;
    const includeGroups = new Set(options?.includeGroups ?? []);
    const excludeGroups = new Set(options?.excludeGroups ?? []);

    const rowElements: MemoElement[] = [];
    const columnElements: MemoElement[] = [];
    for (const el of Object.values(model.elements)) {
        const group = el.attributes?.group;
        const permitted = (includeGroups.size === 0 || (group && includeGroups.has(group)))
            && (!group || !excludeGroups.has(group));
        if (!permitted) continue;
        if (rowKinds.has(el.kind)) rowElements.push(el);
        if (columnKinds.has(el.kind)) columnElements.push(el);
    }

    const parentOf = new Map<string, string>();
    for (const element of Object.values(model.elements)) {
        if (element.parentAction) parentOf.set(element.id, element.parentAction);
        else if (element.owner) parentOf.set(element.id, element.owner);
    }
    for (const rel of model.relationships) {
        if ((rel.type === 'composedOf' || rel.type === 'decomposedBy') && model.elements[rel.sourceId] && model.elements[rel.targetId]) {
            parentOf.set(rel.targetId, rel.sourceId);
        }
    }
    const representative = (element: MemoElement): MemoElement => {
        if (!options?.hierarchyParentKind) return element;
        let current: MemoElement | undefined = element;
        const visited = new Set<string>();
        while (current && !visited.has(current.id)) {
            visited.add(current.id);
            if (current.kind === options.hierarchyParentKind) return current;
            current = model.elements[parentOf.get(current.id) ?? ''];
        }
        return element;
    };
    const uniqueRepresentatives = (values: MemoElement[]) => [...new Map(values.map(el => {
        const parent = representative(el);
        return [parent.id, parent] as const;
    })).values()];
    rowElements.splice(0, rowElements.length, ...uniqueRepresentatives(rowElements));
    columnElements.splice(0, columnElements.length, ...uniqueRepresentatives(columnElements));

    const sortElements = (a: MemoElement, b: MemoElement) => {
        const kindCmp = a.kind.localeCompare(b.kind);
        return kindCmp !== 0 ? kindCmp : a.name.localeCompare(b.name);
    };
    rowElements.sort(sortElements);
    columnElements.sort(sortElements);

    const rowElementIds = rowElements.map(e => e.id);
    const columnElementIds = columnElements.map(e => e.id);
    const rowIndex = new Map<string, number>();
    const columnIndex = new Map<string, number>();
    rowElementIds.forEach((id, index) => rowIndex.set(id, index));
    columnElementIds.forEach((id, index) => columnIndex.set(id, index));

    const n = rowElementIds.length;
    const elements: DSMResult['elements'] = {};
    const memberCounts = new Map<string, number>();
    for (const el of Object.values(model.elements)) {
        const id = representative(el).id;
        memberCounts.set(id, (memberCounts.get(id) ?? 0) + 1);
    }
    for (const el of [...rowElements, ...columnElements]) {
        elements[el.id] = { name: el.name, kind: el.kind, layer: el.layer, allocatedTo: el.allocatedTo, group: el.attributes?.group, memberCount: memberCounts.get(el.id) };
    }

    const matrix: (DSMCell | null)[][] = Array.from({ length: n }, () =>
        Array.from({ length: columnElementIds.length }, () => null),
    );

    let totalDependencies = 0;
    for (const rel of model.relationships) {
        if (!relTypes.has(rel.type)) continue;
        const source = model.elements[rel.sourceId];
        const target = model.elements[rel.targetId];
        const sourceId = source ? representative(source).id : undefined;
        const targetId = target ? representative(target).id : undefined;
        const srcIdx = sourceId ? rowIndex.get(sourceId) : undefined;
        const tgtIdx = targetId ? columnIndex.get(targetId) : undefined;
        if (srcIdx === undefined || tgtIdx === undefined || sourceId === targetId) continue;

        let cell = matrix[srcIdx][tgtIdx];
        if (!cell) { cell = { count: 0, types: [], flowItems: [] }; matrix[srcIdx][tgtIdx] = cell; }
        cell.count++;
        if (!cell.types.includes(rel.type)) cell.types.push(rel.type);
        if (rel.flowItem && !cell.flowItems.includes(rel.flowItem)) cell.flowItems.push(rel.flowItem);
        totalDependencies++;
    }

    const isSquare = rowElementIds.length === columnElementIds.length
        && rowElementIds.every((id, index) => id === columnElementIds[index]);
    const clusters = shouldCluster && isSquare ? clusterDSM(rowElementIds, matrix) : new Map<number, string[]>();
    return { elementIds: rowElementIds, rowElementIds, columnElementIds, elements, matrix, clusters, totalDependencies };
}

function clusterDSM(elementIds: string[], matrix: (DSMCell | null)[][]): Map<number, string[]> {
    const n = elementIds.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);

    function find(x: number): number {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }
    function union(a: number, b: number): void {
        const ra = find(a), rb = find(b);
        if (ra === rb) return;
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[ra] > rank[rb]) parent[rb] = ra;
        else { parent[rb] = ra; rank[ra]++; }
    }

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && (matrix[i][j] || matrix[j][i])) union(i, j);
        }
    }

    const clusterMap = new Map<number, string[]>();
    for (let i = 0; i < n; i++) {
        const root = find(i);
        if (!clusterMap.has(root)) clusterMap.set(root, []);
        clusterMap.get(root)!.push(elementIds[i]);
    }

    const result = new Map<number, string[]>();
    let clusterId = 0;
    for (const members of clusterMap.values()) result.set(clusterId++, members);
    return result;
}

export function reorderDSM(dsm: DSMResult): DSMResult {
    const ordered: string[] = [];
    const placed = new Set<string>();
    for (const [, members] of dsm.clusters) {
        for (const id of members) { if (!placed.has(id)) { ordered.push(id); placed.add(id); } }
    }
    for (const id of dsm.elementIds) { if (!placed.has(id)) ordered.push(id); }

    const n = ordered.length;
    const oldIdx = new Map<string, number>();
    for (let i = 0; i < dsm.elementIds.length; i++) oldIdx.set(dsm.elementIds[i], i);

    const matrix: (DSMCell | null)[][] = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => null),
    );
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            matrix[r][c] = dsm.matrix[oldIdx.get(ordered[r])!][oldIdx.get(ordered[c])!];
        }
    }
    return { ...dsm, elementIds: ordered, rowElementIds: ordered, columnElementIds: ordered, matrix };
}

/** Lightweight structural indicators for DSM review, without claiming a full solver analysis. */
export function analyzeDSM(dsm: DSMResult): DSMAnalysis {
    let feedbackDependencies = 0;
    let coupledPairs = 0;
    let isolatedElements = 0;
    let maxDegree = 0;
    for (let row = 0; row < dsm.matrix.length; row++) {
        let degree = 0;
        for (let col = 0; col < dsm.matrix[row].length; col++) {
            const cell = dsm.matrix[row][col];
            if (cell) degree += cell.count;
            if (row > col && cell) feedbackDependencies += cell.count;
            if (row > col && cell && dsm.matrix[col]?.[row]) coupledPairs++;
        }
        for (let col = 0; col < dsm.matrix.length; col++) degree += dsm.matrix[col]?.[row]?.count ?? 0;
        if (degree === 0) isolatedElements++;
        maxDegree = Math.max(maxDegree, degree);
    }
    return { feedbackDependencies, coupledPairs, isolatedElements, maxDegree };
}

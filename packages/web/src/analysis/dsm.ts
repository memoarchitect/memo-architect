// ─── Design Structure Matrix (DSM) — Browser-safe copy ──────────────────────
//
// Pure computation on MemoModelDTO — no Node.js dependencies.
// Canonical implementation lives in @memo/tools/browser/src/analysis/dsm.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO, MemoElement } from '@memo/tools/browser';

/** A single cell in the DSM matrix */
export interface DSMCell {
    count: number;
    types: string[];
    flowItems: string[];
}

/** DSM computation result */
export interface DSMResult {
    elementIds: string[];
    elements: Record<string, { name: string; kind: string; layer: string; allocatedTo?: string }>;
    matrix: (DSMCell | null)[][];
    clusters: Map<number, string[]>;
    totalDependencies: number;
}

export interface DSMOptions {
    kinds?: string[];
    relationshipTypes?: string[];
    cluster?: boolean;
}

const DEFAULT_KINDS = ['Function', 'Function', 'ActionDefinition', 'ActionUsage'];
const DEFAULT_REL_TYPES = ['flow', 'decomposedBy', 'composedOf', 'allocateTo', 'succession'];

export function computeDSM(model: MemoModelDTO, options?: DSMOptions): DSMResult {
    const kinds = new Set(options?.kinds ?? DEFAULT_KINDS);
    const relTypes = new Set(options?.relationshipTypes ?? DEFAULT_REL_TYPES);
    const shouldCluster = options?.cluster ?? true;

    const eligibleElements: MemoElement[] = [];
    for (const el of Object.values(model.elements)) {
        if (kinds.has(el.kind)) eligibleElements.push(el);
    }

    eligibleElements.sort((a, b) => {
        const kindCmp = a.kind.localeCompare(b.kind);
        return kindCmp !== 0 ? kindCmp : a.name.localeCompare(b.name);
    });

    const elementIds = eligibleElements.map(e => e.id);
    const idToIdx = new Map<string, number>();
    for (let i = 0; i < elementIds.length; i++) idToIdx.set(elementIds[i], i);

    const n = elementIds.length;
    const elements: DSMResult['elements'] = {};
    for (const el of eligibleElements) {
        elements[el.id] = { name: el.name, kind: el.kind, layer: el.layer, allocatedTo: el.allocatedTo };
    }

    const matrix: (DSMCell | null)[][] = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => null),
    );

    let totalDependencies = 0;
    for (const rel of model.relationships) {
        if (!relTypes.has(rel.type)) continue;
        const srcIdx = idToIdx.get(rel.sourceId);
        const tgtIdx = idToIdx.get(rel.targetId);
        if (srcIdx === undefined || tgtIdx === undefined || srcIdx === tgtIdx) continue;

        let cell = matrix[srcIdx][tgtIdx];
        if (!cell) { cell = { count: 0, types: [], flowItems: [] }; matrix[srcIdx][tgtIdx] = cell; }
        cell.count++;
        if (!cell.types.includes(rel.type)) cell.types.push(rel.type);
        if (rel.flowItem && !cell.flowItems.includes(rel.flowItem)) cell.flowItems.push(rel.flowItem);
        totalDependencies++;
    }

    const clusters = shouldCluster ? clusterDSM(elementIds, matrix) : new Map<number, string[]>();
    return { elementIds, elements, matrix, clusters, totalDependencies };
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
    return { ...dsm, elementIds: ordered, matrix };
}

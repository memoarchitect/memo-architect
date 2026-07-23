import type { Edge, Node } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import type { LayoutResult } from '../layout';

const ACTOR_KINDS = /(?:Actor|User)$/;
const USE_CASE_KINDS = new Set(['UseCase']);
const ASSOCIATION_TYPES = new Set(['Initiates', 'ParticipatesIn', 'Performs', 'InteractsWith', 'Includes', 'Extends']);
type EdgeStyle = 'straight' | 'orthogonal' | 'curved';

export function isUseCaseActor(element: MemoElement): boolean {
    return ACTOR_KINDS.test(element.kind) || element.construct === 'actor';
}

export function isUseCase(element: MemoElement): boolean {
    return USE_CASE_KINDS.has(element.kind) || element.construct === 'use case';
}

export interface UseCaseViewOptions {
    viewpointFilter?: (element: MemoElement) => boolean;
    systemName?: string;
    /** L0 shows roots; L1 includes direct children. "all" shows the full hierarchy. */
    level?: number | 'all';
    edgeStyle?: EdgeStyle;
}

/** Read UCD presentation configuration from model-owned view hints, never UI state. */
export function useCaseViewOptions(properties?: Record<string, string>): Pick<UseCaseViewOptions, 'level' | 'edgeStyle'> {
    const hint = `${properties?.layoutHint ?? ''};${properties?.styleHint ?? ''}`;
    const levelMatch = /(?:usecase:)?level\s*=\s*(all|\d+)/i.exec(hint);
    const edgeMatch = /(?:edge|routing)\s*=\s*(straight|orthogonal|curved)/i.exec(hint);
    return {
        level: levelMatch?.[1] === 'all' ? 'all' : levelMatch ? Number(levelMatch[1]) : 'all',
        edgeStyle: (edgeMatch?.[1]?.toLowerCase() as EdgeStyle | undefined) ?? 'orthogonal',
    };
}

/** Lay out a classic use-case diagram: actors outside a system boundary, use cases inside. */
export function computeUseCaseViewLayout(model: MemoModelDTO, options: UseCaseViewOptions = {}): LayoutResult {
    const visible = Object.values(model.elements).filter(element => !options.viewpointFilter || options.viewpointFilter(element));
    const allUseCases = visible.filter(isUseCase);
    const relationships = model.relationships.filter(rel => ASSOCIATION_TYPES.has(rel.type));
    // Includes creates the presentation hierarchy. An included use case has
    // one parent; L0 therefore means a root use case with no parent.
    const parentIds = new Map<string, string[]>();
    for (const rel of relationships.filter(rel => rel.type === 'Includes')) {
        const parents = parentIds.get(rel.targetId) ?? [];
        parents.push(rel.sourceId);
        parentIds.set(rel.targetId, parents);
    }
    const depth = (id: string, seen = new Set<string>()): number => {
        if (seen.has(id)) return 0;
        const parents = parentIds.get(id) ?? [];
        return parents.length === 0 ? 0 : 1 + Math.min(...parents.map(parent => depth(parent, new Set([...seen, id]))));
    };
    const level = options.level ?? 'all';
    const useCaseIds = new Set(allUseCases
        .filter(element => level === 'all' || depth(element.id) <= level)
        .map(element => element.id));
    // Extend links are semantic relationships, not hierarchy controls. Keep
    // both endpoints so a configured level never silently removes an extend.
    let changed = true;
    while (changed) {
        changed = false;
        for (const rel of relationships.filter(rel => rel.type === 'Extends')) {
            if (useCaseIds.has(rel.sourceId) || useCaseIds.has(rel.targetId)) {
                for (const id of [rel.sourceId, rel.targetId]) {
                    if (!useCaseIds.has(id) && allUseCases.some(element => element.id === id)) {
                        useCaseIds.add(id); changed = true;
                    }
                }
            }
        }
    }
    const useCases = allUseCases.filter(element => useCaseIds.has(element.id));
    const actors = visible.filter(isUseCaseActor).filter(actor => relationships.some(rel =>
        (rel.sourceId === actor.id && useCaseIds.has(rel.targetId)) || (rel.targetId === actor.id && useCaseIds.has(rel.sourceId))));
    const shown = new Set([...actors, ...useCases].map(element => element.id));
    if (useCases.length === 0) return { nodes: [], edges: [] };

    const cols = Math.max(1, Math.ceil(Math.sqrt(useCases.length)));
    const rows = Math.ceil(useCases.length / cols);
    const width = Math.max(520, cols * 210 + 100);
    const height = Math.max(320, rows * 150 + 100);
    const nodes: Node[] = [{
        id: '__use_case_boundary__', type: 'useCaseBoundary', position: { x: 130, y: 28 },
        data: { label: options.systemName || 'System Boundary', isFrame: true, kind: 'System Boundary' },
        style: { width, height }, draggable: false, selectable: false, zIndex: -1,
    }];
    useCases.forEach((element, index) => {
        const col = index % cols, row = Math.floor(index / cols);
        nodes.push({
            id: element.id, type: 'useCase', position: { x: 130 + 55 + col * 210, y: 28 + 62 + row * 150 },
            data: { label: element.name, kind: element.kind, color: '#E67E22' }, style: { width: 150, height: 82 },
        });
    });
    const leftActors = actors.filter((actor, index) => {
        const outgoing = relationships.filter(rel => rel.sourceId === actor.id && useCaseIds.has(rel.targetId)).length;
        const incoming = relationships.filter(rel => rel.targetId === actor.id && useCaseIds.has(rel.sourceId)).length;
        return outgoing > incoming || (outgoing === incoming && index % 2 === 0);
    });
    const rightActors = actors.filter(actor => !leftActors.includes(actor));
    [...leftActors, ...rightActors].forEach((element) => {
        const right = rightActors.includes(element);
        const row = (right ? rightActors : leftActors).indexOf(element);
        nodes.push({
            id: element.id, type: 'useCaseActor', position: { x: right ? 130 + width + 45 : 15, y: 65 + row * 115 },
            data: { label: element.name, kind: element.kind, color: '#334155', side: right ? 'right' : 'left' }, style: { width: 95, height: 86 },
        });
    });
    const edgeType = options.edgeStyle === 'straight' ? 'straight' : options.edgeStyle === 'curved' ? 'bezier' : 'smoothstep';
    const edges: Edge[] = relationships
        .filter(rel => shown.has(rel.sourceId) && shown.has(rel.targetId))
        .map(rel => {
            const sourceIsRightActor = rightActors.some(actor => actor.id === rel.sourceId);
            return {
            id: rel.id, source: sourceIsRightActor ? rel.targetId : rel.sourceId, target: sourceIsRightActor ? rel.sourceId : rel.targetId,
            label: /^(Includes|Extends)$/.test(rel.type) ? `«${rel.type.toLowerCase()}»` : undefined,
            type: edgeType, data: { routing: options.edgeStyle ?? 'orthogonal' },
            style: { stroke: '#64748B', strokeWidth: 1.4, strokeDasharray: /^(Includes|Extends)$/.test(rel.type) ? '5 4' : undefined },
        }; });
    return { nodes, edges };
}

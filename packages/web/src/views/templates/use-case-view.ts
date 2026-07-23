import type { Edge, Node } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { routeOrthogonalEdges, type LayoutResult, type RouteObstacle } from '../layout';

const ACTOR_KINDS = /(?:Actor|User)$/;
const USE_CASE_KINDS = new Set(['UseCase']);
const ASSOCIATION_TYPES = new Set(['initiates', 'participatesin', 'performs', 'interactswith', 'includes', 'extends']);
export type UseCaseEdgeStyle = 'straight' | 'elbow' | 'rounded' | 'curved' | 'arc';

const relationshipType = (type: string) => type.toLowerCase();

export function isUseCaseActor(element: MemoElement): boolean {
    return ACTOR_KINDS.test(element.kind) || element.construct === 'actor';
}

export function isUseCase(element: MemoElement): boolean {
    return USE_CASE_KINDS.has(element.kind) || element.construct === 'use case';
}

/** Highest include-hierarchy depth available for the UCD display-level control. */
export function useCaseMaxDepth(model: MemoModelDTO): number {
    const ids = new Set(Object.values(model.elements).filter(isUseCase).map(element => element.id));
    const parentIds = new Map<string, string[]>();
    for (const rel of model.relationships.filter(rel => relationshipType(rel.type) === 'includes' && ids.has(rel.sourceId) && ids.has(rel.targetId))) {
        parentIds.set(rel.targetId, [...(parentIds.get(rel.targetId) ?? []), rel.sourceId]);
    }
    const depth = (id: string, seen = new Set<string>()): number => {
        if (seen.has(id)) return 0;
        const parents = parentIds.get(id) ?? [];
        return parents.length === 0 ? 0 : 1 + Math.min(...parents.map(parent => depth(parent, new Set([...seen, id]))));
    };
    return Math.max(0, ...[...ids].map(id => depth(id)));
}

export interface UseCaseViewOptions {
    viewpointFilter?: (element: MemoElement) => boolean;
    systemName?: string;
    /** L0 shows roots; L1 includes direct children. "all" shows the full hierarchy. */
    level?: number | 'all';
    edgeStyle?: UseCaseEdgeStyle;
    /** Actor ids whose associated use cases are excluded from this presentation. */
    hiddenActorIds?: ReadonlySet<string>;
}

export interface UseCaseActorOption { id: string; name: string; }

export function useCaseActorOptions(model: MemoModelDTO): UseCaseActorOption[] {
    const elements = Object.values(model.elements);
    const caseIds = new Set(elements.filter(isUseCase).map(element => element.id));
    const relatedActorIds = new Set(model.relationships
        .filter(rel => ASSOCIATION_TYPES.has(relationshipType(rel.type)))
        .flatMap(rel => caseIds.has(rel.sourceId) ? [rel.targetId] : caseIds.has(rel.targetId) ? [rel.sourceId] : []));
    return elements.filter(isUseCaseActor).filter(actor => relatedActorIds.has(actor.id))
        .map(actor => ({ id: actor.id, name: actor.name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Read UCD presentation configuration from model-owned view hints, never UI state. */
export function useCaseViewOptions(properties?: Record<string, string>): Pick<UseCaseViewOptions, 'level' | 'edgeStyle'> {
    const hint = `${properties?.layoutHint ?? ''};${properties?.styleHint ?? ''}`;
    const levelMatch = /(?:usecase:)?level\s*=\s*(all|\d+)/i.exec(hint);
    const edgeMatch = /(?:edge|routing)\s*=\s*(straight|orthogonal|elbow|rounded|curved|arc)/i.exec(hint);
    return {
        level: levelMatch?.[1] === 'all' ? 'all' : levelMatch ? Number(levelMatch[1]) : 'all',
        edgeStyle: ({ orthogonal: 'elbow' }[edgeMatch?.[1]?.toLowerCase() ?? ''] as UseCaseEdgeStyle | undefined)
            ?? (edgeMatch?.[1]?.toLowerCase() as UseCaseEdgeStyle | undefined) ?? 'rounded',
    };
}

/** Lay out a classic use-case diagram: actors outside a system boundary, use cases inside. */
export function computeUseCaseViewLayout(model: MemoModelDTO, options: UseCaseViewOptions = {}): LayoutResult {
    const visible = Object.values(model.elements).filter(element => !options.viewpointFilter || options.viewpointFilter(element));
    const allUseCases = visible.filter(isUseCase);
    const relationships = model.relationships.filter(rel => ASSOCIATION_TYPES.has(relationshipType(rel.type)));
    // Includes creates the presentation hierarchy. An included use case has
    // one parent; L0 therefore means a root use case with no parent.
    const parentIds = new Map<string, string[]>();
    for (const rel of relationships.filter(rel => relationshipType(rel.type) === 'includes')) {
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
        for (const rel of relationships.filter(rel => relationshipType(rel.type) === 'extends')) {
            if (useCaseIds.has(rel.sourceId) || useCaseIds.has(rel.targetId)) {
                for (const id of [rel.sourceId, rel.targetId]) {
                    if (!useCaseIds.has(id) && allUseCases.some(element => element.id === id)) {
                        useCaseIds.add(id); changed = true;
                    }
                }
            }
        }
    }
    const hiddenActorIds = options.hiddenActorIds ?? new Set<string>();
    for (const rel of relationships) {
        const actorId = useCaseIds.has(rel.sourceId) ? rel.targetId : useCaseIds.has(rel.targetId) ? rel.sourceId : undefined;
        if (actorId && hiddenActorIds.has(actorId)) {
            useCaseIds.delete(rel.sourceId);
            useCaseIds.delete(rel.targetId);
        }
    }
    const useCases = allUseCases.filter(element => useCaseIds.has(element.id));
    const actors = visible.filter(isUseCaseActor).filter(actor => !hiddenActorIds.has(actor.id)).filter(actor => relationships.some(rel =>
        (rel.sourceId === actor.id && useCaseIds.has(rel.targetId)) || (rel.targetId === actor.id && useCaseIds.has(rel.sourceId))));
    const shown = new Set([...actors, ...useCases].map(element => element.id));
    if (useCases.length === 0) return { nodes: [], edges: [] };

    const casesByLevel = new Map<number, MemoElement[]>();
    for (const useCase of useCases) {
        const caseLevel = depth(useCase.id);
        casesByLevel.set(caseLevel, [...(casesByLevel.get(caseLevel) ?? []), useCase]);
    }
    const levels = [...casesByLevel.keys()].sort((a, b) => a - b);
    // Each hierarchy level owns a compact grid: hierarchy is communicated by
    // the band position, while the grid avoids wasting a tall, sparse canvas.
    const gridColumns = new Map(levels.map(caseLevel => [caseLevel,
        Math.max(1, Math.ceil(Math.sqrt(casesByLevel.get(caseLevel)!.length))),
    ]));
    const levelWidths = levels.map(caseLevel => gridColumns.get(caseLevel)! * 205 + 35);
    const maxRows = Math.max(...levels.map(caseLevel =>
        Math.ceil(casesByLevel.get(caseLevel)!.length / gridColumns.get(caseLevel)!)));
    const width = Math.max(520, levelWidths.reduce((sum, value) => sum + value, 70));
    const height = Math.max(320, maxRows * 145 + 125);
    const nodes: Node[] = [{
        id: '__use_case_boundary__', type: 'useCaseBoundary', position: { x: 130, y: 28 },
        data: { label: options.systemName || 'System Boundary', isFrame: true, kind: 'System Boundary' },
        style: { width, height }, draggable: false, selectable: false, zIndex: -1,
    }];
    let bandX = 130 + 45;
    levels.forEach((caseLevel) => {
        const columns = gridColumns.get(caseLevel)!;
        (casesByLevel.get(caseLevel) ?? []).forEach((element, row) => {
        const column = row % columns;
        const gridRow = Math.floor(row / columns);
        nodes.push({
            id: element.id, type: 'useCase', position: { x: bandX + column * 205, y: 28 + 62 + gridRow * 145 },
            data: { label: element.name, kind: element.kind, color: '#E67E22', level: caseLevel }, style: { width: 170, height: 82 },
        });
        });
        bandX += columns * 205 + 35;
    });
    // Balance actors around the boundary. This shortens association routes and
    // avoids funneling every participant into the same gutter.
    const leftActors = actors.filter((_, index) => index % 2 === 0);
    const rightActors = actors.filter(actor => !leftActors.includes(actor));
    [...leftActors, ...rightActors].forEach((element) => {
        const right = rightActors.includes(element);
        const row = (right ? rightActors : leftActors).indexOf(element);
        nodes.push({
            id: element.id, type: 'useCaseActor', position: { x: right ? 130 + width + 45 : 15, y: 65 + row * 115 },
            data: { label: element.name, kind: element.kind, color: '#334155', side: right ? 'right' : 'left' }, style: { width: 95, height: 86 },
        });
    });
    const routing = options.edgeStyle ?? 'rounded';
    const edgeDrafts = relationships
        .filter(rel => shown.has(rel.sourceId) && shown.has(rel.targetId))
        .map(rel => {
            const sourceIsRightActor = rightActors.some(actor => actor.id === rel.sourceId);
            const source = sourceIsRightActor ? rel.targetId : rel.sourceId;
            const target = sourceIsRightActor ? rel.sourceId : rel.targetId;
            return { edge: {
            id: rel.id, source, target,
            label: /^(includes|extends)$/.test(relationshipType(rel.type)) ? `«${relationshipType(rel.type)}»` : undefined,
            type: 'useCaseEdge', data: { routing },
            style: { stroke: '#64748B', strokeWidth: 1.4, strokeDasharray: /^(includes|extends)$/.test(relationshipType(rel.type)) ? '5 4' : undefined },
        } as Edge, source, target }; });
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const dimensions = (node: Node) => ({
        width: Number(node.style?.width ?? 150), height: Number(node.style?.height ?? 82),
    });
    const endpoint = (id: string, side: 'left' | 'right') => {
        const node = nodeById.get(id)!;
        const size = dimensions(node);
        return { x: node.position.x + (side === 'right' ? size.width : 0), y: node.position.y + size.height / 2 };
    };
    const routeRequests = edgeDrafts.map(({ edge, source, target }) => {
        const sourceActor = actors.find(actor => actor.id === source);
        const targetActor = actors.find(actor => actor.id === target);
        const sourceSide: 'left' | 'right' = sourceActor ? (rightActors.includes(sourceActor) ? 'left' : 'right') : 'right';
        const targetSide: 'left' | 'right' = targetActor ? (rightActors.includes(targetActor) ? 'left' : 'right') : 'left';
        return {
            id: edge.id, source: endpoint(source, sourceSide), target: endpoint(target, targetSide),
            sourceNodeId: source, targetNodeId: target, sourceSide, targetSide,
        };
    });
    const obstacles: RouteObstacle[] = nodes
        .filter(node => node.type === 'useCase' || node.type === 'useCaseActor')
        .map(node => ({ id: node.id, x: node.position.x, y: node.position.y, ...dimensions(node) }));
    const routes = routing === 'straight' ? new Map<string, { x: number; y: number }[]>()
        : routeOrthogonalEdges(routeRequests, obstacles, 28);
    const edges: Edge[] = edgeDrafts.map(({ edge }) => ({
        ...edge,
        data: { ...edge.data, points: routes.get(edge.id) ?? [] },
    }));
    return { nodes, edges };
}

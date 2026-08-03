import type { NotationLayoutNode as Node, NotationLayoutEdge as Edge } from '../../diagram/notation-scene';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import {
    CONNECTOR_LABEL_HEIGHT, connectorLabelWidth, placeConnectorLabels,
    routeOrthogonalEdges, type LayoutResult, type RouteObstacle,
} from '../layout';

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
            ?? (edgeMatch?.[1]?.toLowerCase() as UseCaseEdgeStyle | undefined) ?? 'straight',
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

    const extendingCaseIds = new Set(relationships
        .filter(rel => relationshipType(rel.type) === 'extends')
        .map(rel => rel.sourceId));
    const casesByLevel = new Map<number, MemoElement[]>();
    for (const useCase of useCases) {
        if (extendingCaseIds.has(useCase.id)) continue;
        const caseLevel = depth(useCase.id);
        casesByLevel.set(caseLevel, [...(casesByLevel.get(caseLevel) ?? []), useCase]);
    }
    const levels = [...casesByLevel.keys()].sort((a, b) => a - b);
    // Constrained layered placement: include depth owns the horizontal rank.
    // An extension joins its base's rank directly beneath it, so its dashed
    // relationship stays a short local hop and it can never land on the row of
    // a neighbouring case.
    const ranks: MemoElement[][] = levels.map(caseLevel => [...(casesByLevel.get(caseLevel) ?? [])]);
    // A common use-case view has several independent root cases and no include
    // hierarchy. Treating depth as the only rank then creates one extremely
    // tall column with a mostly empty system boundary. Balance that flat case
    // into up to three columns; hierarchical views keep their semantic ranks.
    if (ranks.length === 1 && ranks[0].length > 4) {
        const roots = ranks[0];
        const columnCount = Math.min(3, Math.ceil(roots.length / 4));
        const rowsPerColumn = Math.ceil(roots.length / columnCount);
        ranks.splice(0, 1, ...Array.from({ length: columnCount }, (_, column) =>
            roots.slice(column * rowsPerColumn, (column + 1) * rowsPerColumn)));
    }
    const rankOf = new Map<string, number>();
    ranks.forEach((rank, index) => rank.forEach(element => rankOf.set(element.id, index)));
    const extensionsOfBase = new Map<string, MemoElement[]>();
    for (const rel of relationships.filter(rel => relationshipType(rel.type) === 'extends')) {
        const extension = useCases.find(element => element.id === rel.sourceId);
        const rankIndex = rankOf.get(rel.targetId);
        if (!extension || rankIndex === undefined || rankOf.has(extension.id)) continue;
        const rank = ranks[rankIndex];
        rank.splice(rank.findIndex(element => element.id === rel.targetId) + 1, 0, extension);
        rankOf.set(extension.id, rankIndex);
        extensionsOfBase.set(rel.targetId, [...(extensionsOfBase.get(rel.targetId) ?? []), extension]);
    }
    const extensionIds = new Set([...extensionsOfBase.values()].flat().map(element => element.id));

    // Crossing reduction: order each rank by the average row of what it is
    // wired to — its actors and the cases it is included by — sweeping forward
    // and back so an order settles against both neighbours.
    const neighboursOf = (id: string): string[] => relationships
        .filter(rel => rel.sourceId === id || rel.targetId === id)
        .map(rel => (rel.sourceId === id ? rel.targetId : rel.sourceId));
    const rowOf = new Map<string, number>();
    const reindexRows = () => ranks.forEach(rank => rank.forEach((element, row) => rowOf.set(element.id, row)));
    reindexRows();
    // Actors start ordered as the model lists them; their rows settle with the
    // cases they touch.
    actors.forEach((actor, index) => rowOf.set(actor.id, index));
    const barycentre = (id: string): number => {
        const rows = neighboursOf(id).map(neighbour => rowOf.get(neighbour)).filter((row): row is number => row !== undefined);
        return rows.length === 0 ? (rowOf.get(id) ?? 0) : rows.reduce((sum, row) => sum + row, 0) / rows.length;
    };
    for (let sweep = 0; sweep < 3; sweep++) {
        const order = sweep % 2 === 0 ? ranks : [...ranks].reverse();
        for (const rank of order) {
            // Only bases are ordered: an extension travels with the base it
            // extends and stays directly beneath it.
            const bases = rank.filter(element => !extensionIds.has(element.id));
            bases.sort((a, b) => barycentre(a.id) - barycentre(b.id));
            rank.splice(0, rank.length, ...bases.flatMap(base => [base, ...(extensionsOfBase.get(base.id) ?? [])]));
            reindexRows();
        }
        actors.sort((a, b) => barycentre(a.id) - barycentre(b.id));
        actors.forEach((actor, index) => rowOf.set(actor.id, index));
    }

    // ── Geometry: the frame is sized to what it holds, not to a fixed guess ──
    const CASE_W = 176, CASE_H = 88, RANK_GAP = 104, ROW_GAP = 40;
    const ACTOR_W = 104, ACTOR_H = 88, ACTOR_PITCH = 116;
    const PAD_X = 48, PAD_TOP = 62, PAD_BOTTOM = 44, SIDE_GAP = 76, MARGIN = 20;
    const maxRows = Math.max(1, ...ranks.map(rank => rank.length));
    const width = Math.max(520, ranks.length * CASE_W + Math.max(ranks.length - 1, 0) * RANK_GAP + PAD_X * 2);
    const height = Math.max(300, maxRows * CASE_H + (maxRows - 1) * ROW_GAP + PAD_TOP + PAD_BOTTOM);

    // Which flank each actor stands on: the side of the frame its cases sit
    // nearest, so an association crosses the boundary once and runs straight.
    const rankCentreX = (rankIndex: number) => PAD_X + rankIndex * (CASE_W + RANK_GAP) + CASE_W / 2;
    const actorSide = new Map<string, 'left' | 'right'>();
    for (const actor of actors) {
        const centres = neighboursOf(actor.id)
            .map(id => rankOf.get(id))
            .filter((rank): rank is number => rank !== undefined)
            .map(rankCentreX);
        const mean = centres.length ? centres.reduce((sum, x) => sum + x, 0) / centres.length : 0;
        actorSide.set(actor.id, centres.length === 0 || mean <= width / 2 ? 'left' : 'right');
    }
    const leftActors = actors.filter(actor => actorSide.get(actor.id) === 'left');
    const rightActors = actors.filter(actor => actorSide.get(actor.id) === 'right');

    const frameX = MARGIN + (leftActors.length ? ACTOR_W + SIDE_GAP : 0);
    const frameY = MARGIN;
    const nodes: Node[] = [{
        id: '__use_case_boundary__', type: 'useCaseBoundary', position: { x: frameX, y: frameY },
        data: { label: options.systemName || 'System Boundary', isFrame: true, kind: 'System Boundary' },
        style: { width, height }, draggable: false, selectable: false, zIndex: -1,
    }];
    const positions = new Map<string, { x: number; y: number }>();
    const contentTop = frameY + PAD_TOP;
    const contentHeight = height - PAD_TOP - PAD_BOTTOM;
    ranks.forEach((rank, rankIndex) => {
        const rankHeight = rank.length * CASE_H + (rank.length - 1) * ROW_GAP;
        // Each rank is centred on the frame, so a short rank does not leave the
        // diagram lopsided.
        let cursor = contentTop + (contentHeight - rankHeight) / 2;
        for (const element of rank) {
            const position = { x: frameX + PAD_X + rankIndex * (CASE_W + RANK_GAP), y: cursor };
            positions.set(element.id, position);
            nodes.push({
                id: element.id, type: 'useCase', position,
                data: { label: element.name, kind: element.kind, color: '#E67E22', level: depth(element.id) },
                style: { width: CASE_W, height: CASE_H },
            });
            cursor += CASE_H + ROW_GAP;
        }
    });

    // Actors sit beside the case they serve: each one is drawn at the average
    // height of its associations, then separated to a readable pitch.
    for (const side of ['left', 'right'] as const) {
        const column = side === 'left' ? leftActors : rightActors;
        const wanted = column.map(actor => {
            const ys = neighboursOf(actor.id)
                .map(id => positions.get(id))
                .filter((position): position is { x: number; y: number } => Boolean(position))
                .map(position => position.y);
            return {
                actor,
                y: ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : frameY + PAD_TOP,
            };
        }).sort((a, b) => a.y - b.y);
        let previousBottom = -Infinity;
        for (const { actor, y } of wanted) {
            const top = Math.max(y, previousBottom + ACTOR_PITCH - ACTOR_H, MARGIN);
            previousBottom = top + ACTOR_H;
            nodes.push({
                id: actor.id, type: 'useCaseActor',
                position: { x: side === 'left' ? MARGIN : frameX + width + SIDE_GAP, y: top },
                data: { label: actor.name, kind: actor.kind, color: '#334155', side },
                style: { width: ACTOR_W, height: ACTOR_H },
            });
        }
    }
    const routing = options.edgeStyle ?? 'straight';
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
    type Face = 'left' | 'right' | 'top' | 'bottom';
    const faceOffset = (id: string, side: Face) => {
        const size = dimensions(nodeById.get(id)!);
        return side === 'left' ? { x: 0, y: size.height / 2 }
            : side === 'right' ? { x: size.width, y: size.height / 2 }
            : side === 'top' ? { x: size.width / 2, y: 0 }
            : { x: size.width / 2, y: size.height };
    };
    const endpoint = (id: string, side: Face) => {
        const node = nodeById.get(id)!;
        const offset = faceOffset(id, side);
        return { x: node.position.x + offset.x, y: node.position.y + offset.y };
    };
    const routeRequests = edgeDrafts.map(({ edge, source, target }) => {
        const sourceActor = actors.find(actor => actor.id === source);
        const targetActor = actors.find(actor => actor.id === target);
        // Ranks run left to right, so a case leaves right and is entered from
        // the left — except between two cases of the same rank (an extension
        // and its base), where the short way is straight up.
        const sameRank = !sourceActor && !targetActor
            && rankOf.get(source) !== undefined && rankOf.get(source) === rankOf.get(target);
        const above = sameRank && (positions.get(source)?.y ?? 0) < (positions.get(target)?.y ?? 0);
        const sourceSide: Face = sourceActor ? (rightActors.includes(sourceActor) ? 'left' : 'right')
            : sameRank ? (above ? 'bottom' : 'top') : 'right';
        const targetSide: Face = targetActor ? (rightActors.includes(targetActor) ? 'left' : 'right')
            : sameRank ? (above ? 'top' : 'bottom') : 'left';
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
    // «includes» / «extends» stereotypes are placed as one set, so two of them
    // through the same corridor do not print on top of each other or on a line.
    const labelPoints = placeConnectorLabels(
        edgeDrafts.flatMap(({ edge }) => {
            const points = routes.get(edge.id);
            const label = edge.label as string | undefined;
            return label && points && points.length >= 2
                ? [{ id: edge.id, points, width: connectorLabelWidth(label), height: CONNECTOR_LABEL_HEIGHT }]
                : [];
        }),
        obstacles,
    );
    const requestById = new Map(routeRequests.map(request => [request.id, request]));
    const edges: Edge[] = edgeDrafts.map(({ edge }) => ({
        ...edge,
        data: {
            ...edge.data,
            points: routes.get(edge.id) ?? [],
            labelPoint: labelPoints.get(edge.id),
            // The shared drag scheduler uses these relative anchors to reroute
            // against current node positions after a user moves any endpoint.
            sourceOffset: faceOffset(edge.source, requestById.get(edge.id)!.sourceSide),
            targetOffset: faceOffset(edge.target, requestById.get(edge.id)!.targetSide),
            sourceSide: requestById.get(edge.id)!.sourceSide,
            targetSide: requestById.get(edge.id)!.targetSide,
        },
    }));
    return { nodes, edges };
}

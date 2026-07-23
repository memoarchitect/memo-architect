import type { Edge, Node } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { routeOrthogonalEdges, type LayoutResult, type RouteObstacle } from '../layout';

const CONTEXT_RELATIONSHIPS = new Set(['interactswith', 'exchangeswith', 'appliesincontext', 'connectsphysically']);
const ACTOR_KINDS = /(?:Actor|User)$/;

const relationshipType = (type: string) => type.toLowerCase();
const isEnvironment = (element: MemoElement) => element.kind === 'UseContext'
    || /environment|context/i.test(element.name)
    || /environment/i.test(String(element.attributes['entityKind'] ?? ''));
const isSystemOfInterest = (element: MemoElement) =>
    /systemofinterest|system-of-interest/i.test(String(element.attributes['contextRole'] ?? ''))
    || String(element.attributes['isSystemOfInterest'] ?? '').toLowerCase() === 'true';

/**
 * Build a system-context view: one black-box system inside its scope boundary,
 * with only relevant external entities and boundary-crossing interactions.
 */
export function computeContextViewLayout(model: MemoModelDTO, systemName?: string): LayoutResult {
    const allElements = Object.values(model.elements);
    const relationships = model.relationships.filter(rel => CONTEXT_RELATIONSHIPS.has(relationshipType(rel.type)));
    const referenced = new Set(relationships.flatMap(rel => [rel.sourceId, rel.targetId]));
    const elements = allElements.filter(element => referenced.has(element.id));
    if (elements.length === 0) return { nodes: [], edges: [] };

    const degree = (element: MemoElement) => relationships.filter(rel => rel.sourceId === element.id || rel.targetId === element.id).length;
    const system = elements.find(isSystemOfInterest)
        ?? elements.find(element => /system/i.test(element.name))
        ?? [...elements].sort((a, b) => degree(b) - degree(a))[0];
    const external = elements.filter(element => element.id !== system.id);
    const boundaryWidth = 510;
    const boundaryHeight = Math.max(310, 225 + Math.ceil(external.length / 2) * 35);
    const boundaryX = 250, boundaryY = 92;
    const nodes: Node[] = [{
        id: '__context_boundary__', type: 'contextBoundary', position: { x: boundaryX, y: boundaryY },
        data: { label: `${systemName ?? system.name} — System Boundary`, isFrame: true },
        style: { width: boundaryWidth, height: boundaryHeight }, draggable: false, selectable: false, zIndex: -1,
    }, {
        id: system.id, type: 'contextSystem', position: { x: boundaryX + 145, y: boundaryY + 105 },
        data: { label: system.name, kind: system.kind }, style: { width: 220, height: 100 },
    }];
    const systemCenter = { x: boundaryX + boundaryWidth / 2, y: boundaryY + boundaryHeight / 2 };
    const sideSlots = {
        left: external.filter((_, index) => index % 4 === 0),
        right: external.filter((_, index) => index % 4 === 1),
        top: external.filter((_, index) => index % 4 === 2),
        bottom: external.filter((_, index) => index % 4 === 3),
    };
    const positions = new Map<string, { x: number; y: number }>();
    const place = (items: MemoElement[], side: keyof typeof sideSlots) => items.forEach((element, index) => {
        const category = isEnvironment(element) ? 'environment' : ACTOR_KINDS.test(element.kind) ? 'person' : 'system';
        const gap = side === 'left' || side === 'right' ? 105 : 165;
        const offset = index - (items.length - 1) / 2;
        const position = side === 'left' ? { x: 25, y: systemCenter.y - 38 + offset * gap }
            : side === 'right' ? { x: boundaryX + boundaryWidth + 70, y: systemCenter.y - 38 + offset * gap }
                : side === 'top' ? { x: systemCenter.x - 85 + offset * gap, y: 12 }
                    : { x: systemCenter.x - 85 + offset * gap, y: boundaryY + boundaryHeight + 65 };
        positions.set(element.id, position);
        nodes.push({ id: element.id, type: 'contextExternal', position, data: { label: element.name, kind: element.kind, category }, style: { width: 170, height: 76 } });
    });
    place(sideSlots.left, 'left'); place(sideSlots.right, 'right'); place(sideSlots.top, 'top'); place(sideSlots.bottom, 'bottom');

    const shown = new Set(nodes.map(node => node.id));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const size = (node: Node) => ({ width: Number(node.style?.width ?? 170), height: Number(node.style?.height ?? 76) });
    const sideFor = (source: string, target: string): 'left' | 'right' | 'top' | 'bottom' => {
        const a = nodeById.get(source)!, b = nodeById.get(target)!;
        const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y;
        return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top');
    };
    const anchor = (node: Node, side: ReturnType<typeof sideFor>) => {
        const dimensions = size(node);
        return side === 'left' ? { x: node.position.x, y: node.position.y + dimensions.height / 2 }
            : side === 'right' ? { x: node.position.x + dimensions.width, y: node.position.y + dimensions.height / 2 }
                : side === 'top' ? { x: node.position.x + dimensions.width / 2, y: node.position.y }
                    : { x: node.position.x + dimensions.width / 2, y: node.position.y + dimensions.height };
    };
    const drafts = relationships.filter(rel => shown.has(rel.sourceId) && shown.has(rel.targetId)).map(rel => {
        const sourceSide = sideFor(rel.sourceId, rel.targetId);
        const targetSide = sideFor(rel.targetId, rel.sourceId);
        return { rel, sourceSide, targetSide, source: anchor(nodeById.get(rel.sourceId)!, sourceSide), target: anchor(nodeById.get(rel.targetId)!, targetSide) };
    });
    const obstacles: RouteObstacle[] = nodes.filter(node => !node.data.isFrame).map(node => ({ id: node.id, x: node.position.x, y: node.position.y, ...size(node) }));
    const routes = routeOrthogonalEdges(drafts.map(draft => ({ id: draft.rel.id, source: draft.source, target: draft.target, sourceNodeId: draft.rel.sourceId, targetNodeId: draft.rel.targetId, sourceSide: draft.sourceSide, targetSide: draft.targetSide })), obstacles, 24);
    const edges: Edge[] = drafts.map(draft => {
        const sourceSize = size(nodeById.get(draft.rel.sourceId)!);
        const targetSize = size(nodeById.get(draft.rel.targetId)!);
        const offset = (side: ReturnType<typeof sideFor>, dimensions: { width: number; height: number }) => side === 'left' ? { x: 0, y: dimensions.height / 2 }
            : side === 'right' ? { x: dimensions.width, y: dimensions.height / 2 }
                : side === 'top' ? { x: dimensions.width / 2, y: 0 } : { x: dimensions.width / 2, y: dimensions.height };
        return { id: draft.rel.id, source: draft.rel.sourceId, target: draft.rel.targetId, type: 'useCaseEdge',
            label: `«${relationshipType(draft.rel.type)}»`, style: { stroke: '#0F766E', strokeWidth: 1.5 },
            data: { routing: 'rounded', points: routes.get(draft.rel.id) ?? [draft.source, draft.target], sourceSide: draft.sourceSide, targetSide: draft.targetSide, sourceOffset: offset(draft.sourceSide, sourceSize), targetOffset: offset(draft.targetSide, targetSize) } };
    });
    return { nodes, edges };
}

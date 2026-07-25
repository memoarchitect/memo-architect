// ─── System Context View Template ────────────────────────────────────────────
//
// The classic context diagram: one black-box system inside its scope boundary,
// flanked by the external entities it exchanges with. Placement follows the
// direction of the exchange — entities that feed the system stand to its left,
// entities it feeds stand to its right — and each entity is ordered down its
// column so its connector runs straight in. Connection points are spread along
// the system's faces rather than converging on one spot, so a busy context
// reads as a set of distinct exchanges instead of a star.
//
// Boundary ports are deliberately excluded: they are internal interface detail
// that belongs to an IBD, and drawing them here turns the context of a system
// into a list of its plumbing.
// ─────────────────────────────────────────────────────────────────────────────

import type { Edge, Node } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import {
    CONNECTOR_LABEL_HEIGHT, connectorLabelWidth, placeConnectorLabels,
    routeOrthogonalEdges, type LayoutResult, type RouteObstacle, type RoutePoint,
} from '../layout';
import { isPortElement } from './interconnection-view';

const CONTEXT_RELATIONSHIPS = new Set(['interactswith', 'exchangeswith', 'appliesincontext', 'connectsphysically']);
const ACTOR_KINDS = /(?:Actor|User)$/;

const relationshipType = (type: string) => type.toLowerCase();
const isEnvironment = (element: MemoElement) => element.kind === 'UseContext'
    || /environment|context/i.test(element.name)
    || /environment/i.test(String(element.attributes['entityKind'] ?? ''));
const isSystemOfInterest = (element: MemoElement) =>
    /systemofinterest|system-of-interest/i.test(String(element.attributes['contextRole'] ?? ''))
    || String(element.attributes['isSystemOfInterest'] ?? '').toLowerCase() === 'true';

// ─── Geometry (px) ───────────────────────────────────────────────────────────

const EXTERNAL_H = 76;
const EXTERNAL_MIN_W = 170;
const EXTERNAL_MAX_W = 238;
const COLUMN_GAP = 30;      // vertical gap between entities in one column
const SIDE_GAP = 104;       // gap between a column and the scope boundary
const SYSTEM_W = 240;
const SYSTEM_H = 108;
const BOUNDARY_PAD_X = 92;
const BOUNDARY_PAD_Y = 74;
const MARGIN = 40;

/** Entity box width from its label, capped so one long name cannot stretch the board. */
const externalWidth = (name: string): number =>
    Math.min(Math.max(name.length * 7.4 + 28, EXTERNAL_MIN_W), EXTERNAL_MAX_W);

type Side = 'left' | 'right';

/**
 * Which flank an external entity belongs on: what it sends to the system puts
 * it on the left, what it receives puts it on the right. An entity that does
 * both, or neither, joins the lighter column so the two sides stay balanced.
 */
export function contextEntitySides(
    externalIds: string[],
    exchanges: { sourceId: string; targetId: string }[],
    systemId: string,
): Map<string, Side> {
    const sides = new Map<string, Side>();
    const undecided: string[] = [];
    for (const id of externalIds) {
        const feeds = exchanges.some(rel => rel.sourceId === id && rel.targetId === systemId);
        const isFed = exchanges.some(rel => rel.sourceId === systemId && rel.targetId === id);
        if (feeds && !isFed) sides.set(id, 'left');
        else if (isFed && !feeds) sides.set(id, 'right');
        else undecided.push(id);
    }
    for (const id of undecided) {
        const left = [...sides.values()].filter(side => side === 'left').length;
        const right = sides.size - left;
        sides.set(id, left <= right ? 'left' : 'right');
    }
    return sides;
}

/**
 * Build a system-context view: one black-box system inside its scope boundary,
 * with only relevant external entities and boundary-crossing interactions.
 */
export function computeContextViewLayout(model: MemoModelDTO, systemName?: string): LayoutResult {
    const allElements = Object.values(model.elements);
    const relationships = model.relationships.filter(rel => CONTEXT_RELATIONSHIPS.has(relationshipType(rel.type)));
    const referenced = new Set(relationships.flatMap(rel => [rel.sourceId, rel.targetId]));
    const elements = allElements.filter(element => referenced.has(element.id) && !isPortElement(element));
    if (elements.length === 0) return { nodes: [], edges: [] };

    const degree = (element: MemoElement) => relationships.filter(rel => rel.sourceId === element.id || rel.targetId === element.id).length;
    const system = elements.find(isSystemOfInterest)
        ?? elements.find(element => /system/i.test(element.name))
        ?? [...elements].sort((a, b) => degree(b) - degree(a))[0];
    const external = elements.filter(element => element.id !== system.id);
    const shownIds = new Set([system.id, ...external.map(element => element.id)]);
    const exchanges = relationships.filter(rel => shownIds.has(rel.sourceId) && shownIds.has(rel.targetId));

    // ── Columns: direction decides the flank, then entities of a kind stay
    // together so the diagram reads as roles rather than a jumble ──
    const sides = contextEntitySides(external.map(element => element.id), exchanges, system.id);
    const rank = (element: MemoElement) => ACTOR_KINDS.test(element.kind) ? 0 : isEnvironment(element) ? 1 : 2;
    const column = (side: Side) => external
        .filter(element => sides.get(element.id) === side)
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    const columns = { left: column('left'), right: column('right') };

    const columnHeight = (items: MemoElement[]) =>
        items.length === 0 ? 0 : items.length * EXTERNAL_H + (items.length - 1) * COLUMN_GAP;
    const columnWidth = (items: MemoElement[]) =>
        items.length === 0 ? 0 : Math.max(...items.map(element => externalWidth(element.name)));

    const boundaryWidth = SYSTEM_W + BOUNDARY_PAD_X * 2;
    const boundaryHeight = SYSTEM_H + BOUNDARY_PAD_Y * 2;
    const centreY = MARGIN + Math.max(boundaryHeight, columnHeight(columns.left), columnHeight(columns.right)) / 2;
    const leftWidth = columnWidth(columns.left);
    const boundaryX = MARGIN + (leftWidth > 0 ? leftWidth + SIDE_GAP : 0);
    const boundaryY = centreY - boundaryHeight / 2;
    const rightX = boundaryX + boundaryWidth + SIDE_GAP;

    const nodes: Node[] = [{
        id: '__context_boundary__', type: 'contextBoundary', position: { x: boundaryX, y: boundaryY },
        data: { label: `${systemName ?? system.name} — System Boundary`, isFrame: true },
        style: { width: boundaryWidth, height: boundaryHeight }, draggable: false, selectable: false, zIndex: -1,
    }, {
        id: system.id, type: 'contextSystem',
        position: { x: boundaryX + BOUNDARY_PAD_X, y: boundaryY + BOUNDARY_PAD_Y },
        data: { label: system.name, kind: system.kind }, style: { width: SYSTEM_W, height: SYSTEM_H },
    }];

    const placed = new Map<string, { x: number; y: number; width: number; height: number; side: Side }>();
    for (const side of ['left', 'right'] as const) {
        const items = columns[side];
        let cursor = centreY - columnHeight(items) / 2;
        for (const element of items) {
            const width = externalWidth(element.name);
            const x = side === 'left' ? MARGIN + leftWidth - width : rightX;
            placed.set(element.id, { x, y: cursor, width, height: EXTERNAL_H, side });
            nodes.push({
                id: element.id, type: 'contextExternal', position: { x, y: cursor },
                data: {
                    label: element.name, kind: element.kind,
                    category: isEnvironment(element) ? 'environment' : ACTOR_KINDS.test(element.kind) ? 'person' : 'system',
                },
                style: { width, height: EXTERNAL_H },
            });
            cursor += EXTERNAL_H + COLUMN_GAP;
        }
    }

    // ── Anchors. Connectors to the system spread along the face they arrive
    // on, in the order of the entities they come from, so parallel exchanges
    // stay parallel instead of converging on the box centre ──
    const systemRect = { x: boundaryX + BOUNDARY_PAD_X, y: boundaryY + BOUNDARY_PAD_Y, width: SYSTEM_W, height: SYSTEM_H };
    const faceOrder = { left: [] as string[], right: [] as string[] };
    for (const rel of exchanges) {
        const otherId = rel.sourceId === system.id ? rel.targetId : rel.sourceId;
        if (rel.sourceId !== system.id && rel.targetId !== system.id) continue;
        const side = placed.get(otherId)?.side;
        if (side && !faceOrder[side].includes(rel.id)) faceOrder[side].push(rel.id);
    }
    for (const side of ['left', 'right'] as const) {
        faceOrder[side].sort((a, b) => {
            const other = (id: string) => {
                const rel = exchanges.find(candidate => candidate.id === id)!;
                return placed.get(rel.sourceId === system.id ? rel.targetId : rel.sourceId)?.y ?? 0;
            };
            return other(a) - other(b);
        });
    }
    const systemAnchor = (relId: string, side: Side): RoutePoint => {
        const order = faceOrder[side];
        const index = Math.max(order.indexOf(relId), 0);
        return {
            x: side === 'left' ? systemRect.x : systemRect.x + systemRect.width,
            y: systemRect.y + systemRect.height * (index + 0.5) / Math.max(order.length, 1),
        };
    };
    const entityAnchor = (id: string, side: Side): RoutePoint => {
        const rect = placed.get(id)!;
        return { x: side === 'left' ? rect.x : rect.x + rect.width, y: rect.y + rect.height / 2 };
    };
    /** The face each end of an exchange leaves from. */
    const endpointSide = (id: string, otherId: string): Side => {
        if (id === system.id) return placed.get(otherId)?.side === 'right' ? 'right' : 'left';
        const own = placed.get(id)!;
        // Entity to entity: face whichever way the other one lies.
        const other = otherId === system.id ? systemRect : placed.get(otherId)!;
        return other.x + (otherId === system.id ? systemRect.width : placed.get(otherId)!.width) / 2
            >= own.x + own.width / 2 ? 'right' : 'left';
    };

    const drafts = exchanges.map(rel => {
        const sourceSide = endpointSide(rel.sourceId, rel.targetId);
        const targetSide = endpointSide(rel.targetId, rel.sourceId);
        const anchorFor = (id: string, side: Side) => id === system.id
            ? systemAnchor(rel.id, side)
            : entityAnchor(id, side);
        return {
            rel,
            sourceSide, targetSide,
            source: anchorFor(rel.sourceId, sourceSide),
            target: anchorFor(rel.targetId, targetSide),
        };
    });

    const obstacles: RouteObstacle[] = nodes
        .filter(node => !node.data.isFrame)
        .map(node => ({
            id: node.id, x: node.position.x, y: node.position.y,
            width: Number(node.style?.width ?? EXTERNAL_MIN_W), height: Number(node.style?.height ?? EXTERNAL_H),
        }));
    const routes = routeOrthogonalEdges(drafts.map(draft => ({
        id: draft.rel.id, source: draft.source, target: draft.target,
        sourceNodeId: draft.rel.sourceId, targetNodeId: draft.rel.targetId,
        sourceSide: draft.sourceSide, targetSide: draft.targetSide,
    })), obstacles, 24);
    // Placed together, so two exchanges through the same corridor do not stack
    // their stereotype labels on top of one another.
    const labels = new Map(drafts.map(draft => [draft.rel.id, `«${relationshipType(draft.rel.type)}»`]));
    const labelPoints = placeConnectorLabels(
        drafts.flatMap(draft => {
            const points = routes.get(draft.rel.id);
            const label = labels.get(draft.rel.id)!;
            return points && points.length >= 2
                ? [{ id: draft.rel.id, points, width: connectorLabelWidth(label), height: CONNECTOR_LABEL_HEIGHT }]
                : [];
        }),
        obstacles,
    );

    const edges: Edge[] = drafts.map(draft => {
        const anchorOffset = (id: string, side: Side, point: RoutePoint) => {
            const rect = id === system.id ? systemRect : placed.get(id)!;
            return { x: point.x - rect.x, y: point.y - rect.y, side };
        };
        return {
            id: draft.rel.id, source: draft.rel.sourceId, target: draft.rel.targetId, type: 'useCaseEdge',
            label: labels.get(draft.rel.id),
            style: { stroke: '#0F766E', strokeWidth: 1.5 },
            data: {
                routing: 'rounded',
                points: routes.get(draft.rel.id) ?? [draft.source, draft.target],
                labelPoint: labelPoints.get(draft.rel.id),
                sourceSide: draft.sourceSide, targetSide: draft.targetSide,
                sourceOffset: anchorOffset(draft.rel.sourceId, draft.sourceSide, draft.source),
                targetOffset: anchorOffset(draft.rel.targetId, draft.targetSide, draft.target),
            },
        };
    });
    return { nodes, edges };
}

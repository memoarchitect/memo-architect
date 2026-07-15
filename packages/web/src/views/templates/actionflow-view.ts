// ─── Action Flow View Template (KK-4) ────────────────────────────────────────
//
// Standard renderer template for the SysML v2 `actionflow` view kind:
// actions as process boxes with typed parameter ports, object/item flows
// labeled with the transported item, succession (control flow) ordering
// with start/done pseudo-nodes, and optional swimlanes grouped by the
// action's allocation target. Replaces the ad-hoc ActionFlowDiagram.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memo/core';
import { LAYER_COLORS } from '../../constants';
import { EDGE, FONT } from '../../styles/tokens';
import { elk, type LayoutResult } from '../layout';
import type { ActionFlowNodeData } from '../ActionFlowNode';
import { COMPOSITION_REL_TYPES } from './composition-tree';

/**
 * Fork/join control nodes (builder kinds `ForkNode` / `JoinNode`). They flow
 * through the graph like actions but render as synchronization bars and never
 * form their own swimlane.
 */
export function isControlNode(el: MemoElement): boolean {
    return el.kind === 'ForkNode' || el.kind === 'JoinNode';
}

/** Behavioral steps with no modeled flow or succession connection. */
export function findFloatingActions(
    actions: MemoElement[],
    model: MemoModelDTO,
): MemoElement[] {
    const actionIds = new Set(actions.filter(action => !isControlNode(action)).map(action => action.id));
    const connected = new Set<string>();
    for (const relationship of model.relationships) {
        if (relationship.type !== 'flow' && relationship.type !== 'succession') continue;
        if (actionIds.has(relationship.sourceId)) connected.add(relationship.sourceId);
        if (actionIds.has(relationship.targetId)) connected.add(relationship.targetId);
    }
    return actions.filter(action => !isControlNode(action) && !connected.has(action.id));
}

// ─── Element collection ──────────────────────────────────────────────────────

/**
 * The actions an Action Flow view renders: its visible action usages,
 * preferring nested actions (steps of a composite) over the composites
 * themselves so a flow shows steps, not wrappers.
 */
export function collectActionFlowActions(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
    expandedActionIds: ReadonlySet<string> = new Set(),
    focusActionId?: string,
): MemoElement[] {
    const all = Object.values(model.elements);
    const visible = viewpointFilter ? all.filter(viewpointFilter) : all;
    const actions = visible.filter(el =>
        el.construct === 'action' || el.kind === 'ActionUsage' || el.kind === 'ActionDefinition');
    const nested = actions.filter(el => el.parentAction);
    if (nested.length === 0) return actions;

    const actionById = new Map(actions.map(action => [action.id, action]));
    const projected: MemoElement[] = [];
    const include = (action: MemoElement) => {
        const children = actions.filter(candidate => candidate.parentAction === action.id);
        if (expandedActionIds.has(action.id) && children.length > 0) {
            for (const child of children) include(child);
            return;
        }
        projected.push(action);
    };
    if (focusActionId) {
        for (const child of actions.filter(action => action.parentAction === focusActionId)) include(child);
        return projected;
    }
    // A top-level composite is a wrapper for the view. Start with its direct
    // actions, then reveal deeper children only when their composite expands.
    for (const action of nested) {
        const parent = action.parentAction ? actionById.get(action.parentAction) : undefined;
        if (!parent?.parentAction) include(action);
    }
    return projected;
}

/**
 * Resolve an action usage's in/out parameter port names from the
 * ActionDefinition it is typed by (builder stores the type reference
 * in the `actionType` attribute) or its own parameters.
 */
export function actionPortNames(
    el: MemoElement,
    model: MemoModelDTO,
): { inPorts: string[]; outPorts: string[] } {
    const typeRef = el.attributes['actionType'];
    const def = typeRef ? model.elements[typeRef] : undefined;
    const params = (def?.construct === 'action' ? def.parameters : el.parameters) ?? [];
    return {
        inPorts: params.filter(p => p.direction === 'in' || p.direction === 'inout').map(p => p.name),
        outPorts: params.filter(p => p.direction === 'out' || p.direction === 'inout').map(p => p.name),
    };
}

// ─── Swimlanes ───────────────────────────────────────────────────────────────

const LANE_COLORS = [
    '#4A90D9', '#E67E22', '#2ECC71', '#9B59B6',
    '#E74C3C', '#1ABC9C', '#F39C12', '#7B68EE',
];

export const UNALLOCATED_LANE = 'Unallocated';
export const UNSTAGED_LANE = 'Unstaged';
export type ActionFlowLaneGrouping = 'allocation' | 'stage';
export type ActionFlowDisplayLevel = 'all' | number;

/** Resolve an allocated element to the ancestor displayed at a requested level. */
export function displayElementAtLevel(
    elementId: string,
    model: MemoModelDTO,
    requestedLevel: ActionFlowDisplayLevel = 'all',
): { id: string; level: number } {
    const parentOf = new Map<string, string>();
    for (const rel of model.relationships) {
        if (COMPOSITION_REL_TYPES.has(rel.type) && !parentOf.has(rel.targetId)) {
            parentOf.set(rel.targetId, rel.sourceId);
        }
    }
    const lineage = [elementId];
    const visited = new Set(lineage);
    let current = elementId;
    while (parentOf.has(current)) {
        const parent = parentOf.get(current)!;
        if (visited.has(parent)) break;
        lineage.unshift(parent);
        visited.add(parent);
        current = parent;
    }
    if (requestedLevel === 'all') return { id: elementId, level: lineage.length };
    const index = Math.min(Math.max(requestedLevel, 1), lineage.length) - 1;
    return { id: lineage[index], level: index + 1 };
}

export function displayNameAtLevel(
    elementId: string,
    model: MemoModelDTO,
    requestedLevel: ActionFlowDisplayLevel = 'all',
): string {
    const resolvedId = displayElementAtLevel(elementId, model, requestedLevel).id;
    return model.elements[resolvedId]?.name ?? resolvedId;
}

/** Levels that every displayed responsibility target can resolve to. */
export function commonDisplayLevels(
    elementIds: Iterable<string>,
    model: MemoModelDTO,
): number[] {
    const depths = [...new Set(elementIds)].map(id => displayElementAtLevel(id, model).level);
    if (depths.length === 0) return [];
    const commonDepth = Math.min(...depths);
    // With roots only, selecting L1 is identical to All levels, so there is
    // no meaningful hierarchy control to show.
    if (commonDepth <= 1) return [];
    return Array.from({ length: commonDepth }, (_, index) => index + 1);
}

export interface LaneInfo {
    id: string;
    label: string;
    color: string;
    inspectElementId?: string;
}

/**
 * Group actions into swimlanes by their allocation target. Lane labels
 * resolve to the allocated element's display name when it exists.
 */
export function assignLanes(
    actions: MemoElement[],
    model: MemoModelDTO,
    grouping: ActionFlowLaneGrouping = 'allocation',
    displayLevel: ActionFlowDisplayLevel = 'all',
): { laneOf: Map<string, string>; lanes: LaneInfo[] } {
    const laneOf = new Map<string, string>();
    const lanes: LaneInfo[] = [];
    const seen = new Map<string, LaneInfo>();
    for (const el of actions) {
        // Fork/join bars sit between lanes; they never define one of their own.
        if (isControlNode(el)) continue;
        const allocatedLane = el.allocatedTo
            ? displayElementAtLevel(el.allocatedTo, model, displayLevel).id
            : UNALLOCATED_LANE;
        const laneId = grouping === 'stage'
            ? (el.attributes['stage'] || el.attributes['phase'] || UNSTAGED_LANE)
            : allocatedLane;
        laneOf.set(el.id, laneId);
        if (!seen.has(laneId)) {
            const lane: LaneInfo = {
                id: laneId,
                label: grouping === 'allocation' && laneId !== UNALLOCATED_LANE
                    ? (model.elements[laneId]?.name ?? laneId)
                    : laneId,
                color: LANE_COLORS[seen.size % LANE_COLORS.length],
                inspectElementId: grouping === 'allocation' && laneId !== UNALLOCATED_LANE
                    ? laneId
                    : Object.values(model.elements).find(candidate => candidate.id === laneId || candidate.name === laneId)?.id
                        ?? el.id,
            };
            seen.set(laneId, lane);
            lanes.push(lane);
        }
    }
    return { laneOf, lanes };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const PORT_ROW_HEIGHT = 18;
const HEADER_HEIGHT = 36;
const ALLOC_BADGE_HEIGHT = 20;
const LANE_PADDING = 36;
const LANE_GAP = 16;
const LANE_LABEL_WIDTH = 120;
const LANE_LABEL_HEIGHT = 32;

const CONTROL_BAR_LONG = 64;
const CONTROL_BAR_THICK = 10;

function nodeSize(
    el: MemoElement,
    ports: { inPorts: string[]; outPorts: string[] },
    direction: 'horizontal' | 'vertical',
) {
    if (isControlNode(el)) {
        // A bar drawn perpendicular to the reading direction.
        return direction === 'vertical'
            ? { width: CONTROL_BAR_LONG, height: CONTROL_BAR_THICK }
            : { width: CONTROL_BAR_THICK, height: CONTROL_BAR_LONG };
    }
    const portCount = Math.max(ports.inPorts.length, ports.outPorts.length, 0);
    const bodyHeight = portCount * PORT_ROW_HEIGHT;
    return {
        width: Math.max(el.name.length * 9 + 40, 140),
        height: HEADER_HEIGHT + bodyHeight + (bodyHeight > 0 ? 8 : 0)
            + (el.allocatedTo ? ALLOC_BADGE_HEIGHT : 0),
    };
}

export interface ActionFlowViewOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
    /** Band the layout into responsibility/stage lanes, including a single resolved lane. */
    swimlanes?: boolean;
    /** Group/highlight actions by performer/component or modeled stage. */
    laneGrouping?: ActionFlowLaneGrouping;
    /** Presentation only: group/display the modeled target at L1/L2/L3 ancestry. */
    displayLevel?: ActionFlowDisplayLevel;
    expandedActionIds?: ReadonlySet<string>;
    onToggleAction?: (id: string) => void;
    focusActionId?: string;
    /** Left-to-right or top-to-bottom reading direction for the flow. */
    direction?: 'horizontal' | 'vertical';
    /** Visible connection categories. Omit to render all flow categories. */
    visibleFlowKinds?: ReadonlySet<ActionFlowKind>;
    layoutProviderId?: string;
}

export type ActionFlowKind = 'control' | 'data' | 'energy' | 'material';

/**
 * Keep flow rendering and the connection inspector in the same practical
 * engineering vocabulary. A flow item without an explicit energy/material
 * cue is information/data by default.
 */
export function classifyFlowItem(flowItem?: string): Exclude<ActionFlowKind, 'control'> {
    const item = flowItem ?? '';
    if (/energy|power|voltage|current|thermal|heat/i.test(item)) return 'energy';
    if (/material|fluid|gas|liquid|batch|consumable/i.test(item)) return 'material';
    return 'data';
}

const FLOW_COLORS: Record<ActionFlowKind, string> = {
    control: '#4B5563',
    data: '#3498DB',
    energy: '#D97706',
    material: '#16A34A',
};

export async function computeActionFlowViewLayout(
    model: MemoModelDTO,
    options?: ActionFlowViewOptions,
): Promise<LayoutResult> {
    const actions = collectActionFlowActions(
        model,
        options?.viewpointFilter,
        options?.expandedActionIds,
        options?.focusActionId,
    );
    if (actions.length === 0) return { nodes: [], edges: [] };

    const actionIds = new Set(actions.map(a => a.id));
    const { laneOf, lanes } = assignLanes(actions, model, options?.laneGrouping, options?.displayLevel);
    const direction = options?.direction ?? 'horizontal';
    // A selected display level can legitimately roll every responsibility up
    // to one common system. Keep that single lane visible instead of dropping
    // the contextual background when the level changes.
    const swimlanes = (options?.swimlanes ?? true) && lanes.length >= 1;

    // ── Pseudo start/done nodes (builder convention: <parent>__start/__done) ──
    const rawSuccRels = model.relationships.filter(r => r.type === 'succession');
    const rawFlowRels = model.relationships.filter(r => r.type === 'flow');
    const expandedBoundaries = new Map<string, { first: string; last: string }>();
    for (const compositeId of options?.expandedActionIds ?? []) {
        const children = Object.values(model.elements).filter(el => el.parentAction === compositeId);
        if (children.length === 0) continue;
        const first = rawSuccRels.find(rel => rel.sourceId === `${compositeId}__start`)?.targetId
            ?? children[0].id;
        const last = rawSuccRels.find(rel => rel.targetId === `${compositeId}__done`)?.sourceId
            ?? children[children.length - 1].id;
        expandedBoundaries.set(compositeId, { first, last });
    }
    const projectRelationships = (rels: MemoRelationship[]) => rels.map(rel => ({
        ...rel,
        sourceId: expandedBoundaries.get(rel.sourceId)?.last ?? rel.sourceId,
        targetId: expandedBoundaries.get(rel.targetId)?.first ?? rel.targetId,
    }));
    const succRels = projectRelationships(rawSuccRels);
    const flowRels = projectRelationships(rawFlowRels);
    const pseudoIds = new Set<string>();
    for (const rel of succRels) {
        const startOwner = rel.sourceId.endsWith('__start') ? rel.sourceId.slice(0, -'__start'.length) : undefined;
        const doneOwner = rel.targetId.endsWith('__done') ? rel.targetId.slice(0, -'__done'.length) : undefined;
        if (startOwner && !expandedBoundaries.has(startOwner) && actionIds.has(rel.targetId)) pseudoIds.add(rel.sourceId);
        if (doneOwner && !expandedBoundaries.has(doneOwner) && actionIds.has(rel.sourceId)) pseudoIds.add(rel.targetId);
    }

    const graphIds = new Set([...actionIds, ...pseudoIds]);
    const visibleFlows = flowRels.filter(r =>
        graphIds.has(r.sourceId) && graphIds.has(r.targetId)
        && (!options?.visibleFlowKinds || options.visibleFlowKinds.has(classifyFlowItem(r.flowItem))),
    );
    const visibleFlowPairs = new Set(visibleFlows.map(r => `${r.sourceId}\u0000${r.targetId}`));
    // When an object flow and succession connect the same actions, render the
    // object flow once. Two parallel arrows communicate no extra information
    // and were being read as contradictory behavior.
    const visibleSuccs = succRels.filter(r =>
        graphIds.has(r.sourceId) && graphIds.has(r.targetId)
        && (!options?.visibleFlowKinds || options.visibleFlowKinds.has('control'))
        && !visibleFlowPairs.has(`${r.sourceId}\u0000${r.targetId}`)
    );

    // ── ELK layered left-to-right layout ──
    const portsByAction = new Map(actions.map(el => [el.id, actionPortNames(el, model)]));
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction === 'vertical' ? 'DOWN' : 'RIGHT',
            'elk.spacing.nodeNode': '40',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.componentComponent': '56',
        },
        children: [
            ...[...pseudoIds].map(id => ({ id, width: 28, height: 28 })),
            ...actions.map(el => ({ id: el.id, ...nodeSize(el, portsByAction.get(el.id)!, direction) })),
        ],
        edges: [...visibleFlows, ...visibleSuccs].map((rel, i) => ({
            id: `afe-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    const layouted = await elk.layout(elkGraph, { providerId: options?.layoutProviderId }) as {
        children?: { id: string; x?: number; y?: number; width?: number; height?: number }[];
    };
    const positions = new Map(
        (layouted.children ?? []).map(c => [c.id, {
            x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? 140, height: c.height ?? 56,
        }]),
    );

    // ── Swimlane banding: rows for horizontal flow, columns for vertical flow ──
    const laneColor = new Map(lanes.map(l => [l.id, l.color]));
    const laneNodes: Node[] = [];
    if (swimlanes && direction === 'horizontal') {
        // Order lanes by their actions' mean ELK y so banding follows the layout
        const laneY = new Map<string, number[]>();
        for (const el of actions) {
            if (isControlNode(el)) continue;
            const p = positions.get(el.id)!;
            const laneId = laneOf.get(el.id)!;
            if (!laneY.has(laneId)) laneY.set(laneId, []);
            laneY.get(laneId)!.push(p.y);
        }
        const orderedLanes = [...lanes].sort((a, b) => {
            const mean = (ys: number[]) => ys.reduce((s, y) => s + y, 0) / ys.length;
            return mean(laneY.get(a.id) ?? [0]) - mean(laneY.get(b.id) ?? [0]);
        });

        let minX = Infinity;
        let maxX = -Infinity;
        for (const el of actions) {
            const p = positions.get(el.id)!;
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x + p.width);
        }

        let bandTop = 0;
        for (const lane of orderedLanes) {
            const members = actions.filter(el => laneOf.get(el.id) === lane.id);
            // Preserve ELK's branch separation inside the lane. Flattening all
            // members onto one centerline made fork edges cross intervening
            // actions and visually attach to the wrong step.
            members.sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x
                || positions.get(a.id)!.y - positions.get(b.id)!.y);
            const originalTop = Math.min(...members.map(el => positions.get(el.id)!.y));
            let bandHeight = 0;
            const usedRanges: { x0: number; x1: number; bottom: number }[] = [];
            for (const el of members) {
                const p = positions.get(el.id)!;
                let y = bandTop + LANE_PADDING + (p.y - originalTop);
                for (const r of usedRanges) {
                    if (p.x < r.x1 && p.x + p.width > r.x0) y = Math.max(y, r.bottom + 16);
                }
                positions.set(el.id, { ...p, y });
                usedRanges.push({ x0: p.x, x1: p.x + p.width, bottom: y + p.height });
                bandHeight = Math.max(bandHeight, y + p.height - bandTop);
            }
            bandHeight += LANE_PADDING;
            laneNodes.push({
                id: `__lane_${lane.id}`,
                type: 'actionFlowLane',
                position: { x: minX - LANE_LABEL_WIDTH, y: bandTop },
                data: {
                    label: lane.label, color: lane.color, orientation: 'row',
                    inspectElementId: lane.inspectElementId, memberIds: members.map(member => member.id), isFrame: true,
                },
                style: {
                    width: (maxX - minX) + LANE_LABEL_WIDTH + LANE_PADDING,
                    height: bandHeight,
                },
                draggable: false,
                selectable: false,
                zIndex: -1,
            });
            bandTop += bandHeight + LANE_GAP;
        }

    } else if (swimlanes) {
        // Keep the temporal order that ELK established top-to-bottom, while
        // making each allocation a proper vertical lane column.
        let minY = Infinity;
        let maxY = -Infinity;
        for (const el of actions) {
            const p = positions.get(el.id)!;
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y + p.height);
        }

        let columnLeft = 0;
        for (const lane of lanes) {
            const members = actions
                .filter(el => laneOf.get(el.id) === lane.id)
                .sort((a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y
                    || positions.get(a.id)!.x - positions.get(b.id)!.x);
            const widestMember = Math.max(...members.map(el => positions.get(el.id)!.width));
            const columnWidth = widestMember + LANE_PADDING * 2;
            for (const el of members) {
                const p = positions.get(el.id)!;
                positions.set(el.id, { ...p, x: columnLeft + (columnWidth - p.width) / 2 });
            }
            laneNodes.push({
                id: `__lane_${lane.id}`,
                type: 'actionFlowLane',
                position: { x: columnLeft, y: minY - LANE_LABEL_HEIGHT },
                data: {
                    label: lane.label, color: lane.color, orientation: 'column',
                    inspectElementId: lane.inspectElementId, memberIds: members.map(member => member.id), isFrame: true,
                },
                style: {
                    width: columnWidth,
                    height: (maxY - minY) + LANE_LABEL_HEIGHT + LANE_PADDING,
                },
                draggable: false,
                selectable: false,
                zIndex: -1,
            });
            columnLeft += columnWidth + LANE_GAP;
        }

    }

    // ── Center fork/join bars on the cross-axis mean of their neighbors ──
    // Banding fixes each action's lane position; a control bar then slides to
    // the midpoint of the steps it splits/merges so it straddles those lanes.
    const controlNodes = actions.filter(isControlNode);
    if (controlNodes.length > 0) {
        for (const ctrl of controlNodes) {
            const p = positions.get(ctrl.id)!;
            const centers: number[] = [];
            for (const rel of [...visibleSuccs, ...visibleFlows]) {
                const other = rel.sourceId === ctrl.id ? rel.targetId
                    : rel.targetId === ctrl.id ? rel.sourceId : undefined;
                if (other === undefined) continue;
                const op = positions.get(other);
                if (!op) continue;
                centers.push(direction === 'vertical' ? op.x + op.width / 2 : op.y + op.height / 2);
            }
            if (centers.length === 0) continue;
            const mean = centers.reduce((s, v) => s + v, 0) / centers.length;
            positions.set(ctrl.id, direction === 'vertical'
                ? { ...p, x: mean - p.width / 2 }
                : { ...p, y: mean - p.height / 2 });
        }
    }

    // Start/done are boundary nodes, not lane members. Align each one to the
    // center of the action or control node it actually connects to; centering
    // against the entire lane stack placed them on arbitrary lane boundaries.
    for (const id of pseudoIds) {
        const p = positions.get(id);
        if (!p) continue;
        const centers: number[] = [];
        for (const rel of visibleSuccs) {
            const other = rel.sourceId === id ? rel.targetId
                : rel.targetId === id ? rel.sourceId : undefined;
            if (!other) continue;
            const op = positions.get(other);
            if (op) centers.push(direction === 'vertical' ? op.x + op.width / 2 : op.y + op.height / 2);
        }
        if (centers.length === 0) continue;
        const mean = centers.reduce((sum, center) => sum + center, 0) / centers.length;
        const actionRects = actions
            .filter(action => !isControlNode(action))
            .map(action => positions.get(action.id))
            .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect));
        const isStart = id.endsWith('__start');
        if (direction === 'vertical') {
            const minY = Math.min(...actionRects.map(rect => rect.y));
            const maxY = Math.max(...actionRects.map(rect => rect.y + rect.height));
            positions.set(id, {
                ...p,
                x: mean - p.width / 2,
                y: isStart ? minY - p.height - LANE_LABEL_HEIGHT - 16 : maxY + 24,
            });
        } else {
            const minX = Math.min(...actionRects.map(rect => rect.x));
            const maxX = Math.max(...actionRects.map(rect => rect.x + rect.width));
            positions.set(id, {
                ...p,
                x: isStart ? minX - p.width - 24 : maxX + 24,
                y: mean - p.height / 2,
            });
        }
    }

    // ── ReactFlow nodes ──
    const nodes: Node[] = [...laneNodes];
    for (const id of pseudoIds) {
        const p = positions.get(id)!;
        const isStart = id.endsWith('__start');
        const data: ActionFlowNodeData = {
            label: isStart ? 'Start' : 'Done',
            nodeType: isStart ? 'start' : 'done',
            laneColor: '#374151', layerColor: '#374151',
            inPorts: [], outPorts: [],
            flowDirection: direction,
        };
        nodes.push({
            id, type: 'actionFlowNode',
            position: { x: p.x, y: p.y },
            data: data as unknown as Record<string, unknown>,
        });
    }
    for (const el of actions) {
        const p = positions.get(el.id)!;
        // Fork/join bars: no ports, no lane badge, drawn as a solid bar sized
        // by the ELK node box (thin across, long along the perpendicular axis).
        if (isControlNode(el)) {
            const controlData: ActionFlowNodeData = {
                element: el,
                label: el.name,
                nodeType: el.kind === 'ForkNode' ? 'fork' : 'join',
                laneColor: '#374151', layerColor: '#374151',
                inPorts: [], outPorts: [],
                flowDirection: direction,
            };
            nodes.push({
                id: el.id, type: 'actionFlowNode',
                position: { x: p.x, y: p.y },
                style: { width: p.width, height: p.height },
                data: controlData as unknown as Record<string, unknown>,
            });
            continue;
        }
        const ports = portsByAction.get(el.id)!;
        const laneId = laneOf.get(el.id)!;
        const allocatedName = el.allocatedTo
            ? displayNameAtLevel(el.allocatedTo, model, options?.displayLevel)
            : undefined;
        const data: ActionFlowNodeData = {
            element: el,
            label: el.name,
            nodeType: 'action',
            parameters: el.parameters,
            allocatedTo: allocatedName,
            laneColor: laneColor.get(laneId) ?? '#9CA3AF',
            layerColor: LAYER_COLORS[el.layer] || '#FF6B6B',
            inPorts: ports.inPorts,
            outPorts: ports.outPorts,
            hasChildren: Object.values(model.elements).some(child => child.parentAction === el.id),
            isExpanded: options?.expandedActionIds?.has(el.id) ?? false,
            onToggleExpand: options?.onToggleAction
                ? () => options.onToggleAction!(el.id)
                : undefined,
            flowDirection: direction,
        };
        nodes.push({
            id: el.id, type: 'actionFlowNode',
            position: { x: p.x, y: p.y },
            data: data as unknown as Record<string, unknown>,
        });
    }

    // ── Edges: item flows (labeled, animated) + successions (control) ──
    const edges: Edge[] = [];
    for (const rel of visibleFlows) {
        const flowKind = classifyFlowItem(rel.flowItem);
        const flowColor = FLOW_COLORS[flowKind];
        const isSignalOrInfo = rel.flowItem
            ? /signal|error|status|code|report|alarm|response|command|data|reading/i.test(rel.flowItem)
            : false;
        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            // Parameter names are already printed at the pins. Repeating the
            // item name on short connectors makes compact flows unreadable.
            label: undefined,
            type: 'smoothstep',
            animated: false,
            style: {
                stroke: flowColor,
                strokeWidth: EDGE.flowWidth,
                strokeDasharray: isSignalOrInfo ? '6 3' : undefined,
            },
            labelStyle: { fontSize: FONT.badge, fill: flowColor, fontWeight: 600 },
            labelBgStyle: EDGE.labelBgStyle,
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            markerEnd: {
                type: 'arrowclosed' as never,
                color: flowColor,
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
            data: { flowCategory: flowKind, flowItem: rel.flowItem },
        });
    }
    for (const rel of visibleSuccs) {
        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: FLOW_COLORS.control, strokeWidth: 1.5 },
            markerEnd: { type: 'arrowclosed' as never, color: FLOW_COLORS.control, width: 12, height: 12 },
            data: { flowCategory: 'control' satisfies ActionFlowKind },
        });
    }

    return { nodes, edges };
}

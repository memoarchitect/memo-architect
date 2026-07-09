// ─── Action Flow View Template (KK-4) ────────────────────────────────────────
//
// Standard renderer template for the SysML v2 `actionflow` view kind:
// actions as process boxes with typed parameter ports, object/item flows
// labeled with the transported item, succession (control flow) ordering
// with start/done pseudo-nodes, and optional swimlanes grouped by the
// action's allocation target. Replaces the ad-hoc ActionFlowDiagram.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { LAYER_COLORS } from '../../constants';
import { EDGE, FONT } from '../../styles/tokens';
import { elk, type LayoutResult } from '../layout';
import type { ActionFlowNodeData } from '../ActionFlowNode';

// ─── Element collection ──────────────────────────────────────────────────────

/**
 * The actions an Action Flow view renders: its visible action usages,
 * preferring nested actions (steps of a composite) over the composites
 * themselves so a flow shows steps, not wrappers.
 */
export function collectActionFlowActions(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): MemoElement[] {
    const all = Object.values(model.elements);
    const visible = viewpointFilter ? all.filter(viewpointFilter) : all;
    const actions = visible.filter(el =>
        el.construct === 'action' || el.kind === 'ActionUsage' || el.kind === 'ActionDefinition');
    const nested = actions.filter(el => el.parentAction);
    return nested.length > 0 ? nested : actions;
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
    const params = (def?.kind === 'ActionDefinition' ? def.parameters : el.parameters) ?? [];
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

export interface LaneInfo {
    id: string;
    label: string;
    color: string;
}

/**
 * Group actions into swimlanes by their allocation target. Lane labels
 * resolve to the allocated element's display name when it exists.
 */
export function assignLanes(
    actions: MemoElement[],
    model: MemoModelDTO,
): { laneOf: Map<string, string>; lanes: LaneInfo[] } {
    const laneOf = new Map<string, string>();
    const lanes: LaneInfo[] = [];
    const seen = new Map<string, LaneInfo>();
    for (const el of actions) {
        const laneId = el.allocatedTo || UNALLOCATED_LANE;
        laneOf.set(el.id, laneId);
        if (!seen.has(laneId)) {
            const lane: LaneInfo = {
                id: laneId,
                label: laneId === UNALLOCATED_LANE
                    ? UNALLOCATED_LANE
                    : (model.elements[laneId]?.name ?? laneId),
                color: LANE_COLORS[seen.size % LANE_COLORS.length],
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

function actionNodeSize(el: MemoElement, ports: { inPorts: string[]; outPorts: string[] }) {
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
    /** Band the layout into per-allocation swimlanes (default on with ≥2 lanes) */
    swimlanes?: boolean;
}

export async function computeActionFlowViewLayout(
    model: MemoModelDTO,
    options?: ActionFlowViewOptions,
): Promise<LayoutResult> {
    const actions = collectActionFlowActions(model, options?.viewpointFilter);
    if (actions.length === 0) return { nodes: [], edges: [] };

    const actionIds = new Set(actions.map(a => a.id));
    const { laneOf, lanes } = assignLanes(actions, model);
    const swimlanes = (options?.swimlanes ?? true) && lanes.length >= 2;

    // ── Pseudo start/done nodes (builder convention: <parent>__start/__done) ──
    const succRels = model.relationships.filter(r => r.type === 'succession');
    const flowRels = model.relationships.filter(r => r.type === 'flow');
    const pseudoIds = new Set<string>();
    for (const rel of succRels) {
        if (rel.sourceId.endsWith('__start') && actionIds.has(rel.targetId)) pseudoIds.add(rel.sourceId);
        if (rel.targetId.endsWith('__done') && actionIds.has(rel.sourceId)) pseudoIds.add(rel.targetId);
    }

    const graphIds = new Set([...actionIds, ...pseudoIds]);
    const visibleFlows = flowRels.filter(r => graphIds.has(r.sourceId) && graphIds.has(r.targetId));
    const visibleSuccs = succRels.filter(r => graphIds.has(r.sourceId) && graphIds.has(r.targetId));

    // ── ELK layered left-to-right layout ──
    const portsByAction = new Map(actions.map(el => [el.id, actionPortNames(el, model)]));
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
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
            ...actions.map(el => ({ id: el.id, ...actionNodeSize(el, portsByAction.get(el.id)!) })),
        ],
        edges: [...visibleFlows, ...visibleSuccs].map((rel, i) => ({
            id: `afe-${i}`,
            sources: [rel.sourceId],
            targets: [rel.targetId],
        })),
    };

    const layouted = await elk.layout(elkGraph as never) as {
        children?: { id: string; x?: number; y?: number; width?: number; height?: number }[];
    };
    const positions = new Map(
        (layouted.children ?? []).map(c => [c.id, {
            x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? 140, height: c.height ?? 56,
        }]),
    );

    // ── Swimlane banding: keep ELK x, re-band y per allocation lane ──
    const laneColor = new Map(lanes.map(l => [l.id, l.color]));
    const laneNodes: Node[] = [];
    if (swimlanes) {
        // Order lanes by their actions' mean ELK y so banding follows the layout
        const laneY = new Map<string, number[]>();
        for (const el of actions) {
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
            // Stack lane members that ELK put in the same column
            members.sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x
                || positions.get(a.id)!.y - positions.get(b.id)!.y);
            let bandHeight = 0;
            const usedRanges: { x0: number; x1: number; bottom: number }[] = [];
            for (const el of members) {
                const p = positions.get(el.id)!;
                let y = bandTop + LANE_PADDING;
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
                data: { label: lane.label, color: lane.color },
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

        // Center pseudo start/done across the full band stack
        for (const id of pseudoIds) {
            const p = positions.get(id);
            if (p) positions.set(id, { ...p, y: (bandTop - LANE_GAP) / 2 - p.height / 2 });
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
        };
        nodes.push({
            id, type: 'actionFlowNode',
            position: { x: p.x, y: p.y },
            data: data as unknown as Record<string, unknown>,
        });
    }
    for (const el of actions) {
        const p = positions.get(el.id)!;
        const ports = portsByAction.get(el.id)!;
        const laneId = laneOf.get(el.id)!;
        const allocatedName = el.allocatedTo
            ? (model.elements[el.allocatedTo]?.name ?? el.allocatedTo)
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
        const isSignalOrInfo = rel.flowItem
            ? /signal|error|status|code|report|alarm|response|command|data|reading/i.test(rel.flowItem)
            : false;
        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            label: rel.flowItem || '',
            type: 'default',
            animated: true,
            style: {
                stroke: '#3498DB',
                strokeWidth: EDGE.flowWidth,
                strokeDasharray: isSignalOrInfo ? '6 3' : undefined,
            },
            labelStyle: { fontSize: FONT.badge, fill: '#4A90D9', fontWeight: 600 },
            labelBgStyle: EDGE.labelBgStyle,
            labelBgPadding: EDGE.labelBgPadding,
            labelBgBorderRadius: EDGE.labelBgRadius,
            markerEnd: {
                type: 'arrowclosed' as never,
                color: '#3498DB',
                width: EDGE.arrowSize,
                height: EDGE.arrowSize,
            },
        });
    }
    for (const rel of visibleSuccs) {
        edges.push({
            id: rel.id,
            source: rel.sourceId,
            target: rel.targetId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#D1D5DB', strokeWidth: EDGE.successionWidth, strokeDasharray: '4 4' },
            markerEnd: { type: 'arrowclosed' as never, color: '#D1D5DB', width: 12, height: 12 },
        });
    }

    return { nodes, edges };
}

// ─── DiagramCanvas ────────────────────────────────────────────────────────────
//
// Interactive diagram canvas with:
//   - Per-view position persistence (<view>.viewlayout)
//   - Palette sidebar (drag-to-create elements)
//   - On-canvas creation (double-click canvas, drop from palette)
//   - Edge drawing (handle-to-handle, relationship type picker)
//   - Node resize, inline name editing, context menus
//   - Edge context menus (style, color, label toggle)
//   - Client-side undo/redo (positions + visual overrides)
//   - Snap-to-grid (20px default)
//   - Workflow node types: Decision, Fork/Join
// ─────────────────────────────────────────────────────────────────────────────

import {
    useEffect, useMemo, useState, useCallback, useRef,
} from 'react';
import {
    ReactFlow, ReactFlowProvider, Background, Controls, ControlButton, MiniMap,
    useNodesState, useEdgesState, useReactFlow, useUpdateNodeInternals, addEdge,
    applyNodeChanges, NodeResizer,
    getNodesBounds,
    ConnectionMode,
    type Node as RFNode,
    type Edge as RFEdge,
    type Connection,
    type NodeChange,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RFAny = any;

import type { MemoElement, MemoModelDTO, DiagramLayout, ViewKind } from '@memoarchitect/tools/browser';
import { computeImpact } from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram, getRegistries } from '../store/model-store';
import { requestRelationshipUpdate, sendElementCreate, sendDiagramLayoutUpdate, sendElementUpdate } from '../store/ws-client';
import { LAYER_COLORS, REL_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { sysmlIdentifier } from '../authoring';
import { SelectionToolbar } from './SelectionToolbar';
import {
    alignBoxes, matchSize, distributeBoxes,
    type ArrangeBox, type ArrangeResult, type AlignEdge, type SizeMatch, type DistributeAxis,
} from './arrange';
import { FONT, COLOR } from '../styles/tokens';
import { buildDecompositionTree, buildFunctionalTree, routeOrthogonalEdges, routeDirectOrthogonalEdges, placeConnectorLabels } from './layout';
import { ConnectorHoverStyles, connectorEndpoints, setConnectorHover } from './connector-hover';
import {
    resolveGeneralMode, buildGeneralViewTree,
    GENERAL_VIEW_MODES, type GeneralViewMode,
} from './templates/general-view';
import {
    validateSingleTree, COMPOSITION_REL_TYPES,
} from './templates/composition-tree';

import {
    PORT_DIR_COLORS, IBD_FLOW_COLORS, portIdFromHandle, parsePortSide,
    INTERCONNECTION_PORT_SIZE, NESTED_PITCH, NESTED_PIN_INSET, NESTED_HOUSING_DEPTH,
    type PortDisplay, type PortSide, type PortInfo,
} from './templates/interconnection-view';
import { commonDisplayLevels, findFloatingActions, type ActionFlowDisplayLevel, type ActionFlowLaneGrouping, type ActionFlowNesting } from './templates/actionflow-view';
import { isStateElement } from './templates/statetransition-view';
import { useCaseActorOptions, useCaseMaxDepth, useCaseViewOptions, type UseCaseEdgeStyle } from './templates/use-case-view';
import { templateRegistry } from '../diagram/templates';
import type { TemplateOptionSlices } from '../diagram/template-provider';
import {
    hasContextChildCoordinates, rebaseForFrameChange, rebaseLegacyContextChildPosition, withContextChildCoordinates,
} from '../diagram/layout-coordinate-migration';
import { DecompositionNode } from './DecompositionNode';
import { InterconnectionNode } from './InterconnectionNode';
import { InterconnectionEdge } from './InterconnectionEdge';
import {
    InterconnectionRendererContext, resolveInterconnectionRenderer,
    baseInterconnectionRenderer,
} from '../diagram/renderers/interconnection-renderer';
import { ActionFlowNode, ActionFlowLaneNode, ActionFlowLaneLabelNode } from './ActionFlowNode';
import { StateNode } from './StateNode';
import { SeqLifelineNode, SeqSectionNode, SeqOccurrenceNode } from './SequenceNodes';
import { UseCaseActorNode, UseCaseBoundaryNode, UseCaseNode } from './UseCaseNodes';
import { UseCaseEdge } from './UseCaseEdge';
import { ContextBoundaryNode, ContextExternalNode, ContextSystemNode } from './ContextNodes';
import { GridView } from './GridView';
import { BrowserView } from './BrowserView';
import { ScreenLayoutView } from './ScreenLayoutView';
import { DiagramInteractiveNode, type DiagramInteractiveNodeData } from './DiagramInteractiveNode';
import { DiagramPalette, MEMO_KIND_MIME } from './DiagramPalette';
import { RelationshipPicker, type RelationshipChoice } from './RelationshipPicker';
import { NodeContextMenu, EdgeContextMenu, type EdgeLineStyle } from './DiagramContextMenus';
import { DecisionNode, ForkNode, StartEndNode } from './WorkflowNodes';
import { Icon, ToolbarSep, Segmented, ToolbarCluster, IconButton, IconToggle } from './DiagramToolbarControls';
import { toolbarOperationsFor } from './diagram-toolbar-capabilities';

/** The view's own element, which carries the `expose` naming its subject. */
const viewElementOf = (
    model: MemoModelDTO | null | undefined,
    diagram: { elementId?: string } | null | undefined,
) => (model && diagram?.elementId ? model.elements[diagram.elementId] : undefined);
import { exportDiagram, type DiagramExportFormat } from '../diagram/export-diagram';
import { selectedLayoutProviderId } from '../diagram/layout-selection';
import { projectLayoutToNotationScene, type NotationLayoutNode, type NotationLayoutEdge } from '../diagram/notation-scene';
import { confirmAnnotationDelete } from '../components/confirm-destructive';

// ─── Constants ────────────────────────────────────────────────────────────────

// Inject ELK progress bar keyframe once (#44)
const LAYOUT_PROGRESS_STYLE_ID = 'memo-layout-progress';
if (typeof document !== 'undefined' && !document.getElementById(LAYOUT_PROGRESS_STYLE_ID)) {
    const s = document.createElement('style');
    s.id = LAYOUT_PROGRESS_STYLE_ID;
    s.textContent = `@keyframes memo-layout-progress { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
    document.head.appendChild(s);
}

const RF_STYLE = { background: '#F7F7F5' } as const;
const RF_FIT_VIEW_OPTIONS = { padding: 0.08, maxZoom: 2 } as const;
const MINIMAP_STYLE = { background: '#FFFFFF' } as const;
const RF_PRO_OPTIONS = { hideAttribution: true } as const;
const SNAP_GRID: [number, number] = [20, 20];
const UNDO_STACK_DEPTH = 50;
const LAYOUT_TIMEOUT_MS = 8_000;
// Coalesce rapid diagram switches: only the diagram you land on lays out,
// instead of queuing an ELK job for every one you skimmed past.
const LAYOUT_SWITCH_DEBOUNCE_MS = 90;

function boundedLayout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(
            () => reject(new Error(`${label} layout exceeded ${LAYOUT_TIMEOUT_MS / 1000}s`)),
            LAYOUT_TIMEOUT_MS,
        );
        promise.then(
            value => { window.clearTimeout(timer); resolve(value); },
            error => { window.clearTimeout(timer); reject(error); },
        );
    });
}

// ─── Typed aliases to avoid DOM Node collision ───────────────────────────────
type FlowNode = RFNode<Record<string, RFAny>>;
type FlowEdge = RFEdge<Record<string, RFAny>>;

type AnnotationKind = 'note' | 'text' | 'constraint';

function AnnotationNode({ data, selected }: NodeProps<FlowNode>) {
    const kind = data.kind as AnnotationKind;
    const note = kind === 'note';
    const constraint = kind === 'constraint';
    return (
        <div style={{
            position: 'relative',
            width: '100%', height: '100%', padding: note ? '12px 14px' : constraint ? '10px 12px' : '4px',
            background: note ? String(data.color ?? '#FEF3C7') : constraint ? '#FFFFFF' : 'transparent',
            border: constraint ? '1.5px dashed #7C3AED' : note ? '1px solid #F59E0B' : '1px solid transparent',
            borderRadius: note ? 3 : constraint ? 5 : 0,
            boxShadow: note ? '0 2px 6px rgba(0,0,0,.12)' : 'none',
            color: '#292524', fontSize: 12, lineHeight: 1.4,
        }}>
            <NodeResizer isVisible={selected} minWidth={100} minHeight={48} color="#2563EB" />
            <button
                className="nodrag"
                aria-label="Delete annotation"
                title="Delete annotation"
                // Pointerdown keeps only the job it is here for — not starting
                // a node drag. Deleting moves behind the prompt on click:
                // prompting in both handlers would ask twice, and pointerdown
                // fires first, removing the node before the click can land.
                onPointerDown={event => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                onClick={event => {
                    event.stopPropagation();
                    if (confirmAnnotationDelete()) data.onDelete?.();
                }}
                style={{
                    position: 'absolute', top: 3, right: 5, border: 0, background: 'transparent',
                    color: '#64748B', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                    pointerEvents: 'all', zIndex: 30,
                }}
            >×</button>
            {constraint && <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>constraint</div>}
            <div
                contentEditable
                suppressContentEditableWarning
                className="nodrag"
                style={{ outline: 'none', whiteSpace: 'pre-wrap', minHeight: 20 }}
                onBlur={event => data.onTextChange?.(event.currentTarget.textContent ?? '')}
            >
                {String(data.text ?? '')}
            </div>
        </div>
    );
}

// ─── Undo/redo command pattern ────────────────────────────────────────────────

interface UndoCommand {
    do: () => void;
    undo: () => void;
}

/**
 * How connectors are planned for a geometry update.
 *
 * `direct` routes each connector on its own, port to port — a fixed cost per
 * edge, cheap enough to run on every frame of a drag. `tidy` runs the shared
 * obstacle-avoiding planner that separates connectors into lanes, which costs
 * far more and therefore only runs when the user asks for it.
 */
type RouteQuality = 'direct' | 'tidy';

/** A frame is drawn from the inside, so its ports present their opposite face. */
const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
};

/** Re-route explicit orthogonal edges after saved/user node positions overlay. */
function reroutePositionedEdges(
    nodes: FlowNode[],
    edges: FlowEdge[],
    quality: RouteQuality = 'direct',
    forcedPortSize?: number,
): FlowEdge[] {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const absolute = new Map<string, { x: number; y: number }>();
    const absOf = (id: string): { x: number; y: number } => {
        const known = absolute.get(id);
        if (known) return known;
        const node = byId.get(id)!;
        const parent = node.parentId ? absOf(node.parentId) : { x: 0, y: 0 };
        const value = { x: parent.x + node.position.x, y: parent.y + node.position.y };
        absolute.set(id, value);
        return value;
    };
    const sizeOf = (node: FlowNode) => ({
        width: Number(node.width ?? node.style?.width ?? 0),
        height: Number(node.height ?? node.style?.height ?? 0),
    });
    const requests = edges.flatMap(edge => {
        // Must agree with the interconnection template's own anchoring: a
        // connector meets a port at the face it arrives on, and a port that
        // carries nested ports is met on the group's centreline rather than on
        // the parent square at the top of the stack. Anchoring at the bare
        // square centre put the arrowhead on top of the glyph and made every
        // group connector step sideways to reach its lane.
        const liveOffset = (nodeId: string, portId: unknown, fallback: unknown, side: unknown) => {
            if (typeof portId === 'string') {
                const port = ((byId.get(nodeId)?.data as {
                    ports?: Array<{ id: string; x: number; y: number; size?: number; nestedCount?: number }>;
                })?.ports ?? []).find(candidate => candidate.id === portId);
                if (port) {
                    const size = forcedPortSize ?? port.size ?? INTERCONNECTION_PORT_SIZE;
                    // Connectors always meet the MIDDLE of a port's OUTER edge — the
                    // edge its (effective) wall faces. A nested-parent port clusters
                    // its pins on that same wall now, so its own centre is the anchor
                    // (no group-centreline shift).
                    const cx = port.x + size / 2;
                    const cy = port.y + size / 2;
                    return side === 'left' ? { x: cx - size / 2, y: cy }
                        : side === 'right' ? { x: cx + size / 2, y: cy }
                        : side === 'top' ? { x: cx, y: cy - size / 2 }
                        : side === 'bottom' ? { x: cx, y: cy + size / 2 }
                        : { x: cx, y: cy };
                }
            }
            return fallback as { x: number; y: number } | undefined;
        };
        // The side recorded on the edge is the side the connector was authored
        // against; the side the port actually sits on is on the port itself and
        // is what the route has to meet. They disagree whenever a port has been
        // moved since the connector was drawn. Prefer the port's own side, and
        // fall back to the edge's when the port carries none.
        //
        // A frame is drawn from the inside: its ports face into the diagram, so
        // a port on the frame's `left` presents a `right` face to everything it
        // connects to. Invert the side for frames or every frame connector
        // leaves from the wrong face and doubles back across the drawing.
        const effectiveSide = (
            nodeId: string,
            portId: unknown,
            fallback: unknown,
        ): PortSide | undefined => {
            const node = byId.get(nodeId);
            if (!node || typeof portId !== 'string') return fallback as PortSide | undefined;
            const port = ((node.data as { ports?: Array<{ id: string; side?: PortSide }> })?.ports ?? [])
                .find(candidate => candidate.id === portId);
            if (!port?.side) return fallback as PortSide | undefined;
            if ((node.data as { isFrame?: boolean })?.isFrame) return OPPOSITE_SIDE[port.side];
            return port.side;
        };
        const sourceSide = effectiveSide(edge.source, edge.data?.sourcePortId, edge.data?.sourceSide);
        const targetSide = effectiveSide(edge.target, edge.data?.targetPortId, edge.data?.targetSide);
        const sourceOffset = liveOffset(edge.source, edge.data?.sourcePortId, edge.data?.sourceOffset, sourceSide);
        const targetOffset = liveOffset(edge.target, edge.data?.targetPortId, edge.data?.targetOffset, targetSide);
        if (!sourceOffset || !targetOffset || !byId.has(edge.source) || !byId.has(edge.target)) return [];
        const s = absOf(edge.source), t = absOf(edge.target);
        return [{
            id: edge.id,
            source: { x: s.x + sourceOffset.x, y: s.y + sourceOffset.y },
            target: { x: t.x + targetOffset.x, y: t.y + targetOffset.y },
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceSide,
            targetSide,
        }];
    });
    if (requests.length === 0) return edges;
    // A connector must not cut through a part it does not terminate in — the rule
    // a formal IBD is read by. Containers and boards are obstacles too: the router
    // (planOne) already drops any obstacle that ENCLOSES one of the connector's
    // endpoints, so a route to a child still leaves its own parent freely while
    // being kept out of every unrelated board. The diagram FRAME is the drawing
    // surface itself and encloses everything, so it is never an obstacle.
    const obstacles = nodes
        .filter(node => {
            const data = node.data as { isFrame?: boolean };
            return !data.isFrame && node.type !== 'annotationNode';
        })
        .map(node => ({ id: node.id, ...absOf(node.id), ...sizeOf(node) }))
        .filter(o => o.width > 0 && o.height > 0);
    const requestById = new Map(requests.map(request => [request.id, request]));
    const manualRouted = new Set(edges.filter(edge => edge.data?.manualRoute).map(edge => edge.id));
    const automaticRequests = requests.filter(request => !manualRouted.has(request.id));
    const routes = quality === 'tidy'
        ? routeOrthogonalEdges(automaticRequests, obstacles)
        : routeDirectOrthogonalEdges(automaticRequests);
    // A label anchor is a point on the route it belongs to. Once the route has
    // been replanned the old anchor describes a line that no longer exists, and
    // the label is left stranded in empty space. Drop it, and the edge falls
    // back to anchoring on the longest segment of its current route. The tidy
    // pass re-derives proper anchors below, where labels are placed together and
    // can avoid each other.
    const withRoute = (edge: FlowEdge, points: Array<{ x: number; y: number }>): FlowEdge => {
        const { labelPoint: _stale, ...data } = edge.data ?? {};
        return { ...edge, data: { ...data, points } };
    };
    const routed = edges.map(edge => {
        const request = requestById.get(edge.id);
        if (!request) return edge;
        if (edge.data?.manualRoute) {
            const points = [...((edge.data.points as Array<{ x: number; y: number }> | undefined) ?? [])];
            if (points.length >= 2) {
                points[0] = request.source;
                points[points.length - 1] = request.target;
                return withRoute(edge, points);
            }
        }
        const points = routes.get(edge.id);
        return points ? withRoute(edge, points) : edge;
    });
    if (quality !== 'tidy') return routed;
    const labelled = placeConnectorLabels(
        routed.flatMap(edge => {
            const points = edge.data?.points as Array<{ x: number; y: number }> | undefined;
            const label = typeof edge.label === 'string' ? edge.label : '';
            return points && points.length >= 2 && label
                ? [{ id: edge.id, points, width: label.length * 6.2 + 16, height: 18 }]
                : [];
        }),
        obstacles,
    );
    return routed.map(edge => labelled.has(edge.id)
        ? { ...edge, data: { ...edge.data, labelPoint: labelled.get(edge.id) } }
        : edge);
}

/** Clear space kept between two neighbouring ports on the same wall. */
const WALL_PORT_GAP = 12;

/** How far apart two facing ports may be and still be pulled into line. */
const PORT_ALIGN_REACH = 96;

/**
 * A boundary port's CROSS-wall coordinate is derived, never stored: the square
 * straddles the wall, so its centre is the wall. Only the ALONG-wall coordinate
 * is authored (and draggable). Authored cross-wall values go stale the moment the
 * port size changes — a position written for a 24px port leaves a 32px port
 * sitting 4px inside its own boundary — so they are recomputed here.
 */
function snapPortsToWall(nodes: FlowNode[], forced?: number): FlowNode[] {
    return nodes.map(node => {
        const ports = (node.data as { ports?: PortInfo[] })?.ports;
        if (!ports?.length) return node;
        // Local coordinates: the owning part's edges ARE 0 and w/h in this space,
        // so those constants are the parent edge the square has to straddle.
        const w = Number(node.width ?? node.measured?.width ?? (node.style as { width?: number })?.width ?? 0);
        const h = Number(node.height ?? node.measured?.height ?? (node.style as { height?: number })?.height ?? 0);
        if (!w || !h) return node;
        const snapped = ports.map(port => {
            if (port.nested) return port;      // derived from its parent PORT instead
            const half = renderedPortSize(port, forced) / 2;
            switch (port.side) {
                case 'left': return port.x === -half ? port : { ...port, x: -half };
                case 'right': return port.x === w - half ? port : { ...port, x: w - half };
                case 'top': return port.y === -half ? port : { ...port, y: -half };
                default: return port.y === h - half ? port : { ...port, y: h - half };
            }
        });
        return snapped.every((p, i) => p === ports[i])
            ? node : { ...node, data: { ...node.data, ports: snapped } };
    });
}

/**
 * The size a port is actually DRAWN at. A renderer that gives every port one
 * uniform square (the dedicated IBD canvas) overrides the authored `size`, and
 * geometry computed from the authored value would then disagree with the picture
 * — a port authored at 24 but drawn at 32 sits 4px inside its own wall.
 */
function renderedPortSize(port: PortInfo, forced?: number): number {
    // A connector port's body is the box its child ports sit on, so ACROSS the
    // wall it is that box's depth — not a plain port square.
    if (port.nestedCount) return NESTED_HOUSING_DEPTH;
    return forced ?? port.size ?? INTERCONNECTION_PORT_SIZE;
}

/** Along-wall length of a connector port's body: the column of pins it carries. */
function nestedHousingLength(count: number, pinSize: number): number {
    return (Math.max(count, 1) - 1) * NESTED_PITCH + pinSize + NESTED_PIN_INSET * 2;
}

/** The extent a port occupies ALONG its wall: one square, or — for a connector —
 *  the whole column of pins it carries. */
function portWallSpan(port: PortInfo, forced?: number): number {
    return port.nestedCount
        ? nestedHousingLength(port.nestedCount, forced ?? INTERCONNECTION_PORT_SIZE)
        : renderedPortSize(port, forced);
}

/**
 * Second pass over each wall: walk its ports in order and give every one a slot
 * big enough for what it draws (a connector reserves its whole pin column), so a
 * port can never sit on top of its neighbour. Authored positions are the input —
 * a port only moves when it would otherwise collide — and the part grows if the
 * run of ports needs more wall than it currently has.
 */
function resolveWallPortOverlaps(nodes: FlowNode[], forced?: number): FlowNode[] {
    return nodes.map(node => {
        const ports = (node.data as { ports?: PortInfo[] })?.ports;
        if (!ports?.length) return node;
        const along = new Map<string, number>();
        let neededH = 0, neededW = 0;
        for (const side of ['left', 'right', 'top', 'bottom'] as const) {
            const vertical = side === 'left' || side === 'right';
            const wall = ports.filter(p => p.side === side && !p.nested)
                .sort((a, b) => (vertical ? a.y - b.y : a.x - b.x));
            let cursor = -Infinity;
            for (const port of wall) {
                const start = Math.max(vertical ? port.y : port.x, cursor);
                along.set(port.id, start);
                cursor = start + portWallSpan(port, forced) + WALL_PORT_GAP;
            }
            if (wall.length) {
                if (vertical) neededH = Math.max(neededH, cursor - WALL_PORT_GAP);
                else neededW = Math.max(neededW, cursor - WALL_PORT_GAP);
            }
        }
        const moved = ports.map(port => {
            const start = along.get(port.id);
            if (start === undefined) return port;
            const vertical = port.side === 'left' || port.side === 'right';
            if (vertical) return start === port.y ? port : { ...port, y: start };
            return start === port.x ? port : { ...port, x: start };
        });
        if (moved.every((p, i) => p === ports[i])) return node;
        // Grow the part so a pushed-apart run still fits inside its own boundary.
        const height = Number(node.height ?? (node.style as { height?: number })?.height ?? 0);
        const width = Number(node.width ?? (node.style as { width?: number })?.width ?? 0);
        const grownH = Math.max(height, neededH + renderedPortSize({} as PortInfo, forced));
        const grownW = Math.max(width, neededW + renderedPortSize({} as PortInfo, forced));
        const grew = grownH !== height || grownW !== width;
        return {
            ...node,
            ...(grew ? { height: grownH, width: grownW, style: { ...node.style, height: grownH, width: grownW } } : {}),
            data: { ...node.data, ports: moved },
        };
    });
}

/**
 * Pull two connected ports into line so their connector is drawn as one straight
 * run rather than a small S-bend. A port is only nudged when it is safe to do so:
 * it carries a single connector (so no other route is disturbed), its partner is
 * on the facing axis, the offset is small, and the new position still clears its
 * neighbours on the wall. Everything else is left exactly where it was authored.
 */
function alignFacingPorts(nodes: FlowNode[], edges: FlowEdge[], forced?: number): FlowNode[] {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const absolute = new Map<string, { x: number; y: number }>();
    const absOf = (id: string): { x: number; y: number } => {
        const known = absolute.get(id);
        if (known) return known;
        const node = byId.get(id);
        if (!node) return { x: 0, y: 0 };
        const parent = node.parentId ? absOf(node.parentId) : { x: 0, y: 0 };
        const value = { x: parent.x + node.position.x, y: parent.y + node.position.y };
        absolute.set(id, value);
        return value;
    };
    // A port serving several connectors is a shared anchor: moving it to please
    // one of them drags the others off their routes.
    const incident = new Map<string, number>();
    for (const edge of edges) {
        for (const key of [edge.data?.sourcePortId, edge.data?.targetPortId]) {
            if (typeof key === 'string') incident.set(key, (incident.get(key) ?? 0) + 1);
        }
    }
    const working = new Map<string, PortInfo[]>();
    for (const node of nodes) {
        const ports = (node.data as { ports?: PortInfo[] })?.ports;
        if (ports?.length) working.set(node.id, ports.map(port => ({ ...port })));
    }
    let changed = false;
    for (const edge of edges) {
        const sourceId = edge.data?.sourcePortId, targetId = edge.data?.targetPortId;
        if (typeof sourceId !== 'string' || typeof targetId !== 'string') continue;
        const sourcePorts = working.get(edge.source), targetPorts = working.get(edge.target);
        if (!sourcePorts || !targetPorts) continue;
        const source = sourcePorts.find(p => p.id === sourceId);
        const target = targetPorts.find(p => p.id === targetId);
        if (!source || !target || source.nested || target.nested) continue;
        if (source.nestedCount || target.nestedCount) continue;
        const vertical = source.side === 'left' || source.side === 'right';
        if (vertical !== (target.side === 'left' || target.side === 'right')) continue;
        const sourceAbs = absOf(edge.source), targetAbs = absOf(edge.target);
        const sourceHalf = renderedPortSize(source, forced) / 2;
        const targetHalf = renderedPortSize(target, forced) / 2;
        const sourceCentre = vertical ? sourceAbs.y + source.y + sourceHalf : sourceAbs.x + source.x + sourceHalf;
        const targetCentre = vertical ? targetAbs.y + target.y + targetHalf : targetAbs.x + target.x + targetHalf;
        const delta = sourceCentre - targetCentre;
        if (delta === 0 || Math.abs(delta) > PORT_ALIGN_REACH) continue;
        // Move whichever end is free to move; a frame port anchors the pair.
        const sourceFixed = Boolean((byId.get(edge.source)?.data as { isFrame?: boolean })?.isFrame)
            || (incident.get(sourceId) ?? 0) > 1;
        const targetFixed = Boolean((byId.get(edge.target)?.data as { isFrame?: boolean })?.isFrame)
            || (incident.get(targetId) ?? 0) > 1;
        if (targetFixed === sourceFixed) continue;          // both pinned, or both free — leave it
        const mover = targetFixed ? source : target;
        const ports = targetFixed ? sourcePorts : targetPorts;
        const shift = targetFixed ? -delta : delta;
        const start = (vertical ? mover.y : mover.x) + shift;
        // Keep clear of the neighbours already on this wall.
        const span = portWallSpan(mover, forced);
        const collides = ports.some(other => {
            if (other.id === mover.id || other.nested || other.side !== mover.side) return false;
            const otherStart = vertical ? other.y : other.x;
            return start < otherStart + portWallSpan(other, forced) + WALL_PORT_GAP
                && start + span + WALL_PORT_GAP > otherStart;
        });
        if (collides || start < 0) continue;
        if (vertical) mover.y = start; else mover.x = start;
        changed = true;
    }
    if (!changed) return nodes;
    return nodes.map(node => working.has(node.id)
        ? { ...node, data: { ...node.data, ports: working.get(node.id)! } }
        : node);
}

/**
 * A connector's nested pins are placed RELATIVE to their parent port: each pin
 * straddles the parent's wall at the parent's cross-coordinate and stacks along
 * it. Deriving pin coordinates from the (possibly moved/saved) parent — in the
 * node data, so render, routing and side-resolution all agree — keeps the pin
 * cluster glued to its parent wherever the parent ends up.
 */
function repositionNestedPins(nodes: FlowNode[]): FlowNode[] {
    return nodes.map(node => {
        const ports = (node.data as { ports?: PortInfo[] })?.ports;
        if (!ports?.some(p => p.nested)) return node;
        const parentById = new Map(ports.filter(p => p.nestedCount).map(p => [p.id, p]));
        if (!parentById.size) return node;
        const isOutward = (port: PortInfo) => String(port.direction ?? '').toLowerCase() === 'out';
        // Each FACE of the parent port carries its own run: inputs range along the
        // outer face, outputs along the inner one, so direction reads at a glance
        // instead of having to be picked out of one mixed column.
        const faceIndex = new Map<string, number>();
        const faceCount = new Map<string, { inputs: number; outputs: number }>();
        for (const port of ports) {
            if (!port.nested || !port.parentId || !parentById.has(port.parentId)) continue;
            const tally = faceCount.get(port.parentId) ?? { inputs: 0, outputs: 0 };
            if (isOutward(port)) faceIndex.set(port.id, tally.outputs++);
            else faceIndex.set(port.id, tally.inputs++);
            faceCount.set(port.parentId, tally);
        }
        const repositioned = ports.map(port => {
            if (port.nestedCount) {
                // The body only has to be as long as its longest face.
                const tally = faceCount.get(port.id);
                const longest = Math.max(tally?.inputs ?? 0, tally?.outputs ?? 0, 1);
                return longest === port.nestedCount ? port : { ...port, nestedCount: longest };
            }
            const parent = port.nested && port.parentId ? parentById.get(port.parentId) : undefined;
            if (!parent) return port;
            const vertical = parent.side === 'left' || parent.side === 'right';
            const pinSize = port.size ?? INTERCONNECTION_PORT_SIZE;
            // SysML: a child port is bound to the edge of its PARENT PORT. The
            // parent's body straddles the owner's wall; an input sits on the face
            // pointing away from the owner, an output on the face pointing in.
            const bodyStart = vertical ? parent.x : parent.y;
            const outward = parent.side === 'left' || parent.side === 'top';
            const outerFace = outward ? bodyStart : bodyStart + NESTED_HOUSING_DEPTH;
            const innerFace = outward ? bodyStart + NESTED_HOUSING_DEPTH : bodyStart;
            // Which face, and where along it: a dragged pin keeps what the user
            // chose; otherwise direction picks the face and declaration order the
            // position in the run.
            const outerByDefault = !isOutward(port);
            const onOuter = port.faceOuter ?? outerByDefault;
            const face = onOuter ? outerFace : innerFace;
            const cross = face - pinSize / 2;
            const along = (vertical ? parent.y : parent.x)
                + (port.alongOffset ?? NESTED_PIN_INSET + (faceIndex.get(port.id) ?? 0) * NESTED_PITCH);
            return { ...port, side: parent.side, x: vertical ? cross : along, y: vertical ? along : cross };
        });
        return { ...node, data: { ...node.data, ports: repositioned } };
    });
}

// ─── Quick create popup ───────────────────────────────────────────────────────

interface QuickCreateProps {
    x: number;
    y: number;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

function QuickCreatePopup({ x, y, onConfirm, onCancel }: QuickCreateProps) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            const el = document.getElementById('quick-create-popup');
            if (el && !el.contains(e.target as HTMLElement)) onCancel();
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onCancel]);

    const left = Math.min(x, window.innerWidth - 220);
    const top = Math.min(y, window.innerHeight - 80);

    return (
        <div
            id="quick-create-popup"
            className="fixed z-50 rounded-xl shadow-xl overflow-hidden"
            style={{
                left, top, width: 200,
                background: '#FFFFFF', border: '1px solid #E5E5E0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
        >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0', fontSize: FONT.xs, color: '#9CA3AF', fontWeight: 600 }}>
                New Element
            </div>
            <div className="px-2 py-2">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Element name…"
                    className="w-full px-2 py-1.5 rounded focus:outline-none"
                    style={{ fontSize: FONT.xs, border: '1px solid #E5E5E0', background: '#F7F7F5', color: '#1a1a1a' }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && value.trim()) { e.preventDefault(); onConfirm(value.trim()); }
                        if (e.key === 'Escape') onCancel();
                    }}
                />
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => value.trim() && onConfirm(value.trim())}
                        style={{
                            flex: 1, fontSize: FONT.xs, padding: '4px 8px',
                            background: '#2DD4A8', color: '#FFFFFF',
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        Create
                    </button>
                    <button
                        onClick={onCancel}
                        style={{
                            fontSize: FONT.xs, padding: '4px 8px',
                            background: '#F7F7F5', color: '#6B7280',
                            border: '1px solid #E5E5E0', borderRadius: 6, cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Small coloured port glyph for the IBD legend. */
function PortSwatch({ color, glyph }: { color: string; glyph: string }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 13, height: 13, borderRadius: 2,
            background: color + '22', border: `1.5px solid ${color}`,
            color, fontSize: 9, fontWeight: 800, lineHeight: 1,
        }}>
            {glyph}
        </span>
    );
}

/**
 * Composition ancestry of a drilled-into element, outermost first — the
 * breadcrumb shared by the IBD and state-machine drill-down modes.
 */
function compositionPath(model: MemoModelDTO | null, focusId: string | null): string[] {
    if (!model || !focusId) return [];
    const parentOf = new Map<string, string>();
    for (const rel of model.relationships) {
        if (COMPOSITION_REL_TYPES.has(rel.type) && !parentOf.has(rel.targetId)) {
            parentOf.set(rel.targetId, rel.sourceId);
        }
    }
    const path = [focusId];
    const seen = new Set(path);
    let current = focusId;
    while (parentOf.has(current)) {
        const parent = parentOf.get(current)!;
        if (seen.has(parent)) break;
        path.unshift(parent);
        seen.add(parent);
        current = parent;
    }
    return path;
}

/**
 * Drill-down breadcrumb shared by the IBD, state-machine, and action-flow
 * toolbars: a step back to the parent, a jump to the whole diagram, and the
 * ancestry in between. All three drill-downs behave the same way, so they read
 * the same way too.
 */
function DrillBreadcrumb({ path, nameOf, onFocus, rootLabel }: {
    path: string[];
    nameOf: (id: string) => string;
    onFocus: (id: string | null) => void;
    rootLabel: string;
}) {
    if (path.length === 0) return null;
    // One level up, not all the way out — the common move when reading a deep
    // hierarchy. `⌂` remains the escape hatch to the top.
    const parentId = path.length > 1 ? path[path.length - 2] : null;
    return (
        <>
            <ToolbarSep />
            <IconToggle
                icon={<Icon.back />}
                label="Parent"
                onClick={() => onFocus(parentId)}
                title={parentId ? `Back to ${nameOf(parentId)}` : rootLabel}
            />
            <button
                onClick={() => onFocus(null)}
                className="px-1.5 py-0.5 text-xs font-medium rounded"
                style={{ background: '#F7F7F5', color: '#2563EB', border: '1px solid #E5E5E0' }}
                title={rootLabel}
            >
                ⌂ All
            </button>
            {path.map((id, i) => {
                const last = i === path.length - 1;
                return (
                    <span key={id} className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                        <span>›</span>
                        <button
                            onClick={() => onFocus(id)}
                            disabled={last}
                            className="text-xs font-medium"
                            style={{
                                color: last ? '#1a1a1a' : '#2563EB',
                                fontWeight: last ? 700 : 500,
                                cursor: last ? 'default' : 'pointer',
                            }}
                            title={last ? undefined : `Focus ${nameOf(id)}`}
                        >
                            {nameOf(id)}
                        </button>
                    </span>
                );
            })}
        </>
    );
}

// ─── Main canvas inner (inside ReactFlowProvider) ─────────────────────────────

function DiagramCanvasInner() {
    const updateNodeInternals = useUpdateNodeInternals();
    const model = useModelStore(s => s.model);
    const createRelationship = useModelStore(s => s.createRelationship);
    const registries = useMemo(() => getRegistries(model), [model]);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const selectElement = useModelStore(s => s.selectElement);
    const inspectElement = useModelStore(s => s.inspectElement);
    const inspectRelationship = useModelStore(s => s.inspectRelationship);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setSelectedOntologyKind = useModelStore(s => s.setSelectedOntologyKind);
    const diagramLayouts = useModelStore(s => s.diagramLayouts);
    const setNodeLayout = useModelStore(s => s.setNodeLayout);
    const mergeDiagramLayouts = useModelStore(s => s.mergeDiagramLayouts);
    const updateDiagramElementIds = useModelStore(s => s.updateDiagramElementIds);
    const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();

    const [nodes, setNodes] = useNodesState<FlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
    const nodesRef = useRef<FlowNode[]>([]);
    const edgesRef = useRef<FlowEdge[]>([]);
    // The active interconnection profile (base vs dedicated IBD), resolved per
    // view below. Held in a ref so the geometry rAF callbacks can read its route
    // quality without being torn down and rebuilt on every view switch.
    const activeRendererRef = useRef(baseInterconnectionRenderer);
    /** Canvas root, captured by the image export. */
    const canvasRef = useRef<HTMLDivElement>(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [exportBusy, setExportBusy] = useState<DiagramExportFormat | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const previousLayoutModelRef = useRef(model);
    const previousLayoutDiagramRef = useRef(selectedDiagramId);
    const preservedViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
    const geometryFrameRef = useRef<number | null>(null);
    const geometryNeedsRerouteRef = useRef(false);
    const nodeDragStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
    const suppressInspectUntilRef = useRef(0);
    // While a geometry frame is pending, `nodesRef` holds changes that have been
    // applied but not yet rendered — a resize in progress, for instance. Syncing
    // it back from the rendered `nodes` at that moment throws those changes
    // away: a resize bumps `layoutEditVersion`, that re-renders with the old
    // node array before the queued frame runs, and the half-finished resize is
    // silently reverted every frame. Only adopt rendered state when nothing is
    // in flight.
    useEffect(() => {
        if (geometryFrameRef.current === null) nodesRef.current = nodes;
    }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    const scheduleGeometryUpdate = useCallback((nextNodes: FlowNode[], reroute = true) => {
        nodesRef.current = nextNodes;
        geometryNeedsRerouteRef.current ||= reroute;
        if (geometryFrameRef.current !== null) return;
        geometryFrameRef.current = requestAnimationFrame(() => {
            geometryFrameRef.current = null;
            const forced = activeRendererRef.current.forcedPortSize;
            const stableNodes = repositionNestedPins(
                snapPortsToWall(
                    alignFacingPorts(
                        resolveWallPortOverlaps(nodesRef.current, forced),
                        edgesRef.current, forced),
                    forced));
            nodesRef.current = stableNodes;
            const shouldReroute = geometryNeedsRerouteRef.current;
            geometryNeedsRerouteRef.current = false;
            if (!shouldReroute) {
                setNodes(stableNodes);
                return;
            }
            const routedEdges = reroutePositionedEdges(stableNodes, edgesRef.current, activeRendererRef.current.routeQuality, activeRendererRef.current.forcedPortSize);
            edgesRef.current = routedEdges;
            setNodes(stableNodes);
            setEdges(routedEdges);
        });
    }, [setNodes, setEdges]);
    const [isLayouting, setIsLayouting] = useState(false);
    const [layoutEditVersion, setLayoutEditVersion] = useState(0);
    const [layoutError, setLayoutError] = useState<string | null>(null);
    const [layoutVersion, setLayoutVersion] = useState(0);
    // The minimap is bottom-left and the zoom controls bottom-right, which is
    // fine until the canvas is narrow enough for them to meet — and then the
    // controls are unreachable, which is worse than having no minimap. So it
    // collapses, and remembers.
    const [miniMapOpen, setMiniMapOpen] = useState(
        () => localStorage.getItem('memo.minimap.open') !== 'false');
    // Bumped to force a fresh layout pass (e.g. tree Reset Layout)
    const [relayoutNonce, setRelayoutNonce] = useState(0);
    const [paletteCollapsed, setPaletteCollapsed] = useState(true);
    // The floating toolbar drawer starts closed: on load it covers whatever the
    // diagram placed under it, which on a wide layout is real content. But the
    // choice is REMEMBERED, like the minimap's. It used to reset on every
    // navigation, and since the drawer holds the general-view mode switch —
    // graph / tree / containment — opening a second diagram silently took those
    // modes away again. A control that has to be rediscovered per diagram reads
    // as a control that was removed.
    const [toolbarCollapsed, setToolbarCollapsed] = useState(
        () => localStorage.getItem('memo.diagram.toolbar.open') !== 'true');
    useEffect(() => {
        try {
            localStorage.setItem('memo.diagram.toolbar.open', String(!toolbarCollapsed));
        } catch {
            // storage disabled — the choice still holds for this session
        }
    }, [toolbarCollapsed]);
    const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
    const actionFlowToolbarPlacement: 'left' = 'left';

    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridVisible, setGridVisible] = useState(true);
    // Action Flow template (KK-4): allocation lanes are on by default.
    const [swimlanesOn, setSwimlanesOn] = useState(true);
    const [actionFlowDirection, setActionFlowDirection] = useState<'horizontal' | 'vertical'>('horizontal');
    const [actionFlowLegendOpen, setActionFlowLegendOpen] = useState(true);
    const [actionFlowLegendPlacement, setActionFlowLegendPlacement] = useState<'overlay' | 'above'>('overlay');
    const [actionFlowLaneGrouping, setActionFlowLaneGrouping] = useState<ActionFlowLaneGrouping>('allocation');

    const [actionFlowDisplayLevel, setActionFlowDisplayLevel] = useState<ActionFlowDisplayLevel>('all');
    const [actionFlowLevelsOpen, setActionFlowLevelsOpen] = useState(false);
    const [flowFiltersOpen, setFlowFiltersOpen] = useState(false);
    const [visibleActionFlowKinds, setVisibleActionFlowKinds] = useState<Set<'control' | 'data' | 'energy' | 'material'>>(
        new Set(['control', 'data', 'energy', 'material']),
    );

    // DiagramEditor owns the header; these events let its right-aligned panel
    // icons toggle canvas-local panels without putting controls over the graph.
    useEffect(() => {
        const toggleToolbar = () => setToolbarCollapsed(value => !value);
        const toggleElements = () => setPaletteCollapsed(value => !value);
        window.addEventListener('memo:toggle-diagram-toolbar', toggleToolbar);
        window.addEventListener('memo:toggle-diagram-elements', toggleElements);
        return () => {
            window.removeEventListener('memo:toggle-diagram-toolbar', toggleToolbar);
            window.removeEventListener('memo:toggle-diagram-elements', toggleElements);
        };
    }, []);

    useEffect(() => {
        const syncFullscreenState = () => {
            const fullscreenElement = document.fullscreenElement;
            setIsCanvasFullscreen(Boolean(fullscreenElement && canvasRef.current?.contains(fullscreenElement)));
        };
        document.addEventListener('fullscreenchange', syncFullscreenState);
        return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
    }, []);

    // Quick create popup state
    const [quickCreate, setQuickCreate] = useState<{
        x: number; y: number;
        flowX: number; flowY: number;
        kind?: string; layer?: string; construct?: string;
    } | null>(null);

    // Relationship picker state — holds the two elements the edge connects, so
    // the picker can resolve legality from the ontology rather than kind names.
    const [relPicker, setRelPicker] = useState<{
        x: number; y: number;
        sourceElement: MemoElement; targetElement: MemoElement;
    } | null>(null);

    // Context menu state
    const [nodeCtx, setNodeCtx] = useState<{
        x: number; y: number; nodeId: string; nodeKind: string;
    } | null>(null);
    const [edgeCtx, setEdgeCtx] = useState<{
        x: number; y: number; edgeId: string; relType: string;
    } | null>(null);

    // Focus mode state (#22)
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const [focusDepth, setFocusDepth] = useState(2);

    // Source file toast (#38)
    const [sourceToast, setSourceToast] = useState<string | null>(null);

    // Undo/redo stack
    const undoStack = useRef<UndoCommand[]>([]);
    const redoStack = useRef<UndoCommand[]>([]);

    const pushUndo = useCallback((cmd: UndoCommand) => {
        undoStack.current.push(cmd);
        if (undoStack.current.length > UNDO_STACK_DEPTH) undoStack.current.shift();
        redoStack.current = [];
    }, []);

    // Layout debounce timer

    // Get the selected diagram
    const selectedDiagram = getDiagram(model, selectedDiagramId);
    const diagramMeta = selectedDiagram ? DIAGRAM_TYPE_META[selectedDiagram.diagramType] : null;
    const isDecompDiagram = !!selectedDiagram?.properties?.layoutStyle;
    const isFBSDiagram = selectedDiagram?.properties?.layoutStyle === 'fbs';
    const currentLayout = selectedDiagramId ? diagramLayouts[selectedDiagramId] : undefined;
    // Per-view renderer profile: a view opts into the dedicated IBD canvas via
    // its layout companion (`canvas.renderer`); everything else keeps the base
    // profile, so no other diagram is affected by the IBD rules.
    const activeRenderer = resolveInterconnectionRenderer(
        (currentLayout?.canvas as { renderer?: string } | undefined)?.renderer,
    );
    activeRendererRef.current = activeRenderer;
    const layoutProviderId = selectedLayoutProviderId(currentLayout);
    const autoLayoutEnabled = currentLayout?.canvas?.autoLayout !== false;
    const flowAnimationEnabled = currentLayout?.canvas?.flowAnimation === true;
    const showIbdPortText = currentLayout?.canvas?.showPortText !== false;
    const showIbdConnectionText = currentLayout?.canvas?.showConnectionText !== false;
    // Walls the view declares for its boundary ports. A constraint fed INTO
    // layout, not an override applied after it: the template sizes the box and
    // orders the wall around it, so a bottom-wall connector is placed
    // automatically instead of only being pinnable by hand.
    const declaredPortWalls = currentLayout?.canvas?.portWalls;
    const portWalls = useMemo(() => {
        const entries = Object.entries(declaredPortWalls ?? {})
            .flatMap(([portId, side]) => {
                const wall = parsePortSide(side);
                return wall ? [[portId, wall] as const] : [];
            });
        return entries.length > 0 ? new Map<string, PortSide>(entries) : undefined;
    }, [declaredPortWalls]);
    // Per-edge label overrides authored on the .viewlayout edges
    // (`DiagramEdgeLayout.labelVisible`). With `showConnectionText` on, these let
    // a dense IBD name only the few flows that carry the story.
    const declaredEdges = currentLayout?.edges;
    const edgeLabelVisibility = useMemo(() => {
        const entries = Object.entries(declaredEdges ?? {})
            .flatMap(([edgeId, layout]) => {
                const visible = (layout as { labelVisible?: boolean } | undefined)?.labelVisible;
                return typeof visible === 'boolean' ? [[edgeId, visible] as const] : [];
            });
        return entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }, [declaredEdges]);
    // A view names the enum and the attribute that carries its literal. Colours
    // are authored beside that declaration in the viewlayout, never selected by
    // a renderer palette. Without a declaration, the old automatic layer colour
    // path remains byte-for-byte intact.
    const ibdLegend = useMemo(() => {
        const legend = currentLayout?.canvas?.legend;
        if (!legend?.enum || !legend.attribute) return undefined;
        const definition = model?.enumerations?.find(candidate => candidate.name === legend.enum);
        if (!definition) return undefined;
        const colors = new Map(definition.literals.flatMap(literal => {
            const color = legend.colors?.[literal];
            return color ? [[literal, color] as const] : [];
        }));
        return { attribute: legend.attribute, colors, name: definition.name };
    }, [currentLayout?.canvas?.legend, model?.enumerations]);
    const persistAnnotationText = useCallback((annotationId: string, text: string) => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const annotation = previous.annotations?.[annotationId];
        if (!annotation) return;
        const layout: DiagramLayout = {
            ...previous,
            annotations: { ...previous.annotations, [annotationId]: { ...annotation, text } },
        };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        setNodes(current => current.map(node => node.id === annotationId
            ? { ...node, data: { ...node.data, text } } : node));
    }, [selectedDiagramId, mergeDiagramLayouts, setNodes]);

    const deleteAnnotation = useCallback((annotationId: string) => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const annotations = { ...previous.annotations };
        delete annotations[annotationId];
        const layout: DiagramLayout = { ...previous, annotations };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        setNodes(current => current.filter(node => node.id !== annotationId));
    }, [selectedDiagramId, mergeDiagramLayouts, setNodes]);

    const annotationNodes = useCallback((layout?: DiagramLayout): FlowNode[] =>
        Object.entries(layout?.annotations ?? {}).map(([id, annotation]) => ({
            id,
            type: 'annotationNode',
            zIndex: 1000,
            position: { x: annotation.x, y: annotation.y },
            style: { width: annotation.width ?? 180, height: annotation.height ?? 92 },
            data: {
                kind: annotation.kind,
                text: annotation.text,
                color: annotation.color,
                onTextChange: (text: string) => persistAnnotationText(id, text),
                onDelete: () => deleteAnnotation(id),
            },
        })), [persistAnnotationText, deleteAnnotation]);

    const addAnnotation = useCallback((kind: AnnotationKind) => {
        if (!selectedDiagramId) return;
        const id = `annotation-${Date.now().toString(36)}`;
        const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        const text = kind === 'constraint' ? '{constraint}' : kind === 'note' ? 'Note' : 'Text';
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const annotation = { kind, x: position.x, y: position.y, width: 180, height: kind === 'text' ? 56 : 92, text };
        const layout: DiagramLayout = {
            ...previous,
            annotations: { ...previous.annotations, [id]: annotation },
        };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        setNodes(current => [...current, ...annotationNodes(layout).filter(node => node.id === id)]);
    }, [selectedDiagramId, screenToFlowPosition, mergeDiagramLayouts, setNodes, annotationNodes]);
    /**
     * Discard saved positions and lay the diagram out again from the template.
     *
     * Positions are only meaningful for the axis they were computed on, so
     * anything that changes that axis has to start over rather than reuse them.
     */
    const relayoutFromScratch = useCallback(() => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId];
        const layout: DiagramLayout = {
            nodes: {}, edges: {},
            canvas: { ...previous?.canvas, autoLayout: true },
        };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        setRelayoutNonce(value => value + 1);
    }, [selectedDiagramId, mergeDiagramLayouts]);

    /**
     * Flip the reading direction, and re-lay the diagram out.
     *
     * Keeping the saved positions across a flip left every step where the other
     * axis had put it, so lanes — whose bands are measured from their members —
     * came out overlapping each other instead of running as parallel tracks.
     */
    const changeActionFlowDirection = useCallback((next: 'horizontal' | 'vertical') => {
        setActionFlowDirection(next);
        // The control handles move from left/right to top/bottom. React Flow
        // caches their bounds, so refresh them before the re-laid edges draw.
        requestAnimationFrame(() => updateNodeInternals(nodesRef.current.map(node => node.id)));
        relayoutFromScratch();
    }, [relayoutFromScratch, updateNodeInternals]);

    const markManualLayout = useCallback(() => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        if (previous.canvas?.autoLayout === false) return;
        mergeDiagramLayouts({
            [selectedDiagramId]: {
                ...previous,
                canvas: { ...previous.canvas, autoLayout: false },
            },
        });
    }, [selectedDiagramId, mergeDiagramLayouts]);

    // Manual geometry is the user's document state, not an explicit export
    // operation. Persist it after interaction settles so there is no separate
    // Save Layout workflow and rapid pointer moves do not flood the backend.
    useEffect(() => {
        if (!selectedDiagramId || autoLayoutEnabled || isLayouting || nodes.length === 0 || layoutEditVersion === 0) return;
        const timer = window.setTimeout(() => {
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            const viewport = getViewport();
            const layout = withContextChildCoordinates({
                nodes: Object.fromEntries(nodes.filter(node => node.type !== 'annotationNode').map(node => [node.id, {
                    ...(previous.nodes[node.id] ?? {}),
                    x: node.position.x,
                    y: node.position.y,
                    // The frame these coordinates are in. React Flow positions a
                    // nested node relative to its parent and a top-level node in
                    // board coordinates, so the pair above is meaningless without
                    // it: re-parenting a node silently reinterprets the numbers in
                    // a different frame and the node jumps. Recording the frame is
                    // what lets the loader rebase instead of guess.
                    parent: node.parentId ?? null,
                    ...(node.width ? { width: node.width } : {}),
                    ...(node.height ? { height: node.height } : {}),
                    ports: Object.fromEntries(
                        (((node.data as { ports?: PortInfo[] }).ports) ?? [])
                            .map(port => [port.id, {
                                ...((previous.nodes[node.id] as { ports?: Record<string, object> } | undefined)?.ports?.[port.id] ?? {}),
                                x: port.x, y: port.y, side: port.side,
                                ...(port.size ? { size: port.size } : {}),
                                // A nested pin's x/y are derived from its parent, so
                                // what has to survive is where the user put it along
                                // that parent's edge — and on which face.
                                ...(port.alongOffset !== undefined ? { alongOffset: port.alongOffset } : {}),
                                ...(port.faceOuter !== undefined ? { faceOuter: port.faceOuter } : {}),
                            }]),
                    ),
                }])),
                edges: Object.fromEntries(edges.map(edge => [edge.id, {
                    ...(() => {
                        const { points: _oldPoints, ...rest } = previous.edges?.[edge.id] ?? {};
                        return rest;
                    })(),
                    ...(edge.data?.manualRoute && (edge.data?.points as Array<{ x: number; y: number }> | undefined)?.length
                        ? {
                            points: edge.data?.points as Array<{ x: number; y: number }>,
                            source: edge.source,
                            target: edge.target,
                            sourcePortId: edge.data?.sourcePortId as string | undefined,
                            targetPortId: edge.data?.targetPortId as string | undefined,
                        }
                        : {}),
                }])),
                annotations: Object.fromEntries(nodes.filter(node => node.type === 'annotationNode').map(node => [node.id, {
                    kind: node.data.kind as AnnotationKind,
                    text: String(node.data.text ?? ''),
                    color: node.data.color as string | undefined,
                    x: node.position.x,
                    y: node.position.y,
                    width: Number(node.width ?? node.style?.width ?? 180),
                    height: Number(node.height ?? node.style?.height ?? 92),
                }])),
                canvas: {
                    ...previous.canvas,
                    zoom: viewport.zoom,
                    pan: { x: viewport.x, y: viewport.y },
                    autoLayout: false,
                },
            } as DiagramLayout);
            mergeDiagramLayouts({ [selectedDiagramId]: layout });
            sendDiagramLayoutUpdate(selectedDiagramId, layout);
            setLayoutEditVersion(0);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [selectedDiagramId, autoLayoutEnabled, isLayouting, layoutEditVersion, nodes, edges, getViewport, mergeDiagramLayouts]);

    // Spec view kind (Epic KK): every diagram resolves to one of the 8 kinds
    const viewKind: ViewKind | undefined = selectedDiagram
        ? ((selectedDiagram.viewKind as ViewKind | undefined) ?? diagramMeta?.viewKind ?? 'general')
        : undefined;
    const toolbarOperations = useMemo(() => toolbarOperationsFor(viewKind), [viewKind]);
    const supportsToolbarOperation = useCallback(
        (operation: Parameters<typeof toolbarOperations.has>[0]) => toolbarOperations.has(operation),
        [toolbarOperations],
    );
    // IBD text and ports must remain readable on first render. A board can be
    // panned like Miro; shrinking an entire architecture until labels become
    // dust is not a useful definition of "fit".
    // A diagram opens at a size it can be read at. Fitting the whole graph on
    // screen at any cost meant a wide flow opened at a zoom where the step
    // names were illegible, and the first thing anyone did was zoom in.
    // A floor stops a dense diagram fitting itself into illegibility. A general
    // view earns a lower one: its tree is as wide as the model is broad — the
    // IMS decomposition spans ~9000px across one level — and at 0.8 the full
    // fit was rejected, so the diagram opened on its top-left corner with the
    // rest off-screen. Better small and whole than large and cropped; the user
    // can zoom, but cannot guess what is out there.
    const fitMinZoom = viewKind === 'interconnection' ? 0.72 : viewKind === 'general' ? 0.12 : 0.8;

    /**
     * Frame a diagram according to how much of it fits at the readable minimum
     * zoom. Smaller diagrams are centered. Taller diagrams retain a readable
     * width and begin just below the top edge, so their first content is not
     * hidden above the viewport.
     */
    const fitDiagramFrame = useCallback((duration = 0) => {
        const container = canvasRef.current;
        const visibleNodes = nodesRef.current.filter(node => !node.hidden);
        if (!container || visibleNodes.length === 0) return;

        const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
        // When the legend is above the canvas, React Flow starts below that
        // strip. Fit to its actual available height, not the outer work area.
        const legendReserve = viewKind === 'actionflow' && actionFlowLegendOpen && actionFlowLegendPlacement === 'above'
            ? 112
            : 0;
        // The tools dock is outside the drawing surface, so its dimensions do
        // not consume or obscure the drawable viewport.
        const viewportWidth = containerWidth;
        const viewportHeight = containerHeight - legendReserve;
        const bounds = getNodesBounds(visibleNodes);
        if (viewportWidth <= 0 || viewportHeight <= 0 || bounds.width <= 0 || bounds.height <= 0) return;

        // Allocation lanes are the primary reading structure of an action
        // flow. A generic bounds fit makes a long horizontal flow tiny and
        // leaves most of the canvas blank. Fill the cross-axis instead, then
        // anchor the reading axis (left for horizontal, top for vertical).
        if (viewKind === 'actionflow' && swimlanesOn) {
            if (actionFlowDirection === 'horizontal') {
                const zoom = Math.max(0.1, Math.min(2, viewportHeight * 0.72 / bounds.height));
                setViewport({
                    x: viewportWidth * 0.05 - bounds.x * zoom,
                    y: (viewportHeight - bounds.height * zoom) / 2 - bounds.y * zoom,
                    zoom,
                }, { duration });
            } else {
                const zoom = Math.max(0.1, Math.min(2, viewportWidth * 0.78 / bounds.width));
                setViewport({
                    x: (viewportWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
                    y: viewportHeight * 0.06 - bounds.y * zoom,
                    zoom,
                }, { duration });
            }
            return;
        }

        const sidePadding = 0.08;
        const topPadding = 0.08;
        // A decomposition opens collapsed, so the fit is against one or two
        // boxes and would otherwise magnify them to 2x — filling the screen
        // with a single block and dropping its children outside the viewport
        // the moment it is expanded. Cap it at natural size: the camera is
        // then framed once and the tree grows into the space it left.
        const fitMaxZoom = viewKind === 'general' ? 1 : 2;
        const fullFitZoom = Math.min(
            (viewportWidth * (1 - sidePadding * 2)) / bounds.width,
            (viewportHeight * (1 - topPadding * 2)) / bounds.height,
            fitMaxZoom,
        );
        if (fullFitZoom >= fitMinZoom) {
            fitView({ padding: sidePadding, minZoom: fitMinZoom, maxZoom: fitMaxZoom, duration });
            return;
        }

        // The diagram is taller than a readable full fit. Preserve its width
        // and anchor it at 8% from the top, leaving the remaining content to
        // be reached by normal pan/zoom rather than clipping its beginning.
        const zoom = Math.max(0.1, Math.min(fitMaxZoom, (viewportWidth * (1 - sidePadding * 2)) / bounds.width));
        setViewport({
            x: viewportWidth * sidePadding - bounds.x * zoom,
            y: viewportHeight * topPadding - bounds.y * zoom,
            zoom,
        }, { duration });
    }, [actionFlowDirection, actionFlowLegendOpen, actionFlowLegendPlacement, actionFlowToolbarPlacement, fitMinZoom, fitView, isCanvasFullscreen, setViewport, swimlanesOn, toolbarCollapsed, viewKind]);
    // General template mode — legacy layoutStyle diagrams keep their own controls
    const isGeneralTemplate = viewKind === 'general' && !isDecompDiagram && !isFBSDiagram;
    const isUseCaseDiagram = selectedDiagram?.diagramType === 'ucd';
    const [generalMode, setGeneralMode] = useState<GeneralViewMode>('graph');
    const [useCaseDisplayLevel, setUseCaseDisplayLevel] = useState<number | 'all'>('all');
    const [useCaseEdgeStyle, setUseCaseEdgeStyle] = useState<UseCaseEdgeStyle>('straight');
    const [hiddenUseCaseActorIds, setHiddenUseCaseActorIds] = useState<Set<string>>(new Set());
    const useCaseDepth = useMemo(() => model ? useCaseMaxDepth(model) : 0, [model]);
    const useCaseActors = useMemo(() => model ? useCaseActorOptions(model) : [], [model]);
    // A view may restrict its presentation modes (e.g. the BDD sample is a
    // strict tree — no graph) via properties.modes = "tree,containment"
    const declaredModes = selectedDiagram?.properties?.modes;
    const allowedGeneralModes = useMemo(() => {
        if (!declaredModes) return GENERAL_VIEW_MODES;
        const wanted = new Set(declaredModes.split(',').map(s => s.trim()));
        const filtered = GENERAL_VIEW_MODES.filter(m => wanted.has(m));
        return filtered.length ? filtered : GENERAL_VIEW_MODES;
    }, [declaredModes]);
    const actionFlowDisplayLevels = useMemo(() => {
        if (!model || !selectedDiagram) return [];
        const included = new Set(selectedDiagram.elementIds);
        const targets = Object.values(model.elements)
            .filter(element => included.has(element.id) && element.allocatedTo)
            .map(element => element.allocatedTo!);
        return commonDisplayLevels(targets, model);
    }, [model, selectedDiagram]);
    const actionFlowHasStages = useMemo(() => {
        if (!model || !selectedDiagram) return false;
        const included = new Set(selectedDiagram.elementIds);
        return Object.values(model.elements).some(element =>
            included.has(element.id) && Boolean(element.attributes['stage'] || element.attributes['phase']),
        );
    }, [model, selectedDiagram]);
    const floatingActions = useMemo(() => {
        if (!model || !selectedDiagram || viewKind !== 'actionflow') return [];
        const actions = (selectedDiagram.elementIds ?? [])
            .map(id => model.elements[id])
            .filter((element): element is MemoElement => Boolean(element) && element.construct === 'action');
        return findFloatingActions(actions, model);
    }, [model, selectedDiagram, viewKind]);
    // Decomposition state
    const [layoutStyle, setLayoutStyle] = useState<'containment' | 'decomposition'>('containment');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [collapsedInterconnectionNodes, setCollapsedInterconnectionNodes] = useState<Set<string>>(new Set());
    const [focusedInterconnectionId, setFocusedInterconnectionId] = useState<string | null>(null);
    const [interconnectionPortDisplay, setInterconnectionPortDisplay] = useState<PortDisplay>('all');
    const [interconnectionConnectionDisplay, setInterconnectionConnectionDisplay] = useState<'summary' | 'all' | 'none'>('summary');
    const [interconnectionLegendOpen, setInterconnectionLegendOpen] = useState(false);
    const [expandedActionNodes, setExpandedActionNodes] = useState<Set<string>>(new Set());
    const saveIbdDisplay = useCallback((patch: { portDisplay?: PortDisplay; connectionDisplay?: 'summary' | 'all' | 'none' }) => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, ...patch } };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
    }, [selectedDiagramId, mergeDiagramLayouts]);
    const [focusedActionId, setFocusedActionId] = useState<string | null>(null);
    const [actionFlowNesting, setActionFlowNesting] = useState<ActionFlowNesting>('flat');
    // State machine nesting: composites folded in place, or one drilled into.
    const [collapsedStateNodes, setCollapsedStateNodes] = useState<Set<string>>(new Set());
    const [focusedStateId, setFocusedStateId] = useState<string | null>(null);
    const [nodeDirections, setNodeDirections] = useState<Map<string, 'vertical' | 'horizontal'>>(new Map());
    const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Drill-down breadcrumb: composition ancestry of the focused IBD part.
    const interconnectionPath = useMemo(
        () => compositionPath(model, focusedInterconnectionId),
        [model, focusedInterconnectionId],
    );
    // Same breadcrumb for a drilled-into composite state.
    const statePath = useMemo(
        () => compositionPath(model, focusedStateId),
        [model, focusedStateId],
    );
    // Action nesting runs on `parentAction`, not composition relationships, so
    // the action-flow breadcrumb walks its own chain.
    const actionPath = useMemo(() => {
        if (!model || !focusedActionId) return [] as string[];
        const path = [focusedActionId];
        const seen = new Set(path);
        let current: string | undefined = focusedActionId;
        while (current) {
            const parent: string | undefined = model.elements[current]?.parentAction;
            if (!parent || seen.has(parent) || !model.elements[parent]) break;
            path.unshift(parent);
            seen.add(parent);
            current = parent;
        }
        return path;
    }, [model, focusedActionId]);
    /**
     * Every composite state — the target set for "collapse all". The owning
     * state machine is excluded: folding the frame would collapse the whole
     * diagram to a single box.
     */
    const compositeStateIds = useMemo(() => {
        if (!model || viewKind !== 'statetransition') return [] as string[];
        const composites = new Set<string>();
        for (const rel of model.relationships) {
            if (!COMPOSITION_REL_TYPES.has(rel.type)) continue;
            const parent = model.elements[rel.sourceId];
            if (!parent || !model.elements[rel.targetId]) continue;
            if (!isStateElement(parent) || parent.kind.endsWith('Machine')) continue;
            composites.add(parent.id);
        }
        return [...composites];
    }, [model, viewKind]);
    /** Every part that owns parts — the target set for the IBD "collapse all". */
    const interconnectionContainerIds = useMemo(() => {
        if (!model) return [] as string[];
        return [...new Set(
            model.relationships
                .filter(r => COMPOSITION_REL_TYPES.has(r.type))
                .map(r => r.sourceId),
        )];
    }, [model]);

    // Fresh per-diagram state: honor the view's declared layoutHint
    useEffect(() => {
        setLayoutEditVersion(0);
        setGeneralMode(resolveGeneralMode(selectedDiagram?.properties));
        setUseCaseDisplayLevel(useCaseViewOptions(selectedDiagram?.properties).level ?? 'all');
        setUseCaseEdgeStyle(useCaseViewOptions(selectedDiagram?.properties).edgeStyle ?? 'straight');
        setHiddenUseCaseActorIds(new Set());
        setSwimlanesOn(true);
        setActionFlowLaneGrouping('allocation');
        setActionFlowDisplayLevel('all');
        const expandedHint = selectedDiagram?.properties?.styleHint?.startsWith('expanded:')
            ? selectedDiagram.properties.styleHint.slice('expanded:'.length).split(',').map(id => id.trim()).filter(Boolean)
            : [];
        // A decomposition opens collapsed, at its root, and the reader opens
        // what they came to look at.
        //
        // Auto-expanding whole levels was an attempt to fix a different
        // problem — a view of 305 unrelated elements really did open as one
        // box reading "3 parts (collapsed)". Rooting a BDD at its subject fixed
        // that at the source, and the auto-expansion then became the problem:
        // one level of the IMS decomposition is ~9000px across, so the diagram
        // opened far too wide to read. A view that names its own expansion
        // through `styleHint` still gets it.
        setExpandedNodes(new Set(expandedHint));
        // collapsedInterconnectionNodes / collapsedStateNodes are seeded by the
        // default-collapsed effect below, which owns them outright — clearing
        // them here too would race it and leave the diagram fully expanded.
        setFocusedInterconnectionId(null);
        setInterconnectionPortDisplay(currentLayout?.canvas?.portDisplay ?? 'all');
        setInterconnectionConnectionDisplay(currentLayout?.canvas?.connectionDisplay ?? 'summary');
        setInterconnectionLegendOpen(false);
        setExpandedActionNodes(new Set());
        setFocusedActionId(null);
        setActionFlowNesting('flat');
        setFocusedStateId(null);
        positionCacheRef.current.clear();
    }, [selectedDiagramId, selectedDiagram?.properties?.layoutHint, selectedDiagram?.properties?.styleHint, currentLayout?.canvas?.portDisplay, currentLayout?.canvas?.connectionDisplay]);

    // Custom node types
    const nodeTypes = useMemo(() => ({
        decompositionNode: DecompositionNode,
        interconnectionNode: InterconnectionNode,
        actionFlowNode: ActionFlowNode,
        actionFlowLane: ActionFlowLaneNode,
        actionFlowLaneLabel: ActionFlowLaneLabelNode,
        stateNode: StateNode,
        seqLifeline: SeqLifelineNode,
        seqSection: SeqSectionNode,
        seqOccurrence: SeqOccurrenceNode,
        useCase: UseCaseNode,
        useCaseActor: UseCaseActorNode,
        useCaseBoundary: UseCaseBoundaryNode,
        contextSystem: ContextSystemNode,
        contextExternal: ContextExternalNode,
        contextBoundary: ContextBoundaryNode,
        diagramNode: DiagramInteractiveNode,
        annotationNode: AnnotationNode,
        decisionNode: DecisionNode,
        forkNode: ForkNode,
        startEndNode: StartEndNode,
    }), []);
    const edgeTypes = useMemo(() => ({ interconnectionEdge: InterconnectionEdge, useCaseEdge: UseCaseEdge }), []);

    const miniMapNodeColor = useCallback((node: any) =>
        node.data?.color || node.data?.layerColor || '#ccc', []);

    // ─── Viewpoint filter ──────────────────────────────────────────────────────

    const viewpointFilter = useMemo(() => {
        const effectiveVpId = selectedDiagram?.viewpointId === '__model'
            ? null
            : (selectedDiagram?.viewpointId || selectedViewpointId);

        const hasViewpoint = effectiveVpId && model?.viewpoints;
        const hasHidden = hiddenLayers.size > 0;
        const diagramElementIds = selectedDiagram?.elementIds?.length
            ? new Set(selectedDiagram.elementIds)
            : undefined;

        if (!hasViewpoint && !hasHidden && !diagramElementIds) return undefined;

        const vp = hasViewpoint
            ? model!.viewpoints!.find(v => v.id === effectiveVpId) : undefined;
        const vpKinds = vp ? new Set(vp.visibleKinds) : undefined;
        const vpLayers = vp ? new Set(vp.visibleLayers) : undefined;

        return (el: MemoElement) => {
            if (hiddenLayers.has(el.layer)) return false;
            if (diagramElementIds) return diagramElementIds.has(el.id);
            if ((vpKinds?.size ?? 0) > 0 || (vpLayers?.size ?? 0) > 0) {
                return !!vpKinds?.has(el.kind) || !!vpLayers?.has(el.layer);
            }
            return true;
        };
    }, [selectedViewpointId, selectedDiagram, model?.viewpoints, hiddenLayers]);

    /**
     * IBD containers deep enough to fold on open.
     *
     * An IBD exists to show internal structure, but its opening frame must be
     * legible. The frame's immediate parts stay visible as the system overview;
     * each part's own internals start folded. Expanding or drilling into one
     * part then gives that subsystem its own usable canvas instead of trying to
     * render every nested module and connector at once.
     *
     * Depth is measured over the *visible* elements, not the whole model: a view
     * that exposes only a subtree makes that subtree's own root the frame, and
     * its children must count as level 1 regardless of how deep they sit
     * globally. Depth 1 is the first detail level inside that visible frame.
     */
    /**
     * A diagram that nests deeply opens folded. A deep hierarchy drawn at full
     * depth is unreadable — GPCA's mode machine is four levels — so the reader
     * expands the one branch they came to look at.
     *
     * The action-flow and tree views already start collapsed, because they
     * track which nodes are *expanded*. The state-machine and IBD views track
     * the inverse, so an empty set means fully open and they have to be seeded.
     * A state machine folds every composite. An IBD does NOT fold: its parts
     * are the content the reader came for, and folding by depth hid the ports
     * a connector lands on, so the connectors read as arriving nowhere.
     * Seeded once per diagram: after that the set belongs to the user, and
     * "expand all" must not be undone on the next render.
     */
    const seededCollapseRef = useRef<string | null>(null);
    useEffect(() => {
        if (!model) return;
        const key = `${selectedDiagramId ?? ''}|${viewKind ?? ''}`;
        if (seededCollapseRef.current === key) return;
        if (viewKind === 'statetransition') {
            if (compositeStateIds.length === 0) return;
            setCollapsedStateNodes(new Set(compositeStateIds));
        } else if (viewKind === 'interconnection') {
            // Open fully expanded, and record that this diagram has been
            // seeded so a later render cannot re-fold what the user opened.
            setCollapsedInterconnectionNodes(new Set());
        }
        seededCollapseRef.current = key;
    }, [model, selectedDiagramId, viewKind, compositeStateIds]);

    // BDD integrity: a block definition diagram must be one connected hierarchy,
    // not a forest of disconnected/floating elements (validateSingleTree).
    const bddTreeIssue = useMemo(() => {
        if (!model || !selectedDiagram || selectedDiagram.diagramType !== 'bdd') return null;
        const declaredTypes = selectedDiagram.relationshipTypes ?? [];
        const usesComposition = declaredTypes.length === 0 || declaredTypes.every(type =>
            COMPOSITION_REL_TYPES.has(type.charAt(0).toLowerCase() + type.slice(1)),
        );
        // A BDD may also present an authored semantic hierarchy (such as
        // UseCase Includes). Those may intentionally have multiple roots, so
        // the strict single-composition-tree rule does not apply.
        if (!usesComposition) return null;
        return validateSingleTree(buildGeneralViewTree(model, viewpointFilter, selectedDiagram.relationshipTypes, viewElementOf(model, selectedDiagram)));
    }, [model, selectedDiagram, viewpointFilter]);

    // ─── Decomp callbacks ──────────────────────────────────────────────────────
    // Tree source: legacy layoutStyle diagrams keep their kind-scoped trees;
    // the General template derives its tree from the view's own selection.

    const buildActiveTree = useCallback(() => {
        if (!model) return undefined;
        if (isFBSDiagram) return buildFunctionalTree(model);
        if (isGeneralTemplate) return buildGeneralViewTree(model, viewpointFilter, selectedDiagram?.relationshipTypes, viewElementOf(model, selectedDiagram));
        return buildDecompositionTree(model);
    }, [model, isFBSDiagram, isGeneralTemplate, viewpointFilter, selectedDiagram?.relationshipTypes]);

    const toggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
            return next;
        });
    }, []);

    const toggleInterconnectionCollapse = useCallback((nodeId: string) => {
        setCollapsedInterconnectionNodes(previous => {
            const next = new Set(previous);
            if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
            return next;
        });
    }, []);

    const toggleActionExpand = useCallback((nodeId: string) => {
        setExpandedActionNodes(previous => {
            const next = new Set(previous);
            if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
            return next;
        });
    }, []);

    // Drill-down entry points shared by the node buttons and double-click, so
    // both gestures land in exactly the same state.
    const drillIntoState = useCallback((nodeId: string) => {
        setFocusedStateId(nodeId);
        setCollapsedStateNodes(new Set());
        inspectElement(null);
    }, [inspectElement]);

    const drillIntoAction = useCallback((nodeId: string) => {
        setFocusedActionId(nodeId);
        setExpandedActionNodes(new Set());
        inspectElement(null);
    }, [inspectElement]);

    const drillIntoInterconnection = useCallback((nodeId: string) => {
        setFocusedInterconnectionId(nodeId);
        // The part being descended into becomes the frame, so whatever was
        // folded in the wider diagram says nothing about what should be folded
        // here — start the new level fully open, as the other two views do.
        setCollapsedInterconnectionNodes(new Set());
        inspectElement(null);
    }, [inspectElement]);

    const toggleStateCollapse = useCallback((nodeId: string) => {
        setCollapsedStateNodes(previous => {
            const next = new Set(previous);
            if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
            return next;
        });
    }, []);

    const toggleDirection = useCallback((nodeId: string) => {
        positionCacheRef.current.clear();
        setNodeDirections(prev => {
            const next = new Map(prev);
            const current = next.get(nodeId) || 'vertical';
            next.set(nodeId, current === 'vertical' ? 'horizontal' : 'vertical');
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        const tree = buildActiveTree();
        if (!tree) return;
        const allIds = new Set<string>();
        const collectAll = (id: string) => {
            allIds.add(id);
            for (const cid of (tree.childrenMap.get(id) || [])) {
                if (tree.elements.has(cid)) collectAll(cid);
            }
        };
        for (const rootId of tree.roots) {
            if (tree.elements.has(rootId)) collectAll(rootId);
        }
        setExpandedNodes(allIds);
    }, [buildActiveTree]);

    const collapseAll = useCallback(() => setExpandedNodes(new Set()), []);

    const resetLayout = useCallback(() => {
        positionCacheRef.current.clear();
        setRelayoutNonce(n => n + 1);
    }, []);

    /**
     * Throw away every saved position for this diagram and lay it out again.
     *
     * A diagram the user has dragged into a corner has no way back short of
     * editing the .viewlayout by hand, which is why this is a first-class
     * control rather than a per-view-kind affordance.
     */
    const resetViewToDefault = useCallback(() => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const { pan: _pan, zoom: _zoom, ...canvas } = previous.canvas ?? {};
        const layout: DiagramLayout = { nodes: {}, edges: {}, canvas: { ...canvas, autoLayout: true } };
        preservedViewportRef.current = null;
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        positionCacheRef.current.clear();
        setRelayoutNonce(value => value + 1);
        window.setTimeout(() => fitDiagramFrame(300), 250);
    }, [selectedDiagramId, mergeDiagramLayouts, fitDiagramFrame]);

    /** Restore the model-derived UCD geometry and its best-fit viewport. */
    const autoArrangeUseCase = useCallback(() => {
        if (!selectedDiagramId) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const { pan: _pan, zoom: _zoom, ...canvas } = previous.canvas ?? {};
        const layout: DiagramLayout = { nodes: {}, edges: {}, canvas: { ...canvas, autoLayout: true } };
        preservedViewportRef.current = null;
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
        positionCacheRef.current.clear();
        setRelayoutNonce(value => value + 1);
        window.setTimeout(() => fitDiagramFrame(300), 250);
    }, [selectedDiagramId, mergeDiagramLayouts, fitDiagramFrame]);

    // ─── Apply interactive node data (context menu + inline edit callbacks) ───

    const applyInteractiveData = useCallback((rawNodes: FlowNode[]): FlowNode[] => {
        return rawNodes.map(n => {
            if (n.type !== 'diagramNode') return n;
            const el = model?.elements[n.id];
            return {
                ...n,
                data: {
                    ...n.data,
                    onContextMenu: (e: React.MouseEvent, nodeId: string) => {
                        setNodeCtx({ x: e.clientX, y: e.clientY, nodeId, nodeKind: (n.data as any).kind ?? '' });
                    },
                    onInlineEdit: (nodeId: string, newName: string) => {
                        if (!el) return;
                        const updated = { ...el, name: newName };
                        sendElementUpdate(updated);
                    },
                },
            };
        });
    }, [model]);

    // ─── Build nodes from sidecar or ELK ──────────────────────────────────────
    const buildNodesFromSidecar = useCallback((
        rawNodes: FlowNode[], layout: DiagramLayout
    ): FlowNode[] => {
        const legacyContextCoordinates = !hasContextChildCoordinates(layout);
        const rawById = new Map(rawNodes.map(node => [node.id, node]));
        const positioned = rawNodes.map(n => {
            const pos = layout.nodes[n.id];
            if (!pos) return n;
            const parent = n.parentId ? rawById.get(n.parentId) : undefined;
            // Prior context boards saved the system in board coordinates. The
            // boundary is now its React Flow parent, so rebase only that known
            // legacy shape; other nested templates have always used local
            // coordinates and are deliberately left alone.
            const position = legacyContextCoordinates && n.type === 'contextSystem'
                && parent?.type === 'contextBoundary'
                ? rebaseLegacyContextChildPosition(pos, parent.position)
                : rebaseForFrameChange(pos, n.parentId ?? null, id => rawById.get(id)?.position);
            return {
                ...n,
                position,
                ...(pos.width ? { width: pos.width } : {}),
                ...(pos.height ? { height: pos.height } : {}),
                ...(pos.width || pos.height
                    ? { style: { ...n.style, ...(pos.width ? { width: pos.width } : {}), ...(pos.height ? { height: pos.height } : {}) } }
                    : {}),
                data: {
                    ...n.data,
                    bgColor: pos.color || undefined,
                    ...(pos.opacity !== undefined ? { fillOpacity: pos.opacity } : {}),
                    ...(pos.borderColor !== undefined ? { borderColor: pos.borderColor || undefined } : {}),
                    ...(pos.textColor !== undefined ? { textColor: pos.textColor || undefined } : {}),
                    ...(pos.fontSize !== undefined ? { fontSize: pos.fontSize || undefined } : {}),
                    ...(pos.fontWeight !== undefined ? { fontWeight: pos.fontWeight || undefined } : {}),
                    ...(pos.textAlign !== undefined ? { textAlign: pos.textAlign } : {}),
                    ...(pos.verticalAlign !== undefined ? { verticalAlign: pos.verticalAlign } : {}),
                    ...(pos.ports ? {
                        // Authored port positions are honoured (a hand-placed board is
                        // the point of a manual layout). A nested PIN is derived from
                        // its parent instead, and any overlap an authored position
                        // creates is resolved by the wall pass below — fidelity first,
                        // then a correction, rather than discarding the authoring.
                        ports: ((n.data as { ports?: PortInfo[] }).ports ?? []).map(port => {
                            const saved = pos.ports?.[port.id] as Partial<PortInfo> | undefined;
                            if (!saved) return port;
                            // A nested pin's x/y are derived from its parent, so it
                            // only takes back the two things a drag can author: where
                            // along the parent's edge it sits, and which face.
                            if (port.nested) {
                                return {
                                    ...port,
                                    ...(saved.alongOffset !== undefined ? { alongOffset: saved.alongOffset } : {}),
                                    ...(saved.faceOuter !== undefined ? { faceOuter: saved.faceOuter } : {}),
                                };
                            }
                            return { ...port, ...saved };
                        }),
                    } : {}),
                },
            };
        });
        const byId = new Map(positioned.map(node => [node.id, node]));
        // Swimlanes are calculated presentation frames. Their geometry must
        // follow saved action positions rather than retaining a stale layout
        // rectangle that leaves moved actions outside their responsibility lane.
        const laneNodes = positioned.filter(node => node.type === 'actionFlowLane');
        const membersOf = (node: FlowNode) =>
            ((node.data as { memberIds?: string[] }).memberIds ?? [])
                .map(id => byId.get(id)).filter(Boolean) as FlowNode[];
        const left = (n: FlowNode) => n.position.x;
        const top = (n: FlowNode) => n.position.y;
        const right = (n: FlowNode) => n.position.x + Number(n.width ?? n.style?.width ?? 180);
        const bottom = (n: FlowNode) => n.position.y + Number(n.height ?? n.style?.height ?? 96);
        // A lane runs the whole length of the flow — every lane starts and ends
        // together, which is what makes them readable as parallel tracks. Only
        // its thickness comes from its own members. Sized from its own members
        // on both axes instead, each lane stopped at its own first and last
        // step, so a lane with one action became a small box floating beside
        // the others rather than a track running the length of the diagram.
        const allMembers = laneNodes.flatMap(membersOf);
        const spanMin = allMembers.length > 0
            ? { x: Math.min(...allMembers.map(left)), y: Math.min(...allMembers.map(top)) }
            : undefined;
        const spanMax = allMembers.length > 0
            ? { x: Math.max(...allMembers.map(right)), y: Math.max(...allMembers.map(bottom)) }
            : undefined;

        const laneRects = new Map<string, { position: { x: number; y: number }; width: number; height: number }>();
        const synced = positioned.map(node => {
            if (node.type !== 'actionFlowLane') return node;
            const data = node.data as { memberIds?: string[]; orientation?: 'row' | 'column' };
            const members = membersOf(node);
            if (members.length === 0 || !spanMin || !spanMax) return node;
            const column = data.orientation === 'column';
            // Cross axis: this lane's own members. Flow axis: the whole diagram.
            const minX = column ? Math.min(...members.map(left)) : spanMin.x;
            const maxX = column ? Math.max(...members.map(right)) : spanMax.x;
            const minY = column ? spanMin.y : Math.min(...members.map(top));
            const maxY = column ? spanMax.y : Math.max(...members.map(bottom));
            const rect = {
                position: { x: column ? minX - 36 : minX - 120, y: column ? minY - 32 : minY - 36 },
                width: maxX - minX + (column ? 72 : 156),
                height: maxY - minY + (column ? 68 : 72),
            };
            laneRects.set(node.id, rect);
            return { ...node, position: rect.position, style: { ...node.style, ...{ width: rect.width, height: rect.height } } };
        });
        // A lane's name is a node of its own, laid over the lane so it can stay
        // on screen while the lane is panned. It carries no members to measure,
        // so it takes the rectangle its lane just settled on — left behind, it
        // kept the rectangle the template computed and the names ended up
        // detached from the bands they name.
        return synced.map(node => {
            if (node.type !== 'actionFlowLaneLabel') return node;
            const rect = laneRects.get(node.id.replace('__lane_label_', '__lane_'));
            if (!rect) return node;
            return { ...node, position: rect.position, style: { ...node.style, width: rect.width, height: rect.height } };
        });
    }, []);

    const moveInterconnectionPort = useCallback((ownerId: string, portId: string, y: number, side?: PortSide) => {
        suppressInspectUntilRef.current = Date.now() + 250;
        markManualLayout();
        setLayoutEditVersion(version => version + 1);
        // A moved attachment point changes the connector contract. Any manual
        // bends on incident edges are no longer authoritative, so let the
        // shared orthogonal router calculate a fresh obstacle-safe route.
        const invalidatedEdges = edgesRef.current.map(edge => {
            const incident = edge.data?.sourcePortId === portId || edge.data?.targetPortId === portId;
            if (!incident) return edge;
            const { points: _points, manualRoute: _manualRoute, ...data } = edge.data ?? {};
            return { ...edge, data };
        });
        edgesRef.current = invalidatedEdges;
        // A declared port wall is a layout CONSTRAINT: writing it re-runs the
        // template layout (and re-fits the view). For the multi-wall drag that
        // would fire every frame — a jarring zoom and a snap-back to the
        // template's slot on release. There the port keeps the exact spot it was
        // dragged to (held on the node below) instead; only the base vertical
        // nudge records a wall change.
        if (side && selectedDiagramId && !activeRendererRef.current.multiWallPortDrag) {
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            mergeDiagramLayouts({ [selectedDiagramId]: {
                ...previous,
                canvas: { ...previous.canvas, autoLayout: false, portWalls: { ...previous.canvas?.portWalls, [portId]: side } },
            } });
        }
        const next = nodesRef.current.map(node => {
            if (node.id !== ownerId) return node;
            const nw = Number(node.width ?? (node.style as { width?: number })?.width ?? 100);
            const nh = Number(node.height ?? (node.style as { height?: number })?.height ?? 100);
            return {
                ...node,
                data: {
                    ...node.data,
                    ports: ((node.data as { ports?: PortInfo[] }).ports ?? [])
                        .map(port => {
                            if (port.id !== portId) return port;
                            // Recursive case: a nested pin travels along its PARENT
                            // PORT's edge, not the part's wall. `y` is the along
                            // coordinate in node space and `side` names the face —
                            // the parent's own side means the outer face.
                            if (port.nested && port.parentId) {
                                const parent = ((node.data as { ports?: PortInfo[] }).ports ?? [])
                                    .find(candidate => candidate.id === port.parentId);
                                if (!parent) return port;
                                const vertical = parent.side === 'left' || parent.side === 'right';
                                const parentAlong = vertical ? parent.y : parent.x;
                                return {
                                    ...port,
                                    alongOffset: Math.max(0, y - parentAlong),
                                    ...(side ? { faceOuter: side === parent.side } : {}),
                                };
                            }
                            // `y` carries the along-wall coordinate. With a wall
                            // change (`side`), snap the cross-wall coordinate to that
                            // wall so the port stays straddling its parent's edge.
                            if (!side) return { ...port, y };
                            const half = (port.size ?? INTERCONNECTION_PORT_SIZE) / 2;
                            if (side === 'top') return { ...port, x: y, y: -half, side };
                            if (side === 'bottom') return { ...port, x: y, y: nh - half, side };
                            if (side === 'right') return { ...port, y, x: nw - half, side };
                            return { ...port, y, x: -half, side };
                        }),
                },
            };
        });
        scheduleGeometryUpdate(next);
    }, [scheduleGeometryUpdate, markManualLayout, selectedDiagramId, mergeDiagramLayouts]);

    /**
     * Write a dragged port back to the diagram's layout companion. Dragging keeps
     * the canvas responsive by updating node data live; the position only becomes
     * part of the document here, once, on release — so a rebuild no longer throws
     * the drag away, and the websocket sees one update instead of one per frame.
     */
    const commitInterconnectionPort = useCallback((ownerId: string, portId: string) => {
        if (!selectedDiagramId) return;
        const owner = nodesRef.current.find(node => node.id === ownerId);
        const port = ((owner?.data as { ports?: PortInfo[] })?.ports ?? []).find(p => p.id === portId);
        if (!port) return;
        const patch = port.nested
            ? { alongOffset: port.alongOffset, faceOuter: port.faceOuter }
            : { x: port.x, y: port.y, side: port.side };
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const nodeLayout = (previous.nodes?.[ownerId] ?? {}) as { ports?: Record<string, unknown> };
        const layout = {
            ...previous,
            nodes: {
                ...previous.nodes,
                [ownerId]: {
                    ...nodeLayout,
                    ports: { ...nodeLayout.ports, [portId]: { ...(nodeLayout.ports?.[portId] as object ?? {}), ...patch } },
                },
            },
        } as typeof previous;
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
    }, [selectedDiagramId, mergeDiagramLayouts, sendDiagramLayoutUpdate]);

    const resizeInterconnectionPort = useCallback((ownerId: string, portId: string, size: number, axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => {
        suppressInspectUntilRef.current = Date.now() + 250;
        markManualLayout();
        setLayoutEditVersion(version => version + 1);
        const next = nodesRef.current.map(node => {
            if (node.id !== ownerId) return node;
            const ports = ((node.data as { ports?: Array<{ id: string; x: number; y: number; size?: number }> }).ports ?? []);
            const target = ports.find(port => port.id === portId);
            if (!target) return node;
            const oldSize = target.size ?? INTERCONNECTION_PORT_SIZE;
            const delta = size - oldSize;
            const proposed = {
                ...target,
                x: target.x + (axis.includes('w') ? -delta : axis.includes('e') ? 0 : -delta / 2),
                y: target.y + (axis.includes('n') ? -delta : axis.includes('s') ? 0 : -delta / 2),
                size,
            };
            const gap = 2;
            const overlaps = ports.some(other => {
                if (other.id === portId) return false;
                const otherSize = other.size ?? INTERCONNECTION_PORT_SIZE;
                return proposed.x < other.x + otherSize + gap
                    && proposed.x + size + gap > other.x
                    && proposed.y < other.y + otherSize + gap
                    && proposed.y + size + gap > other.y;
            });
            if (overlaps) return node;
            return {
                ...node,
                data: { ...node.data, ports: ports.map(port => port.id === portId ? proposed : port) },
            };
        });
        scheduleGeometryUpdate(next);
    }, [scheduleGeometryUpdate, markManualLayout]);

    const moveEdgeRoute = useCallback((edgeId: string, points: Array<{ x: number; y: number }>) => {
        suppressInspectUntilRef.current = Date.now() + 250;
        markManualLayout();
        setLayoutEditVersion(version => version + 1);
        setEdges(previous => {
            const next = previous.map(edge => edge.id === edgeId
                ? { ...edge, data: { ...edge.data, points, manualRoute: true } }
                : edge);
            edgesRef.current = next;
            return next;
        });
    }, [markManualLayout, setEdges]);

    const commitEdgeRouteMove = useCallback((
        edgeId: string,
        before: Array<{ x: number; y: number }>,
        after: Array<{ x: number; y: number }>,
        wasManual: boolean,
    ) => {
        if (JSON.stringify(before) === JSON.stringify(after)) return;
        const restore = (points: Array<{ x: number; y: number }>, manual: boolean) => {
            markManualLayout();
            setLayoutEditVersion(version => version + 1);
            setEdges(previous => {
                const next = previous.map(edge => {
                    if (edge.id !== edgeId) return edge;
                    if (manual) return { ...edge, data: { ...edge.data, points, manualRoute: true } };
                    const { points: _points, manualRoute: _manualRoute, ...data } = edge.data ?? {};
                    return { ...edge, data };
                });
                edgesRef.current = next;
                return next;
            });
            scheduleGeometryUpdate(nodesRef.current);
        };
        pushUndo({
            do: () => restore(after, true),
            undo: () => restore(before, wasManual),
        });
    }, [markManualLayout, pushUndo, scheduleGeometryUpdate, setEdges]);

    /**
     * Replan every connector with the obstacle-avoiding planner. Live edits use
     * the cheap direct router, which keeps connectors attached and orthogonal
     * but lets them cross each other and run over blocks; this is the explicit
     * "make it read well" pass. It discards hand-drawn bends, which is the
     * point of asking for a tidy.
     */
    /**
     * Download the diagram as an image. Failures surface on the button rather
     * than silently doing nothing — an export that produces no file and no
     * message reads as a broken control.
     */
    const downloadDiagram = useCallback(async (format: DiagramExportFormat) => {
        const container = canvasRef.current;
        if (!container) return;
        setExportMenuOpen(false);
        setExportError(null);
        setExportBusy(format);
        try {
            await exportDiagram(container, format, selectedDiagram?.name);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : String(error));
        } finally {
            setExportBusy(null);
        }
    }, [selectedDiagram?.name]);

    const tidyConnectors = useCallback(() => {
        if (edgesRef.current.some(edge => edge.data?.manualRoute) && !window.confirm(
            'Re-route connectors? This replaces the hand-drawn bends on this diagram. Node positions will be kept.',
        )) return;
        markManualLayout();
        setLayoutEditVersion(version => version + 1);
        const cleared = edgesRef.current.map(edge => {
            if (!edge.data?.manualRoute) return edge;
            const { points: _points, manualRoute: _manualRoute, ...data } = edge.data;
            return { ...edge, data };
        });
        const tidied = reroutePositionedEdges(nodesRef.current, cleared, 'tidy', activeRendererRef.current.forcedPortSize);
        edgesRef.current = tidied;
        setEdges(tidied);
    }, [markManualLayout, setEdges]);

    // ─── Layout computation ────────────────────────────────────────────────────

    useEffect(() => {
        if (!model) return;
        const modelRefresh = previousLayoutModelRef.current !== model
            && previousLayoutDiagramRef.current === selectedDiagramId;
        preservedViewportRef.current = modelRefresh ? getViewport() : null;
        previousLayoutModelRef.current = model;
        previousLayoutDiagramRef.current = selectedDiagramId;
        // Grid, Browser, and Geometry render their own non-canvas surfaces.
        if (viewKind === 'grid' || viewKind === 'browser' || viewKind === 'geometry') return;

        // Guard against stale async completions: a slower earlier layout must
        // not overwrite the result of the branch this effect run selected
        // (e.g. graph ELK resolving after a sync containment layout)
        let cancelled = false;
        const apply = (
            { nodes: n, edges: e }: { nodes: NotationLayoutNode[]; edges: NotationLayoutEdge[] },
            interactive = true,
        ) => {
            if (cancelled) return;
            // Templates supply semantic projection and layout supplies geometry;
            // the renderer consumes their renderer-neutral NotationScene. Keep
            // existing ReactFlow interaction payloads only as event wiring.
            const notation = projectLayoutToNotationScene(n as any[], e as any[]);
            const notationNode = new Map(notation.nodes.map(node => [node.id, node]));
            const notationEdge = new Map(notation.edges.map(edge => [edge.id, edge]));
            const sceneNodes = n.map(node => {
                const sceneNode = notationNode.get(node.id);
                return sceneNode ? {
                    ...node,
                    position: { x: sceneNode.x, y: sceneNode.y },
                    style: { ...node.style, width: sceneNode.width, height: sceneNode.height },
                    parentId: sceneNode.parentId,
                    // A block drawn inside another block cannot be dragged out
                    // of it: the nesting *is* the containment statement, so
                    // letting a child wander outside would draw something the
                    // model does not say. Applied here rather than per template
                    // so it holds wherever nesting appears — interconnection
                    // parts, a contained-mode decomposition, a context boundary.
                    // Tree-mode layouts nest nothing and are untouched.
                    ...(sceneNode.parentId ? { extent: 'parent' as const } : {}),
                } : node;
            });
            const sceneEdges = e.filter(edge => notationEdge.has(edge.id)).map(edge => {
                const sceneEdge = notationEdge.get(edge.id)!;
                return { ...edge, source: sceneEdge.sourceId, target: sceneEdge.targetId, label: sceneEdge.label ?? edge.label };
            });
            const rendererNodes = sceneNodes as unknown as FlowNode[];
            const rendererEdges = sceneEdges as unknown as FlowEdge[];
            const savedLayout = selectedDiagramId
                ? useModelStore.getState().diagramLayouts[selectedDiagramId]
                : undefined;
            const positionedModel = savedLayout && Object.keys(savedLayout.nodes).length > 0
                ? buildNodesFromSidecar(rendererNodes, savedLayout)
                : rendererNodes;
            // Ports: snap to the wall → resolve collisions along it → straighten the
            // pairs that can be straightened → derive each connector's nested pins.
            const forcedSize = activeRendererRef.current.forcedPortSize;
            // Collision + growth first (they only move ports ALONG a wall and may
            // resize the part), then snap across the wall against the FINAL size.
            const placed = resolveWallPortOverlaps(
                [...positionedModel, ...annotationNodes(savedLayout)], forcedSize);
            const preparedEdges = rendererEdges.map(edge => {
                const savedEdge = savedLayout?.edges?.[edge.id];
                const semanticRelationship = model.relationships.find(relationship => relationship.id === edge.id);
                const attachmentMatches = !savedEdge?.source || (
                    savedEdge.source === edge.source
                    && savedEdge.target === edge.target
                    && savedEdge.sourcePortId === edge.data?.sourcePortId
                    && savedEdge.targetPortId === edge.data?.targetPortId
                );
                const savedPoints = attachmentMatches ? savedEdge?.points : undefined;
                return {
                    ...edge,
                    // React Flow's endpoint handles are safe only for one exact
                    // source declaration. Bundles have no single source range;
                    // named and anonymous relationships compiled with a range
                    // can both be updated atomically.
                    reconnectable: Boolean(semanticRelationship?.sourceRange),
                    data: {
                        ...edge.data,
                        ...(savedPoints?.length ? { points: savedPoints, manualRoute: true } : {}),
                        flowAnimation: flowAnimationEnabled,
                        onRouteChange: (points: Array<{ x: number; y: number }>) => moveEdgeRoute(edge.id, points),
                        onRouteChangeComplete: (before: Array<{ x: number; y: number }>, after: Array<{ x: number; y: number }>) =>
                            commitEdgeRouteMove(edge.id, before, after, Boolean(edge.data?.manualRoute)),
                        onSelect: (event: React.MouseEvent<SVGPathElement>) => {
                            event.stopPropagation();
                            if (Date.now() < suppressInspectUntilRef.current) return;
                            setEdges(previous => previous.map(candidate => ({
                                ...candidate,
                                selected: candidate.id === edge.id,
                            })));
                            if (model.relationships.some(relationship => relationship.id === edge.id)) {
                                inspectRelationship(edge.id);
                            }
                        },
                    },
                };
            });
            const positioned = repositionNestedPins(
                snapPortsToWall(alignFacingPorts(placed, preparedEdges as FlowEdge[], forcedSize), forcedSize));
            setNodes(interactive ? applyInteractiveData(positioned) : positioned);
            setEdges(reroutePositionedEdges(positioned, preparedEdges, activeRendererRef.current.routeQuality, activeRendererRef.current.forcedPortSize));
            setIsLayouting(false);
            setLayoutVersion(v => v + 1);
        };
        const fail = (label: string) => (err: unknown) => {
            if (cancelled) return;
            console.error(`${label} layout error:`, err);
            setIsLayouting(false);
            setLayoutError(`${label} layout could not be completed. Try resetting the layout or reducing the visible hierarchy.`);
        };
        const run = (
            label: string,
            promise: Promise<{ nodes: NotationLayoutNode[]; edges: NotationLayoutEdge[] }>,
            interactive = true,
        ) => {
            setIsLayouting(true);
            setLayoutError(null);
            boundedLayout(promise, label).then(r => apply(r, interactive)).catch(fail(label));
        };

        // Debounce so skimming through diagrams doesn't queue an ELK job per
        // one skipped past — only the diagram you settle on gets laid out.
        // Template selection and computation go through the template registry
        // (diagram/templates.ts) — registration order is precedence, and the
        // canvas only assembles the option slices.
        const dispatch = () => {
            const provider = templateRegistry.select({
                viewKind,
                diagramType: selectedDiagram?.diagramType,
                isFBSDiagram, isDecompDiagram, isGeneralTemplate, generalMode, layoutStyle,
            });
            const treeCallbacks = { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection };
            const options: TemplateOptionSlices = {
                fbs: { expandedNodes, nodeDirections, callbacks: treeCallbacks, layoutProviderId },
                decomposition: {
                    expandedNodes, nodeDirections, callbacks: treeCallbacks,
                    positionCache: positionCacheRef.current,
                },
                containment: { expandedNodes, callbacks: { onToggleExpand: toggleExpand } },
                useCase: {
                    // A UCD selection can be derived before relationship endpoints
                    // are resolved. The template itself selects only actors linked
                    // to its visible use cases, so do not drop actors here.
                    viewpointFilter: undefined,
                    systemName: selectedDiagram?.name,
                    ...(selectedDiagram ? useCaseViewOptions(selectedDiagram.properties) : {}),
                    level: useCaseDisplayLevel, edgeStyle: useCaseEdgeStyle, hiddenActorIds: hiddenUseCaseActorIds,
                },
                context: {
                    systemName: selectedDiagram?.name,
                    viewpointFilter,
                    relationshipTypes: selectedDiagram?.relationshipTypes,
                },
                interconnection: {
                    viewpointFilter,
                    relationshipTypes: selectedDiagram?.relationshipTypes,
                    collapsedNodes: collapsedInterconnectionNodes,
                    onDrillIn: drillIntoInterconnection,
                    onToggleCollapse: toggleInterconnectionCollapse,
                    focusId: focusedInterconnectionId ?? undefined,
                    portDisplay: interconnectionPortDisplay,
                    connectionDisplay: interconnectionConnectionDisplay,
                    showPortText: showIbdPortText,
                    showConnectionText: showIbdConnectionText,
                    labelVisibility: edgeLabelVisibility,
                    forcedPortSize: activeRenderer.forcedPortSize,
                    portWalls,
                    legend: ibdLegend,
                    onPortMove: moveInterconnectionPort,
                    onPortCommit: commitInterconnectionPort,
                    onPortResize: resizeInterconnectionPort,
                    onPortSelect: portId => {
                        inspectRelationship(null);
                        inspectElement(portId);
                    },
                    layoutProviderId,
                },
                actionflow: {
                    viewpointFilter,
                    swimlanes: swimlanesOn,
                    laneGrouping: actionFlowLaneGrouping,
                    displayLevel: actionFlowDisplayLevel,
                    expandedActionIds: expandedActionNodes,
                    onToggleAction: toggleActionExpand,
                    onDrillInAction: drillIntoAction,
                    focusActionId: focusedActionId ?? undefined,
                    visibleFlowKinds: visibleActionFlowKinds,
                    direction: actionFlowDirection,
                    nesting: actionFlowNesting,
                    layoutProviderId,
                },
                statetransition: {
                    viewpointFilter,
                    collapsedStateIds: collapsedStateNodes,
                    onToggleCollapse: toggleStateCollapse,
                    onDrillIn: drillIntoState,
                    focusStateId: focusedStateId ?? undefined,
                    layoutProviderId,
                },
                sequence: { viewpointFilter },
                general: {
                    mode: generalMode, viewpointFilter, expandedNodes, nodeDirections,
                    viewElement: viewElementOf(model, selectedDiagram),
                    callbacks: treeCallbacks,
                    positionCache: positionCacheRef.current,
                    hierarchyRelationshipTypes: selectedDiagram?.relationshipTypes,
                    layoutProviderId,
                },
                standard: {
                    viewpointFilter,
                    relationshipTypes: selectedDiagram?.relationshipTypes,
                    compartments: isGeneralTemplate,
                    layoutProviderId,
                },
            };
            const result = provider.compute(model, options);
            // Sync templates apply immediately (no spinner flash); async ones
            // run bounded with the progress surface.
            if (result instanceof Promise) run(provider.descriptor.label, result, provider.descriptor.interactive);
            else apply(result, provider.descriptor.interactive);
        };

        const timer = window.setTimeout(dispatch, LAYOUT_SWITCH_DEBOUNCE_MS);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [model, viewpointFilter, isDecompDiagram, isFBSDiagram, layoutStyle,
        viewKind, isGeneralTemplate, generalMode, swimlanesOn, relayoutNonce,
        selectedDiagram?.relationshipTypes, selectedDiagram?.diagramType, selectedDiagram?.name, useCaseDisplayLevel, useCaseEdgeStyle, hiddenUseCaseActorIds,
        layoutProviderId,
        expandedNodes, collapsedInterconnectionNodes, focusedInterconnectionId, interconnectionPortDisplay, interconnectionConnectionDisplay, showIbdPortText, showIbdConnectionText, edgeLabelVisibility, activeRenderer, portWalls, ibdLegend, expandedActionNodes, focusedActionId, visibleActionFlowKinds, actionFlowDirection, actionFlowLaneGrouping, actionFlowDisplayLevel, actionFlowNesting, nodeDirections,
        collapsedStateNodes, focusedStateId, toggleStateCollapse, drillIntoState, drillIntoAction,
        toggleExpand, toggleInterconnectionCollapse, toggleActionExpand, toggleDirection, selectedDiagramId,
        drillIntoInterconnection,
        buildNodesFromSidecar, applyInteractiveData, annotationNodes, moveInterconnectionPort, commitInterconnectionPort, resizeInterconnectionPort, moveEdgeRoute, commitEdgeRouteMove, inspectElement, inspectRelationship, getViewport]);

    // Frame a diagram when it opens — once, the way the reference does with
    // React Flow's `fitView` prop.
    //
    // This used to run on every layout pass, and a layout pass happens each
    // time a node is expanded or collapsed or its direction flips. So the
    // camera moved under the user on every click: the node they had just
    // opened slid away and the whole diagram rescaled around it. Expanding
    // never needs a new camera — the position cache leaves already-placed
    // nodes exactly where they were, and the new children appear beside them.
    const framedDiagramRef = useRef<string | null>(null);
    useEffect(() => {
        if (layoutVersion === 0) return;
        const timer = setTimeout(() => {
            const preserved = preservedViewportRef.current;
            preservedViewportRef.current = null;
            if (preserved) {
                setViewport(preserved);
                return;
            }
            // Already framed: this pass is an expand, a collapse or a direction
            // change, and the camera is the user's now.
            if (framedDiagramRef.current === (selectedDiagramId ?? null)) return;
            // A layout pass can land before the nodes do. Framing an empty
            // canvas would count as the one framing this diagram gets and
            // leave the real content wherever it happened to appear.
            if (nodesRef.current.filter(node => !node.hidden).length === 0) return;
            framedDiagramRef.current = selectedDiagramId ?? null;
            const layout = selectedDiagramId
                ? useModelStore.getState().diagramLayouts[selectedDiagramId]
                : undefined;
            const saved = layout?.canvas;
            // A camera is only worth restoring when the geometry it framed is
            // still there. Node positions the user placed by hand are; a
            // derived layout is not — a BDD's tree is recomputed from the
            // model every time, so a pan/zoom saved against an older shape
            // frames empty canvas. The CIU decomposition still carried
            // `zoom: 1, pan: 141,30` from when it was a different diagram, and
            // restoring it left the tree small in a corner.
            //
            // So: hand-placed geometry keeps its camera, derived geometry gets
            // a camera derived the same way.
            const handPlaced = Object.keys(layout?.nodes ?? {}).length > 0;
            // An action flow deliberately opens at its reading origin (left or
            // top). Restoring a generic saved camera after its layout completed
            // shifted the first visible step far to the right.
            if (viewKind !== 'actionflow' && handPlaced && saved?.zoom !== undefined && saved.pan) {
                setViewport({ x: saved.pan.x, y: saved.pan.y, zoom: saved.zoom }, { duration: 300 });
            } else {
                fitDiagramFrame(500);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [layoutVersion, selectedDiagramId, fitDiagramFrame, setViewport, viewKind]);

    // Moving the legend into or out of its reserved strip changes the usable
    // React Flow area. Reframe on the next paint so the lanes keep their
    // intended left/top origin instead of retaining the old viewport height.
    useEffect(() => {
        if (viewKind !== 'actionflow' || layoutVersion === 0) return;
        const frame = requestAnimationFrame(() => fitDiagramFrame(180));
        return () => cancelAnimationFrame(frame);
    }, [actionFlowLegendOpen, actionFlowLegendPlacement, actionFlowToolbarPlacement, fitDiagramFrame, isCanvasFullscreen, layoutVersion, toolbarCollapsed, viewKind]);

    // Highlight selected element
    useEffect(() => {
        setNodes(prev => prev.map(n => {
            const laneTarget = n.type === 'actionFlowLane'
                ? (n.data as { inspectElementId?: string }).inspectElementId
                : undefined;
            const selected = Boolean(selectedElementId) && (n.id === selectedElementId || laneTarget === selectedElementId);
            return {
                ...n,
                selected,
                style: {
                    ...n.style,
                    boxShadow: selected
                    ? '0 0 0 2px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.3)'
                    : undefined,
                    opacity: selectedElementId ? (selected ? 1 : 0.5) : 1,
                },
            };
        }));
    }, [selectedElementId, setNodes]);

    // Focus Mode (#22): filter graph to N-hop neighbors using computeImpact
    useEffect(() => {
        if (!focusNodeId || !model) return;
        const impact = computeImpact(model, focusNodeId, 'both', focusDepth);
        const visibleIds = new Set(impact.nodes.map(n => n.elementId));
        visibleIds.add(focusNodeId);
        setNodes(prev => prev.map(n => ({
            ...n,
            style: {
                ...n.style,
                opacity: visibleIds.has(n.id) ? 1 : 0.08,
                pointerEvents: visibleIds.has(n.id) ? 'all' : ('none' as any),
            },
        })));
        setEdges(prev => prev.map(e => ({
            ...e,
            style: {
                ...e.style,
                opacity: visibleIds.has(e.source) && visibleIds.has(e.target) ? 1 : 0.05,
            },
        })));
    }, [focusNodeId, focusDepth, model, setNodes, setEdges]);

    // Source file toast auto-dismiss (#38)
    useEffect(() => {
        if (!sourceToast) return;
        const t = setTimeout(() => setSourceToast(null), 2500);
        return () => clearTimeout(t);
    }, [sourceToast]);

    // ─── Keyboard shortcuts ────────────────────────────────────────────────────

    const dismissSelectionTools = useCallback(() => {
        selectElement(null);
        inspectRelationship(null);
        setNodeCtx(null);
        setEdgeCtx(null);
        setNodes(prev => prev.map(node => ({
            ...node,
            selected: false,
            style: { ...node.style, opacity: 1, boxShadow: undefined },
        })));
        setEdges(prev => prev.map(edge => ({ ...edge, selected: false })));
    }, [selectElement, inspectRelationship, setNodes, setEdges]);

    const undoLastDiagramEdit = useCallback(() => {
        const cmd = undoStack.current.pop();
        if (cmd) { cmd.undo(); redoStack.current.push(cmd); }
    }, []);

    const redoLastDiagramEdit = useCallback(() => {
        const cmd = redoStack.current.pop();
        if (cmd) { cmd.do(); undoStack.current.push(cmd); }
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoLastDiagramEdit();
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redoLastDiagramEdit();
            }
            if (e.key === 'Escape') {
                dismissSelectionTools();
            }
            if (e.key === 'g' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                e.preventDefault();
                setSnapEnabled(s => !s);
            }
            if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                fitDiagramFrame(400);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fitDiagramFrame, dismissSelectionTools, undoLastDiagramEdit, redoLastDiagramEdit]);

    // ─── Drag/drop from palette ───────────────────────────────────────────────

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData(MEMO_KIND_MIME);
        if (!data) return;

        try {
            const item = JSON.parse(data) as { kind: string; layer: string; construct: string };
            const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setQuickCreate({
                x: e.clientX,
                y: e.clientY,
                flowX: flowPos.x,
                flowY: flowPos.y,
                kind: item.kind,
                layer: item.layer,
                construct: item.construct,
            });
        } catch { /* ignore */ }
    }, [screenToFlowPosition]);

    // Double-click canvas → quick create
    const onPaneDoubleClick = useCallback((e: React.MouseEvent) => {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setQuickCreate({
            x: e.clientX, y: e.clientY,
            flowX: flowPos.x, flowY: flowPos.y,
        });
    }, [screenToFlowPosition]);

    // Confirm element creation
    const confirmCreate = useCallback((name: string) => {
        if (!quickCreate || !selectedDiagramId) { setQuickCreate(null); return; }

        const kind = quickCreate.kind ?? 'Part';
        const layer = quickCreate.layer ?? 'logical';
        const construct = quickCreate.construct ?? 'part';
        const layerColor = LAYER_COLORS[layer] ?? '#6B7280';

        // The id is the SysML usage name the element is written under, so it has
        // to be a legal identifier and must not collide with one already in the
        // model. It also has to be decided here rather than server-side: the
        // optimistic node, the diagram's element list and the layout companion
        // all key on it, and a server-assigned id would leave those three
        // pointing at a node the rebuild then replaces.
        const tempId = sysmlIdentifier(name, Object.keys(model?.elements ?? {}));
        const newNode: FlowNode = {
            id: tempId,
            type: 'diagramNode',
            position: { x: quickCreate.flowX, y: quickCreate.flowY },
            data: {
                label: name, kind, layer, construct,
                color: layerColor, isNew: true,
                onContextMenu: (e: React.MouseEvent, nodeId: string) => {
                    setNodeCtx({ x: e.clientX, y: e.clientY, nodeId, nodeKind: kind });
                },
                onInlineEdit: (_nodeId: string, newName: string) => {
                    sendElementUpdate({ id: tempId, name: newName, kind, construct, layer });
                },
            },
        };
        setNodes(prev => [...prev, newNode]);

        // Save to model via WebSocket. The id is required: the persistor keys its
        // find-or-append on it and throws without one, which is why a dropped
        // shape used to vanish on the next rebuild.
        sendElementCreate({ id: tempId, name, kind, construct, layer, attributes: { _layer: layer } });

        // Add to diagram's element list
        const currentIds = selectedDiagram?.elementIds ?? [];
        updateDiagramElementIds(selectedDiagramId, [...currentIds, tempId]);

        // Save position to sidecar immediately
        const diagramId = selectedDiagramId;
        const layout: DiagramLayout = {
            nodes: {
                ...((diagramLayouts[diagramId] ?? {}).nodes ?? {}),
                [tempId]: { x: quickCreate.flowX, y: quickCreate.flowY },
            },
            edges: (diagramLayouts[diagramId] ?? {}).edges ?? {},
        };
        mergeDiagramLayouts({ [diagramId]: layout });
        sendDiagramLayoutUpdate(diagramId, layout);

        setQuickCreate(null);
    }, [quickCreate, selectedDiagramId, selectedDiagram, diagramLayouts, mergeDiagramLayouts, updateDiagramElementIds, setNodes]);

    // ─── Edge drawing ─────────────────────────────────────────────────────────

    const onConnectStart = useCallback(() => {
        // Clear any open menus
        setNodeCtx(null);
        setEdgeCtx(null);
    }, []);

    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
        // If the connection didn't land on a valid target, ignore
        if (!connectionState?.isValid) return;
    }, []);

    /**
     * The model element an endpoint of a drawn edge denotes.
     *
     * On an IBD a port is a handle on its owner's box, not a node of its own, so
     * the node id alone would turn every port-to-port connector the user draws
     * into a part-to-part one — the drawing would say something the model does
     * not. The handle id *is* the port's element id (suffixed for the inner
     * face), so it is preferred whenever it resolves to a real element; the node
     * id remains the fallback for the plain part-to-part case and for the
     * generic top/bottom/left/right handles, which are not elements.
     */
    const connectionEndpoint = useCallback((nodeId: string, handleId?: string | null) => {
        const portId = portIdFromHandle(handleId);
        const portEl = portId ? model?.elements[portId] : undefined;
        return portEl ?? model?.elements[nodeId];
    }, [model]);

    const onConnect = useCallback((connection: Connection) => {
        const { source, target, sourceHandle, targetHandle } = connection;
        if (!source || !target) return;

        const sourceEl = connectionEndpoint(source, sourceHandle);
        const targetEl = connectionEndpoint(target, targetHandle);
        // Both endpoints must be model elements — legality is resolved from
        // their kinds, so an edge to something unknown offers no types.
        if (!sourceEl || !targetEl) return;
        // A port drawn back onto its own owner (or onto itself) is not a
        // relationship; the writer would reject it and the picker would offer
        // types for a link that cannot exist.
        if (sourceEl.id === targetEl.id) return;

        // Show relationship picker at approximate mouse position
        setRelPicker({
            x: window.innerWidth / 2 - 130,
            y: window.innerHeight / 2 - 160,
            sourceElement: sourceEl,
            targetElement: targetEl,
        });
    }, [connectionEndpoint]);

    /**
     * Reconnect one end of an existing SysML relationship.
     *
     * React Flow owns the endpoint gesture and hit testing. Persistence remains
     * model-first through one atomic source edit. The compiled declaration
     * range lets the server address anonymous SysML flows without inventing a
     * name or passing through a transient delete/create state.
     */
    const onReconnect = useCallback(async (oldEdge: FlowEdge, connection: Connection) => {
        suppressInspectUntilRef.current = Date.now() + 500;
        const relationship = model?.relationships.find(candidate => candidate.id === oldEdge.id);
        if (!relationship?.sourceRange || !connection.source || !connection.target) return;

        const sourceEl = connectionEndpoint(connection.source, connection.sourceHandle);
        const targetEl = connectionEndpoint(connection.target, connection.targetHandle);
        if (!sourceEl || !targetEl || sourceEl.id === targetEl.id) return;
        if (sourceEl.id === relationship.sourceId && targetEl.id === relationship.targetId) return;

        const replacement = await requestRelationshipUpdate({
            relationshipId: relationship.id,
            sourceId: sourceEl.id,
            targetId: targetEl.id,
            diagramId: selectedDiagramId ?? undefined,
        });
        if (replacement.success) return;
        console.warn(`[MEMO] Connector endpoint update rejected: ${replacement.error}`);
    }, [model, connectionEndpoint, selectedDiagramId]);

    const onReconnectStart = useCallback(() => {
        suppressInspectUntilRef.current = Date.now() + 500;
        setNodeCtx(null);
        setEdgeCtx(null);
    }, []);

    const onReconnectEnd = useCallback(() => {
        suppressInspectUntilRef.current = Date.now() + 250;
    }, []);

    /**
     * Persist the chosen relationship, then draw it.
     *
     * The edge is only added after the server confirms the write — an optimistic
     * edge would show a relationship that may never have reached the model.
     */
    const confirmRelationship = useCallback(async (choice: RelationshipChoice) => {
        if (!relPicker || !selectedDiagramId) { setRelPicker(null); return; }

        const drawnFromId = relPicker.sourceElement.id;
        setRelPicker(null);

        const outcome = await createRelationship({
            type: choice.type,
            sourceId: choice.sourceId,
            targetId: choice.targetId,
            direction: choice.direction,
            flowItem: choice.flowItem,
            selectedElementId: drawnFromId,
            diagramId: selectedDiagramId,
        });

        if (!outcome.success) {
            // Nothing was drawn, so nothing needs undoing — the canvas is
            // already in its prior state.
            console.warn(`[MEMO] Relationship rejected: ${outcome.error}`);
            return;
        }

        // A port endpoint is a handle on its owner's box, not a node, so an edge
        // keyed on it would reference a node that does not exist. Those views
        // wait for the rebuild, which re-derives the connector against the
        // owning boxes and the correct port handles.
        const endpointsAreNodes = nodesRef.current.some(n => n.id === choice.sourceId)
            && nodesRef.current.some(n => n.id === choice.targetId);
        if (!endpointsAreNodes) return;

        const color = REL_COLORS[choice.type] ?? '#6B7280';
        const newEdge: FlowEdge = {
            id: outcome.relationshipId ?? `e_${choice.sourceId}_${choice.targetId}_${choice.type}`,
            source: choice.sourceId,
            target: choice.targetId,
            label: choice.type,
            type: 'default',
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fontSize: '10px', fill: '#374151' },
            labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
            markerEnd: { type: 'arrowclosed' as any, color },
        };
        setEdges(prev => addEdge(newEdge, prev));
    }, [relPicker, selectedDiagramId, setEdges, createRelationship]);

    // ─── Node drag stop → stage a per-diagram override ───────────────────────

    const onNodeDragStart = useCallback((_: RFAny, node: FlowNode) => {
        nodeDragStartRef.current = { id: node.id, x: node.position.x, y: node.position.y };
    }, []);

    const onNodeDragStop = useCallback((_: RFAny, node: FlowNode) => {
        const start = nodeDragStartRef.current;
        nodeDragStartRef.current = null;
        // A press that did not move the node is a click for the inspector, not
        // a placement: it must not take the diagram off automatic layout or
        // leave a companion file behind.
        const moved = start?.id === node.id
            && Math.hypot(node.position.x - start.x, node.position.y - start.y) > 2;
        if (!moved) return;
        // React Flow emits click after pointer-up. Keep a real drag from
        // opening the inspector as though it were a click.
        suppressInspectUntilRef.current = Date.now() + 250;
        setLayoutEditVersion(version => version + 1);
        if (!selectedDiagramId) return;
        const { x, y } = node.position;

        if (node.type === 'annotationNode') return;

        // A part may not be dropped overlapping a sibling — only a parent may
        // contain a child. An overlapping drop reverts to where the drag began.
        if (activeRendererRef.current.preventPartOverlap && start) {
            const sizeOf = (n: FlowNode) => ({
                w: Number(n.width ?? n.measured?.width ?? (n.style as { width?: number })?.width ?? 0),
                h: Number(n.height ?? n.measured?.height ?? (n.style as { height?: number })?.height ?? 0),
            });
            const self = sizeOf(node);
            const gap = 4;
            const overlaps = nodesRef.current.some(other => {
                if (other.id === node.id || other.parentId !== node.parentId || other.hidden || other.type === 'annotationNode') return false;
                const os = sizeOf(other);
                if (self.w <= 0 || self.h <= 0 || os.w <= 0 || os.h <= 0) return false;
                return x < other.position.x + os.w + gap && x + self.w + gap > other.position.x
                    && y < other.position.y + os.h + gap && y + self.h + gap > other.position.y;
            });
            if (overlaps) {
                const reverted = { x: start.x, y: start.y };
                nodesRef.current = nodesRef.current.map(n => n.id === node.id ? { ...n, position: reverted } : n);
                setNodes(prev => prev.map(n => n.id === node.id ? { ...n, position: reverted } : n));
                scheduleGeometryUpdate(nodesRef.current);
                return;
            }
        }
        markManualLayout();

        // Hand-drawn bends describe a route between two places. Once the block
        // at either end has moved, they no longer describe anything, so the
        // connector goes back to finding its own shortest path. Bends the user
        // dragged on connectors that did *not* move are left untouched.
        const moveInvalidated = edgesRef.current.map(edge => {
            if (!edge.data?.manualRoute) return edge;
            if (edge.source !== node.id && edge.target !== node.id) return edge;
            const { points: _points, manualRoute: _manualRoute, ...data } = edge.data;
            return { ...edge, data };
        });
        edgesRef.current = moveInvalidated;
        scheduleGeometryUpdate(nodesRef.current);

        const prevPos = positionCacheRef.current.get(node.id);
        positionCacheRef.current.set(node.id, { x, y });
        setNodeLayout(selectedDiagramId, node.id, { x, y });

        // Push to undo stack
        if (prevPos) {
            const nodeId = node.id;
            const diagramId = selectedDiagramId;
            pushUndo({
                do: () => setNodeLayout(diagramId, nodeId, { x, y }),
                undo: () => {
                    setNodeLayout(diagramId, nodeId, prevPos);
                    setNodes(prev => prev.map(n => n.id === nodeId
                        ? { ...n, position: prevPos } : n));
                },
            });
        }
    }, [selectedDiagramId, setNodeLayout, pushUndo, setNodes, markManualLayout, scheduleGeometryUpdate]);

    // ─── Node resize + live orthogonal re-routing ─────────────────────────────

    const onNodesChangeWithResize = useCallback((changes: NodeChange<FlowNode>[]) => {
        // Dimension and position notifications are both emitted while nodes
        // mount and settle, and must not turn a freshly opened diagram into a
        // manual, dirty document. Only a change the user is actively dragging
        // counts as taking the diagram off automatic layout.
        const isAnnotationChange = (change: NodeChange<FlowNode>) =>
            'id' in change && nodesRef.current.find(node => node.id === change.id)?.type === 'annotationNode';
        if (changes.some(change => change.type === 'position' && change.dragging && !isAnnotationChange(change))) markManualLayout();
        const resizing = changes.some(change => change.type === 'dimensions' && change.resizing);
        const resizeCommitted = changes.some(change => change.type === 'dimensions' && change.setAttributes);
        if (resizing || resizeCommitted) {
            // A resize handle releases over its node. Do not reinterpret that
            // release as a click that opens the Properties inspector.
            suppressInspectUntilRef.current = Date.now() + 250;
        }
        if (resizing) {
            if (changes.some(change => change.type === 'dimensions' && change.resizing && !isAnnotationChange(change))) {
                markManualLayout();
            }
        }
        if (resizeCommitted) setLayoutEditVersion(version => version + 1);
        // React Flow emits dimensions continuously while a resize handle moves,
        // but marks only the last one `setAttributes`. `applyNodeChanges` quite
        // correctly ignores the interim values; our controlled-node frame then
        // wrote those old dimensions straight back and cancelled the resize.
        // Apply every live dimension here, mirroring it to `style` because the
        // custom nodes size themselves from style. The final committed value is
        // therefore both visible during the drag and available to persist.
        const resized = new Map(changes.flatMap(change =>
            change.type === 'dimensions' && change.dimensions
                ? [[change.id, change.dimensions] as const]
                : []));
        const applied = applyNodeChanges(changes, nodesRef.current).map(node => {
            const size = resized.get(node.id);
            if (!size) return node;
            const oldWidth = Number(node.width ?? node.style?.width ?? size.width);
            const oldHeight = Number(node.height ?? node.style?.height ?? size.height);
            const ports = (node.data as { ports?: Array<{ x: number; y: number; side?: string }> }).ports;
            // A port is attached to a side, not to an old absolute coordinate.
            // Carry it with the side as the owner grows: right/bottom ports move
            // by the size delta while left/top ports stay anchored. This keeps
            // both the glyph and its connector endpoint on the resized block.
            const movedPorts = ports?.map(port => ({
                ...port,
                ...(port.side === 'right' ? { x: port.x + size.width - oldWidth } : {}),
                ...(port.side === 'bottom' ? { y: port.y + size.height - oldHeight } : {}),
            }));
            return {
                ...node,
                style: { ...node.style, width: size.width, height: size.height },
                ...(movedPorts ? { data: { ...node.data, ports: movedPorts } } : {}),
            };
        });
        // Rerouting a non-trivial IBD on every pointer move is what made a
        // resize stutter. The node resizes at display rate; edges replan once
        // the pointer releases and the dimensions are committed.
        scheduleGeometryUpdate(applied, !resizing || resizeCommitted);
    }, [scheduleGeometryUpdate, markManualLayout]);

    // ─── Context menu handlers ─────────────────────────────────────────────────

    const handleNodeContextMenu = useCallback(
        (_: React.MouseEvent, _node: FlowNode) => {
            // ReactFlow fires this — we use our own via DiagramInteractiveNode
        }, []
    );

    const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edge: FlowEdge) => {
        e.preventDefault();
        setEdgeCtx({
            x: e.clientX, y: e.clientY,
            edgeId: edge.id,
            relType: String(edge.label ?? 'edge'),
        });
    }, []);

    const onNodeClick = useCallback((event: RFAny, node: FlowNode) => {
        if (Date.now() < suppressInspectUntilRef.current) return;
        // React Flow owns additive selection. Updating the single inspector
        // selection on a modified click would immediately collapse the canvas
        // selection back to one node in the highlight-sync effect.
        const additive = event?.shiftKey || event?.metaKey || event?.ctrlKey
            || event?.nativeEvent?.shiftKey || event?.nativeEvent?.metaKey || event?.nativeEvent?.ctrlKey
            || event?.getModifierState?.('Shift') || event?.getModifierState?.('Meta') || event?.getModifierState?.('Control');
        if (additive) {
            // React Flow also emits its controlled selection change for this
            // pointer-up. Apply the additive union after that queued update so
            // the library cannot immediately replace it with the clicked node.
            window.setTimeout(() => setNodes(previous => previous.map(candidate => ({
                ...candidate,
                selected: candidate.selected || candidate.id === selectedElementId || candidate.id === node.id,
            }))), 0);
            return;
        }
        if (node.type === 'annotationNode') return;
        const laneTarget = node.type === 'actionFlowLane'
            ? (node.data as { inspectElementId?: string }).inspectElementId
            : undefined;
        if (!laneTarget && (node.id.startsWith('__') || node.id.includes('__start') || node.id.includes('__done'))) return;
        inspectElement(laneTarget ?? node.id);
        if (selectedDiagramId) setActiveView({ type: 'diagram', diagramId: selectedDiagramId });
    }, [inspectElement, selectedDiagramId, setActiveView, selectedElementId, setNodes]);

    const onNodeDoubleClick = useCallback((event: RFAny, node: FlowNode) => {
        event?.stopPropagation?.();
        if (viewKind === 'actionflow') {
            const hasChildren = Object.values(model?.elements ?? {}).some(el => el.parentAction === node.id);
            if (!hasChildren) return;
            drillIntoAction(node.id);
            return;
        }
        if (viewKind === 'statetransition') {
            // Drill into a composite state's own sub-machine; a leaf just
            // inspects. Both the folded card and the expanded frame carry
            // substates, so either can be descended into.
            const data = node.data as { hasChildren?: boolean; isMachine?: boolean };
            if (!data.hasChildren || data.isMachine) { inspectElement(node.id); return; }
            drillIntoState(node.id);
            return;
        }
        if (viewKind === 'interconnection') {
            // Drill into a container part's own IBD; a leaf just inspects.
            // A collapsed container still owns parts, so it can be descended
            // into; only a genuine leaf falls through to inspection.
            const data = node.data as { isContainer?: boolean; hasChildren?: boolean };
            if (!data.isContainer && !data.hasChildren) { inspectElement(node.id); return; }
            drillIntoInterconnection(node.id);
        }
    }, [viewKind, model?.elements, inspectElement, drillIntoAction, drillIntoState, drillIntoInterconnection]);

    const onPaneClick = dismissSelectionTools;

    const onEdgeClick = useCallback((event: RFAny, edge: FlowEdge) => {
        event?.stopPropagation?.();
        if (Date.now() < suppressInspectUntilRef.current) return;
        // Selecting an IBD connector exposes its draggable orthogonal segment
        // handles. Keep selection in controlled edge state so it survives the
        // next route render.
        setEdges(previous => previous.map(candidate => ({
            ...candidate,
            selected: candidate.id === edge.id,
        })));
        // Most renderer edges retain their model relationship id. State
        // transitions are modelled as transition elements, so they use the
        // same inspector surface through the element fallback.
        if (model?.relationships.some(relationship => relationship.id === edge.id)) {
            inspectRelationship(edge.id);
        } else if (model?.elements[edge.id]) {
            inspectElement(edge.id);
        }
    }, [model, inspectElement, inspectRelationship, setEdges]);

    // ─── Connector hover ───────────────────────────────────────────────────────
    // Published for every view from here, so a diagram gets connector tracing
    // whatever node and edge components its template renders. A renderer with a
    // finer subject than the whole node — an IBD port — publishes its own.

    const onNodeMouseEnter = useCallback((_: RFAny, node: FlowNode) => {
        setConnectorHover({ endpointIds: [node.id] });
    }, []);
    const onEdgeMouseEnter = useCallback((_: RFAny, edge: FlowEdge) => {
        setConnectorHover({ edgeId: edge.id, endpointIds: connectorEndpoints(edge) });
    }, []);
    const clearConnectorHover = useCallback(() => setConnectorHover(null), []);

    // ─── Node context menu actions ─────────────────────────────────────────────

    const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
        if (!selectedDiagramId) return;
        setNodeLayout(selectedDiagramId, nodeId, {
            ...(diagramLayouts[selectedDiagramId]?.nodes[nodeId] ?? { x: 0, y: 0 }),
            color: color || undefined,
        });
        setNodes(prev => prev.map(n => n.id === nodeId
            ? { ...n, data: { ...n.data, bgColor: color || undefined } } : n));

    }, [selectedDiagramId, diagramLayouts, setNodeLayout, setNodes]);

    // ─── Selection arrange / style ─────────────────────────────────────────────
    //
    // Board-tool tidying over a multi-selection. All of it is presentation, so it
    // is staged into `nodes` and persisted to the layout companion by the
    // debounced effect above — nothing here reaches SysML.

    const selectedNodes = useMemo(
        // Lanes and retained composite boundaries are computed backdrops whose
        // geometry follows their members; arranging one directly would be undone
        // on the next render.
        () => nodes.filter(node => node.selected
            && node.type !== 'actionFlowLane'
            && !node.id.startsWith('__')),
        [nodes],
    );

    /** Current geometry of the selection, in the units arrange.ts expects. */
    const selectionBoxes = useCallback((): ArrangeBox[] => selectedNodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: Number(node.width ?? node.measured?.width ?? node.style?.width ?? 180),
        height: Number(node.height ?? node.measured?.height ?? node.style?.height ?? 96),
    })), [selectedNodes]);

    /** Stage a geometry change and let the persist effect carry it to disk. */
    const applyArrange = useCallback((changes: ArrangeResult) => {
        if (changes.size === 0) return;
        markManualLayout();
        setNodes(previous => previous.map(node => {
            const next = changes.get(node.id);
            if (!next) return node;
            return {
                ...node,
                position: {
                    x: next.x ?? node.position.x,
                    y: next.y ?? node.position.y,
                },
                ...(next.width !== undefined ? { width: next.width } : {}),
                ...(next.height !== undefined ? { height: next.height } : {}),
                // Node components size themselves from style, so a matched size
                // has to reach both the measured box and the rendered one.
                ...(next.width !== undefined || next.height !== undefined
                    ? {
                        style: {
                            ...node.style,
                            ...(next.width !== undefined ? { width: next.width } : {}),
                            ...(next.height !== undefined ? { height: next.height } : {}),
                        },
                    }
                    : {}),
            };
        }));
        setLayoutEditVersion(version => version + 1);
    }, [markManualLayout, setNodes]);

    const alignSelection = useCallback((edge: AlignEdge) => {
        applyArrange(alignBoxes(selectionBoxes(), edge));
    }, [applyArrange, selectionBoxes]);

    const matchSelectionSize = useCallback((match: SizeMatch) => {
        applyArrange(matchSize(selectionBoxes(), match));
    }, [applyArrange, selectionBoxes]);

    const distributeSelection = useCallback((axis: DistributeAxis) => {
        applyArrange(distributeBoxes(selectionBoxes(), axis));
    }, [applyArrange, selectionBoxes]);

    /** Block styling rides in the layout companion beside position. */
    const styleSelection = useCallback((patch: {
        color?: string; opacity?: number; borderColor?: string; textColor?: string;
        fontSize?: number; fontWeight?: number; textAlign?: 'left' | 'center' | 'right';
        verticalAlign?: 'top' | 'middle' | 'bottom';
    }) => {
        if (!selectedDiagramId || selectedNodes.length === 0) return;
        markManualLayout();
        const layouts = useModelStore.getState().diagramLayouts[selectedDiagramId];
        for (const node of selectedNodes) {
            const existing = layouts?.nodes[node.id] ?? { x: node.position.x, y: node.position.y };
            setNodeLayout(selectedDiagramId, node.id, {
                ...existing,
                // An empty colour clears the override rather than storing "".
                ...(patch.color !== undefined ? { color: patch.color || undefined } : {}),
                ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
                ...(patch.borderColor !== undefined ? { borderColor: patch.borderColor || undefined } : {}),
                ...(patch.textColor !== undefined ? { textColor: patch.textColor || undefined } : {}),
                ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize || undefined } : {}),
                ...(patch.fontWeight !== undefined ? { fontWeight: patch.fontWeight || undefined } : {}),
                ...(patch.textAlign !== undefined ? { textAlign: patch.textAlign } : {}),
                ...(patch.verticalAlign !== undefined ? { verticalAlign: patch.verticalAlign } : {}),
            });
        }
        const ids = new Set(selectedNodes.map(node => node.id));
        setNodes(previous => previous.map(node => ids.has(node.id)
            ? {
                ...node,
                data: {
                    ...node.data,
                    ...(patch.color !== undefined ? { bgColor: patch.color || undefined } : {}),
                    ...(patch.opacity !== undefined ? { fillOpacity: patch.opacity } : {}),
                    ...(patch.borderColor !== undefined ? { borderColor: patch.borderColor || undefined } : {}),
                    ...(patch.textColor !== undefined ? { textColor: patch.textColor || undefined } : {}),
                    ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize || undefined } : {}),
                    ...(patch.fontWeight !== undefined ? { fontWeight: patch.fontWeight || undefined } : {}),
                    ...(patch.textAlign !== undefined ? { textAlign: patch.textAlign } : {}),
                    ...(patch.verticalAlign !== undefined ? { verticalAlign: patch.verticalAlign } : {}),
                },
            }
            : node));
        setLayoutEditVersion(version => version + 1);
    }, [selectedDiagramId, selectedNodes, markManualLayout, setNodeLayout, setNodes]);

    /** Shown on the slider: the shared value, or full when the selection differs. */
    const selectionOpacity = useMemo(() => {
        const values = selectedNodes.map(node =>
            Number((node.data as { fillOpacity?: number }).fillOpacity ?? 1));
        if (values.length === 0) return 1;
        return values.every(value => value === values[0]) ? values[0] : 1;
    }, [selectedNodes]);

    // The properties panel renders the style controls; the canvas keeps the
    // action, because only it knows which nodes are selected and how a patch
    // reaches both the sidecar layout and the live node. Published here rather
    // than passed down, since the panel is a sibling in App, not a child.
    const setSelectionStyle = useModelStore(s => s.setSelectionStyle);
    useEffect(() => {
        setSelectionStyle(selectedNodes.length > 0
            ? { count: selectedNodes.length, opacity: selectionOpacity, apply: styleSelection }
            : null);
    }, [selectedNodes.length, selectionOpacity, styleSelection, setSelectionStyle]);
    useEffect(() => () => setSelectionStyle(null), [setSelectionStyle]);

    const handleRemoveFromDiagram = useCallback((nodeId: string) => {
        if (!selectedDiagramId || !selectedDiagram) return;
        const newIds = (selectedDiagram.elementIds ?? []).filter(id => id !== nodeId);
        updateDiagramElementIds(selectedDiagramId, newIds);
        setNodes(prev => prev.filter(n => n.id !== nodeId));
    }, [selectedDiagramId, selectedDiagram, updateDiagramElementIds, setNodes]);

    // ─── Edge context menu actions ─────────────────────────────────────────────

    const handleEdgeStyleChange = useCallback((edgeId: string, style: EdgeLineStyle) => {
        const strokeDasharray = style === 'dashed' ? '6 3' : style === 'dotted' ? '2 3' : undefined;
        setEdges(prev => prev.map(e => e.id === edgeId
            ? { ...e, style: { ...e.style, strokeDasharray } } : e));
    }, [setEdges]);

    const handleEdgeColorChange = useCallback((edgeId: string, color: string) => {
        setEdges(prev => prev.map(e => e.id === edgeId
            ? { ...e, style: { ...e.style, stroke: color || (REL_COLORS[String(e.label ?? '')] ?? '#6B7280') } } : e));
    }, [setEdges]);

    const handleEdgeLabelToggle = useCallback((edgeId: string) => {
        setEdges(prev => prev.map(e => e.id === edgeId
            ? { ...e, label: e.label ? '' : edgeId.split('_')[3] ?? '' } : e));
    }, [setEdges]);

    // ─── Non-canvas view kinds (KK-7 Grid, KK-8 Browser, KK-9 Geometry) ───────

    if (selectedDiagram && model && viewKind === 'grid') {
        return (
            <GridView
                diagram={selectedDiagram}
                model={model}
                viewpointFilter={viewpointFilter}
            />
        );
    }
    if (selectedDiagram && model && viewKind === 'browser') {
        return (
            <BrowserView
                diagram={selectedDiagram}
                model={model}
                viewpointFilter={viewpointFilter}
            />
        );
    }
    if (selectedDiagram && model && viewKind === 'geometry') {
        return (
            <ScreenLayoutView
                diagram={selectedDiagram}
                model={model}
                viewpointFilter={viewpointFilter}
            />
        );
    }

    // ─── Empty state ───────────────────────────────────────────────────────────

    if (!selectedDiagram && nodes.length === 0 && !isLayouting) {
        return (
            <div className="flex flex-1 overflow-hidden">
                {!paletteCollapsed && (
                    <DiagramPalette
                        collapsed={paletteCollapsed}
                        onToggleCollapse={() => setPaletteCollapsed(true)}
                    />
                )}
                {paletteCollapsed && (
                    <DiagramPalette
                        collapsed
                        onToggleCollapse={() => setPaletteCollapsed(false)}
                    />
                )}
                <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                    <div className="text-center" style={{ maxWidth: '320px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>📊</div>
                        <h3 style={{ fontSize: FONT.lg, fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                            Select a Diagram
                        </h3>
                        <p style={{ fontSize: FONT.md, color: '#9CA3AF', lineHeight: 1.6 }}>
                            Choose a diagram from the sidebar or drag elements from the palette.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <InterconnectionRendererContext.Provider value={activeRenderer}>
        <div className="flex flex-1 overflow-hidden">
            {/* ── Palette ── */}
            <DiagramPalette
                collapsed={paletteCollapsed}
                onToggleCollapse={() => setPaletteCollapsed(!paletteCollapsed)}
                elementIds={selectedDiagram?.elementIds}
                // The view's own admitted kinds when it declares them — a
                // viewpoint pools the kinds of every view beneath it, which on an
                // IBD would offer state-machine shapes. The viewpoint union is
                // the fallback for a view with no selection query of its own.
                eligibleKinds={selectedDiagram?.elementKinds?.length
                    ? new Set(selectedDiagram.elementKinds)
                    : selectedDiagram?.viewpointId && model?.viewpoints
                        ? new Set(
                            model.viewpoints.find(v => v.id === selectedDiagram.viewpointId)?.visibleKinds ?? []
                        )
                        : undefined}
            />

            {/* The dock is a sibling of the drawing surface.  Keeping controls
                out of the canvas prevents it from covering nodes or edges. */}
            <div className="flex-1 flex min-w-0">
                {/* Diagram controls */}
                {!toolbarCollapsed && <aside
                    aria-label="Diagram tools"
                    className="flex shrink-0 flex-col border-r"
                    style={{ width: 126, background: '#FAFAF8', borderColor: '#E5E5E0' }}
                >
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#F0F0ED', borderBottom: '1px solid #E5E5E0' }}>
                        <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Toolbar</span>
                        <button type="button" onClick={() => setToolbarCollapsed(true)} title="Hide Toolbar" aria-label="Hide Toolbar"
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 5, cursor: 'pointer', color: '#6B7280', fontSize: 20, lineHeight: 1 }}>×</button>
                    </div>
                {selectedDiagram && !isCanvasFullscreen && (toolbarCollapsed ? (
                    <button
                        type="button"
                        className="m-3 flex items-center justify-center rounded-lg"
                        onClick={() => setToolbarCollapsed(false)}
                        title="Show diagram tools"
                        aria-label="Show diagram tools"
                        style={{ width: 36, height: 36, background: '#FFFFFF', color: '#1B3A4B', border: '1px solid #D8E0E4', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                    >
                        <Icon.lanes />
                    </button>
                ) : (
                    <div
                        className="memo-diagram-tools memo-diagram-tools--left m-3 grid content-start items-stretch justify-items-stretch rounded-lg text-xs"
                        style={{
                            width: 94, padding: 6, gap: 6, overflow: 'visible', gridTemplateColumns: 'repeat(2, 38px)', gridAutoRows: 'min-content', gridAutoFlow: 'row dense',
                            background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}
                    >
                        {/* Snap toggle */}
                        {supportsToolbarOperation('grid') && <IconToggle
                            icon={gridVisible ? <Icon.grid /> : <Icon.gridOff />}
                            active={gridVisible}
                            onClick={() => {
                                setGridVisible(visible => {
                                    const next = !visible;
                                    setSnapEnabled(next);
                                    return next;
                                });
                            }}
                            title="Show or hide the canvas grid and snapping (⌘⇧G)"
                        />}

                        {/* Image export. The whole diagram is written at full
                            extent, so the current pan and zoom do not decide
                            what lands in the file. */}
                        {supportsToolbarOperation('export') && <div className="memo-diagram-tools__document-action" style={{ position: 'relative' }}>
                            <IconToggle
                                icon={<Icon.download />}
                                active={exportMenuOpen}
                                onClick={() => { setExportError(null); setExportMenuOpen(open => !open); }}
                                title="Download this diagram as an image"
                            />
                            {exportMenuOpen && (
                                <div
                                    role="menu"
                                    aria-label="Export diagram"
                                    className="absolute z-20 rounded-lg overflow-hidden"
                                    style={{
                                        top: 'calc(100% + 6px)', left: 0, minWidth: 128,
                                        background: '#FFFFFF', border: '1px solid #E2E1DB',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                                    }}
                                >
                                    {(['png', 'svg', 'pdf'] as const).map(format => (
                                        <button
                                            key={format}
                                            role="menuitem"
                                            onClick={() => { void downloadDiagram(format); }}
                                            disabled={exportBusy !== null}
                                            className="w-full text-left px-3 py-1.5 text-xs font-medium"
                                            style={{
                                                background: '#FFFFFF', color: '#374151', border: 0,
                                                cursor: exportBusy ? 'default' : 'pointer',
                                            }}
                                        >
                                            {format.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {exportError && (
                                <div
                                    role="alert"
                                    className="absolute z-20 rounded-lg px-3 py-1.5 text-xs"
                                    style={{
                                        top: 'calc(100% + 6px)', left: 0, minWidth: 200,
                                        background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA',
                                    }}
                                >
                                    Export failed: {exportError}
                                </div>
                            )}
                        </div>}

                        <div className="memo-diagram-tools__layout-divider memo-diagram-tools__document-actions-divider" aria-hidden="true" />

                        {/* Connectors stay direct while blocks move; this is the
                            explicit pass that routes them around obstacles. */}
                        {supportsToolbarOperation('route') && <div className={viewKind === 'interconnection' ? 'memo-diagram-tools__layout-reset' : undefined} style={{ display: 'contents' }}>
                            <IconToggle
                                icon={<Icon.tidy />}
                                active={false}
                                onClick={tidyConnectors}
                                title="Layout: re-route connectors. Warns before replacing hand-drawn bends."
                            />
                        </div>}
                        {selectedDiagramId && supportsToolbarOperation('autoLayout') && <div className={viewKind === 'interconnection' ? 'memo-diagram-tools__layout-reset' : undefined} style={{ display: 'contents' }}>
                            <IconToggle
                                icon={<Icon.arrange />}
                                active={autoLayoutEnabled}
                                onClick={() => {
                                    if (autoLayoutEnabled) {
                                        markManualLayout();
                                    } else {
                                        if (!window.confirm(
                                            'Recalculate the layout? This replaces saved manual positions and hand-routed connectors for this diagram.',
                                        )) return;
                                        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId];
                                        const layout: DiagramLayout = {
                                            nodes: {}, edges: {}, canvas: { ...previous?.canvas, autoLayout: true },
                                        };
                                        mergeDiagramLayouts({ [selectedDiagramId]: layout });
                                        sendDiagramLayoutUpdate(selectedDiagramId, layout);
                                        setRelayoutNonce(value => value + 1);
                                    }
                                }}
                                title={autoLayoutEnabled
                                    ? 'Auto layout is on. Drag an item to preserve a manual layout.'
                                    : 'Layout: recalculate. Replaces saved manual positions after confirmation.'}
                            />
                        </div>}

                        {/* FBS controls */}
                        {isFBSDiagram && supportsToolbarOperation('expandCollapse') && (
                            <>
                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />
                                <IconButton icon={<Icon.expand />} onClick={expandAll}
                                    title="Expand all nodes" ariaLabel="Expand all" />
                                <IconButton icon={<Icon.collapse />} onClick={collapseAll}
                                    title="Collapse all nodes" ariaLabel="Collapse all" />
                            </>
                        )}

                        {/* Action Flow template controls (KK-4) — iOS-style grouped toolbar */}
                        {viewKind === 'actionflow' && supportsToolbarOperation('flowSwimlanes') && (
                            <>
                                {/* Display toggles: grid (above) + swimlanes read as one group */}
                                <IconToggle
                                    icon={swimlanesOn ? <Icon.lanes /> : <Icon.lanesOff />}
                                    active={swimlanesOn}
                                    onClick={() => setSwimlanesOn(s => !s)}
                                    title="Toggle allocation swimlanes"
                                />
                                {supportsToolbarOperation('flowSwimlanes') && swimlanesOn && actionFlowHasStages && (
                                    <IconToggle
                                        icon={<Icon.lanes />}
                                        label={actionFlowToolbarPlacement === 'left' ? undefined : 'Stage'}
                                        active={actionFlowLaneGrouping === 'stage'}
                                        onClick={() => setActionFlowLaneGrouping(current => current === 'stage' ? 'allocation' : 'stage')}
                                        title="Group this flow by its modeled stages"
                                    />
                                )}
                                {supportsToolbarOperation('flowHierarchy') && swimlanesOn && actionFlowLaneGrouping === 'allocation' && actionFlowDisplayLevels.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <IconToggle
                                            icon={<Icon.library />}
                                            active={actionFlowLevelsOpen}
                                            onClick={() => setActionFlowLevelsOpen(open => !open)}
                                            title={`Responsibility hierarchy level: ${actionFlowDisplayLevel === 'all' ? 'all levels' : `level ${actionFlowDisplayLevel}`}`}
                                        />
                                        {actionFlowLevelsOpen && (
                                            <div className="absolute z-30 rounded-lg p-1" style={{ top: 'calc(100% + 5px)', left: 0, width: 112, background: '#FFFFFF', border: '1px solid #D1D5DB', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                                                {(['all', ...actionFlowDisplayLevels] as Array<ActionFlowDisplayLevel>).map(level => {
                                                    const selected = actionFlowDisplayLevel === level;
                                                    return <button key={String(level)} type="button" className="w-full rounded px-2 py-1 text-left text-xs font-semibold" style={{ background: selected ? '#E8FBF5' : 'transparent', color: selected ? '#0F766E' : '#475569' }} onClick={() => { setActionFlowDisplayLevel(level); setActionFlowLevelsOpen(false); }}>
                                                        {level === 'all' ? 'All levels' : `Level ${level}`}
                                                    </button>;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />

                                {/* How an expanded composite action shows its steps */}
                                {supportsToolbarOperation('flowNesting') && <IconToggle
                                    icon={actionFlowNesting === 'flat' ? <Icon.split /> : <Icon.rectangle />}
                                    active={actionFlowNesting === 'nested'}
                                    onClick={() => setActionFlowNesting(current => current === 'flat' ? 'nested' : 'flat')}
                                    title={actionFlowNesting === 'flat'
                                        ? 'Steps: inline. Click to show nested steps.'
                                        : 'Steps: nested. Click to show inline steps.'}
                                />}

                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />

                                {/* Reading direction — segmented control */}
                                {supportsToolbarOperation('flowDirection') && <IconToggle
                                    icon={actionFlowDirection === 'horizontal' ? <Icon.arrowRight /> : <Icon.arrowDown />}
                                    active={actionFlowDirection === 'vertical'}
                                    onClick={() => changeActionFlowDirection(actionFlowDirection === 'horizontal' ? 'vertical' : 'horizontal')}
                                    title={actionFlowDirection === 'horizontal'
                                        ? 'Flow direction: left to right. Click for top to bottom.'
                                        : 'Flow direction: top to bottom. Click for left to right.'}
                                />}

                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />

                                {supportsToolbarOperation('flowLegend') && <IconToggle
                                    icon={<Icon.lanes />}
                                    active={actionFlowLegendOpen}
                                    onClick={() => setActionFlowLegendOpen(open => !open)}
                                    title={actionFlowLegendOpen ? 'Hide flow legend' : 'Show flow legend'}
                                />}
                                {supportsToolbarOperation('flowLegend') && actionFlowLegendOpen && (
                                    <IconToggle
                                        icon={actionFlowLegendPlacement === 'overlay' ? <Icon.overlay /> : <Icon.arrowUp />}
                                        active={actionFlowLegendPlacement === 'above'}
                                        onClick={() => setActionFlowLegendPlacement(current => current === 'overlay' ? 'above' : 'overlay')}
                                        title={actionFlowLegendPlacement === 'overlay'
                                            ? 'Legend over diagram. Click to place it above.'
                                            : 'Legend above diagram. Click to overlay it.'}
                                    />
                                )}

                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />

                                {/* Tree state — clustered expand / collapse */}
                                <IconToggle
                                    icon={<Icon.expand />}
                                    title="Expand all sub-actions"
                                    onClick={() => setExpandedActionNodes(new Set(
                                        Object.values(model?.elements ?? {})
                                            .map(element => element.parentAction)
                                            .filter((id): id is string => Boolean(id)),
                                    ))}
                                />
                                <IconToggle
                                    icon={<Icon.collapse />}
                                    title="Collapse all sub-actions"
                                    onClick={() => setExpandedActionNodes(new Set())}
                                />

                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />

                                {/* Connection filter */}
                                {supportsToolbarOperation('flowFilters') && <div style={{ position: 'relative' }}>
                                    <IconToggle
                                        icon={<Icon.filter />}
                                        active={flowFiltersOpen}
                                        badge={`${visibleActionFlowKinds.size}/4`}
                                        fullWidth={false}
                                        onClick={() => setFlowFiltersOpen(open => !open)}
                                        title="Choose which modeled connection categories are visible"
                                    />
                                    {flowFiltersOpen && (
                                        <div
                                            className="absolute p-3 rounded-lg"
                                            style={{
                                                width: 264,
                                                ...(actionFlowToolbarPlacement === 'left'
                                                    ? { top: 0, left: 'calc(100% + 8px)' }
                                                    : { top: 'calc(100% + 8px)', right: 0 }),
                                                background: '#FFFFFF', border: '1px solid #D1D5DB', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 30,
                                            }}
                                        >
                                            <div style={{ color: '#1F2937', fontWeight: 700, fontSize: FONT.xs }}>Show connection categories</div>
                                            <div style={{ color: '#6B7280', fontSize: FONT.xs, lineHeight: 1.4, marginTop: 3, marginBottom: 8 }}>
                                                Changes this diagram view only; the SysML model is not modified.
                                            </div>
                                            {(['control', 'data', 'energy', 'material'] as const).map(kind => {
                                                const shown = visibleActionFlowKinds.has(kind);
                                                const color = kind === 'control' ? '#4B5563' : kind === 'data' ? '#3498DB' : kind === 'energy' ? '#D97706' : '#16A34A';
                                                return (
                                                    <button
                                                        key={kind}
                                                        role="switch"
                                                        aria-checked={shown}
                                                        onClick={() => setVisibleActionFlowKinds(previous => {
                                                            const next = new Set(previous);
                                                            if (next.has(kind)) next.delete(kind); else next.add(kind);
                                                            return next;
                                                        })}
                                                        className="w-full flex items-center justify-between px-1 py-1.5 rounded"
                                                        style={{ color: '#374151', textTransform: 'capitalize' }}
                                                        title={`${shown ? 'Hide' : 'Show'} ${kind} connections`}
                                                    >
                                                        <span className="flex items-center gap-2"><span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />{kind}</span>
                                                        <span aria-hidden="true" style={{ width: 32, height: 18, borderRadius: 9, background: shown ? '#2563EB' : '#D1D5DB', padding: 2, transition: 'background 160ms ease' }}>
                                                            <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.22)', transform: shown ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 160ms ease' }} />
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>}
                                {/* Drill-down: the ↳ button on a composite action, or double-click */}
                                <DrillBreadcrumb
                                    path={actionPath}
                                    nameOf={id => model?.elements[id]?.name ?? id}
                                    onFocus={setFocusedActionId}
                                    rootLabel="Back to the whole action flow"
                                />
                            </>
                        )}

                        {viewKind === 'interconnection' && supportsToolbarOperation('expandCollapse') && (
                            <>
                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />
                                <div className="memo-diagram-tools__layout-reset" style={{ display: 'contents' }}>
                                    <IconButton
                                        icon={<Icon.expand />}
                                        onClick={() => setCollapsedInterconnectionNodes(new Set())}
                                        title="Expand all parts" ariaLabel="Expand all"
                                    />
                                    <IconButton
                                        icon={<Icon.collapse />}
                                        onClick={() => setCollapsedInterconnectionNodes(new Set(interconnectionContainerIds))}
                                        title="Collapse all parts" ariaLabel="Collapse all"
                                    />
                                </div>
                                <div className="memo-diagram-tools__layout-divider memo-diagram-tools__layout-reset-divider" aria-hidden="true" />
                                {supportsToolbarOperation('interconnectionPorts') && supportsToolbarOperation('interconnectionConnections') && actionFlowToolbarPlacement === 'left' ? (
                                    <>
                                        <IconToggle
                                            icon={interconnectionPortDisplay === 'all' ? <Icon.library /> : interconnectionPortDisplay === 'ports' ? <Icon.rectangle /> : <Icon.minus />}
                                            active={interconnectionPortDisplay !== 'none'}
                                            onClick={() => setInterconnectionPortDisplay(current => { const next = current === 'all' ? 'ports' : current === 'ports' ? 'none' : 'all'; saveIbdDisplay({ portDisplay: next }); return next; })}
                                            title={interconnectionPortDisplay === 'all'
                                                ? 'Ports: nested. Click for top-level ports.'
                                                : interconnectionPortDisplay === 'ports'
                                                    ? 'Ports: top-level only. Click to hide ports.'
                                                    : 'Ports: hidden. Click to show nested ports.'}
                                        />
                                        <IconToggle
                                            icon={interconnectionConnectionDisplay === 'summary' ? <Icon.tidy /> : interconnectionConnectionDisplay === 'all' ? <Icon.lanes /> : <Icon.minus />}
                                            active={interconnectionConnectionDisplay !== 'none'}
                                            onClick={() => setInterconnectionConnectionDisplay(current => { const next = current === 'summary' ? 'all' : current === 'all' ? 'none' : 'summary'; saveIbdDisplay({ connectionDisplay: next }); return next; })}
                                            title={interconnectionConnectionDisplay === 'summary'
                                                ? 'Connections: summary. Click to show all.'
                                                : interconnectionConnectionDisplay === 'all'
                                                    ? 'Connections: all. Click to hide them.'
                                                    : 'Connections: hidden. Click for summary.'}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <span style={{ color: '#9CA3AF', fontSize: FONT.xs, fontWeight: 600 }}>Ports</span>
                                        <Segmented
                                            value={interconnectionPortDisplay}
                                            onChange={value => { setInterconnectionPortDisplay(value); saveIbdDisplay({ portDisplay: value }); }}
                                            options={[
                                                { value: 'all', label: 'Nested', title: 'Show ports and their nested ports' },
                                                { value: 'ports', label: 'Top', title: 'Show top-level ports only (nested connectors lift to the parent port)' },
                                                { value: 'none', label: 'Off', title: 'Hide ports; connectors run part to part' },
                                            ]}
                                        />
                                        <span style={{ color: '#9CA3AF', fontSize: FONT.xs, fontWeight: 600 }}>Connections</span>
                                        <Segmented
                                            value={interconnectionConnectionDisplay}
                                            onChange={value => { setInterconnectionConnectionDisplay(value); saveIbdDisplay({ connectionDisplay: value }); }}
                                            options={[
                                                { value: 'summary', label: 'Summary', title: 'Show focused-subsystem boundary flows and bundle repeated rendered endpoint pairs' },
                                                { value: 'all', label: 'All', title: 'Show every model connector' },
                                                { value: 'none', label: 'Off', title: 'Hide connectors while inspecting block structure' },
                                            ]}
                                        />
                                    </>
                                )}
                                {/* Drill-down breadcrumb (double-click a part to descend) */}
                                <DrillBreadcrumb
                                    path={interconnectionPath}
                                    nameOf={id => model?.elements[id]?.name ?? id}
                                    onFocus={setFocusedInterconnectionId}
                                    rootLabel="Back to the whole diagram"
                                />
                            </>
                        )}

                        {viewKind === 'statetransition' && supportsToolbarOperation('expandCollapse') && (
                            <>
                                <ToolbarSep />
                                <IconButton
                                    icon={<Icon.expand />}
                                    onClick={() => setCollapsedStateNodes(new Set())}
                                    title="Show all substates" ariaLabel="Expand all substates"
                                />
                                <IconButton
                                    icon={<Icon.collapse />}
                                    onClick={() => setCollapsedStateNodes(new Set(compositeStateIds))}
                                    title="Fold every composite state" ariaLabel="Collapse all substates"
                                />
                                {/* Drill-down: the ↳ button on a composite state, or double-click */}
                                <DrillBreadcrumb
                                    path={statePath}
                                    nameOf={id => model?.elements[id]?.name ?? id}
                                    onFocus={setFocusedStateId}
                                    rootLabel="Back to the whole machine"
                                />
                            </>
                        )}

                        {/* General template mode switcher (KK-2) */}
                        {isUseCaseDiagram && supportsToolbarOperation('useCaseOptions') && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569' }}>
                                    Level
                                    <select
                                        aria-label="Use case hierarchy level"
                                        value={useCaseDisplayLevel}
                                        onChange={event => setUseCaseDisplayLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                                        style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}
                                    >
                                        <option value="all">All levels</option>
                                        {Array.from({ length: useCaseDepth + 1 }, (_, level) => (
                                            <option key={level} value={level}>L{level}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569' }}>
                                    Routing
                                    <select aria-label="Use case connector routing" value={useCaseEdgeStyle}
                                        onChange={event => setUseCaseEdgeStyle(event.target.value as UseCaseEdgeStyle)}
                                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                                        style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                                        <option value="straight">Straight</option>
                                        <option value="elbow">Elbow</option>
                                        <option value="rounded">Rounded</option>
                                        <option value="curved">Curved</option>
                                        <option value="arc">Arc</option>
                                    </select>
                                </label>
                                <button onClick={autoArrangeUseCase}
                                    className="px-2 py-0.5 text-xs font-semibold rounded"
                                    style={{ color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0' }}
                                    title="Reapply the constrained hierarchy layout and obstacle-aware routes">
                                    Auto arrange
                                </button>
                                {useCaseActors.length > 0 && (
                                    <details className="relative">
                                        <summary className="px-2 py-0.5 text-xs font-semibold rounded cursor-pointer"
                                            style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                                            Actors{hiddenUseCaseActorIds.size ? `: ${hiddenUseCaseActorIds.size} hidden` : ''}
                                        </summary>
                                        <div className="absolute top-7 left-0 z-30 min-w-48 p-2 rounded shadow-lg"
                                            style={{ background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                                            <div className="mb-1 text-xs" style={{ color: '#64748B' }}>Hide related use cases</div>
                                            {useCaseActors.map(actor => <label key={actor.id} className="flex items-center gap-2 py-1 text-xs" style={{ color: '#374151' }}>
                                                <input type="checkbox" checked={hiddenUseCaseActorIds.has(actor.id)}
                                                    onChange={() => setHiddenUseCaseActorIds(previous => {
                                                        const next = new Set(previous);
                                                        if (next.has(actor.id)) next.delete(actor.id); else next.add(actor.id);
                                                        return next;
                                                    })} />
                                                {actor.name}
                                            </label>)}
                                        </div>
                                    </details>
                                )}
                            </>
                        )}

                        {/* General template mode switcher (KK-2) */}
                        {isGeneralTemplate && !isUseCaseDiagram && supportsToolbarOperation('generalMode') && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                {/* Three modes in a two-column dock of 38px tiles left the
                                    third clipped off the edge, so containment looked as
                                    though it did not exist. Full width, stacked, and each
                                    mode named — an icon cannot tell "tree" from "nested
                                    containment", and captioning three glyphs "View as"
                                    explained neither. */}
                                {allowedGeneralModes.includes('graph') && (
                                    <IconToggle icon={<Icon.tidy />} active={generalMode === 'graph'}
                                        onClick={() => { setGeneralMode('graph'); positionCacheRef.current.clear(); }}
                                        title="Relationship graph with compartments" />
                                )}
                                {/* Tree and containment are two ways of drawing the same
                                    hierarchy, so they are one control that swaps between
                                    them — which also keeps the group inside the dock's two
                                    columns, where a third tile was being clipped off the
                                    edge and containment looked as though it did not exist.
                                    The icon shows the mode you are in. */}
                                <IconToggle
                                    icon={generalMode === 'containment' ? <Icon.rectangle /> : <Icon.library />}
                                    active={generalMode !== 'graph'}
                                    onClick={() => {
                                        setGeneralMode(generalMode === 'tree' ? 'containment' : 'tree');
                                        positionCacheRef.current.clear();
                                    }}
                                    title={generalMode === 'containment'
                                        ? 'Nested containment blocks — switch to the decomposition tree'
                                        : 'Decomposition tree — switch to nested containment blocks'} />
                                {generalMode !== 'graph' && (
                                    <>
                                        <IconButton icon={<Icon.expand />} onClick={expandAll}
                                            title="Expand all nodes" ariaLabel="Expand all" />
                                        <IconButton icon={<Icon.collapse />} onClick={collapseAll}
                                            title="Collapse all nodes" ariaLabel="Collapse all" />
                                        {generalMode === 'tree' && (
                                            <button onClick={resetLayout} className="px-2 py-0.5 text-xs font-medium rounded"
                                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                                title="Re-layout the tree from scratch">
                                                ↻ Reset
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Decomposition controls */}
                        {isDecompDiagram && !isFBSDiagram && supportsToolbarOperation('expandCollapse') && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <div style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 600, color: '#6B7280', paddingLeft: 2 }}>
                                    View as
                                </div>
                                <div className="flex rounded overflow-hidden"
                                    style={{ gridColumn: '1 / -1', border: '1px solid #E5E5E0' }}>
                                    {(['containment', 'decomposition'] as const).map(s => (
                                        <button key={s} onClick={() => { setLayoutStyle(s); positionCacheRef.current.clear(); }}
                                            className="flex-1 flex items-center justify-center py-1 text-xs font-medium"
                                            style={{
                                                background: layoutStyle === s ? '#1B3A4B' : '#FFFFFF',
                                                color: layoutStyle === s ? '#FFFFFF' : '#6B7280',
                                            }}>
                                            {s === 'containment' ? <Icon.rectangle /> : <Icon.library />}
                                        </button>
                                    ))}
                                </div>
                                <ToolbarSep />
                                <IconButton icon={<Icon.expand />} onClick={expandAll}
                                    title="Expand all nodes" ariaLabel="Expand all" />
                                <IconButton icon={<Icon.collapse />} onClick={collapseAll}
                                    title="Collapse all nodes" ariaLabel="Collapse all" />
                                {layoutStyle === 'decomposition' && (
                                    <button onClick={resetLayout} className="px-2 py-0.5 text-xs font-medium rounded"
                                        style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                        title="Re-layout the tree from scratch">
                                        ↻ Reset
                                    </button>
                                )}
                            </>
                        )}

                        {selectedDiagramId && (
                            <>
                                {viewKind !== 'actionflow' && actionFlowToolbarPlacement !== 'left' && <span style={{ color: '#E5E5E0' }}>|</span>}
                                {/* The source editor mounts its compact controls
                                    here so every diagram action stays in the
                                    dedicated tools dock. */}
                                <div
                                    id="memo-diagram-editor-controls"
                                    data-compact-diagram-tools="true"
                                    style={{ display: 'contents' }}
                                />
                            </>
                        )}

                        {selectedDiagramId && viewKind === 'interconnection' && (
                            <>
                                {actionFlowToolbarPlacement !== 'left' && <span style={{ color: '#E5E5E0' }}>|</span>}
                                <IconButton icon={<Icon.plus />} onClick={() => addAnnotation('note')}
                                    title="Add an editable note" ariaLabel="Add note" />
                                <IconToggle icon={<Icon.arrowRight />} active={flowAnimationEnabled}
                                    onClick={() => {
                                        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
                                        const layout: DiagramLayout = {
                                            ...previous,
                                            canvas: { ...previous.canvas, flowAnimation: !flowAnimationEnabled },
                                        };
                                        mergeDiagramLayouts({ [selectedDiagramId]: layout });
                                        sendDiagramLayoutUpdate(selectedDiagramId, layout);
                                        setEdges(current => current.map(edge => ({
                                            ...edge,
                                            data: { ...edge.data, flowAnimation: !flowAnimationEnabled },
                                        })));
                                    }} title="Toggle animated source-to-target flow" />
                                <IconToggle icon={<Icon.library />} active={interconnectionLegendOpen}
                                    onClick={() => setInterconnectionLegendOpen(open => !open)} title="Show or hide the IBD notation legend" />
                                <IconToggle icon={<Icon.elements />} active={showIbdPortText}
                                    onClick={() => { const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} }; const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, showPortText: !showIbdPortText } }; mergeDiagramLayouts({ [selectedDiagramId]: layout }); sendDiagramLayoutUpdate(selectedDiagramId, layout); }}
                                    title="Show or hide port captions" />
                                <IconToggle icon={<Icon.code />} active={showIbdConnectionText}
                                    onClick={() => { const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} }; const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, showConnectionText: !showIbdConnectionText } }; mergeDiagramLayouts({ [selectedDiagramId]: layout }); sendDiagramLayoutUpdate(selectedDiagramId, layout); }}
                                    title="Show or hide connector labels" />
                            </>
                        )}
                    </div>
                ))}
                </aside>}

                {/* ── Drawing surface ── */}
                <div ref={canvasRef} className="flex-1 relative min-h-0" onDragOver={onDragOver} onDrop={onDrop} onDoubleClick={onPaneDoubleClick}>

                {/* Focus Mode toolbar (#22) */}
                {focusNodeId && (
                    <div
                        className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: '#1B3A4B', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                    >
                        <span style={{ color: '#2DD4A8', fontWeight: 700 }}>◎ Focus</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Depth</span>
                        {[1, 2, 3].map(d => (
                            <button
                                key={d}
                                onClick={() => setFocusDepth(d)}
                                style={{
                                    width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                                    background: focusDepth === d ? '#2DD4A8' : 'rgba(255,255,255,0.15)',
                                    color: focusDepth === d ? '#1B3A4B' : '#FFFFFF',
                                    fontWeight: 700, fontSize: '11px', border: 'none',
                                }}
                            >
                                {d}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setFocusNodeId(null);
                                setNodes(prev => prev.map(n => ({ ...n, style: { ...n.style, opacity: 1, pointerEvents: 'all' as any } })));
                                setEdges(prev => prev.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));
                            }}
                            style={{ marginLeft: 4, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', fontSize: '11px', border: 'none' }}
                        >
                            Exit Focus
                        </button>
                    </div>
                )}

                {/* Source file toast (#38) */}
                {sourceToast && (
                    <div
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-mono"
                        style={{ background: '#1B3A4B', color: '#2DD4A8', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}
                    >
                        Copied: {sourceToast}
                    </div>
                )}

                {isLayouting && (
                    <div
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                        Computing layout…
                    </div>
                )}

                {layoutError && !isLayouting && (
                    <div
                        role="alert"
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3 py-2"
                        style={{
                            maxWidth: 620, background: '#FFFDF7', color: '#5F4300',
                            border: '1px solid #E7C35A', borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(31,41,55,0.10)', fontSize: FONT.xs,
                        }}
                    >
                        <span>{layoutError}</span>
                        <button
                            onClick={resetLayout}
                            style={{
                                border: '1px solid #B58A12', borderRadius: 3, background: '#FFFFFF',
                                color: '#5F4300', padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {floatingActions.length > 0 && !isLayouting && (
                    <div
                        role="alert"
                        className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-2"
                        style={{
                            maxWidth: 720, background: '#FEF2F2', color: '#991B1B',
                            border: '1px solid #FCA5A5', borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(31,41,55,0.10)', fontSize: FONT.xs,
                        }}
                    >
                        <span style={{ fontWeight: 700 }}>Diagram error:</span>{' '}
                        {floatingActions.length} floating {floatingActions.length === 1 ? 'action has' : 'actions have'} no flow or succession connection:{' '}
                        {floatingActions.map((action, index) => (
                            <span key={action.id}>
                                {index > 0 && ', '}
                                <button onClick={() => inspectElement(action.id)}
                                    style={{ color: '#991B1B', textDecoration: 'underline', fontWeight: 700 }}>
                                    {action.name}
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {bddTreeIssue && !isLayouting && (
                    <div role="alert" className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-2"
                        style={{
                            maxWidth: 720, background: '#FEF2F2', color: '#991B1B',
                            border: '1px solid #FCA5A5', borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(31,41,55,0.10)', fontSize: FONT.xs,
                        }}>
                        <span style={{ fontWeight: 700 }}>BDD error:</span>{' '}
                        expected one connected hierarchy, but found {bddTreeIssue.rootIds.length} roots
                        {bddTreeIssue.disconnectedIds.length > 0 && (
                            <> and {bddTreeIssue.disconnectedIds.length} disconnected/floating elements</>
                        )}.
                    </div>
                )}

                {viewKind === 'actionflow' && actionFlowLegendOpen && (
                    <div
                        aria-label="Action flow legend"
                        className="absolute z-10 flex flex-col gap-2 px-3 py-2.5"
                        style={{
                            top: actionFlowLegendPlacement === 'above' ? 8 : 12,
                            right: 12,
                            minWidth: 154,
                            background: 'rgba(255,255,255,0.96)', border: '1px solid #D1D5DB',
                            borderRadius: 12, color: '#374151', fontSize: FONT.xs,
                            boxShadow: '0 2px 8px rgba(31,41,55,0.10)',
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <span style={{ fontWeight: 700 }}>Flow legend</span>
                        </div>
                        {visibleActionFlowKinds.has('control') && <span className="flex items-center gap-2">
                            <span style={{ width: 24, height: 0, borderTop: '2px solid #4B5563' }} />
                            Control flow
                        </span>}
                        {visibleActionFlowKinds.has('data') && <span className="flex items-center gap-2">
                            <span style={{ width: 24, height: 0, borderTop: '2.5px solid #3498DB' }} />
                            Object flow
                        </span>}
                        {visibleActionFlowKinds.has('energy') && <span className="flex items-center gap-2">
                            <span style={{ width: 24, height: 0, borderTop: '2.5px solid #D97706' }} />
                            Energy flow
                        </span>}
                        {visibleActionFlowKinds.has('material') && <span className="flex items-center gap-2">
                            <span style={{ width: 24, height: 0, borderTop: '2.5px solid #16A34A' }} />
                            Material flow
                        </span>}
                    </div>
                )}

                {viewKind === 'interconnection' && nodes.length > 0 && interconnectionLegendOpen && (
                    <div
                        aria-label="Interconnection legend"
                        className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5 px-3 py-2"
                        style={{
                            background: 'rgba(255,255,255,0.96)', border: '1px solid #D1D5DB',
                            borderRadius: 4, color: '#374151', fontSize: FONT.xs,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span style={{ fontWeight: 700 }}>Ports</span>
                            {interconnectionPortDisplay !== 'none' ? (
                                <>
                                    <span className="flex items-center gap-1"><PortSwatch color={PORT_DIR_COLORS.in} glyph="→" /> in</span>
                                    <span className="flex items-center gap-1"><PortSwatch color={PORT_DIR_COLORS.out} glyph="→" /> out</span>
                                    <span className="flex items-center gap-1"><PortSwatch color={PORT_DIR_COLORS.inout} glyph="⇄" /> inout</span>
                                    {interconnectionPortDisplay === 'all' && (
                                        <span className="flex items-center gap-1">
                                            <span style={{
                                                width: 9, height: 9, borderRadius: 2, flexShrink: 0,
                                                background: '#6B728022', border: '1.5px solid #6B7280',
                                            }} />
                                            nested
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span style={{ color: '#9CA3AF' }}>hidden</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span style={{ fontWeight: 700 }}>Flow</span>
                            {(['data', 'energy', 'material'] as const).map(k => (
                                <span key={k} className="flex items-center gap-1.5">
                                    <span style={{ width: 20, height: 0, borderTop: `2.5px solid ${IBD_FLOW_COLORS[k]}` }} />
                                    {k}
                                </span>
                            ))}
                        </div>
                        {ibdLegend && (
                            <div className="flex flex-col gap-1">
                                <span style={{ fontWeight: 700 }}>{ibdLegend.name}</span>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {[...ibdLegend.colors.entries()].map(([literal, color]) => (
                                        <span key={literal} className="flex items-center gap-1">
                                            <span style={{ width: 11, height: 11, borderRadius: 2, background: color, border: '1px solid rgba(15,23,42,0.25)' }} />
                                            {literal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Hint for empty diagram */}
                {!isLayouting && nodes.length === 0 && selectedDiagram && (
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 1 }}
                    >
                        {selectedDiagram.auto && selectedDiagram.elementIds?.length === 0 ? (
                            <div className="text-center" style={{ maxWidth: 420 }}>
                                <div style={{ fontSize: '32px', marginBottom: 8 }}>🔍</div>
                                <div style={{ fontSize: FONT.sm, color: '#374151', fontWeight: 600, marginBottom: 4 }}>
                                    This view selects no elements
                                </div>
                                <div style={{ fontSize: FONT.xs, color: '#6B7280', lineHeight: 1.6 }}>
                                    The view is auto-populated from its selectionQuery in the model.
                                    Add includeElementKinds / includeLayers to its SysML definition,
                                    or add an `expose` member for the elements you want visible.
                                </div>
                            </div>
                        ) : (
                            <div className="text-center" style={{ opacity: 0.4 }}>
                                <div style={{ fontSize: '32px', marginBottom: 8 }}>🖱️</div>
                                <div style={{ fontSize: FONT.sm, color: '#6B7280' }}>
                                    Drag from palette or double-click to create elements
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Arrange bar: only a real multi-selection has anything to align
                    against, so a single selected block keeps the canvas clear. */}
                {selectedNodes.length >= 1 && (
                    <SelectionToolbar
                        count={selectedNodes.length}
                        onClose={dismissSelectionTools}
                        onAlign={alignSelection}
                        onMatchSize={matchSelectionSize}
                        onDistribute={distributeSelection}
                    />
                )}

                {/* ELK layout progress bar (#44) */}
                {isLayouting && (
                    <div
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '2px', zIndex: 20,
                            background: `linear-gradient(90deg, ${COLOR.accent} 0%, ${COLOR.accent}80 50%, transparent 100%)`,
                            backgroundSize: '200% 100%',
                            animation: 'memo-layout-progress 1.2s linear infinite',
                        }}
                    />
                )}

                <ReactFlow
                    className="memo-diagram-canvas"
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChangeWithResize}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    onNodeContextMenu={handleNodeContextMenu}
                    onEdgeContextMenu={handleEdgeContextMenu}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={clearConnectorHover}
                    onEdgeMouseEnter={onEdgeMouseEnter}
                    onEdgeMouseLeave={clearConnectorHover}
                    nodesConnectable={!activeRenderer.disableConnectorCreation}
                    onConnect={activeRenderer.disableConnectorCreation ? undefined : onConnect}
                    onConnectStart={activeRenderer.disableConnectorCreation ? undefined : onConnectStart}
                    onConnectEnd={activeRenderer.disableConnectorCreation ? undefined : (onConnectEnd as any)}
                    onReconnect={onReconnect}
                    onReconnectStart={onReconnectStart}
                    onReconnectEnd={onReconnectEnd}
                    reconnectRadius={10}
                    connectionMode={ConnectionMode.Loose}
                    defaultEdgeOptions={{ interactionWidth: 24 }}
                    snapToGrid={snapEnabled}
                    snapGrid={SNAP_GRID}
                    // Action-flow framing anchors the reading direction itself;
                    // React Flow's initial generic fit would overwrite it.
                    fitView={viewKind !== 'actionflow'}
                    fitViewOptions={{ ...RF_FIT_VIEW_OPTIONS, minZoom: fitMinZoom }}
                    minZoom={0.1}
                    maxZoom={3}
                    zoomOnScroll
                    panOnScroll
                    panOnScrollMode={'free' as any}
                    // Board-tool convention: dragging empty canvas rubber-bands a
                    // selection, and panning moves to the middle and right buttons
                    // (trackpad two-finger scroll still pans, via panOnScroll).
                    // Shift or Cmd/Ctrl extends a selection one block at a time.
                    selectionOnDrag
                    panOnDrag={[1, 2]}
                    multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
                    selectionKeyCode={null}
                    proOptions={RF_PRO_OPTIONS}
                    style={viewKind === 'actionflow' ? {
                        ...RF_STYLE,
                        position: 'absolute',
                        left: 0,
                        top: actionFlowLegendOpen && actionFlowLegendPlacement === 'above' ? 112 : 0,
                        right: 0,
                        bottom: 0,
                        width: 'auto',
                        height: 'auto',
                    } : RF_STYLE}
                >
                    {gridVisible && <Background color="#C5C7C2" gap={20} size={1.5} />}
                    <ConnectorHoverStyles />
                    {/* The minimap moved to the opposite corner, so the zoom
                        stack no longer needs to be lifted clear of it. The old
                        `marginBottom: 82` was a guess at the minimap's height —
                        it is ~160px with its margin, so on any diagram large
                        enough to show one the two overlapped and the maximise
                        button underneath could not be clicked. */}
                    <Controls position="bottom-right" showFitView={false} style={{ zIndex: 6 }}>
                        <ControlButton
                            title="Reset this view to its default layout"
                            aria-label="Reset this view to its default layout"
                            onClick={resetViewToDefault}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </ControlButton>
                        <ControlButton
                            title="Undo last diagram edit (⌘Z)"
                            aria-label="Undo last diagram edit"
                            onClick={undoLastDiagramEdit}
                        >↶</ControlButton>
                        <ControlButton
                            title="Redo last diagram edit (⌘⇧Z)"
                            aria-label="Redo last diagram edit"
                            onClick={redoLastDiagramEdit}
                        >↷</ControlButton>
                        <ControlButton
                            title="Fit diagram to view"
                            aria-label="Fit diagram to view"
                            onClick={() => fitDiagramFrame(250)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
                                <path d="M3 8l5-5M21 8l-5-5M21 16l-5 5M3 16l5 5" />
                            </svg>
                        </ControlButton>
                        <ControlButton
                            title="Toggle fullscreen canvas"
                            aria-label="Toggle fullscreen canvas"
                            onClick={event => {
                                const canvas = event.currentTarget.closest('.react-flow');
                                if (!canvas) return;
                                if (document.fullscreenElement) void document.exitFullscreen();
                                else void canvas.requestFullscreen?.();
                            }}
                        >
                            ⛶
                        </ControlButton>
                    </Controls>
                    {nodes.length > 20 && (
                        miniMapOpen ? (
                            <MiniMap
                                position="bottom-left"
                                style={MINIMAP_STYLE}
                                nodeColor={miniMapNodeColor}
                                maskColor="rgba(247, 247, 245, 0.7)"
                                onClick={undefined}
                                pannable
                                zoomable
                            />
                        ) : null
                    )}
                    {nodes.length > 20 && (
                        <button
                            type="button"
                            title={miniMapOpen ? 'Hide the overview map' : 'Show the overview map'}
                            aria-label={miniMapOpen ? 'Hide the overview map' : 'Show the overview map'}
                            aria-pressed={miniMapOpen}
                            onClick={() => setMiniMapOpen(open => {
                                localStorage.setItem('memo.minimap.open', String(!open));
                                return !open;
                            })}
                            style={{
                                position: 'absolute', left: '8px', bottom: '8px', zIndex: 7,
                                width: '22px', height: '22px', lineHeight: '20px', textAlign: 'center',
                                borderRadius: '4px', border: '1px solid #E5E5E1',
                                background: '#FFFFFF', color: '#6B6B66', fontSize: '13px', cursor: 'pointer',
                            }}
                        >{miniMapOpen ? '\u2013' : '\u25A2'}</button>
                    )}
                </ReactFlow>
            </div>
            </div>

            {/* ── Overlays ── */}

            {quickCreate && (
                <QuickCreatePopup
                    x={quickCreate.x}
                    y={quickCreate.y}
                    onConfirm={confirmCreate}
                    onCancel={() => setQuickCreate(null)}
                />
            )}

            {relPicker && (
                <RelationshipPicker
                    x={relPicker.x}
                    y={relPicker.y}
                    sourceElement={relPicker.sourceElement}
                    targetElement={relPicker.targetElement}
                    registries={registries}
                    allowedTypes={selectedDiagram?.relationshipTypes}
                    onSelect={confirmRelationship}
                    onCancel={() => setRelPicker(null)}
                />
            )}

            {nodeCtx && (
                <NodeContextMenu
                    x={nodeCtx.x}
                    y={nodeCtx.y}
                    nodeId={nodeCtx.nodeId}
                    nodeKind={nodeCtx.nodeKind}
                    onClose={() => setNodeCtx(null)}
                    onEditName={() => {
                        // Trigger inline edit via node data update
                        setNodes(prev => prev.map(n => n.id === nodeCtx.nodeId
                            ? { ...n, data: { ...n.data, _triggerEdit: true } } : n));
                    }}
                    onChangeColor={(color) => handleNodeColorChange(nodeCtx.nodeId, color)}
                    onRemoveFromDiagram={() => handleRemoveFromDiagram(nodeCtx.nodeId)}
                    onDeleteFromModel={() => {
                        // For now: remove from diagram only. Full model delete requires server support.
                        handleRemoveFromDiagram(nodeCtx.nodeId);
                    }}
                    onShowProperties={() => {
                        selectElement(nodeCtx.nodeId);
                    }}
                    onShowInCatalog={() => {
                        selectElement(nodeCtx.nodeId);
                        setActiveMode('catalog');
                    }}
                    onFocusElement={() => {
                        setFocusNodeId(nodeCtx.nodeId);
                    }}
                    onShowRelMatrix={() => {
                        setActiveView({ type: 'traceability' });
                    }}
                    onOpenSource={() => {
                        const el = model?.elements[nodeCtx.nodeId];
                        if (!el?.file) return;
                        navigator.clipboard.writeText(el.file).catch(() => {});
                        setSourceToast(el.file);
                    }}
                    onViewKindInOntology={() => {
                        const kind = nodeCtx.nodeKind;
                        // Find which ontology package owns this kind
                        let pkgName: string | null = null;
                        let layerId: string | null = null;
                        for (const pkg of availableOntologies) {
                            for (const layer of pkg.layers) {
                                if (layer.kinds.some(k => k.name === kind)) {
                                    pkgName = pkg.name;
                                    layerId = layer.id;
                                    break;
                                }
                            }
                            if (pkgName) break;
                        }
                        if (!pkgName) return;
                        setSelectedOntologyKind(kind);
                        setExplorerTab('ontologies');
                        setActiveMode('ontology');
                        setActiveView({ type: 'ontology-detail', packageName: pkgName, layerId: layerId ?? undefined });
                    }}
                />
            )}

            {edgeCtx && (
                <EdgeContextMenu
                    x={edgeCtx.x}
                    y={edgeCtx.y}
                    edgeId={edgeCtx.edgeId}
                    relType={edgeCtx.relType}
                    onClose={() => setEdgeCtx(null)}
                    onChangeStyle={(s) => handleEdgeStyleChange(edgeCtx.edgeId, s)}
                    onChangeColor={(c) => handleEdgeColorChange(edgeCtx.edgeId, c)}
                    onToggleLabel={() => handleEdgeLabelToggle(edgeCtx.edgeId)}
                    onDelete={() => setEdges(prev => prev.filter(e => e.id !== edgeCtx.edgeId))}
                />
            )}
        </div>
        </InterconnectionRendererContext.Provider>
    );
}

export function DiagramCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvasInner />
        </ReactFlowProvider>
    );
}

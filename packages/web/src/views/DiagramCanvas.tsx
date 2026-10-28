import { affectedMovementRoutes, routeEntersBody } from '../diagram/ibd-movement-routing';
import { nearestFreePosition } from '../diagram/nearest-free-position';
import { placementRouteConflicts } from '../diagram/ibd-placement-score';
import { draggedPortSlot, legalPortSlot, measuredPortBounds, measurePortEnvelopes, type PortConstraintRect } from '../diagram/ibd-port-constraints';
import { rendererModel } from '../diagram/renderer-model';
import { shortenAutomaticPortRoutes, improvesPlacement } from '../diagram/ibd-port-placement';
import { elbowRoute, attachedRoute, cubicRoutePath, arcRoutePath, polylinePath } from '../diagram/ibd-routing';
import { captureMovementGeometry, movementGeometryChanges, restoreMovementGeometry, type MovementGeometry } from '../diagram/movement-history';
import { restoreIbdGeometry, type IbdResizeHandler } from '../diagram/ibd-resize-integration';
import { ibdRouting, withIbdRouting, mergeRenderedLayout, reconnectRoute, type RoutingLayout, type IbdRoutingType, type IbdRoutingMode } from '../diagram/ibd-routing';
import { IbdRoutingControls } from '../diagram/toolbars/IbdRoutingControls';
// ─── DiagramCanvas ────────────────────────────────────────────────────────────
//
// Interactive diagram canvas with:
//   - Per-view position persistence (the view's @MemoLayout statements)
//   - Palette sidebar (drag-to-create elements)
//   - On-canvas creation (double-click canvas, drop from palette)
//   - Edge drawing (handle-to-handle, relationship type picker)
//   - Node resize, inline name editing, context menus
//   - Edge context menus (style, color, label toggle)
//   - Client-side undo/redo (positions + visual overrides)
//   - Snap-to-grid (20px default)
//   - Workflow node types: Decision, Fork/Join
// ─────────────────────────────────────────────────────────────────────────────

import { confirmDialog } from '../components/AppDialogs';
import { actionDrillSource, childrenOf, definitionSubtree, drillPath, drillTarget, enterLevel } from '../lib/system-navigator';
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
import { requestRelationshipUpdate, saveViewDisplay, sendElementCreate, sendDiagramLayoutUpdate as sendDiagramLayoutUpdateToServer, sendElementUpdate } from '../store/ws-client';
import { useDiagramEmbed } from '../diagram/diagram-embed-context';
import { LAYER_COLORS, REL_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { sysmlIdentifier } from '../authoring';
import { SelectionToolbar } from './SelectionToolbar';
import {
    alignBoxes, matchSize, distributeBoxes,
    type ArrangeBox, type ArrangeResult, type AlignEdge, type SizeMatch, type DistributeAxis,
} from './arrange';
import { FONT, COLOR } from '../styles/tokens';
import { routeOrthogonalEdges, routeDirectOrthogonalEdges, placeConnectorLabels } from './layout';
import type { OrthogonalRouteRequest, RouteObstacle } from './orthogonal-router';
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
    INTERCONNECTION_PORT_SIZE, PORT_LABEL_OFFSET, NESTED_PITCH, NESTED_PIN_INSET, NESTED_HOUSING_DEPTH,
    type PortDisplay, type PortSide, type PortInfo,
} from './templates/interconnection-view';
import { commonDisplayLevels, findFloatingActions, parameterOfHandle, type ActionFlowDisplayLevel, type ActionFlowLaneGrouping, type ActionFlowNesting } from './templates/actionflow-view';
import { isStateElement } from './templates/statetransition-view';
import { bendConnector, type Wall } from './templates/connector-bend';
import { useCaseActorOptions, useCaseMaxDepth, useCaseViewOptions, type UseCaseEdgeStyle } from './templates/use-case-view';
import { templateRegistry } from '../diagram/templates';
import type { TemplateOptionSlices } from '../diagram/template-provider';
import { resolveDiagramProfile } from '../diagram/diagram-profile';
import { hasToolbarContent, resolveDiagramToolbar, type DiagramToolbarContext } from '../diagram/toolbars/diagram-toolbar';
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
import { SeqLifelineNode, SeqSectionNode, SeqOccurrenceNode, SeqFragmentNode } from './SequenceNodes';
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
import { Icon } from './DiagramToolbarControls';
import { resolveLegend } from './templates/legend';
import { landingsFromPoints, type Side as DiagramEdgeSide } from './templates/landing-rules';
import { declaredSubject, definitionIndex, resolveDefinition } from './templates/composition-tree';
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
                onClick={async event => {
                    event.stopPropagation();
                    if (await confirmAnnotationDelete()) data.onDelete?.();
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
/** One owner for rendered edge persistence, including automatic movement
 * geometry. Opaque fields remain alongside the geometry this client owns. */
function captureEdgeLayout(edge: FlowEdge, previous?: DiagramLayout['edges'][string]) {
    const { points: _points, manualRoute: _manual, routingType: _type, labelPoint: _label,
        manualLanding: _landing, sourceSide: _ss, targetSide: _ts, sourceT: _st, targetT: _tt, sourceOffset: oldSourceOffset, targetOffset: oldTargetOffset,
        ...opaque } = (previous ?? {}) as Record<string, unknown>;
    const points = edge.data?.points as Array<{x:number;y:number}> | undefined;
    if (!points?.length) return opaque;
    return { ...opaque, points: points.map(point => ({ ...point })),
        manualRoute: Boolean(edge.data?.manualRoute), routingType: edge.data?.routingType,
        ...(edge.data?.labelPoint ? { labelPoint: edge.data.labelPoint } : {}),
        source: edge.source, target: edge.target,
        sourceSide: edge.data?.sourceSide as DiagramEdgeSide | undefined,
        targetSide: edge.data?.targetSide as DiagramEdgeSide | undefined,
        ...(edge.data?.sourceOffset ? { sourceOffset: {
            ...(oldSourceOffset && typeof oldSourceOffset === 'object' ? oldSourceOffset : {}),
            ...(edge.data.sourceOffset as object),
        } } : {}),
        ...(edge.data?.targetOffset ? { targetOffset: {
            ...(oldTargetOffset && typeof oldTargetOffset === 'object' ? oldTargetOffset : {}),
            ...(edge.data.targetOffset as object),
        } } : {}),
        sourcePortId: edge.data?.sourcePortId as string | undefined,
        targetPortId: edge.data?.targetPortId as string | undefined,
        ...(edge.data?.manualRoute && edge.data?.manualLanding ? { manualLanding: true,
            sourceSide: edge.data.sourceSide as DiagramEdgeSide, targetSide: edge.data.targetSide as DiagramEdgeSide,
            sourceT: edge.data.sourceT as number, targetT: edge.data.targetT as number,
        } : {}),
    };
}

interface MovementRouting {
    before: MovementGeometry;
    replaceManual?: (edgeIds: string[]) => boolean;
}

/**
 * Route around parts grown over their ports. Where that closes a gap a connector
 * needs, the router falls back to a line through a part; such connectors are
 * routed again around the bare parts, which beats crossing one.
 */
function routeClearOfPorts(
    requests: OrthogonalRouteRequest[], clearOfPorts: RouteObstacle[], parts: RouteObstacle[],
    quality: RouteQuality, fixedRoutes: Map<string, Array<{ x: number; y: number }>>,
): Map<string, Array<{ x: number; y: number }>> {
    const options = quality === 'tidy' ? {} : { refineRounds: 0 };
    const routes = routeOrthogonalEdges(requests, clearOfPorts, 18, 'long-first', { ...options, fixedRoutes });
    const blocked = requests.filter(request => {
        if (fixedRoutes.has(request.id)) return false;
        const points = routes.get(request.id), allowed = new Set([...(request.sourceAncestorIds ?? []), ...(request.targetAncestorIds ?? [])]);
        return points && parts.some(part => !allowed.has(part.id) && routeEntersBody(points, part));
    });
    if (!blocked.length) return routes;
    const kept = new Map(fixedRoutes);
    for (const [id, points] of routes) if (!blocked.some(request => request.id === id)) kept.set(id, points);
    const retried = routeOrthogonalEdges(requests, parts, 18, 'long-first', { ...options, fixedRoutes: kept });
    for (const request of blocked) { const points = retried.get(request.id); if (points) routes.set(request.id, points); }
    return routes;
}

function reroutePositionedEdges(
    nodes: FlowNode[],
    edges: FlowEdge[],
    quality: RouteQuality = 'direct',
    forcedPortSize?: number,
    routingType: IbdRoutingType = 'orthogonal',
    endpointsOnly = false,
    movement?: MovementRouting,
    fixedEdgeIds?: Set<string>,
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
    const ancestorsOf = (id: string) => {
        const result: string[] = []; let parent = byId.get(id)?.parentId;
        while (parent && !result.includes(parent)) { result.push(parent); parent = byId.get(parent)?.parentId; }
        return result;
    };
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
            sourceAncestorIds: ancestorsOf(edge.source),
            targetAncestorIds: ancestorsOf(edge.target),
            sourceSide,
            targetSide,
        }];
    });
    if (requests.length === 0) return edges;
    if (endpointsOnly) {
        const byRequest = new Map(requests.map(r => [r.id, r]));
        return edges.map(edge => {
            const request = byRequest.get(edge.id);
            const points = edge.data?.points as Array<{ x: number; y: number }> | undefined;
            if (!request || !points?.length) return edge;
            const first = points[0], last = points[points.length-1];
            if (first.x === request.source.x && first.y === request.source.y
                && last.x === request.target.x && last.y === request.target.y) return edge;
            const { labelPoint: _stale, ...data } = edge.data ?? {};
            return { ...edge, data: { ...data, points: reconnectRoute(points, request.source, request.target) } };
        });
    }
    // A connector must not cut through a part it does not terminate in — the rule
    // a formal IBD is read by. Containers and boards are obstacles too: the router
    // (planOne) already drops any obstacle that ENCLOSES one of the connector's
    // endpoints, so a route to a child still leaves its own parent freely while
    // being kept out of every unrelated board. The diagram FRAME is the drawing
    // surface itself and encloses everything, so it is never an obstacle.
    const bodies = nodes.filter(node => {
        const data = node.data as { isFrame?: boolean };
        return !data.isFrame && node.type !== 'annotationNode';
    });
    const partObstacles = bodies.map(node => ({ id: node.id, ...absOf(node.id), ...sizeOf(node) }))
        .filter(o => o.width > 0 && o.height > 0);
    const obstacles = bodies
        .map(node => {
            // Ports straddle their part's wall. Grow the part's box over the ports
            // on each wall so a connector skirting the part also clears them; a
            // port's own connector starts at its outer face, on that boundary.
            const origin = absOf(node.id), size = sizeOf(node), reach = { left: 0, right: 0, top: 0, bottom: 0 };
            for (const port of (node.data as { ports?: PortInfo[] }).ports ?? []) {
                if (port.nested || !port.side) continue;
                reach[port.side] = Math.max(reach[port.side], renderedPortSize(port, forcedPortSize) / 2);
            }
            return { id: node.id, x: origin.x - reach.left, y: origin.y - reach.top,
                width: size.width + reach.left + reach.right, height: size.height + reach.top + reach.bottom };
        })
        .filter(o => o.width > 0 && o.height > 0);
    const requestById = new Map(requests.map(request => [request.id, request]));
    const affected = movement ? affectedMovementRoutes(requests, nodes, movement.before) : undefined;
    const replacingManual = Boolean(movement?.replaceManual);
    const manualAffected = edges.filter(edge => affected?.has(edge.id) && edge.data?.manualRoute).map(edge => edge.id);
    if (manualAffected.length && movement?.replaceManual && !movement.replaceManual(manualAffected)) return edges;
    const fixedRoutes = new Map<string, Array<{x:number;y:number}>>();
    for (const edge of edges) {
        const request = requestById.get(edge.id);
        const points = edge.data?.points as Array<{x:number;y:number}> | undefined;
        if (!request || !points?.length) continue;
        if (fixedEdgeIds?.has(edge.id) || affected && !affected.has(edge.id)) fixedRoutes.set(edge.id, points);
        else if (edge.data?.manualRoute && !replacingManual)
            fixedRoutes.set(edge.id, reconnectRoute(points, request.source, request.target));
    }
    const automaticRequests = requests.filter(request => !fixedRoutes.has(request.id));
    const routes = movement || routingType === 'manhattan' || routingType === 'orthogonal' && quality === 'tidy'
        ? routeClearOfPorts(requests, obstacles, partObstacles, quality, fixedRoutes)
        : routingType === 'straight' || routingType === 'arc'
        ? new Map(automaticRequests.map(request => [request.id, [request.source, request.target]]))
        : routingType === 'elbow' ? new Map(automaticRequests.map(r => [r.id, elbowRoute(r.source, r.target, r.sourceSide, r.targetSide)]))
        : routeDirectOrthogonalEdges(automaticRequests);
    // A label anchor is a point on the route it belongs to. Once the route has
    // been replanned the old anchor describes a line that no longer exists, and
    // the label is left stranded in empty space. Drop it, and the edge falls
    // back to anchoring on the longest segment of its current route. The tidy
    // pass re-derives proper anchors below, where labels are placed together and
    // can avoid each other.
    const withRoute = (edge: FlowEdge, points: Array<{ x: number; y: number }>): FlowEdge => {
        const { labelPoint: _stale, ...data } = edge.data ?? {};
        const request = requestById.get(edge.id);
        const automaticMovement = movement && (!edge.data?.manualRoute || replacingManual);
        const automaticRoute = automaticMovement || !edge.data?.manualRoute;
        const sourceOrigin = absOf(edge.source), targetOrigin = absOf(edge.target);
        return { ...edge, data: { ...data, points,
            routingType: automaticMovement ? 'manhattan' : movement ? edge.data?.routingType ?? routingType : routingType,
            ...(automaticRoute ? { manualRoute: false, manualLanding: undefined, sourceT: undefined, targetT: undefined,
                sourceOffset: { ...(edge.data?.sourceOffset as object),
                    x: request!.source.x-sourceOrigin.x, y: request!.source.y-sourceOrigin.y,
                    ...(request?.sourceSide ? { side: request.sourceSide } : {}), },
                targetOffset: { ...(edge.data?.targetOffset as object),
                    x: request!.target.x-targetOrigin.x, y: request!.target.y-targetOrigin.y,
                    ...(request?.targetSide ? { side: request.targetSide } : {}), },
            } : {}),
            sourceSide: request?.sourceSide, targetSide: request?.targetSide } };
    };
    const routed = edges.map(edge => {
        const request = requestById.get(edge.id);
        if (!request || fixedEdgeIds?.has(edge.id) || affected && !affected.has(edge.id)) return edge;
        if (edge.data?.manualRoute && !replacingManual) {
            const points = (edge.data.points as Array<{ x: number; y: number }> | undefined) ?? [];
            if (points.length >= 2) return withRoute(edge, reconnectRoute(points, request.source, request.target));
        }
        // A context spoke is a hub-and-spoke line, not an IBD connector: the planner above would route it around the
        // hub's walls and hook it back on itself. It keeps its own shape, bent (or not) by the walls it uses, with
        // its ends following the boxes.
        if (edge.type === 'useCaseEdge' && edge.data?.sourceSide && edge.data?.targetSide) {
            return withRoute(edge, bendConnector(
                request.source, request.target, request.sourceSide as Wall | undefined, request.targetSide as Wall | undefined,
                edge.data.routing as UseCaseEdgeStyle | undefined));
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
    return routed.map(edge => affected && !affected.has(edge.id) || fixedEdgeIds?.has(edge.id) ? edge : labelled.has(edge.id)
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
        const w = Number(node.width ?? (node.style as { width?: number })?.width ?? node.measured?.width ?? 0);
        const h = Number(node.height ?? (node.style as { height?: number })?.height ?? node.measured?.height ?? 0);
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


// ─── Main canvas inner (inside ReactFlowProvider) ─────────────────────────────

const noWrite = () => {};

function DiagramCanvasInner() {
    // An embed (dashboard, document) pins its own diagram and never writes: the
    // layout and model writers below are swapped for no-ops, so no effect or
    // stray handler inside the canvas can persist anything from a read-only view.
    const embed = useDiagramEmbed();
    const readOnly = embed?.readOnly === true;
    const updateNodeInternals = useUpdateNodeInternals();
    const model = useModelStore(s => rendererModel(s.model));
    const storeCreateRelationship = useModelStore(s => s.createRelationship);
    const createRelationship = readOnly ? (noWrite as unknown as typeof storeCreateRelationship) : storeCreateRelationship;
    const registries = useMemo(() => getRegistries(model), [model]);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const canvasPortSelection = useModelStore(s => s.canvasPortSelection);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const storeSelectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectedDiagramId = embed ? embed.diagramId : storeSelectedDiagramId;
    useEffect(() => { useModelStore.setState({ canvasPortSelection: null }); }, [selectedDiagramId]);
    const sendDiagramLayoutUpdate = readOnly ? (noWrite as unknown as typeof sendDiagramLayoutUpdateToServer) : sendDiagramLayoutUpdateToServer;
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
    const storeSetNodeLayout = useModelStore(s => s.setNodeLayout);
    const storeMergeDiagramLayouts = useModelStore(s => s.mergeDiagramLayouts);
    const storeUpdateDiagramElementIds = useModelStore(s => s.updateDiagramElementIds);
    const setNodeLayout = readOnly ? (noWrite as unknown as typeof storeSetNodeLayout) : storeSetNodeLayout;
    const mergeDiagramLayouts = readOnly ? (noWrite as unknown as typeof storeMergeDiagramLayouts) : storeMergeDiagramLayouts;
    const updateDiagramElementIds = readOnly ? (noWrite as unknown as typeof storeUpdateDiagramElementIds) : storeUpdateDiagramElementIds;
    const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();

    const [nodes, setNodes] = useNodesState<FlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
    const nodesRef = useRef<FlowNode[]>([]);
    const edgesRef = useRef<FlowEdge[]>([]);


    // The active interconnection profile (base vs dedicated IBD), resolved per
    // view below. Held in a ref so the geometry rAF callbacks can read its route
    // quality without being torn down and rebuilt on every view switch.
    const activeRendererRef = useRef(baseInterconnectionRenderer);
    const routing = ibdRouting(selectedDiagramId ? diagramLayouts[selectedDiagramId] : undefined);
    const [routePreviewMode, setRoutePreviewMode] = useState<IbdRoutingMode | null>(null);
    const routingRef = useRef(routing);
    routingRef.current = routing;
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
    const geometryResizeEndpointsRef = useRef(false);
    const nodeDragStartRef = useRef<{ id: string; x: number; y: number; geometry: MovementGeometry; autoLayout: boolean } | null>(null);
    const nodeDragCancelledRef = useRef(false);
    type RouteSnapshot = { geometry: MovementGeometry; routing: { type: IbdRoutingType; mode: IbdRoutingMode } };
    const routeGestureRef = useRef<RouteSnapshot | null>(null);
    const routeCancelledRenderRef = useRef(false);
    const portGestureRef = useRef<{ ownerId: string; portId: string; diagramId: string; geometry: MovementGeometry; autoLayout: boolean; walls: Record<string, PortSide> | undefined; nextWalls?: Record<string, PortSide> } | null>(null);
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

    const flushGeometryUpdate = useCallback((movementBefore?: MovementGeometry) => {
        if (geometryFrameRef.current !== null) cancelAnimationFrame(geometryFrameRef.current);
        geometryFrameRef.current = null;
        const forced = activeRendererRef.current.forcedPortSize;
        // Live edits never reflow unrelated ports or grow a part. Movement/resize
        // already own their geometry; an explicit port move chooses a legal slot.
        const stableNodes = repositionNestedPins(snapPortsToWall(nodesRef.current, forced));
        nodesRef.current = stableNodes;
        const shouldReroute = geometryNeedsRerouteRef.current;
        geometryNeedsRerouteRef.current = false;
        const resizeEndpoints = geometryResizeEndpointsRef.current;
        geometryResizeEndpointsRef.current = false;
        if (shouldReroute || resizeEndpoints) {
            const before = movementBefore ?? portGestureRef.current?.geometry ?? nodeDragStartRef.current?.geometry;
            const routedEdges = reroutePositionedEdges(stableNodes, edgesRef.current,
                before ? 'direct' : shouldReroute ? activeRendererRef.current.routeQuality : 'direct',
                forced, routingRef.current.type, !shouldReroute, before ? { before } : undefined);
            edgesRef.current = routedEdges;
            setEdges(routedEdges);
        }
        setNodes(stableNodes);
    }, [setNodes, setEdges]);

    const scheduleGeometryUpdate = useCallback((nextNodes: FlowNode[], reroute = true) => {
        nodesRef.current = nextNodes;
        geometryNeedsRerouteRef.current ||= reroute;
        if (geometryFrameRef.current !== null) return;
        geometryFrameRef.current = requestAnimationFrame(() => flushGeometryUpdate());
    }, [flushGeometryUpdate]);
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
    const [toolbarCollapsed, setToolbarCollapsed] = useState(true);
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

    // An embed's frame changes size — full screen, a narrower window — and a camera fitted to the old size frames the diagram
    // wrongly in the new one. Refit whenever the drawing surface resizes.
    useEffect(() => {
        const surface = canvasRef.current;
        if (!readOnly || !surface || typeof ResizeObserver === 'undefined') return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let first = true;
        const observer = new ResizeObserver(() => {
            // The initial observation is the mount; the layout pass frames that.
            if (first) { first = false; return; }
            clearTimeout(timer);
            timer = setTimeout(() => fitDiagramFrameRef.current(200), 120);
        });
        observer.observe(surface);
        return () => { clearTimeout(timer); observer.disconnect(); };
    }, [readOnly]);

    useEffect(() => {
        const surface = canvasRef.current;
        if (!surface) return;
        const onWheel = (event: WheelEvent) => {
            const flow = surface.querySelector<HTMLElement>('.memo-diagram-canvas');
            if (!flow || !(event.target instanceof Node) || !flow.contains(event.target)) return;
            // Plain two-finger scrolling still pans; pinch and modifier-wheel
            // zoom gently around the cursor instead of amplifying each event.
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            const viewport = getViewport();
            const bounds = flow.getBoundingClientRect();
            const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1);
            const zoom = Math.max(0.1, Math.min(3, viewport.zoom * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003)));
            const ratio = zoom / viewport.zoom;
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            void setViewport({ x: x - (x - viewport.x) * ratio, y: y - (y - viewport.y) * ratio, zoom });
        };
        surface.addEventListener('wheel', onWheel, { capture: true, passive: false });
        return () => surface.removeEventListener('wheel', onWheel, true);
    }, [getViewport, setViewport]);

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
        /** The parameter each drawn end is, when the edge was drawn between two action-flow pins. */
        sourceFeature?: string; targetFeature?: string;
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
    const currentLayout = selectedDiagramId ? diagramLayouts[selectedDiagramId] : undefined;
    // Per-view renderer profile: a view opts into the dedicated IBD canvas via
    // its layout companion (`canvas.renderer`); everything else keeps the base
    // profile, so no other diagram is affected by the IBD rules.
    // ─── What the view declares it shows ────────────────────────────────
    //
    // These come from the view's SysML, not from its layout companion. The
    // companion records geometry — where a box was dragged to, which wall a
    // port straddles — and a statement about whether the drawing names its
    // ports at all is not geometry. It survives a layout reset, it is
    // reviewable in the model, and it is the view's own intent.
    //
    // `viewDeclared` reads an authored value; absent, the renderer default
    // stands, so a view that says nothing behaves exactly as before.
    const viewDeclared = selectedDiagram?.properties;
    const declaredBool = (name: string): boolean | undefined => {
        const raw = viewDeclared?.[name]?.trim().toLowerCase();
        return raw === 'true' ? true : raw === 'false' ? false : undefined;
    };
    // `all` and `none` are SysML keywords, so the ontology's literals are
    // `everything` and `hidden`; map them back to the display modes they name.
    const DISPLAY_LITERAL: Record<string, string> = { everything: 'all', hidden: 'none' };
    const declaredEnum = (name: string): string | undefined => {
        const literal = viewDeclared?.[name]?.trim().split('::').pop();
        return literal ? (DISPLAY_LITERAL[literal] ?? literal) : undefined;
    };

    const isIbdView = (selectedDiagram?.viewKind ?? diagramMeta?.viewKind) === 'interconnection';
    const activeRenderer = resolveInterconnectionRenderer(
        declaredEnum('rendererProfile') ?? (isIbdView ? 'ibd' : undefined),
    );
    activeRendererRef.current = activeRenderer;
    const layoutProviderId = selectedLayoutProviderId(currentLayout);
    const autoLayoutEnabled = currentLayout?.canvas?.autoLayout !== false;
    const flowAnimationEnabled = currentLayout?.canvas?.flowAnimation ?? declaredBool('flowAnimation') === true;
    const showIbdPortText = declaredBool('showPortText') !== false;
    const showIbdConnectionText = declaredBool('showConnectionText') !== false;
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
    // Per-edge label overrides authored on the view's layout edges
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
        const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, autoLayout: false } };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
    }, [selectedDiagramId, mergeDiagramLayouts]);

    const ibdResizeStartRef = useRef<FlowNode[] | null>(null);
    const ibdResizeGeometryRef = useRef<MovementGeometry | null>(null);
    const ibdResizeAutomaticRef = useRef(false);
    const handleIbdResize = useCallback<IbdResizeHandler>((phase, proposal) => {
        if (readOnly || !selectedDiagramId) return;
        if (phase === 'start') {
            ibdResizeStartRef.current = nodesRef.current;
            ibdResizeGeometryRef.current = captureMovementGeometry(nodesRef.current, edgesRef.current);
            ibdResizeAutomaticRef.current = useModelStore.getState().diagramLayouts[selectedDiagramId]?.canvas?.autoLayout !== false;
            return;
        }
        const before = ibdResizeGeometryRef.current;
        if (!ibdResizeStartRef.current || !before) return;
        suppressInspectUntilRef.current = Date.now() + 250;
        const raw = proposal as FlowNode[];
        if (phase === 'update') {
            geometryResizeEndpointsRef.current = true; scheduleGeometryUpdate(raw, false); return;
        }
        if (geometryFrameRef.current !== null) cancelAnimationFrame(geometryFrameRef.current);
        geometryFrameRef.current = null;
        geometryNeedsRerouteRef.current = false; geometryResizeEndpointsRef.current = false;
        ibdResizeStartRef.current = null; ibdResizeGeometryRef.current = null;
        const restore = (snapshot: MovementGeometry, changed: ReturnType<typeof movementGeometryChanges>) => {
            const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, snapshot, changed);
            nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
            for (const node of restored.nodes) if (changed.nodes.has(node.id)) positionCacheRef.current.set(node.id, {...node.position});
            setNodes(restored.nodes); setEdges(restored.edges);
        };
        if (phase === 'cancel') {
            restore(before, movementGeometryChanges(before, captureMovementGeometry(nodesRef.current, edgesRef.current)));
            return;
        }
        // The resize solver owns size/containment. No global reflow may expand
        // an owner, align a saved port, or alter the stationary-child contract.
        const next = repositionNestedPins(snapPortsToWall(raw, activeRendererRef.current.forcedPortSize));
        let cancelled = false;
        const routed = reroutePositionedEdges(next, edgesRef.current, 'tidy',
            activeRendererRef.current.forcedPortSize, routingRef.current.type, false, {
                before, replaceManual: ids => {
                    const accepted = window.confirm(`Resize this part? This replaces manual bends on ${ids.length} affected connector(s). Undo restores them exactly.`);
                    cancelled = !accepted;
                    return accepted;
                },
            });
        if (cancelled) {
            restore(before, movementGeometryChanges(before, captureMovementGeometry(nodesRef.current, edgesRef.current)));
            return;
        }
        const after = captureMovementGeometry(next, routed), changed = movementGeometryChanges(before, after);
        if (!changed.nodes.size) {
            restore(before, movementGeometryChanges(before, captureMovementGeometry(nodesRef.current, edgesRef.current)));
            return;
        }
        const previousAutomatic = ibdResizeAutomaticRef.current;
        const apply = (snapshot: MovementGeometry, automatic: boolean) => {
            restore(snapshot, changed);
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? {nodes:{},edges:{}};
            mergeDiagramLayouts({[selectedDiagramId]:{...previous,canvas:{...previous.canvas,autoLayout:automatic}}});
            setLayoutEditVersion(version => version + 1);
        };
        apply(after, false);
        pushUndo({do:()=>apply(after,false),undo:()=>apply(before,previousAutomatic)});
    }, [readOnly, selectedDiagramId, scheduleGeometryUpdate, setNodes, setEdges, mergeDiagramLayouts, pushUndo]);

    // Manual geometry is the user's document state, not an explicit export
    // operation. Persist it after interaction settles so there is no separate
    // Save Layout workflow and rapid pointer moves do not flood the backend.
    useEffect(() => {
        if (routeCancelledRenderRef.current) { routeCancelledRenderRef.current = false; return; }
        if (portGestureRef.current || routeGestureRef.current || ibdResizeStartRef.current || !selectedDiagramId || isLayouting || nodes.length === 0 || layoutEditVersion === 0) return;
        const timer = window.setTimeout(() => {
            if (portGestureRef.current || routeGestureRef.current || ibdResizeStartRef.current) return;
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            const viewport = getViewport();
            const layout = withContextChildCoordinates(mergeRenderedLayout(previous, {
                nodes: autoLayoutEnabled ? previous.nodes : Object.fromEntries(nodes.filter(node => node.type !== 'annotationNode').map(node => [node.id, {
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
                    ...(Number(node.width ?? node.style?.width ?? node.measured?.width) > 0
                        ? { width: Number(node.width ?? node.style?.width ?? node.measured?.width) } : {}),
                    ...(Number(node.height ?? node.style?.height ?? node.measured?.height) > 0
                        ? { height: Number(node.height ?? node.style?.height ?? node.measured?.height) } : {}),
                    ports: { ...previous.nodes[node.id]?.ports, ...Object.fromEntries(
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
                    ) },
                }])),
                edges: Object.fromEntries(edges.map(edge => [edge.id,
                    captureEdgeLayout(edge, previous.edges?.[edge.id])])),
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
                    autoLayout: autoLayoutEnabled,
                },
            } as DiagramLayout));
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
    // An embed is the opposite trade: it is a fixed-height figure on a page
    // with an "Open diagram" link beside it, so whole beats legible there.
    const fitMinZoom = readOnly ? 0.1 : viewKind === 'interconnection' ? 0.72 : viewKind === 'general' ? 0.12 : 0.8;

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
    const fitDiagramFrameRef = useRef(fitDiagramFrame);
    fitDiagramFrameRef.current = fitDiagramFrame;
    // General template mode
    const isGeneralTemplate = viewKind === 'general';
    const isUseCaseDiagram = selectedDiagram?.diagramType === 'ucd';
    const [generalMode, setGeneralMode] = useState<GeneralViewMode>('graph');
    // The toolbar dock (below) is selected by the same DiagramProfile the
    // template dispatch uses — one enum, two consumers, so they can never
    // disagree about which diagram this is. See diagram/toolbars/diagram-toolbar.tsx.
    const diagramProfile = resolveDiagramProfile({
        viewKind, diagramType: selectedDiagram?.diagramType, generalMode,
    });
    const activeToolbar = resolveDiagramToolbar(diagramProfile);
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
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [collapsedInterconnectionNodes, setCollapsedInterconnectionNodes] = useState<Set<string>>(new Set());
    const [focusedInterconnectionId, setFocusedInterconnectionId] = useState<string | null>(null);
    const [interconnectionPortDisplay, setInterconnectionPortDisplay] = useState<PortDisplay>('all');
    const [interconnectionConnectionDisplay, setInterconnectionConnectionDisplay] = useState<'summary' | 'all' | 'none'>('summary');
    const [interconnectionLegendOpen, setInterconnectionLegendOpen] = useState(false);
    const [expandedActionNodes, setExpandedActionNodes] = useState<Set<string>>(new Set());
    const saveIbdDisplay = useCallback((patch: { portDisplay?: PortDisplay; connectionDisplay?: 'summary' | 'all' | 'none' }) => {
        if (!selectedDiagramId) return;
        // A view's display is part of the view's declaration, not of its layout.
        void saveViewDisplay(selectedDiagramId, patch).catch(error => console.warn('[View] display not saved:', error));
    }, [selectedDiagramId]);
    const [focusedActionId, setFocusedActionId] = useState<string | null>(null);
    // The levels drilled through, outermost first. A drill that lands on a definition (a usage is made of the
    // definition it is typed by) has no composition or parent-action chain back to where it came from, so the
    // way out is the way in, not a reconstruction.
    const [interconnectionTrail, setInterconnectionTrail] = useState<string[]>([]);
    const [actionTrail, setActionTrail] = useState<string[]>([]);
    const [actionFlowNesting, setActionFlowNesting] = useState<ActionFlowNesting>('flat');
    // State machine nesting: composites folded in place, or one drilled into.
    const [collapsedStateNodes, setCollapsedStateNodes] = useState<Set<string>>(new Set());
    const [focusedStateId, setFocusedStateId] = useState<string | null>(null);
    const [nodeDirections, setNodeDirections] = useState<Map<string, 'vertical' | 'horizontal'>>(new Map());
    const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Drill-down breadcrumb: composition ancestry of the focused IBD part.
    const interconnectionPath = useMemo(
        () => drillPath(interconnectionTrail, focusedInterconnectionId, compositionPath(model, focusedInterconnectionId)),
        [model, focusedInterconnectionId, interconnectionTrail],
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
        return drillPath(actionTrail, focusedActionId, path);
    }, [model, focusedActionId, actionTrail]);
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
    /** Containers that are themselves children — nested inside another container.
     *  The frame (root) stays expanded so its parts are visible; only nested
     *  containers start collapsed. */
    const nestedInterconnectionContainerIds = useMemo(() => {
        if (!model) return [] as string[];
        const compositionChildren = new Set(
            model.relationships
                .filter(r => COMPOSITION_REL_TYPES.has(r.type))
                .map(r => r.targetId),
        );
        return interconnectionContainerIds.filter(id => compositionChildren.has(id));
    }, [model, interconnectionContainerIds]);

    // Fresh per-diagram state: honor the view's declared layoutHint
    useEffect(() => {
        setLayoutEditVersion(0);
        // A `layoutHint: tree` on a selection that composes nothing draws a row
        // of orphan boxes; ask the tree itself whether there is one.
        const hint = selectedDiagram?.properties?.layoutHint;
        const wantsUsageLevel = hint === 'tree' || hint === 'containment';
        const generalTree = model
            ? buildGeneralViewTree(model, viewpointFilter, selectedDiagram?.relationshipTypes,
                viewElementOf(model, selectedDiagram), wantsUsageLevel)
            : undefined;
        setGeneralMode(resolveGeneralMode(
            selectedDiagram?.properties, (generalTree?.childrenMap.size ?? 0) > 0));
        setUseCaseDisplayLevel(useCaseViewOptions(selectedDiagram?.properties).level ?? 'all');
        // The view's own hint sets how connectors start, and a choice made in the toolbar is written back to it.
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
        setInterconnectionTrail([]);
        setActionTrail([]);
        setInterconnectionPortDisplay((declaredEnum('portDisplay') as 'all' | 'ports' | 'none') ?? 'all');
        setInterconnectionConnectionDisplay((declaredEnum('connectionDisplay') as 'summary' | 'all' | 'none') ?? 'summary');
        setInterconnectionLegendOpen(false);
        setExpandedActionNodes(new Set());
        // A child action-flow view exposes a composite action's descendants
        // (`process::**`). Auto-focus on that action so the template renders
        // its children directly — the same behaviour as drilling in from the
        // parent view.
        let autoFocusAction: string | null = null;
        if (model && selectedDiagram
            && (selectedDiagram.viewKind === 'actionflow' || selectedDiagram.diagramType === 'afd'
                || selectedDiagram.diagramType === 'ofd' || selectedDiagram.diagramType === 'ffd')) {
            const viewEl = viewElementOf(model, selectedDiagram);
            if (viewEl) {
                const byName = new Map<string, MemoElement>();
                for (const el of Object.values(model.elements)) if (!byName.has(el.name)) byName.set(el.name, el);
                for (const entry of (viewEl.attributes?.expose ?? '').split(',')) {
                    const ref = entry.trim();
                    if (!ref) continue;
                    const base = ref.replace(/::\*{1,2}$/, '');
                    if (!base || base === ref) continue;
                    const dotted = base.split('.').pop()!.split('::').pop()!.trim();
                    const subject = model.elements[base] ?? model.elements[dotted] ?? byName.get(dotted);
                    if (!subject) continue;
                    const hasChildren = Object.values(model.elements).some(el => el.parentAction === subject.id);
                    if (hasChildren) { autoFocusAction = subject.id; break; }
                }
            }
        }
        setFocusedActionId(autoFocusAction);
        setActionFlowNesting('flat');
        setFocusedStateId(null);
        positionCacheRef.current.clear();
    }, [selectedDiagramId, selectedDiagram?.properties?.layoutHint, selectedDiagram?.properties?.styleHint, selectedDiagram?.properties?.portDisplay, selectedDiagram?.properties?.connectionDisplay]);

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
        seqFragment: SeqFragmentNode,
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
        // Drilling into a usage opens the definition it is typed by; its parts come with the level.
        for (const focus of [focusedInterconnectionId, focusedActionId]) {
            if (diagramElementIds && model && focus && !diagramElementIds.has(focus)) {
                for (const id of definitionSubtree(model, focus)) diagramElementIds.add(id);
            }
        }

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
    }, [selectedViewpointId, selectedDiagram, model?.viewpoints, hiddenLayers, focusedInterconnectionId, focusedActionId, model?.elements]);

    // Element → child-view index: for each element that is the subject of another
    // view, map its ID to that view's diagram ID. Used by IBD and action-flow
    // templates to show a "navigate to view" button on nodes.
    const childViewIndex = useMemo(() => {
        const index = new Map<string, string>();
        if (!model?.diagrams || !model.elements) return index;
        const byName = new Map<string, MemoElement>();
        for (const el of Object.values(model.elements)) if (!byName.has(el.name)) byName.set(el.name, el);
        const findEl = (ref: string): MemoElement | undefined => {
            if (model.elements[ref]) return model.elements[ref];
            const coloned = ref.split('::').pop()!.trim();
            if (model.elements[coloned]) return model.elements[coloned];
            const dotted = coloned.split('.').pop()!.trim();
            return model.elements[dotted] ?? byName.get(dotted) ?? byName.get(coloned);
        };
        for (const diag of model.diagrams) {
            if (diag.id === selectedDiagramId) continue;
            const viewEl = diag.elementId ? model.elements[diag.elementId] : undefined;
            if (!viewEl) continue;
            let subject = declaredSubject(viewEl.attributes, model.elements);
            if (!subject) {
                for (const entry of (viewEl.attributes?.expose ?? '').split(',')) {
                    const ref = entry.trim();
                    if (!ref) continue;
                    const base = ref.replace(/::\*{1,2}$/, '');
                    if (base && base !== ref) { subject = findEl(base); if (subject) break; }
                }
            }
            if (subject) index.set(subject.id, diag.id);
        }
        // A usage is made of the definition it is typed by (the rule drilling in follows), so a view about
        // the definition is the child view of every usage typed by it, unless a view names that usage itself.
        for (const [usage, definition] of Object.entries(model.workspaceMembership?.definitionOf ?? {})) {
            const view = index.get(definition);
            if (view && !index.has(usage)) index.set(usage, view);
        }
        return index;
    }, [model, selectedDiagramId]);

    // Reverse of childViewIndex: if the current view is a child view that
    // drills into a composite element, find which diagram is its parent (the
    // diagram whose visible elements include that composite).
    const parentViewId = useMemo<string | null>(() => {
        if (!model?.diagrams || !model.elements || !selectedDiagram) return null;
        const viewEl = viewElementOf(model, selectedDiagram);
        if (!viewEl) return null;
        // Find the subject element this child view drills into — same logic as
        // the auto-focus detection in the diagram-change effect.
        const byName = new Map<string, MemoElement>();
        for (const el of Object.values(model.elements)) if (!byName.has(el.name)) byName.set(el.name, el);
        let subjectId: string | undefined;
        for (const entry of (viewEl.attributes?.expose ?? '').split(',')) {
            const ref = entry.trim();
            if (!ref) continue;
            const base = ref.replace(/::\*{1,2}$/, '');
            if (!base || base === ref) continue;
            const dotted = base.split('.').pop()!.split('::').pop()!.trim();
            const subject = model.elements[base] ?? model.elements[dotted] ?? byName.get(dotted);
            if (subject) { subjectId = subject.id; break; }
        }
        if (!subjectId) return null;
        // Find a diagram whose visible elements include this subject.
        for (const diag of model.diagrams) {
            if (diag.id === selectedDiagramId) continue;
            const dViewEl = diag.elementId ? model.elements[diag.elementId] : undefined;
            if (!dViewEl) continue;
            for (const entry of (dViewEl.attributes?.expose ?? '').split(',')) {
                const ref = entry.trim();
                if (!ref) continue;
                const clean = ref.replace(/::\*{1,2}$/, '');
                const dotted = clean.split('.').pop()!.split('::').pop()!.trim();
                const el = model.elements[clean] ?? model.elements[dotted];
                if (el?.id === subjectId) return diag.id;
                // The parent view may expose the composite's owner (e.g.
                // `sampleActionFlow::**`), which indirectly includes the
                // composite as a descendant.
                if (el) {
                    const isAncestor = (ancestorId: string, childId: string): boolean => {
                        const seen = new Set<string>();
                        let cur: string | undefined = childId;
                        while (cur && !seen.has(cur)) {
                            seen.add(cur);
                            const node: (typeof model.elements)[string] | undefined = model.elements[cur];
                            const parent: string | undefined = node?.parentAction ?? node?.owner;
                            if (parent === ancestorId) return true;
                            cur = parent;
                        }
                        return false;
                    };
                    if (isAncestor(el.id, subjectId)) return diag.id;
                }
            }
        }
        // A view about a definition is entered from any view that draws a usage typed by it.
        const typedBy = model.workspaceMembership?.definitionOf ?? {};
        for (const diag of model.diagrams) {
            if (diag.id !== selectedDiagramId && diag.elementIds?.some(id => typedBy[id] === subjectId)) return diag.id;
        }
        return null;
    }, [model, selectedDiagramId, selectedDiagram]);

    const navigateToView = useCallback((diagramId: string) => {
        setActiveView({ type: 'diagram', diagramId });
    }, [setActiveView]);

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
            // The view author decides whether nested containers start folded.
            // `defaultCollapsed = true` on the view folds every container that
            // is itself a child of another container; otherwise parts open
            // fully expanded (the original behaviour).
            const wantsCollapsed = selectedDiagram?.properties?.defaultCollapsed?.trim().toLowerCase() === 'true';
            setCollapsedInterconnectionNodes(
                wantsCollapsed ? new Set(nestedInterconnectionContainerIds) : new Set(),
            );
        }
        seededCollapseRef.current = key;
    }, [model, selectedDiagramId, viewKind, compositeStateIds, nestedInterconnectionContainerIds, selectedDiagram?.properties]);

    // BDD integrity: a block definition diagram must be one connected hierarchy,
    // not a forest of disconnected/floating elements (validateSingleTree).
    /**
     * A block diagram whose selection defines no blocks.
     *
     * Its elements are usages classified by ontology kinds — `action x :
     * ComponentFunction` — which say what something IS WITHOUT defining a block
     * to draw. Drawing them anyway is what put one name on two unrelated boxes,
     * so the canvas says what is missing instead.
     */
    const noDefinitionsIssue = useMemo(() => {
        if (!model || !selectedDiagram || !isGeneralTemplate) return null;
        if (generalMode === 'graph') return null;
        // Usage-level tree/containment operates on part instances, not
        // definitions — a view of usages all typed by the same ontology kind
        // is exactly its purpose, so the "no definitions" warning does not
        // apply.
        const hint = selectedDiagram.properties?.layoutHint;
        if (hint === 'tree' || hint === 'containment') return null;
        const selected = (selectedDiagram.elementIds ?? []).length;
        if (selected === 0) return null;
        const definitions = definitionIndex(model.elements);
        const drawn = (selectedDiagram.elementIds ?? [])
            .map(id => model.elements[id])
            .filter((el): el is MemoElement => Boolean(el))
            .filter(el => resolveDefinition(el, definitions));
        return drawn.length === 0 ? { selected } : null;
    }, [model, selectedDiagram, isGeneralTemplate, generalMode]);

    /** The legend the open view names, if any — drawn as a key on the canvas. */
    const activeLegend = useMemo(
        () => (model ? resolveLegend(viewElementOf(model, selectedDiagram), model) : undefined),
        [model, selectedDiagram]);

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
        const hint = selectedDiagram.properties?.layoutHint;
        return validateSingleTree(buildGeneralViewTree(model, viewpointFilter, selectedDiagram.relationshipTypes, viewElementOf(model, selectedDiagram),
            hint === 'tree' || hint === 'containment'));
    }, [model, selectedDiagram, viewpointFilter]);

    // ─── Decomp callbacks ──────────────────────────────────────────────────────
    // The General template derives its tree from the view's own selection.
    // Only reachable in general's tree/containment modes — the toolbar that
    // triggers expand/collapse only renders there (see the KK-2 mode switcher
    // below), so gating on isGeneralTemplate here would be redundant.

    const buildActiveTree = useCallback(() => {
        if (!model) return undefined;
        const hint = selectedDiagram?.properties?.layoutHint;
        return buildGeneralViewTree(model, viewpointFilter, selectedDiagram?.relationshipTypes, viewElementOf(model, selectedDiagram),
            hint === 'tree' || hint === 'containment');
    }, [model, viewpointFilter, selectedDiagram?.relationshipTypes, selectedDiagram?.properties?.layoutHint]);

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
        // An action is made of the steps it owns, else of its definition's: the part rule, for actions.
        const target = (model && actionDrillSource(model, nodeId)) ?? nodeId;
        setFocusedActionId(target);
        setActionTrail(trail => enterLevel(trail, target));
        setExpandedActionNodes(new Set());
        inspectElement(null);
    }, [inspectElement, model]);

    // Leaving a level (breadcrumb, Parent, All) also forgets the levels below it.
    const focusInterconnection = useCallback((id: string | null) => {
        setFocusedInterconnectionId(id);
        setInterconnectionTrail(trail => (id === null ? [] : trail.slice(0, Math.max(trail.indexOf(id) + 1, 0))));
    }, []);
    const focusAction = useCallback((id: string | null) => {
        setFocusedActionId(id);
        setActionTrail(trail => (id === null ? [] : trail.includes(id) ? trail.slice(0, trail.indexOf(id) + 1) : trail));
    }, []);

    const drillIntoInterconnection = useCallback((nodeId: string) => {
        // A usage is made of its definition's parts: the same rule the Explorer's system navigator
        // follows (lib/system-navigator.ts), so both open the same level.
        const target = (model && drillTarget(model, nodeId)) ?? nodeId;
        setFocusedInterconnectionId(target);
        setInterconnectionTrail(trail => enterLevel(trail, target));
        // The part being descended into becomes the frame, so whatever was
        // folded in the wider diagram says nothing about what should be folded
        // here — start the new level fully open, as the other two views do.
        setCollapsedInterconnectionNodes(new Set());
        inspectElement(null);
    }, [inspectElement, model]);

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
     * editing the layout statements by hand, which is why this is a first-class
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
    }, [model, readOnly, handleIbdResize]);

    // ─── Build nodes from sidecar or ELK ──────────────────────────────────────
    const buildNodesFromSidecar = useCallback((
        rawNodes: FlowNode[], layout: DiagramLayout
    ): FlowNode[] => {
        // A decomposition's geometry is DERIVED: every expand, collapse and V/H
        // toggle recomputes where each node goes, so a saved position is a
        // photograph of one arrangement pinned over all the others. The L1
        // function view still carried `CoordinateWorkflows x:-510 y:242` from
        // some earlier shape, and because those positions were reapplied after
        // each layout, flipping a node to horizontal moved nothing at all and
        // containment dropped its children on top of one another.
        //
        // Same rule as the camera above: hand-placed geometry is restored,
        // derived geometry is derived. The reference implementation keeps
        // positions in memory only, for exactly this reason.
        if (isGeneralTemplate && generalMode !== 'graph') return rawNodes;

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
    }, [isGeneralTemplate, generalMode, ]);

    const moveInterconnectionPort = useCallback((ownerId: string, portId: string, y: number, side?: PortSide) => {
        if (readOnly || !selectedDiagramId) return;
        const owner = nodesRef.current.find(node => node.id === ownerId);
        const target = ((owner?.data.ports ?? []) as PortInfo[]).find(port => port.id === portId);
        if (!owner || !target) return;
        if (!target.nested && activeRendererRef.current.multiWallPortDrag) {
            const requestedSide = side ?? target.side;
            const width = Number(owner.width ?? owner.style?.width), height = Number(owner.height ?? owner.style?.height);
            const slot = draggedPortSlot({ ...target, wallSpan: portWallSpan(target) },
                ((owner.data.ports ?? []) as PortInfo[]).map(port => ({ ...port, wallSpan: portWallSpan(port) })),
                requestedSide, y, width, height);
            if (!slot) return;
            side = slot.side;
            y = side === 'left' || side === 'right' ? slot.y : slot.x;
            if (target.side === side && target.x === slot.x && target.y === slot.y) return;
        }
        if (!portGestureRef.current) {
            const layout = useModelStore.getState().diagramLayouts[selectedDiagramId];
            portGestureRef.current = { ownerId, portId, diagramId: selectedDiagramId, geometry: captureMovementGeometry(nodesRef.current, edgesRef.current),
                autoLayout: layout?.canvas?.autoLayout !== false, walls: structuredClone(layout?.canvas?.portWalls) };
        }
        suppressInspectUntilRef.current = Date.now() + 250;
        // A preview is local geometry. Placement and wall constraints belong to
        // the one completed transaction, so cancellation never writes settings.
        if (side && !activeRendererRef.current.multiWallPortDrag) {
            portGestureRef.current.nextWalls = { ...portGestureRef.current.walls, [portId]: side };
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
    }, [readOnly, scheduleGeometryUpdate, selectedDiagramId, getViewport]);

    /**
     * Write a dragged port back to the diagram's layout companion. Dragging keeps
     * the canvas responsive by updating node data live; the position only becomes
     * part of the document here, once, on release — so a rebuild no longer throws
     * the drag away, and the websocket sees one update instead of one per frame.
     */
    const commitInterconnectionPort = useCallback((ownerId: string, portId: string) => {
        const start = portGestureRef.current;
        if (!selectedDiagramId || readOnly || !start || start.ownerId !== ownerId || start.portId !== portId) return;
        flushGeometryUpdate(start.geometry);
        let accepted = true;
        const finalized = reroutePositionedEdges(nodesRef.current, edgesRef.current, 'tidy',
            activeRendererRef.current.forcedPortSize, routingRef.current.type, false, {
                before: start.geometry,
                replaceManual: ids => accepted = window.confirm(`Move this port? This replaces manual bends on ${ids.length} affected connector(s). Undo restores them exactly.`),
            });
        if (!accepted) {
            portGestureRef.current = null;
            const changed = movementGeometryChanges(start.geometry, captureMovementGeometry(nodesRef.current, edgesRef.current));
            const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, start.geometry, changed);
            nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
            setNodes(restored.nodes); setEdges(restored.edges);
            return;
        }
        edgesRef.current = finalized; setEdges(finalized);
        const after = captureMovementGeometry(nodesRef.current, edgesRef.current);
        const changed = movementGeometryChanges(start.geometry, after);
        const afterWalls = structuredClone(start.nextWalls ?? start.walls);
        portGestureRef.current = null;
        const apply = (snapshot: MovementGeometry, autoLayout: boolean, walls: Record<string, PortSide> | undefined) => {
            if (geometryFrameRef.current !== null) cancelAnimationFrame(geometryFrameRef.current);
            geometryFrameRef.current = null;
            geometryNeedsRerouteRef.current = false;
            geometryResizeEndpointsRef.current = false;
            const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, snapshot, changed);
            nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
            setNodes(restored.nodes); setEdges(restored.edges);
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            const entries = { ...previous.nodes };
            for (const node of restored.nodes) {
                if (!changed.nodes.has(node.id)) continue;
                positionCacheRef.current.set(node.id, { ...node.position });
                const old = previous.nodes[node.id];
                const ports = { ...old?.ports };
                for (const port of (node.data.ports ?? []) as PortInfo[]) {
                    const value: Record<string, any> = { ...ports[port.id] };
                    for (const key of ['x','y','side','size','alongOffset','faceOuter'] as const) {
                        delete value[key]; if (port[key] !== undefined) value[key] = port[key];
                    }
                    ports[port.id] = value as any;
                }
                entries[node.id] = { ...old, x: node.position.x, y: node.position.y, parent: node.parentId ?? null,
                    width: Number(node.width ?? node.style?.width), height: Number(node.height ?? node.style?.height), ports };
            }
            mergeDiagramLayouts({ [selectedDiagramId]: { ...previous, nodes: entries,
                canvas: { ...previous.canvas, autoLayout, portWalls: walls } } });
            setLayoutEditVersion(version => version + 1);
        };
        if (!changed.nodes.size) {
            routeCancelledRenderRef.current = true;
            const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, start.geometry, changed);
            nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
            setNodes(restored.nodes); setEdges(restored.edges);
            return;
        }
        apply(after, false, afterWalls);
        pushUndo({ do: () => apply(after, false, afterWalls), undo: () => apply(start.geometry, start.autoLayout, start.walls) });
    }, [selectedDiagramId, readOnly, flushGeometryUpdate, setNodes, setEdges, mergeDiagramLayouts, pushUndo]);

    const cancelInterconnectionPort = useCallback((ownerId: string, portId: string) => {
        const start = portGestureRef.current;
        if (!start || start.ownerId !== ownerId || start.portId !== portId) return;
        portGestureRef.current = null;
        if (geometryFrameRef.current !== null) cancelAnimationFrame(geometryFrameRef.current);
        geometryFrameRef.current = null;
        geometryNeedsRerouteRef.current = false;
        geometryResizeEndpointsRef.current = false;
        // A departing view discards its preview; it must not restore into a new scene.
        if (useModelStore.getState().selectedDiagramId !== start.diagramId) return;
        const changed = movementGeometryChanges(start.geometry, captureMovementGeometry(nodesRef.current, edgesRef.current));
        const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, start.geometry, changed);
        nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
        setNodes(restored.nodes); setEdges(restored.edges);
        suppressInspectUntilRef.current = Date.now() + 250;
    }, [setNodes, setEdges]);

    const resizeInterconnectionPort = useCallback((ownerId: string, portId: string, size: number, _axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => {
        if (readOnly || !Number.isFinite(size) || size < 10 || size > 48) return;
        const before = nodesRef.current;
        const next = before.map(node => {
            if (node.id !== ownerId) return node;
            const ports = (node.data.ports ?? []) as PortInfo[];
            const target = ports.find(port => port.id === portId);
            if (!target || (target.size ?? INTERCONNECTION_PORT_SIZE) === size) return node;
            const delta = size - (target.size ?? INTERCONNECTION_PORT_SIZE);
            // Explicit sizing preserves the square's center and chosen wall.
            const proposed = { ...target, x: target.x - delta / 2, y: target.y - delta / 2, size,
                ...(target.nested ? { alongOffset: Math.max(0, (target.alongOffset ?? NESTED_PIN_INSET) - delta / 2) } : {}) };
            if (ports.some(other => other.id !== portId && (target.nested ? other.nested && other.parentId === target.parentId : !other.nested)
                && proposed.x < other.x + (other.size ?? INTERCONNECTION_PORT_SIZE) + 2
                && proposed.x + size + 2 > other.x
                && proposed.y < other.y + (other.size ?? INTERCONNECTION_PORT_SIZE) + 2
                && proposed.y + size + 2 > other.y)) return node;
            return { ...node, data: { ...node.data, ports: ports.map(port => port.id === portId ? proposed : port) } };
        });
        if (next.every((node, index) => node === before[index])) return;
        const changed = new Set([ownerId]);
        const apply = (snapshot: FlowNode[]) => {
            markManualLayout();
            scheduleGeometryUpdate(restoreIbdGeometry(nodesRef.current, snapshot, changed));
            setLayoutEditVersion(version => version + 1);
        };
        apply(next);
        pushUndo({ do: () => apply(next), undo: () => apply(before) });
    }, [readOnly, scheduleGeometryUpdate, markManualLayout, pushUndo]);

    const captureRouteSnapshot = useCallback((): RouteSnapshot => ({
        geometry: captureMovementGeometry([], edgesRef.current), routing: { ...routingRef.current },
    }), []);

    const applyRouteSnapshot = useCallback((snapshot: RouteSnapshot, persist: boolean | 'settings' = true) => {
        if (!selectedDiagramId || readOnly) return;
        routingRef.current = { ...snapshot.routing };
        const restored = restoreMovementGeometry([], edgesRef.current, snapshot.geometry,
            { nodes: new Set<string>(), edges: new Set(snapshot.geometry.edges.map(e => e.id)) });
        edgesRef.current = restored.edges;
        setEdges(restored.edges);
        if (!persist) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId];
        const settings = withIbdRouting(previous, snapshot.routing);
        const layout: DiagramLayout = { ...settings, edges: { ...settings.edges,
            ...Object.fromEntries(restored.edges.filter(edge => persist !== 'settings'
                || typeof (settings.edges[edge.id] as Record<string,unknown> | undefined)?.manualRoute === 'boolean')
                .map(edge => [edge.id, captureEdgeLayout(edge, settings.edges[edge.id])])),
        } };
        if (persist === 'settings') routeCancelledRenderRef.current = true;
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        if (persist === 'settings') sendDiagramLayoutUpdate(selectedDiagramId, layout);
        else if (persist) setLayoutEditVersion(version => version + 1);
    }, [selectedDiagramId, readOnly, setEdges, mergeDiagramLayouts]);

    const beginEdgeRouteMove = useCallback(() => {
        if (readOnly || routeGestureRef.current) return;
        routeGestureRef.current = captureRouteSnapshot();
        setRoutePreviewMode('manual');
    }, [readOnly, captureRouteSnapshot]);

    const cancelEdgeRouteMove = useCallback(() => {
        const before = routeGestureRef.current;
        if (!before) return;
        routeGestureRef.current = null;
        setRoutePreviewMode(null);
        routeCancelledRenderRef.current = true;
        applyRouteSnapshot(before, false);
        suppressInspectUntilRef.current = Date.now() + 250;
    }, [applyRouteSnapshot]);

    const changeIbdRouting = useCallback((patch: { type?: IbdRoutingType; mode?: IbdRoutingMode }) => {
        if (!selectedDiagramId || readOnly) return;
        const before = captureRouteSnapshot();
        const nextRouting = { ...before.routing, ...patch };
        if (JSON.stringify(nextRouting) === JSON.stringify(before.routing)) return;
        const updated = edgesRef.current.map(edge => ({ ...edge, data: { ...edge.data,
            routingType: nextRouting.type, manualRoute: nextRouting.mode === 'manual' } }));
        // Manual type changes keep the authored points byte-for-byte.
        const routed = nextRouting.mode === 'manual' ? updated
            : reroutePositionedEdges(nodesRef.current, updated, activeRendererRef.current.routeQuality,
                activeRendererRef.current.forcedPortSize, nextRouting.type);
        const after: RouteSnapshot = { routing: nextRouting, geometry: captureMovementGeometry([], routed) };
        applyRouteSnapshot(after, 'settings');
        pushUndo({ do: () => applyRouteSnapshot(after, 'settings'), undo: () => applyRouteSnapshot(before, 'settings') });
    }, [selectedDiagramId, readOnly, captureRouteSnapshot, applyRouteSnapshot, pushUndo]);

    const moveEdgeRoute = useCallback((edgeId: string, points: Array<{ x: number; y: number }>) => {
        if (readOnly) return;
        beginEdgeRouteMove();
        suppressInspectUntilRef.current = Date.now() + 250;
        const next = edgesRef.current.map(edge => {
            const data = { ...edge.data, manualRoute: true };
            if (edge.id !== edgeId) return { ...edge, data };
            const landings = landingsFromPoints(nodesRef.current, edge, points);
            return { ...edge, selected: true, data: { ...data, points: points.map(p => ({ ...p })), ...landings } };
        });
        edgesRef.current = next;
        setEdges(next);
    }, [readOnly, beginEdgeRouteMove, setEdges]);

    const commitEdgeRouteMove = useCallback((
        edgeId: string,
        before: Array<{ x: number; y: number }>,
        after: Array<{ x: number; y: number }>,
        wasManual: boolean,
    ) => {
        if (JSON.stringify(before) === JSON.stringify(after)) { cancelEdgeRouteMove(); return; }
        const start = routeGestureRef.current;
        if (!start) return;
        const finish: RouteSnapshot = { geometry: captureMovementGeometry([], edgesRef.current),
            routing: { ...start.routing, mode: 'manual' } };
        routeGestureRef.current = null;
        setRoutePreviewMode(null);
        applyRouteSnapshot(finish);
        pushUndo({ do: () => applyRouteSnapshot(finish), undo: () => applyRouteSnapshot(start) });
    }, [cancelEdgeRouteMove, applyRouteSnapshot, pushUndo]);

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

    const tidyConnectors = useCallback(async () => {
        if (readOnly) return;
        if (edgesRef.current.some(edge => edge.data?.manualRoute) && !await confirmDialog({
            title: 'Re-route connectors?', confirmLabel: 'Re-route',
            message: 'This replaces the hand-drawn bends on this diagram. Node positions will be kept.',
        })) return;
        const before = captureRouteSnapshot();
        const cleared = edgesRef.current.map(edge => ({ ...edge, data: { ...edge.data, manualRoute: false } }));
        const tidied = reroutePositionedEdges(nodesRef.current, cleared, 'tidy', activeRendererRef.current.forcedPortSize, routingRef.current.type);
        const after: RouteSnapshot = { routing: { ...before.routing, mode: 'automatic' }, geometry: captureMovementGeometry([], tidied) };
        if (JSON.stringify(before) === JSON.stringify(after)) return;
        applyRouteSnapshot(after);
        pushUndo({ do: () => applyRouteSnapshot(after), undo: () => applyRouteSnapshot(before) });
    }, [readOnly, captureRouteSnapshot, applyRouteSnapshot, pushUndo]);

    const shortenPortRoutes = useCallback((includeSaved = false) => {
        if (readOnly || !selectedDiagramId || routingRef.current.mode !== 'automatic') return;
        const layout = useModelStore.getState().diagramLayouts[selectedDiagramId];
        if (includeSaved && !window.confirm('Automatically place all ordinary ports? This replaces their saved positions and wall choices. Part positions and sizes stay fixed. Undo restores the previous placement.')) return;
        const before = captureMovementGeometry(nodesRef.current, edgesRef.current);
        const evaluate = (nodes: FlowNode[], cheap = false, quick = false) => {
            const edges = reroutePositionedEdges(nodes, edgesRef.current, cheap || quick ? 'direct' : activeRendererRef.current.routeQuality,
                activeRendererRef.current.forcedPortSize, cheap ? 'orthogonal' : routingRef.current.type);
            let length = 0, bends = 0;
            for (const edge of edges) {
                const points = attachedRoute((edge.data?.points ?? []) as Array<{ x: number; y: number }>,
                    routingRef.current.type, edge.data?.sourceSide as PortSide, edge.data?.targetSide as PortSide);
                for (let i = 1; i < points.length - 1; i++) {
                    const a = points[i-1], b = points[i], c = points[i+1];
                    if (Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)) > 1e-6) bends++;
                }
                const type = routingRef.current.type;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', type === 'curved' ? cubicRoutePath(points) : type === 'arc' ? arcRoutePath(points, false)
                    : type === 'rounded' ? activeRendererRef.current.edgePath(points, { edgeId: edge.id,
                        allEdges: edges.map(e => ({ id: e.id, points: e.data?.points as any })) }) : polylinePath(points));
                length += path.getTotalLength();
            }
            return { edges, length, bends, ...(includeSaved ? placementRouteConflicts(nodes, edges) : {}) };
        };
        const peerEnvelopes = new Map<string, PortConstraintRect[]>();
        const placementOptions = {
            allWalls: true, includeSaved, orderWalls: includeSaved,
            legal: (owner: FlowNode, port: PortInfo, side: PortSide, along: number, candidateNodes: FlowNode[]) => {
                const size = renderedPortSize(port, activeRendererRef.current.forcedPortSize);
                const elements = [...document.querySelectorAll<HTMLElement>('.react-flow__node')];
                const element = elements.find(el => el.dataset.id === owner.id);
                const glyph = element && [...element.querySelectorAll<HTMLElement>('[data-ibd-port]')].find(el => el.dataset.ibdPort === port.id);
                const ancestors = new Set<string>(); let parent = owner.parentId;
                while (parent && !ancestors.has(parent)) { ancestors.add(parent); parent = nodesRef.current.find(n => n.id === parent)?.parentId; }
                const proposed = { ...port, side };
                const bounds = element && glyph ? measuredPortBounds(element, glyph, size,
                    activeRendererRef.current.portLabelPlacement(proposed, { labelOffset: size + PORT_LABEL_OFFSET }), ancestors, getViewport().zoom, peer => {
                        const id = peer.dataset.ibdPort;
                        const candidateOwner = candidateNodes.find(n => (n.data.ports as PortInfo[] | undefined)?.some(p => p.id === id));
                        const candidate = (candidateOwner?.data.ports as PortInfo[] | undefined)?.find(p => p.id === id);
                        const peerOwner = peer.closest<HTMLElement>('.react-flow__node');
                        if (!candidate || !candidateOwner || !peerOwner) return undefined;
                        const peerSize = renderedPortSize(candidate,activeRendererRef.current.forcedPortSize);
                        const key = JSON.stringify([id,candidate.side,peerSize]);
                        let envelopes = peerEnvelopes.get(key);
                        if (!envelopes) {
                            envelopes = measurePortEnvelopes(peerOwner,peer,peerSize,
                                activeRendererRef.current.portLabelPlacement(candidate,{labelOffset:peerSize+PORT_LABEL_OFFSET}),getViewport().zoom);
                            peerEnvelopes.set(key,envelopes);
                        }
                        const a = element.getBoundingClientRect(), b = peerOwner.getBoundingClientRect(), zoom = getViewport().zoom;
                        return envelopes.map(rect => ({...rect,x:rect.x+candidate.x+(b.x-a.x)/zoom,y:rect.y+candidate.y+(b.y-a.y)/zoom}));
                    }) : undefined;
                return legalPortSlot({ ...port, wallSpan: portWallSpan(port) }, owner.data.ports as PortInfo[], side, along,
                    Number(owner.width ?? owner.style?.width), Number(owner.height ?? owner.style?.height), bounds);
            },
        };
        let result = shortenAutomaticPortRoutes(nodesRef.current, edgesRef.current, layout,
            nodes => evaluate(nodes, includeSaved), includeSaved ? 4096 : 128, placementOptions);
        if (result.nodes === nodesRef.current) return;
        let routed = includeSaved ? evaluate(result.nodes) : undefined;
        if (routed) {
            const seed = result, seedRoutes = routed;
            const original = evaluate(nodesRef.current);
            const conflicts = placementRouteConflicts(result.nodes, routed.edges).byEdge;
            const refined = shortenAutomaticPortRoutes(result.nodes, routed.edges, layout,
                nodes => evaluate(nodes, false, true), 32, { ...placementOptions,
                    priority: (owner, port) => edgesRef.current.reduce((sum, edge) => sum + (
                        edge.source === owner.id && edge.data?.sourcePortId === port.id
                        || edge.target === owner.id && edge.data?.targetPortId === port.id
                            ? conflicts[edge.id] ?? 0 : 0), 0),
                });
            const refinedRoutes = evaluate(refined.nodes);
            const ordered = shortenAutomaticPortRoutes(refined.nodes, refinedRoutes.edges, layout,
                nodes => evaluate(nodes), 16, { ...placementOptions, orderOnly: true });
            const orderedRoutes = evaluate(ordered.nodes);
            let best = original;
            let bestNodes = nodesRef.current;
            if (improvesPlacement(seedRoutes, best, original)) { best = seedRoutes; bestNodes = seed.nodes; }
            if (improvesPlacement(refinedRoutes, best, original)) { best = refinedRoutes; bestNodes = refined.nodes; }
            if (improvesPlacement(orderedRoutes, best, original)) { best = orderedRoutes; bestNodes = ordered.nodes; }
            if (bestNodes === nodesRef.current) return;
            result = { ...result, nodes: bestNodes, edges: best.edges };
            routed = best;
        }
        const after = captureMovementGeometry(result.nodes, routed?.edges ?? result.edges);
        const changed = movementGeometryChanges(before, after);
        const previousAuto = layout?.canvas?.autoLayout !== false;
        const apply = (snapshot: MovementGeometry, autoLayout: boolean) => {
            const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, snapshot, changed);
            nodesRef.current = restored.nodes; edgesRef.current = restored.edges;
            setNodes(restored.nodes); setEdges(restored.edges);
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            const entries = { ...previous.nodes };
            for (const node of restored.nodes) {
                if (!changed.nodes.has(node.id)) continue;
                const old = previous.nodes[node.id] ?? { x: node.position.x, y: node.position.y, parent: node.parentId ?? null };
                const ports = { ...old.ports };
                for (const port of (node.data.ports ?? []) as PortInfo[]) {
                    const value: Record<string, any> = { ...ports[port.id] };
                    for (const key of ['x','y','side','size','alongOffset','faceOuter'] as const) {
                        delete value[key]; if (port[key] !== undefined) value[key] = port[key];
                    }
                    ports[port.id] = value as any;
                }
                entries[node.id] = { ...old, ports };
            }
            mergeDiagramLayouts({ [selectedDiagramId]: { ...previous, nodes: entries, canvas: { ...previous.canvas, autoLayout } } });
            setLayoutEditVersion(v => v + 1);
        };
        apply(after, false);
        pushUndo({ do: () => apply(after, false), undo: () => apply(before, previousAuto) });
    }, [readOnly, selectedDiagramId, setNodes, setEdges, pushUndo, mergeDiagramLayouts, getViewport]);

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
            const hasSavedGeometry = Object.keys(savedLayout?.nodes ?? {}).length > 0;
            const initialNodes = [...positionedModel, ...annotationNodes(savedLayout)];
            // Loading authored geometry never owns permission to move ports or
            // grow their owners. Explicit placement is a separate transaction.
            const placed = hasSavedGeometry ? initialNodes : resolveWallPortOverlaps(initialNodes, forcedSize);
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
                const savedRouting = savedEdge as (typeof savedEdge & {
                    manualRoute?: boolean; routingType?: string; labelPoint?: {x:number;y:number}; sourceOffset?: object; targetOffset?: object;
                }) | undefined;
                const ownsPoints = Boolean(savedPoints?.length && (
                    typeof savedRouting?.manualRoute === 'boolean' || routingRef.current.mode === 'manual'));
                return {
                    ...edge,
                    // React Flow's endpoint handles are safe only for one exact
                    // source declaration. Bundles have no single source range;
                    // named and anonymous relationships compiled with a range
                    // can both be updated atomically.
                    reconnectable: Boolean(semanticRelationship?.sourceRange),
                    data: {
                        ...edge.data,
                        routingType: ownsPoints ? savedRouting?.routingType ?? routingRef.current.type : routingRef.current.type,
                        manualRoute: ownsPoints ? savedRouting?.manualRoute ?? true : routingRef.current.mode === 'manual',
                        ...(ownsPoints ? { points: savedPoints,
                            ...(savedEdge?.sourceSide ? {sourceSide:savedEdge.sourceSide} : {}),
                            ...(savedEdge?.targetSide ? {targetSide:savedEdge.targetSide} : {}),
                            ...(savedRouting?.sourceOffset ? {sourceOffset:savedRouting.sourceOffset} : {}),
                            ...(savedRouting?.targetOffset ? {targetOffset:savedRouting.targetOffset} : {}),
                            ...(savedRouting?.labelPoint ? { labelPoint: savedRouting.labelPoint } : { labelPoint: undefined }),
                        } : {}),
                        // The landing comes back with the route. Without it the
                        // points alone are restored, and the first time the box
                        // moves the connector goes back to the template's
                        // anchor — losing the placement on reload rather than
                        // on the edit, which is worse because nothing was done.
                        ...(savedPoints?.length && savedEdge?.manualLanding
                            ? {
                                manualLanding: true,
                                sourceSide: savedEdge.sourceSide,
                                sourceT: savedEdge.sourceT,
                                targetSide: savedEdge.targetSide,
                                targetT: savedEdge.targetT,
                            }
                            : {}),
                        flowAnimation: flowAnimationEnabled,
                        onRouteStart: readOnly ? undefined : beginEdgeRouteMove,
                        onRouteCancel: readOnly ? undefined : cancelEdgeRouteMove,
                        onRouteChange: readOnly ? undefined : (points: Array<{ x: number; y: number }>) => moveEdgeRoute(edge.id, points),
                        onRouteChangeComplete: readOnly ? undefined : (before: Array<{ x: number; y: number }>, after: Array<{ x: number; y: number }>, wasManual: boolean) =>
                            commitEdgeRouteMove(edge.id, before, after, wasManual),
                        onInspect: readOnly ? undefined : () => {
                            if (model.relationships.some(relationship => relationship.id === edge.id)) inspectRelationship(edge.id);
                        },
                        onSelect: readOnly ? undefined : (event: React.MouseEvent<SVGPathElement>) => {
                            event.stopPropagation();
                            if (Date.now() < suppressInspectUntilRef.current) return;
                            setEdges(previous => previous.map(candidate => ({
                                ...candidate,
                                selected: candidate.id === edge.id,
                            })));
                        },
                    },
                };
            });
            const positioned = repositionNestedPins(
                snapPortsToWall(hasSavedGeometry ? placed : alignFacingPorts(placed, preparedEdges as FlowEdge[], forcedSize), forcedSize));
            // IBD templates already carry their own interaction callbacks and
            // deliberately bypass generic diagramNode wiring. Resize still owns
            // a canvas transaction, rather than falling back to component state.
            const wired = positioned.map(node => node.type === 'interconnectionNode'
                ? { ...node, data: { ...node.data, onIbdResize: readOnly ? undefined : handleIbdResize, resizeReadOnly: readOnly } }
                : node);
            setNodes(interactive ? applyInteractiveData(wired) : wired);
            const fixedEdgeIds = new Set(preparedEdges.filter(edge => {
                const saved = savedLayout?.edges?.[edge.id] as {manualRoute?:boolean;points?:unknown} | undefined;
                return typeof saved?.manualRoute === 'boolean' && (edge.data as Record<string, unknown>).points === saved.points;
            }).map(edge => edge.id));
            setEdges(reroutePositionedEdges(positioned, preparedEdges, activeRendererRef.current.routeQuality,
                activeRendererRef.current.forcedPortSize, routingRef.current.type, false, undefined, fixedEdgeIds));
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
            const provider = templateRegistry.select({ diagramProfile });
            const treeCallbacks = { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection };
            const options: TemplateOptionSlices = {
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
                    subjectElement: selectedDiagram?.properties?.subjectElement,
                    edgeStyle: useCaseEdgeStyle,
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
                    // The legend is declared in the view's SysML. It used to be
                    // read from the layout companion, which put a statement
                    // about what colour MEANS in the file that records where
                    // boxes sit — and left the SysML legend drawing a key that
                    // coloured nothing.
                    legendColorOf: (element: MemoElement) => activeLegend?.colorFor(element),
                    onPortMove: readOnly ? undefined : moveInterconnectionPort,
                    onPortCommit: readOnly ? undefined : commitInterconnectionPort,
                    onPortCancel: readOnly ? undefined : cancelInterconnectionPort,
                    onPortResize: readOnly ? undefined : resizeInterconnectionPort,
                    onPortSelect: readOnly ? undefined : (portId, inspect) => {
                        useModelStore.setState({ canvasPortSelection: portId });
                        setNodes(previous => previous.map(node => ({ ...node, selected: false })));
                        setEdges(previous => previous.map(edge => ({ ...edge, selected: false })));
                        if (inspect) inspectElement(portId);
                    },
                    layoutProviderId,
                    onNavigateToView: navigateToView,
                    canDrillIn: (partId: string) => !!model && childrenOf(model, partId).length > 0,
                    childViewIds: childViewIndex,
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
                    onNavigateToView: navigateToView,
                    canDrillIn: (actionId: string) => !!model && !!actionDrillSource(model, actionId),
                    childViewIds: childViewIndex,
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
    }, [model, viewpointFilter,
        viewKind, isGeneralTemplate, generalMode, diagramProfile, swimlanesOn, relayoutNonce,
        selectedDiagram?.relationshipTypes, selectedDiagram?.diagramType, selectedDiagram?.name, useCaseDisplayLevel, useCaseEdgeStyle, hiddenUseCaseActorIds,
        layoutProviderId,
        expandedNodes, collapsedInterconnectionNodes, focusedInterconnectionId, interconnectionPortDisplay, interconnectionConnectionDisplay, showIbdPortText, showIbdConnectionText, edgeLabelVisibility, activeRenderer, portWalls, activeLegend, expandedActionNodes, focusedActionId, visibleActionFlowKinds, actionFlowDirection, actionFlowLaneGrouping, actionFlowDisplayLevel, actionFlowNesting, nodeDirections,
        collapsedStateNodes, focusedStateId, toggleStateCollapse, drillIntoState, drillIntoAction,
        toggleExpand, toggleInterconnectionCollapse, toggleActionExpand, toggleDirection, selectedDiagramId,
        drillIntoInterconnection,
        buildNodesFromSidecar, applyInteractiveData, annotationNodes, moveInterconnectionPort, commitInterconnectionPort, cancelInterconnectionPort, resizeInterconnectionPort, beginEdgeRouteMove, cancelEdgeRouteMove, moveEdgeRoute, commitEdgeRouteMove, inspectElement, inspectRelationship, getViewport]);

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
            // An embed never restores the editor's camera: it was saved for
            // a different viewport size, and a page wants the whole diagram.
            if (!readOnly && viewKind !== 'actionflow' && handPlaced && saved?.zoom !== undefined && saved.pan) {
                setViewport({ x: saved.pan.x, y: saved.pan.y, zoom: saved.zoom }, { duration: 300 });
            } else {
                fitDiagramFrame(500);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [layoutVersion, selectedDiagramId, fitDiagramFrame, setViewport, viewKind, readOnly]);

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
        if (readOnly) return;
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, fitDiagramFrame, dismissSelectionTools, undoLastDiagramEdit, redoLastDiagramEdit]);

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
            sourceFeature: parameterOfHandle(sourceHandle),
            targetFeature: parameterOfHandle(targetHandle),
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
        // A choice that reverses the drawn edge puts the dragged-to element on the source end, and its pin with it.
        const reversed = choice.sourceId !== drawnFromId;
        const sourceFeature = reversed ? relPicker.targetFeature : relPicker.sourceFeature;
        const targetFeature = reversed ? relPicker.sourceFeature : relPicker.targetFeature;
        setRelPicker(null);

        const outcome = await createRelationship({
            type: choice.type,
            sourceId: choice.sourceId,
            targetId: choice.targetId,
            direction: choice.direction,
            flowItem: choice.flowItem,
            ...(sourceFeature ? { sourceFeature } : {}),
            ...(targetFeature ? { targetFeature } : {}),
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
        // The same holds for a flow between pins: the rebuild draws it on the right pin handles.
        if (sourceFeature || targetFeature) return;
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

    const restoreMovementSnapshot = useCallback((geometry: MovementGeometry,
        changed: ReturnType<typeof movementGeometryChanges>) => {
        if (geometryFrameRef.current !== null) cancelAnimationFrame(geometryFrameRef.current);
        geometryFrameRef.current = null;
        geometryNeedsRerouteRef.current = false;
        geometryResizeEndpointsRef.current = false;
        const restored = restoreMovementGeometry(nodesRef.current, edgesRef.current, geometry, changed);
        nodesRef.current = restored.nodes;
        edgesRef.current = restored.edges;
        setNodes(restored.nodes);
        setEdges(restored.edges);
        return restored;
    }, [setNodes, setEdges]);

    const cancelNodeMovement = useCallback(() => {
        const start = nodeDragStartRef.current;
        if (!start || nodeDragCancelledRef.current) return;
        const current = captureMovementGeometry(nodesRef.current, edgesRef.current);
        restoreMovementSnapshot(start.geometry, movementGeometryChanges(start.geometry, current));
        nodeDragCancelledRef.current = true;
        suppressInspectUntilRef.current = Date.now() + 250;
    }, [restoreMovementSnapshot]);

    useEffect(() => {
        const cancel = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && nodeDragStartRef.current) cancelNodeMovement();
        };
        window.addEventListener('keydown', cancel);
        return () => window.removeEventListener('keydown', cancel);
    }, [cancelNodeMovement]);

    const onNodeDragStart = useCallback((_: RFAny, node: FlowNode) => {
        nodeDragCancelledRef.current = false;
        nodeDragStartRef.current = { id: node.id, x: node.position.x, y: node.position.y,
            geometry: captureMovementGeometry(nodesRef.current.map(candidate => candidate.id === node.id
                ? { ...candidate, position: { ...node.position } } : candidate), edgesRef.current),
            autoLayout: useModelStore.getState().diagramLayouts[selectedDiagramId ?? '']?.canvas?.autoLayout !== false,
        };
    }, [selectedDiagramId]);

    const onNodeDragStop = useCallback((_: RFAny, node: FlowNode) => {
        const start = nodeDragStartRef.current;
        nodeDragStartRef.current = null;
        // A press that did not move the node is a click for the inspector, not
        // a placement: it must not take the diagram off automatic layout or
        // leave a companion file behind.
        const moved = start?.id === node.id
            && Math.hypot(node.position.x - start.x, node.position.y - start.y) > 2;
        if (nodeDragCancelledRef.current) { nodeDragCancelledRef.current = false; return; }
        if (!moved) {
            if (start) restoreMovementSnapshot(start.geometry,
                movementGeometryChanges(start.geometry, captureMovementGeometry(nodesRef.current, edgesRef.current)));
            return;
        }
        // React Flow emits click after pointer-up. Keep a real drag from
        // opening the inspector as though it were a click.
        suppressInspectUntilRef.current = Date.now() + 250;
        if (!selectedDiagramId) return;
        const { x, y } = node.position;

        if (node.type === 'annotationNode') { setLayoutEditVersion(version => version + 1); return; }

        // A part may not be dropped overlapping a sibling — only a parent may
        // contain a child. An overlapping drop lands at the nearest free spot
        // beside the sibling, and reverts only when the parent has no room.
        let landing: { x: number; y: number } | null = null;
        if (activeRendererRef.current.preventPartOverlap && start) {
            const sizeOf = (n: FlowNode) => ({
                width: Number(n.width ?? (n.style as { width?: number })?.width ?? n.measured?.width ?? 0),
                height: Number(n.height ?? (n.style as { height?: number })?.height ?? n.measured?.height ?? 0),
            });
            const self = sizeOf(node);
            const siblings = nodesRef.current.filter(other => other.id !== node.id && other.parentId === node.parentId
                && !other.hidden && other.type !== 'annotationNode')
                .map(other => ({ ...other.position, ...sizeOf(other) }))
                .filter(other => other.width > 0 && other.height > 0);
            const parent = node.parentId ? nodesRef.current.find(other => other.id === node.parentId) : undefined;
            const parentSize = parent && sizeOf(parent);
            if (self.width > 0 && self.height > 0) {
                landing = nearestFreePosition({ x, y }, self, siblings, 4,
                    parentSize && parentSize.width > 0 ? { x: 0, y: 0, ...parentSize } : undefined);
                if (!landing) {
                    restoreMovementSnapshot(start.geometry,
                        movementGeometryChanges(start.geometry, captureMovementGeometry(nodesRef.current, edgesRef.current)));
                    return;
                }
            }
        }
        // Finish any queued live node/port/endpoint work before freezing the drop.
        flushGeometryUpdate(start.geometry);
        if (landing && (landing.x !== x || landing.y !== y)) {
            const placed = landing;
            nodesRef.current = nodesRef.current.map(other => other.id === node.id ? { ...other, position: placed } : other);
            setNodes(nodesRef.current);
        }
        let accepted = true;
        const finalized = reroutePositionedEdges(nodesRef.current, edgesRef.current, 'tidy',
            activeRendererRef.current.forcedPortSize, routingRef.current.type, false, {
                before: start.geometry,
                replaceManual: ids => accepted = window.confirm(`Move this part? This replaces manual bends on ${ids.length} affected connector(s). Undo restores them exactly.`),
            });
        if (!accepted) {
            restoreMovementSnapshot(start.geometry, movementGeometryChanges(start.geometry,
                captureMovementGeometry(nodesRef.current, edgesRef.current)));
            return;
        }
        edgesRef.current = finalized; setEdges(finalized);
        const before = start.geometry;
        const after = captureMovementGeometry(nodesRef.current, edgesRef.current);
        const changed = movementGeometryChanges(before, after);
        if (!changed.nodes.size && !changed.edges.size) return;
        const diagramId = selectedDiagramId;
        const apply = (geometry: MovementGeometry, autoLayout: boolean) => {
            const restored = restoreMovementSnapshot(geometry, changed);
            const previous = useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} };
            const positions = { ...previous.nodes };
            for (const candidate of restored.nodes) {
                if (!changed.nodes.has(candidate.id)) continue;
                positionCacheRef.current.set(candidate.id, { ...candidate.position });
                positions[candidate.id] = { ...positions[candidate.id], ...candidate.position,
                    parent: candidate.parentId ?? null };
            }
            mergeDiagramLayouts({ [diagramId]: { ...previous, nodes: positions,
                canvas: { ...previous.canvas, autoLayout } } });
            // Both replay directions persist the geometry that is actually mounted.
            setLayoutEditVersion(version => version + 1);
        };
        apply(after, false);
        pushUndo({ do: () => apply(after, false), undo: () => apply(before, start.autoLayout) });
    }, [selectedDiagramId, pushUndo, setNodes, setEdges, mergeDiagramLayouts, flushGeometryUpdate, restoreMovementSnapshot]);

    // ─── Node resize + live orthogonal re-routing ─────────────────────────────

    const onNodesChangeWithResize = useCallback((changes: NodeChange<FlowNode>[]) => {
        // Dimension and position notifications are both emitted while nodes
        // mount and settle, and must not turn a freshly opened diagram into a
        // manual, dirty document. Only a change the user is actively dragging
        // counts as taking the diagram off automatic layout.
        const isAnnotationChange = (change: NodeChange<FlowNode>) =>
            'id' in change && nodesRef.current.find(node => node.id === change.id)?.type === 'annotationNode';
        if (nodeDragCancelledRef.current) changes = changes.filter(change => change.type !== 'position');
        const meaningfulGeometry = changes.some(change => {
            if (change.type === 'dimensions') return change.resizing || change.setAttributes;
            if (change.type !== 'position' || !change.position) return false;
            const node = nodesRef.current.find(node => node.id === change.id);
            return node && (node.position.x !== change.position.x || node.position.y !== change.position.y);
        });
        if (!meaningfulGeometry) {
            const next = applyNodeChanges(changes, nodesRef.current);
            nodesRef.current = next;
            setNodes(next);
            return;
        }
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
        useModelStore.setState({ canvasPortSelection: null });
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
        if (selectedDiagramId) setActiveView({ type: 'diagram', diagramId: selectedDiagramId });
    }, [selectedDiagramId, setActiveView, selectedElementId, setNodes]);

    const onNodeDoubleClick = useCallback((event: RFAny, node: FlowNode) => {
        event?.stopPropagation?.();
        if (node.type === 'annotationNode') return;
        if (viewKind === 'actionflow') {
            if (!model || !actionDrillSource(model, node.id)) return;
            drillIntoAction(node.id);
            return;
        }
        if (viewKind === 'statetransition') {
            const data = node.data as { hasChildren?: boolean; isMachine?: boolean };
            if (!data.hasChildren || data.isMachine) { inspectElement(node.id); return; }
            drillIntoState(node.id);
            return;
        }
        // IBD Properties and drill remain separate actions. The explicit drill
        // controls use the current definition-aware navigation helpers.
        const laneTarget = node.type === 'actionFlowLane'
            ? (node.data as { inspectElementId?: string }).inspectElementId : undefined;
        if (!laneTarget && (node.id.startsWith('__') || node.id.includes('__start') || node.id.includes('__done'))) return;
        inspectElement(laneTarget ?? node.id);
    }, [viewKind, model, inspectElement, drillIntoAction, drillIntoState]);

    const onPaneClick = () => { useModelStore.setState({ canvasPortSelection: null }); dismissSelectionTools(); };

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
    }, [setEdges]);

    const onEdgeDoubleClick = useCallback((event: RFAny, edge: FlowEdge) => {
        event?.stopPropagation?.();
        // In manual mode a connector double-click adds a breakpoint.
        if (edge.type === 'interconnectionEdge' && edge.data?.manualRoute) return;
        if (model?.relationships.some(relationship => relationship.id === edge.id)) inspectRelationship(edge.id);
        else if (model?.elements[edge.id]) inspectElement(edge.id);
    }, [model, inspectElement, inspectRelationship]);

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

    // Assembled once per render for the active DiagramToolbar (see
    // diagram/toolbars/diagram-toolbar.tsx) — a superset bag, like
    // TemplateOptionSlices, since a method reads only its own profile's fields.
    const toolbarCtx: DiagramToolbarContext = {
        model, selectedDiagramId, viewKind, supportsToolbarOperation,
        gridVisible, setGridVisible, setSnapEnabled,
        exportMenuOpen, setExportMenuOpen, exportBusy, exportError, setExportError, downloadDiagram,
        tidyConnectors, autoLayoutEnabled, markManualLayout, mergeDiagramLayouts, setRelayoutNonce,
        ibdRoutingControls: <IbdRoutingControls type={routing.type} mode={routePreviewMode ?? routing.mode}
            onShortenPorts={readOnly ? undefined : () => shortenPortRoutes(false)}
            onPlaceAllPorts={readOnly ? undefined : () => shortenPortRoutes(true)}
            onTypeChange={type => changeIbdRouting({ type })} onModeChange={mode => changeIbdRouting({ mode })} />,
        swimlanesOn, setSwimlanesOn, actionFlowHasStages,
        actionFlowLaneGrouping, setActionFlowLaneGrouping,
        actionFlowDisplayLevels, actionFlowLevelsOpen, setActionFlowLevelsOpen,
        actionFlowDisplayLevel, setActionFlowDisplayLevel,
        actionFlowToolbarPlacement, actionFlowNesting, setActionFlowNesting,
        actionFlowDirection, changeActionFlowDirection,
        actionFlowLegendOpen, setActionFlowLegendOpen,
        actionFlowLegendPlacement, setActionFlowLegendPlacement,
        setExpandedActionNodes, flowFiltersOpen, setFlowFiltersOpen,
        visibleActionFlowKinds, setVisibleActionFlowKinds,
        actionPath, setFocusedActionId: focusAction,
        parentViewId, navigateToParentView: parentViewId ? () => navigateToView(parentViewId) : undefined,
        interconnectionContainerIds, setCollapsedInterconnectionNodes,
        interconnectionPortDisplay, setInterconnectionPortDisplay,
        interconnectionConnectionDisplay, setInterconnectionConnectionDisplay,
        saveIbdDisplay, interconnectionPath, setFocusedInterconnectionId: focusInterconnection,
        addAnnotation, flowAnimationEnabled, setEdges,
        interconnectionLegendOpen, setInterconnectionLegendOpen,
        showIbdPortText, showIbdConnectionText,
        setCollapsedStateNodes, compositeStateIds, statePath, setFocusedStateId,
        useCaseDisplayLevel, setUseCaseDisplayLevel, useCaseDepth,
        useCaseEdgeStyle, setUseCaseEdgeStyle, autoArrangeUseCase,
        viewStyleHint: selectedDiagram?.properties?.styleHint, viewLayoutHint: selectedDiagram?.properties?.layoutHint,
        useCaseActors, hiddenUseCaseActorIds, setHiddenUseCaseActorIds,
        allowedGeneralModes, generalMode, setGeneralMode,
        clearPositionCache: () => positionCacheRef.current.clear(),
        expandAll, collapseAll, resetLayout,
    };

    /** Fit and full screen: shared by the editor's controls and an embed's. */
    const viewControls = (
        <>
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
        </>
    );

    return (
        <InterconnectionRendererContext.Provider value={activeRenderer}>
        <div className="flex flex-1 overflow-hidden">
            {/* ── Palette ── */}
            {!readOnly && <DiagramPalette
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
            />}

            {/* The dock is a sibling of the drawing surface.  Keeping controls
                out of the canvas prevents it from covering nodes or edges. */}
            <div className="flex-1 flex min-w-0">
                {/* Diagram controls */}
                {!toolbarCollapsed && !readOnly && <aside
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
                            width: 94, padding: 6, gap: 6, overflow: 'visible', gridTemplateColumns: 'repeat(2, 38px)', gridAutoRows: 'min-content', gridAutoFlow: 'row',
                            background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}
                    >
                        {/* The dock reads in groups, each under its caption: Layout (arranging the picture), Display
                            (what this kind of diagram shows), Source (editing the SysML), Export (taking it out). */}
                        {activeToolbar.renderCommon(toolbarCtx)}
                        {(() => {
                            const display = activeToolbar.renderProfileControls(toolbarCtx);
                            const trailing = activeToolbar.renderTrailingProfileControls(toolbarCtx);
                            return (hasToolbarContent(display) || hasToolbarContent(trailing)) && (
                                <>
                                    <div className="memo-diagram-tools__caption">Display</div>
                                    {display}
                                    {trailing}
                                </>
                            );
                        })()}

                        {selectedDiagramId && (
                            <>
                                <div className="memo-diagram-tools__caption memo-diagram-tools__caption--source">Source</div>
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

                        {activeToolbar.renderExport(toolbarCtx)}
                    </div>
                ))}
                </aside>}

                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {viewKind === 'interconnection' && toolbarCollapsed && !readOnly && (
                    <div className="shrink-0 border-b bg-white px-3 py-2" aria-label="IBD routing controls">
                        {toolbarCtx.ibdRoutingControls}
                    </div>
                )}
                {/* ── Drawing surface ── */}
                {/* Palette drop and double-click-to-create author model
                    elements, so they answer to the same rule as drawing a
                    connector: a view reads the model, it does not write one. */}
                <div ref={canvasRef} className="flex-1 relative min-h-0"
                    onDragOver={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : onDragOver}
                    onDrop={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : onDrop}
                    onDoubleClick={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : onPaneDoubleClick}
                    // Nodes carry their own double-click (inline rename) and
                    // context-menu handlers; an embed stops both before they
                    // reach a node, so a read-only view cannot start an edit.
                    onDoubleClickCapture={readOnly ? event => { event.stopPropagation(); event.preventDefault(); } : undefined}
                    onContextMenuCapture={readOnly ? event => { event.stopPropagation(); } : undefined}>


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

                {/* Parent-view breadcrumb: child action-flow views show a
                    floating bar to navigate back to the parent diagram. */}
                {parentViewId && !readOnly && (
                    <button
                        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                        style={{
                            background: '#FFFFFF', color: '#1B3A4B', border: '1px solid #D1D5DB',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', fontWeight: 600,
                        }}
                        onClick={() => navigateToView(parentViewId)}
                        title={`Back to ${model?.diagrams?.find(d => d.id === parentViewId)?.name ?? 'parent diagram'}`}
                    >
                        <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                        <span>{model?.diagrams?.find(d => d.id === parentViewId)?.name ?? 'Parent view'}</span>
                    </button>
                )}

                {/* Drill-in breadcrumb: always visible when focused on
                    a nested action, independent of toolbar collapsed state. */}
                {actionPath.length > 0 && !parentViewId && (
                    <div
                        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                        style={{
                            background: '#FFFFFF', color: '#1B3A4B', border: '1px solid #D1D5DB',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)', fontWeight: 600,
                        }}
                    >
                        <button
                            onClick={() => focusAction(actionPath.length > 1 ? actionPath[actionPath.length - 2] : null)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 'none', color: '#1B3A4B', fontWeight: 600, fontSize: 12, padding: 0 }}
                            title={actionPath.length > 1
                                ? `Back to ${model?.elements[actionPath[actionPath.length - 2]]?.name ?? 'parent'}`
                                : 'Back to full action flow'}
                        >
                            <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
                            <span>{actionPath.length > 1
                                ? (model?.elements[actionPath[actionPath.length - 2]]?.name ?? 'Parent')
                                : 'All actions'}</span>
                        </button>
                        {actionPath.length > 1 && (
                            <>
                                <span style={{ color: '#D1D5DB' }}>│</span>
                                <button
                                    onClick={() => focusAction(null)}
                                    style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#2563EB', fontWeight: 500, fontSize: 12, padding: 0 }}
                                    title="Back to full action flow"
                                >
                                    ⌂ All
                                </button>
                            </>
                        )}
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

                {noDefinitionsIssue && !isLayouting && (
                    <div style={{
                        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                        zIndex: 6, maxWidth: 520, background: '#FFFBEB',
                        border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px',
                        fontSize: 12, color: '#92400E',
                    }}>
                        <strong>Nothing to draw:</strong> none of this view&rsquo;s{' '}
                        {noDefinitionsIssue.selected} elements define a block. They are usages
                        classified by ontology kinds, which say what something is without defining
                        a block — a block definition diagram needs `part def` / `action def`
                        elements, or usages typed by them.
                    </div>
                )}
                {activeLegend && !isLayouting && (
                    <div style={{
                        position: 'absolute', right: 12, bottom: 12, zIndex: 5,
                        background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 8,
                        padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                        maxWidth: 220, pointerEvents: 'none',
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                            {activeLegend.name}
                        </div>
                        {/* The key says what the colour is OF, not just what each
                            colour is: a legend tied to nothing is a palette. */}
                        <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 6 }}>
                            {activeLegend.attributeName ?? activeLegend.enumerationName}
                        </div>
                        {activeLegend.swatches.map(entry => (
                            <div key={entry.value}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                                    background: entry.color, border: '1px solid rgba(0,0,0,.12)',
                                }} />
                                <span style={{ fontSize: 10, color: '#4B5563' }}>{entry.label}</span>
                            </div>
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
                            <span style={{ width: 24, height: 0, borderTop: '2.5px dashed #3498DB' }} />
                            Data flow
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
                {selectedNodes.length >= 2 && (
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
                    onNodesChange={readOnly ? undefined : onNodesChangeWithResize}
                    onEdgesChange={readOnly ? undefined : onEdgesChange}
                    onNodeClick={readOnly ? undefined : onNodeClick}
                    onNodeDoubleClick={readOnly ? undefined : onNodeDoubleClick}
                    onEdgeClick={readOnly ? undefined : onEdgeClick}
                    onEdgeDoubleClick={readOnly ? undefined : onEdgeDoubleClick}
                    onPaneClick={readOnly ? undefined : onPaneClick}
                    onNodeDragStart={readOnly ? undefined : onNodeDragStart}
                    onNodeDragStop={readOnly ? undefined : onNodeDragStop}
                    onNodeContextMenu={readOnly ? undefined : handleNodeContextMenu}
                    onEdgeContextMenu={readOnly ? undefined : handleEdgeContextMenu}
                    onNodeMouseEnter={readOnly ? undefined : onNodeMouseEnter}
                    onNodeMouseLeave={readOnly ? undefined : clearConnectorHover}
                    onEdgeMouseEnter={readOnly ? undefined : onEdgeMouseEnter}
                    onEdgeMouseLeave={readOnly ? undefined : clearConnectorHover}
                    nodesDraggable={!readOnly}
                    elementsSelectable={!readOnly}
                    edgesReconnectable={!readOnly}
                    nodesConnectable={!activeRenderer.disableOnCanvasAuthoring && !readOnly}
                    onConnect={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : onConnect}
                    onConnectStart={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : onConnectStart}
                    onConnectEnd={activeRenderer.disableOnCanvasAuthoring || readOnly ? undefined : (onConnectEnd as any)}
                    onReconnect={readOnly ? undefined : onReconnect}
                    onReconnectStart={readOnly ? undefined : onReconnectStart}
                    onReconnectEnd={readOnly ? undefined : onReconnectEnd}
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
                    // An embed sits in a scrolling page: a wheel over it must
                    // scroll the page, so zoom there is pinch or ⌘/Ctrl-wheel.
                    zoomOnScroll={viewKind === 'interconnection' ? false : !readOnly || isCanvasFullscreen}
                    panOnScroll={!readOnly}
                    zoomOnPinch
                    zoomOnDoubleClick={viewKind === 'interconnection' ? false : !readOnly}
                    preventScrolling={!readOnly || isCanvasFullscreen}
                    panOnScrollMode={'free' as any}
                    // Board-tool convention: dragging empty canvas rubber-bands a
                    // selection, and panning moves to the middle and right buttons
                    // (trackpad two-finger scroll still pans, via panOnScroll).
                    // Shift or Cmd/Ctrl extends a selection one block at a time.
                    selectionOnDrag={!readOnly}
                    panOnDrag={readOnly ? true : [1, 2]}
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
                    {/* An embed keeps the view controls — zoom, fit, full screen —
                        and drops everything that edits: lock, reset, undo, redo. */}
                    {!readOnly && canvasPortSelection && (() => {
                        const owner = nodes.find(node => ((node.data.ports ?? []) as PortInfo[]).some(port => port.id === canvasPortSelection));
                        const port = ((owner?.data.ports ?? []) as PortInfo[]).find(port => port.id === canvasPortSelection);
                        if (!owner || !port) return null;
                        return <div className="nodrag nopan nowheel" style={{ position: 'absolute', right: 12, top: 12, zIndex: 10000, padding: 8, background: 'white', border: '1px solid #CBD5E1', borderRadius: 6 }}>
                            <strong>{port.name}</strong>{' '}
                            <button style={{ padding: '3px 6px', border: '1px solid #CBD5E1', borderRadius: 4 }} onClick={() => inspectElement(port.id)}>Port Properties</button>{' '}
                            {!activeRenderer.forcedPortSize && <label>Port size{' '}
                                <input key={`${port.id}:${port.size}`} aria-label="Port size" type="number" min={10} max={48} defaultValue={port.size ?? INTERCONNECTION_PORT_SIZE}
                                    style={{ width: 52, border: '1px solid #CBD5E1', borderRadius: 4, padding: '2px 4px' }} title="Size in diagram units (10–48). Enter or leave the field to apply; Escape restores the current size." onKeyDown={event => {
                                        if (event.key === 'Escape') event.currentTarget.value = String(port.size ?? INTERCONNECTION_PORT_SIZE);
                                        if (event.key === 'Enter') { resizeInterconnectionPort(owner.id, port.id, event.currentTarget.valueAsNumber, 'se'); event.currentTarget.blur(); }
                                    }} onBlur={event => {
                                        resizeInterconnectionPort(owner.id, port.id, event.currentTarget.valueAsNumber, 'se');
                                        const current = ((nodesRef.current.find(node => node.id === owner.id)?.data.ports ?? []) as PortInfo[]).find(candidate => candidate.id === port.id);
                                        event.currentTarget.value = String(current?.size ?? INTERCONNECTION_PORT_SIZE);
                                    }} />
                            </label>}
                        </div>;
                    })()}
                    {readOnly && <Controls position="bottom-right" showFitView={false} showInteractive={false} style={{ zIndex: 6 }}>
                        {viewControls}
                    </Controls>}
                    {!readOnly && <Controls position="bottom-right" showFitView={false} style={{ zIndex: 6 }}>
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
                        {viewControls}
                    </Controls>}
                    {nodes.length > 20 && !readOnly && (
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
                    {nodes.length > 20 && !readOnly && (
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
                    onShowProperties={model?.relationships.some(relationship => relationship.id === edgeCtx.edgeId) ? () => inspectRelationship(edgeCtx.edgeId) : undefined}
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

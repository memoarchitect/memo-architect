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
import { sendElementCreate, sendDiagramLayoutUpdate, sendElementUpdate } from '../store/ws-client';
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
    validateSingleTree, buildCompositionTree, containersBelowDepth, COMPOSITION_REL_TYPES,
} from './templates/composition-tree';

/**
 * The nesting level from which an IBD opens folded. The frame (0) always shows
 * its immediate parts (1), while those parts start folded. An IBD needs to
 * open as a readable system overview; its detailed internal wiring belongs in
 * an intentional expand/drill-in interaction, not in the first frame.
 */
const IBD_FOLD_DEPTH = 1;
import {
    PORT_DIR_COLORS, IBD_FLOW_COLORS, portIdFromHandle, parsePortSide,
    INTERCONNECTION_PORT_SIZE, NESTED_PITCH, type PortDisplay, type PortSide,
} from './templates/interconnection-view';
import { commonDisplayLevels, findFloatingActions, type ActionFlowDisplayLevel, type ActionFlowLaneGrouping, type ActionFlowNesting } from './templates/actionflow-view';
import { isStateElement } from './templates/statetransition-view';
import { useCaseActorOptions, useCaseMaxDepth, useCaseViewOptions, type UseCaseEdgeStyle } from './templates/use-case-view';
import { templateRegistry } from '../diagram/templates';
import type { TemplateOptionSlices } from '../diagram/template-provider';
import {
    hasContextChildCoordinates, rebaseLegacyContextChildPosition, withContextChildCoordinates,
} from '../diagram/layout-coordinate-migration';
import { DecompositionNode } from './DecompositionNode';
import { InterconnectionNode } from './InterconnectionNode';
import { InterconnectionEdge } from './InterconnectionEdge';
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
import { exportDiagram, type DiagramExportFormat } from '../diagram/export-diagram';
import { selectedLayoutProviderId } from '../diagram/layout-selection';
import { projectLayoutToNotationScene, type NotationLayoutNode, type NotationLayoutEdge } from '../diagram/notation-scene';

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
                onPointerDown={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    data.onDelete?.();
                }}
                onClick={event => { event.stopPropagation(); data.onDelete?.(); }}
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

/** Re-route explicit orthogonal edges after saved/user node positions overlay. */
function reroutePositionedEdges(
    nodes: FlowNode[],
    edges: FlowEdge[],
    quality: RouteQuality = 'direct',
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
                    const size = port.size ?? INTERCONNECTION_PORT_SIZE;
                    const cx = port.x + size / 2;
                    const cy = port.y + size / 2 + (port.nestedCount ?? 0) * NESTED_PITCH / 2;
                    return side === 'left' ? { x: cx - size / 2, y: cy }
                        : side === 'right' ? { x: cx + size / 2, y: cy }
                        : side === 'top' ? { x: cx, y: cy - size / 2 }
                        : side === 'bottom' ? { x: cx, y: cy + size / 2 }
                        : { x: cx, y: cy };
                }
            }
            return fallback as { x: number; y: number } | undefined;
        };
        const sourceOffset = liveOffset(edge.source, edge.data?.sourcePortId, edge.data?.sourceOffset, edge.data?.sourceSide);
        const targetOffset = liveOffset(edge.target, edge.data?.targetPortId, edge.data?.targetOffset, edge.data?.targetSide);
        if (!sourceOffset || !targetOffset || !byId.has(edge.source) || !byId.has(edge.target)) return [];
        const s = absOf(edge.source), t = absOf(edge.target);
        return [{
            id: edge.id,
            source: { x: s.x + sourceOffset.x, y: s.y + sourceOffset.y },
            target: { x: t.x + targetOffset.x, y: t.y + targetOffset.y },
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceSide: edge.data?.sourceSide as 'left' | 'right' | 'top' | 'bottom' | undefined,
            targetSide: edge.data?.targetSide as 'left' | 'right' | 'top' | 'bottom' | undefined,
        }];
    });
    if (requests.length === 0) return edges;
    const obstacles = nodes
        .filter(node => !(node.data as { isFrame?: boolean }).isFrame)
        .map(node => ({ id: node.id, ...absOf(node.id), ...sizeOf(node) }));
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
            const stableNodes = nodesRef.current;
            const shouldReroute = geometryNeedsRerouteRef.current;
            geometryNeedsRerouteRef.current = false;
            if (!shouldReroute) {
                setNodes(stableNodes);
                return;
            }
            const routedEdges = reroutePositionedEdges(stableNodes, edgesRef.current);
            edgesRef.current = routedEdges;
            setNodes(stableNodes);
            setEdges(routedEdges);
        });
    }, [setNodes, setEdges]);
    const [isLayouting, setIsLayouting] = useState(false);
    const [layoutEditVersion, setLayoutEditVersion] = useState(0);
    const [layoutError, setLayoutError] = useState<string | null>(null);
    const [layoutVersion, setLayoutVersion] = useState(0);
    // Bumped to force a fresh layout pass (e.g. tree Reset Layout)
    const [relayoutNonce, setRelayoutNonce] = useState(0);
    const [paletteCollapsed, setPaletteCollapsed] = useState(true);
    const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
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
                    ...(node.width ? { width: node.width } : {}),
                    ...(node.height ? { height: node.height } : {}),
                    ports: Object.fromEntries(
                        (((node.data as { ports?: Array<{ id: string; x: number; y: number; side?: 'top' | 'bottom' | 'left' | 'right' }> }).ports) ?? [])
                            .map(port => [port.id, { x: port.x, y: port.y, side: port.side }]),
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
    const fitMinZoom = viewKind === 'interconnection' ? 0.72 : 0.8;

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
        const fullFitZoom = Math.min(
            (viewportWidth * (1 - sidePadding * 2)) / bounds.width,
            (viewportHeight * (1 - topPadding * 2)) / bounds.height,
            2,
        );
        if (fullFitZoom >= fitMinZoom) {
            fitView({ padding: sidePadding, minZoom: fitMinZoom, maxZoom: 2, duration });
            return;
        }

        // The diagram is taller than a readable full fit. Preserve its width
        // and anchor it at 8% from the top, leaving the remaining content to
        // be reached by normal pan/zoom rather than clipping its beginning.
        const zoom = Math.max(0.1, Math.min(2, (viewportWidth * (1 - sidePadding * 2)) / bounds.width));
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
    const interconnectionDeepContainerIds = useMemo(() => {
        if (!model || viewKind !== 'interconnection') return [] as string[];
        const all = Object.values(model.elements);
        const visible = viewpointFilter ? all.filter(viewpointFilter) : all;
        return containersBelowDepth(
            buildCompositionTree(visible, model.relationships),
            IBD_FOLD_DEPTH,
        );
    }, [model, viewKind, viewpointFilter]);

    /**
     * A diagram that nests deeply opens folded. A deep hierarchy drawn at full
     * depth is unreadable — GPCA's mode machine is four levels — so the reader
     * expands the one branch they came to look at.
     *
     * The action-flow and tree views already start collapsed, because they
     * track which nodes are *expanded*. The state-machine and IBD views track
     * the inverse, so an empty set means fully open and they have to be seeded.
     * A state machine folds every composite; an IBD folds only what sits below
     * its first level (see interconnectionDeepContainerIds).
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
            // An IBD with nothing deep to fold opens fully expanded, which is
            // the correct default — so this seeds an empty set and is done.
            setCollapsedInterconnectionNodes(new Set(interconnectionDeepContainerIds));
        }
        seededCollapseRef.current = key;
    }, [model, selectedDiagramId, viewKind, compositeStateIds, interconnectionDeepContainerIds]);

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
        return validateSingleTree(buildGeneralViewTree(model, viewpointFilter, selectedDiagram.relationshipTypes));
    }, [model, selectedDiagram, viewpointFilter]);

    // ─── Decomp callbacks ──────────────────────────────────────────────────────
    // Tree source: legacy layoutStyle diagrams keep their kind-scoped trees;
    // the General template derives its tree from the view's own selection.

    const buildActiveTree = useCallback(() => {
        if (!model) return undefined;
        if (isFBSDiagram) return buildFunctionalTree(model);
        if (isGeneralTemplate) return buildGeneralViewTree(model, viewpointFilter, selectedDiagram?.relationshipTypes);
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
                : { x: pos.x, y: pos.y };
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
                        ports: ((n.data as { ports?: Array<{ id: string; x: number; y: number; side: string }> }).ports ?? [])
                            .map(port => ({ ...port, ...(pos.ports?.[port.id] ?? {}) })),
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
        if (side && selectedDiagramId) {
            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
            mergeDiagramLayouts({ [selectedDiagramId]: {
                ...previous,
                canvas: { ...previous.canvas, autoLayout: false, portWalls: { ...previous.canvas?.portWalls, [portId]: side } },
            } });
        }
        const next = nodesRef.current.map(node => node.id !== ownerId ? node : {
            ...node,
            data: {
                ...node.data,
                ports: ((node.data as { ports?: Array<{ id: string; y: number }> }).ports ?? [])
                    .map(port => port.id === portId ? { ...port, y } : port),
            },
        });
        scheduleGeometryUpdate(next);
    }, [scheduleGeometryUpdate, markManualLayout, selectedDiagramId, mergeDiagramLayouts]);

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
        const tidied = reroutePositionedEdges(nodesRef.current, cleared, 'tidy');
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
            const positioned = [...positionedModel, ...annotationNodes(savedLayout)];
            const preparedEdges = rendererEdges.map(edge => {
                const savedEdge = savedLayout?.edges?.[edge.id];
                const attachmentMatches = !savedEdge?.source || (
                    savedEdge.source === edge.source
                    && savedEdge.target === edge.target
                    && savedEdge.sourcePortId === edge.data?.sourcePortId
                    && savedEdge.targetPortId === edge.data?.targetPortId
                );
                const savedPoints = attachmentMatches ? savedEdge?.points : undefined;
                return {
                    ...edge,
                    data: {
                        ...edge.data,
                        ...(savedPoints?.length ? { points: savedPoints, manualRoute: true } : {}),
                        flowAnimation: flowAnimationEnabled,
                        onRouteChange: (points: Array<{ x: number; y: number }>) => moveEdgeRoute(edge.id, points),
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
            setNodes(interactive ? applyInteractiveData(positioned) : positioned);
            setEdges(reroutePositionedEdges(positioned, preparedEdges));
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
                    portWalls,
                    legend: ibdLegend,
                    onPortMove: moveInterconnectionPort,
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
        expandedNodes, collapsedInterconnectionNodes, focusedInterconnectionId, interconnectionPortDisplay, interconnectionConnectionDisplay, showIbdPortText, showIbdConnectionText, portWalls, ibdLegend, expandedActionNodes, focusedActionId, visibleActionFlowKinds, actionFlowDirection, actionFlowLaneGrouping, actionFlowDisplayLevel, actionFlowNesting, nodeDirections,
        collapsedStateNodes, focusedStateId, toggleStateCollapse, drillIntoState, drillIntoAction,
        toggleExpand, toggleInterconnectionCollapse, toggleActionExpand, toggleDirection, selectedDiagramId,
        drillIntoInterconnection,
        buildNodesFromSidecar, applyInteractiveData, annotationNodes, moveInterconnectionPort, moveEdgeRoute, inspectElement, inspectRelationship, getViewport]);

    // Re-fit after layout
    useEffect(() => {
        if (layoutVersion === 0) return;
        const timer = setTimeout(() => {
            const preserved = preservedViewportRef.current;
            preservedViewportRef.current = null;
            if (preserved) {
                setViewport(preserved);
                return;
            }
            const saved = selectedDiagramId
                ? useModelStore.getState().diagramLayouts[selectedDiagramId]?.canvas
                : undefined;
            // An action flow deliberately opens at its reading origin (left or
            // top). Restoring a generic saved camera after its layout completed
            // shifted the first visible step far to the right.
            if (viewKind !== 'actionflow' && saved?.zoom !== undefined && saved.pan) {
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

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const cmd = undoStack.current.pop();
                if (cmd) { cmd.undo(); redoStack.current.push(cmd); }
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                const cmd = redoStack.current.pop();
                if (cmd) { cmd.do(); undoStack.current.push(cmd); }
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
    }, [fitDiagramFrame]);

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

    const onPaneClick = useCallback(() => {
        selectElement(null);
        inspectRelationship(null);
        setNodeCtx(null);
        setEdgeCtx(null);
        setNodes(prev => prev.map(n => ({
            ...n,
            style: { ...n.style, opacity: 1, boxShadow: undefined },
        })));
        setEdges(prev => prev.map(edge => edge.selected ? { ...edge, selected: false } : edge));
    }, [selectElement, inspectRelationship, setNodes, setEdges]);

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
                        <span className="memo-diagram-tools__group-label">View</span>
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
                        {supportsToolbarOperation('export') && <div style={{ position: 'relative' }}>
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

                        <span className="memo-diagram-tools__group-label">Layout</span>
                        {/* Connectors stay direct while blocks move; this is the
                            explicit pass that routes them around obstacles. */}
                        {supportsToolbarOperation('route') && <IconToggle
                            icon={<Icon.tidy />}
                            active={false}
                            onClick={tidyConnectors}
                            title="Layout: re-route connectors. Warns before replacing hand-drawn bends."
                        />}
                        {selectedDiagramId && supportsToolbarOperation('autoLayout') && <IconToggle
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
                        />}

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
                                <span className="memo-diagram-tools__group-label">View</span>
                                <ToolbarSep hidden={actionFlowToolbarPlacement === 'left'} />
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
                                <div className="flex rounded overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                    {allowedGeneralModes.map(m => (
                                        <button key={m}
                                            onClick={() => { setGeneralMode(m); positionCacheRef.current.clear(); }}
                                            className="px-2 py-0.5 text-xs font-medium capitalize"
                                            style={{
                                                background: generalMode === m ? '#1B3A4B' : '#FFFFFF',
                                                color: generalMode === m ? '#FFFFFF' : '#6B7280',
                                            }}
                                            title={m === 'graph' ? 'Relationship graph with compartments'
                                                : m === 'tree' ? 'Decomposition tree with expand/collapse'
                                                : 'Nested containment blocks'}>
                                            {m === 'graph' ? <Icon.tidy /> : m === 'tree' ? <Icon.library /> : <Icon.rectangle />}
                                        </button>
                                    ))}
                                </div>
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
                                <div className="flex rounded overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                    {(['containment', 'decomposition'] as const).map(s => (
                                        <button key={s} onClick={() => { setLayoutStyle(s); positionCacheRef.current.clear(); }}
                                            className="px-2 py-0.5 text-xs font-medium"
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
                                <span className="memo-diagram-tools__group-label">Edit</span>
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
                                <span className="memo-diagram-tools__group-label">View</span>
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
                        opacity={selectionOpacity}
                        onAlign={alignSelection}
                        onMatchSize={matchSelectionSize}
                        onDistribute={distributeSelection}
                        onFill={color => styleSelection({ color })}
                        onOpacity={opacity => styleSelection({ opacity })}
                        onTextStyle={styleSelection}
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
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd as any}
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
                    <Controls position="bottom-right" showFitView={false} style={{ marginBottom: 82 }}>
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
                        <MiniMap
                            style={MINIMAP_STYLE}
                            nodeColor={miniMapNodeColor}
                            maskColor="rgba(247, 247, 245, 0.7)"
                        />
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
    );
}

export function DiagramCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvasInner />
        </ReactFlowProvider>
    );
}

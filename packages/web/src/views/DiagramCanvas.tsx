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
    ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
    useNodesState, useEdgesState, useReactFlow, addEdge,
    applyNodeChanges,
    ConnectionMode,
    type Node as RFNode,
    type Edge as RFEdge,
    type Connection,
    type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RFAny = any;

import type { MemoElement, DiagramLayout, ViewKind } from '@memoarchitect/tools/browser';
import { computeImpact } from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram } from '../store/model-store';
import { sendElementCreate, sendAddRelationship, sendDiagramLayoutUpdate, sendElementUpdate } from '../store/ws-client';
import { LAYER_COLORS, REL_COLORS, DIAGRAM_TYPE_META, VIEW_KIND_META, resolveActionFlowDiagramType } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import {
    computeLayout, computeDecompositionLayout, computeContainmentLayout,
    computeFBSLayout, buildDecompositionTree, buildFunctionalTree, routeOrthogonalEdges,
} from './layout';
import {
    computeGeneralViewLayout, resolveGeneralMode, buildGeneralViewTree,
    GENERAL_VIEW_MODES, type GeneralViewMode,
} from './templates/general-view';
import { validateSingleTree, COMPOSITION_REL_TYPES } from './templates/composition-tree';
import { computeInterconnectionLayout, PORT_DIR_COLORS, IBD_FLOW_COLORS, type PortDisplay } from './templates/interconnection-view';
import { computeActionFlowViewLayout, commonDisplayLevels, findFloatingActions, type ActionFlowDisplayLevel, type ActionFlowLaneGrouping } from './templates/actionflow-view';
import { computeStateTransitionLayout } from './templates/statetransition-view';
import { computeSequenceLayout } from './templates/sequence-view';
import { DecompositionNode } from './DecompositionNode';
import { InterconnectionNode } from './InterconnectionNode';
import { InterconnectionEdge } from './InterconnectionEdge';
import { ActionFlowNode, ActionFlowLaneNode } from './ActionFlowNode';
import { StateNode } from './StateNode';
import { SeqLifelineNode, SeqSectionNode, SeqOccurrenceNode } from './SequenceNodes';
import { GridView } from './GridView';
import { BrowserView } from './BrowserView';
import { DiagramInteractiveNode, type DiagramInteractiveNodeData } from './DiagramInteractiveNode';
import { DiagramPalette } from './DiagramPalette';
import { RelationshipPicker } from './RelationshipPicker';
import { NodeContextMenu, EdgeContextMenu, type EdgeLineStyle } from './DiagramContextMenus';
import { DecisionNode, ForkNode, StartEndNode } from './WorkflowNodes';
import { Icon, ToolbarSep, Segmented, ToolbarCluster, IconButton, IconToggle } from './DiagramToolbarControls';
import type { LayoutCapability } from '../diagram/layout-provider';
import { listLayoutProviders } from '../diagram/layout-providers';
import { selectedLayoutProviderId, withLayoutProvider } from '../diagram/layout-selection';

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

// ─── Undo/redo command pattern ────────────────────────────────────────────────

interface UndoCommand {
    do: () => void;
    undo: () => void;
}

/** Re-route explicit orthogonal edges after saved/user node positions overlay. */
function reroutePositionedEdges(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
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
        const liveOffset = (nodeId: string, portId: unknown, fallback: unknown) => {
            if (typeof portId === 'string') {
                const port = ((byId.get(nodeId)?.data as { ports?: Array<{ id: string; x: number; y: number; size?: number }> })?.ports ?? [])
                    .find(candidate => candidate.id === portId);
                if (port) {
                    const size = port.size ?? 20;
                    return { x: port.x + size / 2, y: port.y + size / 2 };
                }
            }
            return fallback as { x: number; y: number } | undefined;
        };
        const sourceOffset = liveOffset(edge.source, edge.data?.sourcePortId, edge.data?.sourceOffset);
        const targetOffset = liveOffset(edge.target, edge.data?.targetPortId, edge.data?.targetOffset);
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
    const automaticRequests = requests.filter(request => !edges.find(edge => edge.id === request.id)?.data?.manualRoute);
    const routes = routeOrthogonalEdges(automaticRequests, obstacles);
    return edges.map(edge => {
        const request = requestById.get(edge.id);
        if (!request) return edge;
        if (edge.data?.manualRoute) {
            const points = [...((edge.data.points as Array<{ x: number; y: number }> | undefined) ?? [])];
            if (points.length >= 2) {
                points[0] = request.source;
                points[points.length - 1] = request.target;
                return { ...edge, data: { ...edge.data, points } };
            }
        }
        return routes.has(edge.id) ? { ...edge, data: { ...edge.data, points: routes.get(edge.id) } } : edge;
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

// ─── Main canvas inner (inside ReactFlowProvider) ─────────────────────────────

function DiagramCanvasInner() {
    const model = useModelStore(s => s.model);
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
    const previousLayoutModelRef = useRef(model);
    const previousLayoutDiagramRef = useRef(selectedDiagramId);
    const preservedViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
    const geometryFrameRef = useRef<number | null>(null);
    const nodeDragStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
    const suppressInspectUntilRef = useRef(0);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    const scheduleGeometryUpdate = useCallback((nextNodes: FlowNode[]) => {
        nodesRef.current = nextNodes;
        if (geometryFrameRef.current !== null) return;
        geometryFrameRef.current = requestAnimationFrame(() => {
            geometryFrameRef.current = null;
            const stableNodes = nodesRef.current;
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
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridVisible, setGridVisible] = useState(true);
    const [actionFlowDirection, setActionFlowDirection] = useState<'horizontal' | 'vertical'>('horizontal');
    const [actionFlowLaneGrouping, setActionFlowLaneGrouping] = useState<ActionFlowLaneGrouping>('allocation');
    const [actionFlowDisplayLevel, setActionFlowDisplayLevel] = useState<ActionFlowDisplayLevel>('all');
    const [flowFiltersOpen, setFlowFiltersOpen] = useState(false);
    const [visibleActionFlowKinds, setVisibleActionFlowKinds] = useState<Set<'control' | 'data' | 'energy' | 'material'>>(
        new Set(['control', 'data', 'energy', 'material']),
    );

    // Quick create popup state
    const [quickCreate, setQuickCreate] = useState<{
        x: number; y: number;
        flowX: number; flowY: number;
        kind?: string; layer?: string; construct?: string;
    } | null>(null);

    // Relationship picker state
    const [relPicker, setRelPicker] = useState<{
        x: number; y: number;
        sourceId: string; targetId: string;
        sourceKind: string; targetKind: string;
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
            const layout: DiagramLayout = {
                nodes: Object.fromEntries(nodes.map(node => [node.id, {
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
                canvas: {
                    ...previous.canvas,
                    zoom: viewport.zoom,
                    pan: { x: viewport.x, y: viewport.y },
                    autoLayout: false,
                },
            };
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
    // IBD text and ports must remain readable on first render. A board can be
    // panned like Miro; shrinking an entire architecture until labels become
    // dust is not a useful definition of "fit".
    const fitMinZoom = viewKind === 'interconnection' ? 0.72 : 0.1;
    const viewKindMeta = viewKind ? VIEW_KIND_META[viewKind] : null;
    // General template mode — legacy layoutStyle diagrams keep their own controls
    const isGeneralTemplate = viewKind === 'general' && !isDecompDiagram && !isFBSDiagram;
    const [generalMode, setGeneralMode] = useState<GeneralViewMode>('graph');
    const requiredLayoutCapabilities = useMemo<LayoutCapability[]>(() =>
        viewKind === 'statetransition' ? ['compound-graph'] : ['flat-graph'], [viewKind]);
    const automaticLayoutProviders = useMemo(() =>
        listLayoutProviders(requiredLayoutCapabilities).filter(provider => provider.mode === 'automatic'),
    [requiredLayoutCapabilities]);
    const usesLayoutProvider = isFBSDiagram
        || (isGeneralTemplate && generalMode === 'graph')
        || viewKind === 'interconnection'
        || viewKind === 'actionflow'
        || viewKind === 'statetransition';
    // A view may restrict its presentation modes (e.g. the BDD sample is a
    // strict tree — no graph) via properties.modes = "tree,containment"
    const declaredModes = selectedDiagram?.properties?.modes;
    const allowedGeneralModes = useMemo(() => {
        if (!declaredModes) return GENERAL_VIEW_MODES;
        const wanted = new Set(declaredModes.split(',').map(s => s.trim()));
        const filtered = GENERAL_VIEW_MODES.filter(m => wanted.has(m));
        return filtered.length ? filtered : GENERAL_VIEW_MODES;
    }, [declaredModes]);
    // Action Flow template (KK-4): swimlane banding toggle
    const [swimlanesOn, setSwimlanesOn] = useState(true);
    const actionFlowDisplayLevels = useMemo(() => {
        if (!model || !selectedDiagram) return [];
        const included = new Set(selectedDiagram.elementIds);
        const targets = Object.values(model.elements)
            .filter(element => included.has(element.id) && element.allocatedTo)
            .map(element => element.allocatedTo!);
        return commonDisplayLevels(targets, model);
    }, [model, selectedDiagram]);
    const actionFlowPresentation = useMemo(() => {
        if (!model || !selectedDiagram) return 'Activity Diagram';
        const resolvedType = resolveActionFlowDiagramType(selectedDiagram);
        return DIAGRAM_TYPE_META[resolvedType].fullName;
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
    const [interconnectionLegendOpen, setInterconnectionLegendOpen] = useState(false);
    const [expandedActionNodes, setExpandedActionNodes] = useState<Set<string>>(new Set());
    const [focusedActionId, setFocusedActionId] = useState<string | null>(null);
    const [nodeDirections, setNodeDirections] = useState<Map<string, 'vertical' | 'horizontal'>>(new Map());
    const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Drill-down breadcrumb: composition ancestry of the focused IBD part.
    const interconnectionPath = useMemo(() => {
        if (!model || !focusedInterconnectionId) return [] as string[];
        const parentOf = new Map<string, string>();
        for (const rel of model.relationships) {
            if (COMPOSITION_REL_TYPES.has(rel.type) && !parentOf.has(rel.targetId)) {
                parentOf.set(rel.targetId, rel.sourceId);
            }
        }
        const path = [focusedInterconnectionId];
        const seen = new Set(path);
        let cur = focusedInterconnectionId;
        while (parentOf.has(cur)) {
            const parent = parentOf.get(cur)!;
            if (seen.has(parent)) break;
            path.unshift(parent);
            seen.add(parent);
            cur = parent;
        }
        return path;
    }, [model, focusedInterconnectionId]);

    // Fresh per-diagram state: honor the view's declared layoutHint
    useEffect(() => {
        setLayoutEditVersion(0);
        setGeneralMode(resolveGeneralMode(selectedDiagram?.properties));
        setSwimlanesOn(true);
        setActionFlowLaneGrouping('allocation');
        setActionFlowDisplayLevel('all');
        const expandedHint = selectedDiagram?.properties?.styleHint?.startsWith('expanded:')
            ? selectedDiagram.properties.styleHint.slice('expanded:'.length).split(',').map(id => id.trim()).filter(Boolean)
            : [];
        setExpandedNodes(new Set(expandedHint));
        setCollapsedInterconnectionNodes(new Set());
        setFocusedInterconnectionId(null);
        setInterconnectionPortDisplay('all');
        setInterconnectionLegendOpen(false);
        setExpandedActionNodes(new Set());
        setFocusedActionId(null);
        positionCacheRef.current.clear();
    }, [selectedDiagramId, selectedDiagram?.properties?.layoutHint, selectedDiagram?.properties?.styleHint]);

    // Custom node types
    const nodeTypes = useMemo(() => ({
        decompositionNode: DecompositionNode,
        interconnectionNode: InterconnectionNode,
        actionFlowNode: ActionFlowNode,
        actionFlowLane: ActionFlowLaneNode,
        stateNode: StateNode,
        seqLifeline: SeqLifelineNode,
        seqSection: SeqSectionNode,
        seqOccurrence: SeqOccurrenceNode,
        diagramNode: DiagramInteractiveNode,
        decisionNode: DecisionNode,
        forkNode: ForkNode,
        startEndNode: StartEndNode,
    }), []);
    const edgeTypes = useMemo(() => ({ interconnectionEdge: InterconnectionEdge }), []);

    const miniMapNodeColor = useCallback((node: any) =>
        node.data?.color || node.data?.layerColor || '#ccc', []);

    // ─── Viewpoint filter ──────────────────────────────────────────────────────

    const viewpointFilter = useMemo(() => {
        const effectiveVpId = selectedDiagram?.viewpointId === '__model'
            ? null
            : (selectedDiagram?.viewpointId || selectedViewpointId);

        const hasViewpoint = effectiveVpId && model?.viewpoints;
        const hasHidden = hiddenLayers.size > 0;
        const diagramElementIds = selectedDiagram?.elementIds
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
            if (vpKinds && vpLayers) return vpKinds.has(el.kind) || vpLayers.has(el.layer);
            return true;
        };
    }, [selectedViewpointId, selectedDiagram, model?.viewpoints, hiddenLayers]);

    // BDD integrity: a block definition diagram must be one connected hierarchy,
    // not a forest of disconnected/floating elements (validateSingleTree).
    const bddTreeIssue = useMemo(() => {
        if (!model || !selectedDiagram || selectedDiagram.diagramType !== 'bdd') return null;
        return validateSingleTree(buildGeneralViewTree(model, viewpointFilter));
    }, [model, selectedDiagram, viewpointFilter]);

    // ─── Decomp callbacks ──────────────────────────────────────────────────────
    // Tree source: legacy layoutStyle diagrams keep their kind-scoped trees;
    // the General template derives its tree from the view's own selection.

    const buildActiveTree = useCallback(() => {
        if (!model) return undefined;
        if (isFBSDiagram) return buildFunctionalTree(model);
        if (isGeneralTemplate) return buildGeneralViewTree(model, viewpointFilter);
        return buildDecompositionTree(model);
    }, [model, isFBSDiagram, isGeneralTemplate, viewpointFilter]);

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
        const positioned = rawNodes.map(n => {
            const pos = layout.nodes[n.id];
            if (!pos) return n;
            return {
                ...n,
                position: { x: pos.x, y: pos.y },
                ...(pos.width ? { width: pos.width } : {}),
                ...(pos.height ? { height: pos.height } : {}),
                data: {
                    ...n.data,
                    bgColor: pos.color || undefined,
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
        return positioned.map(node => {
            if (node.type !== 'actionFlowLane') return node;
            const data = node.data as { memberIds?: string[]; orientation?: 'row' | 'column' };
            const members = (data.memberIds ?? []).map(id => byId.get(id)).filter(Boolean) as FlowNode[];
            if (members.length === 0) return node;
            const minX = Math.min(...members.map(member => member.position.x));
            const minY = Math.min(...members.map(member => member.position.y));
            const maxX = Math.max(...members.map(member => member.position.x + Number(member.width ?? member.style?.width ?? 180)));
            const maxY = Math.max(...members.map(member => member.position.y + Number(member.height ?? member.style?.height ?? 96)));
            const column = data.orientation === 'column';
            return {
                ...node,
                position: { x: column ? minX - 36 : minX - 120, y: column ? minY - 32 : minY - 36 },
                style: {
                    ...node.style,
                    width: maxX - minX + (column ? 72 : 156),
                    height: maxY - minY + (column ? 68 : 72),
                },
            };
        });
    }, []);

    const moveInterconnectionPort = useCallback((ownerId: string, portId: string, y: number) => {
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
        const next = nodesRef.current.map(node => node.id !== ownerId ? node : {
            ...node,
            data: {
                ...node.data,
                ports: ((node.data as { ports?: Array<{ id: string; y: number }> }).ports ?? [])
                    .map(port => port.id === portId ? { ...port, y } : port),
            },
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

    // ─── Layout computation ────────────────────────────────────────────────────

    useEffect(() => {
        if (!model) return;
        const modelRefresh = previousLayoutModelRef.current !== model
            && previousLayoutDiagramRef.current === selectedDiagramId;
        preservedViewportRef.current = modelRefresh ? getViewport() : null;
        previousLayoutModelRef.current = model;
        previousLayoutDiagramRef.current = selectedDiagramId;
        // Grid and Browser kinds render their own non-canvas surface;
        // Geometry is deferred (ADR-1-19) and renders a placeholder
        if (viewKind === 'grid' || viewKind === 'browser' || viewKind === 'geometry') return;

        // Guard against stale async completions: a slower earlier layout must
        // not overwrite the result of the branch this effect run selected
        // (e.g. graph ELK resolving after a sync containment layout)
        let cancelled = false;
        const apply = (
            { nodes: n, edges: e }: { nodes: FlowNode[]; edges: FlowEdge[] },
            interactive = true,
        ) => {
            if (cancelled) return;
            const savedLayout = selectedDiagramId
                ? useModelStore.getState().diagramLayouts[selectedDiagramId]
                : undefined;
            const positioned = savedLayout && Object.keys(savedLayout.nodes).length > 0
                ? buildNodesFromSidecar(n, savedLayout)
                : n;
            const preparedEdges = e.map(edge => {
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
            promise: Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }>,
            interactive = true,
        ) => {
            setIsLayouting(true);
            setLayoutError(null);
            boundedLayout(promise, label).then(r => apply(r, interactive)).catch(fail(label));
        };

        // Debounce so skimming through diagrams doesn't queue an ELK job per
        // one skipped past — only the diagram you settle on gets laid out.
        const dispatch = () => {
        if (isFBSDiagram) {
            run('FBS', computeFBSLayout(model, {
                expandedNodes, nodeDirections,
                callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
                layoutProviderId,
            }));
        } else if (isDecompDiagram) {
            if (layoutStyle === 'decomposition') {
                run('Decomposition', computeDecompositionLayout(model, {
                    expandedNodes, nodeDirections,
                    callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
                    positionCache: positionCacheRef.current,
                }));
            } else {
                apply(computeContainmentLayout(model, {
                    expandedNodes,
                    callbacks: { onToggleExpand: toggleExpand },
                }));
            }
        } else if (viewKind === 'interconnection') {
            // Interconnection template (KK-3): parts with boundary ports,
            // typed connectors, nested containment
            run('Interconnection', computeInterconnectionLayout(model, {
                viewpointFilter,
                relationshipTypes: selectedDiagram?.relationshipTypes,
                collapsedNodes: collapsedInterconnectionNodes,
                onToggleCollapse: toggleInterconnectionCollapse,
                focusId: focusedInterconnectionId ?? undefined,
                portDisplay: interconnectionPortDisplay,
                onPortMove: moveInterconnectionPort,
                layoutProviderId,
            }), false);
        } else if (viewKind === 'actionflow') {
            // Action Flow template (KK-4): actions with parameter ports,
            // item flows, successions, optional swimlanes
            run('Action flow', computeActionFlowViewLayout(model, {
                viewpointFilter,
                swimlanes: swimlanesOn,
                laneGrouping: actionFlowLaneGrouping,
                displayLevel: actionFlowDisplayLevel,
                expandedActionIds: expandedActionNodes,
                onToggleAction: toggleActionExpand,
                focusActionId: focusedActionId ?? undefined,
                visibleFlowKinds: visibleActionFlowKinds,
                direction: actionFlowDirection,
                layoutProviderId,
            }), false);
        } else if (viewKind === 'statetransition') {
            // State Transition template (KK-5): nested states, transition
            // edges with trigger [guard] labels
            run('State transition', computeStateTransitionLayout(model, { viewpointFilter, layoutProviderId }), false);
        } else if (viewKind === 'sequence') {
            // Sequence template (KK-6): lifelines, chronological messages
            apply(computeSequenceLayout(model, { viewpointFilter }), false);
        } else if (isGeneralTemplate && generalMode !== 'graph') {
            // General template (KK-2) tree/containment modes
            run('General', computeGeneralViewLayout(model, {
                mode: generalMode,
                viewpointFilter,
                expandedNodes, nodeDirections,
                callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
                positionCache: positionCacheRef.current,
                layoutProviderId,
            }));
        } else {
            // Standard diagram / General template graph mode — check for sidecar
            const relationshipTypes = selectedDiagram?.relationshipTypes;
            const compartments = isGeneralTemplate;
            setIsLayouting(true);
            setLayoutError(null);
            boundedLayout(computeLayout(model, { viewpointFilter, relationshipTypes, compartments, layoutProviderId }), 'Standard').then(({ nodes: n, edges: e }) => {
                apply({ nodes: n, edges: e });
            }).catch(fail('Standard'));
        }
        };

        const timer = window.setTimeout(dispatch, LAYOUT_SWITCH_DEBOUNCE_MS);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [model, viewpointFilter, isDecompDiagram, isFBSDiagram, layoutStyle,
        viewKind, isGeneralTemplate, generalMode, swimlanesOn, relayoutNonce,
        selectedDiagram?.relationshipTypes,
        layoutProviderId,
        expandedNodes, collapsedInterconnectionNodes, focusedInterconnectionId, interconnectionPortDisplay, expandedActionNodes, focusedActionId, visibleActionFlowKinds, actionFlowDirection, actionFlowLaneGrouping, actionFlowDisplayLevel, nodeDirections,
        toggleExpand, toggleInterconnectionCollapse, toggleActionExpand, toggleDirection, selectedDiagramId,
        buildNodesFromSidecar, applyInteractiveData, moveInterconnectionPort, moveEdgeRoute, inspectRelationship, getViewport]);

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
            if (saved?.zoom !== undefined && saved.pan) {
                setViewport({ x: saved.pan.x, y: saved.pan.y, zoom: saved.zoom }, { duration: 300 });
            } else {
                fitView({ padding: 0.08, minZoom: fitMinZoom, maxZoom: 2, duration: 500 });
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [layoutVersion, selectedDiagramId, fitView, fitMinZoom, setViewport]);

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
                fitView({ padding: 0.08, minZoom: fitMinZoom, maxZoom: 2, duration: 400 });
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fitView, fitMinZoom]);

    // ─── Drag/drop from palette ───────────────────────────────────────────────

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/memo-kind');
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

        // Optimistic node
        const tempId = `_new_${Date.now()}`;
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

        // Save to model via WebSocket
        sendElementCreate({ name, kind, construct, attributes: { _layer: layer } });

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

    const onConnect = useCallback((connection: Connection) => {
        const { source, target } = connection;
        if (!source || !target) return;

        const sourceEl = model?.elements[source];
        const targetEl = model?.elements[target];

        // Show relationship picker at approximate mouse position
        setRelPicker({
            x: window.innerWidth / 2 - 120,
            y: window.innerHeight / 2 - 160,
            sourceId: source,
            targetId: target,
            sourceKind: sourceEl?.kind ?? '',
            targetKind: targetEl?.kind ?? '',
        });
    }, [model]);

    const confirmRelationship = useCallback((relType: string) => {
        if (!relPicker || !selectedDiagramId) { setRelPicker(null); return; }

        const { sourceId, targetId } = relPicker;
        const color = REL_COLORS[relType] ?? '#6B7280';
        const edgeId = `e_${sourceId}_${targetId}_${relType}_${Date.now()}`;

        // Add edge to ReactFlow
        const newEdge: FlowEdge = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: relType,
            type: 'default',
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fontSize: '10px', fill: '#374151' },
            labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 4,
            markerEnd: { type: 'arrowclosed' as any, color },
        };
        setEdges(prev => addEdge(newEdge, prev));

        // Persist to SysML
        sendAddRelationship(sourceId, targetId, relType);

        setRelPicker(null);
    }, [relPicker, selectedDiagramId, setEdges]);

    // ─── Node drag stop → stage a per-diagram override ───────────────────────

    const onNodeDragStart = useCallback((_: RFAny, node: FlowNode) => {
        nodeDragStartRef.current = { id: node.id, x: node.position.x, y: node.position.y };
    }, []);

    const onNodeDragStop = useCallback((_: RFAny, node: FlowNode) => {
        const start = nodeDragStartRef.current;
        nodeDragStartRef.current = null;
        if (start?.id === node.id && Math.hypot(node.position.x - start.x, node.position.y - start.y) > 2) {
            // React Flow emits click after pointer-up. Keep a real drag from
            // opening the inspector as though it were a click.
            suppressInspectUntilRef.current = Date.now() + 250;
            setLayoutEditVersion(version => version + 1);
        }
        if (!selectedDiagramId) return;
        markManualLayout();
        const { x, y } = node.position;

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
    }, [selectedDiagramId, setNodeLayout, pushUndo, setNodes, markManualLayout]);

    // ─── Node resize + live orthogonal re-routing ─────────────────────────────

    const onNodesChangeWithResize = useCallback((changes: NodeChange<FlowNode>[]) => {
        // Dimension notifications are emitted while nodes mount and must not
        // turn a freshly opened diagram into a manual, dirty document.
        if (changes.some(change => change.type === 'position')) markManualLayout();
        if (changes.some(change => change.type === 'dimensions' && change.resizing)) {
            markManualLayout();
            setLayoutEditVersion(version => version + 1);
        }
        scheduleGeometryUpdate(applyNodeChanges(changes, nodesRef.current));
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

    const onNodeClick = useCallback((_: RFAny, node: FlowNode) => {
        if (Date.now() < suppressInspectUntilRef.current) return;
        const laneTarget = node.type === 'actionFlowLane'
            ? (node.data as { inspectElementId?: string }).inspectElementId
            : undefined;
        if (!laneTarget && (node.id.startsWith('__') || node.id.includes('__start') || node.id.includes('__done'))) return;
        inspectElement(laneTarget ?? node.id);
        if (selectedDiagramId) setActiveView({ type: 'diagram', diagramId: selectedDiagramId });
    }, [inspectElement, selectedDiagramId, setActiveView]);

    const onNodeDoubleClick = useCallback((event: RFAny, node: FlowNode) => {
        event?.stopPropagation?.();
        if (viewKind === 'actionflow') {
            const hasChildren = Object.values(model?.elements ?? {}).some(el => el.parentAction === node.id);
            if (!hasChildren) return;
            setFocusedActionId(node.id);
            setExpandedActionNodes(new Set());
            inspectElement(null);
            return;
        }
        if (viewKind === 'interconnection') {
            // Drill into a container part's own IBD; a leaf just inspects.
            const isContainer = Boolean((node.data as { isContainer?: boolean }).isContainer);
            if (!isContainer) { inspectElement(node.id); return; }
            setFocusedInterconnectionId(node.id);
            setCollapsedInterconnectionNodes(new Set());
            inspectElement(null);
        }
    }, [viewKind, model?.elements, inspectElement]);

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

    // ─── Non-canvas view kinds (KK-7 Grid, KK-8 Browser) ───────────────────────

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
    // Geometry renderer is deferred (ADR-1-19): the ontology carries no
    // geometric data, so an explicit placeholder beats a fake graph render
    if (selectedDiagram && viewKind === 'geometry') {
        const geoMeta = VIEW_KIND_META.geometry;
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ maxWidth: '380px' }}>
                    <span
                        className="inline-block px-2 py-0.5 rounded font-semibold"
                        style={{ background: geoMeta.color + '20', color: geoMeta.color, fontSize: FONT.badge, marginBottom: '12px' }}
                    >
                        {geoMeta.label}
                    </span>
                    <h3 style={{ fontSize: FONT.lg, fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        {selectedDiagram.name}
                    </h3>
                    <p style={{ fontSize: FONT.md, color: '#9CA3AF', lineHeight: 1.6 }}>
                        Geometry View rendering is deferred (ADR-1-19): the ontology
                        carries no spatial data to draw. This view is recognized and
                        validated, but has no renderer yet.
                    </p>
                </div>
            </div>
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
                eligibleKinds={selectedDiagram?.viewpointId && model?.viewpoints
                    ? new Set(
                        model.viewpoints.find(v => v.id === selectedDiagram.viewpointId)?.visibleKinds ?? []
                    )
                    : undefined}
            />

            {/* ── Canvas ── */}
            <div className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop} onDoubleClick={onPaneDoubleClick}>
                {/* Diagram header */}
                {selectedDiagram && (
                    <div
                        className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs relative"
                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                        {viewKindMeta && (
                            <span className="px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: viewKindMeta.color + '20', color: viewKindMeta.color, fontSize: FONT.badge }}
                                title={`${viewKindMeta.fullName}${diagramMeta ? ` · ${diagramMeta.fullName}` : ''}`}>
                                {viewKind === 'actionflow' ? actionFlowPresentation : viewKindMeta.label}
                            </span>
                        )}
                        <span className="font-medium" style={{ color: '#1a1a1a' }}>{selectedDiagram.name}</span>
                        {selectedDiagram.auto && (
                            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>auto</span>
                        )}

                        {/* Snap toggle */}
                        <ToolbarSep />
                        <IconToggle
                            icon={<Icon.grid />}
                            label="Grid"
                            active={gridVisible}
                            onClick={() => {
                                setGridVisible(visible => {
                                    const next = !visible;
                                    setSnapEnabled(next);
                                    return next;
                                });
                            }}
                            title="Show or hide the canvas grid and snapping (⌘⇧G)"
                        />

                        {/* FBS controls */}
                        {isFBSDiagram && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button onClick={expandAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                    Expand All
                                </button>
                                <button onClick={collapseAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                    Collapse All
                                </button>
                            </>
                        )}

                        {/* Action Flow template controls (KK-4) — iOS-style grouped toolbar */}
                        {viewKind === 'actionflow' && (
                            <>
                                {/* Display toggles: grid (above) + swimlanes read as one group */}
                                <IconToggle
                                    icon={<Icon.lanes />}
                                    active={swimlanesOn}
                                    onClick={() => setSwimlanesOn(s => !s)}
                                    title="Toggle allocation swimlanes"
                                />
                                {swimlanesOn && actionFlowHasStages && (
                                    <IconToggle
                                        icon={<Icon.lanes />}
                                        label="Stage"
                                        active={actionFlowLaneGrouping === 'stage'}
                                        onClick={() => setActionFlowLaneGrouping(current => current === 'stage' ? 'allocation' : 'stage')}
                                        title="Group this flow by its modeled stages"
                                    />
                                )}
                                {swimlanesOn && actionFlowLaneGrouping === 'allocation' && actionFlowDisplayLevels.length > 0 && (
                                    <select
                                        aria-label="Display hierarchy level"
                                        title="Display responsibility lanes at a hierarchy level; the SysML allocation is unchanged"
                                        value={actionFlowDisplayLevel}
                                        onChange={event => setActionFlowDisplayLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                                        className="text-xs font-semibold rounded-lg px-2 py-1"
                                        style={{ color: '#5B6470', background: '#FFFFFF', border: '1px solid #E2E1DB' }}
                                    >
                                        <option value="all">All levels</option>
                                        {actionFlowDisplayLevels.map(level => <option key={level} value={level}>L{level}</option>)}
                                    </select>
                                )}

                                <ToolbarSep />

                                {/* Reading direction — segmented control */}
                                <Segmented
                                    value={actionFlowDirection}
                                    onChange={setActionFlowDirection}
                                    options={[
                                        { value: 'horizontal', icon: <Icon.arrowRight />, title: 'Left-to-right flow' },
                                        { value: 'vertical', icon: <Icon.arrowDown />, title: 'Top-to-bottom flow' },
                                    ]}
                                />

                                <ToolbarSep />

                                {/* Tree state — clustered expand / collapse */}
                                <ToolbarCluster>
                                    <IconButton
                                        icon={<Icon.expand />}
                                        title="Expand all sub-actions"
                                        onClick={() => setExpandedActionNodes(new Set(
                                            Object.values(model?.elements ?? {})
                                                .map(element => element.parentAction)
                                                .filter((id): id is string => Boolean(id)),
                                        ))}
                                    />
                                    <IconButton
                                        icon={<Icon.collapse />}
                                        title="Collapse all sub-actions"
                                        onClick={() => setExpandedActionNodes(new Set())}
                                    />
                                </ToolbarCluster>

                                <ToolbarSep />

                                {/* Connection filter */}
                                <div style={{ position: 'relative' }}>
                                    <IconToggle
                                        icon={<Icon.filter />}
                                        active={flowFiltersOpen}
                                        badge={`${visibleActionFlowKinds.size}/4`}
                                        onClick={() => setFlowFiltersOpen(open => !open)}
                                        title="Choose which modeled connection categories are visible"
                                    />
                                    {flowFiltersOpen && (
                                        <div
                                            className="absolute top-full right-0 mt-2 p-3 rounded-lg"
                                            style={{ width: 264, background: '#FFFFFF', border: '1px solid #D1D5DB', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 30 }}
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
                                </div>
                                {focusedActionId && (
                                    <>
                                        <ToolbarSep />
                                        <IconToggle
                                            icon={<Icon.back />}
                                            label="Parent"
                                            onClick={() => setFocusedActionId(null)}
                                            title="Return to the parent action flow"
                                        />
                                        <span style={{ color: '#6B7280', fontSize: FONT.xs }}>
                                            {model?.elements[focusedActionId]?.name ?? focusedActionId}
                                        </span>
                                    </>
                                )}
                            </>
                        )}

                        {viewKind === 'interconnection' && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button
                                    onClick={() => setCollapsedInterconnectionNodes(new Set())}
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={() => setCollapsedInterconnectionNodes(new Set(
                                        model?.relationships
                                            .filter(r => ['composes', 'composedof', 'aggregation', 'decomposedby'].includes(r.type.toLowerCase()))
                                            .map(r => r.sourceId) ?? [],
                                    ))}
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                >
                                    Collapse All
                                </button>
                                <span style={{ color: '#9CA3AF', fontSize: FONT.xs, fontWeight: 600 }}>Ports</span>
                                <Segmented
                                    value={interconnectionPortDisplay}
                                    onChange={setInterconnectionPortDisplay}
                                    options={[
                                        { value: 'all', label: 'Nested', title: 'Show ports and their nested ports' },
                                        { value: 'ports', label: 'Top', title: 'Show top-level ports only (nested connectors lift to the parent port)' },
                                        { value: 'none', label: 'Off', title: 'Hide ports; connectors run part to part' },
                                    ]}
                                />
                                {/* Drill-down breadcrumb (double-click a part to descend) */}
                                {interconnectionPath.length > 0 && (
                                    <>
                                        <span style={{ color: '#E5E5E0' }}>|</span>
                                        <button
                                            onClick={() => setFocusedInterconnectionId(null)}
                                            className="px-1.5 py-0.5 text-xs font-medium rounded"
                                            style={{ background: '#F7F7F5', color: '#2563EB', border: '1px solid #E5E5E0' }}
                                            title="Back to the whole diagram"
                                        >
                                            ⌂ All
                                        </button>
                                        {interconnectionPath.map((id, i) => {
                                            const last = i === interconnectionPath.length - 1;
                                            return (
                                                <span key={id} className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                                                    <span>›</span>
                                                    <button
                                                        onClick={() => setFocusedInterconnectionId(id)}
                                                        disabled={last}
                                                        className="text-xs font-medium"
                                                        style={{ color: last ? '#1a1a1a' : '#2563EB', fontWeight: last ? 700 : 500, cursor: last ? 'default' : 'pointer' }}
                                                        title={last ? undefined : `Focus ${model?.elements[id]?.name ?? id}`}
                                                    >
                                                        {model?.elements[id]?.name ?? id}
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        )}

                        {/* General template mode switcher (KK-2) */}
                        {isGeneralTemplate && (
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
                                            {m}
                                        </button>
                                    ))}
                                </div>
                                {generalMode !== 'graph' && (
                                    <>
                                        <button onClick={expandAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                            style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                            Expand All
                                        </button>
                                        <button onClick={collapseAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                            style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                            Collapse All
                                        </button>
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
                        {isDecompDiagram && !isFBSDiagram && (
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
                                            {s === 'containment' ? 'Containment' : 'Decomposition'}
                                        </button>
                                    ))}
                                </div>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button onClick={expandAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                    Expand All
                                </button>
                                <button onClick={collapseAll} className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}>
                                    Collapse All
                                </button>
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
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                {usesLayoutProvider && automaticLayoutProviders.length > 0 && (
                                    <select
                                        aria-label="Layout provider"
                                        value={layoutProviderId}
                                        disabled={isLayouting}
                                        onChange={(event) => {
                                            const descriptor = automaticLayoutProviders.find(provider => provider.id === event.target.value);
                                            if (!descriptor) return;
                                            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId];
                                            const layout = withLayoutProvider({
                                                ...(previous ?? { nodes: {}, edges: {} }),
                                                nodes: {},
                                                edges: {},
                                                canvas: { ...previous?.canvas, autoLayout: true },
                                            }, descriptor);
                                            mergeDiagramLayouts({ [selectedDiagramId]: layout });
                                            sendDiagramLayoutUpdate(selectedDiagramId, layout);
                                            positionCacheRef.current.clear();
                                            setRelayoutNonce(value => value + 1);
                                        }}
                                        title="Choose an installed layout provider for this diagram"
                                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                                        style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}
                                    >
                                        {automaticLayoutProviders.map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    aria-pressed={autoLayoutEnabled}
                                    onClick={() => {
                                        if (autoLayoutEnabled) {
                                            markManualLayout();
                                        } else {
                                            const previous = useModelStore.getState().diagramLayouts[selectedDiagramId];
                                            const layout: DiagramLayout = {
                                                nodes: {},
                                                edges: {},
                                                canvas: { ...previous?.canvas, autoLayout: true },
                                            };
                                            mergeDiagramLayouts({ [selectedDiagramId]: layout });
                                            sendDiagramLayoutUpdate(selectedDiagramId, layout);
                                            setRelayoutNonce(value => value + 1);
                                        }
                                    }}
                                    className="px-2 py-0.5 text-xs font-semibold rounded"
                                    style={{
                                        background: autoLayoutEnabled ? '#ECFDF5' : '#FFF7ED',
                                        color: autoLayoutEnabled ? '#047857' : '#C2410C',
                                        border: `1px solid ${autoLayoutEnabled ? '#A7F3D0' : '#FED7AA'}`,
                                    }}
                                    title={autoLayoutEnabled
                                        ? 'Auto layout is on. Drag any item to switch it off and preserve your changes automatically.'
                                        : 'Auto layout is off. Your changes are saved automatically; click to discard overrides and recalculate.'}
                                >
                                    Auto layout: {autoLayoutEnabled ? 'On' : 'Off'}
                                </button>
                            </>
                        )}

                        {selectedDiagramId && viewKind === 'interconnection' && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button
                                    aria-pressed={flowAnimationEnabled}
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
                                    }}
                                    className="px-2 py-0.5 text-xs font-semibold rounded"
                                    style={{
                                        background: flowAnimationEnabled ? '#EFF6FF' : '#F8FAFC',
                                        color: flowAnimationEnabled ? '#1D4ED8' : '#64748B',
                                        border: `1px solid ${flowAnimationEnabled ? '#93C5FD' : '#CBD5E1'}`,
                                    }}
                                    title="Toggle animated source-to-target flow on IBD connectors"
                                >
                                    Flow: {flowAnimationEnabled ? 'On' : 'Off'}
                                </button>
                                <button
                                    aria-pressed={interconnectionLegendOpen}
                                    onClick={() => setInterconnectionLegendOpen(open => !open)}
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1' }}
                                    title="Show or hide the IBD notation legend"
                                >
                                    Legend
                                </button>
                            </>
                        )}
                    </div>
                )}

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

                {viewKind === 'actionflow' && (
                    <div
                        aria-label="Action flow legend"
                        className="absolute right-3 bottom-3 z-10 flex items-center gap-4 px-3 py-2"
                        style={{
                            background: 'rgba(255,255,255,0.96)', border: '1px solid #D1D5DB',
                            borderRadius: 3, color: '#374151', fontSize: FONT.xs,
                        }}
                    >
                        <span style={{ fontWeight: 700 }}>Legend</span>
                        {visibleActionFlowKinds.has('control') && <span className="flex items-center gap-1.5">
                            <span style={{ width: 24, height: 0, borderTop: '2px solid #4B5563' }} />
                            Control flow
                        </span>}
                        {visibleActionFlowKinds.has('data') && <span className="flex items-center gap-1.5">
                            <span style={{ width: 24, height: 0, borderTop: '2.5px solid #3498DB' }} />
                            Object flow
                        </span>}
                        {visibleActionFlowKinds.has('energy') && <span className="flex items-center gap-1.5">
                            <span style={{ width: 24, height: 0, borderTop: '2.5px solid #D97706' }} />
                            Energy flow
                        </span>}
                        {visibleActionFlowKinds.has('material') && <span className="flex items-center gap-1.5">
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
                                    or link elements to it with IncludedIn relationships.
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
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd as any}
                    connectionMode={ConnectionMode.Loose}
                    defaultEdgeOptions={{ interactionWidth: 24 }}
                    snapToGrid={snapEnabled}
                    snapGrid={SNAP_GRID}
                    fitView
                    fitViewOptions={{ ...RF_FIT_VIEW_OPTIONS, minZoom: fitMinZoom }}
                    minZoom={0.1}
                    maxZoom={3}
                    zoomOnScroll
                    panOnScroll
                    panOnScrollMode={'free' as any}
                    selectionOnDrag={false}
                    proOptions={RF_PRO_OPTIONS}
                    style={RF_STYLE}
                >
                    {gridVisible && <Background color="#C5C7C2" gap={20} size={1.5} />}
                    <Controls />
                    {nodes.length > 20 && (
                        <MiniMap
                            style={MINIMAP_STYLE}
                            nodeColor={miniMapNodeColor}
                            maskColor="rgba(247, 247, 245, 0.7)"
                        />
                    )}
                </ReactFlow>
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
                    sourceKind={relPicker.sourceKind}
                    targetKind={relPicker.targetKind}
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

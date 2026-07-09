// ─── DiagramCanvas ────────────────────────────────────────────────────────────
//
// Interactive diagram canvas with:
//   - Sidecar position persistence (.memo/layouts/<diagramId>.yaml)
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
    ConnectionMode,
    type Node as RFNode,
    type Edge as RFEdge,
    type Connection,
    type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RFAny = any;

import type { MemoElement, DiagramLayout, ViewKind } from '@memo/core';
import { computeImpact } from '@memo/core/lib/analysis/impact.js';
import { useModelStore, getDiagram } from '../store/model-store';
import { sendElementCreate, sendAddRelationship, sendDiagramLayoutUpdate, sendElementUpdate } from '../store/ws-client';
import { LAYER_COLORS, REL_COLORS, DIAGRAM_TYPE_META, VIEW_KIND_META } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import {
    computeLayout, computeDecompositionLayout, computeContainmentLayout,
    computeFBSLayout, buildDecompositionTree, buildFunctionalTree,
} from './layout';
import {
    computeGeneralViewLayout, resolveGeneralMode, buildGeneralViewTree,
    GENERAL_VIEW_MODES, type GeneralViewMode,
} from './templates/general-view';
import { computeInterconnectionLayout } from './templates/interconnection-view';
import { computeActionFlowViewLayout } from './templates/actionflow-view';
import { computeStateTransitionLayout } from './templates/statetransition-view';
import { computeSequenceLayout } from './templates/sequence-view';
import { DecompositionNode } from './DecompositionNode';
import { InterconnectionNode } from './InterconnectionNode';
import { ActionFlowNode, ActionFlowLaneNode } from './ActionFlowNode';
import { StateNode } from './StateNode';
import { SeqLifelineNode, SeqSectionNode, SeqOccurrenceNode } from './SequenceNodes';
import { DiagramInteractiveNode, type DiagramInteractiveNodeData } from './DiagramInteractiveNode';
import { DiagramPalette } from './DiagramPalette';
import { RelationshipPicker } from './RelationshipPicker';
import { NodeContextMenu, EdgeContextMenu, type EdgeLineStyle } from './DiagramContextMenus';
import { DecisionNode, ForkNode, StartEndNode } from './WorkflowNodes';

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
const LAYOUT_DEBOUNCE_MS = 500;
const UNDO_STACK_DEPTH = 50;

// ─── Typed aliases to avoid DOM Node collision ───────────────────────────────
type FlowNode = RFNode<Record<string, RFAny>>;
type FlowEdge = RFEdge<Record<string, RFAny>>;

// ─── Undo/redo command pattern ────────────────────────────────────────────────

interface UndoCommand {
    do: () => void;
    undo: () => void;
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

// ─── Main canvas inner (inside ReactFlowProvider) ─────────────────────────────

function DiagramCanvasInner() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setSelectedOntologyKind = useModelStore(s => s.setSelectedOntologyKind);
    const diagramLayouts = useModelStore(s => s.diagramLayouts);
    const setNodeLayout = useModelStore(s => s.setNodeLayout);
    const mergeDiagramLayouts = useModelStore(s => s.mergeDiagramLayouts);
    const updateDiagramElementIds = useModelStore(s => s.updateDiagramElementIds);
    const { fitView, screenToFlowPosition } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
    const [isLayouting, setIsLayouting] = useState(false);
    const [layoutVersion, setLayoutVersion] = useState(0);
    const [paletteCollapsed, setPaletteCollapsed] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);

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
    const layoutTimer = useRef<ReturnType<typeof setTimeout>>();

    // Get the selected diagram
    const selectedDiagram = getDiagram(model, selectedDiagramId);
    const diagramMeta = selectedDiagram ? DIAGRAM_TYPE_META[selectedDiagram.diagramType] : null;
    const isDecompDiagram = !!selectedDiagram?.properties?.layoutStyle;
    const isFBSDiagram = selectedDiagram?.properties?.layoutStyle === 'fbs';
    const currentLayout = selectedDiagramId ? diagramLayouts[selectedDiagramId] : undefined;

    // Spec view kind (Epic KK): every diagram resolves to one of the 8 kinds
    const viewKind: ViewKind | undefined = selectedDiagram
        ? ((selectedDiagram.viewKind as ViewKind | undefined) ?? diagramMeta?.viewKind ?? 'general')
        : undefined;
    const viewKindMeta = viewKind ? VIEW_KIND_META[viewKind] : null;
    // General template mode — legacy layoutStyle diagrams keep their own controls
    const isGeneralTemplate = viewKind === 'general' && !isDecompDiagram && !isFBSDiagram;
    const [generalMode, setGeneralMode] = useState<GeneralViewMode>('graph');
    // Action Flow template (KK-4): swimlane banding toggle
    const [swimlanesOn, setSwimlanesOn] = useState(true);

    // Decomposition state
    const [layoutStyle, setLayoutStyle] = useState<'containment' | 'decomposition'>('containment');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [nodeDirections, setNodeDirections] = useState<Map<string, 'vertical' | 'horizontal'>>(new Map());
    const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Fresh per-diagram state: honor the view's declared layoutHint
    useEffect(() => {
        setGeneralMode(resolveGeneralMode(selectedDiagram?.properties));
        setSwimlanesOn(true);
        setExpandedNodes(new Set());
        positionCacheRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDiagramId]);

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

    const toggleDirection = useCallback((nodeId: string) => {
        const tree = buildActiveTree();
        if (tree) {
            const clearDescendants = (id: string) => {
                positionCacheRef.current.delete(id);
                for (const cid of (tree.childrenMap.get(id) || [])) clearDescendants(cid);
            };
            clearDescendants(nodeId);
        }
        setNodeDirections(prev => {
            const next = new Map(prev);
            const current = next.get(nodeId) || 'vertical';
            next.set(nodeId, current === 'vertical' ? 'horizontal' : 'vertical');
            return next;
        });
    }, [buildActiveTree]);

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
        setLayoutVersion(v => v + 1);
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
        return rawNodes.map(n => {
            const pos = layout.nodes[n.id];
            if (!pos) return n;
            const edgeOverride = layout.edges?.[n.id];
            return {
                ...n,
                position: { x: pos.x, y: pos.y },
                ...(pos.width ? { width: pos.width } : {}),
                ...(pos.height ? { height: pos.height } : {}),
                data: {
                    ...n.data,
                    bgColor: pos.color || undefined,
                },
            };
        });
    }, []);

    // ─── Layout computation ────────────────────────────────────────────────────

    useEffect(() => {
        if (!model) return;

        // Guard against stale async completions: a slower earlier layout must
        // not overwrite the result of the branch this effect run selected
        // (e.g. graph ELK resolving after a sync containment layout)
        let cancelled = false;
        const apply = (
            { nodes: n, edges: e }: { nodes: FlowNode[]; edges: FlowEdge[] },
            interactive = true,
        ) => {
            if (cancelled) return;
            setNodes(interactive ? applyInteractiveData(n) : n);
            setEdges(e);
            setIsLayouting(false);
            setLayoutVersion(v => v + 1);
        };
        const fail = (label: string) => (err: unknown) => {
            if (cancelled) return;
            console.error(`${label} layout error:`, err);
            setIsLayouting(false);
        };

        if (isFBSDiagram) {
            setIsLayouting(true);
            computeFBSLayout(model, {
                expandedNodes, nodeDirections,
                callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
            }).then(r => apply(r)).catch(fail('FBS'));
        } else if (isDecompDiagram) {
            if (layoutStyle === 'decomposition') {
                setIsLayouting(true);
                computeDecompositionLayout(model, {
                    expandedNodes, nodeDirections,
                    callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
                }).then(r => apply(r)).catch(fail('Decomposition'));
            } else {
                apply(computeContainmentLayout(model, {
                    expandedNodes,
                    callbacks: { onToggleExpand: toggleExpand },
                }));
            }
        } else if (viewKind === 'interconnection') {
            // Interconnection template (KK-3): parts with boundary ports,
            // typed connectors, nested containment
            setIsLayouting(true);
            computeInterconnectionLayout(model, {
                viewpointFilter,
                relationshipTypes: selectedDiagram?.relationshipTypes,
            }).then(r => apply(r, false)).catch(fail('Interconnection'));
        } else if (viewKind === 'actionflow') {
            // Action Flow template (KK-4): actions with parameter ports,
            // item flows, successions, optional swimlanes
            setIsLayouting(true);
            computeActionFlowViewLayout(model, {
                viewpointFilter,
                swimlanes: swimlanesOn,
            }).then(r => apply(r, false)).catch(fail('Action flow'));
        } else if (viewKind === 'statetransition') {
            // State Transition template (KK-5): nested states, transition
            // edges with trigger [guard] labels
            setIsLayouting(true);
            computeStateTransitionLayout(model, { viewpointFilter })
                .then(r => apply(r, false)).catch(fail('State transition'));
        } else if (viewKind === 'sequence') {
            // Sequence template (KK-6): lifelines, chronological messages
            apply(computeSequenceLayout(model, { viewpointFilter }), false);
        } else if (isGeneralTemplate && generalMode !== 'graph') {
            // General template (KK-2) tree/containment modes
            setIsLayouting(true);
            computeGeneralViewLayout(model, {
                mode: generalMode,
                viewpointFilter,
                expandedNodes, nodeDirections,
                callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
            }).then(r => apply(r)).catch(fail('General template'));
        } else {
            // Standard diagram / General template graph mode — check for sidecar
            const relationshipTypes = selectedDiagram?.relationshipTypes;
            const compartments = isGeneralTemplate;
            const overlaySidecar = currentLayout && Object.keys(currentLayout.nodes).length > 0;
            setIsLayouting(true);
            computeLayout(model, { viewpointFilter, relationshipTypes, compartments }).then(({ nodes: n, edges: e }) => {
                // Overlay sidecar positions onto the skeleton nodes when present
                apply({ nodes: overlaySidecar ? buildNodesFromSidecar(n, currentLayout!) : n, edges: e });
            }).catch(fail('Standard'));
        }

        return () => { cancelled = true; };
    }, [model, viewpointFilter, isDecompDiagram, isFBSDiagram, layoutStyle,
        viewKind, isGeneralTemplate, generalMode, swimlanesOn,
        selectedDiagram?.relationshipTypes,
        expandedNodes, nodeDirections, toggleExpand, toggleDirection, currentLayout,
        buildNodesFromSidecar, applyInteractiveData]);

    // Re-fit after layout
    useEffect(() => {
        if (layoutVersion === 0) return;
        const timer = setTimeout(() => {
            fitView({ padding: 0.08, maxZoom: 2, duration: 500 });
        }, 200);
        return () => clearTimeout(timer);
    }, [layoutVersion, fitView]);

    // Highlight selected element
    useEffect(() => {
        if (!selectedElementId) return;
        setNodes(prev => prev.map(n => ({
            ...n,
            style: {
                ...n.style,
                boxShadow: n.id === selectedElementId
                    ? '0 0 0 2px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.3)'
                    : undefined,
                opacity: selectedElementId ? (n.id === selectedElementId ? 1 : 0.5) : 1,
            },
        })));
    }, [selectedElementId, setNodes]);

    // Focus Mode (#22): filter graph to N-hop neighbors using computeImpact
    useEffect(() => {
        if (!focusNodeId || !model) return;
        const impact = computeImpact(model, focusNodeId, 'both', focusDepth);
        const visibleIds = new Set(impact.nodes.map((n: { id: string }) => n.id));
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
                fitView({ padding: 0.08, maxZoom: 2, duration: 400 });
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fitView]);

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

    // ─── Node drag stop → save to sidecar ─────────────────────────────────────

    const onNodeDragStop = useCallback((_: RFAny, node: FlowNode) => {
        if (!selectedDiagramId) return;
        const { x, y } = node.position;

        const prevPos = positionCacheRef.current.get(node.id);
        positionCacheRef.current.set(node.id, { x, y });
        setNodeLayout(selectedDiagramId, node.id, { x, y });

        // Debounced save
        clearTimeout(layoutTimer.current);
        layoutTimer.current = setTimeout(() => {
            const layout = useModelStore.getState().diagramLayouts[selectedDiagramId];
            if (layout) sendDiagramLayoutUpdate(selectedDiagramId, layout);
        }, LAYOUT_DEBOUNCE_MS);

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
    }, [selectedDiagramId, setNodeLayout, pushUndo, setNodes]);

    // ─── Node resize stop → save to sidecar ───────────────────────────────────

    const onNodesChangeWithResize = useCallback((changes: NodeChange<FlowNode>[]) => {
        onNodesChange(changes);
        // Debounce layout save after resize
        if (changes.some(c => c.type === 'dimensions') && selectedDiagramId) {
            clearTimeout(layoutTimer.current);
            layoutTimer.current = setTimeout(() => {
                const layout = useModelStore.getState().diagramLayouts[selectedDiagramId];
                if (layout) sendDiagramLayoutUpdate(selectedDiagramId, layout);
            }, LAYOUT_DEBOUNCE_MS);
        }
    }, [onNodesChange, selectedDiagramId]);

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
        selectElement(node.id);
    }, [selectElement]);

    const onPaneClick = useCallback(() => {
        selectElement(null);
        setNodeCtx(null);
        setEdgeCtx(null);
        setNodes(prev => prev.map(n => ({
            ...n,
            style: { ...n.style, opacity: 1, boxShadow: undefined },
        })));
    }, [selectElement, setNodes]);

    // ─── Node context menu actions ─────────────────────────────────────────────

    const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
        if (!selectedDiagramId) return;
        setNodeLayout(selectedDiagramId, nodeId, {
            ...(diagramLayouts[selectedDiagramId]?.nodes[nodeId] ?? { x: 0, y: 0 }),
            color: color || undefined,
        });
        setNodes(prev => prev.map(n => n.id === nodeId
            ? { ...n, data: { ...n.data, bgColor: color || undefined } } : n));

        clearTimeout(layoutTimer.current);
        layoutTimer.current = setTimeout(() => {
            const layout = useModelStore.getState().diagramLayouts[selectedDiagramId];
            if (layout) sendDiagramLayoutUpdate(selectedDiagramId, layout);
        }, LAYOUT_DEBOUNCE_MS);
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
                        className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                        {viewKindMeta && (
                            <span className="px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: viewKindMeta.color + '20', color: viewKindMeta.color, fontSize: FONT.badge }}
                                title={`${viewKindMeta.fullName}${diagramMeta ? ` · ${diagramMeta.fullName}` : ''}`}>
                                {viewKindMeta.label}
                            </span>
                        )}
                        <span className="font-medium" style={{ color: '#1a1a1a' }}>{selectedDiagram.name}</span>
                        {selectedDiagram.auto && (
                            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>auto</span>
                        )}

                        {/* Snap toggle */}
                        <span style={{ color: '#E5E5E0' }}>|</span>
                        <button
                            onClick={() => setSnapEnabled(s => !s)}
                            className="px-2 py-0.5 text-xs font-medium rounded"
                            style={{
                                background: snapEnabled ? '#1B3A4B' : '#F7F7F5',
                                color: snapEnabled ? '#FFFFFF' : '#6B7280',
                                border: '1px solid #E5E5E0',
                            }}
                            title="Toggle snap to grid (⌘⇧G)"
                        >
                            Grid
                        </button>

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

                        {/* Action Flow template swimlane toggle (KK-4) */}
                        {viewKind === 'actionflow' && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button
                                    onClick={() => setSwimlanesOn(s => !s)}
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{
                                        background: swimlanesOn ? '#1B3A4B' : '#F7F7F5',
                                        color: swimlanesOn ? '#FFFFFF' : '#6B7280',
                                        border: '1px solid #E5E5E0',
                                    }}
                                    title="Toggle allocation swimlanes"
                                >
                                    Lanes
                                </button>
                            </>
                        )}

                        {/* General template mode switcher (KK-2) */}
                        {isGeneralTemplate && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <div className="flex rounded overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                    {GENERAL_VIEW_MODES.map(m => (
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
                            </>
                        )}

                        {/* Reset layout */}
                        {!isDecompDiagram && !isFBSDiagram && currentLayout && (
                            <>
                                <span style={{ color: '#E5E5E0' }}>|</span>
                                <button
                                    onClick={() => {
                                        if (!selectedDiagramId) return;
                                        mergeDiagramLayouts({ [selectedDiagramId]: { nodes: {}, edges: {} } });
                                        sendDiagramLayoutUpdate(selectedDiagramId, { nodes: {}, edges: {} });
                                        resetLayout();
                                    }}
                                    className="px-2 py-0.5 text-xs font-medium rounded"
                                    style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                    title="Reset to auto layout"
                                >
                                    Auto Layout
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
                    onNodesChange={onNodesChangeWithResize}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onNodeDragStop={onNodeDragStop}
                    onNodeContextMenu={handleNodeContextMenu}
                    onEdgeContextMenu={handleEdgeContextMenu}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd as any}
                    connectionMode={ConnectionMode.Loose}
                    snapToGrid={snapEnabled}
                    snapGrid={SNAP_GRID}
                    fitView
                    fitViewOptions={RF_FIT_VIEW_OPTIONS}
                    minZoom={0.1}
                    maxZoom={3}
                    zoomOnScroll
                    panOnScroll
                    panOnScrollMode={'free' as any}
                    selectionOnDrag={false}
                    proOptions={RF_PRO_OPTIONS}
                    style={RF_STYLE}
                >
                    <Background color="#DEDED8" gap={20} size={1} />
                    <Controls />
                    <MiniMap
                        style={MINIMAP_STYLE}
                        nodeColor={miniMapNodeColor}
                        maskColor="rgba(247, 247, 245, 0.7)"
                    />
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
                        const text = el.line ? `${el.file}:${el.line}` : el.file;
                        navigator.clipboard.writeText(text).catch(() => {});
                        setSourceToast(text);
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

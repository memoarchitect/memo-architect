// ─── MaxGraphCanvas ───────────────────────────────────────────────────────────
//
// Alternate diagram surface on maxGraph (@maxgraph/core), the maintained
// TypeScript successor of mxGraph — the engine behind draw.io. Selected via
// the renderer feature flag (diagram/renderer-selection); the default
// ReactFlow canvas remains the authoring surface.
//
// Scope (descriptor capabilities): draws every canvas view kind through the
// same template layout pipeline, supports pan/zoom/fit, node drag persisted
// to the diagram sidecar layout, selection → inspector, and SVG export.
// Element creation, edge drawing and context menus stay on ReactFlow.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ConnectionHandler, FitPlugin, Graph, InternalEvent, Point,
    RubberBandHandler, SelectionHandler, getDefaultPlugins,
    type Cell, type CellStyle,
} from '@maxgraph/core';
import type { DiagramLayout, MemoElement } from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram, getRegistries } from '../../../store/model-store';
import { sendDiagramLayoutUpdate } from '../../../store/ws-client';
import { RelationshipPicker, type RelationshipChoice } from '../../../views/RelationshipPicker';
import { FONT } from '../../../styles/tokens';
import { GridView } from '../../../views/GridView';
import { BrowserView } from '../../../views/BrowserView';
import { ScreenLayoutView } from '../../../views/ScreenLayoutView';
import { selectedLayoutProviderId } from '../../layout-selection';
import { commonDisplayLevels, type ActionFlowDisplayLevel, type ActionFlowKind, type ActionFlowLaneGrouping } from '../../../views/templates/actionflow-view';
import {
    buildViewpointFilter, computeDiagramScene, nonCanvasKind, resolveViewKind,
} from './scene-source';
import { notationSceneToSvg, type NotationScene, type NotationNode } from '../../notation-scene';

const CANVAS_BG = '#F7F7F5';
const SCENE_TIMEOUT_MS = 8_000;

// Same progress keyframe DiagramCanvas injects — this canvas may load first
const LAYOUT_PROGRESS_STYLE_ID = 'memo-layout-progress';
if (typeof document !== 'undefined' && !document.getElementById(LAYOUT_PROGRESS_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = LAYOUT_PROGRESS_STYLE_ID;
    style.textContent = '@keyframes memo-layout-progress { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
    document.head.appendChild(style);
}

function nodeStyle(spec: NotationNode): CellStyle {
    if (spec.isFrame) {
        return {
            fillColor: 'none',
            strokeColor: spec.color,
            opacity: 35,
            rounded: true,
            fontColor: spec.color,
            fontSize: 11,
            align: 'left',
            verticalAlign: 'top',
            spacingLeft: 8,
            spacingTop: 4,
        };
    }
    return {
        fillColor: '#FFFFFF',
        strokeColor: spec.color,
        strokeWidth: 1.5,
        rounded: true,
        fontColor: '#1F2937',
        fontSize: 12,
        whiteSpace: 'wrap',
        verticalAlign: 'middle',
    };
}

/** Overlay saved sidecar geometry (user drags) onto the computed scene. */
function fitGraph(graph: Graph | null): void {
    graph?.getPlugin<FitPlugin>('fit')?.fit({ margin: 24 });
}

/**
 * Fit only once the container has real dimensions. Calling fit() on a 0×0
 * container (which happens on the first paint of a route transition) collapses
 * the whole diagram into a corner at a broken scale. Fit on the next frame if
 * the container is already sized, else observe until it is, then disconnect.
 * Returns a cleanup that cancels any pending fit.
 */
function fitWhenSized(graph: Graph, container: HTMLElement): () => void {
    let settled = false;
    const attempt = (): boolean => {
        if (settled) return true;
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            fitGraph(graph);
            settled = true;
        }
        return settled;
    };
    const raf = requestAnimationFrame(attempt);
    if (attempt()) return () => cancelAnimationFrame(raf);
    const observer = new ResizeObserver(() => { if (attempt()) observer.disconnect(); });
    observer.observe(container);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
}

function applySavedLayout(scene: NotationScene, saved?: DiagramLayout): NotationScene {
    if (!saved || (Object.keys(saved.nodes).length === 0 && Object.keys(saved.edges).length === 0)) return scene;
    const nodes = scene.nodes.map(node => {
        const layout = saved.nodes[node.id];
        if (!layout) return node;
        return {
            ...node,
            x: layout.x,
            y: layout.y,
            ...(layout.width ? { width: layout.width } : {}),
            ...(layout.height ? { height: layout.height } : {}),
        };
    });
    const nodeById = new Map(nodes.map(node => [node.id, node]));

    return {
        ...scene,
        // Swimlanes are derived backgrounds, not independently positioned
        // document nodes. Recompute their bounds after applying saved action
        // geometry so a stale sidecar cannot leave actions outside their lane.
        nodes: nodes.map(node => {
            if (!node.isFrame || !node.memberIds?.length) return node;
            const members = node.memberIds.map(id => nodeById.get(id)).filter(Boolean) as NotationNode[];
            if (members.length === 0) return node;
            const minX = Math.min(...members.map(member => member.x));
            const minY = Math.min(...members.map(member => member.y));
            const maxX = Math.max(...members.map(member => member.x + member.width));
            const maxY = Math.max(...members.map(member => member.y + member.height));
            const column = node.orientation === 'column';
            return {
                ...node,
                x: column ? minX - 36 : minX - 120,
                y: column ? minY - 32 : minY - 36,
                width: maxX - minX + (column ? 72 : 156),
                height: maxY - minY + (column ? 68 : 72),
            };
        }),
        // ReactFlow persists a complete route including the terminal points;
        // maxGraph attaches terminals to cells itself, so it needs bends only.
        edges: scene.edges.map(edge => {
            const points = saved.edges[edge.id]?.points;
            if (!points) return edge;
            return {
                ...edge,
                points: points.length > 2
                    ? points.slice(1, -1).map(point => ({ x: point.x, y: point.y }))
                    : [],
            };
        }),
    };
}

export function MaxGraphCanvas() {
    const model = useModelStore(s => s.model);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const inspectElement = useModelStore(s => s.inspectElement);
    const inspectRelationship = useModelStore(s => s.inspectRelationship);
    const diagramLayouts = useModelStore(s => s.diagramLayouts);
    const mergeDiagramLayouts = useModelStore(s => s.mergeDiagramLayouts);
    const createRelationship = useModelStore(s => s.createRelationship);

    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);
    const previousSceneModelRef = useRef(model);
    const previousSceneDiagramRef = useRef(selectedDiagramId);
    const preservedViewportRef = useRef<{ scale: number; x: number; y: number } | null>(null);
    const [scene, setScene] = useState<NotationScene | null>(null);
    const [isComputing, setIsComputing] = useState(false);
    const [sceneError, setSceneError] = useState<string | null>(null);
    const [swimlanes, setSwimlanes] = useState(true);
    const [laneGrouping, setLaneGrouping] = useState<ActionFlowLaneGrouping>('allocation');
    const [displayLevel, setDisplayLevel] = useState<ActionFlowDisplayLevel>('all');
    const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
    const [visibleFlowKinds, setVisibleFlowKinds] = useState<Set<ActionFlowKind>>(new Set(['control', 'data', 'energy', 'material']));
    const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());
    const [focusedActionId, setFocusedActionId] = useState<string | null>(null);
    /** Selected vertex count — the align tools appear from two. */
    const [selectionCount, setSelectionCount] = useState(0);
    /** Open relationship picker for an interactively drawn connector. */
    const [relPicker, setRelPicker] = useState<{ sourceElement: MemoElement; targetElement: MemoElement } | null>(null);
    /** Bumped to rebuild the graph — e.g. after resetting to the auto layout. */
    const [rebuildNonce, setRebuildNonce] = useState(0);

    const selectedDiagram = getDiagram(model, selectedDiagramId);
    const viewKind = resolveViewKind(selectedDiagram);
    const nonCanvas = nonCanvasKind(viewKind);
    const currentLayout = selectedDiagramId ? diagramLayouts[selectedDiagramId] : undefined;
    const layoutProviderId = selectedLayoutProviderId(currentLayout);
    const actionFlowLevels = useMemo(() => {
        if (!model || !selectedDiagram) return [];
        const included = new Set(selectedDiagram.elementIds);
        return commonDisplayLevels(Object.values(model.elements)
            .filter(element => included.has(element.id) && element.allocatedTo)
            .map(element => element.allocatedTo!), model);
    }, [model, selectedDiagram]);

    // ── Scene computation (same template pipeline as the ReactFlow canvas) ────
    useEffect(() => {
        if (!model || nonCanvas) { setScene(null); return; }
        const graph = graphRef.current;
        const modelRefresh = previousSceneModelRef.current !== model
            && previousSceneDiagramRef.current === selectedDiagramId;
        if (modelRefresh && graph) {
            const view = graph.getView();
            preservedViewportRef.current = {
                scale: view.scale,
                x: view.translate.x,
                y: view.translate.y,
            };
        } else {
            preservedViewportRef.current = null;
        }
        previousSceneModelRef.current = model;
        previousSceneDiagramRef.current = selectedDiagramId;
        let cancelled = false;
        setIsComputing(true);
        setSceneError(null);
        const timeout = new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error(`Layout exceeded ${SCENE_TIMEOUT_MS / 1000}s`)), SCENE_TIMEOUT_MS);
        });
        Promise.race([
            computeDiagramScene({
                model,
                diagram: selectedDiagram ?? null,
                selectedViewpointId,
                hiddenLayers,
                layoutProviderId,
                actionFlow: { swimlanes, laneGrouping, displayLevel, expandedActionIds, focusActionId: focusedActionId, visibleFlowKinds, direction },
            }),
            timeout,
        ]).then(result => {
            if (cancelled) return;
            setScene(result);
            setIsComputing(false);
        }).catch((error: unknown) => {
            if (cancelled) return;
            console.error('maxGraph scene error:', error);
            setSceneError('The diagram could not be laid out. Reduce the visible hierarchy or reset the layout.');
            setIsComputing(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model, selectedDiagram, selectedDiagramId, selectedViewpointId, hiddenLayers, layoutProviderId, nonCanvas, swimlanes, laneGrouping, displayLevel, expandedActionIds, focusedActionId, visibleFlowKinds, direction]);

    // ── Persist node drags to the sidecar layout ──────────────────────────────
    const persistMovedCells = useCallback((cells: Cell[]) => {
        if (!selectedDiagramId || cells.length === 0) return;
        const previous = useModelStore.getState().diagramLayouts[selectedDiagramId] ?? { nodes: {}, edges: {} };
        const movedNodes: DiagramLayout['nodes'] = {};
        for (const cell of cells) {
            const id = cell.getId();
            const geometry = cell.getGeometry();
            if (!id || !geometry || cell.isEdge()) continue;
            movedNodes[id] = {
                ...(previous.nodes[id] ?? {}),
                x: geometry.x,
                y: geometry.y,
                width: geometry.width,
                height: geometry.height,
            };
        }
        if (Object.keys(movedNodes).length === 0) return;
        const layout: DiagramLayout = {
            ...previous,
            nodes: { ...previous.nodes, ...movedNodes },
            edges: previous.edges ?? {},
            canvas: { ...previous.canvas, autoLayout: false },
        };
        mergeDiagramLayouts({ [selectedDiagramId]: layout });
        sendDiagramLayoutUpdate(selectedDiagramId, layout);
    }, [selectedDiagramId, mergeDiagramLayouts]);
    const persistMovedCellsRef = useRef(persistMovedCells);
    useEffect(() => { persistMovedCellsRef.current = persistMovedCells; }, [persistMovedCells]);
    // Latest model for the connection handler, which is bound once at mount.
    const modelRef = useRef(model);
    useEffect(() => { modelRef.current = model; }, [model]);

    // ── Graph mount: rebuild cells whenever the scene changes ────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !scene) return;

        InternalEvent.disableContextMenu(container);
        // Rubberband selection on top of the default plugin set — left-drag on
        // empty canvas marquee-selects, the draw.io convention.
        const graph = new Graph(container, undefined, [...getDefaultPlugins(), RubberBandHandler]);
        graphRef.current = graph;
        graph.setPanning(true);
        graph.setCellsEditable(false);
        graph.setCellsResizable(false);
        // Authoring: draw a connector by dragging from a part's edge. The raw
        // maxGraph edge is discarded on CONNECT; the real typed relationship is
        // created through the same picker + store as the ReactFlow canvas, and
        // redrawn when the model change recomputes the scene.
        graph.setConnectable(true);
        graph.setAllowDanglingEdges(false);
        graph.setCellsDisconnectable(false);
        // Frames (lane/boundary cells) stay behind their children when dragged
        graph.options.foldingEnabled = false;
        // draw.io alignment tools: dashed guides that snap a dragged cell to
        // the edges/centres of its neighbours, plus grid snapping.
        graph.setGridEnabled(true);
        graph.setGridSize(20);
        const selectionHandler = graph.getPlugin<SelectionHandler>('SelectionHandler');
        if (selectionHandler) selectionHandler.guidesEnabled = true;

        const saved = selectedDiagramId
            ? useModelStore.getState().diagramLayouts[selectedDiagramId]
            : undefined;
        const positioned = applySavedLayout(scene, saved);

        const parent = graph.getDefaultParent();
        const cellById = new Map<string, Cell>();
        graph.batchUpdate(() => {
            for (const node of positioned.nodes) {
                const cellParent = node.parentId ? cellById.get(node.parentId) ?? parent : parent;
                const vertex = graph.insertVertex({
                    parent: cellParent,
                    id: node.id,
                    value: node.kind && !node.isFrame ? `${node.label}\n«${node.kind}»` : node.label,
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height,
                    style: nodeStyle(node),
                });
                if (node.isFrame) vertex.setConnectable(false);
                cellById.set(node.id, vertex);
            }
            for (const edge of positioned.edges) {
                const source = cellById.get(edge.sourceId);
                const target = cellById.get(edge.targetId);
                if (!source || !target) continue;
                const style: CellStyle = {
                    strokeColor: edge.color,
                    strokeWidth: edge.strokeWidth,
                    dashed: edge.dashed || edge.animated,
                    rounded: true,
                    endArrow: 'block',
                    endFill: true,
                    fontColor: '#6B7280',
                    fontSize: 10,
                    labelBackgroundColor: '#FFFFFF',
                    ...(edge.points.length === 0 && edge.routing !== 'straight'
                        ? { edgeStyle: 'orthogonalEdgeStyle' }
                        : {}),
                };
                const cell = graph.insertEdge({
                    parent,
                    id: edge.id,
                    value: edge.label ?? '',
                    source,
                    target,
                    style,
                });
                const geometry = cell.getGeometry();
                if (geometry && edge.points.length > 0) {
                    geometry.points = edge.points.map(point => new Point(point.x, point.y));
                }
            }
        });

        // Source saves replace the scene, but should not move the camera.
        const preservedViewport = preservedViewportRef.current;
        preservedViewportRef.current = null;
        let cancelFit: (() => void) | undefined;
        if (preservedViewport) {
            graph.getView().scaleAndTranslate(preservedViewport.scale, preservedViewport.x, preservedViewport.y);
        } else if (saved?.canvas?.zoom !== undefined && saved.canvas.pan) {
            graph.getView().setScale(saved.canvas.zoom);
            graph.getView().setTranslate(saved.canvas.pan.x, saved.canvas.pan.y);
        } else {
            // Defer until the container is measured; fit on a 0×0 container
            // (first paint of a route change) collapses the diagram to a corner.
            cancelFit = fitWhenSized(graph, container);
        }

        // A selection changes as soon as a drag starts. Inspect only a genuine
        // click so releasing a moved cell never opens the properties panel.
        graph.addListener(InternalEvent.CLICK, (_sender: unknown, event: { getProperty(name: string): unknown }) => {
            const cell = event.getProperty('cell') as Cell | undefined;
            const id = cell?.getId();
            if (!id) return;
            const state = useModelStore.getState();
            if (state.model?.elements[id]) {
                inspectElement(id);
            } else if (state.model?.relationships.some(rel => rel.id === id)) {
                inspectRelationship(id);
            }
        });

        graph.addListener(InternalEvent.CELLS_MOVED, (_sender: unknown, event: { getProperty(name: string): unknown }) => {
            const cells = (event.getProperty('cells') as Cell[] | undefined) ?? [];
            persistMovedCellsRef.current(cells);
        });

        // Track the vertex selection so the align tools can appear.
        const selectionModel = graph.getSelectionModel();
        const onSelectionChange = () => {
            setSelectionCount(graph.getSelectionCells().filter(cell => !cell.isEdge()).length);
        };
        selectionModel.addListener(InternalEvent.CHANGE, onSelectionChange);

        // Interactive edge draw → typed relationship. maxGraph inserts a raw
        // edge on connect; capture its endpoints, discard it, and open the
        // relationship picker so the ontology decides the legal type.
        const connectionHandler = graph.getPlugin<ConnectionHandler>('ConnectionHandler');
        connectionHandler?.addListener(InternalEvent.CONNECT, (_sender: unknown, event: { getProperty(name: string): unknown }) => {
            const edge = event.getProperty('cell') as Cell | undefined;
            if (!edge) return;
            const sourceId = edge.getTerminal(true)?.getId();
            const targetId = edge.getTerminal(false)?.getId();
            // Remove the phantom edge after connect() settles its own update.
            window.setTimeout(() => {
                try { graph.removeCells([edge], false); } catch { /* already gone */ }
            }, 0);
            const current = modelRef.current;
            const sourceElement = sourceId ? current?.elements[sourceId] : undefined;
            const targetElement = targetId ? current?.elements[targetId] : undefined;
            if (sourceElement && targetElement && sourceId !== targetId) {
                setRelPicker({ sourceElement, targetElement });
            }
        });

        // Wheel zoom toward the cursor (draw.io convention: plain wheel zooms)
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            if (event.deltaY < 0) graph.zoomIn(); else graph.zoomOut();
        };
        container.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cancelFit?.();
            container.removeEventListener('wheel', onWheel);
            selectionModel.removeListener(onSelectionChange);
            setSelectionCount(0);
            graphRef.current = null;
            graph.destroy();
            container.innerHTML = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, selectedDiagramId, rebuildNonce]);

    // ── Selection highlight from the explorer/inspector ───────────────────────
    useEffect(() => {
        const graph = graphRef.current;
        if (!graph) return;
        // A manual multi-selection (rubberband / shift-click) drives the align
        // tools — syncing it back to the single inspected cell would make a
        // two-cell selection unreachable.
        if (graph.getSelectionCells().length > 1) return;
        if (!selectedElementId) { graph.clearSelection(); return; }
        const cell = graph.getDataModel().getCell(selectedElementId);
        if (cell && graph.getSelectionCell() !== cell) graph.setSelectionCell(cell);
    }, [selectedElementId, scene]);

    // draw.io Arrange-style alignment: align selected vertices on an edge or
    // centreline. maxGraph moves the cells; the sidecar persist keeps them.
    const alignSelection = useCallback((align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const graph = graphRef.current;
        if (!graph) return;
        const cells = graph.getSelectionCells().filter(cell => !cell.isEdge());
        if (cells.length < 2) return;
        graph.alignCells(align, cells);
        persistMovedCellsRef.current(cells);
    }, []);

    // Persist the picked relationship; the model change recomputes the scene,
    // which draws the real typed edge. Mirrors the ReactFlow confirm path.
    const confirmRelationship = useCallback(async (choice: RelationshipChoice) => {
        const drawnFromId = relPicker?.sourceElement.id;
        setRelPicker(null);
        if (!selectedDiagramId) return;
        const outcome = await createRelationship({
            type: choice.type,
            sourceId: choice.sourceId,
            targetId: choice.targetId,
            direction: choice.direction,
            flowItem: choice.flowItem,
            selectedElementId: drawnFromId,
            diagramId: selectedDiagramId,
        });
        if (!outcome.success) console.warn(`[MEMO] Relationship rejected: ${outcome.error}`);
    }, [relPicker, selectedDiagramId, createRelationship]);

    // Auto layout is renderer-independent: clear this diagram's saved drags so
    // the computed template layout is shown, and rebuild the graph. Mirrors the
    // ReactFlow canvas's "Auto layout" reset.
    const hasManualLayout = !!currentLayout
        && (Object.keys(currentLayout.nodes ?? {}).length > 0 || currentLayout.canvas?.autoLayout === false);
    const resetLayout = useCallback(() => {
        if (!selectedDiagramId) return;
        const cleared: DiagramLayout = { nodes: {}, edges: {}, canvas: { autoLayout: true } };
        mergeDiagramLayouts({ [selectedDiagramId]: cleared });
        sendDiagramLayoutUpdate(selectedDiagramId, cleared);
        setRebuildNonce(nonce => nonce + 1);
    }, [selectedDiagramId, mergeDiagramLayouts]);

    const exportSvg = useCallback(() => {
        if (!scene) return;
        const blob = new Blob([notationSceneToSvg(scene)], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedDiagram?.name ?? 'diagram'}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }, [scene, selectedDiagram?.name]);

    // ── Non-canvas kinds reuse their dedicated surfaces ───────────────────────
    if (selectedDiagram && model && nonCanvas === 'grid') {
        return <GridView diagram={selectedDiagram} model={model} viewpointFilter={buildViewpointFilter({ model, diagram: selectedDiagram, selectedViewpointId, hiddenLayers })} />;
    }
    if (selectedDiagram && model && nonCanvas === 'browser') {
        return <BrowserView diagram={selectedDiagram} model={model} viewpointFilter={buildViewpointFilter({ model, diagram: selectedDiagram, selectedViewpointId, hiddenLayers })} />;
    }
    if (selectedDiagram && model && nonCanvas === 'geometry') {
        return <ScreenLayoutView diagram={selectedDiagram} model={model} viewpointFilter={buildViewpointFilter({ model, diagram: selectedDiagram, selectedViewpointId, hiddenLayers })} />;
    }

    const toolbarButton: React.CSSProperties = {
        fontSize: FONT.xs, padding: '4px 10px', background: '#FFFFFF', color: '#374151',
        border: '1px solid #E5E5E0', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
    };

    return (
        <div className="relative flex-1 overflow-hidden" style={{ background: CANVAS_BG }}>
            <div ref={containerRef} className="absolute inset-0" style={{ cursor: 'default' }} />
            {viewKind === 'actionflow' && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg p-1.5" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <button style={{ ...toolbarButton, background: swimlanes ? '#1B3A4B' : '#FFFFFF', color: swimlanes ? '#FFFFFF' : '#374151' }} onClick={() => setSwimlanes(value => !value)} title="Toggle swimlanes">Lanes</button>
                    {swimlanes && <button style={toolbarButton} onClick={() => setLaneGrouping(value => value === 'allocation' ? 'stage' : 'allocation')} title="Group lanes by allocation or stage">{laneGrouping === 'allocation' ? 'Allocation' : 'Stage'}</button>}
                    {swimlanes && laneGrouping === 'allocation' && actionFlowLevels.length > 0 && (
                        <select value={displayLevel} onChange={event => setDisplayLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))} style={toolbarButton} title="Responsibility hierarchy level">
                            <option value="all">All levels</option>
                            {actionFlowLevels.map(level => <option key={level} value={level}>L{level}</option>)}
                        </select>
                    )}
                    <button style={{ ...toolbarButton, background: direction === 'horizontal' ? '#1B3A4B' : '#FFFFFF', color: direction === 'horizontal' ? '#FFFFFF' : '#374151' }} onClick={() => setDirection('horizontal')} title="Left-to-right flow">→</button>
                    <button style={{ ...toolbarButton, background: direction === 'vertical' ? '#1B3A4B' : '#FFFFFF', color: direction === 'vertical' ? '#FFFFFF' : '#374151' }} onClick={() => setDirection('vertical')} title="Top-to-bottom flow">↓</button>
                    <button style={toolbarButton} onClick={() => setExpandedActionIds(new Set(Object.values(model?.elements ?? {}).map(element => element.parentAction).filter((id): id is string => Boolean(id))))} title="Expand all sub-actions">Expand</button>
                    <button style={toolbarButton} onClick={() => setExpandedActionIds(new Set())} title="Collapse all sub-actions">Collapse</button>
                    {(['control', 'data', 'energy', 'material'] as const).map(kind => (
                        <button key={kind} style={{ ...toolbarButton, textTransform: 'capitalize', opacity: visibleFlowKinds.has(kind) ? 1 : 0.45 }} onClick={() => setVisibleFlowKinds(previous => {
                            const next = new Set(previous); if (next.has(kind)) next.delete(kind); else next.add(kind); return next;
                        })} title={`Toggle ${kind} flows`}>{kind}</button>
                    ))}
                    {focusedActionId && <button style={toolbarButton} onClick={() => setFocusedActionId(null)}>Parent</button>}
                </div>
            )}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                {selectionCount >= 2 && (
                    <>
                        <button style={toolbarButton} onClick={() => alignSelection('left')} title="Align left edges" aria-label="Align left">⇤</button>
                        <button style={toolbarButton} onClick={() => alignSelection('center')} title="Align horizontal centres" aria-label="Align centres">↔</button>
                        <button style={toolbarButton} onClick={() => alignSelection('right')} title="Align right edges" aria-label="Align right">⇥</button>
                        <button style={toolbarButton} onClick={() => alignSelection('top')} title="Align top edges" aria-label="Align top">⤒</button>
                        <button style={toolbarButton} onClick={() => alignSelection('middle')} title="Align vertical middles" aria-label="Align middles">↕</button>
                        <button style={toolbarButton} onClick={() => alignSelection('bottom')} title="Align bottom edges" aria-label="Align bottom">⤓</button>
                        <span style={{ color: '#E5E5E0' }}>|</span>
                    </>
                )}
                <button
                    style={{ ...toolbarButton, background: hasManualLayout ? '#FFFFFF' : '#ECFDF5', color: hasManualLayout ? '#374151' : '#047857', borderColor: hasManualLayout ? '#E5E5E0' : '#A7F3D0' }}
                    onClick={resetLayout}
                    disabled={!hasManualLayout}
                    title={hasManualLayout ? 'Re-run automatic layout (discards manual moves)' : 'Layout is automatic'}
                >
                    Auto layout
                </button>
                <span style={{ color: '#E5E5E0' }}>|</span>
                <button style={toolbarButton} onClick={() => graphRef.current?.zoomIn()} title="Zoom in">＋</button>
                <button style={toolbarButton} onClick={() => graphRef.current?.zoomOut()} title="Zoom out">－</button>
                <button style={toolbarButton} onClick={() => fitGraph(graphRef.current)} title="Fit diagram to the viewport">Fit view</button>
                <button style={toolbarButton} onClick={exportSvg} title="Download this diagram as an SVG image">Export SVG</button>
            </div>
            {isComputing && (
                <div className="absolute inset-x-0 top-0 z-10" style={{
                    height: 3,
                    background: 'linear-gradient(90deg, transparent, #2DD4A8, transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'memo-layout-progress 1.2s linear infinite',
                }} />
            )}
            {sceneError && (
                <div className="absolute inset-x-0 top-0 z-10 px-4 py-2" style={{
                    background: '#FEF2F2', color: '#B91C1C', fontSize: FONT.xs,
                    borderBottom: '1px solid #FECACA',
                }}>
                    {sceneError}
                </div>
            )}
            {!isComputing && !sceneError && scene && scene.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ color: '#9CA3AF', fontSize: FONT.sm }}>
                    {selectedDiagram ? 'No elements in this view.' : 'Select a view from the explorer.'}
                </div>
            )}
            {relPicker && (
                <RelationshipPicker
                    x={window.innerWidth / 2 - 130}
                    y={window.innerHeight / 2 - 160}
                    sourceElement={relPicker.sourceElement}
                    targetElement={relPicker.targetElement}
                    registries={getRegistries(model)}
                    allowedTypes={selectedDiagram?.relationshipTypes}
                    onSelect={confirmRelationship}
                    onCancel={() => setRelPicker(null)}
                />
            )}
        </div>
    );
}

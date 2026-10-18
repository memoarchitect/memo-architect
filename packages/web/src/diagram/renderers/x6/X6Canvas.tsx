import { rendererModel } from '../../renderer-model';
import { x6InitialFrames, x6PortSlot, x6Terminal, x6Interiors, x6Route, saveX6Snapshot, x6History, type X6Snapshot } from './x6-adapter';
import { orthogonalizeRoute, ibdRouting, type IbdRoutingMode, type IbdRoutingType, type RoutingLayout, type RoutePoint } from '../../ibd-routing';
import { IbdRoutingControls } from '../../toolbars/IbdRoutingControls';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Graph, routerPresets } from '@antv/x6';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { getDiagram, useModelStore } from '../../../store/model-store';
import { sendDiagramLayoutUpdate } from '../../../store/ws-client';
import { buildViewpointFilter } from '../maxgraph/scene-source';
import { selectedLayoutProviderId } from '../../layout-selection';
import { computeInterconnectionLayout, INTERCONNECTION_PORT_SIZE, type PortInfo, type PortSide } from '../../../views/templates/interconnection-view';

const MANHATTAN_ROUTER = 'memo-ibd-manhattan';
Graph.registerRouter(MANHATTAN_ROUTER, function (vertices, options, view) {
    const route = routerPresets.manhattan.call(this, vertices, options, view);
    return orthogonalizeRoute([view.sourceAnchor, ...route, view.targetAnchor]).slice(1, -1);
}, true);

type X6Geometry = {
    nodes: DiagramLayout['nodes'];
    edges?: Record<string, RoutePoint[]>;
    ports?: Record<string, Record<string, { x: number; y: number; side: PortSide }>>;
};
const PORT_COLOUR: Record<string, string> = { in: '#d97706', out: '#16a34a', inout: '#2563eb' };
const X6_FLOW_STYLE_ID = 'memo-x6-flow-animation';

function portArrowPath(direction: PortInfo['direction'], side: PortSide): string | undefined {
    if (!direction) return undefined;
    if (direction === 'inout') return side === 'top' || side === 'bottom'
        ? 'M0 -6V6M-3 -3L0 -6L3 -3M-3 3L0 6L3 3'
        : 'M-6 0H6M-3 -3L-6 0L-3 3M3 -3L6 0L3 3';
    const inward = direction === 'in';
    const pointsOut = (side === 'left' && !inward) || (side === 'right' && inward)
        || (side === 'top' && !inward) || (side === 'bottom' && inward);
    if (side === 'top' || side === 'bottom') {
        const down = (side === 'bottom') === pointsOut;
        return down ? 'M0 -6V6M-3 3L0 6L3 3' : 'M0 6V-6M-3 -3L0 -6L3 -3';
    }
    return pointsOut ? 'M-6 0H6M3 -3L6 0L3 3' : 'M6 0H-6M-3 -3L-6 0L-3 3';
}

function portLabelAttrs(port: PortInfo): Record<string, string | number> {
    const offset = INTERCONNECTION_PORT_SIZE / 2 + 6;
    // React's IBD captions sit above the port centreline. On a vertical wall
    // that means above the square itself, keeping the horizontal connector
    // clear of its own name.
    const aboveSquare = -INTERCONNECTION_PORT_SIZE / 2 - 4;
    if (port.side === 'left') return { x: -offset, y: aboveSquare, textAnchor: 'end' };
    if (port.side === 'right') return { x: offset, y: aboveSquare, textAnchor: 'start' };
    if (port.side === 'top') return { x: 0, y: -offset - 3, textAnchor: 'middle' };
    return { x: 0, y: offset + 9, textAnchor: 'middle' };
}

/**
 * X6 is an IBD-only comparison surface. It deliberately consumes the same
 * template scene as React Flow and the other pilots; changing the selector
 * changes the engine, never the SysML interpretation or ELK placement.
 */
export function X6Canvas() {
    const container = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph>();
    const model = useModelStore(state => rendererModel(state.model));
    const diagramId = useModelStore(state => state.selectedDiagramId);
    const viewpointId = useModelStore(state => state.selectedViewpointId);
    const hiddenLayers = useModelStore(state => state.hiddenLayers);
    const layout = useModelStore(state => diagramId ? state.diagramLayouts[diagramId] : undefined);
    const [previewRouting, setPreviewRouting] = useState<ReturnType<typeof ibdRouting>>();
    const routing = previewRouting ?? ibdRouting(layout);
    const routingRef = useRef(routing);
    routingRef.current = routing;
    const changeRoutingRef = useRef<(patch: { type?: IbdRoutingType; mode?: IbdRoutingMode }) => void>(() => {});
    const [error, setError] = useState('');
    const [selectedNativeEdge, setSelectedNativeEdge] = useState<string>();
    const [selectedNativePort, setSelectedNativePort] = useState<string>();
    const [gridVisible, setGridVisible] = useState(true);
    const [, refreshHistory] = useState(0);
    const replayRef = useRef<(direction: 'undo' | 'redo') => void>(() => {});
    const history = model && diagramId ? x6History(model, diagramId) : undefined;
    // Node positions are persisted beneath canvas.x6. Excluding that branch
    // means a drag saves immediately without destroying and recreating X6.
    const sceneKey = useMemo(() => JSON.stringify({
        layoutProviderId: selectedLayoutProviderId(layout),
        portDisplay: layout?.canvas?.portDisplay,
        connectionDisplay: layout?.canvas?.connectionDisplay,
        showPortText: layout?.canvas?.showPortText,
        showConnectionText: layout?.canvas?.showConnectionText,
        portWalls: layout?.canvas?.portWalls,
        annotations: layout?.annotations,
        flowAnimation: layout?.canvas?.flowAnimation,
    }), [layout]);

    useEffect(() => {
        if (document.getElementById(X6_FLOW_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = X6_FLOW_STYLE_ID;
        style.textContent = '@keyframes memo-x6-flow { to { stroke-dashoffset: -28; } } .memo-x6-flow { animation: memo-x6-flow 700ms linear infinite; }';
        document.head.appendChild(style);
    }, []);

    useEffect(() => {
        if (!container.current || !model || !diagramId) return;
        let disposed = false;
        setError('');
        const host = container.current;
        const diagram = getDiagram(model, diagramId);
        const savedGeometry = (layout?.canvas as (DiagramLayout['canvas'] & { x6?: X6Geometry }) | undefined)?.x6;
        const savedPorts = savedGeometry?.ports ?? {};
        const graph = new Graph({
            container: host,
            width: host.clientWidth,
            height: host.clientHeight,
            grid: { visible: gridVisible, type: 'dot', args: { color: '#e2e8f0', thickness: 1 } },
            background: { color: '#f7f7f5' },
            panning: { enabled: true, eventTypes: ['leftMouseDown', 'mouseWheel'] },
            mousewheel: { enabled: true, factor: 1.05, modifiers: ['ctrl', 'meta'], minScale: 0.05, maxScale: 3 },
            interacting: { nodeMovable: true, edgeMovable: false },
            connecting: { connectionPoint: 'anchor', allowBlank: false, allowLoop: false, allowNode: false, allowEdge: false },
        });
        graphRef.current = graph;
        const resize = new ResizeObserver(() => graph.resize(host.clientWidth, host.clientHeight));
        resize.observe(host);
        const history = x6History(model, diagramId);
        let gesture: { before: X6Snapshot; placement: boolean; cancelled: boolean } | undefined;
        let removeGesture: (() => void) | undefined;
        let replaying = false;
        const capture = (): X6Snapshot => ({
            nodes: Object.fromEntries(graph.getNodes().map(node => [node.id, { ...node.getPosition(), ...node.getSize() }])),
            ports: Object.fromEntries(graph.getNodes().map(node => [node.id, Object.fromEntries(node.getPorts().map(port => [port.id!,
                x6PortSlot({ x: Number(port.args?.x ?? 0), y: Number(port.args?.y ?? 0) }, Number(port.attrs?.portBody?.width ?? INTERCONNECTION_PORT_SIZE), (port.group ?? 'right') as PortSide)]))])),
            edges: Object.fromEntries(graph.getEdges().map(edge => [edge.id, edge.getVertices().map(p => ({ x: p.x, y: p.y }))])),
            attachments: Object.fromEntries(graph.getEdges().map(edge => [edge.id, {
                source: x6Terminal(edge.getSourceCellId()!, edge.getSourcePortId()), target: x6Terminal(edge.getTargetCellId()!, edge.getTargetPortId()),
            }])),
            routing: { ...routingRef.current },
            autoLayout: useModelStore.getState().diagramLayouts[diagramId]?.canvas?.autoLayout !== false,
        });
        const persist = (snapshot: X6Snapshot, geometry = true) => {
            if (disposed) return;
            const previous = useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} };
            const updated = saveX6Snapshot(previous, snapshot, geometry);
            useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
            sendDiagramLayoutUpdate(diagramId, updated);
        };
        const restore = (snapshot: X6Snapshot) => {
            replaying = true;
            routingRef.current = { ...snapshot.routing };
            for (const node of graph.getNodes()) {
                const frame = snapshot.nodes[node.id];
                if (frame) { node.setPosition(frame.x, frame.y, { deep: false }); if (frame.width && frame.height) node.setSize(frame.width, frame.height); }
                for (const port of node.getPorts()) {
                    const slot = snapshot.ports[node.id]?.[port.id!];
                    const half = Number(port.attrs?.portBody?.width ?? INTERCONNECTION_PORT_SIZE) / 2;
                    if (slot) node.portProp(port.id!, 'args', { x: slot.x + half, y: slot.y + half });
                }
            }
            for (const edge of graph.getEdges()) {
                const terminals = snapshot.attachments[edge.id];
                if (terminals) { edge.setSource(terminals.source); edge.setTarget(terminals.target); }
                edge.setVertices(snapshot.edges[edge.id] ?? []); configureEdge(edge);
            }
            showTools(); replaying = false;
        };
        const finish = () => {
            const current = gesture;
            if (!current) return;
            gesture = undefined; removeGesture?.(); removeGesture = undefined; setPreviewRouting(undefined);
            if (current.cancelled) { restore(current.before); return; }
            const after = capture();
            // A click/selection must neither author placement nor save.
            if (JSON.stringify(after) === JSON.stringify(current.before)) return;
            if (current.placement) after.autoLayout = false;
            if (history.push(current.before, after, true)) { persist(after); refreshHistory(n => n + 1); }
        };
        const begin = (placement: boolean) => {
            if (gesture || replaying || disposed) return;
            gesture = { before: capture(), placement, cancelled: false };
            const up = () => { queueMicrotask(() => { if (!disposed) finish(); }); };
            const cancel = (event?: KeyboardEvent) => {
                if (event && event.key !== 'Escape') return;
                if (gesture) { gesture.cancelled = true; restore(gesture.before); setPreviewRouting(undefined); }
            };
            const blur = () => { cancel(); finish(); };
            window.addEventListener('mouseup', up);
            window.addEventListener('keydown', cancel);
            window.addEventListener('blur', blur);
            removeGesture = () => { window.removeEventListener('mouseup', up); window.removeEventListener('keydown', cancel); window.removeEventListener('blur', blur); };
        };
        replayRef.current = direction => {
            if (gesture) return;
            const entry = history.step(direction);
            if (entry) { restore(entry.snapshot); persist(entry.snapshot, entry.geometry); refreshHistory(n => n + 1); }
        };
        const keyboard = (event: KeyboardEvent) => {
            if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault(); replayRef.current(event.shiftKey ? 'redo' : 'undo');
            }
        };
        window.addEventListener('keydown', keyboard);
        let containerIds: string[] = [];
        let selectedEdgeId: string | undefined;
        let selectedNodeId: string | undefined;
        const configureEdge = (edge: ReturnType<Graph['getEdges']>[number]) => {
            const { mode, type } = routingRef.current;
            const mapping = x6Route(type, mode);
            edge.setRouter(mapping.router === MANHATTAN_ROUTER ? { name: MANHATTAN_ROUTER, args: { padding: 16, step: 20,
                maxLoopCount: 20000, perpendicular: false, precision: 4, maxDirectionChange: 180, excludeNodes: containerIds } }
                : { name: mapping.router, args: { padding: 16 } });
            edge.setConnector({ name: mapping.connector, args: { radius: 6 } });
        };
        const showTools = () => {
            setSelectedNativeEdge(selectedEdgeId);
            graph.getNodes().forEach(node => node.attr('body/strokeWidth', node.id === selectedNodeId ? 3 : 1.5));
            for (const edge of graph.getEdges()) {
                edge.removeTools();
                if (edge.id === selectedEdgeId) edge.addTools(routingRef.current.mode === 'manual'
                    ? [{ name: 'segments', args: { removeRedundancies: false } }, { name: 'vertices', args: { addable: false, snapRadius: 0, removeRedundancies: false } }]
                    : [{ name: 'segments' }]);
            }
        };
        const changeRouting = (patch: { type?: IbdRoutingType; mode?: IbdRoutingMode }, refreshTools = true, preview = false) => {
            const before = capture();
            if (patch.mode === 'manual' && routingRef.current.mode !== 'manual') {
                for (const edge of graph.getEdges()) {
                    const view = graph.findViewByCell(edge) as { routePoints?: RoutePoint[] } | null;
                    if (view?.routePoints) edge.setVertices(view.routePoints.map(point => ({ x: point.x, y: point.y })));
                }
            }
            const next = { ...routingRef.current, ...patch };
            routingRef.current = next;
            if (preview) setPreviewRouting(next);
            for (const edge of graph.getEdges()) {
                if (patch.mode === 'automatic') edge.setVertices([]);
                configureEdge(edge);
            }
            if (refreshTools) showTools();
            const after = capture();
            if (!preview && history.push(before, after, !!patch.mode)) { persist(after, !!patch.mode); refreshHistory(n => n + 1); }
        };
        changeRoutingRef.current = changeRouting;
        graph.on('edge:change:vertices', ({ edge, options }) => {
            if (!options.ui || replaying) return;
            // Capture starts on the tool's native down, before X6 mutates vertices.
            const atomic = !gesture;
            if (atomic) {
                const before = capture();
                before.edges[edge.id] = (edge.previous('vertices') ?? []).map((point: RoutePoint) => ({ x: point.x, y: point.y }));
                gesture = { before, placement: false, cancelled: false };
            }
            const edited = edge.getVertices().map(point => ({ ...point }));
            if (routingRef.current.mode !== 'manual') {
                changeRouting({ mode: 'manual' }, false, true); edge.setVertices(edited);
            }
            if (atomic) finish();
        });
        const onToolDown = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('.x6-edge-tools')) begin(false);
        };
        host.addEventListener('mousedown', onToolDown, true);
        const onEdgeMouseDown = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target.closest('.x6-edge') : null;
            const id = target?.getAttribute('data-cell-id');
            const edge = id ? graph.getCellById(id) : undefined;
            if (!edge?.isEdge() || event.button !== 0) return;
            event.preventDefault(); event.stopPropagation();
            const origin = graph.clientToLocal(event.clientX, event.clientY);
            const view = graph.findViewByCell(edge) as { routePoints?: RoutePoint[]; sourcePoint?: RoutePoint; targetPoint?: RoutePoint } | null;
            const source = view?.sourcePoint, end = view?.targetPoint;
            const before = (view?.routePoints ?? edge.getVertices()).map(point => ({ ...point }));
            let moved = false;
            begin(false);
            selectedNodeId = undefined; selectedEdgeId = edge.id; setSelectedNativePort(undefined); showTools();
            const move = (next: MouseEvent) => {
                const point = graph.clientToLocal(next.clientX, next.clientY);
                const dx = point.x - origin.x, dy = point.y - origin.y;
                if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
                if (gesture?.cancelled) return;
                if (!moved) { moved = true; selectedNodeId = undefined; selectedEdgeId = edge.id; changeRouting({ mode: 'manual' }, true, true); }
                const vertices = before.length ? before.map(p => ({ x: p.x + dx, y: p.y + dy }))
                    : source && end ? [{ x: source.x + dx, y: source.y + dy }, { x: end.x + dx, y: end.y + dy }] : [];
                edge.setVertices(vertices);
            };
            const up = () => { window.removeEventListener('mousemove', move);
                if (moved) { showTools(); finish(); }
                else { selectedNodeId = undefined; selectedEdgeId = edge.id; setSelectedNativePort(undefined); useModelStore.setState({ canvasPortSelection: null }); showTools(); }
            };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up, { once: true });
            const previousCleanup = removeGesture;
            removeGesture = () => { previousCleanup?.(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        };
        const onEdgeDoubleClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest('.x6-edge-tool-vertex')) return;
            const id = target.closest('[data-cell-id]')?.getAttribute('data-cell-id');
            const edge = id ? graph.getCellById(id) : undefined;
            if (!edge?.isEdge()) return;
            event.preventDefault(); event.stopPropagation();
            if (routingRef.current.mode !== 'manual' || target.closest('.x6-edge-label')) {
                useModelStore.getState().inspectRelationship(edge.id); return;
            }
            const point = graph.clientToLocal(event.clientX, event.clientY);
            const view = graph.findViewByCell(edge) as { getVertexIndex: (x: number, y: number) => number } | null;
            begin(false);
            edge.insertVertex({ x: point.x, y: point.y },
                view?.getVertexIndex(point.x, point.y) ?? edge.getVertices().length, { ui: true });
            finish();
        };
        host.addEventListener('dblclick', onEdgeDoubleClick, true);
        host.addEventListener('mousedown', onEdgeMouseDown, true);
        // X6 begins a node drag during its bubble-phase handler. Capture port
        // presses first, so a port always owns its wall-drag gesture while a
        // press on the header/body remains an ordinary part drag.
        const onPortMouseDown = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target.closest('[data-memo-port]') : null;
            const portId = target?.getAttribute('data-memo-port');
            const ownerId = target?.getAttribute('data-memo-owner');
            if (!portId || !ownerId) return;
            const node = graph.getCellById(ownerId);
            if (!node?.isNode()) return;
            event.preventDefault();
            event.stopPropagation();
            begin(true);
            selectedEdgeId = undefined; selectedNodeId = undefined; showTools(); setSelectedNativePort(portId);
            useModelStore.setState({ canvasPortSelection: portId });
            const current = node.getPorts().find(candidate => candidate.id === portId);
            const side = (current?.group ?? 'right') as PortSide;
            const startPointer = { x: event.clientX, y: event.clientY };
            const move = (next: MouseEvent) => {
                if (gesture?.cancelled || Math.hypot(next.clientX - startPointer.x, next.clientY - startPointer.y) < 3) return;
                const local = graph.clientToLocal(next.clientX, next.clientY);
                const origin = node.getPosition();
                const size = node.getSize();
                const half = Number(current?.attrs?.portBody?.width ?? INTERCONNECTION_PORT_SIZE) / 2;
                const along = side === 'left' || side === 'right'
                    ? Math.max(half, Math.min(size.height - half, local.y - origin.y))
                    : Math.max(half, Math.min(size.width - half, local.x - origin.x));
                node.portProp(portId, 'args', side === 'left' || side === 'right'
                    ? { x: side === 'left' ? 0 : size.width, y: along }
                    : { x: along, y: side === 'top' ? 0 : size.height });
            };
            const stop = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', stop);
                finish();
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', stop, { once: true });
            const previousCleanup = removeGesture;
            removeGesture = () => { previousCleanup?.(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
        };
        host.addEventListener('mousedown', onPortMouseDown, true);
        const draw = async () => {
            try {
                const scene = await computeInterconnectionLayout(model, {
                    viewpointFilter: buildViewpointFilter({ model, diagram, selectedViewpointId: viewpointId, hiddenLayers }),
                    relationshipTypes: diagram?.relationshipTypes,
                    layoutProviderId: selectedLayoutProviderId(layout),
                });
                if (disposed) return;
                const frames = x6InitialFrames(scene, layout);
                const absolute = new Map(Object.entries(frames).map(([id, frame]) => [id, { x: frame.x, y: frame.y }]));
                for (const spec of scene.nodes) {
                    const ports = (spec.data.ports ?? []) as PortInfo[];
                    const position = absolute.get(spec.id)!;
                    const containerNode = Boolean(spec.data.isContainer || spec.data.isFrame);
                    graph.addNode({
                        id: spec.id,
                        shape: 'rect',
                        x: position.x,
                        y: position.y,
                        width: Number(frames[spec.id].width ?? 180),
                        height: Number(frames[spec.id].height ?? 100),
                        zIndex: containerNode ? 1 : 10,
                        markup: [
                            { tagName: 'rect', selector: 'body' },
                            { tagName: 'rect', selector: 'header' },
                            // `rect` reserves the selector name `label` for
                            // its built-in caption. Reuse it rather than an
                            // unrecognised selector, otherwise X6 centres the
                            // default caption in the body.
                            { tagName: 'text', selector: 'label' },
                        ],
                        attrs: {
                            body: { refWidth: '100%', refHeight: '100%', fill: containerNode ? '#f4f6f8' : '#ffffff', stroke: containerNode ? '#818cf8' : '#64748b', strokeWidth: 1.5, rx: 8, ry: 8 },
                            header: { refWidth: '100%', height: 36, fill: '#f1f5f9', stroke: containerNode ? '#818cf8' : '#64748b', strokeWidth: 1.5, rx: 8, ry: 8 },
                            // `rect` supplies refY: 50% by default, which put
                            // the label in the body even when y was supplied.
                            // Reset its reference to the node's top edge, then
                            // offset by half the 36px header height.
                            label: { text: String(spec.data.label ?? spec.id), refX: 0.5, refY: 0, refY2: 18, textAnchor: 'middle', textVerticalAnchor: 'middle', fill: '#1e293b', fontSize: 12, fontWeight: 700 },
                        },
                        ports: {
                            groups: ['left', 'right', 'top', 'bottom'].reduce((groups, side) => ({
                                ...groups,
                                [side]: {
                                    position: { name: 'absolute' },
                                    markup: [
                                        { tagName: 'rect', selector: 'portBody' },
                                        { tagName: 'path', selector: 'portArrow' },
                                        { tagName: 'text', selector: 'portLabel' },
                                    ],
                                },
                            }), {}),
                            items: ports.map(port => {
                                const sharedPort = layout?.nodes[spec.id]?.ports?.[port.id];
                                const slot = savedPorts[spec.id]?.[port.id] ?? sharedPort;
                                const side = slot?.side ?? port.side;
                                const width = Number(frames[spec.id].width ?? 180);
                                const height = Number(frames[spec.id].height ?? 100);
                                const portSize = sharedPort?.size ?? port.size ?? INTERCONNECTION_PORT_SIZE;
                                const half = portSize / 2;
                                const originalCross = (side === 'left' || side === 'right') ? port.y + half : port.x + half;
                                const cross = side === 'left' || side === 'right'
                                    ? Math.max(half + 36, Math.min(height - half, originalCross))
                                    : Math.max(half, Math.min(width - half, originalCross));
                                const displayedPort = { ...port, side };
                                return ({
                                id: port.id,
                                group: side,
                                args: {
                                    x: slot?.x !== undefined ? slot.x + half : (side === 'left' ? 0 : side === 'right' ? width : cross),
                                    y: slot?.y !== undefined ? slot.y + half : (side === 'top' ? 0 : side === 'bottom' ? height : cross),
                                },
                                attrs: {
                                    portBody: { x: -half, y: -half, width: portSize, height: portSize, fill: '#fff', stroke: PORT_COLOUR[port.direction ?? 'inout'] ?? '#2563eb', strokeWidth: 2, rx: 2, ry: 2, magnet: false, 'data-memo-port': port.id, 'data-memo-owner': spec.id },
                                    portArrow: { d: portArrowPath(port.direction, side), fill: 'none', stroke: PORT_COLOUR[port.direction ?? 'inout'] ?? '#2563eb', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' },
                                    portLabel: { text: port.name, fill: '#475569', fontSize: 10, fontWeight: 600, pointerEvents: 'none', ...portLabelAttrs(displayedPort) },
                                },
                            }); }),
                        },
                    });
                }
                // Use X6 embedding as well as the shared template geometry:
                // moving a container keeps its contained parts together.
                for (const spec of scene.nodes) {
                    if (!spec.parentId) continue;
                    const parent = graph.getCellById(spec.parentId);
                    const child = graph.getCellById(spec.id);
                    if (parent?.isNode() && child?.isNode()) parent.addChild(child);
                }
                // Frames and part containers provide hierarchy, not routing
                // obstacles. Their contents remain obstacles, so routes avoid
                // real parts without becoming trapped inside nested frames.
                containerIds = scene.nodes
                    .filter(spec => Boolean(spec.data.isContainer || spec.data.isFrame))
                    .map(spec => spec.id);
                for (const edge of scene.edges) {
                    const handle = (value: string | null | undefined) => value?.replace(/__inner$/, '');
                    graph.addEdge({
                        id: edge.id,
                        source: { cell: edge.source, ...(handle(edge.sourceHandle) ? { port: handle(edge.sourceHandle)! } : {}) },
                        target: { cell: edge.target, ...(handle(edge.targetHandle) ? { port: handle(edge.targetHandle)! } : {}) },
                        vertices: routingRef.current.mode === 'manual' ? x6Interiors(edge.id, layout) : [],
                        zIndex: 5,
                        // Manhattan examines other X6 elements as obstacles.
                        // A bounded search keeps the dense vehicle IBD responsive.
                        router: { name: MANHATTAN_ROUTER, args: { padding: 16, step: 20, maxLoopCount: 20000, perpendicular: false, precision: 4, maxDirectionChange: 180, excludeNodes: containerIds } },
                        connector: { name: 'rounded', args: { radius: 6 } },
                        attrs: { line: { stroke: String(edge.style?.stroke ?? '#3498db'), strokeWidth: 2, targetMarker: { name: 'block', width: 7, height: 6 }, ...(layout?.canvas?.flowAnimation ? { strokeDasharray: '8 6', class: 'memo-x6-flow' } : {}) } },
                        labels: edge.label && edge.data?.showLabel !== false ? [{ attrs: { label: { text: String(edge.label), fill: '#475569', fontSize: 10 } } }] : [],
                    });
                }
                for (const edge of graph.getEdges()) configureEdge(edge);
                graph.on('node:mousedown', () => begin(true));
                graph.on('node:click', ({ node }) => {
                    useModelStore.setState({ canvasPortSelection: null });
                    selectedEdgeId = undefined; selectedNodeId = node.id; setSelectedNativePort(undefined); showTools();
                    graph.getNodes().forEach(candidate => candidate.attr('body/strokeWidth', candidate.id === node.id ? 3 : 1.5));
                });
                graph.on('node:dblclick', ({ node, e }) => {
                    const target = e.target instanceof Element ? e.target.closest('[data-memo-port]') : null;
                    useModelStore.getState().inspectElement(target?.getAttribute('data-memo-port') ?? node.id);
                });
                graph.on('edge:click', ({ edge }) => { selectedNodeId = undefined; selectedEdgeId = edge.id; setSelectedNativePort(undefined); showTools(); });
                graph.on('blank:click', () => { selectedNodeId = undefined; selectedEdgeId = undefined; setSelectedNativePort(undefined); useModelStore.setState({ canvasPortSelection: null }); showTools(); });
                graph.on('node:mouseup', () => queueMicrotask(() => finish()));
                requestAnimationFrame(() => !disposed && graph.zoomToFit({ padding: 36, maxScale: 1 }));
            } catch (reason) {
                if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
            }
        };
        void draw();
        return () => { disposed = true; setSelectedNativeEdge(undefined); setSelectedNativePort(undefined); setPreviewRouting(undefined); removeGesture?.(); gesture = undefined; window.removeEventListener('keydown', keyboard); host.removeEventListener('mousedown', onToolDown, true); changeRoutingRef.current = () => {}; replayRef.current = () => {}; useModelStore.setState({ canvasPortSelection: null }); host.removeEventListener('mousedown', onEdgeMouseDown, true); host.removeEventListener('dblclick', onEdgeDoubleClick, true); host.removeEventListener('mousedown', onPortMouseDown, true); resize.disconnect(); graph.dispose(); graphRef.current = undefined; };
    }, [model, diagramId, viewpointId, hiddenLayers, sceneKey]);

    return <div className="relative flex flex-1 min-h-0 bg-[#f7f7f5]" data-testid="x6-canvas">
        <div className="absolute top-2 left-2 z-10 rounded border bg-white p-2 shadow-sm">
            <IbdRoutingControls type={routing.type} mode={routing.mode}
                onTypeChange={type => changeRoutingRef.current({ type })}
                onModeChange={mode => changeRoutingRef.current({ mode })} />
        </div>
        <div className="absolute top-14 left-2 z-10 bg-white p-1 text-xs" role="status">{x6Route(routing.type, routing.mode).description}. Native edits stay in X6; resize is unavailable.
            {selectedNativeEdge && <button className="ml-2 border px-2" onClick={() => useModelStore.getState().inspectRelationship(selectedNativeEdge)}>Connector Properties</button>}
            {selectedNativePort && <button className="ml-2 border px-2" onClick={() => useModelStore.getState().inspectElement(selectedNativePort)}>Port Properties</button>}
            <button className="ml-2 border px-2" disabled={!history?.undo.length} onClick={() => replayRef.current('undo')}>Undo X6 edit</button>
            <button className="ml-2 border px-2" disabled={!history?.redo.length} onClick={() => replayRef.current('redo')}>Redo X6 edit</button>
        </div>
        <div ref={container} className="h-full w-full min-h-0 min-w-0 overflow-hidden" />
        {error && <div role="alert" className="absolute left-3 top-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">X6 could not draw this IBD: {error}</div>}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-white shadow-md">
            <button className="h-9 w-9 border-b text-lg" title="Toggle grid" onClick={() => { setGridVisible(value => !value); if (gridVisible) graphRef.current?.hideGrid(); else graphRef.current?.showGrid(); }}>⠿</button>
            <button className="h-9 w-9 border-b text-lg" title="Fullscreen" onClick={() => void container.current?.requestFullscreen?.()}>⛶</button>
            <button className="h-9 w-9 border-b text-lg" title="Fit diagram to view" onClick={() => graphRef.current?.zoomToFit({ padding: 36, maxScale: 1 })}>⤢</button>
            <button className="h-9 w-9 border-b text-lg" title="Zoom in" onClick={() => graphRef.current?.zoom(1.1)}>＋</button>
            <button className="h-9 w-9 text-lg" title="Zoom out" onClick={() => graphRef.current?.zoom(1 / 1.1)}>−</button>
        </div>
    </div>;
}

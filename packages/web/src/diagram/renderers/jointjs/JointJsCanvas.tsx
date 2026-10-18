import { rendererModel } from '../../renderer-model';
import { mergeNativeEntries } from '../../ibd-routing';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { dia, g, linkTools, shapes } from '@joint/core';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram } from '../../../store/model-store';
import { sendDiagramLayoutUpdate } from '../../../store/ws-client';
import { Icon, IconToggle } from '../../../views/DiagramToolbarControls';
import { computeInterconnectionLayout, INTERCONNECTION_PORT_SIZE, type PortInfo } from '../../../views/templates/interconnection-view';
import { buildViewpointFilter } from '../maxgraph/scene-source';
import { selectedLayoutProviderId } from '../../layout-selection';
import { takeComparisonScene, type PilotLayout } from '../../diagram-renderer-selection';
import { buildJointIbd, jointLinkGeometry, jointNodeGeometry } from './ibd-scene';

const JOINT_FLOW_STYLE_ID = 'memo-joint-flow-animation';
type JointJsGeometry = { nodes: DiagramLayout['nodes']; edges?: Record<string, { vertices: Array<{ x: number; y: number }>; manual: true }> };

export function JointJsCanvas({ embedded = false, readOnly = false, gridVisible: inheritedGridVisible, refreshKey = 0, collapsedNodes, focusId, onFocus, onToggleFullscreen, isFullscreen = false }: {
    embedded?: boolean; readOnly?: boolean; gridVisible?: boolean; refreshKey?: number;
    collapsedNodes?: Set<string>; focusId?: string | null; onFocus?: (id: string) => void;
    onToggleFullscreen?: () => void; isFullscreen?: boolean;
}) {
    const container = useRef<HTMLDivElement>(null);
    const paperRef = useRef<dia.Paper>();
    const model = useModelStore(s => rendererModel(s.model));
    const diagramId = useModelStore(s => s.selectedDiagramId);
    const viewpointId = useModelStore(s => s.selectedViewpointId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const layout = useModelStore(s => diagramId ? s.diagramLayouts[diagramId] : undefined) as PilotLayout | undefined;
    const [error, setError] = useState('');
    const [counts, setCounts] = useState({ nodes: 0, edges: 0, fallback: 0 });
    const [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(true);
    const [gridVisible, setGridVisible] = useState(true);
    const activeGridVisible = inheritedGridVisible ?? gridVisible;
    // A saved JointJS position is the result of an interaction with the live
    // paper. Rebuilding the paper whenever that persistence write reaches the
    // store tears down the drag target and makes every move look like a canvas
    // refresh. Only changes that alter what is drawn belong in this key.
    const layoutRenderKey = useMemo(() => JSON.stringify({
        portDisplay: layout?.canvas?.portDisplay,
        connectionDisplay: layout?.canvas?.connectionDisplay,
        showPortText: layout?.canvas?.showPortText,
        showConnectionText: layout?.canvas?.showConnectionText,
        portWalls: layout?.canvas?.portWalls,
        flowAnimation: layout?.canvas?.flowAnimation,
        annotations: layout?.annotations,
        layoutProviderId: selectedLayoutProviderId(layout),
    }), [layout]);
    useEffect(() => {
        if (document.getElementById(JOINT_FLOW_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = JOINT_FLOW_STYLE_ID;
        style.textContent = `@keyframes memo-joint-flow { to { stroke-dashoffset: -28; } }
            .joint-paper .memo-joint-flow { animation: memo-joint-flow 700ms linear infinite; }
            .joint-paper .memo-joint-link-selected [joint-selector="connection"], .joint-paper .memo-joint-link-selected [joint-selector="connection-wrap"] { stroke-width: 4px; filter: drop-shadow(0 0 2px #2563eb); }
            .joint-paper .memo-joint-element-selected [joint-selector="body"], .joint-paper .memo-joint-element-selected [joint-selector="header"] { stroke: #2563eb; stroke-width: 3px; }
            .joint-paper .memo-joint-port-selected [joint-selector="portBody"] { fill: #dbeafe; stroke: #2563eb; stroke-width: 3px; }
            .joint-paper .memo-joint-link-dim { opacity: .22; transition: opacity 120ms ease; }
            .joint-paper .memo-joint-link-hover [joint-selector="connection"] { stroke-width: 3.4px; filter: drop-shadow(0 0 2px #60a5fa); }
            .joint-paper .memo-joint-element-hover [joint-selector="body"], .joint-paper .memo-joint-element-hover [joint-selector="header"] { stroke: #60a5fa; stroke-width: 2.5px; }
            .joint-paper .memo-joint-port-hover [joint-selector="portBody"] { fill: #eff6ff; stroke: #60a5fa; stroke-width: 2.5px; }`;
        document.head.appendChild(style);
    }, []);
    const fit = () => paperRef.current?.scaleContentToFit({ padding: 36, minScale: 0.05, maxScale: 1, useModelGeometry: true });
    const zoom = (factor: number) => {
        const paper = paperRef.current;
        if (!paper) return;
        const scale = Math.max(0.05, Math.min(3, paper.scale().sx * factor));
        paper.scale(scale, scale);
    };

    // JointJS mutates the SVG beneath its mount node. A layout effect removes
    // that SVG before React reconciles a changed scene, avoiding a stale-node
    // insertBefore failure when Optimize layout remounts the paper.
    useLayoutEffect(() => {
        if (!container.current || !model || !diagramId) return;
        let cancelled = false;
        let paper: dia.Paper | undefined;
        let observer: ResizeObserver | undefined;
        let resizeFrame = 0;
        let removePortHandler: (() => void) | undefined;
        let removeActivePortGesture: (() => void) | undefined;
        // `dia.Paper` writes fixed pixel dimensions onto its mount element.
        // Observe the flex surface around it instead: after a fullscreen
        // transition that surface changes size whereas the paper element does
        // not, which previously left a tiny paper in the top-left corner.
        const surface = container.current.parentElement;
        if (!surface) return;
        setBusy(true); setError('');
        const diagram = getDiagram(model, diagramId);
        // A manual IBD keeps the React Flow scene as a one-shot hand-off. An
        // automatic IBD must instead start from the IBD layout engine: using
        // the hidden React Flow positions in that case discarded its
        // dependency-aware part placement and produced avoidable dog-legs.
        const currentSnapshot = takeComparisonScene(diagramId);
        const useSnapshot = Boolean(currentSnapshot && layout?.canvas?.autoLayout === false);
        const compute = useSnapshot ? Promise.resolve(currentSnapshot!) : computeInterconnectionLayout(model, {
            viewpointFilter: buildViewpointFilter({ model, diagram, selectedViewpointId: viewpointId, hiddenLayers }),
            relationshipTypes: diagram?.relationshipTypes,
            portDisplay: layout?.canvas?.portDisplay ?? 'all', connectionDisplay: layout?.canvas?.connectionDisplay ?? 'all',
            showPortText: layout?.canvas?.showPortText, showConnectionText: layout?.canvas?.showConnectionText,
            portWalls: new Map(Object.entries(layout?.canvas?.portWalls ?? {})),
            collapsedNodes, focusId: focusId ?? undefined,
            layoutProviderId: selectedLayoutProviderId(layout),
        });
        compute.then(scene => {
            if (cancelled || !container.current) return;
            // A manual live snapshot already contains React Flow's overrides.
            // Automatic layout intentionally starts with no geometry override,
            // allowing the dependency-aware IBD layout to position parts and
            // align facing port rows for short, straight connectors.
            const jointGeometry = layout?.canvas?.jointjs as JointJsGeometry | undefined;
            const geometry = jointGeometry?.nodes ?? (layout?.canvas?.autoLayout !== false ? {} : useSnapshot ? {} : layout?.nodes ?? {});
            const { cells, fallbackLinks } = buildJointIbd(scene, geometry, {
                flowAnimation: layout?.canvas?.flowAnimation === true,
                annotations: layout?.annotations,
                vertices: Object.fromEntries(Object.entries(jointGeometry?.edges ?? {}).flatMap(([id, route]) =>
                    route?.manual === true ? [[id, route.vertices]] : [],
                )),
                alignFacingPorts: layout?.canvas?.autoLayout !== false,
            });
            const graph = new dia.Graph({}, { cellNamespace: shapes });
            paper = new dia.Paper({
                el: container.current, model: graph, cellViewNamespace: shapes,
                width: surface.clientWidth, height: surface.clientHeight,
                gridSize: 10, drawGrid: activeGridVisible ? { name: 'dot', args: { color: '#e2e8f0' } } : false,
                background: { color: '#f7f7f5' }, async: false, frozen: true,
                // Blocks take precedence over routes in the hit area. Links
                // are edited through explicit segment handles, never moved as
                // a whole object.
                interactive: view => readOnly ? false : view.model.isElement()
                    ? { elementMove: true }
                    : view.model.isLink() ? { linkMove: false, labelMove: false } : false,
                // Keep children inside their actual parent frame while dragging.
                restrictTranslate: view => {
                    const parent = view.model.getParentCell() as dia.Element | null;
                    if (!parent) return false;
                    const box = parent.getBBox();
                    return { x: box.x + 12, y: box.y + 36, width: box.width - 24, height: box.height - 48 };
                },
            });
            paperRef.current = paper;
            graph.resetCells(cells);
            paper.unfreeze();
            const report = () => setCounts({ nodes: graph.getElements().length, edges: graph.getLinks().length, fallback: fallbackLinks.size });
            const save = () => {
                if (cancelled || readOnly) return;
                const previous = (useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} }) as PilotLayout;
                const nodes = jointNodeGeometry(graph, scene);
                const edges = Object.fromEntries(Object.entries(jointLinkGeometry(graph)).map(([id, vertices]) => [id, { vertices, manual: true as const }]));
                const existing = previous.canvas?.jointjs;
                const jointjs: JointJsGeometry = { ...existing, nodes: mergeNativeEntries(existing?.nodes, nodes),
                    ...(Object.keys(edges).length ? { edges: mergeNativeEntries(existing?.edges, edges) } : {}) };
                const updated: PilotLayout = { ...previous, canvas: { ...previous.canvas, jointjs: jointjs as NonNullable<PilotLayout['canvas']>['jointjs'] } };
                useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
                sendDiagramLayoutUpdate(diagramId, updated);
                report();
            };
            const resolveSiblingOverlap = (element: dia.Element) => {
                const parent = element.getParentCell() as dia.Element | null;
                const siblings = graph.getElements().filter(candidate => candidate !== element
                    && candidate.getParentCell()?.id === parent?.id);
                const initial = element.getBBox();
                const intersects = (a: g.Rect, b: g.Rect) => a.x < b.x + b.width && a.x + a.width > b.x
                    && a.y < b.y + b.height && a.y + a.height > b.y;
                if (!siblings.some(sibling => intersects(initial, sibling.getBBox()))) return;
                const parentBox = parent?.getBBox();
                const origin = element.position();
                // Search small, deterministic offsets first, preserving the
                // user's intended neighbourhood while preventing one part from
                // being dropped on top of another direct sibling.
                for (let radius = 24; radius <= 240; radius += 24) {
                    const offsets = [[radius, 0], [-radius, 0], [0, radius], [0, -radius], [radius, radius], [-radius, radius], [radius, -radius], [-radius, -radius]];
                    for (const [dx, dy] of offsets) {
                        const candidate = new g.Rect(initial.x + dx, initial.y + dy, initial.width, initial.height);
                        const withinParent = !parentBox || (candidate.x >= parentBox.x + 12 && candidate.y >= parentBox.y + 36
                            && candidate.x + candidate.width <= parentBox.x + parentBox.width - 12
                            && candidate.y + candidate.height <= parentBox.y + parentBox.height - 12);
                        if (withinParent && !siblings.some(sibling => intersects(candidate, sibling.getBBox()))) {
                            element.position(origin.x + dx, origin.y + dy);
                            return;
                        }
                    }
                }
            };
            const clearSelectionHighlight = () => container.current?.querySelectorAll(
                '.memo-joint-link-selected, .memo-joint-element-selected, .memo-joint-port-selected',
            ).forEach(element => element.classList.remove(
                'memo-joint-link-selected', 'memo-joint-element-selected', 'memo-joint-port-selected',
            ));
            const clearLinkTools = () => graph.getLinks().forEach(link => paper?.findViewByModel(link)?.removeTools());
            const highlightEndpoint = (terminal: { id?: string; port?: string }, mode: 'selected' | 'hover') => {
                if (!terminal.id) return;
                const endpointView = paper?.findViewByModel(graph.getCell(terminal.id) as dia.Cell);
                endpointView?.el.classList.add(`memo-joint-element-${mode}`);
                if (terminal.port) endpointView?.el.querySelectorAll('[port]').forEach(port => {
                    if (port.getAttribute('port') === terminal.port) port.classList.add(`memo-joint-port-${mode}`);
                });
            };
            const clearHoverHighlight = () => container.current?.querySelectorAll(
                '.memo-joint-link-hover, .memo-joint-link-dim, .memo-joint-element-hover, .memo-joint-port-hover',
            ).forEach(element => element.classList.remove(
                'memo-joint-link-hover', 'memo-joint-link-dim', 'memo-joint-element-hover', 'memo-joint-port-hover',
            ));
            const highlightHoverLink = (link: dia.Link) => {
                clearHoverHighlight();
                graph.getLinks().forEach(candidate => {
                    const candidateView = paper?.findViewByModel(candidate);
                    candidateView?.el.classList.add(candidate === link ? 'memo-joint-link-hover' : 'memo-joint-link-dim');
                });
                highlightEndpoint(link.get('source') as { id?: string; port?: string }, 'hover');
                highlightEndpoint(link.get('target') as { id?: string; port?: string }, 'hover');
            };
            // A click selects; only a double-click opens Properties.
            paper.on('element:pointerclick', view => {
                clearLinkTools();
                clearSelectionHighlight();
                view.el.classList.add('memo-joint-element-selected');
            });
            paper.on('element:pointerdblclick', (view, event) => {
                if (readOnly) return;
                const id = String(view.model.id);
                if (id.startsWith('annotation-')) {
                    const previous = (useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} }) as PilotLayout;
                    const annotation = previous.annotations?.[id];
                    const text = annotation && window.prompt('Edit note', annotation.text);
                    if (annotation && text !== null) {
                        const updated: PilotLayout = { ...previous, annotations: { ...previous.annotations, [id]: { ...annotation, text: text ?? '' } } };
                        useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
                        sendDiagramLayoutUpdate(diagramId, updated);
                    }
                    return;
                }
                const target = event.target instanceof Element ? event.target.closest('[port]') : null;
                useModelStore.getState().inspectElement(target?.getAttribute('port') ?? id);
            });
            paper.on('link:pointerdblclick', view => { if (!readOnly) useModelStore.getState().inspectRelationship(String(view.model.id)); });
            paper.on('link:pointerclick', view => {
                if (readOnly) return;
                clearSelectionHighlight();
                view.el.classList.add('memo-joint-link-selected');
                const link = view.model as dia.Link;
                highlightEndpoint(link.get('source') as { id?: string; port?: string }, 'selected');
                highlightEndpoint(link.get('target') as { id?: string; port?: string }, 'selected');
                clearLinkTools();
                // The router owns its transient route, so it exposes no stable
                // geometry to drag. Make the selected route explicit, then
                // use JointJS's maintained segment editor for draw.io-style
                // resize pills on every orthogonal run.
                if (!link.vertices().length) {
                    const route = (view as dia.LinkView).route;
                    if (route.length > 2) {
                        link.router('normal');
                        link.vertices(route.slice(1, -1).map(point => ({ x: point.x, y: point.y })), { routeEditing: true });
                        (view as dia.LinkView).update();
                    }
                }
                (view as dia.LinkView).addTools(new dia.ToolsView({ tools: [new linkTools.Segments({
                    segmentLengthThreshold: 18,
                    snapRadius: 10,
                    stopPropagation: true,
                })] }));
            });
            paper.on('link:mouseenter', view => highlightHoverLink(view.model as dia.Link));
            paper.on('link:mouseleave', clearHoverHighlight);
            paper.on('element:mouseenter', view => {
                clearHoverHighlight();
                view.el.classList.add('memo-joint-element-hover');
                graph.getConnectedLinks(view.model as dia.Element).forEach(link => {
                    paper?.findViewByModel(link)?.el.classList.add('memo-joint-link-hover');
                });
                graph.getLinks().filter(link => !graph.getConnectedLinks(view.model as dia.Element).includes(link)).forEach(link => {
                    paper?.findViewByModel(link)?.el.classList.add('memo-joint-link-dim');
                });
            });
            paper.on('element:mouseleave', clearHoverHighlight);
            let movementStart = '';
            const nativeGeometry = () => JSON.stringify({ nodes: jointNodeGeometry(graph, scene), edges: jointLinkGeometry(graph) });
            paper.on('element:pointerdown', () => { movementStart = nativeGeometry(); });
            paper.on('element:pointerup', view => {
                if (readOnly) return;
                if (movementStart && movementStart !== nativeGeometry()) { resolveSiblingOverlap(view.model as dia.Element); save(); }
                movementStart = '';
            });
            paper.on('blank:pointerdown', () => { clearLinkTools(); clearSelectionHighlight(); clearHoverHighlight(); });
            // The segment tool owns document pointer events, so record edits
            // from its model mutation rather than from the paper's pointerup.
            graph.on('change:vertices', (_link, _vertices, options) => {
                if (options?.tool) save();
            });
            // Port magnets are normally reserved for drawing new links. This
            // renderer reads modelled links, so capture the port's SVG gesture
            // before JointJS starts that gesture and use it to slide the port
            // along its declared wall.
            const beginBoundaryPortDrag = (event: PointerEvent) => {
                if (readOnly) return;
                const target = event.target as Element | null;
                const portNode = target?.closest('[port]');
                if (!portNode) return;
                const portId = portNode.getAttribute('port');
                const view = paper?.findView(portNode);
                const portInfo = portId && view
                    ? ((scene.nodes.find(node => node.id === view.model.id)?.data.ports ?? []) as PortInfo[])
                        .find(candidate => candidate.id === portId)
                    : undefined;
                if (!portId || !view || !portInfo) return;
                event.preventDefault();
                event.stopPropagation();
                const element = view.model as dia.Element;
                removeActivePortGesture?.();
                const originalArgs = { ...element.getPort(portId)?.args };
                const start = { x: event.clientX, y: event.clientY };
                let moved = false;
                const size = portInfo.size ?? INTERCONNECTION_PORT_SIZE;
                const move = (next: PointerEvent) => {
                    if (Math.hypot(next.clientX - start.x, next.clientY - start.y) < 3 && !moved) return;
                    moved = true;
                    const point = paper!.clientToLocalPoint(next.clientX, next.clientY);
                    const box = element.getBBox();
                    const half = size / 2;
                    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
                    const current = element.getPort(portId)?.args as { x?: number; y?: number } | undefined;
                    const side = (current?.x ?? 0) <= half ? 'left'
                        : (current?.x ?? 0) >= box.width - half ? 'right'
                            : (current?.y ?? 0) <= half ? 'top' : 'bottom';
                    const args = side === 'left' || side === 'right'
                        // Vertical-wall ports cannot enter the header band.
                        ? { x: side === 'left' ? 0 : box.width, y: clamp(point.y - box.y, 44 + half, box.height - half) }
                        : { x: clamp(point.x - box.x, half, box.width - half), y: side === 'top' ? 0 : box.height };
                    element.portProp(portId, 'args', args);
                    graph.getLinks().forEach(link => (paper?.findViewByModel(link) as dia.LinkView | undefined)?.update());
                };
                const cleanup = () => {
                    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop);
                    window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', key); window.removeEventListener('blur', cancel);
                };
                const stop = () => {
                    cleanup(); removeActivePortGesture = undefined;
                    if (moved && JSON.stringify(originalArgs) !== JSON.stringify(element.getPort(portId)?.args)) save();
                };
                const cancel = () => { cleanup(); removeActivePortGesture = undefined; element.portProp(portId, 'args', originalArgs); };
                const key = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
                removeActivePortGesture = cancel;
                window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', key); window.addEventListener('blur', cancel);
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', stop, { once: true });
            };
            container.current.addEventListener('pointerdown', beginBoundaryPortDrag, true);
            removePortHandler = () => container.current?.removeEventListener('pointerdown', beginBoundaryPortDrag, true);
            // Link views already follow their source and target cells. Do not
            // force every link through Manhattan routing on every pointermove:
            // dragging one container also moves all of its embedded parts, so
            // that global update made the Powertrain drag unusably slow.
            // “Re-route connectors” remains the deliberate action for routes
            // that need to account for a newly placed unrelated obstacle.
            let pan: { x: number; y: number; tx: number; ty: number } | undefined;
            paper.on('blank:pointerdown', event => { const t = paper!.translate(); pan = { x: (event.clientX ?? 0), y: (event.clientY ?? 0), tx: t.tx, ty: t.ty }; });
            paper.on('blank:pointermove', event => { if (pan) paper!.translate(pan.tx + (event.clientX ?? 0) - pan.x, pan.ty + (event.clientY ?? 0) - pan.y); });
            paper.on('blank:pointerup', () => { pan = undefined; });
            // Trackpads emit frequent wheel events. A 2% step keeps the canvas
            // controllable without turning one gesture into a large jump.
            paper.on('blank:mousewheel cell:mousewheel', (...args: any[]) => { const event = args.find(a => a && typeof a.preventDefault === 'function'); event?.preventDefault(); zoom(Number(args.at(-1)) > 0 ? 1.02 : 1 / 1.02); });
            observer = new ResizeObserver(() => {
                paper?.setDimensions(surface.clientWidth, surface.clientHeight);
                // Fullscreen changes the drawing surface after the paper was
                // initially fitted. Refit on the next frame so its model
                // bounds are measured against the new surface, rather than
                // leaving a cropped diagram in one corner of a large canvas.
                cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(() => paper?.scaleContentToFit({ padding: 36, minScale: 0.05, maxScale: 1, useModelGeometry: true }));
            });
            observer.observe(surface);
            setBusy(false); report();
            // Persist only explicit block moves. Saving while a renderer mounts
            // causes the project watcher to refresh the model, which remounts
            // the renderer and would write the same sidecar repeatedly.
            requestAnimationFrame(() => { if (!cancelled) fit(); });
        }).catch(reason => { if (!cancelled) { setBusy(false); setError(String(reason instanceof Error ? reason.message : reason)); } });
        return () => { cancelled = true; cancelAnimationFrame(resizeFrame); observer?.disconnect(); removeActivePortGesture?.(); removePortHandler?.(); paper?.remove(); paperRef.current = undefined; };
    }, [model, diagramId, viewpointId, hiddenLayers, revision, layoutRenderKey, refreshKey, collapsedNodes, focusId, onFocus, readOnly]);

    useEffect(() => { paperRef.current?.setGrid(activeGridVisible ? { name: 'dot', args: { color: '#e2e8f0' } } : false); }, [activeGridVisible]);

    function updateCanvas(patch: Record<string, unknown>) {
        if (!diagramId || readOnly) return;
        const previous = (useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} }) as PilotLayout;
        const updated: PilotLayout = { ...previous, canvas: { ...previous.canvas, ...patch } };
        useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
        sendDiagramLayoutUpdate(diagramId, updated);
        setRevision(value => value + 1);
    }

    function reroute() {
        if (readOnly) return;
        // Use the geometry saved by JointJS after a block move, then ask its
        // router to rebuild every connector around those obstacles.
        setRevision(value => value + 1);
    }

    function reset() {
        if (!diagramId || readOnly) return;
        const previous = useModelStore.getState().diagramLayouts[diagramId] as PilotLayout | undefined;
        if (!previous) return;
        const updated: PilotLayout = { ...previous, canvas: { ...previous.canvas } };
        delete updated.canvas!.jointjs;
        useModelStore.getState().mergeDiagramLayouts({ [diagramId]: updated });
        sendDiagramLayoutUpdate(diagramId, updated);
        setRevision(value => value + 1);
    }
    const portDisplay = layout?.canvas?.portDisplay ?? 'all';
    const connectionDisplay = layout?.canvas?.connectionDisplay ?? 'all';
    const showPortText = layout?.canvas?.showPortText !== false;
    const showConnectionText = layout?.canvas?.showConnectionText !== false;
    return <div className="flex flex-1 min-h-0 bg-[#f7f7f5]" data-testid="jointjs-canvas">
        {!embedded && !readOnly && <aside aria-label="Diagram tools" className="flex shrink-0 flex-col border-r" style={{ width: 126, background: '#FAFAF8', borderColor: '#E5E5E0' }}>
            <div className="flex items-center px-3 py-2" style={{ background: '#F0F0ED', borderBottom: '1px solid #E5E5E0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Toolbar</span>
            </div>
            <div className="memo-diagram-tools memo-diagram-tools--left m-3 grid content-start items-stretch justify-items-stretch rounded-lg text-xs" style={{ width: 94, padding: 6, gap: 6, gridTemplateColumns: 'repeat(2, 38px)', gridAutoRows: 'min-content', background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <IconToggle icon={gridVisible ? <Icon.grid /> : <Icon.gridOff />} active={gridVisible} onClick={() => setGridVisible(value => !value)} title="Show or hide the canvas grid and snapping" />
                <IconToggle icon={<Icon.tidy />} active={false} onClick={reroute} title="Re-route connectors around the current block positions" />
                <IconToggle icon={<Icon.arrange />} active={false} onClick={reset} title="Recalculate the layout from the model" />
                <IconToggle icon={portDisplay === 'all' ? <Icon.library /> : portDisplay === 'ports' ? <Icon.rectangle /> : <Icon.minus />} active={portDisplay !== 'none'} onClick={() => updateCanvas({ portDisplay: portDisplay === 'all' ? 'ports' : portDisplay === 'ports' ? 'none' : 'all' })} title={portDisplay === 'all' ? 'Ports: nested. Click for top-level ports.' : portDisplay === 'ports' ? 'Ports: top-level only. Click to hide ports.' : 'Ports: hidden. Click to show nested ports.'} />
                <IconToggle icon={connectionDisplay === 'summary' ? <Icon.tidy /> : connectionDisplay === 'all' ? <Icon.lanes /> : <Icon.minus />} active={connectionDisplay !== 'none'} onClick={() => updateCanvas({ connectionDisplay: connectionDisplay === 'summary' ? 'all' : connectionDisplay === 'all' ? 'none' : 'summary' })} title={connectionDisplay === 'summary' ? 'Connections: summary. Click to show all.' : connectionDisplay === 'all' ? 'Connections: all. Click to hide them.' : 'Connections: hidden. Click for summary.'} />
                <IconToggle icon={<Icon.elements />} active={showPortText} onClick={() => updateCanvas({ showPortText: !showPortText })} title="Show or hide port captions" />
                <IconToggle icon={<Icon.code />} active={showConnectionText} onClick={() => updateCanvas({ showConnectionText: !showConnectionText })} title="Show or hide connector labels" />
            </div>
        </aside>}
        <div className="relative flex flex-1 min-w-0 min-h-0 overflow-hidden bg-[#f7f7f5]">
        <div ref={container} className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-[#f7f7f5]" />
        {(counts.fallback > 0 || error || busy) && <div className="pointer-events-none absolute left-3 top-3 z-10 space-y-1 text-xs">
            {counts.fallback > 0 && <div role="status" className="rounded bg-amber-50 px-3 py-2 text-amber-900 shadow-sm">{counts.fallback} routes used a fallback that may cross blocks.</div>}
            {error && <div role="alert" className="rounded bg-red-50 px-3 py-2 text-red-700 shadow-sm">JointJS could not draw this IBD: {error}. Switch back to React Flow above.</div>}
            {busy && <div className="rounded bg-white px-3 py-2 text-slate-600 shadow-sm">Computing IBD…</div>}
        </div>}
        <div aria-label="JointJS view controls" className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-white shadow-md">
            <button className="h-9 w-9 border-b text-lg text-slate-700 hover:bg-slate-50" title="Fit diagram to view" aria-label="Fit diagram to view" onClick={fit}>⤢</button>
            <button className="h-9 w-9 border-b text-lg text-slate-700 hover:bg-slate-50" title="Zoom in" aria-label="Zoom in" onClick={() => zoom(1.1)}>＋</button>
            <button className="h-9 w-9 border-b text-lg text-slate-700 hover:bg-slate-50" title="Zoom out" aria-label="Zoom out" onClick={() => zoom(1 / 1.1)}>−</button>
            {onToggleFullscreen && <button className="h-9 w-9 border-b text-lg text-slate-700 hover:bg-slate-50" title={isFullscreen ? 'Exit fullscreen canvas' : 'Toggle fullscreen canvas'} aria-label="Toggle fullscreen canvas" onClick={onToggleFullscreen}>⛶</button>}
            <button className="h-9 w-9 text-base text-slate-700 hover:bg-slate-50" title="Reset to React Flow positions" aria-label="Reset to React Flow positions" disabled={readOnly} onClick={reset}>↺</button>
        </div>
        </div>
    </div>;
}

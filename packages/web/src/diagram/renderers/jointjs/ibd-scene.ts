import { dia, shapes, routers } from '@joint/core';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import type { ComparisonScene } from '../../diagram-renderer-selection';
import { INTERCONNECTION_PORT_SIZE, INNER_HANDLE_SUFFIX, PORT_DIR_COLORS, type PortInfo, type PortSide } from '../../../views/templates/interconnection-view';

export interface IbdCellData { cells: dia.Cell[]; fallbackLinks: Set<string> }
interface JointIbdOptions {
    flowAnimation?: boolean;
    annotations?: DiagramLayout['annotations'];
    /** Explicit bend points owned by the JointJS pilot, separate from React Flow routes. */
    vertices?: Record<string, Array<{ x: number; y: number }>>;
    /** Align one-to-one opposing ports after automatic part placement. */
    alignFacingPorts?: boolean;
}
const opposite: Record<PortSide, PortSide> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const JOINT_HEADER_HEIGHT = 44;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * A MEMO port is stored by its top-left corner, while JointJS wants its
 * centre. Keep that centre on the boundary itself, rather than putting the
 * entire square inside the part. Vertical walls start below the title band.
 */
function boundaryPortArgs(side: PortSide, size: number, box: { width: number; height: number }, preferred: { x: number; y: number }) {
    const half = size / 2;
    const minY = Math.min(box.height - half, JOINT_HEADER_HEIGHT + half);
    const y = clamp(preferred.y, minY, Math.max(minY, box.height - half));
    const x = clamp(preferred.x, half, Math.max(half, box.width - half));
    switch (side) {
        case 'left': return { x: 0, y };
        case 'right': return { x: box.width, y };
        case 'top': return { x, y: 0 };
        case 'bottom': return { x, y: box.height };
    }
}

function portSideFromArgs(args: { x?: number; y?: number } | undefined, size: number, box: { width: number; height: number }, fallback: PortSide): PortSide {
    if (!args) return fallback;
    const candidates: Array<[PortSide, number]> = [
        ['left', Math.abs(args.x ?? Infinity)], ['right', Math.abs((args.x ?? -Infinity) - box.width)],
        ['top', Math.abs(args.y ?? Infinity)], ['bottom', Math.abs((args.y ?? -Infinity) - box.height)],
    ];
    const [side, distance] = candidates.reduce((closest, candidate) => candidate[1] < closest[1] ? candidate : closest);
    return distance <= size ? side : fallback;
}

/** Direction arrow drawn inside the IBD port square. This mirrors the React
 * Flow IBD glyph so renderer choice does not change flow meaning. */
function portArrowPath(direction: PortInfo['direction'], side: PortSide): string | null {
    const value = String(direction ?? '').toLowerCase();
    if (!value) return null;
    const vertical = side === 'top' || side === 'bottom';
    if (value === 'inout') return vertical
        ? 'M5 1.5v7M2.5 3.5L5 1.5l2.5 2M2.5 6.5L5 8.5l2.5-2'
        : 'M1.5 5h7M3.5 2.5L1.5 5l2 2.5M6.5 2.5L8.5 5l-2 2.5';
    const inward = value === 'in';
    switch (side) {
        case 'left': return inward ? 'M2 5h6M5.5 2.5L8 5l-2.5 2.5' : 'M8 5H2M4.5 2.5L2 5l2.5 2.5';
        case 'right': return inward ? 'M8 5H2M4.5 2.5L2 5l2.5 2.5' : 'M2 5h6M5.5 2.5L8 5l-2.5 2.5';
        case 'top': return inward ? 'M5 2v6M2.5 5.5L5 8l2.5-2.5' : 'M5 8V2M2.5 4.5L5 2l2.5 2.5';
        default: return inward ? 'M5 8V2M2.5 4.5L5 2l2.5-2.5' : 'M5 2v6M2.5 5.5L5 8l2.5-2.5';
    }
}

/** MEMO positions are parent-relative; JointJS cells use absolute coordinates. */
export function buildJointIbd(scene: ComparisonScene, saved: DiagramLayout['nodes'] = {}, options: JointIbdOptions = {}): IbdCellData {
    const cells: dia.Cell[] = [];
    const elements = new Map<string, dia.Element>();
    const portCells = new Map<string, { nodeId: string; port: PortInfo; element: dia.Element }>();
    const effectivePortSides = new Map<string, PortSide>();
    // An IBD frame is a semantic container, not a routing obstacle. Treating
    // it as one forced every internal connector out through the frame border.
    const routingObstacles: dia.Element[] = [];
    const fallbackLinks = new Set<string>();
    for (const node of scene.nodes) {
        const override = saved[node.id];
        const parent = node.parentId ? elements.get(node.parentId) : undefined;
        if (node.parentId && !parent) throw new Error(`IBD parent missing before child: ${node.parentId}`);
        const parentPosition = parent?.position() ?? { x: 0, y: 0 };
        const width = override?.width ?? Number(node.width ?? node.style?.width ?? 180);
        const height = override?.height ?? Number(node.height ?? node.style?.height ?? 100);
        const container = Boolean(node.data.isContainer);
        const frame = Boolean(node.data.isFrame);
        const ports = (node.data.ports ?? []) as PortInfo[];
        // Match the React Flow IBD notation: a quiet structural hierarchy
        // (frame → container → part), rounded cards, and a reserved header
        // instead of giving every model layer a competing accent colour.
        const headerHeight = frame ? 38 : 44;
        const stroke = frame ? '#94a3b8' : container ? '#cbd5e1' : '#e2e8f0';
        const fill = frame ? '#e9ecef' : container ? '#f4f6f8' : '#ffffff';
        const element = new shapes.standard.HeaderedRectangle({
            id: node.id, position: { x: parentPosition.x + (override?.x ?? node.position.x), y: parentPosition.y + (override?.y ?? node.position.y) },
            size: { width, height }, z: container || frame ? 1 + (parent?.get('z') ?? 0) : 10,
            attrs: {
                // A frame/container is structural space. Its empty body must
                // not swallow a connector click that is routed through it;
                // its header remains the explicit hit target for selecting or
                // moving that structural level.
                body: { fill, stroke, strokeWidth: frame ? 1.5 : 1, rx: frame ? 10 : 8, ry: frame ? 10 : 8, pointerEvents: container || frame ? 'none' : 'all' },
                // HeaderedRectangle gives every renderer the same unambiguous
                // part-name position: a dedicated band at the top centre.
                header: { fill, stroke, strokeWidth: frame ? 1.5 : 1, height: headerHeight, rx: frame ? 10 : 8, ry: frame ? 10 : 8 },
                headerText: { text: String(node.data.label ?? node.id), fill: '#1e293b', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                    x: 'calc(w/2)', y: headerHeight / 2, textAnchor: 'middle', textVerticalAnchor: 'middle' },
                bodyText: { text: '' },
            },
            ports: { groups: { boundary: {
                position: { name: 'absolute' },
                markup: [{ tagName: 'rect', selector: 'portBody' }, { tagName: 'path', selector: 'portArrow' }],
                label: { position: { name: 'right', args: { x: 12, y: 0 } }, markup: [{ tagName: 'text', selector: 'portLabel' }] },
            } }, items: ports.map(port => {
                const geometry = override?.ports?.[port.id];
                const size = geometry?.size ?? port.size ?? INTERCONNECTION_PORT_SIZE;
                const side = geometry?.side ?? port.side;
                const glyphSide = port.nested && port.direction === 'out' ? opposite[side] : side;
                const args = boundaryPortArgs(side, size, { width, height }, {
                    x: (geometry?.x ?? port.x) + size / 2,
                    y: (geometry?.y ?? port.y) + size / 2,
                });
                return { id: port.id, group: 'boundary', args: {
                    ...args,
                }, attrs: {
                    portBody: { x: -size / 2, y: -size / 2, width: size, height: size, rx: 2, ry: 2, fill: '#ffffff', stroke: PORT_DIR_COLORS[port.direction ?? 'inout'], strokeWidth: 2, magnet: 'passive' },
                    portArrow: { d: portArrowPath(port.direction, glyphSide) ?? '', transform: 'translate(-5,-5)', fill: 'none', stroke: PORT_DIR_COLORS[port.direction ?? 'inout'], strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none' },
                    portLabel: { text: node.data.showPortText === false ? '' : port.name, fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#475569', textAnchor: side === 'right' ? 'end' : 'start', x: side === 'right' ? -24 : 0 },
                } };
            }) },
        });
        elements.set(node.id, element);
        cells.push(element);
        for (const port of ports) {
            portCells.set(port.id, { nodeId: node.id, port, element });
            effectivePortSides.set(port.id, override?.ports?.[port.id]?.side ?? port.side);
        }
        if (!container && !frame) routingObstacles.push(element);
        if (parent) parent.embed(element);
    }
    if (options.alignFacingPorts) {
        const portIdOf = (handle: string | null | undefined) => handle?.endsWith(INNER_HANDLE_SUFFIX)
            ? undefined : handle;
        const incident = new Map<string, number>();
        for (const edge of scene.edges) for (const id of [portIdOf(edge.sourceHandle), portIdOf(edge.targetHandle)]) {
            if (id) incident.set(id, (incident.get(id) ?? 0) + 1);
        }
        const canMovePortToSide = (entry: { nodeId: string; port: PortInfo; element: dia.Element }, side: PortSide) => {
            const size = saved[entry.nodeId]?.ports?.[entry.port.id]?.size ?? entry.port.size ?? INTERCONNECTION_PORT_SIZE;
            const box = entry.element.size();
            const existing = entry.element.getPort(entry.port.id)?.args as { x?: number; y?: number } | undefined;
            const args = boundaryPortArgs(side, size, box, { x: existing?.x ?? box.width / 2, y: existing?.y ?? box.height / 2 });
            const coordinate = side === 'left' || side === 'right' ? args.y : args.x;
            return entry.element.getPorts().every(other => {
                if (!other.id || other.id === entry.port.id || effectivePortSides.get(other.id) !== side) return true;
                const otherArgs = other.args as { x?: number; y?: number } | undefined;
                const otherCoordinate = side === 'left' || side === 'right' ? otherArgs?.y : otherArgs?.x;
                return typeof otherCoordinate !== 'number' || Math.abs(otherCoordinate - coordinate) >= size + 10;
            });
        };
        const movePortToSide = (entry: { nodeId: string; port: PortInfo; element: dia.Element }, side: PortSide) => {
            const size = saved[entry.nodeId]?.ports?.[entry.port.id]?.size ?? entry.port.size ?? INTERCONNECTION_PORT_SIZE;
            const box = entry.element.size();
            const existing = entry.element.getPort(entry.port.id)?.args as { x?: number; y?: number } | undefined;
            const args = boundaryPortArgs(side, size, box, { x: existing?.x ?? box.width / 2, y: existing?.y ?? box.height / 2 });
            entry.element.portProp(entry.port.id, 'args', args);
            entry.element.portProp(entry.port.id, 'attrs/portArrow/d', portArrowPath(entry.port.direction, side) ?? '');
            entry.element.portProp(entry.port.id, 'attrs/portLabel/textAnchor', side === 'right' ? 'end' : 'start');
            entry.element.portProp(entry.port.id, 'attrs/portLabel/x', side === 'right' ? -24 : 0);
            effectivePortSides.set(entry.port.id, side);
        };
        for (const edge of scene.edges) {
            const sourceId = portIdOf(edge.sourceHandle), targetId = portIdOf(edge.targetHandle);
            if (!sourceId || !targetId || (incident.get(sourceId) ?? 0) > 1 || (incident.get(targetId) ?? 0) > 1) continue;
            const source = portCells.get(sourceId), target = portCells.get(targetId);
            if (!source || !target || source.element === target.element) continue;
            const sourceBox = source.element.getBBox(), targetBox = target.element.getBBox();
            const dx = targetBox.x + targetBox.width / 2 - (sourceBox.x + sourceBox.width / 2);
            const dy = targetBox.y + targetBox.height / 2 - (sourceBox.y + sourceBox.height / 2);
            if (Math.abs(dx) >= Math.abs(dy)) {
                const sourceSide = dx >= 0 ? 'right' : 'left', targetSide = dx >= 0 ? 'left' : 'right';
                if (canMovePortToSide(source, sourceSide) && canMovePortToSide(target, targetSide)) {
                    movePortToSide(source, sourceSide); movePortToSide(target, targetSide);
                }
            } else {
                const sourceSide = dy >= 0 ? 'bottom' : 'top', targetSide = dy >= 0 ? 'top' : 'bottom';
                if (canMovePortToSide(source, sourceSide) && canMovePortToSide(target, targetSide)) {
                    movePortToSide(source, sourceSide); movePortToSide(target, targetSide);
                }
            }
        }
    }
    // The IBD layout orders ports by their wiring, but JointJS receives the
    // resulting cells after that pass. Complete the last, local step here:
    // when two unshared ports face one another, put them on one cross-axis so
    // the Manhattan router can draw a single short segment. Shared ports stay
    // put because aligning them to one connection would worsen the others.
    if (options.alignFacingPorts) {
        const portOwner = new Map<string, { element: dia.Element; side: PortSide }>();
        const incidents = new Map<string, number>();
        for (const node of scene.nodes) {
            const element = elements.get(node.id)!;
            for (const port of (node.data.ports ?? []) as PortInfo[]) {
                portOwner.set(port.id, { element, side: effectivePortSides.get(port.id) ?? saved[node.id]?.ports?.[port.id]?.side ?? port.side });
            }
        }
        for (const edge of scene.edges) {
            for (const handle of [edge.sourceHandle, edge.targetHandle]) {
                const id = handle?.endsWith(INNER_HANDLE_SUFFIX) ? handle.slice(0, -INNER_HANDLE_SUFFIX.length) : handle;
                if (id) incidents.set(id, (incidents.get(id) ?? 0) + 1);
            }
        }
        const centre = (entry: { element: dia.Element; side: PortSide }, portId: string) => {
            const args = entry.element.getPort(portId)?.args as { x?: number; y?: number } | undefined;
            const pos = entry.element.position();
            return { x: pos.x + (args?.x ?? 0), y: pos.y + (args?.y ?? 0) };
        };
        const clearAt = (entry: { element: dia.Element; side: PortSide }, portId: string, y: number) => {
            const height = entry.element.size().height;
            const size = (entry.element.getPort(portId)?.attrs?.portBody?.width as number | undefined) ?? INTERCONNECTION_PORT_SIZE;
            if (y < JOINT_HEADER_HEIGHT + size / 2 || y > height - size / 2) return false;
            return entry.element.getPorts().every(other => {
                if (!other.id || other.id === portId || portOwner.get(other.id)?.side !== entry.side) return true;
                const args = other.args as { y?: number } | undefined;
                return typeof args?.y !== 'number' || Math.abs(args.y - y) >= 24;
            });
        };
        for (const edge of scene.edges) {
            const sourceId = edge.sourceHandle?.endsWith(INNER_HANDLE_SUFFIX)
                ? edge.sourceHandle.slice(0, -INNER_HANDLE_SUFFIX.length) : edge.sourceHandle;
            const targetId = edge.targetHandle?.endsWith(INNER_HANDLE_SUFFIX)
                ? edge.targetHandle.slice(0, -INNER_HANDLE_SUFFIX.length) : edge.targetHandle;
            if (!sourceId || !targetId || (incidents.get(sourceId) ?? 0) > 1 || (incidents.get(targetId) ?? 0) > 1) continue;
            const source = portOwner.get(sourceId), target = portOwner.get(targetId);
            if (!source || !target || source.element === target.element) continue;
            const opposing = (source.side === 'right' && target.side === 'left') || (source.side === 'left' && target.side === 'right');
            if (!opposing) continue;
            const a = centre(source, sourceId), b = centre(target, targetId);
            const forwards = source.side === 'right' ? a.x < b.x : a.x > b.x;
            if (!forwards || Math.abs(a.y - b.y) > 160) continue;
            const sourceLocal = (a.y + b.y) / 2 - source.element.position().y;
            const targetLocal = (a.y + b.y) / 2 - target.element.position().y;
            if (!clearAt(source, sourceId, sourceLocal) || !clearAt(target, targetId, targetLocal)) continue;
            const sourceArgs = source.element.getPort(sourceId)?.args as { x?: number; y?: number } | undefined;
            const targetArgs = target.element.getPort(targetId)?.args as { x?: number; y?: number } | undefined;
            source.element.portProp(sourceId, 'args', { ...sourceArgs, y: sourceLocal });
            target.element.portProp(targetId, 'args', { ...targetArgs, y: targetLocal });
        }
    }
    for (const edge of scene.edges) {
        const source = elements.get(edge.source), target = elements.get(edge.target);
        if (!source || !target) throw new Error(`Missing IBD endpoint for ${edge.id}`);
        function endpoint(id: string, handle: string | null | undefined, end: 'source' | 'target') {
            const element = elements.get(id)!;
            const inner = handle?.endsWith(INNER_HANDLE_SUFFIX);
            const portId = inner ? handle!.slice(0, -INNER_HANDLE_SUFFIX.length) : handle;
            const node = scene.nodes.find(n => n.id === id)!;
            const port = (node.data.ports as PortInfo[] | undefined)?.find(p => p.id === portId);
            if (port) {
                const override = saved[id]?.ports?.[port.id];
                const wall = effectivePortSides.get(port.id) ?? override?.side ?? port.side;
                const side = inner ? opposite[wall] : wall;
                const half = (override?.size ?? port.size ?? INTERCONNECTION_PORT_SIZE) / 2;
                return { side, terminal: { id, port: port.id,
                    anchor: { name: 'center', args: { dx: side === 'left' ? -half : side === 'right' ? half : 0, dy: side === 'top' ? -half : side === 'bottom' ? half : 0 } },
                    connectionPoint: { name: 'anchor' },
                } };
            }
            if (portId && !['left', 'right', 'top', 'bottom'].includes(portId)) throw new Error(`Missing port ${portId} on ${id}`);
            const side = (edge.data?.[`${end}Side`] ?? (end === 'source' ? 'right' : 'left')) as PortSide;
            return { side, terminal: { id, anchor: { name: side }, connectionPoint: { name: 'anchor' } } };
        }
        const a = endpoint(edge.source, edge.sourceHandle, 'source');
        const b = endpoint(edge.target, edge.targetHandle, 'target');
        const color = String(edge.style?.stroke ?? '#3498db');
        // Put links below parts so a route can never steal a block drag.
        const link = new shapes.standard.Link({ id: edge.id, source: a.terminal, target: b.terminal, z: 5,
            attrs: { line: { stroke: color, strokeWidth: 2, strokeDasharray: options.flowAnimation ? '8 6' : 'none', class: options.flowAnimation ? 'memo-joint-flow' : '', targetMarker: { type: 'path', d: 'M 6 -3 0 0 6 3 z' } } },
            labels: edge.label && edge.data?.showLabel !== false ? [{ position: 0.5, attrs: { text: { text: String(edge.label), fontSize: 10, fill: '#475569' }, rect: { fill: '#ffffff', stroke: '#e2e8f0', rx: 2 } } }] : [],
        });
        const vertices = options.vertices?.[edge.id];
        if (vertices?.length) link.vertices(vertices);
        // Adjacent ports that face each other need no path search: their
        // direct segment lies entirely in the gap between the two boxes. The
        // Manhattan router treats this narrow case as a U-turn and reports a
        // fallback even though a perfectly safe straight route exists.
        const sourceBox = source.getBBox(), targetBox = target.getBBox();
        const overlaps = (startA: number, endA: number, startB: number, endB: number) => startA < endB && startB < endA;
        const horizontalGap = Math.max(sourceBox.x, targetBox.x) - Math.min(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width);
        const verticalGap = Math.max(sourceBox.y, targetBox.y) - Math.min(sourceBox.y + sourceBox.height, targetBox.y + targetBox.height);
        const directGap = (horizontalGap >= 0 && horizontalGap <= 48
            && overlaps(sourceBox.y, sourceBox.y + sourceBox.height, targetBox.y, targetBox.y + targetBox.height))
            || (verticalGap >= 0 && verticalGap <= 48
                && overlaps(sourceBox.x, sourceBox.x + sourceBox.width, targetBox.x, targetBox.x + targetBox.width));
        if (directGap) link.router('normal');
        else link.router('manhattan', {
            // Use a fine enough grid to find corridors between adjacent IBD
            // parts. The previous 16px/20px combination rejected several
            // valid routes in the vehicle pilot, then fell back to a line
            // that crossed a part. Only actual parts are obstacles; nested
            // frames stay traversable so internal wiring remains inside its
            // subsystem.
            // Keep the interaction budget aligned with JointJS's Manhattan
            // default. Raising this to 240,000 made a dragged connected part
            // wait for an exhaustive path search instead of falling back and
            // remaining responsive, unlike the Smart Routing reference demo.
            step: 10, maximumLoops: 2000,
            isPointObstacle(point: dia.Point) {
                return routingObstacles.some(obstacle => {
                    if (obstacle.id === source.id || obstacle.id === target.id) return false;
                    return obstacle.getBBox().inflate(12).containsPoint(point);
                });
            },
            startDirections: [a.side], endDirections: [b.side],
            fallbackRouter(vertices: dia.Point[], options: routers.ManhattanRouterArguments, view: dia.LinkView) {
                fallbackLinks.add(edge.id);
                // Visible count makes failure explicit: orthogonal fallback does not avoid obstacles.
                return routers.orthogonal(vertices, options, view!);
            },
        });
        link.connector('rounded', { radius: 4 });
        cells.push(link);
    }
    for (const [id, annotation] of Object.entries(options.annotations ?? {})) {
        cells.push(new shapes.standard.Rectangle({
            id,
            position: { x: annotation.x, y: annotation.y },
            size: { width: annotation.width ?? 180, height: annotation.height ?? 92 },
            z: 100,
            attrs: {
                body: { fill: annotation.kind === 'constraint' ? '#fff7ed' : '#fffbeb', stroke: annotation.color ?? '#d97706', strokeWidth: 1.5, rx: 4, ry: 4 },
                label: { text: annotation.text, fill: '#475569', fontSize: 12, fontFamily: 'Inter, sans-serif', textWrap: { width: -16, height: -16, ellipsis: true } },
            },
        }));
    }
    return { cells, fallbackLinks };
}

export function jointNodeGeometry(graph: dia.Graph, scene: ComparisonScene): DiagramLayout['nodes'] {
    return Object.fromEntries(graph.getElements().filter(element => !String(element.id).startsWith('annotation-')).map(element => {
        const parent = element.getParentCell() as dia.Element | null;
        const origin = parent?.position() ?? { x: 0, y: 0 };
        const point = element.position();
        const node = scene.nodes.find(n => n.id === element.id);
        return [element.id, { x: point.x - origin.x, y: point.y - origin.y, ...element.size(),
            ports: Object.fromEntries(((node?.data.ports ?? []) as PortInfo[]).map(port => {
                const saved = element.getPort(port.id);
                const args = saved?.args as { x?: number; y?: number } | undefined;
                const size = port.size ?? INTERCONNECTION_PORT_SIZE;
                const side = portSideFromArgs(args, size, element.size(), port.side);
                // JointJS stores a port's centre; MEMO layout stores its
                // top-left corner. Reading the live args makes boundary-port
                // drags survive renderer switches and reloads.
                return [port.id, {
                    x: typeof args?.x === 'number' ? args.x - size / 2 : port.x,
                    y: typeof args?.y === 'number' ? args.y - size / 2 : port.y,
                    side, size: port.size,
                }];
            })) }];
    }));
}

export function jointLinkGeometry(graph: dia.Graph): Record<string, Array<{ x: number; y: number }>> {
    return Object.fromEntries(graph.getLinks().flatMap(link => {
        const vertices = link.vertices().map(point => ({ x: point.x, y: point.y }));
        return vertices.length ? [[String(link.id), vertices]] : [];
    }));
}

import { memo, type PointerEvent as ReactPointerEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react';
import { FONT } from '../styles/tokens';
import { useConnectorHighlighted, useConnectorHoverActive } from './connector-hover';

interface Point { x: number; y: number }
interface RouteSegment { index: number; a: Point; b: Point; straight: boolean }

function trimStart(points: Point[], distance: number): Point[] {
    const next = points.map(point => ({ ...point }));
    let remaining = distance;
    while (next.length >= 2 && remaining > 0) {
        const a = next[0], b = next[1];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length <= remaining) {
            remaining -= length;
            next.shift();
        } else {
            const ratio = remaining / length;
            next[0] = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
            remaining = 0;
        }
    }
    return next;
}

function trimEndpoints(points: Point[], distance: number): Point[] {
    const startTrimmed = trimStart(points, distance);
    return trimStart([...startTrimmed].reverse(), distance).reverse();
}

const routeLength = (points: Point[]): number => points.slice(1)
    .reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);

function roundedPath(points: Point[], radius = 7): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1], cur = points[i], next = points[i + 1];
        const incoming = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const outgoing = Math.hypot(next.x - cur.x, next.y - cur.y);
        const r = Math.min(radius, incoming / 2, outgoing / 2);
        const inX = cur.x - Math.sign(cur.x - prev.x) * r;
        const inY = cur.y - Math.sign(cur.y - prev.y) * r;
        const outX = cur.x + Math.sign(next.x - cur.x) * r;
        const outY = cur.y + Math.sign(next.y - cur.y) * r;
        path += ` L ${inX},${inY} Q ${cur.x},${cur.y} ${outX},${outY}`;
    }
    const last = points[points.length - 1];
    return `${path} L ${last.x},${last.y}`;
}

/**
 * Where a connector label belongs: the midpoint of the route's longest
 * segment, nudged perpendicular so it sits beside the line instead of on it.
 * The longest segment is an edge's most distinctive corridor — labels from
 * edges sharing a junction spread apart instead of stacking at the shared
 * path midpoint, and it is the stretch least likely to hug a node border.
 */
function labelAnchor(points: Point[]): Point {
    let best = 0;
    let bestLength = -1;
    for (let i = 1; i < points.length; i++) {
        const length = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
        if (length > bestLength) { bestLength = length; best = i; }
    }
    const start = points[best - 1], end = points[best];
    const offset = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
        ? { x: 0, y: -14 }
        : { x: 14, y: 0 };
    return {
        x: (start.x + end.x) / 2 + offset.x,
        y: (start.y + end.y) / 2 + offset.y,
    };
}

function InterconnectionEdgeInner(props: EdgeProps) {
    const { getZoom, screenToFlowPosition } = useReactFlow();
    // Connectors that are not taking part are dimmed by ConnectorHoverStyles;
    // this edge only adds the ornament that marks the one that is.
    const highlighted = useConnectorHighlighted(props.id, [
        props.source, props.target,
        props.data?.sourcePortId as string | undefined,
        props.data?.targetPortId as string | undefined,
    ]);
    // Labels render through a portal, out of reach of the shared dimming rule.
    const labelDimmed = useConnectorHoverActive() && !highlighted;
    const points = (props.data?.points as Point[] | undefined) ?? [];
    if (points.length < 2) return null;
    const stroke = String(props.style?.stroke ?? '#2563EB');
    const baseWidth = Number(props.style?.strokeWidth ?? 2);
    const edgeStyle = highlighted
        ? { ...props.style, strokeWidth: baseWidth + 1.4 }
        : props.style;
    // A template that placed all its labels together supplies the point; a
    // lone edge falls back to its own longest segment.
    const anchor = (props.data?.labelPoint as Point | undefined) ?? labelAnchor(points);
    const hitTrim = Math.min(28 / Math.max(getZoom(), 0.1), routeLength(points) * 0.3);
    const hitPoints = trimEndpoints(points, hitTrim);
    const onRouteChange = props.data?.onRouteChange as ((points: Point[]) => void) | undefined;
    const onRouteChangeComplete = props.data?.onRouteChangeComplete as ((before: Point[], after: Point[]) => void) | undefined;
    const onSelect = props.data?.onSelect as ((event: React.MouseEvent<SVGPathElement>) => void) | undefined;
    const flowAnimation = Boolean(props.data?.flowAnimation);
    const draggableSegments: RouteSegment[] = points.length === 2
        ? [{ index: 1, a: points[0], b: points[1], straight: true }]
        : points.slice(1).map((point, index) => ({ index: index + 1, a: points[index], b: point, straight: false }))
            .filter(segment => segment.index >= 2 && segment.index <= points.length - 2);
    const beginRouteDrag = (event: ReactPointerEvent<SVGPathElement | HTMLDivElement>, segment: RouteSegment) => {
        if (!onRouteChange) return;
        event.preventDefault();
        event.stopPropagation();
        const before = points.map(point => ({ ...point }));
        const startX = event.clientX, startY = event.clientY;
        let latest = before;
        const move = (e: PointerEvent) => {
            const dx = (e.clientX - startX) / getZoom();
            const dy = (e.clientY - startY) / getZoom();
            if (segment.straight) {
                if (Math.abs(dy) >= Math.abs(dx)) {
                    const laneY = segment.a.y + dy;
                    latest = [segment.a, { x: segment.a.x, y: laneY }, { x: segment.b.x, y: laneY }, segment.b];
                } else {
                    const laneX = (segment.a.x + segment.b.x) / 2 + dx;
                    latest = [segment.a, { x: laneX, y: segment.a.y }, { x: laneX, y: segment.b.y }, segment.b];
                }
            } else {
                latest = points.map(point => ({ ...point }));
                if (segment.a.y === segment.b.y) {
                    latest[segment.index - 1].y = segment.a.y + dy;
                    latest[segment.index].y = segment.b.y + dy;
                } else {
                    latest[segment.index - 1].x = segment.a.x + dx;
                    latest[segment.index].x = segment.b.x + dx;
                }
            }
            onRouteChange(latest);
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            onRouteChangeComplete?.(before, latest);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
    };
    const nearestDraggableSegment = (point: Point): RouteSegment | undefined => {
        const squaredDistance = (segment: RouteSegment) => {
            const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
            const lengthSquared = dx * dx + dy * dy;
            const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
                ((point.x - segment.a.x) * dx + (point.y - segment.a.y) * dy) / lengthSquared));
            const x = segment.a.x + ratio * dx, y = segment.a.y + ratio * dy;
            return (point.x - x) ** 2 + (point.y - y) ** 2;
        };
        return draggableSegments.reduce<RouteSegment | undefined>((closest, segment) =>
            !closest || squaredDistance(segment) < squaredDistance(closest) ? segment : closest, undefined);
    };
    return (
        <>
            {highlighted && (
                <path
                    d={roundedPath(points)}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.22}
                    strokeWidth={baseWidth + 9}
                    strokeLinecap="round"
                    pointerEvents="none"
                />
            )}
            <BaseEdge id={props.id} path={roundedPath(points)} style={edgeStyle} markerEnd={props.markerEnd} />
            {flowAnimation && (
                <path
                    d={roundedPath(points)}
                    fill="none"
                    stroke={String(props.style?.stroke ?? '#2563EB')}
                    strokeWidth={Math.max(2, Number(props.style?.strokeWidth ?? 2))}
                    className="memo-ibd-flow"
                />
            )}
            {hitPoints.length >= 2 && (
                <path
                    d={roundedPath(hitPoints)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18 / Math.max(getZoom(), 0.1)}
                    pointerEvents="stroke"
                    cursor="pointer"
                    onClick={event => onSelect?.(event)}
                    onPointerDown={event => {
                        if (!props.selected || !onRouteChange || draggableSegments.length === 0) return;
                        const segment = nearestDraggableSegment(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
                        if (segment) beginRouteDrag(event, segment);
                    }}
                />
            )}
            {props.label && props.data?.showLabel !== false ? (
                <EdgeLabelRenderer>
                    <div style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${anchor.x}px, ${anchor.y}px)`,
                        fontSize: FONT.badge, fontWeight: highlighted ? 700 : 600,
                        color: highlighted ? '#0F172A' : '#475569',
                        background: 'rgba(255,255,255,0.96)',
                        border: `1px solid ${highlighted ? stroke : '#E2E8F0'}`,
                        opacity: labelDimmed ? 0.25 : 1,
                        padding: '1px 4px', borderRadius: 4, pointerEvents: 'none',
                    }}>
                        {props.label}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
            {props.selected && onRouteChange ? draggableSegments.map(segment => {
                const x = (segment.a.x + segment.b.x) / 2;
                const y = (segment.a.y + segment.b.y) / 2;
                return (
                    <EdgeLabelRenderer key={`route-${segment.index}`}>
                        <div
                            className="nodrag nopan"
                            title="Drag connector segment"
                            onPointerDown={event => beginRouteDrag(event, segment)}
                            style={{
                                position: 'absolute', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                width: 12, height: 12, borderRadius: 3, background: '#FFFFFF',
                                border: '2px solid #2563EB', boxShadow: '0 1px 4px rgba(15,23,42,0.22)',
                                cursor: segment.a.y === segment.b.y ? 'ns-resize' : 'ew-resize',
                                pointerEvents: 'all', touchAction: 'none', zIndex: 20,
                            }}
                        />
                    </EdgeLabelRenderer>
                );
            }) : null}
        </>
    );
}

export const InterconnectionEdge = memo(InterconnectionEdgeInner);

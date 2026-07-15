import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react';
import { FONT } from '../styles/tokens';

interface Point { x: number; y: number }

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

function pathMidpoint(points: Point[]): Point {
    const lengths = points.slice(1).map((p, i) => Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y));
    const half = lengths.reduce((a, b) => a + b, 0) / 2;
    let walked = 0;
    for (let i = 0; i < lengths.length; i++) {
        if (walked + lengths[i] >= half) {
            const ratio = lengths[i] ? (half - walked) / lengths[i] : 0;
            return {
                x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
                y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
            };
        }
        walked += lengths[i];
    }
    return points[points.length - 1];
}

function InterconnectionEdgeInner(props: EdgeProps) {
    const { getZoom } = useReactFlow();
    const points = (props.data?.points as Point[] | undefined) ?? [];
    if (points.length < 2) return null;
    const mid = pathMidpoint(points);
    const hitTrim = Math.min(28 / Math.max(getZoom(), 0.1), routeLength(points) * 0.3);
    const hitPoints = trimEndpoints(points, hitTrim);
    const onRouteChange = props.data?.onRouteChange as ((points: Point[]) => void) | undefined;
    const onSelect = props.data?.onSelect as ((event: React.MouseEvent<SVGPathElement>) => void) | undefined;
    const flowAnimation = Boolean(props.data?.flowAnimation);
    const draggableSegments = points.length === 2
        ? [{ index: 1, a: points[0], b: points[1], straight: true }]
        : points.slice(1).map((point, index) => ({ index: index + 1, a: points[index], b: point, straight: false }))
            .filter(segment => segment.index >= 2 && segment.index <= points.length - 2);
    return (
        <>
            <BaseEdge id={props.id} path={roundedPath(points)} style={props.style} markerEnd={props.markerEnd} />
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
                />
            )}
            {props.label ? (
                <EdgeLabelRenderer>
                    <div style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
                        fontSize: FONT.badge, fontWeight: 600, color: '#475569',
                        background: 'rgba(255,255,255,0.96)', border: '1px solid #E2E8F0',
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
                            onPointerDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                const startX = event.clientX, startY = event.clientY;
                                const move = (e: PointerEvent) => {
                                    const dx = (e.clientX - startX) / getZoom();
                                    const dy = (e.clientY - startY) / getZoom();
                                    if (segment.straight) {
                                        if (Math.abs(dy) >= Math.abs(dx)) {
                                            const laneY = segment.a.y + dy;
                                            onRouteChange([segment.a, { x: segment.a.x, y: laneY }, { x: segment.b.x, y: laneY }, segment.b]);
                                        } else {
                                            const laneX = (segment.a.x + segment.b.x) / 2 + dx;
                                            onRouteChange([segment.a, { x: laneX, y: segment.a.y }, { x: laneX, y: segment.b.y }, segment.b]);
                                        }
                                        return;
                                    }
                                    const next = points.map(point => ({ ...point }));
                                    if (segment.a.y === segment.b.y) {
                                        next[segment.index - 1].y = segment.a.y + dy;
                                        next[segment.index].y = segment.b.y + dy;
                                    } else {
                                        next[segment.index - 1].x = segment.a.x + dx;
                                        next[segment.index].x = segment.b.x + dx;
                                    }
                                    onRouteChange(next);
                                };
                                const up = () => {
                                    window.removeEventListener('pointermove', move);
                                    window.removeEventListener('pointerup', up);
                                };
                                window.addEventListener('pointermove', move);
                                window.addEventListener('pointerup', up, { once: true });
                            }}
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

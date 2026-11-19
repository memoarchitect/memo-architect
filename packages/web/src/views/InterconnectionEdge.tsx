import { attachedRoute, cubicRoutePath, arcRoutePath, polylinePath, type IbdRoutingType } from '../diagram/ibd-routing';
import { crossoverGaps } from '../diagram/ibd-crossovers';
import { dragAxis, guideCoordinates, nudgeSegment, snapCoordinate, straightenRoute, type SnapAxis, type SnapGuide } from '../diagram/route-snapping';
import { ibdEdgeHitClip } from '../diagram/ibd-hit-targets';
import { memo, useMemo, useEffect, useRef, useState, useId, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, useStore, type EdgeProps } from '@xyflow/react';
import { FONT } from '../styles/tokens';
import { useConnectorHighlighted, useConnectorHoverActive } from './connector-hover';
import { useInterconnectionRenderer } from '../diagram/renderers/interconnection-renderer';
import { labelTextOverrides, useEdgeLabelStyle, useMoveEdgeLabel } from './label-style';

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
        const inX = cur.x - (cur.x - prev.x) / (incoming || 1) * r;
        const inY = cur.y - (cur.y - prev.y) / (incoming || 1) * r;
        const outX = cur.x + (next.x - cur.x) / (outgoing || 1) * r;
        const outY = cur.y + (next.y - cur.y) / (outgoing || 1) * r;
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
    const cancelGesture = useRef<(() => void) | null>(null);
    useEffect(() => () => cancelGesture.current?.(), []);
    const renderer = useInterconnectionRenderer();
    const labelStyle = useEdgeLabelStyle(props.id);
    const moveLabel = useMoveEdgeLabel();
    // Where the label is while it is being dragged; it is committed on release.
    const [labelDrag, setLabelDrag] = useState<Point | null>(null);
    const cancelLabelDrag = useRef<(() => void) | null>(null);
    useEffect(() => () => cancelLabelDrag.current?.(), []);
    const clipId = `ibd-hit-${useId().replaceAll(':', '')}`;
    const hitClip = useStore(state => ibdEdgeHitClip(state.nodes, state.transform[2]));
    const allEdges = useStore(state => state.edges);
    const gaps = useMemo(() => crossoverGaps(allEdges.map(edge => ({
        id: edge.id, points: (edge.data?.points as Point[] | undefined) ?? [],
        type: edge.data?.routingType as IbdRoutingType | undefined, manual: Boolean(edge.data?.manualRoute),
        sourceSide: edge.data?.sourceSide as any, targetSide: edge.data?.targetSide as any,
        sourceKey: JSON.stringify([edge.source, edge.data?.sourcePortId ?? null]),
        targetKey: JSON.stringify([edge.target, edge.data?.targetPortId ?? null]),
    }))), [allEdges]);
    const maskId = `ibd-crossovers-${useId().replaceAll(':', '')}`;
    const controlZoom = useStore(state => Math.max(0.1, state.transform[2]));
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
    // The line a dragged segment is drawn to, shown while it holds; and the segment the arrow keys move.
    const [guide, setGuide] = useState<SnapGuide | null>(null);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);
    const nudge = useRef<(event: KeyboardEvent) => void>(() => {});
    useEffect(() => {
        if (!props.selected || activeSegment === null) return;
        const onKey = (event: KeyboardEvent) => nudge.current(event);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [props.selected, activeSegment]);
    useEffect(() => { if (!props.selected) setActiveSegment(null); }, [props.selected]);
    const points = (props.data?.points as Point[] | undefined) ?? [];
    if (points.length < 2) return null;
    const routingType = (props.data?.routingType as IbdRoutingType | undefined) ?? 'orthogonal';
    const drawPoints = attachedRoute(points, routingType, props.data?.sourceSide as any, props.data?.targetSide as any, Boolean(props.data?.manualRoute));
    const pathFor = (p: Point[]) => routingType === 'curved' ? cubicRoutePath(p)
        : routingType === 'arc' ? arcRoutePath(p, Boolean(props.data?.manualRoute))
        : routingType === 'rounded' ? roundedPath(p) : polylinePath(p);
    const displayPath = pathFor(drawPoints);
    const crossings = gaps.get(props.id) ?? [];
    const minX = Math.min(...drawPoints.map(p => p.x)) - 128;
    const minY = Math.min(...drawPoints.map(p => p.y)) - 128;
    const maskWidth = Math.max(...drawPoints.map(p => p.x)) - minX + 128;
    const maskHeight = Math.max(...drawPoints.map(p => p.y)) - minY + 128;
    const stroke = renderer.edgeStroke(props.style?.stroke as string | undefined);
    const baseWidth = Number(props.style?.strokeWidth ?? 2);
    const edgeStyle = highlighted
        ? { ...props.style, stroke, strokeWidth: baseWidth + 1.4 }
        : { ...props.style, stroke };
    // A template that placed all its labels together supplies the point; a
    // lone edge falls back to its own longest segment.
    const anchor = labelDrag ?? (props.data?.labelPoint as Point | undefined) ?? labelAnchor(points);
    // The view's own choice wins over the diagram-wide connection-text toggle.
    const labelShown = Boolean(props.label) && (labelStyle?.labelVisible ?? props.data?.showLabel !== false);
    const beginLabelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!moveLabel || event.button !== 0) return;
        event.stopPropagation();
        const start = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const origin = anchor;
        let last = origin, moved = false;
        const move = (next: PointerEvent) => {
            // A click or double-click is not a drag.
            if (!moved && Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY) <= 3) return;
            moved = true;
            const at = screenToFlowPosition({ x: next.clientX, y: next.clientY });
            last = { x: origin.x + at.x - start.x, y: origin.y + at.y - start.y };
            setLabelDrag(last);
        };
        const cleanup = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('keydown', key);
            cancelLabelDrag.current = null;
        };
        const cancel = () => { cleanup(); setLabelDrag(null); };
        const key = (next: KeyboardEvent) => { if (next.key === 'Escape') cancel(); };
        const stop = () => { cleanup(); if (moved) moveLabel(props.id, last); setLabelDrag(null); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop, { once: true });
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('keydown', key);
        cancelLabelDrag.current = cancel;
    };
    // A label sitting on a vertical run reads along the line, not across it,
    // unless the person chose which way it runs.
    const labelRotation = labelStyle?.textOrientation === 'horizontal' ? ''
        : labelStyle?.textOrientation === 'vertical' ? ' rotate(-90deg)' : (() => {
        for (let i = 0; i < points.length - 1; i++) {
            const p = points[i], q = points[i + 1];
            if (anchor.x >= Math.min(p.x, q.x) - 8 && anchor.x <= Math.max(p.x, q.x) + 8 &&
                anchor.y >= Math.min(p.y, q.y) - 8 && anchor.y <= Math.max(p.y, q.y) + 8)
                return Math.abs(q.y - p.y) > Math.abs(q.x - p.x) ? ' rotate(-90deg)' : '';
        }
        return '';
    })();
    const hitTrim = Math.min(28 / Math.max(getZoom(), 0.1), routeLength(points) * 0.3);
    const hitPoints = trimEndpoints(drawPoints, hitTrim);
    const hitPath = pathFor(hitPoints);
    const onRouteChange = props.data?.onRouteChange as ((points: Point[]) => void) | undefined;
    const onRouteChangeComplete = props.data?.onRouteChangeComplete as ((before: Point[], after: Point[], wasManual: boolean) => void) | undefined;
    const onRouteStart = props.data?.onRouteStart as (() => void) | undefined;
    const onRouteCancel = props.data?.onRouteCancel as (() => void) | undefined;
    const onSelect = props.data?.onSelect as ((event: React.MouseEvent<SVGPathElement>) => void) | undefined;
    const flowAnimation = Boolean(props.data?.flowAnimation);
    const draggableSegments: RouteSegment[] = points.length === 2
        ? [{ index: 1, a: points[0], b: points[1], straight: true }]
        : points.slice(1).map((point, index) => ({ index: index + 1, a: points[index], b: point, straight: false }));
    const gesture = (event: ReactPointerEvent<SVGPathElement | HTMLDivElement>,
        update: (e: PointerEvent) => Point[]) => {
        cancelGesture.current?.();
        const x = event.clientX, y = event.clientY, pointer = event.pointerId;
        let moved = false, latest = points;
        const cleanup = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('keydown', key);
            window.removeEventListener('blur', cancel);
            cancelGesture.current = null;
            setGuide(null);
        };
        const cancel = () => { cleanup(); if (moved) onRouteCancel?.(); };
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } };
        const move = (e: PointerEvent) => {
            if (e.pointerId !== pointer) return;
            if (!moved && Math.hypot(e.clientX - x, e.clientY - y) <= 3) return;
            if (!moved) { onRouteStart?.(); moved = true; }
            latest = update(e); onRouteChange?.(latest);
        };
        const up = (e: PointerEvent) => {
            if (e.pointerId !== pointer) return;
            cleanup();
            if (!moved) return;
            // A segment left level with its neighbours has bends that no longer turn; they go when the drag ends.
            const straightened = straightenRoute(latest, routingType);
            if (straightened !== latest) { latest = straightened; onRouteChange?.(latest); setActiveSegment(null); }
            onRouteChangeComplete?.(points, latest, Boolean(props.data?.manualRoute));
        };
        cancelGesture.current = cancel;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('keydown', key);
        window.addEventListener('blur', cancel);
    };
    const beginRouteDrag = (event: ReactPointerEvent<SVGPathElement | HTMLDivElement>, segment: RouteSegment) => {
        if (!onRouteChange) return;
        event.preventDefault();
        event.stopPropagation();
        const before = points.map(point => ({ ...point }));
        const startX = event.clientX, startY = event.clientY;
        setActiveSegment(segment.index);
        const others = allEdges.filter(edge => edge.id !== props.id)
            .map(edge => (edge.data?.points as Point[] | undefined) ?? []);
        // Draws the dragged coordinate to a nearby line of this or another connector. Alt drags freely.
        const snap = (e: PointerEvent, axis: SnapAxis, value: number, moving: number[]) => {
            if (e.altKey) { setGuide(null); return value; }
            const snapped = snapCoordinate(value, guideCoordinates(axis, points, moving, others), 6 / getZoom());
            setGuide(snapped.snapped ? { axis, value: snapped.value } : null);
            return snapped.value;
        };
        gesture(event, (e: PointerEvent) => {
            let latest = before;
            const dx = (e.clientX - startX) / getZoom();
            const dy = (e.clientY - startY) / getZoom();
            if (segment.straight || segment.index === 1 || segment.index === points.length - 1) {
                if (Math.abs(dy) >= Math.abs(dx)) {
                    const laneY = snap(e, 'y', segment.a.y + dy, []);
                    latest = [...before.slice(0, segment.index), { x: segment.a.x, y: laneY }, { x: segment.b.x, y: laneY }, ...before.slice(segment.index)];
                } else {
                    const laneX = snap(e, 'x', (segment.a.x + segment.b.x) / 2 + dx, []);
                    latest = [...before.slice(0, segment.index), { x: laneX, y: segment.a.y }, { x: laneX, y: segment.b.y }, ...before.slice(segment.index)];
                }
            } else {
                latest = points.map(point => ({ ...point }));
                const moving = [segment.index - 1, segment.index];
                if (segment.a.y === segment.b.y) {
                    latest[segment.index - 1].y = latest[segment.index].y = snap(e, 'y', segment.a.y + dy, moving);
                } else if (segment.a.x === segment.b.x) {
                    latest[segment.index - 1].x = latest[segment.index].x = snap(e, 'x', segment.a.x + dx, moving);
                } else {
                    latest[segment.index - 1] = { x: segment.a.x + dx, y: segment.a.y + dy };
                    latest[segment.index] = { x: segment.b.x + dx, y: segment.b.y + dy };
                }
            }
            return latest;
        });
    };
    // Arrow keys move the segment last picked up, across its own direction: one unit, ten with Shift. Each press
    // is one route edit, so one undo step.
    nudge.current = (event: KeyboardEvent) => {
        if (!onRouteChange || activeSegment === null || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        const axis = activeSegment >= 1 && activeSegment < points.length
            ? dragAxis(points[activeSegment - 1], points[activeSegment]) : undefined;
        const direction = axis === 'y' ? (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0)
            : axis === 'x' ? (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0) : 0;
        if (!direction) return;
        const after = nudgeSegment(points, activeSegment, direction * (event.shiftKey ? 10 : 1));
        if (!after) return;
        event.preventDefault(); event.stopPropagation();
        onRouteStart?.(); onRouteChange(after); onRouteChangeComplete?.(points, after, Boolean(props.data?.manualRoute));
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
    const onLineDoubleClick = (event: ReactMouseEvent<SVGPathElement | HTMLDivElement>) => {
        if (!props.data?.manualRoute) {
            event.stopPropagation();
            (props.data?.onInspect as (() => void) | undefined)?.();
            return;
        }
        if (!onRouteChange) return;
        event.preventDefault(); event.stopPropagation();
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const segment = nearestDraggableSegment(point);
        if (!segment) return;
        const after = [...points.slice(0, segment.index), point, ...points.slice(segment.index)];
        onRouteStart?.(); onRouteChange(after); onRouteChangeComplete?.(points, after, true);
    };
    return (
        <>
            {crossings.length > 0 && <defs><mask id={maskId} maskUnits="userSpaceOnUse"
                x={minX} y={minY} width={maskWidth} height={maskHeight}>
                <rect x={minX} y={minY} width={maskWidth} height={maskHeight} fill="white" />
                {crossings.map((point, index) => <circle key={index} data-ibd-crossover-gap
                    cx={point.x} cy={point.y} r={5.5} fill="black" />)}
            </mask></defs>}
            <g mask={crossings.length ? `url(#${maskId})` : undefined}>
            {highlighted && (
                <path
                    d={displayPath}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.22}
                    strokeWidth={baseWidth + 9}
                    strokeLinecap="round"
                    pointerEvents="none"
                />
            )}
            <defs><clipPath id={clipId}><path d={hitClip} clipRule="evenodd" /></clipPath></defs>
            <BaseEdge id={props.id} path={displayPath} interactionWidth={0} style={{ ...edgeStyle, pointerEvents: 'none' }} markerEnd={props.markerEnd} />
            {flowAnimation && (
                <path
                    d={displayPath}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={Math.max(2, Number(props.style?.strokeWidth ?? 2))}
                    className="memo-ibd-flow" pointerEvents="none"
                />
            )}
            </g>
            {guide && (
                <line data-ibd-snap-guide pointerEvents="none" stroke="#2563EB" strokeWidth={1 / controlZoom}
                    strokeDasharray={`${4 / controlZoom} ${3 / controlZoom}`}
                    x1={guide.axis === 'x' ? guide.value : minX - 100_000} x2={guide.axis === 'x' ? guide.value : minX + 100_000}
                    y1={guide.axis === 'y' ? guide.value : minY - 100_000} y2={guide.axis === 'y' ? guide.value : minY + 100_000} />
            )}
            {hitPoints.length >= 2 && (
                <path
                    d={hitPath}
                    clipPath={`url(#${clipId})`}
                    data-ibd-connector-hit
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18 / Math.max(getZoom(), 0.1)}
                    pointerEvents="stroke"
                    cursor="pointer"
                    onClick={event => onSelect?.(event)}
                    onDoubleClick={onLineDoubleClick}
                    onPointerDown={event => {
                        if (!onRouteChange || draggableSegments.length === 0) return;
                        const segment = nearestDraggableSegment(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
                        if (segment) beginRouteDrag(event, segment);
                    }}
                />
            )}
            {labelShown ? (
                <EdgeLabelRenderer>
                    <div className="nodrag nopan" onPointerDown={beginLabelDrag} title={moveLabel ? 'Drag to move the label' : undefined} onDoubleClick={event => { event.stopPropagation();
                        (props.data?.onInspect as (() => void) | undefined)?.(); }} style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${anchor.x}px, ${anchor.y}px)${labelRotation}`,
                        fontSize: FONT.badge, fontWeight: highlighted ? 700 : 600,
                        color: highlighted ? '#0F172A' : '#475569',
                        ...labelTextOverrides(labelStyle),
                        background: 'rgba(255,255,255,0.96)',
                        border: `1px solid ${highlighted ? stroke : '#E2E8F0'}`,
                        opacity: labelDimmed ? 0.25 : 1,
                        padding: '1px 4px', borderRadius: 4, pointerEvents: 'all',
                        cursor: moveLabel ? 'move' : undefined, touchAction: 'none',
                        // Above the parts, as the connector itself is: a link between two nested parts is labelled
                        // over its container, and without this the container's fill hid the label.
                        zIndex: 20,
                    }}>
                        {props.label}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
            {props.selected && props.data?.manualRoute && onRouteChange ? points.slice(1, -1).map((point, offset) => (
                <EdgeLabelRenderer key={`breakpoint-${offset}`}>
                    <div className="nodrag nopan" role="button" aria-label={`Route breakpoint ${offset + 1}`}
                        title="Drag breakpoint to move; double-click to remove"
                        onDoubleClick={event => {
                            event.preventDefault(); event.stopPropagation();
                            const after = points.filter((_, index) => index !== offset + 1);
                            onRouteStart?.(); onRouteChange(after); onRouteChangeComplete?.(points, after, true);
                        }}
                        onPointerDown={event => {
                            event.preventDefault(); event.stopPropagation();
                            const before = points.map(p => ({ ...p }));
                            gesture(event, (e: PointerEvent) => {
                                const after = before.map(p => ({ ...p }));
                                after[offset + 1] = screenToFlowPosition({ x: e.clientX, y: e.clientY });
                                return after;
                            });
                        }}
                        style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
                            width: 12 / controlZoom, height: 12 / controlZoom, boxSizing: 'border-box', borderRadius: '50%', background: '#fff', border: `${2 / controlZoom}px solid #d97706`,
                            cursor: 'move', pointerEvents: 'all', touchAction: 'none', zIndex: 21 }} />
                </EdgeLabelRenderer>
            )) : null}
            {props.selected && onRouteChange ? draggableSegments.map(segment => {
                const x = (segment.a.x + segment.b.x) / 2;
                const y = (segment.a.y + segment.b.y) / 2;
                return (
                    <EdgeLabelRenderer key={`route-${segment.index}`}>
                        <div
                            className="nodrag nopan"
                            title={segment.index > 1 && segment.index < points.length - 1
                                ? 'Drag connector segment. It lines up with nearby connectors (hold Alt to place it freely). Arrow keys move it once picked.'
                                : 'Drag connector segment'}
                            onDoubleClick={onLineDoubleClick}
                            onPointerDown={event => beginRouteDrag(event, segment)}
                            style={{
                                position: 'absolute', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                width: 12 / controlZoom, height: 12 / controlZoom, boxSizing: 'border-box', borderRadius: 3 / controlZoom,
                                background: activeSegment === segment.index ? '#2563EB' : '#FFFFFF',
                                border: `${2 / controlZoom}px solid #2563EB`, boxShadow: '0 1px 4px rgba(15,23,42,0.22)',
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

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useConnectorHighlighted, useConnectorHoverActive } from './connector-hover';

type Point = { x: number; y: number };

function orthogonalPath(points: Point[], radius = 0): string {
    if (points.length < 2) return '';
    if (radius === 0 || points.length === 2) return `M ${points.map(point => `${point.x},${point.y}`).join(' L ')}`;
    let path = `M ${points[0].x},${points[0].y}`;
    for (let index = 1; index < points.length - 1; index++) {
        const previous = points[index - 1], point = points[index], next = points[index + 1];
        const before = Math.min(radius, Math.abs(point.x - previous.x) / 2 + Math.abs(point.y - previous.y) / 2);
        const after = Math.min(radius, Math.abs(next.x - point.x) / 2 + Math.abs(next.y - point.y) / 2);
        const entry = { x: point.x + Math.sign(previous.x - point.x) * before, y: point.y + Math.sign(previous.y - point.y) * before };
        const exit = { x: point.x + Math.sign(next.x - point.x) * after, y: point.y + Math.sign(next.y - point.y) * after };
        path += ` L ${entry.x},${entry.y} Q ${point.x},${point.y} ${exit.x},${exit.y}`;
    }
    const last = points[points.length - 1];
    return `${path} L ${last.x},${last.y}`;
}

export const UseCaseEdge = memo(function UseCaseEdge(props: EdgeProps) {
    // Unrelated associations are dimmed by ConnectorHoverStyles; this edge adds
    // the ornament for the one being traced.
    const highlighted = useConnectorHighlighted(props.id, [props.source, props.target]);
    const labelDimmed = useConnectorHoverActive() && !highlighted;
    const routing = (props.data?.routing as string | undefined) ?? 'rounded';
    const routed = Array.isArray(props.data?.points) ? props.data.points as Point[] : [];
    const points = routed.length >= 2 ? routed : [{ x: props.sourceX, y: props.sourceY }, { x: props.targetX, y: props.targetY }];
    const cornerRadius = routing === 'elbow' ? 0 : routing === 'rounded' ? 16 : routing === 'curved' ? 30 : 42;
    const path = routing === 'straight'
        ? `M ${props.sourceX},${props.sourceY} L ${props.targetX},${props.targetY}`
        : orthogonalPath(points, cornerRadius);
    // A template that placed all its labels together supplies the point; a lone
    // edge falls back to its own midpoint.
    const middle = (props.data?.labelPoint as Point | undefined)
        ?? points[Math.floor(points.length / 2)]
        ?? { x: (props.sourceX + props.targetX) / 2, y: (props.sourceY + props.targetY) / 2 };
    const stroke = String(props.style?.stroke ?? '#64748B');
    const baseWidth = Number(props.style?.strokeWidth ?? 1.5);
    return <>
        {highlighted && (
            <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeOpacity={0.22}
                strokeWidth={baseWidth + 9}
                strokeLinecap="round"
                pointerEvents="none"
            />
        )}
        <BaseEdge
            path={path}
            style={highlighted ? { ...props.style, strokeWidth: baseWidth + 1.4 } : props.style}
        />
        {props.label && <EdgeLabelRenderer>
            <div className="nodrag nopan" style={{
                position: 'absolute', transform: `translate(-50%, -50%) translate(${middle.x}px,${middle.y}px)`,
                background: '#FFFFFF', padding: '2px 5px', borderRadius: 3,
                color: highlighted ? '#0F172A' : '#334155', fontSize: 12, pointerEvents: 'all',
                fontWeight: highlighted ? 700 : undefined,
                // The label renders through a portal, out of reach of the
                // shared dimming rule.
                opacity: labelDimmed ? 0.25 : 1,
            }}>{props.label as string}</div>
        </EdgeLabelRenderer>}
    </>;
});

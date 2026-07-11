// ─── InterconnectionEdge ─────────────────────────────────────────────────────
//
// Custom ReactFlow edge for the Interconnection view template (KK-3).
// Draws the ELK-computed orthogonal route (data.points, flow coordinates)
// with rounded corners, instead of ReactFlow's obstacle-blind smoothstep —
// so connectors go around part boxes the way ELK routed them.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { FONT } from '../styles/tokens';

interface Point { x: number; y: number }

const CORNER_RADIUS = 6;

/** Orthogonal polyline path with rounded corners. */
function roundedPath(points: Point[]): string {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1], cur = points[i], next = points[i + 1];
        const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
        const r = Math.min(CORNER_RADIUS, inLen / 2, outLen / 2);
        if (r < 1) {
            d += ` L ${cur.x},${cur.y}`;
            continue;
        }
        const inX = cur.x - Math.sign(cur.x - prev.x) * r;
        const inY = cur.y - Math.sign(cur.y - prev.y) * r;
        const outX = cur.x + Math.sign(next.x - cur.x) * r;
        const outY = cur.y + Math.sign(next.y - cur.y) * r;
        d += ` L ${inX},${inY} Q ${cur.x},${cur.y} ${outX},${outY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;
    return d;
}

function InterconnectionEdgeInner(props: EdgeProps) {
    const points = (props.data?.points as Point[] | undefined) ?? [];
    if (points.length < 2) return null;

    const path = roundedPath(points);
    const mid = points[Math.floor(points.length / 2)];

    return (
        <>
            <BaseEdge
                id={props.id}
                path={path}
                style={props.style}
                markerEnd={props.markerEnd}
            />
            {props.label ? (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
                            fontSize: FONT.badge,
                            fontWeight: 500,
                            color: '#6B7280',
                            background: 'rgba(255,255,255,0.9)',
                            padding: '1px 4px',
                            borderRadius: 4,
                            pointerEvents: 'none',
                        }}
                    >
                        {props.label}
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    );
}

export const InterconnectionEdge = memo(InterconnectionEdgeInner);

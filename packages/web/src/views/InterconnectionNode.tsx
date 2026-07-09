// ─── InterconnectionNode ─────────────────────────────────────────────────────
//
// Custom ReactFlow node for the Interconnection view template (KK-3).
// Renders a part as a box (leaf) or container (nested containment), with
// its ports pinned on the boundary at the ELK-computed positions. Each port
// carries paired source/target handles so typed connectors anchor to it.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FONT, RADIUS, SHADOW } from '../styles/tokens';
import type { PortInfo, PortSide } from './templates/interconnection-view';
import { INTERCONNECTION_PORT_SIZE } from './templates/interconnection-view';

export interface InterconnectionNodeData extends Record<string, unknown> {
    label: string;
    kind: string;
    layer: string;
    color: string;
    isContainer: boolean;
    /** Ports pinned on this part's boundary */
    ports: PortInfo[];
    /** Port element without a visible owner, rendered as a free chip */
    isFreePort?: boolean;
}

const SIDE_TO_POSITION: Record<PortSide, Position> = {
    top: Position.Top,
    bottom: Position.Bottom,
    left: Position.Left,
    right: Position.Right,
};

/** Direction glyph shown inside the port square. */
function portGlyph(direction: PortInfo['direction'], side: PortSide): string {
    if (direction === 'inout') return '⇄';
    if (!direction) return '';
    const inward = direction === 'in';
    switch (side) {
        case 'left': return inward ? '→' : '←';
        case 'right': return inward ? '←' : '→';
        case 'top': return inward ? '↓' : '↑';
        default: return inward ? '↑' : '↓';
    }
}

function BoundaryPort({ port, color }: { port: PortInfo; color: string }) {
    const size = INTERCONNECTION_PORT_SIZE;
    const labelOffset = size + 4;
    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: '8px',
        fontWeight: 600,
        color: '#6B7280',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...(port.side === 'left' ? { left: labelOffset, top: 2 }
            : port.side === 'right' ? { right: labelOffset, top: 2 }
            : port.side === 'top' ? { top: labelOffset, left: '50%', transform: 'translateX(-50%)' }
            : { bottom: labelOffset, left: '50%', transform: 'translateX(-50%)' }),
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: port.x,
                top: port.y,
                width: size,
                height: size,
                background: '#FFFFFF',
                border: `1.5px solid ${color}`,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                color,
                zIndex: 2,
            }}
            title={`${port.name}${port.direction ? ` (${port.direction})` : ''}`}
        >
            {portGlyph(port.direction, port.side)}
            <span style={labelStyle}>{port.name}</span>
            <Handle
                type="source"
                id={port.id}
                position={SIDE_TO_POSITION[port.side]}
                style={{ opacity: 0, width: size, height: size, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: 'none', background: 'transparent' }}
                isConnectable={false}
            />
            <Handle
                type="target"
                id={port.id}
                position={SIDE_TO_POSITION[port.side]}
                style={{ opacity: 0, width: size, height: size, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: 'none', background: 'transparent' }}
                isConnectable={false}
            />
        </div>
    );
}

const defaultHandleStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    background: '#2DD4A8',
    border: '1.5px solid #FFFFFF',
    opacity: 0,
};

function InterconnectionNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as InterconnectionNodeData;
    const { label, kind, color, isContainer, ports, isFreePort } = d;

    if (isFreePort) {
        return (
            <div
                style={{
                    padding: '3px 8px',
                    background: '#FFFFFF',
                    border: `1.5px solid ${color}`,
                    borderRadius: 4,
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#374151',
                    boxShadow: SHADOW.sm,
                }}
                title={kind}
            >
                <Handle type="target" position={Position.Left} style={defaultHandleStyle} />
                {label}
                <Handle type="source" position={Position.Right} style={defaultHandleStyle} />
            </div>
        );
    }

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: isContainer ? color + '08' : '#FFFFFF',
                border: isContainer ? `1.5px solid ${color}55` : undefined,
                borderLeft: isContainer ? `1.5px solid ${color}55` : `3px solid ${color}`,
                ...(isContainer ? {} : {
                    borderTop: '1px solid #E5E5E0',
                    borderRight: '1px solid #E5E5E0',
                    borderBottom: '1px solid #E5E5E0',
                }),
                borderRadius: isContainer ? RADIUS.lg : RADIUS.md,
                boxShadow: selected ? SHADOW.selected : isContainer ? 'none' : SHADOW.md,
                position: 'relative',
            }}
        >
            {/* Fallback handles for connectors that target the part itself */}
            <Handle type="target" position={Position.Top} id="top" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={defaultHandleStyle} />
            <Handle type="target" position={Position.Left} id="left" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Right} id="right" style={defaultHandleStyle} />

            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: isContainer ? '10px 14px' : '9px 14px 2px',
                overflow: 'hidden',
            }}>
                <span style={{
                    fontSize: FONT.md,
                    fontWeight: 600,
                    color: isContainer ? color : '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {label}
                </span>
            </div>
            <div style={{
                padding: isContainer ? '0 14px' : '0 14px 8px',
                fontSize: '9px',
                fontWeight: 700,
                color: color,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                position: isContainer ? 'absolute' : undefined,
                top: isContainer ? 28 : undefined,
            }}>
                {kind}
            </div>

            {/* Boundary ports */}
            {ports.map(p => <BoundaryPort key={p.id} port={p} color={color} />)}
        </div>
    );
}

export const InterconnectionNode = memo(InterconnectionNodeInner);

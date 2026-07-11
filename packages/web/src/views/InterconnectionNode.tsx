// ─── InterconnectionNode ─────────────────────────────────────────────────────
//
// Custom ReactFlow node for the Interconnection view template (KK-3).
// Renders a part as a box (leaf), a nested container, or the diagram's
// context frame (root container), with its ports straddling the boundary
// at the template-computed positions. Each port carries paired
// source/target handles so typed connectors anchor to it.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FONT, SHADOW } from '../styles/tokens';
import type { PortInfo, PortSide } from './templates/interconnection-view';
import { INTERCONNECTION_PORT_SIZE } from './templates/interconnection-view';

export interface InterconnectionNodeData extends Record<string, unknown> {
    label: string;
    kind: string;
    layer: string;
    color: string;
    isContainer: boolean;
    /** Root container: rendered as the IBD context frame */
    isFrame?: boolean;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    /** Ports straddling this part's boundary */
    ports: PortInfo[];
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
    const labelOffset = size + 6;
    // Label sits inside the owner, next to the port (Altova convention)
    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: '9px',
        fontWeight: 600,
        color: '#374151',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...(port.side === 'left' ? { left: labelOffset, top: 1 }
            : port.side === 'right' ? { right: labelOffset, top: 1 }
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
                borderRadius: 2,
                boxShadow: SHADOW.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
                color,
                zIndex: 3,
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
    const { label, kind, color, isContainer, isFrame, ports, hasChildren, isCollapsed, onToggleCollapse } = d;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: isFrame ? '#FFFFFF'
                    : isContainer ? color + '06'
                    : '#FFFFFF',
                border: isContainer ? `1.5px solid ${isFrame ? color : color + '66'}` : undefined,
                ...(isContainer ? {} : {
                    borderLeft: `3px solid ${color}`,
                    borderTop: '1px solid #E5E5E0',
                    borderRight: '1px solid #E5E5E0',
                    borderBottom: '1px solid #E5E5E0',
                }),
                borderRadius: isFrame ? 2 : isContainer ? 3 : 2,
                boxShadow: selected ? SHADOW.selected : 'none',
                position: 'relative',
            }}
        >
            {/* Fallback handles for connectors that target the part itself */}
            <Handle type="target" position={Position.Top} id="top" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={defaultHandleStyle} />
            <Handle type="target" position={Position.Left} id="left" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Right} id="right" style={defaultHandleStyle} />

            {/* Header: frame gets the SysML corner tab, others an inline header */}
            {isFrame ? (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '7px 18px 7px 12px',
                    background: color + '14',
                    borderRight: `1.5px solid ${color}55`,
                    borderBottom: `1.5px solid ${color}55`,
                    borderRadius: '1px 0 3px 0',
                    maxWidth: '70%',
                }}>
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                        {label}
                    </span>
                    <span style={{
                        fontSize: '9px', fontWeight: 700, color,
                        textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>
                        {kind}
                    </span>
                    {hasChildren && onToggleCollapse && (
                        <button
                            aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
                            onClick={event => { event.stopPropagation(); onToggleCollapse(); }}
                            style={{
                                width: 18, height: 18, padding: 0, borderRadius: 2,
                                border: `1px solid ${color}88`, background: '#FFFFFF', color,
                                fontSize: 13, lineHeight: '16px', cursor: 'pointer', fontWeight: 700,
                            }}
                        >
                            {isCollapsed ? '+' : '−'}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        padding: isContainer ? '10px 14px 0' : '10px 14px 2px',
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
                        {hasChildren && onToggleCollapse && (
                            <button
                                aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
                                onClick={event => { event.stopPropagation(); onToggleCollapse(); }}
                                style={{
                                    marginLeft: 'auto', width: 18, height: 18, padding: 0,
                                    borderRadius: 2, border: `1px solid ${color}88`,
                                    background: '#FFFFFF', color, fontSize: 13, lineHeight: '16px',
                                    cursor: 'pointer', fontWeight: 700, flexShrink: 0,
                                }}
                            >
                                {isCollapsed ? '+' : '−'}
                            </button>
                        )}
                    </div>
                    <div style={{
                        padding: isContainer ? '1px 14px 0' : '1px 14px 8px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}>
                        {kind}
                    </div>
                </>
            )}

            {/* Boundary ports */}
            {ports.map(p => <BoundaryPort key={p.id} port={p} color={color} />)}
        </div>
    );
}

export const InterconnectionNode = memo(InterconnectionNodeInner);

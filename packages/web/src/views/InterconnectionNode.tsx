// ─── InterconnectionNode ─────────────────────────────────────────────────────
//
// Custom ReactFlow node for the Interconnection view template (KK-3).
// Renders, in proper SysML IBD notation:
//   - the context block as a diagram FRAME with a pentagon name-tab
//     (`Name : Type`), thin border, no fill — the diagram boundary itself;
//   - a part property as a solid box labelled `partName : Type`, a nested
//     container part showing its own internal parts;
//   - boundary ports as small squares straddling the edge, coloured by
//     direction (in = green, out = amber, inout = blue) with a direction arrow.
// Each port carries inner/outer source+target handles so typed connectors
// anchor to the correct face.
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useState } from 'react';
import { Handle, NodeResizer, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { FONT, SHADOW } from '../styles/tokens';
import type { PortInfo, PortSide } from './templates/interconnection-view';
import {
    INTERCONNECTION_PORT_SIZE, INNER_HANDLE_SUFFIX, PORT_DIR_COLORS,
} from './templates/interconnection-view';

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
    /** Visible proxy ports for relationships that target the part directly. */
    implicitIn?: boolean;
    implicitOut?: boolean;
    onPortMove?: (portId: string, y: number) => void;
}

const SIDE_TO_POSITION: Record<PortSide, Position> = {
    top: Position.Top,
    bottom: Position.Bottom,
    left: Position.Left,
    right: Position.Right,
};

const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
};

const NEUTRAL_PORT = '#6B7280';
const portColor = (direction: PortInfo['direction']): string =>
    direction ? PORT_DIR_COLORS[direction] : NEUTRAL_PORT;

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

/** Reserved label gutter must stay in step with SIDE_GUTTER in the template. */
const PORT_LABEL_MAX = 104;
const PORT_HIT_SIZE = 40;

const handlePinStyle = (size: number): React.CSSProperties => ({
    opacity: 0, width: size, height: size,
    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    border: 'none', background: 'transparent',
    // BoundaryPort owns interaction. React Flow's coincident source/target
    // handles otherwise alternate their crosshair cursor with the port's move
    // cursor as subpixel hit testing changes during hover.
    pointerEvents: 'none',
});

function BoundaryPort({ port, onMove }: { port: PortInfo; onMove?: (y: number) => void }) {
    const { getZoom } = useReactFlow();
    const zoom = useStore(state => state.transform[2]);
    const size = port.size ?? INTERCONNECTION_PORT_SIZE;
    const hitInset = (PORT_HIT_SIZE - size) / 2;
    const labelOffset = size + 5;
    const color = portColor(port.direction);
    // Label sits inside the owner, just ABOVE the port's centreline — the
    // connector enters the port horizontally at centre-y, so a vertically
    // centred label would be struck through by its own edge. A translucent
    // white pill keeps the text legible over the grid or a passing edge.
    const horizontal = port.side === 'left' || port.side === 'right';
    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: port.nested ? '9.5px' : '10.5px',
        fontWeight: port.nested ? 600 : 650,
        color: port.nested ? '#6B7280' : '#374151',
        whiteSpace: 'normal',
        pointerEvents: 'none',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        width: horizontal ? PORT_LABEL_MAX : 72,
        background: 'rgba(255,255,255,0.94)',
        padding: '1px 3px',
        borderRadius: 4,
        lineHeight: 1.12,
        ...(port.side === 'left' ? { left: labelOffset, bottom: '50%', marginBottom: 2 }
            : port.side === 'right' ? { right: labelOffset, bottom: '50%', marginBottom: 2, textAlign: 'right' as const }
            : port.side === 'top' ? { top: labelOffset, left: '50%', transform: 'translateX(-50%)' }
            : { bottom: labelOffset, left: '50%', transform: 'translateX(-50%)' }),
    };

    return (
        <div
            className="nodrag nopan"
            onPointerDown={onMove ? event => {
                event.preventDefault();
                event.stopPropagation();
                const startClientY = event.clientY;
                const startY = port.y;
                const move = (e: PointerEvent) => onMove(startY + (e.clientY - startClientY) / getZoom());
                const up = () => {
                    window.removeEventListener('pointermove', move);
                    window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up, { once: true });
            } : undefined}
            style={{
                position: 'absolute',
                left: port.x - hitInset,
                top: port.y - hitInset,
                width: PORT_HIT_SIZE,
                height: PORT_HIT_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: port.nested ? 11 : 10,
                // Use the board's grab convention instead of a competing
                // resize cursor. The port is constrained vertically by the
                // drag handler, but the pointer remains visually stable when
                // crossing its boundary and the parent node.
                cursor: onMove ? 'grab' : 'default',
                touchAction: 'none',
                // Ports are interaction controls as well as model glyphs. Keep
                // their on-screen acquisition size stable when fitView zooms a
                // large IBD down; otherwise a 32px port becomes ~18px at 0.58x
                // and the adjacent connector hit path wins hover intermittently.
                transform: `scale(${1 / Math.max(zoom, 0.1)})`,
                transformOrigin: 'center',
            }}
            title={`${port.name}${port.direction ? ` (${port.direction})` : ''}`}
        >
            <div style={{
                position: 'relative', width: size, height: size, boxSizing: 'border-box',
                background: '#FFFFFF', border: `2px solid ${color}`, borderRadius: 5,
                boxShadow: '0 1px 3px rgba(15,23,42,0.18)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color,
                fontSize: port.nested ? '10px' : '12px', fontWeight: 800, lineHeight: 1,
                pointerEvents: 'none',
            }}>
                {portGlyph(port.direction, port.side)}
                <span style={labelStyle}>{port.name.replace(/([a-z0-9])([A-Z])/g, '$1\u200B$2')}</span>
                {/* Anchor-only handles. The 36px parent owns all interaction. */}
                {([
                    { suffix: '', pos: SIDE_TO_POSITION[port.side] },
                    { suffix: INNER_HANDLE_SUFFIX, pos: SIDE_TO_POSITION[OPPOSITE_SIDE[port.side]] },
                ] as const).flatMap(h => ([
                    <Handle key={`s${h.suffix}`} className="ibd-port-anchor" type="source" id={`${port.id}${h.suffix}`} position={h.pos}
                        style={handlePinStyle(size)} isConnectable={false} />,
                    <Handle key={`t${h.suffix}`} className="ibd-port-anchor" type="target" id={`${port.id}${h.suffix}`} position={h.pos}
                        style={handlePinStyle(size)} isConnectable={false} />,
                ]))}
            </div>
        </div>
    );
}

function ImplicitPort({ side, direction }: { side: 'left' | 'right'; direction: 'in' | 'out' }) {
    const color = portColor(direction);
    const size = INTERCONNECTION_PORT_SIZE;
    return (
        <div
            aria-label={`implicit ${direction} port`}
            title={`Implicit ${direction} port — relationship targets the part directly`}
            style={{
                position: 'absolute', top: '50%',
                left: side === 'left' ? -size / 2 : undefined,
                right: side === 'right' ? -size / 2 : undefined,
                transform: 'translateY(-50%)', width: size, height: size,
                boxSizing: 'border-box', background: '#FFFFFF',
                border: `2px solid ${color}`, borderRadius: 4,
                boxShadow: '0 1px 3px rgba(15,23,42,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color, fontSize: 11, fontWeight: 800, lineHeight: 1,
                zIndex: 4, pointerEvents: 'none',
            }}
        >
            {portGlyph(direction, side)}
        </div>
    );
}

const defaultHandleStyle: React.CSSProperties = {
    width: 8, height: 8, background: '#2DD4A8', border: '1.5px solid #FFFFFF', opacity: 0,
};

/** Compact, non-wrapping SysML part-property identity. */
function TypedLabel({ name, kind, nameColor, typeColor, frame = false }: {
    name: string; kind: string; nameColor: string; typeColor: string; frame?: boolean;
}) {
    return (
        <span title={`${name} : ${kind}`} style={{ display: 'flex', flexDirection: frame ? 'row' : 'column', alignItems: frame ? 'baseline' : 'flex-start', gap: frame ? 6 : 1, minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <span style={{
                display: frame ? 'block' : '-webkit-box', width: '100%', minWidth: 0,
                fontSize: frame ? FONT.md : FONT.sm, lineHeight: 1.2, fontWeight: 700,
                color: nameColor, whiteSpace: frame ? 'nowrap' : 'normal', overflow: 'hidden',
                textOverflow: 'ellipsis', WebkitBoxOrient: 'vertical', WebkitLineClamp: frame ? undefined : 2,
                overflowWrap: 'anywhere',
            }}>
                {name}
            </span>
            <span style={{ display: 'block', maxWidth: '100%', fontSize: '9px', lineHeight: 1.15, fontWeight: 650, letterSpacing: '0.055em', textTransform: 'uppercase', color: typeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {frame ? `: ${kind}` : `«${kind}»`}
            </span>
        </span>
    );
}

function CollapseButton({ label, isCollapsed, onToggle, color, onColor }: {
    label: string; isCollapsed?: boolean; onToggle: () => void; color: string; onColor?: boolean;
}) {
    return (
        <button
            aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
            onClick={event => { event.stopPropagation(); onToggle(); }}
            style={{
                marginLeft: 'auto', width: 18, height: 18, padding: 0, borderRadius: 3,
                border: onColor ? '1px solid rgba(255,255,255,0.7)' : `1px solid ${color}88`,
                background: onColor ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
                color: onColor ? '#FFFFFF' : color,
                fontSize: 13, lineHeight: '15px', cursor: 'pointer', fontWeight: 700, flexShrink: 0,
            }}
        >
            {isCollapsed ? '+' : '−'}
        </button>
    );
}

function InterconnectionNodeInner({ id, data, selected, height }: NodeProps) {
    const d = data as unknown as InterconnectionNodeData;
    const { label, kind, color, isContainer, isFrame, ports, implicitIn, implicitOut, onPortMove, hasChildren, isCollapsed, onToggleCollapse } = d;
    const [hovered, setHovered] = useState(false);

    // The context frame is large — a hover/rest shadow on it reads as noise, so
    // only parts and nested containers lift on hover (Miro-like affordance).
    const boxShadow = selected ? SHADOW.selected
        : isFrame ? 'none'
        : hovered ? '0 8px 20px rgba(15,23,42,0.12)'
        : isContainer ? '0 1px 2px rgba(15,23,42,0.05)' : '0 2px 8px rgba(15,23,42,0.08)';

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                // Frame: thin border, no fill — it is the diagram boundary.
                // Container part: faint layer tint. Leaf part: white card.
                background: '#FFFFFF',
                border: isFrame
                    ? '1.5px solid #94A3B8'
                    : `1px solid ${hovered ? color + '9A' : '#CBD5E1'}`,
                ...(!isFrame ? { borderTop: `3px solid ${color}` } : {}),
                borderRadius: isFrame ? 10 : 8,
                boxShadow,
                transition: 'box-shadow 150ms ease, border-color 150ms ease',
                position: 'relative',
            }}
        >
            {!isFrame && (
                <NodeResizer
                    nodeId={id}
                    isVisible={selected}
                    minWidth={180}
                    minHeight={100}
                    color="#2563EB"
                    lineStyle={{ borderWidth: 1 }}
                    handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
                />
            )}
            {/* Fallback handles: part-to-part / part-to-box connectors anchor
                to the right (source) and left (target) faces for clean runs. */}
            <Handle type="target" position={Position.Top} id="top" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={defaultHandleStyle} />
            <Handle type="target" position={Position.Left} id="left" style={defaultHandleStyle} />
            <Handle type="source" position={Position.Right} id="right" style={defaultHandleStyle} />

            {isFrame ? (
                /* Modern IBD frame bar: clear context identity without the
                   dated clipped-corner tab or text-driven frame width. */
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 38,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0 10px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    borderRadius: '9px 9px 0 0',
                }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, background: color, color: '#FFFFFF', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>IBD</span>
                    <TypedLabel name={label} kind={kind} nameColor="#0F172A" typeColor="#64748B" frame />
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            ) : (
                /* Part property header: `partName : Type` */
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    minHeight: 58,
                    padding: '7px 10px 6px',
                    background: '#FFFFFF',
                    borderBottom: hasChildren ? '1px solid #E2E8F0' : 'none',
                    borderRadius: '7px 7px 0 0',
                    overflow: 'hidden',
                }}>
                    <TypedLabel
                        name={label} kind={kind}
                        nameColor="#0F172A"
                        typeColor={isContainer ? color : '#64748B'}
                    />
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            )}

            {/* Boundary ports */}
            {ports.map(p => (
                <BoundaryPort
                    key={p.id}
                    port={p}
                    onMove={onPortMove ? y => {
                        const size = p.size ?? INTERCONNECTION_PORT_SIZE;
                        const min = (isFrame || isContainer ? 70 : 62) - size / 2;
                        const max = Math.max(min, (height ?? min + size + 18) - size - 18);
                        onPortMove(p.id, Math.min(Math.max(y, min), max));
                    } : undefined}
                />
            ))}
            {implicitIn && <ImplicitPort side="left" direction="in" />}
            {implicitOut && <ImplicitPort side="right" direction="out" />}
        </div>
    );
}

export const InterconnectionNode = memo(InterconnectionNodeInner);

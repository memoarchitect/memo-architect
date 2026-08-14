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

import { memo, useRef, useState } from 'react';
import { NodeResizer, Position, useReactFlow, useStore, useStoreApi, type NodeProps, type ResizeParamsWithDirection } from '@xyflow/react';
import { FONT, SHADOW } from '../styles/tokens';
import { isPersonKind, PersonGlyph } from './PersonGlyph';
import { setConnectorHover, useConnectorHoverActive, useEndpointHighlighted } from './connector-hover';
import { BaseHandle } from '../components/base-handle';
import { useModelStore } from '../store/model-store';
import type { PortInfo, PortSide } from './templates/interconnection-view';
import {
    INTERCONNECTION_PORT_SIZE, INNER_HANDLE_SUFFIX, PORT_DIR_COLORS,
    PORT_LABEL_MAX, PORT_LABEL_OFFSET, NESTED_PITCH, PORT_LABEL_STACKED_WIDTH,
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
    /** Open this part's own internals as the diagram frame (nested browsing). */
    onDrillIn?: () => void;
    /** Ports straddling this part's boundary */
    ports: PortInfo[];
    showPortText?: boolean;
    /** Visible proxy ports for relationships that target the part directly. */
    implicitIn?: boolean;
    implicitOut?: boolean;
    onPortMove?: (portId: string, y: number, side?: PortSide) => void;
    onPortResize?: (portId: string, size: number, axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => void;
    onPortSelect?: (portId: string) => void;
    /** Content-derived lower bound emitted by the IBD template. */
    minWidth?: number;
    minHeight?: number;
    /** Per-diagram fill override from the layout companion. */
    bgColor?: string;
    /** Per-diagram fill opacity 0..1 from the layout companion. */
    fillOpacity?: number;
    /** Per-diagram notation overrides; omitted values retain the automatic look. */
    borderColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
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

/**
 * The outer face of a port is where connectors are drawn from, so that handle
 * has to take pointer events — but the port also drags vertically to reposition
 * it. The two are separated by area rather than by modifier: this handle covers
 * the port square exactly and sits above it, while the larger invisible hit
 * target underneath keeps the surrounding ring for the move gesture. Draw from
 * the square, slide the port by its ring.
 */
const connectableHandleStyle = (size: number): React.CSSProperties => ({
    ...handlePinStyle(size),
    pointerEvents: 'auto',
    cursor: 'pointer',
    zIndex: 12,
});

/** Padding between a nested-port group's outline and the squares inside it. */
const GROUP_PAD = 7;

/**
 * The enclosing outline behind a parent port and the ports nested in it.
 *
 * A boundary feature that carries several ports — a panel cluster, a display
 * module, a service panel — is one thing on the case, not a run of unrelated
 * squares. Drawing the group is what makes that readable at a glance; without
 * it a reader has to infer the grouping from vertical spacing alone.
 */
function NestedPortGroup({ port }: { port: PortInfo }) {
    const size = port.size ?? INTERCONNECTION_PORT_SIZE;
    // The cluster runs along the wall its parent straddles, so the outline grows
    // down a left/right wall and across a top/bottom one.
    const vertical = port.side === 'left' || port.side === 'right';
    const start = vertical ? port.y : port.x;
    const end = start + size / 2 + NESTED_PITCH * (port.nestedCount ?? 0) + size / 2;
    const along = end - start + GROUP_PAD * 2;
    const across = size + GROUP_PAD * 2;
    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                left: port.x - GROUP_PAD,
                top: port.y - GROUP_PAD,
                width: vertical ? across : along,
                height: vertical ? along : across,
                background: 'rgba(148,163,184,0.30)',
                border: '1px solid rgba(100,116,139,0.45)',
                borderRadius: 9,
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}

function BoundaryPort({ port, onMove, onResize, onSelect, showText = true }: { port: PortInfo; onMove?: (y: number, side?: PortSide) => void; onResize?: (size: number, axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => void; onSelect?: (portId: string) => void; showText?: boolean }) {
    const { getZoom } = useReactFlow();
    const zoom = useStore(state => state.transform[2]);
    const highlighted = useEndpointHighlighted(port.id);
    const selected = useModelStore(state => state.selectedElementId === port.id);
    const suppressSelectRef = useRef(false);
    const dimmed = useConnectorHoverActive() && !highlighted;
    const size = port.size ?? INTERCONNECTION_PORT_SIZE;
    const labelOffset = size + PORT_LABEL_OFFSET;
    const color = portColor(port.direction);
    const beginMove = onMove ? (event: React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const startClientY = event.clientY;
        const startY = port.y;
        let last: PointerEvent | undefined;
        const move = (next: PointerEvent) => {
            last = next;
            const distance = Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY);
            if (distance <= 2) return;
            suppressSelectRef.current = true;
            onMove(startY + (next.clientY - startClientY) / getZoom());
        };
        const stop = () => {
            if (last) {
                const dx = last.clientX - event.clientX;
                const dy = last.clientY - event.clientY;
                if (Math.hypot(dx, dy) > 18) {
                    const side: PortSide = Math.abs(dx) > Math.abs(dy)
                        ? (dx < 0 ? 'left' : 'right')
                        : (dy < 0 ? 'top' : 'bottom');
                    onMove(startY + dy / getZoom(), side);
                }
            }
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            // The browser dispatches click after pointerup. Keep the guard for
            // that click, then restore ordinary click-to-inspect behaviour.
            window.setTimeout(() => { suppressSelectRef.current = false; }, 0);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop, { once: true });
    } : undefined;
    const selectPort = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (suppressSelectRef.current) return;
        onSelect?.(port.id);
    };
    const trackConnectionGesture = (event: React.PointerEvent) => {
        const startX = event.clientX;
        const startY = event.clientY;
        suppressSelectRef.current = false;
        const move = (next: PointerEvent) => {
            if (Math.hypot(next.clientX - startX, next.clientY - startY) > 2) {
                suppressSelectRef.current = true;
            }
        };
        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.setTimeout(() => { suppressSelectRef.current = false; }, 0);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop, { once: true });
    };
    const beginResize = (axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') =>
        (event: React.PointerEvent) => {
            if (!onResize) return;
            event.preventDefault();
            event.stopPropagation();
            const startX = event.clientX;
            const startY = event.clientY;
            const startSize = size;
            suppressSelectRef.current = true;
            const move = (next: PointerEvent) => {
                const dx = (next.clientX - startX) / getZoom();
                const dy = (next.clientY - startY) / getZoom();
                const horizontal = axis.includes('e') ? dx : axis.includes('w') ? -dx : undefined;
                const vertical = axis.includes('s') ? dy : axis.includes('n') ? -dy : undefined;
                const delta = horizontal !== undefined && vertical !== undefined
                    ? (horizontal + vertical) / 2
                    : horizontal ?? vertical ?? 0;
                onResize(Math.min(48, Math.max(10, startSize + delta)), axis);
            };
            const stop = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', stop);
                window.setTimeout(() => { suppressSelectRef.current = false; }, 0);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', stop, { once: true });
        };
    // Label sits inside the owner, just ABOVE the port's centreline — the
    // connector enters the port horizontally at centre-y, so a vertically
    // centred label would be struck through by its own edge. A translucent
    // white pill keeps the text legible over the grid or a passing edge.
    const horizontal = port.side === 'left' || port.side === 'right';
    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: port.nested ? '9.5px' : '10.5px',
        fontWeight: highlighted || selected ? 750 : port.nested ? 600 : 650,
        color: highlighted || selected ? '#0F172A' : port.nested ? '#6B7280' : '#374151',
        opacity: dimmed ? 0.45 : 1,
        transition: 'color 120ms ease, opacity 120ms ease',
        whiteSpace: 'normal',
        // The caption is an explicit vertical drag grip. The square remains a
        // clean React Flow connection handle, removing the prior hidden-ring
        // ambiguity that made ports appear immovable.
        pointerEvents: onMove ? 'auto' : 'none',
        cursor: onSelect ? 'pointer' : 'default',
        touchAction: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: horizontal ? (port.labelWidth ?? PORT_LABEL_MAX) : PORT_LABEL_STACKED_WIDTH,
        background: 'rgba(255,255,255,0.94)',
        padding: '1px 3px',
        borderRadius: 4,
        lineHeight: 1.12,
        // A horizontal wall's caption is centred on the square and sits clear of
        // it: above a bottom-wall port (inside the box, as the reference drawing
        // labels its wall connectors) and above a top-wall port too — which puts
        // it OUTSIDE the box, and is what keeps a top-wall port from printing
        // its name over its owner's title bar.
        ...(port.side === 'left' ? { left: labelOffset, bottom: '50%', marginBottom: 2 }
            : port.side === 'right' ? { right: labelOffset, bottom: '50%', marginBottom: 2, textAlign: 'right' as const }
            : { bottom: labelOffset, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' as const }),
    };
    // The caption's total height is a layout constant (PORT_CAPTION_HEIGHT
    // drives BOTTOM_GUTTER, PORT_CAPTION_CLEARANCE and the vertical port
    // pitch), so a connector line has to be paid for out of the name's second
    // line rather than added on top of it. Two lines in, two lines out: no
    // diagram grows, and nothing overprints. The full name stays reachable in
    // the tooltip.
    const nameStyle: React.CSSProperties = {
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: port.connectorType ? 1 : 2,
    };
    const connectorStyle: React.CSSProperties = {
        fontSize: port.nested ? '8.5px' : '9px',
        fontWeight: 500,
        color: highlighted ? '#475569' : '#94A3B8',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    return (
        <div
            className="nodrag nopan"
            style={{
                position: 'absolute',
                left: port.x,
                top: port.y,
                width: size,
                height: size,
                zIndex: port.nested ? 11 : 10,
            }}
        >
            {/* Invisible hit target only. Ports are interaction controls as
                well as model glyphs: keep the on-screen acquisition size stable
                when fitView zooms a large IBD down. The visual square and its
                label stay at model scale \u2014 scaling them too made labels grow
                relative to their node at low zoom and collide. */}
            <div
                onPointerEnter={() => setConnectorHover({ endpointIds: [port.id] })}
                onPointerLeave={() => setConnectorHover(null)}
                onPointerDown={beginMove}
                onClick={selectPort}
                title={`${port.name}${port.direction ? ` (${port.direction})` : ''}${port.connectorType ? `\n${port.connectorType}` : ''}`}
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: PORT_HIT_SIZE,
                    height: PORT_HIT_SIZE,
                    transform: `translate(-50%, -50%) scale(${1 / Math.max(zoom, 0.1)})`,
                    // A port can be dragged along its permitted wall, but it
                    // is otherwise ordinary diagram content.  React Flow's
                    // default grab hand incorrectly suggested that merely
                    // hovering the port would pan the whole board.
                    cursor: onSelect ? 'pointer' : 'default',
                    touchAction: 'none',
                }}
            />
            <div style={{
                position: 'absolute', inset: 0, boxSizing: 'border-box',
                background: '#FFFFFF', border: `2px solid ${color}`, borderRadius: 5,
                // A hovered port wears a halo in its own direction colour, so
                // the lit connectors read as belonging to this square.
                boxShadow: selected
                    ? `0 0 0 3px #2563EB, 0 2px 8px rgba(15,23,42,0.24)`
                    : highlighted
                    ? `0 0 0 4px ${color}33, 0 2px 8px rgba(15,23,42,0.24)`
                    : '0 1px 3px rgba(15,23,42,0.18)',
                opacity: dimmed ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center', justifyContent: 'center', color,
                fontSize: port.nested ? '10px' : '12px', fontWeight: 800, lineHeight: 1,
                pointerEvents: 'none',
                transition: 'box-shadow 120ms ease, opacity 120ms ease',
            }}>
                {portGlyph(port.direction, port.side)}
                {showText && (
                    <span onPointerDown={beginMove} onClick={selectPort} style={labelStyle}>
                        <span style={nameStyle}>{port.name.replace(/([a-z0-9])([A-Z])/g, '$1\u200B$2')}</span>
                        {port.connectorType && <span style={connectorStyle}>{port.connectorType}</span>}
                    </span>
                )}
                {/* The outer face is connectable so a connector can be drawn
                    port-to-port; the inner face stays an anchor for routing a
                    pass-through connector to its owner's internals. */}
                {([
                    { suffix: '', pos: SIDE_TO_POSITION[port.side], connectable: true },
                    { suffix: INNER_HANDLE_SUFFIX, pos: SIDE_TO_POSITION[OPPOSITE_SIDE[port.side]], connectable: false },
                ] as const).flatMap(h => {
                    // The anchor class carries a `pointer-events: none` rule, so
                    // the connectable face must not wear it.
                    const cls = h.connectable ? 'ibd-port-connect' : 'ibd-port-anchor';
                    const style = h.connectable ? connectableHandleStyle(size) : handlePinStyle(size);
                    return [
                        <BaseHandle key={`s${h.suffix}`} className={cls} type="source" id={`${port.id}${h.suffix}`} position={h.pos}
                            style={style} isConnectable={h.connectable}
                            onPointerDownCapture={h.connectable ? trackConnectionGesture : undefined}
                            onClick={h.connectable ? selectPort : undefined} />,
                        <BaseHandle key={`t${h.suffix}`} className={cls} type="target" id={`${port.id}${h.suffix}`} position={h.pos}
                            style={style} isConnectable={h.connectable}
                            onPointerDownCapture={h.connectable ? trackConnectionGesture : undefined}
                            onClick={h.connectable ? selectPort : undefined} />,
                    ];
                })}
            </div>
            {onResize && ([
                ['n', { top: -5, left: 5, right: 5, height: 10, cursor: 'ns-resize' }],
                ['e', { top: 5, right: -5, bottom: 5, width: 10, cursor: 'ew-resize' }],
                ['s', { bottom: -5, left: 5, right: 5, height: 10, cursor: 'ns-resize' }],
                ['w', { top: 5, left: -5, bottom: 5, width: 10, cursor: 'ew-resize' }],
                ['nw', { top: -5, left: -5, width: 10, height: 10, cursor: 'nwse-resize' }],
                ['ne', { top: -5, right: -5, width: 10, height: 10, cursor: 'nesw-resize' }],
                ['se', { bottom: -5, right: -5, width: 10, height: 10, cursor: 'nwse-resize' }],
                ['sw', { bottom: -5, left: -5, width: 10, height: 10, cursor: 'nesw-resize' }],
            ] as const).map(([axis, position]) => (
                <div
                    key={axis}
                    className={`ibd-port-resize-handle ibd-port-resize-handle--${axis}`}
                    onPointerDown={beginResize(axis)}
                    style={{ position: 'absolute', zIndex: 20, touchAction: 'none', ...position }}
                />
            ))}
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

/** Compact, non-wrapping SysML part-property identity. */
function TypedLabel({ name, kind, nameColor, typeColor, frame = false, style }: {
    name: string; kind: string; nameColor: string; typeColor: string; frame?: boolean;
    style?: Pick<InterconnectionNodeData, 'textColor' | 'fontSize' | 'fontWeight' | 'textAlign'>;
}) {
    const textAlign = style?.textAlign ?? 'left';
    return (
        <span title={`${name} : ${kind}`} style={{ display: 'flex', flexDirection: frame ? 'row' : 'column', alignItems: textAlign === 'right' ? 'flex-end' : textAlign === 'center' ? 'center' : frame ? 'baseline' : 'flex-start', gap: frame ? 6 : 1, minWidth: 0, overflow: 'hidden', flex: 1, textAlign }}>
            <span style={{
                display: frame ? 'block' : '-webkit-box', width: '100%', minWidth: 0,
                fontSize: style?.fontSize ?? (frame ? FONT.md : FONT.sm), lineHeight: 1.2, fontWeight: style?.fontWeight ?? 700,
                color: style?.textColor ?? nameColor, whiteSpace: frame ? 'nowrap' : 'normal', overflow: 'hidden',
                textOverflow: 'ellipsis', WebkitBoxOrient: 'vertical', WebkitLineClamp: frame ? undefined : 2,
                overflowWrap: 'anywhere',
            }}>
                {name}
            </span>
            <span style={{ display: 'block', maxWidth: '100%', fontSize: '9px', lineHeight: 1.15, fontWeight: 650, letterSpacing: '0.055em', textTransform: 'uppercase', color: style?.textColor ?? typeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {frame ? `: ${kind}` : `«${kind}»`}
            </span>
        </span>
    );
}

/**
 * Descend into a part's own internals, making it the diagram frame.
 *
 * Collapsing folds a part away to read around it; drilling in re-roots the
 * diagram on it to read inside it. They are different questions, so the part
 * carries both controls — the same pairing the action-flow and state nodes use,
 * and the reason this button exists: the IBD had the drill-down behaviour but
 * offered it only on double-click, where nobody finds it.
 */
function DrillInButton({ label, onDrillIn, color, onColor }: {
    label: string; onDrillIn: () => void; color: string; onColor?: boolean;
}) {
    return (
        <button
            aria-label={`Drill into ${label}`}
            title={`Open ${label} as its own internal block diagram`}
            className="nodrag"
            onClick={event => { event.stopPropagation(); onDrillIn(); }}
            onDoubleClick={event => event.stopPropagation()}
            style={{
                width: 18, height: 18, padding: 0, borderRadius: 3, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: onColor ? '1px solid rgba(255,255,255,0.7)' : `1px solid ${color}88`,
                background: onColor ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
                color: onColor ? '#FFFFFF' : color,
                fontSize: 11, lineHeight: 1, cursor: 'pointer', fontWeight: 700,
            }}
        >
            ↳
        </button>
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
    const store = useStoreApi();
    const d = data as unknown as InterconnectionNodeData;
    const {
        label, kind, color, isContainer, isFrame, ports, implicitIn, implicitOut,
        onPortMove, onPortResize, onPortSelect, showPortText, hasChildren, isCollapsed, onToggleCollapse, onDrillIn, minWidth, minHeight,
        bgColor, fillOpacity, borderColor, textColor, fontSize, fontWeight, textAlign, verticalAlign,
    } = d;
    const [hovered, setHovered] = useState(false);

    // The context frame is large — a hover/rest shadow on it reads as noise, so
    // only parts and nested containers lift on hover (Miro-like affordance).
    const boxShadow = selected ? SHADOW.selected
        : isFrame ? 'none'
        : hovered ? '0 8px 20px rgba(15,23,42,0.12)'
        : isContainer ? '0 1px 2px rgba(15,23,42,0.05)' : '0 2px 8px rgba(15,23,42,0.08)';
    const canResizeWithoutOverlap = (_event: unknown, next: ResizeParamsWithDirection): boolean => {
        const current = store.getState().nodeLookup.get(id);
        if (!current) return true;
        const gap = 4;
        return [...store.getState().nodeLookup.values()].every(other => {
            if (other.id === id || other.parentId !== current.parentId || other.hidden) return true;
            const width = other.measured.width ?? other.width ?? 0;
            const otherHeight = other.measured.height ?? other.height ?? 0;
            if (width <= 0 || otherHeight <= 0) return true;
            const position = other.internals.positionAbsolute;
            return next.x + next.width + gap <= position.x
                || position.x + width + gap <= next.x
                || next.y + next.height + gap <= position.y
                || position.y + otherHeight + gap <= next.y;
        });
    };

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
                // A per-diagram fill override wins over all three: dimming or
                // tinting a group of parts is how a reviewer marks up a board,
                // and it must not be overridden by the notation defaults.
                background: bgColor || '#FFFFFF',
                opacity: fillOpacity ?? 1,
                border: isFrame
                    ? `1.5px solid ${borderColor ?? '#94A3B8'}`
                    : `1px solid ${borderColor ?? (hovered ? color + '9A' : '#CBD5E1')}`,
                ...(!isFrame ? { borderTop: `3px solid ${borderColor ?? color}` } : {}),
                borderRadius: isFrame ? 10 : 8,
                boxShadow,
                transition: 'box-shadow 150ms ease, border-color 150ms ease',
                position: 'relative',
            }}
        >
            {/* The IBD frame is also an authored block boundary. Let users grow
                it around added parts just like any contained part; minWidth /
                minHeight retain the layout-derived footprint so it cannot crop
                its title bar, ports, or children. */}
            <NodeResizer
                nodeId={id}
                isVisible={selected || hovered}
                // A user can make a part as large as needed, but never
                // smaller than its title, port gutters, and (for a
                // container) its laid-out children.  This is the same
                // containment invariant used by desktop diagram tools.
                minWidth={minWidth ?? 180}
                minHeight={minHeight ?? 100}
                color="#2563EB"
                lineStyle={{ borderWidth: 1 }}
                handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
                shouldResize={canResizeWithoutOverlap}
            />
            {isFrame ? (
                /* Modern IBD frame bar: clear context identity without the
                   dated clipped-corner tab or text-driven frame width. */
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 38,
                    display: 'flex', alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center', gap: 8,
                    padding: '0 10px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    borderRadius: '9px 9px 0 0',
                }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, background: color, color: '#FFFFFF', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>IBD</span>
                    <TypedLabel name={label} kind={kind} nameColor="#0F172A" typeColor="#64748B" frame style={{ textColor, fontSize, fontWeight, textAlign }} />
                    {/* The frame is already the diagram's root, so it offers no
                        drill-in — descending into it would change nothing. */}
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            ) : (
                /* Part property header: `partName : Type` */
                <div style={{
                    display: 'flex', alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center', gap: 6,
                    minHeight: 58,
                    padding: '7px 10px 6px',
                    background: '#FFFFFF',
                    borderBottom: hasChildren ? '1px solid #E2E8F0' : 'none',
                    borderRadius: '7px 7px 0 0',
                    overflow: 'hidden',
                }}>
                    {isPersonKind(kind) && <PersonGlyph size={24} color={color} />}
                    <TypedLabel
                        name={label} kind={kind}
                        nameColor="#0F172A"
                        typeColor={isContainer ? color : '#64748B'}
                        style={{ textColor, fontSize, fontWeight, textAlign }}
                    />
                    {/* Both controls sit on a part that owns parts, folded or
                        not: a collapsed part is still worth descending into. */}
                    {hasChildren && onDrillIn && (
                        <DrillInButton label={label} onDrillIn={onDrillIn} color={color} />
                    )}
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            )}

            {/* Nested-port groups sit behind the squares they enclose. */}
            {ports.filter(p => p.nestedCount).map(p => (
                <NestedPortGroup key={`${p.id}__group`} port={p} />
            ))}

            {/* Boundary ports */}
            {ports.map(p => (
                <BoundaryPort
                    key={p.id}
                    port={p}
                    onMove={onPortMove ? (y, side) => {
                        const size = p.size ?? INTERCONNECTION_PORT_SIZE;
                        const min = (isFrame || isContainer ? 70 : 62) - size / 2;
                        const max = Math.max(min, (height ?? min + size + 18) - size - 18);
                        onPortMove(p.id, Math.min(Math.max(y, min), max), side);
                    } : undefined}
                    onResize={onPortResize ? (size, axis) => onPortResize(p.id, size, axis) : undefined}
                    onSelect={onPortSelect}
                    showText={showPortText}
                />
            ))}
            {implicitIn && <ImplicitPort side="left" direction="in" />}
            {implicitOut && <ImplicitPort side="right" direction="out" />}
        </div>
    );
}

export const InterconnectionNode = memo(InterconnectionNodeInner);

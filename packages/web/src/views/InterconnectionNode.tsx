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

import { memo, useEffect, useRef, useState } from 'react';
import { NodeResizeControl, ResizeControlVariant, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { resizeIbdNodes, type IbdResizeHandler } from '../diagram/ibd-resize-integration';
import type { ResizeDirection, ResizeMinimums } from '../diagram/ibd-resize';
import { FONT, SHADOW } from '../styles/tokens';
import { isPersonKind, PersonGlyph } from './PersonGlyph';
import { setConnectorHover, useConnectorHoverActive, useEndpointHighlighted } from './connector-hover';
import { BaseHandle } from '../components/base-handle';
import { useModelStore } from '../store/model-store';
import type { PortInfo, PortSide } from './templates/interconnection-view';
import {
    INTERCONNECTION_PORT_SIZE, INNER_HANDLE_SUFFIX, PORT_DIR_COLORS,
    PORT_LABEL_MAX, PORT_LABEL_OFFSET, PORT_LABEL_STACKED_WIDTH,
    NESTED_PITCH, NESTED_PIN_INSET, NESTED_HOUSING_DEPTH,
} from './templates/interconnection-view';
import { useInterconnectionRenderer } from '../diagram/renderers/interconnection-renderer';

export interface InterconnectionNodeData extends Record<string, unknown> {
    onIbdResize?: IbdResizeHandler;
    resizeReadOnly?: boolean;
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
    /** Navigate to a separate view whose subject is this element. */
    onNavigateToView?: () => void;
    /** Ports straddling this part's boundary */
    ports: PortInfo[];
    showPortText?: boolean;
    /** Visible proxy ports for relationships that target the part directly. */
    implicitIn?: boolean;
    implicitOut?: boolean;
    onPortMove?: (portId: string, y: number, side?: PortSide) => void;
    /** Persist the port once its drag ends. */
    onPortCommit?: (portId: string) => void;
    onPortResize?: (portId: string, size: number, axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => void;
    onPortSelect?: (portId: string, inspect?: boolean) => void;
    /** Legacy template hints; resize now measures rendered content instead. */
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

const PORT_HIT_SIZE = 24;

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


/**
 * Drag a port along the wall it straddles. With `multiWall` the port follows the
 * cursor to whichever of the four walls is nearest and slides along that one, so
 * a port stays tied to its owner's edge and can be walked around the perimeter.
 * Shared by a plain boundary port and by a connector's body, which drags the
 * whole nested group (its child ports are derived from it, so they come along).
 */
function beginWallDrag(
    event: React.PointerEvent,
    options: {
        alongStart: number;
        size: number;
        multiWall: boolean;
        getZoom: () => number;
        onMove: (along: number, side?: PortSide) => void;
        onDragging?: (dragging: boolean) => void;
        onCommit?: () => void;
    },
): void {
    const { alongStart, size, multiWall, getZoom, onMove, onDragging, onCommit } = options;
    event.preventDefault();
    event.stopPropagation();
    const nodeEl = (event.currentTarget as HTMLElement).closest('.react-flow__node') as HTMLElement | null;
    const rect = multiWall && nodeEl ? nodeEl.getBoundingClientRect() : null;
    const startClientY = event.clientY;
    let last: PointerEvent | undefined;
    const move = (next: PointerEvent) => {
        last = next;
        if (Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY) <= 2) return;
        onDragging?.(true);
        if (rect) {
            const zoom = getZoom() || 1;
            const nw = rect.width / zoom, nh = rect.height / zoom;
            const mx = (next.clientX - rect.left) / zoom, my = (next.clientY - rect.top) / zoom;
            const dL = Math.abs(mx), dR = Math.abs(mx - nw), dT = Math.abs(my), dB = Math.abs(my - nh);
            let side: PortSide = 'left', minD = dL;
            if (dR < minD) { minD = dR; side = 'right'; }
            if (dT < minD) { minD = dT; side = 'top'; }
            if (dB < minD) { minD = dB; side = 'bottom'; }
            const along = side === 'left' || side === 'right'
                ? Math.min(Math.max(8, my - size / 2), Math.max(8, nh - size - 8))
                : Math.min(Math.max(8, mx - size / 2), Math.max(8, nw - size - 8));
            onMove(along, side);
            return;
        }
        onMove(alongStart + (next.clientY - startClientY) / getZoom());
    };
    const stop = () => {
        if (!rect && last) {
            const dx = last.clientX - event.clientX, dy = last.clientY - event.clientY;
            if (Math.hypot(dx, dy) > 18) {
                const side: PortSide = Math.abs(dx) > Math.abs(dy)
                    ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom');
                onMove(alongStart + dy / getZoom(), side);
            }
        }
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        if (last) onCommit?.();
        // The browser dispatches click after pointerup. Keep the guard for that
        // click, then restore ordinary click-to-inspect behaviour.
        window.setTimeout(() => { onDragging?.(false); }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
}

function BoundaryPort({ port, onMove, onBeginDrag, onCommit, onResize, onSelect, showText = true }: { port: PortInfo; onMove?: (y: number, side?: PortSide) => void; onBeginDrag?: (event: React.PointerEvent, setDragging: (d: boolean) => void) => void; onCommit?: () => void; onResize?: (size: number, axis: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw') => void; onSelect?: (portId: string, inspect?: boolean) => void; showText?: boolean }) {
    const renderer = useInterconnectionRenderer();
    const { getZoom } = useReactFlow();
    const zoom = useStore(state => state.transform[2]);
    const highlighted = useEndpointHighlighted(port.id);
    const selected = useModelStore(state => state.canvasPortSelection === port.id);
    const suppressSelectRef = useRef(false);
    const dimmed = useConnectorHoverActive() && !highlighted;
    const size = renderer.portSize(port);
    const labelOffset = size + PORT_LABEL_OFFSET;
    const color = renderer.portColor(port.direction, port);
    const setDragging = (dragging: boolean) => { suppressSelectRef.current = dragging; };
    // A port slides along the boundary of whatever CONTAINS it. For a plain port
    // that is the part's wall (handled here); a nested pin is contained by its
    // parent port, and its owner supplies that behaviour through onBeginDrag.
    const beginMove = onBeginDrag
        ? (event: React.PointerEvent) => onBeginDrag(event, setDragging)
        : onMove ? (event: React.PointerEvent) => beginWallDrag(event, {
            alongStart: port.y, size, multiWall: renderer.multiWallPortDrag, getZoom, onMove,
            onDragging: setDragging, onCommit,
        }) : undefined;
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
        ...renderer.portLabelPlacement(port, { labelOffset }),
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
            data-ibd-port={port.id}
            style={{
                position: 'absolute',
                left: port.x,
                top: port.y,
                width: size,
                height: size,
                zIndex: port.nested ? 12 : 10,
            }}
        >
            {/* Invisible hit target only. Ports are interaction controls as
                well as model glyphs: keep the on-screen acquisition size stable
                when fitView zooms a large IBD down. The visual square and its
                label stay at model scale \u2014 scaling them too made labels grow
                relative to their node at low zoom and collide. */}
            <div
                data-ibd-port-move
                onPointerEnter={() => setConnectorHover({ endpointIds: [port.id] })}
                onPointerLeave={() => setConnectorHover(null)}
                onPointerDown={beginMove}
                onClick={selectPort} onDoubleClick={event => { event.stopPropagation(); onSelect?.(port.id, true); }}
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
                background: '#FFFFFF', border: `2px solid ${color}`, borderRadius: renderer.portBoxBorderRadius(port),
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
                {renderer.portGlyph(port.direction, port.side, port)}
                {showText && (
                    <span data-ibd-caption onPointerDown={beginMove} onClick={selectPort} onDoubleClick={event => { event.stopPropagation(); onSelect?.(port.id, true); }} style={labelStyle}>
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
                    // A profile may forbid connector-draw gestures (edges come
                    // from the model): its outer face becomes a plain anchor.
                    const canConnect = h.connectable && renderer.portConnectable(port);
                    // The anchor class carries a `pointer-events: none` rule, so
                    // the connectable face must not wear it.
                    const cls = canConnect ? 'ibd-port-connect' : 'ibd-port-anchor';
                    const style = canConnect ? connectableHandleStyle(size) : handlePinStyle(size);
                    return [
                        <BaseHandle key={`s${h.suffix}`} className={cls} type="source" id={`${port.id}${h.suffix}`} position={h.pos}
                            style={style} isConnectable={canConnect}
                            onPointerDownCapture={canConnect ? trackConnectionGesture : undefined}
                            onClick={selectPort} onDoubleClick={canConnect ? event => { event.stopPropagation(); onSelect?.(port.id, true); } : undefined} />,
                        <BaseHandle key={`t${h.suffix}`} className={cls} type="target" id={`${port.id}${h.suffix}`} position={h.pos}
                            style={style} isConnectable={canConnect}
                            onPointerDownCapture={canConnect ? trackConnectionGesture : undefined}
                            onClick={selectPort} onDoubleClick={canConnect ? event => { event.stopPropagation(); onSelect?.(port.id, true); } : undefined} />,
                    ];
                })}
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
            className="nodrag nopan"
            onMouseDown={event => event.stopPropagation()}
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

function ViewNavigateButton({ label, onNavigate, color, onColor }: {
    label: string; onNavigate: () => void; color: string; onColor?: boolean;
}) {
    return (
        <button
            aria-label={`Go to ${label} view`}
            title={`Navigate to ${label}'s own view`}
            className="nodrag nopan"
            onClick={event => { event.stopPropagation(); onNavigate(); }}
            onMouseDown={event => event.stopPropagation()}
            onDoubleClick={event => event.stopPropagation()}
            style={{
                width: 18, height: 18, padding: 0, borderRadius: 3, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: onColor ? '1px solid rgba(255,255,255,0.7)' : `1px solid ${color}88`,
                background: onColor ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
                color: onColor ? '#FFFFFF' : '#2563EB',
                fontSize: 11, lineHeight: 1, cursor: 'pointer', fontWeight: 700,
                position: 'relative', zIndex: 10,
            }}
        >
            ↗
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
    const renderer = useInterconnectionRenderer();
    const { getZoom, getNodes, setNodes } = useReactFlow();
    const controlZoom = useStore(state => state.transform[2]);
    const rootRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const cleanupResizeRef = useRef<(() => void) | null>(null);
    const pointerResizeRef = useRef<{ move: (e: MouseEvent) => void; stop: () => void } | null>(null);
    // Register before D3 installs its window capture listeners on pointer-down;
    // those listeners stopImmediatePropagation. Keep acquisition unchanged.
    useEffect(() => {
        const move = (e: MouseEvent) => pointerResizeRef.current?.move(e);
        const stop = () => pointerResizeRef.current?.stop();
        window.addEventListener('mousemove', move, true);
        window.addEventListener('mouseup', stop, true);
        return () => {
            cleanupResizeRef.current?.();
            window.removeEventListener('mousemove', move, true);
            window.removeEventListener('mouseup', stop, true);
        };
    }, []);
    const d = data as unknown as InterconnectionNodeData;
    const {
        label, kind, color, isContainer, isFrame, ports, implicitIn, implicitOut,
        onPortMove, onPortCommit, onPortResize, onPortSelect, showPortText, hasChildren, isCollapsed, onToggleCollapse, onDrillIn, onNavigateToView,
        bgColor, fillOpacity, borderColor, textColor, fontSize, fontWeight, textAlign, verticalAlign,
    } = d;
    const [hovered, setHovered] = useState(false);

    // The context frame is large — a hover/rest shadow on it reads as noise, so
    // only parts and nested containers lift on hover (Miro-like affordance).
    const boxShadow = selected ? SHADOW.selected
        : isFrame ? 'none'
        : hovered ? '0 8px 20px rgba(15,23,42,0.12)'
        : isContainer ? '0 1px 2px rgba(15,23,42,0.05)' : '0 2px 8px rgba(15,23,42,0.08)';
    // Profile-supplied container fill/border/top-accent.
    const containerStyle = renderer.nodeContainerStyle({
        isFrame: !!isFrame, isContainer, hasChildren: !!hasChildren, hovered,
        color, bgColor, borderColor,
    });
    // Keep React Flow's acquisition surface. Its proposed geometry is not used:
    // its internal clamps lose original-pointer reversal and duplicate rebasing.
    const beginIbdResize = (event: { sourceEvent: MouseEvent }) => {
        if (d.resizeReadOnly) return;
        cleanupResizeRef.current?.();
        const source = event.sourceEvent;
        const control = (source.target as Element).closest('.react-flow__resize-control');
        if (!control || !headerRef.current) return;
        const classes = control.classList;
        const direction = `${classes.contains('top') ? 'n' : classes.contains('bottom') ? 's' : ''}${classes.contains('left') ? 'w' : classes.contains('right') ? 'e' : ''}` as ResizeDirection;
        const start = getNodes();
        const zoom = getZoom() || 1;
        const header = headerRef.current;
        const text = [...header.querySelectorAll('span')].filter(e => !e.querySelector('span'));
        const canvas = document.createElement('canvas').getContext('2d')!;
        const widths = text.map(e => {
            const css = getComputedStyle(e);
            canvas.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
            // Name can wrap at words; the type identity is intentionally nowrap.
            const value = css.textTransform === 'uppercase' ? (e.textContent ?? '').toUpperCase() : (e.textContent ?? '');
            const words = css.whiteSpace === 'nowrap' ? [value] : value.split(/\s+/);
            const spacing = parseFloat(css.letterSpacing) || 0;
            return Math.max(0, ...words.map(word => canvas.measureText(word).width + Math.max(0, word.length - 1) * spacing));
        });
        const controls = [...header.querySelectorAll('button')].reduce((sum, e) => sum + e.offsetWidth + 6, 0);
        const measuredPorts = ports.map(p => {
            const glyph = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-ibd-port]') ?? [])].find(e => e.dataset.ibdPort === p.id);
            const caption = glyph?.querySelector<HTMLElement>('[data-ibd-caption]');
            const size = glyph?.offsetWidth ?? renderer.portSize(p);
            return { p, size, captionWidth: caption?.offsetWidth ?? 0, captionHeight: caption?.offsetHeight ?? 0 };
        });
        const minima: ResizeMinimums = {
            title: { width: (isFrame ? widths.reduce((sum, width) => sum + width + 6, 0) : Math.max(0, ...widths)) + controls + 24, height: header.offsetHeight },
            content: {
                width: Math.max(0, ...measuredPorts.filter(({p}) => p.side === 'left' || p.side === 'right').map(m => m.captionWidth + m.size)),
                height: Math.max(header.offsetHeight, ...measuredPorts.filter(({p}) => p.side === 'top' || p.side === 'bottom').map(m => m.captionHeight + m.size)),
            },
            // Normal-axis wall position moves with the owner. Only the measured
            // envelope along the wall constrains shrinking (not the old ELK wall).
            ports: measuredPorts.map(({p, size}) => {
                const length = p.nestedCount ? (p.nestedCount - 1) * NESTED_PITCH + size + NESTED_PIN_INSET * 2 : size;
                return p.side === 'top' || p.side === 'bottom'
                    ? { x: p.x, y: 0, width: length + 8, height: size }
                    : { x: 0, y: p.y, width: size, height: length + 8 };
            }),
        };
        let latest = start;
        const publish = (phase: 'start' | 'update' | 'commit' | 'cancel', next = latest) => {
            if (d.onIbdResize) d.onIbdResize(phase, next);
            else if (phase !== 'start') setNodes(next);
        };
        const move = (next: MouseEvent) => {
            const result = resizeIbdNodes(start, id, direction,
                { x: (next.clientX - source.clientX) / zoom, y: (next.clientY - source.clientY) / zoom }, minima);
            if (result) { latest = result; publish('update'); }
        };
        const cleanup = () => {
            pointerResizeRef.current = null;
            window.removeEventListener('keydown', key);
            window.removeEventListener('blur', cancel);
            cleanupResizeRef.current = null;
        };
        const stop = () => { cleanup(); publish('commit'); };
        const cancel = () => { cleanup(); publish('cancel', start); };
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } };
        cleanupResizeRef.current = cancel;
        publish('start', start);
        pointerResizeRef.current = { move, stop };
        window.addEventListener('keydown', key);
        window.addEventListener('blur', cancel, { once: true });
    };

    return (
        <div
            ref={rootRef}
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
                background: containerStyle.background,
                opacity: fillOpacity ?? 1,
                border: containerStyle.border,
                ...(containerStyle.borderTop ? { borderTop: containerStyle.borderTop } : {}),
                borderRadius: isFrame ? 10 : 8,
                boxShadow,
                transition: 'box-shadow 150ms ease, border-color 150ms ease',
                position: 'relative',
            }}
        >
            {selected && !d.resizeReadOnly && (['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const).map(position => {
                const corner = position.includes('-');
                // Place discrete owner grips outside the port squares/ring, so
                // even a corner port remains independently connectable.
                const offset = Math.max(16 / controlZoom, ...ports.map(port => renderer.portSize(port) / 2 + 8 / controlZoom));
                const left = position.includes('left') ? -offset : position.includes('right') ? `calc(100% + ${offset}px)` : '50%';
                const top = position.includes('top') ? -offset : position.includes('bottom') ? `calc(100% + ${offset}px)` : '50%';
                return <NodeResizeControl key={position} nodeId={id} position={position}
                    variant={corner ? ResizeControlVariant.Handle : ResizeControlVariant.Line}
                    minWidth={0} minHeight={0} color="#2563EB"
                    style={{ left, top, width: corner ? 10 : 10 / controlZoom, height: corner ? 10 : 10 / controlZoom,
                        transform: corner ? undefined : 'translate(-50%, -50%)', background: '#2563EB', borderWidth: 0,
                        borderRadius: 2, zIndex: 21 }}
                    shouldResize={() => false} onResizeStart={beginIbdResize} />;
            })}
            {isFrame ? (
                /* Modern IBD frame bar: clear context identity without the
                   dated clipped-corner tab or text-driven frame width. */
                <div ref={headerRef} style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 38,
                    display: 'flex', alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center', gap: 8,
                    padding: '0 10px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    borderRadius: '9px 9px 0 0',
                }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, background: renderer.frameBadgeBackground(color), color: '#FFFFFF', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>IBD</span>
                    <TypedLabel name={label} kind={kind} nameColor="#0F172A" typeColor="#64748B" frame style={{ textColor, fontSize, fontWeight, textAlign }} />
                    {/* The frame is already the diagram's root, so it offers no
                        drill-in — descending into it would change nothing. */}
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            ) : (
                /* Part property header: `partName : Type` */
                <div ref={headerRef} style={{
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
                    {/* The drill button is the template's decision: it sets onDrillIn only for a part that opens a level. Both controls sit on a part that owns parts, folded or
                        not: a collapsed part is still worth descending into. */}
                    {onDrillIn && (
                        <DrillInButton label={label} onDrillIn={onDrillIn} color={color} />
                    )}
                    {onNavigateToView && (
                        <ViewNavigateButton label={label} onNavigate={onNavigateToView} color={color} />
                    )}
                    {hasChildren && onToggleCollapse && (
                        <CollapseButton label={label} isCollapsed={isCollapsed} onToggle={onToggleCollapse} color={color} />
                    )}
                </div>
            )}

            {/* Nested-port housings sit behind the squares they enclose. */}
            {ports.filter(p => p.nestedCount).map(p => (
                // The connector's body is the grab handle for the whole group: its
                // child ports are derived from it, so they travel with it.
                <div
                    key={`${p.id}__group`}
                    style={{ display: 'contents' }}
                    onPointerDown={onPortMove ? event => beginWallDrag(event, {
                        alongStart: p.side === 'left' || p.side === 'right' ? p.y : p.x,
                        size: p.size ?? INTERCONNECTION_PORT_SIZE,
                        multiWall: renderer.multiWallPortDrag,
                        getZoom,
                        onMove: (along, side) => onPortMove(p.id, Math.max(8, along), side),
                        onCommit: onPortCommit ? () => onPortCommit(p.id) : undefined,
                    }) : undefined}
                >
                    {renderer.nestedPortHousing(p, { showText: showPortText })}
                </div>
            ))}

            {/* Boundary ports. A nested-parent port is drawn as its housing + the
                pins straddling the wall, not as a bare square of its own. */}
            {ports.filter(p => !p.nestedCount).map(p => (
                <BoundaryPort
                    key={p.id}
                    port={p}
                    onBeginDrag={onPortMove && p.nested && p.parentId ? (event, setDragging) => {
                        // Same rule as a wall port, one level down: slide along the
                        // PARENT PORT's edge, and swap face by crossing its centre.
                        const parent = ports.find(candidate => candidate.id === p.parentId);
                        const nodeEl = (event.currentTarget as HTMLElement).closest('.react-flow__node') as HTMLElement | null;
                        if (!parent || !nodeEl) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = nodeEl.getBoundingClientRect();
                        const vertical = parent.side === 'left' || parent.side === 'right';
                        const pinSize = p.size ?? INTERCONNECTION_PORT_SIZE;
                        const bodyAlong = vertical ? parent.y : parent.x;
                        const bodyCross = vertical ? parent.x : parent.y;
                        const bodyLength = (Math.max(parent.nestedCount ?? 1, 1) - 1) * NESTED_PITCH
                            + INTERCONNECTION_PORT_SIZE + NESTED_PIN_INSET * 2;
                        const move = (next: PointerEvent) => {
                            if (Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY) <= 2) return;
                            setDragging(true);
                            const zoom = getZoom() || 1;
                            const mx = (next.clientX - rect.left) / zoom, my = (next.clientY - rect.top) / zoom;
                            const cursorAlong = vertical ? my : mx;
                            const cursorCross = vertical ? mx : my;
                            const along = Math.min(
                                Math.max(cursorAlong - pinSize / 2, bodyAlong),
                                bodyAlong + bodyLength - pinSize,
                            );
                            const outward = parent.side === 'left' || parent.side === 'top';
                            const beyondCentre = cursorCross < bodyCross + NESTED_HOUSING_DEPTH / 2;
                            const onOuter = outward ? beyondCentre : !beyondCentre;
                            onPortMove(p.id, along, onOuter ? parent.side : OPPOSITE_SIDE[parent.side]);
                        };
                        const stop = () => {
                            window.removeEventListener('pointermove', move);
                            window.removeEventListener('pointerup', stop);
                            onPortCommit?.(p.id);
                            window.setTimeout(() => setDragging(false), 0);
                        };
                        window.addEventListener('pointermove', move);
                        window.addEventListener('pointerup', stop, { once: true });
                    } : undefined}
                    onMove={onPortMove ? (y, side) => {
                        // The multi-wall drag already clamps the along-wall value to
                        // the wall's usable span; the legacy vertical nudge does not.
                        if (renderer.multiWallPortDrag) { onPortMove(p.id, Math.max(8, y), side); return; }
                        const size = p.size ?? INTERCONNECTION_PORT_SIZE;
                        const min = (isFrame || isContainer ? 70 : 62) - size / 2;
                        const max = Math.max(min, (height ?? min + size + 18) - size - 18);
                        onPortMove(p.id, Math.min(Math.max(y, min), max), side);
                    } : undefined}
                    onCommit={onPortCommit ? () => onPortCommit(p.id) : undefined}
                    onResize={onPortResize ? (size, axis) => onPortResize(p.id, size, axis) : undefined}
                    onSelect={onPortSelect}
                    showText={showPortText}
                />
            ))}
            {renderer.renderImplicitPorts() && implicitIn && <ImplicitPort side="left" direction="in" />}
            {renderer.renderImplicitPorts() && implicitOut && <ImplicitPort side="right" direction="out" />}
        </div>
    );
}

export const InterconnectionNode = memo(InterconnectionNodeInner);

// ─── ActionFlowNode ──────────────────────────────────────────────────────────
//
// Custom ReactFlow node for Action Flow Diagrams.
// Renders action nodes as polished rounded cards with:
//   - Input ports (left edge) and output ports (right edge)
//   - Color-coding by allocation lane/layer
//   - Drop shadows, hover lift, subtle gradients
//   - Start/Done pseudo-nodes with UML activity diagram styling
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useState } from 'react';
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react';
import type { MemoElement, ActionParameter } from '@memoarchitect/tools/browser';
import { SHADOW, RADIUS, FONT } from '../styles/tokens';

/**
 * Ids of the card-edge handles every activity node carries, one per direction.
 *
 * Control flow addresses these explicitly. It used to address nothing at all
 * and let ReactFlow pick a handle, which worked only while a node had exactly
 * one of each type; once parameter pins became real handles, a succession could
 * be resolved to a pin in the middle of a card and the connector doubled back
 * on itself to reach it. Naming the card edge removes the guess.
 */
export const CONTROL_IN = 'control-in';
export const CONTROL_OUT = 'control-out';

/**
 * The card-edge handles are plumbing, not notation: the arrowhead already shows
 * where a connector meets a block, so a dot drawn on the border adds nothing —
 * and on a card with no parameters it read as a port that is not there. Kept
 * transparent rather than removed, because edges attach to them.
 */
const HIDDEN_HANDLE = {
    background: 'transparent',
    border: 'none',
    width: 8,
    height: 8,
} as const;

export interface ActionFlowNodeData {
    element?: MemoElement;
    label: string;
    nodeType: 'action' | 'accept' | 'send' | 'start' | 'done' | 'fork' | 'join' | 'decision' | 'merge' | 'activityFinal' | 'flowFinal';
    parameters?: ActionParameter[];
    allocatedTo?: string;
    laneColor: string;
    layerColor: string;
    inPorts: string[];
    outPorts: string[];
    hasChildren?: boolean;
    isExpanded?: boolean;
    /** Nested mode: this composite is drawn as a frame around its own steps. */
    isFrame?: boolean;
    onToggleExpand?: () => void;
    /** Open this composite action as its own diagram (drill-down mode). */
    onDrillIn?: () => void;
    flowDirection?: 'horizontal' | 'vertical';
}

/** Drill-in affordance for a composite action — the visible twin of double-click. */
function ActionDrillInButton({ onDrillIn, color, label }: {
    onDrillIn: () => void; color: string; label: string;
}) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onDrillIn(); }}
            onDoubleClick={e => e.stopPropagation()}
            className="nodrag"
            title={`Open ${label} as its own diagram`}
            aria-label={`Drill into ${label}`}
            style={{
                width: 16, height: 16, flexShrink: 0, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${color}66`, borderRadius: 4,
                background: '#FFFFFF', color,
                fontSize: 10, fontWeight: 700, lineHeight: 1, cursor: 'pointer',
            }}
        >
            ↳
        </button>
    );
}

function ActionFlowNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as ActionFlowNodeData;
    const { nodeType, label, laneColor, layerColor, inPorts, outPorts } = d;
    const [hovered, setHovered] = useState(false);

    // Start node: filled circle
    if (nodeType === 'start') {
        return (
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#374151', border: '2px solid #374151',
                boxShadow: SHADOW.sm,
            }}>
                <Handle id={CONTROL_OUT} type="source" position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right} style={HIDDEN_HANDLE} />
            </div>
        );
    }

    // Done node: bullseye
    if (nodeType === 'done') {
        return (
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#FFFFFF', border: '3px solid #374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: SHADOW.sm,
            }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#374151' }} />
                <Handle id={CONTROL_IN} type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left} style={HIDDEN_HANDLE} />
            </div>
        );
    }

    // SysML v2 decision and merge nodes share the UML diamond notation. The
    // decision name is a label *below* the glyph (as in standard activity
    // diagrams), leaving the diamond itself clean and readable. Guards belong
    // on the outgoing succession edges, not on the decision itself.
    if (nodeType === 'decision' || nodeType === 'merge') {
        // Keep the ReactFlow box exactly the size of the diamond. The external
        // name may overflow below it, but it must not turn a decision into a
        // large invisible rectangle that routes connectors to the wrong place.
        const diamondSize = 64;
        const half = diamondSize / 2;
        const labelTop = diamondSize + 6;
        const vertical = d.flowDirection === 'vertical';
        // The node box includes the label, but control flow must meet the
        // diamond itself. Explicit handle coordinates prevent a connector from
        // terminating beside the label in vertical layouts.
        const inHandleStyle = vertical
            ? { ...HIDDEN_HANDLE, left: '50%', top: 0, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }
            : { ...HIDDEN_HANDLE, left: 0, top: half, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' };
        const outHandleStyle = vertical
            ? { ...HIDDEN_HANDLE, left: '50%', top: diamondSize, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }
            : { ...HIDDEN_HANDLE, left: diamondSize, top: half, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' };
        return (
            <div title={label || (nodeType === 'decision' ? 'Decision node' : 'Merge node')} style={{ width: diamondSize, height: diamondSize, position: 'relative', overflow: 'visible' }}>
                <svg width={diamondSize} height={diamondSize} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
                    <polygon points={`${half},2 ${diamondSize - 2},${half} ${half},${diamondSize - 2} 2,${half}`} fill="#DDEFB8" stroke="#374151" strokeWidth="2.25" />
                </svg>
                <span style={{ position: 'absolute', top: labelTop, left: -34, width: 132, display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#374151', overflowWrap: 'anywhere', pointerEvents: 'none' }}>{label}</span>
                <Handle id={CONTROL_IN} type="target" position={vertical ? Position.Top : Position.Left} style={inHandleStyle} />
                <Handle id={CONTROL_OUT} type="source" position={vertical ? Position.Bottom : Position.Right} style={outHandleStyle} />
            </div>
        );
    }

    // A flow final consumes just its incoming token; an activity final ends
    // the activity.  The two distinct SysML semantics deserve distinct glyphs.
    if (nodeType === 'activityFinal' || nodeType === 'flowFinal') {
        const activityFinal = nodeType === 'activityFinal';
        return (
            <div title={label || (activityFinal ? 'Activity final / terminate' : 'Flow final')} style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' }}>
                {activityFinal ? <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#374151' }} /> : <span style={{ color: '#374151', fontSize: 22, lineHeight: 1 }}>×</span>}
                {label && (
                    <span style={{ position: 'absolute', top: 33, left: -46, width: 120, textAlign: 'center', fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: '#374151', pointerEvents: 'none', overflowWrap: 'anywhere' }}>
                        {label}
                    </span>
                )}
                <Handle id={CONTROL_IN} type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left} style={HIDDEN_HANDLE} />
            </div>
        );
    }

    // Fork / join: a solid synchronization bar. One incoming + many outgoing
    // (fork) or many incoming + one outgoing (join); ReactFlow lets multiple
    // edges share a single handle, so the bar reads as a UML control node.
    if (nodeType === 'fork' || nodeType === 'join') {
        const vertical = d.flowDirection === 'vertical';
        return (
            <div
                title={nodeType === 'fork' ? 'Fork — split into concurrent flows' : 'Join — synchronize concurrent flows'}
                style={{
                    width: '100%', height: '100%',
                    background: '#374151', borderRadius: 3, boxShadow: SHADOW.sm,
                }}
            >
                <Handle id={CONTROL_IN} type="target" position={vertical ? Position.Top : Position.Left}
                    style={HIDDEN_HANDLE} />
                <Handle id={CONTROL_OUT} type="source" position={vertical ? Position.Bottom : Position.Right}
                    style={HIDDEN_HANDLE} />
            </div>
        );
    }

    // Action node: polished rounded card with ports. Accept/send action usages
    // retain their SysML semantic role instead of looking like generic work.
    const color = laneColor || layerColor || '#9CA3AF';
    const actionStereotype = nodeType === 'accept' ? '«accept action»'
        : nodeType === 'send' ? '«send action»' : undefined;

    // Composite frame: the steps inside are separate ReactFlow children, so
    // this draws only the boundary and its header — the same containment
    // language the state machine uses for a composite state.
    if (d.isFrame) {
        return (
            <div
                style={{
                    width: '100%', height: '100%', boxSizing: 'border-box',
                    background: `${color}08`,
                    border: `1.5px solid ${color}66`,
                    borderRadius: 10,
                    boxShadow: selected ? '0 0 0 3px #2DD4A8' : 'none',
                    position: 'relative',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px 0',
                }}>
                    {d.onToggleExpand && (
                        <button
                            aria-label={`Collapse ${label}`}
                            className="nodrag"
                            onClick={event => { event.stopPropagation(); d.onToggleExpand!(); }}
                            onDoubleClick={event => event.stopPropagation()}
                            style={{
                                width: 16, height: 16, flexShrink: 0, padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${color}66`, borderRadius: 4, background: '#FFFFFF',
                                color, fontSize: 11, fontWeight: 700, lineHeight: 1, cursor: 'pointer',
                            }}
                        >
                            −
                        </button>
                    )}
                    {d.onDrillIn && (
                        <ActionDrillInButton onDrillIn={d.onDrillIn} color={color} label={label} />
                    )}
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                        {label}
                    </span>
                    {d.allocatedTo && (
                        <span style={{ fontSize: '9px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                            {'→'} {d.allocatedTo}
                        </span>
                    )}
                </div>
                <Handle id={CONTROL_IN} type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left}
                    style={HIDDEN_HANDLE} />
                <Handle id={CONTROL_OUT} type="source" position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right}
                    style={HIDDEN_HANDLE} />
            </div>
        );
    }

    const portHeight = 18;
    const bodyHeight = Math.max(inPorts.length * portHeight, outPorts.length * portHeight, 0);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#FFFFFF',
                border: `1.5px solid ${color}`,
                borderRadius: 3,
                minWidth: '140px',
                boxShadow: selected
                    ? '0 0 0 3px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.35)'
                    : hovered ? `0 0 0 2px ${color}22` : 'none',
                transition: 'box-shadow 150ms ease',
                overflow: 'hidden',
            }}
        >
            {/* Header: action name with subtle gradient */}
            <div style={{
                padding: '8px 14px',
                fontSize: FONT.md,
                fontWeight: 600,
                color: '#1a1a1a',
                background: `${color}0D`,
                borderBottom: bodyHeight > 0 ? '1px solid #E5E5E0' : 'none',
                textAlign: 'center',
                // Reading left-to-right every card shares a width, so a long
                // name wraps and its card grows taller. Reading top-to-bottom
                // the cards share a height instead and the name widens its own
                // card, where wrapping would break the shared height.
                ...(d.flowDirection === 'vertical'
                    ? { whiteSpace: 'nowrap' as const }
                    : { whiteSpace: 'normal' as const, overflowWrap: 'anywhere' as const, lineHeight: 1.25 }),
            }}>
                {actionStereotype && <div style={{ fontSize: 10, color, fontStyle: 'italic', marginBottom: 2 }}>{actionStereotype}</div>}
                {label}
                {d.hasChildren && d.onDrillIn && (
                    <button
                        aria-label={`Drill into ${label}`}
                        title={`Open ${label} as its own diagram`}
                        className="nodrag"
                        onClick={event => { event.stopPropagation(); d.onDrillIn!(); }}
                        onDoubleClick={event => event.stopPropagation()}
                        style={{
                            float: 'right', marginLeft: 4, width: 18, height: 18, padding: 0,
                            border: `1px solid ${color}`, borderRadius: 2, background: '#FFFFFF',
                            color, fontSize: 11, fontWeight: 700, lineHeight: '16px', cursor: 'pointer',
                        }}
                    >
                        ↳
                    </button>
                )}
                {d.hasChildren && d.onToggleExpand && (
                    <button
                        aria-label={d.isExpanded ? `Collapse ${label}` : `Expand ${label}`}
                        onClick={event => { event.stopPropagation(); d.onToggleExpand!(); }}
                        style={{
                            float: 'right', marginLeft: 8, width: 18, height: 18, padding: 0,
                            border: `1px solid ${color}`, borderRadius: 2, background: '#FFFFFF',
                            color, fontSize: 13, fontWeight: 700, lineHeight: '16px', cursor: 'pointer',
                        }}
                    >
                        {d.isExpanded ? '−' : '+'}
                    </button>
                )}
            </div>

            {/* Ports section */}
            {bodyHeight > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    {/* Input ports (left) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {inPorts.map((port) => (
                            <div key={`in-${port}`} style={{
                                fontSize: FONT.badge, color: '#6B7280', paddingLeft: '8px',
                                display: 'flex', alignItems: 'center', height: `${portHeight}px`, gap: '4px',
                            }}>
                                {/* The pin *is* the handle. An item flow addresses
                                    `in:<parameter>`, and React Flow drops any edge
                                    naming a handle that does not exist — a decorative
                                    dot here silently deletes every object flow. */}
                                <Handle
                                    id={`in:${port}`}
                                    type="target"
                                    position={d.flowDirection === 'vertical' ? Position.Top : Position.Left}
                                    // The coloured bullet is the port's visible label. The
                                    // connection anchor itself stays at the card boundary so
                                    // the arrowhead meets the border, not the text row.
                                    style={HIDDEN_HANDLE}
                                />
                                {port}
                            </div>
                        ))}
                    </div>
                    {/* Output ports (right) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                        {outPorts.map((port) => (
                            <div key={`out-${port}`} style={{
                                fontSize: FONT.badge, color: '#6B7280', paddingRight: '8px',
                                display: 'flex', alignItems: 'center', height: `${portHeight}px`, gap: '4px',
                            }}>
                                {port}
                                <Handle
                                    id={`out:${port}`}
                                    type="source"
                                    position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right}
                                    style={HIDDEN_HANDLE}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Allocation badge */}
            {d.allocatedTo && (
                <div style={{
                    fontSize: '9px', color: '#9CA3AF', textAlign: 'center',
                    padding: '2px 6px', borderTop: '1px solid #F3F4F6',
                    background: '#FAFAFA',
                }}>
                    {'\u2192'} {d.allocatedTo}
                </div>
            )}

            {/* Handles for edges */}
            <Handle id={CONTROL_IN} type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left}
                style={HIDDEN_HANDLE} />
            <Handle id={CONTROL_OUT} type="source" position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right}
                style={HIDDEN_HANDLE} />
        </div>
    );
}

export const ActionFlowNode = memo(ActionFlowNodeInner);

// ─── Swimlane background node (Action Flow template, KK-4) ───────────────────

export interface ActionFlowLaneData {
    label: string;
    color: string;
    orientation?: 'row' | 'column';
    inspectElementId?: string;
    /** Action ids contained by this derived lane; used to keep its bounds in sync with saved positions. */
    memberIds?: string[];
    isFrame?: boolean;
}

/**
 * How far the label must slide along the lane to stay on screen, in node
 * coordinates.
 *
 * A lane label sits at the lane's leading edge — left for a row, top for a
 * column. Zoom in or pan along the lane and that edge leaves the viewport,
 * taking the only statement of which swimlane you are looking at with it. The
 * label therefore tracks the visible edge instead, the way a sticky table
 * header does, and stops at the lane's far edge so it never floats outside the
 * band it names.
 *
 * Returns node-coordinate pixels: the label lives inside the scaled viewport,
 * so the offset scales with zoom on its own.
 */
export function stickyLabelOffset(
    laneStart: number,
    laneExtent: number,
    labelExtent: number,
    translate: number,
    zoom: number,
): number {
    const screenStart = laneStart * zoom + translate;
    if (screenStart >= 0) return 0;
    return Math.max(0, Math.min(-screenStart / zoom, laneExtent - labelExtent));
}

/** Room the label occupies along the lane, so it stops before the far edge. */
const LANE_LABEL_EXTENT = 40;

function ActionFlowLaneNodeInner({ data, selected, positionAbsoluteX, positionAbsoluteY, width, height }: NodeProps) {
    const d = data as unknown as ActionFlowLaneData;
    const column = d.orientation === 'column';
    // Subscribed rather than read once: the label has to follow every pan and
    // zoom frame, and there are only a handful of lanes on a canvas.
    const [translateX, translateY, zoom] = useStore(state => state.transform);
    const offset = column
        ? stickyLabelOffset(positionAbsoluteY, height ?? 0, LANE_LABEL_EXTENT, translateY, zoom)
        : stickyLabelOffset(positionAbsoluteX, width ?? 0, LANE_LABEL_EXTENT, translateX, zoom);
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: `${d.color}08`,
                border: selected ? '3px solid #2DD4A8' : `1px solid ${d.color}30`,
                borderLeft: selected ? '3px solid #2DD4A8' : column ? `1px solid ${d.color}30` : `3px solid ${d.color}`,
                borderTop: selected ? '3px solid #2DD4A8' : column ? `3px solid ${d.color}` : `1px solid ${d.color}30`,
                borderRadius: RADIUS.md,
                pointerEvents: 'auto',
                cursor: d.inspectElementId ? 'pointer' : 'default',
                display: 'flex',
            }}
        >
            {/* The header strip: space the lane owns, that no step is laid out
                into. The name is drawn by `ActionFlowLaneLabelNode`, which is a
                node of its own so it can paint above the action cards — this
                frame sits at `zIndex: -1` and anything drawn inside it is behind
                every block on the canvas. */}
            <div
                style={{
                    ...(column
                        ? { width: '100%', height: LANE_HEADER, borderBottom: `1px solid ${d.color}24` }
                        : { width: LANE_HEADER_ROW, height: '100%', borderRight: `1px solid ${d.color}24` }),
                    background: `${d.color}0F`,
                    borderRadius: column ? `${RADIUS.md}px ${RADIUS.md}px 0 0` : `${RADIUS.md}px 0 0 ${RADIUS.md}px`,
                    flexShrink: 0,
                }}
            />
        </div>
    );
}

export const ActionFlowLaneNode = memo(ActionFlowLaneNodeInner);

/** Thickness of the header strip a lane reserves for its own name. */
export const LANE_HEADER = 30;
/** The same, along a row lane — wider, because the name is set vertically. */
export const LANE_HEADER_ROW = 34;

/**
 * The lane's name, drawn as its own node so it paints above the action cards.
 *
 * It cannot live inside the lane frame: that frame is the diagram's background
 * and sits at `zIndex: -1`, so a name drawn in it disappears behind any block
 * that reaches it — which is exactly what happens once the label slides to
 * follow the viewport. As a separate node it keeps the sticky behaviour and
 * stays legible, and it never takes pointer events, so the lane underneath is
 * still clickable.
 */
function ActionFlowLaneLabelNodeInner({ data, positionAbsoluteX, positionAbsoluteY, width, height }: NodeProps) {
    const d = data as unknown as ActionFlowLaneData;
    const column = d.orientation === 'column';
    const [translateX, translateY, zoom] = useStore(state => state.transform);
    const offset = column
        ? stickyLabelOffset(positionAbsoluteY, height ?? 0, LANE_LABEL_EXTENT, translateY, zoom)
        : stickyLabelOffset(positionAbsoluteX, width ?? 0, LANE_LABEL_EXTENT, translateX, zoom);
    return (
        <div
            style={{
                width: '100%', height: '100%', display: 'flex', pointerEvents: 'none',
                // The node spans the whole lane so the name can travel its full
                // length, but at rest the name hugs the header strip — the space
                // the lane reserves for it — rather than centring over the lane,
                // where it would sit on top of the flow's first step.
                alignItems: column ? 'flex-start' : 'center',
                justifyContent: column ? 'center' : 'flex-start',
            }}
        >
            <div
                style={{
                    writingMode: column ? 'horizontal-tb' : 'vertical-rl',
                    transform: column ? undefined : 'rotate(180deg)',
                    padding: column ? '6px 12px' : '12px 6px',
                    fontSize: FONT.xs,
                    fontWeight: 700,
                    color: d.color,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    // A label at its home position sits in the lane's reserved
                    // header strip, so it must not mask the start/control edge
                    // that crosses that strip in a vertical flow. Only give it
                    // an opaque backing once it has actually become sticky and
                    // is travelling across diagram content.
                    background: offset > 0 ? '#FFFFFFEE' : 'transparent',
                    borderRadius: 4,
                    ...(column ? { marginTop: offset } : { marginLeft: offset }),
                }}
            >
                {d.label}
            </div>
        </div>
    );
}

export const ActionFlowLaneLabelNode = memo(ActionFlowLaneLabelNodeInner);

// ─── StateNode ───────────────────────────────────────────────────────────────
//
// Custom ReactFlow node for the State Transition view template (KK-5).
// UML-style rounded state boxes: leaf states, composite states (nested
// regions), the owning state machine as an outer frame, and note chips
// for non-state behavior elements (properties, timing constraints).
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FONT, SHADOW } from '../styles/tokens';

export interface StateNodeData extends Record<string, unknown> {
    label: string;
    kind: string;
    color: string;
    isContainer?: boolean;
    isMachine?: boolean;
    /** Non-state annotation (property/constraint) rendered as a note chip */
    isNote?: boolean;
    /** Small secondary line, e.g. the mode kind */
    subtitle?: string;
    /** Composite state — it owns substates, whether or not they are drawn */
    hasChildren?: boolean;
    /** Drawn as a single box with its substates folded away */
    isCollapsed?: boolean;
    /** Substates this box is currently hiding */
    hiddenCount?: number;
    onToggleCollapse?: () => void;
    onDrillIn?: () => void;
}

/**
 * Drill-in affordance for a composite state. Double-clicking the state does
 * the same thing, but a hidden gesture is not a discoverable one — this makes
 * the sub-machine visibly reachable.
 */
function DrillInButton({ onDrillIn, color, label }: {
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

/** Fold/unfold affordance for a composite state. */
function FoldToggle({ collapsed, onToggle, color }: {
    collapsed: boolean; onToggle: () => void; color: string;
}) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            onDoubleClick={e => e.stopPropagation()}
            className="nodrag"
            title={collapsed ? 'Show substates' : 'Hide substates'}
            aria-label={collapsed ? 'Show substates' : 'Hide substates'}
            style={{
                width: 16, height: 16, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${color}66`, borderRadius: 4,
                background: '#FFFFFF', color,
                fontSize: 11, fontWeight: 700, lineHeight: 1, cursor: 'pointer',
            }}
        >
            {collapsed ? '+' : '−'}
        </button>
    );
}

const handleStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    border: 'none',
    background: 'transparent',
    opacity: 0,
};

function FallbackHandles() {
    return (
        <>
            <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
            <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
            <Handle type="source" position={Position.Right} id="right" style={handleStyle} />
        </>
    );
}

function StateNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as StateNodeData;
    const [hovered, setHovered] = useState(false);

    if (d.isNote) {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: '#FFFDF5',
                    border: `1px solid ${d.color}66`,
                    borderRadius: 4,
                    padding: '6px 10px',
                    boxShadow: SHADOW.sm,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
                title={d.kind}
            >
                <FallbackHandles />
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.label}
                </span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: d.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {d.kind}
                </span>
            </div>
        );
    }

    // State machine frame or composite state region. The frame is the diagram
    // boundary — neutral so the states carry the colour, like the IBD frame.
    if (d.isContainer) {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: d.isMachine ? 'transparent' : `${d.color}06`,
                    border: d.isMachine ? '1.5px dashed #CBD5E1' : `1.5px solid ${d.color}55`,
                    borderRadius: 14,
                    boxShadow: selected ? SHADOW.selected : 'none',
                    position: 'relative',
                }}
            >
                <FallbackHandles />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 0' }}>
                    {d.onToggleCollapse && !d.isMachine && (
                        <FoldToggle collapsed={false} onToggle={d.onToggleCollapse} color={d.color} />
                    )}
                    {d.onDrillIn && !d.isMachine && (
                        <DrillInButton onDrillIn={d.onDrillIn} color={d.color} label={d.label} />
                    )}
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color: d.isMachine ? '#334155' : d.color, whiteSpace: 'nowrap' }}>
                        {d.label}
                    </span>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: d.isMachine ? '#94A3B8' : `${d.color}AA`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {d.kind}
                    </span>
                </div>
            </div>
        );
    }

    // Leaf state: rounded card with the layer colour as a top accent — the
    // same identity language as IBD part boxes. A composite drawn folded uses
    // the same card plus the UML hidden-decomposition cue.
    const foldedComposite = !!d.hasChildren;
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={foldedComposite
                ? `${d.hiddenCount ?? 0} substate${d.hiddenCount === 1 ? '' : 's'} hidden — double-click to drill in`
                : undefined}
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: '#FFFFFF',
                // Longhand on every side: mixing `border` with `borderTop`
                // makes React warn when only one of them changes on rerender.
                borderTop: `3px solid ${d.color}`,
                borderRight: `1px solid ${hovered ? `${d.color}9A` : '#CBD5E1'}`,
                borderBottom: `1px solid ${hovered ? `${d.color}9A` : '#CBD5E1'}`,
                borderLeft: `1px solid ${hovered ? `${d.color}9A` : '#CBD5E1'}`,
                borderRadius: 12,
                boxShadow: selected ? SHADOW.selected
                    : hovered ? '0 8px 20px rgba(15,23,42,0.12)' : SHADOW.md,
                transition: 'box-shadow 150ms ease, border-color 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '4px 12px',
            }}
        >
            <FallbackHandles />
            <span style={{ fontSize: FONT.md, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {d.label}
            </span>
            {d.subtitle && (
                <span style={{ fontSize: '8px', fontWeight: 600, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {d.subtitle}
                </span>
            )}
            {foldedComposite && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {d.onToggleCollapse && (
                        <FoldToggle collapsed onToggle={d.onToggleCollapse} color={d.color} />
                    )}
                    {d.onDrillIn && (
                        <DrillInButton onDrillIn={d.onDrillIn} color={d.color} label={d.label} />
                    )}
                    <span style={{ fontSize: '8px', fontWeight: 700, color: d.color, letterSpacing: '0.05em' }}>
                        ⊞ {d.hiddenCount ?? 0}
                    </span>
                </span>
            )}
        </div>
    );
}

export const StateNode = memo(StateNodeInner);

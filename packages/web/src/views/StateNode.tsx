// ─── StateNode ───────────────────────────────────────────────────────────────
//
// Custom ReactFlow node for the State Transition view template (KK-5).
// UML-style rounded state boxes: leaf states, composite states (nested
// regions), the owning state machine as an outer frame, and note chips
// for non-state behavior elements (properties, timing constraints).
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
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

    // State machine frame or composite state region
    if (d.isContainer) {
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: d.isMachine ? 'transparent' : `${d.color}06`,
                    border: d.isMachine ? `1.5px dashed ${d.color}88` : `1.5px solid ${d.color}55`,
                    borderRadius: 14,
                    boxShadow: selected ? SHADOW.selected : 'none',
                    position: 'relative',
                }}
            >
                <FallbackHandles />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 14px 0' }}>
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color: d.color, whiteSpace: 'nowrap' }}>
                        {d.label}
                    </span>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: `${d.color}AA`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {d.kind}
                    </span>
                </div>
            </div>
        );
    }

    // Leaf state: classic UML rounded box
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: '#FFFFFF',
                border: `1.5px solid ${d.color}`,
                borderRadius: 12,
                boxShadow: selected ? SHADOW.selected : SHADOW.md,
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
        </div>
    );
}

export const StateNode = memo(StateNodeInner);

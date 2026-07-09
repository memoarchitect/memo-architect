// ─── SequenceNodes ───────────────────────────────────────────────────────────
//
// Custom ReactFlow nodes for the Sequence view template (KK-6):
//   seqLifeline    lane header box + dashed vertical lifeline tail
//   seqSection     background band grouping one functional chain
//   seqOccurrence  event occurrence dot with the step name floating beside
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FONT, SHADOW } from '../styles/tokens';

const LIFELINE_COLOR = '#3498DB';

function SeqLifelineNodeInner({ data }: NodeProps) {
    const d = data as { label: string };
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    minWidth: 140,
                    maxWidth: '90%',
                    padding: '10px 16px',
                    background: '#FFFFFF',
                    border: `1.5px solid ${LIFELINE_COLOR}`,
                    borderRadius: 8,
                    boxShadow: SHADOW.md,
                    textAlign: 'center',
                    fontSize: FONT.md,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {d.label}
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: 44,
                    bottom: 0,
                    left: '50%',
                    borderLeft: `1.5px dashed ${LIFELINE_COLOR}66`,
                }}
            />
        </div>
    );
}

export const SeqLifelineNode = memo(SeqLifelineNodeInner);

function SeqSectionNodeInner({ data }: NodeProps) {
    const d = data as { label: string; scenario?: string };
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                background: '#1B3A4B06',
                border: '1px solid #1B3A4B22',
                borderRadius: 10,
                pointerEvents: 'none',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 14px' }}>
                <span style={{ fontSize: FONT.sm, fontWeight: 700, color: '#1B3A4B' }}>
                    {d.label}
                </span>
                {d.scenario && (
                    <span style={{ fontSize: FONT.xs, color: '#6B7280' }}>
                        realizes {d.scenario}
                    </span>
                )}
            </div>
        </div>
    );
}

export const SeqSectionNode = memo(SeqSectionNodeInner);

const anchorHandleStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    border: 'none',
    background: 'transparent',
    opacity: 0,
};

function SeqOccurrenceNodeInner({ data, selected }: NodeProps) {
    const d = data as { label: string; kind: string };
    return (
        <div
            style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: `3px solid ${LIFELINE_COLOR}`,
                boxShadow: selected ? SHADOW.selected : SHADOW.sm,
                position: 'relative',
            }}
            title={d.kind}
        >
            <Handle type="source" id="right" position={Position.Right} style={anchorHandleStyle} />
            <Handle type="target" id="right" position={Position.Right} style={anchorHandleStyle} />
            <Handle type="source" id="left" position={Position.Left} style={anchorHandleStyle} />
            <Handle type="target" id="left" position={Position.Left} style={anchorHandleStyle} />
            <span
                style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#374151',
                    whiteSpace: 'nowrap',
                    background: '#FFFFFFCC',
                    padding: '1px 5px',
                    borderRadius: 4,
                }}
            >
                {d.label}
            </span>
        </div>
    );
}

export const SeqOccurrenceNode = memo(SeqOccurrenceNodeInner);

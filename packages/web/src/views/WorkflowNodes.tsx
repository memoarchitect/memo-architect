// ─── Workflow Node Types ──────────────────────────────────────────────────────
//
// Custom ReactFlow node components for UML activity diagrams:
//   DecisionNode  — diamond shape with condition label
//   ForkNode      — horizontal/vertical bar (fork = 1→N, join = N→1)
//   StartNode     — filled black circle
//   EndNode       — bullseye
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react';

// ─── Decision Node (Diamond) ─────────────────────────────────────────────────

export interface DecisionNodeData extends Record<string, unknown> {
    label?: string;
    condition?: string;
    layerColor?: string;
    color?: string;   // sidecar override
    onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const DecisionNode = memo(function DecisionNode({ id, data, selected }: NodeProps) {
    const d = data as DecisionNodeData;
    const color = d.color ?? d.layerColor ?? '#E67E22';
    const size = 80;

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        d.onContextMenu?.(e, id);
    }, [d, id]);

    return (
        <div
            style={{ width: size, height: size, position: 'relative' }}
            onContextMenu={onContextMenu}
        >
            {selected && <NodeResizer minWidth={60} minHeight={60} />}

            {/* Diamond SVG */}
            <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
                <polygon
                    points={`${size / 2},4 ${size - 4},${size / 2} ${size / 2},${size - 4} 4,${size / 2}`}
                    fill={d.color ? d.color + '44' : '#FFF8E1'}
                    stroke={color}
                    strokeWidth={selected ? 2.5 : 1.5}
                />
            </svg>

            {/* Label */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 600, color: '#374151',
                textAlign: 'center', padding: '4px 8px',
                pointerEvents: 'none',
            }}>
                {d.condition || d.label || '?'}
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Top} style={{ background: color, border: '2px solid #fff' }} />
            <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff' }} id="right" />
            <Handle type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #fff' }} id="bottom" />
            <Handle type="target" position={Position.Left} style={{ background: color, border: '2px solid #fff' }} />
        </div>
    );
});

// ─── Fork / Join Node (Bar) ──────────────────────────────────────────────────

export interface ForkNodeData extends Record<string, unknown> {
    label?: string;
    orientation?: 'horizontal' | 'vertical';
    nodeType?: 'fork' | 'join';
    onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const ForkNode = memo(function ForkNode({ id, data, selected }: NodeProps) {
    const d = data as ForkNodeData;
    const isHorizontal = (d.orientation ?? 'horizontal') === 'horizontal';
    const barW = isHorizontal ? 120 : 8;
    const barH = isHorizontal ? 8 : 60;

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        d.onContextMenu?.(e, id);
    }, [d, id]);

    return (
        <div
            style={{ width: barW, height: barH, background: '#1a1a1a', borderRadius: 4, position: 'relative' }}
            title={d.nodeType === 'join' ? 'Join (synchronization)' : 'Fork (parallel)'}
            onContextMenu={onContextMenu}
        >
            {selected && <NodeResizer minWidth={40} minHeight={6} />}

            {isHorizontal ? (
                <>
                    <Handle type="target" position={Position.Left} style={{ background: '#2DD4A8', border: '2px solid #fff', left: -1 }} />
                    <Handle type="source" position={Position.Top} style={{ background: '#2DD4A8', border: '2px solid #fff', top: -1 }} id="top" />
                    <Handle type="source" position={Position.Bottom} style={{ background: '#2DD4A8', border: '2px solid #fff', bottom: -1 }} id="bottom" />
                    <Handle type="source" position={Position.Right} style={{ background: '#2DD4A8', border: '2px solid #fff', right: -1 }} id="right" />
                </>
            ) : (
                <>
                    <Handle type="target" position={Position.Top} style={{ background: '#2DD4A8', border: '2px solid #fff', top: -1 }} />
                    <Handle type="source" position={Position.Left} style={{ background: '#2DD4A8', border: '2px solid #fff', left: -1 }} id="left" />
                    <Handle type="source" position={Position.Right} style={{ background: '#2DD4A8', border: '2px solid #fff', right: -1 }} id="right" />
                    <Handle type="source" position={Position.Bottom} style={{ background: '#2DD4A8', border: '2px solid #fff', bottom: -1 }} id="bottom" />
                </>
            )}
        </div>
    );
});

// ─── Start / End Nodes ───────────────────────────────────────────────────────

export interface StartEndNodeData extends Record<string, unknown> {
    nodeType: 'start' | 'end';
    onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const StartEndNode = memo(function StartEndNode({ id, data }: NodeProps) {
    const d = data as StartEndNodeData;
    const isStart = d.nodeType === 'start';
    const size = 32;

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        d.onContextMenu?.(e, id);
    }, [d, id]);

    return (
        <div style={{ width: size, height: size, position: 'relative' }} onContextMenu={onContextMenu}>
            <svg width={size} height={size}>
                {isStart ? (
                    <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="#1a1a1a" />
                ) : (
                    <>
                        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="#1a1a1a" />
                        <circle cx={size / 2} cy={size / 2} r={size / 2 - 6} fill="#FFFFFF" />
                        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="#1a1a1a" />
                    </>
                )}
            </svg>
            {isStart ? (
                <Handle type="source" position={Position.Bottom} style={{ background: '#1a1a1a', border: '2px solid #fff' }} />
            ) : (
                <Handle type="target" position={Position.Top} style={{ background: '#1a1a1a', border: '2px solid #fff' }} />
            )}
        </div>
    );
});

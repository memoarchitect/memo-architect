// ─── ActionFlowNode ──────────────────────────────────────────────────────────
//
// Custom ReactFlow node for Action Flow Diagrams.
// Renders action nodes as rounded rectangles with:
//   - Input ports (left edge) and output ports (right edge)
//   - Color-coding by allocation lane/layer
//   - Start/Done pseudo-nodes with UML activity diagram styling
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MemoElement, ActionParameter } from '@memo/core';

export interface ActionFlowNodeData {
    element?: MemoElement;
    label: string;
    nodeType: 'action' | 'start' | 'done';
    parameters?: ActionParameter[];
    allocatedTo?: string;
    laneColor: string;
    layerColor: string;
    inPorts: string[];
    outPorts: string[];
}

function ActionFlowNodeInner({ data }: NodeProps) {
    const d = data as unknown as ActionFlowNodeData;
    const { nodeType, label, laneColor, layerColor, inPorts, outPorts } = d;

    // Start node: filled circle
    if (nodeType === 'start') {
        return (
            <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#374151', border: '2px solid #374151',
            }}>
                <Handle type="source" position={Position.Right} style={{ background: '#374151', width: 6, height: 6 }} />
            </div>
        );
    }

    // Done node: bullseye
    if (nodeType === 'done') {
        return (
            <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#FFFFFF', border: '3px solid #374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#374151' }} />
                <Handle type="target" position={Position.Left} style={{ background: '#374151', width: 6, height: 6 }} />
            </div>
        );
    }

    // Action node: rounded rectangle with ports
    const portHeight = 18;
    const headerHeight = 36;
    const totalInHeight = inPorts.length * portHeight;
    const totalOutHeight = outPorts.length * portHeight;
    const bodyHeight = Math.max(totalInHeight, totalOutHeight, 0);
    const nodeHeight = headerHeight + bodyHeight + (bodyHeight > 0 ? 8 : 0);

    return (
        <div style={{
            background: '#FFFFFF',
            border: `2px solid ${laneColor || layerColor || '#9CA3AF'}`,
            borderRadius: '10px',
            minWidth: '140px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
        }}>
            {/* Header: action name */}
            <div style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1a1a1a',
                background: (laneColor || layerColor || '#9CA3AF') + '12',
                borderBottom: bodyHeight > 0 ? '1px solid #E5E5E0' : 'none',
                textAlign: 'center',
                whiteSpace: 'nowrap',
            }}>
                {label}
            </div>

            {/* Ports section */}
            {bodyHeight > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    {/* Input ports (left) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {inPorts.map((port, i) => (
                            <div key={`in-${port}`} style={{
                                fontSize: '10px', color: '#6B7280', paddingLeft: '8px',
                                display: 'flex', alignItems: 'center', height: `${portHeight}px`,
                            }}>
                                <span style={{ color: '#3498DB', marginRight: '3px' }}>{'\u25B6'}</span>
                                {port}
                            </div>
                        ))}
                    </div>
                    {/* Output ports (right) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                        {outPorts.map((port, i) => (
                            <div key={`out-${port}`} style={{
                                fontSize: '10px', color: '#6B7280', paddingRight: '8px',
                                display: 'flex', alignItems: 'center', height: `${portHeight}px`,
                            }}>
                                {port}
                                <span style={{ color: '#E67E22', marginLeft: '3px' }}>{'\u25B6'}</span>
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
            <Handle type="target" position={Position.Left}
                style={{ background: laneColor || '#9CA3AF', width: 8, height: 8 }} />
            <Handle type="source" position={Position.Right}
                style={{ background: laneColor || '#9CA3AF', width: 8, height: 8 }} />
        </div>
    );
}

export const ActionFlowNode = memo(ActionFlowNodeInner);

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
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MemoElement, ActionParameter } from '@memo/tools/browser';
import { SHADOW, RADIUS, FONT } from '../styles/tokens';

export interface ActionFlowNodeData {
    element?: MemoElement;
    label: string;
    nodeType: 'action' | 'start' | 'done' | 'fork' | 'join';
    parameters?: ActionParameter[];
    allocatedTo?: string;
    laneColor: string;
    layerColor: string;
    inPorts: string[];
    outPorts: string[];
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    flowDirection?: 'horizontal' | 'vertical';
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
                <Handle type="source" position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right} style={{ background: '#374151', width: 6, height: 6 }} />
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
                <Handle type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left} style={{ background: '#374151', width: 6, height: 6 }} />
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
                <Handle type="target" position={vertical ? Position.Top : Position.Left}
                    style={{ background: '#374151', width: 6, height: 6, border: 'none' }} />
                <Handle type="source" position={vertical ? Position.Bottom : Position.Right}
                    style={{ background: '#374151', width: 6, height: 6, border: 'none' }} />
            </div>
        );
    }

    // Action node: polished rounded card with ports
    const color = laneColor || layerColor || '#9CA3AF';
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
                whiteSpace: 'nowrap',
            }}>
                {label}
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
                                <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: '#3498DB', flexShrink: 0,
                                }} />
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
                                <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: '#E67E22', flexShrink: 0,
                                }} />
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
            <Handle type="target" position={d.flowDirection === 'vertical' ? Position.Top : Position.Left}
                style={{ background: color, width: 8, height: 8, border: '2px solid #FFFFFF' }} />
            <Handle type="source" position={d.flowDirection === 'vertical' ? Position.Bottom : Position.Right}
                style={{ background: color, width: 8, height: 8, border: '2px solid #FFFFFF' }} />
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

function ActionFlowLaneNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as ActionFlowLaneData;
    const column = d.orientation === 'column';
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
            <div
                style={{
                    writingMode: column ? 'horizontal-tb' : 'vertical-rl',
                    transform: column ? undefined : 'rotate(180deg)',
                    padding: column ? '7px 10px' : '10px 6px',
                    fontSize: FONT.xs,
                    fontWeight: 700,
                    color: d.color,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    alignSelf: column ? 'flex-start' : 'center',
                    width: column ? '100%' : undefined,
                    textAlign: column ? 'center' : undefined,
                    whiteSpace: 'nowrap',
                }}
            >
                {d.label}
            </div>
        </div>
    );
}

export const ActionFlowLaneNode = memo(ActionFlowLaneNodeInner);

// ─── DecompositionNode ───────────────────────────────────────────────────────
//
// Custom ReactFlow node for decomposition/containment diagrams.
// Supports expand/collapse, per-node direction toggle, layer-color styling,
// and depth-based background tinting for containment mode.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MemoElement } from '@memo/core';

export interface DecompositionNodeData {
    element: MemoElement;
    layerColor: string;
    isExpanded: boolean;
    hasChildren: boolean;
    childCount: number;
    direction: 'vertical' | 'horizontal';
    onToggleExpand: () => void;
    onToggleDirection: () => void;
    showDirectionButton: boolean;
    depthBgColor?: string;
    isContainer?: boolean;
    label?: string;
}

function DecompositionNodeInner({ data }: NodeProps) {
    const d = data as unknown as DecompositionNodeData;
    const {
        element,
        layerColor,
        isExpanded,
        hasChildren,
        childCount,
        direction,
        onToggleExpand,
        onToggleDirection,
        showDirectionButton,
        depthBgColor,
        isContainer,
    } = d;

    const dirLabel = direction === 'vertical' ? 'V' : 'H';

    return (
        <div style={{
            background: isContainer && isExpanded ? (depthBgColor || 'transparent') : '#FFFFFF',
            borderLeft: isContainer && isExpanded ? `2px solid ${layerColor}40` : `3px solid ${layerColor}`,
            borderTop: `1px solid ${isContainer && isExpanded ? layerColor + '30' : '#E5E5E0'}`,
            borderRight: `1px solid ${isContainer && isExpanded ? layerColor + '30' : '#E5E5E0'}`,
            borderBottom: `1px solid ${isContainer && isExpanded ? layerColor + '30' : '#E5E5E0'}`,
            borderRadius: isContainer && isExpanded ? '10px' : '8px',
            padding: isContainer && isExpanded ? '0' : '8px 12px',
            minWidth: isContainer && isExpanded ? undefined : '200px',
            boxShadow: isContainer && isExpanded ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box' as const,
        }}>
            {/* Handles — hidden by default, visible on hover via CSS */}
            <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
            <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
            <Handle type="source" position={Position.Right} id="right" style={handleStyle} />

            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: isContainer && isExpanded ? '8px 12px' : '0',
            }}>
                {/* Expand/Collapse button */}
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `1.5px solid ${layerColor}`,
                            background: isExpanded ? layerColor + '20' : 'transparent',
                            color: layerColor,
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            padding: 0,
                            flexShrink: 0,
                        }}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                )}

                {/* Direction toggle (decomposition mode only) */}
                {hasChildren && showDirectionButton && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleDirection(); }}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '1.5px solid #10b981',
                            background: 'transparent',
                            color: '#10b981',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            flexShrink: 0,
                        }}
                        title={`Direction: ${direction}. Click to toggle`}
                    >
                        {dirLabel}
                    </button>
                )}

                {/* Layer color dot */}
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: layerColor,
                    flexShrink: 0,
                }} />

                {/* Element name */}
                <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isContainer && isExpanded ? layerColor : '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {element.name}
                </span>
            </div>

            {/* Kind subtitle + children count */}
            {!(isContainer && isExpanded) && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '3px',
                    paddingLeft: hasChildren ? '26px' : '14px',
                }}>
                    <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        {element.kind}
                    </span>
                    {hasChildren && (
                        <span style={{
                            fontSize: '9px',
                            color: '#6B7280',
                            background: '#F0F0ED',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            fontWeight: 600,
                        }}>
                            {childCount} parts{!isExpanded ? ' (collapsed)' : ''}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

const handleStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    background: '#2DD4A8',
    border: '1.5px solid #FFFFFF',
    opacity: 0,
};

export const DecompositionNode = memo(DecompositionNodeInner);

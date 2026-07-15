// ─── DiagramInteractiveNode ───────────────────────────────────────────────────
//
// Generic custom ReactFlow node for diagram canvas elements.
// Features:
//   - Connection handles (4 cardinal points, appear on hover)
//   - NodeResizer on selection
//   - Double-click → inline name editing
//   - Right-click → context menu (via callback)
//   - Layer color border + sidecar color override
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { FONT } from '../styles/tokens';
import type { CompartmentEntry } from './templates/composition-tree';

export interface DiagramInteractiveNodeData extends Record<string, unknown> {
    label: string;
    kind: string;
    layer: string;
    construct?: string;
    color: string;          // layer color
    bgColor?: string;       // sidecar color override for background
    isNew?: boolean;        // optimistic — not yet confirmed by server
    /** Attribute compartment rows (General view template) */
    compartments?: CompartmentEntry[];
    onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
    onInlineEdit?: (nodeId: string, newName: string) => void;
}

export const DiagramInteractiveNode = memo(function DiagramInteractiveNode(
    { id, data, selected }: NodeProps
) {
    const d = data as DiagramInteractiveNodeData;
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDoubleClick = useCallback(() => {
        setEditValue(d.label);
        setEditing(true);
        setTimeout(() => {
            inputRef.current?.select();
        }, 10);
    }, [d.label]);

    const commitEdit = useCallback(() => {
        setEditing(false);
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== d.label) {
            d.onInlineEdit?.(id, trimmed);
        }
    }, [editValue, d, id]);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { setEditing(false); }
    }, [commitEdit]);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        d.onContextMenu?.(e, id);
    }, [d, id]);

    const bgColor = d.bgColor ?? '#FFFFFF';
    const borderColor = d.color;
    const handleStyle = {
        background: borderColor,
        border: '2px solid #FFFFFF',
        width: 10, height: 10,
        opacity: hovered || selected ? 1 : 0,
        transition: 'opacity 0.15s',
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onContextMenu={onContextMenu}
            onDoubleClick={handleDoubleClick}
            style={{
                minWidth: 120, minHeight: 40,
                background: bgColor,
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: 8,
                boxShadow: selected
                    ? `0 0 0 2px ${borderColor}, 0 4px 12px ${borderColor}44`
                    : hovered
                    ? '0 4px 16px rgba(0,0,0,0.14)'
                    : '0 1px 4px rgba(0,0,0,0.08)',
                cursor: editing ? 'text' : 'grab',
                position: 'relative',
                transition: 'box-shadow 0.15s',
                opacity: d.isNew ? 0.7 : 1,
            }}
        >
            {/* Resize handle (only when selected) */}
            {selected && (
                <NodeResizer
                    minWidth={80}
                    minHeight={36}
                    maxWidth={600}
                    maxHeight={400}
                    color={borderColor}
                    lineStyle={{ borderColor }}
                    handleStyle={{ background: borderColor, border: '2px solid #fff', width: 10, height: 10, borderRadius: 2 }}
                />
            )}

            {/* Kind badge + name */}
            <div style={{ padding: '8px 12px', userSelect: 'none' }}>
                <div style={{
                    fontSize: '9px', fontWeight: 700, color: borderColor,
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
                }}>
                    {d.kind}
                </div>

                {editing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={onKeyDown}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{
                            fontSize: FONT.sm, fontWeight: 500, color: '#1a1a1a',
                            background: 'transparent', border: 'none', outline: 'none',
                            width: '100%', padding: 0,
                        }}
                    />
                ) : (
                    <div style={{
                        fontSize: FONT.sm, fontWeight: 500, color: '#1a1a1a',
                        lineHeight: 1.3, wordBreak: 'break-word',
                    }}>
                        {d.label || d.kind}
                    </div>
                )}

                {d.isNew && (
                    <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: 2 }}>saving…</div>
                )}
            </div>

            {/* Attribute compartment (General view template) */}
            {!!d.compartments?.length && (
                <div style={{
                    borderTop: '1px solid #EDEDEA',
                    padding: '5px 12px 7px',
                    userSelect: 'none',
                }}>
                    {d.compartments.map(entry => (
                        <div key={entry.key} style={{
                            display: 'flex', gap: 6, alignItems: 'baseline',
                            fontSize: '10px', lineHeight: '15px',
                            whiteSpace: 'nowrap', overflow: 'hidden',
                        }}>
                            <span style={{ color: '#9CA3AF' }}>{entry.key}</span>
                            <span style={{
                                color: '#4B5563', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Connection handles — always present, opacity controlled by hover/select */}
            <Handle type="target" position={Position.Top}    style={{ ...handleStyle, top: -5 }} />
            <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -5 }} id="bottom" />
            <Handle type="source" position={Position.Right}  style={{ ...handleStyle, right: -5 }} id="right" />
            <Handle type="target" position={Position.Left}   style={{ ...handleStyle, left: -5 }} />
        </div>
    );
});

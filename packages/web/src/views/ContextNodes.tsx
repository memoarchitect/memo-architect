import { memo } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { PersonGlyph } from './PersonGlyph';

interface ContextNodeData extends Record<string, unknown> {
    label: string;
    kind?: string;
    category?: 'person' | 'system' | 'environment';
    minWidth?: number;
    minHeight?: number;
}

const hiddenHandle = { opacity: 0, width: 1, height: 1 };

/**
 * Resize affordance shared by the two semantic context nodes, matching the
 * handles used on interconnection parts so resizing feels the same wherever a
 * block can be resized. The boundary marker is deliberately excluded: it is a
 * drawn scope, not an element, and has nothing to size against.
 */
function ContextResizer({ nodeId, selected, data }: {
    nodeId: string;
    selected: boolean;
    data: ContextNodeData;
}) {
    return <NodeResizer
        nodeId={nodeId}
        isVisible={selected}
        minWidth={data.minWidth ?? 140}
        minHeight={data.minHeight ?? 64}
        color="#0F766E"
        lineStyle={{ borderWidth: 1 }}
        handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
    />;
}

function Handles() {
    return <>
        <Handle type="target" position={Position.Left} style={hiddenHandle} />
        <Handle type="source" position={Position.Right} style={hiddenHandle} />
        <Handle type="target" position={Position.Top} style={hiddenHandle} />
        <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </>;
}

/** The system-of-interest is deliberately a black box in a context diagram. */
export const ContextSystemNode = memo(function ContextSystemNode({ id, data, selected }: NodeProps) {
    const d = data as ContextNodeData;
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', display: 'grid', placeItems: 'center',
        padding: '14px 18px', textAlign: 'center', border: '2px solid #0F766E', borderRadius: 8,
        background: '#F0FDFA', color: '#134E4A', fontSize: 15, fontWeight: 700, lineHeight: 1.25,
        boxShadow: '0 2px 7px rgba(15, 118, 110, 0.16)',
    }}>
        <ContextResizer nodeId={id} selected={Boolean(selected)} data={d} />
        <span><small style={{ display: 'block', marginBottom: 5, color: '#0F766E', fontSize: 10, letterSpacing: '.08em' }}>SYSTEM OF INTEREST</small>{d.label}</span>
        <Handles />
    </div>;
});

/** An entity deliberately outside the system boundary. */
export const ContextExternalNode = memo(function ContextExternalNode({ id, data, selected }: NodeProps) {
    const d = data as ContextNodeData;
    const palette = d.category === 'environment'
        ? { border: '#7C3AED', fill: '#F5F3FF', text: '#4C1D95', tag: 'ENVIRONMENT' }
        : d.category === 'person'
            ? { border: '#2563EB', fill: '#EFF6FF', text: '#1E3A8A', tag: 'ACTOR' }
            : { border: '#64748B', fill: '#F8FAFC', text: '#334155', tag: 'EXTERNAL SYSTEM' };
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        padding: '10px 14px', textAlign: 'center', border: `1.5px solid ${palette.border}`, borderRadius: 7,
        background: palette.fill, color: palette.text, fontSize: 13, fontWeight: 650, lineHeight: 1.25,
    }}>
        <ContextResizer nodeId={id} selected={Boolean(selected)} data={d} />
        {d.category === 'person' && <PersonGlyph size={26} color={palette.border} />}
        <span><small style={{ display: 'block', marginBottom: 4, color: palette.border, fontSize: 9, letterSpacing: '.07em' }}>{palette.tag}</small>{d.label}</span>
        <Handles />
    </div>;
});

/** A visual scope marker, not a semantic element and therefore non-interactive. */
export const ContextBoundaryNode = memo(function ContextBoundaryNode({ id, data, selected }: NodeProps) {
    const d = data as ContextNodeData;
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', border: '2px solid #0F766E', borderRadius: 12,
        background: 'rgba(240, 253, 250, 0.34)', padding: '12px 16px', color: '#0F766E', fontSize: 12,
        fontWeight: 750, letterSpacing: '.04em',
    }}>
        {/* The scope is drawn, not modeled, but it is still the frame everything
            in the diagram is read against, so it is sized and placed like any
            other block. Its floor is the system of interest plus the padding
            the template lays out around it — shrinking past that would clip the
            black box it exists to contain. */}
        <NodeResizer
            nodeId={id}
            isVisible={Boolean(selected)}
            minWidth={d.minWidth ?? 240}
            minHeight={d.minHeight ?? 140}
            color="#0F766E"
            lineStyle={{ borderWidth: 1 }}
            handleStyle={{ width: 10, height: 10, borderRadius: 2 }}
        />
        {d.label}
    </div>;
});

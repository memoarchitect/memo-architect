import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ContextNodeData extends Record<string, unknown> {
    label: string;
    kind?: string;
    category?: 'person' | 'system' | 'environment';
}

const hiddenHandle = { opacity: 0, width: 1, height: 1 };

function Handles() {
    return <>
        <Handle type="target" position={Position.Left} style={hiddenHandle} />
        <Handle type="source" position={Position.Right} style={hiddenHandle} />
        <Handle type="target" position={Position.Top} style={hiddenHandle} />
        <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </>;
}

/** The system-of-interest is deliberately a black box in a context diagram. */
export const ContextSystemNode = memo(function ContextSystemNode({ data }: NodeProps) {
    const d = data as ContextNodeData;
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', display: 'grid', placeItems: 'center',
        padding: '14px 18px', textAlign: 'center', border: '2px solid #0F766E', borderRadius: 8,
        background: '#F0FDFA', color: '#134E4A', fontSize: 15, fontWeight: 700, lineHeight: 1.25,
        boxShadow: '0 2px 7px rgba(15, 118, 110, 0.16)',
    }}>
        <span><small style={{ display: 'block', marginBottom: 5, color: '#0F766E', fontSize: 10, letterSpacing: '.08em' }}>SYSTEM OF INTEREST</small>{d.label}</span>
        <Handles />
    </div>;
});

/** An entity deliberately outside the system boundary. */
export const ContextExternalNode = memo(function ContextExternalNode({ data }: NodeProps) {
    const d = data as ContextNodeData;
    const palette = d.category === 'environment'
        ? { border: '#7C3AED', fill: '#F5F3FF', text: '#4C1D95', tag: 'ENVIRONMENT' }
        : d.category === 'person'
            ? { border: '#2563EB', fill: '#EFF6FF', text: '#1E3A8A', tag: 'ACTOR' }
            : { border: '#64748B', fill: '#F8FAFC', text: '#334155', tag: 'EXTERNAL SYSTEM' };
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', display: 'grid', placeItems: 'center',
        padding: '10px 14px', textAlign: 'center', border: `1.5px solid ${palette.border}`, borderRadius: 7,
        background: palette.fill, color: palette.text, fontSize: 13, fontWeight: 650, lineHeight: 1.25,
    }}>
        <span><small style={{ display: 'block', marginBottom: 4, color: palette.border, fontSize: 9, letterSpacing: '.07em' }}>{palette.tag}</small>{d.label}</span>
        <Handles />
    </div>;
});

/** A visual scope marker, not a semantic element and therefore non-interactive. */
export const ContextBoundaryNode = memo(function ContextBoundaryNode({ data }: NodeProps) {
    const d = data as ContextNodeData;
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', border: '2px solid #0F766E', borderRadius: 12,
        background: 'rgba(240, 253, 250, 0.34)', padding: '12px 16px', color: '#0F766E', fontSize: 12,
        fontWeight: 750, letterSpacing: '.04em',
    }}>{d.label}</div>;
});

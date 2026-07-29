import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PersonGlyph } from './PersonGlyph';

interface UseCaseData extends Record<string, unknown> { label: string; kind?: string; color?: string; side?: 'left' | 'right'; }

const hiddenHandle = { opacity: 0, width: 1, height: 1 };

export const UseCaseNode = memo(function UseCaseNode({ data }: NodeProps) {
    const d = data as UseCaseData;
    return <div style={{
        width: '100%', height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center',
        padding: '12px 22px', border: `2px solid ${d.color ?? '#E67E22'}`, borderRadius: '50%',
        background: '#FFF9F2', color: '#2D3748', fontSize: 13, fontWeight: 600, lineHeight: 1.25,
    }}>
        {d.label}
        <Handle type="target" position={Position.Left} style={hiddenHandle} />
        <Handle type="source" position={Position.Right} style={hiddenHandle} />
    </div>;
});

export const UseCaseActorNode = memo(function UseCaseActorNode({ data }: NodeProps) {
    const d = data as UseCaseData;
    const handleSide = d.side === 'right' ? Position.Left : Position.Right;
    return <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', color: '#334155', fontSize: 12, fontWeight: 600, textAlign: 'center', gap: 3,
    }}>
        <PersonGlyph color={d.color ?? '#334155'} />
        <span>{d.label}</span>
        <Handle type="source" position={handleSide} style={hiddenHandle} />
        <Handle type="target" position={handleSide} style={hiddenHandle} />
    </div>;
});

export const UseCaseBoundaryNode = memo(function UseCaseBoundaryNode({ data }: NodeProps) {
    const d = data as UseCaseData;
    return <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box', border: '1.5px solid #64748B',
        background: 'rgba(255,255,255,0.32)', padding: '10px 14px', color: '#475569', fontSize: 12, fontWeight: 700,
    }}>{d.label}</div>;
});

export const UseCaseLevelNode = memo(function UseCaseLevelNode({ data }: NodeProps) {
    const d = data as UseCaseData;
    return <div style={{ width: '100%', textAlign: 'center', color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '.03em' }}>
        {d.label}
    </div>;
});

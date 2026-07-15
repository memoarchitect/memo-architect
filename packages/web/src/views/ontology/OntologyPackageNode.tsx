// ─── OntologyPackageNode ──────────────────────────────────────────────────────
//
// Custom ReactFlow node for the ontology decomposition diagram.
// Shows package name, type badge, kind/layer counts, and miniature layer bars.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { LAYER_COLORS } from '../../constants';

export interface OntologyPackageNodeData {
    name: string;
    type: 'ontology' | 'profile' | 'extension' | 'methodology';
    version: string;
    description: string;
    kindCount: number;
    layerCount: number;
    layers: Array<{ id: string; label: string; color: string; kindCount: number }>;
    selected: boolean;
    /** Single click — zooms to this package's subtree (N-ONTO §6.2). */
    onClick: () => void;
    /** Double click — navigates to the detail panel. Optional; the inner node only invokes it if set. */
    onDoubleClick?: () => void;
    /** Right click — opens the context menu for "Open source". */
    onContextMenu?: (e: React.MouseEvent) => void;
}

const TYPE_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
    ontology:  { bg: '#EFF6FF', fg: '#2563EB', border: '#BFDBFE' },
    profile:   { bg: '#F0FDF4', fg: '#16A34A', border: '#BBF7D0' },
    extension: { bg: '#FFF7ED', fg: '#EA580C', border: '#FED7AA' },
};

function OntologyPackageNodeInner({ data }: NodeProps) {
    const d = data as unknown as OntologyPackageNodeData;
    const typeStyle = TYPE_STYLES[d.type] ?? TYPE_STYLES.ontology;

    return (
        <div
            data-testid={`ontology-package-node-${d.name}`}
            onClick={d.onClick}
            onDoubleClick={d.onDoubleClick}
            onContextMenu={d.onContextMenu}
            style={{
                background: '#FFFFFF',
                border: d.selected ? '2px solid #2563EB' : '1px solid #E5E5E0',
                borderRadius: '12px',
                padding: '16px',
                minWidth: '240px',
                maxWidth: '300px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'box-shadow 200ms ease, transform 200ms ease',
            }}
        >
            <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />

            {/* Type badge + version */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span
                    style={{
                        padding: '1px 8px',
                        fontSize: '10px',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        background: typeStyle.bg,
                        color: typeStyle.fg,
                        border: `1px solid ${typeStyle.border}`,
                    }}
                >
                    {d.type}
                </span>
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>v{d.version}</span>
            </div>

            {/* Package name */}
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                {d.name}
            </div>

            {/* Description (truncated) */}
            {d.description && (
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '10px', lineHeight: '1.4' }}>
                    {d.description.length > 80 ? d.description.slice(0, 80) + '\u2026' : d.description}
                </div>
            )}

            {/* Miniature layer bars */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                {d.layers.slice(0, 12).map(layer => {
                    const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                    return (
                        <div
                            key={layer.id}
                            style={{
                                flex: Math.max(layer.kindCount, 1),
                                background: color,
                                borderRadius: '1px',
                            }}
                            title={`${layer.label}: ${layer.kindCount} kinds`}
                        />
                    );
                })}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6B7280' }}>
                <span><strong style={{ color: '#1B3A4B' }}>{d.kindCount}</strong> kinds</span>
                <span><strong style={{ color: '#1B3A4B' }}>{d.layerCount}</strong> layers</span>
            </div>
        </div>
    );
}

const handleStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    background: '#2563EB',
    border: '2px solid #FFFFFF',
    opacity: 0,
};

export const OntologyPackageNode = memo(OntologyPackageNodeInner);

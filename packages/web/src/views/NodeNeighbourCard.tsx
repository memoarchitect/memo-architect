// ─── The card beside a clicked box ────────────────────────────────────────────
//
// What it is and what it is connected to, next to where the reader is looking. The Properties panel is for editing it.

import { useMemo } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { neighbourGroups, type NeighbourEdge } from '../lib/node-neighbours';
import { COLOR, FONT } from '../styles/tokens';
import { typeLabel } from '../lib/ontology-labels';
import { useModelStore } from '../store/model-store';

export function NodeNeighbourCard({ nodeId, edges, model, label, onPick, onClose }: {
    nodeId: string;
    edges: readonly NeighbourEdge[];
    model: MemoModelDTO | null;
    label: (id: string) => string;
    onPick: (id: string) => void;
    onClose: () => void;
}) {
    const groups = useMemo(() => neighbourGroups(nodeId, edges, label), [nodeId, edges, label]);
    const element = model?.elements[nodeId];
    return (
        <NodeToolbar nodeId={nodeId} isVisible position={Position.Right} offset={14}>
            <div data-testid="node-card" className="nowheel" style={{ width: 240, maxHeight: 320, overflowY: 'auto', background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.14)', padding: '8px 10px', fontSize: FONT.xs }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <b style={{ flex: 1, minWidth: 0, fontSize: FONT.sm, color: COLOR.primary, overflowWrap: 'anywhere' }}>{label(nodeId)}</b>
                    <button type="button" aria-label="Close this card" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLOR.muted, padding: 0 }}>×</button>
                </div>
                {element?.kind && <div style={{ color: COLOR.muted }}>{[element.shortId, typeLabel(useModelStore.getState().model, element.kind)].filter(Boolean).join(' · ')}</div>}
                {element?.doc && <p style={{ margin: '4px 0 0', color: COLOR.secondary, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{element.doc}</p>}
                {groups.length === 0 && <p style={{ margin: '6px 0 0', color: COLOR.muted }}>Not connected to anything on this diagram.</p>}
                {groups.map(group => (
                    <div key={group.heading} style={{ marginTop: 6 }}>
                        <div style={{ color: COLOR.muted, fontWeight: 600 }}>{group.heading}</div>
                        {group.items.map(item => (
                            <button key={item.id} type="button" onClick={() => onPick(item.id)} title={`Go to ${item.name}`}
                                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: '1px 0', color: COLOR.primary }}>
                                {item.name}{item.note && <span style={{ color: COLOR.muted }}> · {item.note}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </NodeToolbar>
    );
}

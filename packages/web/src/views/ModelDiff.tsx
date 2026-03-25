import { useState, useMemo, useCallback, useEffect } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import type { MemoModelDTO, MemoElement, MemoRelationship } from '@memo/core';

// ─── Diff Types ──────────────────────────────────────────────────────────────

export interface DiffResult {
    added: MemoElement[];
    removed: MemoElement[];
    changed: { element: MemoElement; changes: string[] }[];
    addedRels: MemoRelationship[];
    removedRels: MemoRelationship[];
    summary: { added: number; removed: number; changed: number; addedRels: number; removedRels: number };
}

export function computeModelDiff(before: MemoModelDTO, after: MemoModelDTO): DiffResult {
    const added: MemoElement[] = [];
    const removed: MemoElement[] = [];
    const changed: { element: MemoElement; changes: string[] }[] = [];

    // Elements
    const beforeIds = new Set(Object.keys(before.elements));
    const afterIds = new Set(Object.keys(after.elements));

    for (const id of afterIds) {
        if (!beforeIds.has(id)) {
            added.push(after.elements[id]);
        }
    }

    for (const id of beforeIds) {
        if (!afterIds.has(id)) {
            removed.push(before.elements[id]);
        }
    }

    for (const id of beforeIds) {
        if (!afterIds.has(id)) continue;
        const b = before.elements[id];
        const a = after.elements[id];
        const changes: string[] = [];
        if (b.name !== a.name) changes.push(`name: "${b.name}" → "${a.name}"`);
        if (b.kind !== a.kind) changes.push(`kind: ${b.kind} → ${a.kind}`);
        if (b.layer !== a.layer) changes.push(`layer: ${b.layer} → ${a.layer}`);
        if (b.doc !== a.doc) changes.push('doc changed');
        const bAttrs = JSON.stringify(b.attributes);
        const aAttrs = JSON.stringify(a.attributes);
        if (bAttrs !== aAttrs) changes.push('attributes changed');
        if (changes.length > 0) {
            changed.push({ element: a, changes });
        }
    }

    // Relationships
    const beforeRelIds = new Set(before.relationships.map(r => r.id));
    const afterRelIds = new Set(after.relationships.map(r => r.id));

    const addedRels = after.relationships.filter(r => !beforeRelIds.has(r.id));
    const removedRels = before.relationships.filter(r => !afterRelIds.has(r.id));

    return {
        added, removed, changed, addedRels, removedRels,
        summary: {
            added: added.length, removed: removed.length, changed: changed.length,
            addedRels: addedRels.length, removedRels: removedRels.length,
        },
    };
}

// ─── Model Diff View ────────────────────────────────────────────────────────

export function ModelDiff() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const [baselineModel, setBaselineModel] = useState<MemoModelDTO | null>(null);
    const [snapshotName, setSnapshotName] = useState('');
    const [snapshots, setSnapshots] = useState<{ name: string; model: MemoModelDTO; timestamp: number }[]>([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);
    const [diffFilter, setDiffFilter] = useState<'all' | 'added' | 'removed' | 'changed'>('all');

    // Take snapshot of current model
    const takeSnapshot = useCallback(() => {
        if (!model) return;
        const name = snapshotName.trim() || `Snapshot ${snapshots.length + 1}`;
        setSnapshots(prev => [...prev, { name, model: JSON.parse(JSON.stringify(model)), timestamp: Date.now() }]);
        setSnapshotName('');
    }, [model, snapshotName, snapshots.length]);

    // Set baseline from snapshot
    useEffect(() => {
        if (selectedSnapshot !== null && snapshots[selectedSnapshot]) {
            setBaselineModel(snapshots[selectedSnapshot].model);
        }
    }, [selectedSnapshot, snapshots]);

    const diff = useMemo(() => {
        if (!baselineModel || !model) return null;
        return computeModelDiff(baselineModel, model);
    }, [baselineModel, model]);

    const totalChanges = diff ? diff.summary.added + diff.summary.removed + diff.summary.changed : 0;

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Snapshot panel */}
            <div className="w-64 flex flex-col overflow-hidden" style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
                <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                    <h2 className="text-sm font-bold tracking-wide" style={{ color: '#2DD4A8' }}>Model Diff</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Compare model states
                    </p>
                </div>

                {/* Take snapshot */}
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={snapshotName}
                            onChange={e => setSnapshotName(e.target.value)}
                            placeholder="Snapshot name..."
                            className="flex-1 text-xs px-2 py-1.5 rounded focus:outline-none"
                            style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                            onKeyDown={e => e.key === 'Enter' && takeSnapshot()}
                        />
                        <button
                            onClick={takeSnapshot}
                            className="px-2 py-1.5 text-xs rounded font-medium"
                            style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                        >
                            Snap
                        </button>
                    </div>
                </div>

                {/* Snapshot list */}
                <div className="flex-1 overflow-y-auto text-xs py-1">
                    {snapshots.length === 0 && (
                        <div className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                            Take a snapshot to create a baseline for comparison.
                        </div>
                    )}
                    {snapshots.map((snap, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer mx-1 rounded-lg"
                            style={{
                                background: selectedSnapshot === idx ? '#2DD4A818' : 'transparent',
                                fontWeight: selectedSnapshot === idx ? 500 : 400,
                            }}
                            onMouseEnter={e => { if (selectedSnapshot !== idx) e.currentTarget.style.background = '#F0F0ED'; }}
                            onMouseLeave={e => { if (selectedSnapshot !== idx) e.currentTarget.style.background = selectedSnapshot === idx ? '#2DD4A818' : 'transparent'; }}
                            onClick={() => setSelectedSnapshot(idx)}
                        >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2DD4A8' }} />
                            <div className="flex-1 min-w-0">
                                <div className="truncate" style={{ color: '#374151' }}>{snap.name}</div>
                                <div style={{ color: '#9CA3AF', fontSize: '10px' }}>
                                    {new Date(snap.timestamp).toLocaleTimeString()} &middot; {Object.keys(snap.model.elements).length} elements
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center: Diff results */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                {!diff && (
                    <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                        <div className="text-center">
                            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>{'\u2194'}</div>
                            <div className="text-sm">Take a snapshot, then make changes to see the diff</div>
                            <div className="text-xs mt-2" style={{ color: '#D1D5DB' }}>
                                Snapshots capture the current model state for comparison
                            </div>
                        </div>
                    </div>
                )}
                {diff && (
                    <div className="max-w-3xl">
                        {/* Summary */}
                        <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-sm font-semibold" style={{ color: '#374151' }}>
                                {totalChanges === 0 ? 'No changes' : `${totalChanges} element changes`}
                            </h2>
                            {diff.summary.addedRels + diff.summary.removedRels > 0 && (
                                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                    + {diff.summary.addedRels + diff.summary.removedRels} relationship changes
                                </span>
                            )}
                        </div>

                        {/* Summary badges */}
                        <div className="flex gap-2 mb-4">
                            {[
                                { key: 'all' as const, label: 'All', count: totalChanges, color: '#6B7280' },
                                { key: 'added' as const, label: 'Added', count: diff.summary.added, color: '#2ECC71' },
                                { key: 'removed' as const, label: 'Removed', count: diff.summary.removed, color: '#E74C3C' },
                                { key: 'changed' as const, label: 'Changed', count: diff.summary.changed, color: '#F39C12' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setDiffFilter(f.key)}
                                    className="px-2.5 py-1 text-xs rounded-full font-medium"
                                    style={{
                                        background: diffFilter === f.key ? f.color + '20' : '#F3F4F6',
                                        color: diffFilter === f.key ? f.color : '#9CA3AF',
                                        border: `1px solid ${diffFilter === f.key ? f.color + '40' : '#E5E5E0'}`,
                                    }}
                                >
                                    {f.label} ({f.count})
                                </button>
                            ))}
                        </div>

                        {/* Added elements */}
                        {(diffFilter === 'all' || diffFilter === 'added') && diff.added.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#2ECC71' }}>
                                    Added ({diff.added.length})
                                </h3>
                                <div className="space-y-1">
                                    {diff.added.map(el => (
                                        <DiffRow key={el.id} element={el} type="added" onClick={() => selectElement(el.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Removed elements */}
                        {(diffFilter === 'all' || diffFilter === 'removed') && diff.removed.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#E74C3C' }}>
                                    Removed ({diff.removed.length})
                                </h3>
                                <div className="space-y-1">
                                    {diff.removed.map(el => (
                                        <DiffRow key={el.id} element={el} type="removed" onClick={() => {}} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Changed elements */}
                        {(diffFilter === 'all' || diffFilter === 'changed') && diff.changed.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#F39C12' }}>
                                    Changed ({diff.changed.length})
                                </h3>
                                <div className="space-y-1">
                                    {diff.changed.map(({ element, changes }) => (
                                        <div
                                            key={element.id}
                                            className="flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer"
                                            style={{ background: '#FFFFFF', border: '1px solid #F39C1240' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#FDF8F0')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                                            onClick={() => selectElement(element.id)}
                                        >
                                            <span className="text-xs mt-0.5" style={{ color: '#F39C12' }}>{'\u25CF'}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium truncate" style={{ color: '#374151' }}>{element.name}</span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded"
                                                        style={{ background: (LAYER_COLORS[element.layer] || '#95A5A6') + '18', color: LAYER_COLORS[element.layer] || '#95A5A6' }}>
                                                        {element.kind}
                                                    </span>
                                                </div>
                                                <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                                                    {changes.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Relationship changes */}
                        {(diff.addedRels.length > 0 || diff.removedRels.length > 0) && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                                    Relationship Changes
                                </h3>
                                <div className="space-y-1">
                                    {diff.addedRels.map(rel => (
                                        <div key={rel.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                            <span style={{ color: '#2ECC71' }}>+</span>
                                            <span style={{ color: '#374151' }}>{model?.elements[rel.sourceId]?.name || rel.sourceId}</span>
                                            <span style={{ color: '#2563EB' }}>{rel.type}</span>
                                            <span style={{ color: '#374151' }}>{model?.elements[rel.targetId]?.name || rel.targetId}</span>
                                        </div>
                                    ))}
                                    {diff.removedRels.map(rel => (
                                        <div key={rel.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                            <span style={{ color: '#E74C3C' }}>-</span>
                                            <span style={{ color: '#374151' }}>{baselineModel?.elements[rel.sourceId]?.name || rel.sourceId}</span>
                                            <span style={{ color: '#2563EB' }}>{rel.type}</span>
                                            <span style={{ color: '#374151' }}>{baselineModel?.elements[rel.targetId]?.name || rel.targetId}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {totalChanges === 0 && diff.addedRels.length === 0 && diff.removedRels.length === 0 && (
                            <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{'\u2713'}</div>
                                <div className="text-sm">No differences between snapshot and current model</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DiffRow({ element, type, onClick }: { element: MemoElement; type: 'added' | 'removed'; onClick: () => void }) {
    const colors = type === 'added'
        ? { bg: '#F0FDF4', border: '#BBF7D0', dot: '#2ECC71', hoverBg: '#DCFCE7' }
        : { bg: '#FEF2F2', border: '#FECACA', dot: '#E74C3C', hoverBg: '#FEE2E2' };

    return (
        <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            onMouseEnter={e => (e.currentTarget.style.background = colors.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = colors.bg)}
            onClick={onClick}
        >
            <span style={{ color: colors.dot }}>{'\u25CF'}</span>
            <span className="font-medium truncate" style={{ color: '#374151' }}>{element.name}</span>
            <span className="ml-auto px-1.5 py-0.5 rounded"
                style={{ background: (LAYER_COLORS[element.layer] || '#95A5A6') + '18', color: LAYER_COLORS[element.layer] || '#95A5A6' }}>
                {element.kind}
            </span>
        </div>
    );
}

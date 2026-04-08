// ─── OrphanWarningDialog ──────────────────────────────────────────────────────
//
// Modal dialog shown when a user deselects an ontology package whose kinds are
// still in use by model elements. Offers two options:
//   A: Keep as-is (elements show orphan badge)
//   B: Remap kinds via KindMappingDialog
//
// Implements Issue #157.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { OrphanedElement } from '../../types/ontology';
import { KindMappingDialog } from './KindMappingDialog';

interface OrphanWarningDialogProps {
    orphans: OrphanedElement[];
    onKeep: () => void;
    onRemap: (mappings: Record<string, string>) => void;
    onCancel: () => void;
}

export function OrphanWarningDialog({ orphans, onKeep, onRemap, onCancel }: OrphanWarningDialogProps) {
    const [showMapping, setShowMapping] = useState(false);

    // Group orphans by kind
    const byKind = new Map<string, OrphanedElement[]>();
    for (const o of orphans) {
        if (!byKind.has(o.kind)) byKind.set(o.kind, []);
        byKind.get(o.kind)!.push(o);
    }

    if (showMapping) {
        return (
            <KindMappingDialog
                kindsToRemap={[...byKind.keys()]}
                onConfirm={onRemap}
                onCancel={() => setShowMapping(false)}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div
                className="rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
            >
                {/* Header */}
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #E5E5E0', background: '#FEF2F2' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-red-500 text-lg">⚠</span>
                        <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                            Orphaned Elements
                        </h2>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                        {orphans.length} element{orphans.length !== 1 ? 's' : ''} use kinds from the deselected ontology.
                    </p>
                </div>

                {/* Orphan list */}
                <div className="px-6 py-4 max-h-48 overflow-y-auto">
                    {[...byKind.entries()].map(([kind, els]) => (
                        <div key={kind} className="mb-3">
                            <div className="text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                                {kind}
                                <span className="ml-1 font-normal" style={{ color: '#9CA3AF' }}>
                                    ({els.length} element{els.length !== 1 ? 's' : ''})
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {els.slice(0, 5).map(e => (
                                    <span
                                        key={e.elementId}
                                        className="px-1.5 py-0.5 text-xs rounded"
                                        style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}
                                    >
                                        {e.elementName}
                                    </span>
                                ))}
                                {els.length > 5 && (
                                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                        +{els.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex gap-2 justify-end" style={{ borderTop: '1px solid #E5E5E0' }}>
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs rounded-md"
                        style={{ background: '#F0F0ED', color: '#374151' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onKeep}
                        className="px-3 py-1.5 text-xs rounded-md"
                        style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}
                    >
                        Keep (mark orphaned)
                    </button>
                    <button
                        onClick={() => setShowMapping(true)}
                        className="px-3 py-1.5 text-xs rounded-md font-medium"
                        style={{ background: '#1B3A4B', color: '#FFFFFF' }}
                    >
                        Remap kinds →
                    </button>
                </div>
            </div>
        </div>
    );
}

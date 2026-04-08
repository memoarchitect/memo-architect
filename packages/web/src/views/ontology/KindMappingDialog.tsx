// ─── KindMappingDialog ────────────────────────────────────────────────────────
//
// Dialog that lets the user map orphaned kinds to kinds in currently-selected
// ontologies. Part of the orphan resolution flow (Issue #157).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../../store/model-store';

interface KindMappingDialogProps {
    kindsToRemap: string[];  // orphaned kind names
    onConfirm: (mappings: Record<string, string>) => void;
    onCancel: () => void;
}

export function KindMappingDialog({ kindsToRemap, onConfirm, onCancel }: KindMappingDialogProps) {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);

    // Collect kinds from selected ontologies
    const availableKinds = availableOntologies
        .filter(o => selectedOntologies.has(o.name))
        .flatMap(o => o.layers.flatMap(l => l.kinds.map(k => k.name)))
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();

    const [mappings, setMappings] = useState<Record<string, string>>(
        Object.fromEntries(kindsToRemap.map(k => [k, '']))
    );

    function setMapping(kind: string, target: string) {
        setMappings(prev => ({ ...prev, [kind]: target }));
    }

    const allMapped = kindsToRemap.every(k => mappings[k]);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.4)' }}
        >
            <div
                className="rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
            >
                {/* Header */}
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                        Remap Orphaned Kinds
                    </h2>
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                        Map each orphaned kind to a kind in the selected ontologies.
                        Model elements will be updated to use the new kind.
                    </p>
                </div>

                {/* Mapping rows */}
                <div className="px-6 py-4 space-y-3 max-h-64 overflow-y-auto">
                    {kindsToRemap.map(kind => (
                        <div key={kind} className="flex items-center gap-3">
                            <div
                                className="flex-1 px-2 py-1 rounded text-xs font-medium"
                                style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}
                            >
                                {kind}
                            </div>
                            <span style={{ color: '#9CA3AF' }}>→</span>
                            <select
                                value={mappings[kind]}
                                onChange={e => setMapping(kind, e.target.value)}
                                className="flex-1 text-xs rounded-md px-2 py-1 focus:outline-none"
                                style={{ border: '1px solid #E5E5E0', color: '#1a1a1a', background: '#FFFFFF' }}
                            >
                                <option value="">Select target kind…</option>
                                {availableKinds.map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
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
                        Back
                    </button>
                    <button
                        onClick={() => onConfirm(mappings)}
                        disabled={!allMapped}
                        className="px-3 py-1.5 text-xs rounded-md font-medium"
                        style={{
                            background: allMapped ? '#1B3A4B' : '#E5E5E0',
                            color: allMapped ? '#FFFFFF' : '#9CA3AF',
                            cursor: allMapped ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Apply Remapping
                    </button>
                </div>
            </div>
        </div>
    );
}

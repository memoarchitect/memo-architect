// ─── OntologyHome ──────────────────────────────────────────────────────────────
//
// Summary card for a focused ontology package — name, description, kind/layer counts.
// Rendered at the top of the detail panel.
// ─────────────────────────────────────────────────────────────────────────────

import type { OntologyPackageInfo } from '../../types/ontology';

interface OntologyHomeProps {
    ontology: OntologyPackageInfo;
}

export function OntologyHome({ ontology }: OntologyHomeProps) {
    const totalInstances = ontology.layers.reduce(
        (sum, l) => sum + l.kinds.reduce((s, k) => s + k.instanceCount, 0),
        0
    );

    return (
        <div
            className="rounded-xl p-5 mb-5"
            style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
            {/* Package type badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="px-2 py-0.5 text-xs rounded-full font-medium"
                            style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                        >
                            {ontology.type}
                        </span>
                        {ontology.extends && (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                extends {ontology.extends}
                            </span>
                        )}
                    </div>
                    <h2 className="text-base font-semibold truncate" style={{ color: '#1a1a1a' }}>
                        {ontology.name}
                    </h2>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                        v{ontology.version}
                    </div>
                </div>
            </div>

            {/* Description */}
            {ontology.description && (
                <p className="text-sm mb-4" style={{ color: '#6B7280', lineHeight: '1.5' }}>
                    {ontology.description}
                </p>
            )}

            {/* Stats row */}
            <div className="flex gap-5 text-xs" style={{ color: '#6B7280' }}>
                <div>
                    <span className="font-semibold text-sm" style={{ color: '#1B3A4B' }}>
                        {ontology.kindCount}
                    </span>{' '}
                    kinds
                </div>
                <div>
                    <span className="font-semibold text-sm" style={{ color: '#1B3A4B' }}>
                        {ontology.layers.length}
                    </span>{' '}
                    layers
                </div>
                {totalInstances > 0 && (
                    <div>
                        <span className="font-semibold text-sm" style={{ color: '#1B3A4B' }}>
                            {totalInstances}
                        </span>{' '}
                        model instances
                    </div>
                )}
            </div>
        </div>
    );
}

import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';

interface KindCompleteness {
    kind: string;
    layer: string;
    hasInstances: boolean;
    instanceCount: number;
    viewpoints: string[];
}

interface LayerCompleteness {
    layer: string;
    total: number;
    used: number;
    kinds: KindCompleteness[];
}

export function CompletenessHints() {
    const model = useModelStore(s => s.model);

    const layerCompleteness = useMemo((): LayerCompleteness[] => {
        if (!model) return [];

        // Collect all available kinds from viewpoints
        const allKinds = new Map<string, KindCompleteness>();

        // Get kinds from elements (instantiated)
        const instantiatedKinds = new Set<string>();
        const kindCounts = new Map<string, number>();
        for (const el of Object.values(model.elements)) {
            instantiatedKinds.add(el.kind);
            kindCounts.set(el.kind, (kindCounts.get(el.kind) || 0) + 1);
        }

        // Get kinds from viewpoints (full ontology)
        if (model.viewpoints) {
            for (const vp of model.viewpoints) {
                for (const k of vp.visibleKinds) {
                    if (!allKinds.has(k)) {
                        allKinds.set(k, {
                            kind: k,
                            layer: 'unknown',
                            hasInstances: instantiatedKinds.has(k),
                            instanceCount: kindCounts.get(k) || 0,
                            viewpoints: [],
                        });
                    }
                    allKinds.get(k)!.viewpoints.push(vp.label);
                }
            }
        }

        // Add instantiated kinds not in viewpoints
        for (const el of Object.values(model.elements)) {
            if (!allKinds.has(el.kind)) {
                allKinds.set(el.kind, {
                    kind: el.kind,
                    layer: el.layer,
                    hasInstances: true,
                    instanceCount: kindCounts.get(el.kind) || 0,
                    viewpoints: [],
                });
            } else {
                allKinds.get(el.kind)!.layer = el.layer;
            }
        }

        // Group by layer
        const layerMap = new Map<string, KindCompleteness[]>();
        for (const k of allKinds.values()) {
            if (!layerMap.has(k.layer)) layerMap.set(k.layer, []);
            layerMap.get(k.layer)!.push(k);
        }

        return [...layerMap.entries()]
            .map(([layer, kinds]) => ({
                layer,
                total: kinds.length,
                used: kinds.filter(k => k.hasInstances).length,
                kinds: kinds.sort((a, b) => {
                    // Sort: unused first, then by name
                    if (a.hasInstances !== b.hasInstances) return a.hasInstances ? 1 : -1;
                    return a.kind.localeCompare(b.kind);
                }),
            }))
            .filter(l => l.layer !== 'unknown')
            .sort((a, b) => {
                const pctA = a.used / a.total;
                const pctB = b.used / b.total;
                return pctA - pctB; // least complete first
            });
    }, [model]);

    const missingKinds = useMemo(() => {
        return layerCompleteness.flatMap(l => l.kinds.filter(k => !k.hasInstances));
    }, [layerCompleteness]);

    if (!model) {
        return (
            <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                <div className="text-sm">No model loaded</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            {/* Summary */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                <h2 className="text-sm font-semibold mb-2" style={{ color: '#1a1a1a' }}>What should I model next?</h2>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                    {missingKinds.length === 0
                        ? 'Your model covers all available kinds from the active ontology.'
                        : `${missingKinds.length} kinds from the active ontology have no instances yet.`}
                </p>
                {missingKinds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {missingKinds.slice(0, 10).map(k => (
                            <span
                                key={k.kind}
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                            >
                                {k.kind}
                            </span>
                        ))}
                        {missingKinds.length > 10 && (
                            <span className="px-2 py-0.5 text-xs" style={{ color: '#9CA3AF' }}>
                                +{missingKinds.length - 10} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Per-layer completeness */}
            <div className="space-y-3">
                {layerCompleteness.map(layer => {
                    const pct = layer.total > 0 ? Math.round((layer.used / layer.total) * 100) : 100;
                    const color = LAYER_COLORS[layer.layer] || '#6B7280';
                    const unused = layer.kinds.filter(k => !k.hasInstances);

                    return (
                        <div key={layer.layer} className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                            <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid #F0F0ED' }}>
                                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
                                <span className="text-sm font-medium capitalize flex-1" style={{ color: '#1a1a1a' }}>{layer.layer}</span>
                                <span className="text-xs" style={{ color: pct === 100 ? '#059669' : '#D97706' }}>
                                    {layer.used}/{layer.total} ({pct}%)
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="mx-4 mt-2 mb-2 h-1.5 rounded-full" style={{ background: '#F0F0ED' }}>
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : color }}
                                />
                            </div>
                            {/* Unused kinds */}
                            {unused.length > 0 && (
                                <div className="px-4 pb-3">
                                    <div className="text-xs mb-1.5" style={{ color: '#9CA3AF' }}>Not yet modeled:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {unused.map(k => (
                                            <span
                                                key={k.kind}
                                                className="px-2 py-0.5 text-xs rounded"
                                                style={{ background: '#FEF3C7', color: '#92400E' }}
                                            >
                                                {k.kind}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

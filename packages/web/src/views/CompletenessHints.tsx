import { useMemo, useState, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { sendLlmSuggest } from '../store/ws-client';
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
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const fetchAiSuggestions = useCallback(async () => {
        setAiLoading(true);
        setAiError(null);
        const requestId = `suggest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const suggestions = await new Promise<string[]>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmSuggest(requestId);
                setTimeout(() => reject(new Error('Request timed out.')), 60000);
            });
            setAiSuggestions(suggestions);
        } catch (e: any) {
            setAiError(e?.message ?? 'Unknown error');
        } finally {
            setAiLoading(false);
        }
    }, [registerLlmRequest]);

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
            <div className="mb-4 p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
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

            {/* AI Completeness Assistant */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: '#F0FDF9', border: '1px solid #A7F3D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px' }}>✦</span>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', margin: 0 }}>
                            AI Completeness Assistant
                        </h3>
                    </div>
                    <button
                        onClick={fetchAiSuggestions}
                        disabled={!llmAvailable || aiLoading}
                        style={{
                            padding: '3px 10px', borderRadius: '6px', border: 'none',
                            background: '#059669', color: '#fff', fontSize: '11px',
                            fontWeight: 600, cursor: 'pointer',
                            opacity: !llmAvailable || aiLoading ? 0.5 : 1,
                        }}
                    >
                        {aiLoading ? 'Thinking…' : aiSuggestions ? 'Refresh' : 'Suggest'}
                    </button>
                </div>
                {!llmAvailable && (
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>
                        Set <code style={{ background: '#D1FAE5', padding: '0 3px', borderRadius: '3px' }}>ANTHROPIC_API_KEY</code> or <code style={{ background: '#D1FAE5', padding: '0 3px', borderRadius: '3px' }}>OPENAI_API_KEY</code> to enable AI suggestions.
                    </p>
                )}
                {aiError && (
                    <p style={{ fontSize: '11px', color: '#dc2626', margin: 0 }}>{aiError}</p>
                )}
                {aiSuggestions && !aiLoading && (
                    <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {aiSuggestions.map((s, i) => (
                            <li key={i} style={{ fontSize: '12px', color: '#065F46', lineHeight: '1.5' }}>{s}</li>
                        ))}
                    </ul>
                )}
                {llmAvailable && !aiSuggestions && !aiLoading && !aiError && (
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>
                        Click <strong>Suggest</strong> to get AI-powered recommendations for your next modeling steps.
                    </p>
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

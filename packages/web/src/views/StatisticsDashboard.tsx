import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, SEMANTIC_GROUPS, KIND_TO_GROUP } from '../constants';
import type { MemoModelDTO, MemoElement } from '@memo/core';

// ─── Statistics Computation ─────────────────────────────────────────────────

interface LayerStats {
    layer: string;
    label: string;
    color: string;
    count: number;
    kinds: Map<string, number>;
}

interface RelStats {
    type: string;
    count: number;
}

interface ModelStats {
    totalElements: number;
    totalRelationships: number;
    totalDiagrams: number;
    layers: LayerStats[];
    topKinds: { kind: string; count: number; layer: string }[];
    relTypes: RelStats[];
    avgRelsPerElement: number;
    orphanCount: number;
    coverage: { layer: string; label: string; color: string; percent: number }[];
    density: number;
}

function computeStats(model: MemoModelDTO): ModelStats {
    const elements = Object.values(model.elements);
    const totalElements = elements.length;
    const totalRelationships = model.relationships.length;
    const totalDiagrams = model.diagrams?.length ?? 0;

    // Layer stats
    const layerMap = new Map<string, { count: number; kinds: Map<string, number> }>();
    for (const el of elements) {
        const entry = layerMap.get(el.layer) || { count: 0, kinds: new Map() };
        entry.count++;
        entry.kinds.set(el.kind, (entry.kinds.get(el.kind) || 0) + 1);
        layerMap.set(el.layer, entry);
    }

    const layers: LayerStats[] = LAYER_ORDER
        .filter(l => layerMap.has(l))
        .map(l => ({
            layer: l,
            label: LAYER_LABELS[l] || l,
            color: LAYER_COLORS[l] || '#95A5A6',
            count: layerMap.get(l)!.count,
            kinds: layerMap.get(l)!.kinds,
        }));

    // Also add layers not in LAYER_ORDER
    for (const [l, entry] of layerMap) {
        if (!LAYER_ORDER.includes(l as any)) {
            layers.push({
                layer: l,
                label: LAYER_LABELS[l] || l,
                color: LAYER_COLORS[l] || '#95A5A6',
                count: entry.count,
                kinds: entry.kinds,
            });
        }
    }

    // Top kinds
    const kindCounts = new Map<string, { count: number; layer: string }>();
    for (const el of elements) {
        const entry = kindCounts.get(el.kind) || { count: 0, layer: el.layer };
        entry.count++;
        kindCounts.set(el.kind, entry);
    }
    const topKinds = [...kindCounts.entries()]
        .map(([kind, { count, layer }]) => ({ kind, count, layer }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

    // Relationship types
    const relTypeCounts = new Map<string, number>();
    for (const rel of model.relationships) {
        relTypeCounts.set(rel.type, (relTypeCounts.get(rel.type) || 0) + 1);
    }
    const relTypes = [...relTypeCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

    // Orphans (elements with no relationships)
    const connected = new Set<string>();
    for (const rel of model.relationships) {
        connected.add(rel.sourceId);
        connected.add(rel.targetId);
    }
    const orphanCount = elements.filter(e => !connected.has(e.id)).length;

    // Coverage: percentage of elements per layer
    const maxCount = Math.max(...layers.map(l => l.count), 1);
    const coverage = layers.map(l => ({
        layer: l.layer,
        label: l.label,
        color: l.color,
        percent: Math.round((l.count / totalElements) * 100),
    }));

    // Density: relationships / elements
    const density = totalElements > 0 ? totalRelationships / totalElements : 0;
    const avgRelsPerElement = totalElements > 0 ? totalRelationships / totalElements : 0;

    return {
        totalElements, totalRelationships, totalDiagrams,
        layers, topKinds, relTypes,
        avgRelsPerElement: Math.round(avgRelsPerElement * 10) / 10,
        orphanCount, coverage, density: Math.round(density * 100) / 100,
    };
}

// ─── Dashboard Component ────────────────────────────────────────────────────

export function StatisticsDashboard() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const completeness = useModelStore(s => s.completeness);

    const stats = useMemo(() => model ? computeStats(model) : null, [model]);

    if (!stats) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5', color: '#9CA3AF' }}>
                <div className="text-sm">No model data</div>
            </div>
        );
    }

    const violationCount = validation?.violations?.length ?? 0;

    return (
        <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
            <div className="max-w-5xl mx-auto">
                <h2 className="text-lg font-semibold mb-1" style={{ color: '#374151' }}>Model Statistics</h2>
                <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>Quick health check for your model</p>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Elements" value={stats.totalElements} color="#1B3A4B" />
                    <StatCard label="Relationships" value={stats.totalRelationships} color="#4A90D9" />
                    <StatCard label="Diagrams" value={stats.totalDiagrams} color="#7B68EE" />
                    <StatCard label="Violations" value={violationCount} color={violationCount > 0 ? '#E74C3C' : '#2ECC71'} />
                </div>

                {/* Health indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <MetricCard
                        label="Rel. Density"
                        value={`${stats.avgRelsPerElement}`}
                        unit="per element"
                        status={stats.avgRelsPerElement >= 1.5 ? 'good' : stats.avgRelsPerElement >= 0.5 ? 'ok' : 'low'}
                    />
                    <MetricCard
                        label="Orphans"
                        value={`${stats.orphanCount}`}
                        unit="unlinked"
                        status={stats.orphanCount === 0 ? 'good' : stats.orphanCount <= 5 ? 'ok' : 'low'}
                    />
                    <MetricCard
                        label="Layers Used"
                        value={`${stats.layers.length}`}
                        unit={`of ${LAYER_ORDER.length}`}
                        status={stats.layers.length >= 6 ? 'good' : stats.layers.length >= 3 ? 'ok' : 'low'}
                    />
                    <MetricCard
                        label="Kinds Used"
                        value={`${stats.topKinds.length}`}
                        unit="types"
                        status={stats.topKinds.length >= 8 ? 'good' : stats.topKinds.length >= 4 ? 'ok' : 'low'}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Layer distribution */}
                    <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                            Elements by Layer
                        </h3>
                        <div className="space-y-2">
                            {stats.layers.map((l, idx) => (
                                <div key={`${l.layer}-${idx}`} className="flex items-center gap-2">
                                    <span className="w-20 text-xs truncate" style={{ color: '#374151' }}>{l.label}</span>
                                    <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${Math.max((l.count / stats.totalElements) * 100, 2)}%`,
                                                background: l.color,
                                                opacity: 0.8,
                                            }}
                                        />
                                    </div>
                                    <span className="w-8 text-right text-xs font-medium" style={{ color: '#374151' }}>{l.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coverage heatmap */}
                    <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                            Layer Coverage
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {LAYER_ORDER.map(l => {
                                const cov = stats.coverage.find(c => c.layer === l);
                                const pct = cov?.percent ?? 0;
                                const opacity = pct > 0 ? Math.max(0.15, pct / 100) : 0.05;
                                return (
                                    <div
                                        key={l}
                                        className="p-2 rounded-lg text-center"
                                        style={{
                                            background: `${LAYER_COLORS[l] || '#95A5A6'}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                                            border: `1px solid ${LAYER_COLORS[l] || '#95A5A6'}30`,
                                        }}
                                    >
                                        <div className="text-xs font-medium truncate" style={{ color: '#374151' }}>
                                            {LAYER_LABELS[l] || l}
                                        </div>
                                        <div className="text-lg font-bold" style={{ color: LAYER_COLORS[l] || '#95A5A6' }}>
                                            {pct}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top kinds */}
                    <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                            Top Element Types
                        </h3>
                        <div className="space-y-1">
                            {stats.topKinds.map((k, idx) => (
                                <div key={`${k.kind}-${idx}`} className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[k.layer] || '#95A5A6' }} />
                                    <span className="flex-1 truncate" style={{ color: '#374151' }}>{k.kind}</span>
                                    <span className="font-medium" style={{ color: '#6B7280' }}>{k.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Relationship types */}
                    <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                            Relationship Types
                        </h3>
                        <div className="space-y-1">
                            {stats.relTypes.map((r, idx) => (
                                <div key={`${r.type}-${idx}`} className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ background: '#4A90D9' }} />
                                    <span className="flex-1 truncate" style={{ color: '#374151' }}>{r.type}</span>
                                    <span className="font-medium" style={{ color: '#6B7280' }}>{r.count}</span>
                                </div>
                            ))}
                            {stats.relTypes.length === 0 && (
                                <div className="text-xs" style={{ color: '#9CA3AF' }}>No relationships</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ontology usage */}
                {completeness && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                            Completeness by Layer
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {completeness.layers?.map((layer: any, idx: number) => (
                                <div key={`${layer.layer}-${idx}`} className="flex items-center gap-2 text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[layer.layer] || '#95A5A6' }} />
                                    <span className="flex-1 truncate" style={{ color: '#374151' }}>{layer.layer}</span>
                                    <span className="font-medium" style={{ color: layer.completeness >= 80 ? '#2ECC71' : layer.completeness >= 50 ? '#F39C12' : '#E74C3C' }}>
                                        {Math.round(layer.completeness)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Card Components ────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
            <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
            <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{label}</div>
        </div>
    );
}

function MetricCard({ label, value, unit, status }: { label: string; value: string; unit: string; status: 'good' | 'ok' | 'low' }) {
    const statusColor = status === 'good' ? '#2ECC71' : status === 'ok' ? '#F39C12' : '#E74C3C';
    return (
        <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: `1px solid ${statusColor}30` }}>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold" style={{ color: statusColor }}>{value}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{unit}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{label}</div>
        </div>
    );
}

// ─── Diagram Palette ──────────────────────────────────────────────────────────
//
// Left sidebar showing draggable element kinds grouped by architecture layer.
// Drag a kind → drop on canvas → creates element at that position.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../constants';
import { FONT } from '../styles/tokens';
interface MethodologyScopeData {
    includedArchLayers: string[];
    excludedKinds: string[];
}

function extractScope(methodology: { folders: Array<{ parts: Record<string, Array<{ attributes: Record<string, unknown>; multiAttributes?: Record<string, unknown[]> }>> }> }): MethodologyScopeData | null {
    for (const folder of methodology.folders) {
        const scopes = folder.parts['MethodologyScope'] ?? [];
        if (scopes.length === 0) continue;
        const s = scopes[0];
        const strList = (key: string): string[] =>
            ((s.multiAttributes?.[key] as string[] | undefined) ?? [])
                .filter((v): v is string => typeof v === 'string' && v !== '');
        return {
            includedArchLayers: strList('includedArchLayer'),
            excludedKinds: strList('excludedKind'),
        };
    }
    return null;
}

const LAYER_ICONS: Record<string, string> = {
    business: '🏢', requirements: '📋', risk: '⚠️', functional: '⚙️',
    behavior: '▶️', logical: '🧩', physical: '🔧', software: '💾',
    interfaces: '🔌', verification: '✅', ui: '🖥️',
};

interface PaletteItem {
    kind: string;
    layer: string;
    construct: string;
    count: number;
}

interface DiagramPaletteProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    /** Which viewpoint/diagram is active — filters to eligible kinds */
    eligibleKinds?: Set<string>;
}

export function DiagramPalette({ collapsed, onToggleCollapse, eligibleKinds }: DiagramPaletteProps) {
    const model = useModelStore(s => s.model);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const methodology = useModelStore(s => s.methodology);
    const [search, setSearch] = useState('');
    const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

    const methodologyScope = useMemo<MethodologyScopeData | null>(() => {
        if (!methodology) return null;
        return extractScope(methodology);
    }, [methodology]);

    // Build kind list from ontology packages (with count from model)
    const byLayer = useMemo<Map<string, PaletteItem[]>>(() => {
        const map = new Map<string, PaletteItem[]>();

        // Count elements per kind
        const kindCounts = new Map<string, number>();
        if (model) {
            for (const el of Object.values(model.elements)) {
                kindCounts.set(el.kind, (kindCounts.get(el.kind) ?? 0) + 1);
            }
        }

        // Build from ontology packages
        for (const pkg of availableOntologies) {
            for (const layerInfo of pkg.layers) {
                // OntologyLayerInfo.id is the layer key (e.g. 'risk', 'functional')
                const layer = layerInfo.id;
                if (!map.has(layer)) map.set(layer, []);
                for (const kindInfo of layerInfo.kinds) {
                    if (eligibleKinds && !eligibleKinds.has(kindInfo.name)) continue;
                    if (methodologyScope) {
                        if (methodologyScope.excludedKinds.includes(kindInfo.name)) continue;
                        if (methodologyScope.includedArchLayers.length > 0
                            && !methodologyScope.includedArchLayers.includes(layer)) continue;
                    }
                    const existing = map.get(layer)!.find(k => k.kind === kindInfo.name);
                    if (!existing) {
                        map.get(layer)!.push({
                            kind: kindInfo.name,
                            layer: kindInfo.layer || layer,
                            construct: kindInfo.construct ?? 'part',
                            count: kindCounts.get(kindInfo.name) ?? 0,
                        });
                    }
                }
            }
        }

        // Fallback: if no ontology packages, infer from model
        if (map.size === 0 && model) {
            const kindLayer = new Map<string, { layer: string; construct: string }>();
            for (const el of Object.values(model.elements)) {
                if (!kindLayer.has(el.kind)) {
                    kindLayer.set(el.kind, { layer: el.layer, construct: el.construct ?? 'part' });
                }
            }
            for (const [kind, { layer, construct }] of kindLayer) {
                if (!map.has(layer)) map.set(layer, []);
                map.get(layer)!.push({ kind, layer, construct, count: kindCounts.get(kind) ?? 0 });
            }
        }

        // Sort kinds alphabetically per layer
        for (const items of map.values()) {
            items.sort((a, b) => a.kind.localeCompare(b.kind));
        }

        return map;
    }, [model, availableOntologies, eligibleKinds, methodologyScope]);

    const layers = LAYER_ORDER.filter(l => byLayer.has(l));

    const toggleLayer = (layer: string) => {
        setCollapsedLayers(prev => {
            const next = new Set(prev);
            if (next.has(layer)) next.delete(layer);
            else next.add(layer);
            return next;
        });
    };

    const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
        e.dataTransfer.setData('application/memo-kind', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    if (collapsed) {
        return (
            <div
                className="flex flex-col items-center py-2 gap-1 cursor-pointer"
                style={{ width: 36, borderRight: '1px solid #E5E5E0', background: '#FAFAF8', flexShrink: 0 }}
                onClick={onToggleCollapse}
                title="Expand palette"
            >
                {layers.slice(0, 8).map(layer => (
                    <div
                        key={layer}
                        title={LAYER_LABELS[layer] ?? layer}
                        style={{
                            width: 20, height: 20, borderRadius: 4,
                            background: (LAYER_COLORS[layer] ?? '#6B7280') + '22',
                            border: `2px solid ${LAYER_COLORS[layer] ?? '#6B7280'}`,
                            fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {LAYER_ICONS[layer] ?? '○'}
                    </div>
                ))}
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 4, writingMode: 'vertical-rl' }}>
                    Palette
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col overflow-hidden"
            style={{ width: 200, borderRight: '1px solid #E5E5E0', background: '#FAFAF8', flexShrink: 0 }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid #E5E5E0', flexShrink: 0 }}
            >
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>Elements</span>
                <button
                    onClick={onToggleCollapse}
                    title="Collapse palette"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '14px', lineHeight: 1 }}
                >
                    ‹
                </button>
            </div>

            {/* Search */}
            <div className="px-2 pt-2 pb-1" style={{ flexShrink: 0 }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search kinds…"
                    className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{
                        fontSize: FONT.xs, background: '#F0F0ED',
                        border: '1px solid #E5E5E0', color: '#374151',
                    }}
                />
            </div>

            {/* Layer groups */}
            <div className="flex-1 overflow-y-auto py-1">
                {layers.map(layer => {
                    const items = (byLayer.get(layer) ?? []).filter(
                        item => !search || item.kind.toLowerCase().includes(search.toLowerCase())
                    );
                    if (items.length === 0) return null;
                    const color = LAYER_COLORS[layer] ?? '#6B7280';
                    const isCollapsed = collapsedLayers.has(layer);

                    return (
                        <div key={layer}>
                            {/* Layer header */}
                            <button
                                onClick={() => toggleLayer(layer)}
                                className="w-full flex items-center gap-1.5 px-2 py-1"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <span style={{ fontSize: '10px', color }}>{isCollapsed ? '▶' : '▼'}</span>
                                <span style={{ fontSize: '9px', color, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {LAYER_LABELS[layer] ?? layer}
                                </span>
                                <span style={{ fontSize: '9px', color: '#9CA3AF', marginLeft: 'auto' }}>{items.length}</span>
                            </button>

                            {!isCollapsed && items.map(item => (
                                <div
                                    key={item.kind}
                                    draggable
                                    onDragStart={e => onDragStart(e, item)}
                                    className="flex items-center gap-2 px-3 py-1 cursor-grab select-none"
                                    style={{ fontSize: FONT.xs }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#EEF0EC'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    title={`Drag to create ${item.kind}`}
                                >
                                    {/* Kind color dot */}
                                    <div style={{
                                        width: 8, height: 8, borderRadius: 2,
                                        background: color, flexShrink: 0,
                                    }} />
                                    <span className="truncate flex-1" style={{ color: '#374151' }}>{item.kind}</span>
                                    {item.count > 0 && (
                                        <span style={{ fontSize: '9px', color: '#9CA3AF' }}>{item.count}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
                {layers.length === 0 && (
                    <div className="p-3 text-center" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>
                        No kinds available
                    </div>
                )}
            </div>

            {/* Drag hint */}
            <div
                className="px-3 py-1.5"
                style={{ borderTop: '1px solid #E5E5E0', fontSize: '9px', color: '#9CA3AF', flexShrink: 0 }}
            >
                Drag to canvas to create
            </div>
        </div>
    );
}

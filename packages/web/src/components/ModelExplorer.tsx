import { useState, useMemo } from 'react';
import { useModelStore, getElementsByLayer } from '../store/model-store';
import { LAYER_COLORS, LAYER_ORDER } from '../constants';
import type { MemoElement } from '@memo/core';

export function ModelExplorer() {
    const model = useModelStore(s => s.model);
    const searchTerm = useModelStore(s => s.searchTerm);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const toggleLayerVisibility = useModelStore(s => s.toggleLayerVisibility);
    const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

    const byLayer = useMemo(() => getElementsByLayer(model), [model]);

    const sortedLayers = useMemo(() => {
        const layers = [...byLayer.keys()].sort((a, b) => {
            const ai = LAYER_ORDER.indexOf(a as any);
            const bi = LAYER_ORDER.indexOf(b as any);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        return layers;
    }, [byLayer]);

    const toggleLayer = (layer: string) => {
        setCollapsedLayers(prev => {
            const next = new Set(prev);
            if (next.has(layer)) next.delete(layer);
            else next.add(layer);
            return next;
        });
    };

    const filterElements = (elements: MemoElement[]): MemoElement[] => {
        if (!searchTerm) return elements;
        const lower = searchTerm.toLowerCase();
        return elements.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.kind.toLowerCase().includes(lower) ||
            e.id.toLowerCase().includes(lower)
        );
    };

    return (
        <div className="text-xl py-1">
            {sortedLayers.map(layer => {
                const elements = filterElements(byLayer.get(layer) || []);
                if (elements.length === 0) return null;

                const color = LAYER_COLORS[layer] || '#666';
                const collapsed = collapsedLayers.has(layer);
                const isHidden = hiddenLayers.has(layer);

                // Group by kind within layer
                const byKind = new Map<string, MemoElement[]>();
                for (const el of elements) {
                    if (!byKind.has(el.kind)) byKind.set(el.kind, []);
                    byKind.get(el.kind)!.push(el);
                }

                return (
                    <div key={layer} className="mb-0.5">
                        {/* Layer header */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
                            style={{ borderRadius: '6px', margin: '0 4px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => toggleLayer(layer)}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded flex-shrink-0"
                                style={{ backgroundColor: color, borderRadius: '3px', opacity: isHidden ? 0.3 : 1 }}
                            />
                            <span className="font-medium capitalize flex-1" style={{ color: '#374151', opacity: isHidden ? 0.4 : 1 }}>
                                {layer}
                            </span>
                            {/* Layer visibility toggle */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLayerVisibility(layer);
                                }}
                                className="px-1 rounded transition-colors"
                                style={{ color: isHidden ? '#D1D5DB' : '#9CA3AF', fontSize: '10px' }}
                                title={isHidden ? 'Show layer on diagram' : 'Hide layer from diagram'}
                            >
                                {isHidden ? '○' : '●'}
                            </button>
                            <span style={{ color: '#9CA3AF' }}>{elements.length}</span>
                            <span style={{ color: '#D1D5DB' }}>{collapsed ? '▸' : '▾'}</span>
                        </div>

                        {/* Elements grouped by kind */}
                        {!collapsed && [...byKind.entries()].map(([kind, kindElements]) => (
                            <div key={kind} className="ml-4">
                                <div className="px-3 py-0.5 font-medium" style={{ color: '#9CA3AF' }}>{kind}</div>
                                {kindElements.map(el => (
                                    <div
                                        key={el.id}
                                        className="px-3 py-1 ml-2 cursor-pointer flex items-center gap-1.5 transition-colors"
                                        style={{
                                            borderRadius: '6px',
                                            background: selectedElementId === el.id ? '#2DD4A8' + '18' : 'transparent',
                                            color: selectedElementId === el.id ? '#1B3A4B' : '#374151',
                                            fontWeight: selectedElementId === el.id ? 500 : 400,
                                        }}
                                        onMouseEnter={e => {
                                            if (selectedElementId !== el.id) e.currentTarget.style.background = '#F0F0ED';
                                        }}
                                        onMouseLeave={e => {
                                            if (selectedElementId !== el.id) e.currentTarget.style.background = 'transparent';
                                        }}
                                        onClick={() => selectElement(el.id)}
                                        title={el.doc || el.id}
                                    >
                                        <span className="truncate">{el.name}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

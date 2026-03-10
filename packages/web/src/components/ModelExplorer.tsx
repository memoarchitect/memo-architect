import { useState, useMemo } from 'react';
import { useModelStore, getElementsByLayer } from '../store/model-store';
import type { MemoElement } from '@memo/core';

const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

const LAYER_ORDER = [
    'business', 'requirements', 'risk', 'functional', 'logical',
    'physical', 'software', 'interfaces', 'verification', 'ui',
];

export function ModelExplorer() {
    const model = useModelStore(s => s.model);
    const searchTerm = useModelStore(s => s.searchTerm);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

    const byLayer = useMemo(() => getElementsByLayer(model), [model]);

    const sortedLayers = useMemo(() => {
        const layers = [...byLayer.keys()].sort((a, b) => {
            const ai = LAYER_ORDER.indexOf(a);
            const bi = LAYER_ORDER.indexOf(b);
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
        <div className="text-xs">
            {sortedLayers.map(layer => {
                const elements = filterElements(byLayer.get(layer) || []);
                if (elements.length === 0) return null;

                const color = LAYER_COLORS[layer] || '#666';
                const collapsed = collapsedLayers.has(layer);

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
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-700/50"
                            onClick={() => toggleLayer(layer)}
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-slate-300 capitalize flex-1">{layer}</span>
                            <span className="text-slate-500">{elements.length}</span>
                            <span className="text-slate-600">{collapsed ? '▸' : '▾'}</span>
                        </div>

                        {/* Elements grouped by kind */}
                        {!collapsed && [...byKind.entries()].map(([kind, kindElements]) => (
                            <div key={kind} className="ml-4">
                                <div className="px-3 py-0.5 text-slate-500 font-medium">{kind}</div>
                                {kindElements.map(el => (
                                    <div
                                        key={el.id}
                                        className={`px-3 py-1 ml-2 cursor-pointer rounded-sm hover:bg-slate-700/50 flex items-center gap-1.5 ${
                                            selectedElementId === el.id ? 'bg-rose-500/20 text-rose-300' : ''
                                        }`}
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

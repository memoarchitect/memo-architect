import { useState } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_LABELS } from '../constants';

export function CompletenessBar() {
    const completeness = useModelStore(s => s.completeness);
    const [showLegend, setShowLegend] = useState(false);

    if (!completeness) {
        return (
            <div className="h-9 flex items-center px-4" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Loading completeness...</span>
            </div>
        );
    }

    const visibleLayers = completeness.layers.filter(l => l.totalElements > 0);

    return (
        <div className="relative">
            <div
                className="h-9 flex items-center cursor-pointer"
                style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}
                onClick={() => setShowLegend(!showLegend)}
            >
                {/* Overall percentage */}
                <div className="px-4 flex items-center gap-2 h-full" style={{ borderRight: '1px solid #E5E5E0' }}>
                    <span className="text-xs font-semibold" style={{ color: '#1B3A4B' }}>
                        {completeness.overall}%
                    </span>
                </div>

                {/* Per-layer segments */}
                <div className="flex-1 flex items-center h-full px-3 gap-1">
                    {visibleLayers.map(layer => {
                        const width = Math.max(
                            (layer.totalElements / completeness.totalElements) * 100,
                            2
                        );
                        return (
                            <div
                                key={layer.layerId}
                                className="relative h-3 overflow-hidden group"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: layer.layerColor + '20',
                                    borderRadius: '6px',
                                }}
                                title={`${LAYER_LABELS[layer.layerId] || layer.layerLabel}: ${layer.percentage}% complete (${layer.completeElements}/${layer.totalElements} elements)`}
                            >
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${layer.percentage}%`,
                                        backgroundColor: layer.layerColor,
                                        borderRadius: '6px',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div className="px-4 text-xs h-full flex items-center gap-2" style={{ color: '#9CA3AF', borderLeft: '1px solid #E5E5E0' }}>
                    <span>{completeness.completeElements}/{completeness.totalElements}</span>
                    <span style={{ fontSize: '10px' }}>{showLegend ? '\u25B4' : '\u25BE'}</span>
                </div>
            </div>

            {/* Expanded legend */}
            {showLegend && (
                <div
                    className="absolute z-20 left-0 right-0 px-4 py-3"
                    style={{
                        background: '#FFFFFF',
                        borderBottom: '1px solid #E5E5E0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                >
                    <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
                        Model Completeness by Layer
                    </div>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                        {visibleLayers.map(layer => (
                            <div key={layer.layerId} className="flex items-center gap-2 text-xs">
                                <span
                                    className="w-2.5 h-2.5 rounded flex-shrink-0"
                                    style={{ backgroundColor: layer.layerColor }}
                                />
                                <span className="flex-1 truncate" style={{ color: '#374151' }}>
                                    {LAYER_LABELS[layer.layerId] || layer.layerLabel}
                                </span>
                                <span style={{ color: '#6B7280' }}>
                                    {layer.percentage}%
                                </span>
                                <span style={{ color: '#9CA3AF' }}>
                                    ({layer.completeElements}/{layer.totalElements})
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: '#D1D5DB' }}>
                        Each colored bar shows the proportion and completion of elements in that layer.
                        Click to close.
                    </div>
                </div>
            )}
        </div>
    );
}

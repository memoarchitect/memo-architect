import { useState } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_LABELS } from '../constants';

export function CompletenessBar() {
    const completeness = useModelStore(s => s.completeness);
    const [expanded, setExpanded] = useState(false);

    if (!completeness) return null;

    const visibleLayers = completeness.layers.filter(l => l.totalElements > 0);

    // Collapsed: just a small clickable tab showing percentage
    if (!expanded) {
        return (
            <div
                className="flex items-center gap-2 cursor-pointer"
                style={{
                    height: '24px',
                    background: '#FFFFFF',
                    borderBottom: '1px solid #E5E5E0',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                }}
                onClick={() => setExpanded(true)}
                title="Click to expand completeness details"
            >
                <span className="text-xs font-semibold" style={{ color: '#1B3A4B' }}>
                    {completeness.overall}%
                </span>

                {/* Mini segments */}
                <div className="flex-1 flex items-center gap-0.5" style={{ maxWidth: '400px' }}>
                    {visibleLayers.map(layer => {
                        const width = Math.max(
                            (layer.totalElements / completeness.totalElements) * 100,
                            3
                        );
                        return (
                            <div
                                key={layer.layerId}
                                className="relative overflow-hidden"
                                style={{
                                    width: `${width}%`,
                                    height: '4px',
                                    backgroundColor: layer.layerColor + '20',
                                    borderRadius: '2px',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${layer.percentage}%`,
                                        height: '100%',
                                        backgroundColor: layer.layerColor,
                                        borderRadius: '2px',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {completeness.completeElements}/{completeness.totalElements}
                </span>
                <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{'\u25BE'}</span>
            </div>
        );
    }

    // Expanded: full bar with per-layer details
    return (
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
            {/* Summary row */}
            <div
                className="flex items-center cursor-pointer"
                style={{ height: '32px', paddingLeft: '12px', paddingRight: '12px' }}
                onClick={() => setExpanded(false)}
            >
                <div className="flex items-center gap-2" style={{ borderRight: '1px solid #E5E5E0', paddingRight: '12px', height: '100%' }}>
                    <span className="text-xs font-semibold" style={{ color: '#1B3A4B' }}>
                        {completeness.overall}%
                    </span>
                </div>

                <div className="flex-1 flex items-center h-full px-3 gap-1">
                    {visibleLayers.map(layer => {
                        const width = Math.max(
                            (layer.totalElements / completeness.totalElements) * 100,
                            2
                        );
                        return (
                            <div
                                key={layer.layerId}
                                className="relative h-3 overflow-hidden"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: layer.layerColor + '20',
                                    borderRadius: '6px',
                                }}
                                title={`${LAYER_LABELS[layer.layerId] || layer.layerLabel}: ${layer.percentage}% (${layer.completeElements}/${layer.totalElements})`}
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

                <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF', borderLeft: '1px solid #E5E5E0', paddingLeft: '12px', height: '100%' }}>
                    <span>{completeness.completeElements}/{completeness.totalElements}</span>
                    <span style={{ fontSize: '10px' }}>{'\u25B4'}</span>
                </div>
            </div>

            {/* Per-layer details */}
            <div className="px-4 pb-3 pt-1">
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
            </div>
        </div>
    );
}

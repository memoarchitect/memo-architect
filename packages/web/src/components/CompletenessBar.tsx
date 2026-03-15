import { useModelStore } from '../store/model-store';

export function CompletenessBar() {
    const completeness = useModelStore(s => s.completeness);

    if (!completeness) {
        return (
            <div className="h-9 flex items-center px-4" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Loading completeness...</span>
            </div>
        );
    }

    const visibleLayers = completeness.layers.filter(l => l.totalElements > 0);

    return (
        <div className="h-9 flex items-center" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
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
                            className="relative h-3 overflow-hidden"
                            style={{
                                width: `${width}%`,
                                backgroundColor: layer.layerColor + '20',
                                borderRadius: '6px',
                            }}
                            title={`${layer.layerLabel}: ${layer.percentage}% (${layer.completeElements}/${layer.totalElements})`}
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
            <div className="px-4 text-xs h-full flex items-center" style={{ color: '#9CA3AF', borderLeft: '1px solid #E5E5E0' }}>
                {completeness.completeElements}/{completeness.totalElements}
            </div>
        </div>
    );
}

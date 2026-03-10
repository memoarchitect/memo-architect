import { useModelStore } from '../store/model-store';

export function CompletenessBar() {
    const completeness = useModelStore(s => s.completeness);

    if (!completeness) {
        return (
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4">
                <span className="text-xs text-slate-500">Loading completeness...</span>
            </div>
        );
    }

    const visibleLayers = completeness.layers.filter(l => l.totalElements > 0);

    return (
        <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center">
            {/* Overall */}
            <div className="px-3 flex items-center gap-2 border-r border-slate-700 h-full">
                <span className="text-xs font-semibold text-slate-300">
                    {completeness.overall}%
                </span>
            </div>

            {/* Per-layer segments */}
            <div className="flex-1 flex items-center h-full px-2 gap-px">
                {visibleLayers.map(layer => {
                    const width = Math.max(
                        (layer.totalElements / completeness.totalElements) * 100,
                        2
                    );
                    return (
                        <div
                            key={layer.layerId}
                            className="relative h-4 rounded-sm overflow-hidden"
                            style={{ width: `${width}%`, backgroundColor: layer.layerColor + '33' }}
                            title={`${layer.layerLabel}: ${layer.percentage}% (${layer.completeElements}/${layer.totalElements})`}
                        >
                            <div
                                className="h-full rounded-sm transition-all duration-500"
                                style={{
                                    width: `${layer.percentage}%`,
                                    backgroundColor: layer.layerColor,
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="px-3 text-xs text-slate-500 border-l border-slate-700 h-full flex items-center">
                {completeness.completeElements}/{completeness.totalElements}
            </div>
        </div>
    );
}

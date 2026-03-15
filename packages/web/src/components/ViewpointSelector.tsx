import { useModelStore } from '../store/model-store';

export function ViewpointSelector() {
    const model = useModelStore(s => s.model);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);

    const viewpoints = model?.viewpoints ?? [];

    const pillBase = 'px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer';

    return (
        <div className="px-3 py-2 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
            <button
                onClick={() => selectViewpoint(null)}
                className={pillBase}
                style={
                    selectedViewpointId === null
                        ? { background: '#1B3A4B', color: '#2DD4A8' }
                        : { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' }
                }
            >
                All
            </button>
            {viewpoints.map(vp => (
                <button
                    key={vp.id}
                    onClick={() => selectViewpoint(vp.id)}
                    className={pillBase}
                    style={
                        selectedViewpointId === vp.id
                            ? { background: '#1B3A4B', color: '#2DD4A8' }
                            : { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' }
                    }
                >
                    {vp.label}
                </button>
            ))}
        </div>
    );
}

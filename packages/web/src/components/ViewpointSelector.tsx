import { useModelStore } from '../store/model-store';

export function ViewpointSelector() {
    const model = useModelStore(s => s.model);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);

    const viewpoints = model?.viewpoints ?? [];

    return (
        <div className="px-3 py-1.5 border-b border-slate-700 flex flex-wrap gap-1">
            <button
                onClick={() => selectViewpoint(null)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    selectedViewpointId === null
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
                }`}
            >
                All
            </button>
            {viewpoints.map(vp => (
                <button
                    key={vp.id}
                    onClick={() => selectViewpoint(vp.id)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        selectedViewpointId === vp.id
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                            : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}
                >
                    {vp.label}
                </button>
            ))}
        </div>
    );
}

import { useModelStore } from '../store/model-store';

// Hardcoded viewpoints matching the medical config (for MVP)
// In production, these come from the config sent via WebSocket
const VIEWPOINTS = [
    { id: null, label: 'All' },
    { id: 'risk-overview', label: 'Risk' },
    { id: 'requirements-trace', label: 'Requirements' },
    { id: 'architecture-view', label: 'Architecture' },
    { id: 'software-view', label: 'Software' },
    { id: 'physical-view', label: 'Physical' },
    { id: 'v-and-v', label: 'V&V' },
    { id: 'use-case-view', label: 'Use Cases' },
];

export function ViewpointSelector() {
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);

    return (
        <div className="px-3 py-1.5 border-b border-slate-700 flex flex-wrap gap-1">
            {VIEWPOINTS.map(vp => (
                <button
                    key={vp.id ?? 'all'}
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

import { useModelStore, type AppMode } from '../store/model-store';

const MODES: { id: AppMode; label: string; icon: string }[] = [
    { id: 'catalog', label: 'Model Explorer', icon: '\u2630' },
    { id: 'diagram', label: 'Diagram', icon: '\u25A6' },
    { id: 'scenario', label: 'Scenarios', icon: '\u25B6' },
    { id: 'ontology', label: 'Ontology', icon: '\u25C9' },
];

export function ModeSwitcher() {
    const activeMode = useModelStore(s => s.activeMode);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const model = useModelStore(s => s.model);

    // Element count
    const count = model ? Object.keys(model.elements).length : 0;

    return (
        <div
            className="flex items-center gap-1 px-3 py-1.5"
            style={{ background: '#1B3A4B', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
            {/* Logo */}
            <span className="text-xs font-bold mr-2" style={{ color: '#2DD4A8', letterSpacing: '0.08em' }}>memo</span>

            {MODES.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id)}
                    className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                    style={
                        activeMode === mode.id
                            ? { background: 'rgba(45, 212, 168, 0.15)', color: '#2DD4A8' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                    }
                    title={mode.label}
                >
                    <span className="mr-1.5">{mode.icon}</span>
                    {mode.label}
                </button>
            ))}

            <div className="flex-1" />

            {/* Element count */}
            <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {count} elements
            </span>
        </div>
    );
}

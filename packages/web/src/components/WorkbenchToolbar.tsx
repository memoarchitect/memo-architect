import { useModelStore } from '../store/model-store';

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    return (
        <div
            className="flex items-center gap-2 px-5 py-2"
            style={{ background: '#0B1E2D', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}
        >
            <span className="text-sm font-bold" style={{ color: '#2DD4A8', letterSpacing: '0.04em' }}>
                MEMO Architect
            </span>
            {model && (
                <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {elementCount} elements &middot; {relCount} relationships
                </span>
            )}

            <div className="flex-1" />

            <img
                src="/logo.png"
                alt="MEMO"
                style={{ height: 40, opacity: 0.9 }}
            />
        </div>
    );
}

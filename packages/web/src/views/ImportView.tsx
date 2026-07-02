import { useModelStore } from '../store/model-store';

interface ImportOption {
    icon: string;
    title: string;
    description: string;
    action: () => void;
    requiresConnection?: boolean;
}

export function ImportView() {
    const setBulkImportOpen = useModelStore(s => s.setBulkImportOpen);
    const connected = useModelStore(s => s.connected);

    const options: ImportOption[] = [
        {
            icon: '📄',
            title: 'Import Elements from CSV',
            description: 'Import model elements from a CSV or tab-separated file. Supports column mapping, artifact type presets, and batch preview before committing.',
            action: () => setBulkImportOpen(true),
            requiresConnection: true,
        },
    ];

    return (
        <div
            style={{
                flex: 1, overflow: 'auto', padding: '40px 48px',
                background: 'linear-gradient(135deg, #F0F4F7 0%, #E8EFF3 100%)',
                minHeight: 0,
            }}
        >
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1B3A4B', marginBottom: 6 }}>
                    Import
                </h1>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: 36 }}>
                    Bring data into your model from external sources.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {options.map((opt) => {
                        const disabled = opt.requiresConnection && !connected;
                        return (
                            <button
                                key={opt.title}
                                onClick={disabled ? undefined : opt.action}
                                disabled={disabled}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 20,
                                    padding: '20px 24px', borderRadius: 12, textAlign: 'left',
                                    background: disabled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.75)',
                                    border: `1px solid ${disabled ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)'}`,
                                    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    opacity: disabled ? 0.55 : 1,
                                }}
                                onMouseEnter={e => {
                                    if (!disabled) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!disabled) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.75)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                        e.currentTarget.style.transform = 'none';
                                    }
                                }}
                            >
                                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{opt.icon}</div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1B3A4B', marginBottom: 4 }}>
                                        {opt.title}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.55 }}>
                                        {opt.description}
                                    </div>
                                    {disabled && (
                                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: 8 }}>
                                            Connect to the dev server to use this import.
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

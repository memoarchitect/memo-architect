// ─── RestartRequiredBanner ────────────────────────────────────────────────────
//
// Blocking overlay shown when the server signals app:restart-required.
// Prevents stale ontology state from silently corrupting the model view.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from '../store/model-store';

export function RestartRequiredBanner() {
    const restartRequired = useModelStore(s => s.restartRequired);
    if (!restartRequired) return null;

    const closureFailure = restartRequired.reason === 'dependency-closure-uncomputable';
    const transactionFailure = restartRequired.reason === 'transaction-independence-uncomputable';
    const label = closureFailure
        ? 'Dependency closure could not be rebuilt'
        : transactionFailure
            ? 'Concurrent writes could not be distinguished'
        : restartRequired.reason === 'ontology-selection-changed'
            ? 'Ontology selection changed'
            : 'Ontology source changed';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                style={{
                    background: '#1E293B',
                    border: '1px solid #F59E0B',
                    borderRadius: '12px',
                    padding: '32px 40px',
                    maxWidth: '480px',
                    width: '90%',
                    textAlign: 'center',
                    color: '#F8FAFC',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: '#F59E0B' }}>
                    Restart Required
                </div>
                <div style={{ fontSize: '0.875rem', color: '#CBD5E1', marginBottom: '4px' }}>
                    {label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '24px', fontFamily: 'monospace' }}>
                    {restartRequired.changedFile}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#E2E8F0', marginBottom: '24px', lineHeight: 1.6 }}>
                    {restartRequired.instruction}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#FBBF24' }} role="status">
                    {closureFailure ? 'Model mutations are locked — Relaunch Memo Architect after fixing the source.' : 'Reconnecting to the rebuilt runtime…'}
                </div>
            </div>
        </div>
    );
}

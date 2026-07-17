// ─── OntologyLibraryPanel ─────────────────────────────────────────────────────
//
// Dialog/panel for managing the ontology library. Shows installed packages
// and allows adding new ontologies from git URLs or npm packages.
// Accessible from the decomposition landing page toolbar.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../../store/model-store';
import { sendOntologyInstall, sendOntologyRemove } from '../../store/ws-client';

interface OntologyLibraryPanelProps {
    onClose: () => void;
}

export function OntologyLibraryPanel({ onClose }: OntologyLibraryPanelProps) {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const installStatus = useModelStore(s => s.ontologyInstallStatus);
    const setInstallStatus = useModelStore(s => s.setOntologyInstallStatus);

    const [source, setSource] = useState('');
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    function handleInstall() {
        if (!source.trim()) return;
        setInstallStatus({ installing: true });
        sendOntologyInstall(source.trim());
        setSource('');
    }

    function handleRemove(packageName: string) {
        sendOntologyRemove(packageName);
        setConfirmRemove(null);
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
        >
            <div
                className="rounded-xl shadow-2xl overflow-hidden"
                style={{ background: '#FFFFFF', width: '520px', maxHeight: '600px', border: '1px solid #E5E5E0' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Manage Ontology Library</h2>
                    <button onClick={onClose} className="text-sm px-2 py-0.5 rounded hover:bg-gray-100" style={{ color: '#9CA3AF' }}>x</button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: '480px' }}>
                    {/* Add ontology form */}
                    <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: '#374151' }}>
                            Add Ontology
                        </label>
                        <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                            Enter a git URL (https://...git), npm package name (@memoarchitect/...), or local path.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="https://gitlab.com/org/my-ontology.git"
                                value={source}
                                onChange={e => setSource(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleInstall()}
                                className="flex-1 px-3 py-2 text-xs rounded-lg"
                                style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', outline: 'none' }}
                                onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                                onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                                disabled={installStatus.installing}
                            />
                            <button
                                onClick={handleInstall}
                                disabled={!source.trim() || installStatus.installing}
                                className="px-4 py-2 text-xs rounded-lg font-medium"
                                style={{
                                    background: installStatus.installing ? '#9CA3AF' : '#1B3A4B',
                                    color: '#FFFFFF',
                                    opacity: !source.trim() || installStatus.installing ? 0.5 : 1,
                                    cursor: !source.trim() || installStatus.installing ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {installStatus.installing ? 'Installing...' : 'Install'}
                            </button>
                        </div>

                        {/* Status messages */}
                        {installStatus.error && (
                            <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                                {installStatus.error}
                            </div>
                        )}
                        {installStatus.lastInstalled && !installStatus.error && (
                            <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                                Installed {installStatus.lastInstalled}
                            </div>
                        )}
                    </div>

                    {/* Installed packages */}
                    <div>
                        <label className="text-xs font-medium block mb-2" style={{ color: '#374151' }}>
                            Installed Packages ({availableOntologies.length})
                        </label>
                        <div className="space-y-1.5">
                            {availableOntologies.map(pkg => (
                                <div
                                    key={pkg.name}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                                    style={{ border: '1px solid #E5E5E0', background: '#FAFAF8' }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium truncate" style={{ color: '#1a1a1a' }}>
                                                {pkg.name}
                                            </span>
                                            <span
                                                className="px-1.5 py-0.5 text-xs rounded"
                                                style={{
                                                    background: pkg.type === 'ontology' ? '#EFF6FF' : pkg.type === 'profile' ? '#F0FDF4' : '#FFF7ED',
                                                    color: pkg.type === 'ontology' ? '#2563EB' : pkg.type === 'profile' ? '#16A34A' : '#EA580C',
                                                    fontSize: '10px',
                                                }}
                                            >
                                                {pkg.type}
                                            </span>
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                                            v{pkg.version} &middot; {pkg.kindCount} kinds &middot; {pkg.layers.length} layers
                                        </div>
                                    </div>

                                    {/* Remove button (only for memo_packages — workspace packages can't be removed) */}
                                    {confirmRemove === pkg.name ? (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleRemove(pkg.name)}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{ background: '#DC2626', color: '#FFFFFF' }}
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setConfirmRemove(null)}
                                                className="px-2 py-1 text-xs rounded"
                                                style={{ background: '#F3F4F6', color: '#374151' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmRemove(pkg.name)}
                                            className="text-xs px-2 py-1 rounded hover:bg-red-50"
                                            style={{ color: '#DC2626', border: '1px solid #FECACA' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}

                            {availableOntologies.length === 0 && (
                                <div className="text-center py-6 text-xs" style={{ color: '#9CA3AF' }}>
                                    No ontology packages installed
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

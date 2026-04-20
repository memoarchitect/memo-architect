import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';

interface ExtensionInfo {
    name: string;
    kindCount: number;
    active: boolean;
}

/**
 * Extension browser showing active ontology packages and their kind counts.
 * In future, this will support activating/deactivating extensions per project.
 */
export function ExtensionBrowser() {
    const model = useModelStore(s => s.model);

    const extensions = useMemo((): ExtensionInfo[] => {
        if (!model) return [];

        // Group kinds by their source package (inferred from layer groupings)
        // For now, show the active ontology layers as "extensions"
        const layerKindCounts = new Map<string, number>();
        for (const el of Object.values(model.elements)) {
            const layer = el.layer || 'unknown';
            layerKindCounts.set(layer, (layerKindCounts.get(layer) || 0) + 1);
        }

        // Create extension-like entries from architecture layers
        const exts: ExtensionInfo[] = [];

        // Core extensions (always active)
        const coreLayers = ['operational', 'system', 'requirements', 'functional', 'logical', 'hardware', 'software', 'interfaces', 'analysis', 'verification'];
        const medicalLayers = ['risk', 'safety', 'design-control', 'software-lifecycle', 'qms', 'ui', 'cybersecurity', 'privacy', 'operations', 'clinical'];

        for (const layer of coreLayers) {
            if (layerKindCounts.has(layer)) {
                exts.push({
                    name: `ontology-core (${layer})`,
                    kindCount: layerKindCounts.get(layer)!,
                    active: true,
                });
            }
        }

        for (const layer of medicalLayers) {
            if (layerKindCounts.has(layer)) {
                exts.push({
                    name: `medical-${layer}`,
                    kindCount: layerKindCounts.get(layer)!,
                    active: true,
                });
            }
        }

        return exts.sort((a, b) => b.kindCount - a.kindCount);
    }, [model]);

    // Available extensions catalog (static for now)
    const availableExtensions = [
        { name: '@memo/ontology-medical-process', desc: 'Medical domain core (risk, safety, operations, usability)', kinds: 80 },
        { name: '@memo/ontology-medical-process', desc: 'Quality management and design control', kinds: 25 },
        { name: '@memo/ontology-iec62304', desc: 'IEC 62304 software lifecycle', kinds: 20 },
        { name: '@memo/ontology-cybersecurity', desc: 'Cybersecurity and privacy', kinds: 30 },
        { name: '@memo/ontology-medical-clinical-trial', desc: 'Clinical evaluation and evidence', kinds: 20 },
    ];

    if (!model) {
        return (
            <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                <div className="text-sm">No model loaded</div>
            </div>
        );
    }

    const totalActiveKinds = extensions.reduce((sum, e) => sum + e.kindCount, 0);

    return (
        <div className="flex-1 overflow-y-auto p-6">
            {/* Active ontology summary */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}>
                <h2 className="text-sm font-semibold mb-1" style={{ color: '#1a1a1a' }}>Active Ontology</h2>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                    {totalActiveKinds} elements across {extensions.length} layer groups
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {extensions.map(ext => (
                        <span
                            key={ext.name}
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
                        >
                            {ext.name} ({ext.kindCount})
                        </span>
                    ))}
                </div>
            </div>

            {/* Available extensions */}
            <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a1a' }}>Available Extensions</h3>
                <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
                    Use <code className="px-1 py-0.5 rounded text-xs" style={{ background: '#F0F0ED' }}>memo init --profile standard</code> to select a profile, or add extensions to your <code className="px-1 py-0.5 rounded text-xs" style={{ background: '#F0F0ED' }}>memo.package.yaml</code> ontologies list.
                </p>
                <div className="space-y-2">
                    {availableExtensions.map(ext => (
                        <div
                            key={ext.name}
                            className="p-3 rounded-lg flex items-center gap-3"
                            style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                        >
                            <div className="flex-1">
                                <div className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{ext.name}</div>
                                <div className="text-xs" style={{ color: '#6B7280' }}>{ext.desc}</div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F0F0ED', color: '#6B7280' }}>
                                {ext.kinds} kinds
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Profile presets */}
            <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#1a1a1a' }}>Profile Presets</h3>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {[
                        { name: 'minimal', desc: 'Core only (~53 kinds)', color: '#3B82F6' },
                        { name: 'standard', desc: 'Core + risk + sw + dhf (~120 kinds)', color: '#059669' },
                        { name: 'full', desc: 'All extensions (~200+ kinds)', color: '#7C3AED' },
                    ].map(p => (
                        <div
                            key={p.name}
                            className="p-3 rounded-lg"
                            style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                                <span className="text-xs font-semibold capitalize" style={{ color: '#1a1a1a' }}>{p.name}</span>
                            </div>
                            <div className="text-xs" style={{ color: '#6B7280' }}>{p.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

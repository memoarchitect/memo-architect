// ─── OntologySelectionPanel ───────────────────────────────────────────────────
//
// Left panel of the Ontology Viewer — shows available ontology packages with
// checkboxes to select/deselect. Clicking a package focuses it in the detail panel.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../../store/model-store';
import { sendOntologySelection } from '../../store/ws-client';
import { OrphanWarningDialog } from './OrphanWarningDialog';
import type { OrphanedElement } from '../../types/ontology';

export function OntologySelectionPanel() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);
    const focusedOntologyId = useModelStore(s => s.focusedOntologyId);
    const toggleOntologySelection = useModelStore(s => s.toggleOntologySelection);
    const setFocusedOntology = useModelStore(s => s.setFocusedOntology);
    const saveOntologySelection = useModelStore(s => s.saveOntologySelection);
    const model = useModelStore(s => s.model);

    const [orphanDialog, setOrphanDialog] = useState<OrphanedElement[] | null>(null);

    // Group into selected vs available
    const selected = availableOntologies.filter(o => selectedOntologies.has(o.name));
    const available = availableOntologies.filter(o => !selectedOntologies.has(o.name));

    function handleSave() {
        const result = saveOntologySelection();
        if (result.orphanedElements && result.orphanedElements.length > 0) {
            setOrphanDialog(result.orphanedElements);
        } else {
            sendOntologySelection([...selectedOntologies]);
        }
    }

    function handleOrphanKeep() {
        sendOntologySelection([...selectedOntologies]);
        setOrphanDialog(null);
    }

    function handleOrphanRemap(_mappings: Record<string, string>) {
        // Future: apply remapping to model elements, then save
        sendOntologySelection([...selectedOntologies]);
        setOrphanDialog(null);
    }

    if (availableOntologies.length === 0) {
        return (
            <div
                className="w-64 flex flex-col"
                style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}
            >
                <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid #E5E5E0' }}
                >
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                        Ontologies
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center" style={{ color: '#9CA3AF' }}>
                        <div className="text-2xl mb-2">◉</div>
                        <div className="text-xs">No ontology packages found</div>
                        <div className="text-xs mt-1 opacity-70">Run memo dev to load packages</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-64 flex flex-col overflow-hidden"
            style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid #E5E5E0' }}
            >
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                    Available
                </span>
                <button
                    onClick={handleSave}
                    className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                    style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2DD4A830'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2DD4A815'}
                    title="Save ontology selection to memo.package.yaml"
                >
                    Save
                </button>
            </div>

            {/* Package list */}
            <div className="flex-1 overflow-y-auto py-2">
                {/* Selected packages */}
                {selected.length > 0 && (
                    <>
                        <div className="px-4 py-1 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                            Selected ({selected.length})
                        </div>
                        {selected.map(pkg => (
                            <PackageRow
                                key={pkg.name}
                                pkg={pkg}
                                checked={true}
                                focused={focusedOntologyId === pkg.name}
                                onToggle={() => toggleOntologySelection(pkg.name)}
                                onFocus={() => setFocusedOntology(pkg.name)}
                                modelLoaded={!!model}
                            />
                        ))}
                    </>
                )}

                {/* Available but not selected */}
                {available.length > 0 && (
                    <>
                        <div className="px-4 py-1 text-xs font-medium mt-2" style={{ color: '#9CA3AF' }}>
                            Available ({available.length})
                        </div>
                        {available.map(pkg => (
                            <PackageRow
                                key={pkg.name}
                                pkg={pkg}
                                checked={false}
                                focused={focusedOntologyId === pkg.name}
                                onToggle={() => toggleOntologySelection(pkg.name)}
                                onFocus={() => setFocusedOntology(pkg.name)}
                                modelLoaded={!!model}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Orphan warning dialog (Issue #157) */}
            {orphanDialog && (
                <OrphanWarningDialog
                    orphans={orphanDialog}
                    onKeep={handleOrphanKeep}
                    onRemap={handleOrphanRemap}
                    onCancel={() => setOrphanDialog(null)}
                />
            )}
        </div>
    );
}

interface PackageRowProps {
    pkg: { name: string; kindCount: number; layers: any[] };
    checked: boolean;
    focused: boolean;
    onToggle: () => void;
    onFocus: () => void;
    modelLoaded: boolean;
}

function PackageRow({ pkg, checked, focused, onToggle, onFocus }: PackageRowProps) {
    const shortName = pkg.name.replace('@memo/', '');

    return (
        <div
            className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-all"
            style={{
                background: focused ? '#EFF6FF' : 'transparent',
                borderLeft: focused ? '3px solid #2563EB' : '3px solid transparent',
                opacity: checked ? 1 : 0.55,
            }}
            onClick={onFocus}
            onMouseEnter={e => { if (!focused) e.currentTarget.style.background = '#F7F7F5'; }}
            onMouseLeave={e => { if (!focused) e.currentTarget.style.background = 'transparent'; }}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={checked}
                onChange={e => { e.stopPropagation(); onToggle(); }}
                onClick={e => e.stopPropagation()}
                className="rounded"
                style={{ cursor: 'pointer', accentColor: '#2563EB', width: '14px', height: '14px', flexShrink: 0 }}
            />
            {/* Name + kind count */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#1a1a1a' }}>
                    {shortName}
                </div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    {pkg.kindCount} kinds · {pkg.layers.length} layers
                </div>
            </div>
        </div>
    );
}

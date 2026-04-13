// ─── OntologyBrowserTab ───────────────────────────────────────────────────────
//
// File browser tab for the left ExplorerPanel — shows ontology packages as a
// flat list with layer folders containing kinds. Includes a search filter,
// selection checkboxes, Save button, and right-click context menu.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { sendOntologySelection } from '../store/ws-client';
import { LAYER_COLORS } from '../constants';
import { OntologyContextMenu } from './OntologyContextMenu';
import type { ContextMenuTarget } from './OntologyContextMenu';
import { OrphanWarningDialog } from '../views/ontology/OrphanWarningDialog';
import type { OrphanedElement } from '../types/ontology';

const TYPE_ICONS: Record<string, string> = {
    ontology: '\u{1F4E6}',  // 📦
    profile: '\u{1F527}',   // 🔧
    extension: '\u{1F9E9}', // 🧩
};

export function OntologyBrowserTab() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);
    const toggleOntologySelection = useModelStore(s => s.toggleOntologySelection);
    const saveOntologySelection = useModelStore(s => s.saveOntologySelection);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setOntologyViewMode = useModelStore(s => s.setOntologyViewMode);
    const activeView = useModelStore(s => s.activeView);

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPkgs, setExpandedPkgs] = useState<Set<string>>(() =>
        new Set(availableOntologies.filter(o => o.selected).map(o => o.name))
    );
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

    // Track saved selection to detect dirty state
    const [savedSelection, setSavedSelection] = useState<Set<string>>(
        () => new Set(availableOntologies.filter(o => o.selected).map(o => o.name))
    );
    const isDirty = useMemo(() => {
        if (selectedOntologies.size !== savedSelection.size) return true;
        for (const name of selectedOntologies) {
            if (!savedSelection.has(name)) return true;
        }
        return false;
    }, [selectedOntologies, savedSelection]);

    const [orphanDialog, setOrphanDialog] = useState<OrphanedElement[] | null>(null);

    // Context menu state
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: ContextMenuTarget } | null>(null);

    const kindRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Filter packages/layers/kinds by search term
    const filteredOntologies = useMemo(() => {
        if (!searchTerm.trim()) return availableOntologies;
        const term = searchTerm.toLowerCase();
        return availableOntologies
            .map(pkg => ({
                ...pkg,
                layers: pkg.layers
                    .map(layer => ({
                        ...layer,
                        kinds: layer.kinds.filter(k =>
                            k.name.toLowerCase().includes(term) ||
                            k.label.toLowerCase().includes(term) ||
                            k.layer.toLowerCase().includes(term)
                        ),
                    }))
                    .filter(l => l.kinds.length > 0),
            }))
            .filter(pkg => pkg.layers.length > 0 || pkg.name.toLowerCase().includes(term));
    }, [availableOntologies, searchTerm]);

    // Auto-expand all when searching
    useEffect(() => {
        if (searchTerm.trim()) {
            setExpandedPkgs(new Set(filteredOntologies.map(o => o.name)));
            setExpandedLayers(new Set(
                filteredOntologies.flatMap(o => o.layers.map(l => `${o.name}:${l.id}`))
            ));
        }
    }, [searchTerm, filteredOntologies]);

    // Bidirectional sync: when selectedKind changes, scroll to it
    useEffect(() => {
        if (selectedKind && kindRefs.current.has(selectedKind)) {
            for (const pkg of availableOntologies) {
                for (const layer of pkg.layers) {
                    if (layer.kinds.find(k => k.name === selectedKind)) {
                        setExpandedPkgs(prev => new Set([...prev, pkg.name]));
                        setExpandedLayers(prev => new Set([...prev, `${pkg.name}:${layer.id}`]));
                        break;
                    }
                }
            }
            setTimeout(() => {
                kindRefs.current.get(selectedKind)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
        }
    }, [selectedKind, availableOntologies]);

    function handlePackageClick(pkgName: string) {
        setActiveView({ type: 'ontology-detail', packageName: pkgName });
    }

    function handleLayerClick(pkgName: string, layerId: string) {
        setActiveView({ type: 'ontology-detail', packageName: pkgName, layerId });
    }

    function handleKindClick(kindName: string, pkgName: string) {
        setSelectedKind(selectedKind === kindName ? null : kindName);
        setActiveView({ type: 'ontology-detail', packageName: pkgName });
    }

    function togglePkg(name: string) {
        setExpandedPkgs(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    }

    function toggleLayer(key: string) {
        setExpandedLayers(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    function handleSave() {
        const result = saveOntologySelection();
        if (result.orphanedElements && result.orphanedElements.length > 0) {
            setOrphanDialog(result.orphanedElements);
        } else {
            sendOntologySelection([...selectedOntologies]);
            setSavedSelection(new Set(selectedOntologies));
        }
    }

    function handleOrphanKeep() {
        sendOntologySelection([...selectedOntologies]);
        setSavedSelection(new Set(selectedOntologies));
        setOrphanDialog(null);
    }

    function handleOrphanRemap(_mappings: Record<string, string>) {
        sendOntologySelection([...selectedOntologies]);
        setSavedSelection(new Set(selectedOntologies));
        setOrphanDialog(null);
    }

    function handleContextMenu(e: React.MouseEvent, target: ContextMenuTarget) {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY, target });
    }

    function handleCtxViewTable(pkgName: string, layerId?: string) {
        setOntologyViewMode('table');
        setActiveView({ type: 'ontology-detail', packageName: pkgName, layerId });
        setCtxMenu(null);
    }

    function handleCtxViewVisual(pkgName: string) {
        setOntologyViewMode('visual');
        setActiveView({ type: 'ontology-detail', packageName: pkgName });
        setCtxMenu(null);
    }

    function handleCtxToggleSelection(pkgName: string) {
        toggleOntologySelection(pkgName);
        setCtxMenu(null);
    }

    function handleCtxViewProperties(kindName: string, pkgName: string) {
        setSelectedKind(kindName);
        setActiveView({ type: 'ontology-detail', packageName: pkgName });
        setCtxMenu(null);
    }

    // Escape clears selection and closes context menu
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setSelectedKind(null);
                setCtxMenu(null);
            }
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [setSelectedKind]);

    // Close context menu on outside click
    useEffect(() => {
        if (!ctxMenu) return;
        function onClickOutside() { setCtxMenu(null); }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [ctxMenu]);

    if (availableOntologies.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-xl mb-2">&#9673;</div>
                    <div className="text-xs">No ontology packages</div>
                    <div className="text-xs opacity-70 mt-1">Start memo dev to load</div>
                </div>
            </div>
        );
    }

    // Determine the currently focused package from the active view
    const focusedPackage = activeView.type === 'ontology-detail'
        ? (activeView as { packageName: string }).packageName
        : null;

    return (
        <div className="flex flex-col flex-1 overflow-hidden text-xs">
            {/* Search input */}
            <div className="px-3 py-2 sticky top-0 z-10" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E0' }}>
                <input
                    type="text"
                    placeholder="Search kinds..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md"
                    style={{
                        border: '1px solid #E5E7EB',
                        background: '#F9FAFB',
                        color: '#374151',
                        outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                    onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
            </div>

            {/* Flat list of ontology packages */}
            <div className="flex-1 overflow-y-auto py-1">
                {filteredOntologies.map(pkg => {
                    const isSelected = selectedOntologies.has(pkg.name);
                    const isFocused = focusedPackage === pkg.name;
                    const isPkgExpanded = expandedPkgs.has(pkg.name);
                    const shortName = pkg.name.replace('@memo/', '');
                    const typeIcon = TYPE_ICONS[pkg.type] ?? TYPE_ICONS.ontology;

                    return (
                        <div key={pkg.name}>
                            {/* Package row */}
                            <div
                                className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
                                style={{
                                    borderRadius: '6px',
                                    margin: '0 4px',
                                    background: isFocused ? '#EFF6FF' : 'transparent',
                                    borderLeft: isFocused ? '3px solid #2563EB' : '3px solid transparent',
                                    opacity: isSelected ? 1 : 0.55,
                                }}
                                onMouseEnter={e => { if (!isFocused) e.currentTarget.style.background = '#F0F0ED'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isFocused ? '#EFF6FF' : 'transparent'; }}
                                onClick={e => {
                                    e.stopPropagation();
                                    togglePkg(pkg.name);
                                }}
                                onDoubleClick={() => handlePackageClick(pkg.name)}
                                onContextMenu={e => handleContextMenu(e, { type: 'package', pkgName: pkg.name, isSelected })}
                            >
                                {/* Selection checkbox */}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => { e.stopPropagation(); toggleOntologySelection(pkg.name); }}
                                    onClick={e => e.stopPropagation()}
                                    style={{ cursor: 'pointer', accentColor: '#2563EB', flexShrink: 0 }}
                                    title={isSelected ? 'Deselect for project' : 'Select for project'}
                                />
                                <span style={{ color: '#6B7280', fontSize: '10px' }}>{isPkgExpanded ? '\u25BE' : '\u25B8'}</span>
                                <span>{typeIcon}</span>
                                <span className="font-medium truncate flex-1" style={{ color: '#374151' }}>{shortName}</span>
                                <span style={{ color: '#D1D5DB' }}>{pkg.kindCount}</span>
                            </div>

                            {/* Layer folders */}
                            {isPkgExpanded && pkg.layers.map(layer => {
                                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                                const layerKey = `${pkg.name}:${layer.id}`;
                                const isLayerExpanded = expandedLayers.has(layerKey);

                                return (
                                    <div key={layerKey}>
                                        <div
                                            className="flex items-center gap-2 px-3 py-1 cursor-pointer"
                                            style={{ borderRadius: '4px', margin: '0 4px 0 20px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#F7F7F5'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            onClick={e => { e.stopPropagation(); toggleLayer(layerKey); }}
                                            onDoubleClick={() => handleLayerClick(pkg.name, layer.id)}
                                            onContextMenu={e => handleContextMenu(e, { type: 'layer', pkgName: pkg.name, layerId: layer.id, layerLabel: layer.label })}
                                        >
                                            <span style={{ color: '#D1D5DB', fontSize: '9px' }}>{isLayerExpanded ? '\u25BE' : '\u25B8'}</span>
                                            <span className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                                            <span className="flex-1 truncate capitalize" style={{ color: '#6B7280' }}>{layer.label}</span>
                                            <span style={{ color: '#D1D5DB' }}>{layer.kindCount}</span>
                                        </div>

                                        {/* Kind items */}
                                        {isLayerExpanded && layer.kinds.map(kind => {
                                            const isKindSelected = selectedKind === kind.name;
                                            return (
                                                <div
                                                    key={kind.name}
                                                    ref={el => { if (el) kindRefs.current.set(kind.name, el); }}
                                                    className="flex items-center gap-1.5 px-3 py-0.5 cursor-pointer"
                                                    style={{
                                                        borderRadius: '4px',
                                                        margin: '0 4px 0 36px',
                                                        background: isKindSelected ? '#EFF6FF' : 'transparent',
                                                        borderLeft: isKindSelected ? `3px solid ${color}` : '3px solid transparent',
                                                        transition: 'background 150ms ease',
                                                    }}
                                                    onMouseEnter={e => { if (!isKindSelected) e.currentTarget.style.background = '#F7F7F5'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = isKindSelected ? '#EFF6FF' : 'transparent'; }}
                                                    onClick={() => handleKindClick(kind.name, pkg.name)}
                                                    onContextMenu={e => handleContextMenu(e, { type: 'kind', kindName: kind.name, pkgName: pkg.name, layerId: layer.id })}
                                                >
                                                    <span className="truncate" style={{ color: isKindSelected ? '#1B3A4B' : '#374151', fontWeight: isKindSelected ? 600 : 400 }}>
                                                        {kind.name}
                                                    </span>
                                                    {kind.instanceCount > 0 && (
                                                        <span style={{ color: '#9CA3AF', fontSize: '10px' }}>{'\u00B7'}{kind.instanceCount}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Save Selection button — only shown when dirty */}
            {isDirty && (
                <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                    <button
                        onClick={handleSave}
                        className="w-full py-1.5 text-xs font-medium rounded-md"
                        style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                    >
                        Save Selection
                    </button>
                </div>
            )}

            {/* Orphan warning dialog */}
            {orphanDialog && (
                <OrphanWarningDialog
                    orphans={orphanDialog}
                    onKeep={handleOrphanKeep}
                    onRemap={handleOrphanRemap}
                    onCancel={() => setOrphanDialog(null)}
                />
            )}

            {/* Context menu */}
            {ctxMenu && (
                <OntologyContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    target={ctxMenu.target}
                    onViewVisual={handleCtxViewVisual}
                    onViewTable={handleCtxViewTable}
                    onToggleSelection={handleCtxToggleSelection}
                    onViewProperties={handleCtxViewProperties}
                    onClose={() => setCtxMenu(null)}
                />
            )}
        </div>
    );
}

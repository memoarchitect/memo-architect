// ─── OntologyBrowserTab ───────────────────────────────────────────────────────
//
// File browser tab for the left ExplorerPanel — shows ontology packages as a
// tree: package → layer → kinds. Grayed out for unselected packages.
// Clicking a kind sets selectedOntologyKind (shared store) and syncs the detail panel.
// Implements Issues #156 and #160 (bidirectional selection sync).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';

export function OntologyBrowserTab() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);
    const focusedOntologyId = useModelStore(s => s.focusedOntologyId);
    const setFocusedOntology = useModelStore(s => s.setFocusedOntology);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const setActiveView = useModelStore(s => s.setActiveView);

    // Track expanded layers per package
    const [expandedPkgs, setExpandedPkgs] = useState<Set<string>>(new Set(
        // Default: expand all selected packages
        [...(availableOntologies.filter(o => o.selected).map(o => o.name))]
    ));
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

    // Refs for scroll-into-view on bidirectional sync
    const kindRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Issue #160: when selectedKind changes (from detail panel click), scroll browser to it
    useEffect(() => {
        if (selectedKind && kindRefs.current.has(selectedKind)) {
            // Find which package/layer it belongs to, expand if needed
            for (const pkg of availableOntologies) {
                for (const layer of pkg.layers) {
                    const found = layer.kinds.find(k => k.name === selectedKind);
                    if (found) {
                        setExpandedPkgs(prev => new Set([...prev, pkg.name]));
                        setExpandedLayers(prev => new Set([...prev, `${pkg.name}:${layer.id}`]));
                        break;
                    }
                }
            }
            // Scroll after a tick for expand animation
            setTimeout(() => {
                kindRefs.current.get(selectedKind)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }, 80);
        }
    }, [selectedKind, availableOntologies]);

    function handleKindClick(kindName: string, pkgName: string) {
        // Set shared selection (detail panel will react)
        setSelectedKind(selectedKind === kindName ? null : kindName);
        // Focus the owning package in detail panel
        setFocusedOntology(pkgName);
        // Switch to ontology mode if not already
        setActiveView({ type: 'ontology' });
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

    // Keyboard Escape: clear selection
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setSelectedKind(null);
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [setSelectedKind]);

    if (availableOntologies.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-xl mb-2">◉</div>
                    <div className="text-xs">No ontology packages</div>
                    <div className="text-xs opacity-70 mt-1">Start memo dev to load</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto py-1 text-xs">
            {availableOntologies.map(pkg => {
                const isSelected = selectedOntologies.has(pkg.name);
                const isFocused = focusedOntologyId === pkg.name;
                const isPkgExpanded = expandedPkgs.has(pkg.name);
                const shortName = pkg.name.replace('@memo/', '');

                return (
                    <div key={pkg.name} style={{ opacity: isSelected ? 1 : 0.45 }}>
                        {/* Package row */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                            style={{
                                borderRadius: '6px',
                                margin: '0 4px',
                                background: isFocused ? '#EFF6FF' : 'transparent',
                                borderLeft: isFocused ? '3px solid #2563EB' : '3px solid transparent',
                            }}
                            onMouseEnter={e => { if (!isFocused) e.currentTarget.style.background = '#F0F0ED'; }}
                            onMouseLeave={e => { if (!isFocused) e.currentTarget.style.background = isFocused ? '#EFF6FF' : 'transparent'; }}
                            onClick={() => { togglePkg(pkg.name); setFocusedOntology(pkg.name); setActiveView({ type: 'ontology' }); }}
                        >
                            <span style={{ color: '#6B7280', fontSize: '10px' }}>{isPkgExpanded ? '▾' : '▸'}</span>
                            <span style={{ color: '#6B7280' }}>📦</span>
                            <span className="font-medium truncate flex-1" style={{ color: '#374151' }}>{shortName}</span>
                            <span style={{ color: '#D1D5DB' }}>{pkg.kindCount}</span>
                        </div>

                        {/* Layer rows */}
                        {isPkgExpanded && pkg.layers.map(layer => {
                            const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                            const layerKey = `${pkg.name}:${layer.id}`;
                            const isLayerExpanded = expandedLayers.has(layerKey);

                            return (
                                <div key={layerKey}>
                                    <div
                                        className="flex items-center gap-2 px-3 py-1 ml-4 cursor-pointer"
                                        style={{ borderRadius: '4px', margin: '0 4px 0 16px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F7F7F5'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => toggleLayer(layerKey)}
                                    >
                                        <span style={{ color: '#D1D5DB', fontSize: '9px' }}>{isLayerExpanded ? '▾' : '▸'}</span>
                                        <span className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                                        <span className="flex-1 truncate capitalize" style={{ color: '#6B7280' }}>{layer.label}</span>
                                        <span style={{ color: '#D1D5DB' }}>{layer.kindCount}</span>
                                    </div>

                                    {/* Kind rows */}
                                    {isLayerExpanded && layer.kinds.map(kind => {
                                        const isKindSelected = selectedKind === kind.name;
                                        return (
                                            <div
                                                key={kind.name}
                                                ref={el => { if (el) kindRefs.current.set(kind.name, el); }}
                                                className="flex items-center gap-1.5 px-3 py-0.5 ml-8 cursor-pointer"
                                                style={{
                                                    borderRadius: '4px',
                                                    margin: '0 4px 0 32px',
                                                    background: isKindSelected ? '#EFF6FF' : 'transparent',
                                                    borderLeft: isKindSelected ? `3px solid ${color}` : '3px solid transparent',
                                                    transition: 'background 150ms ease',
                                                }}
                                                onMouseEnter={e => { if (!isKindSelected) e.currentTarget.style.background = '#F7F7F5'; }}
                                                onMouseLeave={e => { if (!isKindSelected) e.currentTarget.style.background = isKindSelected ? '#EFF6FF' : 'transparent'; }}
                                                onClick={() => handleKindClick(kind.name, pkg.name)}
                                            >
                                                <span className="truncate" style={{ color: isKindSelected ? '#1B3A4B' : '#374151', fontWeight: isKindSelected ? 600 : 400 }}>
                                                    {kind.name}
                                                </span>
                                                {kind.instanceCount > 0 && (
                                                    <span style={{ color: '#9CA3AF', fontSize: '10px' }}>·{kind.instanceCount}</span>
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
    );
}

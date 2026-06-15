// ─── OntologyBrowserTab ───────────────────────────────────────────────────────
//
// File browser tab for the left ExplorerPanel — shows ontology packages as a
// flat list with layer folders containing kinds. Includes a search filter,
// selection checkboxes, Save button, and right-click context menu.
//
// Kinds within each layer are sorted parent-first (no derivesFrom comes first),
// then alphabetically within each tier.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { sendOntologySelection, sendKindRemap } from '../store/ws-client';
import { LAYER_COLORS } from '../constants';
import { COLOR, FONT } from '../styles/tokens';
import { OntologyContextMenu } from './OntologyContextMenu';
import type { ContextMenuTarget } from './OntologyContextMenu';
import { OrphanWarningDialog } from '../views/ontology/OrphanWarningDialog';
import type { OrphanedElement, OntologyKindInfo } from '../types/ontology';

const TYPE_ICONS: Record<string, string> = {
    ontology: '\u{1F4E6}',  // 📦
    profile: '\u{1F527}',   // 🔧
    extension: '\u{1F9E9}', // 🧩
};

/**
 * Level-order (BFS) sort of kinds:
 *   Level 0  — root kinds (no derivesFrom), sorted A–Z
 *   Level 1  — direct children of any root, sorted A–Z
 *   Level 2  — grandchildren, sorted A–Z
 *   …        — continues for any depth without hardcoding
 *
 * Kinds whose derivesFrom target is not in this layer are treated as roots.
 * Any unreachable kinds (broken refs) are appended at the end.
 */
function sortKindsParentFirst(kinds: OntologyKindInfo[]): OntologyKindInfo[] {
    const byName = new Map(kinds.map(k => [k.name, k]));

    // Assign each kind its depth level
    const depthOf = new Map<string, number>();
    function getDepth(name: string): number {
        if (depthOf.has(name)) return depthOf.get(name)!;
        const kind = byName.get(name);
        if (!kind || !kind.derivesFrom || !byName.has(kind.derivesFrom)) {
            depthOf.set(name, 0);
            return 0;
        }
        const d = getDepth(kind.derivesFrom) + 1;
        depthOf.set(name, d);
        return d;
    }
    for (const k of kinds) getDepth(k.name);

    // Group by depth level
    const byLevel = new Map<number, OntologyKindInfo[]>();
    for (const k of kinds) {
        const d = depthOf.get(k.name) ?? 0;
        const arr = byLevel.get(d) ?? [];
        arr.push(k);
        byLevel.set(d, arr);
    }

    // Sort each level alphabetically, then concatenate in level order
    const maxDepth = Math.max(...byLevel.keys());
    const result: OntologyKindInfo[] = [];
    for (let d = 0; d <= maxDepth; d++) {
        const level = byLevel.get(d) ?? [];
        result.push(...level.sort((a, b) => a.name.localeCompare(b.name)));
    }
    return result;
}

/** Level-order (BFS) sort of packages — same logic as sortKindsParentFirst.
 *  Level 0 = roots (no `extends` or parent not in list), Level 1 = direct children, etc.
 *  Within each level packages are sorted A–Z.
 *  Result: deeper packages always appear after shallower ones regardless of name.
 */
function sortPackagesParentFirst<T extends { name: string; extends?: string }>(pkgs: T[]): T[] {
    const byName = new Map(pkgs.map(p => [p.name, p]));

    // Memoised depth resolver
    const depthOf = new Map<string, number>();
    function getDepth(name: string): number {
        if (depthOf.has(name)) return depthOf.get(name)!;
        const pkg = byName.get(name);
        if (!pkg || !pkg.extends || !byName.has(pkg.extends)) {
            depthOf.set(name, 0);
            return 0;
        }
        const d = getDepth(pkg.extends) + 1;
        depthOf.set(name, d);
        return d;
    }
    for (const p of pkgs) getDepth(p.name);

    // Group by level
    const byLevel = new Map<number, T[]>();
    for (const p of pkgs) {
        const d = depthOf.get(p.name) ?? 0;
        const arr = byLevel.get(d) ?? [];
        arr.push(p);
        byLevel.set(d, arr);
    }

    // Concatenate levels in order, each level sorted A–Z
    const maxDepth = byLevel.size > 0 ? Math.max(...byLevel.keys()) : 0;
    const result: T[] = [];
    for (let d = 0; d <= maxDepth; d++) {
        const level = byLevel.get(d) ?? [];
        result.push(...level.sort((a, b) => a.name.localeCompare(b.name)));
    }
    return result;
}

// ─── Deselect confirmation dialog ────────────────────────────────────────────

function DeselectedConfirmDialog({ pkgName, onCancel, onConfirm }: {
    pkgName: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const shortName = pkgName.replace('@memo/', '');
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div className="rounded-xl p-5 shadow-2xl" style={{ background: '#FFFFFF', maxWidth: '340px', width: '90vw' }}>
                <div className="font-semibold mb-1.5" style={{ fontSize: FONT.sm, color: COLOR.primary }}>
                    Remove ontology?
                </div>
                <div className="mb-4" style={{ fontSize: FONT.xs, color: COLOR.secondary, lineHeight: 1.5 }}>
                    Removing <strong>{shortName}</strong> will affect all model elements that depend on its kinds.
                    Those elements will become orphaned until you add a compatible ontology.
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded-md font-medium"
                        style={{ fontSize: FONT.xs, background: COLOR.surfaceAlt, color: COLOR.secondary, border: `1px solid ${COLOR.border}`, cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 rounded-md font-medium"
                        style={{ fontSize: FONT.xs, background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    const [pendingDeselect, setPendingDeselect] = useState<string | null>(null);

    // Context menu state
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: ContextMenuTarget } | null>(null);

    const kindRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Filter packages/layers/kinds by search term, then sort parent → child
    const filteredOntologies = useMemo(() => {
        const filtered = !searchTerm.trim()
            ? availableOntologies
            : availableOntologies
                .map(pkg => ({
                    ...pkg,
                    layers: pkg.layers
                        .map(layer => ({
                            ...layer,
                            kinds: layer.kinds.filter(k =>
                                k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                k.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                k.layer.toLowerCase().includes(searchTerm.toLowerCase())
                            ),
                        }))
                        .filter(l => l.kinds.length > 0),
                }))
                .filter(pkg => pkg.layers.length > 0 || pkg.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return sortPackagesParentFirst(filtered);
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

    function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>, pkgName: string, isCurrentlySelected: boolean) {
        e.stopPropagation();
        if (isCurrentlySelected) {
            // Guard: require confirmation before deselecting
            setPendingDeselect(pkgName);
        } else {
            toggleOntologySelection(pkgName);
        }
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

    function handleOrphanRemap(mappings: Record<string, string>) {
        sendKindRemap(mappings);
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
        const isSelected = selectedOntologies.has(pkgName);
        if (isSelected) {
            setPendingDeselect(pkgName);
        } else {
            toggleOntologySelection(pkgName);
        }
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
                setPendingDeselect(null);
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
                <div className="text-center" style={{ color: COLOR.faint }}>
                    <div className="text-xl mb-2">&#9673;</div>
                    <div style={{ fontSize: FONT.xs }}>No ontology packages</div>
                    <div style={{ fontSize: FONT.xs, opacity: 0.7, marginTop: '4px' }}>Start memo dev to load</div>
                </div>
            </div>
        );
    }

    // Determine the currently focused package from the active view
    const focusedPackage = activeView.type === 'ontology-detail'
        ? (activeView as { packageName: string }).packageName
        : null;

    return (
        <div className="flex flex-col flex-1 overflow-hidden" style={{ fontSize: FONT.explorer.item }}>
            {/* Search input — same token style as ExplorerPanel's search */}
            <div className="px-3 py-2 sticky top-0 z-10" style={{ background: COLOR.surface, borderBottom: `1px solid ${COLOR.border}` }}>
                <input
                    type="text"
                    placeholder="Search kinds..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg focus:outline-none"
                    style={{
                        fontSize: FONT.explorer.search,
                        border: `1px solid ${COLOR.border}`,
                        background: COLOR.surfaceAlt,
                        color: COLOR.primary,
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#2563EB'}
                    onBlur={e => e.currentTarget.style.borderColor = COLOR.border}
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
                                    background: isFocused ? `${COLOR.accent}18` : 'transparent',
                                    borderLeft: isFocused ? `3px solid ${COLOR.accentDark}` : '3px solid transparent',
                                    opacity: isSelected ? 1 : 0.55,
                                }}
                                onMouseEnter={e => { if (!isFocused) e.currentTarget.style.background = '#F0F0ED'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isFocused ? `${COLOR.accent}18` : 'transparent'; }}
                                onClick={e => { e.stopPropagation(); togglePkg(pkg.name); }}
                                onDoubleClick={() => handlePackageClick(pkg.name)}
                                onContextMenu={e => handleContextMenu(e, { type: 'package', pkgName: pkg.name, isSelected })}
                            >
                                {/* Selection checkbox — deselect triggers confirmation */}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => handleCheckboxChange(e, pkg.name, isSelected)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ cursor: 'pointer', accentColor: '#2563EB', flexShrink: 0 }}
                                    title={isSelected ? 'Deselect for project' : 'Select for project'}
                                />
                                <span style={{ color: COLOR.muted, fontSize: '10px' }}>{isPkgExpanded ? '\u25BE' : '\u25B8'}</span>
                                <span>{typeIcon}</span>
                                <span className="font-semibold truncate flex-1" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>{shortName}</span>
                                <span style={{ color: COLOR.faint }}>{pkg.kindCount}</span>
                            </div>

                            {/* Layer folders */}
                            {isPkgExpanded && pkg.layers.map(layer => {
                                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? COLOR.muted;
                                const layerKey = `${pkg.name}:${layer.id}`;
                                const isLayerExpanded = expandedLayers.has(layerKey);
                                const sortedKinds = sortKindsParentFirst(layer.kinds);

                                return (
                                    <div key={layerKey}>
                                        <div
                                            className="flex items-center gap-2 px-3 py-1 cursor-pointer"
                                            style={{ borderRadius: '4px', margin: '0 4px 0 20px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            onClick={e => { e.stopPropagation(); toggleLayer(layerKey); }}
                                            onDoubleClick={() => handleLayerClick(pkg.name, layer.id)}
                                            onContextMenu={e => handleContextMenu(e, { type: 'layer', pkgName: pkg.name, layerId: layer.id, layerLabel: layer.label })}
                                        >
                                            <span style={{ color: COLOR.faint, fontSize: '9px' }}>{isLayerExpanded ? '\u25BE' : '\u25B8'}</span>
                                            <span className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                                            <span className="flex-1 truncate capitalize" style={{ color: COLOR.muted, fontSize: FONT.explorer.kind }}>{layer.label}</span>
                                            <span style={{ color: COLOR.faint }}>{layer.kindCount}</span>
                                        </div>

                                        {/* Kind items — topological tree order: parent first, children indented */}
                                        {isLayerExpanded && (() => {
                                            // Compute depth: root=0, child = parentDepth+1
                                            const depthMap = new Map<string, number>();
                                            for (const k of sortedKinds) {
                                                const pd = k.derivesFrom ? (depthMap.get(k.derivesFrom) ?? 0) : 0;
                                                depthMap.set(k.name, k.derivesFrom ? pd + 1 : 0);
                                            }
                                            const renderKind = (kind: typeof sortedKinds[number]) => {
                                            const isKindSelected = selectedKind === kind.name;
                                            const depth = depthMap.get(kind.name) ?? 0;
                                            const isRoot = depth === 0;
                                            const marginLeft = 36 + depth * 12;
                                            return (
                                                <div
                                                    key={kind.name}
                                                    ref={el => { if (el) kindRefs.current.set(kind.name, el); }}
                                                    className="flex items-center gap-1.5 px-3 py-0.5 cursor-pointer"
                                                    style={{
                                                        borderRadius: '4px',
                                                        margin: `0 4px 0 ${marginLeft}px`,
                                                        background: isKindSelected ? `${COLOR.accent}18` : 'transparent',
                                                        borderLeft: isKindSelected ? `2px solid ${color}` : '2px solid transparent',
                                                        transition: 'background 150ms ease',
                                                    }}
                                                    onMouseEnter={e => { if (!isKindSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = isKindSelected ? `${COLOR.accent}18` : 'transparent'; }}
                                                    onClick={() => handleKindClick(kind.name, pkg.name)}
                                                    onContextMenu={e => handleContextMenu(e, { type: 'kind', kindName: kind.name, pkgName: pkg.name, layerId: layer.id })}
                                                >
                                                    {!isRoot && (
                                                        <span style={{ color: COLOR.faint, fontSize: '9px', flexShrink: 0 }}>↳</span>
                                                    )}
                                                    <span
                                                        className="truncate"
                                                        style={{
                                                            color: isKindSelected ? COLOR.accentDark : COLOR.primary,
                                                            fontWeight: isRoot ? 500 : 400,
                                                            fontSize: FONT.explorer.item,
                                                        }}
                                                    >
                                                        {kind.name}
                                                    </span>
                                                    {kind.instanceCount > 0 && (
                                                        <span style={{ color: COLOR.faint, fontSize: '10px' }}>{'\u00B7'}{kind.instanceCount}</span>
                                                    )}
                                                </div>
                                            );
                                            };
                                            // Partition kinds by namespace sub-group (mirrors src/<layer>/<group>/),
                                            // preserving parent-first order. Sub-headers show only when a layer
                                            // spans more than one group (e.g. architecture → context, risk, …).
                                            const groupOrder: string[] = [];
                                            const byGroup = new Map<string, typeof sortedKinds>();
                                            for (const k of sortedKinds) {
                                                const g = k.group ?? '';
                                                if (!byGroup.has(g)) { byGroup.set(g, []); groupOrder.push(g); }
                                                byGroup.get(g)!.push(k);
                                            }
                                            if (groupOrder.filter(g => g !== '').length <= 1) {
                                                return sortedKinds.map(renderKind);
                                            }
                                            return groupOrder.map(g => (
                                                <div key={`grp:${layerKey}:${g || '_root'}`}>
                                                    {g && (
                                                        <div className="px-3 py-0.5 flex items-center gap-1.5" style={{ margin: '0 4px 0 30px' }}>
                                                            <span className="capitalize truncate" style={{ color: COLOR.faint, fontSize: FONT.explorer.kind, letterSpacing: '0.02em' }}>
                                                                {g.replace(/_/g, ' ')}
                                                            </span>
                                                            <span style={{ color: COLOR.faint, fontSize: '10px' }}>{byGroup.get(g)!.length}</span>
                                                        </div>
                                                    )}
                                                    {byGroup.get(g)!.map(renderKind)}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Save Selection button — only shown when dirty */}
            {isDirty && (
                <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.surfaceAlt }}>
                    <button
                        onClick={handleSave}
                        className="w-full py-1.5 rounded-md font-medium"
                        style={{ fontSize: FONT.xs, background: '#2563EB', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                    >
                        Save Selection
                    </button>
                </div>
            )}

            {/* Deselect confirmation dialog */}
            {pendingDeselect && (
                <DeselectedConfirmDialog
                    pkgName={pendingDeselect}
                    onCancel={() => setPendingDeselect(null)}
                    onConfirm={() => {
                        toggleOntologySelection(pendingDeselect);
                        setPendingDeselect(null);
                    }}
                />
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

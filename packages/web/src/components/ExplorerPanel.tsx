import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    useModelStore,
    getElementsByLayer,
    getDiagramsForViewpoint,
    getRelationshipsForElement,
    type ExplorerTab,
} from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META, SEMANTIC_GROUPS, KIND_TO_GROUP } from '../constants';
import { FONT } from '../styles/tokens';
import type { MemoElement, DiagramDTO } from '@memo/core';

// ─── Element Context Menu ────────────────────────────────────────────────────

interface CtxMenuState { x: number; y: number; elementId: string; }

function ElementContextMenu({ menu, onClose }: { menu: CtxMenuState; onClose: () => void }) {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const el = model?.elements[menu.elementId];
    if (!el) return null;

    const rels = getRelationshipsForElement(model, menu.elementId);
    const outgoing = rels.filter(r => r.sourceId === menu.elementId);

    const actions = [
        { label: 'View properties', action: () => selectElement(menu.elementId) },
        ...(outgoing.length > 0 ? [{
            label: `Show ${outgoing.length} outgoing relationships`,
            action: () => selectElement(menu.elementId),
        }] : []),
        { label: `Copy ID: ${el.id}`, action: () => navigator.clipboard?.writeText(el.id) },
        { label: `Copy name: ${el.name}`, action: () => navigator.clipboard?.writeText(el.name) },
    ];

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-lg overflow-hidden py-1"
            style={{
                left: menu.x, top: menu.y,
                background: '#FFFFFF', border: '1px solid #E5E5E0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '180px',
            }}
        >
            <div className="px-3 py-1.5 text-xs font-medium truncate" style={{ color: '#9CA3AF', borderBottom: '1px solid #E5E5E0' }}>
                {el.name}
            </div>
            {actions.map((a, i) => (
                <div
                    key={i}
                    className="px-3 py-1.5 text-xs cursor-pointer"
                    style={{ color: '#374151' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { a.action(); onClose(); }}
                >
                    {a.label}
                </div>
            ))}
        </div>
    );
}

// ─── Tab Switcher ────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: ExplorerTab; onChange: (tab: ExplorerTab) => void }) {
    const tabs: { id: ExplorerTab; label: string }[] = [
        { id: 'model', label: 'Model' },
        { id: 'views', label: 'Views' },
    ];
    return (
        <div className="flex" style={{ borderBottom: '1px solid #E5E5E0' }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                    style={
                        active === tab.id
                            ? { color: '#1B3A4B', borderBottom: '2px solid #2DD4A8', background: '#FAFAF8' }
                            : { color: '#9CA3AF', borderBottom: '2px solid transparent' }
                    }
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Model Explorer ──────────────────────────────────────────────────────────

function ModelExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const validation = useModelStore(s => s.validation);

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

    const toggleExpand = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Build semantic group tree
    const groupTree = useMemo(() => {
        if (!model) return [];
        const elements = Object.values(model.elements);
        const lower = searchTerm.toLowerCase();

        const groups: { group: typeof SEMANTIC_GROUPS[number]; kinds: Map<string, MemoElement[]> }[] = [];

        for (const sg of SEMANTIC_GROUPS) {
            const kindMap = new Map<string, MemoElement[]>();
            for (const el of elements) {
                const g = KIND_TO_GROUP[el.kind];
                if (g?.id !== sg.id) continue;
                if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
                if (!kindMap.has(el.kind)) kindMap.set(el.kind, []);
                kindMap.get(el.kind)!.push(el);
            }
            if (kindMap.size > 0) {
                groups.push({ group: sg, kinds: kindMap });
            }
        }

        // Uncategorized elements
        const uncategorized = new Map<string, MemoElement[]>();
        for (const el of elements) {
            if (KIND_TO_GROUP[el.kind]) continue;
            if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
            if (!uncategorized.has(el.kind)) uncategorized.set(el.kind, []);
            uncategorized.get(el.kind)!.push(el);
        }
        if (uncategorized.size > 0) {
            groups.push({
                group: { id: 'other', label: 'Other', color: '#6B7280', kinds: [] },
                kinds: uncategorized,
            });
        }

        return groups;
    }, [model, searchTerm]);

    // Violation counts per element
    const violationCounts = useMemo(() => {
        const counts = new Map<string, number>();
        if (validation) {
            for (const v of validation.violations) {
                counts.set(v.elementId, (counts.get(v.elementId) || 0) + 1);
            }
        }
        return counts;
    }, [validation]);

    return (
        <div className="flex-1 overflow-y-auto text-xs py-1">
            {groupTree.map(({ group, kinds }) => {
                const groupKey = `g:${group.id}`;
                const isExpanded = expanded.has(groupKey);
                const totalCount = Array.from(kinds.values()).reduce((sum, els) => sum + els.length, 0);

                return (
                    <div key={group.id} className="mb-0.5">
                        {/* Group header */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
                            style={{ margin: '0 4px', borderRadius: '4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => toggleExpand(groupKey)}
                        >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                            <span className="font-medium flex-1 truncate" style={{ color: '#374151' }}>
                                {group.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: '#F0F0ED', color: '#6B7280', fontSize: '9px', fontWeight: 600, minWidth: '18px', textAlign: 'center' }}>
                                {totalCount}
                            </span>
                            <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                        </div>

                        {/* Kind sub-groups */}
                        {isExpanded && Array.from(kinds.entries()).map(([kind, elements]) => {
                            const kindKey = `k:${group.id}:${kind}`;
                            const isKindExpanded = expanded.has(kindKey);
                            const layerColor = LAYER_COLORS[elements[0]?.layer] || group.color;

                            return (
                                <div key={kind} className="ml-3">
                                    <div
                                        className="flex items-center gap-2 px-2 py-1 cursor-pointer select-none"
                                        style={{ borderRadius: '4px', margin: '0 4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => toggleExpand(kindKey)}
                                    >
                                        <span className="px-1.5 py-0.5 rounded" style={{ background: layerColor + '15', color: layerColor, fontSize: FONT.badge, fontWeight: 600 }}>
                                            {kind}
                                        </span>
                                        <span className="flex-1" />
                                        <span style={{ color: '#9CA3AF', fontSize: '9px' }}>{elements.length}</span>
                                        <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{isKindExpanded ? '\u25BE' : '\u25B8'}</span>
                                    </div>

                                    {/* Elements */}
                                    {isKindExpanded && elements.sort((a, b) => a.name.localeCompare(b.name)).map(el => {
                                        const isSelected = selectedElementId === el.id;
                                        const vCount = violationCounts.get(el.id) || 0;
                                        return (
                                            <div
                                                key={el.id}
                                                className="flex items-center gap-1.5 px-2 py-1 cursor-pointer ml-4"
                                                style={{
                                                    borderRadius: '4px', margin: '0 4px',
                                                    background: isSelected ? '#2DD4A818' : 'transparent',
                                                }}
                                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                onClick={() => selectElement(el.id)}
                                                onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, elementId: el.id }); }}
                                            >
                                                <span className="truncate flex-1" style={{ color: isSelected ? '#1B3A4B' : '#374151' }}>
                                                    {el.name}
                                                </span>
                                                {vCount > 0 && (
                                                    <span className="px-1 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '9px', fontWeight: 600, minWidth: '14px', textAlign: 'center' }}>
                                                        {vCount}
                                                    </span>
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
            {ctxMenu && <ElementContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
        </div>
    );
}

// ─── View Explorer ───────────────────────────────────────────────────────────

function DiagramTypeBadge({ diagramType }: { diagramType: string }) {
    const meta = DIAGRAM_TYPE_META[diagramType];
    if (!meta) return null;
    return (
        <span className="px-1 py-0.5 rounded text-xs font-semibold"
            style={{ background: meta.color + '20', color: meta.color, fontSize: FONT.badge }}
            title={meta.fullName}
        >
            {meta.code}
        </span>
    );
}

function ViewExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);

    const [expandedVps, setExpandedVps] = useState<Set<string>>(new Set(['__model']));

    const toggleExpand = (id: string) => {
        setExpandedVps(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const viewpoints = useMemo(() => model?.viewpoints ?? [], [model?.viewpoints]);

    const filterDiagrams = (diagrams: DiagramDTO[]): DiagramDTO[] => {
        if (!searchTerm) return diagrams;
        const lower = searchTerm.toLowerCase();
        return diagrams.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            d.diagramType.toLowerCase().includes(lower)
        );
    };

    const selectedDiagramId = activeView.type === 'diagram' ? activeView.diagramId : null;
    const modelDiagrams = getDiagramsForViewpoint(model, '__model');

    return (
        <div className="flex-1 overflow-y-auto text-xs py-1">
            {/* Model Viewpoint */}
            <div className="mb-0.5">
                <div
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
                    style={{ borderRadius: '4px', margin: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { selectViewpoint(null); toggleExpand('__model'); }}
                >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#2DD4A8' }} />
                    <span className="font-medium flex-1" style={{ color: '#374151' }}>Model Viewpoint</span>
                    <span style={{ color: '#9CA3AF', fontSize: '9px' }}>{modelDiagrams.length}</span>
                    <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{expandedVps.has('__model') ? '\u25BE' : '\u25B8'}</span>
                </div>
                {expandedVps.has('__model') && (
                    <div className="ml-4">
                        {filterDiagrams(modelDiagrams).map(diag => (
                            <DiagramRow
                                key={diag.id}
                                diag={diag}
                                isSelected={selectedDiagramId === diag.id}
                                onSelect={() => {
                                    setActiveView({ type: 'diagram', diagramId: diag.id });
                                    selectViewpoint(diag.viewpointId === '__model' ? null : diag.viewpointId);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Named viewpoints */}
            {viewpoints.map(vp => {
                const isExpanded = expandedVps.has(vp.id);
                const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || '#6B7280') : '#6B7280';
                const diagrams = getDiagramsForViewpoint(model, vp.id);

                return (
                    <div key={vp.id} className="mb-0.5">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
                            style={{ borderRadius: '4px', margin: '0 4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => { selectViewpoint(vp.id); toggleExpand(vp.id); }}
                        >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: vpColor }} />
                            <span className="font-medium flex-1 truncate" style={{ color: '#374151' }}>{vp.label}</span>
                            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>{diagrams.length}</span>
                            <span style={{ color: '#D1D5DB', fontSize: '10px' }}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                        </div>
                        {isExpanded && (
                            <div className="ml-4">
                                {filterDiagrams(diagrams).map(diag => (
                                    <DiagramRow
                                        key={diag.id}
                                        diag={diag}
                                        isSelected={selectedDiagramId === diag.id}
                                        onSelect={() => {
                                            setActiveView({ type: 'diagram', diagramId: diag.id });
                                            selectViewpoint(vp.id);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Diagram type legend */}
            <div className="px-3 py-2 mt-2" style={{ borderTop: '1px solid #E5E5E0' }}>
                <div className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                    {Object.entries(DIAGRAM_TYPE_META).map(([key, meta]) => (
                        <span key={key} className="px-1 py-0.5 rounded" style={{ background: meta.color + '15', color: meta.color, fontSize: FONT.badge, fontWeight: 600 }}>
                            {meta.code}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DiagramRow({ diag, isSelected, onSelect }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const meta = DIAGRAM_TYPE_META[diag.diagramType];
    const elCount = diag.elementIds?.length ?? 0;

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 cursor-pointer"
            style={{ borderRadius: '4px', margin: '0 4px', background: isSelected ? '#2DD4A818' : 'transparent' }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            onClick={onSelect}
            title={[meta?.fullName, diag.description].filter(Boolean).join(' \u2014 ')}
        >
            <DiagramTypeBadge diagramType={diag.diagramType} />
            {diag.auto && (
                <span className="px-1 py-0.5 rounded text-xs"
                    style={{ background: '#F0F0ED', color: '#9CA3AF', fontSize: '9px', fontWeight: 600 }}>
                    AUTO
                </span>
            )}
            <span className="truncate flex-1" style={{ color: '#374151' }}>{diag.name}</span>
            {elCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs"
                    style={{ background: '#F0F0ED', color: '#6B7280', fontSize: '9px', fontWeight: 600, minWidth: '18px', textAlign: 'center' }}>
                    {elCount}
                </span>
            )}
        </div>
    );
}

// ─── Main ExplorerPanel ──────────────────────────────────────────────────────

export function ExplorerPanel() {
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const explorerTab = useModelStore(s => s.explorerTab);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const model = useModelStore(s => s.model);

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    if (sidebarCollapsed) {
        return (
            <div
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                style={{ width: '40px', background: 'linear-gradient(180deg, #1B3A4B, #2D6A7A)', borderRight: '1px solid #E5E5E0' }}
                onClick={toggleSidebar}
                title="Expand explorer"
            >
                <div className="py-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{'\u25B8'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#2DD4A8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    Explorer
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                <div className="flex-1">
                    <h1 className="text-xs font-bold tracking-wide" style={{ color: '#2DD4A8' }}>Explorer</h1>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                        {elementCount} elements &middot; {relCount} rels
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                    className="flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', width: '24px', height: '24px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    title="Collapse explorer"
                >
                    {'\u25C2'}
                </button>
            </div>

            {/* Tab bar */}
            <TabBar active={explorerTab} onChange={setExplorerTab} />

            {/* Search */}
            <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <input
                    type="text"
                    placeholder={explorerTab === 'model' ? 'Search elements...' : 'Search diagrams...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                    style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                />
            </div>

            {/* Content */}
            {explorerTab === 'model'
                ? <ModelExplorerContent searchTerm={searchTerm} />
                : <ViewExplorerContent searchTerm={searchTerm} />
            }
        </div>
    );
}

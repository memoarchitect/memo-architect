import { useState, useMemo, useRef, useEffect } from 'react';
import { useModelStore, getDiagramsForViewpoint } from '../store/model-store';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import type { DiagramDTO, ViewpointDTO } from '@memo/core';
import { ViewpointEditor } from './ViewpointEditor';

/** Additional viewpoints that should always appear even if not defined in config.
 *  Note: interface-view and context-view are now in the base ontology config.
 *  Only keep truly universal extras here that might not be in any config. */
const EXTRA_VIEWPOINTS: { id: string; label: string; visibleKinds: string[]; visibleRelationships: string[]; visibleLayers: string[] }[] = [];

function DiagramTypeBadge({ diagramType }: { diagramType: string }) {
    const meta = DIAGRAM_TYPE_META[diagramType];
    if (!meta) return null;
    return (
        <span className="px-1 py-0.5 rounded text-xs font-semibold"
            style={{
                background: meta.color + '20',
                color: meta.color,
                fontSize: FONT.badge,
            }}
            title={meta.fullName}
        >
            {meta.code}
        </span>
    );
}

// ─── Diagram Row Context Menu ────────────────────────────────────────────────

interface DiagramRowMenuProps {
    x: number;
    y: number;
    diag: DiagramDTO;
    onClose: () => void;
    onOpenDiagram: () => void;
    onShowTabular: () => void;
    onDiagramProperties: () => void;
}

function DiagramRowContextMenu({ x, y, diag, onClose, onOpenDiagram, onShowTabular, onDiagramProperties }: DiagramRowMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', esc);
        };
    }, [onClose]);

    const left = Math.min(x, window.innerWidth - 220);
    const top = Math.min(y, window.innerHeight - 160);

    const Item = ({ label, icon, onClick, stub }: { label: string; icon: string; onClick: () => void; stub?: boolean }) => (
        <button
            onClick={() => { onClick(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FONT.xs }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
            <span style={{ fontSize: '12px', width: 16, textAlign: 'center' }}>{icon}</span>
            <span style={{ color: '#1a1a1a' }}>{label}</span>
            {stub && <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#D1D5DB' }}>soon</span>}
        </button>
    );

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-xl overflow-hidden py-1"
            style={{ left, top, minWidth: 200, background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
        >
            <div className="px-3 py-1.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>{diag.diagramType}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }} className="truncate">{diag.name}</div>
            </div>
            <Item label="Open Diagram" icon="⊟" onClick={onOpenDiagram} />
            <Item label="Show in Tabular View" icon="☷" onClick={onShowTabular} stub />
            <div style={{ height: 1, background: '#E5E5E0', margin: '2px 0' }} />
            <Item label="Diagram Properties" icon="ℹ" onClick={onDiagramProperties} />
        </div>
    );
}

function DiagramRow({ diag, isSelected, onSelect, onContextMenu }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}) {
    const meta = DIAGRAM_TYPE_META[diag.diagramType];
    const typeName = meta?.fullName ?? diag.diagramType;
    const elCount = diag.elementIds?.length ?? 0;
    const tooltip = [typeName, diag.description].filter(Boolean).join(' — ');

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 cursor-pointer"
            style={{
                borderRadius: '4px', margin: '0 4px',
                background: isSelected ? '#2DD4A818' : 'transparent',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            onClick={onSelect}
            onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(e); } : undefined}
            title={tooltip}
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

export function ViewpointBrowser() {
    const model = useModelStore(s => s.model);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const userViewpoints = useModelStore(s => s.userViewpoints);
    const addUserViewpoint = useModelStore(s => s.addUserViewpoint);
    const updateUserViewpoint = useModelStore(s => s.updateUserViewpoint);
    const deleteUserViewpoint = useModelStore(s => s.deleteUserViewpoint);

    const [expandedViewpoints, setExpandedViewpoints] = useState<Set<string>>(new Set(['__model']));
    const [diagCtx, setDiagCtx] = useState<{ x: number; y: number; diag: DiagramDTO } | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingVp, setEditingVp] = useState<ViewpointDTO | null>(null);

    const setActiveView = useModelStore(s => s.setActiveView);

    // Merge config viewpoints with user-created viewpoints
    const viewpoints = useMemo(() => {
        const configVps = model?.viewpoints ?? [];
        const configIds = new Set(configVps.map(v => v.id));
        const extras = EXTRA_VIEWPOINTS.filter(v => !configIds.has(v.id));
        const userVps = userViewpoints.filter(v => !configIds.has(v.id));
        return [...configVps, ...extras, ...userVps];
    }, [model?.viewpoints, userViewpoints]);

    function openNewViewpoint() {
        setEditingVp(null);
        setEditorOpen(true);
    }

    function openEditViewpoint(vp: ViewpointDTO) {
        setEditingVp(vp);
        setEditorOpen(true);
    }

    function handleEditorSave(vp: ViewpointDTO) {
        if (editingVp) {
            updateUserViewpoint(vp);
        } else {
            addUserViewpoint(vp);
            setExpandedViewpoints(prev => new Set([...prev, vp.id]));
        }
        setEditorOpen(false);
    }

    function isUserCreated(vpId: string): boolean {
        return userViewpoints.some(v => v.id === vpId);
    }

    const toggleExpand = (id: string) => {
        setExpandedViewpoints(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filterDiagramsBySearch = (diagrams: DiagramDTO[]): DiagramDTO[] => {
        if (!searchTerm) return diagrams;
        const lower = searchTerm.toLowerCase();
        return diagrams.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            d.diagramType.toLowerCase().includes(lower)
        );
    };

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    // Get diagrams from model DTO
    const modelDiagrams = getDiagramsForViewpoint(model, '__model');

    if (sidebarCollapsed) {
        return (
            <div
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                style={{ width: '40px', background: 'linear-gradient(180deg, #1B3A4B, #2D6A7A)', borderRight: '1px solid #E5E5E0' }}
                onClick={toggleSidebar}
                title="Expand sidebar"
            >
                <div className="py-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{'\u25B8'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#2DD4A8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    Viewpoints
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                <div className="flex-1">
                    <h1 className="text-sm font-bold tracking-wide" style={{ color: '#2DD4A8' }}>Viewpoints</h1>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {elementCount} elements &middot; {relCount} relationships
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                    className="flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', width: '24px', height: '24px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    title="Collapse sidebar"
                >
                    {'\u25C2'}
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <input
                    type="text"
                    placeholder="Search diagrams..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                />
            </div>

            {/* Viewpoint list */}
            <div className="flex-1 overflow-y-auto text-xs py-1">
                {/* Model Viewpoint */}
                <div className="mb-0.5">
                    <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                        style={{
                            borderRadius: '6px', margin: '0 4px',
                            background: selectedViewpointId === null || selectedViewpointId === '__model' ? '#2DD4A810' : 'transparent',
                        }}
                        onMouseEnter={e => { if (selectedViewpointId !== null) e.currentTarget.style.background = '#F0F0ED'; }}
                        onMouseLeave={e => { if (selectedViewpointId !== null) e.currentTarget.style.background = 'transparent'; }}
                        onClick={() => { selectViewpoint(null); toggleExpand('__model'); }}
                    >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2DD4A8' }} />
                        <span className="font-medium flex-1" style={{ color: selectedViewpointId === null ? '#1B3A4B' : '#374151' }}>
                            Model Viewpoint
                        </span>
                        <span style={{ color: '#9CA3AF' }}>{modelDiagrams.length}</span>
                        <span style={{ color: '#D1D5DB' }}>{expandedViewpoints.has('__model') ? '\u25BE' : '\u25B8'}</span>
                    </div>

                    {/* Model viewpoint diagrams */}
                    {expandedViewpoints.has('__model') && (
                        <div className="ml-4">
                            {filterDiagramsBySearch(modelDiagrams).map(diag => (
                                <DiagramRow
                                    key={diag.id}
                                    diag={diag}
                                    isSelected={selectedDiagramId === diag.id}
                                    onSelect={() => selectDiagram(diag.id)}
                                    onContextMenu={(e) => setDiagCtx({ x: e.clientX, y: e.clientY, diag })}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Named viewpoints */}
                {viewpoints.map(vp => {
                    const isSelected = selectedViewpointId === vp.id;
                    const isExpanded = expandedViewpoints.has(vp.id);
                    const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || '#6B7280') : '#6B7280';
                    const diagrams = getDiagramsForViewpoint(model, vp.id);
                    const userCreated = isUserCreated(vp.id);

                    return (
                        <div key={vp.id} className="mb-0.5 group/vp">
                            <div
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                                style={{
                                    borderRadius: '6px', margin: '0 4px',
                                    background: isSelected ? '#2DD4A810' : 'transparent',
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                onClick={() => { selectViewpoint(vp.id); toggleExpand(vp.id); }}
                            >
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: vpColor }} />
                                <span className="font-medium flex-1 truncate" style={{ color: isSelected ? '#1B3A4B' : '#374151' }}>
                                    {vp.label}
                                </span>
                                {userCreated && (
                                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF', background: '#F0F0ED', borderRadius: 4, padding: '1px 4px' }}>
                                        custom
                                    </span>
                                )}
                                {/* Edit / delete — only for user-created viewpoints, shown on hover */}
                                {userCreated && (
                                    <>
                                        <button
                                            title="Edit viewpoint"
                                            onClick={e => { e.stopPropagation(); openEditViewpoint(vp); }}
                                            className="opacity-0 group-hover/vp:opacity-100 flex items-center justify-center"
                                            style={{
                                                width: 18, height: 18, borderRadius: 4, border: 'none', cursor: 'pointer',
                                                background: 'transparent', color: '#6B7280', fontSize: '11px', transition: 'opacity 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#E5E5E0'; e.currentTarget.style.color = '#1B3A4B'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            title="Delete viewpoint"
                                            onClick={e => { e.stopPropagation(); deleteUserViewpoint(vp.id); }}
                                            className="opacity-0 group-hover/vp:opacity-100 flex items-center justify-center"
                                            style={{
                                                width: 18, height: 18, borderRadius: 4, border: 'none', cursor: 'pointer',
                                                background: 'transparent', color: '#6B7280', fontSize: '11px', transition: 'opacity 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#E74C3C'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
                                        >
                                            ✕
                                        </button>
                                    </>
                                )}
                                <span style={{ color: '#D1D5DB' }}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                                {!userCreated && <span style={{ color: '#9CA3AF' }}>{diagrams.length}</span>}
                            </div>

                            {/* Expanded: show diagrams */}
                            {isExpanded && (
                                <div className="ml-4">
                                    {filterDiagramsBySearch(diagrams).map(diag => (
                                        <DiagramRow
                                            key={diag.id}
                                            diag={diag}
                                            isSelected={selectedDiagramId === diag.id}
                                            onSelect={() => selectDiagram(diag.id)}
                                            onContextMenu={(e) => setDiagCtx({ x: e.clientX, y: e.clientY, diag })}
                                        />
                                    ))}
                                    {diagrams.length === 0 && (
                                        <div className="px-2 py-1.5" style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                            No diagrams
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add viewpoint button */}
            <div className="px-3 py-2" style={{ borderTop: '1px solid #E5E5E0' }}>
                <button
                    onClick={openNewViewpoint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                        border: '1px dashed #CBD5DB', background: 'transparent', color: '#6B7280', cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F0ED'; e.currentTarget.style.color = '#1B3A4B'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#CBD5DB'; }}
                >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Viewpoint
                </button>
            </div>

            {/* Legend — diagram type badges */}
            <div className="px-3 py-2" style={{ borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                <div className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                    {Object.entries(DIAGRAM_TYPE_META).map(([key, meta]) => (
                        <span key={key} className="px-1 py-0.5 rounded" style={{ background: meta.color + '15', color: meta.color, fontSize: FONT.badge, fontWeight: 600 }}>
                            {meta.code}
                        </span>
                    ))}
                </div>
            </div>

            {/* Diagram row context menu (#13) */}
            {diagCtx && (
                <DiagramRowContextMenu
                    x={diagCtx.x}
                    y={diagCtx.y}
                    diag={diagCtx.diag}
                    onClose={() => setDiagCtx(null)}
                    onOpenDiagram={() => selectDiagram(diagCtx.diag.id)}
                    onShowTabular={() => setActiveView({ type: 'tabular', diagramId: diagCtx.diag.id })}
                    onDiagramProperties={() => selectDiagram(diagCtx.diag.id)}
                />
            )}

            {/* ViewpointEditor modal (#8) */}
            {editorOpen && (
                <ViewpointEditor
                    viewpoint={editingVp}
                    onSave={handleEditorSave}
                    onClose={() => setEditorOpen(false)}
                />
            )}
        </div>
    );
}

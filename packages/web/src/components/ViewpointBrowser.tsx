import { useState, useMemo } from 'react';
import { useModelStore, getDiagramsForViewpoint } from '../store/model-store';
import { LAYER_COLORS, LAYER_ORDER, DIAGRAM_TYPE_META } from '../constants';
import type { MemoElement, DiagramDTO } from '@memo/core';

/** Additional viewpoints that should always appear even if not defined in config */
const EXTRA_VIEWPOINTS = [
    {
        id: 'interface-view',
        label: 'Interface View',
        visibleKinds: ['Port', 'PortEthernet', 'PortUSB', 'PortSerial', 'PortPower',
            'Interface', 'SoftwareInterface', 'SoftwareProvidedInterface',
            'SoftwareRequiredInterface', 'DataType', 'RosTopic', 'RosService'],
        visibleRelationships: ['association', 'dependency'],
        visibleLayers: ['interfaces'],
    },
    {
        id: 'business-view',
        label: 'Business Analysis',
        visibleKinds: ['Actor', 'Stakeholder', 'Goal', 'Concern', 'Responsibility', 'Capability'],
        visibleRelationships: ['association', 'traceTo'],
        visibleLayers: ['business'],
    },
];

function DiagramTypeBadge({ diagramType }: { diagramType: string }) {
    const meta = DIAGRAM_TYPE_META[diagramType];
    if (!meta) return null;
    return (
        <span className="px-1 py-0.5 rounded text-xs font-semibold"
            style={{
                background: meta.color + '20',
                color: meta.color,
                fontSize: '8px',
            }}
            title={meta.fullName}
        >
            {meta.code}
        </span>
    );
}

function DiagramRow({ diag, isSelected, onSelect }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
}) {
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
            title={diag.description}
        >
            <DiagramTypeBadge diagramType={diag.diagramType} />
            {diag.auto && (
                <span className="px-1 py-0.5 rounded text-xs"
                    style={{ background: '#F0F0ED', color: '#9CA3AF', fontSize: '7px', fontWeight: 600 }}>
                    AUTO
                </span>
            )}
            <span className="truncate flex-1" style={{ color: '#374151' }}>{diag.name}</span>
        </div>
    );
}

export function ViewpointBrowser() {
    const model = useModelStore(s => s.model);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const toggleLayerVisibility = useModelStore(s => s.toggleLayerVisibility);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);

    const [expandedViewpoints, setExpandedViewpoints] = useState<Set<string>>(new Set(['__model']));

    // Merge config viewpoints with extra viewpoints
    const viewpoints = useMemo(() => {
        const configVps = model?.viewpoints ?? [];
        const existingIds = new Set(configVps.map(v => v.id));
        const extras = EXTRA_VIEWPOINTS.filter(v => !existingIds.has(v.id));
        return [...configVps, ...extras];
    }, [model?.viewpoints]);

    const toggleExpand = (id: string) => {
        setExpandedViewpoints(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Get elements visible in a viewpoint
    const getViewpointElements = (vpId: string | null): MemoElement[] => {
        if (!model) return [];
        const allEls = Object.values(model.elements);
        if (!vpId || vpId === '__model') {
            return allEls.filter(e =>
                ['System', 'SystemExternal', 'Actor', 'Subsystem'].includes(e.kind)
            );
        }
        const vp = viewpoints.find(v => v.id === vpId);
        if (!vp) return allEls;
        const visKinds = new Set(vp.visibleKinds);
        const visLayers = new Set(vp.visibleLayers);
        return allEls.filter(e => visKinds.has(e.kind) || visLayers.has(e.layer));
    };

    const filterBySearch = (els: MemoElement[]): MemoElement[] => {
        if (!searchTerm) return els;
        const lower = searchTerm.toLowerCase();
        return els.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.kind.toLowerCase().includes(lower)
        );
    };

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    // Get diagrams from model DTO
    const modelDiagrams = getDiagramsForViewpoint(model, '__model');

    return (
        <div className="flex flex-col overflow-hidden" style={{ width: '300px', minWidth: '260px', background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
            {/* Header */}
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                <h1 className="text-sm font-bold tracking-wide" style={{ color: '#2DD4A8' }}>Viewpoints</h1>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {elementCount} elements &middot; {relCount} relationships
                </p>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <input
                    type="text"
                    placeholder="Search elements..."
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
                        <span style={{ color: '#9CA3AF' }}>{getViewpointElements(null).length}</span>
                        <span style={{ color: '#D1D5DB' }}>{expandedViewpoints.has('__model') ? '\u25BE' : '\u25B8'}</span>
                    </div>

                    {/* Model viewpoint diagrams + elements */}
                    {expandedViewpoints.has('__model') && (
                        <div className="ml-4">
                            {modelDiagrams.map(diag => (
                                <DiagramRow
                                    key={diag.id}
                                    diag={diag}
                                    isSelected={selectedDiagramId === diag.id}
                                    onSelect={() => selectDiagram(diag.id)}
                                />
                            ))}

                            {selectedViewpointId === null && (() => {
                                const modelEls = filterBySearch(getViewpointElements(null));
                                const layerMap = new Map<string, MemoElement[]>();
                                for (const el of modelEls) {
                                    if (!layerMap.has(el.layer)) layerMap.set(el.layer, []);
                                    layerMap.get(el.layer)!.push(el);
                                }
                                return [...layerMap.entries()].map(([layer, els]) => (
                                    <div key={layer} className="ml-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LAYER_COLORS[layer] || '#666' }} />
                                            <span className="capitalize flex-1" style={{ color: '#9CA3AF' }}>{layer}</span>
                                        </div>
                                        {els.map(el => (
                                            <div
                                                key={el.id}
                                                className="px-3 py-0.5 ml-3 cursor-pointer truncate"
                                                style={{
                                                    borderRadius: '4px',
                                                    background: selectedElementId === el.id ? '#2DD4A818' : 'transparent',
                                                    color: selectedElementId === el.id ? '#1B3A4B' : '#374151',
                                                    fontWeight: selectedElementId === el.id ? 500 : 400,
                                                }}
                                                onMouseEnter={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = '#F0F0ED'; }}
                                                onMouseLeave={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = 'transparent'; }}
                                                onClick={(e) => { e.stopPropagation(); selectElement(el.id); }}
                                            >
                                                {el.name}
                                            </div>
                                        ))}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>

                {/* Named viewpoints */}
                {viewpoints.map(vp => {
                    const isSelected = selectedViewpointId === vp.id;
                    const isExpanded = expandedViewpoints.has(vp.id);
                    const vpElements = filterBySearch(getViewpointElements(vp.id));
                    const vpColor = vp.visibleLayers[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || '#6B7280') : '#6B7280';
                    const diagrams = getDiagramsForViewpoint(model, vp.id);

                    return (
                        <div key={vp.id} className="mb-0.5">
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
                                <span style={{ color: '#9CA3AF' }}>{vpElements.length}</span>
                                <span style={{ color: '#D1D5DB' }}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                            </div>

                            {/* Expanded: show diagrams + elements grouped by layer */}
                            {isExpanded && isSelected && (
                                <div className="ml-4">
                                    {/* Diagrams for this viewpoint */}
                                    {diagrams.length > 0 && (
                                        <div className="mb-1">
                                            {diagrams.map(diag => (
                                                <DiagramRow
                                                    key={diag.id}
                                                    diag={diag}
                                                    isSelected={selectedDiagramId === diag.id}
                                                    onSelect={() => selectDiagram(diag.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Elements by layer */}
                                    {(() => {
                                        const layerMap = new Map<string, MemoElement[]>();
                                        for (const el of vpElements) {
                                            if (!layerMap.has(el.layer)) layerMap.set(el.layer, []);
                                            layerMap.get(el.layer)!.push(el);
                                        }
                                        const sortedLayers = [...layerMap.keys()].sort((a, b) => {
                                            const ai = LAYER_ORDER.indexOf(a as any);
                                            const bi = LAYER_ORDER.indexOf(b as any);
                                            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                                        });
                                        return sortedLayers.map(layer => {
                                            const els = layerMap.get(layer)!;
                                            const lColor = LAYER_COLORS[layer] || '#666';
                                            const isHidden = hiddenLayers.has(layer);
                                            return (
                                                <div key={layer}>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lColor, opacity: isHidden ? 0.3 : 1 }} />
                                                        <span className="capitalize flex-1" style={{ color: '#9CA3AF' }}>{layer}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer); }}
                                                            style={{ color: isHidden ? '#D1D5DB' : '#9CA3AF', fontSize: '10px' }}
                                                        >
                                                            {isHidden ? '\u25CB' : '\u25CF'}
                                                        </button>
                                                    </div>
                                                    {!isHidden && els.map(el => (
                                                        <div
                                                            key={el.id}
                                                            className="px-3 py-0.5 ml-3 cursor-pointer truncate"
                                                            style={{
                                                                borderRadius: '4px',
                                                                background: selectedElementId === el.id ? '#2DD4A818' : 'transparent',
                                                                color: selectedElementId === el.id ? '#1B3A4B' : '#374151',
                                                                fontWeight: selectedElementId === el.id ? 500 : 400,
                                                            }}
                                                            onMouseEnter={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = '#F0F0ED'; }}
                                                            onMouseLeave={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = 'transparent'; }}
                                                            onClick={(e) => { e.stopPropagation(); selectElement(el.id); }}
                                                        >
                                                            {el.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend — diagram type badges */}
            <div className="px-3 py-2" style={{ borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                <div className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                    {Object.entries(DIAGRAM_TYPE_META).map(([key, meta]) => (
                        <span key={key} className="px-1 py-0.5 rounded" style={{ background: meta.color + '15', color: meta.color, fontSize: '8px', fontWeight: 600 }}>
                            {meta.code}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

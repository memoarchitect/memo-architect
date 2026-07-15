import { lazy, Suspense, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useModelStore } from '../../store/model-store';
import { OntologyHome } from './OntologyHome';
import type { OntologyPackageInfo, OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';
import { KindPropertiesPanel } from './KindPropertiesPanel';
import { SysMLMappingTable } from './SysMLMappingTable';

const LayerGrid = lazy(() => import('./LayerGrid').then(m => ({ default: m.LayerGrid })));
const LayerTable = lazy(() => import('./LayerTable').then(m => ({ default: m.LayerTable })));
const RelationshipsSection = lazy(() => import('./RelationshipsSection').then(m => ({ default: m.RelationshipsSection })));
const RelationshipOverlay = lazy(() => import('./RelationshipOverlay').then(m => ({ default: m.RelationshipOverlay })));

interface OntologyDetailPanelProps {
    ontology: OntologyPackageInfo;
    onBack?: () => void;
}

// ─── Viewpoint tab configuration ─────────────────────────────────────────────
// Each tab filters the layer swimlanes to a domain-specific slice.
// `layerIds: null` means show all layers (no filter).
// `type: 'sysml-mapping'` renders the construct reference table instead of LayerGrid.

interface ViewpointTab {
    id: string;
    label: string;
    layerIds: string[] | null;
    type?: 'sysml-mapping';
    description: string;
}

const VIEWPOINT_TABS: ViewpointTab[] = [
    {
        id: 'all',
        label: 'All Layers',
        layerIds: null,
        description: 'All architecture layers in swimlane view',
    },
    {
        id: 'software',
        label: 'Software Views',
        layerIds: ['functional', 'behavior', 'logical', 'software', 'interfaces', 'ui'],
        description: 'Software architecture: Logical/Service, Runtime, Module/Code, Deployment',
    },
    {
        id: 'hardware',
        label: 'Hardware Views',
        layerIds: ['logical', 'physical', 'interfaces'],
        description: 'Hardware architecture: Logical, Physical/Embodiment, Compute/Electronics, Cross-domain',
    },
    {
        id: 'risk',
        label: 'Risk Chain',
        layerIds: ['requirements', 'risk', 'safety', 'cybersecurity', 'verification', 'analysis'],
        description: 'Risk trace chain: Hazard → HazardousSituation → Harm → RiskControl → verification',
    },
    {
        id: 'traceability',
        label: 'Traceability',
        layerIds: ['purpose', 'business', 'operational', 'requirements', 'risk', 'safety',
                   'functional', 'software', 'software-lifecycle', 'verification', 'analysis'],
        description: 'Full trace: clinical, risk, software, and hardware chains',
    },
    {
        id: 'sysml-mapping',
        label: 'SysML Mapping',
        layerIds: null,
        type: 'sysml-mapping',
        description: 'SysML v2 construct → MEMO kind reference table',
    },
];

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

function ZoomPanCanvas({ children }: { children: React.ReactNode }) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setZoom(z => clampZoom(z + delta));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input, a')) return;
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setAttribute('data-panning', 'true');
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        isPanning.current = false;
        e.currentTarget.removeAttribute('data-panning');
    }, []);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        isPanning.current = false;
        e.currentTarget.removeAttribute('data-panning');
    }, []);

    function fitToView() {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 10,
                    display: 'flex',
                    gap: '4px',
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid #E5E5E0',
                    borderRadius: '8px',
                    padding: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
            >
                <CanvasToolbarBtn title="Zoom in" onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}>+</CanvasToolbarBtn>
                <span style={{ fontSize: '10px', color: '#6B7280', lineHeight: '26px', minWidth: '34px', textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                </span>
                <CanvasToolbarBtn title="Zoom out" onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))}>−</CanvasToolbarBtn>
                <div style={{ width: '1px', background: '#E5E5E0', margin: '2px 0' }} />
                <CanvasToolbarBtn title="Fit to view" onClick={fitToView}>⊡</CanvasToolbarBtn>
            </div>

            <div
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    cursor: isPanning.current ? 'grabbing' : 'grab',
                    userSelect: 'none',
                }}
            >
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        willChange: 'transform',
                        padding: '16px',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

function CanvasToolbarBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: '26px',
                height: '26px',
                border: 'none',
                borderRadius: '5px',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
            {children}
        </button>
    );
}

export function OntologyDetailPanel({ ontology, onBack }: OntologyDetailPanelProps) {
    const viewMode = useModelStore(s => s.ontologyViewMode);
    const setOntologyViewMode = useModelStore(s => s.setOntologyViewMode);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const showRelationships = useModelStore(s => s.showOntologyRelationships);
    const toggleRelationships = useModelStore(s => s.toggleOntologyRelationships);
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const availableOntologies = useModelStore(s => s.availableOntologies);

    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set());
    const [activeViewpointTab, setActiveViewpointTab] = useState<string>('all');

    // Properties panel open state — auto-opens when a kind is selected
    const [propertiesOpen, setPropertiesOpen] = useState(false);

    // Flash state — triggers kind-card highlight animation on navigation
    const [flashKindName, setFlashKindName] = useState<string | null>(null);
    const [flashTick, setFlashTick] = useState(0);

    // Auto-open properties and flash target card when selected kind changes
    useEffect(() => {
        if (selectedKind) {
            setPropertiesOpen(true);
            setFlashKindName(selectedKind);
            setFlashTick(t => t + 1);
        }
    }, [selectedKind]);

    const enrichedOntology: OntologyPackageInfo = useMemo(() => ({
        ...ontology,
        layers: ontology.layers.map(layer => ({
            ...layer,
            kinds: layer.kinds.map(kind => ({
                ...kind,
                instanceCount: model
                    ? Object.values(model.elements).filter(el => el.kind === kind.name).length
                    : 0,
                viewpoints: model?.viewpoints
                    ?.filter(vp => vp.visibleKinds.includes(kind.name))
                    .map(vp => vp.id) ?? [],
            })),
        })),
    }), [ontology, model]);

    // Filter layers to the selected viewpoint tab
    const activeTab = VIEWPOINT_TABS.find(t => t.id === activeViewpointTab) ?? VIEWPOINT_TABS[0];
    const filteredLayers: OntologyLayerInfo[] = useMemo(() => {
        if (!activeTab.layerIds) return enrichedOntology.layers;
        const allowed = new Set(activeTab.layerIds);
        return enrichedOntology.layers.filter(l => allowed.has(l.id));
    }, [enrichedOntology.layers, activeTab.layerIds]);

    // Resolve selected kind's layer — used for breadcrumb
    const selectedKindData = useMemo(() => {
        if (!selectedKind) return null;
        for (const layer of enrichedOntology.layers) {
            const k = layer.kinds.find(k => k.name === selectedKind);
            if (k) return { kind: k, layerInfo: layer };
        }
        return null;
    }, [selectedKind, enrichedOntology]);

    // Cross-ontology navigation — navigate to the target package and select the kind there
    function handleCrossOntologyNavigate(packageName: string, kindName: string) {
        setSelectedKind(kindName);
        setActiveView({ type: 'ontology-detail', packageName });
        // The new OntologyDetailPanel mounts with selectedKind set → auto-opens and flashes
    }

    // Breadcrumb layer click — scroll grid to that layer
    function handleLayerBreadcrumbClick(layerId: string) {
        setActiveView({ type: 'ontology-detail', packageName: ontology.name, layerId });
    }

    const activeStyle: React.CSSProperties = { background: '#1B3A4B', color: '#2DD4A8', border: '1px solid transparent' };
    const inactiveStyle: React.CSSProperties = { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' };

    return (
        <div className="flex flex-1 overflow-hidden" style={{ background: '#F7F7F5' }}>
            {/* Main content column */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    {/* Breadcrumb: Ontology Library / package / layer / kind */}
                    <div className="flex items-center gap-1.5 mb-3 text-xs flex-wrap" style={{ color: '#9CA3AF' }}>
                        {onBack && (
                            <>
                                <button onClick={onBack} className="hover:underline" style={{ color: '#2563EB' }}>
                                    Ontology Library
                                </button>
                                <span>/</span>
                            </>
                        )}
                        <button
                            onClick={() => setSelectedKind(null)}
                            className="hover:underline"
                            style={{ color: selectedKindData ? '#2563EB' : '#374151', fontWeight: selectedKindData ? 400 : 500 }}
                        >
                            {ontology.name}
                        </button>
                        {selectedKindData && (
                            <>
                                <span>/</span>
                                <button
                                    onClick={() => handleLayerBreadcrumbClick(selectedKindData.layerInfo.id)}
                                    className="hover:underline"
                                    style={{ color: '#2563EB' }}
                                >
                                    {selectedKindData.layerInfo.label}
                                </button>
                                <span>/</span>
                                <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                                    {selectedKind}
                                </span>
                            </>
                        )}
                    </div>
                    <OntologyHome ontology={enrichedOntology} />
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>Layers:</span>
                        <button onClick={() => setOntologyViewMode('visual')} className="px-2.5 py-1 text-xs rounded-md font-medium" style={viewMode === 'visual' ? activeStyle : inactiveStyle}>Visual</button>
                        <button onClick={() => setOntologyViewMode('table')} className="px-2.5 py-1 text-xs rounded-md font-medium" style={viewMode === 'table' ? activeStyle : inactiveStyle}>Table</button>
                        <span style={{ width: '1px', height: '16px', background: '#E5E5E0', margin: '0 4px' }} />
                        <button onClick={toggleRelationships} className="px-2.5 py-1 text-xs rounded-md font-medium" style={showRelationships ? activeStyle : inactiveStyle}>
                            {showRelationships ? 'Hide' : 'Show'} Relationships
                        </button>
                    </div>

                    {/* Viewpoint tab strip */}
                    <div
                        className="flex items-center gap-0 mt-3 -mx-6 px-6"
                        style={{ borderTop: '1px solid #E5E5E0', paddingTop: '10px' }}
                    >
                        <span className="text-xs mr-2" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>View:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                            {VIEWPOINT_TABS.map(tab => {
                                const isActive = activeViewpointTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveViewpointTab(tab.id)}
                                        title={tab.description}
                                        className="px-2.5 py-1 text-xs rounded-md font-medium transition-all"
                                        style={isActive ? activeStyle : inactiveStyle}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                        {filteredLayers.length !== enrichedOntology.layers.length && activeTab.type !== 'sysml-mapping' && (
                            <span className="ml-auto text-xs" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                {filteredLayers.length} of {enrichedOntology.layers.length} layers
                            </span>
                        )}
                    </div>
                </div>

                {activeTab.type === 'sysml-mapping' ? (
                    <div className="px-6 py-4">
                        <SysMLMappingTable layers={enrichedOntology.layers} />
                    </div>
                ) : viewMode === 'visual' ? (
                    <>
                        <div style={{ height: '280px', position: 'relative', borderBottom: '1px solid #E5E5E0' }}>
                            <ZoomPanCanvas>
                                <div ref={gridContainerRef} style={{ position: 'relative' }}>
                                    <Suspense fallback={<LayerFallback layers={filteredLayers} />}>
                                        <LayerGrid
                                            layers={filteredLayers}
                                            selectedKind={selectedKind}
                                            onKindClick={setSelectedKind}
                                            activeLayerId={(activeView as { layerId?: string }).layerId ?? null}
                                            flashKindName={flashKindName}
                                            flashTick={flashTick}
                                        />
                                    </Suspense>
                                    {showRelationships && (
                                        <Suspense fallback={null}>
                                            <RelationshipOverlay
                                                containerRef={gridContainerRef}
                                                ontology={{ ...enrichedOntology, layers: filteredLayers }}
                                                activeTypes={activeRelTypes}
                                            />
                                        </Suspense>
                                    )}
                                </div>
                            </ZoomPanCanvas>
                        </div>

                        {showRelationships && (
                            <div className="px-6 py-4">
                                <Suspense fallback={null}>
                                    <RelationshipsSection
                                        ontology={{ ...enrichedOntology, layers: filteredLayers }}
                                        activeTypes={activeRelTypes}
                                        onActiveTypesChange={setActiveRelTypes}
                                    />
                                </Suspense>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="px-6 py-4">
                        <Suspense fallback={<LayerFallback layers={filteredLayers} />}>
                            <LayerTable layers={filteredLayers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                        </Suspense>
                        {showRelationships && (
                            <Suspense fallback={null}>
                                <RelationshipsSection
                                    ontology={{ ...enrichedOntology, layers: filteredLayers }}
                                    activeTypes={activeRelTypes}
                                    onActiveTypesChange={setActiveRelTypes}
                                />
                            </Suspense>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Properties panel — auto-opens when a kind is selected */}
            {propertiesOpen && selectedKindData && (
                <KindPropertiesPanel
                    kind={selectedKindData.kind}
                    layers={enrichedOntology.layers}
                    allOntologies={availableOntologies}
                    onKindClick={setSelectedKind}
                    onNavigate={handleCrossOntologyNavigate}
                    onClose={() => { setSelectedKind(null); setPropertiesOpen(false); }}
                />
            )}
        </div>
    );
}

/** Inline fallback layer grid rendered while lazy chunks load */
function LayerFallback({ layers }: { layers: OntologyPackageInfo['layers'] }) {
    return (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {layers.map(layer => {
                const color = (LAYER_COLORS as Record<string, string>)[layer.id] ?? layer.color ?? '#6B7280';
                return (
                    <div
                        key={layer.id}
                        className="rounded-xl p-4"
                        style={{ background: '#FFFFFF', border: `2px solid ${color}30` }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{layer.label}</span>
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{layer.kindCount} kinds</div>
                    </div>
                );
            })}
        </div>
    );
}

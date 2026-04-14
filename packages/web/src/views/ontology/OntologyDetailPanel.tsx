// ─── OntologyDetailPanel ──────────────────────────────────────────────────────
//
// Right panel of the Ontology Viewer. Shows:
//   1. OntologyHome card (name, desc, counts)
//   2. Visual/Table toggle + LayerGrid or LayerTable inside a zoomable canvas
//   3. RelationshipsSection (collapsible)
//
// The visual LayerGrid is wrapped in a zoom/pan canvas (scroll-to-zoom,
// drag-to-pan, fit-to-view button). The properties slide-in is removed from
// this panel — kind selection is surfaced via the explorer sidebar.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useMemo, useRef, useState, useCallback } from 'react';
import { useModelStore } from '../../store/model-store';
import { OntologyHome } from './OntologyHome';
import type { OntologyPackageInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

const LayerGrid = lazy(() => import('./LayerGrid').then(m => ({ default: m.LayerGrid })));
const LayerTable = lazy(() => import('./LayerTable').then(m => ({ default: m.LayerTable })));
const RelationshipsSection = lazy(() => import('./RelationshipsSection').then(m => ({ default: m.RelationshipsSection })));
const RelationshipOverlay = lazy(() => import('./RelationshipOverlay').then(m => ({ default: m.RelationshipOverlay })));

interface OntologyDetailPanelProps {
    ontology: OntologyPackageInfo;
    onBack?: () => void;
}

// ─── Zoom/Pan canvas wrapper ──────────────────────────────────────────────────

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
        // Only pan on the background (not on cards/buttons inside)
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
            {/* Toolbar */}
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

            {/* Pan/zoom container */}
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

// ─── Main panel ───────────────────────────────────────────────────────────────

export function OntologyDetailPanel({ ontology, onBack }: OntologyDetailPanelProps) {
    const viewMode = useModelStore(s => s.ontologyViewMode);
    const setOntologyViewMode = useModelStore(s => s.setOntologyViewMode);
    const selectedKind = useModelStore(s => s.selectedOntologyKind);
    const setSelectedKind = useModelStore(s => s.setSelectedOntologyKind);
    const showRelationships = useModelStore(s => s.showOntologyRelationships);
    const toggleRelationships = useModelStore(s => s.toggleOntologyRelationships);
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);

    // Container ref for the RelationshipOverlay positioning
    const gridContainerRef = useRef<HTMLDivElement>(null);
    // Highlighted types from the RelationshipsSection filter panel
    const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set());

    // Enrich kind instanceCounts from model
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

    const activeStyle: React.CSSProperties = { background: '#1B3A4B', color: '#2DD4A8', border: '1px solid transparent' };
    const inactiveStyle: React.CSSProperties = { background: '#F0F0ED', color: '#6B7280', border: '1px solid transparent' };

    return (
        <div className="flex-1 overflow-y-auto" style={{ background: '#F7F7F5' }}>
            {/* Header: breadcrumb + home card + toolbar */}
            <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #E5E5E0' }}>
                {onBack && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: '#9CA3AF' }}>
                        <button onClick={onBack} className="hover:underline" style={{ color: '#2563EB' }}>
                            Ontology Library
                        </button>
                        <span>/</span>
                        <span style={{ color: '#374151' }}>{ontology.name}</span>
                    </div>
                )}
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
            </div>

            {/* Layer view — fixed-height zoomable/pannable canvas for visual; plain scroll for table */}
            {viewMode === 'visual' ? (
                <>
                    {/* Canvas: fixed height so it's always visible without pushing content off-screen */}
                    <div style={{ height: '280px', position: 'relative', borderBottom: '1px solid #E5E5E0' }}>
                        <ZoomPanCanvas>
                            {/* Positioned wrapper shared by LayerGrid and SVG overlay */}
                            <div ref={gridContainerRef} style={{ position: 'relative' }}>
                                <Suspense fallback={<LayerFallback layers={enrichedOntology.layers} />}>
                                    <LayerGrid
                                        layers={enrichedOntology.layers}
                                        selectedKind={selectedKind}
                                        onKindClick={setSelectedKind}
                                        activeLayerId={(activeView as { layerId?: string }).layerId ?? null}
                                    />
                                </Suspense>
                                {showRelationships && (
                                    <Suspense fallback={null}>
                                        <RelationshipOverlay
                                            containerRef={gridContainerRef}
                                            ontology={enrichedOntology}
                                            activeTypes={activeRelTypes}
                                        />
                                    </Suspense>
                                )}
                            </div>
                        </ZoomPanCanvas>
                    </div>

                    {/* Relationships filter panel — directly below canvas */}
                    {showRelationships && (
                        <div className="px-6 py-4">
                            <Suspense fallback={null}>
                                <RelationshipsSection
                                    ontology={enrichedOntology}
                                    activeTypes={activeRelTypes}
                                    onActiveTypesChange={setActiveRelTypes}
                                />
                            </Suspense>
                        </div>
                    )}
                </>
            ) : (
                <div className="px-6 py-4">
                    <Suspense fallback={<LayerFallback layers={enrichedOntology.layers} />}>
                        <LayerTable layers={enrichedOntology.layers} selectedKind={selectedKind} onKindClick={setSelectedKind} />
                    </Suspense>
                    {showRelationships && (
                        <Suspense fallback={null}>
                            <RelationshipsSection
                                ontology={enrichedOntology}
                                activeTypes={activeRelTypes}
                                onActiveTypesChange={setActiveRelTypes}
                            />
                        </Suspense>
                    )}
                </div>
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

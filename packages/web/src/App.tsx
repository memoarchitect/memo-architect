import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useModelStore } from './store/model-store';
import { connectWebSocket, loadEmbeddedData } from './store/ws-client';
import { WorkbenchToolbar } from './components/WorkbenchToolbar';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ExplorerPanel } from './components/ExplorerPanel';
import { UnifiedPropertiesPanel } from './components/UnifiedPropertiesPanel';
import { CompletenessBar } from './components/CompletenessBar';
import { GapBar } from './components/GapBar';
import { CommandPalette } from './components/CommandPalette';
import { Breadcrumb } from './components/Breadcrumb';
import { OnboardingTour } from './components/OnboardingTour';
import { CatalogHomePage } from './views/CatalogHomePage';
import { ElementCollectionPage } from './views/ElementCollectionPage';

// ─── Lazy-loaded views (code splitting for large deps like ReactFlow/ELK) ──
const DiagramCanvas = lazy(() => import('./views/DiagramCanvas').then(m => ({ default: m.DiagramCanvas })));
const ActionFlowDiagram = lazy(() => import('./views/ActionFlowDiagram').then(m => ({ default: m.ActionFlowDiagram })));
const DSMView = lazy(() => import('./views/DSMView').then(m => ({ default: m.DSMView })));
const OntologyViewer = lazy(() => import('./views/OntologyViewer').then(m => ({ default: m.OntologyViewer })));
const TraceabilityMatrix = lazy(() => import('./views/TraceabilityMatrix').then(m => ({ default: m.TraceabilityMatrix })));
const ScenarioEditor = lazy(() => import('./views/ScenarioEditor').then(m => ({ default: m.ScenarioEditor })));
const ModelDiff = lazy(() => import('./views/ModelDiff').then(m => ({ default: m.ModelDiff })));
const ComplianceWizard = lazy(() => import('./views/ComplianceWizard').then(m => ({ default: m.ComplianceWizard })));
const StatisticsDashboard = lazy(() => import('./views/StatisticsDashboard').then(m => ({ default: m.StatisticsDashboard })));
const DhfDashboard = lazy(() => import('./views/DhfDashboard').then(m => ({ default: m.DhfDashboard })));
const ElementDetailView = lazy(() => import('./views/ElementDetailView').then(m => ({ default: m.ElementDetailView })));

function UnifiedCanvas() {
    const activeView = useModelStore(s => s.activeView);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const selectDiagram = useModelStore(s => s.selectDiagram);

    // Sync legacy selectedDiagramId with activeView for DiagramCanvas compatibility
    useEffect(() => {
        if (activeView.type === 'diagram') {
            if (selectedDiagramId !== activeView.diagramId) {
                selectDiagram(activeView.diagramId);
            }
        }
    }, [activeView, selectedDiagramId, selectDiagram]);

    const renderView = () => {
        switch (activeView.type) {
            case 'diagram':
                return <DiagramCanvas />;
            case 'actionflow':
                return <ActionFlowDiagram />;
            case 'dsm':
                return <DSMView />;
            case 'traceability':
                return <TraceabilityMatrix />;
            case 'ontology':
                return <OntologyViewer />;
            case 'scenario-editor':
                return <ScenarioEditor />;
            case 'model-diff':
                return <ModelDiff />;
            case 'compliance-wizard':
                return <ComplianceWizard />;
            case 'statistics':
                return <StatisticsDashboard />;
            case 'dhf-dashboard':
                return <DhfDashboard />;
            case 'element-detail':
                return <ElementDetailView />;
            case 'welcome':
            default:
                return <WelcomeCanvas />;
        }
    };

    if (activeView.type === 'welcome') {
        return <WelcomeCanvas />;
    }

    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            {renderView()}
        </Suspense>
    );
}

function ViewLoadingFallback() {
    return (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
            <div className="text-center" style={{ color: '#9CA3AF' }}>
                <img src="/logo.png" alt="MEMO Logo" style={{ width: '180px', marginBottom: '24px', opacity: 0.4, filter: 'grayscale(1)' }} className="animate-pulse" />
                <div className="text-xs mt-2">Loading view...</div>
            </div>
        </div>
    );
}

function WelcomeCanvas() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);

    const diagramCount = model?.diagrams?.length ?? 0;
    const elementCount = model ? Object.keys(model.elements).length : 0;

    return (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
            <div className="text-center max-w-4xl" style={{ lineHeight: '1.7', transform: 'translateY(-88px)' }}>
                <img 
                    src="/logo.png" 
                    alt="MEMO Logo" 
                    style={{ 
                        width: '715px', 
                        maxWidth: '100%',
                        maxHeight: '65vh',
                        objectFit: 'contain', 
                        display: 'block', 
                        margin: '0 auto -66px auto', 
                        opacity: 0.95 
                    }} 
                />
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#374151' }}>
                    Welcome to MEMO Architect
                </h2>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                    Use the Explorer panel to browse model elements or select a diagram view.
                </p>
                {diagramCount > 0 && (
                    <button
                        className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2DD4A830'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2DD4A815'}
                        onClick={() => setExplorerTab('views')}
                    >
                        Browse {diagramCount} diagrams
                    </button>
                )}
                {diagramCount === 0 && elementCount > 0 && (
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                        {elementCount} elements loaded. Use the Tools menu for DSM, Action Flow, or Ontology views.
                    </p>
                )}
            </div>
        </div>
    );
}

export function App() {
    const connected = useModelStore(s => s.connected);
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const { pathname } = useLocation();
    const isCatalogRoute = pathname.startsWith('/catalog') || pathname.startsWith('/diagrams');

    useEffect(() => {
        if (!loadEmbeddedData()) {
            connectWebSocket();
        }
    }, []);

    const elementCount = model ? Object.keys(model.elements).length : 0;

    // Connection state
    if (!connected) {
        return (
            <div className="flex flex-col h-screen" style={{ background: '#F7F7F5', color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-center max-w-md">
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '180px', display: 'block', margin: '0 auto 24px auto', opacity: 0.4, filter: 'grayscale(1)' }} className="animate-pulse" />
                        <div className="text-sm mt-2 mb-4">Connecting to dev server...</div>
                        <div style={{ color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                            <p>Start the MEMO dev server from your project directory:</p>
                            <code style={{
                                display: 'block', margin: '12px auto', padding: '8px 16px',
                                background: '#1a1a1a', color: '#E5E7EB', borderRadius: '6px',
                                fontFamily: 'monospace', fontSize: '13px', width: 'fit-content'
                            }}>
                                pnpm memo dev --port 3000
                            </code>
                            <p style={{ marginTop: '8px' }}>
                                Or use the example project:
                            </p>
                            <code style={{
                                display: 'block', margin: '12px auto', padding: '8px 16px',
                                background: '#1a1a1a', color: '#E5E7EB', borderRadius: '6px',
                                fontFamily: 'monospace', fontSize: '13px', width: 'fit-content'
                            }}>
                                pnpm example:dev
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Waiting for model
    if (!model) {
        return (
            <div className="flex flex-col h-screen" style={{ background: '#F7F7F5', color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-center">
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '180px', display: 'block', margin: '0 auto 24px auto', opacity: 0.4, filter: 'grayscale(1)' }} className="animate-pulse" />
                        <div className="text-sm mt-2">Waiting for model data...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty model
    if (elementCount === 0) {
        return (
            <div className="flex flex-col h-screen" style={{ background: '#F7F7F5', color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center" style={{ color: '#6B7280' }}>
                    <div className="text-center max-w-lg" style={{ lineHeight: '1.7' }}>
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '300px', display: 'block', margin: '0 auto 36px auto', opacity: 0.3, filter: 'grayscale(1)' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                            No model elements found
                        </h2>
                        <p style={{ fontSize: '14px', marginBottom: '20px' }}>
                            Your project is connected but has no <code>.sysml</code> files with elements yet.
                        </p>
                        <div style={{
                            textAlign: 'left', background: '#F3F4F6', borderRadius: '8px',
                            padding: '16px 20px', fontSize: '13px',
                        }}>
                            <p style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Get started:</p>
                            <ol style={{ paddingLeft: '18px', margin: 0 }}>
                                <li style={{ marginBottom: '6px' }}>
                                    Create a <code>.sysml</code> file in your <code>model/</code> directory
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    Or import from CSV: <code>pnpm memo import template elements</code>
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    Or scaffold a new project: <code>pnpm memo init my-device</code>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Unified Workbench Layout ────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen" style={{ background: '#F7F7F5', color: '#1a1a1a' }}>
            {/* Sync URL → store on load / navigation */}
            <UrlNavigationSync />

            {/* Toolbar */}
            <WorkbenchToolbar />

            {/* Primary nav bar */}
            <ModeSwitcher />

            {/* Breadcrumb */}
            <Breadcrumb />

            {/* Main 3-panel layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Explorer (Model + Views) */}
                <ExplorerPanel />

                {/* Center: route-aware canvas */}
                <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
                    <Routes>
                        {/* Catalog routes — new deep-link pages */}
                        <Route path="/catalog" element={<CatalogHomePage />} />
                        <Route path="/catalog/:family" element={<FamilyRoute />} />
                        <Route path="/catalog/:family/:shortId" element={<ElementPermalinkRoute />} />
                        {/* Diagram routes */}
                        <Route path="/diagrams/:diagramType/:diagramId" element={<DiagramPermalinkRoute />} />
                        {/* Default: existing state-driven canvas */}
                        <Route path="*" element={<UnifiedCanvas />} />
                    </Routes>
                </div>

                {/* Right: Properties Panel — hidden in element-detail and catalog modes */}
                {activeView.type !== 'element-detail' && !isCatalogRoute && <UnifiedPropertiesPanel />}
            </div>

            {/* Completeness color bar */}
            <CompletenessBar />

            {/* Gap bar (violations) */}
            <GapBar />

            {/* Command palette (Cmd+K) */}
            <CommandPalette />

            {/* First-run onboarding tour */}
            <OnboardingTour />
        </div>
    );
}

// ─── URL-driven route components ─────────────────────────────────────────────

/** Renders /catalog/:family */
function FamilyRoute() {
    const { family = '' } = useParams<{ family: string }>();
    return <ElementCollectionPage family={family.toUpperCase()} />;
}

/** Renders /catalog/:family/:shortId — finds element by shortId and shows its detail */
function ElementPermalinkRoute() {
    const { shortId = '' } = useParams<{ shortId: string }>();
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectElement = useModelStore(s => s.selectElement);

    useEffect(() => {
        if (!model) return;
        const element = Object.values(model.elements).find(
            el => (el.shortId ?? el.id) === shortId
        );
        if (element) {
            selectElement(element.id);
            setActiveView({ type: 'element-detail', elementId: element.id });
        }
    }, [shortId, model, setActiveView, selectElement]);

    // Render the ElementDetailView via the active view state
    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            <ElementDetailView />
        </Suspense>
    );
}

/** Renders /diagrams/:diagramType/:diagramId */
function DiagramPermalinkRoute() {
    const { diagramId = '' } = useParams<{ diagramType: string; diagramId: string }>();
    const model = useModelStore(s => s.model);
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const setActiveView = useModelStore(s => s.setActiveView);

    useEffect(() => {
        if (!model) return;
        const diagram = model.diagrams?.find(
            d => d.id === diagramId || d.id.toLowerCase().replace(/\s+/g, '-') === diagramId
        );
        if (diagram) {
            selectDiagram(diagram.id);
            setActiveView({ type: 'diagram', diagramId: diagram.id });
        }
    }, [diagramId, model, selectDiagram, setActiveView]);

    return (
        <Suspense fallback={<ViewLoadingFallback />}>
            <DiagramCanvas />
        </Suspense>
    );
}

/**
 * Listens to location changes and syncs the store's navigation back to the URL
 * when the user navigates via the sidebar (store → URL push).
 * Also handles deep-link on initial load.
 */
function UrlNavigationSync() {
    const activeView = useModelStore(s => s.activeView);
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();
    const location = useLocation();

    // Store → URL: when the user clicks an element in the explorer, push to history
    useEffect(() => {
        if (activeView.type === 'element-detail' && model) {
            const elementId = (activeView as { type: 'element-detail'; elementId: string }).elementId;
            const element = model.elements[elementId];
            if (element) {
                const shortId = element.shortId ?? element.id;
                const family = shortId.split('-')[0];
                const url = `/catalog/${family}/${shortId}`;
                if (location.pathname !== url) {
                    navigate(url, { replace: false });
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView]);

    return null;
}

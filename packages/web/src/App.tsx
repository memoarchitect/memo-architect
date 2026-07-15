import { useEffect, lazy, Suspense, useMemo } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useModelStore } from './store/model-store';
import { connectWebSocket, loadEmbeddedData } from './store/ws-client';
import { WorkbenchToolbar } from './components/WorkbenchToolbar';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ExplorerPanel } from './components/ExplorerPanel';
import { UnifiedPropertiesPanel } from './components/UnifiedPropertiesPanel';
import { BulkEditPanel } from './components/BulkEditPanel';
import { GapBar } from './components/GapBar';
import { CommandPalette } from './components/CommandPalette';
import { BulkImportModal } from './components/BulkImportModal';
import { Breadcrumb } from './components/Breadcrumb';
import { OnboardingTour } from './components/OnboardingTour';
import { RestartRequiredBanner } from './components/RestartRequiredBanner';
import { CatalogHomePage } from './views/CatalogHomePage';
import { ElementCollectionPage } from './views/ElementCollectionPage';

// ─── Lazy-loaded views (code splitting for large deps like ReactFlow/ELK) ──
const DiagramEditor = lazy(() => import('./views/DiagramEditor').then(m => ({ default: m.DiagramEditor })));
const DiagramSurface = lazy(() => import('./views/DiagramSurface').then(m => ({ default: m.DiagramSurface })));
const DSMView = lazy(() => import('./views/DSMView').then(m => ({ default: m.DSMView })));
const OntologyViewer = lazy(() => import('./views/ontology/OntologyViewer').then(m => ({ default: m.OntologyViewer })));
const TraceabilityMatrix = lazy(() => import('./views/TraceabilityMatrix').then(m => ({ default: m.TraceabilityMatrix })));
const ScenarioEditor = lazy(() => import('./views/ScenarioEditor').then(m => ({ default: m.ScenarioEditor })));
const ModelDiff = lazy(() => import('./views/ModelDiff').then(m => ({ default: m.ModelDiff })));
const ComplianceWizard = lazy(() => import('./views/ComplianceWizard').then(m => ({ default: m.ComplianceWizard })));
const StatisticsDashboard = lazy(() => import('./views/StatisticsDashboard').then(m => ({ default: m.StatisticsDashboard })));
const DhfDashboard = lazy(() => import('./views/DhfDashboard').then(m => ({ default: m.DhfDashboard })));
const DhfWorkbench = lazy(() => import('./views/DhfWorkbench').then(m => ({ default: m.DhfWorkbench })));
const AskPanel = lazy(() => import('./views/AskPanel').then(m => ({ default: m.AskPanel })));
const SysmlGenerator = lazy(() => import('./views/SysmlGenerator').then(m => ({ default: m.SysmlGenerator })));
const ElementDetailView = lazy(() => import('./views/ElementDetailView').then(m => ({ default: m.ElementDetailView })));
const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const ReviewDashboard = lazy(() => import('./views/ReviewDashboard').then(m => ({ default: m.ReviewDashboard })));
const WorkflowWizard = lazy(() => import('./views/WorkflowWizard').then(m => ({ default: m.WorkflowWizard })));
const TabularView = lazy(() => import('./views/TabularView').then(m => ({ default: m.TabularView })));
const ImportView = lazy(() => import('./views/ImportView').then(m => ({ default: m.ImportView })));

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
                return <DiagramEditor diagramId={activeView.diagramId} />;
            case 'dsm':
                return <DSMView />;
            case 'traceability':
                return <TraceabilityMatrix />;
            case 'tabular':
                return <TabularView />;
            case 'ontology':
            case 'ontology-detail':
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
            case 'dhf-document':
                return <DhfWorkbench />;
            case 'dhf-dashboard-legacy':
                return <DhfDashboard />;
            case 'ask':
                return <AskPanel />;
            case 'sysml-generator':
                return <SysmlGenerator />;
            case 'element-detail':
                return <ElementDetailView />;
            case 'dashboard':
                return <Dashboard />;
            case 'review-dashboard':
                return <ReviewDashboard />;
            case 'workflow-wizard':
                return <WorkflowWizard />;
            case 'import':
                return <ImportView />;
            case 'welcome':
            default:
                return <WelcomeCanvas />;
        }
    };

    if (activeView.type === 'welcome' || activeView.type === 'dashboard') {
        // Dashboard and Welcome render without Suspense (they're fast)
        if (activeView.type === 'welcome') return <WelcomeCanvas />;
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

const WELCOME_GRADIENT = 'linear-gradient(135deg, #EEF7F3 0%, #EAF2F8 55%, #F2EEF8 100%)';

function WelcomeCanvas() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectElement = useModelStore(s => s.selectElement);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);

    const diagramCount = model?.diagrams?.length ?? 0;
    const elementCount = model ? Object.keys(model.elements).length : 0;

    // Quick-browse: up to 8 elements sampled across kinds for variety
    const quickElements = useMemo(() => {
        if (!model) return [];
        const byKind = new Map<string, typeof model.elements[string]>();
        for (const el of Object.values(model.elements)) {
            if (!byKind.has(el.kind)) byKind.set(el.kind, el);
        }
        return Array.from(byKind.values()).slice(0, 8);
    }, [model]);

    function openElement(id: string) {
        selectElement(id);
        setActiveView({ type: 'element-detail', elementId: id });
    }

    return (
        <div
            className="flex-1 flex flex-col items-center justify-center overflow-auto"
            style={{ background: WELCOME_GRADIENT, padding: '48px 40px' }}
        >
            {/* Logo */}
            <img
                src="/logo.png"
                alt="MEMO Logo"
                style={{ width: '520px', maxWidth: '80vw', maxHeight: '40vh', objectFit: 'contain', marginBottom: '-36px', opacity: 0.97 }}
            />

            {/* Headline */}
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1B3A4B', marginBottom: '6px', marginTop: 0 }}>
                MEMO Architect
            </h2>
            <p style={{ fontSize: '14px', color: '#4B6E80', marginTop: 0, marginBottom: '24px', maxWidth: '480px', textAlign: 'center', lineHeight: '1.6' }}>
                SysML-based medical device architecture tool, aligned with ISO&nbsp;14971 and IEC&nbsp;62304.
            </p>

            {/* Stats pill */}
            {elementCount > 0 && (
                <div className="flex items-center gap-4 mb-6" style={{ fontSize: '13px', color: '#4B6E80' }}>
                    <span><strong style={{ color: '#1B3A4B' }}>{elementCount}</strong> elements</span>
                    <span style={{ color: '#CBD5DB' }}>·</span>
                    <span><strong style={{ color: '#1B3A4B' }}>{diagramCount}</strong> diagrams</span>
                    {model?.relationships && (
                        <>
                            <span style={{ color: '#CBD5DB' }}>·</span>
                            <span><strong style={{ color: '#1B3A4B' }}>{model.relationships.length}</strong> relationships</span>
                        </>
                    )}
                </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-3 mb-8">
                <button
                    onClick={() => setExplorerTab('model')}
                    className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all"
                    style={{ background: '#1B3A4B', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#244D63'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1B3A4B'}
                >
                    Browse Model
                </button>
                {diagramCount > 0 && (
                    <button
                        onClick={() => setExplorerTab('views')}
                        className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all"
                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2DD4A830'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2DD4A815'}
                    >
                        View Diagrams ({diagramCount})
                    </button>
                )}
            </div>

            {/* Quick Browse */}
            {quickElements.length > 0 && (
                <div style={{ width: '100%', maxWidth: '680px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#7A9BAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                        Quick Browse
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                        {quickElements.map(el => (
                            <button
                                key={el.id}
                                onClick={() => openElement(el.id)}
                                style={{
                                    textAlign: 'left', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)',
                                    borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
                                    backdropFilter: 'blur(4px)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <div style={{ fontSize: '10px', color: '#7A9BAA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                                    {el.kind}
                                </div>
                                <div style={{ fontSize: '13px', color: '#1B3A4B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {el.name}
                                </div>
                                {el.shortId && (
                                    <div style={{ fontSize: '10px', color: '#9CB8C5', marginTop: '2px', fontFamily: 'monospace' }}>
                                        {el.shortId}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function App() {
    const connected = useModelStore(s => s.connected);
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const selectedElementIds = useModelStore(s => s.selectedElementIds);
    const { pathname } = useLocation();
    // Diagram routes still use the workbench's right-hand properties browser.
    // Only catalog pages are self-contained full-page routes.
    const isCatalogRoute = pathname.startsWith('/catalog');
    const activeMode = useModelStore(s => s.activeMode);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const toggleGapBar = useModelStore(s => s.toggleGapBar);

    // Cmd+Shift+P toggles the GapBar (Problems/Completeness panel) (#20)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                toggleGapBar();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleGapBar]);

    // Only hide the explorer for views with their own full-page internal explorer,
    // or tool views that are self-contained (DSM has its own filter toolbar).
    const showExplorer = activeView.type !== 'scenario-editor'
        && activeView.type !== 'dsm';

    // Auto-open the sidebar whenever we switch to a view that needs it but it's
    // still collapsed from a previous non-explorer mode (e.g. Scenarios → element-detail).
    useEffect(() => {
        if (showExplorer && sidebarCollapsed) {
            toggleSidebar();
        }
    // Only run when the view type changes — not on every sidebarCollapsed toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView.type]);

    useEffect(() => {
        if (!loadEmbeddedData()) {
            connectWebSocket();
        }
    }, []);

    const elementCount = model ? Object.keys(model.elements).length : 0;

    // Connection state
    if (!connected) {
        return (
            <div className="flex flex-col h-screen" style={{ background: WELCOME_GRADIENT, color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '360px', maxWidth: '80vw', display: 'block', margin: '0 auto -20px auto', opacity: 0.45, filter: 'grayscale(1)' }} className="animate-pulse" />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1B3A4B', marginBottom: '8px' }}>
                            MEMO Architect
                        </h2>
                        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '20px' }}>Connecting to dev server…</p>
                        <div style={{ color: '#6B7280', fontSize: '13px', lineHeight: '1.6', textAlign: 'left', background: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.9)' }}>
                            <p style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Start the MEMO dev server:</p>
                            <code style={{
                                display: 'block', margin: '0 0 12px', padding: '8px 14px',
                                background: '#1B3A4B', color: '#2DD4A8', borderRadius: '6px',
                                fontFamily: 'monospace', fontSize: '13px',
                            }}>
                                pnpm memo dev --port 3000
                            </code>
                            <p style={{ color: '#9CA3AF', marginBottom: '8px' }}>Or try the example project:</p>
                            <code style={{
                                display: 'block', padding: '8px 14px',
                                background: '#1B3A4B', color: '#2DD4A8', borderRadius: '6px',
                                fontFamily: 'monospace', fontSize: '13px',
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
            <div className="flex flex-col h-screen" style={{ background: WELCOME_GRADIENT, color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '360px', maxWidth: '80vw', display: 'block', margin: '0 auto -20px auto', opacity: 0.45, filter: 'grayscale(1)' }} className="animate-pulse" />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1B3A4B', marginBottom: '6px' }}>MEMO Architect</h2>
                        <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading model data…</p>
                    </div>
                </div>
            </div>
        );
    }

    // Empty model
    if (elementCount === 0) {
        return (
            <div className="flex flex-col h-screen" style={{ background: WELCOME_GRADIENT, color: '#1a1a1a' }}>
                <WorkbenchToolbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-lg" style={{ lineHeight: '1.7' }}>
                        <img src="/logo.png" alt="MEMO Logo" style={{ width: '380px', maxWidth: '80vw', display: 'block', margin: '0 auto -20px auto', opacity: 0.35, filter: 'grayscale(1)' }} />
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1B3A4B', marginBottom: '8px' }}>
                            Your model is empty
                        </h2>
                        <p style={{ fontSize: '14px', color: '#4B6E80', marginBottom: '20px' }}>
                            Connected successfully — but no <code>.sysml</code> elements found yet.
                        </p>
                        <div style={{
                            textAlign: 'left', background: 'rgba(255,255,255,0.65)', borderRadius: '10px',
                            padding: '16px 20px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.9)',
                        }}>
                            <p style={{ fontWeight: 600, marginBottom: '8px', color: '#1B3A4B' }}>Get started:</p>
                            <ol style={{ paddingLeft: '18px', margin: 0, color: '#4B6E80' }}>
                                <li style={{ marginBottom: '6px' }}>
                                    Create a <code>.sysml</code> file in your <code>model/</code> directory
                                </li>
                                <li style={{ marginBottom: '6px' }}>
                                    Import from CSV: <code>pnpm memo import template elements</code>
                                </li>
                                <li>
                                    Scaffold a new project: <code>pnpm memo init my-device</code>
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
                {/* Left: Explorer — hidden for modes with their own internal explorer */}
                {showExplorer && <ExplorerPanel />}

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

                {/* Right: Properties Panel — hidden in element-detail, catalog, DHF, scenario, and ontology modes */}
                {/* Switches to BulkEditPanel when 2+ elements selected */}
                {activeView.type !== 'element-detail'
                    && activeView.type !== 'scenario-editor'
                    && activeView.type !== 'ontology'
                    && activeView.type !== 'ontology-detail'
                    && activeView.type !== 'ask'
                    && activeView.type !== 'sysml-generator'
                    && !isCatalogRoute
                    && activeMode !== 'dhf'
                    && activeMode !== 'ontology' && (
                    selectedElementIds.size >= 2
                        ? <BulkEditPanel />
                        : <UnifiedPropertiesPanel />
                )}
            </div>

            {/* Bottom panel: Problems + Completeness (unified, collapsible) */}
            <GapBar />

            {/* Command palette (Cmd+K) */}
            <CommandPalette />

            {/* Bulk import modal (↓ Import CSV in toolbar) */}
            <BulkImportModal />

            {/* First-run onboarding tour */}
            <OnboardingTour />

            {/* Ontology restart-required overlay — blocks UI on mid-session ontology change */}
            <RestartRequiredBanner />
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
            <DiagramSurface />
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

import { useEffect, lazy, Suspense } from 'react';
import { useModelStore } from './store/model-store';
import { connectWebSocket, loadEmbeddedData } from './store/ws-client';
import { WorkbenchToolbar } from './components/WorkbenchToolbar';
import { ExplorerPanel } from './components/ExplorerPanel';
import { UnifiedPropertiesPanel } from './components/UnifiedPropertiesPanel';
import { CompletenessBar } from './components/CompletenessBar';
import { GapBar } from './components/GapBar';
import { CommandPalette } from './components/CommandPalette';
import { Breadcrumb } from './components/Breadcrumb';
import { OnboardingTour } from './components/OnboardingTour';

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
                <span className="animate-pulse text-lg">{'\u25CF'}</span>
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
            <div className="text-center max-w-lg" style={{ lineHeight: '1.7' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.7 }}>{'\u25A6'}</div>
                <h2 className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                    Select a view to get started
                </h2>
                <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
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
                        <span className="animate-pulse text-lg">{'\u25CF'}</span>
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
                        <span className="animate-pulse text-lg">{'\u25CF'}</span>
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
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>{'\u{1F3D7}\uFE0F'}</div>
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
            {/* Toolbar */}
            <WorkbenchToolbar />

            {/* Completeness bar */}
            <CompletenessBar />

            {/* Breadcrumb */}
            <Breadcrumb />

            {/* Main 3-panel layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Explorer (Model + Views) */}
                <ExplorerPanel />

                {/* Center: Unified Canvas */}
                <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
                    <UnifiedCanvas />
                </div>

                {/* Right: Properties Panel */}
                <UnifiedPropertiesPanel />
            </div>

            {/* Gap bar (violations) */}
            <GapBar />

            {/* Command palette (Cmd+K) */}
            <CommandPalette />

            {/* First-run onboarding tour */}
            <OnboardingTour />
        </div>
    );
}

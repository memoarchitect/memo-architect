import { useEffect } from 'react';
import { useModelStore } from './store/model-store';
import { connectWebSocket, loadEmbeddedData } from './store/ws-client';
import { ModeSwitcher } from './components/ModeSwitcher';
import { CompletenessBar } from './components/CompletenessBar';
import { GapBar } from './components/GapBar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { DiagramCanvas } from './views/DiagramCanvas';
import { CatalogExplorer } from './views/CatalogExplorer';
import { ScenarioCatalog } from './views/ScenarioCatalog';
import { OntologyViewer } from './views/OntologyViewer';
import { ViewpointBrowser } from './components/ViewpointBrowser';

export function App() {
    const connected = useModelStore(s => s.connected);
    const model = useModelStore(s => s.model);
    const activeMode = useModelStore(s => s.activeMode);

    useEffect(() => {
        if (!loadEmbeddedData()) {
            connectWebSocket();
        }
    }, []);

    const elementCount = model ? Object.keys(model.elements).length : 0;

    const renderContent = () => {
        if (!connected) {
            return (
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
            );
        }

        if (!model) {
            return (
                <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-center">
                        <span className="animate-pulse text-lg">{'\u25CF'}</span>
                        <div className="text-sm mt-2">Waiting for model data...</div>
                    </div>
                </div>
            );
        }

        if (elementCount === 0) {
            return (
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
            );
        }

        switch (activeMode) {
            case 'catalog':
                return (
                    <CatalogExplorer />
                );
            case 'diagram':
                return (
                    <>
                        <ViewpointBrowser />
                        <div className="flex-1 flex flex-col">
                            <DiagramCanvas />
                        </div>
                        <PropertiesPanel />
                    </>
                );
            case 'scenario':
                return (
                    <>
                        <ScenarioCatalog />
                        <PropertiesPanel />
                    </>
                );
            case 'ontology':
                return <OntologyViewer />;
        }
    };

    return (
        <div className="flex flex-col h-screen" style={{ background: '#F7F7F5', color: '#1a1a1a' }}>
            {/* Mode switcher */}
            <ModeSwitcher />

            {/* Completeness bar */}
            <CompletenessBar />

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {renderContent()}
            </div>

            {/* Gap bar (violations) */}
            <GapBar />
        </div>
    );
}

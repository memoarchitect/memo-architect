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

    const renderContent = () => {
        if (!connected) {
            return (
                <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-center">
                        <span className="animate-pulse text-lg">{'\u25CF'}</span>
                        <div className="text-sm mt-2">Connecting to dev server...</div>
                    </div>
                </div>
            );
        }

        if (!model) {
            return (
                <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                    Waiting for model data...
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

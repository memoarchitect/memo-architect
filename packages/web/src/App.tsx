import { useEffect } from 'react';
import { useModelStore } from './store/model-store';
import { connectWebSocket, loadEmbeddedData } from './store/ws-client';
import { Sidebar } from './components/Sidebar';
import { CompletenessBar } from './components/CompletenessBar';
import { GapBar } from './components/GapBar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { DiagramCanvas } from './views/DiagramCanvas';

export function App() {
    const connected = useModelStore(s => s.connected);
    const model = useModelStore(s => s.model);

    useEffect(() => {
        // Try embedded data first (static build), fall back to WebSocket (dev server)
        if (!loadEmbeddedData()) {
            connectWebSocket();
        }
    }, []);

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
            {/* Completeness bar */}
            <CompletenessBar />

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Diagram area */}
                <div className="flex-1 flex flex-col">
                    {!connected && (
                        <div className="bg-amber-900/40 text-amber-200 px-4 py-2 text-sm flex items-center gap-2">
                            <span className="animate-pulse">&#9679;</span>
                            Connecting to dev server...
                        </div>
                    )}
                    {connected && !model && (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            Waiting for model data...
                        </div>
                    )}
                    {model && <DiagramCanvas />}
                </div>

                {/* Properties panel */}
                <PropertiesPanel />
            </div>

            {/* Gap bar (violations) */}
            <GapBar />
        </div>
    );
}

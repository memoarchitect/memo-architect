import { useMemo } from 'react';
import { useModelStore, getElementsByLayer } from '../store/model-store';
import { ModelExplorer } from './ModelExplorer';
import { ViewpointSelector } from './ViewpointSelector';

// CoSMA layer colors
const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

export function Sidebar() {
    const model = useModelStore(s => s.model);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    if (sidebarCollapsed) {
        return (
            <div
                className="w-8 bg-slate-800 border-r border-slate-700 cursor-pointer flex items-start justify-center pt-4 hover:bg-slate-750"
                onClick={toggleSidebar}
                title="Expand sidebar"
            >
                <span className="text-slate-500 text-xs transform -rotate-90 whitespace-nowrap mt-8">
                    Model Explorer
                </span>
            </div>
        );
    }

    return (
        <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-semibold text-rose-400">MEMO</h1>
                    <p className="text-xs text-slate-500">{elementCount} elements | {relCount} relationships</p>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="text-slate-500 hover:text-slate-300 text-xs px-1"
                    title="Collapse sidebar"
                >
                    ◀
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
            </div>

            {/* Viewpoint selector */}
            <ViewpointSelector />

            {/* Model explorer */}
            <div className="flex-1 overflow-y-auto">
                <ModelExplorer />
            </div>
        </div>
    );
}

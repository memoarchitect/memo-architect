import { useModelStore } from '../store/model-store';
import { ModelExplorer } from './ModelExplorer';
import { ViewpointSelector } from './ViewpointSelector';

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
                className="w-10 cursor-pointer flex items-start justify-center pt-4"
                style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}
                onClick={toggleSidebar}
                title="Expand sidebar"
            >
                <span className="text-xs transform -rotate-90 whitespace-nowrap mt-8" style={{ color: '#9CA3AF' }}>
                    Model Explorer
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden" style={{ width: 440, background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
            {/* Header with hero gradient */}
            <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-wide" style={{ color: '#2DD4A8' }}>MEMO</h1>
                        <p className="text-lg mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {elementCount} elements &middot; {relCount} relationships
                        </p>
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="text-xs px-1.5 py-0.5 rounded-md transition-colors"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                        title="Collapse sidebar"
                    >
                        &#9664;
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <input
                    type="text"
                    placeholder="Search elements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 text-xl rounded-lg focus:outline-none transition-shadow"
                    style={{
                        background: '#F7F7F5',
                        border: '1px solid #E5E5E0',
                        color: '#1a1a1a',
                    }}
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

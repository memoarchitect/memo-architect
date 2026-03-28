import { useModelStore, type ActiveView } from '../store/model-store';

interface ToolAction {
    id: string;
    label: string;
    icon: string;
    view: ActiveView;
}

const TOOLS: ToolAction[] = [
    { id: 'dsm', label: 'DSM', icon: '\u25A4', view: { type: 'dsm' } },
    { id: 'traceability', label: 'Trace Matrix', icon: '\u2637', view: { type: 'traceability' } },
    { id: 'actionflow', label: 'Action Flow', icon: '\u21C6', view: { type: 'actionflow' } },
    { id: 'ontology', label: 'Ontology', icon: '\u25C9', view: { type: 'ontology' } },
    { id: 'scenario-editor', label: 'Scenarios', icon: '\u25B6', view: { type: 'scenario-editor' } },
    { id: 'model-diff', label: 'Diff', icon: '\u2194', view: { type: 'model-diff' } },
    { id: 'compliance-wizard', label: 'Compliance', icon: '\u2611', view: { type: 'compliance-wizard' } },
    { id: 'statistics', label: 'Stats', icon: '\u25A6', view: { type: 'statistics' } },
    { id: 'dhf-dashboard', label: 'DHF', icon: '\u2637', view: { type: 'dhf-dashboard' } },
];

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    return (
        <div
            className="flex items-center gap-2 px-5 py-2"
            style={{ background: '#1B3A4B', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 10 }}
        >
            {/* Project info */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: '#2DD4A8' }}>
                    MEMO Architect
                </span>
                {model && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {elementCount} elements &middot; {relCount} relationships
                    </span>
                )}
            </div>

            <div className="flex-1" />

            {/* Tool buttons */}
            <div className="flex items-center gap-1">
                <span className="text-xs mr-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Tools:</span>
                {TOOLS.map(tool => {
                    const isActive = activeView.type === tool.view.type;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => setActiveView(isActive ? { type: 'welcome' } : tool.view)}
                            className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                            style={
                                isActive
                                    ? { background: 'rgba(45, 212, 168, 0.15)', color: '#2DD4A8' }
                                    : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                            }
                            title={tool.label}
                        >
                            <span className="mr-1">{tool.icon}</span>
                            {tool.label}
                        </button>
                    );
                })}
            </div>

            <img
                src="/logo.png"
                alt="MEMO"
                className="ml-3"
                style={{ height: 40, opacity: 0.9 }}
            />
        </div>
    );
}

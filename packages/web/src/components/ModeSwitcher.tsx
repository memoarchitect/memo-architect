import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore, type ActiveView } from '../store/model-store';
import { WorkspaceManager } from './WorkspaceManager';

const DOCS_URL = '/help/';

// ─── Primary navigation modes ────────────────────────────────────────────────

const NAV_MODES = [
    { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
    { id: 'catalog', label: 'Model Explorer', icon: '☰' },
    { id: 'diagram', label: 'Diagrams', icon: '⊟' },
    { id: 'dhf', label: 'DHF', icon: '⊞' },
    { id: 'scenario', label: 'Scenarios', icon: '▶' },
    { id: 'ontology', label: 'Ontology', icon: '◉' },
    { id: 'import', label: 'Import', icon: '↓' },
] as const;

type NavModeId = typeof NAV_MODES[number]['id'];

// Tool view types — when one of these is active, no nav mode is highlighted
const TOOL_VIEW_TYPES = new Set(['dsm', 'traceability', 'statistics', 'compliance-wizard', 'model-diff', 'review-dashboard', 'workflow-wizard']);

// ─── Tools dropdown items ────────────────────────────────────────────────────

interface ToolItem {
    id: string;
    label: string;
    icon: string;
    view: ActiveView;
}

const TOOLS: ToolItem[] = [
    { id: 'dsm', label: 'Design Structure Matrix', icon: '▤', view: { type: 'dsm' } },
    { id: 'traceability', label: 'Traceability Matrix', icon: '☷', view: { type: 'traceability' } },
    { id: 'statistics', label: 'Statistics Dashboard', icon: '⊠', view: { type: 'statistics' } },
    { id: 'compliance-wizard', label: 'Compliance Wizard', icon: '☑', view: { type: 'compliance-wizard' } },
    { id: 'model-diff', label: 'Model Diff', icon: '↔', view: { type: 'model-diff' } },
    { id: 'review-dashboard', label: 'Design Review Dashboard', icon: '📋', view: { type: 'review-dashboard' } },
    { id: 'workflow-wizard', label: 'Workflow Wizard', icon: '🧙', view: { type: 'workflow-wizard' } },
];

// ─── Tools dropdown ──────────────────────────────────────────────────────────

function ToolsDropdown({ activeViewType }: { activeViewType: string }) {
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const toolIds = TOOLS.map(t => t.id);
    const isAnyToolActive = toolIds.includes(activeViewType);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                style={
                    isAnyToolActive || open
                        ? { background: 'rgba(45, 212, 168, 0.15)', color: '#2DD4A8' }
                        : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                }
            >
                <span className="mr-0.5">⚙</span>
                Tools
                <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }}>▾</span>
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 100,
                        background: '#132D3E',
                        border: '1px solid rgba(45,212,168,0.2)',
                        borderRadius: '8px',
                        minWidth: '220px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                    }}
                >
                    {TOOLS.map((tool, i) => {
                        const isActive = activeViewType === tool.view.type;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setActiveView(isActive ? { type: 'welcome' } : tool.view);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                style={{
                                    fontSize: '13px',
                                    color: isActive ? '#2DD4A8' : 'rgba(255,255,255,0.75)',
                                    background: isActive ? 'rgba(45,212,168,0.1)' : 'transparent',
                                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ width: '18px', textAlign: 'center', opacity: 0.7 }}>{tool.icon}</span>
                                {tool.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main ModeSwitcher ───────────────────────────────────────────────────────

export function ModeSwitcher() {
    const activeMode = useModelStore(s => s.activeMode);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const navigate = useNavigate();

    // Modes that have a left sidebar explorer
    const explorerModes: NavModeId[] = ['catalog', 'diagram', 'dhf'];

    // Determine which nav mode is "active" from the current view type
    // Returns '' when a tool is open so no nav button is highlighted
    const activeNavMode: string = (() => {
        if (TOOL_VIEW_TYPES.has(activeView.type)) return '';
        if (activeMode === 'dhf' || activeView.type === 'dhf-dashboard') return 'dhf';
        if (activeView.type === 'scenario-editor') return 'scenario';
        if (activeView.type === 'ontology' || activeView.type === 'ontology-detail') return 'ontology';
        if (activeView.type === 'import') return 'import';
        if (activeView.type === 'diagram' || activeMode === 'diagram') return 'diagram';
        if (activeMode === 'catalog') return 'catalog';
        if (activeView.type === 'dashboard') return 'dashboard';
        return activeMode;
    })();

    function handleNavClick(modeId: NavModeId) {
        // Clicking the already-active explorer mode toggles the sidebar (VS Code pattern)
        // Use activeNavMode (not activeMode) so a tool overlay doesn't trigger this guard
        if (modeId === activeNavMode && explorerModes.includes(modeId)) {
            toggleSidebar();
            return;
        }
        // Switching to an explorer mode: ensure sidebar is open
        if (explorerModes.includes(modeId) && sidebarCollapsed) {
            toggleSidebar();
        }
        setActiveMode(modeId);
        switch (modeId) {
            case 'dashboard':
                setActiveView({ type: 'dashboard' });
                navigate('/');
                break;
            case 'catalog':
                setActiveView({ type: 'welcome' });
                navigate('/catalog');
                break;
            case 'diagram':
                // Show views tab in explorer so user can pick a diagram
                setExplorerTab('views');
                setActiveView({ type: 'welcome' });
                navigate('/');
                break;
            case 'dhf':
                setActiveView({ type: 'dhf-dashboard' });
                navigate('/');
                break;
            case 'scenario':
                setActiveView({ type: 'scenario-editor' });
                navigate('/');
                break;
            case 'ontology':
                setActiveView({ type: 'ontology' });
                navigate('/');
                break;
            case 'import':
                setActiveView({ type: 'import' });
                navigate('/');
                break;
        }
    }

    return (
        <div
            className="flex items-center gap-1 px-5 py-3"
            style={{
                background: '#1B3A4B',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                overflow: 'visible',
                position: 'relative',
                zIndex: 10,
            }}
        >
            {/* Primary nav modes */}
            {NAV_MODES.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => handleNavClick(mode.id)}
                    className="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                    style={
                        activeNavMode === mode.id
                            ? { background: 'rgba(45, 212, 168, 0.15)', color: '#2DD4A8' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                    }
                >
                    <span className="mr-1.5">{mode.icon}</span>
                    {mode.label}
                </button>
            ))}

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

            {/* Tools dropdown */}
            <ToolsDropdown activeViewType={activeView.type} />

            <div className="flex-1" />

            {/* Workspace Manager (#42) */}
            <WorkspaceManager />

            {/* Help */}
            <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
                ? Help
            </a>

            {/* Logo */}
            <img
                src="/memo-top.png"
                alt="MEMO"
                className="ml-3"
                style={{ height: 56, marginTop: -4, marginBottom: -10 }}
            />
        </div>
    );
}

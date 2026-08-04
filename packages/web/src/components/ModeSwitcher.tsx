import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore, type ActiveView } from '../store/model-store';
import { isFeatureEnabled, type FeatureId } from '../config/feature-flags';
import { WorkspaceManager } from './WorkspaceManager';

const DOCS_URL = '/help/';
const JUPYTER_URL = 'http://127.0.0.1:8888/lab/tree/';

// ─── Primary navigation modes ────────────────────────────────────────────────

// `feature` gates the entry: the mode only renders when that flag is on.
const NAV_MODES = [
    { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
    { id: 'catalog', label: 'Model Explorer', icon: '☰' },
    { id: 'diagram', label: 'Viewpoints', icon: '⊟' },
    { id: 'ui-screens', label: 'UI Screens', icon: '▣' },
    { id: 'dhf', label: 'Documents', icon: '⊞' },
    { id: 'scenario', label: 'Use Cases', icon: '▶' },
    // Deliberately top-level while enabled: AI work is a distinct workspace,
    // not a document action.  The feature gate keeps it absent by default and
    // exposes it only when Architect was started with --experimental.
    { id: 'ai', label: 'AI Tools', icon: '✦', feature: 'ai-tools' },
] as const satisfies readonly { id: string; label: string; icon: string; feature?: FeatureId }[];

type NavModeId = typeof NAV_MODES[number]['id'];

// Tool view types — when one of these is active, no nav mode is highlighted
const TOOL_VIEW_TYPES = new Set(['dsm', 'traceability', 'statistics', 'compliance-wizard', 'model-diff', 'review-dashboard', 'workflow-wizard', 'ontology', 'ontology-detail', 'import']);

// ─── Tools dropdown items ────────────────────────────────────────────────────

interface ToolItem {
    id: string;
    label: string;
    icon: string;
    view: ActiveView;
}

// ─── Analysis dropdown ───────────────────────────────────────────────────────

function AnalysisDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                style={open
                    ? { background: 'rgba(45, 212, 168, 0.15)', color: '#2DD4A8' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }}
            >
                <span className="mr-0.5">◫</span>
                Analysis
                <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }}>▾</span>
            </button>

            {open && (
                <div
                    role="menu"
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
                    <a
                        href={JUPYTER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span style={{ width: '18px', textAlign: 'center', opacity: 0.7 }}>⌁</span>
                        Jupyter Notebooks
                    </a>
                </div>
            )}
        </div>
    );
}

const TOOLS: ToolItem[] = [
    { id: 'ontology', label: 'Ontology Explorer', icon: '◉', view: { type: 'ontology' } },
    { id: 'import', label: 'Import Model', icon: '↓', view: { type: 'import' } },
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
                    {TOOLS.filter(tool =>
                        (tool.id !== 'ontology' || isFeatureEnabled('ontology'))
                        && (tool.id !== 'import' || isFeatureEnabled('import'))
                    ).map((tool, i) => {
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
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [analysisOpen, setAnalysisOpen] = useState(false);

    useEffect(() => {
        const toggle = () => setDrawerOpen(open => !open);
        window.addEventListener('memo:toggle-navigation', toggle);
        return () => window.removeEventListener('memo:toggle-navigation', toggle);
    }, []);

    // Modes that have a left sidebar explorer
    const explorerModes: NavModeId[] = ['catalog', 'diagram', 'dhf', 'scenario'];

    // Determine which nav mode is "active" from the current view type
    // Returns '' when a tool is open so no nav button is highlighted
    const activeNavMode: string = (() => {
        if (TOOL_VIEW_TYPES.has(activeView.type)) return '';
        if (activeMode === 'dhf' || activeView.type === 'dhf-dashboard') return 'dhf';
        if (activeView.type === 'scenario-editor') return 'scenario';
        // Scenario diagrams retain their origin context; they are rendered
        // in the center pane without entering the Viewpoints workbench.
        if (activeMode === 'scenario' && activeView.type === 'diagram') return 'scenario';
        if (activeView.type === 'analysis') return 'analysis';
        if (activeView.type === 'ui-screens' || activeMode === 'ui-screens') return 'ui-screens';
        if (activeView.type === 'ai' || activeView.type === 'ask' || activeView.type === 'sysml-generator') return 'ai';
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
        // Set the view and let UrlNavigationSync derive the URL from it, so
        // every mode lands on its own bookmarkable path. Navigating to a fixed
        // '/' here is what used to leave the address bar stuck at the root.
        switch (modeId) {
            case 'dashboard':
                setActiveView({ type: 'dashboard' });
                break;
            case 'catalog':
                // The catalog page is route-driven rather than view-driven.
                setActiveView({ type: 'welcome' });
                navigate('/catalog');
                break;
            case 'diagram':
                // Show the viewpoint explorer so the user can pick a model view.
                setExplorerTab('views');
                setActiveView({ type: 'welcome' });
                navigate('/diagrams');
                break;
            case 'ui-screens':
                setActiveView({ type: 'ui-screens' });
                navigate('/ui-screens');
                break;
            case 'dhf':
                setActiveView({ type: 'dhf-dashboard' });
                break;
            case 'scenario':
                setActiveView({ type: 'scenario-editor' });
                break;
            case 'ai':
                setActiveView({ type: 'ai' });
                break;
        }
    }

    if (!drawerOpen) return null;
    return <>
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4, 18, 28, 0.35)' }} />
        <aside aria-label="Main navigation" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 296, zIndex: 81, background: '#0B1E2D', borderRight: '1px solid rgba(45,212,168,0.28)', boxShadow: '12px 0 32px rgba(0,0,0,0.32)', padding: '18px 12px', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
                <button onClick={() => { setDrawerOpen(false); handleNavClick('dashboard'); }} style={{ color: '#2DD4A8', fontWeight: 700, fontSize: 18, letterSpacing: '0.04em', border: 'none', background: 'none', cursor: 'pointer' }}>MEMO Architect</button>
                <button aria-label="Close navigation" onClick={() => setDrawerOpen(false)} style={{ width: 36, height: 36, color: '#2DD4A8', fontSize: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 8 }}>
                {NAV_MODES.filter(mode => !('feature' in mode) || isFeatureEnabled(mode.feature)).map(mode => <button key={mode.id} onClick={() => { handleNavClick(mode.id); setDrawerOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left" style={{ border: 'none', cursor: 'pointer', fontSize: 15, background: activeNavMode === mode.id ? 'rgba(45,212,168,0.15)' : 'transparent', color: activeNavMode === mode.id ? '#2DD4A8' : 'rgba(255,255,255,0.78)' }}><span style={{ width: 20, textAlign: 'center' }}>{mode.icon}</span>{mode.label}</button>)}
                {isFeatureEnabled('analysis') && <>
                    <button onClick={() => setAnalysisOpen(open => !open)} aria-expanded={analysisOpen} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left" style={{ border: 'none', cursor: 'pointer', fontSize: 15, background: analysisOpen ? 'rgba(45,212,168,0.10)' : 'transparent', color: 'rgba(255,255,255,0.78)' }}>
                        <span style={{ width: 20, textAlign: 'center' }}>◫</span>Analysis<span style={{ marginLeft: 'auto', fontSize: 11 }}>{analysisOpen ? '▾' : '▸'}</span>
                    </button>
                    {analysisOpen && <div style={{ margin: '0 0 4px 36px', borderLeft: '1px solid rgba(45,212,168,0.25)' }}>
                        <button onClick={() => { setActiveView({ type: 'analysis' }); setDrawerOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left" style={{ border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.68)', fontSize: 14 }}><span>◫</span>Analysis workspace</button>
                        {isFeatureEnabled('model-tools') && <button onClick={() => { setActiveView({ type: 'dsm' }); setDrawerOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left" style={{ border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.68)', fontSize: 14 }}><span>▤</span>Design Structure Matrix</button>}
                        <a href={JUPYTER_URL} target="_blank" rel="noopener noreferrer" onClick={() => setDrawerOpen(false)} className="flex w-full items-center gap-2 px-3 py-2" style={{ color: 'rgba(255,255,255,0.68)', textDecoration: 'none', fontSize: 14 }}><span>⌁</span>Jupyter Notebooks</a>
                    </div>}
                </>}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '14px 4px' }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ color: 'rgba(255,255,255,0.62)' }}><span>Workspaces</span><WorkspaceManager /></div>
            {isFeatureEnabled('model-tools') && <div className="px-2 py-1"><ToolsDropdown activeViewType={activeView.type} /></div>}
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-3 py-3" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: 15 }}><span style={{ width: 20, textAlign: 'center' }}>?</span>Help</a>
        </aside>
    </>;
}

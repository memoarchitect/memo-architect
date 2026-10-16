import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore, type ActiveView } from '../store/model-store';
import { isFeatureEnabled } from '../config/feature-flags';
import { WorkspaceManager } from './WorkspaceManager';
import { viewToPath } from '../view-routes';
import {
    NAV_ENTRIES, NAV_SECTIONS, VIEW_OF_MODE, sectionOf,
    type NavEntry, type NavModeId,
} from '../navigation/nav-sections';

const DOCS_URL = '/help/';

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

    useEffect(() => {
        const toggle = () => setDrawerOpen(open => !open);
        window.addEventListener('memo:toggle-navigation', toggle);
        return () => window.removeEventListener('memo:toggle-navigation', toggle);
    }, []);

    // Modes that have a left sidebar explorer
    const explorerModes: NavModeId[] = ['catalog', 'diagram', 'dhf', 'scenario'];

    // The section the current page is in, and the explorer mode it shows,
    // so clicking the open explorer mode again toggles its sidebar.
    const activeSection = sectionOf(activeView, activeMode);
    const activeNavMode: string = (() => {
        if (activeView.type === 'dhf-dashboard' || activeView.type === 'dhf-document' || activeMode === 'dhf') return 'dhf';
        if (activeView.type === 'scenario-editor') return 'scenario';
        if (activeMode === 'scenario' && activeView.type === 'diagram') return 'scenario';
        if (activeView.type === 'diagram' || (activeView.type === 'welcome' && activeMode === 'diagram')) return 'diagram';
        if (activeView.type === 'welcome' && activeMode === 'catalog') return 'catalog';
        const mode = (Object.keys(VIEW_OF_MODE) as NavModeId[])
            .find(id => VIEW_OF_MODE[id] === activeView.type && activeView.type !== 'welcome');
        return mode ?? '';
    })();
    const isActiveEntry = (entry: NavEntry): boolean =>
        'mode' in entry.target ? entry.target.mode === activeNavMode
            : entry.target.view.type === activeView.type;

    // The catalog and viewpoint index pages own their address, and the store →
    // URL sync never pushes over them (isRouteOwnedPath). So every page the
    // drawer opens is navigated to as well as set: from /catalog, setting a
    // view alone left the address, and the page, where they were.
    function show(view: ActiveView) {
        setActiveView(view);
        const path = viewToPath(view);
        if (path) navigate(path);
    }

    function openEntry(entry: NavEntry) {
        setDrawerOpen(false);
        if ('mode' in entry.target) handleNavClick(entry.target.mode);
        else show(entry.target.view);
    }

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
                show({ type: 'dashboard' });
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
            case 'rules':
                setActiveView({ type: 'rules' });
                navigate('/rules');
                break;
            case 'dhf':
                show({ type: 'dhf-dashboard' });
                break;
            case 'scenario':
                show({ type: 'scenario-editor' });
                break;
            case 'ai':
                show({ type: 'ai' });
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
            <nav style={{ borderTop: '1px solid rgba(255,255,255,0.09)', paddingTop: 8 }}>
                {NAV_SECTIONS.map(section => {
                    const entries = NAV_ENTRIES.filter(entry => entry.section === section.id
                        && (!entry.feature || isFeatureEnabled(entry.feature)));
                    const current = activeSection === section.id;
                    return (
                        <div key={section.id} style={{ marginBottom: 6 }}>
                            <div
                                className="flex items-center gap-3 px-3 py-2"
                                style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: current ? '#2DD4A8' : 'rgba(255,255,255,0.45)' }}
                            >
                                <span style={{ width: 20, textAlign: 'center' }}>{section.icon}</span>{section.label}
                            </div>
                            {entries.map(entry => {
                                const active = isActiveEntry(entry);
                                return (
                                    <button
                                        key={entry.id}
                                        onClick={() => openEntry(entry)}
                                        aria-current={active ? 'page' : undefined}
                                        className="flex w-full items-center gap-3 rounded-md py-2 text-left"
                                        style={{ border: 'none', cursor: 'pointer', fontSize: 14, paddingLeft: 44, paddingRight: 12, background: active ? 'rgba(45,212,168,0.15)' : 'transparent', color: active ? '#2DD4A8' : 'rgba(255,255,255,0.78)' }}
                                    >
                                        <span style={{ width: 18, textAlign: 'center', opacity: 0.75 }}>{entry.icon}</span>{entry.label}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '14px 4px' }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ color: 'rgba(255,255,255,0.62)' }}><span>Working sets</span><WorkspaceManager /></div>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-3 py-3" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: 15 }}><span style={{ width: 20, textAlign: 'center' }}>?</span>Help</a>
        </aside>
    </>;
}

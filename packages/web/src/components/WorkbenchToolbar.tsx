import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';

// Modes that have a left sidebar explorer
const EXPLORER_MODES = new Set(['catalog', 'diagram', 'dhf']);

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const activeMode = useModelStore(s => s.activeMode);
    const navigate = useNavigate();

    const showToggle = EXPLORER_MODES.has(activeMode);

    function goHome() {
        setActiveMode('catalog');
        setActiveView({ type: 'welcome' });
        navigate('/');
    }

    return (
        <div
            className="flex items-center gap-3 px-4 py-2"
            style={{ background: '#0B1E2D', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}
        >
            {/* Dedicated sidebar toggle — fixed position, consistent across modes */}
            <button
                onClick={showToggle ? toggleSidebar : undefined}
                title={sidebarCollapsed ? 'Show explorer' : 'Hide explorer'}
                style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: 'none', border: 'none', cursor: showToggle ? 'pointer' : 'default',
                    color: showToggle
                        ? (sidebarCollapsed ? 'rgba(255,255,255,0.35)' : '#2DD4A8')
                        : 'rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                    transition: 'color 150ms',
                }}
                onMouseEnter={e => { if (showToggle) e.currentTarget.style.color = '#2DD4A8'; }}
                onMouseLeave={e => { if (showToggle) e.currentTarget.style.color = sidebarCollapsed ? 'rgba(255,255,255,0.35)' : '#2DD4A8'; }}
            >
                ☰
            </button>

            <button
                onClick={goHome}
                className="text-sm font-bold transition-opacity"
                style={{ color: '#2DD4A8', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                title="Go to home"
            >
                MEMO Architect
            </button>

            <div className="flex-1" />

            <img
                src="/logo.png"
                alt="MEMO"
                style={{ height: 40, opacity: 0.9, cursor: 'pointer' }}
                onClick={goHome}
                title="Go to home"
            />
        </div>
    );
}

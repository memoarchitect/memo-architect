import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const navigate = useNavigate();

    function goHome() {
        setActiveMode('catalog');
        setActiveView({ type: 'welcome' });
        navigate('/');
    }

    return (
        <div
            className="flex items-center gap-2 px-5 py-2"
            style={{ background: '#0B1E2D', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}
        >
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

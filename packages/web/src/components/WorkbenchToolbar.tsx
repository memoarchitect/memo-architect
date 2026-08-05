import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const navigate = useNavigate();
    const metadata = model?.metadata;

    function goHome() {
        setActiveMode('dashboard');
        setActiveView({ type: 'dashboard' });
        navigate('/');
    }

    return (
        <div
            className="flex items-center gap-3 px-4 py-2"
            style={{ background: '#0B1E2D', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}
        >
            {/* Main navigation drawer */}
            <button
                onClick={() => window.dispatchEvent(new Event('memo:toggle-navigation'))}
                title="Open navigation"
                style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#2DD4A8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                    transition: 'color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(45,212,168,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
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

            {(metadata?.projectName || metadata?.gitUser) && (
                <span
                    title="Current project and Git revision"
                    style={{ color: 'rgba(255,255,255,0.62)', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                    {metadata?.projectName && <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{metadata.projectName}</span>}
                    {metadata?.projectName && metadata?.gitUser && <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.32)' }}>|</span>}
                    {metadata?.gitUser && <>
                        @{metadata.gitUser}
                        {metadata.gitBranch && <> · {metadata.gitBranch}</>}
                        {metadata.gitCommitShort && (
                            <span style={{ marginLeft: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {metadata.gitCommitShort}{metadata.gitDirty ? '*' : ''}
                            </span>
                        )}
                    </>}
                </span>
            )}

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

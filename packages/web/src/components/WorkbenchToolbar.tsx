import { useLocation, useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { PinnedBanner } from './PinnedBanner';
import { isFeatureEnabled } from '../config/feature-flags';

export function WorkbenchToolbar() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const explorerDomain = useModelStore(s => s.explorerDomain);
    const setExplorerDomain = useModelStore(s => s.setExplorerDomain);
    const metadata = model?.metadata;
    const pathways = useModelStore(s => s.pathways);
    const setPathways = useModelStore(s => s.setPathways);

    function openMethodMap() {
        setActiveMode('diagram');
        setActiveView({ type: 'guide' });
        navigate('/method');
    }

    function goHome() {
        setActiveMode('dashboard');
        setActiveView({ type: 'dashboard' });
        navigate('/');
    }

    return (
        <>
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

            {isFeatureEnabled('guide') && (
                <>
                    {/* Pathways guides each layer step by step; off, the same pages are free modelling. Saved for this person. */}
                    <label data-testid="pathways-switch" title="Pathways: guided modelling, step by step in each layer. Saved for you only." style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
                        <input type="checkbox" role="switch" aria-label="Pathways" checked={pathways} onChange={event => setPathways(event.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        <span aria-hidden style={{ width: 30, height: 17, borderRadius: 9, background: pathways ? '#2DD4A8' : 'rgba(255,255,255,0.25)', position: 'relative', transition: 'background 150ms' }}>
                            <span style={{ position: 'absolute', top: 2, left: pathways ? 15 : 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: 'left 150ms' }} />
                        </span>
                        Pathways
                    </label>
                    <button
                        data-testid="open-method-map"
                        onClick={openMethodMap}
                        title="The method map: every layer and discipline, and where to start"
                        style={{ background: 'rgba(45,212,168,0.12)', border: '1px solid rgba(45,212,168,0.35)', color: '#2DD4A8', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Method map
                    </button>
                </>
            )}

            {(metadata?.modelName || metadata?.gitUser) && (
                <span
                    title="Current model and Git revision"
                    style={{ color: 'rgba(255,255,255,0.62)', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                    {metadata?.modelName && <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{metadata.modelName}</span>}
                    {metadata?.modelName && metadata?.gitUser && <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.32)' }}>|</span>}
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

            <a href="https://memoarchitect.com" target="_blank" rel="noopener noreferrer" title="memoarchitect.com" style={{ display: 'flex' }}>
                <img src="/logo.png" alt="MEMO" style={{ height: 40, opacity: 0.9 }} />
            </a>
        </div>
        {/* Every page lists the model as the explorer's domain shows it, so say so, and how to undo it. The catalog has the domain chips. */}
        {explorerDomain && !pathname.startsWith('/catalog') && (
            <div role="status" className="flex items-center gap-2 px-4 py-1" style={{ background: '#E6F7F2', borderBottom: '1px solid #BFE9DD', fontSize: 12, color: '#0B3B2E' }}>
                <span>Showing the {explorerDomain} domain only.</span>
                <button type="button" onClick={() => setExplorerDomain(null)}
                    style={{ background: 'none', border: 0, cursor: 'pointer', fontWeight: 600, color: '#0E7490', fontSize: 12 }}>Show all</button>
            </div>
        )}
        <PinnedBanner />
        </>
    );
}

import { useModelStore, getDiagram } from '../store/model-store';
import type { ViewKind } from '@memoarchitect/tools/browser';
import { DIAGRAM_TYPE_META, VIEW_KIND_META } from '../constants';
import { useNavigate } from 'react-router-dom';

export function Breadcrumb() {
    const activeView = useModelStore(s => s.activeView);
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const activeMode = useModelStore(s => s.activeMode);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const navigate = useNavigate();

    const crumbs: { label: string; onClick?: () => void }[] = [];

    // The detail trail explains *where* the user is in a model, but not which
    // top-level workspace they selected. Render that choice as a visual badge
    // rather than another easily-overlooked breadcrumb segment.
    const workspace = (() => {
        switch (activeView.type) {
            // The diagram's viewpoint is already represented by the left
            // Viewpoints explorer (or its vertical collapsed rail). Repeating
            // it here as a green workspace badge competes with that pattern.
            case 'diagram': return undefined;
            case 'element-detail': return { label: 'Model Explorer', icon: '☰', onClick: () => { setActiveMode('catalog'); setActiveView({ type: 'welcome' }); navigate('/catalog'); } };
            case 'dsm': return { label: 'DSM Analysis', icon: '▦', onClick: () => { setActiveView({ type: 'dsm' }); navigate('/dsm'); } };
            case 'traceability': return { label: 'Traceability Matrix', icon: '☷', onClick: () => { setActiveView({ type: 'traceability' }); navigate('/traceability'); } };
            case 'ontology':
            case 'ontology-detail': return { label: 'Ontology Explorer', icon: '◉', onClick: () => { setActiveView({ type: 'ontology' }); navigate('/ontology'); } };
            case 'scenario-editor': return { label: 'Use Cases', icon: '▶', onClick: () => { setActiveMode('scenario'); setActiveView({ type: 'scenario-editor' }); navigate('/use-cases'); } };
            case 'dhf-dashboard':
            case 'dhf-dashboard-legacy':
            case 'dhf-document': return { label: 'Documents', icon: '⊞', onClick: () => { setActiveMode('dhf'); setActiveView({ type: 'dhf-dashboard' }); navigate('/dhf'); } };
            case 'welcome':
                if (activeMode === 'diagram') return { label: 'Viewpoints', icon: '⊟', onClick: () => navigate('/diagrams') };
                if (activeMode === 'catalog') return { label: 'Model Explorer', icon: '☰', onClick: () => navigate('/catalog') };
                return undefined;
            default: return undefined;
        }
    })();

    // Build breadcrumb trail based on active view
    switch (activeView.type) {
        case 'diagram': {
            const diagram = getDiagram(model, activeView.diagramId);
            if (diagram) {
                const vpLabel = diagram.viewpointId === '__model'
                    ? 'Unassigned Views'
                    : model?.viewpoints?.find(v => v.id === diagram.viewpointId)?.label || diagram.viewpointId;
                const vp = model?.viewpoints?.find(v => v.id === diagram.viewpointId);
                crumbs.push({ label: vp ? `${vp.id} · ${vpLabel}` : vpLabel });
                // Spec view kind label wins over the legacy diagramType code
                const kindMeta = diagram.viewKind ? VIEW_KIND_META[diagram.viewKind as ViewKind] : undefined;
                const typeMeta = DIAGRAM_TYPE_META[diagram.diagramType];
                const code = kindMeta?.label ?? typeMeta?.code ?? diagram.diagramType;
                crumbs.push({ label: `${diagram.shortId ?? diagram.id} · ${code}: ${diagram.name}` });
            }
            break;
        }
        case 'element-detail': {
            const elementId = (activeView as { type: 'element-detail'; elementId: string }).elementId;
            const el = model?.elements[elementId];
            if (el) {
                const shortId = el.shortId ?? el.id;
                const family = shortId.split('-')[0];
                crumbs.push({
                    label: 'Catalog',
                    onClick: () => navigate('/catalog'),
                });
                crumbs.push({
                    label: family,
                    onClick: () => navigate(`/catalog/${family}`),
                });
                crumbs.push({
                    label: `${shortId} ${el.name}`,
                });
            }
            break;
        }
        case 'dsm':
        case 'traceability':
        case 'ontology':
        case 'ontology-detail':
            break;
        case 'welcome':
            // No breadcrumb on home — MEMO Architect title is already the home button
            break;
    }

    // Add selected element for non-element-detail views
    if (selectedElementId && model && activeView.type !== 'element-detail') {
        const el = model.elements[selectedElementId];
        if (el) {
            crumbs.push({
                label: el.name,
                onClick: () => selectElement(el.id),
            });
        }
    }

    if (!workspace && crumbs.length === 0) return null;

    return (
        <div className="flex items-center gap-1 px-4 py-1.5" style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E0' }}>
            {workspace && (
                <button
                    type="button"
                    onClick={workspace.onClick}
                    className="flex items-center gap-1 rounded-md"
                    title={`Active workspace: ${workspace.label}`}
                    style={{
                        padding: '4px 8px', background: '#E8FBF5', border: '1px solid #A7F3D0',
                        color: '#0F766E', fontSize: '11px', fontWeight: 700, letterSpacing: '0.01em', cursor: 'pointer',
                    }}
                >
                    <span aria-hidden="true" style={{ fontSize: '13px', lineHeight: 1 }}>{workspace.icon}</span>
                    {workspace.label}
                </button>
            )}
            {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                    {(workspace || i > 0) && <span className="text-xs" style={{ color: '#D1D5DB' }}>/</span>}
                    {crumb.onClick ? (
                        <button
                            className="text-xs px-1 py-0.5 rounded transition-colors"
                            style={{ color: '#374151' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={crumb.onClick}
                        >
                            {crumb.label}
                        </button>
                    ) : (
                        <span className="text-xs" style={{ color: i === crumbs.length - 1 ? '#374151' : '#9CA3AF' }}>
                            {crumb.label}
                        </span>
                    )}
                </span>
            ))}

            <div className="flex-1" />
            <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#F0F0ED', color: '#9CA3AF', fontSize: '9px' }}>
                {'\u2318'}K
            </kbd>
        </div>
    );
}

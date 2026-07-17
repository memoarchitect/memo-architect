import { useModelStore, getDiagram } from '../store/model-store';
import type { ViewKind } from '@memoarchitect/tools/browser';
import { DIAGRAM_TYPE_META, VIEW_KIND_META } from '../constants';
import { useNavigate } from 'react-router-dom';

export function Breadcrumb() {
    const activeView = useModelStore(s => s.activeView);
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const navigate = useNavigate();

    const crumbs: { label: string; onClick?: () => void }[] = [];

    // Build breadcrumb trail based on active view
    switch (activeView.type) {
        case 'diagram': {
            const diagram = getDiagram(model, activeView.diagramId);
            if (diagram) {
                const vpLabel = diagram.viewpointId === '__model'
                    ? 'Model Viewpoint'
                    : model?.viewpoints?.find(v => v.id === diagram.viewpointId)?.label || diagram.viewpointId;
                crumbs.push({ label: vpLabel });
                // Spec view kind label wins over the legacy diagramType code
                const kindMeta = diagram.viewKind ? VIEW_KIND_META[diagram.viewKind as ViewKind] : undefined;
                const typeMeta = DIAGRAM_TYPE_META[diagram.diagramType];
                const code = kindMeta?.label ?? typeMeta?.code ?? diagram.diagramType;
                crumbs.push({ label: `${code}: ${diagram.name}` });
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
            crumbs.push({ label: 'Tools' });
            crumbs.push({ label: 'DSM' });
            break;
        case 'traceability':
            crumbs.push({ label: 'Tools' });
            crumbs.push({ label: 'Traceability Matrix' });
            break;
        case 'ontology':
            crumbs.push({ label: 'Tools' });
            crumbs.push({ label: 'Ontology' });
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

    if (crumbs.length === 0) return null;

    return (
        <div className="flex items-center gap-1 px-4 py-1.5" style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E0' }}>
            <button
                className="text-xs px-1 py-0.5 rounded transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = '#F0F0ED'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent'; }}
                onClick={() => setActiveView({ type: 'welcome' })}
                title="Home"
            >
                {'\u2302'}
            </button>
            {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: '#D1D5DB' }}>/</span>
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

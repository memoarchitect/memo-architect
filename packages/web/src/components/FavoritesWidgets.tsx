// ─── Home widgets: favorites, and what was opened last ──────────────────────
//
//   {{widget:favorites}}        what this person marked as favorites
//   {{widget:recent-views}}     the views they opened last
//   {{widget:recent-elements}}  the elements they opened last
//
// All three are this person's own (memo.user.yaml), so they belong on a dashboard, never in a DHF document.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { FavoriteDTO, MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { describeFavorite, favoriteMembers, type FavoriteEntry } from '../lib/favorites';
import { elementIdTitle } from '../lib/trace-labels';
import { viewpointDashboardId } from '../dashboard/dashboards';
import { ontologyLabel } from '../lib/ontology-labels';
import { FavoriteToggle } from './FavoriteToggle';

const kindLabelIn = (model: MemoModelDTO) => (kind: string) => ontologyLabel(model.registries, kind);

const box = { background: 'rgba(255,255,255,0.75)', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 16 } as const;
const empty = { fontSize: 12, color: '#6B7280', margin: '0 0 16px' } as const;

/** Open what a favorite, or a recent entry, points at, the way the command palette does. */
function useOpen() {
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    return {
        element: (id: string) => { selectElement(id); setExplorerTab('model'); },
        view: (model: MemoModelDTO, id: string) => {
            const view = (model.diagrams ?? []).find(diagram => diagram.id === id);
            setActiveView({ type: 'diagram', diagramId: id });
            selectViewpoint(view && view.viewpointId !== '__model' ? view.viewpointId : null);
            setExplorerTab('views');
        },
        viewpoint: (id: string) => {
            selectViewpoint(id);
            setActiveView({ type: 'custom-dashboard', dashboardId: viewpointDashboardId(id) });
        },
    };
}

/** One line: the id it is read by, its title, and what it is. */
function Line({ id, title, what, missing, onOpen, trailing }: {
    id?: string; title: string; what: string; missing?: boolean; onOpen?: () => void; trailing?: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderTop: '1px solid #EEF1F4' }}>
            <button type="button" onClick={onOpen} disabled={!onOpen} style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, textAlign: 'left',
                background: 'none', border: 0, padding: 0, cursor: onOpen ? 'pointer' : 'default',
            }}>
                {id && <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: '#6B7280' }}>{id}</span>}
                <span style={{ fontSize: 13, fontWeight: 600, color: missing ? '#9CA3AF' : '#1B3A4B', overflowWrap: 'anywhere' }}>{title}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{missing ? 'no longer in the model' : what}</span>
            </button>
            {trailing}
        </div>
    );
}

function FavoriteLine({ model, entry }: { model: MemoModelDTO; entry: FavoriteEntry }) {
    const open = useOpen();
    const toggleFavorite = useModelStore(s => s.toggleFavorite);
    const [expanded, setExpanded] = useState(false);
    const { favorite } = entry;
    const isGroup = favorite.type === 'package' || favorite.type === 'folder';
    const members = isGroup && expanded ? favoriteMembers(model, favorite) : [];
    const onOpen = entry.missing ? undefined
        : favorite.type === 'element' ? () => open.element(favorite.ref)
            : favorite.type === 'view' ? () => open.view(model, favorite.ref)
                : favorite.type === 'viewpoint' ? () => open.viewpoint(favorite.ref)
                    : () => setExpanded(value => !value);
    const trailing = entry.missing
        ? <button type="button" onClick={() => toggleFavorite(favorite)} style={{ fontSize: 12, color: '#4A90D9', background: 'none', border: 0, cursor: 'pointer' }}>Remove</button>
        : <FavoriteToggle favorite={favorite} />;
    return (
        <>
            <Line id={entry.id} title={entry.title} what={isGroup ? `${entry.what} · ${favoriteMembers(model, favorite).length}` : entry.what}
                missing={entry.missing} onOpen={onOpen} trailing={trailing} />
            {members.map(element => {
                const { id, title } = elementIdTitle(element, element.id);
                return (
                    <div key={element.id} style={{ paddingLeft: 20 }}>
                        <Line id={id} title={title} what={kindLabelIn(model)(element.kind)} onOpen={() => open.element(element.id)} />
                    </div>
                );
            })}
        </>
    );
}

export function FavoritesWidget() {
    const model = useModelStore(s => s.model);
    const favorites = useModelStore(s => s.favorites);
    if (!model) return null;
    if (favorites.length === 0) {
        return <p className="memo-widget" style={empty}><em>No favorites yet. Use the star on a view, a viewpoint or an element, or <strong>Add to favorites</strong> on a folder or package in the Model Explorer.</em></p>;
    }
    return (
        <div className="memo-widget" style={box}>
            {favorites.map((favorite: FavoriteDTO) => (
                <FavoriteLine key={`${favorite.type}|${favorite.ref}|${favorite.packageName ?? ''}`} model={model} entry={describeFavorite(model, favorite, kindLabelIn(model))} />
            ))}
        </div>
    );
}

export function RecentViewsWidget() {
    const model = useModelStore(s => s.model);
    const recentViews = useModelStore(s => s.recentViews);
    const open = useOpen();
    if (!model) return null;
    if (recentViews.length === 0) return <p className="memo-widget" style={empty}><em>No views opened yet.</em></p>;
    return (
        <div className="memo-widget" style={box}>
            {recentViews.map(ref => {
                const entry = describeFavorite(model, { type: 'view', ref }, kindLabelIn(model));
                return <Line key={ref} id={entry.id} title={entry.title} what={entry.what} missing={entry.missing}
                    onOpen={entry.missing ? undefined : () => open.view(model, ref)} trailing={entry.missing ? undefined : <FavoriteToggle favorite={{ type: 'view', ref }} />} />;
            })}
        </div>
    );
}

export function RecentElementsWidget() {
    const model = useModelStore(s => s.model);
    const recentElements = useModelStore(s => s.recentlyVisited);
    const open = useOpen();
    if (!model) return null;
    if (recentElements.length === 0) return <p className="memo-widget" style={empty}><em>No elements opened yet.</em></p>;
    return (
        <div className="memo-widget" style={box}>
            {recentElements.map(ref => {
                const entry = describeFavorite(model, { type: 'element', ref }, kindLabelIn(model));
                return <Line key={ref} id={entry.id} title={entry.title} what={entry.what} missing={entry.missing}
                    onOpen={entry.missing ? undefined : () => open.element(ref)} trailing={entry.missing ? undefined : <FavoriteToggle favorite={{ type: 'element', ref }} />} />;
            })}
        </div>
    );
}

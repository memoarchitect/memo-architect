// ─── The saved interface pages ────────────────────────────────────────────────
//
// The panel on the left of the Interfaces page, in the place and the manner of the traceability matrices: what
// has been saved, and + New for a fresh pair. A saved page is a dashboard whose body is an `{{interfaces:A | B}}`
// directive; the panel lists them by who sees them (Shared is committed, Only me is not) and opens one by
// putting its two parts back in the page.

import type { DashboardScope } from '@memoarchitect/tools/browser';
import { SCOPE_LABEL } from '../dashboard/dashboards';
import type { SavedInterfaces } from '../lib/interfaces-page';
import { ExplorerCountBadge } from './ExplorerCountBadge';
import { FolderIcon } from './ExplorerPanel';
import { COLOR, FONT } from '../styles/tokens';

const SCOPES: DashboardScope[] = ['shared', 'user'];

export function InterfacesPanel({ saved, selected, onSelect, onNew }: {
    saved: readonly SavedInterfaces[];
    /** The pair the page is showing, so its saved page is marked. */
    selected: { a: string; b: string };
    onSelect: (page: SavedInterfaces) => void;
    onNew: () => void;
}) {
    return (
        <aside
            aria-label="Interface pages"
            style={{ width: '270px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COLOR.border}`, background: COLOR.surface, minHeight: 0 }}
        >
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                <span style={{ fontSize: FONT.sm, fontWeight: 700, color: COLOR.primary }}>Interface pages</span>
                <button
                    onClick={onNew} title="Choose a new pair of parts"
                    style={{ padding: '2px 8px', borderRadius: '5px', border: 'none', fontSize: FONT.xs, fontWeight: 600, background: COLOR.accent, color: '#fff', cursor: 'pointer' }}
                >+ New</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
                {saved.length === 0 && (
                    <div style={{ padding: '10px 12px', fontSize: FONT.xs, color: COLOR.faint }}>
                        Nothing saved yet. Choose two parts and use Save to keep the pair as a markdown page.
                    </div>
                )}
                {SCOPES.map(scope => {
                    const pages = saved.filter(page => page.dashboard.scope === scope);
                    if (pages.length === 0) return null;
                    return (
                        <div key={scope}>
                            <div className="flex items-center gap-1 px-3 py-1" style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.secondary }}>
                                <FolderIcon open />
                                <span style={{ flex: 1 }}>{SCOPE_LABEL[scope]}</span>
                                <ExplorerCountBadge count={pages.length} color={COLOR.muted} />
                            </div>
                            {pages.map(page => {
                                const on = page.a === selected.a && page.b === selected.b;
                                return (
                                    <button
                                        key={page.dashboard.id} type="button" onClick={() => onSelect(page)} title={page.dashboard.path}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left', padding: '5px 12px 5px 34px', border: 'none', cursor: 'pointer',
                                            fontSize: FONT.sm, background: on ? COLOR.surfaceAlt : 'transparent', color: COLOR.primary, fontWeight: on ? 600 : 400,
                                        }}
                                    >
                                        {page.dashboard.title}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

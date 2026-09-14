// ─── DashboardList ───────────────────────────────────────────────────────────
//
// Every custom dashboard in both scopes, plus the home page, and the form to
// start a new one. See plans/memo-custom-dashboards.md.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { DashboardScope } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { saveDashboard } from '../store/ws-client';
import {
    HOME_DASHBOARD_ID, SCOPE_HINT, builtinDashboards, dashboardIdFromTitle, newDashboardMarkdown, resolveDashboard, uniqueDashboardId,
} from '../dashboard/dashboards';
import { ScopeBadge, viewFor } from './DashboardPage';

export function DashboardList() {
    const dashboards = useModelStore(s => s.dashboards);
    const dashboardsLoaded = useModelStore(s => s.dashboardsLoaded);
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);

    const [title, setTitle] = useState('');
    const [scope, setScope] = useState<DashboardScope>('user');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const home = useMemo(() => resolveDashboard(dashboards, HOME_DASHBOARD_ID), [dashboards]);
    const viewpointPages = useMemo(() => builtinDashboards(model).filter(b => b.viewpointId), [model]);
    // A viewpoint's page is listed once, under Viewpoints, whether generated or written.
    const rows = useMemo(
        () => dashboards.filter(d => d.id !== HOME_DASHBOARD_ID && !viewpointPages.some(v => v.id === d.id)),
        [dashboards, viewpointPages],
    );
    const shadowed = useMemo(
        () => new Set(dashboards.filter(d => d.scope === 'user').map(d => d.id)),
        [dashboards],
    );

    const create = async () => {
        const clean = title.trim();
        if (!clean) return;
        const id = uniqueDashboardId(dashboards, dashboardIdFromTitle(clean), scope);
        setBusy(true);
        setError(null);
        try {
            await saveDashboard(id, scope, newDashboardMarkdown(clean));
            setTitle('');
            // Pin the scope only when the id also exists in the other one;
            // otherwise the plain address is the one worth sharing.
            setActiveView(viewFor(id, dashboards.some(d => d.id === id) ? scope : undefined));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: '#F7F7F5', padding: '32px 40px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 4px' }}>Dashboards</h1>
                <p style={{ fontSize: '13px', color: '#4B6E80', margin: '0 0 24px' }}>
                    Markdown pages with live diagrams. <strong>Shared</strong> dashboards live in <code>dashboards/</code> and are
                    committed; <strong>only-me</strong> ones live in <code>dashboards/user/</code>, which is listed in <code>.gitignore</code>.
                </p>

                <form
                    onSubmit={e => { e.preventDefault(); void create(); }}
                    style={{
                        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24,
                        padding: 14, background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 12,
                    }}
                >
                    <input
                        aria-label="New dashboard title"
                        placeholder="New dashboard title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={{ flex: 1, minWidth: 220, fontSize: '13px', padding: '7px 10px', borderRadius: 7, border: '1px solid #D8E0E4' }}
                    />
                    <select
                        aria-label="New dashboard scope"
                        value={scope}
                        onChange={e => setScope(e.target.value as DashboardScope)}
                        title={SCOPE_HINT[scope]}
                        style={{ fontSize: '12px', padding: '7px 8px', borderRadius: 7, border: '1px solid #D8E0E4', background: '#FFFFFF' }}
                    >
                        <option value="user">Only me — dashboards/user/</option>
                        <option value="shared">Shared — dashboards/</option>
                    </select>
                    <button type="submit" disabled={busy || !title.trim()} style={{
                        padding: '7px 14px', borderRadius: 7, border: 'none', background: '#1B3A4B', color: '#FFFFFF',
                        fontSize: '12px', fontWeight: 600, cursor: busy || !title.trim() ? 'default' : 'pointer',
                        opacity: busy || !title.trim() ? 0.5 : 1,
                    }}>
                        {busy ? 'Creating…' : 'Create'}
                    </button>
                    {error && <div role="alert" style={{ width: '100%', fontSize: 12, color: '#B91C1C' }}>{error}</div>}
                </form>

                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 12, overflow: 'hidden' }}>
                    {home && (
                        <Row
                            title="Home"
                            subtitle={home.path ?? 'The landing page — customize it from the page itself'}
                            badge={<ScopeBadge scope={home.scope} />}
                            onOpen={() => setActiveView({ type: 'dashboard' })}
                        />
                    )}
                </div>

                <h2 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', margin: '24px 0 8px' }}>
                    Viewpoints
                </h2>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 12, overflow: 'hidden' }}>
                    {viewpointPages.length === 0 ? (
                        <div style={{ padding: 16, fontSize: 12, color: '#9CA3AF' }}>This model declares no viewpoints.</div>
                    ) : viewpointPages.map(page => {
                        const resolved = resolveDashboard(dashboards, page.id, undefined, viewpointPages);
                        return (
                            <Row
                                key={page.id}
                                title={page.title}
                                subtitle={resolved?.path ?? 'Generated from the viewpoint — customize to add concerns and commentary'}
                                badge={<ScopeBadge scope={resolved?.scope ?? 'builtin'} />}
                                onOpen={() => setActiveView({ type: 'custom-dashboard', dashboardId: page.id })}
                            />
                        );
                    })}
                </div>

                <h2 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', margin: '24px 0 8px' }}>
                    Other dashboards
                </h2>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 12, overflow: 'hidden' }}>
                    {!dashboardsLoaded ? (
                        <div style={{ padding: 16, fontSize: 12, color: '#9CA3AF' }}>Loading dashboards…</div>
                    ) : rows.length === 0 ? (
                        <div style={{ padding: 16, fontSize: 12, color: '#9CA3AF' }}>No custom dashboards yet.</div>
                    ) : rows.map(d => (
                        <Row
                            key={`${d.scope}:${d.id}`}
                            title={d.title}
                            subtitle={d.path}
                            badge={<ScopeBadge scope={d.scope} />}
                            note={d.scope === 'shared' && shadowed.has(d.id) ? 'hidden by your own copy' : undefined}
                            onOpen={() => setActiveView(viewFor(d.id, d.scope === 'shared' && shadowed.has(d.id) ? 'shared' : undefined))}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function Row({ title, subtitle, badge, note, onOpen }: {
    title: string; subtitle: string; badge: React.ReactNode; note?: string; onOpen: () => void;
}) {
    return (
        <button type="button" onClick={onOpen} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', textAlign: 'left',
            background: 'transparent', border: 'none', borderBottom: '1px solid #F1F1EE', cursor: 'pointer',
        }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>{title}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'ui-monospace, Menlo, monospace' }}>{subtitle}</div>
            </div>
            {note && <span style={{ fontSize: 11, color: '#6B7280' }}>{note}</span>}
            {badge}
            <span style={{ color: '#94A3B8' }}>→</span>
        </button>
    );
}

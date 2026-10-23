// ─── Interfaces ───────────────────────────────────────────────────────────────
//
// Pick two parts and see every interface between them, pulled from the model. Save keeps the pair as a markdown
// dashboard (the same file the Dashboards page lists), whose body is an `{{interfaces:A | B}}` directive.

import { useMemo, useState } from 'react';
import type { DashboardScope } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { isFeatureEnabled } from '../config/feature-flags';
import { saveDashboard } from '../store/ws-client';
import { dashboardIdFromTitle, uniqueDashboardId } from '../dashboard/dashboards';
import { defaultInterfacesTitle, interfacesMarkdown, savedInterfaces, selectableParts } from '../lib/interfaces-page';
import { renderDashboardHtml } from '../dhf/document-renderer';
import { documentThemeCss } from '../dhf/document-theme';
import { MemoMarkdownView } from '../components/memo-markdown/MemoMarkdownView';
import { viewFor } from './DashboardPage';
import { ActionButton, ControlIcon } from '../components/TraceControls';
import { COLOR, FONT } from '../styles/tokens';

const field: React.CSSProperties = {
    padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary,
    background: COLOR.surface, minWidth: 0,
};
const label: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary };

export function InterfacesPage() {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const view = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const dashboards = useModelStore(s => s.dashboards);

    const a = view.type === 'interfaces' ? view.a ?? '' : '';
    const b = view.type === 'interfaces' ? view.b ?? '' : '';
    const choose = (next: { a?: string; b?: string }) => setActiveView({ type: 'interfaces', a: next.a ?? a, b: next.b ?? b });

    const parts = useMemo(() => selectableParts(model), [model]);
    const same = a !== '' && a === b;
    const ready = Boolean(model) && a !== '' && b !== '' && !same && Boolean(model?.elements[a]) && Boolean(model?.elements[b]);
    const saved = useMemo(() => savedInterfaces(dashboards), [dashboards]);
    const dhfSettings = useModelStore(s => s.dhfSettings);
    // The preview is the page that gets saved, drawn by the same renderer, so the two cannot differ.
    const html = useMemo(
        () => (ready ? renderDashboardHtml(interfacesMarkdown(model, a, b, defaultInterfacesTitle(model, a, b)), model, dhfSettings) : ''),
        [ready, model, a, b, dhfSettings],
    );
    const css = useMemo(() => documentThemeCss(dhfSettings), [dhfSettings]);

    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [scope, setScope] = useState<DashboardScope>('shared');
    const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

    const save = async () => {
        const clean = (title.trim() || defaultInterfacesTitle(model, a, b));
        const id = uniqueDashboardId(dashboards, dashboardIdFromTitle(clean), scope);
        setStatus(null);
        try {
            await saveDashboard(id, scope, interfacesMarkdown(model, a, b, clean));
            // The saved page opens as a dashboard, a page behind the custom-dashboards feature; with it off the
            // file is still written, so say where it is rather than landing on the home page.
            if (isFeatureEnabled('custom-dashboards')) setActiveView(viewFor(id, dashboards.some(d => d.id === id) ? scope : undefined));
            else setStatus({ kind: 'ok', message: `Saved to dashboards/${scope === 'user' ? 'user/' : ''}${id}.md. Turn on Custom Dashboards in Settings > Features to open it as a page.` });
        } catch (error) {
            setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    };

    const picker = (text: string, value: string, other: string, onPick: (id: string) => void) => (
        <label style={{ ...label, flex: '1 1 260px' }}>
            {text}
            <select value={value} onChange={event => onPick(event.target.value)} style={field}>
                <option value="">Choose a part…</option>
                {parts.map(part => (
                    <option key={part.id} value={part.id} disabled={part.id === other}>{part.name} — {part.id}</option>
                ))}
            </select>
        </label>
    );

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: COLOR.surfaceAlt, padding: '28px 36px' }}>
            <div style={{ maxWidth: 940, margin: '0 auto', display: 'grid', gap: '18px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: FONT.lg, color: COLOR.primary }}>Interfaces</h1>
                    <p style={{ margin: '4px 0 0', fontSize: FONT.sm, color: COLOR.muted }}>
                        Choose two parts to list the interfaces between them. An interface on a port of something nested inside either part counts.
                    </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                    {picker('Part A', a, b, id => choose({ a: id }))}
                    {picker('Part B', b, a, id => choose({ b: id }))}
                </div>
                {parts.length === 0 && <div style={{ fontSize: FONT.sm, color: COLOR.muted }}>The model has no parts to choose from.</div>}
                {same && <div role="alert" style={{ fontSize: FONT.sm, color: '#B91C1C' }}>Choose two different parts.</div>}

                {ready && (
                    <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: '10px', padding: '14px 16px', display: 'grid', gap: '10px' }}>
                        <style>{css}</style>
                        <MemoMarkdownView className="memo-doc" html={html} model={model} />

                        <form
                            onSubmit={event => { event.preventDefault(); setSaving(true); void save().finally(() => setSaving(false)); }}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: '12px' }}
                        >
                            <label style={{ ...label, flex: '1 1 260px' }}>
                                Save as a markdown page
                                <input value={title} onChange={event => setTitle(event.target.value)} placeholder={defaultInterfacesTitle(model, a, b)} style={field} />
                            </label>
                            <label style={label}>
                                Who sees it
                                <select value={scope} onChange={event => setScope(event.target.value as DashboardScope)} style={field}>
                                    <option value="shared">Shared (committed)</option>
                                    <option value="user">Only me</option>
                                </select>
                            </label>
                            <ActionButton type="submit" variant="primary" icon={ControlIcon.save} disabled={!connected || saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </ActionButton>
                        </form>
                        {status && <div role="alert" style={{ fontSize: FONT.xs, color: status.kind === 'ok' ? COLOR.secondary : '#B91C1C' }}>{status.message}</div>}
                    </div>
                )}
                {saved.length > 0 && (
                    <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>Saved interface pages</div>
                        {saved.map(({ dashboard, a: savedA, b: savedB }) => (
                            <button
                                key={`${dashboard.scope}/${dashboard.id}`}
                                type="button"
                                onClick={() => choose({ a: savedA, b: savedB })}
                                style={{ ...field, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '12px' }}
                            >
                                <span>{dashboard.title}</span>
                                <span style={{ color: COLOR.muted }}>{dashboard.path}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

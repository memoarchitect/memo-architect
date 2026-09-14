// ─── DashboardPage ───────────────────────────────────────────────────────────
//
// One markdown dashboard: prose, live read-only diagram embeds and widgets.
// View mode is the page; Edit opens the markdown beside a live preview and
// writes the file on Save. The file lives in one of two scopes — shared
// (committed) or user (dashboards/user/, git-ignored) — and can be moved between them.
//
// The home dashboard (`/`) is this page for id `home`, which falls back to a
// built-in page until someone customizes it.
//
// Design: plans/memo-custom-dashboards.md.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardScope } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { saveDashboard, deleteDashboard, moveDashboard } from '../store/ws-client';
import { renderDashboardHtml } from '../dhf/document-renderer';
import { documentThemeCss } from '../dhf/document-theme';
import { MemoMarkdownView, type WidgetRegistry } from '../components/memo-markdown/MemoMarkdownView';
import {
    HOME_DASHBOARD_ID, SCOPE_HINT, SCOPE_LABEL, builtinDashboards, resolveDashboard,
    type ResolvedDashboard, type ResolvedScope,
} from '../dashboard/dashboards';

const PAGE_BACKGROUND = 'linear-gradient(135deg, #EEF7F3 0%, #EAF2F8 55%, #F2EEF8 100%)';

/** Dashboard-only adjustments on top of the shared document theme. */
const DASHBOARD_CSS = `
.memo-doc.memo-dashboard{max-width:1040px;margin:0 auto}
.memo-doc .memo-widget h1,.memo-doc .memo-widget h2{border:none;padding:0}
.memo-doc .memo-embed-note{font-size:12px;color:#9CA3AF;padding:12px}
.memo-doc.memo-dashboard ul{list-style:disc}
.memo-doc.memo-dashboard ol{list-style:decimal}
`;

const SCOPE_BADGE: Record<ResolvedScope, { bg: string; fg: string }> = {
    shared: { bg: '#E0F2FE', fg: '#075985' },
    user: { bg: '#F3E8FF', fg: '#6B21A8' },
    builtin: { bg: '#F1F5F9', fg: '#475569' },
};

export function ScopeBadge({ scope }: { scope: ResolvedScope }) {
    const c = SCOPE_BADGE[scope];
    return (
        <span title={SCOPE_HINT[scope]} style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '2px 8px', borderRadius: '999px', background: c.bg, color: c.fg, whiteSpace: 'nowrap',
        }}>
            {SCOPE_LABEL[scope]}
        </span>
    );
}

function ToolbarButton({ children, onClick, primary, danger, disabled, title }: {
    children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; title?: string;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} title={title} style={{
            padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
            border: primary ? 'none' : `1px solid ${danger ? '#FECACA' : '#D8E0E4'}`,
            background: primary ? '#1B3A4B' : '#FFFFFF',
            color: primary ? '#FFFFFF' : danger ? '#B91C1C' : '#1B3A4B',
        }}>
            {children}
        </button>
    );
}

export function DashboardPage({ dashboardId, scope, widgets }: {
    dashboardId: string;
    scope?: DashboardScope;
    widgets: WidgetRegistry;
}) {
    const model = useModelStore(s => s.model);
    const dashboards = useModelStore(s => s.dashboards);
    const dashboardsLoaded = useModelStore(s => s.dashboardsLoaded);
    const dhfSettings = useModelStore(s => s.dhfSettings);
    const setActiveView = useModelStore(s => s.setActiveView);

    const builtins = useMemo(() => builtinDashboards(model), [model]);
    const resolved = useMemo(
        () => resolveDashboard(dashboards, dashboardId, scope, builtins),
        [dashboards, dashboardId, scope, builtins],
    );
    const builtin = builtins.find(b => b.id === dashboardId);

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Where Save writes. For a built-in page this is chosen when customizing. */
    const [targetScope, setTargetScope] = useState<DashboardScope>('user');

    // Leaving the page or switching dashboards drops an open editor.
    useEffect(() => { setEditing(false); setError(null); }, [dashboardId, scope]);

    const content = editing ? draft : resolved?.content ?? '';
    const html = useMemo(() => renderDashboardHtml(content, model, dhfSettings), [content, model, dhfSettings]);
    const css = useMemo(() => documentThemeCss(dhfSettings) + DASHBOARD_CSS, [dhfSettings]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try { await action(); return true; }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; }
        finally { setBusy(false); }
    };

    const startEdit = (into?: DashboardScope) => {
        if (!resolved) return;
        setDraft(resolved.content);
        // Home is a personal landing page first; a viewpoint's commentary is
        // the team's, so its generated page customizes into the shared folder.
        const firstScope: DashboardScope = builtin?.viewpointId ? 'shared' : 'user';
        setTargetScope(into ?? (resolved.scope === 'builtin' ? firstScope : resolved.scope));
        setEditing(true);
    };

    const save = async () => {
        if (await run(() => saveDashboard(dashboardId, targetScope, draft))) {
            setEditing(false);
            // A save into a different scope than the one pinned in the URL
            // would otherwise leave the page showing the untouched file.
            if (scope && scope !== targetScope) setActiveView(viewFor(dashboardId, targetScope));
        }
    };

    if (!dashboardsLoaded && !builtin) {
        return <CenteredNote>Loading dashboards…</CenteredNote>;
    }

    if (!resolved) {
        return (
            <CenteredNote>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1B3A4B', marginBottom: 6 }}>
                    No {scope ? `${scope} ` : ''}dashboard “{dashboardId}”
                </div>
                <div style={{ marginBottom: 14 }}>It may have been deleted, moved to the other scope, or not pulled yet.</div>
                <ToolbarButton primary onClick={() => setActiveView({ type: 'dashboards' })}>All dashboards</ToolbarButton>
            </CenteredNote>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: PAGE_BACKGROUND }}>
            <DashboardToolbar
                resolved={resolved}
                editing={editing}
                busy={busy}
                targetScope={targetScope}
                onTargetScope={setTargetScope}
                onEdit={startEdit}
                onSave={save}
                onCancel={() => { setEditing(false); setError(null); }}
                onAll={() => setActiveView({ type: 'dashboards' })}
                onMove={to => run(async () => {
                    await moveDashboard(dashboardId, resolved.scope as DashboardScope, to);
                    if (scope) setActiveView(viewFor(dashboardId, to));
                })}
                onDelete={() => {
                    const what = resolved.builtin
                        ? `Reset “${resolved.title}” to the generated page? This deletes ${resolved.path}.`
                        : `Delete “${resolved.title}”? This deletes ${resolved.path}.`;
                    if (!window.confirm(what)) return;
                    void run(async () => {
                        await deleteDashboard(dashboardId, resolved.scope as DashboardScope);
                        if (!resolved.builtin && !resolved.shadows) setActiveView({ type: 'dashboards' });
                        else if (scope) setActiveView(viewFor(dashboardId));
                    });
                }}
            />

            {error && (
                <div role="alert" style={{
                    margin: '10px 24px 0', padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
                    background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
                }}>
                    {error}
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {editing && (
                    <MarkdownEditor value={draft} onChange={setDraft} onSave={save} />
                )}
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '28px 40px' }}>
                    <style>{css}</style>
                    <MemoMarkdownView className="memo-doc memo-dashboard" html={html} model={model} widgets={widgets} />
                </div>
            </div>
        </div>
    );
}

export function viewFor(dashboardId: string, scope?: DashboardScope) {
    return dashboardId === HOME_DASHBOARD_ID && !scope
        ? { type: 'dashboard' as const }
        : { type: 'custom-dashboard' as const, dashboardId, scope };
}

function CenteredNote({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
            <div style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>{children}</div>
        </div>
    );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function DashboardToolbar({
    resolved, editing, busy, targetScope, onTargetScope,
    onEdit, onSave, onCancel, onAll, onMove, onDelete,
}: {
    resolved: ResolvedDashboard;
    editing: boolean;
    busy: boolean;
    targetScope: DashboardScope;
    onTargetScope: (scope: DashboardScope) => void;
    onEdit: (into?: DashboardScope) => void;
    onSave: () => void;
    onCancel: () => void;
    onAll: () => void;
    onMove: (to: DashboardScope) => void;
    onDelete: () => void;
}) {
    const other: DashboardScope | null = resolved.scope === 'shared' ? 'user' : resolved.scope === 'user' ? 'shared' : null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            padding: '8px 24px', borderBottom: '1px solid rgba(27,58,75,0.08)', background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(6px)',
        }}>
            <button type="button" onClick={onAll} title="All dashboards" style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: '#4B6E80', fontWeight: 600,
            }}>
                Dashboards
            </button>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1B3A4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                {resolved.title}
            </span>
            <ScopeBadge scope={resolved.scope} />
            {resolved.shadows && (
                <span style={{ fontSize: '11px', color: '#6B7280' }} title={`Hides ${resolved.shadows.path}`}>
                    overrides the shared copy
                </span>
            )}
            {resolved.path && (
                <code style={{ fontSize: '11px', color: '#94A3B8', background: 'none' }}>{resolved.path}</code>
            )}

            <div style={{ flex: 1 }} />

            {editing ? (
                <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#4B6E80' }}>
                        Save to
                        <select
                            aria-label="Save to scope"
                            value={targetScope}
                            onChange={e => onTargetScope(e.target.value as DashboardScope)}
                            style={{ fontSize: '12px', padding: '4px 6px', borderRadius: 6, border: '1px solid #D8E0E4', background: '#FFFFFF' }}
                        >
                            <option value="user">Only me — dashboards/user/</option>
                            <option value="shared">Shared — dashboards/</option>
                        </select>
                    </label>
                    <ToolbarButton onClick={onCancel} disabled={busy}>Cancel</ToolbarButton>
                    <ToolbarButton primary onClick={onSave} disabled={busy} title="Save (⌘S)">{busy ? 'Saving…' : 'Save'}</ToolbarButton>
                </>
            ) : resolved.scope === 'builtin' ? (
                <ToolbarButton primary onClick={() => onEdit()} title="Copy the generated page into a file you can edit">
                    Customize
                </ToolbarButton>
            ) : (
                <>
                    {other && (
                        <ToolbarButton onClick={() => onMove(other)} disabled={busy}
                            title={other === 'shared' ? 'Move to dashboards/ so it is committed' : 'Move to dashboards/user/ so it is not committed'}>
                            {other === 'shared' ? 'Share' : 'Unshare'}
                        </ToolbarButton>
                    )}
                    <ToolbarButton danger onClick={onDelete} disabled={busy}>
                        {resolved.shadows ? 'Remove override' : resolved.builtin ? 'Reset to generated' : 'Delete'}
                    </ToolbarButton>
                    <ToolbarButton primary onClick={() => onEdit()}>Edit</ToolbarButton>
                </>
            )}
        </div>
    );
}

// ─── Markdown editor ─────────────────────────────────────────────────────────

function MarkdownEditor({ value, onChange, onSave }: {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
}) {
    const model = useModelStore(s => s.model);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const diagrams = useMemo(
        () => [...(model?.diagrams ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [model?.diagrams],
    );

    /** Insert a directive on its own line at the cursor — the parser needs that. */
    const insertBlock = (text: string) => {
        const el = textareaRef.current;
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        const before = value.slice(0, start);
        const after = value.slice(end);
        const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
        const next = `${before}${lead}${text}${trail}${after}`;
        onChange(next);
        const caret = before.length + lead.length + text.length;
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(caret, caret); });
    };

    return (
        <div style={{
            width: '44%', minWidth: 340, maxWidth: 720, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid #E2E8F0', background: '#FFFFFF',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #EEF2F6', background: '#F8FAFC' }}>
                <select
                    aria-label="Insert diagram"
                    value=""
                    onChange={e => { if (e.target.value) insertBlock(`{{diagram:${e.target.value}}}`); }}
                    style={{ fontSize: '12px', padding: '4px 6px', borderRadius: 6, border: '1px solid #D8E0E4', background: '#FFFFFF', maxWidth: 260 }}
                >
                    <option value="">Insert diagram…</option>
                    {diagrams.map(d => (
                        <option key={d.id} value={d.id}>{d.name} · {d.viewKind || d.diagramType}</option>
                    ))}
                </select>
                <select
                    aria-label="Insert widget"
                    value=""
                    onChange={e => { if (e.target.value) insertBlock(`{{widget:${e.target.value}}}`); }}
                    style={{ fontSize: '12px', padding: '4px 6px', borderRadius: 6, border: '1px solid #D8E0E4', background: '#FFFFFF' }}
                >
                    <option value="">Insert widget…</option>
                    {['header', 'stats', 'coverage', 'next-action', 'viewpoint-dashboards', 'diagrams'].map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Markdown · preview is live</span>
            </div>
            <textarea
                ref={textareaRef}
                aria-label="Dashboard markdown"
                value={value}
                spellCheck={false}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSave(); }
                }}
                style={{
                    flex: 1, resize: 'none', border: 'none', outline: 'none', padding: '14px 16px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px', lineHeight: 1.6,
                    color: '#1E293B', background: '#FFFFFF',
                }}
            />
        </div>
    );
}

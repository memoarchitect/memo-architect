// ─── A feature's page ────────────────────────────────────────────────────────
//
// What the feature is, why it is worth having, and what to look at to see it. The prose is the
// element's own `doc`; the analysis (value, who it is for, how success is measured, what has to
// hold) is four attributes on it; the views are curated: each is a `#ShowsView` statement,
// added and removed through the relationship writer like a release's feature selection.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { requestRelationshipCreate, requestRelationshipDelete, sendElementUpdate } from '../store/ws-client';
import { featurePage } from '../lib/feature-viewpoints';
import { diagramUrl } from '../router';
import { COLOR, FONT } from '../styles/tokens';

const FIELDS: { key: 'valueProposition' | 'targetUsers' | 'successMeasure' | 'assumptions'; label: string; hint: string }[] = [
    { key: 'valueProposition', label: 'Value', hint: 'What it gives the people who use the product.' },
    { key: 'targetUsers', label: 'Who it is for', hint: 'The roles or segments that gain from it.' },
    { key: 'successMeasure', label: 'How we will know', hint: 'The measure, and the level that counts as success.' },
    { key: 'assumptions', label: 'What has to hold', hint: 'What must be true for the value to be real, and what is not yet known.' },
];

export function FeaturePage({ featureId }: { featureId: string }) {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const setActiveView = useModelStore(s => s.setActiveView);
    const navigate = useNavigate();
    const page = useMemo(() => (model ? featurePage(model, featureId) : null), [model, featureId]);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [adding, setAdding] = useState('');

    if (!model) return <div style={{ padding: 40, color: COLOR.muted }}>Loading the model…</div>;
    if (!page) return <div style={{ padding: 40, color: COLOR.muted }}>No feature “{featureId}” in this model.</div>;

    const label = (id: string) => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
    const names = (ids: string[]) => (ids.length === 0 ? '—' : ids.map(label).join(', '));

    const run = async (work: () => Promise<{ success: boolean; error?: string }>) => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await work();
            if (!result.success) setMessage({ ok: false, text: result.error ?? 'The change could not be written.' });
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
        } finally {
            setBusy(false);
        }
    };

    const element = model.elements[featureId];
    const dirty = FIELDS.some(f => draft[f.key] !== undefined && draft[f.key] !== page.value[f.key]) || (draft.description !== undefined && draft.description !== page.description);
    const save = () => run(async () => {
        const attributes = { ...element.attributes };
        for (const f of FIELDS) {
            const next = draft[f.key];
            if (next === undefined) continue;
            if (next.trim()) attributes[f.key] = next; else delete attributes[f.key];
        }
        const result = await sendElementUpdate({ ...element, attributes, doc: draft.description ?? element.doc });
        if (result.success) setDraft({});
        return result;
    });
    const addView = (diagramElementId: string) => run(() =>
        requestRelationshipCreate({ type: 'showsView', sourceId: featureId, targetId: diagramElementId, direction: 'outgoing' }));
    const removeView = (diagramId: string) => run(() => requestRelationshipDelete({ relationshipId: page.showsEdge[diagramId] }));
    const open = (diagramId: string, diagramType: string, shortId?: string) => {
        setActiveView({ type: 'diagram', diagramId });
        navigate(diagramUrl(diagramType, shortId ?? diagramId));
    };

    const section = { fontSize: 16, fontWeight: 700, margin: '26px 0 8px' };
    const box = { width: '100%', maxWidth: 760, fontSize: FONT.sm, padding: '6px 8px', border: `1px solid ${COLOR.border}`, borderRadius: 6, fontFamily: 'inherit' };
    const button = { fontSize: FONT.xs, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer' };

    return (
        <div data-testid="feature-page" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Feature</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 10px' }}>{page.label}</h1>
            {message && <p data-testid="feature-message" style={{ fontSize: FONT.xs, color: message.ok ? '#1B7F4B' : '#B42318' }}>{message.text}</p>}

            <h2 style={section}>What it is</h2>
            <textarea
                data-testid="feature-description" rows={3} style={box} disabled={!connected || busy}
                value={draft.description ?? page.description} placeholder="Describe the feature in a few sentences."
                onChange={e => setDraft({ ...draft, description: e.target.value })}
            />

            <h2 style={section}>Analysis</h2>
            {FIELDS.map(f => (
                <label key={f.key} style={{ display: 'block', margin: '0 0 12px' }}>
                    <span style={{ display: 'block', fontSize: FONT.xs, fontWeight: 600 }}>{f.label}</span>
                    <span style={{ display: 'block', fontSize: FONT.xs, color: COLOR.muted, marginBottom: 3 }}>{f.hint}</span>
                    <textarea
                        data-testid={`feature-${f.key}`} rows={2} style={box} disabled={!connected || busy}
                        value={draft[f.key] ?? page.value[f.key]}
                        onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                </label>
            ))}
            <button type="button" data-testid="feature-save" style={{ ...button, opacity: dirty ? 1 : 0.5 }} disabled={!dirty || !connected || busy} onClick={save}>Save</button>

            <h2 style={section}>What it shows</h2>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 8px', maxWidth: 760 }}>
                The views that demonstrate this feature, chosen by you. They are listed under this feature in the Views tree, and not under a global viewpoint.
            </p>
            {page.views.length === 0 && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No views chosen yet.</p>}
            <ul data-testid="feature-views" style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', maxWidth: 760 }}>
                {page.views.map(v => (
                    <li key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '4px 0', borderBottom: `1px solid ${COLOR.borderLight}` }}>
                        <button type="button" style={{ ...button, border: 0, background: 'none', color: COLOR.accent, fontSize: FONT.sm }} onClick={() => open(v.id, v.diagramType, v.shortId)}>{v.name}</button>
                        <span style={{ fontSize: FONT.xs, color: COLOR.muted, flex: 1 }}>{v.diagramType}{v.package ? ` · ${v.package}` : ''}</span>
                        <button type="button" style={button} disabled={!connected || busy} onClick={() => removeView(v.id)}>Remove</button>
                    </li>
                ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select data-testid="feature-add-view" value={adding} onChange={e => setAdding(e.target.value)} disabled={!connected || busy}
                    style={{ fontSize: FONT.sm, padding: '3px 6px', maxWidth: 420 }}>
                    <option value="">Add a view…</option>
                    {page.otherViews.map(v => <option key={v.id} value={v.elementId}>{v.name}</option>)}
                </select>
                <button type="button" data-testid="feature-add" style={button} disabled={!adding || !connected || busy}
                    onClick={() => { const target = adding; setAdding(''); void addView(target); }}>Add</button>
            </div>

            <h2 style={section}>Where it sits</h2>
            <table style={{ borderCollapse: 'collapse', fontSize: FONT.sm }}>
                <tbody>
                    {([['Realized by', page.realizedBy], ['Selected by', page.selectedBy], ['Requires', page.requires], ['Excludes', page.excludes]] as const).map(([k, ids]) => (
                        <tr key={k}><td style={{ padding: '3px 18px 3px 0', color: COLOR.muted }}>{k}</td><td>{names([...ids])}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Variability (Model) ─────────────────────────────────────────────────────
//
// The family's features, its design options (variation points and their variants), and what each
// release selects. Selecting a feature for a release writes `#SelectsFeature dependency from
// <release> to <feature>;` through the relationship writer; clearing it removes that statement.
// What is wrong with a selection is the validation result's, shown on the release as soon as the
// model is rebuilt: a proposed variant on an approved release, a missing required feature, two
// excluded features, two variants of one variation point.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { relationshipsOfType } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { requestRelationshipCreate, requestRelationshipDelete } from '../store/ws-client';
import { variabilityView } from '../lib/variability-view';
import { COLOR, FONT } from '../styles/tokens';

export function Variability() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const workspace = useModelStore(s => s.workspace);
    const connected = useModelStore(s => s.connected);
    const view = useMemo(() => (model ? variabilityView(model, validation, workspace) : null), [model, validation, workspace]);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    if (!model || !view) return <div style={{ padding: 40, color: COLOR.muted }}>Loading the model…</div>;

    const label = (id: string) => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
    const names = (ids: string[]) => (ids.length === 0 ? '—' : ids.map(label).join(', '));

    const toggle = async (releaseId: string, featureId: string, selected: boolean) => {
        setBusy(`${releaseId}|${featureId}`);
        setMessage(null);
        try {
            const result = selected
                ? await requestRelationshipDelete({
                    relationshipId: relationshipsOfType(model, 'selectsFeature').find(r => r.sourceId === releaseId && r.targetId === featureId)!.id,
                })
                : await requestRelationshipCreate({ type: 'selectsFeature', sourceId: releaseId, targetId: featureId, direction: 'outgoing' });
            if (!result.success) setMessage({ ok: false, text: result.error ?? 'The selection could not be written.' });
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
        } finally {
            setBusy(null);
        }
    };

    const cell = { padding: '6px 10px', fontSize: FONT.sm, textAlign: 'left' as const, borderBottom: `1px solid ${COLOR.borderLight}`, verticalAlign: 'top' as const };
    const head = { ...cell, color: COLOR.muted, fontWeight: 600, fontSize: FONT.xs };
    const section = { fontSize: 16, fontWeight: 700, margin: '28px 0 8px' };

    return (
        <div data-testid="variability" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Variability</h1>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 6px', maxWidth: 780 }}>
                A feature is something the family offers. A variation point is a choice in the design; each of its variants exists to
                give the family a feature. A release selects features, and through them the variants it contains.
            </p>
            {message && <p data-testid="variability-message" style={{ fontSize: FONT.xs, color: message.ok ? '#1B7F4B' : '#B42318' }}>{message.text}</p>}

            <h2 style={section}>Releases</h2>
            {view.releases.length === 0 && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No release records.</p>}
            {view.releases.map(release => (
                <div key={release.id} data-testid="release" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 12, maxWidth: 900 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                        <strong>{release.label}</strong>
                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>{release.status || 'no status'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '8px 0' }}>
                        {view.features.map(feature => {
                            const selected = release.selected.includes(feature.id);
                            return (
                                <label key={feature.id} style={{ fontSize: FONT.sm, display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input
                                        type="checkbox" checked={selected} data-testid={`select-${release.label}-${feature.label}`}
                                        disabled={!connected || busy !== null}
                                        onChange={() => toggle(release.id, feature.id, selected)}
                                    />
                                    {feature.label}
                                </label>
                            );
                        })}
                    </div>
                    <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                        Selects: {Object.entries(release.chosen).map(([point, variants]) => `${label(point)} → ${names(variants)}`).join('; ') || 'no variants'}
                    </div>
                    {release.findings.length > 0 && (
                        <ul data-testid="release-findings" style={{ margin: '8px 0 0', paddingLeft: 18, color: '#B42318', fontSize: FONT.xs }}>
                            {release.findings.map(finding => <li key={finding.ruleId}><strong>{finding.ruleId}</strong> {finding.description}</li>)}
                        </ul>
                    )}
                </div>
            ))}

            <h2 style={section}>Design options</h2>
            {view.points.length === 0 ? <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No variation points.</p> : (
                <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
                    <thead><tr>{['Variation point', 'Variant', 'Status', 'Realizes feature', 'Selected by'].map(h => <th key={h} style={head}>{h}</th>)}</tr></thead>
                    <tbody>
                        {view.points.flatMap(point => point.variants.map((variant, index) => (
                            <tr key={`${point.id}|${variant.id}`} data-testid="variant-row">
                                <td style={cell}>{index === 0 ? point.label : ''}</td>
                                <td style={cell}>{variant.label}</td>
                                <td style={cell}>{variant.status || '—'}</td>
                                <td style={cell}>{variant.features.length === 0 ? <em style={{ color: COLOR.muted }}>none: always built</em> : names(variant.features)}</td>
                                <td style={cell}>{names(view.releases.filter(r => (r.chosen[point.id] ?? []).includes(variant.id)).map(r => r.id))}</td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            )}

            <h2 style={section}>Features</h2>
            {view.features.length === 0 ? <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No features.</p> : (
                <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
                    <thead><tr>{['Feature', 'Requires', 'Excludes', 'Realized by', 'Selected by'].map(h => <th key={h} style={head}>{h}</th>)}</tr></thead>
                    <tbody>
                        {view.features.map(feature => (
                            <tr key={feature.id} data-testid="feature-row">
                                <td style={cell}>{feature.label}</td>
                                <td style={cell}>{names(feature.requires)}</td>
                                <td style={cell}>{names(feature.excludes)}</td>
                                <td style={cell}>{feature.realizedBy.length === 0 ? <em style={{ color: COLOR.muted }}>no variant</em> : names(feature.realizedBy)}</td>
                                <td style={cell}>{names(feature.selectedBy)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <p style={{ fontSize: FONT.xs, color: COLOR.muted, marginTop: 18 }}>
                Requires and excludes are declared in the model source. A variant's introducing project arrives with projects (plan O7).
            </p>
        </div>
    );
}

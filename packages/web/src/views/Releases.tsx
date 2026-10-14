// ─── Releases ────────────────────────────────────────────────────────────────
//
// A release record is one release of one item, with its own part number and revision. This page lists them
// by item through their status, shows what each contains, implements, selects and is verified by, the
// system-of-systems versions with the releases they pin, which features each release selects, what changed
// since the previous release (found by ancestry), and creates a release as one write. A release or a
// ref opens as a pinned, read-only view through the Version selector or the Open button. The markets a
// feature is offered in arrive with regulated devices (plan M5); until then the matrix is features by releases.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { defaultReleaseFile, indexKinds, kindConformsTo, type ModelDiffSummary } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { requestReleaseCreate, requestReleaseDiff, sendVersionOpen } from '../store/ws-client';
import { releaseRecords, releasesByItem, type ReleaseRecordRow } from '../lib/releases-view';
import { variabilityView } from '../lib/variability-view';
import { diffForRole } from '../lib/release-diff-view';
import { COLOR, FONT } from '../styles/tokens';

const STATUS_FALLBACK = ['proposed', 'draft', 'inReview', 'approved', 'released', 'deprecated', 'retired'];

export function Releases() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const workspace = useModelStore(s => s.workspace);
    const role = useModelStore(s => s.role);
    const pinned = useModelStore(s => s.pinned);
    const connected = useModelStore(s => s.connected);
    const rows = useMemo(() => (model ? releaseRecords(model, validation, workspace) : []), [model, validation, workspace]);
    const groups = useMemo(() => releasesByItem(rows), [rows]);
    const features = useMemo(() => (model ? variabilityView(model, validation, workspace).features : []), [model, validation, workspace]);
    const [diff, setDiff] = useState<{ title: string; summary?: ModelDiffSummary; error?: string; busy?: boolean } | null>(null);
    const [creating, setCreating] = useState(false);
    if (!model) return <div style={{ padding: 40, color: COLOR.muted }}>Loading the model…</div>;

    const label = (id: string) => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
    const names = (ids: string[]) => (ids.length === 0 ? '—' : ids.map(label).join(', '));
    const sosVersions = rows.filter(r => r.contains.length > 0);
    const byId = new Map(rows.map(r => [r.id, r]));

    const compare = async (record: ReleaseRecordRow, against: string) => {
        setDiff({ title: `${record.label}: what changed`, busy: true });
        try {
            const result = await requestReleaseDiff(record.id, against);
            if (result.error || !result.diff) setDiff({ title: `${record.label}: what changed`, error: result.error ?? 'No answer.' });
            else setDiff({ title: `${result.after?.label} since ${result.before?.label}${result.previous ? ' (the previous release)' : ''}`, summary: result.diff });
        } catch (error) {
            setDiff({ title: `${record.label}: what changed`, error: error instanceof Error ? error.message : String(error) });
        }
    };

    const cell = { padding: '6px 10px', fontSize: FONT.sm, textAlign: 'left' as const, borderBottom: `1px solid ${COLOR.borderLight}`, verticalAlign: 'top' as const };
    const head = { ...cell, color: COLOR.muted, fontWeight: 600, fontSize: FONT.xs };
    const section = { fontSize: 16, fontWeight: 700, margin: '28px 0 8px' };
    const button = { fontSize: FONT.xs, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer' };

    return (
        <div data-testid="releases" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Releases</h1>
                {!pinned && <button style={button} data-testid="create-release" disabled={!connected} onClick={() => setCreating(c => !c)}>{creating ? 'Close' : 'Create a release'}</button>}
            </div>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 6px', maxWidth: 780 }}>
                A release record is one release of one item, with its own part number and revision. The definition of the item is held once;
                its releases are separate records. A system-of-systems version is a record that contains the system releases it pins.
            </p>
            {creating && !pinned && <CreateRelease rows={rows} features={features.map(f => ({ id: f.id, label: f.label }))} onDone={() => setCreating(false)} />}

            <h2 style={section}>Release records</h2>
            {groups.length === 0 && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No release records yet.</p>}
            {groups.map(group => (
                <div key={group.itemId || 'none'} data-testid="release-group" style={{ marginBottom: 18 }}>
                    <h3 style={{ fontSize: FONT.md, margin: '0 0 4px' }}>{group.itemName}</h3>
                    <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 1100 }}>
                        <thead><tr>{['Record', 'Part number', 'Revision', 'Software', 'Status', 'Commit', 'Selects', 'Implements', ''].map(h => <th key={h} style={head}>{h}</th>)}</tr></thead>
                        <tbody>
                            {group.records.map(record => (
                                <tr key={record.id} data-testid="release-row">
                                    <td style={cell}>{record.label}{record.findings.length > 0 && <span title={record.findings.map(f => `${f.ruleId} ${f.description}`).join('\n')} style={{ color: '#B42318', marginLeft: 6 }}>●</span>}</td>
                                    <td style={cell}>{record.partNumber || '—'}</td>
                                    <td style={cell}>{record.revision || '—'}</td>
                                    <td style={cell}>{[record.softwareVersion, record.codeTag].filter(Boolean).join(' · ') || '—'}</td>
                                    <td style={cell}>{record.status || 'no status'}</td>
                                    <td style={{ ...cell, fontFamily: 'ui-monospace, Menlo, monospace' }}>{record.modelCommit.slice(0, 7) || '—'}</td>
                                    <td style={cell}>{names(record.features)}</td>
                                    <td style={cell}>{names(record.implements)}</td>
                                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                                        {!pinned && <button style={button} data-testid={`open-${record.label}`} onClick={() => sendVersionOpen({ release: record.id })}>Open</button>}{' '}
                                        {!pinned && <button style={button} data-testid={`changes-${record.label}`} onClick={() => compare(record, 'previous')}>Changes</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {diff && (
                <div data-testid="release-diff" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '12px 16px', margin: '12px 0', maxWidth: 900 }}>
                    <strong>{diff.title}</strong> <button style={button} onClick={() => setDiff(null)}>Close</button>
                    {diff.busy && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>Building both releases…</p>}
                    {diff.error && <p data-testid="release-diff-error" style={{ fontSize: FONT.sm, color: '#B42318' }}>{diff.error}</p>}
                    {diff.summary && <DiffBody diff={diffForRole(diff.summary, model, role)} />}
                </div>
            )}

            <h2 style={section}>System-of-systems versions</h2>
            {sosVersions.length === 0 ? <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No record contains other releases.</p> : sosVersions.map(version => (
                <div key={version.id} data-testid="sos-version" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '10px 16px', marginBottom: 10, maxWidth: 900 }}>
                    <strong>{version.label}</strong> <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>{version.item?.name} · {version.status || 'no status'} · {version.modelCommit.slice(0, 7)}</span>
                    <div style={{ fontSize: FONT.sm, margin: '6px 0' }}>
                        Pins: {version.contains.map(id => {
                            const pin = byId.get(id);
                            return `${pin?.label ?? label(id)}${pin?.revision ? ` rev ${pin.revision}` : ''}${pin ? ` @ ${pin.modelCommit.slice(0, 7)}` : ''}`;
                        }).join('; ')}
                    </div>
                    <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Evidence (verified by): {names(version.verifiedBy)}</div>
                </div>
            ))}

            <h2 style={section}>Features by release</h2>
            {features.length === 0 || rows.length === 0 ? <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No features or no releases.</p> : (
                <table data-testid="feature-matrix" style={{ borderCollapse: 'collapse', maxWidth: 1100 }}>
                    <thead><tr><th style={head}>Feature</th>{rows.map(r => <th key={r.id} style={head}>{r.label}</th>)}</tr></thead>
                    <tbody>
                        {features.map(feature => (
                            <tr key={feature.id}>
                                <td style={cell}>{feature.label}</td>
                                {rows.map(r => <td key={r.id} style={{ ...cell, textAlign: 'center' }}>{r.features.includes(feature.id) ? '✓' : ''}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <p style={{ fontSize: FONT.xs, color: COLOR.muted, marginTop: 18 }}>
                The markets a feature is offered in come from regulated devices (plan M5); until then this is features by releases.
            </p>
        </div>
    );
}

function DiffBody({ diff: { diff, hidden } }: { diff: { diff: ModelDiffSummary; hidden: number } }) {
    const list = (title: string, items: string[]) => items.length === 0 ? null : (
        <div style={{ margin: '6px 0' }}><div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{title} ({items.length})</div>
            <ul style={{ margin: '2px 0', paddingLeft: 18, fontSize: FONT.sm }}>{items.map(item => <li key={item}>{item}</li>)}</ul></div>
    );
    const empty = diff.added.length + diff.removed.length + diff.changed.length + diff.addedRels.length + diff.removedRels.length === 0;
    return (
        <div>
            {empty && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>Nothing changed{hidden > 0 ? ' that this role sees' : ''}.</p>}
            {list('Added', diff.added.map(e => `${e.name} (${e.kind})`))}
            {list('Removed', diff.removed.map(e => `${e.name} (${e.kind})`))}
            {list('Changed', diff.changed.map(e => `${e.name} (${e.kind}): ${e.changes.join(', ')}`))}
            {list('Links added', diff.addedRels.map(r => `${r.source} ${r.type} ${r.target}`))}
            {list('Links removed', diff.removedRels.map(r => `${r.source} ${r.type} ${r.target}`))}
            {hidden > 0 && <p style={{ fontSize: FONT.xs, color: COLOR.muted }}>{hidden} change(s) are outside this role's viewpoints.</p>}
        </div>
    );
}

function CreateRelease({ rows, features, onDone }: { rows: ReleaseRecordRow[]; features: { id: string; label: string }[]; onDone: () => void }) {
    const model = useModelStore(s => s.model)!;
    const kinds = useMemo(() => indexKinds(model.registries?.kinds ?? []), [model]);
    const items = useMemo(() => Object.values(model.elements).filter(e => e.isDefinition && !kindConformsTo(e.kind, 'ReleaseRecord', kinds))
        .sort((a, b) => a.name.localeCompare(b.name)), [model, kinds]);
    const cases = useMemo(() => Object.values(model.elements).filter(e => kindConformsTo(e.kind, 'VerificationCase', kinds)), [model, kinds]);
    const statuses = model.enumerations?.find(e => e.name === 'ElementStatusKind')?.literals ?? STATUS_FALLBACK;
    const [form, setForm] = useState({ name: '', label: '', itemId: '', partNumber: '', revision: '', softwareVersion: '', codeTag: '', status: 'draft', modelCommit: '' });
    const [picked, setPicked] = useState<{ contains: string[]; implements: string[]; features: string[]; verifiedBy: string[] }>({ contains: [], implements: [], features: [], verifiedBy: [] });
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const itemFile = model.elements[form.itemId]?.file;
    const file = defaultReleaseFile({ recordFiles: rows.map(r => model.elements[r.id]?.file ?? ''), itemFile });
    const toggle = (key: keyof typeof picked, id: string) =>
        setPicked(p => ({ ...p, [key]: p[key].includes(id) ? p[key].filter(x => x !== id) : [...p[key], id] }));
    const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm(f => ({ ...f, [key]: event.target.value }));
    const input = { fontSize: FONT.sm, padding: '3px 6px', border: `1px solid ${COLOR.border}`, borderRadius: 6, width: 220 };
    const field = (name: string, control: JSX.Element) => <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: FONT.sm, margin: '4px 0' }}><span style={{ width: 130, color: COLOR.muted }}>{name}</span>{control}</label>;
    const checks = (title: string, key: keyof typeof picked, options: { id: string; label: string }[]) => options.length === 0 ? null : (
        <div style={{ margin: '6px 0' }}>
            <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {options.map(o => <label key={o.id} style={{ fontSize: FONT.sm }}><input type="checkbox" checked={picked[key].includes(o.id)} onChange={() => toggle(key, o.id)} /> {o.label}</label>)}
            </div>
        </div>
    );
    const submit = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await requestReleaseCreate({
                name: form.name.trim(), label: form.label.trim() || undefined, itemId: form.itemId, partNumber: form.partNumber.trim(), revision: form.revision.trim(),
                softwareVersion: form.softwareVersion.trim() || undefined, codeTag: form.codeTag.trim() || undefined, status: form.status,
                modelCommit: form.modelCommit.trim() || undefined, ...picked, file,
            });
            if (result.success) onDone();
            else setMessage(result.error ?? 'The release could not be written.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div data-testid="create-release-form" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '12px 16px', margin: '12px 0', maxWidth: 760 }}>
            <strong>Create a release</strong>
            {field('Item', <select data-testid="release-item" value={form.itemId} onChange={set('itemId')} style={input}><option value="">Choose the item…</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.kind})</option>)}</select>)}
            {field('Name', <input data-testid="release-name" value={form.name} onChange={set('name')} placeholder="relPumpD" style={input} />)}
            {field('Label', <input value={form.label} onChange={set('label')} placeholder="Pump rev D" style={input} />)}
            {field('Part number', <input data-testid="release-pn" value={form.partNumber} onChange={set('partNumber')} style={input} />)}
            {field('Revision', <input data-testid="release-revision" value={form.revision} onChange={set('revision')} style={input} />)}
            {field('Software version', <input value={form.softwareVersion} onChange={set('softwareVersion')} placeholder="software only" style={input} />)}
            {field('Code tag', <input value={form.codeTag} onChange={set('codeTag')} placeholder="software only" style={input} />)}
            {field('Status', <select value={form.status} onChange={set('status')} style={input}>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>)}
            {field('Commit', <input value={form.modelCommit} onChange={set('modelCommit')} placeholder="HEAD (refused if the tree has uncommitted changes)" style={input} />)}
            {checks('Features it selects', 'features', features)}
            {checks('Releases it contains', 'contains', rows.map(r => ({ id: r.id, label: r.label })))}
            {checks('Interface releases it implements', 'implements', rows.map(r => ({ id: r.id, label: r.label })))}
            {checks('Verified by', 'verifiedBy', cases.map(c => ({ id: c.id, label: c.name })))}
            <div style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '8px 0' }}>Written to {file}: never into a system folder, which is checked out at the commit this record pins.</div>
            <button style={{ fontSize: FONT.sm, padding: '4px 14px', borderRadius: 6, border: 'none', background: COLOR.primary, color: '#fff', cursor: 'pointer' }}
                data-testid="release-submit" disabled={busy || !form.itemId || !form.name || !form.partNumber || !form.revision} onClick={submit}>
                {busy ? 'Writing…' : 'Create'}
            </button>
            {message && <p data-testid="release-create-error" style={{ fontSize: FONT.xs, color: '#B42318', whiteSpace: 'pre-wrap' }}>{message}</p>}
        </div>
    );
}

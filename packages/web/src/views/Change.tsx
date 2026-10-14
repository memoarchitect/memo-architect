// ─── Change ──────────────────────────────────────────────────────────────────
//
// A project is a change set in an iteration; it feeds the releases it contributes to. This page lists them,
// and shows what the working tree's change reaches: measured from where it branched from a target (HEAD by
// default, so uncommitted edits; a branch, a tag or a release's commit for more), expanded from what changed to
// the requirements, risks and tests it touches, the systems that hold them, the releases that need a new one,
// the devices that cover those, and the steps of the method it reopens. The server computes all of it; this page
// shows it as returned.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { requestImpact } from '../store/ws-client';
import { projectRows } from '../lib/projects-view';
import { releaseRecords } from '../lib/releases-view';
import { words } from '../lib/guide-view';
import { COLOR, FONT } from '../styles/tokens';

type Report = NonNullable<Awaited<ReturnType<typeof requestImpact>>['report']>;

export function Change() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const workspace = useModelStore(s => s.workspace);
    const pinned = useModelStore(s => s.pinned);
    const refs = useModelStore(s => s.versionRefs);
    const connected = useModelStore(s => s.connected);
    const projects = useMemo(() => (model ? projectRows(model, workspace) : []), [model, workspace]);
    const records = useMemo(() => (model ? releaseRecords(model, validation, null) : []), [model, validation]);
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState(false);
    const [report, setReport] = useState<Report | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    if (!model) return <div style={{ padding: 40, color: COLOR.muted }}>Loading the model…</div>;

    const compute = async () => {
        setBusy(true);
        setProblem(null);
        try {
            const result = await requestImpact(target.trim() || undefined);
            if (result.error || !result.report) { setReport(null); setProblem(result.error ?? 'No answer.'); } else setReport(result.report);
        } catch (error) {
            setReport(null);
            setProblem(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    const cell = { padding: '6px 10px', fontSize: FONT.sm, textAlign: 'left' as const, borderBottom: `1px solid ${COLOR.borderLight}`, verticalAlign: 'top' as const };
    const head = { ...cell, color: COLOR.muted, fontWeight: 600, fontSize: FONT.xs };
    const section = { fontSize: 16, fontWeight: 700, margin: '28px 0 8px' };
    const group = (title: string, items: string[]) => items.length === 0 ? null : (
        <div style={{ margin: '8px 0' }}>
            <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{title} ({items.length})</div>
            <ul style={{ margin: '2px 0', paddingLeft: 18, fontSize: FONT.sm }}>{items.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
    );

    return (
        <div data-testid="change" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Change</h1>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 6px', maxWidth: 780 }}>
                A project is a change set in an iteration. It feeds the releases it contributes to, and a variant records the project that introduced it.
            </p>

            <h2 style={section}>Projects</h2>
            {projects.length === 0 ? <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No project is declared. A project is a <code>Project</code> that <code>#Feeds</code> the releases it contributes to.</p> : (
                <table data-testid="projects" style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 980 }}>
                    <thead><tr>{['Project', 'Tracker', 'Feeds', 'Introduced'].map(h => <th key={h} style={head}>{h}</th>)}</tr></thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id} data-testid="project-row">
                                <td style={cell}>{project.name}</td>
                                <td style={cell}>{project.trackerLink ? <a href={project.trackerLink} target="_blank" rel="noreferrer">{project.trackerLink}</a> : '—'}</td>
                                <td style={cell}>{project.feeds.length === 0 ? <em style={{ color: COLOR.muted }}>no release</em> : project.feeds.map(f => `${f.name}${f.commit ? ` @ ${f.commit}` : ''}`).join(', ')}</td>
                                <td style={cell}>{project.introduced.length === 0 ? '—' : project.introduced.map(v => v.name).join(', ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {!pinned && (
                <>
                    <h2 style={section}>Impact of the change</h2>
                    <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 8px', maxWidth: 780 }}>
                        Measured from where the working tree branched from the target. Leave it empty for HEAD: what your edits reach.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                        <input
                            data-testid="impact-target" list="impact-targets" value={target} onChange={e => setTarget(e.target.value)}
                            placeholder="HEAD" style={{ fontSize: FONT.sm, padding: '3px 8px', border: `1px solid ${COLOR.border}`, borderRadius: 6, width: 260 }}
                        />
                        <datalist id="impact-targets">
                            {refs.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                            {records.filter(r => r.modelCommit).map(r => <option key={r.id} value={r.modelCommit}>{r.label} ({r.modelCommit.slice(0, 7)})</option>)}
                        </datalist>
                        <button data-testid="impact-compute" disabled={!connected || busy} onClick={compute}
                            style={{ fontSize: FONT.sm, padding: '4px 14px', borderRadius: 6, border: 'none', background: COLOR.primary, color: '#fff', cursor: 'pointer' }}>
                            {busy ? 'Computing…' : 'Show impact'}
                        </button>
                    </div>
                    {problem && <p data-testid="impact-problem" style={{ fontSize: FONT.sm, color: '#B42318' }}>{problem}</p>}
                    {report && <Impact report={report} group={group} packageOf={id => model.elements[id]?.package} />}
                </>
            )}
        </div>
    );
}

type ImpactItem = Report['changed']['elements'][number];

/**
 * The elements a change touches, in the package that declares each: a package is a folder,
 * as it is in the Views tree. An element no longer in the model (removed) has no package and
 * is listed under its own heading.
 */
function byPackage(title: string, items: ImpactItem[], packageOf: (id: string) => string | undefined, describe: (item: ImpactItem) => string) {
    if (items.length === 0) return null;
    const folders = new Map<string, ImpactItem[]>();
    for (const item of items) {
        const key = packageOf(item.id) ?? '(no longer in the model)';
        folders.set(key, [...(folders.get(key) ?? []), item]);
    }
    return (
        <div style={{ margin: '8px 0' }}>
            <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>{title} ({items.length})</div>
            {[...folders].sort(([a], [b]) => a.localeCompare(b)).map(([folder, members]) => (
                <details key={folder} data-testid="impact-package" open style={{ margin: '2px 0 2px 6px' }}>
                    <summary style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted, cursor: 'pointer' }}>{folder} ({members.length})</summary>
                    <ul style={{ margin: '2px 0', paddingLeft: 18, fontSize: FONT.sm }}>{members.map(item => <li key={`${item.id}|${item.via ?? ''}`}>{describe(item)}</li>)}</ul>
                </details>
            ))}
        </div>
    );
}

function Impact({ report, group, packageOf }: {
    report: Report; group: (title: string, items: string[]) => JSX.Element | null; packageOf: (id: string) => string | undefined;
}) {
    const empty = report.changed.elements.length === 0 && report.changed.addedLinks + report.changed.removedLinks === 0;
    return (
        <div data-testid="impact-report" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '12px 16px', maxWidth: 900 }}>
            <div style={{ fontSize: FONT.sm }}>
                Working tree against <b className="mono">{report.base.commit.slice(0, 7)}</b>, where it left {report.target}.
            </div>
            {empty && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>Nothing has changed.</p>}
            {byPackage('Changed', report.changed.elements, packageOf, e => `${e.name} (${e.kind}), ${e.via}`)}
            {Object.entries(report.reached).map(([layer, items]) => byPackage(`Reached: ${words(layer)}`, items, packageOf, i => `${i.name} (${i.kind}), by ${i.via}`))}
            {group('Systems', report.systems.map(s => `${s.name} (${s.scope === 'sos' ? 'system of systems' : 'system'})`))}
            {group('Releases', report.releases.map(r => `${r.name}, ${r.status || 'no status'}${r.commit ? ` @ ${r.commit}` : ''}${r.needsNewRelease ? ': needs a new release' : ''}`))}
            {group('Regulated devices', report.devices.map(d => `${d.name} (${d.jurisdiction})`))}
            {group('Steps of the method reopened', report.reopened.map(s => `${s.workspace}: ${s.label}`))}
            <p style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '10px 0 0' }}>{report.limits.join(' ')}</p>
        </div>
    );
}

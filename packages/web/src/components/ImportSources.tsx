// ─── Import sources (Settings > Import) ──────────────────────────────────────
//
// The systems the model imports from, when each was last imported, and a way to
// import again: choose the new export, read what it would change (new, changed,
// deleted, and the links each touches), then apply. The preview and the apply are
// the same computation on the server; this only shows the first and asks for the second.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { listImportSources, type SourceImportResultMessage } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { requestSourceImport } from '../store/ws-client';
import { COLOR, FONT } from '../styles/tokens';

type Preview = NonNullable<SourceImportResultMessage['payload']['preview']>;
type Format = 'csv' | 'reqif' | 'trace-matrix';

const FORMATS: { value: Format; label: string }[] = [
    { value: 'csv', label: 'CSV (records)' },
    { value: 'reqif', label: 'ReqIF' },
    { value: 'trace-matrix', label: 'Trace matrix (CSV)' },
];

const field = { padding: '6px 8px', fontSize: FONT.sm, border: `1px solid ${COLOR.border}`, borderRadius: 6, background: COLOR.surface, color: COLOR.primary };
const button = (enabled: boolean) => ({
    padding: '6px 12px', fontSize: FONT.sm, borderRadius: 6, border: `1px solid ${COLOR.border}`,
    background: enabled ? COLOR.surface : COLOR.surfaceAlt, color: enabled ? COLOR.primary : COLOR.faint,
    cursor: enabled ? 'pointer' : 'not-allowed',
});

export function ImportSources() {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const sources = useMemo(() => (model ? listImportSources(model) : []), [model]);
    // The system being imported to ('' for a new source), or null when no import is open.
    const [open, setOpen] = useState<string | null>(null);

    return (
        <section data-testid="import-sources" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: COLOR.primary, margin: '0 0 6px' }}>Sources</h2>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 12px' }}>
                Systems this model imports from. Each keeps its records in one file the import owns; a re-import compares the new export with them.
            </p>
            {sources.length === 0 ? (
                <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>Nothing has been imported from another system yet.</p>
            ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>{['System', 'Format', 'Last export', 'Last import', 'Records', ''].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: FONT.xs, color: COLOR.muted }}>{h}</th>
                        ))}</tr>
                    </thead>
                    <tbody>
                        {sources.map(source => (
                            <tr key={source.system} data-testid="import-source" style={{ borderTop: `1px solid ${COLOR.borderLight}` }}>
                                <td style={{ padding: '8px', fontSize: FONT.sm, fontWeight: 600 }}>{source.system}</td>
                                <td style={{ padding: '8px', fontSize: FONT.sm }}>{source.format}</td>
                                <td style={{ padding: '8px', fontSize: FONT.sm }}>{source.file ?? '—'}</td>
                                <td style={{ padding: '8px', fontSize: FONT.sm }}>{new Date(source.importedAt).toLocaleString()}</td>
                                <td style={{ padding: '8px', fontSize: FONT.sm }}>
                                    {source.records}{source.withdrawn > 0 ? ` (${source.withdrawn} left the source)` : ''}
                                </td>
                                <td style={{ padding: '8px' }}>
                                    <button type="button" disabled={!connected} style={button(connected)} onClick={() => setOpen(source.system)}>Re-import…</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div style={{ marginTop: 12 }}>
                <button type="button" disabled={!connected} style={button(connected)} onClick={() => setOpen('')}>Import from a new source…</button>
            </div>
            {open !== null && (
                <ImportPanel
                    key={open}
                    system={open}
                    format={(sources.find(s => s.system === open)?.format as Format | undefined) ?? 'csv'}
                    onClose={() => setOpen(null)}
                />
            )}
        </section>
    );
}

function ImportPanel({ system: initialSystem, format: initialFormat, onClose }: { system: string; format: Format; onClose: () => void }) {
    const [system, setSystem] = useState(initialSystem);
    const [format, setFormat] = useState<Format>(FORMATS.some(f => f.value === initialFormat) ? initialFormat : 'csv');
    const [kind, setKind] = useState('Requirement');
    const [relation, setRelation] = useState('derivesFrom');
    const [file, setFile] = useState<{ name: string; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [note, setNote] = useState<{ ok: boolean; lines: string[] } | null>(null);
    const [applied, setApplied] = useState<string | null>(null);
    // The file the preview said it would write, which the apply is held to.
    const [previewed, setPreviewed] = useState<{ sourceFile: string; sourceHash: string } | undefined>(undefined);

    const ready = Boolean(file && system.trim());
    const request = () => ({
        system: system.trim(), format, text: file!.text, fileName: file!.name,
        ...(format !== 'trace-matrix' ? { kind: kind.trim() || undefined } : { relation: relation.trim() || undefined }),
    });

    const run = async (mode: 'preview' | 'apply') => {
        if (!ready) return;
        setBusy(true);
        setNote(null);
        try {
            const result = await requestSourceImport(mode, request(), previewed);
            const lines = [...(result.errors ?? []), ...(result.warnings ?? []),
                ...((result.dropped?.length ?? 0) > 0 ? [`Not written, the kind declares no such attribute: ${result.dropped!.join(', ')}`] : [])];
            if (!result.success) { setPreview(null); setNote({ ok: false, lines }); return; }
            setPreview(result.preview ?? null);
            if (mode === 'preview' && result.sourceFile) setPreviewed({ sourceFile: result.sourceFile, sourceHash: result.sourceHash ?? '' });
            if (mode === 'apply') setApplied(result.sourceFile ?? '');
            setNote({ ok: true, lines });
        } catch (error) {
            setNote({ ok: false, lines: [error instanceof Error ? error.message : String(error)] });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="import-panel" style={{ marginTop: 16, padding: 16, border: `1px solid ${COLOR.border}`, borderRadius: 10, background: COLOR.surface }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <input aria-label="System" placeholder="System, e.g. reqtool" value={system} readOnly={initialSystem !== ''}
                    onChange={e => { setSystem(e.target.value); setPreview(null); }} style={{ ...field, width: 180 }} />
                <select aria-label="Format" value={format} onChange={e => { setFormat(e.target.value as Format); setPreview(null); }} style={field}>
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {format === 'trace-matrix'
                    ? <input aria-label="Relationship" placeholder="Relationship" value={relation} onChange={e => setRelation(e.target.value)} style={{ ...field, width: 150 }} />
                    : <input aria-label="Kind" placeholder="Kind of a record" value={kind} onChange={e => setKind(e.target.value)} style={{ ...field, width: 150 }} />}
                <input aria-label="Export file" type="file" accept=".csv,.reqif,.xml,.txt" onChange={async e => {
                    const chosen = e.target.files?.[0];
                    setPreview(null);
                    setApplied(null);
                    setFile(chosen ? { name: chosen.name, text: await chosen.text() } : null);
                }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button type="button" disabled={!ready || busy} style={button(ready && !busy)} onClick={() => run('preview')}>Preview</button>
                <button type="button" disabled={!preview || busy || applied !== null} style={button(Boolean(preview) && !busy && applied === null)} onClick={() => run('apply')}>Apply</button>
                <button type="button" style={button(true)} onClick={onClose}>Close</button>
                {applied !== null && <span style={{ fontSize: FONT.xs, color: '#1B7F4B' }}>Written to {applied}. The links it made suspect are under Assurance › Suspect Links.</span>}
            </div>
            {note && note.lines.length > 0 && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: FONT.xs, color: note.ok ? COLOR.muted : '#B42318' }}>
                    {note.lines.map(line => <li key={line}>{line}</li>)}
                </ul>
            )}
            {preview && <PreviewTables preview={preview} />}
        </div>
    );
}

function PreviewTables({ preview }: { preview: Preview }) {
    const section = (title: string, tone: string, testid: string, rows: Preview['added'], detail: (entry: Preview['added'][number]) => string) => (
        <div data-testid={testid} style={{ marginTop: 12 }}>
            <div style={{ fontSize: FONT.sm, fontWeight: 700, color: tone }}>{title} ({rows.length})</div>
            {rows.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: FONT.xs, color: COLOR.secondary }}>
                    {rows.map(entry => <li key={entry.identifier}><strong>{entry.identifier}</strong> {entry.name} {detail(entry)}</li>)}
                </ul>
            )}
        </div>
    );
    const marks = (n: number) => (n > 0 ? ` — marks ${n} link(s) suspect` : '');
    return (
        <div data-testid="import-preview">
            {section('New', '#1B7F4B', 'preview-new', preview.added, e => `[${e.kind}] revision ${e.to}`)}
            {section('Changed', '#9A6700', 'preview-changed', preview.changed,
                e => `revision ${e.from} → ${e.to}${e.changes.length ? ` (${e.changes.map(c => c.field).join(', ')})` : ''}${marks(e.suspectLinks.length)}`)}
            {section('Deleted', '#B42318', 'preview-deleted', preview.deleted,
                e => `left the export; kept, marked withdrawn${e.suspectLinks.length ? ` — flags ${e.suspectLinks.length} link(s)` : ''}`)}
            <div style={{ fontSize: FONT.xs, color: COLOR.muted, marginTop: 8 }}>{preview.unchanged} unchanged.</div>
        </div>
    );
}

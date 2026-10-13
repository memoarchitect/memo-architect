// ─── Suspect links (Assurance) ───────────────────────────────────────────────
//
// What a re-import left for review: links a person wrote to an imported record
// that has since moved to another revision, or gone from its source. A moved
// record's links are cleared by review, which rewrites the revision they were made
// against; a withdrawn record has no revision to review against, so its links are
// removed. Nothing is stored about the review: the link is no longer suspect
// because it no longer disagrees with the record.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { requestRelationshipDelete, requestSuspectReview } from '../store/ws-client';
import { suspectRows, type SuspectRow } from '../lib/suspect-queue';
import { COLOR, FONT } from '../styles/tokens';

const REASON_LABEL: Record<SuspectRow['reason'], string> = {
    'revision-moved': 'Revision moved',
    'source-withdrawn': 'Left the source',
};

export function SuspectLinksPage() {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    const connected = useModelStore(s => s.connected);
    const rows = useMemo(() => (model ? suspectRows(model, workspace) : []), [model, workspace]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const review = async (targets: SuspectRow[]) => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await requestSuspectReview(targets.map(t => ({ relationshipId: t.relationshipId, elementId: t.elementId })));
            setMessage(result.success
                ? { ok: true, text: `${result.reviewed.length} link(s) reviewed.` }
                : { ok: false, text: result.error ?? 'The review could not be written.' });
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
        } finally {
            setBusy(false);
        }
    };

    const remove = async (row: SuspectRow) => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await requestRelationshipDelete({ relationshipId: row.relationshipId });
            setMessage(result.success
                ? { ok: true, text: 'Link removed.' }
                : { ok: false, text: result.error ?? 'The link could not be removed.' });
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : String(error) });
        } finally {
            setBusy(false);
        }
    };

    const moved = rows.filter(row => row.reason === 'revision-moved');
    const cell = { padding: '8px 10px', fontSize: FONT.sm, textAlign: 'left' as const, borderBottom: `1px solid ${COLOR.borderLight}`, verticalAlign: 'top' as const };
    const button = (enabled: boolean) => ({
        padding: '4px 10px', fontSize: FONT.xs, borderRadius: 6, border: `1px solid ${COLOR.border}`,
        background: enabled ? COLOR.surface : COLOR.surfaceAlt, color: enabled ? COLOR.primary : COLOR.faint,
        cursor: enabled ? 'pointer' : 'not-allowed',
    });

    return (
        <div data-testid="suspect-links" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Suspect links</h1>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 18px', maxWidth: 760 }}>
                Links you wrote to an imported record that has moved to another revision or left its source since.
                Review a link once you have checked it against the new revision; remove a link to a record that left.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: FONT.md, fontWeight: 600 }} data-testid="suspect-count">{rows.length} suspect</span>
                <button
                    type="button"
                    disabled={busy || !connected || moved.length === 0}
                    onClick={() => review(moved)}
                    style={button(!busy && connected && moved.length > 0)}
                >
                    Mark {moved.length} moved link(s) reviewed
                </button>
                {message && <span style={{ fontSize: FONT.xs, color: message.ok ? '#1B7F4B' : '#B42318' }}>{message.text}</span>}
            </div>

            {rows.length === 0 ? (
                <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>No suspect links{workspace ? ' in this workspace' : ''}.</p>
            ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 1100 }}>
                    <thead>
                        <tr>
                            {['Imported record', 'Link', 'Linked to', 'Made against', 'Now', ''].map(heading => (
                                <th key={heading} style={{ ...cell, color: COLOR.muted, fontWeight: 600, fontSize: FONT.xs }}>{heading}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={`${row.relationshipId}|${row.elementId}`} data-testid="suspect-row">
                                <td style={cell}>
                                    <div style={{ fontWeight: 600 }}>{row.elementLabel}</div>
                                    <div style={{ color: COLOR.muted, fontSize: FONT.xs }}>{row.sourceSystem} · {row.sourceIdentifier}</div>
                                </td>
                                <td style={cell}>{row.relationshipType}<div style={{ color: COLOR.muted, fontSize: FONT.xs }}>{REASON_LABEL[row.reason]}</div></td>
                                <td style={cell}>{row.otherLabel}</td>
                                <td style={cell}>{row.baseline}</td>
                                <td style={cell}>{row.reason === 'source-withdrawn' ? 'withdrawn' : row.current}</td>
                                <td style={cell}>
                                    {row.reason === 'source-withdrawn' ? (
                                        <button type="button" disabled={busy || !connected} style={button(!busy && connected)} onClick={() => remove(row)}>Remove link</button>
                                    ) : (
                                        <button type="button" disabled={busy || !connected} style={button(!busy && connected)} onClick={() => review([row])}>Mark reviewed</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

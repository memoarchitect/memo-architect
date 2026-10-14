// ─── Regulated devices, on the Documents page ────────────────────────────────
//
// One row per approval: its jurisdiction, submission and the releases it covers (with their commits), and a
// button that generates its design history from those releases. Devices are declared in the model source; the
// page does not create them. A pinned view cannot generate (it writes files), so it offers no button.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { requestDeviceDhf } from '../store/ws-client';
import { regulatedDevices } from '../lib/devices-view';

export function RegulatedDevices() {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    const pinned = useModelStore(s => s.pinned);
    const connected = useModelStore(s => s.connected);
    const devices = useMemo(() => (model ? regulatedDevices(model, workspace) : []), [model, workspace]);
    const [results, setResults] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);
    if (devices.length === 0) return null;

    const generate = async (id: string, name: string) => {
        setBusy(id);
        try {
            const result = await requestDeviceDhf(id);
            const text = result.success
                ? `${result.releases?.reduce((n, r) => n + r.documents.length, 0) ?? 0} documents in ${result.outputDir}`
                    + `${result.riskDocuments ? `, ${result.riskDocuments} of them the risk management file` : ''}`
                    + `${result.notes && result.notes.length > 0 ? `. ${result.notes.join(' ')}` : ''}`
                : (result.error ?? 'No answer.');
            setResults(r => ({ ...r, [name]: text }));
        } catch (error) {
            setResults(r => ({ ...r, [name]: error instanceof Error ? error.message : String(error) }));
        } finally {
            setBusy(null);
        }
    };
    return (
        <div data-testid="regulated-devices" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1B3A4B', margin: '0 0 6px' }}>Regulated devices</h3>
            <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 10px', maxWidth: 760 }}>
                A device is one approval in one jurisdiction. Its documents are built from the releases it covers, at their commits,
                with the standards and documents its jurisdiction requires. Devices are declared in the model source.
            </p>
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 980 }}>
                <thead><tr>{['Device', 'Jurisdiction', 'Submission', 'Covers', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#6B7280' }}>{h}</th>)}</tr></thead>
                <tbody>
                    {devices.map(device => (
                        <tr key={device.id} data-testid="device-row" style={{ borderTop: '1px solid #E5E5E0' }}>
                            <td style={{ padding: '6px 10px', fontSize: 13 }}>{device.name}</td>
                            <td style={{ padding: '6px 10px', fontSize: 13 }}>{device.jurisdiction || '—'}</td>
                            <td style={{ padding: '6px 10px', fontSize: 13 }}>{device.submissionId ?? '—'}</td>
                            <td style={{ padding: '6px 10px', fontSize: 13 }}>
                                {device.covers.length === 0 ? <em style={{ color: '#9CA3AF' }}>no release</em> : device.covers.map(c => `${c.name}${c.commit ? ` @ ${c.commit}` : ''}`).join(', ')}
                            </td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                {!pinned && (
                                    <button
                                        data-testid={`generate-${device.name}`} disabled={!connected || busy !== null || device.covers.length === 0}
                                        onClick={() => generate(device.id, device.name)}
                                        style={{ fontSize: 12, padding: '2px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}
                                    >
                                        {busy === device.id ? 'Generating…' : 'Generate documents'}
                                    </button>
                                )}
                                {results[device.name] && <div data-testid={`result-${device.name}`} style={{ fontSize: 11, color: '#6B7280', marginTop: 4, maxWidth: 360, whiteSpace: 'normal' }}>{results[device.name]}</div>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

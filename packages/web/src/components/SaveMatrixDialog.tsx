// ─── Saving a matrix ──────────────────────────────────────────────────────────
//
// Asks for the name, and optionally the package, of a matrix being kept in the model. It knows nothing of what is
// being saved: the caller does the saving and says whether it worked.

import { useState } from 'react';
import { ActionButton, ControlIcon } from './TraceControls';
import { COLOR, FONT } from '../styles/tokens';

/** Name, and optionally the package, for a view being saved. */
export function SaveMatrixDialog({ packages, busy, error, initialName, initialPackage, onSubmit, onClose }: {
    packages: string[]; busy: boolean; error: string | null; initialName: string; initialPackage: string;
    onSubmit: (value: { name: string; package: string }) => void; onClose: () => void;
}) {
    const [name, setName] = useState(initialName);
    const [packageName, setPackageName] = useState(initialPackage);
    const trimmed = name.trim();
    const validPackage = packageName === '' || /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/.test(packageName);
    const field: React.CSSProperties = {
        padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm,
        color: COLOR.primary, width: '100%', boxSizing: 'border-box',
    };
    return (
        <div role="dialog" aria-modal="true" aria-label="Save view" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
            <form
                onSubmit={event => { event.preventDefault(); if (trimmed && validPackage && !busy) onSubmit({ name: trimmed, package: packageName }); }}
                style={{ width: '380px', maxWidth: '92vw', display: 'grid', gap: '12px', padding: '18px', borderRadius: '10px', background: COLOR.surface, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
            >
                <div style={{ fontSize: FONT.md, fontWeight: 700, color: COLOR.primary }}>Save traceability matrix</div>
                <label style={{ display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>
                    Name
                    <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Needs to requirements" style={field} />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>
                    Package <span style={{ fontWeight: 400, color: COLOR.faint }}>optional, where the view is declared</span>
                    <input value={packageName} onChange={event => setPackageName(event.target.value)} list="trace-save-packages" placeholder="views::traceability" style={field} />
                    <datalist id="trace-save-packages">{packages.map(name => <option key={name} value={name} />)}</datalist>
                    {!validPackage && <span style={{ color: '#B91C1C', fontWeight: 400 }}>Use letters, digits and underscores, with :: between packages.</span>}
                </label>
                {error && <div role="alert" style={{ fontSize: FONT.xs, color: '#B91C1C' }}>{error}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <ActionButton onClick={onClose} disabled={busy} icon={ControlIcon.close}>Cancel</ActionButton>
                    <ActionButton type="submit" variant="primary" icon={ControlIcon.save} disabled={!trimmed || !validPackage || busy}>
                        {busy ? 'Saving…' : 'Save'}
                    </ActionButton>
                </div>
            </form>
        </div>
    );
}

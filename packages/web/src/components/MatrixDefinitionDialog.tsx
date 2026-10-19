// The dialog behind New, Rename and Move on a matrix tree. A matrix is declared
// in a SysML package, so creating or moving one asks which; many matrices can
// share a package, and a new package is made only when asked for here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { COLOR, FONT } from '../styles/tokens';

export type MatrixDialogMode = 'create' | 'rename' | 'move';

export interface PackageChoice {
    name: string;
    /** The project keeps views here, so it is listed first. */
    holdsViews: boolean;
}

interface Props {
    mode: MatrixDialogMode;
    noun: string;
    initialName?: string;
    initialPackage?: string;
    packages: PackageChoice[];
    busy: boolean;
    error: string | null;
    /** `newPackage` is true when the package named does not exist yet and is to be created. */
    onSubmit: (value: { name: string; package: string; newPackage: boolean }) => void;
    onClose: () => void;
}

const PACKAGE_PATH = /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/;
const MAX_LISTED = 40;

export function MatrixDefinitionDialog({ mode, noun, initialName = '', initialPackage = '', packages, busy, error, onSubmit, onClose }: Props) {
    const [name, setName] = useState(initialName);
    const [packageName, setPackageName] = useState(initialPackage);
    const [filter, setFilter] = useState('');
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

    const needsPackage = mode !== 'rename';
    const needsName = mode !== 'move';
    const typed = filter.trim();
    const exists = packages.some(choice => choice.name === typed);
    const listed = useMemo(() => {
        const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
        return packages
            .filter(choice => words.every(word => choice.name.toLowerCase().includes(word)))
            .sort((a, b) => Number(b.holdsViews) - Number(a.holdsViews) || a.name.localeCompare(b.name));
    }, [packages, typed]);
    const canCreatePackage = needsPackage && typed !== '' && !exists && PACKAGE_PATH.test(typed);

    const chosen = canCreatePackage && packageName === typed ? typed : packageName;
    const valid = (!needsName || name.trim() !== '') && (!needsPackage || chosen !== '');
    const submit = () => {
        if (!valid || busy) return;
        onSubmit({ name: name.trim(), package: chosen, newPackage: needsPackage && !packages.some(choice => choice.name === chosen) });
    };
    const title = mode === 'create' ? `New ${noun}` : mode === 'rename' ? `Rename ${noun}` : `Move ${noun}`;

    return (
        <div
            role="dialog" aria-modal="true" aria-label={title}
            onKeyDown={event => { if (event.key === 'Escape') onClose(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
        >
            <form
                onSubmit={event => { event.preventDefault(); submit(); }}
                style={{
                    width: '440px', maxWidth: '92vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column', gap: '10px',
                    padding: '16px 18px', borderRadius: '10px', background: COLOR.surface, border: `1px solid ${COLOR.border}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.25)', fontSize: FONT.sm, color: COLOR.primary,
                }}
            >
                <div style={{ fontWeight: 700, fontSize: FONT.md }}>{title}</div>

                {needsName && (
                    <label style={{ display: 'grid', gap: '3px', fontSize: FONT.xs, color: COLOR.muted }}>
                        Name
                        <input
                            ref={nameRef} value={name} onChange={event => setName(event.target.value)} aria-label="Name"
                            style={{ padding: '6px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.sm, color: COLOR.primary }}
                        />
                    </label>
                )}

                {needsPackage && (
                    <div style={{ display: 'grid', gap: '4px', minHeight: 0 }}>
                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                            Package — where it is declared. Several can share one.
                        </span>
                        <input
                            value={filter} onChange={event => setFilter(event.target.value)} aria-label="Find a package"
                            placeholder="Find a package, or type a new package name"
                            style={{ padding: '6px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.sm, color: COLOR.primary }}
                        />
                        <ul role="listbox" aria-label="Packages" style={{ margin: 0, padding: 0, listStyle: 'none', overflow: 'auto', maxHeight: '200px', border: `1px solid ${COLOR.borderLight}`, borderRadius: '6px' }}>
                            {canCreatePackage && (
                                <li
                                    role="option" aria-selected={packageName === typed} onClick={() => setPackageName(typed)}
                                    style={{ padding: '5px 8px', cursor: 'pointer', background: packageName === typed ? `${COLOR.accent}22` : 'transparent', color: COLOR.accentDark, fontWeight: 600 }}
                                >Create package “{typed}”</li>
                            )}
                            {listed.slice(0, MAX_LISTED).map(choice => (
                                <li
                                    key={choice.name} role="option" aria-selected={packageName === choice.name} title={choice.name}
                                    onClick={() => setPackageName(choice.name)}
                                    style={{
                                        padding: '5px 8px', cursor: 'pointer', fontSize: FONT.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        background: packageName === choice.name ? `${COLOR.accent}22` : 'transparent',
                                    }}
                                >{choice.name}{choice.holdsViews && <span style={{ color: COLOR.faint }}> · holds views</span>}</li>
                            ))}
                            {listed.length === 0 && !canCreatePackage && (
                                <li style={{ padding: '6px 8px', fontSize: FONT.xs, color: COLOR.faint }}>
                                    {typed ? 'No such package. A new one needs a name of letters, digits and underscores, with :: between levels.' : 'No packages.'}
                                </li>
                            )}
                            {listed.length > MAX_LISTED && (
                                <li style={{ padding: '4px 8px', fontSize: '11px', color: COLOR.faint }}>{listed.length - MAX_LISTED} more: keep typing to narrow</li>
                            )}
                        </ul>
                        <span style={{ fontSize: '11px', color: COLOR.muted }}>
                            {chosen ? <>Selected: <strong>{chosen}</strong></> : 'No package selected.'}
                        </span>
                    </div>
                )}

                {error && <div role="alert" style={{ fontSize: FONT.xs, color: '#B91C1C' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, cursor: 'pointer', fontSize: FONT.xs }}>Cancel</button>
                    <button
                        type="submit" disabled={!valid || busy}
                        style={{
                            padding: '5px 14px', borderRadius: '6px', border: 'none', fontSize: FONT.xs, fontWeight: 600,
                            background: valid && !busy ? COLOR.accent : COLOR.border, color: valid && !busy ? '#fff' : COLOR.faint,
                            cursor: valid && !busy ? 'pointer' : 'not-allowed',
                        }}
                    >{busy ? 'Working…' : mode === 'create' ? 'Create' : mode === 'rename' ? 'Rename' : 'Move'}</button>
                </div>
            </form>
        </div>
    );
}

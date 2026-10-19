// The dialog behind New, Rename and Move on a matrix tree.
//
// New takes a name, optionally a package, and a filter (a memo-query) for each
// axis: one for the rows and one for the columns of a traceability matrix, one
// for the single axis of a DSM. A filter is counted before anything is created,
// with a progress bar while it runs, and a count over the screen's limit
// (MATRIX_LIMITS) blocks Create and says how far over it is.
//
// The package list holds only the packages the project keeps views in: a matrix
// is a view, and the model has thousands of packages that hold something else.
// A new package can still be named.

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateAxis, limitFor, type AxisEvaluation } from '../lib/axis-evaluation';
import { MATRIX_LIMITS, type MatrixScreen } from '../lib/matrix-views';
import { ProgressBar, type ProgressState } from './ProgressBar';
import { COLOR, FONT } from '../styles/tokens';

export type MatrixDialogMode = 'create' | 'rename' | 'move';

interface Props {
    mode: MatrixDialogMode;
    screen: MatrixScreen;
    noun: string;
    initialName?: string;
    initialPackage?: string;
    /** Packages the project keeps views in. */
    packages: string[];
    busy: boolean;
    error: string | null;
    onSubmit: (value: { name: string; package: string; newPackage: boolean; rowQuery: string; columnQuery: string }) => void;
    onClose: () => void;
}

const PACKAGE_PATH = /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/;

const input: React.CSSProperties = {
    padding: '6px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.sm, color: COLOR.primary, minWidth: 0,
};

function QueryFilter({ label, value, onChange, evaluation, onCount, counting }: {
    label: string; value: string; onChange: (next: string) => void;
    evaluation?: AxisEvaluation; onCount: () => void; counting: boolean;
}) {
    const stale = evaluation && evaluation.query !== value.trim();
    return (
        <div style={{ display: 'grid', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: FONT.xs, color: COLOR.muted, flex: 1 }}>{label} <span style={{ color: COLOR.faint }}>(optional)</span></span>
                <button type="button" onClick={onCount} disabled={counting || !value.trim()}
                    style={{ padding: '1px 8px', borderRadius: '5px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, fontSize: FONT.xs, cursor: counting || !value.trim() ? 'not-allowed' : 'pointer' }}>
                    Count
                </button>
            </div>
            <textarea
                value={value} onChange={event => onChange(event.target.value)} aria-label={`${label} filter`} rows={2} spellCheck={false}
                placeholder={'kind: Requirement\nwhere: name contains "safety"'}
                style={{ ...input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: FONT.xs, resize: 'vertical' }}
            />
            {evaluation && (
                <span role={evaluation.error ? 'alert' : 'status'} style={{
                    fontSize: FONT.xs, fontWeight: 600, color: evaluation.error ? '#B91C1C' : stale ? '#B45309' : '#0F766E',
                }}>
                    {evaluation.error ?? `${evaluation.count.toLocaleString()} element${evaluation.count === 1 ? '' : 's'}${stale ? ' — filter changed, count again' : ''}`}
                </span>
            )}
        </div>
    );
}

export function MatrixDefinitionDialog({ mode, screen, noun, initialName = '', initialPackage = '', packages, busy, error, onSubmit, onClose }: Props) {
    const [name, setName] = useState(initialName);
    const [packageName, setPackageName] = useState(initialPackage || packages[0] || '');
    const [filter, setFilter] = useState('');
    const [rowQuery, setRowQuery] = useState('');
    const [columnQuery, setColumnQuery] = useState('');
    const [rowEvaluation, setRowEvaluation] = useState<AxisEvaluation | undefined>();
    const [columnEvaluation, setColumnEvaluation] = useState<AxisEvaluation | undefined>();
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

    const isDsm = screen === 'dsm';
    const needsName = mode !== 'move';
    const needsPackage = mode !== 'rename';
    const filtering = mode === 'create';
    const typed = filter.trim();
    const listed = useMemo(() => {
        const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
        return packages.filter(choice => words.every(word => choice.toLowerCase().includes(word))).sort();
    }, [packages, typed]);
    const canCreatePackage = needsPackage && typed !== '' && !packages.includes(typed) && PACKAGE_PATH.test(typed);
    const chosen = packageName;
    const valid = (!needsName || name.trim() !== '') && (!needsPackage || chosen !== '');
    const working = busy || progress !== null;

    const count = async (queries: { rows: string; columns: string }): Promise<{ rows: AxisEvaluation; columns: AxisEvaluation } | null> => {
        const steps = isDsm || !queries.columns.trim() ? 1 : 2;
        setProgress({ label: isDsm ? 'Counting the axis' : 'Counting the rows', step: 1, steps });
        const rows = await evaluateAxis({ query: queries.rows, elementIds: [] });
        setRowEvaluation(queries.rows.trim() ? rows : undefined);
        let columns = rows;
        if (!isDsm) {
            if (queries.columns.trim()) setProgress({ label: 'Counting the columns', step: 2, steps });
            columns = await evaluateAxis({ query: queries.columns, elementIds: [] });
            setColumnEvaluation(queries.columns.trim() ? columns : undefined);
        }
        setProgress(null);
        return { rows, columns };
    };
    const reason = (rows: AxisEvaluation, columns: AxisEvaluation) => {
        if (rows.error || columns.error) return rows.error ?? columns.error ?? null;
        // An axis with no filter is empty at creation and is filled in afterwards.
        return limitFor(screen, rowQuery.trim() ? rows : { ...rows, count: 0, ids: [] }, columnQuery.trim() ? columns : { ...columns, count: 0, ids: [] }, MATRIX_LIMITS);
    };

    const submit = async () => {
        if (!valid || working) return;
        setProblem(null);
        if (filtering && (rowQuery.trim() || columnQuery.trim())) {
            const counted = await count({ rows: rowQuery, columns: columnQuery });
            const why = counted && reason(counted.rows, counted.columns);
            if (why) { setProblem(why); return; }
        }
        onSubmit({ name: name.trim(), package: chosen, newPackage: needsPackage && !packages.includes(chosen), rowQuery: rowQuery.trim(), columnQuery: columnQuery.trim() });
    };
    const title = mode === 'create' ? `New ${noun}` : mode === 'rename' ? `Rename ${noun}` : `Move ${noun}`;

    return (
        <div
            role="dialog" aria-modal="true" aria-label={title}
            onKeyDown={event => { if (event.key === 'Escape' && !working) onClose(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={event => { if (event.target === event.currentTarget && !working) onClose(); }}
        >
            <form
                onSubmit={event => { event.preventDefault(); void submit(); }}
                style={{
                    width: '480px', maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
                    padding: '16px 18px', borderRadius: '10px', background: COLOR.surface, border: `1px solid ${COLOR.border}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.25)', fontSize: FONT.sm, color: COLOR.primary,
                }}
            >
                <div style={{ fontWeight: 700, fontSize: FONT.md }}>{title}</div>

                {needsName && (
                    <label style={{ display: 'grid', gap: '3px', fontSize: FONT.xs, color: COLOR.muted }}>
                        Name
                        <input ref={nameRef} value={name} onChange={event => setName(event.target.value)} aria-label="Name" style={input} />
                    </label>
                )}

                {needsPackage && (
                    <div style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                            Package <span style={{ color: COLOR.faint }}>(optional — where views are kept; several matrices can share one)</span>
                        </span>
                        <input
                            value={filter} onChange={event => setFilter(event.target.value)} aria-label="Find a package"
                            placeholder="Find a package, or type a new package name" style={input}
                        />
                        <ul role="listbox" aria-label="Packages" style={{ margin: 0, padding: 0, listStyle: 'none', overflow: 'auto', maxHeight: '110px', border: `1px solid ${COLOR.borderLight}`, borderRadius: '6px' }}>
                            {canCreatePackage && (
                                <li role="option" aria-selected={packageName === typed} onClick={() => setPackageName(typed)}
                                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: FONT.xs, fontWeight: 600, color: COLOR.accentDark, background: packageName === typed ? `${COLOR.accent}22` : 'transparent' }}>
                                    Create package “{typed}”
                                </li>
                            )}
                            {listed.map(choice => (
                                <li key={choice} role="option" aria-selected={packageName === choice} title={choice} onClick={() => setPackageName(choice)}
                                    style={{ padding: '4px 8px', cursor: 'pointer', fontSize: FONT.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: packageName === choice ? `${COLOR.accent}22` : 'transparent' }}>
                                    {choice}
                                </li>
                            ))}
                            {listed.length === 0 && !canCreatePackage && (
                                <li style={{ padding: '5px 8px', fontSize: FONT.xs, color: COLOR.faint }}>
                                    {typed ? 'No view package matches. A new one needs letters, digits and underscores, with :: between levels.' : 'The project keeps no views yet: type a name to create a package.'}
                                </li>
                            )}
                        </ul>
                        <span style={{ fontSize: '11px', color: COLOR.muted }}>{chosen ? <>Selected: <strong>{chosen}</strong></> : 'No package selected.'}</span>
                    </div>
                )}

                {filtering && (
                    <>
                        <QueryFilter
                            label={isDsm ? 'Elements (rows and columns)' : 'Rows'} value={rowQuery} onChange={setRowQuery}
                            evaluation={rowEvaluation} counting={working} onCount={() => { void count({ rows: rowQuery, columns: columnQuery }); }}
                        />
                        {!isDsm && (
                            <QueryFilter
                                label="Columns" value={columnQuery} onChange={setColumnQuery}
                                evaluation={columnEvaluation} counting={working} onCount={() => { void count({ rows: rowQuery, columns: columnQuery }); }}
                            />
                        )}
                        <span style={{ fontSize: '11px', color: COLOR.faint }}>
                            {isDsm
                                ? `A design structure matrix supports up to ${MATRIX_LIMITS.dsmMaxElements.toLocaleString()} elements for now.`
                                : `A traceability matrix draws up to ${MATRIX_LIMITS.traceabilityMaxCells.toLocaleString()} cells (rows × columns).`}
                            {' '}Filters can also be set after it is created.
                        </span>
                    </>
                )}

                {progress && <ProgressBar progress={progress} />}
                {(problem || error) && <div role="alert" style={{ fontSize: FONT.xs, color: '#B91C1C' }}>{problem ?? error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onClose} disabled={working} style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, cursor: 'pointer', fontSize: FONT.xs }}>Cancel</button>
                    <button
                        type="submit" disabled={!valid || working}
                        style={{
                            padding: '5px 14px', borderRadius: '6px', border: 'none', fontSize: FONT.xs, fontWeight: 600,
                            background: valid && !working ? COLOR.accent : COLOR.border, color: valid && !working ? '#fff' : COLOR.faint,
                            cursor: valid && !working ? 'pointer' : 'not-allowed',
                        }}
                    >{busy ? 'Working…' : mode === 'create' ? 'Create' : mode === 'rename' ? 'Rename' : 'Move'}</button>
                </div>
            </form>
        </div>
    );
}

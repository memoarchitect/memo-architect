// The dialog behind New, Rename and Move on a matrix tree.
//
// New takes a name, optionally a package, and a filter for each axis: one for
// the rows and one for the columns of a traceability matrix, one for the single
// axis of a DSM. A filter is element types plus part of a name, counted as it is
// typed; "Edit as query" shows the memo-query it stands for and lets it be
// written by hand. A count over the screen's limit (MATRIX_LIMITS) blocks Create
// and says by how much.
//
// The package list holds only the packages the project keeps views in: a matrix
// is a view, and the model has thousands of packages that hold something else.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useScopedModel } from '../store/scoped-model';
import { useModelStore } from '../store/model-store';
import { evaluateAxis, limitFor, type AxisEvaluation } from '../lib/axis-evaluation';
import { scopeModel } from '../lib/workspace-scope';
import { MATRIX_LIMITS, type MatrixScreen } from '../lib/matrix-views';
import { MatrixSystemSelect } from './MatrixSystemSelect';
import { TypeFilterSelect, type TypeFilterOption } from './TypeFilterSelect';
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
    /** The workspace the matrix opens in; the one chosen in the header is offered first. */
    onSubmit: (value: { name: string; package: string; newPackage: boolean; rowQuery: string; columnQuery: string; system?: string }) => void;
    onClose: () => void;
}

const PACKAGE_PATH = /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/;

const field: React.CSSProperties = {
    padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm,
    color: COLOR.primary, background: COLOR.surface, minWidth: 0, boxSizing: 'border-box', width: '100%',
};
const caption: React.CSSProperties = { fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary };
const link: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: FONT.xs, color: COLOR.accentDark, fontWeight: 600 };

/** What the two builder fields stand for, as the memo-query the executor reads. */
export function queryFromFilter(kinds: readonly string[], contains: string): string {
    const lines: string[] = [];
    if (kinds.length === 1) lines.push(`kind: ${kinds[0]}`);
    else if (kinds.length > 1) lines.push(`kind: [${kinds.join(', ')}]`);
    const text = contains.trim().replaceAll('"', '');
    if (text) lines.push(`where: name contains "${text}"`);
    return lines.join('\n');
}

interface FilterState { kinds: string[]; contains: string; advanced: boolean; raw: string }
const NO_FILTER: FilterState = { kinds: [], contains: '', advanced: false, raw: '' };
const queryOf = (filter: FilterState) => (filter.advanced ? filter.raw.trim() : queryFromFilter(filter.kinds, filter.contains));

/** One axis: what to list, counted live. */
function FilterCard({ title, filter, onChange, kindOptions, evaluation, counting }: {
    title: string; filter: FilterState; onChange: (next: FilterState) => void;
    kindOptions: TypeFilterOption[]; evaluation?: AxisEvaluation; counting: boolean;
}) {
    const query = queryOf(filter);
    return (
        <section aria-label={title} style={{ display: 'grid', gap: '7px', padding: '10px 12px', border: `1px solid ${COLOR.border}`, borderRadius: '9px', background: '#FAFBFC', alignContent: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ ...caption, fontSize: FONT.sm, color: COLOR.primary, flex: 1 }}>{title}</span>
                <button type="button" style={link} onClick={() => onChange(filter.advanced
                    ? { ...filter, advanced: false }
                    : { ...filter, advanced: true, raw: queryFromFilter(filter.kinds, filter.contains) })}>
                    {filter.advanced ? 'Use the fields' : 'Edit as query'}
                </button>
            </div>
            {filter.advanced ? (
                <textarea
                    value={filter.raw} onChange={event => onChange({ ...filter, raw: event.target.value })} aria-label={`${title} query`}
                    rows={4} spellCheck={false} placeholder={'kind: Requirement\nwhere: name contains "safety"'}
                    style={{ ...field, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: FONT.xs, resize: 'vertical' }}
                />
            ) : (
                <>
                    <div style={{ display: 'grid', gap: '3px' }}>
                        <span style={caption}>Element types</span>
                        <TypeFilterSelect
                            label="" allLabel="Choose types…" options={kindOptions} selected={filter.kinds}
                            onChange={kinds => onChange({ ...filter, kinds })} width={210} describedAs={`${title} element types`}
                            placeholder="Find a type…"
                        />
                    </div>
                    <label style={{ display: 'grid', gap: '3px' }}>
                        <span style={caption}>Name contains</span>
                        <input value={filter.contains} onChange={event => onChange({ ...filter, contains: event.target.value })} aria-label={`${title} name contains`} placeholder="any text" style={field} />
                    </label>
                </>
            )}
            <div role="status" style={{ fontSize: FONT.xs, minHeight: '16px', color: evaluation?.error ? '#B91C1C' : COLOR.muted, fontWeight: 600 }}>
                {!query
                    ? <span style={{ fontWeight: 400, color: COLOR.faint }}>No filter: decided after it is created.</span>
                    : counting
                        ? 'Counting…'
                        : evaluation?.error
                            ? evaluation.error
                            : evaluation
                                ? <span style={{ color: '#0F766E' }}>{evaluation.count.toLocaleString()} element{evaluation.count === 1 ? '' : 's'}</span>
                                : null}
            </div>
        </section>
    );
}

export function MatrixDefinitionDialog({ mode, screen, noun, initialName = '', initialPackage = '', packages, busy, error, onSubmit, onClose }: Props) {
    const model = useScopedModel();
    const wholeModel = useModelStore(s => s.model);
    const headerWorkspace = useModelStore(s => s.workspace);
    const [system, setSystem] = useState<string | undefined>(headerWorkspace ?? undefined);
    const [name, setName] = useState(initialName);
    const [packageName, setPackageName] = useState(initialPackage);
    const [pickingPackage, setPickingPackage] = useState(mode === 'move');
    const [packageFilter, setPackageFilter] = useState('');
    const [rows, setRows] = useState<FilterState>(NO_FILTER);
    const [columns, setColumns] = useState<FilterState>(NO_FILTER);
    const [rowEvaluation, setRowEvaluation] = useState<AxisEvaluation | undefined>();
    const [columnEvaluation, setColumnEvaluation] = useState<AxisEvaluation | undefined>();
    const [rowCounting, setRowCounting] = useState(false);
    const [columnCounting, setColumnCounting] = useState(false);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

    const isDsm = screen === 'dsm';
    const needsName = mode !== 'move';
    const needsPackage = mode !== 'rename';
    const filtering = mode === 'create';

    // The types the model has, most used first, from the model rather than a list kept here.
    const kindOptions = useMemo<TypeFilterOption[]>(() => {
        const counts = new Map<string, number>();
        const scoped = wholeModel ? scopeModel(wholeModel, system ?? null) : model;
        for (const element of Object.values(scoped?.elements ?? {})) counts.set(element.kind, (counts.get(element.kind) ?? 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([kind, count]) => ({ value: kind, hint: count.toLocaleString() }));
    }, [wholeModel, model, system]);

    // Count as the filter is typed, after a short pause, so the number is there before Create is pressed.
    const rowQuery = queryOf(rows);
    const columnQuery = queryOf(columns);
    const useCounted = (query: string, set: (e?: AxisEvaluation) => void, setCounting: (b: boolean) => void) => {
        useEffect(() => {
            if (!filtering) return;
            if (!query) { set(undefined); setCounting(false); return; }
            let current = true;
            setCounting(true);
            const timer = setTimeout(async () => {
                const evaluation = await evaluateAxis({ query, elementIds: [] }, 0, system);
                if (!current) return;
                set(evaluation);
                setCounting(false);
            }, 350);
            return () => { current = false; clearTimeout(timer); };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [query, filtering, system]);
    };
    useCounted(rowQuery, setRowEvaluation, setRowCounting);
    useCounted(columnQuery, setColumnEvaluation, setColumnCounting);

    const empty: AxisEvaluation = { query: '', count: 0, ids: [], preview: [] };
    const counting = rowCounting || columnCounting;
    const limitProblem = !filtering || counting ? null : limitFor(
        screen, rowQuery ? rowEvaluation ?? empty : empty, isDsm ? (rowQuery ? rowEvaluation ?? empty : empty) : (columnQuery ? columnEvaluation ?? empty : empty), MATRIX_LIMITS,
    );
    const queryError = filtering && !counting ? (rowQuery && rowEvaluation?.error) || (!isDsm && columnQuery && columnEvaluation?.error) || null : null;

    const typed = packageFilter.trim();
    const listed = useMemo(() => {
        const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
        return packages.filter(choice => words.every(word => choice.toLowerCase().includes(word))).sort();
    }, [packages, typed]);
    const canCreatePackage = needsPackage && typed !== '' && !packages.includes(typed) && PACKAGE_PATH.test(typed);

    const valid = (!needsName || name.trim() !== '') && (mode !== 'move' || packageName !== '') && !counting && !limitProblem && !queryError;
    const working = busy || progress !== null;

    const submit = () => {
        if (!valid || working) return;
        setProgress({ label: mode === 'create' ? 'Declaring the matrix' : 'Saving', step: 1, steps: 1 });
        onSubmit({ name: name.trim(), package: packageName, newPackage: needsPackage && packageName !== '' && !packages.includes(packageName), rowQuery, columnQuery: isDsm ? '' : columnQuery, system });
    };
    // The caller keeps the dialog open on an error; the bar must not outlive the attempt.
    useEffect(() => { if (!busy) setProgress(null); }, [busy, error]);

    const title = mode === 'create' ? `New ${noun}` : mode === 'rename' ? `Rename ${noun}` : `Move ${noun}`;

    return (
        <div
            role="dialog" aria-modal="true" aria-label={title}
            onKeyDown={event => { if (event.key === 'Escape' && !working) onClose(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={event => { if (event.target === event.currentTarget && !working) onClose(); }}
        >
            <form
                onSubmit={event => { event.preventDefault(); submit(); }}
                style={{
                    width: filtering && !isDsm ? '640px' : '460px', maxWidth: '94vw', maxHeight: '92vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '14px',
                    padding: '20px 22px', borderRadius: '12px', background: COLOR.surface, border: `1px solid ${COLOR.border}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.25)', fontSize: FONT.sm, color: COLOR.primary,
                }}
            >
                <div style={{ fontWeight: 700, fontSize: FONT.lg }}>{title}</div>

                {needsName && (
                    <label style={{ display: 'grid', gap: '4px' }}>
                        <span style={caption}>Name</span>
                        <input ref={nameRef} value={name} onChange={event => setName(event.target.value)} aria-label="Name" style={field} />
                    </label>
                )}

                {filtering && <MatrixSystemSelect value={system} onChange={setSystem} />}

                {needsPackage && (
                    <div style={{ display: 'grid', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={caption}>Package</span>
                            {mode === 'create' && <span style={{ fontSize: FONT.xs, color: COLOR.faint }}>optional</span>}
                            <span style={{ flex: 1 }} />
                            {!pickingPackage && <button type="button" style={link} onClick={() => setPickingPackage(true)}>{packageName ? 'Change' : 'Choose'}</button>}
                            {pickingPackage && mode === 'create' && packageName && <button type="button" style={link} onClick={() => { setPackageName(''); setPickingPackage(false); }}>Clear</button>}
                        </div>
                        {!pickingPackage ? (
                            <div title={packageName} style={{ ...field, background: COLOR.surfaceAlt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: packageName ? COLOR.primary : COLOR.faint }}>
                                {packageName || 'Not set: it is placed with the project\'s other views'}
                            </div>
                        ) : (
                            <>
                                <input value={packageFilter} onChange={event => setPackageFilter(event.target.value)} aria-label="Find a package" placeholder="Find a package, or type a new name" style={field} autoFocus={mode === 'move'} />
                                <ul role="listbox" aria-label="Packages" style={{ margin: 0, padding: 0, listStyle: 'none', overflow: 'auto', maxHeight: '120px', border: `1px solid ${COLOR.borderLight}`, borderRadius: '7px' }}>
                                    {canCreatePackage && (
                                        <li role="option" aria-selected={packageName === typed} onClick={() => { setPackageName(typed); setPickingPackage(false); }}
                                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: FONT.xs, fontWeight: 600, color: COLOR.accentDark }}>
                                            Create package “{typed}”
                                        </li>
                                    )}
                                    {listed.map(choice => (
                                        <li key={choice} role="option" aria-selected={packageName === choice} title={choice}
                                            onClick={() => { setPackageName(choice); setPickingPackage(false); setPackageFilter(''); }}
                                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: FONT.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: packageName === choice ? `${COLOR.accent}22` : 'transparent' }}>
                                            {choice}
                                        </li>
                                    ))}
                                    {listed.length === 0 && !canCreatePackage && (
                                        <li style={{ padding: '7px 10px', fontSize: FONT.xs, color: COLOR.faint }}>
                                            {typed ? 'No view package matches. A new name uses letters, digits and underscores, with :: between levels.' : 'The project keeps no views yet: type a name to create a package.'}
                                        </li>
                                    )}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                {filtering && (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isDsm ? '1fr' : '1fr 1fr', gap: '12px' }}>
                            <FilterCard title={isDsm ? 'Elements' : 'Rows'} filter={rows} onChange={setRows} kindOptions={kindOptions} evaluation={rowEvaluation} counting={rowCounting} />
                            {!isDsm && <FilterCard title="Columns" filter={columns} onChange={setColumns} kindOptions={kindOptions} evaluation={columnEvaluation} counting={columnCounting} />}
                        </div>
                        <span style={{ fontSize: FONT.xs, color: limitProblem ? '#B91C1C' : COLOR.faint }} role={limitProblem ? 'alert' : undefined}>
                            {limitProblem ?? (isDsm
                                ? `A design structure matrix supports up to ${MATRIX_LIMITS.dsmMaxElements.toLocaleString()} elements for now. `
                                : `A traceability matrix draws up to ${MATRIX_LIMITS.traceabilityMaxCells.toLocaleString()} cells (rows × columns). `)}
                            {!limitProblem && 'Filters are optional and can be changed after it is created.'}
                        </span>
                    </div>
                )}

                {progress && <ProgressBar progress={progress} />}
                {error && <div role="alert" style={{ fontSize: FONT.xs, color: '#B91C1C' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onClose} disabled={working} style={{ padding: '7px 14px', borderRadius: '7px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, cursor: 'pointer', fontSize: FONT.sm }}>Cancel</button>
                    <button
                        type="submit" disabled={!valid || working}
                        style={{
                            padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: FONT.sm, fontWeight: 600,
                            background: valid && !working ? COLOR.accent : COLOR.border, color: valid && !working ? '#fff' : COLOR.faint,
                            cursor: valid && !working ? 'pointer' : 'not-allowed',
                        }}
                    >{mode === 'create' ? 'Create' : mode === 'rename' ? 'Rename' : 'Move'}</button>
                </div>
            </form>
        </div>
    );
}

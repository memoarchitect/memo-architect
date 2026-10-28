// ─── One axis of a matrix: element types, or a memo-query ─────────────────────
//
// The filter a matrix axis is chosen with. Types are the simple way; "Edit as query" switches to the
// memo-query the types stand for, written by hand. The count under it is the caller's to supply, because
// how an axis is counted (read from the model, or run by the server) is not this card's business: it shows
// what it is given. Shared by the create dialog and the traceability screen.

import { queryFromFilter } from '../lib/matrix-views';
import type { AxisEvaluation } from '../lib/axis-evaluation';
import { TypeFilterSelect, type TypeFilterOption } from './TypeFilterSelect';
import { COLOR, FONT } from '../styles/tokens';

export const fieldStyle: React.CSSProperties = {
    padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm,
    color: COLOR.primary, background: COLOR.surface, minWidth: 0, boxSizing: 'border-box', width: '100%',
};
export const captionStyle: React.CSSProperties = { fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary };
export const linkStyle: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: FONT.xs, color: COLOR.accentDark, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' };


export interface FilterState { kinds: string[]; contains: string; advanced: boolean; raw: string }
export const NO_FILTER: FilterState = { kinds: [], contains: '', advanced: false, raw: '' };
export const queryOf = (filter: FilterState) => (filter.advanced ? filter.raw.trim() : queryFromFilter(filter.kinds, filter.contains));

/** One axis: what to list, counted live. */
export function AxisFilterCard({ title, filter, onChange, kindOptions, kindParents, evaluation, counting, showName = true, emptyHint = 'No filter: decided after it is created.' }: {
    title: string; filter: FilterState; onChange: (next: FilterState) => void;
    kindOptions: TypeFilterOption[]; evaluation?: AxisEvaluation; counting: boolean;
    /** Each type's parent, when the types are to be offered as a hierarchy. */
    kindParents?: ReadonlyMap<string, string>;
    /** Offer "Name contains" beside the types. A screen that selects by type or query alone leaves it out. */
    showName?: boolean;
    /** What is said under an axis with nothing chosen. */
    emptyHint?: React.ReactNode;
}) {
    const caption = captionStyle;
    const field = fieldStyle;
    const link = linkStyle;
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
                            label="" allLabel="Choose types…" options={kindOptions} parentOf={kindParents} selected={filter.kinds}
                            onChange={kinds => onChange({ ...filter, kinds })} width={210} describedAs={`${title} element types`}
                            placeholder="Find a type…"
                        />
                    </div>
                    {showName && <label style={{ display: 'grid', gap: '3px' }}>
                        <span style={caption}>Name contains</span>
                        <input value={filter.contains} onChange={event => onChange({ ...filter, contains: event.target.value })} aria-label={`${title} name contains`} placeholder="any text" style={field} />
                    </label>}
                </>
            )}
            <div role="status" style={{ fontSize: FONT.xs, minHeight: '16px', color: evaluation?.error ? '#B91C1C' : COLOR.muted, fontWeight: 600 }}>
                {!query
                    ? <span style={{ fontWeight: 400, color: COLOR.faint }}>{emptyHint}</span>
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


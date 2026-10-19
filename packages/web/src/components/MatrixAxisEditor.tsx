// ─── Matrix axis editor ───────────────────────────────────────────────────────
//
// One axis of a matrix: hand-picked elements, a memo-query, or both. The query
// is the DHF query language (`kind: Requirement`, `where: …`), run by the
// server's executor, so the text typed here selects the same elements a
// document template would. Preview shows how many it selects and the first few
// before anything is drawn, which is what lets a person narrow a query that
// would otherwise be too wide to render.

import { useMemo, useState } from 'react';
import type { TypeFilterOption } from './TypeFilterSelect';
import { TypeFilterSelect } from './TypeFilterSelect';
import { evaluateAxis, type AxisEvaluation } from '../lib/axis-evaluation';
import type { AxisDraft } from '../lib/matrix-views';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    label: string;
    draft: AxisDraft;
    onChange: (next: AxisDraft) => void;
    /** False shows the axis as read-only text. */
    editable: boolean;
    elementOptions: TypeFilterOption[];
    /** The last evaluation, from Preview or Render; stale when the query has changed since. */
    evaluation?: AxisEvaluation;
    onEvaluated: (evaluation: AxisEvaluation) => void;
    /** Ids that were picked but are no longer in the model. */
    missing?: number;
}

const boxStyle: React.CSSProperties = {
    display: 'grid', gap: '6px', padding: '8px 10px', borderRadius: '8px',
    border: `1px solid ${COLOR.border}`, background: '#FAFBFC', minWidth: 0,
};

export function MatrixAxisEditor({ label, draft, onChange, editable, elementOptions, evaluation, onEvaluated, missing = 0 }: Props) {
    const [running, setRunning] = useState(false);
    const stale = Boolean(evaluation) && evaluation!.query !== draft.query.trim();
    const summary = useMemo(() => {
        if (!evaluation) return null;
        if (evaluation.error) return { text: evaluation.error, tone: 'error' as const };
        return {
            text: `${evaluation.count.toLocaleString()} element${evaluation.count === 1 ? '' : 's'}${stale ? ' — query changed, preview again' : ''}`,
            tone: stale ? 'warn' as const : 'ok' as const,
        };
    }, [evaluation, stale]);

    const preview = async () => {
        setRunning(true);
        try { onEvaluated(await evaluateAxis(draft)); } finally { setRunning(false); }
    };

    return (
        <section style={boxStyle} aria-label={`${label} axis`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 700, color: COLOR.secondary }}>{label}</span>
                <span style={{ flex: 1 }} />
                <button
                    type="button" onClick={() => { void preview(); }} disabled={running}
                    title="Run the query and show how many elements the axis holds, without drawing the matrix"
                    style={{
                        padding: '2px 9px', borderRadius: '5px', border: `1px solid ${COLOR.border}`, background: COLOR.surface,
                        fontSize: FONT.xs, fontWeight: 600, color: COLOR.primary, cursor: running ? 'wait' : 'pointer',
                    }}
                >{running ? 'Counting…' : 'Count'}</button>
            </div>

            <label style={{ display: 'grid', gap: '2px', fontSize: FONT.xs, color: COLOR.muted }}>
                Query
                <textarea
                    value={draft.query}
                    readOnly={!editable}
                    onChange={event => onChange({ ...draft, query: event.target.value })}
                    placeholder={'kind: Requirement\nwhere: name contains "safety"'}
                    rows={3}
                    spellCheck={false}
                    aria-label={`${label} query`}
                    style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: FONT.xs, padding: '4px 6px',
                        border: `1px solid ${COLOR.border}`, borderRadius: '5px', resize: 'vertical',
                        background: editable ? COLOR.surface : COLOR.surfaceAlt, color: COLOR.primary,
                    }}
                />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: FONT.xs, color: COLOR.muted }}>
                <span>Hand-picked</span>
                {editable ? (
                    <TypeFilterSelect
                        label="" allLabel="none" options={elementOptions} selected={draft.elementIds}
                        onChange={elementIds => onChange({ ...draft, elementIds })}
                        width={170} describedAs={`${label} hand-picked elements`} placeholder="Find by name, kind or id…"
                    />
                ) : (
                    <strong style={{ color: COLOR.primary }}>{draft.elementIds.length}</strong>
                )}
                {missing > 0 && (
                    <span style={{ color: '#B45309' }} title="These were picked in the saved definition and are no longer in the model">
                        {missing} no longer in the model
                    </span>
                )}
            </div>

            {summary && (
                <div role={summary.tone === 'error' ? 'alert' : 'status'} style={{
                    fontSize: FONT.xs, fontWeight: 600,
                    color: summary.tone === 'error' ? '#B91C1C' : summary.tone === 'warn' ? '#B45309' : '#0F766E',
                }}>{summary.text}</div>
            )}
            {evaluation && !evaluation.error && evaluation.preview.length > 0 && (
                <ul aria-label={`${label} preview`} style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: '110px', overflow: 'auto' }}>
                    {evaluation.preview.map(row => (
                        <li key={row.id} title={row.id} style={{ fontSize: '11px', color: COLOR.primary, display: 'flex', gap: '6px' }}>
                            <span className="truncate" style={{ flex: 1 }}>{row.name}</span>
                            <span style={{ color: COLOR.faint }}>{row.kind}</span>
                        </li>
                    ))}
                    {evaluation.count > evaluation.preview.length && (
                        <li style={{ fontSize: '11px', color: COLOR.faint }}>
                            and {(evaluation.count - evaluation.preview.length).toLocaleString()} more
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

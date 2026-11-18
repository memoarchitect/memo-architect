import { useEffect, useState, type ReactNode } from 'react';
import { operationalConforms, operationalWorkLevel, type MemoModelDTO, type OperationalWorkLevel } from '@memoarchitect/tools/browser';
import { ControlIcon } from '../components/TraceControls';
import { COLOR } from '../styles/tokens';
import { ElementChip } from '../components/ElementChip';
import './pathway-workbench.css';

type Element = MemoModelDTO['elements'][string];

// A use case's own page: what it is for, who takes part, how it relates to other use cases, and the
// workflows that accomplish it. Fields are written in place by the operational writer; actors and
// included use cases are lines in the use case's own body, so they are added and removed there.

const FIELDS = [['goalStatement', 'Goal'], ['successOutcome', 'Observable result'], ['failureOutcome', 'Failure outcome'],
    ['trigger', 'Trigger'], ['preCondition', 'Precondition'], ['postCondition', 'Postcondition']] as const;
const muted = { color: COLOR.muted, fontSize: 13, lineHeight: 1.5, margin: 0 } as const;
const field = { font: 'inherit', fontSize: 14, padding: '8px 10px', border: `1px solid ${COLOR.border}`, borderRadius: 8, width: '100%', boxSizing: 'border-box', resize: 'vertical' } as const;

export interface UseCaseProfileProps {
    model: MemoModelDTO;
    useCase: Element;
    /** The method's word for a level ("Clinical", "Operational"). */
    levelName: (level?: OperationalWorkLevel) => string;
    writable: boolean;
    busy: boolean;
    /** The workflows that accomplish the goal, with their scenarios. */
    workflows: ReactNode;
    onSaveFields: (fields: Record<string, string>) => Promise<string | undefined>;
    onAddActor: () => void;
    onInclude: () => void;
    onNewIncluded: () => void;
    onRemove: (relation: 'participatesIn' | 'includesStep', id: string) => void;
    onOpenCase: (id: string) => void;
    onLinkOther: () => void;
    onOpenWork: (id: string) => void;
    onDiagram: () => void;
    onProperties: () => void;
    onContext?: (id: string) => void;
}

export function UseCaseProfile({ model, useCase, levelName, writable, busy, workflows, onSaveFields, onAddActor, onInclude, onNewIncluded, onRemove, onOpenCase, onLinkOther, onOpenWork, onDiagram, onProperties, onContext }: UseCaseProfileProps) {
    const level = operationalWorkLevel(model, useCase.id);
    const otherLevel: OperationalWorkLevel | undefined = level === 'clinical' ? 'operational' : level === 'operational' ? 'clinical' : undefined;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { setEditing(false); setDraft({}); setError(''); }, [useCase.id]);
    const stored = (key: string) => key === 'doc' ? useCase.doc ?? '' : useCase.attributes[key] ?? '';
    const changed = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== stored(key)));
    const save = async () => {
        setSaving(true); setError('');
        const failure = await onSaveFields(changed);
        setSaving(false);
        if (failure) setError(failure); else { setDraft({}); setEditing(false); }
    };
    const ends = (type: string, from: 'source' | 'target') => model.relationships
        .filter(edge => edge.type === type && (from === 'source' ? edge.sourceId : edge.targetId) === useCase.id)
        .flatMap(edge => { const other = model.elements[from === 'source' ? edge.targetId : edge.sourceId]; return other ? [other] : []; });
    const unique = (items: Element[]) => [...new Map(items.map(item => [item.id, item])).values()];
    const actors = unique(ends('participatesIn', 'target'));
    const includes = unique(ends('includesStep', 'source').filter(item => operationalConforms(model, item.id, 'UseCase')));
    const includedBy = unique(ends('includesStep', 'target').filter(item => operationalConforms(model, item.id, 'UseCase')));
    const subjects = unique(ends('hasSubject', 'source'));
    const counterparts = otherLevel ? unique([...ends('realizes', 'source'), ...ends('realizes', 'target')]
        .filter(item => operationalWorkLevel(model, item.id) === otherLevel && operationalConforms(model, item.id, 'UseCase'))) : [];
    const linkWord = level === 'clinical' ? 'Realized by' : 'Realizes';
    const other = levelName(otherLevel).toLowerCase();
    const list = (items: Element[], empty: string, open?: (item: Element) => () => void, remove?: (item: Element) => () => void) => items.length
        ? <ul className="memo-element-chips">{items.map(item => <li key={item.id}><ElementChip model={model} element={item} onClick={open?.(item)}
            onRemove={remove?.(item)} removeDisabled={!writable || busy} /></li>)}</ul> : <p style={muted}>{empty}</p>;

    return <section aria-label="Use case profile" className="pathway-profile">
        <header className="pathway-operational-hero">
            <span className="pathway-icon" aria-hidden="true">{ControlIcon.goal}</span>
            <div><h2>{useCase.name}</h2><p>{useCase.attributes.goalStatement || useCase.doc}</p>
                {useCase.attributes.successOutcome && <p><strong>Observable result</strong> · {useCase.attributes.successOutcome}</p>}</div>
            <button type="button" className="pathway-button" aria-expanded={editing} disabled={!writable} onClick={() => setEditing(open => !open)}>{ControlIcon.edit} Edit…</button>
            <button type="button" className="pathway-button" onClick={onDiagram}>Use case diagram</button>
            <button type="button" className="pathway-button" onClick={onProperties}>Properties</button>
        </header>
        {editing && <form aria-label="Edit the use case" className="pathway-operational-panel pathway-profile-edit" onSubmit={event => { event.preventDefault(); void save(); }}>
            {[...FIELDS, ['doc', 'Description'] as const].map(([key, text]) => <label key={key}>{text}
                <textarea rows={key === 'doc' ? 3 : 2} style={field} value={draft[key] ?? stored(key)} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
            {error && <p role="alert" style={{ ...muted, color: '#9B1C1C' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="pathway-button pathway-button--primary" disabled={!Object.keys(changed).length || saving || busy}>{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" className="pathway-button" disabled={saving} onClick={() => { setDraft({}); setEditing(false); }}>Cancel</button>
            </div>
        </form>}
        {!editing && <dl className="pathway-operational-facts">
            {FIELDS.filter(([key]) => key !== 'goalStatement' && key !== 'successOutcome' && useCase.attributes[key]).map(([key, text]) =>
                <div key={key}><dt>{text}</dt><dd>{useCase.attributes[key]}</dd></div>)}
            {useCase.doc && useCase.doc !== useCase.attributes.goalStatement && <div><dt>Description</dt><dd>{useCase.doc}</dd></div>}
        </dl>}
        <div className="pathway-profile-grid">
            <section aria-label="Actors" className="pathway-operational-panel pathway-profile-card">
                <header><h3>{ControlIcon.person} Actors</h3><button type="button" className="pathway-button" disabled={!writable || busy} onClick={onAddActor}>{ControlIcon.plus} Actor</button></header>
                {list(actors, 'No actor takes part yet.', undefined, item => () => onRemove('participatesIn', item.id))}
            </section>
            <section aria-label="Related use cases" className="pathway-operational-panel pathway-profile-card">
                <header><h3>{ControlIcon.goal} Related use cases</h3>
                    <span style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="pathway-button" disabled={!writable || busy} onClick={onInclude}>{ControlIcon.plus} Include existing</button>
                        <button type="button" className="pathway-button" disabled={!writable || busy} onClick={onNewIncluded}>{ControlIcon.plus} New</button>
                    </span></header>
                <h4>Includes</h4>
                {list(includes, 'Includes no other use case.', item => () => onOpenCase(item.id), item => () => onRemove('includesStep', item.id))}
                {includedBy.length > 0 && <><h4>Included by</h4>{list(includedBy, '', item => () => onOpenCase(item.id))}</>}
            </section>
            {otherLevel && <section aria-label={`${linkWord} ${other} use cases`} className="pathway-operational-panel pathway-profile-card">
                <header><h3>{linkWord} {other} use cases</h3><button type="button" className="pathway-button" disabled={busy} onClick={onLinkOther}>Link…</button></header>
                {list(counterparts, `Not linked to ${other} use cases yet.`, item => () => onOpenWork(item.id))}
            </section>}
            <section aria-label="Subject" className="pathway-operational-panel pathway-profile-card">
                <header><h3>{ControlIcon.system} Subject</h3></header>
                {list(subjects, 'Not specified.', onContext && model.workspaceMembership ? item => () => onContext(model.workspaceMembership!.definitionOf[item.id] ?? item.id) : undefined)}
            </section>
        </div>
        {workflows}
    </section>;
}

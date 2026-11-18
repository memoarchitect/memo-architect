import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { canonicalFunctionId, functionalFlowSteps, operationalConforms, operationalWorkLevel, type MemoModelDTO, type OperationalWorkLevel } from '@memoarchitect/tools/browser';
import { COLOR } from '../styles/tokens';
import './pathway-workbench.css';

type Element = MemoModelDTO['elements'][string];

// One scenario on one page: its steps in order, one diagram, and the properties of what is selected.
// A scenario is a path with a start and an end, so its own fields are the trigger, the pre- and
// postcondition and the expected result; a step says what happens and who performs it. The link
// between the clinical and the operational level reads "Realized by" from the clinical end and
// "Realizes" from the operational end; the words for the two levels come from the method.

const SCENARIO_FIELDS = [['trigger', 'Trigger'], ['preCondition', 'Precondition'], ['postCondition', 'Postcondition'], ['expectedResult', 'Expected result']] as const;

const panel = { background: 'white', border: `1px solid ${COLOR.border}`, borderRadius: 12, minWidth: 0 } as const;
const label = { fontSize: 13, fontWeight: 600 } as const;
const muted = { color: COLOR.muted, fontSize: 13, lineHeight: 1.5, margin: 0 } as const;
const field = { font: 'inherit', fontSize: 14, padding: '8px 10px', border: `1px solid ${COLOR.border}`, borderRadius: 8, width: '100%', boxSizing: 'border-box' } as const;

export interface ScenarioPageProps {
    model: MemoModelDTO;
    scenario: Element;
    selectedId?: string;
    /** The method's word for a level ("Clinical", "Operational"). */
    levelName: (level?: OperationalWorkLevel) => string;
    writable: boolean;
    diagram: ReactNode;
    /** An open form (new step, existing step, performer, link), shown in place of the properties. */
    form?: ReactNode;
    notice?: string;
    onSelect: (id: string) => void;
    onOpenWork: (id: string) => void;
    onBack: () => void;
    onNewStep: () => void;
    onExistingStep: () => void;
    onPerformer: () => void;
    onLink: () => void;
    /** Operational steps only: link and open the functions that realize the step. */
    onLinkFunction?: () => void;
    onOpenFunction?: (id: string) => void;
    onAllProperties: (id: string) => void;
    /** Writes only the changed fields (`doc` included) in the element's own declaration; resolves to an error, if any. */
    onSave: (element: Element, fields: Record<string, string>) => Promise<string | undefined>;
}

export function ScenarioPage({ model, scenario, selectedId, levelName, writable, diagram, form, notice, onSelect, onOpenWork, onBack, onNewStep, onExistingStep, onPerformer, onLink, onLinkFunction, onOpenFunction, onAllProperties, onSave }: ScenarioPageProps) {
    const [view, setView] = useState<'diagram' | 'table'>('diagram');
    const level = operationalWorkLevel(model, scenario.id);
    const otherLevel: OperationalWorkLevel | undefined = level === 'clinical' ? 'operational' : level === 'operational' ? 'clinical' : undefined;
    const own = levelName(level);
    const other = levelName(otherLevel);
    const steps = useMemo(() => functionalFlowSteps(model, scenario.id).steps.map(item => item.step as Element), [model, scenario.id]);
    const selected = (selectedId && selectedId !== scenario.id && steps.some(step => step.id === selectedId)) ? model.elements[selectedId] : scenario;
    const workflow = model.elements[scenario.owner ?? scenario.parentAction ?? ''];
    const performersOf = (id: string) => model.relationships.filter(edge => edge.type === 'performs' && edge.targetId === id)
        .flatMap(edge => model.elements[edge.sourceId] ? [model.elements[edge.sourceId]] : []);
    // Realization runs between the two levels, on the canonical step a usage stands for.
    const counterpartsOf = (id: string) => {
        if (!otherLevel) return [];
        const canonical = canonicalFunctionId(model, id) ?? id;
        return model.relationships.filter(edge => edge.type === 'realizes' && (edge.sourceId === canonical || edge.targetId === canonical))
            .flatMap(edge => {
                const end = model.elements[edge.sourceId === canonical ? edge.targetId : edge.sourceId];
                return end && operationalWorkLevel(model, end.id) === otherLevel ? [end] : [];
            });
    };
    const scenarioOf = (id: string) => {
        let at = model.elements[id]?.owner ?? model.elements[id]?.parentAction;
        for (const seen = new Set<string>(); at && !seen.has(at); at = model.elements[at]?.owner ?? model.elements[at]?.parentAction) {
            seen.add(at);
            if (operationalConforms(model, at, 'OperativeScenario')) return model.elements[at];
        }
        return undefined;
    };
    const usedIn = (id: string) => {
        const canonical = canonicalFunctionId(model, id) ?? id;
        const scenarios = new Map<string, Element>();
        for (const element of Object.values(model.elements)) {
            if (element.id === id || (canonicalFunctionId(model, element.id) ?? element.id) !== canonical) continue;
            const owner = scenarioOf(element.id);
            if (owner && owner.id !== scenario.id) scenarios.set(owner.id, owner);
        }
        return [...scenarios.values()];
    };
    const linkWord = level === 'clinical' ? 'Realized by' : 'Realizes';
    const isStep = selected.id !== scenario.id;
    const editable = writable && selected.provenance?.declaration.writable !== false;

    const [draft, setDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { setDraft({}); setError(''); }, [selected.id]);
    const value = (key: string) => draft[key] ?? (key === 'doc' ? selected.doc ?? '' : selected.attributes[key] ?? '');
    const keys = isStep ? ['doc'] : ['doc', ...SCENARIO_FIELDS.map(([key]) => key)];
    const dirty = keys.some(key => draft[key] !== undefined && draft[key] !== (key === 'doc' ? selected.doc ?? '' : selected.attributes[key] ?? ''));
    const save = async () => {
        const fields = Object.fromEntries(keys.filter(key => draft[key] !== undefined && draft[key] !== (key === 'doc' ? selected.doc ?? '' : selected.attributes[key] ?? '')).map(key => [key, draft[key]]));
        setSaving(true); setError('');
        const failure = await onSave(selected, fields);
        setSaving(false);
        if (failure) setError(failure); else setDraft({});
    };
    const input = (key: string, text: string, rows = 2) => <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={`scenario-field-${key}`} style={label}>{text}</label>
        <textarea id={`scenario-field-${key}`} rows={rows} style={{ ...field, resize: 'vertical' }} value={value(key)} disabled={!editable}
            onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />
    </div>;
    const counterparts = counterpartsOf(selected.id);

    const stepRows = steps.map((step, index) => ({ step, index, performers: performersOf(step.id), counterparts: counterpartsOf(step.id) }));
    const properties = form ?? <form aria-label="Properties of the selection" onSubmit={event => { event.preventDefault(); void save(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px' }}>
        <div>
            <p style={{ ...muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Selected · {isStep ? `${own.toLowerCase()} step ${steps.findIndex(step => step.id === selected.id) + 1} of ${steps.length}` : `${own.toLowerCase()} scenario`}</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 17 }}>{selected.name}</h2>
            {isStep && <button type="button" className="pathway-button" style={{ marginTop: 8 }} onClick={() => onSelect(scenario.id)}>Back to the scenario</button>}
        </div>
        {isStep ? <>
            {input('doc', 'What happens', 3)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={label}>Performed by</span>
                <p style={muted}>{performersOf(selected.id).map(item => item.name).join(', ') || 'No one yet.'}</p>
                <div><button type="button" className="pathway-button" disabled={!editable} onClick={onPerformer}>Set performer…</button></div>
            </div>
        </> : <>
            <p style={muted}><strong>Path:</strong> {(scenario.attributes.scenarioKind ?? 'nominal').split('::').at(-1) === 'alternate' ? 'alternate path' : 'usual path'}</p>
            {SCENARIO_FIELDS.map(([key, text]) => input(key, text))}
            {input('doc', 'Description')}
        </>}
        {otherLevel && <section aria-label={`${linkWord} ${other.toLowerCase()} ${isStep ? 'steps' : 'work'}`} style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{linkWord} {other.toLowerCase()} {isStep ? 'steps' : 'work'}</h3>
            {counterparts.length ? <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{counterparts.map(item => {
                const owner = scenarioOf(item.id);
                return <li key={item.id} style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '8px 12px' }}>
                    <button type="button" className="pathway-button" onClick={() => onOpenWork(item.id)}>{item.name}</button>
                    {owner && owner.id !== item.id && <p style={{ ...muted, marginTop: 4 }}>{owner.name}</p>}
                </li>;
            })}</ul> : <p style={muted}>{isStep || !stepRows.some(row => row.counterparts.length)
                ? `Not linked to ${other.toLowerCase()} work yet.`
                : `Not linked as a whole. ${stepRows.filter(row => row.counterparts.length).length} of ${steps.length} steps are linked one by one; select a step to see which.`}</p>}
            <div><button type="button" className="pathway-button" disabled={!writable} onClick={onLink}>Link {other.toLowerCase()} work…</button></div>
        </section>}
        {isStep && level === 'operational' && onLinkFunction && <section aria-label="Realized by functions" style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Realized by functions</h3>
            {(() => {
                const realized = model.relationships.filter(edge => edge.type === 'performs' && edge.sourceId === selected.id && operationalConforms(model, edge.targetId, 'SystemFunction'))
                    .flatMap(edge => model.elements[edge.targetId] ? [model.elements[edge.targetId]] : []);
                return realized.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{realized.map(item => onOpenFunction
                    ? <button key={item.id} type="button" className="pathway-button" onClick={() => onOpenFunction(item.id)}>{item.name}</button>
                    : <span key={item.id}>{item.name}</span>)}</div> : <p style={muted}>No function realizes this step yet.</p>;
            })()}
            <div><button type="button" className="pathway-button" disabled={!editable} onClick={onLinkFunction}>Link a function…</button></div>
        </section>}
        {isStep && usedIn(selected.id).length > 0 && <section aria-label="Where this step is used" style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Also used in</h3>
            <p style={muted}>{usedIn(selected.id).map(item => item.name).join(', ')}. It is one step: an edit here changes it there too.</p>
        </section>}
        {error && <p role="alert" style={{ ...muted, color: '#9B1C1C' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: `1px solid ${COLOR.border}`, paddingTop: 14 }}>
            <button type="submit" className="pathway-button pathway-button--primary" disabled={!editable || !dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="pathway-button" disabled={!dirty || saving} onClick={() => setDraft({})}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="pathway-button" onClick={() => onAllProperties(selected.id)}>All properties…</button>
        </div>
    </form>;

    return <section aria-label="Scenario page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <nav aria-label="Where you are" className="pathway-operational-breadcrumb">
                <button type="button" onClick={onBack}>All use cases</button>
                {workflow && <><span aria-hidden="true">›</span><button type="button" onClick={() => onSelect(workflow.id)}>{workflow.name}</button></>}
                <span aria-hidden="true">›</span><strong>{scenario.name}</strong>
            </nav>
            <span style={{ flex: 1 }} />
            <div className="pathway-segments" role="group" aria-label="Show as">
                <button type="button" aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>Diagram</button>
                <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
            </div>
        </header>
        {notice && <p role="status" style={muted}>{notice}</p>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <aside aria-label="Steps" style={{ ...panel, flex: '0 1 300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 16px 8px' }}>
                    <p style={{ ...muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{own} scenario</p>
                    <button type="button" className="pathway-operational-case-link" aria-pressed={!isStep} onClick={() => onSelect(scenario.id)} style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{scenario.name}</button>
                </div>
                <p style={{ ...muted, padding: '0 16px 6px', fontWeight: 600 }}>Steps, in order</p>
                <ol aria-label="Steps in order" style={{ listStyle: 'none', margin: 0, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    {stepRows.map(({ step, index, performers, counterparts: links }) => <li key={step.id}>
                        <button type="button" aria-pressed={selected.id === step.id} onClick={() => onSelect(step.id)}
                            style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '8px', borderRadius: 8, border: 0, font: 'inherit', cursor: 'pointer', background: selected.id === step.id ? '#E6F4EE' : 'transparent' }}>
                            <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 11, background: selected.id === step.id ? '#0B6B52' : '#EEF2F5', color: selected.id === step.id ? 'white' : 'inherit', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{index + 1}</span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{step.name}</span>
                                <span style={{ fontSize: 12, color: COLOR.muted }}>{performers.map(item => item.name).join(', ') || 'No performer'}{otherLevel && links.length ? ` · ${linkWord.toLowerCase()} ${links.length} ${other.toLowerCase()} ${links.length === 1 ? 'step' : 'steps'}` : ''}</span>
                            </span>
                        </button>
                    </li>)}
                    {!steps.length && <li><p style={{ ...muted, padding: 8 }}>No steps yet.</p></li>}
                </ol>
                <div style={{ padding: 16, borderTop: `1px solid ${COLOR.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="pathway-button pathway-button--primary" disabled={!writable} onClick={onNewStep}>New step</button>
                        <button type="button" className="pathway-button" disabled={!writable} onClick={onExistingStep}>Add an existing step…</button>
                    </div>
                    <p style={{ ...muted, fontSize: 12 }}>An existing step comes from another scenario and stays one step: edit it once, both scenarios change.</p>
                </div>
            </aside>
            <main aria-label={view === 'diagram' ? 'Scenario diagram area' : 'Scenario table'} style={{ ...panel, flex: '999 1 480px', padding: 12, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
                {view === 'diagram' ? diagram : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead><tr style={{ textAlign: 'left', color: COLOR.muted }}>
                        <th scope="col" style={{ padding: 8 }}>#</th><th scope="col" style={{ padding: 8 }}>{own} step</th><th scope="col" style={{ padding: 8 }}>Performed by</th>
                        {otherLevel && <th scope="col" style={{ padding: 8 }}>{linkWord} {other.toLowerCase()} step</th>}
                    </tr></thead>
                    <tbody>{stepRows.map(({ step, index, performers, counterparts: links }) => <tr key={step.id} style={{ borderTop: `1px solid ${COLOR.border}`, verticalAlign: 'top', background: selected.id === step.id ? '#E6F4EE' : undefined }}>
                        <td style={{ padding: 8 }}>{index + 1}</td>
                        <td style={{ padding: 8 }}><button type="button" className="pathway-button" onClick={() => onSelect(step.id)}>{step.name}</button></td>
                        <td style={{ padding: 8 }}>{performers.map(item => item.name).join(', ') || '—'}</td>
                        {otherLevel && <td style={{ padding: 8 }}>{links.length ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{links.map(item =>
                            <button key={item.id} type="button" className="pathway-button" onClick={() => onOpenWork(item.id)}>{item.name}</button>)}</span> : '—'}</td>}
                    </tr>)}</tbody>
                </table>}
            </main>
            <aside aria-label="Properties" style={{ ...panel, flex: '0 1 360px' }}>{properties}</aside>
        </div>
    </section>;
}

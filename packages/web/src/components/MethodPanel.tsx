// ─── Method panel ────────────────────────────────────────────────────────────
//
// The method beside the work, as Capella's activity explorer is, but for teams that work each layer
// independently. A team chooses its system in the panel; it shows that workspace's steps for the user's role, by
// level and stage, with the next open step expanded. An expanded step offers what its team can do now:
//
//   own work  each output kind with its count and "New <kind>", which writes an element of that kind beside
//             the chosen system (memo-tools writes it; Architect names it, never numbers it). A new element joins
//             a system only once it is linked to it, so until then it is listed as made, not yet linked in;
//   links     each link to another layer: made, waiting for the step that produces the other side (a link to
//             that step), or ready, with the elements still to link, each one a click away;
//   views     the viewpoint the method names for the step.
//
// The evaluation is the Guide's (`useGuideEvaluation`), refreshed on every model revision.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { groupSteps, nextStep, stepsForRole, words, type GuideStepStatus } from '../lib/guide-view';
import { initiallyExpanded, newElement, notInASystem, planCreate, unlinkedElements } from '../lib/method-panel';
import { useGuideEvaluation, useOpenStep } from '../lib/use-guide';
import { roleLabel } from '../lib/role-viewpoints';
import { WorkspaceSelector } from './WorkspaceSelector';
import { COLOR, FONT } from '../styles/tokens';

const STATE: Record<GuideStepStatus['state'], { label: string; color: string; background: string }> = {
    done: { label: 'Done', color: '#1B7F4B', background: '#E6F4EC' },
    open: { label: 'To do', color: '#1D4ED8', background: '#E8EEFB' },
    waiting: { label: 'Waiting', color: '#5B6472', background: '#EEF0F3' },
    'no-criterion': { label: '—', color: '#6B7280', background: '#F1F1EE' },
};

const button = { fontSize: FONT.xs, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer' } as const;

export function MethodPanel({ onClose }: { onClose: () => void }) {
    const guide = useModelStore(s => s.guide);
    const model = useModelStore(s => s.model);
    const role = useModelStore(s => s.role);
    const workspace = useModelStore(s => s.workspace);
    const selectElement = useModelStore(s => s.selectElement);
    const createModelElement = useModelStore(s => s.createModelElement);
    const failedCreates = useModelStore(s => s.failedCreates);
    const problem = useGuideEvaluation();
    const open = useOpenStep();
    const [allRoles, setAllRoles] = useState(false);
    const [expanded, setExpanded] = useState<string | undefined>();
    const [naming, setNaming] = useState<{ step: string; kind: string; name: string } | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    // A refused write rolls the optimistic element back; say why here, where it was asked for.
    const refused = pending ? failedCreates[pending] : undefined;

    const shown = useMemo(() => stepsForRole(guide?.steps ?? [], allRoles ? null : role), [guide, role, allRoles]);
    const groups = useMemo(() => groupSteps(shown), [shown]);
    const next = nextStep(shown);
    const byId = new Map((guide?.steps ?? []).map(step => [step.id, step]));
    const label = (id: string) => byId.get(id)?.label ?? id;

    // Another system is other work: open its next step afresh.
    useEffect(() => { setExpanded(undefined); setNaming(null); }, [guide?.workspace]);
    useEffect(() => {
        if (expanded === undefined && shown.length > 0) setExpanded(initiallyExpanded(shown, next?.id));
    }, [shown, next, expanded]);

    const create = () => {
        if (!naming || !naming.name.trim()) return;
        const plan = planCreate(model, naming.kind, workspace);
        if (!plan) { setMessage(`The ontology has no ${naming.kind} that can be created.`); return; }
        if (!plan.file) { setMessage(`Nothing in ${workspace ? 'this workspace' : 'the model'} shows where a ${plan.label} belongs. Choose a system above, or add the first one in its file.`); return; }
        const element = newElement(model, { ...plan, file: plan.file }, naming.name.trim());
        createModelElement(element);
        setPending(element.id);
        setMessage(`Writing ${plan.label} ${element.name} into ${plan.file}…`);
        setNaming(null);
    };

    const goTo = (id: string) => {
        // A waiting link names the step it waits for: show it, and every role's steps if it is not this role's.
        if (!shown.some(s => s.id === id)) setAllRoles(true);
        setExpanded(id);
    };

    const stepBody = (step: GuideStepStatus) => (
        <div data-testid="method-step-body" style={{ padding: '6px 0 2px 2px', fontSize: FONT.xs }}>
            {step.objective && <div style={{ fontSize: FONT.sm, marginBottom: 6 }}>{step.objective}</div>}

            {step.outputs.length > 0 && <div style={{ color: COLOR.muted, fontWeight: 600, margin: '4px 0 2px' }}>Your work</div>}
            {step.outputs.map(output => {
                const plan = planCreate(model, output.kind, workspace);
                const isNaming = naming?.step === step.id && naming.kind === output.kind;
                return (
                    <div key={output.kind} data-testid="method-output" style={{ margin: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: output.count > 0 ? '#1B7F4B' : COLOR.primary }}>{output.count > 0 ? '✓' : '○'}</span>
                            <span style={{ flex: 1 }}>{plan?.label ?? output.kind}: {output.count}{output.untracedImports > 0 ? ` (+${output.untracedImports} imported, not traced)` : ''}</span>
                            {plan && !isNaming && <button data-testid="method-new" style={button} onClick={() => setNaming({ step: step.id, kind: output.kind, name: '' })}>+ New</button>}
                        </div>
                        {isNaming && (
                            <form onSubmit={e => { e.preventDefault(); create(); }} style={{ display: 'flex', gap: 4, margin: '4px 0 4px 18px' }}>
                                <input autoFocus data-testid="method-new-name" value={naming.name} placeholder={`Name of the ${plan?.label ?? output.kind}`}
                                    onChange={e => setNaming({ ...naming, name: e.target.value })}
                                    onKeyDown={e => { if (e.key === 'Escape') setNaming(null); }}
                                    style={{ flex: 1, fontSize: FONT.xs, padding: '2px 6px', border: `1px solid ${COLOR.border}`, borderRadius: 4 }} />
                                <button type="submit" style={button} disabled={!naming.name.trim()}>Create</button>
                                <button type="button" style={button} onClick={() => setNaming(null)}>Cancel</button>
                            </form>
                        )}
                    </div>
                );
            })}
            {notInASystem(model, step, workspace).length > 0 && (
                <div data-testid="method-unplaced" style={{ margin: '4px 0 2px 18px', color: '#92400E' }}>
                    In the model, not yet in {guide?.workspace ?? 'this system'}: link {notInASystem(model, step, workspace).length === 1 ? 'it' : 'each'} to the system to count it.
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                        {notInASystem(model, step, workspace).map(el => (
                            <button key={el.id} data-testid="method-unplaced-element" style={button} title="Select it, then link it from its properties" onClick={() => selectElement(el.id)}>{el.name}</button>
                        ))}
                    </div>
                </div>
            )}
            {step.rules.filter(r => !r.known || r.subjects === 0 || r.violations > 0).map(r => (
                <div key={r.rule} style={{ color: COLOR.muted }}>○ {r.rule}: {!r.known ? 'not in the rule set' : r.subjects === 0 ? 'nothing to judge yet' : `${r.violations} finding(s)`}</div>
            ))}

            {step.links.length > 0 && <div style={{ color: COLOR.muted, fontWeight: 600, margin: '8px 0 2px' }}>Links to other layers</div>}
            {step.links.map(link => (
                <div key={link.rule} data-testid="method-link" data-state={link.state} style={{ margin: '2px 0' }}>
                    {link.state === 'linked' && <span><span style={{ color: '#1B7F4B' }}>✓</span> {link.rule}: linked</span>}
                    {link.state === 'unknown' && <span>○ {link.rule}: not in the rule set</span>}
                    {link.state === 'waiting' && (
                        <span style={{ color: '#5B6472' }}>
                            ◌ {link.rule}: {link.waitingFor.length > 0
                                ? <>waits for {link.waitingFor.map((id, i) => <span key={id}>{i > 0 && ', '}<a href="#" data-testid="method-waits-for" onClick={e => { e.preventDefault(); goTo(id); }}>{label(id)}</a></span>)}</>
                                : step.outputs.some(o => o.count === 0) ? 'made once your work above exists' : 'nothing to judge yet'}
                        </span>
                    )}
                    {link.state === 'ready' && unlinkedElements(model, step).filter(u => u.rule === link.rule).map(u => (
                        <div key={u.rule}>
                            <div>○ {u.rule}: {u.elements.length} ready to link</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '3px 0 0 18px' }}>
                                {u.elements.slice(0, 12).map(el => (
                                    <button key={el.id} data-testid="method-unlinked" style={button} title="Select it, then link it from its properties" onClick={() => selectElement(el.id)}>{el.name}</button>
                                ))}
                                {u.elements.length > 12 && <span style={{ color: COLOR.muted }}>and {u.elements.length - 12} more</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            {step.predecessors.length > 0 && <div style={{ color: COLOR.muted, marginTop: 6 }}>Fed by {step.predecessors.map(label).join(', ')}</div>}
            <div style={{ marginTop: 6 }}><button style={button} onClick={() => open(step)}>Open {step.guideViewpoint ? words(step.guideViewpoint.replace(/^vp/, '')) : 'views'}</button></div>
        </div>
    );

    return (
        <aside data-testid="method-panel" style={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${COLOR.border}`, background: '#FFFFFF', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${COLOR.borderLight}` }}>
                <strong style={{ fontSize: FONT.md }}>Method</strong>
                <span style={{ fontSize: FONT.xs, color: COLOR.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {guide?.workspace ?? 'whole model'}{role && !allRoles ? ` · ${roleLabel(role)}` : ''}
                </span>
                <button aria-label="Close the method panel" title="Close" onClick={onClose} style={{ ...button, border: 'none' }}>✕</button>
            </div>
            {/* Teams work one system at a time: choosing it here is choosing whose steps, and where new work goes. */}
            <div style={{ padding: '6px 12px', borderBottom: `1px solid ${COLOR.borderLight}` }}><WorkspaceSelector tone="light" label="System" compact /></div>
            <div style={{ overflow: 'auto', padding: '8px 12px', flex: 1 }}>
                {problem && <p data-testid="method-problem" style={{ fontSize: FONT.xs, color: '#B42318' }}>{problem}</p>}
                {message && !refused && <p data-testid="method-message" style={{ fontSize: FONT.xs, color: COLOR.muted }}>{message}</p>}
                {refused && <p data-testid="method-refused" style={{ fontSize: FONT.xs, color: '#B42318' }}>Not written: {refused}</p>}
                {role && <label style={{ fontSize: FONT.xs, color: COLOR.muted }}><input type="checkbox" checked={allRoles} onChange={e => setAllRoles(e.target.checked)} /> Every role's steps</label>}
                {!guide && !problem && <p style={{ fontSize: FONT.xs, color: COLOR.muted }}>Reading the method…</p>}
                {guide && !next && shown.length > 0 && <p style={{ fontSize: FONT.xs, color: COLOR.muted }}>Nothing to do now: every step is done or waiting on another team.</p>}
                {groups.map(level => (
                    <section key={level.level} style={{ marginTop: 10 }}>
                        <div style={{ fontSize: FONT.sm, fontWeight: 700 }}>{words(level.level)}</div>
                        {level.stages.map(stage => stage.steps.map(step => {
                            const isOpen = expanded === step.id;
                            return (
                                <div key={step.id} data-testid="method-step" data-state={step.state}
                                    style={{ borderLeft: `3px solid ${step.id === next?.id ? '#1D4ED8' : 'transparent'}`, padding: '4px 0 4px 8px', margin: '4px 0' }}>
                                    <button onClick={() => setExpanded(isOpen ? '' : step.id)} aria-expanded={isOpen}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '0 6px', borderRadius: 8, color: STATE[step.state].color, background: STATE[step.state].background }}>{STATE[step.state].label}</span>
                                        <span style={{ fontSize: FONT.sm, fontWeight: 600, flex: 1 }}>{step.label ?? step.name}</span>
                                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>{words(stage.stage)}</span>
                                    </button>
                                    {isOpen && stepBody(step)}
                                </div>
                            );
                        }))}
                    </section>
                ))}
            </div>
        </aside>
    );
}

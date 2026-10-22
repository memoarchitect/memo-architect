// ─── Guide ───────────────────────────────────────────────────────────────────
//
// Where the model stands against its method (plan A5). The method's steps are the methodology's own
// (`MethodologyWorkflowStep`, the default method and a family's on top of it); the server judges each
// against the chosen workspace, and this page shows them by level and stage as done, open or blocked,
// with what is missing and the next step to take. A role chooses which steps are shown. Opening a step
// goes to the viewpoint the method names for it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { requestGuide } from '../store/ws-client';
import { groupSteps, nextStep, stepsForRole, words, type GuideStepStatus } from '../lib/guide-view';
import { roleLabel } from '../lib/role-viewpoints';
import { COLOR, FONT } from '../styles/tokens';

const STATE_STYLE: Record<GuideStepStatus['state'], { label: string; color: string; background: string }> = {
    done: { label: 'Done', color: '#1B7F4B', background: '#E6F4EC' },
    open: { label: 'Open', color: '#1D4ED8', background: '#E8EEFB' },
    blocked: { label: 'Blocked', color: '#92400E', background: '#FDF2E3' },
    'no-criterion': { label: 'No done criterion', color: '#6B7280', background: '#F1F1EE' },
};

export function Guide() {
    const guide = useModelStore(s => s.guide);
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    const role = useModelStore(s => s.role);
    const connected = useModelStore(s => s.connected);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setActiveView = useModelStore(s => s.setActiveView);
    const navigate = useNavigate();
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const [allRoles, setAllRoles] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const revision = model?.revision;

    useEffect(() => {
        if (!connected) return;
        let current = true;
        requestGuide(workspace ? model?.elements[workspace]?.name ?? workspace : null)
            .then(result => { if (current) setProblem(result.error ?? null); })
            .catch(error => { if (current) setProblem(error instanceof Error ? error.message : String(error)); });
        return () => { current = false; };
    }, [connected, workspace, revision]); // eslint-disable-line react-hooks/exhaustive-deps

    const shown = useMemo(() => stepsForRole(guide?.steps ?? [], allRoles ? null : role), [guide, role, allRoles]);
    const groups = useMemo(() => groupSteps(shown), [shown]);
    const next = nextStep(shown);
    const byId = new Map((guide?.steps ?? []).map(step => [step.id, step]));

    const open = (step: GuideStepStatus) => {
        const viewpoint = step.guideViewpoint ? model?.viewpoints?.find(v => v.name === step.guideViewpoint || v.id === step.guideViewpoint) : undefined;
        if (viewpoint) selectViewpoint(viewpoint.id);
        setActiveMode('diagram');
        setExplorerTab('views');
        setActiveView({ type: 'welcome' });
        // The viewpoints index has its own address; opening a step lands on it.
        navigate('/diagrams');
    };

    const chip = (state: GuideStepStatus['state']) => (
        <span style={{ fontSize: FONT.xs, fontWeight: 600, padding: '1px 8px', borderRadius: 10, color: STATE_STYLE[state].color, background: STATE_STYLE[state].background }}>
            {STATE_STYLE[state].label}
        </span>
    );

    return (
        <div data-testid="guide" style={{ flex: 1, overflow: 'auto', padding: '32px 40px', color: COLOR.primary, minHeight: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Guide</h1>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 12px', maxWidth: 780 }}>
                {guide?.workspace ? `${guide.workspace} (${guide.scope === 'sos' ? 'system of systems' : 'system'}). ` : 'The whole model. '}
                Each step is done when the elements it produces exist and the rules that finish it have something to judge and no finding. Choose a workspace above to see one system's steps.
                {role && !allRoles && ` Showing the steps for ${roleLabel(role)}.`}
            </p>
            {problem && <p data-testid="guide-problem" style={{ fontSize: FONT.sm, color: '#B42318' }}>{problem}</p>}
            {role && <label style={{ fontSize: FONT.xs, color: COLOR.muted }}><input type="checkbox" checked={allRoles} onChange={e => setAllRoles(e.target.checked)} /> Show every role's steps</label>}

            {guide && guide.steps.length > 0 && (
                <div data-testid="guide-next" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '12px 16px', margin: '14px 0', maxWidth: 900 }}>
                    {next ? (
                        <>
                            <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600 }}>NEXT STEP</div>
                            <div style={{ fontSize: FONT.md, fontWeight: 700 }}>{next.label ?? next.name}</div>
                            {next.objective && <div style={{ fontSize: FONT.sm, margin: '2px 0 6px' }}>{next.objective}</div>}
                            {next.reasons.length > 0 && <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Missing: {next.reasons.join('; ')}.</div>}
                            <button data-testid="open-next" onClick={() => open(next)} style={{ marginTop: 8, fontSize: FONT.xs, padding: '3px 10px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer' }}>Open {next.guideViewpoint ? words(next.guideViewpoint.replace(/^vp/, '')) : 'views'}</button>
                        </>
                    ) : <div style={{ fontSize: FONT.sm }}>No step is open: every step shown is done, blocked behind one that is not, or states no done criterion.</div>}
                </div>
            )}

            {groups.map(level => (
                <section key={level.level} data-testid="guide-level" style={{ marginTop: 22 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{words(level.level)}</h2>
                    {level.stages.map(stage => (
                        <div key={stage.stage} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{words(stage.stage)}</div>
                            {stage.steps.map(step => (
                                <div key={step.id} data-testid="guide-step" data-state={step.state} style={{ border: `1px solid ${COLOR.borderLight}`, borderRadius: 8, padding: '8px 14px', margin: '6px 0', maxWidth: 900 }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        {chip(step.state)}
                                        <strong>{step.label ?? step.name}</strong>
                                        {step.role && <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>{roleLabel(step.role)}</span>}
                                        <span style={{ flex: 1 }} />
                                        <button onClick={() => open(step)} style={{ fontSize: FONT.xs, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer' }}>Open</button>
                                    </div>
                                    {step.objective && <div style={{ fontSize: FONT.sm, margin: '4px 0' }}>{step.objective}</div>}
                                    <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                                        {step.outputs.map(o => `${o.kind}: ${o.count}${o.untracedImports > 0 ? ` (+${o.untracedImports} imported, not traced)` : ''}`).join(' · ')}
                                        {step.rules.length > 0 && step.rules.map(r => ` · ${r.rule}: ${!r.known ? 'not in the rule set' : r.subjects === 0 ? 'nothing to judge' : r.violations > 0 ? `${r.violations} finding(s)` : 'clean'}`).join('')}
                                    </div>
                                    {step.state === 'blocked' && <div style={{ fontSize: FONT.xs, color: '#92400E' }}>Waiting for: {step.blockedBy.map(id => byId.get(id)?.label ?? id).join(', ')}.</div>}
                                    {step.state === 'open' && step.reasons.length > 0 && <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Missing: {step.reasons.join('; ')}.</div>}
                                    {step.state === 'no-criterion' && <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>This step names no output and no rule, so it is not reported as done.</div>}
                                </div>
                            ))}
                        </div>
                    ))}
                </section>
            ))}
            {guide && guide.steps.length === 0 && !problem && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>The method has no steps.</p>}
            {!guide && !problem && <p style={{ fontSize: FONT.sm, color: COLOR.muted }}>Reading the method…</p>}
        </div>
    );
}

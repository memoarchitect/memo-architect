// @vitest-environment jsdom
//
// ─── The Guide page (A5) ─────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import { Guide } from '../views/Guide';
import { groupSteps, nextStep, stepsForRole, words, type GuideResult, type GuideStepStatus } from '../lib/guide-view';
import { useModelStore } from '../store/model-store';

const asked: Array<string | null | undefined> = [];
let answer: GuideResult;
vi.mock('../store/ws-client', () => ({
    requestGuide: async (workspace?: string | null) => { asked.push(workspace); useModelStore.getState().setGuide(answer); return answer; },
    sendUserPreferencesSave: () => undefined,
}));

const step = (name: string, over: Partial<GuideStepStatus> = {}): GuideStepStatus => ({
    id: `m::${name}`, name, label: name, inputKinds: [], outputKinds: [], doneWhen: [], linkedWhen: [], predecessors: [], methodology: 'm',
    state: 'open', outputs: [], rules: [], links: [], reasons: [], waiting: [], level: 'system', stage: 'risk', ...over,
});

describe('the Guide, for a role', () => {
    const steps = [
        step('ctx', { level: 'systemOfSystems', stage: 'context', state: 'done', role: 'projectLead' }),
        step('ops', { level: 'systemOfSystems', stage: 'operational', role: 'systemArchitect' }),
        step('risk', { role: 'safetyEngineer', state: 'waiting', waiting: ['MitigationRule waits for ops'] }),
        step('anyone', { stage: 'release' }),
    ];

    it('shows a role its own steps and those written for nobody, and every step with no role', () => {
        expect(stepsForRole(steps, 'safetyEngineer').map(s => s.name)).toEqual(['risk', 'anyone']);
        expect(stepsForRole(steps, null).map(s => s.name)).toEqual(['ctx', 'ops', 'risk', 'anyone']);
    });

    it('groups by level and then stage, in the method\'s order, and names the first open step next', () => {
        expect(groupSteps(steps).map(l => `${l.level}: ${l.stages.map(s => `${s.stage}(${s.steps.map(x => x.name)})`).join(' ')}`)).toEqual([
            'systemOfSystems: context(ctx) operational(ops)', 'system: risk(risk) release(anyone)',
        ]);
        expect(nextStep(steps)?.name).toBe('ops');
        expect(nextStep([steps[0], steps[2]])).toBeUndefined();
    });

    it('reads camel case as words', () => {
        expect(words('systemOfSystems')).toBe('System of systems');
        expect(words('humanFactors')).toBe('Human factors');
    });
});

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MemoryRouter, null, createElement(Guide))); });
    return container;
}
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 0)); });

beforeEach(() => {
    asked.length = 0;
    answer = {
        workspace: 'Pump', scope: 'system', methodologies: ['m'], roleViews: [],
        steps: [
            step('opsDone', { label: 'Operational', stage: 'operational', state: 'done', role: 'systemArchitect', outputs: [{ kind: 'UseCase', count: 2, untracedImports: 0 }] }),
            step('risk', { label: 'Risk', objective: 'Identify hazards.', role: 'safetyEngineer', outputs: [{ kind: 'Hazard', count: 0, untracedImports: 1 }], reasons: ['1 imported Hazard element(s) are not traced to anything'], guideViewpoint: 'vpRiskChain' }),
            step('verify', {
                label: 'Verify', stage: 'verificationStage', state: 'waiting', role: 'verificationEngineer', predecessors: ['m::risk'],
                outputs: [{ kind: 'VerificationCase', count: 1, untracedImports: 0 }],
                links: [{ rule: 'TargetRule', known: true, subjects: 0, violations: 0, state: 'waiting', waitingFor: ['m::risk'], unlinked: [] }],
                waiting: ['TargetRule waits for Risk'],
            }),
            step('allocate', {
                label: 'Logical', stage: 'logical', role: 'verificationEngineer',
                links: [{ rule: 'AllocationRule', known: true, subjects: 3, violations: 2, state: 'ready', waitingFor: [], unlinked: ['f1', 'f2'] }],
                reasons: ['AllocationRule: 2 not linked yet'],
            }),
            step('free', { label: 'Free step', stage: 'release', state: 'no-criterion' }),
        ],
        next: 'm::risk',
    } as GuideResult;
    useModelStore.setState({
        model: { elements: { 'p::Pump': { name: 'Pump' } }, relationships: [], errors: [], revision: 1, viewpoints: [{ id: 'VP-9', name: 'vpRiskChain', label: 'Risk', stakeholders: [], visibleKinds: [], visibleRelationships: [], visibleLayers: [] }] } as never,
        guide: null, role: null, workspace: 'p::Pump', connected: true, selectedViewpointId: null,
    });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('the Guide page', () => {
    it('asks about the workspace by name, and shows each step as done, open, waiting on another team or without a criterion', async () => {
        const view = render();
        await settle();
        expect(asked).toEqual(['Pump']);
        const rows = [...view.querySelectorAll('[data-testid="guide-step"]')].map(r => `${r.getAttribute('data-state')}: ${r.textContent}`);
        expect(rows[0]).toContain('done: DoneOperational');
        expect(rows[0]).toContain('UseCase: 2');
        expect(rows[1]).toContain('open: OpenRisk');
        expect(rows[1]).toContain('Hazard: 0 (+1 imported, not traced)');
        expect(rows[1]).toContain('Missing: 1 imported Hazard element(s) are not traced to anything');
        expect(rows[2]).toContain('waiting: Waiting on another teamVerify');
        expect(rows[2]).toContain('Links: TargetRule: waits for Risk');
        expect(rows[2]).toContain('Waiting on another team: TargetRule waits for Risk.');
        // The order is shown as what feeds a step, never as a gate.
        expect(rows[2]).toContain('Fed by: Risk.');
        expect(rows[3]).toContain('open: OpenLogical');
        expect(rows[3]).toContain('Links: AllocationRule: 2 ready to link');
        expect(rows[3]).toContain('Missing: AllocationRule: 2 not linked yet.');
        expect(rows[4]).toContain('no-criterion');
        expect(rows[4]).toContain('not reported as done');
    });

    it('names the next step and opens its viewpoint', async () => {
        const view = render();
        await settle();
        expect(view.querySelector('[data-testid="guide-next"]')!.textContent).toContain('Risk');
        expect(view.querySelector('[data-testid="guide-next"]')!.textContent).toContain('Identify hazards.');
        act(() => { (view.querySelector('[data-testid="open-next"]') as HTMLElement).click(); });
        expect(useModelStore.getState().selectedViewpointId).toBe('VP-9');
        expect(useModelStore.getState().activeMode).toBe('diagram');
    });

    it('shows a role the steps written for it, and every role\'s on request', async () => {
        useModelStore.setState({ role: 'safetyEngineer' });
        const view = render();
        await settle();
        const names = () => [...view.querySelectorAll('[data-testid="guide-step"]')].map(r => r.querySelector('strong')!.textContent);
        expect(names()).toEqual(['Risk', 'Free step']);
        act(() => { (view.querySelector('input[type="checkbox"]') as HTMLInputElement).click(); });
        expect(names()).toEqual(['Operational', 'Risk', 'Verify', 'Logical', 'Free step']);
    });

    it('says why when the method could not be evaluated', async () => {
        answer = { steps: [], methodologies: [], roleViews: [], error: 'no workspace is named "Pump"' } as GuideResult;
        const view = render();
        await settle();
        expect(view.querySelector('[data-testid="guide-problem"]')!.textContent).toContain('no workspace is named');
    });
});

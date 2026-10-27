// @vitest-environment jsdom
//
// ─── The Method panel ────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import { MethodPanel } from '../components/MethodPanel';
import { initiallyExpanded, newElement, notInASystem, planCreate } from '../lib/method-panel';
import type { GuideResult, GuideStepStatus } from '../lib/guide-view';
import { useModelStore } from '../store/model-store';

let answer: GuideResult;
vi.mock('../store/ws-client', () => ({
    requestGuide: async () => { useModelStore.getState().setGuide(answer); return answer; },
    sendUserPreferencesSave: () => undefined,
}));

const step = (name: string, over: Partial<GuideStepStatus> = {}): GuideStepStatus => ({
    id: `m::${name}`, name, label: name, inputKinds: [], outputKinds: [], doneWhen: [], linkedWhen: [], predecessors: [], methodology: 'm',
    state: 'open', outputs: [], rules: [], links: [], reasons: [], waiting: [], level: 'system', stage: 'logical', ...over,
});

const kinds = [
    { name: 'SystemFunction', label: 'System function', construct: 'action def', layer: 'functional', instanceCount: 1, viewpoints: [] },
    { name: 'LogicalComponent', label: 'Logical component', construct: 'part def', layer: 'logical', instanceCount: 0, viewpoints: [] },
    { name: 'MemoPart', label: 'Part', construct: 'part def', layer: 'core', instanceCount: 0, viewpoints: [], isAbstract: true },
    { name: 'Hazard', label: 'Hazard', construct: 'part def', layer: 'risk', instanceCount: 0, viewpoints: [] },
];
const model = {
    elements: {
        'p::fnSense': { id: 'p::fnSense', name: 'fnSense', kind: 'SystemFunction', layer: 'functional', file: 'model/functions.sysml', attributes: {} },
        'p::bus': { id: 'p::bus', name: 'bus', kind: 'Interface', layer: 'logical', file: 'model/logical.sysml', attributes: {} },
    },
    relationships: [], errors: [], revision: 1, viewpoints: [], registries: { kinds, relationships: [] },
} as never;

describe('what the Method panel offers', () => {
    it('writes a new element beside its system: in the workspace, its own kind\'s file, else the system\'s declaration', () => {
        const scoped = {
            ...(model as object),
            elements: {
                ...(model as { elements: object }).elements,
                'p::Pump': { id: 'p::Pump', name: 'Pump', kind: 'System', layer: 'logical', file: 'model/pump.sysml', attributes: {} },
                'p::fnOther': { id: 'p::fnOther', name: 'fnOther', kind: 'SystemFunction', layer: 'functional', file: 'model/other.sysml', attributes: {} },
            },
            workspaceMembership: { workspaces: [{ root: 'p::Pump', scope: 'system' }], membership: { 'p::Pump': ['p::Pump'], 'p::bus': ['p::Pump'] }, unassigned: [], definitionOf: {} },
        } as never;
        // The pump has no function of its own: the function goes beside the pump, not into another system's file.
        expect(planCreate(scoped, 'SystemFunction', 'p::Pump')?.file).toBe('model/pump.sysml');
        expect(planCreate(scoped, 'SystemFunction')?.file).toBe('model/functions.sysml');
    });

    it('creates a kind the ontology can instantiate, as a usage, where the model keeps that kind or its layer', () => {
        expect(planCreate(model, 'SystemFunction')).toEqual({ kind: 'SystemFunction', label: 'System function', construct: 'action', layer: 'functional', file: 'model/functions.sysml' });
        // No logical component yet: it goes where the logical layer already is.
        expect(planCreate(model, 'LogicalComponent')?.file).toBe('model/logical.sysml');
        expect(planCreate(model, 'MemoPart')).toBeUndefined();
        // Nothing of the kind or its layer: no file, so no write is offered.
        expect(planCreate(model, 'Hazard')).toMatchObject({ kind: 'Hazard', file: undefined });
        expect(planCreate(model, 'NoSuchKind')).toBeUndefined();
    });

    it('names the new element with a legal, unused SysML name, its id', () => {
        const plan = planCreate(model, 'SystemFunction')!;
        expect(newElement(model, { ...plan, file: plan.file! }, 'fn Sense')).toMatchObject({ id: 'fnSense2', name: 'fn Sense', kind: 'SystemFunction', construct: 'action', file: 'model/functions.sysml' });
    });

    it('lists the step\'s new elements that no system holds yet, only while a system is chosen', () => {
        const m = {
            ...(model as object),
            elements: { ...(model as { elements: object }).elements, 'p::fnNew': { id: 'p::fnNew', name: 'fnNew', kind: 'SystemFunction', layer: 'functional', file: 'model/pump.sysml', attributes: {} } },
            workspaceMembership: { workspaces: [{ root: 'p::Pump', scope: 'system' }, { root: 'p::Cell', scope: 'sos' }], membership: {}, unassigned: ['p::fnNew', 'p::bus'], definitionOf: {} },
        } as never;
        const functional = step('functional', { outputKinds: ['SystemFunction'] });
        expect(notInASystem(m, functional, 'p::Pump')).toEqual([{ id: 'p::fnNew', name: 'fnNew', kind: 'SystemFunction' }]);
        // The system of systems holds what no system does; the whole model has no system to join.
        expect(notInASystem(m, functional, 'p::Cell')).toEqual([]);
        expect(notInASystem(m, functional, null)).toEqual([]);
    });

    it('opens the next open step first', () => {
        const steps = [step('a', { state: 'done' }), step('b'), step('c')];
        expect(initiallyExpanded(steps, 'm::c')).toBe('m::c');
        expect(initiallyExpanded(steps)).toBe('m::b');
    });
});

let root: Root | null = null;
let container: HTMLElement | null = null;
const created: unknown[] = [];
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MemoryRouter, null, createElement(MethodPanel, { onClose: () => undefined }))); });
    return container;
}
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 0)); });

beforeEach(() => {
    created.length = 0;
    answer = {
        workspace: 'Pump', scope: 'system', methodologies: ['m'], roleViews: [],
        steps: [
            step('functional', { label: 'Functional', stage: 'functional', outputs: [{ kind: 'SystemFunction', count: 0, untracedImports: 0 }], reasons: ['no SystemFunction yet'] }),
            step('logical', {
                label: 'Logical', state: 'open', predecessors: ['m::functional'],
                outputs: [{ kind: 'LogicalComponent', count: 1, untracedImports: 0 }],
                links: [{ rule: 'AllocationRule', known: true, subjects: 1, violations: 1, state: 'ready', waitingFor: [], unlinked: ['p::fnSense'] }],
            }),
            step('risk', {
                label: 'Risk', stage: 'risk', state: 'waiting', outputs: [{ kind: 'LogicalComponent', count: 2, untracedImports: 0 }],
                links: [{ rule: 'MitigationRule', known: true, subjects: 0, violations: 0, state: 'waiting', waitingFor: ['m::functional'], unlinked: [] }],
            }),
        ],
        next: 'm::functional',
    } as GuideResult;
    useModelStore.setState({
        model, guide: null, role: null, workspace: null, connected: true, selectedElementId: null,
        createModelElement: ((element: { id: string }) => { created.push(element); return element.id; }) as never,
    });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('the Method panel', () => {
    it('shows each step with its state and opens the next one', async () => {
        const view = render();
        await settle();
        const steps = [...view.querySelectorAll('[data-testid="method-step"]')];
        expect(steps.map(s => s.getAttribute('data-state'))).toEqual(['open', 'open', 'waiting']);
        expect(view.querySelectorAll('[data-testid="method-step-body"]')).toHaveLength(1);
        expect(steps[0].textContent).toContain('System function: 0');
    });

    it('creates the step\'s output kind from a name, and the store writes it', async () => {
        const view = render();
        await settle();
        act(() => { (view.querySelector('[data-testid="method-new"]') as HTMLElement).click(); });
        const input = view.querySelector('[data-testid="method-new-name"]') as HTMLInputElement;
        act(() => {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
            setter.call(input, 'Detect occlusion');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        act(() => { (input.form as HTMLFormElement).requestSubmit(); });
        expect(created).toEqual([expect.objectContaining({ id: 'detectOcclusion', name: 'Detect occlusion', kind: 'SystemFunction', construct: 'action', file: 'model/functions.sysml' })]);
        expect(view.querySelector('[data-testid="method-message"]')!.textContent).toContain('Writing System function Detect occlusion into model/functions.sysml');
    });

    it('lists the elements still to link, each one selectable', async () => {
        const view = render();
        await settle();
        act(() => { (view.querySelectorAll('[data-testid="method-step"] > button')[1] as HTMLElement).click(); });
        const unlinked = view.querySelector('[data-testid="method-unlinked"]') as HTMLElement;
        expect(view.querySelector('[data-testid="method-link"]')!.textContent).toContain('AllocationRule: 1 ready to link');
        act(() => { unlinked.click(); });
        expect(useModelStore.getState().selectedElementId).toBe('p::fnSense');
    });

    it('goes from a waiting link to the step it waits for', async () => {
        const view = render();
        await settle();
        act(() => { (view.querySelectorAll('[data-testid="method-step"] > button')[2] as HTMLElement).click(); });
        expect(view.querySelector('[data-testid="method-link"]')!.textContent).toContain('MitigationRule: waits for Functional');
        act(() => { (view.querySelector('[data-testid="method-waits-for"]') as HTMLElement).click(); });
        const bodies = [...view.querySelectorAll('[data-testid="method-step"]')].map(s => !!s.querySelector('[data-testid="method-step-body"]'));
        expect(bodies).toEqual([true, false, false]);
    });
});

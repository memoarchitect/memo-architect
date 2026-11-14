// @vitest-environment jsdom
//
// ─── The method map (Pathways) ───────────────────────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, Simulate } from 'react-dom/test-utils';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { MethodMap } from '../views/MethodMap';
import type { GuideResult, GuideStepStatus } from '../lib/guide-view';
import { approvalsOf, continuePoint, layerRows, scopeTree, suppliedParts, type GuideLayer } from '../lib/pathways';
import { useModelStore } from '../store/model-store';

const asked: Array<string | null | undefined> = [];
const saved: unknown[] = [];
let answer: GuideResult;
vi.mock('../store/ws-client', () => ({
    requestGuide: async (workspace?: string | null) => { asked.push(workspace); useModelStore.getState().setGuide(answer); return answer; },
    sendUserPreferencesSave: (preferences: unknown) => { saved.push(preferences); },
}));

const step = (name: string, over: Partial<GuideStepStatus> = {}): GuideStepStatus => ({
    id: `m::${name}`, name, label: name, inputKinds: [], outputKinds: [], doneWhen: [], linkedWhen: [], predecessors: [], methodology: 'm',
    state: 'open', outputs: [], rules: [], links: [], reasons: [], waiting: [], level: 'system', stage: 'logical', ...over,
});
const layer = (name: string, axis: string, stages: string[], over: Partial<GuideLayer> = {}): GuideLayer => ({
    id: `m::${name}`, name, label: name, axis, stages, viewpoints: [], importable: false, methodology: 'm', ...over,
});

const guide = (): GuideResult => ({
    workspace: 'Arm', scope: 'system', methodologies: ['m'], roleViews: [],
    layers: [
        layer('Context', 'architecture', ['context'], { purpose: 'Who is around it.' }),
        layer('Logical', 'architecture', ['logical'], { purpose: 'How it works.', viewpoints: [{ id: 'm::vpLog', name: 'vpLog', label: 'Logical architecture', viewKind: 'general' }] }),
        layer('Risk', 'assurance', ['risk'], { purpose: 'What can go wrong.', standardReference: 'ISO 14971', linkDescription: 'controls in Logical', importable: true }),
    ],
    steps: [
        step('users', { stage: 'context', state: 'done', role: 'systemArchitect' }),
        step('components', { label: 'Name the components', state: 'done', role: 'systemArchitect' }),
        step('connect', { label: 'Connect the components', role: 'systemArchitect', exitCriteria: 'Every connection goes port to port.' }),
        step('hazards', { label: 'Identify the hazards', stage: 'risk', role: 'safetyEngineer' }),
        step('release', { stage: 'release', role: 'regulatoryEngineer' }),
    ],
    next: 'm::connect',
} as GuideResult);

describe('the method map, from the method', () => {
    it('lists each side\'s rows with the steps whose stage they name, and counts what is done', () => {
        const rows = layerRows(guide(), 'architecture');
        expect(rows.map(r => `${r.layer.label}: ${r.steps.map(s => s.name).join(',')} (${r.done})`)).toEqual([
            'Context: users (1)', 'Logical: components,connect (1)',
        ]);
        expect(layerRows(guide(), 'assurance').map(r => r.layer.label)).toEqual(['Risk']);
    });

    it('continues at the step last opened, else the first open one, numbered within its row', () => {
        const result = guide();
        expect(continuePoint(result, 'm::components', result.steps)).toMatchObject({ number: 1, of: 2, layer: { label: 'Logical' } });
        expect(continuePoint(result, null, result.steps)).toMatchObject({ number: 2, of: 2, step: { name: 'connect' } });
        // A step the method no longer has falls back to the first open one.
        expect(continuePoint(result, 'm::gone', result.steps)!.step.name).toBe('connect');
    });
});

const element = (id: string, over: Record<string, unknown> = {}) => ({ id, name: id.split('::').pop(), kind: 'K', construct: 'part', layer: 'l', file: 'f', attributes: {}, ...over });
const model = (): MemoModelDTO => ({
    elements: {
        'c::Cell': element('c::Cell', { isDefinition: true }),
        'c::Cell::arm': element('c::Cell::arm', { owner: 'c::Cell' }),
        'c::Cell::eye': element('c::Cell::eye', { owner: 'c::Cell' }),
        'c::Arm': element('c::Arm', { isDefinition: true }),
        'c::Arm::relay': element('c::Arm::relay', { owner: 'c::Arm' }),
        'c::Eye': element('c::Eye', { isDefinition: true }),
        'c::Lab': element('c::Lab', { isDefinition: true, attributes: { origin: 'memo::SystemOriginKind::external' } }),
        'lib::Relay': element('lib::Relay', { isDefinition: true, provenance: { declaration: { origin: 'dependency' } } }),
        'd::fda': element('d::fda', { kind: 'RegulatedDevice', attributes: { jurisdiction: 'memo::RegulatoryRegimeKind::FDA_510k' } }),
    },
    relationships: [], errors: [], revision: 1,
    registries: { kinds: [{ name: 'RegulatedDevice' }] } as never,
    workspaceMembership: {
        workspaces: [{ root: 'c::Cell', scope: 'sos', name: 'Cell' }, { root: 'c::Arm', scope: 'system', name: 'Arm' }, { root: 'c::Eye', scope: 'system', name: 'Eye' }, { root: 'c::Lab', scope: 'system', name: 'Lab' }],
        membership: { 'c::Arm::relay': ['c::Arm'] }, shared: [], unassigned: ['d::fda'],
        definitionOf: { 'c::Cell::arm': 'c::Arm', 'c::Cell::eye': 'c::Eye', 'c::Arm::relay': 'lib::Relay' }, missingSystem: false,
    },
} as unknown as MemoModelDTO);

describe('the scope', () => {
    it('is a tree of the workspaces, a system of systems holding the systems its parts are typed by, with external systems apart', () => {
        const tree = scopeTree(model());
        expect(tree.roots.map(r => `${r.name}: ${r.children.map(c => c.name).join(',')}`)).toEqual(['Cell: Arm,Eye']);
        expect(tree.external.map(e => e.name)).toEqual(['Lab']);
    });

    it('names the parts designed elsewhere: typed by a definition from a dependency package', () => {
        expect(suppliedParts(model(), 'c::Arm').map(p => p.name)).toEqual(['Relay']);
        expect(suppliedParts(model(), 'c::Eye')).toEqual([]);
    });

    it('says an approval that covers no release is tied to no system yet', () => {
        expect(approvalsOf(model(), 'c::Arm')).toMatchObject({ own: [], untied: [{ name: 'fda', jurisdiction: 'FDA_510k' }] });
    });
});

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MemoryRouter, null, createElement(MethodMap))); });
    return container;
}
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 0)); });
const click = (view: HTMLElement, id: string) => act(() => { (view.querySelector(`[data-testid="${id}"]`) as HTMLElement).click(); });

beforeEach(() => {
    asked.length = 0;
    saved.length = 0;
    answer = guide();
    useModelStore.setState({
        model: model() as never,
        guide: null, preferencesLoaded: true, role: null, workspace: 'c::Arm', connected: true, pathways: true, lastStep: null,
    });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('the method map page', () => {
    it('asks for the chosen system\'s method and shows its rows on Qt-style tabs, starting anywhere', async () => {
        const view = render();
        await settle();
        expect(asked).toEqual(['Arm']);
        expect(view.querySelector('[data-testid="map-scope"]')!.textContent).toContain('Cell ▸ Arm');
        const rows = [...view.querySelectorAll('[data-testid="map-row"]')];
        expect(rows.map(r => r.getAttribute('data-row'))).toEqual(['Context', 'Logical']);
        expect(rows[1].textContent).toContain('views: logical architecture');
        expect(rows[1].textContent).toContain('1 of 2');
        expect(rows[1].querySelector('[data-testid="row-open"]')!.textContent).toBe('Continue');
        click(view, 'map-tab-assurance');
        const risk = view.querySelector('[data-testid="map-row"]')!;
        expect(risk.textContent).toContain('What can go wrong. · ISO 14971');
        expect(risk.textContent).toContain('Links: controls in Logical');
        expect(risk.querySelector('[data-testid="row-open"]')!.textContent).toBe('Start here');
    });

    it('returns from a system to the whole model and re-evaluates the guide', async () => {
        const view = render();
        await settle();
        click(view, 'scope-whole-model');
        await settle();
        expect(useModelStore.getState().workspace).toBeNull();
        expect(asked.at(-1)).toBeNull();
        expect(saved.at(-1)).not.toHaveProperty('workspace');
        expect(view.querySelector('[data-testid="scope-whole-model"]')!.getAttribute('aria-pressed')).toBe('true');
        expect(view.querySelector('[data-testid="map-scope"]')!.textContent).toContain('the whole model');
        act(() => (view.querySelector('[data-root="c::Eye"]') as HTMLElement).click());
        await settle();
        expect(useModelStore.getState().workspace).toBe('c::Eye');
        expect(saved.at(-1)).toMatchObject({ workspace: 'c::Eye' });
        expect(view.querySelectorAll('[data-testid="scope-node"][aria-pressed="true"]')).toHaveLength(1);
        expect(view.querySelector('[data-testid="scope-whole-model"]')!.getAttribute('aria-pressed')).toBe('false');
    });

    it('filters system choices with ancestor context and keeps Whole model available', async () => {
        const view = render();
        await settle();
        const input = view.querySelector('input[aria-label="Filter systems"]') as HTMLInputElement;
        const filter = (value: string) => act(() => { input.value = value; Simulate.change(input); });
        filter(' eYe ');
        expect([...view.querySelectorAll('[data-testid="scope-node"]')].map(node => node.getAttribute('data-root'))).toEqual(['c::Cell', 'c::Eye']);
        expect(useModelStore.getState().workspace).toBe('c::Arm');
        expect(view.querySelector('[data-testid="map-scope"]')!.textContent).toContain('Arm');
        filter('LAB');
        expect(view.querySelectorAll('[data-testid="scope-node"]')).toHaveLength(0);
        expect(view.querySelector('[data-testid="scope-external"]')!.textContent).toContain('Lab');
        filter('missing system');
        expect(view.querySelector('[role="status"]')!.textContent).toBe('No systems match.');
        click(view, 'scope-whole-model');
        expect(useModelStore.getState().workspace).toBeNull();
    });

    it('minimizes the selector without changing scope and reopens it from the current choice', async () => {
        const view = render();
        await settle();
        const input = view.querySelector('input[aria-label="Filter systems"]') as HTMLInputElement;
        act(() => { input.value = 'arm'; Simulate.change(input); });
        click(view, 'scope-minimize');
        expect(view.querySelector('[data-testid="scope-tree"]')).toBeNull();
        const choice = view.querySelector('[data-testid="map-scope"]')!;
        expect(choice.textContent).toContain('Arm');
        expect(choice.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(choice);
        expect(useModelStore.getState().workspace).toBe('c::Arm');
        click(view, 'map-scope');
        expect(view.querySelector('[data-testid="scope-tree"]')).not.toBeNull();
        expect((view.querySelector('input[aria-label="Filter systems"]') as HTMLInputElement).value).toBe('arm');
        expect(choice.getAttribute('aria-expanded')).toBe('true');
    });

    it('continues at the next step, remembers the step opened, and hides the guidance with Pathways off', async () => {
        const view = render();
        await settle();
        expect(view.querySelector('[data-testid="continue-card"]')!.textContent).toContain('Logical · step 2 of 2: Connect the components');
        expect(view.querySelector('[data-testid="continue-card"]')!.textContent).toContain('Done when: every connection goes port to port.');
        click(view, 'continue');
        expect(useModelStore.getState().lastStep).toBe('m::connect');
        expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'Logical' });
        expect(saved.at(-1)).toMatchObject({ lastStep: 'm::connect', workspace: 'c::Arm' });
        act(() => useModelStore.getState().setPathways(false));
        expect(view.querySelector('[data-testid="continue-card"]')).toBeNull();
        expect(saved.at(-1)).toMatchObject({ pathways: false });
    });

    it('opens a row even when the method declares no steps in it', async () => {
        answer.layers.push(layer('Empty / row', 'architecture', ['empty']));
        const view = render();
        await settle();
        const row = view.querySelector('[data-row="Empty / row"]') as HTMLElement;
        click(row, 'row-open');
        expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'Empty / row' });
    });

    it('opens Start here in the row and remembers its first step', async () => {
        const view = render();
        await settle();
        click(view, 'map-tab-assurance');
        click(view, 'row-open');
        expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'Risk' });
        expect(useModelStore.getState().lastStep).toBe('m::hazards');
    });

    it('shows my work only: the rows with a step for my role', async () => {
        useModelStore.setState({ role: 'safetyEngineer' });
        const view = render();
        await settle();
        click(view, 'show-mine');
        expect(view.querySelectorAll('[data-testid="map-row"]')).toHaveLength(0);
        click(view, 'map-tab-assurance');
        expect([...view.querySelectorAll('[data-testid="map-row"]')].map(r => r.getAttribute('data-row'))).toEqual(['Risk']);
    });

    it('lists the boundary and the supplied parts, and ends the confidence strip in the design history', async () => {
        const view = render();
        await settle();
        expect(view.querySelector('[data-testid="scope-external"]')!.textContent).toContain('Lab');
        expect(view.querySelector('[data-testid="scope-supplied"]')!.textContent).toContain('Relay');
        expect(view.querySelector('[data-testid="strip-history"]')!.textContent).toContain('of Arm · no approval yet');
        click(view, 'strip-history');
        expect(view.querySelector('[data-testid="history-empty"]')!.textContent).toContain('Arm has no approval yet');
        expect(view.querySelector('[data-testid="history-untied"]')!.textContent).toContain('fda (FDA_510k)');
    });

    it('gives a system of systems no design history of its own', async () => {
        useModelStore.setState({ workspace: 'c::Cell' });
        const view = render();
        await settle();
        click(view, 'map-tab-history');
        expect(view.querySelector('[data-testid="history-sos"]')!.textContent).toContain('Cell, the system of systems, has no design history of its own');
    });
});

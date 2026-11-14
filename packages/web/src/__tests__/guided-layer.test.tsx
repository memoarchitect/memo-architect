// @vitest-environment jsdom
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { GuidedLayer } from '../views/GuidedLayer';
import { PathwaysEntry } from '../components/PathwaysEntry';
import type { GuideResult, GuideStepStatus } from '../lib/guide-view';

let answer: GuideResult;
vi.mock('../store/ws-client', () => ({ requestGuide: async () => { useModelStore.getState().setGuide(answer); return answer; }, sendUserPreferencesSave: vi.fn() }));
vi.mock('../views/DiagramEditor', () => ({ DiagramEditor: ({ diagramId }: { diagramId: string }) => createElement('div', { 'data-testid': 'editor' }, `${diagramId}:${useModelStore.getState().selectedDiagramId}`) }));
vi.mock('../components/AddRelationshipDialog', () => ({ AddRelationshipDialog: ({ element }: { element: { name: string } }) => createElement('div', { 'data-testid': 'relationship-dialog' }, element.name) }));
vi.mock('../components/AppDialogs', () => ({ askText: async () => 'A new function' }));
const step = (id: string, over: Partial<GuideStepStatus> = {}): GuideStepStatus => ({ id, name: id, label: `Work ${id}`, stage: 'work', level: 'system', inputKinds: [], outputKinds: ['Function'], doneWhen: [], linkedWhen: [], objective: `Objective ${id}`, exitCriteria: `Criteria ${id}`, predecessors: [], methodology: 'm', state: 'open', outputs: [], rules: [], links: [], reasons: [], waiting: [], ...over });
const viewpoints = [{ id: 'catalog::vpWork', name: 'vpWork', label: 'Work architecture', viewKind: 'general' }, { id: 'library::vpExisting', name: 'vpExisting', label: 'Existing work', viewKind: 'general' }];
const baseGuide = (): GuideResult => ({ scope: 'system', workspace: 'Host', methodologies: ['m'], roleViews: [], layers: [
    { id: 'm::layerWork', name: 'layerWork', label: 'Functional', axis: 'architecture', stages: ['work'], viewpoints, importable: false, methodology: 'm' },
    { id: 'm::layerRisk', name: 'layerRisk', label: 'Safety and risk', axis: 'assurance', stages: ['risk'], viewpoints: [viewpoints[0]], importable: true, methodology: 'm' },
], steps: [step('one', { inputKinds: ['Scenario'], guideViewpoint: 'vpWork' }), step('two', { outputKinds: ['Chain'] }), step('three'), step('risk', { stage: 'risk', inputKinds: ['Scenario'] })] });
const element = (id: string, kind: string, name = id) => ({ id, kind, name, construct: 'action', package: 'project', file: 'model/project.sysml', layer: 'work', attributes: {} });
const model = (): MemoModelDTO => ({ elements: { host: element('host', 'System', 'Host'), other: element('other', 'System', 'Other'), fn: element('fn', 'Function', 'Compute signal'), scenario: element('scenario', 'Scenario', 'Measure a sample'), foreign: element('foreign', 'Function', 'Elsewhere') }, relationships: [], errors: [], revision: 1,
    registries: { kinds: [{ name: 'Function', label: 'System function' }, { name: 'Scenario', label: 'Scenario' }, { name: 'Chain', label: 'Functional flow' }], relationships: [] },
    viewpoints: [{ id: 'existing', name: 'vpExisting', label: 'Work', visibleKinds: [], visibleRelationships: [], visibleLayers: [] }],
    diagrams: [{ id: 'first', name: 'Existing decomposition', viewpointId: 'existing', diagramType: 'bdd', elementIds: ['fn'], auto: false }, { id: 'second', name: 'Existing exchanges', viewpointId: 'existing', diagramType: 'afd', elementIds: ['fn'], auto: false }, { id: 'foreign-view', name: 'Other system view', viewpointId: 'existing', diagramType: 'bdd', elementIds: ['foreign'], auto: false }],
    workspaceMembership: { workspaces: [{ root: 'host', name: 'Host', scope: 'system' }, { root: 'other', name: 'Other', scope: 'system' }], membership: { host: ['host'], other: ['other'], fn: ['host'], scenario: ['host'], foreign: ['other'] }, shared: [], unassigned: [], definitionOf: {}, missingSystem: false },
} as unknown as MemoModelDTO);
let container: HTMLElement;
let root: Root;
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
function Page() { const view = useModelStore(s => s.activeView); const location = useLocation(); return <><span data-testid="location">{location.pathname}{location.search}</span><GuidedLayer layer={view.type === 'pathway' ? view.layer : 'layerWork'} /></>; }
const render = async () => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(<MemoryRouter initialEntries={['/method/layerWork']}><Page /></MemoryRouter>)); await settle(); };
const buttons = (text: string) => [...container.querySelectorAll('button')].filter(button => button.textContent?.trim() === text);
const click = async (text: string) => { act(() => buttons(text)[0].click()); await settle(); };
const choose = async (label: string, value: string) => { const select = container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement; act(() => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); await settle(); };
beforeEach(() => { answer = baseGuide(); window.__MEMO_FLAGS__ = { experimental: true }; useModelStore.setState({ model: model(), guide: answer, workspace: 'host', connected: true, preferencesLoaded: true, pathways: true, lastStep: null, pinned: null, activeView: { type: 'pathway', layer: 'layerWork' }, selectedDiagramId: null }); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.restoreAllMocks(); });
describe('the guided layer workspace', () => {
    it('opens an existing scoped view in the editor and switches tabs without leaving the layer', async () => {
        await render();
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first');
        expect(container.textContent).not.toContain('Other system view');
        expect(container.textContent).not.toContain('being built');
        await click('Existing exchanges');
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('second:second');
        expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'layerWork', diagramId: 'second' });
        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/method/layerWork?view=second');
    });
    it('shows objectives and exit criteria, and advances or skips without marking steps done', async () => {
        await render(); expect(container.textContent).toContain('Objective one'); expect(container.textContent).toContain('Criteria one');
        await click('Next step ›'); expect(useModelStore.getState().lastStep).toBe('two');
        await click('Skip for now'); expect(useModelStore.getState().lastStep).toBe('three');
        expect(buttons('Next step ›')[0].disabled).toBe(true);
        expect(answer.steps[0].state).toBe('open');
    });
    it('switches layers and offers import and existing input elements on an empty row', async () => {
        await render(); await choose('Layer', 'layerRisk');
        expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'layerRisk' });
        expect(container.textContent).toContain('Start here'); expect(container.textContent).toContain('Measure a sample');
        await click('Import…'); expect(useModelStore.getState().activeView.type).toBe('import');
    });
    it('creates a native view with method-derived palette types and retains the guided route', async () => {
        const create = vi.fn(async (_options: unknown) => { const current = useModelStore.getState().model!; useModelStore.setState({ model: { ...current, viewpoints: [...current.viewpoints!, { id: 'catalog', name: 'vpWork', label: 'Work', visibleKinds: [], visibleRelationships: [], visibleLayers: [] }], diagrams: [...current.diagrams!, { id: 'created', name: 'New view', viewpointId: 'catalog', diagramType: 'bdd', elementIds: ['host'], auto: false }] } }); return 'created'; });
        const previous = useModelStore.getState().createDiagram; useModelStore.setState({ createDiagram: create });
        try { await render(); await click('New work architecture view');
            expect(create).toHaveBeenCalledWith(expect.objectContaining({ viewpointId: 'catalog::vpWork', elementIds: ['host'], elementKinds: ['Scenario', 'Function', 'Chain'], properties: { autoPopulate: 'false' }, activate: false }));
            expect(create.mock.calls[0][0]).not.toHaveProperty('id');
            expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'layerWork', diagramId: 'created' });
            expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('created:created');
        } finally { useModelStore.setState({ createDiagram: previous }); }
    });
    it('shows a creation diagnostic without replacing the open editor', async () => {
        const previous = useModelStore.getState().createDiagram;
        useModelStore.setState({ createDiagram: async options => { options.onError?.('The compiler rejected the declaration.'); return undefined; } });
        try { await render(); await click('New work architecture view'); expect(container.textContent).toContain('The compiler rejected the declaration.'); expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first'); }
        finally { useModelStore.setState({ createDiagram: previous }); }
    });
    it('offers a clear route from the dashboard into Pathways', async () => {
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        act(() => root.render(<MemoryRouter><PathwaysEntry /></MemoryRouter>));
        await click('Open Method map');
        expect(useModelStore.getState().activeView).toEqual({ type: 'guide' });
    });

    it('requires a chosen system for a new view and lets the working scope reset', async () => {
        await render(); await choose('Working scope', ''); await click('New work architecture view');
        expect(container.textContent).toContain('Choose a system above before creating a view.');
        expect(useModelStore.getState().workspace).toBeNull();
    });
    it('shows ready elements by name and waiting work by step label, and opens the relationship dialog', async () => {
        answer.steps[0].links = [{ rule: 'Allocate', known: true, subjects: 1, violations: 1, state: 'ready', unlinked: ['fn'], waitingFor: [] }, { rule: 'Trace', known: true, subjects: 0, violations: 0, state: 'waiting', unlinked: [], waitingFor: ['two'] }];
        await render(); expect(container.textContent).toContain('Compute signal'); expect(container.textContent).toContain('Waiting for Work two.');
        await click('Add link…'); expect(container.querySelector('[data-testid="relationship-dialog"]')?.textContent).toBe('Compute signal');
    });
    it('offers free modelling, existing work and the editor when Pathways is switched off', async () => {
        useModelStore.setState({ pathways: false }); await render();
        expect(container.querySelector('[data-testid="guide-rail"]')).toBeNull();
        expect(container.textContent).toContain('Your work'); expect(container.textContent).toContain('Compute signal');
        expect(buttons('+ System function')).toHaveLength(2);
        expect(container.querySelector('[data-testid="editor"]')).not.toBeNull();
    });
    it('minimizes guidance and viewpoints without changing the active editor', async () => {
        await render(); await click('Hide guidance'); await click('Hide viewpoints');
        expect(container.querySelector('[data-testid="guide-rail"]')).toBeNull();
        expect(container.querySelector('[aria-label="Viewpoints in this layer"]')).toBeNull();
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first');
    });
});

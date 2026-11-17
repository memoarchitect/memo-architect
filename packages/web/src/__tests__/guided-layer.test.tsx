// @vitest-environment jsdom
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { useDiagramDisplayModel } from '../diagram/display-scope';
import { GuidedLayer } from '../views/GuidedLayer';
import { sendElementCreate } from '../store/ws-client';
import { PathwaysEntry } from '../components/PathwaysEntry';
import type { GuideResult, GuideStepStatus } from '../lib/guide-view';

let answer: GuideResult;
vi.mock('../store/ws-client', () => ({ requestGuide: async () => { useModelStore.getState().setGuide(answer); return answer; }, sendUserPreferencesSave: vi.fn(), sendElementCreate: vi.fn(async () => ({ success: true, elementId: 'canonicalComponentFunction' })) }));
vi.mock('../views/DiagramEditor', () => ({ DiagramEditor: ({ diagramId }: { diagramId: string }) => createElement('div', { 'data-testid': 'editor' }, `${diagramId}:${useModelStore.getState().selectedDiagramId}:${Object.keys(useDiagramDisplayModel()?.elements ?? {}).join(',')}`) }));
vi.mock('../components/AddRelationshipDialog', () => ({ AddRelationshipDialog: ({ element }: { element: { name: string } }) => createElement('div', { 'data-testid': 'relationship-dialog' }, element.name) }));
vi.mock('../components/AppDialogs', () => ({ askText: async () => 'A new function' }));
const step = (id: string, over: Partial<GuideStepStatus> = {}): GuideStepStatus => ({ id, name: id, label: `Work ${id}`, stage: 'work', level: 'system', inputKinds: [], outputKinds: ['Function'], doneWhen: [], linkedWhen: [], objective: `Objective ${id}`, exitCriteria: `Criteria ${id}`, predecessors: [], methodology: 'm', state: 'open', outputs: [], rules: [], links: [], reasons: [], waiting: [], ...over });
const viewpoints = [{ id: 'catalog::vpWork', name: 'vpWork', label: 'Work architecture', viewKind: 'general' }, { id: 'library::vpExisting', name: 'vpExisting', label: 'Existing work', viewKind: 'general' }];
const baseGuide = (): GuideResult => ({ scope: 'system', workspace: 'Host', methodologies: ['m'], roleViews: [], layers: [
    { id: 'm::layerWork', name: 'layerWork', label: 'Functional', axis: 'architecture', stages: ['work'], elementKinds: ['Function', 'Chain'], viewpoints, importable: false, methodology: 'm' },
    { id: 'm::layerRisk', name: 'layerRisk', label: 'Safety and risk', axis: 'assurance', stages: ['risk'], viewpoints: [viewpoints[0]], importable: true, methodology: 'm' },
], steps: [step('one', { inputKinds: ['Scenario'], guideViewpoint: 'vpWork' }), step('two', { outputKinds: ['Chain'] }), step('three'), step('risk', { stage: 'risk', inputKinds: ['Scenario'] })] });
const element = (id: string, kind: string, name = id) => ({ id, kind, name, construct: 'action' as const, package: 'project', file: 'model/project.sysml', layer: 'work', attributes: {} });
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
const buttons = (text: string) => [...container.querySelectorAll('button')].filter(button => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === text);
const click = async (text: string) => { act(() => buttons(text)[0].click()); await settle(); };
const choose = async (label: string, value: string) => { const select = container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement; act(() => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); await settle(); };
beforeEach(() => { answer = baseGuide(); window.__MEMO_FLAGS__ = { experimental: true }; useModelStore.setState({ model: model(), guide: answer, workspace: 'host', connected: true, preferencesLoaded: true, lastStep: null, pinned: null, activeView: { type: 'pathway', layer: 'layerWork' }, selectedDiagramId: null }); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.restoreAllMocks(); });
function prepareFunctionalWorkbench() {
        const next = model();
        next.registries!.kinds.push({ name: 'MemoFunction' } as never, { name: 'SystemFunction', superType: 'MemoFunction' } as never,
            { name: 'ComponentFunction', superType: 'MemoFunction' } as never, { name: 'FunctionalFlow', superType: 'MemoFunction' } as never, { name: 'LogicalComponent' } as never);
        next.elements.fn = { ...next.elements.fn, kind: 'SystemFunction', parentAction: 'root' };
        next.elements.root = element('root', 'SystemFunction', 'System purpose');
        next.elements.implementation = { ...element('implementation', 'ComponentFunction', 'Calculate signal'), parentAction: 'root' };
        next.elements.controller = { ...element('controller', 'LogicalComponent', 'Controller'), owner: 'host' };
        next.elements.flow = { ...element('flow', 'FunctionalFlow', 'Run measurement'), parentAction: 'root' };
        next.elements.step = { ...element('step', 'SystemFunction', 'Measure here'), parentAction: 'flow' };
        for (const id of ['root', 'implementation', 'controller', 'flow', 'step']) next.workspaceMembership!.membership[id] = ['host'];
        next.relationships.push(...[
            { id: 'root-link', type: 'functionalRoot', sourceId: 'host', targetId: 'root' },
            { id: 'fn-child', type: 'composes', sourceId: 'root', targetId: 'fn' },
            { id: 'flow-child', type: 'composes', sourceId: 'root', targetId: 'flow' },
            { id: 'step-child', type: 'composes', sourceId: 'flow', targetId: 'step' },
            { id: 'implementation-child', type: 'composes', sourceId: 'root', targetId: 'implementation' },
            { id: 'reuse', type: 'subsets', sourceId: 'step', targetId: 'fn' },
            { id: 'realization', type: 'realizes', sourceId: 'implementation', targetId: 'fn' },
            { id: 'allocation', type: 'allocatedTo', sourceId: 'implementation', targetId: 'controller' },
        ] as never[]);
        answer.layers[0].workbench = 'functional';
        answer.layers[0].tasks = [
            { id: 'tree', kind: 'decomposition', label: 'Function tree', primary: true, subjectKind: 'SystemFunction', viewpoint: viewpoints[0] },
            { id: 'flows', kind: 'sequence', label: 'Function flows', primary: true, subjectKind: 'FunctionalFlow', referenceKind: 'SystemFunction', viewpoint: { id: 'catalog::vpFlow', name: 'vpFlow', label: 'Flow', viewKind: 'actionflow' } },
            { id: 'realize', kind: 'realization', label: 'Realization', primary: false, subjectKind: 'SystemFunction', implementationKind: 'ComponentFunction', allocationKind: 'LogicalComponent' },
        ];
        useModelStore.setState({ model: next });
}
describe('the guided layer workspace', () => {
    it('presents method-defined functional tasks and a contextual realization chain', async () => {
        prepareFunctionalWorkbench(); await render();
        expect(container.querySelector('[data-testid="functional-workbench"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="guide-rail"]')).toBeNull();
        expect(container.querySelector('[aria-label="Functional tree"]')!.textContent).not.toContain('Measure here');
        await click('Compute signal');
        expect(container.querySelector('[aria-label="Current functional task"]')!.textContent).toContain('Calculate signal → Controller');
        await click('Function flows'); await click('Run measurement');
        expect(container.querySelector('[aria-label="Current functional task"]')!.textContent).toContain('Compute signal');
        expect(useModelStore.getState().activeView).toMatchObject({ type: 'pathway', layer: 'layerWork' });
    });

    it('says that setting up the parent places existing functions under it as references', async () => {
        prepareFunctionalWorkbench();
        const next = useModelStore.getState().model!;
        useModelStore.setState({ model: { ...next, relationships: next.relationships.filter(edge => edge.type !== 'functionalRoot') } });
        await render();
        const card = [...container.querySelectorAll('h2')].find(heading => heading.textContent === 'Set up the function tree')?.parentElement;
        expect(card?.textContent).toMatch(/placed under it as references/);
    });

    it('records a selection made inside the workbench in the address without reopening the workbench', async () => {
        prepareFunctionalWorkbench(); await render();
        const filter = container.querySelector('input[aria-label="Filter functions"]') as HTMLInputElement;
        act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(filter, 'Compute'); filter.dispatchEvent(new Event('input', { bubbles: true })); }); await settle();
        await click('Compute signal');
        const view = useModelStore.getState().activeView;
        expect(view.type === 'pathway' && view.artifactId).toBe('fn');
        expect((container.querySelector('input[aria-label="Filter functions"]') as HTMLInputElement).value).toBe('Compute');
        expect(container.querySelector('[aria-label="Current functional task"] h2')?.textContent).toBe('Compute signal');
    });

    it('keeps work linked to a function apart from work linked to one use of it in a flow', async () => {
        prepareFunctionalWorkbench();
        const before = useModelStore.getState().model!;
        useModelStore.setState({ model: { ...before,
            elements: { ...before.elements, direct: element('direct', 'Scenario', 'Check the sample'), viaStep: element('viaStep', 'Scenario', 'Report the reading') },
            operationalLevels: { direct: 'system', viaStep: 'system' },
            relationships: [...before.relationships, { id: 'direct-performs', type: 'performs', sourceId: 'direct', targetId: 'fn' }, { id: 'step-performs', type: 'performs', sourceId: 'viaStep', targetId: 'step' }],
        } as never });
        await render(); await click('Compute signal');
        const related = container.querySelector('[aria-label="Related operational work"]')!;
        expect(related.textContent).toContain('Activities that perform this function directly');
        const occurrences = related.querySelector('[aria-label="Operational work linked to a flow step"]')!;
        expect(occurrences.textContent).toContain('Report the reading');
        expect(occurrences.textContent).toContain('Measure here');
        expect(occurrences.textContent).toContain('Run measurement');
        expect(occurrences.textContent).not.toContain('Check the sample');
        expect(related.textContent).toContain('Check the sample');
    });

    it('opens exact scoped endpoints from Functional and Logical', async () => {
        prepareFunctionalWorkbench();
        answer.layers.push({ ...answer.layers[0], id: 'logical', name: 'layerLogical', label: 'Logical', workbench: undefined, tasks: [] });
        await render();
        await click('Compute signal');
        await click('Calculate signal');
        const logical = container.querySelector('[aria-label="Selected responsibility"]')!;
        expect(logical.textContent).toContain('Allocated to Controller');
        expect(logical.textContent).toContain('Linked');
        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/method/layerLogical?artifact=implementation&workspace=host');
        await click('Compute signal');
        expect(container.querySelector('[aria-label="Current functional task"] h2')?.textContent).toBe('Compute signal');
        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/method/layerWork?artifact=fn&workspace=host');
    });

    it('switches between function BDDs, flow activity diagrams and the step table', async () => {
        prepareFunctionalWorkbench();
        const originalCreate = useModelStore.getState().createDiagram;
        const createDiagram = vi.fn(async ({ diagramType }: { diagramType: string }) => diagramType);
        useModelStore.setState({ createDiagram });
        try {
            await render();
            await click('Visual');
            expect(createDiagram).not.toHaveBeenCalled();
            await click('Create diagram');
            expect(createDiagram).toHaveBeenLastCalledWith(expect.objectContaining({
                diagramType: 'bdd', elementIds: ['root', 'fn'],
                properties: { autoPopulate: 'false', layoutHint: 'tree', styleHint: 'expanded:root' },
            }));
            await click('Function flows');
            expect(buttons('Visual')[0].getAttribute('aria-pressed')).toBe('true');
            expect(createDiagram).toHaveBeenCalledTimes(1);
            await click('Create diagram');
            expect(createDiagram).toHaveBeenLastCalledWith(expect.objectContaining({ diagramType: 'afd', elementIds: ['flow', 'step'] }));
            await click('Table');
            await click('Run measurement');
            expect(container.querySelector('table')?.textContent).toContain('Compute signal');
        } finally {
            useModelStore.setState({ createDiagram: originalCreate });
        }
    });

    it('clears an existing allocation when starting a new component function', async () => {
        prepareFunctionalWorkbench(); await render(); await click('Compute signal');
        await click('Use existing component function');
        const implementation = container.querySelector('[aria-label="Current functional task"] select') as HTMLSelectElement;
        act(() => { implementation.value = 'implementation'; implementation.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
        expect((container.querySelectorAll('[aria-label="Current functional task"] select')[1] as HTMLSelectElement).disabled).toBe(true);
        await click('Cancel'); await click('+ Component function');
        const allocation = container.querySelector('[aria-label="Current functional task"] select') as HTMLSelectElement;
        expect(allocation.disabled).toBe(false); expect(allocation.value).toBe('');
    });

    it('ignores late save selection after switching functional tasks', async () => {
        prepareFunctionalWorkbench(); await render(); await click('+ Function');
        let finish!: (value: never) => void;
        vi.mocked(sendElementCreate).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const form = container.querySelector('[aria-label="Current functional task"] form')!;
        act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle();
        await click('Function flows');
        await act(async () => { finish({ success: true, elementId: 'fn' } as never); }); await settle();
        expect(container.querySelector('[aria-label="Current functional task"]')!.textContent).not.toContain('Compute signal');
        expect(container.querySelector('[role="status"]')).toBeNull();
        expect(buttons('Function flows')[0].getAttribute('aria-pressed')).toBe('true');
    });

    it('waits for the saved realization to arrive before enabling another write', async () => {
        prepareFunctionalWorkbench(); await render(); await click('Compute signal'); await click('+ Component function');
        const allocation = container.querySelector('[aria-label="Current functional task"] select') as HTMLSelectElement;
        act(() => { allocation.value = 'controller'; allocation.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'newImplementation' } as never);
        act(() => { container.querySelector('[aria-label="Current functional task"] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle();
        const waiting = buttons('+ Child function')[0].disabled;
        const previous = useModelStore.getState().model!;
        act(() => useModelStore.setState({ model: { ...previous, elements: { ...previous.elements, newImplementation: { ...previous.elements.implementation, id: 'newImplementation', name: 'Compute command' } }, relationships: [...previous.relationships,
            { id: 'new-realization', type: 'realizes', sourceId: 'newImplementation', targetId: 'fn' },
            { id: 'new-allocation', type: 'allocatedTo', sourceId: 'newImplementation', targetId: 'controller' },
        ] as never } })); await settle();
        expect(waiting).toBe(true);
        expect(buttons('+ Child function')[0].disabled).toBe(false);
        expect(container.querySelector('[role="status"]')!.textContent).toBe('Saved to the model.');
    });

    it('shows the existing breakdown beneath a parent performance reference without duplicating its original', async () => {
        const next = model();
        next.registries!.kinds.push({ name: 'MemoFunction' } as never, { name: 'SystemFunction', superType: 'MemoFunction' } as never);
        answer.layers[0].elementKinds = ['MemoFunction'];
        next.elements.fn.kind = 'SystemFunction';
        next.elements.root = element('root', 'SystemFunction', 'Host responsibility');
        next.elements.alias = element('alias', 'SystemFunction', 'Compute signal');
        next.elements.nested = element('nested', 'SystemFunction', 'Nested responsibility');
        for (const id of ['root', 'alias', 'nested']) next.workspaceMembership!.membership[id] = ['host'];
        next.relationships.push(...[
            { id: 'rRoot', type: 'functionalRoot', sourceId: 'host', targetId: 'root' },
            { id: 'rAlias', type: 'composes', sourceId: 'root', targetId: 'alias' },
            { id: 'rSubset', type: 'subsets', sourceId: 'alias', targetId: 'fn' },
            { id: 'rChild', type: 'composes', sourceId: 'fn', targetId: 'nested' },
        ] as never[]);
        useModelStore.setState({ model: next }); await render();
        const tree = container.querySelector('[aria-label="Functional breakdown"]')!;
        expect(tree.textContent).toContain('Nested responsibility');
        expect([...tree.querySelectorAll('button')].filter(button => button.textContent === 'Compute signal')).toHaveLength(1);
        expect(container.querySelector('[aria-label="Elements in this layer"]')!.textContent!.match(/Compute signal/g)).toHaveLength(1);
    });

    it('offers native allocated function creation on component right-click', async () => {
        const next = model();
        next.registries!.kinds.push({ name: 'LogicalComponent', label: 'Logical component' } as never);
        next.registries!.kinds.push({ name: 'MemoFunction' } as never, { name: 'Function', label: 'System function', superType: 'MemoFunction' } as never);
        next.elements.controller = { ...element('controller', 'LogicalComponent', 'Controller'), owner: 'host' };
        next.workspaceMembership!.membership.controller = ['host'];
        answer.layers[0].elementKinds = ['LogicalComponent'];
        next.relationships.push({ id: 'alloc', type: 'allocatedTo', sourceId: 'fn', targetId: 'controller' } as never);
        useModelStore.setState({ model: next });
        await render();
        expect(buttons('Controller')[0].parentElement!.textContent).toContain('Compute signal');
        act(() => buttons('Controller')[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 30 })));
        await settle(); await click('Create component function…');
        expect(sendElementCreate).toHaveBeenCalledWith(expect.objectContaining({ id: '', construct: 'action', functionContext: { workspace: 'host', componentId: 'controller' } }));
        expect(useModelStore.getState().activeView).toMatchObject({ type: 'pathway', layer: 'layerWork' });
    });

    it('groups scoped element types independently of step output and narrows the editor model', async () => {
        const next = model(); next.elements.component = element('component', 'ComponentFunction', 'Calculate sample');
        next.registries!.kinds.push({ name: 'ComponentFunction', label: 'Component function', superType: 'Function' } as never);
        next.workspaceMembership!.membership.component = ['host'];
        next.diagrams![0].elementIds = ['fn', 'foreign', 'component'];
        useModelStore.setState({ model: next });
        await render();
        const browser = container.querySelector('[aria-label="Elements in this layer"]')!;
        expect(browser.textContent).toContain('Component function (1)');
        expect(browser.textContent).toContain('Calculate sample');
        expect(browser.textContent).not.toContain('Elsewhere');
        expect(container.querySelector('[data-testid="editor"]')?.textContent).not.toContain('foreign');
        expect(useModelStore.getState().model!.diagrams![0].elementIds).toContain('foreign');
    });

    it('opens an existing scoped view in the editor and switches tabs without leaving the layer', async () => {
        await render();
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first:host,fn,scenario');
        expect(container.textContent).not.toContain('Other system view');
        expect(container.textContent).not.toContain('being built');
        await click('Existing exchanges');
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('second:second:host,fn,scenario');
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
            expect(create).toHaveBeenCalledWith(expect.objectContaining({ viewpointId: 'catalog::vpWork', elementIds: ['host'], elementKinds: ['Function', 'Chain'], properties: { autoPopulate: 'false' }, activate: false }));
            expect(create.mock.calls[0][0]).not.toHaveProperty('id');
            expect(useModelStore.getState().activeView).toEqual({ type: 'pathway', layer: 'layerWork', diagramId: 'created' });
            expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('created:created:host,fn,scenario');
        } finally { useModelStore.setState({ createDiagram: previous }); }
    });
    it('shows a creation diagnostic without replacing the open editor', async () => {
        const previous = useModelStore.getState().createDiagram;
        useModelStore.setState({ createDiagram: async options => { options.onError?.('The compiler rejected the declaration.'); return undefined; } });
        try { await render(); await click('New work architecture view'); expect(container.textContent).toContain('The compiler rejected the declaration.'); expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first:host,fn,scenario'); }
        finally { useModelStore.setState({ createDiagram: previous }); }
    });
    it('offers a clear route from the dashboard into the Method map', async () => {
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
    it('offers free modelling, existing work and the editor when local guidance is hidden', async () => {
        await render(); await click('Hide guidance');
        expect(container.querySelector('[data-testid="guide-rail"]')).toBeNull();
        expect(container.textContent).toContain('Your work'); expect(container.textContent).toContain('Compute signal');
        expect(buttons('+ System function')).toHaveLength(2);
        expect(container.querySelector('[data-testid="editor"]')).not.toBeNull();
    });
    it('minimizes guidance and viewpoints without changing the active editor', async () => {
        await render(); await click('Hide guidance'); await click('Hide layer browser');
        expect(container.querySelector('[data-testid="guide-rail"]')).toBeNull();
        expect(container.querySelector('[aria-label="Viewpoints in this layer"]')).toBeNull();
        expect(container.querySelector('[data-testid="editor"]')?.textContent).toBe('first:first:host,fn,scenario');
    });
});

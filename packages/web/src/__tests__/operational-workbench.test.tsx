// @vitest-environment jsdom
import { useContext } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { OperationalWorkbench } from '../views/OperationalWorkbench';
import { FunctionalWorkbench } from '../views/FunctionalWorkbench';
import { DiagramUseCaseSubject, DiagramActionSubject } from '../diagram/display-scope';
import { useModelStore } from '../store/model-store';
import { sendElementCreate } from '../store/ws-client';
import type { GuideResult } from '../lib/guide-view';
vi.mock('../store/ws-client', () => ({ sendUserPreferencesSave: vi.fn(), sendElementCreate: vi.fn() }));
vi.mock('../views/DiagramEditor', () => ({ DiagramEditor: () => <div data-testid="scenario-diagram">{[useContext(DiagramActionSubject), useContext(DiagramUseCaseSubject)].filter(Boolean).join('')}</div> }));
const element = (id: string, kind: string, name = id, owner?: string) => ({ id, kind, name, construct: kind.includes('Workflow') || kind === 'System' || kind === 'OperationalEntity' ? 'part' : kind.includes('UseCase') ? 'use case' : 'action', file: 'model/work.sysml', package: 'work', attributes: {}, ...(owner ? { owner } : {}) });
const edge = (id: string, type: string, sourceId: string, targetId: string) => ({ id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'model/work.sysml' });
const guide = (): GuideResult => ({ scope: 'system', workspace: 'Host', methodologies: ['method'], roleViews: [], steps: [], layers: [
    { id: 'operational', name: 'op', label: 'Operational', workbench: 'operational', axis: 'architecture', stages: [], methodology: 'method', importable: false, viewpoints: [{ id: 'caseVp', name: 'vpUseCase', label: 'Use case', viewKind: 'general' }], tasks: [
        { id: 'clinical', label: 'Clinical', kind: 'decomposition', primary: true, level: 'clinical', subjectKind: 'ClinicalUseCase', workflowKind: 'ClinicalWorkflow', scenarioKind: 'OperativeScenario', stepKind: 'OperativeAction', viewpoint: { id: 'scenarioVp', name: 'scenarioVp', label: 'Scenario', viewKind: 'actionflow' } },
        { id: 'system', label: 'System', kind: 'decomposition', primary: true, level: 'system', subjectKind: 'SystemUseCase', workflowKind: 'SystemWorkflow', scenarioKind: 'OperativeScenario', stepKind: 'OperativeAction', viewpoint: { id: 'scenarioVp', name: 'scenarioVp', label: 'Scenario', viewKind: 'actionflow' } },
    ] },
    { id: 'functional', name: 'fn', label: 'Functional', workbench: 'functional', axis: 'architecture', stages: [], methodology: 'method', importable: false, viewpoints: [], tasks: [
        { id: 'tree', label: 'Functional tree', kind: 'decomposition', primary: true, subjectKind: 'SystemFunction' },
        { id: 'flows', label: 'Functional flows', kind: 'sequence', primary: true, subjectKind: 'FunctionalFlow', referenceKind: 'SystemFunction' },
    ] },
] });
const model = (): MemoModelDTO => ({ elements: {
    host: element('host', 'System', 'Host'), other: element('other', 'System', 'Other'), team: element('team', 'OperationalEntity', 'Care team'),
    clinical: element('clinical', 'ClinicalUseCase', 'Assess condition'), clinicalWork: element('clinicalWork', 'ClinicalWorkflow', 'Assessment work'), clinicalPath: element('clinicalPath', 'OperativeScenario', 'Assessment path', 'clinicalWork'), clinicalStep: element('clinicalStep', 'OperativeAction', 'Observe condition', 'clinicalPath'),
    system: element('system', 'SystemUseCase', 'Monitor condition'), systemWork: element('systemWork', 'SystemWorkflow', 'Monitoring work'), systemPath: element('systemPath', 'OperativeScenario', 'Monitoring path', 'systemWork'), systemStep: element('systemStep', 'OperativeAction', 'Read signal', 'systemPath'), report: element('report', 'OperativeAction', 'Report signal', 'systemPath'),
    foreign: element('foreign', 'SystemUseCase', 'External goal'),
    functionRoot: element('functionRoot', 'SystemFunction', 'Coordinate system'), fn: element('fn', 'SystemFunction', 'Acquire signal', 'functionRoot'), flow: element('flow', 'FunctionalFlow', 'Signal flow', 'functionRoot'), flowStep: element('flowStep', 'SystemFunction', 'Acquire here', 'flow'),
}, relationships: [edge('clinicalGoal', 'realizesUseCase', 'clinicalWork', 'clinical'), edge('systemGoal', 'realizesUseCase', 'systemWork', 'system'), edge('subject', 'hasSubject', 'system', 'host'), edge('clinicalSubject', 'hasSubject', 'clinical', 'team'),
    edge('includes', 'includesStep', 'system', 'foreign'), edge('baseline', 'realizes', 'system', 'clinical'), edge('refineStep', 'realizes', 'systemStep', 'clinicalStep'), edge('flowRealization', 'realizes', 'flow', 'systemStep'), edge('functionPerformance', 'performs', 'systemStep', 'fn'),
    edge('root', 'functionalRoot', 'host', 'functionRoot'), edge('functionChild', 'composes', 'functionRoot', 'fn'), edge('flowChild', 'composes', 'functionRoot', 'flow'), edge('stepChild', 'composes', 'flow', 'flowStep'), edge('subset', 'subsets', 'flowStep', 'fn'), edge('ordering', 'succession', 'systemStep', 'report'),
], diagrams: [{ id: 'scenarioView', name: 'Monitoring scenario', diagramType: 'afd', viewKind: 'actionflow', elementIds: ['systemPath', 'systemStep', 'report'], auto: false }],
    registries: { kinds: ['UseCase', 'ClinicalUseCase', 'SystemUseCase', 'OperationalWorkflow', 'ClinicalWorkflow', 'SystemWorkflow', 'OperativeScenario', 'OperativeAction', 'OperationalEntity', 'System', 'MemoFunction', 'SystemFunction', 'FunctionalFlow'].map(name => ({ name, ...(name.endsWith('UseCase') && name !== 'UseCase' ? { superType: 'UseCase' } : name.endsWith('Workflow') && name !== 'OperationalWorkflow' ? { superType: 'OperationalWorkflow' } : name === 'SystemFunction' ? { superType: 'MemoFunction' } : {}) })), relationships: [] },
    workspaceMembership: { workspaces: [{ root: 'host', name: 'Host', scope: 'system' }, { root: 'other', name: 'Other', scope: 'system' }], membership: Object.fromEntries(['host', 'system', 'systemWork', 'systemPath', 'systemStep', 'report', 'functionRoot', 'fn', 'flow', 'flowStep'].map(id => [id, ['host']]).concat([['other', ['other']], ['foreign', ['other']]])), shared: [], unassigned: ['team', 'clinical', 'clinicalWork', 'clinicalPath', 'clinicalStep'], definitionOf: {}, missingSystem: false }, errors: [], revision: 1,
} as unknown as MemoModelDTO);
const originalCreateDiagram = useModelStore.getState().createDiagram;
let container: HTMLElement; let root: Root;
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
function Page() { const model = useModelStore(s => s.model)!; const guide = useModelStore(s => s.guide)!; const workspace = useModelStore(s => s.workspace); const active = useModelStore(s => s.activeView); return active.type === 'pathway' && active.layer === 'fn' ? <FunctionalWorkbench model={model} row={guide.layers[1]} workspace={workspace} canWrite={true} /> : <OperationalWorkbench model={model} row={guide.layers[0]} workspace={workspace} canWrite={useModelStore.getState().pinned === null} />; }
const render = async () => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(<Page />)); await settle(); };
const buttons = (text: string) => [...container.querySelectorAll('button')].filter(button => button.textContent?.trim() === text);
const click = async (text: string) => { act(() => buttons(text)[0].click()); await settle(); };
const chooseNode = async (name: string) => { if (!container.querySelector('[aria-label="Operational hierarchy"]')) await click('Hierarchy'); const candidate = [...container.querySelectorAll('[aria-label="Operational hierarchy"] button')].find(button => button.querySelector('span')?.textContent === name) as HTMLButtonElement; expect(candidate).toBeDefined(); act(() => candidate.click()); await settle(); };
beforeEach(() => { useModelStore.setState({ createDiagram: originalCreateDiagram, model: model(), guide: guide(), workspace: 'host', connected: true, preferencesLoaded: true, pinned: null, selectedElementId: null, selectedDiagramId: null, activeView: { type: 'pathway', layer: 'op' } }); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.clearAllMocks(); useModelStore.setState({ createDiagram: originalCreateDiagram }); });
describe('guided operational work', () => {
    it('separates clinical and system element types into explicit tables', async () => {
        await render();
        const clinicalCases = container.querySelector('[aria-label="Clinical use case table"]')!;
        expect(clinicalCases.textContent).toContain('Assess condition'); expect(clinicalCases.textContent).not.toContain('Monitor condition');
        await click('Workflows (1)'); expect(container.querySelector('[aria-label="Clinical workflow table"]')!.textContent).toContain('Assessment work');
        await click('Scenarios (1)'); expect(container.querySelector('[aria-label="Clinical scenario table"]')!.textContent).toContain('Assessment path');
        await click('System'); expect(container.querySelector('[aria-label="System scenario table"]')!.textContent).toContain('Monitoring path');
        expect(container.querySelector('[aria-label="System scenario table"]')!.textContent).not.toContain('Assessment path');
        await click('Use cases (1)'); expect(container.querySelector('[aria-label="System use case table"]')!.textContent).not.toContain('External goal');
    });

    it('keeps Visual mode while moving from workflow structure into a scenario', async () => {
        await render(); await click('System'); await click('Workflows (1)'); await click('Visual');
        expect(container.querySelector('[aria-label="Workflow structure"]')!.textContent).toContain('Monitoring path');
        const scenario = [...container.querySelectorAll('[aria-label="Workflow structure"] button')].find(button => button.textContent?.includes('Monitoring path')) as HTMLButtonElement;
        act(() => scenario.click()); await settle(); await settle();
        expect(buttons('Visual')[0].getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelector('[data-testid="scenario-diagram"]')!.textContent).toBe('systemPath');
        expect(container.querySelector('[aria-label="Operational element types"]')!.textContent).toContain('Scenarios (1)');
        await click('Table'); expect(container.querySelector('[aria-label="System scenario table"]')).not.toBeNull();
    });

    it('creates a real use-case diagram with exact selected include and subject context', async () => {
        await render(); await click('System');
        let request: any;
        useModelStore.setState({ createDiagram: async options => { request = options; const before = useModelStore.getState().model!; useModelStore.setState({ model: { ...before, diagrams: [...before.diagrams!, { ...options, id: 'caseView', auto: false } as never] } }); return 'caseView'; } });
        await click('Visual');
        expect(request).toBeUndefined();
        await click('Create diagram');
        expect(request).toMatchObject({ diagramType: 'ucd', viewpointId: 'caseVp', viewKind: 'general', properties: { autoPopulate: 'false' }, activate: false });
        expect(request.elementIds).toEqual(expect.arrayContaining(['system', 'foreign', 'host']));
        expect(request.elementIds).not.toContain('clinical');
        expect(request.elementIds).not.toContain('systemStep');
        expect(container.querySelector('[data-testid="scenario-diagram"]')!.textContent).toBe('system');
        expect(container.querySelector('[aria-label="Presentation"]')).not.toBeNull();
    });

    it('offers the matching parent when creating a workflow from its own type list', async () => {
        await render(); await click('Workflows (1)'); await click('+ Clinical workflow');
        const parents = container.querySelector('[aria-label="Parent work"]') as HTMLSelectElement;
        expect([...parents.options].map(option => option.value)).toEqual(['', 'clinical']);
        expect(buttons('Create')[0].disabled).toBe(true);
    });

    it('shows clinical work independently of the product and system refinements as labelled context', async () => {
        await render(); expect(container.textContent).toContain('independent of the selected product');
        await chooseNode('Assess condition'); expect(container.querySelector('[aria-label="Operational hierarchy"]')!.textContent).toContain('Monitor condition');
    });
    it('navigates from clinical intent to its system use case without copying the hierarchy', async () => {
        await render(); await chooseNode('Assess condition'); await chooseNode('Monitor condition');
        const detail = container.querySelector('[aria-label="Current operational task"]')!; expect(detail.textContent).toContain('shown as context');
        expect(buttons('+ Workflow')[0].disabled).toBe(true); await click('Work on Host');
        expect(buttons('System')[0].getAttribute('aria-pressed')).toBe('true'); expect(buttons('+ Workflow')[0].disabled).toBe(false);
        await chooseNode('External goal'); expect(container.querySelector('[aria-label="Current operational task"]')!.textContent).toContain('shown as context'); await click('Work on Other'); expect(useModelStore.getState().workspace).toBe('other');
    });
    it('reviews an activity’s canonical functions and opens its linked functional flow', async () => {
        await render(); await click('System'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path'); await chooseNode('Read signal');
        const detail = container.querySelector('[aria-label="Current operational task"]')!;
        expect(detail.textContent).toContain('Acquire signal'); expect(detail.textContent).toContain('Clinical baseline');
        await click('Signal flow'); await settle(); expect(useModelStore.getState().activeView).toMatchObject({ type: 'pathway', layer: 'fn' });
        expect(container.querySelector('[aria-label="Current functional task"]')!.textContent).toContain('Signal flow'); expect(buttons('Functional flows')[0].getAttribute('aria-pressed')).toBe('true');
    });
    it('switches to the flow’s system when opening a flow from clinical context', async () => {
        useModelStore.setState({ workspace: 'other' }); await render();
        await chooseNode('Assess condition'); await chooseNode('Assessment work'); await chooseNode('Assessment path'); await chooseNode('Observe condition'); await chooseNode('Read signal');
        await click('Signal flow'); await settle();
        expect(useModelStore.getState().workspace).toBe('host');
        expect(container.querySelector('[aria-label="Current functional task"]')!.textContent).toContain('Signal flow');
    });

    it('opens an existing scenario diagram during read-only review', async () => {
        useModelStore.setState({ pinned: { label: 'Review snapshot' } as never }); await render(); await click('System'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path'); await click('Open scenario diagram');
        expect(container.querySelector('[data-testid="scenario-diagram"]')!.textContent).toBe('systemPath');
        await click('‹ Back to operational work'); expect(container.querySelector('[data-testid="operational-workbench"]')).not.toBeNull();
    });
    it('creates an alternate scenario in the selected workflow and waits for its canonical model identity', async () => {
        await render(); await click('System'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await click('+ Scenario');
        const name = container.querySelector('form input') as HTMLInputElement;
        act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Recovery path'); name.dispatchEvent(new Event('input', { bubbles: true })); });
        const path = container.querySelector('[aria-label="Scenario path"]') as HTMLSelectElement;
        act(() => { path.value = 'alternate'; path.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'recovery' } as never);
        act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle();
        const request = vi.mocked(sendElementCreate).mock.calls.at(-1)![0];
        const before = useModelStore.getState().model!;
        act(() => useModelStore.setState({ model: { ...before, elements: { ...before.elements, recovery: { ...before.elements.systemPath, id: 'recovery', name: 'Recovery path', attributes: { scenarioKind: 'alternate' } } }, workspaceMembership: { ...before.workspaceMembership!, membership: { ...before.workspaceMembership!.membership, recovery: ['host'] } }, revision: 2 } })); await settle();
        expect(request).toMatchObject({ id: '', name: 'Recovery path', operationalContext: { operation: 'scenario', level: 'system', workspace: 'host', workflowId: 'systemWork', scenarioKind: 'alternate' } });
        expect(container.querySelector('[aria-label="Current operational task"]')!.textContent).toContain('Recovery path');
        expect(container.querySelector('[role="status"]')!.textContent).toBe('Saved to the model.');
    });

    it('offers scenario conditions and alternate paths in the workflow context', async () => {
        await render(); await click('System'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await click('+ Scenario');
        expect(container.textContent).toContain('Precondition'); expect(container.textContent).toContain('Postcondition');
        const select = container.querySelector('[aria-label="Scenario path"]') as HTMLSelectElement; expect([...select.options].map(option => option.value)).toEqual(['nominal', 'alternate']);
    });
});

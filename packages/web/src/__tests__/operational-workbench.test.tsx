// @vitest-environment jsdom
import { StrictMode, useContext } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { confirmDialog } from '../components/AppDialogs';
import { MemoryRouter } from 'react-router-dom';
import { GuidedContextSetup } from '../views/GuidedContextSetup';
import { ContextWorkbench } from '../views/ContextWorkbench';
import { pathToView, viewToPath } from '../view-routes';
import { OperationalWorkbench } from '../views/OperationalWorkbench';
import { FunctionalWorkbench } from '../views/FunctionalWorkbench';
import { useDiagramEmbed } from '../diagram/diagram-embed-context';
import { DiagramUseCaseSubject, DiagramActionSubject } from '../diagram/display-scope';
import { useModelStore } from '../store/model-store';
import { sendElementCreate } from '../store/ws-client';
import type { GuideResult } from '../lib/guide-view';
vi.mock('../components/AppDialogs', async original => ({
    ...await original<typeof import('../components/AppDialogs')>(), confirmDialog: vi.fn(),
}));
vi.mock('../store/ws-client', () => ({ sendUserPreferencesSave: vi.fn(), sendElementCreate: vi.fn() }));
vi.mock('../views/ScopedContextDiagram', () => ({
    ScopedContextDiagram: ({ links }: { links: MemoModelDTO['relationships'] }) =>
        <div data-testid="scoped-context-links">{links.map(edge => edge.id).join(',')}</div>,
}));
vi.mock('../views/DiagramCanvas', () => ({
    DiagramCanvas: () => { const embed = useDiagramEmbed(); return <div data-testid="operative-flow-canvas" data-highlight={embed?.highlightIds?.join(',') ?? ''}>{embed?.previewDiagram?.elementIds?.join(',')}{embed?.onExplore && embed.previewDiagram?.elementIds?.map(id => <button key={id} type="button" data-node={id} onClick={() => embed.onExplore!({ type: 'element', id })} />)}</div>; },
}));
vi.mock('../views/DiagramEditor', () => ({ DiagramEditor: () => <div data-testid="scenario-diagram">{[useContext(DiagramActionSubject), useContext(DiagramUseCaseSubject)].filter(Boolean).join('')}</div> }));
const element = (id: string, kind: string, name = id, owner?: string) => ({ id, kind, name, construct: kind.includes('Workflow') || kind === 'System' || kind === 'OperationalEntity' ? 'part' : kind.includes('UseCase') ? 'use case' : 'action', file: 'model/work.sysml', package: 'work', attributes: {}, ...(owner ? { owner } : {}) });
const edge = (id: string, type: string, sourceId: string, targetId: string) => ({ id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'model/work.sysml' });
const guide = (): GuideResult => ({ scope: 'system', workspace: 'Host', methodologies: ['method'], roleViews: [], steps: [], layers: [
    { id: 'operational', name: 'op', label: 'Operational', workbench: 'operational', axis: 'architecture', stages: [], methodology: 'method', importable: false, viewpoints: [{ id: 'caseVp', name: 'vpUseCase', label: 'Use case', viewKind: 'general' }], tasks: [
        { id: 'clinical', label: 'Clinical', kind: 'decomposition', primary: true, level: 'clinical', subjectKind: 'ClinicalUseCase', workflowKind: 'ClinicalWorkflow', scenarioKind: 'OperativeScenario', stepKind: 'OperativeAction', viewpoint: { id: 'scenarioVp', name: 'scenarioVp', label: 'Scenario', viewKind: 'actionflow' } },
        { id: 'operational', label: 'Operational', kind: 'decomposition', primary: true, level: 'operational', subjectKind: 'OperationalUseCase', workflowKind: 'OperationalWorkflow', scenarioKind: 'OperativeScenario', stepKind: 'OperativeAction', viewpoint: { id: 'scenarioVp', name: 'scenarioVp', label: 'Scenario', viewKind: 'actionflow' } },
    ] },
    { id: 'functional', name: 'fn', label: 'Functional', workbench: 'functional', axis: 'architecture', stages: [], methodology: 'method', importable: false, viewpoints: [], tasks: [
        { id: 'tree', label: 'Functional tree', kind: 'decomposition', primary: true, subjectKind: 'SystemFunction' },
        { id: 'flows', label: 'Functional flows', kind: 'sequence', primary: true, subjectKind: 'FunctionalFlow', referenceKind: 'SystemFunction' },
    ] },
] });
const model = (): MemoModelDTO => ({ elements: {
    host: element('host', 'System', 'Host'), other: element('other', 'System', 'Other'), team: element('team', 'OperationalEntity', 'Care team'),
    clinical: element('clinical', 'ClinicalUseCase', 'Assess condition'), clinicalWork: element('clinicalWork', 'ClinicalWorkflow', 'Assessment work'), clinicalPath: element('clinicalPath', 'OperativeScenario', 'Assessment path', 'clinicalWork'), clinicalStep: element('clinicalStep', 'OperativeAction', 'Observe condition', 'clinicalPath'),
    system: element('system', 'OperationalUseCase', 'Monitor condition'), systemWork: element('systemWork', 'OperationalWorkflow', 'Monitoring work'), systemPath: element('systemPath', 'OperativeScenario', 'Monitoring path', 'systemWork'), systemStep: element('systemStep', 'OperativeAction', 'Read signal', 'systemPath'), report: element('report', 'OperativeAction', 'Report signal', 'systemPath'),
    foreign: element('foreign', 'OperationalUseCase', 'External goal'),
    functionRoot: element('functionRoot', 'SystemFunction', 'Coordinate system'), fn: element('fn', 'SystemFunction', 'Acquire signal', 'functionRoot'), flow: element('flow', 'FunctionalFlow', 'Signal flow', 'functionRoot'), flowStep: element('flowStep', 'SystemFunction', 'Acquire here', 'flow'),
}, relationships: [edge('clinicalGoal', 'realizesUseCase', 'clinicalWork', 'clinical'), edge('systemGoal', 'realizesUseCase', 'systemWork', 'system'), edge('subject', 'hasSubject', 'system', 'host'), edge('clinicalSubject', 'hasSubject', 'clinical', 'team'),
    edge('includes', 'includesStep', 'system', 'foreign'), edge('baseline', 'realizes', 'system', 'clinical'), edge('refineStep', 'realizes', 'systemStep', 'clinicalStep'), edge('flowRealization', 'realizes', 'flow', 'systemStep'), edge('functionPerformance', 'performs', 'systemStep', 'fn'),
    edge('root', 'functionalRoot', 'host', 'functionRoot'), edge('functionChild', 'composes', 'functionRoot', 'fn'), edge('flowChild', 'composes', 'functionRoot', 'flow'), edge('stepChild', 'composes', 'flow', 'flowStep'), edge('subset', 'subsets', 'flowStep', 'fn'), edge('ordering', 'succession', 'systemStep', 'report'),
], diagrams: [{ id: 'scenarioView', name: 'Monitoring scenario', diagramType: 'afd', viewKind: 'actionflow', elementIds: ['systemPath', 'systemStep', 'report', 'systemWork', 'system', 'team'], auto: false }],
    registries: { kinds: ['UseCase', 'ClinicalUseCase', 'OperationalUseCase', 'Workflow', 'ClinicalWorkflow', 'OperationalWorkflow', 'OperativeScenario', 'OperativeAction', 'OperationalEntity', 'System', 'MemoFunction', 'SystemFunction', 'FunctionalFlow'].map(name => ({ name, ...(name.endsWith('UseCase') && name !== 'UseCase' ? { superType: 'UseCase' } : name.endsWith('Workflow') && name !== 'Workflow' ? { superType: 'Workflow' } : name === 'SystemFunction' ? { superType: 'MemoFunction' } : {}) })), relationships: [] },
    workspaceMembership: { workspaces: [{ root: 'host', name: 'Host', scope: 'system' }, { root: 'other', name: 'Other', scope: 'system' }], membership: Object.fromEntries(['host', 'system', 'systemWork', 'systemPath', 'systemStep', 'report', 'functionRoot', 'fn', 'flow', 'flowStep'].map(id => [id, ['host']]).concat([['other', ['other']], ['foreign', ['other']]])), shared: [], unassigned: ['team', 'clinical', 'clinicalWork', 'clinicalPath', 'clinicalStep'], definitionOf: {}, missingSystem: false }, errors: [], revision: 1,
} as unknown as MemoModelDTO);
const originalCreateDiagram = useModelStore.getState().createDiagram;
let container: HTMLElement; let root: Root;
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
function Page() { const model = useModelStore(s => s.model)!; const guide = useModelStore(s => s.guide)!; const workspace = useModelStore(s => s.workspace); const active = useModelStore(s => s.activeView); if (active.type === 'pathway' && active.layer === 'layerContext') {
    return <ContextWorkbench model={model} workspace={workspace} onBoundary={() => {}} canWrite={true} diagram={model.diagrams?.find(diagram => diagram.diagramType === 'context')} onOperational={(work, artifactId, createCase) =>
        useModelStore.getState().setActiveView({ type: 'pathway', layer: 'op', work, artifactId, createCase })} />;
} return active.type === 'pathway' && active.layer === 'fn' ? <FunctionalWorkbench model={model} row={guide.layers[1]} workspace={workspace} canWrite={true} /> : <OperationalWorkbench model={model} row={guide.layers[0]} workspace={workspace} canWrite={useModelStore.getState().pinned === null} entry={active.type === 'pathway' ? active : undefined} />; }
const render = async (strict = false) => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(<MemoryRouter>{strict ? <StrictMode><Page /></StrictMode> : <Page />}</MemoryRouter>)); await settle(); };
// An element chip shows its stereotype above its name, so it is found by the name.
const buttons = (text: string) => [...container.querySelectorAll('button')].filter(button => button.textContent?.trim() === text || button.querySelector('.memo-element-chip-name')?.textContent === text);
const click = async (text: string) => { act(() => buttons(text)[0].click()); await settle(); };
const chooseNode = async (name: string) => { if (!container.querySelector('[aria-label="Operational hierarchy"]')) await click('Hierarchy'); const candidate = [...container.querySelectorAll('[aria-label="Operational hierarchy"] button')].find(button => button.querySelector('span')?.textContent === name) as HTMLButtonElement; expect(candidate).toBeDefined(); act(() => candidate.click()); await settle(); };
beforeEach(() => { useModelStore.setState({ createDiagram: originalCreateDiagram, model: model(), guide: guide(), workspace: 'host', connected: true, preferencesLoaded: true, pinned: null, selectedElementId: null, selectedDiagramId: null, activeView: { type: 'pathway', layer: 'op' } }); });
afterEach(() => { useModelStore.setState({ diagramReturn: null }); act(() => root?.unmount()); container?.remove(); vi.clearAllMocks(); useModelStore.setState({ createDiagram: originalCreateDiagram }); });
describe('guided operational work', () => {
    it('writes context links to the system usage and removes the selected relationship', async () => {
        const state = useModelStore.getState();
        const data = state.model!;
        data.elements.host = { ...data.elements.host, isDefinition: true };
        data.elements.hostUsage = { ...data.elements.host, id: 'hostUsage', isDefinition: false };
        data.workspaceMembership!.definitionOf = { hostUsage: 'host' };
        data.relationships.push(edge('context-team', 'interactsInContext', 'team', 'hostUsage'),
            edge('wider-team', 'interactsInContext', 'team', 'other'));
        const createRelationship = vi.fn(async () => ({ success: true as const }));
        const deleteRelationship = vi.fn(async () => ({ success: true as const }));
        useModelStore.setState({ createRelationship, deleteRelationship });
        vi.mocked(confirmDialog).mockResolvedValue(true);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        try {
            act(() => root.render(<GuidedContextSetup model={data} system={data.elements.host} canWrite />));
            expect(container.querySelector('[data-testid="scoped-context-links"]')?.textContent).toBe('context-team');
            act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Add external system"]')!.click());
            await settle();
            const select = container.querySelector<HTMLSelectElement>('form select')!;
            act(() => { select.value = 'other'; select.dispatchEvent(new Event('change', { bubbles: true })); });
            await click('Add link');
            expect(createRelationship).toHaveBeenCalledWith({
                type: 'interactsInContext', direction: 'incoming', sourceId: 'other', targetId: 'hostUsage',
            });
            await click('Table');
            await click('Remove');
            expect(deleteRelationship).toHaveBeenCalledWith('context-team');
        } finally {
            useModelStore.setState({ createRelationship: state.createRelationship, deleteRelationship: state.deleteRelationship });
        }
    });

    it('groups an included use case with its parent in the catalog list and grid', async () => {
        await render();
        await click('Operational');
        const list = container.querySelector('[aria-label="Use case catalog"] table')!;
        expect([...list.querySelectorAll('tbody tr th .pathway-operational-case-link')].map(button => button.textContent)).toEqual([
            'Monitor condition', 'External goal',
        ]);
        expect(list.querySelector('.pathway-case-child-row')?.textContent).toContain('Included by Monitor condition');
        const toggle = async (label: string) => {
            act(() => container.querySelector<HTMLButtonElement>(`[aria-label="${label} included cases for Monitor condition"]`)!.click());
            await settle();
        };
        await toggle('Collapse');
        expect(list.querySelector('.pathway-case-child-row')).toBeNull();
        await click('Grid');
        const group = container.querySelector('[aria-label="Monitor condition use case group"]')!;
        expect(group.querySelectorAll('.pathway-icon-tile')).toHaveLength(1);
        await toggle('Expand');
        expect(group.querySelectorAll('.pathway-icon-tile')).toHaveLength(2);
        expect(group.textContent).toContain('Included by Monitor condition');
        expect([...group.querySelectorAll('.pathway-case-level')].map(node => node.textContent)).toEqual(['Level 1', 'Level 2']);
        const depth = container.querySelector<HTMLSelectElement>('.pathway-case-tree-controls select')!;
        act(() => { depth.value = '1'; depth.dispatchEvent(new Event('change', { bubbles: true })); });
        await settle();
        expect(group.querySelectorAll('.pathway-icon-tile')).toHaveLength(1);
        await click('Expand all');
        expect(group.querySelectorAll('.pathway-icon-tile')).toHaveLength(2);
        await click('Collapse all');
        expect(group.querySelectorAll('.pathway-icon-tile')).toHaveLength(1);
    });

    it('sorts use cases and workflows that have children first and can show only those', async () => {
        const data = useModelStore.getState().model!;
        data.elements.idle = element('idle', 'OperationalUseCase', 'Idle goal') as unknown as MemoModelDTO['elements'][string];
        data.elements.spare = element('spare', 'OperationalWorkflow', 'Spare work') as unknown as MemoModelDTO['elements'][string];
        data.relationships.push(edge('idleSubject', 'hasSubject', 'idle', 'host'), edge('spareGoal', 'realizesUseCase', 'spare', 'system'));
        data.workspaceMembership!.membership.idle = ['host'];
        data.workspaceMembership!.membership.spare = ['host'];
        // Declared first, so only the sort can put it after the case that has a workflow.
        data.elements = { idle: data.elements.idle, spare: data.elements.spare, ...data.elements };
        await render();
        await click('Operational');
        const names = () => [...container.querySelectorAll('[aria-label="Use case catalog"] tbody tr th .pathway-operational-case-link')].map(button => button.textContent);
        expect(names()).toEqual(['Monitor condition', 'External goal', 'Idle goal']);
        await click('With workflows');
        expect(names()).toEqual(['Monitor condition']);
        expect(container.querySelector('[aria-label="Use case catalog"] tbody .pathway-count-badge')?.getAttribute('aria-label')).toBe('2 workflows');
        await click('Monitor condition');
        const workflows = () => [...container.querySelectorAll('[aria-label="Use case workflow map"] .pathway-workflow-group-head strong')].map(node => node.textContent);
        expect(workflows()).toEqual(['Monitoring work', 'Spare work']);
        await click('With scenarios');
        expect(workflows()).toEqual(['Monitoring work']);
    });

    it('opens a use case as its profile: fields, actors and related use cases are edited there', async () => {
        const data = useModelStore.getState().model!;
        data.elements.nurse = { ...element('nurse', 'User', 'Nurse'), construct: 'part' } as unknown as MemoModelDTO['elements'][string];
        data.registries!.kinds.push({ name: 'OperationalParticipant' } as never);
        data.registries!.kinds = data.registries!.kinds.map(kind => kind.name === 'User' ? { ...kind, superType: 'OperationalParticipant' } : kind);
        if (!data.registries!.kinds.some(kind => kind.name === 'User')) data.registries!.kinds.push({ name: 'User', superType: 'OperationalParticipant' } as never);
        vi.mocked(confirmDialog).mockResolvedValue(true);
        await render();
        await click('Operational');
        expect(buttons('Open →')).toHaveLength(2);
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="Open Monitor condition"]')!.click()); await settle();
        const profile = () => container.querySelector('[aria-label="Use case profile"]')!;
        expect(profile().querySelector('[aria-label="Related use cases"]')!.textContent).toContain('External goal');
        expect(profile().querySelector('[aria-label="Use case workflow map"]')).not.toBeNull();
        await click('Edit…');
        const goal = profile().querySelector('[aria-label="Edit the use case"] textarea') as HTMLTextAreaElement;
        act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(goal, 'Keep it in view'); goal.dispatchEvent(new Event('input', { bubbles: true })); }); await settle();
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'system' } as never);
        await click('Save');
        expect(vi.mocked(sendElementCreate).mock.calls.at(-1)![0]).toMatchObject({ operationalContext: { operation: 'fields', sourceId: 'system', fields: { goalStatement: 'Keep it in view' } } });
        await click('Actor');
        expect([...container.querySelectorAll('select[aria-label="Connect existing work"] option')].map(option => option.textContent)).toContain('Nurse');
        await click('Cancel');
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'system' } as never);
        act(() => profile().querySelector<HTMLButtonElement>('[aria-label="Remove External goal"]')!.click()); await settle(); await settle();
        expect(vi.mocked(sendElementCreate).mock.calls.at(-1)![0]).toMatchObject({ operationalContext: { operation: 'unlink', sourceId: 'system', targetId: 'foreign', relation: 'includesStep' } });
    });

    it('shows a workflow chosen outside the overview as its scenario group, not a page of its own', async () => {
        await render();
        await click('Operational');
        await chooseNode('Monitor condition'); await chooseNode('Monitoring work');
        const panel = container.querySelector('[aria-label="Current operational task"]')!;
        const group = panel.querySelector('[aria-label="Monitoring work workflow"]')!;
        expect(group.querySelector('.pathway-operational-row')?.textContent).toContain('Monitoring path');
        expect([...group.querySelectorAll('[role="menuitem"]')].map(item => item.textContent)).toEqual(['Properties…', 'Link to a use case…', 'Link clinical work…']);
        expect(panel.textContent).toContain('Realizes:');
        expect(panel.querySelector('.memo-element-chip')?.textContent).toBe('«OperationalUseCase»Monitor condition');
        expect(panel.querySelector('[aria-label="Scenarios in this workflow"]')).toBeNull();
        expect(panel.querySelector('[aria-label="Covered via linked steps"]')).toBeNull();
        expect(panel.querySelector('h2')).toBeNull();
    });

    it('reviews which system activities perform a system function, apart from those covered by a flow', async () => {
        const data = useModelStore.getState().model!;
        useModelStore.setState({ model: { ...data, relationships: data.relationships.filter(edge => edge.id !== 'flowRealization') } });
        await render();
        await click('Operational');
        await click('Review functional coverage');
        const table = () => container.querySelector('[aria-label="System activity function coverage"]')!;
        expect(table().textContent).toContain('Report signal');
        expect(table().textContent).not.toContain('Read signal');
        const linked = container.querySelector('[aria-label="Link coverage"] input[type="checkbox"]') as HTMLInputElement;
        act(() => linked.click()); await settle();
        const readRow = [...table().querySelectorAll('tr')].find(row => row.textContent?.includes('Read signal'))!;
        expect(readRow.textContent).toContain('Linked');
        expect(readRow.textContent).toContain('Acquire signal');
        const reportButton = [...table().querySelectorAll('button')].find(button => button.textContent === 'Report signal')!;
        act(() => reportButton.click()); await settle();
        expect(container.querySelector('[aria-label="Selection"] strong')?.textContent).toBe('Report signal');
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="Realized by functions"] button:last-child')!.click()); await settle();
        const options = [...container.querySelectorAll('select[aria-label="Connect existing work"] option')].map(option => option.textContent);
        expect(options.some(option => option?.startsWith('Acquire signal'))).toBe(true);
        expect(options.some(option => option?.startsWith('Coordinate system'))).toBe(false);
    });

    it('lists an activity outside any workflow with a note instead of leaving it out', async () => {
        const data = useModelStore.getState().model!;
        useModelStore.setState({ model: { ...data, elements: { ...data.elements, loose: element('loose', 'OperativeAction', 'Loose activity') as never },
            relationships: [...data.relationships, edge('loosePerforms', 'performs', 'loose', 'fn')],
            workspaceMembership: { ...data.workspaceMembership!, membership: { ...data.workspaceMembership!.membership, loose: ['host'] } } } });
        await render();
        await click('Operational');
        await click('Review functional coverage');
        const row = [...container.querySelectorAll('[aria-label="System activity function coverage"] tr')].find(candidate => candidate.textContent?.includes('Loose activity'))!;
        expect(row.textContent).toContain('Not placed in a clinical or operational workflow');
        expect(row.textContent).toContain('Linked');
    });

    it('shows an activity realized by a flow as covered through that flow', async () => {
        const data = useModelStore.getState().model!;
        useModelStore.setState({ model: { ...data, relationships: data.relationships.filter(edge => edge.id !== 'functionPerformance') } });
        await render();
        await click('Operational');
        await click('Review functional coverage');
        const linked = container.querySelector('[aria-label="Link coverage"] input[type="checkbox"]') as HTMLInputElement;
        act(() => linked.click()); await settle();
        const readRow = [...container.querySelectorAll('[aria-label="System activity function coverage"] tr')].find(row => row.textContent?.includes('Read signal'))!;
        expect(readRow.textContent).toContain('Via a functional flow');
        expect(readRow.textContent).toContain('Signal flow');
    });

    it('opens a use case diagram from the system catalog before selecting a goal', async () => {
        await render();
        await click('Operational');
        await click('Use case diagram');
        expect(container.querySelector('[aria-label="Use case diagram"]')).not.toBeNull();
        const members = container.querySelector('[data-testid="operative-flow-canvas"]')?.textContent?.split(',');
        expect(members).toEqual(expect.arrayContaining(['system', 'foreign', 'host']));
        expect(members).not.toContain('clinical');
        expect(members).not.toContain('systemWork');
    });

    it('opens an existing scoped goal from Context and follows its native workflow', async () => {
        const before = useModelStore.getState().model!;
        useModelStore.setState({ activeView: { type: 'pathway', layer: 'layerContext' },
            model: { ...before,
                elements: { ...before.elements, hostUsage: { ...before.elements.host, id: 'hostUsage' }, useSetting: { ...before.elements.team, id: 'useSetting', kind: 'UseContext', name: 'Shared care setting', attributes: { careSetting: 'Outpatient clinic' } } },
                relationships: [...before.relationships.map(relationship => relationship.id === 'subject' ? { ...relationship, targetId: 'hostUsage' } : relationship), edge('context-team', 'interactsInContext', 'team', 'hostUsage'), edge('context-setting', 'appliesInContext', 'useSetting', 'hostUsage')],
                workspaceMembership: { ...before.workspaceMembership!, definitionOf: { hostUsage: 'host' } },
                diagrams: [...before.diagrams!, { id: 'boundary', name: 'Existing boundary', diagramType: 'context',
                    viewKind: 'general', elementIds: ['hostUsage'], auto: false } as never] } });
        await render(true);
        expect(container.querySelector('[aria-label="Boundary overview"]')?.textContent).toContain('Care team');
        expect(container.querySelector('[aria-label="Boundary overview"]')?.textContent).toContain('Outpatient clinic');
        expect(container.querySelector('[aria-label="Related operational work"]')?.textContent).not.toContain('External goal');
        await click('Monitor condition');
        expect(container.querySelector('[aria-label="Use case profile"] h2')?.textContent).toBe('Monitor condition');
        const overview = container.querySelector('[aria-label="Use case workflow map"]')!;
        expect(overview.textContent).toContain('Monitoring work');
        expect(container.querySelector('[aria-label="Operational element types"]')).toBeNull();
        // The workflow has no page: its scenarios are listed under it and open the scenario page directly.
        const group = overview.querySelector('[aria-label="Monitoring work workflow"]')!;
        act(() => group.querySelector<HTMLButtonElement>('.pathway-operational-row')!.click()); await settle();
        const where = container.querySelector('[aria-label="Where you are"]')?.textContent;
        expect(where).toContain('Monitor condition');
        expect(where).toContain('Monitoring path');
        expect(where).not.toContain('Monitoring work');
        expect(container.querySelector('[aria-label="Steps"]')?.textContent).toContain('In workflow: Monitoring work');
        expect([...container.querySelectorAll('[aria-label="Steps in order"] li')].map(item => item.textContent)).toEqual([expect.stringContaining('Read signal'), expect.stringContaining('Report signal')]);
        expect(container.querySelector('[aria-label="Scenario diagram"] [data-testid="operative-flow-canvas"]')?.textContent).toContain('systemStep');
        expect(sendElementCreate).not.toHaveBeenCalled();
    });

    it('opens system-case creation from Context and prefers the existing Operational package', async () => {
        const current = useModelStore.getState().model!;
        const writable = { declaration: { writable: true } } as NonNullable<MemoModelDTO['elements'][string]['provenance']>;
        useModelStore.setState({ activeView: { type: 'pathway', layer: 'layerContext' },
            model: { ...current, elements: { ...current.elements,
                host: { ...current.elements.host, file: 'model/structure.sysml', package: 'structure', provenance: writable },
                system: { ...current.elements.system, file: 'model/operational.sysml', package: 'operational', provenance: writable },
            } } });
        await render();
        await click('Add an operational use case');
        expect((container.querySelector('[aria-label="Supported system"]') as HTMLSelectElement).value).toBe('host');
        expect(container.querySelector('form code')?.textContent).toBe('model/operational.sysml');
        expect(sendElementCreate).not.toHaveBeenCalled();
    });

    it('round trips the operational handoff address', () => {
        const entry = { type: 'pathway' as const, layer: 'op', work: 'operational' as const, artifactId: 'model::a b' };
        const url = new URL(viewToPath(entry)!, 'http://localhost');
        expect(pathToView(url.pathname, url.search)).toEqual(entry);
    });

    it('separates clinical and system element types into explicit tables', async () => {
        await render();
        await click('Table');
        const clinicalCases = container.querySelector('[aria-label="Clinical use case table"]')!;
        expect(clinicalCases.textContent).toContain('Assess condition'); expect(clinicalCases.textContent).not.toContain('Monitor condition');
        await click('Workflows (1)'); expect(container.querySelector('[aria-label="Clinical workflow table"]')!.textContent).toContain('Assessment work');
        await click('Scenarios (1)'); expect(container.querySelector('[aria-label="Clinical scenario table"]')!.textContent).toContain('Assessment path');
        await click('Operational'); expect(container.querySelector('[aria-label="Operational scenario table"]')!.textContent).toContain('Monitoring path');
        expect(container.querySelector('[aria-label="Operational scenario table"]')!.textContent).not.toContain('Assessment path');
        await click('Use cases (1)'); expect(container.querySelector('[aria-label="Operational use case table"]')!.textContent).not.toContain('External goal');
    });

    it('opens a scenario from the workflow structure on one page: steps, one diagram, its properties', async () => {
        await render(); await click('Operational'); await click('Table'); await click('Workflows (1)'); await click('Visual');
        expect(container.querySelector('[aria-label="Workflow structure"]')!.textContent).toContain('Monitoring path');
        const scenario = [...container.querySelectorAll('[aria-label="Workflow structure"] button')].find(button => button.textContent?.includes('Monitoring path')) as HTMLButtonElement;
        act(() => scenario.click()); await settle(); await settle();
        const canvas = () => container.querySelector('[aria-label="Scenario diagram"] [data-testid="operative-flow-canvas"]')!;
        expect(container.querySelectorAll('[data-testid="operative-flow-canvas"]')).toHaveLength(1);
        expect(container.querySelector('[data-testid="scenario-diagram"]')).toBeNull();
        expect(canvas().getAttribute('data-highlight')).toBe('');
        act(() => canvas().querySelector<HTMLButtonElement>('[data-node="report"]')!.click()); await settle();
        // A click on the diagram opens the app's properties panel, as on any diagram.
        expect(useModelStore.getState().selectedElementId).toBe('report');
        expect(container.querySelector('[aria-label="Properties"]')).toBeNull();
        expect(container.querySelector('[aria-label="Selection"] strong')!.textContent).toBe('Report signal');
        expect(canvas().getAttribute('data-highlight')).toBe('report');
        await click('Back to the scenario');
        expect(container.querySelector('[aria-label="Operational element types"]')).toBeNull();
        await click('Edit scenario…');
        expect([...container.querySelectorAll('[aria-label="Edit the selection"] label')].map(item => item.textContent)).toEqual(['Trigger', 'Precondition', 'Postcondition', 'Expected result', 'Description']);
        await click('Table');
        expect([...container.querySelectorAll('[aria-label="Scenario table"] th')].map(cell => cell.textContent)).toEqual(['#', 'Operational step', 'Performed by', 'Realizes clinical step']);
        const trigger = container.querySelector('#scenario-field-trigger') as HTMLTextAreaElement;
        act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(trigger, 'A reading is due'); trigger.dispatchEvent(new Event('input', { bubbles: true })); }); await settle();
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'systemPath' } as never);
        await click('Save');
        expect(vi.mocked(sendElementCreate).mock.calls.at(-1)![0]).toMatchObject({ operationalContext: { operation: 'fields', level: 'operational', sourceId: 'systemPath', fields: { trigger: 'A reading is due' } } });
        await click('Read signal');
        expect(useModelStore.getState().selectedElementId).toBe('systemStep');
        expect(container.querySelector('[aria-label="Selection"] strong')!.textContent).toBe('Read signal');
        expect(container.querySelector('[aria-label="Realizes clinical steps"]')!.textContent).toContain('Observe condition');
    });

    it('creates a real use-case diagram with exact selected include and subject context', async () => {
        await render(); await click('Operational');
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
        await render(); await click('Table'); await click('Workflows (1)'); await click('Add workflow');
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
        expect(buttons('Operational')[0].getAttribute('aria-pressed')).toBe('true'); expect(buttons('+ Workflow')[0].disabled).toBe(false);
        await chooseNode('External goal'); expect(container.querySelector('[aria-label="Current operational task"]')!.textContent).toContain('shown as context'); await click('Work on Other'); expect(useModelStore.getState().workspace).toBe('other');
    });
    it('reviews an activity’s canonical functions and opens its linked functional flow', async () => {
        await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path'); await chooseNode('Read signal');
        const detail = container.querySelector('[aria-label="Current operational task"]')!;
        expect(detail.textContent).toContain('Acquire signal'); expect(detail.textContent).toContain('Realizes clinical work');
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

    it('folds the scenario steps to a rail of numbers', async () => {
        await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path'); await click('Overview');
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="Hide the steps"]')!.click()); await settle();
        const rail = () => [...container.querySelectorAll('[aria-label="Steps in order"] button')].map(button => button.getAttribute('aria-label'));
        expect(rail()).toEqual(['1. Read signal', '2. Report signal']);
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="2. Report signal"]')!.click()); await settle();
        expect(container.querySelector('[aria-label="Selection"] strong')!.textContent).toBe('Report signal');
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="Show the steps"]')!.click()); await settle();
        expect(container.querySelector('[aria-label="Steps"]')!.textContent).toContain('In workflow: Monitoring work');
    });

    it('opens an existing scenario diagram during read-only review', async () => {
        useModelStore.setState({ pinned: { label: 'Review snapshot' } as never }); await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path'); await click('Open scenario diagram');
        expect(container.querySelector('[aria-label="Scenario diagram"] [data-testid="operative-flow-canvas"]')).not.toBeNull();
        expect(buttons('Edit scenario…')[0].disabled).toBe(true);
        // Edit diagram opens the saved diagram on its own page, which offers the way back to this scenario.
        await click('Edit diagram');
        expect(useModelStore.getState().diagramReturn).toMatchObject({ diagramId: 'scenarioView', label: 'Monitoring path' });
        expect(container.querySelector('[data-testid="scenario-diagram"]')).toBeNull();
        await click('All use cases'); expect(container.querySelector('[aria-label="Scenario page"]')).toBeNull();
    });
    it('creates an alternate scenario in the selected workflow and waits for its canonical model identity', async () => {
        await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await click('Scenario');
        const name = container.querySelector('form input') as HTMLInputElement;
        act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Recovery path'); name.dispatchEvent(new Event('input', { bubbles: true })); });
        const path = container.querySelector('[aria-label="Scenario path"]') as HTMLSelectElement;
        act(() => { path.value = 'alternate'; path.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'recovery' } as never);
        act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle();
        const request = vi.mocked(sendElementCreate).mock.calls.at(-1)![0];
        const before = useModelStore.getState().model!;
        act(() => useModelStore.setState({ model: { ...before, elements: { ...before.elements, recovery: { ...before.elements.systemPath, id: 'recovery', name: 'Recovery path', attributes: { scenarioKind: 'alternate' } } }, workspaceMembership: { ...before.workspaceMembership!, membership: { ...before.workspaceMembership!.membership, recovery: ['host'] } }, revision: 2 } })); await settle();
        expect(request).toMatchObject({ id: '', name: 'Recovery path', operationalContext: { operation: 'scenario', level: 'operational', workspace: 'host', workflowId: 'systemWork', scenarioKind: 'alternate' } });
        expect(container.querySelector('[aria-label="Current operational task"]')!.textContent).toContain('Recovery path');
        expect(container.querySelector('[role="status"]')!.textContent).toBe('Saved to the model.');
    });

    it('links clinical work to a system counterpart from the clinical end, saved with the system work', async () => {
        await render(); await chooseNode('Assess condition'); await chooseNode('Assessment work');
        const detail = () => container.querySelector('[aria-label="Current operational task"]')!;
        // The workflow has no step-by-step summary of its own; its scenarios' pages show that.
        expect(detail().querySelector('[aria-label="Covered via linked steps"]')).toBeNull();
        await click('Link operational work…');
        const picker = container.querySelector('select[aria-label="Connect existing work"]') as HTMLSelectElement;
        expect([...picker.options].map(option => option.value)).toEqual(['', 'systemWork']);
        expect(detail().textContent).not.toContain('Primary save location');
        act(() => { picker.value = 'systemWork'; picker.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
        expect(detail().textContent).toContain('Primary save location');
        vi.mocked(sendElementCreate).mockResolvedValueOnce({ success: true, elementId: 'systemWork' } as never);
        act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await settle();
        expect(vi.mocked(sendElementCreate).mock.calls.at(-1)![0]).toMatchObject({ file: 'model/work.sysml',
            operationalContext: { operation: 'refine', level: 'operational', workspace: 'host', sourceId: 'systemWork', targetId: 'clinicalWork' } });
        const before = useModelStore.getState().model!;
        act(() => useModelStore.setState({ model: { ...before, relationships: [...before.relationships, edge('workRefine', 'realizes', 'systemWork', 'clinicalWork')] } })); await settle();
        expect(detail().querySelector('[aria-label="Assessment work workflow"]')).not.toBeNull();
        expect(detail().querySelector('[aria-label="Covered via linked steps"]')).toBeNull();
        expect(detail().textContent).toContain('Monitoring work');
        await click('Monitoring work');
        expect(buttons('Operational')[0].getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelector('[aria-label="Current operational task"] [aria-label="Monitoring work workflow"]')).not.toBeNull();
        expect(container.querySelector('[aria-label="Current operational task"]')!.textContent).toContain('Assessment work');
    });

    it('lists step counterparts on the scenario', async () => {
        await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await chooseNode('Monitoring path');
        const via = () => container.querySelector('[aria-label="Covered via linked steps"]')!;
        const table = via().querySelector('table')!;
        expect([...table.querySelectorAll('th')].map(cell => cell.textContent)).toEqual(['Operational step', 'Realizes clinical step']);
        expect(via().textContent).toContain('Clinical scenario: Assessment path');
        expect([...table.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent))).toEqual([['Read signal', 'Observe condition']]);
        act(() => [...table.querySelectorAll('button')].find(button => button.textContent === 'Observe condition')!.click()); await settle();
        expect(buttons('Clinical')[0].getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelector('[aria-label="Current operational task"] h2')!.textContent).toBe('Observe condition');
    });

    it('offers scenario conditions and alternate paths in the workflow context', async () => {
        await render(); await click('Operational'); await chooseNode('Monitor condition'); await chooseNode('Monitoring work'); await click('Scenario');
        expect(container.textContent).toContain('Precondition'); expect(container.textContent).toContain('Postcondition');
        const select = container.querySelector('[aria-label="Scenario path"]') as HTMLSelectElement; expect([...select.options].map(option => option.value)).toEqual(['nominal', 'alternate']);
    });
});

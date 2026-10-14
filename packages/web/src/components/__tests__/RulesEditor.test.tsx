// @vitest-environment jsdom
//
// ─── The rule editor ─────────────────────────────────────────────────────────
//
// What a person sees and can do: the rules with their clauses, a medical-device
// rule that says it traces to nothing, and a new rule that can be written only
// after it was previewed and only while it is unchanged since.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';

const previewRule = vi.fn();
const createRule = vi.fn();
vi.mock('../../store/ws-client', () => ({
    previewRule: (...args: unknown[]) => previewRule(...args),
    createRule: (...args: unknown[]) => createRule(...args),
    methodologySource: vi.fn(), writeRulePolicy: vi.fn(),
}));

import { useModelStore } from '../../store/model-store';
import { RulesEditor } from '../RulesEditor';

let root: Root | undefined;
let container: HTMLElement;

const clauses = [
    { qualifiedName: 'p::iso14971::c7', standard: 'ISO 14971:2019', standardName: 'p::iso14971', clauseNumber: '7', title: 'risk control' },
];
const rule = (over: Record<string, unknown> = {}) => ({
    sourceRuleId: 'CR-MED-001', sourceRuleType: 'HazardMitigationRule', activeRuleId: 'CR-MED-001', activeRuleType: 'HazardMitigationRule',
    disposition: 'enabled', declaredSeverity: 'error', effectiveSeverity: 'error', tailoring: 'assurance', policyChain: [],
    domain: 'medicalDevice', enforces: ['p::iso14971::c7'], ...over,
});

beforeEach(() => {
    previewRule.mockReset();
    createRule.mockReset();
    useModelStore.setState({
        effectiveRules: [
            rule({ obligation: 'required' }),
            rule({ sourceRuleId: 'CR-MED-021', sourceRuleType: 'SwComponentReqRule', enforces: [] }),
            rule({ sourceRuleId: 'CR-ONT-001', sourceRuleType: 'ContainmentAcyclicRule', domain: 'modelling', tailoring: 'invariant', enforces: [] }),
        ],
        ruleDiagnostics: [], ruleClauses: clauses, ruleProjectFiles: ['model/methodology/project.sysml'],
    } as never);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(RulesEditor)); });
});
afterEach(() => { act(() => root?.unmount()); container.remove(); });

const text = () => container.textContent ?? '';
const byLabel = <T extends HTMLElement>(label: string) => container.querySelector(`[aria-label="${label}"]`) as T;
const button = (name: string) => [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === name) as HTMLButtonElement;

function type(element: HTMLElement, value: string): void {
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    act(() => {
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value);
        element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

describe('the rule list', () => {
    it('shows each rule with the clause it enforces', () => {
        expect(text()).toContain('CR-MED-001');
        expect(text()).toContain('EnforcesClause → ISO 14971:2019 §7');
    });
    it('shows a rule\'s obligation, and a rule with no clause is not called a gap', () => {
        const rows = [...container.querySelectorAll('li')];
        const traced = rows.find(row => row.textContent?.includes('CR-MED-001'))!;
        expect(traced.querySelector('[data-testid="obligation"]')?.textContent).toBe('Required');
        const untraced = rows.find(row => row.textContent?.includes('CR-MED-021'))!;
        expect(untraced.textContent).not.toContain('no clause');
        expect(untraced.querySelector('[data-testid="obligation"]')).toBeNull();
        expect(untraced.querySelector('[data-testid="trace"]')).toBeNull();
    });
    it('narrows to an obligation', () => {
        act(() => { button('Required').click(); });
        const list = byLabel('Rule list').textContent ?? '';
        expect(list).toContain('CR-MED-001');
        expect(list).not.toContain('CR-ONT-001');
    });
    it('narrows to a domain', () => {
        act(() => { button('Modelling 1').click(); });
        const list = byLabel('Rule list').textContent ?? '';
        expect(list).toContain('CR-ONT-001');
        expect(list).not.toContain('CR-MED-001');
    });
});

describe('writing a rule', () => {
    function fill(): void {
        act(() => { button('New rule').click(); });
        type(byLabel('Rule id'), 'ORG-001');
        type(byLabel('Rule name'), 'TwoControls');
        type(byLabel('Applies to'), 'Hazard');
        type(byLabel('Relation'), 'mitigates');
        type(byLabel('Count'), '2');
        type(byLabel('Rule rationale'), 'SOP 4.1');
        type(byLabel('Write the rule into'), 'model/methodology/project.sysml');
    }

    it('cannot be previewed until it is complete, and says what is missing', () => {
        act(() => { button('New rule').click(); });
        expect(button('Preview').disabled).toBe(true);
        expect(text()).toContain('Still needed: an id, a name, what it applies to');
    });

    it('can be written only after a preview, and only while unchanged since', async () => {
        previewRule.mockResolvedValue({
            success: true, subjects: 1, baseRevision: 'rev1',
            flagged: [{ elementId: 'h1', elementKind: 'Hazard', elementName: 'UndetectedTemperatureDeviation' }],
        });
        createRule.mockResolvedValue({ success: true, revision: 'rev2' });
        fill();
        expect(button('Write rule').disabled).toBe(true);

        await act(async () => { button('Preview').click(); });
        expect(text()).toContain('Would flag 1 of 1 Hazard');
        expect(text()).toContain('UndetectedTemperatureDeviation');
        expect(previewRule.mock.calls[0][0]).toMatchObject({
            id: 'ORG-001', typeName: 'TwoControls', appliesTo: 'Hazard',
            condition: { kind: 'atLeast', relation: 'mitigates', count: 2 }, file: 'model/methodology/project.sysml',
        });
        expect(button('Write rule').disabled).toBe(false);

        // Any change after the preview takes the write away until it is previewed again.
        type(byLabel('Count'), '3');
        expect(button('Write rule').disabled).toBe(true);

        await act(async () => { button('Preview').click(); });
        await act(async () => { button('Write rule').click(); });
        expect(createRule).toHaveBeenCalledOnce();
        expect(createRule.mock.calls[0][0]).toMatchObject({ baseRevision: 'rev1', condition: { count: 3 } });
        expect(text()).toContain('Wrote ORG-001');
    });

    it('shows the server\'s refusal and offers no write', async () => {
        previewRule.mockResolvedValue({ success: false, code: 'duplicate-id', error: 'A rule with id ORG-001 already exists.' });
        fill();
        await act(async () => { button('Preview').click(); });
        expect(text()).toContain('A rule with id ORG-001 already exists.');
        expect(button('Write rule').disabled).toBe(true);
    });

    it('chooses a clause from a search', () => {
        act(() => { button('New rule').click(); });
        type(byLabel('Find a clause'), '14971 risk');
        act(() => { [...container.querySelectorAll('[aria-label="Clause matches"] button')][0].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
        expect(byLabel('Chosen clauses').textContent).toContain('EnforcesClause → ISO 14971:2019 §7');
    });

    it('sends the obligation and takes the severity from it, and the clause as the trace', async () => {
        previewRule.mockResolvedValue({ success: true, subjects: 0, flagged: [], baseRevision: 'rev1' });
        fill();
        type(byLabel('Obligation'), 'required');
        expect(byLabel('Severity').textContent).toContain('error (from the obligation)');
        type(byLabel('Find a clause'), '14971 risk');
        act(() => { [...container.querySelectorAll('[aria-label="Clause matches"] button')][0].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
        expect(byLabel('Chosen clauses').innerHTML).toContain('#EnforcesClause dependency from TwoControls to p::iso14971::c7;');
        await act(async () => { button('Preview').click(); });
        expect(previewRule.mock.calls[0][0]).toMatchObject({ obligation: 'required', severity: 'error', enforces: ['p::iso14971::c7'] });
    });

    it('reports a file that changed after the preview, and writes nothing', async () => {
        previewRule.mockResolvedValue({ success: true, subjects: 0, flagged: [], baseRevision: 'rev1' });
        createRule.mockResolvedValue({ success: false, conflict: true });
        fill();
        await act(async () => { button('Preview').click(); });
        await act(async () => { button('Write rule').click(); });
        expect(text()).toContain('The file changed since the preview; preview again.');
    });
});

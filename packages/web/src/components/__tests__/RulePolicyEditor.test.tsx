// @vitest-environment jsdom
//
// ─── Tailoring a set of rules ────────────────────────────────────────────────
//
// One policy selects one rule, every rule of a standard, or every rule on a
// layer. The form says how many rules the choice reaches, which invariants
// keep running, and writes the one decision.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';

const writeRulePolicy = vi.fn();
const methodologySource = vi.fn();
vi.mock('../../store/ws-client', () => ({
    writeRulePolicy: (...args: unknown[]) => writeRulePolicy(...args),
    methodologySource: (...args: unknown[]) => methodologySource(...args),
}));

import { useModelStore } from '../../store/model-store';
import { RulePolicyEditor } from '../RulePolicyEditor';

let root: Root | undefined;
let container: HTMLElement;

const rule = (id: string, over: Record<string, unknown> = {}) => ({
    sourceRuleId: id, sourceRuleType: `${id}Rule`, activeRuleId: id, activeRuleType: `${id}Rule`,
    disposition: 'enabled', declaredSeverity: 'error', effectiveSeverity: 'error', tailoring: 'assurance', policyChain: [],
    subjectPackage: 'memo_assurance_safety_risk', enforces: ['p::iso14971::c7'], ...over,
});

beforeEach(() => {
    writeRulePolicy.mockReset().mockResolvedValue({ success: true });
    methodologySource.mockReset().mockResolvedValue({ success: true, revision: 'r1' });
    useModelStore.setState({
        effectiveRules: [
            rule('CR-MED-001'),
            rule('CR-MED-002', { subjectPackage: 'memo_architecture_logical_structure', enforces: ['p::iec62304::c5'] }),
            rule('CR-ONT-001', { tailoring: 'invariant' }),
        ],
        ruleDiagnostics: [],
        ruleClauses: [
            { qualifiedName: 'p::iso14971::c7', standard: 'ISO 14971:2019', standardName: 'p::iso14971', clauseNumber: '7' },
            { qualifiedName: 'p::iec62304::c5', standard: 'IEC 62304:2006', standardName: 'p::iec62304', clauseNumber: '5' },
        ],
        methodology: { folders: [{ sourceFiles: ['model/methodology/project.sysml'] }] },
    } as never);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(RulePolicyEditor)); });
});
afterEach(() => { act(() => root?.unmount()); container.remove(); });

const text = () => container.textContent ?? '';
const byLabel = <T extends HTMLElement>(label: string) => container.querySelector(`[aria-label="${label}"]`) as T;
const button = (name: string) => [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === name) as HTMLButtonElement;

function pick(element: HTMLElement, value: string): void {
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    act(() => {
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value);
        element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

describe('a policy that selects by standard', () => {
    it('says what it reaches, and writes one policy naming the standard', async () => {
        pick(byLabel('Selects'), 'standard');
        expect([...byLabel<HTMLSelectElement>('Standard').options].map(o => o.textContent))
            .toEqual(['Select a standard…', 'IEC 62304:2006', 'ISO 14971:2019']);
        pick(byLabel('Standard'), 'p::iso14971');
        // The invariant that enforces a clause of it is reached, and keeps running.
        expect(text()).toContain('Reaches 2 rules · 1 invariant keeps running: CR-MED-001, CR-ONT-001');

        pick(byLabel('Rationale'), 'out of scope');
        pick(byLabel('Target methodology file'), 'model/methodology/project.sysml');
        await act(async () => { button('Write policy').click(); });
        expect(writeRulePolicy).toHaveBeenCalledOnce();
        const request = writeRulePolicy.mock.calls[0][0];
        expect(request).toMatchObject({ targetStandard: 'p::iso14971', disposition: 'disabled', baseRevision: 'r1' });
        expect(request.targetRuleType).toBeUndefined();
    });
});

describe('a policy that selects by layer', () => {
    it('offers the layers that have rules and does not offer to replace a set', () => {
        pick(byLabel('Selects'), 'category');
        expect([...byLabel<HTMLSelectElement>('Layer').options].map(o => o.value))
            .toEqual(['', 'memo_architecture_logical_structure', 'memo_assurance_safety_risk']);
        pick(byLabel('Layer'), 'memo_assurance_safety_risk');
        expect(text()).toContain('Reaches 2 rules');
        expect([...byLabel<HTMLSelectElement>('Disposition').options].map(o => o.value)).not.toContain('replaced');
    });

    it('cannot be written when the layer holds only invariants to disable', () => {
        useModelStore.setState({ effectiveRules: [rule('CR-ONT-001', { tailoring: 'invariant' })] } as never);
        act(() => { root!.render(createElement(RulePolicyEditor)); });
        pick(byLabel('Selects'), 'category');
        pick(byLabel('Layer'), 'memo_assurance_safety_risk');
        pick(byLabel('Rationale'), 'x');
        pick(byLabel('Target methodology file'), 'model/methodology/project.sysml');
        expect(button('Write policy').disabled).toBe(true);
    });
});

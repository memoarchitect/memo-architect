// @vitest-environment jsdom
//
// ─── The Change page (A10) ───────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { Change } from '../views/Change';
import { projectRows, introducingProject } from '../lib/projects-view';
import { useModelStore } from '../store/model-store';

const asked: Array<string | undefined> = [];
let answer: Record<string, unknown> = {};
vi.mock('../store/ws-client', () => ({
    requestImpact: async (target?: string) => { asked.push(target); return { requestId: 'r', ...answer }; },
    sendUserPreferencesSave: () => undefined,
}));

const el = (id: string, kind: string, attributes: Record<string, string> = {}) =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes });
const edge = (type: string, sourceId: string, targetId: string) => ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });
const model = {
    elements: Object.fromEntries([
        el('prjTip', 'Project', { trackerLink: 'https://tracker.example/PRJ-1' }), el('prjOther', 'Project'),
        el('relEu', 'ReleaseRecord', { modelCommit: 'aaaaaaa1111' }), el('relUs', 'ReleaseRecord', { modelCommit: 'bbbbbbb2222' }),
        el('usOutput', 'LogicalComponent'),
    ].map(e => [e.id, e])),
    relationships: [edge('feeds', 'prjTip', 'relEu'), edge('feeds', 'prjTip', 'relUs'), edge('introducedBy', 'usOutput', 'prjTip')],
    errors: [], viewpoints: [],
    registries: { relationships: [], kinds: ['MemoPart', 'Project', 'ReleaseRecord', 'LogicalComponent'].map(name => ({ name, superType: name === 'MemoPart' ? undefined : 'MemoPart' })) },
};

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(Change)); });
    return container;
}
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 0)); });

beforeEach(() => {
    asked.length = 0;
    answer = {};
    useModelStore.setState({ model: model as never, pinned: null, workspace: null, connected: true, versionRefs: [{ name: 'main', kind: 'branch', commit: 'abc', label: 'Latest commit on main' }] });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('projects', () => {
    it('reads each project with its tracker, the releases it feeds with their commits, and the variants it introduced', () => {
        expect(projectRows(model as never, null)).toEqual([
            { id: 'prjOther', name: 'prjOther', trackerLink: undefined, feeds: [], introduced: [] },
            { id: 'prjTip', name: 'prjTip', trackerLink: 'https://tracker.example/PRJ-1', feeds: [{ id: 'relEu', name: 'relEu', commit: 'aaaaaaa' }, { id: 'relUs', name: 'relUs', commit: 'bbbbbbb' }], introduced: [{ id: 'usOutput', name: 'usOutput' }] },
        ]);
        expect(introducingProject(model as never, 'usOutput')).toBe('prjTip');
        expect(introducingProject(model as never, 'relEu')).toBeUndefined();
    });
});

describe('the Change page', () => {
    it('lists the projects, one that feeds two releases among them', () => {
        const view = render();
        const rows = [...view.querySelectorAll('[data-testid="project-row"]')].map(r => r.textContent);
        expect(rows[1]).toContain('prjTip');
        expect(rows[1]).toContain('relEu @ aaaaaaa, relUs @ bbbbbbb');
        expect(rows[1]).toContain('usOutput');
        expect(rows[0]).toContain('no release');
    });

    it('asks for the impact from HEAD by default, or from the target typed, and shows what the server returns, as returned', async () => {
        answer = { report: {
            target: 'main', base: { commit: 'c8c8c8c8c8', ref: 'main' }, head: 'working tree',
            changed: { added: 0, removed: 0, changed: 1, addedLinks: 0, removedLinks: 0, elements: [{ id: 'f', name: 'fnDeliverEnergy', kind: 'SystemFunction', layer: 'functional', via: 'changed', depth: 0 }] },
            reached: { requirements: [{ id: 'r', name: 'reqEnergyLimits', kind: 'Requirement', layer: 'requirements', via: 'satisfiedBy', depth: 1 }], verification: [{ id: 'v', name: 'vcEnergyLimits', kind: 'VerificationCase', layer: 'verification', via: 'verifiedBy', depth: 1 }] },
            systems: [{ id: 's', name: 'AblationGeneratorSystem', scope: 'system' }],
            releases: [{ id: 'a', name: 'relAblation', status: 'released', commit: 'abc1234', needsNewRelease: true }],
            devices: [{ id: 'd', name: 'devFda', jurisdiction: 'FDA_510k' }],
            reopened: [{ workspace: 'AblationGeneratorSystem', step: 's', label: 'Sys Verification' }],
            limits: ['A rename shows as a removal and an addition.'],
        } };
        const view = render();
        await act(async () => { (view.querySelector('[data-testid="impact-compute"]') as HTMLElement).click(); });
        await settle();
        expect(asked).toEqual([undefined]);
        const text = view.querySelector('[data-testid="impact-report"]')!.textContent!;
        expect(text).toContain('c8c8c8c');
        expect(text).toContain('fnDeliverEnergy (SystemFunction), changed');
        expect(text).toContain('Reached: Requirements (1)');
        expect(text).toContain('reqEnergyLimits (Requirement), by satisfiedBy');
        expect(text).toContain('Reached: Verification (1)');
        expect(text).toContain('AblationGeneratorSystem (system)');
        expect(text).toContain('relAblation, released @ abc1234: needs a new release');
        expect(text).toContain('devFda (FDA_510k)');
        expect(text).toContain('AblationGeneratorSystem: Sys Verification');
        expect(text).toContain('A rename shows as a removal');
        const input = view.querySelector('[data-testid="impact-target"]') as HTMLInputElement;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'main');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => { (view.querySelector('[data-testid="impact-compute"]') as HTMLElement).click(); });
        await settle();
        expect(asked).toEqual([undefined, 'main']);
        expect([...view.querySelectorAll('#impact-targets option')].map(o => o.getAttribute('value'))).toEqual(['main', 'aaaaaaa1111', 'bbbbbbb2222']);
    });

    it('says why when the impact cannot be computed', async () => {
        answer = { error: '"x" is not a commit or a ref of this repository' };
        const view = render();
        await act(async () => { (view.querySelector('[data-testid="impact-compute"]') as HTMLElement).click(); });
        await settle();
        expect(view.querySelector('[data-testid="impact-problem"]')!.textContent).toContain('not a commit or a ref');
        expect(view.querySelector('[data-testid="impact-report"]')).toBeNull();
    });

    it('offers no impact in a pinned view, which has no working tree to compare', () => {
        useModelStore.setState({ pinned: { kind: 'release', label: 'x' } });
        const view = render();
        expect(view.querySelector('[data-testid="impact-compute"]')).toBeNull();
        expect(view.querySelector('[data-testid="projects"]')).not.toBeNull();
    });
});

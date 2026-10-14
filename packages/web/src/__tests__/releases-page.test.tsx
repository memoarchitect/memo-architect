// @vitest-environment jsdom
//
// ─── The Releases page ───────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { Releases } from '../views/Releases';
import { useModelStore } from '../store/model-store';

const diffs: Array<[string, string]> = [];
const created: Array<Record<string, unknown>> = [];
const opened: Array<{ release?: string }> = [];
let diffAnswer: Record<string, unknown> = {};
let createAnswer: Record<string, unknown> = { success: true };
vi.mock('../store/ws-client', () => ({
    requestReleaseDiff: async (release: string, against: string) => { diffs.push([release, against]); return { requestId: 'r', ...diffAnswer }; },
    requestReleaseCreate: async (request: Record<string, unknown>) => { created.push(request); return { requestId: 'c', ...createAnswer }; },
    sendVersionOpen: (selection: { release?: string }) => { opened.push(selection); },
    sendUserPreferencesSave: () => undefined,
}));

const el = (id: string, kind: string, extra: Record<string, unknown> = {}, attributes: Record<string, string> = {}) =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'model/m.sysml', attributes, ...extra });
const record = (id: string, status: string, revision: string, commit: string) =>
    el(id, 'ReleaseRecord', { file: 'model/sos/releases.sysml' }, { status: `ElementStatusKind::${status}`, partNumber: `PN-${id}`, revision, modelCommit: commit });
const edge = (type: string, sourceId: string, targetId: string) => ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });

const model = {
    elements: Object.fromEntries([
        el('Pump', 'System', { isDefinition: true, file: 'model/systems/pump/pump.sysml' }), el('Lab', 'SystemOfSystems', { isDefinition: true }), el('featA', 'ProductFeature'), el('vc', 'VerificationCase'),
        record('relPumpA', 'released', 'A', 'aaaaaaa1111'), record('relPumpB', 'draft', 'B', 'bbbbbbb2222'), record('relLab', 'released', '1', 'ccccccc3333'),
    ].map(e => [e.id, e])),
    relationships: [
        edge('releaseOf', 'relPumpA', 'Pump'), edge('releaseOf', 'relPumpB', 'Pump'), edge('releaseOf', 'relLab', 'Lab'),
        edge('contains', 'relLab', 'relPumpA'), edge('verifiedByCase', 'relLab', 'vc'), edge('selectsFeature', 'relPumpA', 'featA'),
    ],
    errors: [], viewpoints: [],
    enumerations: [{ name: 'ElementStatusKind', literals: ['draft', 'approved', 'released'] }],
    registries: { relationships: [], kinds: ['MemoPart', 'ReleaseRecord', 'System', 'SystemOfSystems', 'ProductFeature', 'VerificationCase'].map(name => ({ name, superType: name === 'MemoPart' ? undefined : 'MemoPart' })) },
};

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(Releases)); });
    return container;
}
const click = (element: Element | null) => act(() => { (element as HTMLElement).click(); });
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 0)); });
const change = (element: Element | null, value: string) => act(() => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value);
    element!.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
});

beforeEach(() => {
    diffs.length = 0; created.length = 0; opened.length = 0; diffAnswer = {}; createAnswer = { success: true };
    useModelStore.setState({ model: model as never, validation: null, pinned: null, workspace: null, role: null, connected: true });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('the Releases page', () => {
    it('lists records by item with part number, revision, status and commit', () => {
        const view = render();
        const groups = [...view.querySelectorAll('[data-testid="release-group"]')].map(g => g.querySelector('h3')!.textContent);
        expect(groups).toEqual(['Lab', 'Pump']);
        const rows = [...view.querySelectorAll('[data-testid="release-row"]')].map(r => r.textContent);
        expect(rows.find(r => r!.startsWith('relPumpB'))).toContain('PN-relPumpBB—draftbbbbbbb');
    });

    it('shows an SoS version with the releases it pins and its evidence, and a features by releases matrix', () => {
        const view = render();
        const version = view.querySelector('[data-testid="sos-version"]')!.textContent!;
        expect(version).toContain('Pins: relPumpA rev A @ aaaaaaa');
        expect(version).toContain('Evidence (verified by): vc');
        const matrix = view.querySelector('[data-testid="feature-matrix"]')!;
        const row = [...matrix.querySelectorAll('tbody tr')].find(r => r.textContent!.startsWith('featA'))!;
        expect([...row.querySelectorAll('td')].map(c => c.textContent)).toEqual(['featA', '✓', '', '']);
    });

    it('shows which features each market has, from the devices that cover the releases that select them', () => {
        const withDevices = {
            ...model,
            elements: { ...model.elements, devEu: el('devEu', 'RegulatedDevice', {}, { jurisdiction: 'RegulatoryRegimeKind::MDR' }) },
            relationships: [...model.relationships, edge('covers', 'devEu', 'relPumpA')],
            registries: { ...model.registries, kinds: [...model.registries.kinds, { name: 'RegulatedDevice', superType: 'MemoPart' }] },
        };
        useModelStore.setState({ model: withDevices as never });
        const matrix = render().querySelector('[data-testid="market-matrix"]')!;
        expect([...matrix.querySelectorAll('thead th')].map(c => c.textContent)).toEqual(['Feature', 'MDR']);
        expect([...matrix.querySelectorAll('tbody tr')].map(r => r.textContent)).toEqual(['featA✓']);
    });

    it('asks for the changes since the previous release and shows them for the chosen role', async () => {
        diffAnswer = {
            before: { label: 'relPumpA', commit: 'a' }, after: { label: 'relPumpB', commit: 'b' }, previous: true,
            diff: { added: [], removed: [], changed: [{ id: 'Pump', name: 'Pump', kind: 'System', changes: ['attributes changed'] }], addedRels: [], removedRels: [], summary: {} },
        };
        const view = render();
        click(view.querySelector('[data-testid="changes-relPumpB"]'));
        await settle();
        expect(diffs).toEqual([['relPumpB', 'previous']]);
        const text = view.querySelector('[data-testid="release-diff"]')!.textContent!;
        expect(text).toContain('relPumpB since relPumpA (the previous release)');
        expect(text).toContain('Pump (System): attributes changed');
    });

    it('says why there is no previous release instead of guessing', async () => {
        diffAnswer = { error: 'This release has no previous release: no earlier record of the same item is an ancestor of it.' };
        const view = render();
        click(view.querySelector('[data-testid="changes-relPumpA"]'));
        await settle();
        expect(view.querySelector('[data-testid="release-diff-error"]')!.textContent).toContain('no previous release');
    });

    it('opens a release as a pinned view', () => {
        const view = render();
        click(view.querySelector('[data-testid="open-relPumpA"]'));
        expect(opened).toEqual([{ release: 'relPumpA' }]);
    });

    it('creates a release in the file that holds records, with every statement in one request', async () => {
        const view = render();
        click(view.querySelector('[data-testid="create-release"]'));
        change(view.querySelector('[data-testid="release-item"]'), 'Pump');
        change(view.querySelector('[data-testid="release-name"]'), 'relPumpC');
        change(view.querySelector('[data-testid="release-pn"]'), 'PN-9');
        change(view.querySelector('[data-testid="release-revision"]'), 'C');
        click([...view.querySelectorAll('[data-testid="create-release-form"] label')].find(l => l.textContent!.includes('featA'))!.querySelector('input'));
        click(view.querySelector('[data-testid="release-submit"]'));
        await settle();
        expect(created).toHaveLength(1);
        expect(created[0]).toMatchObject({ name: 'relPumpC', itemId: 'Pump', partNumber: 'PN-9', revision: 'C', status: 'draft', features: ['featA'], file: 'model/sos/releases.sysml' });
    });

    it('shows the server\'s refusal when the write is refused', async () => {
        createAnswer = { success: false, error: 'There are uncommitted changes in model/systems/pump' };
        const view = render();
        click(view.querySelector('[data-testid="create-release"]'));
        change(view.querySelector('[data-testid="release-item"]'), 'Pump');
        change(view.querySelector('[data-testid="release-name"]'), 'relPumpC');
        change(view.querySelector('[data-testid="release-pn"]'), 'PN-9');
        change(view.querySelector('[data-testid="release-revision"]'), 'C');
        click(view.querySelector('[data-testid="release-submit"]'));
        await settle();
        expect(view.querySelector('[data-testid="release-create-error"]')!.textContent).toContain('uncommitted changes');
    });

    it('offers neither Create, Open nor Changes in a pinned view', () => {
        useModelStore.setState({ pinned: { kind: 'release', label: 'relLab' } });
        const view = render();
        expect(view.querySelector('[data-testid="create-release"]')).toBeNull();
        expect(view.querySelector('[data-testid="open-relPumpA"]')).toBeNull();
        expect(view.querySelector('[data-testid="changes-relPumpA"]')).toBeNull();
    });
});

// @vitest-environment jsdom
//
// ─── Regulated devices on the Documents page (A12) ───────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { RegulatedDevices } from '../components/RegulatedDevices';
import { regulatedDevices } from '../lib/devices-view';
import { useModelStore } from '../store/model-store';

const generated: string[] = [];
let answer: Record<string, unknown> = {};
vi.mock('../store/ws-client', () => ({
    requestDeviceDhf: async (device: string) => { generated.push(device); return { requestId: 'r', ...answer }; },
    sendUserPreferencesSave: () => undefined,
}));

const el = (id: string, kind: string, attributes: Record<string, string> = {}) =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes });
const edge = (type: string, sourceId: string, targetId: string) => ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });

const model = {
    elements: Object.fromEntries([
        el('devEu', 'RegulatedDevice', { jurisdiction: 'RegulatoryRegimeKind::MDR', submissionId: 'EU-1' }),
        el('devFda', 'RegulatedDevice', { jurisdiction: 'RegulatoryRegimeKind::FDA_510k' }),
        el('relEu', 'ReleaseRecord', { modelCommit: 'aaaaaaa1234567' }), el('relUs', 'ReleaseRecord', { modelCommit: 'bbbbbbb7654321' }),
    ].map(e => [e.id, e])),
    relationships: [edge('covers', 'devEu', 'relEu'), edge('covers', 'devFda', 'relUs')],
    errors: [], viewpoints: [],
    registries: { relationships: [], kinds: ['MemoPart', 'RegulatedDevice', 'ReleaseRecord'].map(name => ({ name, superType: name === 'MemoPart' ? undefined : 'MemoPart' })) },
};

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(RegulatedDevices)); });
    return container;
}
beforeEach(() => { generated.length = 0; answer = {}; useModelStore.setState({ model: model as never, pinned: null, workspace: null, connected: true }); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('regulated devices', () => {
    it('reads each device with its jurisdiction, submission and the releases it covers with their commits', () => {
        expect(regulatedDevices(model as never, null)).toEqual([
            { id: 'devEu', name: 'devEu', jurisdiction: 'MDR', submissionId: 'EU-1', covers: [{ id: 'relEu', name: 'relEu', commit: 'aaaaaaa' }] },
            { id: 'devFda', name: 'devFda', jurisdiction: 'FDA_510k', submissionId: undefined, covers: [{ id: 'relUs', name: 'relUs', commit: 'bbbbbbb' }] },
        ]);
    });

    it('lists them on the page and renders nothing when there is none', () => {
        const view = render();
        expect([...view.querySelectorAll('[data-testid="device-row"]')].map(r => r.textContent!.replace('Generate documents', ''))).toEqual([
            'devEuMDREU-1relEu @ aaaaaaa', 'devFdaFDA_510k—relUs @ bbbbbbb',
        ]);
        act(() => root!.unmount());
        container!.remove();
        useModelStore.setState({ model: { ...model, elements: {} } as never });
        expect(render().innerHTML).toBe('');
    });

    it('generates a device\'s documents and says what was written, or why not', async () => {
        answer = { success: true, outputDir: '/p/dhf-output/devEu', releases: [{ documents: [1, 2, 3] }], riskDocuments: 2, notes: [] };
        const view = render();
        await act(async () => { (view.querySelector('[data-testid="generate-devEu"]') as HTMLElement).click(); });
        expect(generated).toEqual(['devEu']);
        expect(view.querySelector('[data-testid="result-devEu"]')!.textContent).toBe('3 documents in /p/dhf-output/devEu, 2 of them the risk management file');
        answer = { success: false, error: 'devFda covers no release' };
        await act(async () => { (view.querySelector('[data-testid="generate-devFda"]') as HTMLElement).click(); });
        expect(view.querySelector('[data-testid="result-devFda"]')!.textContent).toBe('devFda covers no release');
    });

    it('offers no Generate button in a pinned view', () => {
        useModelStore.setState({ pinned: { kind: 'release', label: 'x' } });
        expect(render().querySelector('[data-testid="generate-devEu"]')).toBeNull();
    });
});

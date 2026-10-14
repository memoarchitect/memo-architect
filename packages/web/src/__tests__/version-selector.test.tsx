// @vitest-environment jsdom
//
// ─── The Version selector and the pinned banner ──────────────────────────────

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { VersionSelector } from '../components/VersionSelector';
import { PinnedBanner } from '../components/PinnedBanner';
import { useModelStore } from '../store/model-store';

const opened: Array<{ release?: string; ref?: string }> = [];
vi.mock('../store/ws-client', () => ({
    sendVersionOpen: (selection: { release?: string; ref?: string }) => { opened.push(selection); },
    sendUserPreferencesSave: () => undefined,
}));

const el = (id: string, kind: string, attributes: Record<string, string> = {}) =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes });
const model = {
    elements: Object.fromEntries([
        el('Pump', 'System'), el('relPumpA', 'ReleaseRecord', { status: 'ElementStatusKind::released', revision: 'A' }),
    ].map(e => [e.id, e])),
    relationships: [{ id: 'r', type: 'releaseOf', sourceId: 'relPumpA', targetId: 'Pump', sourceEnd: '', targetEnd: '', file: 'm.sysml' }],
    errors: [],
    registries: { relationships: [], kinds: [{ name: 'MemoPart' }, { name: 'ReleaseRecord', superType: 'MemoPart' }, { name: 'System', superType: 'MemoPart' }] },
};

let root: Root | null = null;
let container: HTMLElement | null = null;
function render(component: () => ReturnType<typeof createElement>): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(component()); });
    return container;
}

beforeEach(() => {
    opened.length = 0;
    useModelStore.setState({ model: model as never, pinned: null, versionRefs: [], versionOpening: null, versionError: null });
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); root = null; container = null; });

describe('the Version selector', () => {
    it('offers Working, each release grouped by item with its revision and status, and unreleased refs marked as such', () => {
        useModelStore.setState({ versionRefs: [{ name: 'main', kind: 'branch', commit: 'abc', label: 'Latest commit on main' }] });
        const view = render(() => createElement(VersionSelector));
        const options = [...view.querySelectorAll('option')].map(o => o.textContent);
        expect(options).toEqual(['Working', 'relPumpA · rev A · released', 'Latest commit on main (not a release)']);
        expect(view.querySelector('optgroup[label="Pump"]')).not.toBeNull();
        expect(view.querySelector('optgroup[label^="Unreleased"]')).not.toBeNull();
    });

    it('asks the server to open the chosen release or ref', () => {
        useModelStore.setState({ versionRefs: [{ name: 'main', kind: 'branch', commit: 'abc', label: 'Latest commit on main' }] });
        const view = render(() => createElement(VersionSelector));
        const select = view.querySelector('select') as HTMLSelectElement;
        act(() => { select.value = 'release:relPumpA'; select.dispatchEvent(new Event('change', { bubbles: true })); });
        act(() => { select.value = 'ref:main'; select.dispatchEvent(new Event('change', { bubbles: true })); });
        expect(opened).toEqual([{ release: 'relPumpA' }, { ref: 'main' }]);
    });

    it('in a pinned view shows what is open and offers only the way back', () => {
        useModelStore.setState({ pinned: { kind: 'ref', label: 'main', notARelease: true, workingUrl: 'http://127.0.0.1:3000' } });
        const view = render(() => createElement(VersionSelector));
        expect([...view.querySelectorAll('option')].map(o => o.textContent)).toEqual(['main (not a release)', 'Working']);
    });
});

describe('the pinned banner', () => {
    it('says nothing on the working model', () => {
        const view = render(() => createElement(PinnedBanner));
        expect(view.textContent).toBe('');
    });

    it('says a release is pinned and read only, with its commits and the way back', () => {
        useModelStore.setState({ pinned: { kind: 'release', label: 'relLabV1', commits: [{ name: 'version', commit: 'abcdef0123' }, { name: 'mapping', commit: '1234567890' }], workingUrl: 'http://x' } });
        const text = render(() => createElement(PinnedBanner)).textContent ?? '';
        expect(text).toContain('Pinned release.');
        expect(text).toContain('relLabV1 · version abcdef0 · mapping 1234567');
        expect(text).toContain('read only');
        expect(text).toContain('Open the working version');
    });

    it('says an unreleased ref is not a release, and that its content can change', () => {
        useModelStore.setState({ pinned: { kind: 'ref', label: 'main', notARelease: true } });
        const text = render(() => createElement(PinnedBanner)).textContent ?? '';
        expect(text).toContain('This is not a release.');
        expect(text).toContain('can change with every commit');
        expect(text).not.toContain('Open the working version');
    });
});

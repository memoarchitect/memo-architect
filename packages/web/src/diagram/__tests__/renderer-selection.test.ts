// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RENDERER_ID } from '../renderer-provider';
import {
    RENDERER_STORAGE_KEY,
    normalizeRendererId,
    selectedRendererId,
    setSelectedRendererId,
    subscribeRendererSelection,
} from '../renderer-selection';

// Node >= 22.4 defines an experimental global `localStorage` that shadows the
// jsdom one unless --localstorage-file is set; back the tests with an
// in-memory store so they are independent of the host Node version.
if (!window.localStorage) {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => void store.set(key, String(value)),
            removeItem: (key: string) => void store.delete(key),
            clear: () => store.clear(),
            key: (index: number) => [...store.keys()][index] ?? null,
            get length() { return store.size; },
        } satisfies Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key' | 'length'>,
    });
}

function setUrl(search: string) {
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
}

afterEach(() => {
    window.localStorage.clear();
    setUrl('');
});

describe('normalizeRendererId', () => {
    it('expands short names to the memo.renderer namespace', () => {
        expect(normalizeRendererId('maxgraph')).toBe('memo.renderer.maxgraph');
        expect(normalizeRendererId('memo.renderer.reactflow')).toBe('memo.renderer.reactflow');
        expect(normalizeRendererId('  ')).toBeUndefined();
        expect(normalizeRendererId(null)).toBeUndefined();
    });
});

describe('selectedRendererId precedence', () => {
    it('defaults to the ReactFlow renderer', () => {
        expect(selectedRendererId()).toBe(DEFAULT_RENDERER_ID);
    });

    it('reads the localStorage preference', () => {
        window.localStorage.setItem(RENDERER_STORAGE_KEY, 'maxgraph');
        expect(selectedRendererId()).toBe('memo.renderer.maxgraph');
    });

    it('lets the URL param override localStorage', () => {
        window.localStorage.setItem(RENDERER_STORAGE_KEY, 'memo.renderer.reactflow');
        setUrl('?renderer=maxgraph');
        expect(selectedRendererId()).toBe('memo.renderer.maxgraph');
    });
});

describe('setSelectedRendererId', () => {
    it('persists, clears the URL override, and notifies subscribers', () => {
        setUrl('?renderer=reactflow&other=1');
        const listener = vi.fn();
        const unsubscribe = subscribeRendererSelection(listener);

        setSelectedRendererId('maxgraph');

        expect(window.localStorage.getItem(RENDERER_STORAGE_KEY)).toBe('memo.renderer.maxgraph');
        expect(window.location.search).not.toContain('renderer=');
        expect(window.location.search).toContain('other=1');
        expect(listener).toHaveBeenCalledTimes(1);
        expect(selectedRendererId()).toBe('memo.renderer.maxgraph');

        unsubscribe();
        setSelectedRendererId('reactflow');
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

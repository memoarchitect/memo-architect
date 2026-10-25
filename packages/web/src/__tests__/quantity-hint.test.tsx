// @vitest-environment jsdom
//
// A quantity attribute is shown the way it is printed, from the symbols the model
// ships; a value that is not a quantity shows nothing extra.

import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { QuantityHint } from '../components/element-profile/QuantityHint';
import { useModelStore } from '../store/model-store';

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(value: string): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(QuantityHint, { value })); });
    return container;
}

afterEach(() => {
    act(() => { root?.unmount(); });
    container?.remove();
    root = null;
    container = null;
    useModelStore.setState({ model: null } as never);
});

describe('QuantityHint', () => {
    it('reads 20 [milli*second] as 20 ms from the shipped symbols', () => {
        useModelStore.setState({ model: { registries: { relationships: [], kinds: [], unitSymbols: { prefixes: { milli: 'm' }, units: { second: 's' } } } } } as never);
        expect(render('20 [milli*second]').textContent).toBe('= 20 ms');
    });

    it('shows nothing for text that is not a quantity, or when the model ships no symbols', () => {
        useModelStore.setState({ model: { registries: { relationships: [], kinds: [], unitSymbols: { prefixes: {}, units: {} } } } } as never);
        expect(render('clinician').innerHTML).toBe('');
        act(() => { root!.unmount(); }); container!.remove();
        useModelStore.setState({ model: { registries: { relationships: [], kinds: [] } } } as never);
        expect(render('20 [milli*second]').innerHTML).toBe('');
    });
});

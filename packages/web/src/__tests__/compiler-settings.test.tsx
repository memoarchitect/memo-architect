// @vitest-environment jsdom
//
// ─── The compiler is the user's to choose ───────────────────────────────────
//
// The panel reads the user's settings from the server and writes them back to the
// user's file; it never touches the project. These check what is on screen and
// what is sent, with the socket stubbed.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { CompilerSettings } from '../components/CompilerSettings';
import { useModelStore } from '../store/model-store';

const sent: Array<{ path: string; value?: string }> = [];
vi.mock('../store/ws-client', () => ({
    sendToolchainSettingsSave: (requestId: string, path: string, value?: string) => {
        sent.push({ path, value });
        // The server answers; here the answer comes straight back.
        useModelStore.getState().resolveLlmRequest(requestId, { appliesOnRestart: true });
    },
}));

const status = (value?: string, layer = 'user settings') => ({
    file: '/home/me/.config/memo/settings.yaml',
    compilerFromEnvironment: layer === 'environment',
    settings: [
        { path: 'compiler', description: 'compiler', type: 'enum' as const, values: ['syside', 'opensysml'], value, layer: value ? layer : undefined, layers: (value ? [{ layer, value }] : []) as { layer: string; value: string }[] },
    ],
});

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(CompilerSettings)); });
    return container;
}

afterEach(() => {
    act(() => { root?.unmount(); });
    container?.remove();
    root = null; container = null; sent.length = 0;
    useModelStore.setState({ toolchainSettings: null });
});

describe('CompilerSettings', () => {
    it('renders nothing until the server has sent the settings', () => {
        expect(render().textContent).toBe('');
    });

    it('says when no compiler is chosen, and names the user\'s file in the panel', () => {
        useModelStore.setState({ toolchainSettings: status() });
        const view = render();
        expect(view.textContent).toContain('Compiler: not chosen');
        act(() => { (view.querySelector('button') as HTMLButtonElement).click(); });
        expect(view.textContent).toContain('/home/me/.config/memo/settings.yaml');
        expect(view.textContent).toContain('not in the project');
        expect(view.textContent).toContain('The project names none');
    });

    it('saves a chosen compiler as the user\'s setting and says it applies on restart', async () => {
        useModelStore.setState({ toolchainSettings: status('syside') });
        const view = render();
        expect(view.textContent).toContain('Compiler: syside');
        act(() => { (view.querySelector('button') as HTMLButtonElement).click(); });
        const select = view.querySelector('select') as HTMLSelectElement;
        await act(async () => {
            select.value = 'opensysml';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(sent).toEqual([{ path: 'compiler', value: 'opensysml' }]);
        expect(view.textContent).toContain('applies when Architect is restarted');
    });

    it('asks only for the choice, not where a tool is', () => {
        useModelStore.setState({ toolchainSettings: status('syside') });
        const view = render();
        act(() => { (view.querySelector('button') as HTMLButtonElement).click(); });
        expect(view.querySelectorAll('input')).toHaveLength(0);
        expect(view.querySelectorAll('select')).toHaveLength(1);
    });

    it('shows what the project uses, which the user\'s choice overrides', () => {
        const s = status('syside');
        s.settings[0].layers.push({ layer: 'project', value: 'opensysml' });
        useModelStore.setState({ toolchainSettings: s });
        const view = render();
        act(() => { (view.querySelector('button') as HTMLButtonElement).click(); });
        expect(view.textContent).toContain('The project uses opensysml');
    });

    it('says when something above the user decides the compiler', () => {
        useModelStore.setState({ toolchainSettings: status('syside', 'environment') });
        const view = render();
        act(() => { (view.querySelector('button') as HTMLButtonElement).click(); });
        expect(view.textContent).toContain('an environment variable decides the compiler');
    });
});

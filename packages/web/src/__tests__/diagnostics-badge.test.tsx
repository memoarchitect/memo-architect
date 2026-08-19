// @vitest-environment jsdom
//
// ─── The badge hides the detail until asked ─────────────────────────────────
//
// The point of the badge is that the file:line list is NOT on screen while the
// user reads the diagram. A test that only checked the count would pass on the
// old permanent strip too, so these assert on what is absent.

import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { DiagnosticsBadge } from '../components/DiagnosticsBadge';

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(props: { messages: string[]; title: string; severity?: 'error' | 'warning' }): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(DiagnosticsBadge, props)); });
    return container;
}

afterEach(() => {
    act(() => { root?.unmount(); });
    container?.remove();
    root = null;
    container = null;
});

const badge = (host: HTMLElement) => host.querySelector('[role="status"]') as HTMLButtonElement | null;

describe('DiagnosticsBadge', () => {
    it('renders nothing when there is nothing wrong', () => {
        expect(render({ messages: [], title: 'Parse errors' }).innerHTML).toBe('');
    });

    it('shows the count collapsed, with the detail off screen', () => {
        const host = render({ messages: ['a.sysml:3 — unexpected token', 'a.sysml:9 — missing brace'], title: 'Parse errors' });
        expect(badge(host)!.textContent).toContain('2');
        expect(host.textContent).not.toContain('unexpected token');
    });

    it('reveals every message on a click, and hides them again on the next', () => {
        const host = render({ messages: ['a.sysml:3 — unexpected token', 'a.sysml:9 — missing brace'], title: 'Parse errors' });
        act(() => { badge(host)!.click(); });
        expect(host.textContent).toContain('unexpected token');
        expect(host.textContent).toContain('missing brace');
        expect(host.textContent).toContain('Parse errors');

        act(() => { badge(host)!.click(); });
        expect(host.textContent).not.toContain('unexpected token');
    });

    it('counts one error in the singular', () => {
        const host = render({ messages: ['only one'], title: 'Parse errors' });
        expect(badge(host)!.getAttribute('aria-label')).toContain('1 error —');
    });

    it('labels a warning as a warning', () => {
        const host = render({ messages: ['saved anyway'], severity: 'warning', title: 'Saved but unparsed' });
        expect(badge(host)!.getAttribute('aria-label')).toContain('1 warning —');
    });
});

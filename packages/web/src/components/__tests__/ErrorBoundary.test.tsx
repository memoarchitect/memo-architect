// @vitest-environment jsdom
//
// ─── A failing region stays in its region ────────────────────────────────────
//
// A render error shows a message where the region was, its siblings keep rendering,
// and the region renders again once the user goes somewhere else.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

let root: Root;
let container: HTMLElement;

const Fails = (): never => { throw new Error('leafName of undefined'); };
const Works = () => <span>panel content</span>;

const page = (resetKey: string, failing: boolean) => (
    <div>
        <nav>toolbar</nav>
        <ErrorBoundary label="This view" resetKey={resetKey}>{failing ? <Fails /> : <Works />}</ErrorBoundary>
    </div>
);

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('shows what failed and keeps the rest of the page', () => {
        act(() => root.render(page('/catalog/USR/USR-2', true)));
        expect(container.textContent).toContain('toolbar');
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('This view failed to render');
        expect(container.textContent).toContain('leafName of undefined');
    });

    it('renders again after navigating elsewhere', () => {
        act(() => root.render(page('/catalog/USR/USR-2', true)));
        act(() => root.render(page('/catalog/USR/USR-3', false)));
        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.textContent).toContain('panel content');
    });
});

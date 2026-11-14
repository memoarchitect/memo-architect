// @vitest-environment jsdom
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { DiagramPalette, PaletteKindsContext } from '../views/DiagramPalette';
vi.mock('../store/ws-client', () => ({ sendUserPreferencesSave: vi.fn() }));
let root: Root;
let container: HTMLElement;
afterEach(() => { act(() => root?.unmount()); container?.remove(); });
function render(eligibleKinds: Set<string>, fallback?: string[]) {
    useModelStore.setState({ model: { elements: {}, relationships: [], registries: { kinds: [
        { name: 'Base', label: 'Base', isAbstract: true, construct: 'action' },
        { name: 'Concrete', label: 'Concrete function', superType: 'Base', construct: 'action' },
        { name: 'Other', label: 'Other shape', construct: 'part' },
    ], relationships: [] } } as unknown as MemoModelDTO });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    act(() => root.render(<PaletteKindsContext.Provider value={fallback}><DiagramPalette collapsed={false} onToggleCollapse={() => {}} eligibleKinds={eligibleKinds} /></PaletteKindsContext.Provider>));
    return [...container.querySelectorAll('[draggable="true"]')].map(element => element.textContent);
}
describe('a method palette for views without declared types', () => {
    it('uses method types and their concrete specializations', () => { expect(render(new Set(), ['Base'])).toEqual(['Concrete function']); });
    it('keeps an authored view restriction authoritative', () => { expect(render(new Set(['Other']), ['Base'])).toEqual(['Other shape']); });
    it('keeps the existing empty-palette behavior outside a method', () => { expect(render(new Set())).toEqual([]); });
});

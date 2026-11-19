// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { ElementChip, stereotypeOf } from '../components/ElementChip';

const model = { elements: {}, relationships: [], registries: { kinds: [{ name: 'SystemFunction', label: 'System function' }], relationships: [] } } as unknown as MemoModelDTO;
const fn = { id: 'p::acquire', kind: 'SystemFunction', name: 'Acquire signal', layer: 'functional', attributes: {} } as unknown as MemoModelDTO['elements'][string];

describe('element chip', () => {
    it('shows the stereotype from the ontology label above the name, in its layer colour, and can be opened or removed', () => {
        const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
        const open = vi.fn(); const remove = vi.fn();
        act(() => root.render(<ElementChip model={model} element={fn} onClick={open} onRemove={remove} />));
        const chip = container.querySelector<HTMLElement>('.memo-element-chip')!;
        expect(chip.querySelector('.memo-element-chip-stereotype')!.textContent).toBe('«System function»');
        expect(chip.querySelector('.memo-element-chip-name')!.textContent).toBe('Acquire signal');
        expect(chip.style.getPropertyValue('--chip-color')).toBe('#E67E22');
        act(() => chip.querySelector<HTMLButtonElement>('.memo-element-chip-body')!.click());
        act(() => chip.querySelector<HTMLButtonElement>('[aria-label="Remove Acquire signal"]')!.click());
        expect(open).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();
        act(() => root.unmount()); container.remove();
    });

    it('names a usage typed by a project definition by the ontology kind that definition specializes', () => {
        const project = { elements: { 'p::NurseActor': { id: 'p::NurseActor', kind: 'User', name: 'Nurse', isDefinition: true, layer: 'operational', attributes: {} } },
            relationships: [], registries: { kinds: [{ name: 'User', label: 'User' }, { name: 'NurseActor', superType: 'User' }], relationships: [] } } as unknown as MemoModelDTO;
        expect(stereotypeOf(project, { id: 'p::nurse', kind: 'NurseActor', name: 'Scrub nurse', layer: 'operational', attributes: {} } as unknown as MemoModelDTO['elements'][string])).toBe('User');
    });
});

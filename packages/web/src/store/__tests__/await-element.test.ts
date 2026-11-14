import { afterEach, describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../model-store';
import { awaitSavedElement } from '../await-element';

const element = (id: string): MemoElement =>
    ({ id, name: 'Region UIE-315', kind: 'UIElement', layer: 'implementation', construct: 'part', doc: '', attributes: {}, file: 'ui.sysml' } as MemoElement);
const model = (elements: MemoElement[]): MemoModelDTO =>
    ({ elements: Object.fromEntries(elements.map(e => [e.id, e])), relationships: [], errors: [] } as unknown as MemoModelDTO);

afterEach(() => useModelStore.setState({ model: null, selectedElementId: null, failedCreates: {} }));

describe('awaitSavedElement', () => {
    it('replaces the optimistic copy with the saved element, and moves the selection to it', async () => {
        const optimistic = element('uiElement315');
        useModelStore.setState({ model: model([optimistic]), selectedElementId: 'uiElement315', failedCreates: {} });
        const waiting = awaitSavedElement('uiElement315', optimistic);
        // The rebuilt model arrives merged with what the client holds: both copies, until the wait settles it.
        const saved = 'ui_ims::loginScreen::uiElement315';
        useModelStore.setState(state => ({ model: model([...Object.values(state.model!.elements), element(saved)]) }));

        await expect(waiting).resolves.toBe(saved);
        const state = useModelStore.getState();
        expect(Object.keys(state.model!.elements)).toEqual([saved]);
        expect(state.selectedElementId).toBe(saved);
    });
});

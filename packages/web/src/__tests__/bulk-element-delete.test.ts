import { describe, expect, it, vi } from 'vitest';
import { useModelStore } from '../store/model-store';

describe('deleteModelElements', () => {
    it('deletes one at a time, carries on past a refusal and reports what failed', async () => {
        const calls: string[] = [];
        const deleteModelElement = vi.fn(async (id: string) => {
            calls.push(id);
            return id === 'b' ? { success: false, error: 'read-only library content' } : { success: true };
        });
        useModelStore.setState({
            deleteModelElement,
            model: { elements: { a: {}, b: {}, c: {} } } as never,
        });

        const result = await useModelStore.getState().deleteModelElements(['a', 'b', 'c']);

        expect(calls).toEqual(['a', 'b', 'c']);
        expect(result).toEqual({ deleted: 2, failed: [{ id: 'b', error: 'read-only library content' }] });
    });

    it('counts an element already gone with an earlier delete as deleted without asking again', async () => {
        const deleteModelElement = vi.fn(async () => ({ success: true }));
        useModelStore.setState({ deleteModelElement, model: { elements: { a: {} } } as never });

        const result = await useModelStore.getState().deleteModelElements(['a', 'gone']);

        expect(deleteModelElement).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ deleted: 2, failed: [] });
    });
});

describe('deleteViewpoint', () => {
    it('deletes the bound views first, then the viewpoint declaration', async () => {
        const calls: string[] = [];
        const deleteModelElement = vi.fn(async (id: string) => { calls.push(id); return { success: true }; });
        useModelStore.setState({ deleteModelElement, model: { elements: { v1: {}, v2: {}, vp: {} } } as never });

        const result = await useModelStore.getState().deleteViewpoint('vp', ['v1', 'v2']);

        expect(calls).toEqual(['v1', 'v2', 'vp']);
        expect(result).toEqual({ success: true, deletedViews: 2 });
    });

    it('keeps the viewpoint when a bound view cannot be deleted', async () => {
        const calls: string[] = [];
        const deleteModelElement = vi.fn(async (id: string) => {
            calls.push(id);
            return id === 'v2' ? { success: false, error: 'changed on disk' } : { success: true };
        });
        useModelStore.setState({ deleteModelElement, model: { elements: { v1: {}, v2: {}, vp: {} } } as never });

        const result = await useModelStore.getState().deleteViewpoint('vp', ['v1', 'v2']);

        expect(calls).not.toContain('vp');
        expect(result.success).toBe(false);
        expect(result.error).toContain('the viewpoint was kept');
    });
});

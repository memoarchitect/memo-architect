// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreActiveView } from '../store/model-store';
vi.mock('../store/ws-client', () => ({ sendUserPreferencesSave: vi.fn() }));
afterEach(() => sessionStorage.clear());
describe('restoring guided navigation', () => {
    it.each([{ type: 'guide' }, { type: 'pathway', layer: 'layerWork' }, { type: 'pathway', layer: 'layerWork', diagramId: 'authored-view' }])('retains the modelling destination across reloads', view => {
        sessionStorage.setItem('memo:activeView', JSON.stringify(view)); expect(restoreActiveView()).toEqual(view);
    });
    it('rejects a stale or malformed layer destination', () => {
        sessionStorage.setItem('memo:activeView', JSON.stringify({ type: 'pathway', layer: null }));
        expect(restoreActiveView()).toEqual({ type: 'welcome' });
    });
});

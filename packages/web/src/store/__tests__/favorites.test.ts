// A person's favorites and what they opened last are saved in memo.user.yaml with their other choices.
// A save replaces the file, so every save must carry them, and nothing may be saved before the saved
// choices have arrived, or the first navigation after loading would wipe them.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';

const sendUserPreferencesSave = vi.fn();
vi.mock('../ws-client', () => ({ sendUserPreferencesSave }));

const { useModelStore, preferencesOf } = await import('../model-store');
const { describeFavorite, favoriteMembers } = await import('../../lib/favorites');

const reset = () => useModelStore.setState({
    role: null, workspace: null, explorerSplit: '', features: [], packageFolders: true,
    favorites: [], recentViews: [], recentlyVisited: [], preferencesLoaded: false,
});

describe('favorites and recents in the saved choices', () => {
    beforeEach(() => { reset(); sendUserPreferencesSave.mockClear(); });

    it('saves nothing before the saved choices arrive', () => {
        useModelStore.getState().toggleFavorite({ type: 'view', ref: 'pkg::overview' });
        useModelStore.getState().setActiveView({ type: 'diagram', diagramId: 'pkg::overview' });
        expect(sendUserPreferencesSave).not.toHaveBeenCalled();
    });

    it('keeps the favorites when another choice is saved', () => {
        useModelStore.getState().applyUserPreferences({ favorites: [{ type: 'element', ref: 'pkg::pump' }], recentViews: ['pkg::v1'] });
        useModelStore.getState().setRole('safetyEngineer');
        expect(sendUserPreferencesSave).toHaveBeenLastCalledWith({
            role: 'safetyEngineer', favorites: [{ type: 'element', ref: 'pkg::pump' }], recentViews: ['pkg::v1'],
        });
    });

    it('adds a favorite, and removes it the second time', () => {
        useModelStore.getState().applyUserPreferences({});
        const folder = { type: 'folder' as const, ref: 'Requirement', packageName: 'needs' };
        useModelStore.getState().toggleFavorite(folder);
        expect(useModelStore.getState().favorites).toEqual([folder]);
        useModelStore.getState().toggleFavorite({ ...folder });
        expect(useModelStore.getState().favorites).toEqual([]);
    });

    it('puts the view opened last first, once, at most ten', () => {
        useModelStore.getState().applyUserPreferences({});
        for (let i = 0; i < 12; i++) useModelStore.getState().setActiveView({ type: 'diagram', diagramId: `pkg::v${i}` });
        useModelStore.getState().setActiveView({ type: 'diagram', diagramId: 'pkg::v5' });
        const views = useModelStore.getState().recentViews;
        expect(views[0]).toBe('pkg::v5');
        expect(views).toHaveLength(10);
        expect(new Set(views).size).toBe(10);
    });

    it('counts an element opened, not one clicked on a canvas', () => {
        useModelStore.getState().applyUserPreferences({});
        useModelStore.getState().inspectElement('pkg::clicked');
        useModelStore.getState().selectElement('pkg::opened');
        expect(useModelStore.getState().recentlyVisited).toEqual(['pkg::opened']);
        expect(preferencesOf(useModelStore.getState()).recentElements).toEqual(['pkg::opened']);
    });
});

describe('reading a favorite against the model', () => {
    const model = {
        elements: {
            'needs::req1': { id: 'needs::req1', name: 'Bolus limit', kind: 'Requirement', package: 'needs', attributes: { providedId: 'REQ-1' }, displayId: 'REQ-1' },
            'needs::sub::req2': { id: 'needs::sub::req2', name: 'Alarm', kind: 'Requirement', package: 'needs::sub', attributes: {} },
            'parts::pump': { id: 'parts::pump', name: 'Pump', kind: 'System', package: 'parts', attributes: {} },
        },
        diagrams: [{ id: 'views::overview', name: 'Overview', shortId: 'VIEW-1', viewpointId: 'vp' }],
        viewpoints: [{ id: 'vp', label: 'Operational' }],
        relationships: [],
    } as unknown as MemoModelDTO;
    const label = (kind: string) => kind;

    it('reads an element by its id and title, and a view by its own', () => {
        expect(describeFavorite(model, { type: 'element', ref: 'needs::req1' }, label)).toMatchObject({ id: 'REQ-1', title: 'Bolus limit', missing: false });
        expect(describeFavorite(model, { type: 'view', ref: 'views::overview' }, label)).toMatchObject({ id: 'VIEW-1', title: 'Overview', missing: false });
        expect(describeFavorite(model, { type: 'viewpoint', ref: 'vp' }, label)).toMatchObject({ title: 'Operational', missing: false });
    });

    it('says when what a favorite names is gone', () => {
        expect(describeFavorite(model, { type: 'element', ref: 'needs::gone' }, label).missing).toBe(true);
        expect(describeFavorite(model, { type: 'package', ref: 'retired' }, label).missing).toBe(true);
    });

    it('holds a package with the packages inside it, and a type folder narrowed to its package', () => {
        expect(favoriteMembers(model, { type: 'package', ref: 'needs' }).map(e => e.id)).toEqual(['needs::req1', 'needs::sub::req2']);
        expect(favoriteMembers(model, { type: 'folder', ref: 'Requirement', packageName: 'needs::sub' }).map(e => e.id)).toEqual(['needs::sub::req2']);
        expect(favoriteMembers(model, { type: 'folder', ref: 'System' }).map(e => e.id)).toEqual(['parts::pump']);
    });
});

describe('the menu a Model Explorer folder opens', async () => {
    const { folderMenuTarget } = await import('../../components/ExplorerPanel');

    it('opens the type menu on a type folder, in its package when it is in one', () => {
        expect(folderMenuTarget('kt:OperationalEntity')).toEqual({ type: 'kind', kind: 'OperationalEntity' });
        expect(folderMenuTarget('kf:needs::sub|Requirement')).toEqual({ type: 'kind', kind: 'Requirement', packageName: 'needs::sub' });
        expect(folderMenuTarget('kf:|Requirement')).toEqual({ type: 'kind', kind: 'Requirement' });
    });

    it('opens the package menu on a package folder', () => {
        expect(folderMenuTarget('f:needs::sub')).toEqual({ type: 'folder', packageName: 'needs::sub' });
        expect(folderMenuTarget('f:needs|Requirement')).toEqual({ type: 'folder', packageName: 'needs' });
    });
});

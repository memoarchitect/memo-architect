import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { currentStep, diagramTypeFor, elementsOfKinds, layerViews, type GuideLayer } from '../lib/pathways';
import type { GuideStepStatus } from '../lib/guide-view';

const step = (id: string, state: GuideStepStatus['state']) => ({ id, state } as GuideStepStatus);

describe('the guided row helpers', () => {
    it('resumes a step in this row, falls back to unfinished work, then the first step', () => {
        const steps = [step('done', 'done'), step('open', 'open')];
        expect(currentStep(steps, 'done')).toBe(steps[0]);
        expect(currentStep(steps, 'another-row')).toBe(steps[1]);
        expect(currentStep(steps, null)).toBe(steps[1]);
        expect(currentStep([steps[0]], null)).toBe(steps[0]);
        expect(currentStep([], 'gone')).toBeUndefined();
    });

    it('lists views through their viewpoint names, in the row viewpoint order', () => {
        const layer = { viewpoints: [
            { id: 'catalog::second', name: 'second', label: 'Second' },
            { id: 'catalog::first', name: 'first', label: 'First' },
            { id: 'catalog::missing', name: 'missing', label: 'Missing' },
        ] } as GuideLayer;
        const model = {
            viewpoints: [{ id: 'vp1', name: 'first' }, { id: 'vp2', name: 'second' }],
            diagrams: [
                { id: 'a', viewpointId: 'vp1' },
                { id: 'b', viewpointId: 'vp2' },
                { id: 'unrelated', viewpointId: 'other' },
                { id: 'shared', viewpointId: 'other', viewpointIds: ['vp1', 'vp2'] },
            ],
        } as MemoModelDTO;
        expect(layerViews(model, layer).map(({ diagram, viewpoint }) => `${viewpoint.name}:${diagram.id}`))
            .toEqual(['second:b', 'second:shared', 'first:a', 'first:shared']);
        expect(layerViews({} as MemoModelDTO, layer)).toEqual([]);
    });

    it('chooses the first notation for a standard view kind, with a fallback', () => {
        expect(diagramTypeFor('general')).toBe('bdd');
        expect(diagramTypeFor('interconnection')).toBe('ibd');
        expect(diagramTypeFor('unknown')).toBe('bdd');
        expect(diagramTypeFor(undefined)).toBe('bdd');
    });

    it('selects inherited kinds and shared members within a workspace', () => {
        const element = (id: string, kind: string) => ({ id, kind });
        const model = {
            elements: { a: element('a', 'Special'), b: element('b', 'Base'), c: element('c', 'Other'), d: element('d', 'Special') },
            registries: { kinds: [{ name: 'Base' }, { name: 'Special', superType: 'Base' }, { name: 'Other' }] },
            workspaceMembership: {
                workspaces: [{ root: 'one', scope: 'system' }, { root: 'two', scope: 'system' }],
                membership: { a: ['one', 'two'], b: ['one'], c: ['one'], d: ['two'] }, unassigned: [],
            },
        } as unknown as MemoModelDTO;
        const ids = (workspace: string | null, kinds = ['Base']) => elementsOfKinds(model, kinds, workspace).map(e => e.id);
        expect(ids('one')).toEqual(['a', 'b']);
        expect(ids('two')).toEqual(['a', 'd']);
        expect(ids(null)).toEqual(['a', 'b', 'd']);
        expect(ids('one', ['Base', 'Other'])).toEqual(['a', 'b', 'c']);
        expect(ids(null, [])).toEqual([]);
    });
});

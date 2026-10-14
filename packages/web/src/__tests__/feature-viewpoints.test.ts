import { describe, expect, it } from 'vitest';
import type { DiagramDTO, MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { featurePage, featureViewpoints } from '../lib/feature-viewpoints';

const el = (id: string, kind: string, extra: Partial<MemoElement> = {}): MemoElement =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {}, ...extra });
const edge = (type: string, sourceId: string, targetId: string): MemoRelationship =>
    ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });
const view = (id: string, elementIds: string[]): DiagramDTO =>
    ({ id, name: id, diagramType: 'bdd', viewpointId: 'vp', auto: false, elementId: `v::${id}`, elementIds } as DiagramDTO);

const model = {
    elements: Object.fromEntries([
        el('featMute', 'ProductFeature', { doc: 'Silence an alarm.', attributes: { valueProposition: 'Quiet shifts', successMeasure: 'Half the complaints' } }),
        el('featLog', 'ProductFeature'), el('muteUi', 'LogicalComponent'), el('relA', 'ReleaseRecord'),
    ].map(e => [e.id, e])),
    relationships: [
        edge('showsView', 'featMute', 'v::chosen'), edge('showsView', 'featMute', 'v::gone'),
        edge('realizesFeature', 'muteUi', 'featMute'), edge('selectsFeature', 'relA', 'featMute'),
        edge('requiresFeature', 'featMute', 'featLog'),
    ],
    diagrams: [view('chosen', ['muteUi']), view('other', ['muteUi']), view('plain', [])],
    errors: [], registries: { relationships: [], kinds: [] },
} as unknown as MemoModelDTO;

describe('feature viewpoints', () => {
    const { features, featureSpecific } = featureViewpoints(model);

    it('makes a viewpoint of every feature, with the views it curates and no others', () => {
        expect(features.map(f => [f.featureId, f.diagrams.map(d => d.id)])).toEqual([['featLog', []], ['featMute', ['chosen']]]);
    });

    it('lists a view by a feature only because the feature names it', () => {
        // `other` shows the same element as `chosen` and is not listed: nobody chose it.
        expect([...featureSpecific]).toEqual(['chosen']);
    });

    it('has none when the model has no feature', () => {
        expect(featureViewpoints(null).features).toEqual([]);
        expect(featureViewpoints({ ...model, elements: {} } as unknown as MemoModelDTO).features).toEqual([]);
    });
});

describe('a feature page', () => {
    const page = featurePage(model, 'featMute')!;

    it('carries the prose, the analysis, the curated views and what realizes and selects it', () => {
        expect(page.description).toBe('Silence an alarm.');
        expect(page.value).toMatchObject({ valueProposition: 'Quiet shifts', successMeasure: 'Half the complaints', targetUsers: '' });
        expect(page.views.map(v => v.id)).toEqual(['chosen']);
        expect(page.otherViews.map(v => v.id).sort()).toEqual(['other', 'plain']);
        expect(page.realizedBy).toEqual(['muteUi']);
        expect(page.selectedBy).toEqual(['relA']);
        expect(page.requires).toEqual(['featLog']);
        expect(page.showsEdge).toEqual({ chosen: 'showsView:featMute:v::chosen' });
    });

    it('is absent for an element that is not a feature', () => {
        expect(featurePage(model, 'muteUi')).toBeNull();
    });
});

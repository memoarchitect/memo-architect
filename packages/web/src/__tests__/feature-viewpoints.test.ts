import { describe, expect, it } from 'vitest';
import type { DiagramDTO, MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { featureViewpoints } from '../lib/feature-viewpoints';

const el = (id: string, kind: string): MemoElement =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {} });
const edge = (type: string, sourceId: string, targetId: string): MemoRelationship =>
    ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });
const view = (id: string, elementIds: string[]): DiagramDTO =>
    ({ id, name: id, diagramType: 'bdd', viewpointId: 'vp', auto: false, elementIds } as DiagramDTO);

const model = {
    elements: Object.fromEntries([
        el('featMute', 'ProductFeature'), el('featLog', 'ProductFeature'), el('featUnused', 'ProductFeature'),
        el('muteUi', 'LogicalComponent'), el('pump', 'LogicalComponent'), el('relA', 'ReleaseRecord'),
    ].map(e => [e.id, e])),
    relationships: [edge('realizesFeature', 'muteUi', 'featMute'), edge('selectsFeature', 'relA', 'featMute')],
    diagrams: [
        view('showsFeature', ['featMute']),
        view('showsRealizer', ['muteUi', 'pump']),
        view('wide', ['pump', 'relA']),
        view('plain', ['pump']),
    ],
    errors: [], registries: { relationships: [], kinds: [] },
} as unknown as MemoModelDTO;

describe('feature viewpoints', () => {
    const { features, featureSpecific } = featureViewpoints(model);

    it('makes a viewpoint of each feature that has views, with the views that show it or what realizes it', () => {
        expect(features.map(f => [f.featureId, f.diagrams.map(d => d.id)])).toEqual([
            ['featMute', ['showsFeature', 'showsRealizer']],
        ]);
    });

    it('does not take a wide view for a feature because one element in it is merely related', () => {
        expect(featureSpecific.has('wide')).toBe(false);
        expect(featureSpecific.has('plain')).toBe(false);
        expect([...featureSpecific].sort()).toEqual(['showsFeature', 'showsRealizer']);
    });

    it('has none when the model has no feature or no view', () => {
        expect(featureViewpoints(null).features).toEqual([]);
        expect(featureViewpoints({ ...model, diagrams: [] } as MemoModelDTO).features).toEqual([]);
    });
});

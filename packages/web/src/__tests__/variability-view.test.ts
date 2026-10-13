import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship, ValidationResult } from '@memoarchitect/tools/browser';
import { variabilityView } from '../lib/variability-view';

// A generator with a variation point (an EU and a US variant), two market features, an irrigated
// tip that requires the US market, and two releases. The US release is approved with a proposed variant.
const el = (id: string, kind: string, attributes: Record<string, string> = {}): MemoElement =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes });
const edge = (type: string, sourceId: string, targetId: string): MemoRelationship =>
    ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });

const model = {
    elements: Object.fromEntries([
        el('point', 'LogicalComponent', { isVariation: 'true' }),
        el('eu', 'LogicalComponent', { status: 'ElementStatusKind::approved' }),
        el('us', 'LogicalComponent', { status: 'ElementStatusKind::proposed' }),
        el('featEu', 'ProductFeature'), el('featUs', 'ProductFeature'), el('featTip', 'ProductFeature'),
        el('relEu', 'ReleaseRecord', { status: 'ElementStatusKind::released' }),
        el('relUs', 'ReleaseRecord', { status: 'ElementStatusKind::approved' }),
    ].map(e => [e.id, e])),
    relationships: [
        edge('variant', 'point', 'eu'), edge('variant', 'point', 'us'),
        edge('realizesFeature', 'eu', 'featEu'), edge('realizesFeature', 'us', 'featUs'),
        edge('requiresFeature', 'featTip', 'featUs'), edge('excludesFeature', 'featEu', 'featUs'),
        edge('selectsFeature', 'relEu', 'featEu'), edge('selectsFeature', 'relUs', 'featUs'), edge('selectsFeature', 'relUs', 'featTip'),
    ],
    errors: [], registries: { relationships: [], kinds: [] },
} as unknown as MemoModelDTO;

const validation = { violations: [{ ruleId: 'CR-ONT-088', description: 'proposed variant', severity: 'error', elementId: 'relUs', elementKind: 'ReleaseRecord', elementName: 'relUs' }] } as unknown as ValidationResult;

describe('the variability view', () => {
    const view = variabilityView(model, validation, null);

    it('lists each feature with what it requires, excludes, is realized by and is selected by', () => {
        expect(view.features.find(f => f.id === 'featTip')).toMatchObject({ requires: ['featUs'], excludes: [], realizedBy: [], selectedBy: ['relUs'] });
        // Excludes is symmetric: either end lists the other.
        expect(view.features.find(f => f.id === 'featUs')!.excludes).toEqual(['featEu']);
        expect(view.features.find(f => f.id === 'featEu')!.excludes).toEqual(['featUs']);
    });

    it('lists each variation point with its variants, their status and the feature each realizes', () => {
        expect(view.points).toEqual([{ id: 'point', label: 'point', variants: [
            { id: 'eu', label: 'eu', status: 'approved', features: ['featEu'] },
            { id: 'us', label: 'us', status: 'proposed', features: ['featUs'] },
        ] }]);
    });

    it('gives each release the variants it selects, and the findings the validation raised on it', () => {
        expect(view.releases.find(r => r.id === 'relEu')).toMatchObject({ selected: ['featEu'], chosen: { point: ['eu'] }, findings: [] });
        expect(view.releases.find(r => r.id === 'relUs')).toMatchObject({
            status: 'approved', selected: ['featUs', 'featTip'], chosen: { point: ['us'] },
            findings: [{ ruleId: 'CR-ONT-088', severity: 'error' }],
        });
    });
});

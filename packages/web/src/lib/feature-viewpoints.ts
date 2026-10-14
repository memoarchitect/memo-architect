// ─── Feature viewpoints: the views a product feature has ─────────────────────
//
// Every `ProductFeature` is a viewpoint of its own. Nothing authors it: the feature
// exists, so its viewpoint does, and its views are the ones that show something
// the feature is about. That is derived from relations, as workspace membership is:
// a view is one of a feature's when it shows the feature or something that realizes
// it (`realizesFeature`: a variant, a component). Relations looser than that, a
// requirement that traces to the feature or a release that selects it, are left out:
// they would pull every wide view that happens to include one such element out of its
// global viewpoint and into the feature's, which is the opposite of segregating them.
//
// A view that belongs to a feature is feature-specific, and the tree lists it under
// that feature only. A global viewpoint is feature-agnostic; what it lists is what
// no feature claims, which is what keeps the two kinds of view apart.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, type DiagramDTO, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { FEATURE_KIND } from './variability-view';

export interface FeatureViewpoint {
    /** The feature's element id. */
    featureId: string;
    label: string;
    diagrams: DiagramDTO[];
}

export interface FeatureViewpoints {
    /** One per feature that has at least one view, by label. */
    features: FeatureViewpoint[];
    /** Every view that belongs to some feature. */
    featureSpecific: ReadonlySet<string>;
}

const labelOf = (model: MemoModelDTO, id: string): string =>
    model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);

export function featureViewpoints(model: MemoModelDTO | null): FeatureViewpoints {
    if (!model?.diagrams?.length) return { features: [], featureSpecific: new Set() };
    const kinds = indexKinds(model.registries?.kinds ?? []);
    const featureIds = Object.keys(model.elements).filter(id => {
        const kind = model.elements[id]?.kind;
        return kind !== undefined && kindConformsTo(kind, FEATURE_KIND, kinds);
    });
    if (featureIds.length === 0) return { features: [], featureSpecific: new Set() };

    const related = new Map<string, Set<string>>(featureIds.map(id => [id, new Set([id])]));
    for (const relationship of model.relationships ?? []) {
        if (relationship.type === 'realizesFeature') related.get(relationship.targetId)?.add(relationship.sourceId);
    }

    const featureSpecific = new Set<string>();
    const features: FeatureViewpoint[] = [];
    for (const featureId of featureIds) {
        const about = related.get(featureId)!;
        const diagrams = model.diagrams.filter(d => (d.elementIds ?? []).some(id => about.has(id)));
        if (diagrams.length === 0) continue;
        for (const diagram of diagrams) featureSpecific.add(diagram.id);
        features.push({ featureId, label: labelOf(model, featureId), diagrams });
    }
    features.sort((a, b) => a.label.localeCompare(b.label));
    return { features, featureSpecific };
}

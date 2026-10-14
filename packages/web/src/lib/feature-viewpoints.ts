// ─── Feature viewpoints: the views a product feature shows ───────────────────
//
// Every `ProductFeature` is a viewpoint of its own, and so has a place for its views the
// moment it exists. Which views it lists is curated: `#ShowsView dependency from <feature>
// to <view>, <view>;` names the ones that demonstrate it. A rule that guessed ("any view
// that includes something related to the feature") pulled wide views out of their global
// viewpoint and listed things nobody chose to show; the person demonstrating a feature
// knows which views make the case, so they say.
//
// A view a feature lists is feature-specific, and the tree lists it under that feature only.
// A global viewpoint is feature-agnostic: system context, use cases, structure, interfaces.
// What it lists is what no feature claims, which is what keeps the two kinds apart.
//
// The feature's page is the same feature seen as a whole: what it is (the element's own
// prose), the analysis written on it, the views it shows, and what realizes and selects it.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, relationshipsOfType, type DiagramDTO, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { FEATURE_KIND } from './variability-view';

export interface FeatureViewpoint {
    /** The feature's element id. */
    featureId: string;
    label: string;
    diagrams: DiagramDTO[];
}

export interface FeatureViewpoints {
    /** One per feature, by label, including one that shows nothing yet. */
    features: FeatureViewpoint[];
    /** Every view some feature lists. */
    featureSpecific: ReadonlySet<string>;
}

const labelOf = (model: MemoModelDTO, id: string): string =>
    model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);

/** The ids of the model's features: a specialization of the feature kind counts. */
export function featureIds(model: MemoModelDTO): string[] {
    const kinds = indexKinds(model.registries?.kinds ?? []);
    return Object.keys(model.elements).filter(id => {
        const kind = model.elements[id]?.kind;
        return kind !== undefined && kindConformsTo(kind, FEATURE_KIND, kinds);
    });
}

export function featureViewpoints(model: MemoModelDTO | null): FeatureViewpoints {
    if (!model) return { features: [], featureSpecific: new Set() };
    const ids = featureIds(model);
    if (ids.length === 0) return { features: [], featureSpecific: new Set() };

    // A diagram is the view that declares it: the edge's target is the view's element id.
    const diagramOf = new Map((model.diagrams ?? []).filter(d => d.elementId).map(d => [d.elementId!, d]));
    const shown = new Map<string, DiagramDTO[]>(ids.map(id => [id, []]));
    for (const edge of relationshipsOfType(model, 'showsView')) {
        const diagram = diagramOf.get(edge.targetId);
        if (diagram) shown.get(edge.sourceId)?.push(diagram);
    }

    const featureSpecific = new Set<string>();
    const features = ids.map(featureId => {
        const diagrams = shown.get(featureId)!;
        for (const diagram of diagrams) featureSpecific.add(diagram.id);
        return { featureId, label: labelOf(model, featureId), diagrams };
    }).sort((a, b) => a.label.localeCompare(b.label));
    return { features, featureSpecific };
}

/** What a feature's page shows. */
export interface FeaturePageData {
    id: string;
    label: string;
    /** The element's own prose. */
    description: string;
    value: { valueProposition: string; targetUsers: string; successMeasure: string; assumptions: string };
    views: DiagramDTO[];
    /** Views that could be added: every view the feature does not already list. */
    otherViews: DiagramDTO[];
    realizedBy: string[];
    selectedBy: string[];
    requires: string[];
    excludes: string[];
    /** The `#ShowsView` statement behind each listed view, to remove it. */
    showsEdge: Record<string, string>;
}

export function featurePage(model: MemoModelDTO, featureId: string): FeaturePageData | null {
    const element = model.elements[featureId];
    if (!element || !featureIds(model).includes(featureId)) return null;
    const diagramOf = new Map((model.diagrams ?? []).filter(d => d.elementId).map(d => [d.elementId!, d]));
    const edges = (type: string) => relationshipsOfType(model, type);
    const showsEdge: Record<string, string> = {};
    const views: DiagramDTO[] = [];
    for (const edge of edges('showsView').filter(e => e.sourceId === featureId)) {
        const diagram = diagramOf.get(edge.targetId);
        if (!diagram) continue;
        views.push(diagram);
        showsEdge[diagram.id] = edge.id;
    }
    const attribute = (name: string) => element.attributes?.[name] ?? '';
    const listed = new Set(views.map(v => v.id));
    return {
        id: featureId,
        label: labelOf(model, featureId),
        description: element.doc ?? '',
        value: {
            valueProposition: attribute('valueProposition'), targetUsers: attribute('targetUsers'),
            successMeasure: attribute('successMeasure'), assumptions: attribute('assumptions'),
        },
        views,
        otherViews: (model.diagrams ?? []).filter(d => d.elementId && !listed.has(d.id)),
        realizedBy: edges('realizesFeature').filter(e => e.targetId === featureId).map(e => e.sourceId),
        selectedBy: edges('selectsFeature').filter(e => e.targetId === featureId).map(e => e.sourceId),
        requires: edges('requiresFeature').filter(e => e.sourceId === featureId).map(e => e.targetId),
        excludes: edges('excludesFeature').flatMap(e => e.sourceId === featureId ? [e.targetId] : e.targetId === featureId ? [e.sourceId] : []),
        showsEdge,
    };
}

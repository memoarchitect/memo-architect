// ─── Features, design options and what a release selects (plan A7) ───────────
//
// Everything on the Variability page is read from the relations the builder made from the
// ontology's typed dependencies and connections: `variant` (variation point to variant),
// `realizesFeature` (variant to feature), `selectsFeature` (release to feature),
// `requiresFeature` and `excludesFeature` (feature to feature). A release's selected variants
// are `selectRelease`, the join memo-tools also tests the release rules against, so the page and
// the rules cannot disagree about what "selected" means. Findings are the validation result's
// own: the page runs no rule of its own.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, relationshipsOfType, selectRelease, type MemoModelDTO, type ValidationResult } from '@memoarchitect/tools/browser';
import { idsInWorkspace } from './workspace-scope';
import { introducingProject } from './projects-view';

/** The two kinds the page is about; a specialization of either counts. */
export const FEATURE_KIND = 'ProductFeature';
export const RELEASE_KIND = 'ReleaseRecord';

export interface FeatureRow {
    id: string;
    label: string;
    requires: string[];
    excludes: string[];
    realizedBy: string[];
    selectedBy: string[];
}
export interface VariantRow {
    id: string;
    label: string;
    status: string;
    features: string[];
    /** The project that introduced it, when one is recorded (`#IntroducedBy`). */
    introducedBy?: string;
}
export interface PointRow {
    id: string;
    label: string;
    variants: VariantRow[];
}
export interface ReleaseRow {
    id: string;
    label: string;
    status: string;
    /** The features it selects. */
    selected: string[];
    /** The variants it selects, per variation point id. */
    chosen: Record<string, string[]>;
    findings: { ruleId: string; description: string; severity: string }[];
}
export interface VariabilityView {
    features: FeatureRow[];
    points: PointRow[];
    releases: ReleaseRow[];
}

const labelOf = (model: MemoModelDTO, id: string): string => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
const statusOf = (model: MemoModelDTO, id: string): string => (model.elements[id]?.attributes.status ?? '').replace(/^.*::/, '');

export function variabilityView(model: MemoModelDTO, validation: ValidationResult | null, workspace: string | null): VariabilityView {
    const kinds = indexKinds(model.registries?.kinds ?? []);
    const is = (id: string, kind: string) => {
        const actual = model.elements[id]?.kind;
        return actual !== undefined && kindConformsTo(actual, kind, kinds);
    };
    const inWorkspace = idsInWorkspace(model.workspaceMembership, workspace);
    const shown = (id: string) => !inWorkspace || inWorkspace.has(id);
    const edges = (type: string) => relationshipsOfType(model, type);
    const peers = (id: string, type: string, end: 'source' | 'target') =>
        edges(type).filter(r => (end === 'source' ? r.sourceId : r.targetId) === id)
            .map(r => (end === 'source' ? r.targetId : r.sourceId));
    const both = (id: string, type: string) => [...new Set([...peers(id, type, 'source'), ...peers(id, type, 'target')])];

    const features: FeatureRow[] = Object.keys(model.elements).filter(id => is(id, FEATURE_KIND) && shown(id)).map(id => ({
        id, label: labelOf(model, id),
        requires: peers(id, 'requiresFeature', 'source'),
        excludes: both(id, 'excludesFeature'),
        realizedBy: peers(id, 'realizesFeature', 'target'),
        selectedBy: peers(id, 'selectsFeature', 'target'),
    })).sort((a, b) => a.label.localeCompare(b.label));

    const realized = new Map<string, string[]>();
    for (const r of edges('realizesFeature')) realized.set(r.sourceId, [...(realized.get(r.sourceId) ?? []), r.targetId]);
    const points = new Map<string, VariantRow[]>();
    for (const r of edges('variant')) {
        const rows = points.get(r.sourceId) ?? [];
        rows.push({ id: r.targetId, label: labelOf(model, r.targetId), status: statusOf(model, r.targetId), features: realized.get(r.targetId) ?? [], introducedBy: introducingProject(model, r.targetId) });
        points.set(r.sourceId, rows);
    }
    const pointRows: PointRow[] = [...points].filter(([id]) => shown(id))
        .map(([id, variants]) => ({ id, label: labelOf(model, id), variants }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const graph = { elements: { get: (id: string) => model.elements[id], keys: () => Object.keys(model.elements) }, relationships: model.relationships };
    const releases: ReleaseRow[] = Object.keys(model.elements).filter(id => is(id, RELEASE_KIND) && shown(id)).map(id => {
        const selection = selectRelease(graph, id);
        return {
            id, label: labelOf(model, id), status: statusOf(model, id),
            selected: selection.features,
            chosen: Object.fromEntries(selection.points.filter(p => p.selected.length > 0).map(p => [p.variationPoint, p.selected])),
            findings: (validation?.violations ?? []).filter(v => v.elementId === id)
                .map(v => ({ ruleId: v.ruleId, description: v.description, severity: v.severity })),
        };
    }).sort((a, b) => a.label.localeCompare(b.label));

    return { features, points: pointRows, releases };
}

import { describe, it, expect } from 'vitest';
import { partitionViewsByViewpoint } from '../ExplorerPanel';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';

// ─── Views organised by viewpoint ───────────────────────────────────────────
//
// The guard that matters: a view is filed under the viewpoint it conforms to,
// and every view a viewpoint does not claim lands in Uncategorized. A view that
// appears in neither place has silently vanished from the tree.

function view(id: string, viewpointId?: string, extra: Record<string, unknown> = {}) {
    return { id, name: id, diagramType: 'bdd', viewpointId, auto: false, ...extra } as any;
}

function model(diagrams: any[], viewpoints: { id: string; label: string }[]): MemoModelDTO {
    return {
        diagrams,
        viewpoints: viewpoints.map(vp => ({
            ...vp, visibleKinds: [], visibleRelationships: [], visibleLayers: [],
        })),
        elements: {},
    } as unknown as MemoModelDTO;
}

describe('partitionViewsByViewpoint', () => {
    it('files a view under the viewpoint it conforms to', () => {
        const m = model(
            [view('v1', 'vp-risk'), view('v2', 'vp-context')],
            [{ id: 'vp-risk', label: 'Risk' }, { id: 'vp-context', label: 'Context' }],
        );
        const { viewpoints, uncategorized } = partitionViewsByViewpoint(m);
        expect(viewpoints.map(vp => vp.id)).toEqual(['vp-context', 'vp-risk']); // sorted by label
        expect(uncategorized).toEqual([]);
    });

    it('puts a view with no viewpoint binding under Uncategorized', () => {
        const m = model([view('v1', '__unassigned')], [{ id: '__unassigned', label: 'Unassigned Views' }]);
        const { viewpoints, uncategorized } = partitionViewsByViewpoint(m);
        expect(viewpoints).toEqual([]);
        expect(uncategorized.map(d => d.id)).toEqual(['v1']);
    });

    it('treats renderer samples as uncategorized, not as a viewpoint', () => {
        const m = model([view('s1', '__model')], [{ id: '__model', label: 'Model Viewpoint' }]);
        const { viewpoints, uncategorized } = partitionViewsByViewpoint(m);
        expect(viewpoints).toEqual([]);
        expect(uncategorized.map(d => d.id)).toEqual(['s1']);
    });

    it('keeps a view whose viewpointId resolves to nothing — it must not vanish', () => {
        const m = model([view('orphan', 'vp-deleted')], [{ id: 'vp-risk', label: 'Risk' }]);
        const { uncategorized } = partitionViewsByViewpoint(m);
        expect(uncategorized.map(d => d.id)).toEqual(['orphan']);
    });

    it('keeps a view with no viewpointId at all', () => {
        const m = model([view('bare', undefined)], [{ id: 'vp-risk', label: 'Risk' }]);
        const { uncategorized } = partitionViewsByViewpoint(m);
        expect(uncategorized.map(d => d.id)).toEqual(['bare']);
    });

    it('honours multi-viewpoint conformance, claiming the view for each', () => {
        const m = model(
            [view('shared', 'vp-a', { viewpointIds: ['vp-a', 'vp-b'] })],
            [{ id: 'vp-a', label: 'A' }, { id: 'vp-b', label: 'B' }],
        );
        const { uncategorized } = partitionViewsByViewpoint(m);
        expect(uncategorized).toEqual([]);
    });

    it('accounts for every view exactly once across the two buckets', () => {
        const m = model(
            [view('a', 'vp-a'), view('b', '__unassigned'), view('c', 'vp-gone'), view('d', '__model')],
            [{ id: 'vp-a', label: 'A' }, { id: '__unassigned', label: 'Unassigned Views' }],
        );
        const { viewpoints, uncategorized } = partitionViewsByViewpoint(m);
        const claimed = viewpoints.flatMap(vp =>
            (m.diagrams ?? []).filter((d: any) => d.viewpointId === vp.id).map((d: any) => d.id));
        expect([...claimed, ...uncategorized.map(d => d.id)].sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('returns empty buckets for an empty model rather than throwing', () => {
        expect(partitionViewsByViewpoint(null)).toEqual({ viewpoints: [], uncategorized: [] });
    });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    addressableViewTypes,
    pathToView,
    slug,
    staticViewPaths,
    viewToPath,
} from '../view-routes';
import type { ActiveView } from '../store/model-store';

// ─── Coverage ───────────────────────────────────────────────────────────────
//
// The guard that matters: every destination in the app must be reachable by
// URL. A view added to ActiveView without a path fails here rather than
// quietly becoming unbookmarkable.

describe('URL coverage', () => {
    /** Parse the ActiveView union straight from the store's source. */
    function declaredViewTypes(): string[] {
        const source = readFileSync(
            resolve(__dirname, '../store/model-store.ts'), 'utf8');
        const union = source.match(/export type ActiveView =([\s\S]*?);\n/)?.[1] ?? '';
        return [...union.matchAll(/type:\s*'([a-z-]+)'/g)].map(m => m[1]);
    }

    it('addresses every view type the store declares', () => {
        const declared = declaredViewTypes();
        expect(declared.length).toBeGreaterThan(15);   // sanity: the parse worked

        const addressable = new Set(addressableViewTypes());
        const unreachable = declared.filter(type => !addressable.has(type));
        expect(unreachable).toEqual([]);
    });

    it('gives every static view a distinct path', () => {
        const paths = staticViewPaths();
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('roots every path at /', () => {
        for (const path of staticViewPaths()) expect(path.startsWith('/')).toBe(true);
    });
});

// ─── Round trip ─────────────────────────────────────────────────────────────

describe('viewToPath / pathToView round trip', () => {
    it('round-trips every static view', () => {
        for (const path of staticViewPaths()) {
            const view = pathToView(path);
            expect(view, `no view for ${path}`).not.toBeNull();
            // '/dashboard' is an alias that normalises to '/', so it is the one
            // path that does not serialise back to itself.
            const expected = path === '/dashboard' ? '/'
                : path === '/scenarios' ? '/use-cases'
                : path;
            expect(viewToPath(view!)).toBe(expected);
        }
    });

    it('lands the dashboard on / by default', () => {
        expect(viewToPath({ type: 'dashboard' })).toBe('/');
        expect(pathToView('/')).toEqual({ type: 'dashboard' });
    });

    it('accepts /dashboard as an alias for the same view', () => {
        expect(pathToView('/dashboard')).toEqual({ type: 'dashboard' });
    });

    it('keeps the pre-model splash on the same path as the dashboard', () => {
        // Loading '/' before the model arrives must not rewrite the URL.
        expect(viewToPath({ type: 'welcome' })).toBe('/');
    });

    it('round-trips an ontology package', () => {
        const view: ActiveView = { type: 'ontology-detail', packageName: '@memoarchitect/ontology' };
        const path = viewToPath(view)!;
        expect(path).toBe('/ontology/%40memoarchitect%2Fontology');
        expect(pathToView(path)).toEqual({
            type: 'ontology-detail', packageName: '@memoarchitect/ontology', layerId: undefined,
        });
    });

    it('round-trips an ontology package with a layer', () => {
        const view: ActiveView = { type: 'ontology-detail', packageName: 'core', layerId: 'risk' };
        const path = viewToPath(view)!;
        expect(path).toBe('/ontology/core/risk');
        expect(pathToView(path)).toEqual(view);
    });

    it('round-trips a DHF document', () => {
        const view: ActiveView = { type: 'dhf-document', docId: 'doc-42' };
        expect(viewToPath(view)).toBe('/dhf/doc-42');
        expect(pathToView('/dhf/doc-42')).toEqual(view);
    });

    it('keeps /dhf and /dhf/legacy distinct from a document', () => {
        expect(pathToView('/dhf')).toEqual({ type: 'dhf-dashboard' });
        expect(pathToView('/dhf/legacy')).toEqual({ type: 'dhf-dashboard-legacy' });
        expect(pathToView('/dhf/legacy')).not.toEqual({ type: 'dhf-document', docId: 'legacy' });
    });

    it('round-trips the tabular view with and without parameters', () => {
        expect(viewToPath({ type: 'tabular' })).toBe('/table');
        expect(pathToView('/table')).toEqual({ type: 'tabular', viewpointId: undefined, diagramId: undefined });

        const withParams: ActiveView = { type: 'tabular', viewpointId: 'vp1', diagramId: 'd1' };
        const path = viewToPath(withParams)!;
        expect(path).toBe('/table?viewpoint=vp1&diagram=d1');
        expect(pathToView('/table', '?viewpoint=vp1&diagram=d1')).toEqual(withParams);
    });

    it('tolerates a trailing slash', () => {
        expect(pathToView('/dsm/')).toEqual({ type: 'dsm' });
        expect(pathToView('/')).toEqual({ type: 'dashboard' });
    });

    it('returns null for an unknown path', () => {
        expect(pathToView('/nope')).toBeNull();
        expect(pathToView('/catalog/SW/SW-REQ-1')).toBeNull();  // permalink, resolved elsewhere
    });

    it('defers element and diagram permalinks to the model-aware caller', () => {
        expect(viewToPath({ type: 'element-detail', elementId: 'x' })).toBeNull();
        expect(viewToPath({ type: 'diagram', diagramId: 'd' })).toBeNull();
    });
});

// ─── Slugging ───────────────────────────────────────────────────────────────

describe('slug', () => {
    it('lower-cases and hyphenates', () => {
        expect(slug('Sample · Requirements')).toBe('sample-·-requirements');
        expect(slug('BDD')).toBe('bdd');
        expect(slug('Use Case View')).toBe('use-case-view');
    });
});

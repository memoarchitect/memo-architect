// ─── View ↔ URL mapping ───────────────────────────────────────────────────────
//
// Every destination in the app is addressable by URL, so any view a user
// reaches by clicking can also be bookmarked, shared, or reloaded into.
//
// One table drives both directions: `viewToPath` for store → URL, and
// `pathToView` for URL → store. Keeping them adjacent is what stops the two
// from drifting apart — a view added to ActiveView without a path here fails
// the round-trip test rather than silently becoming unaddressable.
//
// Element and diagram permalinks are resolved against the loaded model (short
// ID → element, slug → diagram), so they live in App.tsx where the model is in
// scope; this module owns their path *shape*.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActiveView } from './store/model-store';

/**
 * Views that carry no parameters — a fixed path each way.
 *
 * The dashboard is the app's default landing page, so it owns '/'. 'welcome'
 * is the pre-model splash shown before a model has loaded and shares that path;
 * it is listed in ALIAS_PATHS rather than here so the reverse lookup for '/'
 * resolves to the dashboard.
 */
const STATIC_VIEW_PATHS: Record<string, string> = {
    dashboard: '/',
    dsm: '/dsm',
    ontology: '/ontology',
    traceability: '/traceability',
    'scenario-editor': '/use-cases',
    'model-diff': '/diff',
    'compliance-wizard': '/compliance',
    statistics: '/statistics',
    'dhf-dashboard': '/dhf',
    'dhf-dashboard-legacy': '/dhf/legacy',
    ai: '/ai',
    ask: '/ask',
    'sysml-generator': '/generate',
    'review-dashboard': '/review',
    'workflow-wizard': '/workflow',
    import: '/import',
    analysis: '/analysis',
};

/**
 * Extra paths that resolve to a view but are not what it serialises back to.
 * '/dashboard' is spelled out for anyone who types or bookmarks it; it renders
 * the dashboard and then normalises to '/'.
 */
const ALIAS_PATHS: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/scenarios': 'scenario-editor',
};

/** Reverse of STATIC_VIEW_PATHS, plus the aliases. Built once. */
const PATH_TO_STATIC_VIEW: Record<string, string> = {
    ...Object.fromEntries(
        Object.entries(STATIC_VIEW_PATHS).map(([view, path]) => [path, view]),
    ),
    ...ALIAS_PATHS,
};

/** Lower-case and hyphenate a segment so it survives a round trip through a URL. */
export function slug(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-');
}

/**
 * The canonical path for a view, or null when the view needs model context the
 * caller must supply (element and diagram permalinks resolve through App.tsx).
 */
export function viewToPath(view: ActiveView): string | null {
    switch (view.type) {
        // The pre-model splash lives at the same address as the dashboard it
        // gives way to, so loading '/' never changes the URL under the user.
        case 'welcome':
            return '/';
        case 'ontology-detail':
            return view.layerId
                ? `/ontology/${encodeURIComponent(view.packageName)}/${encodeURIComponent(view.layerId)}`
                : `/ontology/${encodeURIComponent(view.packageName)}`;
        case 'dhf-document':
            return `/dhf/${encodeURIComponent(view.docId)}`;
        case 'tabular': {
            // Both parameters are optional; keep them as query params so the
            // bare /table path stays valid on its own.
            const params = new URLSearchParams();
            if (view.viewpointId) params.set('viewpoint', view.viewpointId);
            if (view.diagramId) params.set('diagram', view.diagramId);
            const query = params.toString();
            return query ? `/table?${query}` : '/table';
        }
        // Resolved against the model by the caller — see App.tsx.
        case 'element-detail':
        case 'diagram':
            return null;
        default:
            return STATIC_VIEW_PATHS[view.type] ?? null;
    }
}

/**
 * The view a path denotes, or null when the path is a permalink the caller must
 * resolve against the model (or is not a known route at all).
 */
export function pathToView(pathname: string, search = ''): ActiveView | null {
    // Tolerate a trailing slash so /dsm/ and /dsm are the same destination.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    const staticView = PATH_TO_STATIC_VIEW[path];
    if (staticView) return { type: staticView } as ActiveView;

    if (path === '/table') {
        const params = new URLSearchParams(search);
        return {
            type: 'tabular',
            viewpointId: params.get('viewpoint') ?? undefined,
            diagramId: params.get('diagram') ?? undefined,
        };
    }

    const segments = path.split('/').filter(Boolean);

    // /dhf/:docId — but /dhf and /dhf/legacy are static and matched above.
    if (segments[0] === 'dhf' && segments.length === 2) {
        return { type: 'dhf-document', docId: decodeURIComponent(segments[1]) };
    }

    // /ontology/:packageName[/:layerId]
    if (segments[0] === 'ontology' && segments.length >= 2) {
        return {
            type: 'ontology-detail',
            packageName: decodeURIComponent(segments[1]),
            layerId: segments[2] ? decodeURIComponent(segments[2]) : undefined,
        };
    }

    return null;
}

/**
 * Whether a path is an element or diagram permalink — a route whose target is
 * an identifier that must be resolved against the loaded model.
 *
 * These resolve asynchronously in their own route components, so until the
 * model arrives the store still holds whatever view it booted with. The URL
 * sync uses this to leave such a path alone rather than overwriting an
 * incoming bookmark with the default view.
 */
export function isPermalinkPath(pathname: string): boolean {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'catalog' && segments.length === 3) return true;   // /catalog/:family/:shortId
    if (segments[0] === 'diagrams' && segments.length === 3) return true;  // /diagrams/:type/:id
    return false;
}

/**
 * Every static path, for route registration and for tests to enumerate.
 * '/' is excluded: it is the index route, registered separately.
 */
export function staticViewPaths(): string[] {
    return [...Object.values(STATIC_VIEW_PATHS), ...Object.keys(ALIAS_PATHS)]
        .filter(path => path !== '/');
}

/** Every view type this module can address, for the round-trip test. */
export function addressableViewTypes(): string[] {
    return [
        ...Object.keys(STATIC_VIEW_PATHS),
        'welcome',
        'ontology-detail', 'dhf-document', 'tabular',
        'element-detail', 'diagram',
    ];
}

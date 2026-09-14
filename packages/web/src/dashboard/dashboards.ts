// ─── Custom dashboards: resolution and built-ins ─────────────────────────────
//
// A dashboard is one markdown file in one of two scopes (the server owns the
// files; see memo-tools server/dashboard-store.ts):
//
//   shared    dashboards/<id>.md          committed
//   user      dashboards/user/<id>.md     ignored by git (project .gitignore)
//
// The same id in both scopes: the user copy shadows the shared one. The home dashboard adds
// a third, bottom layer — the built-in page below — so the landing view works
// in a project with no dashboard files at all and can be customized, then
// reset, without losing the default.
//
// Design: plans/memo-custom-dashboards.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { DashboardDTO, DashboardScope, MemoModelDTO } from '@memoarchitect/tools/browser';
import { viewpointDashboardId, viewpointDashboardMarkdown } from './viewpoint-dashboard';

export { viewpointDashboardId } from './viewpoint-dashboard';

export const HOME_DASHBOARD_ID = 'home';

/**
 * The landing page as shipped. Customizing copies this into a scope.
 *
 * Written text-first: headings, sentences and links are markdown a user can
 * read and change, and widgets are kept to what prose cannot draw.
 */
export const BUILTIN_HOME_MARKDOWN = `---
title: Home
---
{{widget:header}}

The model has **{{model.elements}}** elements and **{{model.relationships}}** relationships, drawn in **{{model.views}}** views across **{{model.viewpoints}}** viewpoints.

{{widget:stats}}

## Layer coverage

How much of each engineering layer has content. Select a layer to explore it.

{{widget:coverage}}

## Suggested next step

{{widget:next-action}}

## Viewpoint dashboards

Each viewpoint has its own page: its stakeholders and concerns, its views drawn live, and room for commentary.

{{widget:viewpoint-dashboards}}

## Quick links

- [Browse the model](/catalog)
- [All diagrams](/diagrams)
- [Traceability matrix](/traceability)
- [Design review](/review)
- [Statistics](/statistics)
- [All dashboards](/dashboards)

## Project notes

_Use this space for what the numbers above cannot say: the current phase, the next milestone, and who to ask. Select **Customize** to write it._
`;

/** A dashboard that exists without a file, until someone customizes it. */
export interface BuiltinDashboard {
    id: string;
    title: string;
    content: string;
    /** Set for a viewpoint's generated page */
    viewpointId?: string;
}

/** Every built-in page for this model: home, and one per viewpoint. */
export function builtinDashboards(model: MemoModelDTO | null): BuiltinDashboard[] {
    const home: BuiltinDashboard = { id: HOME_DASHBOARD_ID, title: 'Home', content: BUILTIN_HOME_MARKDOWN };
    const viewpoints = (model?.viewpoints ?? []).filter(vp => !vp.id.startsWith('__'));
    return [home, ...viewpoints.map(vp => ({
        id: viewpointDashboardId(vp.id),
        title: vp.label,
        content: viewpointDashboardMarkdown(model!, vp),
        viewpointId: vp.id,
    }))];
}

/**
 * Starter content for a new dashboard.
 *
 * It describes the embed syntax in words rather than showing a placeholder
 * directive: directives resolve everywhere in the source, so an example
 * `{{diagram:…}}` would render as a "not found" error on a brand-new page.
 */
export function newDashboardMarkdown(title: string): string {
    return `---
title: ${title.replace(/\n/g, ' ')}
---
# ${title}

Write the context for this dashboard here.

Click **Edit**, then **Insert diagram** to embed a live, read-only diagram. It is
written as a \`diagram:\` directive on its own line, and takes an optional
\`height=640\` after the diagram id.
`;
}

export type ResolvedScope = DashboardScope | 'builtin';

export interface ResolvedDashboard {
    id: string;
    scope: ResolvedScope;
    title: string;
    content: string;
    path?: string;
    /** The shared file this user copy hides, when there is one */
    shadows?: DashboardDTO;
    /** True when a built-in page backs this id, so deleting its file resets rather than removes */
    builtin?: boolean;
}

/**
 * The dashboard to show for an id.
 *
 * Without a pinned scope: user, then shared, then — for `home` only — the
 * built-in. A pinned scope that has no file resolves to nothing rather than
 * falling through, because a link that says "shared" must not quietly open
 * someone's own copy.
 */
export function resolveDashboard(
    dashboards: readonly DashboardDTO[],
    id: string,
    scope?: DashboardScope,
    builtins: readonly BuiltinDashboard[] = [],
): ResolvedDashboard | null {
    const user = dashboards.find(d => d.id === id && d.scope === 'user');
    const shared = dashboards.find(d => d.id === id && d.scope === 'shared');
    const pick = scope === 'user' ? user : scope === 'shared' ? shared : user ?? shared;
    if (pick) {
        return {
            id, scope: pick.scope, title: pick.title, content: pick.content, path: pick.path,
            shadows: pick.scope === 'user' ? shared : undefined,
            builtin: id === HOME_DASHBOARD_ID || builtins.some(b => b.id === id),
        };
    }
    const builtin = scope ? undefined : id === HOME_DASHBOARD_ID
        ? { id, title: 'Home', content: BUILTIN_HOME_MARKDOWN }
        : builtins.find(b => b.id === id);
    if (builtin) {
        return { id, scope: 'builtin', title: builtin.title, content: builtin.content, builtin: true };
    }
    return null;
}

/** Turn a title into a file-safe id: `Pump architecture` → `pump-architecture`. */
export function dashboardIdFromTitle(title: string): string {
    const slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
    return slug || 'dashboard';
}

/** An id not yet used in `scope`, suffixing -2, -3, … when needed. */
export function uniqueDashboardId(dashboards: readonly DashboardDTO[], base: string, scope: DashboardScope): string {
    const taken = new Set(dashboards.filter(d => d.scope === scope).map(d => d.id));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!taken.has(candidate)) return candidate;
    }
}

export const SCOPE_LABEL: Record<ResolvedScope, string> = {
    shared: 'Shared',
    user: 'Only me',
    builtin: 'Built-in',
};

export const SCOPE_HINT: Record<ResolvedScope, string> = {
    shared: 'dashboards/ — committed with the project',
    user: 'dashboards/user/ — only on this machine, ignored by git',
    builtin: 'Generated by MEMO Architect — customize to make it your own',
};

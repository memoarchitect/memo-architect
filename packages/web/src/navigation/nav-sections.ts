// ─── The navigation: seven sections, every page in exactly one ───────────────
//
//   Guide · Views · Model · Analysis · Methodology · Documents · Settings
//
// The product-family plan (A2) names these sections. Each page Architect has
// belongs to exactly one, through `SECTION_OF_VIEW`, a Record over every
// `ActiveView` type: a page added to the store without a section does not
// compile. `NAV_ENTRIES` is what the drawer lists. Each entry is gated by the
// same feature flag that gates the page itself in App.tsx, so the drawer never
// offers a page that would render the dashboard instead.
//
// Change and release records are about the model as it moves, so they are listed in Model.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActiveView } from '../store/model-store';
import type { FeatureId } from '../config/feature-flags';

export type NavSectionId = 'guide' | 'model' | 'views' | 'analysis' | 'methodology' | 'documents' | 'settings';

export const NAV_SECTIONS: readonly { id: NavSectionId; label: string; icon: string }[] = [
    { id: 'guide', label: 'Guide', icon: '⌂' },
    { id: 'views', label: 'Views', icon: '⊟' },
    { id: 'model', label: 'Model', icon: '☰' },
    { id: 'analysis', label: 'Analysis', icon: '◫' },
    { id: 'methodology', label: 'Methodology', icon: '☑' },
    { id: 'documents', label: 'Documents', icon: '⊞' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
];

/** The section every page belongs to. `welcome` is decided by the mode; see `sectionOf`. */
export const SECTION_OF_VIEW: Record<ActiveView['type'], NavSectionId> = {
    dashboard: 'guide',
    dashboards: 'guide',
    'custom-dashboard': 'guide',
    guide: 'guide',
    welcome: 'guide',
    'element-detail': 'model',
    variability: 'model',
    feature: 'views',
    'scenario-editor': 'model',
    ai: 'model',
    ask: 'model',
    'sysml-generator': 'model',
    diagram: 'views',
    tabular: 'views',
    'ui-screens': 'views',
    rules: 'methodology',
    analysis: 'analysis',
    dsm: 'analysis',
    traceability: 'analysis',
    'suspect-links': 'analysis',
    statistics: 'analysis',
    'compliance-wizard': 'analysis',
    'review-dashboard': 'analysis',
    // Change and releases are about the model as it moves, so they sit with it.
    change: 'model',
    'model-diff': 'model',
    releases: 'model',
    'dhf-dashboard': 'documents',
    'dhf-document': 'documents',
    'dhf-dashboard-legacy': 'documents',
    import: 'settings',
    ontology: 'settings',
    'ontology-detail': 'settings',
    settings: 'settings',
};

/**
 * The explorer modes the store keeps (`activeMode`). Each opens a page with a
 * left explorer, and the drawer reaches it through the mode rather than a bare
 * view, because entering a mode also opens the right explorer tab and URL.
 */
export type NavModeId = 'dashboard' | 'catalog' | 'diagram' | 'ui-screens' | 'dhf' | 'scenario' | 'rules' | 'ai';

/** The section a mode's pages belong to. */
export const SECTION_OF_MODE: Record<NavModeId, NavSectionId> = {
    dashboard: 'guide',
    catalog: 'model',
    scenario: 'model',
    ai: 'model',
    diagram: 'views',
    'ui-screens': 'views',
    rules: 'methodology',
    dhf: 'documents',
};

/**
 * The section the current page is in. A diagram opened from Use Cases stays in
 * Model, and the empty canvas behind the catalog or the viewpoints belongs to
 * whichever of those is open.
 */
export function sectionOf(view: ActiveView, activeMode: string): NavSectionId {
    if (view.type === 'diagram' && activeMode === 'scenario') return 'model';
    if (view.type === 'welcome' && activeMode in SECTION_OF_MODE) return SECTION_OF_MODE[activeMode as NavModeId];
    return SECTION_OF_VIEW[view.type];
}

export type NavTarget =
    | { mode: NavModeId }
    | { view: ActiveView };

export interface NavEntry {
    id: string;
    label: string;
    icon: string;
    section: NavSectionId;
    target: NavTarget;
    /** The flag the page itself is gated on in App.tsx; absent means always shown. */
    feature?: FeatureId;
}

/** What the drawer lists, in order within each section. */
export const NAV_ENTRIES: readonly NavEntry[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⌂', section: 'guide', target: { mode: 'dashboard' } },
    { id: 'dashboards', label: 'Custom Dashboards', icon: '🧩', section: 'guide', target: { view: { type: 'dashboards' } }, feature: 'custom-dashboards' },
    { id: 'guide', label: 'Guide', icon: '🧭', section: 'guide', target: { view: { type: 'guide' } }, feature: 'guide' },

    { id: 'catalog', label: 'Model Explorer', icon: '☰', section: 'model', target: { mode: 'catalog' } },
    { id: 'scenario', label: 'Use Cases', icon: '▶', section: 'model', target: { mode: 'scenario' } },
    { id: 'variability', label: 'Variability', icon: '⑂', section: 'model', target: { view: { type: 'variability' } } },
    { id: 'ai', label: 'AI Tools', icon: '✦', section: 'model', target: { mode: 'ai' }, feature: 'ai-tools' },

    { id: 'diagram', label: 'Viewpoints', icon: '⊟', section: 'views', target: { mode: 'diagram' } },
    { id: 'ui-screens', label: 'UI Screens', icon: '▣', section: 'views', target: { mode: 'ui-screens' } },

    { id: 'rules', label: 'Rules', icon: '⚖', section: 'methodology', target: { mode: 'rules' } },
    { id: 'traceability', label: 'Traceability Matrix', icon: '☷', section: 'analysis', target: { view: { type: 'traceability' } }, feature: 'analysis' },
    { id: 'suspect-links', label: 'Suspect Links', icon: '⚑', section: 'analysis', target: { view: { type: 'suspect-links' } } },
    { id: 'dsm', label: 'Design Structure Matrix', icon: '▤', section: 'analysis', target: { view: { type: 'dsm' } }, feature: 'analysis' },
    { id: 'analysis', label: 'Analysis Notebooks', icon: '⌁', section: 'analysis', target: { view: { type: 'analysis' } }, feature: 'analysis' },
    { id: 'review-dashboard', label: 'Design Review', icon: '📋', section: 'analysis', target: { view: { type: 'review-dashboard' } }, feature: 'model-tools' },
    { id: 'compliance-wizard', label: 'Compliance Wizard', icon: '☑', section: 'analysis', target: { view: { type: 'compliance-wizard' } }, feature: 'model-tools' },
    { id: 'statistics', label: 'Statistics', icon: '⊠', section: 'analysis', target: { view: { type: 'statistics' } }, feature: 'model-tools' },

    { id: 'change', label: 'Projects and Impact', icon: '↔', section: 'model', target: { view: { type: 'change' } } },
    { id: 'model-diff', label: 'Model Diff', icon: '⇄', section: 'model', target: { view: { type: 'model-diff' } }, feature: 'model-tools' },

    { id: 'releases', label: 'Release Records', icon: '⬢', section: 'model', target: { view: { type: 'releases' } } },

    { id: 'dhf', label: 'Documents', icon: '⊞', section: 'documents', target: { mode: 'dhf' } },

    { id: 'settings', label: 'Settings', icon: '⚙', section: 'settings', target: { view: { type: 'settings' } } },
    { id: 'import', label: 'Import Model', icon: '↓', section: 'settings', target: { view: { type: 'import' } }, feature: 'import' },
    { id: 'ontology', label: 'Ontology Explorer', icon: '◉', section: 'settings', target: { view: { type: 'ontology' } }, feature: 'ontology' },
];

/** The page a mode opens, for matching an entry against the current view. */
export const VIEW_OF_MODE: Record<NavModeId, ActiveView['type']> = {
    dashboard: 'dashboard',
    catalog: 'welcome',
    scenario: 'scenario-editor',
    ai: 'ai',
    diagram: 'welcome',
    'ui-screens': 'ui-screens',
    rules: 'rules',
    dhf: 'dhf-dashboard',
};

/** The section an entry opens. */
export function sectionOfEntry(entry: NavEntry): NavSectionId {
    if ('mode' in entry.target) return SECTION_OF_MODE[entry.target.mode];
    if ('view' in entry.target) return SECTION_OF_VIEW[entry.target.view.type];
    return 'settings';
}

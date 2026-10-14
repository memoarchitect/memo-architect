// ─── The navigation: eight sections, every page in exactly one ───────────────
//
//   Guide · Model · Views · Assurance · Change · Releases · Documents · Settings
//
// The product-family plan (A2) names these sections. Each page Architect has
// belongs to exactly one, through `SECTION_OF_VIEW`, a Record over every
// `ActiveView` type: a page added to the store without a section does not
// compile. `NAV_ENTRIES` is what the drawer lists. Each entry is gated by the
// same feature flag that gates the page itself in App.tsx, so the drawer never
// offers a page that would render the dashboard instead.
//
// Change and Releases are placeholders until their milestones land.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActiveView } from '../store/model-store';
import type { FeatureId } from '../config/feature-flags';

export type NavSectionId = 'guide' | 'model' | 'views' | 'assurance' | 'change' | 'releases' | 'documents' | 'settings';

export const NAV_SECTIONS: readonly { id: NavSectionId; label: string; icon: string }[] = [
    { id: 'guide', label: 'Guide', icon: '⌂' },
    { id: 'model', label: 'Model', icon: '☰' },
    { id: 'views', label: 'Views', icon: '⊟' },
    { id: 'assurance', label: 'Assurance', icon: '⚖' },
    { id: 'change', label: 'Change', icon: '↔' },
    { id: 'releases', label: 'Releases', icon: '⬢' },
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
    'scenario-editor': 'model',
    ai: 'model',
    ask: 'model',
    'sysml-generator': 'model',
    diagram: 'views',
    tabular: 'views',
    'ui-screens': 'views',
    rules: 'assurance',
    analysis: 'assurance',
    dsm: 'assurance',
    traceability: 'assurance',
    'suspect-links': 'assurance',
    statistics: 'assurance',
    'compliance-wizard': 'assurance',
    'review-dashboard': 'assurance',
    change: 'change',
    'model-diff': 'change',
    releases: 'releases',
    'dhf-dashboard': 'documents',
    'dhf-document': 'documents',
    'dhf-dashboard-legacy': 'documents',
    import: 'settings',
    ontology: 'settings',
    'ontology-detail': 'settings',
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
    rules: 'assurance',
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
    | { view: ActiveView }
    | { panel: 'settings' };

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
    { id: 'dashboards', label: 'Custom Dashboards', icon: '🧩', section: 'guide', target: { view: { type: 'dashboards' } } },
    { id: 'guide', label: 'Guide', icon: '🧭', section: 'guide', target: { view: { type: 'guide' } } },

    { id: 'catalog', label: 'Model Explorer', icon: '☰', section: 'model', target: { mode: 'catalog' } },
    { id: 'scenario', label: 'Use Cases', icon: '▶', section: 'model', target: { mode: 'scenario' } },
    { id: 'variability', label: 'Variability', icon: '⑂', section: 'model', target: { view: { type: 'variability' } } },
    { id: 'ai', label: 'AI Tools', icon: '✦', section: 'model', target: { mode: 'ai' }, feature: 'ai-tools' },

    { id: 'diagram', label: 'Viewpoints', icon: '⊟', section: 'views', target: { mode: 'diagram' } },
    { id: 'ui-screens', label: 'UI Screens', icon: '▣', section: 'views', target: { mode: 'ui-screens' } },

    { id: 'rules', label: 'Rules', icon: '⚖', section: 'assurance', target: { mode: 'rules' } },
    { id: 'traceability', label: 'Traceability Matrix', icon: '☷', section: 'assurance', target: { view: { type: 'traceability' } }, feature: 'analysis' },
    { id: 'suspect-links', label: 'Suspect Links', icon: '⚑', section: 'assurance', target: { view: { type: 'suspect-links' } } },
    { id: 'dsm', label: 'Design Structure Matrix', icon: '▤', section: 'assurance', target: { view: { type: 'dsm' } }, feature: 'analysis' },
    { id: 'analysis', label: 'Analysis Notebooks', icon: '⌁', section: 'assurance', target: { view: { type: 'analysis' } }, feature: 'analysis' },
    { id: 'review-dashboard', label: 'Design Review', icon: '📋', section: 'assurance', target: { view: { type: 'review-dashboard' } }, feature: 'model-tools' },
    { id: 'compliance-wizard', label: 'Compliance Wizard', icon: '☑', section: 'assurance', target: { view: { type: 'compliance-wizard' } }, feature: 'model-tools' },
    { id: 'statistics', label: 'Statistics', icon: '⊠', section: 'assurance', target: { view: { type: 'statistics' } }, feature: 'model-tools' },

    { id: 'change', label: 'Projects and Impact', icon: '↔', section: 'change', target: { view: { type: 'change' } } },
    { id: 'model-diff', label: 'Model Diff', icon: '⇄', section: 'change', target: { view: { type: 'model-diff' } }, feature: 'model-tools' },

    { id: 'releases', label: 'Release Records', icon: '⬢', section: 'releases', target: { view: { type: 'releases' } } },

    { id: 'dhf', label: 'Documents', icon: '⊞', section: 'documents', target: { mode: 'dhf' } },

    { id: 'settings', label: 'Model Settings', icon: '⚙', section: 'settings', target: { panel: 'settings' } },
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

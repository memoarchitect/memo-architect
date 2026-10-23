// ─── The navigation: seven sections, every page in exactly one ───────────────
//
//   Home · Views · Model · Advanced · Settings
//
// The product-family plan (A2) names these sections. Each page Architect has
// belongs to exactly one, through `SECTION_OF_VIEW`, a Record over every
// `ActiveView` type: a page added to the store without a section does not
// compile. `NAV_ENTRIES` is what the drawer lists. Each entry is gated by the
// same feature flag that gates the page itself in App.tsx, so the drawer never
// offers a page that would render the dashboard instead.
//
// Advanced holds the specialist pages: analysis tools, variability, change and release records, working sets.
// Rules and Methodology are opened from Settings > Model, so the drawer does not list them.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActiveView } from '../store/model-store';
import type { FeatureId } from '../config/feature-flags';

export type NavSectionId = 'guide' | 'model' | 'views' | 'advanced' | 'settings';

export const NAV_SECTIONS: readonly { id: NavSectionId; label: string; icon: string }[] = [
    // The section that holds the Dashboard. It was named for the Guide page, which is an experimental feature
    // (Settings > Features) and only appears in this section when switched on.
    { id: 'guide', label: 'Home', icon: '⌂' },
    { id: 'views', label: 'Views', icon: '⊟' },
    { id: 'model', label: 'Model', icon: '☰' },
    { id: 'advanced', label: 'Advanced', icon: '◫' },
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
    variability: 'advanced',
    feature: 'views',
    interfaces: 'views',
    'scenario-editor': 'views',
    ai: 'model',
    ask: 'model',
    'sysml-generator': 'model',
    diagram: 'views',
    tabular: 'views',
    'ui-screens': 'views',
    rules: 'settings',
    analysis: 'advanced',
    dsm: 'advanced',
    traceability: 'model',
    'suspect-links': 'advanced',
    statistics: 'advanced',
    'compliance-wizard': 'advanced',
    'review-dashboard': 'advanced',
    change: 'advanced',
    'model-diff': 'model',
    releases: 'advanced',
    'dhf-dashboard': 'model',
    'dhf-document': 'model',
    'dhf-dashboard-legacy': 'model',
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
    scenario: 'views',
    ai: 'model',
    diagram: 'views',
    'ui-screens': 'views',
    rules: 'settings',
    dhf: 'model',
};

/**
 * The section the current page is in. The empty canvas behind the catalog or
 * the viewpoints belongs to whichever of those is open.
 */
export function sectionOf(view: ActiveView, activeMode: string): NavSectionId {
    if (view.type === 'welcome' && activeMode in SECTION_OF_MODE) return SECTION_OF_MODE[activeMode as NavModeId];
    return SECTION_OF_VIEW[view.type];
}

export type NavTarget =
    | { mode: NavModeId; /** A top-level domain of the Model Explorer to open on; absent opens the whole tree. */ domain?: string }
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

    // The model is opened by its domains, the top-level groups of the Model Explorer: each entry opens the
    // explorer on that one domain (and the explorer offers the whole tree again).
    { id: 'domain-architecture', label: 'Architecture', icon: '◈', section: 'model', target: { mode: 'catalog', domain: 'architecture' } },
    { id: 'domain-assurance', label: 'Assurance', icon: '⚖', section: 'model', target: { mode: 'catalog', domain: 'assurance' } },
    { id: 'traceability', label: 'Traceability Matrix', icon: '☷', section: 'model', target: { view: { type: 'traceability' } }, feature: 'analysis' },
    { id: 'dhf', label: 'Documents', icon: '⊞', section: 'model', target: { mode: 'dhf' } },
    { id: 'model-diff', label: 'Model Diff', icon: '⇄', section: 'model', target: { view: { type: 'model-diff' } }, feature: 'model-tools' },
    { id: 'ai', label: 'AI Tools', icon: '✦', section: 'model', target: { mode: 'ai' }, feature: 'ai-tools' },

    { id: 'diagram', label: 'Viewpoints', icon: '⊟', section: 'views', target: { mode: 'diagram' } },
    { id: 'scenario', label: 'Use Cases', icon: '▶', section: 'views', target: { mode: 'scenario' } },
    { id: 'ui-screens', label: 'UI Screens', icon: '▣', section: 'views', target: { mode: 'ui-screens' } },
    { id: 'interfaces', label: 'Interfaces', icon: '⇌', section: 'views', target: { view: { type: 'interfaces' } } },

    { id: 'variability', label: 'Variability', icon: '⑂', section: 'advanced', target: { view: { type: 'variability' } } },
    { id: 'change', label: 'Projects and Impact', icon: '↔', section: 'advanced', target: { view: { type: 'change' } } },
    { id: 'releases', label: 'Release Records', icon: '⬢', section: 'advanced', target: { view: { type: 'releases' } } },
    { id: 'suspect-links', label: 'Suspect Links', icon: '⚑', section: 'advanced', target: { view: { type: 'suspect-links' } } },
    { id: 'dsm', label: 'Design Structure Matrix', icon: '▤', section: 'advanced', target: { view: { type: 'dsm' } }, feature: 'analysis' },
    { id: 'analysis', label: 'Analysis Notebooks', icon: '⌁', section: 'advanced', target: { view: { type: 'analysis' } }, feature: 'analysis' },
    { id: 'review-dashboard', label: 'Design Review', icon: '📋', section: 'advanced', target: { view: { type: 'review-dashboard' } }, feature: 'model-tools' },
    { id: 'compliance-wizard', label: 'Compliance Wizard', icon: '☑', section: 'advanced', target: { view: { type: 'compliance-wizard' } }, feature: 'model-tools' },
    { id: 'statistics', label: 'Statistics', icon: '⊠', section: 'advanced', target: { view: { type: 'statistics' } }, feature: 'model-tools' },

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

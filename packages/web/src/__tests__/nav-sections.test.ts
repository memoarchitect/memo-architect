import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    NAV_ENTRIES, NAV_SECTIONS, SECTION_OF_VIEW, VIEW_OF_MODE, sectionOf, sectionOfEntry,
} from '../navigation/nav-sections';

/** The ActiveView union, parsed from the store's source as view-routes.test does. */
function declaredViewTypes(): string[] {
    const source = readFileSync(resolve(__dirname, '../store/model-store.ts'), 'utf8');
    const union = source.match(/export type ActiveView =([\s\S]*?);\n/)?.[1] ?? '';
    return [...union.matchAll(/type:\s*'([a-z-]+)'/g)].map(m => m[1]);
}

/**
 * Pages reached from inside another page rather than from the drawer: a
 * diagram from Viewpoints, an element from the explorer, a document from
 * Documents, a dashboard from the list, a table from a viewpoint, the AI
 * workspace's two tools, the legacy document grid, and the pre-model splash.
 */
const REACHED_FROM_A_PAGE = new Set([
    'diagram', 'element-detail', 'ontology-detail', 'dhf-document', 'custom-dashboard',
    'tabular', 'ask', 'sysml-generator', 'dhf-dashboard-legacy', 'welcome', 'feature',
]);

const opens = (entry: (typeof NAV_ENTRIES)[number]): string | undefined =>
    'mode' in entry.target ? VIEW_OF_MODE[entry.target.mode]
        : 'view' in entry.target ? entry.target.view.type
        : undefined;

describe('the navigation', () => {
    it('has the seven sections, in order', () => {
        expect(NAV_SECTIONS.map(section => section.label))
            .toEqual(['Home', 'Views', 'Model', 'Analysis', 'Methodology', 'Documents', 'Settings']);
    });

    it('puts every page in exactly one section', () => {
        expect(Object.keys(SECTION_OF_VIEW).sort()).toEqual([...new Set(declaredViewTypes())].sort());
    });

    it('lists every page that was in the previous navigation', () => {
        // The modes of the former NAV_MODES, and every item of the former Tools
        // and Analysis menus.
        const ids = new Set(NAV_ENTRIES.map(entry => entry.id));
        for (const id of [
            // The Model Explorer is opened by its domains: one entry each.
            'dashboard', 'domain-architecture', 'domain-assurance', 'domain-methodology', 'diagram', 'ui-screens', 'dhf', 'scenario', 'rules', 'ai',
            'ontology', 'import', 'traceability', 'statistics', 'compliance-wizard', 'model-diff',
            'review-dashboard', 'dashboards', 'guide', 'analysis', 'dsm', 'settings',
        ]) expect(ids, id).toContain(id);
    });

    it('reaches every page the drawer is meant to reach', () => {
        const reached = new Set(NAV_ENTRIES.map(opens).filter(Boolean));
        const missing = declaredViewTypes().filter(type => !REACHED_FROM_A_PAGE.has(type) && !reached.has(type));
        expect(missing).toEqual([]);
    });

    it('files each entry under the section its page belongs to', () => {
        for (const entry of NAV_ENTRIES) expect(sectionOfEntry(entry), entry.id).toBe(entry.section);
        for (const section of NAV_SECTIONS) {
            expect(NAV_ENTRIES.some(entry => entry.section === section.id), section.id).toBe(true);
        }
    });

    it('keeps a use-case diagram in Model and the empty catalog in Model', () => {
        expect(sectionOf({ type: 'diagram', diagramId: 'x' }, 'scenario')).toBe('model');
        expect(sectionOf({ type: 'diagram', diagramId: 'x' }, 'diagram')).toBe('views');
        expect(sectionOf({ type: 'welcome' }, 'catalog')).toBe('model');
        expect(sectionOf({ type: 'welcome' }, 'diagram')).toBe('views');
    });
});

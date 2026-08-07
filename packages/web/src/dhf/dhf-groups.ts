// ─── DHF Document Categories ──────────────────────────────────────────────────
//
// The built-in document categories and their MEMO templates, DERIVED from the
// templates the ontology ships. Shared by the DHF explorer (grouping, colors)
// and the New Document wizard. Users can also file documents under a custom
// "Other" category.
//
// This file used to hold a hand-written array — the third place a clause
// reference and a document id were written down, and the one that decided
// which templates existed at all. It disagreed with the disk in both
// directions: it listed `hardware/hdp`, `system/sds` and five other templates
// that have never existed as files (the wizard offered them and produced blank
// documents), and it omitted `iec-60601/*` entirely, so templates that did
// exist were unreachable. Both failure modes are structural — a hardcoded list
// cannot notice a file appearing or disappearing.
//
// Now: one group per standard directory, one entry per template on disk.
// Adding a standard is a directory of templates in the ontology and no change
// here. The trade this makes is that grouping follows the standard a document
// claims rather than a curated theme, so the three 21 CFR 820 groups
// ("Requirements", "V&V", "Release & Change") are one group now. That is the
// same fact the rest of this work rests on: the standard is the axis.
// ─────────────────────────────────────────────────────────────────────────────

import { listBuiltInTemplates } from './built-in-templates';

export interface DhfTemplate { id: string; title: string; prefix: string; }

export interface DhfGroup {
    id: string;
    label: string;
    color: string;
    templates: DhfTemplate[];
}

/**
 * Category id for user-defined categories that don't fit the built-in groups.
 * Documents created under the previous, theme-based labels ("Risk Management",
 * "Software", …) land here rather than disappearing: the explorer lists any
 * document group it does not recognise as a custom category.
 */
export const OTHER_GROUP_ID = 'other';
export const OTHER_GROUP_COLOR = '#6B7280';

// A fixed palette indexed by a hash of the directory name, so a group keeps
// its color when a sibling is added or removed. Colors are decoration; the
// alternative — a per-standard table — is the registry this file just deleted.
const PALETTE = [
    '#dc2626', '#2563eb', '#7c3aed', '#0891b2',
    '#0d9488', '#4f46e5', '#059669', '#b45309', '#d97706',
];

function colorFor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
}

/**
 * Human label for a standard directory.
 *
 * The label is the designation the directory's documents predominantly claim,
 * without its edition — "IEC 62304:2006+AMD1:2015" is the right thing to cite
 * in a document and the wrong length for a sidebar chip. A single outlier does
 * not rename the group: `iso-14971/` holds six ISO 14971 documents and one
 * FMEA claiming IEC 60812, and it is still the risk-management group.
 *
 * With no majority — `system/` holds three documents claiming 42010, IEC 62304
 * and IEC 60601-1, one each — the directory name is the only honest label.
 */
function labelFor(directory: string, designations: string[]): string {
    const counts = new Map<string, number>();
    for (const d of designations) counts.set(d, (counts.get(d) ?? 0) + 1);

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const isMajority = ranked.length === 1 || (ranked.length > 1 && ranked[0][1] > ranked[1][1]);
    if (isMajority) return ranked[0][0].split(':')[0].trim();

    return directory
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Derive a document ID prefix from a title, e.g.
 * "Clinical Evaluation Report" → "CER", "Notes" → "NOT".
 */
export function prefixFromTitle(title: string): string {
    const words = title.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (words.length >= 2) return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return 'DOC';
}

function buildGroups(): DhfGroup[] {
    const byDirectory = new Map<string, { designations: string[]; templates: DhfTemplate[] }>();

    for (const t of listBuiltInTemplates()) {
        if (!byDirectory.has(t.directory)) {
            byDirectory.set(t.directory, { designations: [], templates: [] });
        }
        const group = byDirectory.get(t.directory)!;
        if (t.standard) group.designations.push(t.standard);
        const title = t.title ?? t.id.slice(t.id.indexOf('/') + 1);
        group.templates.push({ id: t.id, title, prefix: prefixFromTitle(title) });
    }

    return [...byDirectory.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([directory, { designations, templates }]) => ({
            id: directory,
            label: labelFor(directory, designations),
            color: colorFor(directory),
            templates: templates.sort((a, b) => a.title.localeCompare(b.title)),
        }));
}

export const DHF_GROUPS: DhfGroup[] = buildGroups();

/** Color for a group label, falling back to the Other color for custom categories */
export function groupColorForLabel(label: string): string {
    return DHF_GROUPS.find(g => g.label === label)?.color ?? OTHER_GROUP_COLOR;
}

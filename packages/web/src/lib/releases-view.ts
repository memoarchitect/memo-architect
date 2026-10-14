// ─── Release records, by item (plan A11) ─────────────────────────────────────
//
// A release record is one release of one item (`releaseOf`); the page and the Version selector read
// the records from the model and group them by the item they release. What a record contains, which
// interface revisions it implements, the cases that verified it and the features it selects are the
// relations the builder made from the ontology's typed dependencies; nothing here names a kind but the
// record's own, matched through the kind registry so a specialization counts.
// ─────────────────────────────────────────────────────────────────────────────

import { indexKinds, kindConformsTo, relationshipsOfType, type MemoModelDTO, type ValidationResult } from '@memoarchitect/tools/browser';
import { idsInWorkspace } from './workspace-scope';
import { RELEASE_KIND } from './variability-view';

export interface ReleaseRecordRow {
    id: string;
    label: string;
    partNumber: string;
    revision: string;
    softwareVersion?: string;
    codeTag?: string;
    modelCommit: string;
    status: string;
    /** The item definition it is a release of; absent when the record names none. */
    item?: { id: string; name: string };
    contains: string[];
    implements: string[];
    verifiedBy: string[];
    features: string[];
    /** Records that contain this one. */
    containedBy: string[];
    findings: { ruleId: string; description: string; severity: string }[];
}

export interface ItemReleases {
    /** The item's element id, or '' for records with no item. */
    itemId: string;
    itemName: string;
    records: ReleaseRecordRow[];
}

const nameOf = (model: MemoModelDTO, id: string): string => model.elements[id]?.name || id.slice(id.lastIndexOf('::') + 2);
const attr = (model: MemoModelDTO, id: string, key: string): string => model.elements[id]?.attributes?.[key] ?? '';

/** Every release record the model holds, optionally narrowed to a workspace. */
export function releaseRecords(model: MemoModelDTO, validation: ValidationResult | null, workspace: string | null): ReleaseRecordRow[] {
    const kinds = indexKinds(model.registries?.kinds ?? []);
    const isRecord = (id: string) => {
        const actual = model.elements[id]?.kind;
        return actual !== undefined && kindConformsTo(actual, RELEASE_KIND, kinds);
    };
    const inWorkspace = idsInWorkspace(model.workspaceMembership, workspace);
    const out = (id: string, type: string) => relationshipsOfType(model, type).filter(r => r.sourceId === id).map(r => r.targetId);
    const into = (id: string, type: string) => relationshipsOfType(model, type).filter(r => r.targetId === id).map(r => r.sourceId);
    return Object.keys(model.elements).filter(id => isRecord(id) && (!inWorkspace || inWorkspace.has(id))).map(id => {
        const itemId = out(id, 'releaseOf')[0];
        return {
            id, label: nameOf(model, id),
            partNumber: attr(model, id, 'partNumber'), revision: attr(model, id, 'revision'),
            softwareVersion: attr(model, id, 'softwareVersion') || undefined, codeTag: attr(model, id, 'codeTag') || undefined,
            modelCommit: attr(model, id, 'modelCommit'),
            status: attr(model, id, 'status').replace(/^.*::/, ''),
            item: itemId ? { id: itemId, name: nameOf(model, itemId) } : undefined,
            contains: out(id, 'contains'), implements: out(id, 'implements'), verifiedBy: out(id, 'verifiedByCase'),
            features: out(id, 'selectsFeature'), containedBy: into(id, 'contains'),
            findings: (validation?.violations ?? []).filter(v => v.elementId === id)
                .map(v => ({ ruleId: v.ruleId, description: v.description, severity: v.severity })),
        };
    });
}

/** Records grouped by the item they release, items by name, a record with no item last. */
export function releasesByItem(rows: ReleaseRecordRow[]): ItemReleases[] {
    const groups = new Map<string, ItemReleases>();
    for (const row of rows) {
        const key = row.item?.id ?? '';
        const group = groups.get(key) ?? { itemId: key, itemName: row.item?.name ?? 'No item named (#ReleaseOf missing)', records: [] };
        group.records.push(row);
        groups.set(key, group);
    }
    return [...groups.values()]
        .map(group => ({ ...group, records: group.records.sort((a, b) => a.label.localeCompare(b.label)) }))
        .sort((a, b) => (a.itemId === '' ? 1 : b.itemId === '' ? -1 : a.itemName.localeCompare(b.itemName)));
}

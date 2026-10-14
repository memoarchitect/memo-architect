import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { releaseRecords, releasesByItem } from '../lib/releases-view';

// Two systems, a firmware, and records of them at three levels: the page reads each record's item, what
// it contains, implements and is verified by, and groups the records by the item they release.
const el = (id: string, kind: string, attributes: Record<string, string> = {}): MemoElement =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes });
const edge = (type: string, sourceId: string, targetId: string): MemoRelationship =>
    ({ id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml' });
const record = (id: string, status: string, extra: Record<string, string> = {}) =>
    el(id, 'ReleaseRecord', { status: `ElementStatusKind::${status}`, partNumber: `PN-${id}`, revision: 'A', modelCommit: 'abc1234', ...extra });

const model = {
    elements: Object.fromEntries([
        el('Pump', 'System'), el('Generator', 'System'), el('Lab', 'SystemOfSystems'), el('vc', 'VerificationCase'), el('Icd', 'Interface'),
        record('relPumpA', 'released'), record('relPumpB', 'draft', { softwareVersion: '1.1.0', codeTag: 'v1.1.0' }),
        record('relGen', 'released'), record('relLab', 'released'), record('relOrphan', 'draft'),
    ].map(e => [e.id, e])),
    relationships: [
        edge('releaseOf', 'relPumpA', 'Pump'), edge('releaseOf', 'relPumpB', 'Pump'), edge('releaseOf', 'relGen', 'Generator'), edge('releaseOf', 'relLab', 'Lab'),
        edge('contains', 'relLab', 'relPumpA'), edge('contains', 'relLab', 'relGen'),
        edge('implements', 'relGen', 'relPumpB'), edge('verifiedByCase', 'relLab', 'vc'), edge('selectsFeature', 'relPumpA', 'featX'),
    ],
    errors: [],
    registries: { relationships: [], kinds: [
        { name: 'MemoPart', superType: undefined }, { name: 'ReleaseRecord', superType: 'MemoPart' },
        { name: 'System', superType: 'MemoPart' }, { name: 'SystemOfSystems', superType: 'MemoPart' },
        { name: 'VerificationCase', superType: 'MemoPart' }, { name: 'Interface', superType: 'MemoPart' },
    ] },
} as unknown as MemoModelDTO;

describe('release records by item (A11)', () => {
    const rows = releaseRecords(model, null, null);

    it('reads every record with its fields, status, item and links', () => {
        expect(rows.map(r => r.id).sort()).toEqual(['relGen', 'relLab', 'relOrphan', 'relPumpA', 'relPumpB']);
        expect(rows.find(r => r.id === 'relPumpB')).toMatchObject({ partNumber: 'PN-relPumpB', revision: 'A', softwareVersion: '1.1.0', codeTag: 'v1.1.0', status: 'draft', item: { id: 'Pump' } });
        expect(rows.find(r => r.id === 'relLab')).toMatchObject({ contains: ['relPumpA', 'relGen'], verifiedBy: ['vc'] });
        expect(rows.find(r => r.id === 'relGen')).toMatchObject({ implements: ['relPumpB'], containedBy: ['relLab'] });
        expect(rows.find(r => r.id === 'relPumpA')!.features).toEqual(['featX']);
    });

    it('groups them by the item they release, items by name, a record with no item last', () => {
        const groups = releasesByItem(rows);
        expect(groups.map(g => `${g.itemName}: ${g.records.map(r => r.id).join(',')}`)).toEqual([
            'Generator: relGen', 'Lab: relLab', 'Pump: relPumpA,relPumpB', 'No item named (#ReleaseOf missing): relOrphan',
        ]);
    });

    it('does not take an element of another kind for a record', () => {
        expect(rows.some(r => r.id === 'Pump' || r.id === 'vc')).toBe(false);
    });
});

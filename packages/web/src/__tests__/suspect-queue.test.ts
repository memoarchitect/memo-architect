import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';
import { listImportSources } from '@memoarchitect/tools/browser';
import { suspectRows } from '../lib/suspect-queue';

// A requirement imported from a source (outside every workspace), a part in the pump's workspace
// that satisfies it, and a part in the generator's that traces to a record that has left the source.
const record = (id: string, revision: string, withdrawn = false): MemoElement => ({
    id, name: id, kind: 'Requirement', construct: 'requirement', layer: 'requirements', file: 'imports/x.sysml',
    attributes: {
        'externalReference.sourceSystem': 'reqtool', 'externalReference.identifier': id.toUpperCase(),
        'externalReference.revision': revision, ...(withdrawn ? { sourceWithdrawn: 'true' } : {}),
    },
});
const part = (id: string): MemoElement => ({ id, name: id, kind: 'LogicalComponent', construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {} });
const link = (id: string, type: string, sourceId: string, targetId: string, baseline: string, identifier?: string): MemoRelationship => ({
    id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'links.sysml',
    attributes: { sourceRevision: baseline, ...(identifier ? { sourceIdentifier: identifier } : {}) },
});

const membership: WorkspaceMembershipDTO = {
    workspaces: [{ root: 'Pump', scope: 'system', name: 'Pump' }, { root: 'Gen', scope: 'system', name: 'Gen' }],
    membership: { pumpPart: ['Pump'], genPart: ['Gen'] },
    shared: [], unassigned: ['req1', 'req2'], definitionOf: {}, missingSystem: false,
};

const model = {
    elements: Object.fromEntries([record('req1', 'C'), record('req2', 'A', true), part('pumpPart'), part('genPart')].map(e => [e.id, e])),
    relationships: [
        link('l-moved', 'satisfiedBy', 'req1', 'pumpPart', 'B'),
        link('l-current', 'satisfiedBy', 'req1', 'pumpPart', 'C'),
        link('l-gone', 'derivesFrom', 'genPart', 'req2', 'A'),
        // between two imported records, judged against REQ1 alone
        link('l-two', 'derivesFrom', 'req1', 'req2', 'B', 'REQ1'),
    ],
    errors: [], workspaceMembership: membership,
} as unknown as MemoModelDTO;

describe('the suspect-links queue', () => {
    it('lists what moved or left, withdrawn first, with the record and the other end', () => {
        const rows = suspectRows(model, null);
        expect(rows.map(r => `${r.relationshipId}:${r.reason}`)).toEqual([
            'l-gone:source-withdrawn', 'l-moved:revision-moved', 'l-two:revision-moved',
        ]);
        expect(rows[1]).toMatchObject({ sourceSystem: 'reqtool', sourceIdentifier: 'REQ1', otherLabel: 'pumpPart', baseline: 'B', current: 'C' });
    });

    it('shows a workspace the links with an end in it, though the imported record is in no workspace', () => {
        expect(suspectRows(model, 'Pump').map(r => r.relationshipId)).toEqual(['l-moved']);
        expect(suspectRows(model, 'Gen').map(r => r.relationshipId)).toEqual(['l-gone']);
    });

    it('lists the sources the model imports from, with the records each holds', () => {
        const withPackage = { ...model, packages: [{
            qualifiedName: 'imports_reqtool', name: 'imports_reqtool', file: 'imports/x.sysml',
            attributes: { sourceSystem: 'reqtool', importFormat: 'csv', importFile: 'v1.csv', importedAt: '2026-10-13T09:00:00.000Z' },
        }] } as MemoModelDTO;
        expect(listImportSources(withPackage)).toEqual([{
            system: 'reqtool', format: 'csv', file: 'v1.csv', importedAt: '2026-10-13T09:00:00.000Z',
            packageName: 'imports_reqtool', sourceFile: 'imports/x.sysml', records: 2, withdrawn: 1,
        }]);
    });
});

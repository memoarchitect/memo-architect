import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { mergeScopedMembers, projectDiagramModel } from '../diagram/display-scope';

const model = {
    elements: Object.fromEntries(['pump', 'pumpFunction', 'shared', 'foreign'].map(id => [id, { id }])),
    relationships: [{ id: 'own', sourceId: 'pumpFunction', targetId: 'shared' }, { id: 'other', sourceId: 'foreign', targetId: 'shared' }],
    diagrams: [{ id: 'decomposition', elementIds: ['pumpFunction', 'shared', 'foreign'] }],
    workspaceMembership: { workspaces: [{ root: 'pump', scope: 'system' }], membership: { pump: ['pump'], pumpFunction: ['pump'], shared: ['pump', 'other'], foreign: ['other'] }, unassigned: [] },
} as unknown as MemoModelDTO;

describe('diagram display scope shared by native renderers', () => {
    it('projects a mixed authored view for every renderer and table without changing its source membership', () => {
        const scoped = projectDiagramModel(model, 'pump');
        expect(Object.keys(scoped.elements)).toEqual(['pump', 'pumpFunction', 'shared']);
        expect(scoped.relationships.map(edge => edge.id)).toEqual(['own']);
        expect(scoped.diagrams![0].elementIds).toEqual(['pumpFunction', 'shared']);
        expect(model.diagrams![0].elementIds).toContain('foreign');
        expect(projectDiagramModel(model, null)).toBe(model);
    });
    it('retains hidden authored members when removing or adding a visible member', () => {
        expect(mergeScopedMembers(model, 'pump', 'decomposition', ['shared'])).toEqual(['foreign', 'shared']);
        expect(mergeScopedMembers(model, 'pump', 'decomposition', ['pumpFunction', 'newFunction'])).toEqual(['foreign', 'pumpFunction', 'newFunction']);
    });
    it('never falls back to the whole model for a selected scope whose metadata is absent or stale', () => {
        for (const source of [model, { ...model, workspaceMembership: undefined }]) {
            expect(Object.keys(projectDiagramModel(source, 'missing').elements)).toEqual([]);
            expect(projectDiagramModel(source, 'missing').diagrams![0].elementIds).toEqual([]);
        }
    });
});

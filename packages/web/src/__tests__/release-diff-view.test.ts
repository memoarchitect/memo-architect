import { describe, expect, it } from 'vitest';
import type { MemoModelDTO, ModelDiffSummary } from '@memoarchitect/tools/browser';
import { diffForRole } from '../lib/release-diff-view';

// A release's changes, for a role: the kinds the role's viewpoints admit, read from the model's viewpoints
// and its kind registry. No table of kinds to pages lives in the client.

const vp = (id: string, stakeholders: string[], visibleKinds: string[]) =>
    ({ id, label: id, stakeholders, visibleKinds, visibleRelationships: [], visibleLayers: [] });
const model = (viewpoints: ReturnType<typeof vp>[]) => ({
    elements: {
        h1: { id: 'h1', name: 'hazOne', kind: 'Hazard' }, f1: { id: 'f1', name: 'fnOne', kind: 'SystemFunction' }, t1: { id: 't1', name: 'tcOne', kind: 'TestCase' },
    },
    relationships: [], errors: [], viewpoints,
    registries: { relationships: [], kinds: [
        { name: 'MemoPart' }, { name: 'Hazard', superType: 'MemoPart' }, { name: 'Function', superType: 'MemoPart' },
        { name: 'SystemFunction', superType: 'Function' }, { name: 'TestCase', superType: 'MemoPart' },
    ] },
}) as unknown as MemoModelDTO;

const diff: ModelDiffSummary = {
    added: [{ id: 'h1', name: 'hazOne', kind: 'Hazard' }, { id: 't1', name: 'tcOne', kind: 'TestCase' }],
    removed: [],
    changed: [{ id: 'f1', name: 'fnOne', kind: 'SystemFunction', changes: ['attributes changed'] }],
    addedRels: [{ id: 'r', type: 'verifiedBy', source: 'tcOne', target: 'fnOne' }],
    removedRels: [],
    summary: { added: 2, removed: 0, changed: 1, addedRels: 1, removedRels: 0 },
};

describe('a release diff for a role', () => {
    const viewpoints = [vp('risk', ['safetyEngineer'], ['Hazard']), vp('arch', ['swEngineer'], ['Function'])];

    it('shows everything when no role is chosen', () => {
        expect(diffForRole(diff, model(viewpoints), null)).toEqual({ diff, hidden: 0 });
    });

    it('shows a role the changes to the kinds its viewpoints admit, and a specialization counts', () => {
        const safety = diffForRole(diff, model(viewpoints), 'safetyEngineer');
        expect(safety.diff.added.map(e => e.name)).toEqual(['hazOne']);
        expect(safety.diff.changed).toEqual([]);
        const software = diffForRole(diff, model(viewpoints), 'swEngineer');
        expect(software.diff.changed.map(e => e.name)).toEqual(['fnOne']);
        expect(software.diff.added).toEqual([]);
    });

    it('shows a link when the element at either end is admitted, and says how many changes it hid', () => {
        const software = diffForRole(diff, model(viewpoints), 'swEngineer');
        expect(software.diff.addedRels).toHaveLength(1);
        expect(software.hidden).toBe(2);
        const safety = diffForRole(diff, model(viewpoints), 'safetyEngineer');
        expect(safety.diff.addedRels).toHaveLength(0);
        expect(safety.hidden).toBe(3);
    });

    it('admits all kinds to a role with a viewpoint that names none', () => {
        const open = [...viewpoints, vp('everything', ['qa'], [])];
        expect(diffForRole(diff, model(open), 'qa')).toEqual({ diff, hidden: 0 });
    });
});

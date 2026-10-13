import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';
import { explorerTaxonomy } from '../components/ExplorerPanel';
import { idsInWorkspace, scopeModel, validationForWorkspace, workspaceOptions } from '../lib/workspace-scope';

const el = (id: string): MemoElement => ({
    id, name: id, kind: 'LogicalComponent', construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {},
});
const rel = (id: string, sourceId: string, targetId: string): MemoRelationship => ({
    id, type: 'allocatedTo', sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml',
});

const membership: WorkspaceMembershipDTO = {
    workspaces: [
        { root: 'Pump', scope: 'system', name: 'Pump' },
        { root: 'Lab', scope: 'sos', name: 'Lab' },
        { root: 'Gen', scope: 'system', name: 'Generator' },
    ],
    membership: {
        Pump: ['Pump'], pumpPart: ['Pump'], cable: ['Pump', 'Gen'],
        Gen: ['Gen'], genPart: ['Gen'], Lab: ['Lab'], labUc: ['Lab'],
    },
    shared: ['cable'],
    unassigned: ['stray'],
    definitionOf: {},
    missingSystem: false,
};
const model = {
    elements: Object.fromEntries(['Pump', 'pumpPart', 'cable', 'Gen', 'genPart', 'Lab', 'labUc', 'stray'].map(id => [id, el(id)])),
    relationships: [rel('r1', 'pumpPart', 'cable'), rel('r2', 'genPart', 'cable'), rel('r3', 'pumpPart', 'genPart')],
    errors: [], workspaceMembership: membership,
} as MemoModelDTO;

describe('which part of the model a workspace shows', () => {
    it('lists the system of systems before the systems, each by name', () => {
        expect(workspaceOptions(membership).map(o => o.name)).toEqual(['Lab', 'Generator', 'Pump']);
        expect(workspaceOptions(undefined)).toEqual([]);
    });

    it('shows a system what it holds, shared elements included, and drops the links that leave it', () => {
        const scoped = scopeModel(model, 'Pump');
        expect(Object.keys(scoped.elements).sort()).toEqual(['Pump', 'cable', 'pumpPart']);
        expect(scoped.relationships.map(r => r.id)).toEqual(['r1']);
    });

    it('shows the system of systems its own elements and the Unassigned group', () => {
        expect([...idsInWorkspace(membership, 'Lab')!].sort()).toEqual(['Lab', 'labUc', 'stray']);
        expect(Object.keys(scopeModel(model, 'Gen').elements)).not.toContain('stray');
    });

    it('shows the whole model when none is chosen, or the choice is no longer in it', () => {
        expect(scopeModel(model, null)).toBe(model);
        expect(scopeModel(model, 'Removed')).toBe(model);
        expect(scopeModel({ ...model, workspaceMembership: undefined }, 'Pump').elements).toBe(model.elements);
    });

    it('returns the same scoped model for the same choice', () => {
        expect(scopeModel(model, 'Pump')).toBe(scopeModel(model, 'Pump'));
    });
});

describe('validationForWorkspace', () => {
    const whole = { violations: [{ ruleId: 'A' }, { ruleId: 'B' }], byWorkspace: { Gen: { violations: [{ ruleId: 'B' }] } } } as any;

    it("returns the workspace's own result, computed by memo-tools, not a filter of the whole one", () => {
        expect(validationForWorkspace(whole, 'Gen')).toBe(whole.byWorkspace.Gen);
    });

    it('returns the whole result for no workspace, or one the server sent no result for', () => {
        expect(validationForWorkspace(whole, null)).toBe(whole);
        expect(validationForWorkspace(whole, 'Pump')).toBe(whole);
        expect(validationForWorkspace(null, 'Gen')).toBeNull();
    });
});

describe('explorerTaxonomy', () => {
    const pkg = (name: string, layers: { id: string; kinds: { name: string; group?: string }[] }[]) =>
        ({ name, layers, explorerPlacements: [], layerPalette: [] }) as never;

    it('keeps a classified placement when a later package lists the same kind unclassified', () => {
        const taxonomy = explorerTaxonomy([
            pkg('ontology', [{ id: 'methodology', kinds: [{ name: 'ModelMethodBinding', group: 'methodology' }] }]),
            pkg('methodology-default', [{ id: 'core', kinds: [{ name: 'ModelMethodBinding' }] }]),
        ]);
        expect(taxonomy.byKind.get('ModelMethodBinding')).toEqual({ domain: 'methodology', group: 'methodology' });
    });

    it('lets a classified placement replace an unclassified one listed first', () => {
        const taxonomy = explorerTaxonomy([
            pkg('methodology-default', [{ id: 'core', kinds: [{ name: 'ModelMethodBinding' }] }]),
            pkg('ontology', [{ id: 'methodology', kinds: [{ name: 'ModelMethodBinding', group: 'methodology' }] }]),
        ]);
        expect(taxonomy.byKind.get('ModelMethodBinding')).toEqual({ domain: 'methodology', group: 'methodology' });
    });
});

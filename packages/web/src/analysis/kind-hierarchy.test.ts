import { describe, expect, it } from 'vitest';
import { flattenKindTree, kindParents, kindTree, kindsUnder } from './kind-hierarchy';
import type { OntologyPackageInfo } from '../types/ontology';

const parents = new Map([
    ['Requirement', 'MemoRequirementElement'],
    ['SecurityRequirement', 'Requirement'],
    ['SafetyRequirement', 'Requirement'],
    ['Need', 'MemoRequirementElement'],
    ['Hazard', 'MemoRiskElement'],
]);

describe('kindTree', () => {
    it('nests a specialization under the kind it derives from', () => {
        const roots = kindTree([
            { kind: 'Requirement', elementCount: 100 },
            { kind: 'SecurityRequirement', elementCount: 1 },
        ], parents);
        expect(roots.map(node => node.kind)).toEqual(['Requirement']);
        expect(roots[0].children.map(node => node.kind)).toEqual(['SecurityRequirement']);
    });

    it('carries the family total on the parent, not just its own count', () => {
        const [requirement] = kindTree([
            { kind: 'Requirement', elementCount: 100 },
            { kind: 'SecurityRequirement', elementCount: 1 },
            { kind: 'SafetyRequirement', elementCount: 3 },
        ], parents);
        expect(requirement.elementCount).toBe(100);
        expect(requirement.totalCount).toBe(104);
    });

    it('adds a shared supertype that is not itself populated', () => {
        const roots = kindTree([
            { kind: 'Requirement', elementCount: 100 },
            { kind: 'Need', elementCount: 4 },
        ], parents);
        expect(roots.map(node => node.kind)).toEqual(['MemoRequirementElement']);
        expect(roots[0].elementCount).toBe(0);
        expect(roots[0].totalCount).toBe(104);
        expect(roots[0].children.map(node => node.kind)).toEqual(['Requirement', 'Need']);
    });

    it('does not bury a lone kind under an abstract ancestor with no siblings', () => {
        const roots = kindTree([{ kind: 'Hazard', elementCount: 12 }], parents);
        expect(roots.map(node => node.kind)).toEqual(['Hazard']);
    });

    it('treats a kind whose parent is absent from the axis as a root', () => {
        const roots = kindTree([
            { kind: 'SecurityRequirement', elementCount: 1 },
            { kind: 'Hazard', elementCount: 2 },
        ], parents);
        expect(roots.map(node => node.kind).sort()).toEqual(['Hazard', 'SecurityRequirement']);
    });

    it('orders by family size, then by name', () => {
        const roots = kindTree([
            { kind: 'Hazard', elementCount: 2 },
            { kind: 'Requirement', elementCount: 100 },
        ], parents);
        expect(roots.map(node => node.kind)).toEqual(['Requirement', 'Hazard']);
    });
});

describe('kindsUnder', () => {
    it('returns the kind plus every descendant', () => {
        const universe = ['Requirement', 'SecurityRequirement', 'SafetyRequirement', 'Hazard'];
        expect(kindsUnder('Requirement', parents, universe).sort())
            .toEqual(['Requirement', 'SafetyRequirement', 'SecurityRequirement']);
    });

    it('returns just the kind when nothing specializes it', () => {
        expect(kindsUnder('Hazard', parents, ['Hazard', 'Requirement'])).toEqual(['Hazard']);
    });
});

describe('kindParents', () => {
    it('indexes derivesFrom across every layer of every package', () => {
        const packages = [{
            name: '@memoarchitect/ontology', version: '0', type: 'ontology', description: '',
            kindCount: 2, relationshipCount: 0, relationshipTypes: [], selected: true,
            layers: [{
                id: 'requirements', label: 'Requirements', color: '#000', kindCount: 2, kinds: [
                    { name: 'Requirement', label: 'Requirement', construct: 'requirement def', layer: 'requirements', instanceCount: 100, viewpoints: [], derivesFrom: 'MemoRequirementElement' },
                    { name: 'MemoRequirementElement', label: 'Requirement element', construct: 'requirement def', layer: 'requirements', instanceCount: 0, viewpoints: [] },
                ],
            }],
        }] as unknown as OntologyPackageInfo[];
        expect(kindParents(packages).get('Requirement')).toBe('MemoRequirementElement');
        expect(kindParents(packages).has('MemoRequirementElement')).toBe(false);
    });
});

describe('flattenKindTree', () => {
    it('reports the depth each kind renders at', () => {
        const rows = flattenKindTree(kindTree([
            { kind: 'Requirement', elementCount: 100 },
            { kind: 'SecurityRequirement', elementCount: 1 },
        ], parents));
        expect(rows.map(row => [row.node.kind, row.depth])).toEqual([['Requirement', 0], ['SecurityRequirement', 1]]);
    });
});

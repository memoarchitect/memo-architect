import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import { buildCompositionTree } from '../composition-tree';
import { flattenBddRows, allBranchIds, branchIdsToLevel, treeDepth } from '../bdd-table';

const el = (id: string): MemoElement => ({
    id, name: id, kind: 'LogicalComponent', construct: 'part', layer: 'logical', file: 't.sysml', attributes: {},
});
const rel = (s: string, t: string): MemoRelationship => ({
    id: `${s}-${t}`, type: 'composes', sourceId: s, targetId: t, sourceEnd: '', targetEnd: '', file: 't.sysml',
});

// root -> a -> a1, a2 ; root -> b
const tree = buildCompositionTree(
    ['root', 'a', 'a1', 'a2', 'b'].map(el),
    [rel('root', 'a'), rel('a', 'a1'), rel('a', 'a2'), rel('root', 'b')],
);

describe('flattenBddRows', () => {
    it('shows only the roots when nothing is expanded', () => {
        const rows = flattenBddRows(tree, new Set());
        expect(rows.map(r => r.id)).toEqual(['root']);
        expect(rows[0].childCount).toBe(2);
    });
    it('lists children after an expanded parent, indented by depth', () => {
        const rows = flattenBddRows(tree, new Set(['root', 'a']));
        expect(rows.map(r => [r.id, r.depth])).toEqual([['root', 0], ['a', 1], ['a1', 2], ['a2', 2], ['b', 1]]);
    });
    it('hides a collapsed branch while keeping its siblings', () => {
        const rows = flattenBddRows(tree, new Set(['root']));
        expect(rows.map(r => r.id)).toEqual(['root', 'a', 'b']);
    });
});

describe('outline levels', () => {
    it('allBranchIds is every element with children', () => {
        expect([...allBranchIds(tree)].sort()).toEqual(['a', 'root']);
    });
    it('level 1 is roots only, level 2 opens the roots', () => {
        expect(branchIdsToLevel(tree, 1).size).toBe(0);
        expect([...branchIdsToLevel(tree, 2)]).toEqual(['root']);
        expect([...branchIdsToLevel(tree, 3)].sort()).toEqual(['a', 'root']);
    });
    it('treeDepth counts levels', () => {
        expect(treeDepth(tree)).toBe(3);
    });
});

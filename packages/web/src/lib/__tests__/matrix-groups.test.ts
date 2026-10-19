import { describe, expect, it } from 'vitest';
import { dependencyClusters, resolveGroups } from '../matrix-groups';

const edges = [{ sourceId: 'a', targetId: 'b' }, { sourceId: 'b', targetId: 'c' }, { sourceId: 'd', targetId: 'e' }];

describe('matrix groups', () => {
    it('finds the clusters dependencies form and leaves a lone element out', () => {
        expect(dependencyClusters(['a', 'b', 'c', 'd', 'e', 'f'], edges)).toEqual([['a', 'b', 'c'], ['d', 'e']]);
    });
    it('resolves a package group to the axis elements in it or beneath it', () => {
        const pkg = (id: string) => ({ a: 'p', b: 'p::q', c: 'z' } as Record<string, string>)[id];
        const [group] = resolveGroups([{ name: 'P', groupedBy: 'owningPackage', expression: 'p' }], ['a', 'b', 'c'], pkg, [], new Map());
        expect([...group.memberIds]).toEqual(['a', 'b']);
    });
    it('keeps only axis elements a query matched, and numbers cluster groups', () => {
        const groups = resolveGroups(
            [{ name: 'Q', groupedBy: 'memoQuery', expression: 'kind: X' }, { name: 'C', groupedBy: 'clusterResult' }],
            ['a', 'b', 'd', 'e'], () => undefined, edges, new Map([['kind: X', ['a', 'zzz']]]));
        expect(groups.map(g => g.name)).toEqual(['Q', 'C 1', 'C 2']);
        expect([...groups[0].memberIds]).toEqual(['a']);
    });
});

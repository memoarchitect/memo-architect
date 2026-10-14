import { describe, expect, it } from 'vitest';
import { buildPackageTree, countIn, NO_PACKAGE } from '../lib/package-tree';

const item = (name: string, pkg?: string) => ({ name, pkg });
const tree = (items: ReturnType<typeof item>[]) => buildPackageTree(items, i => i.pkg, i => i.name);

describe('the package tree', () => {
    it('nests by the package the item is declared in, not by a leaf name two packages share', () => {
        const nodes = tree([
            item('a', 'req::software::folder_x'), item('b', 'req::hardware::folder_x'), item('c', 'req::software'),
        ]);
        expect(nodes.map(n => n.id)).toEqual(['req']);
        const req = nodes[0].children;
        expect(req.map(n => n.id)).toEqual(['req::hardware', 'req::software']);
        // both packages have a folder_x, and they stay apart
        expect(req[0].children.map(n => [n.id, n.items.map(i => i.name)])).toEqual([['req::hardware::folder_x', ['b']]]);
        expect(req[1].items.map(i => i.name)).toEqual(['c']);
        expect(req[1].children.map(n => n.id)).toEqual(['req::software::folder_x']);
    });

    it('keeps an item that has no package, and counts a folder with what is below it', () => {
        const nodes = tree([item('lonely'), item('a', 'p'), item('b', 'p::q')]);
        expect(nodes.map(n => n.id)).toEqual([NO_PACKAGE, 'p']);
        expect(countIn(nodes[1])).toBe(2);
        expect(countIn(nodes[0])).toBe(1);
    });

    it('lists items by label', () => {
        expect(tree([item('b', 'p'), item('a', 'p')])[0].items.map(i => i.name)).toEqual(['a', 'b']);
    });
});

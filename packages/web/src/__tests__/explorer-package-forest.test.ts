import { describe, expect, it } from 'vitest';
import { buildPackageForest, type ForestNode } from '../lib/explorer-package-forest';

interface N extends ForestNode { pkg?: string; kind?: string }
const el = (name: string, pkg?: string, kind = 'Requirement'): N => ({ id: name, name, type: 'element', children: [], pkg, kind });
const build = (roots: N[], order: string[] = ['Need', 'Requirement', 'NotificationSpec']) => buildPackageForest(roots, {
    packageOf: n => n.pkg, kindOf: n => n.kind ?? '',
    kindRank: k => { const i = order.indexOf(k); return i < 0 ? 999 : i; },
    kindLabel: (k, c) => `${k} ${c}`,
    folder: (id, name, children) => ({ id, name, type: 'folder', children }),
});
const shape = (nodes: ForestNode[]): unknown[] => nodes.map(n => n.type === 'element' ? n.name : { [n.id]: shape(n.children) });

describe('a layer as the packages that hold it', () => {
    it('nests by qualified name and keeps a package that only has a package inside it', () => {
        expect(shape(build([el('a', 'req::software::folder_x'), el('b', 'req::hardware')]))).toEqual([
            { 'f:req': [{ 'f:req::hardware': ['b'] }, { 'f:req::software': [{ 'f:req::software::folder_x': ['a'] }] }] },
        ]);
    });

    it('keeps two packages that each have a folder of the same name apart', () => {
        const forest = build([el('a', 'sw::folder_x'), el('b', 'hw::folder_x')]);
        expect(forest.map(n => n.id)).toEqual(['f:hw', 'f:sw']);
        expect(forest[0].children[0].id).toBe('f:hw::folder_x');
        expect(forest[1].children[0].id).toBe('f:sw::folder_x');
    });

    it('makes no package where the layer has no element, and lists an element with no package at the top', () => {
        expect(shape(build([el('lonely'), el('a', 'p')]))).toEqual(['lonely', { 'f:p': ['a'] }]);
        expect(build([])).toEqual([]);
    });

    it('splits a package that holds several kinds into kind folders in declaration order, and leaves one kind alone', () => {
        const mixed = build([el('r1', 'p', 'Requirement'), el('n1', 'p', 'Need'), el('s1', 'p', 'NotificationSpec'), el('r2', 'p', 'Requirement')]);
        expect(shape(mixed)).toEqual([{ 'f:p': [{ 'kf:p:Need': ['n1'] }, { 'kf:p:Requirement': ['r1', 'r2'] }, { 'kf:p:NotificationSpec': ['s1'] }] }]);
        expect(mixed[0].children[0].name).toBe('Need 1');
        expect(shape(build([el('r1', 'q'), el('r2', 'q')]))).toEqual([{ 'f:q': ['r1', 'r2'] }]);
    });
});

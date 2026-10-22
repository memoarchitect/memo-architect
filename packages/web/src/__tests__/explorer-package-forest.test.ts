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
        expect(shape(mixed)).toEqual([{ 'f:p': [{ 'kf:p|Need': ['n1'] }, { 'kf:p|Requirement': ['r1', 'r2'] }, { 'kf:p|NotificationSpec': ['s1'] }] }]);
        expect(mixed[0].children[0].name).toBe('Need 1');
        expect(shape(build([el('r1', 'q'), el('r2', 'q')]))).toEqual([{ 'f:q': ['r1', 'r2'] }]);
    });

    it('splits a folder by the attribute a person chose, when its elements differ in it', () => {
        const withValue = (name: string, value?: string): N => ({ ...el(name, 'p'), value } as N);
        const forest = buildPackageForest([withValue('a', 'system'), withValue('b', 'software'), withValue('c', 'system'), withValue('d')], {
            packageOf: n => n.pkg, kindOf: () => 'Requirement', kindRank: () => 0, kindLabel: (k, c) => `${k} ${c}`,
            folder: (id, name, children) => ({ id, name, type: 'folder', children }),
            attributeOf: n => (n as N & { value?: string }).value,
        });
        expect(shape(forest)).toEqual([{ 'f:p': [{ 'af:p|software': ['b'] }, { 'af:p|system': ['a', 'c'] }, 'd'] }]);
        // one value everywhere is not a split
        expect(shape(buildPackageForest([withValue('a', 'x'), withValue('b', 'x')], {
            packageOf: n => n.pkg, kindOf: () => 'R', kindRank: () => 0, kindLabel: () => '',
            folder: (id, name, children) => ({ id, name, type: 'folder', children }),
            attributeOf: n => (n as N & { value?: string }).value,
        }))).toEqual([{ 'f:p': ['a', 'b'] }]);
    });
});

describe('with package folders off', () => {
    const flat = (roots: N[], attributeOf?: (n: N) => string | undefined) => buildPackageForest(roots, {
        attributeOf,
        packageFolders: false, packageOf: n => n.pkg, kindOf: n => n.kind ?? '', kindRank: () => 0, kindLabel: (k, c) => `${k} ${c}`,
        folder: (id, name, children) => ({ id, name, type: 'folder', children }),
    });
    it('skips the package level and lists the elements by kind', () => {
        expect(shape(flat([el('a', 'x::y', 'Need'), el('b', 'z', 'Requirement'), el('c', 'x', 'Need')]))).toEqual([
            { 'kf:|Need': ['a', 'c'] }, { 'kf:|Requirement': ['b'] },
        ]);
    });
    it('lists a single kind without a folder', () => {
        expect(shape(flat([el('a', 'x'), el('b', 'y')]))).toEqual(['a', 'b']);
    });
    it('still splits by the attribute a person chose, across every package', () => {
        const type = (n: N) => ({ a: 'software', b: 'hardware', c: 'software' } as Record<string, string>)[n.name];
        expect(shape(flat([el('a', 'p1'), el('b', 'p2'), el('c', 'p3')], type))).toEqual([
            { 'af:|hardware': ['b'] }, { 'af:|software': ['a', 'c'] },
        ]);
    });
});

describe('the folders an import came from', () => {
    const imported = (name: string, folder?: string): N => ({ ...el(name, 'ims_requirements_software'), folder } as N);
    const forest = (roots: N[], packageFolders?: boolean) => buildPackageForest(roots, {
        packageFolders, packageOf: n => n.pkg, kindOf: () => 'Requirement', kindRank: () => 0, kindLabel: (k, c) => `${k} ${c}`,
        folder: (id, name, children) => ({ id, name, type: 'folder', children }),
        folderPathOf: n => (n as N & { folder?: string }).folder?.split('|').map(part => part.trim()),
    });

    it('nests an item inside the package by the folder path it states, and leaves the ones that state none', () => {
        expect(shape(forest([
            imported('a', 'MS SW | CIU | Notifications'), imported('b', 'MS SW | CIU | Notifications'), imported('c', 'MS SW | Capture'), imported('d'),
        ]))).toEqual([{ 'f:ims_requirements_software': ['d', {
            'sf:ims_requirements_software|MS SW': [
                { 'sf:ims_requirements_software|MS SW|Capture': ['c'] },
                { 'sf:ims_requirements_software|MS SW|CIU': [{ 'sf:ims_requirements_software|MS SW|CIU|Notifications': ['a', 'b'] }] },
            ],
        }] }]);
    });

    it('is the package folders\' business: without them the roots are listed flat', () => {
        expect(shape(forest([imported('a', 'X | Y'), imported('b')], false))).toEqual(['a', 'b']);
    });
});

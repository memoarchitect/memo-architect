// A decomposition view opens showing its decomposition. Fully collapsed, a
// 305-element view opened as one box reading "3 parts (collapsed)".

import { describe, it, expect } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { defaultExpandedNodes } from '../general-view';

const el = (id: string) => ({ id, name: id } as MemoElement);

/** Balanced tree: `branch` children per node, `depth` levels. */
function tree(branch: number, depth: number) {
    const elements = new Map<string, MemoElement>();
    const childrenMap = new Map<string, string[]>();
    let next = 0;
    const make = (level: number): string => {
        const id = `n${next++}`;
        elements.set(id, el(id));
        if (level < depth) {
            const kids: string[] = [];
            for (let i = 0; i < branch; i++) kids.push(make(level + 1));
            childrenMap.set(id, kids);
        }
        return id;
    };
    const root = make(0);
    return { roots: [root], childrenMap, elements };
}

const revealed = (t: ReturnType<typeof tree>, expanded: Set<string>) => {
    let count = t.roots.length;
    for (const id of expanded) count += (t.childrenMap.get(id) ?? []).length;
    return count;
};

describe('defaultExpandedNodes', () => {
    it('opens a small tree all the way down', () => {
        const t = tree(2, 3); // 15 nodes
        expect(defaultExpandedNodes(t).size).toBe(7); // every node that has children
    });

    it('opens a broad tree shallowly rather than not at all', () => {
        const t = tree(10, 3); // 1111 nodes
        const expanded = defaultExpandedNodes(t);
        expect(expanded.size).toBeGreaterThan(0);        // never a single collapsed box
        expect(revealed(t, expanded)).toBeLessThanOrEqual(80);
    });

    it('takes whole levels, never half of one', () => {
        const t = tree(10, 3);
        const expanded = defaultExpandedNodes(t);
        // Every expanded node's siblings are expanded too, so no row shows some
        // children open and others closed — structure that is not there.
        for (const [parent, kids] of t.childrenMap) {
            if (!expanded.has(parent)) continue;
            const withKids = kids.filter(k => (t.childrenMap.get(k) ?? []).length > 0);
            const open = withKids.filter(k => expanded.has(k)).length;
            expect(open === 0 || open === withKids.length).toBe(true);
        }
    });

    it('expands nothing when the root has no children', () => {
        const t = tree(0, 0);
        expect(defaultExpandedNodes(t).size).toBe(0);
    });
});

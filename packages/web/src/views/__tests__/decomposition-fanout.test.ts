// ─── Decomposition tree fan-out ──────────────────────────────────────────────
//
// A level laid out side by side costs the sum of its children's widths. That is
// fine for a handful and ruinous for many: the diagram grows until fitting it
// leaves every box unreadable. Past a threshold the children stack in a column
// instead, so width follows DEPTH — bounded by the model — rather than BREADTH,
// which is not.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { computeDecompositionLayout } from '../layout';

const el = (id: string): MemoElement => ({
    id, name: id, kind: 'PartUsage', construct: 'part',
    layer: 'architecture', file: 'f.sysml', attributes: {},
} as MemoElement);

/** A root with `childCount` leaves, handed in directly so the test does not
 *  depend on how a tree is derived from a model. */
function tree(childCount: number) {
    const elements = new Map<string, MemoElement>([['root', el('root')]]);
    const children: string[] = [];
    for (let i = 0; i < childCount; i++) {
        const id = `child${i}`;
        elements.set(id, el(id));
        children.push(id);
    }
    return { roots: ['root'], childrenMap: new Map([['root', children]]), elements };
}

const emptyModel = { elements: {}, relationships: [] } as unknown as MemoModelDTO;

const spanOf = (nodes: { position: { x: number }; style?: { width?: unknown } }[]) => {
    const xs = nodes.map(node => node.position.x);
    const rights = nodes.map(node => node.position.x + Number(node.style?.width ?? 0));
    return Math.max(...rights) - Math.min(...xs);
};

const layoutWidth = async (childCount: number, forced?: 'vertical' | 'horizontal') => {
    const result = await computeDecompositionLayout(emptyModel, {
        expandedNodes: new Set(['root']),
        nodeDirections: forced ? new Map([['root', forced]]) : new Map(),
        callbacks: { onToggleExpand: () => {}, onToggleDirection: () => {} },
        tree: tree(childCount) as never,
    });
    return spanOf(result.nodes as never);
};

/** A balanced tree: `branch` children per node, `depth` levels deep. */
function balanced(branch: number, depth: number) {
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

const balancedWidth = async (branch: number, depth: number) => {
    const built = balanced(branch, depth);
    const result = await computeDecompositionLayout(emptyModel, {
        expandedNodes: new Set(built.elements.keys()),
        nodeDirections: new Map(),
        callbacks: { onToggleExpand: () => {}, onToggleDirection: () => {} },
        tree: built as never,
    });
    return spanOf(result.nodes as never);
};

describe('decomposition tree fan-out', () => {
    it('keeps a narrow level side by side', async () => {
        const four = await layoutWidth(4);
        const one = await layoutWidth(1);
        // Four children spread sideways, so the level is clearly wider than one.
        expect(four).toBeGreaterThan(one);
    });

    it('stops width growing with breadth once a level is wide', async () => {
        const eight = await layoutWidth(8);
        const forty = await layoutWidth(40);
        // Stacked, not spread: five times the children must not be anywhere near
        // five times the width. Side by side, 40 children were ~10x an 8-wide
        // level and pushed the diagram tens of thousands of pixels across.
        expect(forty).toBeLessThan(eight * 2);
    });


    // The case a per-node fan-out threshold misses entirely. Every node here
    // has only three children — nothing looks wide locally — but laying each
    // level side by side still puts every leaf on one row. Width is cumulative;
    // fan-out is local, which is why the budget is measured on subtree WIDTH.
    it('bounds a deep tree whose nodes are individually narrow', async () => {
        const shallow = await balancedWidth(3, 2);   // 13 nodes
        const deep = await balancedWidth(3, 5);      // 364 nodes
        expect(shallow).toBeLessThan(2000);
        // 28x the nodes must not be 28x the width.
        expect(deep).toBeLessThan(shallow * 4);
    });

    it('still honours a direction the user set by hand', async () => {
        // Forced back to side by side, the level is wide again — the threshold
        // is a starting point, not a constraint.
        expect(await layoutWidth(40, 'vertical')).toBeGreaterThan(await layoutWidth(40) * 4);
    });
});

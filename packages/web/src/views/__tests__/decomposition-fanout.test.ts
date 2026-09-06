// ─── Decomposition tree fan-out ──────────────────────────────────────────────
//
// Direction belongs to the user: every node fans its children out downward,
// on ONE rank, unless the V/H control on it says otherwise. An automatic flip
// past a width budget made a diagram look arbitrary; wrapping a rank onto a
// second row routed edges behind sibling nodes. Root ROWS still wrap — they
// have no parent to draw an edge from, so nothing passes behind anything.
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

const spanYOf = (nodes: { position: { y: number } }[]) => {
    const ys = nodes.map(node => node.position.y);
    return Math.max(...ys) - Math.min(...ys);
};

const layoutHeight = async (childCount: number) => {
    const result = await computeDecompositionLayout(emptyModel, {
        expandedNodes: new Set(['root']),
        nodeDirections: new Map(),
        callbacks: { onToggleExpand: () => {}, onToggleDirection: () => {} },
        tree: tree(childCount) as never,
    });
    return spanYOf(result.nodes as never);
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
    it('keeps a level on one rank, however broad', async () => {
        // A rank is one line. Wrapping onto a second row bounded the width but
        // sent every edge to that row down past the first, behind sibling
        // boxes — and an arrow emerging from behind a node reads as though that
        // node were the parent.
        const eight = await layoutWidth(8);
        const forty = await layoutWidth(40);
        expect(forty).toBeGreaterThan(eight * 2);
    });

    it('puts every child of a level at the same depth', async () => {
        const result = await computeDecompositionLayout(emptyModel, {
            expandedNodes: new Set(['root']),
            nodeDirections: new Map(),
            callbacks: { onToggleExpand: () => {}, onToggleDirection: () => {} },
            tree: tree(12) as never,
        });
        const children = (result.nodes as never as { id: string; position: { y: number } }[])
            .filter(n => n.id !== 'root');
        expect(new Set(children.map(n => n.position.y)).size).toBe(1);
    });

    it('takes the direction the user set, at that node only', async () => {
        // A column to the right is narrower than a wrapped block of rows.
        expect(await layoutWidth(40, 'horizontal')).toBeLessThan(await layoutWidth(40));
    });

});

describe('many roots', () => {
    // A model whose hierarchy is partly undeclared has many parentless
    // elements. Laid in one unbounded row, 225 of them reached ~99,000px —
    // which is what actually made these diagrams unreadable, before a single
    // child was considered.
    const flatRoots = (count: number) => {
        const elements = new Map<string, MemoElement>();
        const roots: string[] = [];
        for (let i = 0; i < count; i++) { elements.set(`r${i}`, el(`r${i}`)); roots.push(`r${i}`); }
        return { roots, childrenMap: new Map<string, string[]>(), elements };
    };

    const rootsWidth = async (count: number) => {
        const result = await computeDecompositionLayout(emptyModel, {
            expandedNodes: new Set<string>(),
            nodeDirections: new Map(),
            callbacks: { onToggleExpand: () => {}, onToggleDirection: () => {} },
            tree: flatRoots(count) as never,
        });
        return spanOf(result.nodes as never);
    };

    it('wraps a long row of roots instead of running off to the right', async () => {
        expect(await rootsWidth(225)).toBeLessThan(6000);
    });

    it('leaves a handful of roots on one row', async () => {
        expect(await rootsWidth(4)).toBeLessThan(2500);
    });
});

// @vitest-environment jsdom
//
// What it costs to draw the Model Explorer's package tree for a model with hundreds of packages. The tree
// renders a folder's children only while it is open and is not virtualized, so the first paint is the root
// folders and a person pays for what they open; "expand results" opens everything. Timings are printed for
// the record; the assertions are the structural facts the cost follows from.

import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { buildTree, RecursiveTree, type TreeNode } from '../ExplorerPanel';
import type { MemoElement } from '@memoarchitect/tools/browser';

function model(packages: number, perPackage: number): MemoElement[] {
    const elements: MemoElement[] = [];
    for (let p = 0; p < packages; p++) {
        // Four top-level packages with the rest nested two deep, as a model's namespaces are.
        const pkg = `Top${p % 4}::Mid${p % 40}::Pkg${p}`;
        for (let e = 0; e < perPackage; e++) {
            elements.push({
                id: `p${p}e${e}`, name: `p${p}e${e}`, kind: 'Requirement', construct: 'part', layer: 'assurance',
                file: 'model/x.sysml', attributes: {}, package: pkg,
            } as MemoElement);
        }
    }
    return elements;
}

function folderIds(nodes: TreeNode[]): string[] {
    return nodes.flatMap(node => node.children.length > 0 ? [node.id, ...folderIds(node.children)] : []);
}

function render(nodes: TreeNode[], expanded: Set<string>): { ms: number; rows: number } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const start = performance.now();
    act(() => {
        root.render(
            <RecursiveTree
                nodes={nodes} level={0} expanded={expanded} toggleExpand={() => undefined}
                selectedElementId={null} selectElement={() => undefined} selectedElementIds={new Set()}
                toggleElementSelection={() => undefined} violationCounts={new Map()} baseColor="#888"
                onContextMenu={() => undefined} onDragStart={() => undefined} onDrop={() => undefined}
            />,
        );
    });
    const ms = performance.now() - start;
    const rows = container.querySelectorAll('[draggable="true"]').length;
    act(() => root.unmount());
    container.remove();
    return { ms, rows };
}

describe('drawing the package tree of a large model', () => {
    for (const [packages, perPackage] of [[300, 20], [1000, 10]] as const) {
        it(`${packages} packages of ${perPackage} elements: closed is the root folders, open is the whole tree`, () => {
            const tree = buildTree(model(packages, perPackage));
            const closed = render(tree, new Set());
            const open = render(tree, new Set(folderIds(tree)));
            console.log(`explorer render, ${packages} packages x ${perPackage}: closed ${closed.ms.toFixed(0)} ms (${closed.rows} rows), open ${open.ms.toFixed(0)} ms (${open.rows} rows)`);
            expect(closed.rows).toBe(tree.length);
            expect(open.rows).toBeGreaterThan(packages * perPackage);
        }, 120_000);
    }
});

// @vitest-environment jsdom
//
// ─── Diagram image export ───────────────────────────────────────────────────
//
// The bounds are the part of the export that decided whether the file was
// right, and they broke twice, both times by silently cropping:
//
//   1. `offsetLeft`/`offsetTop` — always 0, because ReactFlow places nodes with
//      a CSS transform, so the box collapsed to the largest single node.
//   2. `getNodesBounds` over the store nodes — returns positions with zero-size
//      boxes for nodes whose size was never measured, so the box ended at the
//      last node's top-left corner and the final row and column of the diagram
//      fell outside the file.
//
// Neither failed loudly: both produced a plausible file that was missing part
// of the diagram. So the box is asserted directly, against a DOM laid out the
// way ReactFlow lays one out.

import { describe, it, expect } from 'vitest';
import { exportFileName, __testing } from '../export-diagram';

function viewportWith(nodes: { x: number; y: number; w: number; h: number }[]): HTMLElement {
    const viewport = document.createElement('div');
    viewport.className = 'react-flow__viewport';
    for (const node of nodes) {
        const el = document.createElement('div');
        el.className = 'react-flow__node';
        // How ReactFlow positions a node: a transform, never an offset.
        el.style.transform = `translate(${node.x}px, ${node.y}px)`;
        Object.defineProperty(el, 'offsetWidth', { value: node.w });
        Object.defineProperty(el, 'offsetHeight', { value: node.h });
        viewport.appendChild(el);
    }
    document.body.appendChild(viewport);
    return viewport;
}

describe('contentBounds', () => {
    it('covers the far edge of the last node, not just its corner', () => {
        // The real shape of the case that shipped cropped: the furthest node
        // begins at (944, 233) and is 130×52, so the content ends at 1074×285.
        const viewport = viewportWith([
            { x: 0, y: 0, w: 956, h: 154 },
            { x: 0, y: 170, w: 956, h: 154 },
            { x: 944, y: 233, w: 130, h: 52 },
        ]);
        expect(__testing.contentBounds(viewport)).toEqual({ x: 0, y: 0, width: 1074, height: 324 });
    });

    it('includes nodes at negative coordinates', () => {
        const viewport = viewportWith([
            { x: -60, y: -20, w: 100, h: 40 },
            { x: 200, y: 100, w: 100, h: 40 },
        ]);
        expect(__testing.contentBounds(viewport)).toEqual({ x: -60, y: -20, width: 360, height: 160 });
    });

    it('falls back to the viewport box when nothing is drawn', () => {
        const viewport = viewportWith([]);
        const bounds = __testing.contentBounds(viewport);
        expect(bounds.width).toBeGreaterThan(0);
        expect(bounds.height).toBeGreaterThan(0);
    });
});

describe('exportFileName', () => {
    it('derives a filesystem-safe stem from the diagram name', () => {
        expect(exportFileName('Sample · Action Flow', 'png')).toBe('sample-action-flow.png');
        expect(exportFileName('Coffee Machine · Thermal & Fluid IBD', 'pdf'))
            .toBe('coffee-machine-thermal-fluid-ibd.pdf');
    });

    it('falls back when the name is missing or has nothing usable in it', () => {
        expect(exportFileName(undefined, 'svg')).toBe('diagram.svg');
        expect(exportFileName('···', 'png')).toBe('diagram.png');
    });
});

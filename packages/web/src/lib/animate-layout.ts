// ─── Moving smoothly from one layout to the next ──────────────────────────────
//
// When composites expand or fold, lanes regroup or a filter changes, boxes travel to their new places, lanes and frames
// resize, what is new fades in and what has gone fades out. Connectors here are routed for their final geometry, so
// they cannot follow a moving box: one attached to something that moves is hidden while it moves and fades in at the
// end. One attached to nothing that moves stays put.
//
// Adapted from utils/animate-layout.ts in EventCatalog's packages/visualiser
// (https://github.com/event-catalog/eventcatalog), under this licence:
//
// MIT License
//
// Copyright (c) 2022-2026 boyney123
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import type { Edge, Node } from '@xyflow/react';
import { easeInOut } from './edge-token';

export const LAYOUT_ANIMATION_MS = 450;
/** Each frame re-renders every box. Past this a canvas stutters, and landing at once is better. */
export const LAYOUT_ANIMATION_MAX_NODES = 300;

export const LAYOUT_ENTER_CLASS = 'memo-layout-enter';
export const LAYOUT_EXIT_CLASS = 'memo-layout-exit';
export const LAYOUT_HOLD_CLASS = 'memo-layout-hold';

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const withClass = (existing: string | undefined, added: string) => (existing ? `${existing} ${added}` : added);
const withoutClass = (existing: string | undefined, removed: string) =>
    existing?.split(' ').filter(name => name && name !== removed).join(' ') || undefined;

/** Where each box sits on the canvas, through its parents. */
export function absolutePositions(nodes: readonly Node[]): Map<string, { x: number; y: number }> {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const origin = (node: Node, seen = new Set<string>()): { x: number; y: number } => {
        const parent = node.parentId ? byId.get(node.parentId) : undefined;
        if (!parent || seen.has(parent.id)) return node.position;
        seen.add(parent.id);
        const base = origin(parent, seen);
        return { x: base.x + node.position.x, y: base.y + node.position.y };
    };
    return new Map(nodes.map(node => [node.id, origin(node)]));
}

/** Each box's place and size, comparable between layouts. */
function absoluteRects(nodes: readonly Node[]): Map<string, string> {
    const positions = absolutePositions(nodes);
    return new Map(nodes.map(node => {
        const { x, y } = positions.get(node.id)!;
        return [node.id, `${Math.round(x)},${Math.round(y)},${node.style?.width ?? ''},${node.style?.height ?? ''}`];
    }));
}

/** Whether the two layouts share boxes and differ at all: otherwise there is nothing to move between. */
export function layoutsDiffer(from: readonly Node[], to: readonly Node[]): boolean {
    if (to.length === 0 || to.length > LAYOUT_ANIMATION_MAX_NODES) return false;
    const before = absoluteRects(from);
    const after = absoluteRects(to);
    if (![...after.keys()].some(id => before.has(id))) return false;
    return before.size !== after.size || [...after].some(([id, rect]) => before.get(id) !== rect);
}

/** The connectors that have to wait: new, or attached to a box that moves or is resized. */
export function edgesToHold(fromNodes: readonly Node[], toNodes: readonly Node[], fromEdges: readonly Edge[], toEdges: readonly Edge[]): Set<string> {
    const before = absoluteRects(fromNodes);
    const after = absoluteRects(toNodes);
    const known = new Set(fromEdges.map(edge => edge.id));
    const moved = (id: string) => before.get(id) !== after.get(id);
    return new Set(toEdges.filter(edge => !known.has(edge.id) || moved(edge.source) || moved(edge.target)).map(edge => edge.id));
}

/** One frame of the move: `t` is 0 at the old layout and 1 at the new. */
export function layoutFrame(fromNodes: readonly Node[], toNodes: readonly Node[], t: number): Node[] {
    const from = new Map(fromNodes.map(node => [node.id, node]));
    const toIds = new Set(toNodes.map(node => node.id));
    const fromAbsolute = absolutePositions(fromNodes);
    const toAbsolute = absolutePositions(toNodes);
    // A position is relative to the parent. A box that changes frame starts from where it was on the canvas, stated
    // relative to the frame it is going to.
    const startOf = (node: Node, previous: Node) => {
        if (previous.parentId === node.parentId) return previous.position;
        const was = fromAbsolute.get(node.id)!;
        if (!node.parentId) return was;
        const frame = fromAbsolute.get(node.parentId) ?? toAbsolute.get(node.parentId)!;
        return { x: was.x - frame.x, y: was.y - frame.y };
    };
    // A nested box is kept inside its parent while frames resize under it, so that hold is lifted for the move.
    const moving = toNodes.map((node): Node => {
        const previous = from.get(node.id);
        if (!previous) return { ...node, extent: undefined, className: withClass(node.className, LAYOUT_ENTER_CLASS), draggable: false, selectable: false };
        const start = startOf(node, previous);
        const next: Node = {
            ...node, extent: undefined, draggable: false, selectable: false,
            position: { x: lerp(start.x, node.position.x, t), y: lerp(start.y, node.position.y, t) },
        };
        const [w0, h0, w1, h1] = [previous.style?.width, previous.style?.height, node.style?.width, node.style?.height];
        if (typeof w0 === 'number' && typeof h0 === 'number' && typeof w1 === 'number' && typeof h1 === 'number') {
            next.style = { ...node.style, width: lerp(w0, w1, t), height: lerp(h0, h1, t) };
        }
        return next;
    });
    const leaving = fromNodes
        .filter(node => !toIds.has(node.id))
        // No longer held inside its frame: the frame may be shrinking under it.
        .map(node => ({ ...node, extent: undefined, expandParent: false, className: withClass(node.className, LAYOUT_EXIT_CLASS), draggable: false, selectable: false }));
    return [...moving, ...leaving];
}

/**
 * A box with the size React Flow should take it to have. A size set in its style is the size it is about to be; for the
 * rest, what was measured. Without this every box is measured again each frame, and a frame that grew still counts as
 * its old size to anything held inside it.
 */
export function withKnownSize(node: Node, measured: Node['measured']): Node {
    const { width, height } = node.style ?? {};
    if (typeof width === 'number' && typeof height === 'number') return { ...node, measured: { width, height } };
    return measured ? { ...node, measured } : node;
}

export interface LayoutAnimation {
    fromNodes: Node[];
    fromEdges: Edge[];
    toNodes: Node[];
    toEdges: Edge[];
    setNodes: (nodes: Node[]) => void;
    setEdges: (update: Edge[] | ((edges: Edge[]) => Edge[])) => void;
    /** The boxes React Flow has now, with the sizes it measured. */
    getCurrentNodes: () => Node[];
    onDone: () => void;
}

/** Runs the move. Returns a function that cancels it where it stands; whoever cancels supplies the next layout. */
export function animateLayout({ fromNodes, fromEdges, toNodes, toEdges, setNodes, setEdges, getCurrentNodes, onDone }: LayoutAnimation): () => void {
    const place = (nodes: Node[]) => {
        const measured = new Map(getCurrentNodes().map(node => [node.id, node.measured]));
        setNodes(nodes.map(node => withKnownSize(node, measured.get(node.id))));
    };
    const hold = edgesToHold(fromNodes, toNodes, fromEdges, toEdges);
    const toIds = new Set(toEdges.map(edge => edge.id));
    place(layoutFrame(fromNodes, toNodes, 0));
    setEdges([
        ...toEdges.map(edge => (hold.has(edge.id) ? { ...edge, className: withClass(edge.className, LAYOUT_HOLD_CLASS) } : edge)),
        ...fromEdges.filter(edge => !toIds.has(edge.id)).map(edge => ({ ...edge, className: withClass(edge.className, LAYOUT_EXIT_CLASS) })),
    ]);
    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
        const t = Math.min(1, (now - startedAt) / LAYOUT_ANIMATION_MS);
        if (t < 1) {
            place(layoutFrame(fromNodes, toNodes, easeInOut(t)));
            frame = requestAnimationFrame(tick);
            return;
        }
        place(toNodes);
        // Updated in place, so what changed on the connectors since the start is kept.
        setEdges(edges => edges
            .filter(edge => toIds.has(edge.id))
            .map(edge => (hold.has(edge.id)
                ? { ...edge, className: withClass(withoutClass(edge.className, LAYOUT_HOLD_CLASS), LAYOUT_ENTER_CLASS) }
                : edge)));
        onDone();
    });
    return () => cancelAnimationFrame(frame);
}

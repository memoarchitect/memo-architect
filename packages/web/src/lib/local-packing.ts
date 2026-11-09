// ─── Expanding a box without moving everything else ──────────────────────────
//
// A fresh layout of the flow moves every box when one composite opens. This keeps the boxes where the reader left them
// and shifts only those the opened frame now covers: downstream ones along the flow, parallel ones across it.
//
// Adapted from utils/local-packing.ts in EventCatalog's packages/visualiser
// (https://github.com/event-catalog/eventcatalog), which packs along one axis only, under this licence:
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

import type { Node } from '@xyflow/react';

type Rect = { x: number; y: number; width: number; height: number };
type Position = { x: number; y: number };
export type FlowAxis = 'x' | 'y';

const GAP = 40;
const DEFAULT_SIZE = { width: 180, height: 96 };

const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const rectOf = (node: Node): Rect => ({
    x: node.position.x, y: node.position.y,
    width: number(node.style?.width) ?? node.measured?.width ?? DEFAULT_SIZE.width,
    height: number(node.style?.height) ?? node.measured?.height ?? DEFAULT_SIZE.height,
});
const intersects = (a: Rect, b: Rect) =>
    a.x < b.x + b.width + GAP && a.x + a.width + GAP > b.x && a.y < b.y + b.height + GAP && a.y + a.height + GAP > b.y;
const size = (rect: Rect, axis: FlowAxis) => (axis === 'x' ? rect.width : rect.height);

/** Moves `rect` along `axis`, from where it stands, until it collides with nothing placed. */
function pushClear(rect: Rect, axis: FlowAxis, occupied: Rect[], direction: 1 | -1): Rect {
    let placed = rect;
    for (let attempt = 0; attempt < occupied.length + 8; attempt++) {
        const collision = occupied.find(other => intersects(placed, other));
        if (!collision) break;
        const to = direction > 0 ? collision[axis] + size(collision, axis) + GAP : collision[axis] - size(placed, axis) - GAP;
        placed = { ...placed, [axis]: to };
    }
    return placed;
}

/**
 * Where the top-level boxes go when `frameId` opens, or undefined when this is not a case it can improve: the frame
 * must be at the top level and on the canvas already, and every box must be too.
 *
 * `from` is what is drawn now and `to` a fresh layout. The frame keeps its corner and takes its new size. The result
 * has `to`'s nodes, with new positions for the top level.
 */
export function packAroundExpanded(from: readonly Node[], to: readonly Node[], frameId: string, axis: FlowAxis): Node[] | undefined {
    const before = new Map(from.map(node => [node.id, node]));
    const frameBefore = before.get(frameId);
    const frameAfter = to.find(node => node.id === frameId);
    if (!frameBefore || !frameAfter || frameBefore.parentId || frameAfter.parentId) return undefined;
    const topLevel = to.filter(node => !node.parentId);
    if (topLevel.some(node => !before.has(node.id) || before.get(node.id)!.parentId)) return undefined;

    const was = rectOf(frameBefore);
    const frame: Rect = { ...rectOf(frameAfter), x: was.x, y: was.y };
    const cross: FlowAxis = axis === 'x' ? 'y' : 'x';
    const others = topLevel.filter(node => node.id !== frameId).map(node => ({ node, rect: { ...rectOf(node), x: before.get(node.id)!.position.x, y: before.get(node.id)!.position.y } }));
    const covered = others.filter(({ rect }) => intersects(rect, frame));
    const coveredIds = new Set(covered.map(({ node }) => node.id));
    const occupied: Rect[] = [frame, ...others.filter(({ node }) => !coveredIds.has(node.id)).map(({ rect }) => rect)];
    const placed = new Map<string, Position>(others.map(({ node, rect }) => [node.id, { x: rect.x, y: rect.y }]));
    placed.set(frameId, { x: frame.x, y: frame.y });

    const wasEnd = was[axis] + size(was, axis);
    const downstream = covered.filter(({ rect }) => rect[axis] >= wasEnd).sort((a, b) => a.rect[axis] - b.rect[axis]);
    const alongside = covered.filter(({ rect }) => rect[axis] < wasEnd).sort((a, b) => Math.abs(a.rect[cross] - frame[cross]) - Math.abs(b.rect[cross] - frame[cross]));
    const middle = frame[cross] + size(frame, cross) / 2;
    const settle = (rect: Rect, id: string, along: FlowAxis, direction: 1 | -1) => {
        const clear = pushClear(rect, along, occupied, direction);
        occupied.push(clear);
        placed.set(id, { x: clear.x, y: clear.y });
    };
    for (const { node, rect } of downstream) settle(rect, node.id, axis, 1);
    for (const { node, rect } of alongside) settle(rect, node.id, cross, rect[cross] + size(rect, cross) / 2 >= middle ? 1 : -1);

    return to.map(node => (placed.has(node.id) ? { ...node, position: placed.get(node.id)! } : node));
}

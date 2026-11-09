import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { edgesToHold, LAYOUT_ANIMATION_MAX_NODES, LAYOUT_ENTER_CLASS, LAYOUT_EXIT_CLASS, layoutFrame, layoutsDiffer, withKnownSize } from '../animate-layout';

const box = (id: string, x: number, y: number, extra: Partial<Node> = {}): Node => ({ id, position: { x, y }, data: {}, ...extra });
const line = (id: string, source: string, target: string): Edge => ({ id, source, target });

describe('a move between layouts', () => {
    it('moves shared boxes part of the way and resizes lanes', () => {
        const from = [box('a', 0, 0), box('lane', 0, 0, { style: { width: 100, height: 40 } })];
        const to = [box('a', 100, 50), box('lane', 0, 0, { style: { width: 300, height: 80 } })];
        const [a, lane] = layoutFrame(from, to, 0.5);
        expect(a.position).toEqual({ x: 50, y: 25 });
        expect(lane.style).toMatchObject({ width: 200, height: 60 });
    });
    it('keeps a box in place on the canvas when it moves into or out of a frame', () => {
        const frame = box('f', 100, 100);
        const into = layoutFrame([frame, box('a', 150, 130)], [frame, box('a', 10, 10, { parentId: 'f' })], 0);
        expect(into[1].position).toEqual({ x: 50, y: 30 });
        const out = layoutFrame([frame, box('a', 10, 10, { parentId: 'f' })], [frame, box('a', 300, 300)], 0);
        expect(out[1].position).toEqual({ x: 110, y: 110 });
    });
    it('fades in what is new, fades out what has gone, and freezes boxes meanwhile', () => {
        const frame = layoutFrame([box('old', 0, 0), box('a', 0, 0)], [box('a', 5, 5), box('new', 9, 9, { className: 'x' })], 0.5);
        expect(frame.find(n => n.id === 'new')?.className).toBe(`x ${LAYOUT_ENTER_CLASS}`);
        expect(frame.find(n => n.id === 'old')?.className).toBe(LAYOUT_EXIT_CLASS);
        expect(frame.every(n => n.draggable === false)).toBe(true);
    });
    it('lets a nested box travel beyond a frame that is still growing', () => {
        const child = box('c', 0, 500, { parentId: 'f', extent: 'parent' });
        expect(layoutFrame([box('f', 0, 0), child], [box('f', 0, 0), child], 0.5).find(n => n.id === 'c')?.extent).toBeUndefined();
    });
    it('takes a frame to be the size it is about to be, and anything else as measured', () => {
        const old = { width: 10, height: 10 };
        expect(withKnownSize(box('f', 0, 0, { style: { width: 300, height: 80 } }), old).measured).toEqual({ width: 300, height: 80 });
        expect(withKnownSize(box('a', 0, 0), old).measured).toEqual(old);
        expect(withKnownSize(box('a', 0, 0), undefined).measured).toBeUndefined();
    });
    it('lands exactly at the new layout', () => {
        expect(layoutFrame([box('a', 3, 3)], [box('a', 8, 9)], 1)[0].position).toEqual({ x: 8, y: 9 });
    });
    it('has nothing to do for the same layout, a different diagram, or a huge canvas', () => {
        const a = [box('a', 0, 0)];
        expect(layoutsDiffer(a, [box('a', 0, 0)])).toBe(false);
        expect(layoutsDiffer(a, [box('b', 4, 0)])).toBe(false);
        expect(layoutsDiffer(a, [box('a', 4, 0)])).toBe(true);
        expect(layoutsDiffer(a, Array.from({ length: LAYOUT_ANIMATION_MAX_NODES + 1 }, (_, i) => box('a' + (i || ''), i, 0)))).toBe(false);
    });
    it('sees a box moved by its parent', () => {
        const from = [box('p', 0, 0), box('c', 1, 1, { parentId: 'p' })];
        const to = [box('p', 50, 0), box('c', 1, 1, { parentId: 'p' })];
        const held = edgesToHold(from, to, [line('e', 'c', 'x')], [line('e', 'c', 'x')]);
        expect(held.has('e')).toBe(true);
    });
    it('leaves a connector alone when neither end moves, and holds a new one', () => {
        const nodes = [box('a', 0, 0), box('b', 9, 0)];
        const held = edgesToHold(nodes, nodes, [line('e', 'a', 'b')], [line('e', 'a', 'b'), line('new', 'a', 'b')]);
        expect([...held]).toEqual(['new']);
    });
});

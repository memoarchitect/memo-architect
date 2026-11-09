import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { packAroundExpanded } from '../local-packing';

const box = (id: string, x: number, y: number, width = 100, height = 50, extra: Partial<Node> = {}): Node => ({ id, position: { x, y }, data: {}, style: { width, height }, ...extra });
const at = (nodes: Node[] | undefined, id: string) => nodes?.find(n => n.id === id)?.position;

describe('expanding a box in place', () => {
    const from = [box('a', 0, 0), box('f', 200, 0), box('b', 400, 0), box('c', 600, 0), box('far', 200, 500)];
    // A fresh layout, which has moved everything.
    const to = [box('a', 10, 90), box('f', 170, 90, 400, 200), box('b', 700, 90), box('c', 900, 90), box('far', 170, 700)];
    it('leaves alone everything the frame does not cover', () => {
        const packed = packAroundExpanded(from, to, 'f', 'x');
        expect(at(packed, 'a')).toEqual({ x: 0, y: 0 });
        expect(at(packed, 'far')).toEqual({ x: 200, y: 500 });
    });
    it('keeps the frame at its corner and takes its new size', () => {
        const packed = packAroundExpanded(from, to, 'f', 'x');
        expect(at(packed, 'f')).toEqual({ x: 200, y: 0 });
        expect(packed?.find(n => n.id === 'f')?.style).toMatchObject({ width: 400, height: 200 });
    });
    it('shifts downstream boxes along the flow, each clear of the last', () => {
        const packed = packAroundExpanded(from, to, 'f', 'x');
        expect(at(packed, 'b')).toEqual({ x: 640, y: 0 });
        expect(at(packed, 'c')).toEqual({ x: 780, y: 0 });
    });
    it('moves a parallel branch across the flow, not along it', () => {
        const parallel = [box('f', 0, 0), box('p', 0, 100)];
        const packed = packAroundExpanded(parallel, [box('f', 0, 0, 200, 200), box('p', 0, 300)], 'f', 'x');
        expect(at(packed, 'p')).toEqual({ x: 0, y: 240 });
    });
    it('follows the direction of the flow', () => {
        const down = [box('f', 0, 0), box('b', 0, 150)];
        const packed = packAroundExpanded(down, [box('f', 0, 0, 200, 300), box('b', 0, 400)], 'f', 'y');
        expect(at(packed, 'b')).toEqual({ x: 0, y: 340 });
    });
    it('does not touch what is inside the frame', () => {
        const child = box('inner', 20, 30, 50, 20, { parentId: 'f' });
        expect(at(packAroundExpanded(from, [...to, child], 'f', 'x'), 'inner')).toEqual({ x: 20, y: 30 });
    });
    it('declines a nested frame, or a box new to the canvas', () => {
        expect(packAroundExpanded([box('p', 0, 0), box('f', 1, 1, 100, 50, { parentId: 'p' })], [box('p', 0, 0), box('f', 1, 1, 200, 100, { parentId: 'p' })], 'f', 'x')).toBeUndefined();
        expect(packAroundExpanded([box('f', 0, 0)], [box('f', 0, 0), box('new', 5, 5)], 'f', 'x')).toBeUndefined();
    });
});

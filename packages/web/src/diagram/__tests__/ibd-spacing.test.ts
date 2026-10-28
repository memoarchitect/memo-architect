import { describe, expect, it } from 'vitest';
import { MIN_PART_GAP, MIN_PORT_GAP, spaceParts, spacePorts, type SpacingPart } from '../ibd-spacing';

const box = (id: string, x: number, y: number, width = 100, height = 50, parentId?: string): SpacingPart =>
    ({ id, x, y, width, height, parentId });
const at = (parts: SpacingPart[], id: string) => { const p = parts.find(part => part.id === id)!; return [p.x, p.y, p.width, p.height]; };
const overlap = (a: SpacingPart, b: SpacingPart) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('spaceParts', () => {
    const row = [box('a', 0, 0), box('b', 130, 0), box('c', 260, 0)];
    it('adds the same space to every gap and keeps order', () => {
        const spread = spaceParts(row, new Set([undefined]), 20);
        expect(spread.map(p => p.x)).toEqual([0, 150, 300]);
        expect(spread.map(p => p.y)).toEqual([0, 0, 0]);
    });
    it('removes space without closing a gap below the minimum', () => {
        const tight = spaceParts(row, new Set([undefined]), -100);
        expect(tight.map(p => p.x)).toEqual([0, 100 + MIN_PART_GAP, 2 * (100 + MIN_PART_GAP)]);
    });
    it('grows a container to fit spread contents and pushes the siblings beyond it', () => {
        const parts = [box('outer', 0, 0, 260, 100), box('x', 10, 30, 100, 50, 'outer'), box('y', 130, 30, 100, 50, 'outer'),
            box('right', 300, 0), box('below', 0, 150)];
        const spread = spaceParts(parts, new Set(['outer']), 40);
        expect(at(spread, 'y')).toEqual([170, 30, 100, 50]);
        expect(at(spread, 'outer')).toEqual([0, 0, 286, 100]);
        expect(at(spread, 'right')).toEqual([326, 0, 100, 50]);
        expect(at(spread, 'below')).toEqual([0, 150, 100, 50]);
        const top = spread.filter(p => !p.parentId);
        for (const a of top) for (const b of top) if (a !== b) expect(overlap(a, b)).toBe(false);
    });
});

describe('spacePorts', () => {
    const owner = (): SpacingPart => ({ ...box('p', 0, 0, 120, 80), ports: [
        { id: 'a', x: -8, y: 20, side: 'left', size: 16 }, { id: 'b', x: -8, y: 40, side: 'left', size: 16 },
        { id: 'r', x: 112, y: 20, side: 'right', size: 16 },
    ] });
    it('spreads the ports on each wall and grows the part when the wall is full', () => {
        const [p] = spacePorts([owner()], new Set(['p']), 30);
        expect(p.ports!.find(port => port.id === 'a')!.y).toBe(20);
        expect(p.ports!.find(port => port.id === 'b')!.y).toBe(70);
        expect(p.height).toBe(90);
    });
    it('closes ports up to the minimum gap', () => {
        const [p] = spacePorts([owner()], new Set(['p']), -30);
        expect(p.ports!.find(port => port.id === 'b')!.y).toBe(20 + 16 + MIN_PORT_GAP);
        expect(p.height).toBe(80);
    });
    it('keeps right-wall ports on the wall when the part grows wider', () => {
        const part = { ...box('p', 0, 0, 60, 40), ports: [
            { id: 't1', x: 10, y: -8, side: 'top' as const, size: 16 }, { id: 't2', x: 30, y: -8, side: 'top' as const, size: 16 },
            { id: 'r', x: 52, y: 10, side: 'right' as const, size: 16 }] };
        const [p] = spacePorts([part], new Set(['p']), 20);
        expect(p.width).toBe(70);
        expect(p.ports!.find(port => port.id === 'r')!.x).toBe(62);
    });
});

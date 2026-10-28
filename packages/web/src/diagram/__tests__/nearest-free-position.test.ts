import { describe, expect, it } from 'vitest';
import { nearestFreePosition } from '../nearest-free-position';

describe('nearestFreePosition', () => {
    const size = { width: 100, height: 50 };
    it('keeps a drop that overlaps nothing', () => {
        expect(nearestFreePosition({ x: 10, y: 10 }, size, [{ x: 300, y: 0, width: 50, height: 50 }], 4)).toEqual({ x: 10, y: 10 });
    });
    it('moves a drop onto a sibling to the nearest side of it', () => {
        const sibling = { x: 200, y: 100, width: 100, height: 100 };
        expect(nearestFreePosition({ x: 180, y: 120 }, size, [sibling], 4)).toEqual({ x: 180, y: 46 });
        expect(nearestFreePosition({ x: 210, y: 170 }, size, [sibling], 4)).toEqual({ x: 210, y: 204 });
    });
    it('stays inside the parent and gives up when nothing fits', () => {
        const parent = { x: 0, y: 0, width: 220, height: 60 };
        expect(nearestFreePosition({ x: 90, y: 0 }, size, [{ x: 0, y: 0, width: 100, height: 50 }], 4, parent)).toEqual({ x: 104, y: 0 });
        expect(nearestFreePosition({ x: 0, y: 0 }, size, [{ x: 0, y: 0, width: 220, height: 60 }], 4, parent)).toBeNull();
    });
});

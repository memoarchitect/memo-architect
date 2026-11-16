// ─── A dragged segment lines up, and a straightened connector loses its bends ─

import { describe, expect, it } from 'vitest';
import { dragAxis, guideCoordinates, nudgeSegment, snapCoordinate, straightenRoute } from '../route-snapping';

/** A connector that leaves its port, drops into a detour and comes back level with where it started. */
const detour = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 50 }, { x: 80, y: 50 }, { x: 80, y: 0 }, { x: 100, y: 0 }];

describe('snapping a dragged segment', () => {
    it('moves a horizontal segment in y and a vertical one in x', () => {
        expect(dragAxis({ x: 0, y: 5 }, { x: 40, y: 5 })).toBe('y');
        expect(dragAxis({ x: 7, y: 0 }, { x: 7, y: 40 })).toBe('x');
        expect(dragAxis({ x: 0, y: 0 }, { x: 40, y: 30 })).toBeUndefined();
    });

    it('offers the other connectors and its own fixed points as guides, not the points being dragged', () => {
        const guides = guideCoordinates('y', detour, [2, 3], [[{ x: 0, y: 120 }, { x: 90, y: 120 }]]);
        expect(guides.sort((a, b) => a - b)).toEqual([0, 120]);
    });

    it('draws a value to the nearest guide within the tolerance, and leaves it alone beyond', () => {
        expect(snapCoordinate(3, [0, 120], 6)).toEqual({ value: 0, snapped: true });
        expect(snapCoordinate(113, [0, 120], 6).snapped).toBe(false);
        expect(snapCoordinate(4, [0, 6], 6).value).toBe(6);
    });
});

describe('straightening on release', () => {
    it('drops the bends of a detour brought level with its ends', () => {
        const level = detour.map((point, index) => index === 2 || index === 3 ? { ...point, y: 0 } : point);
        expect(straightenRoute(level, 'orthogonal')).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    });

    it('keeps a route whose bends still turn, and a curved route as drawn', () => {
        expect(straightenRoute(detour, 'orthogonal')).toBe(detour);
        const level = detour.map(point => ({ ...point, y: 0 }));
        expect(straightenRoute(level, 'curved')).toBe(level);
    });
});

describe('nudging a segment', () => {
    it('moves an interior segment across its own direction and nothing else', () => {
        const nudged = nudgeSegment(detour, 3, -10)!;
        expect(nudged[2]).toEqual({ x: 20, y: 40 });
        expect(nudged[3]).toEqual({ x: 80, y: 40 });
        expect(nudged.filter((_, i) => i !== 2 && i !== 3)).toEqual(detour.filter((_, i) => i !== 2 && i !== 3));
    });

    it('leaves the segments that end on a port where they are', () => {
        expect(nudgeSegment(detour, 1, 5)).toBeUndefined();
        expect(nudgeSegment(detour, detour.length - 1, 5)).toBeUndefined();
    });
});

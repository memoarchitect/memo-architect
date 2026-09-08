// Ported from the affera bundle patch's rule tests. A landing is a wall plus a
// fraction along it, so every case here is checkable without a canvas.
import { describe, it, expect } from 'vitest';
import {
    hullPoint, projectToHull, offsetFromLanding, landingsFromPoints, shouldKeepLanding,
} from '../landing-rules';

const rect = { x: 100, y: 50, width: 200, height: 100 };

describe('hullPoint', () => {
    it('puts t=0.5 on the middle of each wall', () => {
        expect(hullPoint(rect, 'left', 0.5)).toEqual({ x: 100, y: 100 });
        expect(hullPoint(rect, 'right', 0.5)).toEqual({ x: 300, y: 100 });
        expect(hullPoint(rect, 'top', 0.5)).toEqual({ x: 200, y: 50 });
        expect(hullPoint(rect, 'bottom', 0.25)).toEqual({ x: 150, y: 150 });
    });
});

describe('projectToHull', () => {
    it('snaps a point left of the box onto the left wall', () => {
        const hit = projectToHull(rect, { x: 20, y: 80 });
        expect(hit.side).toBe('left');
        expect(hit.x).toBe(100);
        expect(hit.t > 0.2 && hit.t < 0.4).toBe(true);
    });

    it('snaps a point inside to the nearest wall', () => {
        // Dragging towards an edge from within the box does the obvious thing.
        const hit = projectToHull(rect, { x: 110, y: 90 });
        expect(hit.side).toBe('left');
        expect(hit.x).toBe(100);
    });

    it('lets a landing move to a different wall', () => {
        const hit = projectToHull(rect, { x: 200, y: 10 });
        expect(hit.side).toBe('top');
        expect(hit.y).toBe(50);
    });
});

describe('offsetFromLanding', () => {
    it('is relative to the box origin, so a moved box keeps the landing', () => {
        expect(offsetFromLanding(rect, 'right', 0.5)).toEqual({ x: 200, y: 50, side: 'right' });
        expect(offsetFromLanding(rect, 'left', 0)).toEqual({ x: 0, y: 0, side: 'left' });
    });
});

describe('landingsFromPoints', () => {
    it('records wall + t from a two-point spoke', () => {
        const nodes = [
            { id: 'actor', position: { x: 0, y: 0 }, width: 80, height: 76 },
            { id: 'sys', position: { x: 200, y: 40 }, width: 240, height: 108 },
        ];
        const land = landingsFromPoints(
            nodes,
            { source: 'actor', target: 'sys' },
            [{ x: 80, y: 38 }, { x: 200, y: 80 }],
        );
        expect(land.manualLanding).toBe(true);
        expect(land.sourceSide).toBe('right');
        expect(land.targetSide).toBe('left');
        expect(land.sourceOffset?.x).toBe(80);
        expect(land.targetOffset?.x).toBe(0);
    });

    it('says nothing when there is no route to read', () => {
        expect(landingsFromPoints([], { source: 'a', target: 'b' }, undefined)).toEqual({});
        expect(landingsFromPoints([], undefined, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual({});
    });
});

describe('shouldKeepLanding', () => {
    it('keeps an authored landing across auto-layout of other edges', () => {
        expect(shouldKeepLanding({ manualLanding: true, sourceSide: 'left', sourceT: 0.3 })).toBe(true);
        expect(shouldKeepLanding({ sourceSide: 'right', sourceT: 0.5 })).toBe(true);
        expect(shouldKeepLanding({})).toBe(false);
    });
});

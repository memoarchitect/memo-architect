import { describe, expect, it } from 'vitest';
import { ibdRouting, reconnectRoute, orthogonalizeRoute } from '../ibd-routing';

describe('IBD routing compatibility and endpoint movement', () => {
    it('opens existing diagrams with saved bends in manual mode', () => {
        expect(ibdRouting({ nodes: {}, edges: { wire: { points: [{ x: 0, y: 0 }, { x: 20, y: 30 }, { x: 80, y: 30 }] } } }))
            .toEqual({ type: 'rounded', mode: 'manual' });
        expect(ibdRouting()).toEqual({ type: 'rounded', mode: 'automatic' });
    });
    it('an explicit automatic choice takes precedence over legacy bends', () => {
        expect(ibdRouting({ nodes: {}, edges: { wire: { points: [{ x: 0, y: 0 }, { x: 80, y: 30 }] } },
            canvas: { routingType: 'manhattan', routingMode: 'automatic', autoLayout: false } }))
            .toEqual({ type: 'manhattan', mode: 'automatic' });
    });
    it('keeps native waypoints while making diagonal endpoint stubs orthogonal', () => {
        const route = [{ x: 0, y: 3 }, { x: 40, y: 3.1 }, { x: 40, y: 50 }, { x: 60, y: 49 }];
        const result = orthogonalizeRoute(route);
        for (let i = 1; i < result.length; i++) {
            expect(result[i].x === result[i - 1].x || result[i].y === result[i - 1].y).toBe(true);
        }
        for (const point of route) expect(result).toContainEqual(point);
    });
    it('moves both endpoints without changing or aliasing manual breakpoints', () => {
        const saved = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 70 }, { x: 80, y: 70 }];
        const result = reconnectRoute(saved, { x: 8, y: 11 }, { x: 100, y: 90 });
        expect(result).toEqual([{ x: 8, y: 11 }, { x: 20, y: 0 }, { x: 20, y: 70 }, { x: 100, y: 90 }]);
        result[1].x = -1;
        expect(saved[1].x).toBe(20);
    });
});

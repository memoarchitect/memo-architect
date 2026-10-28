import { describe, expect, it } from 'vitest';
import { ibdRouting, reconnectRoute, orthogonalizeRoute, attachedRoute } from '../ibd-routing';

describe('IBD routing compatibility and endpoint movement', () => {
    it('opens existing diagrams with saved bends in manual mode', () => {
        expect(ibdRouting({ nodes: {}, edges: { wire: { points: [{ x: 0, y: 0 }, { x: 20, y: 30 }, { x: 80, y: 30 }] } } }))
            .toEqual({ type: 'manhattan', mode: 'manual' });
        expect(ibdRouting()).toEqual({ type: 'manhattan', mode: 'automatic' });
    });
    it('does not infer manual bends from persisted automatic geometry', () => {
        const layout = {nodes:{},edges:{wire:{points:[{x:0,y:0},{x:80,y:0}],manualRoute:false}}};
        expect(ibdRouting(layout)).toEqual({type:'manhattan',mode:'automatic'});
    });
    it('preserves an explicit saved rounded choice', () => {
        expect(ibdRouting({ nodes: {}, edges: {}, canvas: { routingType: 'rounded' } }).type).toBe('rounded');
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

it('draws short planned automatic terminal runs without extending and reversing them',()=>{
 const points=[{x:100,y:100},{x:108,y:100},{x:108,y:200},{x:118,y:200},{x:126,y:200}];
 expect(attachedRoute(points,'orthogonal','right','left',false)).toEqual(points);
 const authored=attachedRoute(points,'orthogonal','right','left',true);
 expect(authored[1]).toEqual({x:112,y:100});expect(authored).toContainEqual(points[1]);
});

import { resizeIbdNodes } from '../ibd-resize-integration';
import { describe, it, expect } from 'vitest';
import { attachedRoute, cubicRoutePath, arcRoutePath, elbowRoute, IBD_ROUTING_TYPES } from '../ibd-routing';
import { shortenAutomaticPortRoutes } from '../ibd-port-placement';

const points = [{ x: 10.25, y: 11.5 }, { x: 75.75, y: 90.125 }, { x: 170, y: 60 }];
describe('authored points and derived attachment geometry', () => {
    it('keeps authored interiors with perpendicular outward endpoint stubs on all walls', () => {
        for (const type of ['manhattan','orthogonal','elbow','rounded'] as const) {
            for (const side of ['left','right','top','bottom'] as const) {
                const before = structuredClone(points), route = attachedRoute(points, type, side, side);
                expect(points).toEqual(before);
                expect(route).toContainEqual(points[1]);
                expect(route[0]).toEqual(points[0]); expect(route.at(-1)).toEqual(points.at(-1));
                for (let i=1;i<route.length;i++) expect(route[i].x === route[i-1].x || route[i].y === route[i-1].y).toBe(true);
                const d = { x: route[1].x-route[0].x, y: route[1].y-route[0].y };
                expect(side==='left'?d.x<0:side==='right'?d.x>0:side==='top'?d.y<0:d.y>0).toBe(true);
            }
        }
    });
    it('uses cubic interpolation and a real automatic quadratic arc; straight retains authored vertices', () => {
        expect(cubicRoutePath(points)).toContain(' C ');
        expect(cubicRoutePath(points)).toContain('75.75,90.125');
        expect(arcRoutePath(points, false)).toContain(' Q ');
        expect(arcRoutePath(points, true)).toContain('75.75,90.125');
        expect(attachedRoute(points,'straight')).toEqual(points);
        for (const type of ['curved','arc'] as const) { const attached=attachedRoute(points,type,'right','left',true);expect(attached[1]).toEqual({x:22.25,y:11.5});expect(attached).toContainEqual(points[1]);expect(attached.at(-2)).toEqual({x:158,y:60}); }
        expect(IBD_ROUTING_TYPES).toHaveLength(7);
        expect(elbowRoute(points[0], points[2], 'right','left')[2]).toEqual({x:158,y:11.5});
    });
});

describe('explicit bounded port placement', () => {
    const fixture = () => [{id:'a',position:{x:0,y:0},width:160,height:280,data:{ports:[{id:'p',x:144,y:70,size:32,side:'right'}]}},
        {id:'b',position:{x:400,y:0},width:160,height:280,data:{ports:[{id:'q',x:-16,y:180,size:32,side:'left'}]}}];
    const edges = [{id:'wire',source:'a',target:'b',data:{sourcePortId:'p',targetPortId:'q'}}];
    const evaluate = (nodes: ReturnType<typeof fixture>) => ({edges,length:Math.hypot(208,nodes[0].data.ports[0].y-nodes[1].data.ports[0].y)});
    it('shortens a matched route while preserving frames, wall, saved positions and input immutability', () => {
        const nodes=fixture(), before=structuredClone(nodes);
        const result=shortenAutomaticPortRoutes(nodes,edges,{nodes:{b:{x:400,y:0,ports:{q:{x:-16,y:180,side:'left'}}}},edges:{}},evaluate);
        expect(result.after).toBeLessThan(result.before);
        expect(result.after).toBe(208);
        expect(nodes).toEqual(before);
        expect(result.nodes.map(n=>n.position)).toEqual(nodes.map(n=>n.position));
        expect(result.nodes[0].data.ports[0].x).toBe(144);
        expect(result.nodes[1]).toBe(nodes[1]);
        expect(result.evaluations).toBeLessThanOrEqual(128);
    });
    it('rejects overlapping candidates, locks legacy saved ports and respects the evaluation budget', () => {
        const nodes=fixture();nodes[0].data.ports.push({id:'blocker',x:144,y:180,size:32,side:'right'});
        const result=shortenAutomaticPortRoutes(nodes,edges,undefined,evaluate,3);
        expect(result.evaluations).toBeLessThanOrEqual(3);
        expect(result.nodes[0].data.ports[0].y).not.toBe(180);
        const locked=shortenAutomaticPortRoutes(fixture(),edges,{nodes:{a:{x:0,y:0,ports:{p:{x:144,y:70,side:'right'}}},b:{x:400,y:0,ports:{q:{x:-16,y:180,side:'left'}}}},edges:{}},evaluate);
        expect(locked.after).toBe(locked.before);
        expect(locked.nodes).toEqual(fixture());
    });
});

it.each(['left','right','top','bottom'] as const)('keeps a shortened port on its %s wall with legal clearance', side => {
    const vertical=side==='left'||side==='right';
    const p={id:'p',side,x:vertical?(side==='left'?-16:264):70,y:vertical?70:(side==='top'?-16:264),size:32};
    const q={id:'q',side:vertical?'left':'top',x:vertical?-16:180,y:vertical?180:-16,size:32};
    const nodes=[{id:'a',position:{x:0,y:0},width:280,height:280,data:{ports:[p]}},
        {id:'b',position:vertical?{x:500,y:0}:{x:0,y:500},width:280,height:280,data:{ports:[q]}}];
    const edges=[{id:'wire',source:'a',target:'b',data:{sourcePortId:'p',targetPortId:'q'}}];
    const evaluate=(ns:typeof nodes)=>({edges,length:Math.hypot(
        ns[0].position.x+ns[0].data.ports[0].x-ns[1].position.x-ns[1].data.ports[0].x,
        ns[0].position.y+ns[0].data.ports[0].y-ns[1].position.y-ns[1].data.ports[0].y)});
    const result=shortenAutomaticPortRoutes(nodes,edges,{nodes:{b:{x:nodes[1].position.x,y:nodes[1].position.y,ports:{q:{...q,side:vertical?'left':'top'}}}},edges:{}},evaluate);
    expect(result.after).toBeLessThan(result.before);
    const placed=result.nodes[0].data.ports[0];
    expect(placed.side).toBe(side);
    expect(vertical?placed.x:placed.y).toBe(vertical?p.x:p.y);
    expect(vertical?placed.y:placed.x).toBe(180);
    expect(result.nodes.map(n=>({position:n.position,width:n.width,height:n.height}))).toEqual(nodes.map(n=>({position:n.position,width:n.width,height:n.height})));
});


it('does not make an optimized short owner illegal for its next measured resize', () => {
    const nodes=[{id:'a',position:{x:0,y:0},width:160,height:162,data:{ports:[{id:'p',side:'right',x:144,y:112,size:32}]}},
        {id:'b',position:{x:400,y:0},width:160,height:280,data:{ports:[{id:'q',side:'left',x:-16,y:180,size:32}]}}];
    const edges=[{id:'wire',source:'a',target:'b',data:{sourcePortId:'p',targetPortId:'q'}}];
    const result=shortenAutomaticPortRoutes(nodes,edges,{nodes:{b:{x:400,y:0,ports:{q:{x:-16,y:180,side:'left'}}}},edges:{}},
        ns=>({edges,length:Math.hypot(208,ns[0].data.ports[0].y-ns[1].data.ports[0].y)}));
    expect(result.after).toBeLessThan(result.before);
    expect(result.nodes[0].height).toBe(162);
    const p=result.nodes[0].data.ports[0];
    const resized=resizeIbdNodes(result.nodes,'a','e',{x:20,y:0},{ports:[{x:0,y:p.y,width:32,height:40}]});
    expect(resized?.[0].width).toBe(180);
});

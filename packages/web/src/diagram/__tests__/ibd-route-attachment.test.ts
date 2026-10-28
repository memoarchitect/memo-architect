import { resizeIbdNodes } from '../ibd-resize-integration';
import { describe, it, expect } from 'vitest';
import { attachedRoute, cubicRoutePath, arcRoutePath, elbowRoute, IBD_ROUTING_TYPES } from '../ibd-routing';
import { shortenAutomaticPortRoutes, improvesPlacement } from '../ibd-port-placement';

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

it('all-wall placement aligns a free port toward a peer above without touching the saved peer', () => {
    const nodes = [{id:'lower',position:{x:0,y:400},width:280,height:280,data:{ports:[{id:'p',side:'right',x:264,y:90,size:32}]}},
        {id:'upper',position:{x:0,y:0},width:280,height:280,data:{ports:[{id:'q',side:'bottom',x:140,y:264,size:32}]}}];
    const edges = [{id:'link',source:'lower',target:'upper',data:{sourcePortId:'p',targetPortId:'q'}}];
    const before = structuredClone(nodes);
    const result = shortenAutomaticPortRoutes(nodes,edges,{nodes:{upper:{x:0,y:0,ports:{q:{x:140,y:264,side:'bottom'}}}},edges:{}},ns => {
        const p=ns[0].data.ports[0],q=ns[1].data.ports[0];
        return {edges,length:Math.abs(p.x-q.x)+Math.abs(400+p.y-q.y),bends:p.x===q.x?0:2};
    },128,{allWalls:true});
    expect(result.nodes[0].data.ports[0]).toMatchObject({side:'top',x:140,y:-16});
    expect(result.after).toBeLessThan(result.before);
    expect(result.nodes[1]).toBe(nodes[1]);expect(nodes).toEqual(before);
});

it('scores every incident connector instead of aligning only the first', () => {
    const nodes=[{id:'owner',position:{x:0,y:0},width:280,height:280,data:{ports:[{id:'p',side:'right',x:264,y:70,size:32}]}},
        ...[90,180,180].map((y,i)=>({id:'peer'+i,position:{x:500,y:0},width:280,height:280,data:{ports:[{id:'q'+i,side:'left',x:-16,y,size:32}]}}))];
    const edges=nodes.slice(1).map((n,i)=>({id:'link'+i,source:'owner',target:n.id,data:{sourcePortId:'p',targetPortId:'q'+i}}));
    const layout={nodes:Object.fromEntries(nodes.slice(1).map(n=>[n.id,{x:500,y:0,ports:{[n.data.ports[0].id]:{...n.data.ports[0],side:'left' as const}}}])),edges:{}};
    const result=shortenAutomaticPortRoutes(nodes,edges,layout,ns=>({edges,length:ns.slice(1).reduce((s,n)=>s+Math.abs(n.data.ports[0].y-ns[0].data.ports[0].y)+220,0)}));
    expect(result.nodes[0].data.ports[0].y).toBe(180);
    expect(result.nodes.slice(1)).toEqual(nodes.slice(1));
});
it('only an explicit includeSaved request may replace a saved ordinary port',()=>{
    const nodes=[{id:'a',position:{x:0,y:0},width:280,height:280,data:{ports:[{id:'p',side:'right',x:264,y:70,size:32}]}},
        {id:'b',position:{x:500,y:0},width:280,height:280,data:{ports:[{id:'q',side:'left',x:-16,y:180,size:32}]}}];
    const edges=[{id:'wire',source:'a',target:'b',data:{sourcePortId:'p',targetPortId:'q'}}];
    const layout={nodes:{a:{x:0,y:0,ports:{p:{x:264,y:70,side:'right' as const}}},b:{x:500,y:0,ports:{q:{x:-16,y:180,side:'left' as const}}}},edges:{}};
    const evaluate=(ns:typeof nodes)=>({edges,length:Math.abs(ns[0].data.ports[0].y-ns[1].data.ports[0].y)+220});
    expect(shortenAutomaticPortRoutes(nodes,edges,layout,evaluate).nodes).toBe(nodes);
    const result=shortenAutomaticPortRoutes(nodes,edges,layout,evaluate,128,{includeSaved:true});
    expect(result.after).toBeLessThan(result.before);expect(result.nodes.map(n=>n.position)).toEqual(nodes.map(n=>n.position));
});
it('spends a small evaluation budget on the highest-conflict incident port first',()=>{
 const nodes=[{id:'low',position:{x:0,y:0},width:280,height:280,data:{ports:[{id:'p',side:'right',x:264,y:70,size:32}]}},
  {id:'high',position:{x:500,y:0},width:280,height:280,data:{ports:[{id:'q',side:'left',x:-16,y:180,size:32}]}}];
 const edges=[{id:'wire',source:'low',target:'high',data:{sourcePortId:'p',targetPortId:'q'}}];
 const result=shortenAutomaticPortRoutes(nodes,edges,undefined,ns=>({edges,length:220+Math.abs(ns[0].data.ports[0].y-ns[1].data.ports[0].y)}),2,{priority:n=>n.id==='high'?10:0});
 expect(result.evaluations).toBe(2);expect(result.nodes[0]).toBe(nodes[0]);expect(result.nodes[1].data.ports[0].y).toBe(70);
 expect(result.after).toBeLessThan(result.before);
});

it('keeps a verified placement when a cheaper proposal introduces a body hit or extra overlap',()=>{
 const original={length:1000,bends:8,crossings:8,blocked:0,overlap:20};
 const verified={length:800,bends:6,crossings:5,blocked:0,overlap:0};
 expect(improvesPlacement(verified,original)).toBe(true);
 expect(improvesPlacement({length:500,bends:2,crossings:0,blocked:1,overlap:0},verified,original)).toBe(false);
 expect(improvesPlacement({length:500,bends:2,crossings:0,blocked:0,overlap:21},verified,original)).toBe(false);
 expect(improvesPlacement({length:790,bends:6,crossings:4,blocked:0,overlap:0},verified,original)).toBe(true);
});

it('orders occupied wall slots together using all incident peers and keeps saved slots locked',()=>{
 const nodes:any[]=[{id:'owner',position:{x:0,y:0},width:200,height:300,data:{ports:[
  {id:'a',x:184,y:60,side:'right'},{id:'b',x:184,y:180,side:'right'}]}},
  {id:'upper',position:{x:400,y:0},width:200,height:300,data:{ports:[{id:'u',x:-16,y:60,side:'left'}]}},
  {id:'lower',position:{x:400,y:0},width:200,height:300,data:{ports:[{id:'l',x:-16,y:180,side:'left'}]}}];
 const edges:any[]=[{id:'a-l',source:'owner',target:'lower',data:{sourcePortId:'a',targetPortId:'l'}},
 {id:'b-u',source:'owner',target:'upper',data:{sourcePortId:'b',targetPortId:'u'}}];
 const original=structuredClone(nodes),evaluate=(ns:any[])=>({edges,length:ns[0].data.ports[0].y===180?100:1000});
 const result=shortenAutomaticPortRoutes(nodes,edges,undefined,evaluate,2,{orderWalls:true});
 expect(result.nodes[0].data.ports.map((p:{y:number})=>p.y)).toEqual([180,60]);expect(result.evaluations).toBe(2);expect(nodes).toEqual(original);
 const layout:any={nodes:{owner:{ports:{a:{},b:{}}}},edges:{}};
 expect(shortenAutomaticPortRoutes(nodes,edges,layout,evaluate,2,{orderWalls:true}).nodes).toBe(nodes);
 expect(shortenAutomaticPortRoutes(nodes,edges,layout,evaluate,2,{orderWalls:true,includeSaved:true}).nodes[0].data.ports.map((p:{y:number})=>p.y)).toEqual([180,60]);
});

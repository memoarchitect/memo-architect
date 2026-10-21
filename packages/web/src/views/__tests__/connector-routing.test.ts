// ─── Connector routing: shape contract and cost ceiling ──────────────────────
//
// Diagrams are edited live, so the routing cost is part of the contract, not an
// implementation detail. The tidy pass was once cubic in edge count — 200 nodes
// and 200 edges took 199 seconds, and it ran on every frame of a drag. These
// ceilings are deliberately loose (roughly 20x the measured time on a developer
// machine) so they catch a return to super-quadratic growth without failing on
// a slow CI box.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
    routeDirectOrthogonal, routeDirectOrthogonalEdges, routeOrthogonalEdges,
    type OrthogonalRouteRequest, type RouteObstacle, type RoutePoint,
} from '../layout';

/** A grid of boxes wired between deterministic pseudo-random pairs. */
function scenario(nodeCount: number, edgeCount: number) {
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const W = 180, H = 80, GAPX = 120, GAPY = 90;
    const obstacles: RouteObstacle[] = Array.from({ length: nodeCount }, (_, i) => ({
        id: `n${i}`,
        x: (i % cols) * (W + GAPX),
        y: Math.floor(i / cols) * (H + GAPY),
        width: W, height: H,
    }));
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const requests: OrthogonalRouteRequest[] = Array.from({ length: edgeCount }, (_, e) => {
        const a = Math.floor(rnd() * nodeCount);
        const b = Math.floor(rnd() * nodeCount) === a ? (a + 1) % nodeCount : Math.floor(rnd() * nodeCount);
        const oa = obstacles[a], ob = obstacles[b];
        return {
            id: `e${e}`,
            sourceNodeId: oa.id, targetNodeId: ob.id,
            source: { x: oa.x + oa.width, y: oa.y + oa.height / 2 },
            target: { x: ob.x, y: ob.y + ob.height / 2 },
            sourceSide: 'right' as const, targetSide: 'left' as const,
        };
    });
    return { obstacles, requests };
}

const isOrthogonal = (points: RoutePoint[]) => points.every((p, i) =>
    i === 0 || Math.abs(p.x - points[i - 1].x) < 0.01 || Math.abs(p.y - points[i - 1].y) < 0.01);

describe('direct (live) connector routing', () => {
    it('anchors on the requested port points', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
            sourceSide: 'right', targetSide: 'left',
        });
        expect(points[0]).toEqual({ x: 100, y: 50 });
        expect(points[points.length - 1]).toEqual({ x: 400, y: 220 });
    });

    it('keeps every segment axis-aligned', () => {
        const sides = ['left', 'right', 'top', 'bottom'] as const;
        for (const sourceSide of sides) {
            for (const targetSide of sides) {
                const points = routeDirectOrthogonal({
                    id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
                    source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
                    sourceSide, targetSide,
                });
                expect(isOrthogonal(points), `${sourceSide}→${targetSide}`).toBe(true);
            }
        }
    });

    it('leaves each end perpendicular to the side it is anchored to', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 220 },
            sourceSide: 'right', targetSide: 'left',
        });
        // First step off a left/right port runs horizontally, and away from the box.
        expect(points[1].y).toBeCloseTo(points[0].y);
        expect(points[1].x).toBeGreaterThan(points[0].x);
        const last = points.length - 1;
        expect(points[last - 1].y).toBeCloseTo(points[last].y);
        expect(points[last - 1].x).toBeLessThan(points[last].x);
    });

    it('draws a single straight run between aligned ports', () => {
        const points = routeDirectOrthogonal({
            id: 'e', sourceNodeId: 'a', targetNodeId: 'b',
            source: { x: 100, y: 50 }, target: { x: 400, y: 50 },
            sourceSide: 'right', targetSide: 'left',
        });
        expect(points).toEqual([{ x: 100, y: 50 }, { x: 400, y: 50 }]);
    });

    it('costs almost nothing at the scale that runs on every drag frame', () => {
        const { requests } = scenario(400, 400);
        const started = performance.now();
        const routes = routeDirectOrthogonalEdges(requests);
        expect(routes.size).toBe(400);
        expect(performance.now() - started).toBeLessThan(150);
    });
});

describe('tidy connector routing', () => {
    it('returns an orthogonal route for every request', () => {
        const { obstacles, requests } = scenario(40, 40);
        const routes = routeOrthogonalEdges(requests, obstacles);
        expect(routes.size).toBe(40);
        for (const points of routes.values()) {
            expect(points.length).toBeGreaterThanOrEqual(2);
            expect(isOrthogonal(points)).toBe(true);
        }
    });

    it('stays interactive on a large board', () => {
        const { obstacles, requests } = scenario(200, 200);
        const started = performance.now();
        const routes = routeOrthogonalEdges(requests, obstacles);
        expect(routes.size).toBe(200);
        // Measured ~370ms here, against 199_000ms before the pass was bounded.
        expect(performance.now() - started).toBeLessThan(8_000);
    });

    it('grows no worse than quadratically as the board doubles', () => {
        const time = (n: number) => {
            const { obstacles, requests } = scenario(n, n);
            const started = performance.now();
            routeOrthogonalEdges(requests, obstacles);
            return performance.now() - started;
        };
        const small = Math.max(time(100), 1);
        const large = time(200);
        // Cubic growth would be ~8x for a doubling; allow generous headroom
        // above quadratic while still catching a return to cubic.
        expect(large / small).toBeLessThan(7);
    });
});

// Independent interior oracle: touching a wall is legal; cutting through a body is not.
const bodyHits = (route: RoutePoint[], boxes: RouteObstacle[]) => route.slice(1).flatMap((b,i)=> {
    const a=route[i];return boxes.filter(r=>a.y===b.y
        ? a.y>r.y+.01&&a.y<r.y+r.height-.01&&Math.min(Math.max(a.x,b.x),r.x+r.width)-Math.max(Math.min(a.x,b.x),r.x)>.01
        : a.x>r.x+.01&&a.x<r.x+r.width-.01&&Math.min(Math.max(a.y,b.y),r.y+r.height)-Math.max(Math.min(a.y,b.y),r.y)>.01);
});
it('avoids a sibling close to an endpoint instead of treating proximity as containment',()=>{
    const sibling={id:'sibling',x:130,y:25,width:70,height:110};
    const request:OrthogonalRouteRequest={id:'link',sourceNodeId:'a',targetNodeId:'b',source:{x:116,y:75},target:{x:400,y:200},sourceSide:'right',targetSide:'left'};
    const route=routeOrthogonalEdges([request],[sibling],18,'long-first',{refineBudgetMs:Infinity}).get('link')!;
    expect(bodyHits(route,[sibling])).toEqual([]);expect(isOrthogonal(route)).toBe(true);
});
it('does not re-enter an endpoint owner after leaving its top wall',()=>{
    const owner={id:'a',x:0,y:0,width:200,height:160};
    const request:OrthogonalRouteRequest={id:'link',sourceNodeId:'a',targetNodeId:'b',source:{x:60,y:-16},target:{x:400,y:300},sourceSide:'top',targetSide:'top'};
    const route=routeOrthogonalEdges([request],[owner],18,'long-first',{refineBudgetMs:Infinity}).get('link')!;
    expect(bodyHits(route,[owner])).toEqual([]);
});

it('uses explicit ancestry while avoiding unrelated children inside the same container',()=>{
    const parent={id:'assembly',x:-100,y:-100,width:800,height:600},peer={id:'peer',x:180,y:0,width:100,height:200};
    const request:OrthogonalRouteRequest={id:'link',sourceNodeId:'a',targetNodeId:'b',source:{x:116,y:75},target:{x:400,y:200},sourceSide:'right',targetSide:'left',sourceAncestorIds:['assembly'],targetAncestorIds:[]};
    const first=routeOrthogonalEdges([request],[parent,peer]).get('link')!;
    expect(bodyHits(first,[peer])).toEqual([]);
    expect(routeOrthogonalEdges([request],[parent,peer]).get('link')).toEqual(first);
});
it('charges crossings at lattice vertices and keeps ordinary shared endpoints as junctions',()=>{
    const requests:OrthogonalRouteRequest[]=[
        {id:'h',sourceNodeId:'a',targetNodeId:'b',source:{x:0,y:50},target:{x:200,y:50},sourceSide:'right',targetSide:'left'},
        {id:'v',sourceNodeId:'c',targetNodeId:'d',source:{x:100,y:0},target:{x:100,y:100},sourceSide:'bottom',targetSide:'top'},
    ];
    const routes=routeOrthogonalEdges(requests,[]);
    const h=routes.get('h')!,v=routes.get('v')!;
    const contacts:RoutePoint[]=[];
    for(let i=1;i<h.length;i++)for(let j=1;j<v.length;j++){
        const a=h[i-1],b=h[i],c=v[j-1],d=v[j];if((a.y===b.y)===(c.y===d.y))continue;
        const hs=a.y===b.y?[a,b]:[c,d],vs=a.y===b.y?[c,d]:[a,b],p={x:vs[0].x,y:hs[0].y};
        if(p.x>=Math.min(hs[0].x,hs[1].x)&&p.x<=Math.max(hs[0].x,hs[1].x)&&p.y>=Math.min(vs[0].y,vs[1].y)&&p.y<=Math.max(vs[0].y,vs[1].y))contacts.push(p);
    }
    expect(contacts).toEqual([]);
    const fork=routeOrthogonalEdges([requests[0],{...requests[1],sourceNodeId:'a',source:{x:0,y:50},sourceSide:'right',target:{x:200,y:150}}],[]);
    expect(fork.get('v')![0]).toEqual(fork.get('h')![0]);
});
it('retains distinct fractional endpoint axes instead of falling back through a blocker',()=>{
    const obstacle={id:'blocker',x:180,y:0,width:80,height:100};
    const request:OrthogonalRouteRequest={id:'link',sourceNodeId:'a',targetNodeId:'b',source:{x:0,y:50},target:{x:400,y:50.4},sourceSide:'right',targetSide:'left'};
    const route=routeOrthogonalEdges([request],[obstacle]).get('link')!;
    expect(route[0]).toEqual(request.source);expect(route.at(-1)).toEqual(request.target);
    expect(isOrthogonal(route)).toBe(true);expect(bodyHits(route,[obstacle])).toEqual([]);
});
it('reserves unaffected authored tracks without compacting or rewriting their points',()=>{
 const fixed=[{x:0,y:50},{x:50,y:50},{x:200,y:50}];
 const requests:OrthogonalRouteRequest[]=[{id:'authored',sourceNodeId:'a',targetNodeId:'b',source:fixed[0],target:fixed[2],sourceSide:'right',targetSide:'left'},
  {id:'moving',sourceNodeId:'c',targetNodeId:'d',source:{x:100,y:0},target:{x:100,y:100},sourceSide:'bottom',targetSide:'top'}];
 const input=structuredClone(fixed),routes=routeOrthogonalEdges(requests,[],18,'long-first',{fixedRoutes:new Map([['authored',fixed]])});
 expect(routes.get('authored')).toEqual(input);expect(fixed).toEqual(input);
 expect(bodyHits(routes.get('moving')!,[{id:'wire',x:0,y:49.99,width:200,height:.02}])).toEqual([]);
});

it('separates unrelated facing terminal stubs in a narrow corridor',()=>{
 const requests:OrthogonalRouteRequest[]=[{id:'a',sourceNodeId:'s1',targetNodeId:'t1',source:{x:100,y:100},target:{x:122,y:300},sourceSide:'right',targetSide:'left'},
 {id:'b',sourceNodeId:'s2',targetNodeId:'t2',source:{x:-200,y:400},target:{x:126,y:100},sourceSide:'right',targetSide:'left'}];
 const obstacles=[{id:'s1',x:0,y:60,width:84,height:80},{id:'t1',x:138,y:260,width:84,height:80},
 {id:'s2',x:-300,y:360,width:84,height:80},{id:'t2',x:142,y:60,width:84,height:80}];
 const routes=routeOrthogonalEdges(requests,obstacles);let overlap=0;
 const a=routes.get('a')!,b=routes.get('b')!;
 for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++)for(const [axis,cross]of[['x','y'],['y','x']]as const)
  if(a[i-1][cross]===a[i][cross]&&a[i][cross]===b[j-1][cross]&&b[j-1][cross]===b[j][cross])
   overlap+=Math.max(0,Math.min(Math.max(a[i-1][axis],a[i][axis]),Math.max(b[j-1][axis],b[j][axis]))-Math.max(Math.min(a[i-1][axis],a[i][axis]),Math.min(b[j-1][axis],b[j][axis])));
 expect(overlap).toBe(0);for(const route of routes.values())expect(bodyHits(route,obstacles)).toEqual([]);
});

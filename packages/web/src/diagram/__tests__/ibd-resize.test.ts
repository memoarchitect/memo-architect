import { describe, expect, it } from 'vitest';
import { absoluteResizeRect, solveIbdResize, type ResizeDirection, type ResizeNode } from '../ibd-resize';
const leaf: ResizeNode = { id: 'leaf', x: 20, y: 30, width: 100, height: 80 };
const solve = (direction: ResizeDirection, x: number, y: number, nodes = [leaf]) => solveIbdResize({ nodes, id: 'leaf', direction, delta: { x, y } })!;
const area = (a: ResizeNode, b: ResizeNode) => Math.max(0, Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)) * Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
describe('pure IBD resize geometry', () => {
    it.each([
        ['n', {x:20,y:20,width:100,height:90}], ['ne',{x:20,y:20,width:110,height:90}],
        ['e',{x:20,y:30,width:110,height:80}], ['se',{x:20,y:30,width:110,height:70}],
        ['s',{x:20,y:30,width:100,height:70}], ['sw',{x:30,y:30,width:90,height:70}],
        ['w',{x:30,y:30,width:90,height:80}], ['nw',{x:30,y:20,width:90,height:90}],
    ] as const)('moves only requested edges: %s', (direction, expected) => {
        expect(solve(direction,10,-10).rect).toEqual(expected);
    });
    it('uses two parent offsets including negative and fractional origins; ancestors are bounds', () => {
        const nodes: ResizeNode[] = [
            {id:'root',x:-300.5,y:-200.25,width:600,height:500},
            {id:'parent',parentId:'root',x:50.25,y:40.5,width:300,height:250},
            {...leaf,parentId:'parent'},
            {id:'peer',parentId:'parent',x:150.5,y:30,width:30,height:80},
        ];
        expect(absoluteResizeRect(nodes[2],nodes)).toEqual({x:-230.25,y:-129.75,width:100,height:80});
        const result = solve('e',1000,0,nodes);
        expect(result.rect.width).toBe(130.5); // touching peer is legal
        expect(result.rect.x).toBe(20);
        expect(solve('w',-1000,0,nodes).rect.x).toBe(0);
    });
    it('projects corner to the nearest legal alternative rather than rejecting the gesture', () => {
        const nodes = [leaf, {id:'peer',x:140,y:130,width:60,height:60}];
        // Desired right/bottom 170/150. Right 140 costs 30; bottom 130 costs 20.
        expect(solve('se',50,40,nodes).rect).toEqual({x:20,y:30,width:150,height:100});
    });
    it('honors clearance, ignores hidden peers, and permits touching without clearance', () => {
        const peer = {id:'peer',x:140,y:30,width:60,height:60};
        expect(solve('e',1000,0,[leaf,peer]).rect.width).toBe(120);
        expect(solveIbdResize({nodes:[leaf,peer],id:'leaf',direction:'e',delta:{x:1000,y:0},clearance:7})!.rect.width).toBe(113);
        expect(solve('e',1000,0,[leaf,{...peer,hidden:true}]).rect.width).toBe(1100);
    });
    it('reverses immediately after pointer overshoot using the immutable gesture start', () => {
        const nodes = [leaf,{id:'peer',x:140,y:30,width:60,height:80}];
        expect(solve('e',800,0,nodes).rect.width).toBe(120);
        expect(solve('e',5,0,nodes).rect.width).toBe(105);
        expect(solve('e',-20,0,nodes).rect.width).toBe(80);
    });
    it('separates measured title/content/ports from the initial footprint', () => {
        const request = {nodes:[{...leaf,width:500,height:400}],id:'leaf',direction:'se' as const,delta:{x:-1000,y:-1000}};
        expect(solveIbdResize({...request,minima:{title:{width:90,height:25},content:{width:60,height:70},ports:[{x:100,y:90,width:12,height:10}]}})!.rect).toEqual({x:20,y:30,width:112,height:100});
        expect(solveIbdResize({...request,minima:{title:{width:90,height:25}}})!.rect.width).toBe(90);
    });
    it.each(['nw','n','w'] as const)('keeps children and grandchildren stationary when moving %s container edges', direction => {
        const nodes: ResizeNode[] = [
            {id:'root',x:-100,y:-100,width:600,height:600},
            {...leaf,parentId:'root',width:250,height:200},
            {id:'child',parentId:'leaf',x:40,y:50,width:80,height:70},
            {id:'grandchild',parentId:'child',x:10,y:15,width:20,height:20},
            {id:'hidden',parentId:'leaf',hidden:true,x:200,y:180,width:30,height:30},
        ];
        const before = nodes.map(n => absoluteResizeRect(n,nodes));
        const result = solveIbdResize({nodes,id:'leaf',direction,delta:{x:1000,y:1000},clearance:5})!;
        if (direction.includes('w')) expect(result.rect.x).toBe(55);
        if (direction.includes('n')) expect(result.rect.y).toBe(75);
        const after = nodes.map(n => n.id === 'leaf' ? {...n,...result.rect} : result.children[n.id] ? {...n,...result.children[n.id]} : n);
        for (let i=2;i<nodes.length;i++) expect(absoluteResizeRect(after[i],after)).toEqual(before[i]);
        expect(nodes[2].x).toBe(40); // input immutable
    });
    it('child extent bounds bottom/right, hidden children do not establish minima', () => {
        const nodes = [leaf,{id:'child',parentId:'leaf',x:40,y:20,width:20,height:30},{id:'hidden',parentId:'leaf',hidden:true,x:90,y:70,width:100,height:100}];
        expect(solve('se',-1000,-1000,nodes).rect).toEqual({x:20,y:30,width:60,height:50});
    });
    it('existing overlap can shrink, cannot deepen, and can remain unchanged', () => {
        const peer = {id:'peer',x:100,y:50,width:80,height:80};
        const nodes = [leaf,peer];
        const reduced = solve('e',-10,0,nodes).rect;
        const worsened = solve('e',100,0,nodes).rect;
        expect(area({...leaf,...reduced},peer)).toBeLessThan(area(leaf,peer));
        expect(worsened).toEqual(leafRect());
        expect(solve('n',-10,-10,nodes).rect.y).toBe(20); // no deeper intersection
        expect(solve('e',-50,0,nodes).rect.width).toBe(50); // complete recovery
    });
    it('does not allow a new collision while recovering from another', () => {
        const nodes = [leaf,{id:'overlap',x:100,y:50,width:80,height:80},{id:'above',x:20,y:0,width:100,height:20}];
        expect(solveIbdResize({nodes,id:'leaf',direction:'nw',delta:{x:10,y:-100},minima:{title:{width:20,height:20}}})!.rect).toEqual({x:30,y:20,width:90,height:90});
    });
    it.each(['n','ne','e','se','s','sw','w','nw'] as const)('bounds overshoot in every direction: %s', direction => {
        const nodes = [leaf,
            {id:'left',x:0,y:0,width:10,height:200},
            {id:'right',x:130,y:0,width:10,height:200},
            {id:'top',x:10,y:10,width:120,height:10},
            {id:'bottom',x:10,y:120,width:120,height:10}];
        const r = solve(direction,direction.includes('w') ? -1000 : 1000,direction.includes('n') ? -1000 : 1000,nodes).rect;
        expect(r.x).toBe(direction.includes('w') ? 10 : 20);
        expect(r.y).toBe(direction.includes('n') ? 20 : 30);
        expect(r.x+r.width).toBe(direction.includes('e') ? 130 : 120);
        expect(r.y+r.height).toBe(direction.includes('s') ? 120 : 110);
        for (const peer of nodes.slice(1)) expect(area({...leaf,...r},peer)).toBe(0);
    });
    it('preserves fractional edges without rounding and recovers left/top overlap', () => {
        const nodes = [{...leaf,x:20.25,y:30.125},{id:'peer',x:0,y:0,width:40.5,height:50.5}];
        expect(solve('nw',-100,-100,nodes).rect).toEqual({x:20.25,y:30.125,width:100,height:80});
        const r = solve('nw',5.125,7.25,nodes).rect;
        expect(r.x).toBe(25.375); expect(r.y).toBe(37.375);
        expect(area({...leaf,...r},nodes[1])).toBeLessThan(area(nodes[0],nodes[1]));
    });
    it('does not trade deeper horizontal overlap for less vertical overlap', () => {
        const nodes = [leaf,{id:'peer',x:100,y:50,width:80,height:80}];
        const r = solve('se',100,-20,nodes).rect;
        expect(r.width).toBe(100); expect(r.height).toBe(60);
        expect(area({...leaf,...r},nodes[1])).toBeLessThan(area(leaf,nodes[1]));
    });
    it('reserves the measured title band above stationary children', () => {
        const nodes = [leaf,{id:'child',parentId:'leaf',x:20,y:40,width:30,height:20}];
        const r = solveIbdResize({nodes,id:'leaf',direction:'n',delta:{x:0,y:1000},minima:{title:{width:40,height:25}},clearance:5})!;
        expect(r.rect.y).toBe(40);
        expect(r.children.child.y).toBe(30); // title band 25 plus clearance 5
    });
    it('returns null for mutually impossible hard bounds', () => {
        expect(solveIbdResize({nodes:[{id:'p',x:0,y:0,width:100,height:100},{...leaf,parentId:'p',x:10,y:10,width:80,height:80}],id:'leaf',direction:'e',delta:{x:20,y:0},minima:{title:{width:200,height:20}}})).toBeNull();
    });
});
function leafRect() { return {x:20,y:30,width:100,height:80}; }

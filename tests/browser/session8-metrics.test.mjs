import {test} from 'node:test';import assert from 'node:assert/strict';import {routeMetrics} from './session8-metrics.ts';
const route=(id,points)=>({id,source:'s',target:'t',points:points.map(([x,y])=>({x,y}))});
test('proper crossings, shared junctions, overlap and strict part interiors',()=>{
 const a=route('a',[[0,5],[10,5]]),b=route('b',[[5,0],[5,10]]);
 assert.equal(routeMetrics([], [a,b]).crossings,1);
 assert.equal(routeMetrics([], [a,route('junction',[[0,5],[0,20]])]).crossings,0);
 assert.equal(routeMetrics([], [a,route('overlap',[[2,5],[8,5]])]).collinearOverlap,6);
 const nodes=[{id:'obstacle',position:{x:4,y:4},width:2,height:2}];
 assert.equal(routeMetrics(nodes,[a]).partIntersections,1);
 assert.equal(routeMetrics(nodes,[route('touch',[[0,4],[10,4]])]).partIntersections,0);
 assert.equal(routeMetrics([], [route('bend',[[0,0],[4,0],[4,3]])]).length,7);
 assert.equal(routeMetrics([], [route('bend',[[0,0],[4,0],[4,3]])]).bends,1);
});

test('collinear reversals retain length and coincident unrelated terminals are not junctions',()=>{
 assert.equal(routeMetrics([], [route('reverse',[[0,0],[10,0],[5,0]])]).length,15);
 const a=route('a',[[0,0],[10,0]]),b={...route('b',[[0,0],[0,10]]),source:'other'};
 assert.equal(routeMetrics([], [a,b]).crossings,1);
});

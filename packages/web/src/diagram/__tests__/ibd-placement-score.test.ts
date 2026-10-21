import {it,expect} from 'vitest';import{placementRouteConflicts}from'../ibd-placement-score';
it('scores a crossing at a bend once and excludes only a semantically shared endpoint',()=>{
 const h={id:'h',source:'a',target:'b',data:{sourcePortId:'out',targetPortId:'in',points:[{x:0,y:50},{x:100,y:50},{x:100,y:70}]}};
 const v={id:'v',source:'c',target:'d',data:{sourcePortId:'out',targetPortId:'in',points:[{x:100,y:0},{x:100,y:50},{x:200,y:50}]}};
 expect(placementRouteConflicts([], [h,v]).crossings).toBe(1);
 const a={...h,data:{...h.data,points:[{x:0,y:50},{x:100,y:50}]}};
 const b={...v,source:'a',data:{...v.data,points:[{x:0,y:50},{x:0,y:100}]}};
 expect(placementRouteConflicts([], [a,b]).crossings).toBe(0);
 expect(placementRouteConflicts([], [a,{...b,source:'different'}]).crossings).toBe(1);
});
it('penalizes unrelated part interiors while respecting endpoint ancestry and boundary contact',()=>{
 const nodes=[{id:'parent',position:{x:0,y:0},width:500,height:500,data:{}},{id:'child',parentId:'parent',position:{x:40,y:40},width:50,height:50,data:{}},{id:'peer',position:{x:200,y:40},width:100,height:100,data:{}}];
 const wire={id:'wire',source:'child',target:'outside',data:{points:[{x:100,y:80},{x:400,y:80}]}};
 expect(placementRouteConflicts(nodes,[wire]).blocked).toBe(1);
 expect(placementRouteConflicts(nodes,[{...wire,data:{points:[{x:100,y:40},{x:400,y:40}]}}]).blocked).toBe(0);
});

it('penalizes an approach that re-enters its own endpoint part',()=>{
 const owner={id:'owner',position:{x:0,y:0},width:200,height:150,data:{}};
 const wire={id:'wire',source:'owner',target:'peer',data:{points:[{x:60,y:-16},{x:60,y:-42},{x:60,y:75},{x:400,y:75}]}};
 expect(placementRouteConflicts([owner],[wire]).blocked).toBeGreaterThan(0);
});

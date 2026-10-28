import {it,expect} from 'vitest';
import {captureMovementGeometry} from '../movement-history';
import {affectedMovementRoutes,routeEntersBody} from '../ibd-movement-routing';
import type {OrthogonalRouteRequest} from '../../views/orthogonal-router';
it('detects descendant world deltas and preserves unrelated authored routes',()=>{
 const nodes=[{id:'assembly',position:{x:10,y:20},data:{}},{id:'part',parentId:'assembly',position:{x:30,y:40},data:{}},{id:'leaf',parentId:'part',position:{x:5,y:6},data:{}}];
 const edges=[{id:'internal',source:'part',target:'leaf',data:{points:[{x:40,y:60},{x:45,y:66}]}},{id:'unrelated',source:'other',target:'outside',data:{points:[{x:500,y:500},{x:600,y:500}]}}];
 const before=captureMovementGeometry(nodes,edges), frozen=structuredClone(before);
 const after=nodes.map(n=>n.id==='assembly'?{...n,position:{x:30,y:30}}:n);
 const requests:OrthogonalRouteRequest[]=[{id:'internal',sourceNodeId:'part',targetNodeId:'leaf',source:{x:60,y:70},target:{x:65,y:76}}, {id:'unrelated',sourceNodeId:'other',targetNodeId:'outside',source:{x:500,y:500},target:{x:600,y:500}}];
 expect([...affectedMovementRoutes(requests,after,before)]).toEqual(['internal']);expect(before).toEqual(frozen);
});
it('detects a moved obstacle blocking a stationary diagonal authored connector',()=>{
 const nodes=[{id:'obstacle',position:{x:200,y:0},width:30,height:30,data:{}}],edges=[{id:'line',source:'a',target:'b',data:{points:[{x:0,y:0},{x:100,y:100}]}}];
 const before=captureMovementGeometry(nodes,edges),request:OrthogonalRouteRequest={id:'line',sourceNodeId:'a',targetNodeId:'b',source:{x:0,y:0},target:{x:100,y:100}};
 expect(affectedMovementRoutes([request],[{...nodes[0],position:{x:40,y:40}}],before).has('line')).toBe(true);
 expect(affectedMovementRoutes([{...request,sourceAncestorIds:['obstacle']}],[{...nodes[0],position:{x:40,y:40}}],before).size).toBe(0);
 expect(routeEntersBody([{x:0,y:40},{x:100,y:40}],{id:'touch',x:40,y:40,width:30,height:30})).toBe(false);
});
it('treats a changed port face at the same point as affected',()=>{
 const before=captureMovementGeometry([],[{id:'line',source:'a',target:'b',data:{points:[{x:0,y:0},{x:100,y:0}],sourceSide:'right',targetSide:'left'}}]);
 expect(affectedMovementRoutes([{id:'line',sourceNodeId:'a',targetNodeId:'b',source:{x:0,y:0},target:{x:100,y:0},sourceSide:'top',targetSide:'left'}],[],before).has('line')).toBe(true);
});

it('reroutes a stationary connector blocked by a resized body without moving its child',()=>{
 const nodes=[{id:'body',position:{x:20,y:20},width:20,height:60,data:{}},{id:'child',parentId:'body',position:{x:2,y:3},width:5,height:5,data:{}}];
 const points=[{x:60,y:0},{x:60,y:100}];
 const before=captureMovementGeometry(nodes,[{id:'line',source:'a',target:'b',data:{points}}]);
 const request:OrthogonalRouteRequest={id:'line',sourceNodeId:'a',targetNodeId:'b',source:points[0],target:points[1]};
 expect(affectedMovementRoutes([request],nodes,before).size).toBe(0);
 const resized=[{...nodes[0],width:60},nodes[1]];
 expect(affectedMovementRoutes([request],resized,before).has('line')).toBe(true);
 expect(resized[1].position).toEqual(before.nodes[1].position);
});

it('detects an expanded endpoint owner swallowing an otherwise stationary route interior',()=>{
 const points=[{x:-16,y:50},{x:-40,y:50},{x:-40,y:150},{x:150,y:150},{x:150,y:50},{x:300,y:50}];
 const node={id:'owner',position:{x:0,y:0},width:100,height:100,data:{}};
 const before=captureMovementGeometry([node],[{id:'wire',source:'owner',target:'peer',data:{points,sourceSide:'left',targetSide:'left'}}]);
 const request:OrthogonalRouteRequest={id:'wire',sourceNodeId:'owner',targetNodeId:'peer',source:points[0],target:points[points.length-1],sourceSide:'left',targetSide:'left'};
 expect(routeEntersBody(points,{id:'owner',x:0,y:0,width:100,height:100})).toBe(false);
 expect(routeEntersBody(points,{id:'owner',x:0,y:0,width:200,height:100})).toBe(true);
 expect(affectedMovementRoutes([request],[{...node,width:200}],before).has('wire')).toBe(true);
});

it('reroutes a stationary connector that a moved port now sits on, but not the port\'s own connector',()=>{
 const port={id:'p',x:40,y:-16,size:32,side:'top'};
 const node={id:'owner',position:{x:0,y:100},width:120,height:80,data:{ports:[port]}};
 const passing=[{x:0,y:90},{x:200,y:90}], own=[{x:56,y:84},{x:56,y:20}];
 const before=captureMovementGeometry([{...node,data:{ports:[{...port,x:-16,y:20,side:'left'}]}}],[{id:'passing',source:'a',target:'b',data:{points:passing}},{id:'own',source:'owner',target:'c',data:{points:own}}]);
 const requests:OrthogonalRouteRequest[]=[{id:'passing',sourceNodeId:'a',targetNodeId:'b',source:passing[0],target:passing[1]},{id:'own',sourceNodeId:'owner',targetNodeId:'c',source:own[0],target:own[1]}];
 expect([...affectedMovementRoutes(requests,[node],before)]).toEqual(['passing']);
});

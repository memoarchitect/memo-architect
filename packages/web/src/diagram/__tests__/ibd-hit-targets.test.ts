import { describe, it, expect } from 'vitest';
import { unionHitRects, ibdEdgeHitClip, type HitRect } from '../ibd-hit-targets';
describe('IBD acquisition exclusion union', () => {
 it('unions overlapping body, port and grip exclusions without cancelling holes', () => {
  const input=[{x:-10,y:0,width:20,height:20},{x:0,y:10,width:20,height:20},{x:5,y:5,width:10,height:10}];
  const union=unionHitRects(input);
  for(let y=-5;y<35;y+=.5)for(let x=-15;x<25;x+=.5){
   const inside=(r: HitRect)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
   expect(union.filter(inside).length).toBe(input.some(inside)?1:0);
  }
 });
 it('uses nested offsets, style-only dimensions and zoom-scaled selected controls', () => {
  const nodes:any[]=[{id:'p',type:'ibd',position:{x:-40,y:-200},width:500,height:400,data:{isContainer:true}},
   {id:'c',type:'ibd',parentId:'p',position:{x:100,y:280},style:{width:200,height:100},selected:true,data:{ports:[]}}];
  expect(ibdEdgeHitClip(nodes,.5)).toContain('M 14 34 h 292');
  expect(ibdEdgeHitClip(nodes,1)).toContain('M 37 57 h 246');
 });
 it('keeps container interiors available for connector editing', () => {
  const nodes:any[]=[{id:'p',type:'ibd',position:{x:0,y:0},width:500,height:400,data:{isContainer:true}}];
  const path=ibdEdgeHitClip(nodes,1);
  expect(path).toContain('M -1 -1 h 502 v 59');
  expect(path).not.toContain('v 402');
 });
});

import {describe,it,expect} from 'vitest';
import {legalPortSlot} from '../ibd-port-constraints';
describe('bounded port movement',()=>{
 it('stops at occupied slots without growing or displacing the owner or peers',()=>{
  const peers=[{id:'a',side:'left' as const,x:-16,y:58,size:32},{id:'b',side:'left' as const,x:-16,y:112,size:32}];
  const p=legalPortSlot(peers[0],peers,'left',123,329,162);
  expect(p).toEqual({x:-16,y:68,side:'left'});expect(peers[1].y).toBe(112);
 });
 it('uses fixed corner/title clearance on all four walls and deterministic nearest gaps',()=>{
  const p={id:'p',side:'left' as const,x:-16,y:58,size:32};
  expect(legalPortSlot(p,[p],'right',1000,220,180)).toEqual({x:204,y:136,side:'right'});
  expect(legalPortSlot(p,[p],'top',-100,220,180)).toEqual({x:12,y:-16,side:'top'});
  expect(legalPortSlot(p,[p],'bottom',1000,220,180)).toEqual({x:176,y:164,side:'bottom'});
  expect(legalPortSlot(p,[p],'left',-100,220,180)?.y).toBe(58);
 });
 it('rejects a crowded wall, allowing the caller to retain the previous slot',()=>{
  const p={id:'p',side:'left' as const,x:-16,y:58,size:32};
  expect(legalPortSlot(p,[p,{...p,id:'busy',y:58}],'left',80,100,110)).toBeNull();
 });
 it('clamps around measured title/caption exclusions and rejects a wall outside its ancestor',()=>{
  const p={id:'p',side:'left' as const,x:-16,y:58,size:32};
  expect(legalPortSlot(p,[p],'top',12,220,180,{envelopes:[{x:1,y:3,width:32,height:32}],exclusions:[{x:10,y:12,width:80,height:18}]})).toEqual({x:93,y:-16,side:'top'});
  expect(legalPortSlot(p,[p],'top',12,220,180,{envelopes:[{x:0,y:-100,width:100,height:20}],exclusions:[],containment:{x:-60,y:-90,width:650,height:500}})).toBeNull();
 });

});

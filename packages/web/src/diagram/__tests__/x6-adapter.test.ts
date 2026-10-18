import { describe, it, expect } from 'vitest';
import { x6InitialFrames, x6PortCenter, x6PortSlot, x6Terminal, x6Interiors, saveX6Snapshot, x6Route, X6History, x6History, type X6Snapshot } from '../renderers/x6/x6-adapter';
const snapshot = (): X6Snapshot => ({ nodes: { p: { x: 10.25, y: -4.5 } }, ports: { p: { out: { x: 84, y: 20.25, side: 'right' } } }, edges: { e: [{ x: 14.5, y: 17.25 }] }, attachments: { e: { source: { cell: 'p', port: 'out' }, target: { cell: 'q' } } }, routing: { type: 'arc', mode: 'manual' }, autoLayout: false });
describe('explicit X6 adapters', () => {
 it('imports nested shared placement to absolute native coordinates without rewriting the shared scene', () => {
  const scene = { nodes: [{ id:'child',parentId:'parent',position:{x:3,y:4},data:{} },{id:'parent',position:{x:-20,y:5},data:{}}],edges:[] };
  const saved={nodes:{parent:{x:30.5,y:-10},child:{x:4.25,y:9}},edges:{}};
  expect(x6InitialFrames(scene,saved).child).toMatchObject({x:34.75,y:-1});
  expect(x6InitialFrames(scene,{...saved,canvas:{x6:{nodes:{child:{x:77.75,y:-22}}}}}).child.x).toBe(77.75);
  expect(saved.nodes.child.x).toBe(4.25);
  expect(()=>x6InitialFrames({...scene,nodes:[scene.nodes[0]]})).toThrow('parent');
 });
 it('reuses saved coordinate-frame migration, leaving unknown legacy frames alone',()=>{
  const scene={nodes:[{id:'parent',position:{x:30,y:40},data:{}},{id:'child',parentId:'parent',position:{x:3,y:4},data:{}}],edges:[]};
  expect(x6InitialFrames(scene,{nodes:{child:{x:200.25,y:150.5,parent:null}},edges:{}}).child).toMatchObject({x:200.25,y:150.5});
  expect(x6InitialFrames(scene,{nodes:{child:{x:8.5,y:9.5}},edges:{}}).child).toMatchObject({x:38.5,y:49.5});
  expect(x6InitialFrames(scene,{nodes:{old:{x:80,y:90},child:{x:8.5,y:9.5,parent:'old'}},edges:{}}).child).toMatchObject({x:88.5,y:99.5});
 });
 it('round trips fractional top-left slots and explicitly maps physical endpoint identities and interiors',()=>{
  expect(x6PortSlot(x6PortCenter({x:-16,y:20.25},32),32,'left')).toEqual({x:-16,y:20.25,side:'left'});
  expect(x6Terminal('part','out__inner')).toEqual({cell:'part',port:'out'});
  const layout={nodes:{},edges:{e:{points:[{x:1,y:2},{x:4.5,y:6},{x:9,y:10}]}}};
  expect(x6Interiors('e',layout)).toEqual([{x:4.5,y:6}]);
  expect(x6Interiors('e',{...layout,canvas:{x6:{nodes:{},edges:{e:[]}}}})).toEqual([]);
 });
 it('preserves unknown/native/shared data and settings-only ownership',()=>{
  const previous={nodes:{shared:{x:1,y:2}},edges:{e:{points:[{x:9,y:10}]}},future:{value:1},canvas:{autoLayout:true,jointjs:{nodes:{j:{x:2,y:4}}},x6:{nodes:{p:{x:0,y:0,future:'keep'}},future:'native'},future:'canvas'}};
  const settings=saveX6Snapshot(previous,snapshot(),false);
  expect(settings.canvas?.autoLayout).toBe(true);expect(settings.canvas?.x6).toEqual(previous.canvas.x6);
  const saved=saveX6Snapshot(previous,snapshot(),true) as typeof previous;
  expect(saved.future).toEqual(previous.future);expect(saved.nodes).toEqual(previous.nodes);expect(saved.edges).toEqual(previous.edges);
  expect(saved.canvas.jointjs).toEqual(previous.canvas.jointjs);expect(saved.canvas.x6.nodes.p).toMatchObject({x:10.25,future:'keep'});
  expect(saved.canvas.x6.future).toBe('native');expect(saved.canvas.autoLayout).toBe(false);
 });
 it('labels native approximations and keeps manual vertices independent of type',()=>{
  expect(x6Route('arc','automatic').description).toContain('approximation');
  expect(x6Route('elbow','automatic').description).toContain('no distinct');
  expect(x6Route('curved','manual').router).toBe('normal');
  expect(x6Route('manhattan','automatic').router).toBe('memo-ibd-manhattan');
 });
 it('keeps immutable one-entry history scoped by model and diagram with no native callbacks',()=>{
  const model={};const h=x6History(model,'a');const before=snapshot(),after=snapshot();after.nodes.p.x=29.75;
  expect(h.push(before,before,true)).toBe(false);expect(h.push(before,after,true)).toBe(true);
  before.nodes.p.x=999;expect(h.step('undo')?.snapshot.nodes.p.x).toBe(10.25);
  expect(h.step('redo')?.snapshot.nodes.p.x).toBe(29.75);expect(h.undo).toHaveLength(1);
  expect(x6History(model,'a')).toBe(h);expect(x6History(model,'b').step('undo')).toBeUndefined();expect(x6History({},'a')).not.toBe(h);
  expect(new X6History().step('redo')).toBeUndefined();
 });
});

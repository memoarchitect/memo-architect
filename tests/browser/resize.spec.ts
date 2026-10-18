import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLayoutSource as parse } from './fixture-layout.mjs';
const out = resolve(process.env.MEMO_BASELINE_OUTPUT!);
const state = (page) => page.evaluate(() => (window as any).baselineNodes());
const byId = (nodes,id) => nodes.find(n => n.id === id);
const absolute = (nodes,id) => { const n=byId(nodes,id); let x=n.position.x,y=n.position.y,p=n.parentId;
 while(p){const parent=byId(nodes,p);x+=parent.position.x;y+=parent.position.y;p=parent.parentId;}return {x,y}; };
const directions = { n:'.top.line',ne:'.top.right.handle',e:'.right.line',se:'.bottom.right.handle',s:'.bottom.line',sw:'.bottom.left.handle',w:'.left.line',nw:'.top.left.handle' };
async function gesture(page, node, direction, dx, dy, reverse?) {
 const grip=node.locator('.react-flow__resize-control'+directions[direction]);
 const b=await grip.boundingBox(); expect(b).not.toBeNull();
 const point={x:b!.x+b!.width/2,y:b!.y+b!.height/2};
 const acquired=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('.react-flow__resize-control')?.closest('.react-flow__node')?.getAttribute('data-id'),point);
 const owner=await node.getAttribute('data-id');
 const evidence=resolve(out,'session4-acquisition.json');
 const entries=existsSync(evidence)?JSON.parse(readFileSync(evidence,'utf8')):[];
 const hit=await page.evaluate(p=>{const e=document.elementFromPoint(p.x,p.y);return{tag:e?.tagName,class:e?.className,title:e?.getAttribute('title')}} ,point);
 entries.push({owner,direction,point,acquired,hit});writeFileSync(evidence,JSON.stringify(entries,null,2));
 if(acquired!==owner)await page.screenshot({path:resolve(out,`session4-blocked-${owner?.replaceAll(':','-')}-${direction}.png`)});
 expect.soft(acquired, `ordinary pointer target must acquire ${owner} ${direction} grip`).toBe(owner);
 if(acquired!==owner)return false;
 await page.mouse.move(point.x,point.y);await page.mouse.down();
 await page.mouse.move(point.x+dx,point.y+dy,{steps:8});
 if(reverse)await page.mouse.move(point.x+reverse.x,point.y+reverse.y,{steps:4});
 await page.mouse.up();
 return true;
}
for (const [width,height,zoom] of [[1440,900,.7],[1800,1200,1]]) {
 test(`eight directions, containment and reversal ${width}x${height} zoom ${zoom}`,async({page})=>{
 await page.setViewportSize({width,height});
 const observations=[];
 for(const id of ['nested','parent','grand'])for(const direction of Object.keys(directions)) {
  await page.goto(`/pilot-baseline/index.html?zoom=${zoom}`);
  const node=page.locator(`.react-flow__node[data-id="${id}"]`);
  await node.click({position:{x:60,y:30}});
  await expect(node).toHaveClass(/selected/);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await state(page);
  const dx=direction.includes('w')?-10:direction.includes('e')?10:0;
  const dy=direction.includes('n')?-10:direction.includes('s')?10:0;
  writeFileSync(resolve(out,`session4-current-${width}.json`),JSON.stringify({id,direction,before,observations},null,2));
  if(!await gesture(page,node,direction,dx*zoom,dy*zoom)){observations.push({id,direction,blocked:true,before});continue;}
  await expect.poll(async()=>byId(await state(page),id).width+byId(await state(page),id).height).toBeGreaterThan(byId(before,id).width+byId(before,id).height+5);
  const after=await state(page);
  if(id==='parent'||id==='grand')for(const child of (id==='grand'?['parent','nested','sibling']:['nested','sibling']))expect(absolute(after,child)).toEqual(absolute(before,child));
  observations.push({id,direction,before,after});
 }
 await page.goto(`/pilot-baseline/index.html?zoom=${zoom}`);
 const nested=page.locator('.react-flow__node[data-id="nested"]');await nested.click({position:{x:60,y:30}});
 await gesture(page,nested,'e',100*zoom,0,{x:20*zoom,y:0});
 expect(byId(await state(page),'nested').width).toBeCloseTo(220,3);
 await gesture(page,nested,'e',100*zoom,0);
 expect(byId(await state(page),'nested').width).toBeCloseTo(246,3);
 const floor=page.locator('.react-flow__node[data-id="floor"]');await floor.click({position:{x:60,y:30}});
 await gesture(page,floor,'se',-40*zoom,-20*zoom);
 expect(byId(await state(page),'floor').width).toBeCloseTo(200,3);
 const beforeCancel=await state(page);
 const b=await floor.locator('.react-flow__resize-control.bottom.right.handle').boundingBox();
 await page.mouse.move(b!.x+5,b!.y+5);await page.mouse.down();await page.mouse.move(b!.x+20,b!.y+20,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();
 expect(byId(await state(page),'floor')).toEqual(byId(beforeCancel,'floor'));
 await page.screenshot({path:resolve(out,`session4-geometry-${width}-${zoom}.png`)});
 writeFileSync(resolve(out,`session4-geometry-${width}-${zoom}.json`),JSON.stringify(observations,null,2));
 });
}

test('resize transaction, acknowledged disk save, undo redo and reload', async ({page})=>{
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));expect(runtime.session4Seed).toBe(true);
 const disk=()=>parse(readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8')).layouts.vehicleRoutingPilot;
 const beforeDisk=disk(),sent:any[]=[],saved:any[]=[];
 page.on('websocket',ws=>{
  ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')sent.push(m.payload)});
  ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:saved')saved.push({...m.payload,disk:disk()})});
 });
 await page.goto('/');await page.getByRole('button',{name:'Skip tour'}).click();
 await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle routing comparison',{exact:true}).first().click();
 await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 const nodes=page.locator('.react-flow__node');
 const engine=nodes.filter({has:page.getByText('Engine',{exact:true})}).first();
 const powertrain=nodes.filter({has:page.getByText('Powertrain',{exact:true})}).first();
 const geometry=()=>nodes.evaluateAll(es=>Object.fromEntries(es.map(e=>[e.getAttribute('data-id'),{width:(e as HTMLElement).style.width,height:(e as HTMLElement).style.height,transform:(e as HTMLElement).style.transform}])));
 const waitSaved=async(count:number)=>{
  await expect.poll(()=>sent.length).toBeGreaterThan(count);
  await expect.poll(()=>saved.some(s=>s.requestId===sent.at(-1)?.requestId)).toBe(true);
  expect(saved.find(s=>s.requestId===sent.at(-1).requestId).error).toBeUndefined();
  return disk();
 };
 const observations=[];
 const cases=[{node:engine,direction:'se',dx:-5,dy:-5},...[engine,powertrain].flatMap(node=>Object.keys(directions).map(direction=>({node,direction,
  dx:direction.includes('w')?-5:direction.includes('e')?5:0,
  dy:direction.includes('n')?-5:direction.includes('s')?5:0})))];
 for(const {node,direction,dx,dy} of cases){
  await node.click({position:{x:45,y:15}});await expect(node).toHaveClass(/selected/);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await geometry(),startDisk=disk(),count=sent.length;
  if(!await gesture(page,node,direction,node===engine&&direction==='e'?100:dx,dy,node===engine&&direction==='e'?{x:dx,y:dy}:undefined)){observations.push({direction,blocked:true});continue;}
  await expect.poll(geometry).not.toEqual(before);
  const after=await geometry();const final=await waitSaved(count);
  expect(final.canvas.routingMode).toBe('automatic');expect(final.canvas.autoLayout).toBe(false);
  expect(final.futureLayout).toEqual(beforeDisk.futureLayout);
  expect(final.canvas.jointjs).toEqual(beforeDisk.canvas.jointjs);expect(final.canvas.x6).toEqual(beforeDisk.canvas.x6);
  const countUndo=sent.length;await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();
  await expect.poll(geometry).toEqual(before);await waitSaved(countUndo);
  const countRedo=sent.length;await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();
  await expect.poll(geometry).toEqual(after);const redo=await waitSaved(countRedo);
  const id=await node.getAttribute('data-id');
  if(node===powertrain){
   for(const [child,entry]of Object.entries<any>(redo.nodes))if(entry.parent===id){
    expect(after[child].transform).toEqual(before[child].transform);
    expect(entry.x+redo.nodes[id!].x).toBeCloseTo(startDisk.nodes[child].x+startDisk.nodes[id!].x,4);
    expect(entry.y+redo.nodes[id!].y).toBeCloseTo(startDisk.nodes[child].y+startDisk.nodes[id!].y,4);
   }
  }
  observations.push({id,direction,before,after,final,redo});
  writeFileSync(resolve(out,'session4-save-observations.json'),JSON.stringify({observations,sent,saved},null,2));
  if(direction!=='nw'||node===engine){
   const countRestore=sent.length;await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();
   await expect.poll(geometry).toEqual(before);await waitSaved(countRestore);
  }
 }
 const beforeCancel=await geometry(),cancelDisk=disk(),cancelSends=sent.length;
 const grip=powertrain.locator('.react-flow__resize-control.top.left.handle');const b=await grip.boundingBox();
 const point={x:b!.x+b!.width/2,y:b!.y+b!.height/2};
 const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('.react-flow__resize-control')?.closest('.react-flow__node')?.getAttribute('data-id'),point);
 expect.soft(hit,'cancel gesture must acquire the existing container grip').toBe(await powertrain.getAttribute('data-id'));
 if(hit===await powertrain.getAttribute('data-id')){
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-5,point.y-5,{steps:4});
  await page.keyboard.press('Escape');await page.mouse.up();await expect.poll(geometry).toEqual(beforeCancel);
  await page.waitForTimeout(450);expect(sent.length).toBe(cancelSends);expect(disk()).toEqual(cancelDisk);
 }
 const finalGeometry=await geometry(),finalDisk=disk();
 await page.screenshot({path:resolve(out,'session4-persistence.png')});
 await page.reload();await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 await expect.poll(geometry).toEqual(finalGeometry);expect(disk()).toEqual(finalDisk);
 await expect(page.getByLabel('IBD routing mode')).toHaveValue('automatic');
 await page.screenshot({path:resolve(out,'session4-reload.png')});
 writeFileSync(resolve(out,'session4-save-observations.json'),JSON.stringify({observations,sent,saved,finalDisk},null,2));
});

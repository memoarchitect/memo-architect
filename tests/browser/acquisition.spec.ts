import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLayoutSource as parse } from './fixture-layout.mjs';
const out=resolve(process.env.MEMO_BASELINE_OUTPUT!);
async function hit(page,locator){
 let point:{x:number;y:number}|undefined;
 await expect.poll(async()=>locator.evaluate(e=>{const b=e.getBoundingClientRect();const p={x:b.x+b.width/2,y:b.y+b.height/2};const hit=document.elementFromPoint(p.x,p.y);return{p,reachable:e===hit||e.contains(hit)};}).then(r=>{point=r.p;return r.reachable;}),{message:'ordinary pointer target is reachable'}).toBe(true);
 return point!;
}
async function open(page){await page.goto('/');await page.getByRole('button',{name:'Skip tour'}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle routing comparison',{exact:true}).first().click();await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});}
const uiState=page=>page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');const s=useModelStore.getState();return {port:s.canvasPortSelection,element:s.selectedElementId,relationship:s.selectedRelationshipId,collapsed:s.propertiesPanelCollapsed};});
for(const [width,height] of [[1440,900],[1800,1200]])for(const zoom of [.5,1,1.5,'fit']){
 test(`corner port and eight distinct owner grips ${width}x${height} zoom ${zoom}`,async({page})=>{
  await page.setViewportSize({width,height});await page.goto(`/pilot-baseline/index.html?acquisition=1&zoom=${zoom==='fit'?.7:zoom}`);if(zoom==='fit')await page.locator('.react-flow__controls-fitview').click();
  const node=page.locator('.react-flow__node[data-id="port"]');await node.click({position:{x:50,y:25}});await expect(node).toHaveClass(/selected/);
  await expect(page.locator('.ibd-port-resize-handle')).toHaveCount(0);
  const grips=node.locator('.react-flow__resize-control');await expect(grips).toHaveCount(8);
  const evidence=[];for(const grip of await grips.all())evidence.push({class:await grip.getAttribute('class'),point:await hit(page,grip)});
  for(const denseId of ['dense-upper','dense-lower']) {
   const dense=node.locator(`[data-ibd-port="${denseId}"]`);
   const squarePoint=await hit(page,dense.locator('.ibd-port-connect.target'));await page.mouse.click(squarePoint.x,squarePoint.y);
   expect((await uiState(page)).port).toBe(denseId);
   const captionPoint=await hit(page,dense.locator('[data-ibd-caption]'));await page.mouse.click(captionPoint.x,captionPoint.y);
   expect((await uiState(page)).port).toBe(denseId);
  }
  const port=node.locator('[data-ibd-port="p"]');const square=port.locator('.ibd-port-connect.target');const p=await hit(page,square);
  await page.mouse.click(p.x,p.y);expect((await uiState(page)).port).toBe('p');
  let events=await page.evaluate(()=>(window as any).acquisitionEvents());expect(events.at(-1)).toEqual({type:'select',id:'p'});expect(events.some(e=>e.type==='inspect')).toBe(false);
  await page.mouse.dblclick(p.x,p.y);events=await page.evaluate(()=>(window as any).acquisitionEvents());expect(events.some(e=>e.type==='inspect')).toBe(true);
  const caption=port.locator('[data-ibd-caption]');const labelPoint=await hit(page,caption);
  await page.mouse.move(labelPoint.x,labelPoint.y);await page.mouse.down();await page.mouse.move(labelPoint.x,labelPoint.y-12,{steps:6});await page.mouse.up();
  events=await page.evaluate(()=>(window as any).acquisitionEvents());expect(events.some(e=>e.type==='move')).toBe(true);expect(events.some(e=>e.type==='commit')).toBe(true);
  const source=port.locator('.ibd-port-connect.target');const target=page.locator('[data-ibd-port="p2"] .ibd-port-connect.target');
  const start=await hit(page,source),end=await hit(page,target);
  const prior=events.filter(e=>e.type==='move').length;
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
  events=await page.evaluate(()=>(window as any).acquisitionEvents());expect(events.some(e=>e.type==='connect'&&[e.connection.sourceHandle,e.connection.targetHandle].sort().join(',')==='p,p2')).toBe(true);
  expect(events.filter(e=>e.type==='move').length).toBe(prior);
  await page.screenshot({path:resolve(out,`session5-corner-${width}-${zoom}.png`)});writeFileSync(resolve(out,`session5-corner-${width}-${zoom}.json`),JSON.stringify({evidence,events},null,2));
 });
}
test('port selection Properties explicit size acknowledged persistence undo redo and move',async({page})=>{
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));
 const disk=()=>parse(readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8')).layouts.vehicleRoutingPilot;
 const sent:any[]=[],saved:any[]=[];page.on('websocket',ws=>{ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')sent.push(m.payload);});ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:saved')saved.push({...m.payload,disk:disk()});});});
 await open(page);const engine=page.locator('.react-flow__node').filter({has:page.getByText('Engine',{exact:true})}).first();
 const port=engine.locator('[data-ibd-port]').filter({has:page.getByText('fuelSupplyIn',{exact:true})}).first();const id=await port.getAttribute('data-ibd-port');const owner=await engine.getAttribute('data-id');
 const size=()=>port.evaluate(e=>(e as HTMLElement).offsetWidth);
 const beforeSize=await size(),before=disk(),selectionBefore=await uiState(page),startSends=sent.length;
 const square=port.locator('[data-ibd-port-move]');const point=await hit(page,square);await page.mouse.click(point.x,point.y);
 await expect(page.getByLabel('Port size',{exact:true})).toBeVisible();expect((await uiState(page)).collapsed).toBe(selectionBefore.collapsed);
 expect((await uiState(page)).element).toBe(selectionBefore.element);
 await page.waitForTimeout(450);expect(sent.length).toBe(startSends);
 const waitSave=async(count)=>{await expect.poll(()=>sent.length).toBeGreaterThan(count);await expect.poll(()=>saved.some(s=>s.requestId===sent.at(-1)?.requestId)).toBe(true);expect(saved.find(s=>s.requestId===sent.at(-1).requestId).error).toBeUndefined();return disk();};
 const input=page.getByLabel('Port size',{exact:true});await input.fill(String(beforeSize-2));await input.press('Escape');await input.press('Tab');await page.waitForTimeout(450);expect(sent.length).toBe(startSends);
 await input.fill(String(beforeSize-2));await input.press('Enter');await expect.poll(size).toBe(beforeSize-2);const sized=await waitSave(startSends);
 expect(sized.nodes[owner!].ports[id!].size).toBe(beforeSize-2);expect(sized.canvas.routingMode).toBe(before.canvas.routingMode);expect(sized.futureLayout).toEqual(before.futureLayout);expect(sized.canvas.jointjs).toEqual(before.canvas.jointjs);
 let count=sent.length;await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(size).toBe(beforeSize);await waitSave(count);
 count=sent.length;await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(size).toBe(beforeSize-2);await waitSave(count);
 await page.getByRole('button',{name:'Port Properties',exact:true}).click();expect((await uiState(page)).element).toBe(id);expect((await uiState(page)).collapsed).toBe(false);
 await page.mouse.dblclick((await hit(page,square)).x,(await hit(page,square)).y);expect((await uiState(page)).element).toBe(id);
 const caption=port.locator('[data-ibd-caption]'),movePoint=await hit(page,caption);count=sent.length;const pos=await port.getAttribute('style');
 await page.mouse.move(movePoint.x,movePoint.y);await page.mouse.down();await page.mouse.move(movePoint.x,movePoint.y+8,{steps:6});await page.mouse.up();await expect(port).not.toHaveAttribute('style',pos!);await waitSave(count);
 await engine.click({position:{x:45,y:15}});await expect(engine).toHaveClass(/selected/);
 const geometry=()=>engine.evaluate(e=>({width:(e as HTMLElement).style.width,height:(e as HTMLElement).style.height,transform:(e as HTMLElement).style.transform}));
 const beforeResize=await geometry(),grip=engine.locator('.react-flow__resize-control.bottom.right.handle'),g=await hit(page,grip);count=sent.length;
 await page.mouse.move(g.x,g.y);await page.mouse.down();await page.mouse.move(g.x+5,g.y+5,{steps:6});await page.mouse.up();await expect.poll(geometry).not.toEqual(beforeResize);const afterResize=await geometry();await waitSave(count);
 count=sent.length;await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(geometry).toEqual(beforeResize);await waitSave(count);expect(await size()).toBe(beforeSize-2);
 count=sent.length;await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(geometry).toEqual(afterResize);await waitSave(count);
 const final=disk();await page.screenshot({path:resolve(out,'session5-port-edit.png')});await page.reload();await expect(engine).toBeVisible();await expect.poll(size).toBe(beforeSize-2);expect(disk()).toEqual(final);
 writeFileSync(resolve(out,'session5-port-save.json'),JSON.stringify({before,sized,final,sent,saved},null,2));
});
test('ordinary pan and anchored gentle modifier wheel limits buttons fit fullscreen do not save',async({page})=>{
 const sent:any[]=[];page.on('websocket',ws=>ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')sent.push(m.payload);}));
 await open(page);await page.waitForTimeout(400);const canvas=page.locator('.memo-diagram-canvas');const viewport=()=>page.locator('.react-flow__viewport').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return{x:m.e,y:m.f,zoom:m.a};});
 const b=await canvas.boundingBox(),p={x:Math.round(b!.x+b!.width*.45),y:Math.round(b!.y+b!.height*.7)};await page.mouse.move(p.x,p.y);const before=await viewport(),count=sent.length;
 await page.mouse.wheel(0,60);await expect.poll(viewport).not.toEqual(before);const pan=await viewport();expect(pan.zoom).toBeCloseTo(before.zoom,5);
 await page.keyboard.down('Control');await page.mouse.wheel(0,-40);await page.keyboard.up('Control');await expect.poll(async()=>(await viewport()).zoom).toBeGreaterThan(pan.zoom);
 const after=await viewport(),local={x:p.x-b!.x,y:p.y-b!.y};expect((local.x-after.x)/after.zoom).toBeCloseTo((local.x-pan.x)/pan.zoom,2);expect((local.y-after.y)/after.zoom).toBeCloseTo((local.y-pan.y)/pan.zoom,2);
 expect(after.zoom/pan.zoom).toBeLessThan(1.2);
 for(const delta of [-10000,10000]){await page.keyboard.down('Control');for(let i=0;i<20;i++)await page.mouse.wheel(0,delta);await page.keyboard.up('Control');const v=await viewport();expect(v.zoom).toBeGreaterThanOrEqual(.1);expect(v.zoom).toBeLessThanOrEqual(3);await expect.poll(async()=>(await viewport()).zoom).toBeCloseTo(delta<0?3:.1,5);}
 await page.getByRole('button',{name:'Zoom In',exact:true}).click();await page.getByRole('button',{name:'Zoom Out',exact:true}).click();await page.getByRole('button',{name:'Fit diagram to view',exact:true}).click();
 await page.getByRole('button',{name:'Toggle fullscreen canvas',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.keyboard.press('Escape');
 await page.waitForTimeout(450);expect(sent.length).toBe(count);expect(await page.evaluate(()=>window.visualViewport?.scale)).toBe(1);await page.screenshot({path:resolve(out,'session5-viewport.png')});writeFileSync(resolve(out,'session5-viewport.json'),JSON.stringify({before,pan,after,saves:sent.length-count},null,2));
});

test('read-only embed has no authoring controls or layout writes',async({page})=>{
 const sent:any[]=[];page.on('websocket',ws=>ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')sent.push(m.payload);}));
 await page.goto('/pilot-baseline/isolation.html');await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 const nodes=page.locator('.react-flow__node');const before=await nodes.evaluateAll(es=>es.map(e=>e.getAttribute('style')));
 const engine=nodes.filter({has:page.getByText('Engine',{exact:true})}).first();const body=await engine.boundingBox();await page.mouse.click(body!.x+30,body!.y+20);await page.mouse.dblclick(body!.x+30,body!.y+20);
 const port=engine.locator('[data-ibd-port]').first();const pb=await port.boundingBox();const p={x:pb!.x+pb!.width/2,y:pb!.y+pb!.height/2};
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x,p.y+20,{steps:6});await page.mouse.up();
 await expect(page.locator('.react-flow__resize-control')).toHaveCount(0);await expect(page.getByLabel('Port size',{exact:true})).toHaveCount(0);
 await page.waitForTimeout(450);expect(sent).toHaveLength(0);expect(await nodes.evaluateAll(es=>es.map(e=>e.getAttribute('style')))).toEqual(before);
 await page.screenshot({path:resolve(out,'session5-readonly.png')});
});
test('representative general canvas selection movement undo redo still works',async({page})=>{
 const sent:any[]=[],replies:any[]=[];
 page.on('websocket',socket=>{
  socket.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')sent.push(m.payload);});
  socket.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:saved')replies.push(m.payload);});
 });
 await page.goto('/');await page.getByRole('button',{name:'Skip tour'}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Acquisition general control',{exact:true}).first().click();
 const node=page.locator('.react-flow__node[data-id="memo_vehicle_routing::vehicle"]');await expect(node).toBeVisible({timeout:30000});
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));
 const diagramId=await page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');return useModelStore.getState().selectedDiagramId;});
 const disk=()=>parse(readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8')).layouts[diagramId];
 const saved=async(position:string,autoLayout:boolean,afterCount:number)=>{
  await expect.poll(()=>sent.filter(s=>s.diagramId===diagramId).length).toBeGreaterThan(afterCount);
  await expect.poll(()=>replies.some(r=>r.diagramId===diagramId&&r.requestId===sent.filter(s=>s.diagramId===diagramId).at(-1)?.requestId)).toBe(true);
  const latest=sent.filter(s=>s.diagramId===diagramId).at(-1);expect(replies.find(r=>r.requestId===latest.requestId)?.error).toBeUndefined();
  const xy=position.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)!;
  expect(disk().nodes['memo_vehicle_routing::vehicle']).toMatchObject({x:Number(xy[1]),y:Number(xy[2])});
  expect(disk().canvas.autoLayout).toBe(autoLayout);
 };
 const count=()=>sent.filter(s=>s.diagramId===diagramId).length;
 const transform=()=>node.evaluate(e=>(e as HTMLElement).style.transform);await page.waitForTimeout(400);const before=await transform();const p=await hit(page,node);await page.mouse.click(p.x,p.y);await expect(node).toHaveClass(/selected/);
 let writes=count();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+20,p.y+15,{steps:6});await page.mouse.up();await expect.poll(transform).not.toBe(before);const after=await transform();await saved(after,false,writes);
 writes=count();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(before);await saved(before,true,writes);
 writes=count();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await page.waitForTimeout(450);expect(await transform()).toBe(before);expect(count()).toBe(writes);
 await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(after);await saved(after,false,writes);
 const finalDisk=disk();await page.reload();await expect(node).toBeVisible({timeout:30000});await expect.poll(transform).toBe(after);expect(disk()).toEqual(finalDisk);
 writeFileSync(resolve(out,'session5-general-history.json'),JSON.stringify({before,after,sent,replies,finalDisk},null,2));
 await page.screenshot({path:resolve(out,'session5-general.png')});
});

test('part double-click Properties and automatic/manual connector Properties stay distinct from drill',async({page})=>{
 await open(page);const count=await page.locator('.react-flow__node').count();const engine=page.locator('.react-flow__node').filter({has:page.getByText('Engine',{exact:true})}).first();
 await engine.dblclick({position:{x:45,y:15}});expect((await uiState(page)).element).toBe(await engine.getAttribute('data-id'));expect(await page.locator('.react-flow__node').count()).toBe(count);
 const pick=()=>page.locator('[data-ibd-connector-hit]').evaluateAll(paths=>{for(const p of paths){const path=p as SVGPathElement;for(const f of [.25,.4,.6,.75]){const q=path.getPointAtLength(path.getTotalLength()*f),m=path.getScreenCTM();if(!m)continue;const s=new DOMPoint(q.x,q.y).matrixTransform(m);if(document.elementFromPoint(s.x,s.y)===p)return{x:s.x,y:s.y,id:p.closest('.react-flow__edge')?.getAttribute('data-id')};}}return null;});
 const auto=await pick();expect(auto).not.toBeNull();await page.mouse.dblclick(auto!.x,auto!.y);expect((await uiState(page)).relationship).toBe(auto!.id);
 await page.getByLabel('IBD routing mode').selectOption('manual');const manual=await pick();expect(manual).not.toBeNull();await page.mouse.click(manual!.x,manual!.y,{button:'right'});await page.getByText('Show Properties',{exact:true}).click();expect((await uiState(page)).relationship).toBe(manual!.id);
 const drill=page.getByRole('button',{name:'Drill into Powertrain',exact:true});await hit(page,drill);await drill.click();await expect.poll(()=>page.locator('.react-flow__node').count()).toBeLessThan(count);
 await page.screenshot({path:resolve(out,'session5-properties-drill.png')});
});

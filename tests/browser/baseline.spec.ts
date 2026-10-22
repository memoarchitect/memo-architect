import { parseLayoutSource } from './fixture-layout.mjs';
import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
const out = resolve(process.env.MEMO_BASELINE_OUTPUT ?? 'artifacts/ibd-baseline');
async function capture(page, name) {
 await page.screenshot({path:resolve(out,`${name}.png`)});
 writeFileSync(resolve(out,`${name}.svg.json`),JSON.stringify(await page.locator('svg').evaluateAll(es=>es.map(e=>e.outerHTML)),null,2));
 const routeSvg=await page.evaluate(()=>{const host=document.querySelector('.react-flow__edges');if(host)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2600 2200">${Array.from(host.querySelectorAll('svg')).map(e=>e.innerHTML).join('')}</svg>`;const svgs=Array.from(document.querySelectorAll('svg'));return svgs.sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0]?.outerHTML??'';});
 if(routeSvg)writeFileSync(resolve(out,`${name}.svg`),routeSvg.replaceAll('&nbsp;','&#160;'));
 writeFileSync(resolve(out,`${name}.paths.json`),JSON.stringify(await page.locator('svg path').evaluateAll(es=>es.map(e=>e.getAttribute('d'))),null,2));
}
async function drag(page,locator,dx,dy) {
 const b=await locator.boundingBox(); if(!b)throw new Error('Missing handle');
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down(); await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:10}); await page.mouse.up();
}
const size = (page,id) => page.evaluate(id=>(window as any).baselineNodes().find(n=>n.id===id),id);
test('nested geometry and generated-floor regressions',async({page,browser})=>{
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/pilot-baseline/index.html');
 await expect(page.locator('[data-id="nested"]')).toBeVisible();
 await page.waitForFunction(()=>!!(window as any).baselineNodes);
 writeFileSync(resolve(out,'environment.json'),JSON.stringify({platform:os.platform(),arch:os.arch(),cpus:os.cpus()[0]?.model,cpuCount:os.cpus().length,memory:os.totalmem(),browser:browser.version(),fixture:'repository nested component fixture; actual InterconnectionNode, ReactFlow; no persistence or routing controller'},null,2));
 const node=page.locator('.react-flow__node[data-id="nested"]');
 await node.click({position:{x:60,y:30}});
 const before=await size(page,'nested');
 await drag(page,node.locator('.react-flow__resize-control.handle.bottom.right'),14,0);
 const after=await size(page,'nested');
 await capture(page,'nested-resize');
 // This is a contract assertion, deliberately red until Session 4.
 const floor=page.locator('.react-flow__node[data-id="floor"]');
 await floor.click({position:{x:60,y:30}});
 const floorBefore=await size(page,'floor');
 await drag(page,floor.locator('.react-flow__resize-control.handle.bottom.right'),-28,-14);
 const floorAfter=await size(page,'floor');
 await capture(page,'floor-resize');
 const port=page.locator('.react-flow__node[data-id="port"]');
 await port.click({position:{x:60,y:30}});
 const targets=await port.evaluate(el=>Array.from(el.querySelectorAll('.ibd-port-resize-handle,.react-flow__resize-control')).map(e=>{const b=e.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{class:e.className,rect:{x:b.x,y:b.y,width:b.width,height:b.height},hit:hit?.className,intercepted:hit!==e&&!e.contains(hit)}}));
 await capture(page,'control-targets');
 writeFileSync(resolve(out,'resize-measurements.json'),JSON.stringify({before,after,floorBefore,floorAfter,targets,errors},null,2));
 expect.soft(after.width,'legal nested growth must be accepted').toBeGreaterThan(before.width+5);
 expect.soft(floorAfter.width,'ELK initial footprint must not be a minimum').toBeLessThan(floorBefore.width-5);
 expect.soft(targets.filter(t=>t.intercepted),'selected controls must acquire their target').toHaveLength(0);
});
test('Vehicle runtime core and combined baseline',async({page})=>{
 const movementWarnings:string[]=[];page.on('dialog',async dialog=>{movementWarnings.push(dialog.message());expect(dialog.message()).toContain('replaces manual bends on');await dialog.accept()});
 const errors=[];const consoleMessages=[];const saves=[];const layoutReplies:any[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')consoleMessages.push(m.text())});
 page.on('websocket',ws=>{ws.on('framesent',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')saves.push({time:Date.now(),...m})}catch{}});ws.on('framereceived',e=>{try{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:saved')layoutReplies.push(m.payload)}catch{}})});
 const served=await page.request.get('/src/views/InterconnectionNode.tsx');
 const source=await served.text();expect(source).toContain('resizeIbdNodes');const sources=[];
 for(const path of ['views/InterconnectionNode.tsx','views/DiagramCanvas.tsx','diagram/ibd-resize-integration.ts','diagram/ibd-resize.ts','diagram/ibd-hit-targets.ts','diagram/renderers/interconnection-renderer.tsx','index.css']){
  const response=await page.request.get(`/src/${path}`);expect(response.status()).toBe(200);
  const local=resolve('packages/web/src',path);sources.push({url:response.url(),status:response.status(),httpSha256:createHash('sha256').update(await response.text()).digest('hex'),local,localSha256:createHash('sha256').update(readFileSync(local)).digest('hex')});
 }
 writeFileSync(resolve(out,'served-source.json'),JSON.stringify({url:served.url(),status:served.status(),sha256:createHash('sha256').update(source).digest('hex'),dedicatedSource:'packages/web/src/views/InterconnectionNode.tsx',sources},null,2));
 await page.goto('/');
 await page.waitForTimeout(2500);
 writeFileSync(resolve(out,'vehicle-dom.txt'),await page.locator('body').innerText());
 await capture(page,'vehicle-shell');
 writeFileSync(resolve(out,'vehicle-initial.json'),JSON.stringify({errors,consoleMessages,saves},null,2));
 // Open through actual navigation; do not seed the application store.
 await page.getByRole('button',{name:'Skip tour'}).click();
 await page.getByText('All diagrams',{exact:true}).click();
 await page.waitForTimeout(500);
 writeFileSync(resolve(out,'vehicle-diagrams-dom.txt'),await page.locator('body').innerText());
 const entry=page.getByText('Vehicle routing comparison',{exact:true});
 await entry.first().click();
 await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 await capture(page,'vehicle-core');
 writeFileSync(resolve(out,'vehicle-open-dom.txt'),await page.locator('body').innerText());
 const nodes=page.locator('.react-flow__node');
 const first=nodes.filter({has:page.getByText('Engine',{exact:true})}).first();
 await first.click();
 await capture(page,'vehicle-selection');
 await first.dblclick();
 await capture(page,'vehicle-properties');
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));
 const disk=()=>readdirSync(resolve(runtime.fixture,'model'),{recursive:true}).filter(p=>String(p).endsWith('views.sysml')).map(p=>({path:`model/${p}`,text:readFileSync(resolve(runtime.fixture,'model',String(p)),'utf8')}));
 // Geometry saves/layout echoes are asynchronous. A route snapshot taken
 // during a preceding redo is not that route gesture's starting geometry.
 const settledGeometry=async()=>{
  let previous='',stable=0;
  await expect.poll(async()=>{
   const value=await page.evaluate(()=>JSON.stringify({nodes:[...document.querySelectorAll('.react-flow__node')].map(e=>({id:e.getAttribute('data-id'),transform:(e as HTMLElement).style.transform,width:(e as HTMLElement).style.width,height:(e as HTMLElement).style.height})),paths:[...document.querySelectorAll('.react-flow__edge path.react-flow__edge-path')].map(e=>e.getAttribute('d')),busy:document.body.textContent?.includes('Computing layout…')}));
   stable=!JSON.parse(value).busy&&value===previous?stable+1:0;previous=value;return stable;
  },{intervals:[100],timeout:10000}).toBeGreaterThanOrEqual(4);
 };
 const actions=[];
 const record=async(name,action)=>{let error;try{await action()}catch(e){error=String(e);await capture(page,name.replace(/[^a-z0-9_-]/gi,'-')+'-failure');expect.soft(error,name).toBeUndefined()}actions.push({name,error,saves:saves.length,disk:disk()});writeFileSync(resolve(out,'vehicle-actions.json'),JSON.stringify(actions,null,2));};
 await record('routing seven types',async()=>{for(const type of ['manhattan','orthogonal','straight','elbow','rounded','curved','arc']){await page.getByLabel('IBD routing type').selectOption(type);await expect(page.getByLabel('IBD routing type')).toHaveValue(type);await capture(page,`routing-${type}`);const paths=await page.locator('.react-flow__edge path.react-flow__edge-path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));expect.soft(paths.length).toBeGreaterThan(0);expect.soft(paths.every(p=>p&&!/NaN|Infinity/.test(p))).toBe(true);}});
 await record('routing save on disk',async()=>{await expect.poll(()=>disk().map(x=>parseLayoutSource(x.text).layouts.vehicleRoutingPilot?.canvas?.routingType)).toContain('arc');});
 await record('gentle zoom buttons and fit',async()=>{const before=await page.locator('.react-flow__viewport').getAttribute('style');await page.getByRole('button',{name:'Zoom In',exact:true}).click();await expect(page.locator('.react-flow__viewport')).not.toHaveAttribute('style',before!);await page.getByRole('button',{name:'Fit diagram to view',exact:true}).click();});
 await page.evaluate(()=>{const w=window as any;w.baselinePerf={last:0,samples:[],mutations:0,removedNodes:0};document.addEventListener('pointermove',e=>w.baselinePerf.last=e.buttons===1?e.timeStamp:0);new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')w.baselinePerf.removedNodes+=Array.from(m.removedNodes).filter(n=>(n as Element).matches?.('.react-flow__node')).length;if(m.type==='attributes'&&(m.target as Element).matches('.react-flow__node, .react-flow__edge path')){w.baselinePerf.mutations++;const start=w.baselinePerf.last;if(start&&performance.now()-start<100)requestAnimationFrame(()=>w.baselinePerf.samples.push(performance.now()-start));}}}).observe(document.querySelector('.react-flow__viewport')!,{subtree:true,attributes:true,attributeFilter:['style','d'],childList:true});});
 await record('combined resize',async()=>{await drag(page,first.locator('.react-flow__resize-control.handle.bottom.right'),10,10);await capture(page,'combined-resize');});
 await record('combined port move',async()=>{await drag(page,first.getByText(/fuel.*Command.*In/),0,12);await capture(page,'combined-port');});
 await record('combined line drag and breakpoint',async()=>{
 const point=await page.locator('.react-flow__edge path[stroke="transparent"]').evaluateAll(paths=>{for(const p of paths){const path=p as SVGPathElement;for(const f of [.3,.5,.7]){const q=path.getPointAtLength(path.getTotalLength()*f);const m=path.getScreenCTM();if(!m)continue;const screen=new DOMPoint(q.x,q.y).matrixTransform(m);const hit=document.elementFromPoint(screen.x,screen.y);if(screen.x>320&&screen.x<1100&&screen.y>250&&screen.y<800&&hit===p)return{x:screen.x,y:screen.y};}}return null;});
 expect(point).not.toBeNull();await page.mouse.move(point!.x,point!.y);await page.mouse.down();await page.mouse.move(point!.x+12,point!.y+12,{steps:8});await page.mouse.up();await expect(page.getByLabel('IBD routing mode')).toHaveValue('manual');await page.mouse.dblclick(point!.x+12,point!.y+12);await capture(page,'combined-route');});
 await record('combined part move, undo and redo',async()=>{const transform=()=>first.evaluate(e=>(e as HTMLElement).style.transform);const before=await transform();await drag(page,first,12,0);await expect.poll(transform).not.toBe(before);await settledGeometry();const after=await transform();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(before);await settledGeometry();await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(after);await settledGeometry();await capture(page,'combined-undo-redo');expect(movementWarnings.length).toBeGreaterThan(0);});
 await record('reachable node movement and undo redo',async()=>{
 const point=await first.evaluate(el=>{const b=el.getBoundingClientRect();for(const fy of [.25,.5,.75])for(const fx of [.25,.5,.75]){const x=b.x+b.width*fx,y=b.y+b.height*fy;const hit=document.elementFromPoint(x,y);if(hit?.closest('.react-flow__node')===el&&!hit.closest('.react-flow__resize-control,button,.ibd-port-resize-handle,.react-flow__handle'))return{x,y};}return null;});
 expect(point).not.toBeNull();const transform=()=>first.evaluate(e=>(e as HTMLElement).style.transform);const before=await transform();await page.mouse.move(point!.x,point!.y);await page.mouse.down();await page.mouse.move(point!.x-10,point!.y,{steps:12});await page.mouse.up();await expect.poll(transform).not.toBe(before);await settledGeometry();const after=await transform();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(before);await settledGeometry();await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(transform).toBe(after);await settledGeometry();await capture(page,'reachable-move-undo-redo');});
 await record('route undo and redo independently of part movement',async()=>{
 await settledGeometry();
 await page.evaluate(()=>{window.addEventListener('pointerdown',event=>{const e=event.target as Element;(window as any).session9RouteRecipient={edge:e.closest('.react-flow__edge')?.getAttribute('data-id'),port:e.closest('[data-ibd-port]')?.getAttribute('data-ibd-port'),control:e.closest('.react-flow__resize-control')?.className,tag:e.tagName,line:e.hasAttribute('data-ibd-connector-hit')||e.getAttribute('stroke')==='transparent',class:e.getAttribute('class')};},{capture:true,once:true})});
 const point=await page.locator('.react-flow__edge path[stroke="transparent"]').evaluateAll(paths=>{for(const p of paths){const path=p as SVGPathElement;for(const f of [.3,.5,.7]){const length=path.getTotalLength(),q=path.getPointAtLength(length*f);const m=path.getScreenCTM();if(!m)continue;const scale=Math.hypot(m.a,m.b);if(Math.min(f,1-f)*length*scale<20)continue;const screen=new DOMPoint(q.x,q.y).matrixTransform(m);if(screen.x>320&&screen.x<1100&&screen.y>250&&screen.y<800&&document.elementFromPoint(screen.x,screen.y)===p)return{x:screen.x,y:screen.y,id:p.closest('.react-flow__edge')?.getAttribute('data-id')};}}return null;});
 expect(point).not.toBeNull();const paths=()=>page.locator('.react-flow__edge path.react-flow__edge-path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));const start=await paths();
 await page.mouse.move(point!.x,point!.y);await page.mouse.down();const recipient=await page.evaluate(()=>(window as any).session9RouteRecipient);writeFileSync(resolve(out,'session9-cumulative-route-recipient.json'),JSON.stringify({intended:point,actual:recipient},null,2));await page.mouse.move(point!.x+12,point!.y+12,{steps:8});await page.mouse.up();expect(recipient?.edge,'actual native pointer-down acquires the intended route').toBe(point!.id);expect(recipient?.line,'actual pointer-down acquires a line, not an endpoint updater').toBe(true);
 await expect.poll(paths).not.toEqual(start);const edited=await paths();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(paths).toEqual(start);await capture(page,'route-undo');await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(paths).toEqual(edited);await capture(page,'route-redo');});
 await record('combined save and reload',async()=>{await expect.poll(()=>saves.length).toBeGreaterThan(2);await expect.poll(()=>disk().length).toBeGreaterThan(0);const snapshot=disk();writeFileSync(resolve(out,'saved-layout-before-reload.json'),JSON.stringify(snapshot,null,2));writeFileSync(resolve(out,'performance-before-reload.json'),JSON.stringify(await page.evaluate(()=>(window as any).baselinePerf),null,2));await page.reload();await expect(page.getByLabel('IBD routing type')).toHaveValue('arc');await expect(page.getByLabel('IBD routing mode')).toHaveValue('manual');expect.soft(disk()).toEqual(snapshot);await capture(page,'combined-reload');});
 const perf=JSON.parse(readFileSync(resolve(out,'performance-before-reload.json'),'utf8'));
 // Capture before reload too: reload destroys this test-only observer.
 writeFileSync(resolve(out,'performance.json'),JSON.stringify(perf,null,2));
 const capabilities=[];
 await record('renderer A/B/A smoke and capability observations',async()=>{for(const renderer of ['memo.renderer.jointjs','memo.renderer.x6','memo.renderer.maxgraph','memo.renderer.reactflow']){const previousRequest=saves.at(-1)?.payload.requestId;await page.getByLabel('Renderer for this diagram').selectOption(renderer);await expect(page.getByLabel('Renderer for this diagram')).toHaveValue(renderer);await expect.poll(()=>saves.at(-1)?.payload.requestId).not.toBe(previousRequest);const request=saves.at(-1).payload.requestId;await expect.poll(()=>layoutReplies.some(r=>r.requestId===request&&!r.error)).toBe(true);const readyStarted=Date.now();if(renderer.endsWith('jointjs'))await expect(page.locator('.joint-element').first()).toBeVisible();else if(renderer.endsWith('x6'))await expect(page.locator('.x6-node').first()).toBeVisible();else if(renderer.endsWith('reactflow'))await expect(page.locator('.react-flow__node').first()).toBeVisible();else {await expect(page.getByRole('button',{name:'Export SVG',exact:true})).toBeVisible();await expect.poll(()=>page.locator('svg path').count()).toBeGreaterThan(50);}await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture(page,`renderer-${renderer.split('.').pop()}`);capabilities.push({renderer,readyWaitMs:Date.now()-readyStarted,svg:await page.locator('svg').count(),routingControls:await page.getByLabel('IBD routing type').count(),nodes:await page.locator('.react-flow__node,.joint-element,.x6-node').count()});}await expect(page.locator('.react-flow__node').first()).toBeVisible();});
 await record('explicit drill-down and return',async()=>{const before=await page.locator('.react-flow__node').count();await page.getByTitle('Open Powertrain as its own internal block diagram',{exact:true}).click();await expect.poll(()=>page.locator('.react-flow__node').count()).toBeLessThan(before);await capture(page,'drill-down');await page.reload();await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(before);});
 writeFileSync(resolve(out,'capabilities.json'),JSON.stringify(capabilities,null,2));
 writeFileSync(resolve(out,'vehicle-final.json'),JSON.stringify({errors,consoleMessages,saves,layoutReplies,actions},null,2));
 expect(errors).toEqual([]);
});

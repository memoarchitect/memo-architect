import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLayoutSource as parse } from './fixture-layout.mjs';
import { createHash } from 'node:crypto';
const out=resolve(process.env.MEMO_BASELINE_OUTPUT??'artifacts/ibd-baseline');
test.afterEach(async({page},info)=>{
 if(info.status!==info.expectedStatus){
  const observation=await page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');const {rendererModel}=await import('/src/diagram/renderer-model.ts');const s=useModelStore.getState();return{model:s.model,rendererModel:rendererModel(s.model),native:(window as any).nativeObservations};}).catch(String);
  writeFileSync(resolve(out,`failed-${info.testId}.json`),JSON.stringify(observation,null,2));
 }
});

const X6='memo.renderer.x6',RF='memo.renderer.reactflow',JOINT='memo.renderer.jointjs',MAX='memo.renderer.maxgraph';
const engine='memo_vehicle_routing::vehicle::powertrain::engine';
async function open(page:Page){
 await page.goto('/');await page.getByRole('button',{name:'Skip tour'}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle routing comparison',{exact:true}).first().click();await page.getByLabel('Renderer for this diagram').selectOption(RF);await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
}
async function observe(page:Page){
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));
 const disk=()=>parse(readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8')).layouts;
 // Boot through the ordinary page before requesting transformed source evidence.
 // The source probe's existing 8 s bound is unchanged.
 await page.goto('/');await expect(page.getByRole('button',{name:'Skip tour'})).toBeVisible();
 const sources:any[]=[];
 for(const path of ['diagram/renderers/x6/X6Canvas.tsx','diagram/renderers/x6/x6-adapter.ts','diagram/renderers/jointjs/JointJsCanvas.tsx','diagram/renderers/maxgraph/MaxGraphCanvas.tsx','views/DiagramSurface.tsx']){
  const response=await page.request.get(`/src/${path}`);expect(response.status()).toBe(200);const local=resolve('packages/web/src',path);sources.push({url:response.url(),local,httpSha256:createHash('sha256').update(await response.text()).digest('hex'),localSha256:createHash('sha256').update(readFileSync(local)).digest('hex')});
 }
 const frames:any[]=[];const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>{ws.on('framesent',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:update')frames.push({dir:'sent',...m});});ws.on('framereceived',e=>{const m=JSON.parse(String(e.payload));if(m.type==='diagram:layout:saved')frames.push({dir:'reply',...m,disk:disk()});if(m.type==='model:update'){frames.push({dir:'model',...m});writeFileSync(resolve(out,'model-publications.json'),JSON.stringify(frames.filter(f=>f.dir==='model'),null,2));}});});
 await page.addInitScript(()=>{
  const w=window as any;w.nativeObservations={recipients:[],events:[]};w.nativeIds=new WeakMap();w.nextNativeId=0;
  for(const type of ['pointerdown','pointerup','mousedown','mouseup']) document.addEventListener(type,e=>{const p=e as MouseEvent;w.nativeObservations.recipients.push({type,x:p.clientX,y:p.clientY,target:(e.target as Element)?.outerHTML?.slice(0,600),owner:(e.target as Element)?.closest('.x6-node,.joint-element')?.getAttribute('data-cell-id')??(e.target as Element)?.closest('.joint-element')?.getAttribute('model-id')});},true);
  const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);const ids=new WeakMap();let n=0;
  window.addEventListener=((type:any,fn:any,options:any)=>{if(fn&&!ids.has(fn))ids.set(fn,++n);w.nativeObservations.events.push({op:'add',type,id:fn&&ids.get(fn)});return add(type,fn,options)}) as any;
  window.removeEventListener=((type:any,fn:any,options:any)=>{w.nativeObservations.events.push({op:'remove',type,id:fn&&ids.get(fn)});return remove(type,fn,options)}) as any;
 });
 const saved=async()=>{await expect.poll(()=>{const sent=frames.filter(f=>f.dir==='sent').at(-1);return !!sent&&frames.some(f=>f.dir==='reply'&&f.payload.requestId===sent.payload.requestId&&!f.payload.error)}).toBe(true);return disk().vehicleRoutingPilot;};
 const take=async(name:string)=>{const state=await page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');const s=useModelStore.getState();return {diagram:s.selectedDiagramId,layouts:s.diagramLayouts,port:s.canvasPortSelection,element:s.selectedElementId,relationship:s.selectedRelationshipId};});const dom=await page.locator('svg').evaluateAll(es=>es.map(e=>e.outerHTML));const obs=await page.evaluate(()=>{const w=window as any;return {...w.nativeObservations,observedNativeRootIdentities:w.nextNativeId,activeNativeRoots:document.querySelectorAll('.x6-graph-svg,.joint-paper svg,[data-testid="maxgraph-canvas"] svg').length}});writeFileSync(resolve(out,`${name}.json`),JSON.stringify({runtime,sources,state,dom,obs,frames,disk:disk(),errors},null,2));await page.screenshot({path:resolve(out,`${name}.png`)});return state;};
 return {frames,errors,disk,saved,take};
}
async function instance(page:Page,selector='.x6-graph-svg'){return page.locator(selector).first().evaluate(el=>{const w=window as any;if(!w.nativeIds.has(el))w.nativeIds.set(el,++w.nextNativeId);return w.nativeIds.get(el)});}
async function header(page:Page,selector:string){return page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();for(const fx of [.5,.3,.7])for(const fy of [.1,.2,.3]){const x=b.x+b.width*fx,y=b.y+b.height*fy;const hit=document.elementFromPoint(x,y);if(hit?.closest('.x6-node,.joint-element')===el)return{x,y,recipient:hit.outerHTML.slice(0,200)}}return null});}
async function drag(page:Page,p:{x:number;y:number},dx:number,dy:number){await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:10});await page.mouse.up();}

test('X6 native transactions settings renderer and diagram ownership with acknowledged disk',async({page})=>{
 const o=await observe(page);await open(page);const shared=o.disk().vehicleRoutingPilot;
 await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-node').first()).toBeVisible();const graph=await instance(page);
 const node=page.locator(`.x6-node[data-cell-id="${engine}"]`);const start=await node.getAttribute('transform');const point=await header(page,`.x6-node[data-cell-id="${engine}"]`);expect(point).not.toBeNull();
 const beforeClick=o.frames.filter(f=>f.dir==='sent').length;await page.mouse.click(point!.x,point!.y);await page.waitForTimeout(250);expect(o.frames.filter(f=>f.dir==='sent')).toHaveLength(beforeClick);
 // A no-op click can coincide with the fitted viewport settling. Acquire the
 // actual current header for the drag, and assert the ordinary down recipient.
 const dragPoint=await header(page,`.x6-node[data-cell-id="${engine}"]`);expect(dragPoint).not.toBeNull();
 await drag(page,dragPoint!,24,0);const recipient=await page.evaluate(()=>(window as any).nativeObservations.recipients.filter(e=>e.type==='mousedown').at(-1));expect(recipient.owner).toBe(engine);
 await expect(node).not.toHaveAttribute('transform',start!);const finish=await node.getAttribute('transform');let saved=await o.saved();
 expect(saved.canvas.autoLayout).toBe(false);expect(saved.nodes).toEqual(shared.nodes);expect(saved.edges).toEqual(shared.edges);expect(saved.canvas.jointjs).toEqual(shared.canvas.jointjs);expect(await instance(page)).toBe(graph);
 const native=JSON.parse(JSON.stringify(saved.canvas.x6));await o.take('session7-x6-moved');
 await page.getByRole('button',{name:'Undo X6 edit',exact:true}).click();await expect(node).toHaveAttribute('transform',start!);await o.saved();
 await page.getByRole('button',{name:'Redo X6 edit',exact:true}).click();await expect(node).toHaveAttribute('transform',finish!);await o.saved();
 await page.getByLabel('IBD routing type').selectOption('arc');saved=await o.saved();expect(saved.canvas.x6).toEqual(native);await expect(page.getByRole('status').filter({hasText:'smooth approximation'})).toBeVisible();expect(await instance(page)).toBe(graph);
 await page.getByTitle('Toggle grid',{exact:true}).click();expect(await instance(page)).toBe(graph);
 await page.getByLabel('Renderer for this diagram').selectOption(RF);await expect(page.locator('.react-flow__node').first()).toBeVisible();await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(node).toBeVisible();await expect(node).toHaveAttribute('transform',finish!);await expect(page.getByRole('button',{name:'Undo X6 edit',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Undo X6 edit',exact:true}).click();await expect(page.getByLabel('IBD routing type')).not.toHaveValue('arc');await o.saved();await page.getByRole('button',{name:'Redo X6 edit',exact:true}).click();await o.saved();
 await page.getByRole('button',{name:'MEMO Architect',exact:true}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle reference — default renderer',{exact:true}).first().click();await expect(page.locator('.react-flow__node').first()).toBeVisible();await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-node').first()).toBeVisible();await expect(page.getByRole('button',{name:'Undo X6 edit',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'MEMO Architect',exact:true}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle routing comparison',{exact:true}).first().click();await expect(node).toBeVisible();await expect(node).toHaveAttribute('transform',finish!);expect(o.disk().vehicleRoutingPilot.canvas.x6).toEqual(native);
 for(const renderer of [JOINT,MAX,X6,RF,X6])await page.getByLabel('Renderer for this diagram').selectOption(renderer);await expect(node).toBeVisible();await expect(node).toHaveAttribute('transform',finish!);
 await o.take('session7-x6-switches');await page.reload();await expect(node).toBeVisible();await expect(node).toHaveAttribute('transform',finish!);expect(o.errors).toEqual([]);await o.take('session7-x6-reload');
});

test('X6 active line gesture cancels on Escape and unmount without later stale writes',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-edge').first()).toBeVisible();await o.saved();
 const before=o.disk().vehicleRoutingPilot;const count=o.frames.filter(f=>f.dir==='sent').length;
 const line=await page.locator('.x6-edge path').evaluateAll(es=>{for(const e of es){const p=e as SVGPathElement;if(!p.getTotalLength)continue;for(const f of [.3,.5,.7]){const q=p.getPointAtLength(p.getTotalLength()*f),m=p.getScreenCTM();if(!m)continue;const v=new DOMPoint(q.x,q.y).matrixTransform(m);if(v.x>330&&v.x<1300&&v.y>320&&v.y<800&&document.elementFromPoint(v.x,v.y)===p)return{x:v.x,y:v.y}}}return null});expect(line).not.toBeNull();
 await page.mouse.move(line!.x,line!.y);await page.mouse.down();await page.mouse.move(line!.x+20,line!.y+16,{steps:8});await expect(page.getByLabel('IBD routing mode')).toHaveValue('manual');await page.keyboard.press('Escape');await page.mouse.up();await expect(page.getByLabel('IBD routing mode')).toHaveValue(before.canvas.routingMode??'automatic');await page.waitForTimeout(250);expect(o.frames.filter(f=>f.dir==='sent')).toHaveLength(count);
 await page.mouse.move(line!.x,line!.y);await page.mouse.down();await page.mouse.move(line!.x+16,line!.y+12,{steps:8});await page.keyboard.press('Tab');
 // Keyboard selection switches the renderer during an active native gesture.
 await page.getByLabel('Renderer for this diagram').selectOption(RF);await page.mouse.up();await expect(page.locator('.x6-node')).toHaveCount(0);await page.mouse.move(900,700);await page.waitForTimeout(400);
 const saved=await o.saved();expect(saved.canvas.x6).toEqual(before.canvas.x6);expect(o.errors).toEqual([]);await o.take('session7-x6-unmount');
});

test('JointJS ordinary movement port selection tool cleanup and native snapshot ownership audit',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(JOINT);await expect(page.locator('.joint-element').first()).toBeVisible();await o.saved();
 const selector=`.joint-element[model-id="${engine}"]`;const node=page.locator(selector);const point=await header(page,selector);expect(point).not.toBeNull();
 const graph=await instance(page,'.joint-paper svg');const before=await node.getAttribute('transform');const startSaves=o.frames.filter(f=>f.dir==='sent').length;
 await page.mouse.click(point!.x,point!.y);await page.waitForTimeout(250);expect.soft(o.frames.filter(f=>f.dir==='sent').length,'JointJS selection alone must not save').toBe(startSaves);
 await drag(page,point!,18,0);await expect(node).not.toHaveAttribute('transform',before!);await o.saved();expect(await instance(page,'.joint-paper svg')).toBe(graph);
 let native=o.disk().vehicleRoutingPilot.canvas.jointjs;await o.take('session7-joint-moved');
 const port=node.locator('[port] [joint-selector="portBody"]').first();if(await port.count()){
  const b=await port.boundingBox();expect(b).not.toBeNull();const count=o.frames.filter(f=>f.dir==='sent').length;await page.mouse.click(b!.x+b!.width/2,b!.y+b!.height/2);await page.waitForTimeout(250);expect.soft(o.frames.filter(f=>f.dir==='sent').length,'JointJS port click must not save').toBe(count);await drag(page,{x:b!.x+b!.width/2,y:b!.y+b!.height/2},0,12);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBeGreaterThan(count);await o.saved();expect(o.disk().vehicleRoutingPilot.canvas.jointjs.nodes).not.toEqual(native.nodes);native=o.disk().vehicleRoutingPilot.canvas.jointjs;
 }
 await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-node').first()).toBeVisible();await page.getByLabel('Renderer for this diagram').selectOption(JOINT);await expect(node).toBeVisible();expect(o.disk().vehicleRoutingPilot.canvas.jointjs).toEqual(native);await o.take('session7-joint-return');await page.getByRole('button',{name:'Show or hide Toolbar',exact:true}).click();const grid=page.getByTitle('Show or hide the canvas grid and snapping (⌘⇧G)',{exact:true});const paper=await instance(page,'.joint-paper svg');await grid.click();expect(await instance(page,'.joint-paper svg')).toBe(paper);
 const active=node.locator('[port] [joint-selector="portBody"]').first();const bounds=await active.boundingBox();expect(bounds).not.toBeNull();await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await page.mouse.down();await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2+12,{steps:8});await page.getByLabel('Renderer for this diagram').selectOption(RF);await page.mouse.up();await o.saved();expect(o.disk().vehicleRoutingPilot.canvas.jointjs).toEqual(native);await o.take('session7-joint-unmount');expect(o.errors).toEqual([]);
});

test('maxGraph ordinary movement selection and reset preserve other renderer namespaces',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(MAX);await expect(page.getByRole('button',{name:'Export SVG',exact:true})).toBeVisible();await expect(page.getByText('Engine',{exact:true}).first()).toBeVisible();await o.saved();const graph=await instance(page,'[data-testid="maxgraph-canvas"] svg');
 const before=o.disk().vehicleRoutingPilot;const label=page.getByText('Engine',{exact:true}).first();const b=await label.boundingBox();expect(b).not.toBeNull();await page.mouse.click(b!.x+b!.width/2,b!.y-20);await drag(page,{x:b!.x+b!.width/2,y:b!.y-20},30,10);await expect.poll(()=>o.disk().vehicleRoutingPilot.nodes).not.toEqual(before.nodes);await o.saved();const moved=o.disk().vehicleRoutingPilot;expect(await instance(page,'[data-testid="maxgraph-canvas"] svg')).toBe(graph);expect(moved.nodes).not.toEqual(before.nodes);expect(moved.canvas.jointjs).toEqual(before.canvas.jointjs);expect(moved.canvas.x6).toEqual(before.canvas.x6);await o.take('session7-max-moved');
 await page.getByRole('button',{name:'Auto layout',exact:true}).click();await o.saved();const reset=o.disk().vehicleRoutingPilot;expect(reset.edges).toEqual(moved.edges);expect.soft(reset.canvas.jointjs).toEqual(moved.canvas.jointjs);expect.soft(reset.canvas.x6).toEqual(moved.canvas.x6);expect.soft(reset.futureLayout).toEqual(moved.futureLayout);expect.soft(reset.canvas.futureCanvas).toEqual(moved.canvas.futureCanvas);await o.take('session7-max-reset');expect(o.errors).toEqual([]);
});

test('X6 line and port commits own one history entry preserve authored interiors and clear selection tools',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-node').first()).toBeVisible();
 await page.getByLabel('IBD routing type').selectOption('straight');await page.getByLabel('IBD routing mode').selectOption('automatic');await o.saved();
 const graph=await instance(page);const paths=()=>page.locator('.x6-edge path[stroke="transparent"]').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
 const initialPaths=await paths();
 const point=await page.locator('.x6-edge path[stroke="transparent"]').evaluateAll(es=>{for(const e of es){const p=e as SVGPathElement;for(const f of [.2,.4,.6,.8]){const q=p.getPointAtLength(p.getTotalLength()*f),m=p.getScreenCTM();if(!m)continue;const v=new DOMPoint(q.x,q.y).matrixTransform(m);if(v.x>330&&v.x<1300&&v.y>320&&v.y<800&&document.elementFromPoint(v.x,v.y)===p)return{x:v.x,y:v.y}}}return null});expect(point).not.toBeNull();
 const count=o.frames.filter(f=>f.dir==='sent').length;await drag(page,point!,20,14);await expect(page.getByLabel('IBD routing mode')).toHaveValue('manual');await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBe(count+1);let saved=await o.saved();const editedPaths=await paths();expect(editedPaths).not.toEqual(initialPaths);
 const interiors=JSON.parse(JSON.stringify(saved.canvas.x6.edges));await o.take('session7-x6-line');
 await page.getByRole('button',{name:'Undo X6 edit',exact:true}).click();await expect.poll(paths).toEqual(initialPaths);await o.saved();await page.getByRole('button',{name:'Redo X6 edit',exact:true}).click();await expect.poll(paths).toEqual(editedPaths);await o.saved();
 await page.getByLabel('IBD routing type').selectOption('curved');saved=await o.saved();expect(saved.canvas.x6.edges).toEqual(interiors);expect(await instance(page)).toBe(graph);
 const port=await page.locator('[data-memo-port]').evaluateAll(es=>{for(const e of es){const b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;if(x>330&&x<1300&&y>330&&y<800&&document.elementFromPoint(x,y)===e)return{x,y,side:e.closest('[port-group]')?.getAttribute('port-group'),port:e.getAttribute('data-memo-port')}}return null});expect(port).not.toBeNull();
 const oldNative=JSON.parse(JSON.stringify(saved.canvas.x6));const n=o.frames.filter(f=>f.dir==='sent').length;await page.mouse.click(port!.x,port!.y);await expect(page.getByRole('button',{name:'Port Properties',exact:true})).toBeVisible();await page.waitForTimeout(200);expect(o.frames.filter(f=>f.dir==='sent')).toHaveLength(n);
 const vertical=port!.side==='left'||port!.side==='right';await drag(page,port!,vertical?0:16,vertical?16:0);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBe(n+1);saved=await o.saved();expect(saved.canvas.x6.edges).toEqual(interiors);expect(saved.canvas.x6.ports).not.toEqual(oldNative.ports);
 await page.getByRole('button',{name:'Undo X6 edit',exact:true}).click();saved=await o.saved();expect(saved.canvas.x6.ports).toEqual(oldNative.ports);await page.getByRole('button',{name:'Redo X6 edit',exact:true}).click();await o.saved();
 const movedPort=page.locator(`[data-memo-port="${port!.port}"]`);const pb=await movedPort.boundingBox();expect(pb).not.toBeNull();await page.mouse.click(pb!.x+pb!.width/2,pb!.y+pb!.height/2);await page.getByRole('button',{name:'Port Properties',exact:true}).click();expect(await page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');return useModelStore.getState().selectedElementId})).toBe(port!.port);
 const inspectLine=await page.locator('.x6-edge path[stroke="transparent"]').evaluateAll(es=>{for(const e of es){const p=e as SVGPathElement;for(const f of [.2,.4,.6,.8]){const q=p.getPointAtLength(p.getTotalLength()*f),m=p.getScreenCTM();if(!m)continue;const v=new DOMPoint(q.x,q.y).matrixTransform(m);if(v.x>330&&v.x<1100&&v.y>320&&v.y<800&&document.elementFromPoint(v.x,v.y)===p)return{x:v.x,y:v.y,id:e.closest('.x6-edge')?.getAttribute('data-cell-id')}}}return null});expect(inspectLine).not.toBeNull();await page.mouse.click(inspectLine!.x,inspectLine!.y);await page.getByRole('button',{name:'Connector Properties',exact:true}).click();expect(await page.evaluate(async()=>{const {useModelStore}=await import('/src/store/model-store.ts');return useModelStore.getState().selectedRelationshipId})).toBe(inspectLine!.id);
 const blank=await page.getByTestId('x6-canvas').evaluate(el=>{const b=el.getBoundingClientRect();for(const fx of [.95,.05,.5])for(const fy of [.15,.95,.8]){const x=b.x+b.width*fx,y=b.y+b.height*fy,hit=document.elementFromPoint(x,y);if(hit&&el.contains(hit)&&!hit.closest('.x6-cell,.x6-edge-tools,button,select,label,input'))return{x,y}}return null});expect(blank).not.toBeNull();await page.mouse.click(blank!.x,blank!.y);await expect(page.locator('.x6-edge-tools')).toHaveCount(0);await expect(page.getByRole('button',{name:'Port Properties',exact:true})).toHaveCount(0);expect(await instance(page)).toBe(graph);await o.take('session7-x6-line-port');expect(o.errors).toEqual([]);
});

test('X6 native segment and vertex tools commit once and atomic removal persists',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(X6);await expect(page.locator('.x6-node').first()).toBeVisible();await page.getByLabel('IBD routing type').selectOption('orthogonal');await page.getByLabel('IBD routing mode').selectOption('automatic');await o.saved();await page.getByLabel('IBD routing mode').selectOption('manual');await o.saved();
 const pick=async(selector:string)=>page.locator(selector).evaluateAll(es=>{for(const e of es){const b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;if(x>330&&x<1300&&y>320&&y<800&&document.elementFromPoint(x,y)===e)return{x,y}}return null});
 const candidates=await page.locator('.x6-edge path[stroke="transparent"]').evaluateAll(es=>{const points=[];for(const e of es){const p=e as SVGPathElement;for(const f of [.2,.4,.6,.8]){const q=p.getPointAtLength(p.getTotalLength()*f),m=p.getScreenCTM();if(!m)continue;const v=new DOMPoint(q.x,q.y).matrixTransform(m);if(v.x>330&&v.x<1300&&v.y>320&&v.y<800&&document.elementFromPoint(v.x,v.y)===p)points.push({x:v.x,y:v.y});}}return points;});expect(candidates.length).toBeGreaterThan(0);
 // Choose an ordinarily reachable native tool, as in the JointJS audit. A
 // visible line's tool can lie beneath another block in this dense fixture.
 let handle:null|{x:number;y:number}=null;
 for(const line of candidates){await page.mouse.click(line.x,line.y);handle=await pick('.x6-edge-tool-segment');if(handle)break;}
 expect(handle).not.toBeNull();let n=o.frames.filter(f=>f.dir==='sent').length;await drag(page,handle!,14,14);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBe(n+1);await o.saved();await o.take('session7-x6-segment');
 handle=await pick('.x6-edge-tool-vertex');expect(handle).not.toBeNull();n=o.frames.filter(f=>f.dir==='sent').length;await drag(page,handle!,12,14);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBe(n+1);await o.saved();await o.take('session7-x6-vertex');
 handle=await pick('.x6-edge-tool-vertex');expect(handle).not.toBeNull();n=o.frames.filter(f=>f.dir==='sent').length;await page.mouse.dblclick(handle!.x,handle!.y);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBe(n+1);await o.saved();await o.take('session7-x6-vertex-removed');expect(o.errors).toEqual([]);
});

test('JointJS maintained segment edits persist natively and blank selection clears tools',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(JOINT);await expect(page.locator('.joint-element').first()).toBeVisible();await o.saved();const before=o.disk().vehicleRoutingPilot;const graph=await instance(page,'.joint-paper svg');
 const candidates=await page.locator('.joint-link path[joint-selector="wrapper"]').evaluateAll(es=>es.flatMap(e=>{const p=e as SVGPathElement;for(const f of [.2,.4,.6,.8]){const q=p.getPointAtLength(p.getTotalLength()*f),m=p.getScreenCTM();if(!m)continue;const v=new DOMPoint(q.x,q.y).matrixTransform(m);if(v.x>330&&v.x<1300&&v.y>320&&v.y<780&&document.elementFromPoint(v.x,v.y)===p)return[{x:v.x,y:v.y}]}return[]}));
 let handle:null|{x:number;y:number}=null;
 for(const p of candidates){await page.mouse.click(p.x,p.y);handle=await page.locator('.joint-marker-segment rect').evaluateAll(es=>{for(const e of es){const b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2,hit=document.elementFromPoint(x,y);if(x>330&&x<1300&&y>320&&y<790&&(hit===e||e.contains(hit)))return{x,y}}return null});if(handle)break;}
 expect(handle).not.toBeNull();const n=o.frames.filter(f=>f.dir==='sent').length;await drag(page,handle!,14,14);await expect.poll(()=>o.frames.filter(f=>f.dir==='sent').length).toBeGreaterThan(n);await o.saved();const edited=o.disk().vehicleRoutingPilot;expect(edited.canvas.jointjs.edges).not.toEqual(before.canvas.jointjs.edges);expect(edited.edges).toEqual(before.edges);expect(edited.canvas.x6).toEqual(before.canvas.x6);expect(await instance(page,'.joint-paper svg')).toBe(graph);await o.take('session7-joint-segment');
 const blank=await page.locator('.joint-paper').evaluate(el=>{const b=el.getBoundingClientRect();for(const fx of [.98,.9,.05])for(const fy of [.95,.8,.1]){const x=b.x+b.width*fx,y=b.y+b.height*fy,hit=document.elementFromPoint(x,y);if(hit&&el.contains(hit)&&!hit.closest('.joint-cell,.joint-tools'))return{x,y}}return null});expect(blank).not.toBeNull();await page.mouse.click(blank!.x,blank!.y);await expect.soft(page.locator('.memo-joint-link-selected')).toHaveCount(0);await expect(page.locator('.joint-marker-segment rect')).toHaveCount(0);
 await page.getByLabel('Renderer for this diagram').selectOption(RF);await expect(page.locator('.react-flow__node').first()).toBeVisible();await page.getByLabel('Renderer for this diagram').selectOption(JOINT);await expect(page.locator('.joint-element').first()).toBeVisible();expect(o.disk().vehicleRoutingPilot.canvas.jointjs).toEqual(edited.canvas.jointjs);await o.take('session7-joint-segment-return');expect(o.errors).toEqual([]);
});

test('JointJS renderer choice preserves native geometry in a read-only embed without authoring',async({page})=>{
 const o=await observe(page);await open(page);await page.getByLabel('Renderer for this diagram').selectOption(JOINT);await expect(page.locator('.joint-element').first()).toBeVisible();await o.saved();const saved=o.disk().vehicleRoutingPilot;const count=o.frames.filter(f=>f.dir==='sent').length;
 await page.goto('/pilot-baseline/isolation.html');await expect(page.getByTestId('jointjs-canvas')).toBeVisible();await expect(page.locator('.joint-element').first()).toBeVisible();const selector=`.joint-element[model-id="${engine}"]`;const node=page.locator(selector);const before=await node.getAttribute('transform'),point=await header(page,selector);expect(point).not.toBeNull();await drag(page,point!,18,0);await expect.soft(node).toHaveAttribute('transform',before!);
 const port=node.locator('[port] [joint-selector="portBody"]').first(),b=await port.boundingBox();expect(b).not.toBeNull();const portTransforms=()=>port.evaluate(el=>{const transforms=[];let e:Element|null=el;while(e&&!e.matches('.joint-element')){if(e.hasAttribute('transform'))transforms.push(e.getAttribute('transform'));e=e.parentElement;}return transforms;});const portBefore=await portTransforms();await drag(page,{x:b!.x+b!.width/2,y:b!.y+b!.height/2},0,12);await page.waitForTimeout(450);expect.soft(await portTransforms()).toEqual(portBefore);expect.soft(o.frames.filter(f=>f.dir==='sent')).toHaveLength(count);expect.soft(o.disk().vehicleRoutingPilot).toEqual(saved);await expect.soft(page.getByRole('button',{name:'Reset to React Flow positions',exact:true})).toBeDisabled();await o.take('session7-joint-readonly');expect(o.errors).toEqual([]);
});

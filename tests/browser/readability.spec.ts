import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {attachedRoute} from '../../packages/web/src/diagram/ibd-routing';
import {routeMetrics} from './session8-metrics';
import {parseLayoutSource} from './fixture-layout.mjs';
const out=resolve(process.env.MEMO_BASELINE_OUTPUT!);
test('freeze readability geometry and matched fit and 100 percent views',async({page})=>{
 const consoleMessages:any[]=[];page.on('console',message=>{consoleMessages.push({type:message.type(),text:message.text()});writeFileSync(resolve(out,'browser-console.json'),JSON.stringify(consoleMessages,null,2))});
 await page.goto('/');await expect(page.getByRole('button',{name:'Skip tour'})).toBeVisible();
 const sources=[];for(const file of ['views/DiagramCanvas.tsx','views/InterconnectionNode.tsx','views/InterconnectionEdge.tsx']){const r=await page.request.get('/src/'+file);expect(r.ok()).toBe(true);sources.push({file,servedSha256:createHash('sha256').update(await r.text()).digest('hex'),localSha256:createHash('sha256').update(readFileSync('packages/web/src/'+file)).digest('hex')})}
 await page.goto('/pilot-baseline/undo-diagnostic/index.html');await page.getByRole('button',{name:'Open IBD diagnostic'}).click();await expect(page.locator('.react-flow__node').first()).toBeVisible();
 if(process.env.MEMO_SESSION8_MANHATTAN==='1'){
  const before=await page.evaluate(()=>(window as any).undoDiagnosticState().nodes);
  await page.getByLabel('IBD routing type').selectOption('manhattan');
  expect(await page.evaluate(()=>(window as any).undoDiagnosticState().nodes)).toEqual(before);
 }
 let old='',stable=0;await expect.poll(async()=>{const v=await page.evaluate(()=>JSON.stringify((window as any).undoDiagnosticState()));stable=v===old?stable+1:0;old=v;return stable},{intervals:[100],timeout:30000}).toBeGreaterThanOrEqual(4);
 if(process.env.MEMO_SESSION8_ALLPORTS==='1') {
  const current=()=>page.evaluate(()=>{const s=(window as any).undoDiagnosticState();for(const n of s.nodes){const e=[...document.querySelectorAll<HTMLElement>('.react-flow__node')].find(e=>e.dataset.id===n.id)!;n.width=parseFloat(e.style.width);n.height=parseFloat(e.style.height);}return s});
  const paths=()=>page.locator('path.react-flow__edge-path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
  const initial=await current(),initialPaths=await paths();
  const framesOnly=(s:any)=>s.nodes.map((n:any)=>({id:n.id,position:n.position,parentId:n.parentId,width:n.width,height:n.height}));
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Automatically place all ports',exact:true}).click();
  await expect.poll(async()=>(await current()).undo,{timeout:30000}).toBe(initial.undo+1);await page.waitForTimeout(700);
  const placed=await current(),placedPaths=await paths();expect(framesOnly(placed)).toEqual(framesOnly(initial));expect(placed.nodes).not.toEqual(initial.nodes);
  await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await expect.poll(async()=>(await current()).nodes).toEqual(initial.nodes);expect(await paths()).toEqual(initialPaths);await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await expect.poll(async()=>(await current()).nodes).toEqual(placed.nodes);expect(await paths()).toEqual(placedPaths);await page.waitForTimeout(700);
  await page.reload();await page.getByRole('button',{name:'Open IBD diagnostic'}).click();await expect(page.locator('.react-flow__node').first()).toBeVisible();await expect.poll(async()=>(await current()).nodes).toEqual(placed.nodes);expect(await paths()).toEqual(placedPaths);
  writeFileSync(resolve(out,'session8-all-port-placement.json'),JSON.stringify({initial,placed,initialPaths,placedPaths},null,2));
 }
 const captionEvidence=await page.locator('[data-ibd-caption]').evaluateAll(labels=>{
  const boxes=labels.map(el=>{const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();return {port:el.closest('[data-ibd-port]')?.getAttribute('data-ibd-port'),x:r.x,y:r.y,width:r.width,height:r.height}});
  const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];const width=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),height=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);if(width>.5&&height>.5)overlaps.push({a:a.port,b:b.port,width,height});}return{boxes,overlaps};
 });
 writeFileSync(resolve(out,'caption-evidence.json'),JSON.stringify(captionEvidence,null,2));
 if(process.env.MEMO_SESSION8_ALLPORTS==='1')expect(captionEvidence.overlaps,'explicit batch placement keeps measured peer captions clear').toEqual([]);
 const state=await page.evaluate(()=>{const s=(window as any).undoDiagnosticState();const zoom=new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')!).transform).a;for(const n of s.nodes){const e=[...document.querySelectorAll('.react-flow__node')].find(e=>e.getAttribute('data-id')===n.id)!;const b=e.getBoundingClientRect();n.width=parseFloat((e as HTMLElement).style.width)||b.width/zoom;n.height=parseFloat((e as HTMLElement).style.height)||b.height/zoom;}return s});
 for(const n of state.nodes){expect(Number.isFinite(n.width)&&n.width>0).toBe(true);expect(Number.isFinite(n.height)&&n.height>0).toBe(true)}
 const routes=state.edges.map((e:any)=>({...e,points:attachedRoute(e.data.points,e.data.routingType??state.routing.type,e.data.sourceSide,e.data.targetSide,e.data.manualRoute)}));
 const metrics=routeMetrics(state.nodes,routes);
 const crossovers=await page.locator('[data-ibd-crossover-gap]').evaluateAll(es=>es.map(e=>({x:e.getAttribute('cx'),y:e.getAttribute('cy'),mask:e.parentElement?.id})));
 writeFileSync(resolve(out,'crossover-evidence.json'),JSON.stringify(crossovers,null,2));
 if(metrics.crossings>0)expect(crossovers.length,'non-junction crossings have drawing-only gaps').toBeGreaterThan(0);
 writeFileSync(resolve(out,'readability.json'),JSON.stringify({sources,state,routes,metrics,metricConvention:'Undecorated piecewise-linear route skeleton; unique pair/location intersections excluding shared endpoints; pairwise collinear overlap length; segment/part interior intersections excluding endpoint owners and ancestors.'},null,2));
 // Ordinary camera controls only; the full world geometry is retained separately.
 await page.getByRole('button',{name:'Fit diagram to view',exact:true}).click();await page.waitForTimeout(400);await page.screenshot({path:resolve(out,'readability-fit.png')});
 const transform=()=>page.locator('.react-flow__viewport').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
 await page.mouse.move(700,450);
 for(let i=0;i<16;i++){const z=await transform();if(Math.abs(z-1)<1e-6)break;await page.keyboard.down('Control');await page.mouse.wheel(0,Math.max(-100,Math.min(100,Math.log(z)/.003)));await page.keyboard.up('Control');await page.waitForTimeout(100)}
 expect(await transform()).toBeCloseTo(1,5);
 await page.mouse.move(20,880);await page.waitForTimeout(180);await page.screenshot({path:resolve(out,'readability-100.png')});
 writeFileSync(resolve(out,'readability-dom.xml'),await page.locator('.react-flow__viewport').evaluate(e=>new XMLSerializer().serializeToString(e)));
 const drawn=await page.locator('path.react-flow__edge-path').evaluateAll(es=>es.map(e=>e.outerHTML));
 const byId=new Map(state.nodes.map((n:any)=>[n.id,n]));const abs=(id:string):any=>{const n:any=byId.get(id),p=n.parentId?abs(n.parentId):{x:0,y:0};return{x:p.x+n.position.x,y:p.y+n.position.y}};
 const bounds=state.nodes.map((n:any)=>({...abs(n.id),w:n.width,h:n.height}));const minX=Math.min(...bounds.map(n=>n.x))-40,minY=Math.min(...bounds.map(n=>n.y))-40,maxX=Math.max(...bounds.map(n=>n.x+n.w))+40,maxY=Math.max(...bounds.map(n=>n.y+n.h))+40;
 const boxes=bounds.map(n=>`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="#94a3b8"/>`).join('');
 writeFileSync(resolve(out,'readability-geometry.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}">${boxes}<g fill="none" stroke="#334155">${drawn.join('')}</g></svg>`);
});

if(process.env.MEMO_SESSION8_SMALL==='1'&&process.env.MEMO_SESSION8_ACTIONS==='1')test('nested part moves its complete subtree and ports with exact cancel and history',async({page})=>{
 const frames:any[]=[];page.on('websocket',ws=>{for(const dir of ['framesent','framereceived']as const)ws.on(dir,e=>{try{const m=JSON.parse(String(e.payload));if(m.type.startsWith('diagram:layout'))frames.push({dir,...m})}catch{}})});
 await page.goto('/');await expect(page.getByRole('button',{name:'Skip tour'})).toBeVisible();await page.goto('/pilot-baseline/undo-diagnostic/index.html');await page.getByRole('button',{name:'Open IBD diagnostic'}).click();
 const owner='memo_vehicle_routing::vehicle::powertrain',node=page.locator(`.react-flow__node[data-id="${owner}"]`);await expect(node).toBeVisible();
 const state=()=>page.evaluate(()=>(window as any).undoDiagnosticState());
 const paths=()=>page.locator('path.react-flow__edge-path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
 const settle=async()=>{let old='',n=0;await expect.poll(async()=>{const s=JSON.stringify({nodes:(await state()).nodes,paths:await paths()});n=s===old?n+1:0;old=s;return n},{intervals:[100]}).toBeGreaterThanOrEqual(4)};
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8')),disk=()=>readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8');
 const hit=()=>node.evaluate(el=>{const b=el.getBoundingClientRect();for(const[fx,fy]of [[.2,.05],[.4,.1],[.1,.4]]){const p={x:b.x+b.width*fx,y:b.y+b.height*fy},e=document.elementFromPoint(p.x,p.y);if(e?.closest('.react-flow__node')===el&&!e.closest('button,[data-ibd-port],.react-flow__resize-control'))return p}return null});
 await settle();const initial=await state(),initialPaths=await paths(),initialDisk=disk();if(process.env.MEMO_SESSION8_DEEP==='1')expect(initial.nodes.some(n=>n.id.endsWith('::engine::sensor'))).toBe(true);
 const gesture=async(cancel=false)=>{const p=await hit();expect(p).not.toBeNull();await page.mouse.move(p!.x,p!.y);await page.mouse.down();await page.mouse.move(p!.x+20,p!.y+10,{steps:10});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();await settle()};
 await gesture(true);expect((await state()).nodes).toEqual(initial.nodes);expect(await paths()).toEqual(initialPaths);expect((await state()).undo).toBe(initial.undo);expect(disk()).toBe(initialDisk);expect(frames.filter(f=>f.dir==='framesent')).toHaveLength(0);
 await gesture();const moved=await state(),movedPaths=await paths();expect(moved.undo).toBe(initial.undo+1);
 const abs=(ns:any[],id:string):any=>{const n=ns.find(n=>n.id===id),p=n.parentId?abs(ns,n.parentId):{x:0,y:0};return{x:p.x+n.position.x,y:p.y+n.position.y}};
 const a=abs(initial.nodes,owner),b=abs(moved.nodes,owner),delta={x:b.x-a.x,y:b.y-a.y};expect(Math.hypot(delta.x,delta.y)).toBeGreaterThan(2);
 const member=(id:string)=>{for(let n=initial.nodes.find(n=>n.id===id);n;n=initial.nodes.find(p=>p.id===n.parentId))if(n.id===owner)return true;return false};
 for(const edge of initial.edges){const after=moved.edges.find(e=>e.id===edge.id);for(const end of ['source','target']){const index=end==='source'?0:edge.data.points.length-1,expected=member(edge[end])?delta:{x:0,y:0},afterIndex=end==='source'?0:after.data.points.length-1;expect(after.data.points[afterIndex].x-edge.data.points[index].x).toBeCloseTo(expected.x,8);expect(after.data.points[afterIndex].y-edge.data.points[index].y).toBeCloseTo(expected.y,8)}}

 for(const n of initial.nodes){let parent=n.id,member=false;while(parent){if(parent===owner){member=true;break}parent=initial.nodes.find(n=>n.id===parent)?.parentId}const before=abs(initial.nodes,n.id),after=abs(moved.nodes,n.id);expect(after.x-before.x).toBeCloseTo(member?delta.x:0,8);expect(after.y-before.y).toBeCloseTo(member?delta.y:0,8);expect(moved.nodes.find(m=>m.id===n.id).ports).toEqual(n.ports)}
 let savedWrites=0;
 const saved=async()=>{await expect.poll(()=>frames.filter(f=>f.dir==='framesent').length).toBeGreaterThan(savedWrites);const sent=frames.filter(f=>f.dir==='framesent').at(-1);await expect.poll(()=>frames.some(f=>f.type==='diagram:layout:saved'&&f.payload.requestId===sent.payload.requestId&&!f.payload.error)).toBe(true);savedWrites=frames.filter(f=>f.dir==='framesent').length;const mounted=await state(),layout=parseLayoutSource(disk()).layouts.vehicleRoutingPilot;for(const n of mounted.nodes){expect(layout.nodes[n.id].x).toBe(n.position.x);expect(layout.nodes[n.id].y).toBe(n.position.y);for(const p of n.ports??[]){expect(layout.nodes[n.id].ports[p.id].x).toBe(p.x);expect(layout.nodes[n.id].ports[p.id].y).toBe(p.y)}}};
 await saved();await page.getByRole('button',{name:'Undo last diagram edit',exact:true}).click();await settle();expect((await state()).nodes).toEqual(initial.nodes);expect(await paths()).toEqual(initialPaths);await saved();await page.getByRole('button',{name:'Redo last diagram edit',exact:true}).click();await settle();expect((await state()).nodes).toEqual(moved.nodes);expect(await paths()).toEqual(movedPaths);await saved();const finalDisk=disk();
 await page.reload();await page.getByRole('button',{name:'Open IBD diagnostic'}).click();await expect(node).toBeVisible();await settle();expect((await state()).nodes).toEqual(moved.nodes);expect(await paths()).toEqual(movedPaths);expect(disk()).toBe(finalDisk);
 writeFileSync(resolve(out,'session8-subtree.json'),JSON.stringify({initial,moved,delta,frames,initialDisk,finalDisk},null,2));await page.screenshot({path:resolve(out,'session8-subtree.png')});
});

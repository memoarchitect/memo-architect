import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';import{resolve}from'node:path';
import {parseLayoutSource}from'./fixture-layout.mjs';
const out=resolve(process.env.MEMO_BASELINE_OUTPUT!);
for(const fault of ['delayed-request','failed-request','reordered-completions'] as const)test(fault+' retains the latest draft and recovers through a subsequent ordinary edit',async({page})=>{
 const runtime=JSON.parse(readFileSync(resolve(out,'runtime.json'),'utf8'));
 const source=()=>readFileSync(resolve(runtime.fixture,'model/catalog/views.sysml'),'utf8');
 const layout=()=>parseLayoutSource(source()).layouts.vehicleRoutingPilot;
 const wire:any[]=[];let armed=false,held:any[]=[],release=()=>{},initial:any,first:any,failed=false,reordered=false;
 await page.routeWebSocket(/.*/,socket=>{const server=socket.connectToServer();
  socket.onMessage(message=>{const m=JSON.parse(String(message));if(m.type!=='diagram:layout:update'){server.send(message);return;}
   wire.push({direction:'sent',...m});if(!armed){server.send(message);return;}
   first??=m;
   if(fault==='delayed-request'){held.push(message);release=()=>{for(const value of held)server.send(value);held=[];};return;}
   if(fault==='failed-request'&&!failed){failed=true;socket.send(JSON.stringify({type:'diagram:layout:saved',payload:{diagramId:m.payload.diagramId,requestId:m.payload.requestId,error:'Disposable save fault before write'}}));socket.send(JSON.stringify({type:'diagram:layout',payload:{layouts:{[m.payload.diagramId]:initial}}}));return;}
   server.send(message);
  });
  server.onMessage(message=>{const m=JSON.parse(String(message));wire.push({direction:'received',...m});
   if(armed&&fault==='reordered-completions'&&m.type==='diagram:layout:saved'){
    if(m.payload.requestId===first?.payload.requestId){held.push(message);return;}
    socket.send(message);for(const value of held)socket.send(value);held=[];
    socket.send(JSON.stringify({type:'diagram:layout',payload:{layouts:{[first.payload.diagramId]:first.payload.layout}}}));reordered=true;return;
   }socket.send(message);
  });
 });
 const observation=()=>page.evaluate(async()=>{const {getDiagramLayoutSaveObservation}=await import('/src/store/ws-client.ts');return getDiagramLayoutSaveObservation('vehicleRoutingPilot')});
 const saved=async()=>{await expect.poll(async()=>(await observation())?.status,{timeout:30000}).toBe('saved')};
 await page.goto('/');await page.getByRole('button',{name:'Skip tour',exact:true}).click();await page.getByText('All diagrams',{exact:true}).click();await page.getByText('Vehicle routing comparison',{exact:true}).first().click();await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 if(await page.getByLabel('IBD routing mode').inputValue()==='manual'){await page.getByLabel('IBD routing mode').selectOption('automatic');await saved();}await page.getByLabel('IBD routing mode').selectOption('manual');await saved();
 initial=layout();expect(initial.canvas.jointjs).toBeDefined();expect(initial.canvas.x6).toBeDefined();expect(initial.futureLayout).toEqual({retain:'session2'});const initialSource=source(),firstType=initial.canvas.routingType==='straight'?'elbow':'straight';armed=true;
 await page.getByLabel('IBD routing type').selectOption(firstType);
 if(fault==='failed-request'){
  await expect.poll(async()=>(await observation())?.status).toBe('failed');expect(source()).toBe(initialSource);await expect(page.getByLabel('IBD routing type')).toHaveValue(firstType);
 }
 if(fault==='delayed-request'){await expect.poll(()=>held.length).toBe(1);expect(source()).toBe(initialSource);await expect.poll(async()=>(await observation())?.status).toBe('pending');}
 await page.getByLabel('IBD routing type').selectOption('arc');
 if(fault==='delayed-request'){await expect.poll(()=>held.length).toBe(2);expect(source()).toBe(initialSource);release();}
 await saved();if(fault==='reordered-completions')await expect.poll(()=>reordered).toBe(true);
 await expect(page.getByLabel('IBD routing type')).toHaveValue('arc');await expect.poll(()=>layout().canvas.routingType).toBe('arc');
 const final=layout();expect(final.nodes).toEqual(initial.nodes);expect(final.edges).toEqual(initial.edges);expect(final.futureLayout).toEqual(initial.futureLayout);expect(final.canvas.futureCanvas).toEqual(initial.canvas.futureCanvas);expect(final.canvas.jointjs).toEqual(initial.canvas.jointjs);expect(final.canvas.x6).toEqual(initial.canvas.x6);
 const persisted=source();await page.reload();await expect(page.getByLabel('IBD routing type')).toHaveValue('arc');await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});expect(source()).toBe(persisted);
 await page.screenshot({path:resolve(out,'session9-'+fault+'.png')});writeFileSync(resolve(out,'session9-'+fault+'.json'),JSON.stringify({fault,initial,final,wire,source:persisted,reordered,failed},null,2));
});

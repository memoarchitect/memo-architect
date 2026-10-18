import { parse, stringify } from 'yaml';
import { replaceViewLayout } from '../../../memo-tools/packages/tools/lib/model/view-layout-block.js';
import { readFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, realpathSync, symlinkSync, writeFileSync, mkdtempSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../',import.meta.url));
const output = resolve(process.env.MEMO_BASELINE_OUTPUT ?? 'artifacts/ibd-baseline');
for(const [name,sibling] of [['tools','memo-tools'],['ontology','memo']]) {
 const actual=realpathSync(resolve(root,`node_modules/@memoarchitect/${name}`));
 const expected=realpathSync(resolve(root,'..',sibling));
 if(actual!==expected)throw new Error(`${name} must resolve to dedicated sibling ${expected}; found ${actual}`);
}
mkdirSync(output,{recursive:true});
if(process.env.MEMO_SESSION6==='1'||process.env.MEMO_UNDO_DIAGNOSTIC==='1') {
 execFileSync(process.execPath,[resolve(root,'tests/browser/generate-undo-diagnostic.mjs')],{cwd:root,env:{...process.env,MEMO_DIAGNOSTIC_MANIFEST:resolve(output,'source-manifest.json')},stdio:'pipe'});
}

const fixture = mkdtempSync(resolve(output,'vehicle-'));
cpSync(resolve(root,'examples/vehicle-routing'),fixture,{recursive:true,filter:p=>!p.includes('/.memo')});
cpSync(resolve(root,'tests/browser/fixtures/vehicle-layout.yaml'),resolve(fixture,'model/catalog/views.viewlayout'));
// Optional Session 2 seed is written only to this freshly copied, test-owned sidecar.
if (process.env.MEMO_SESSION2_FIXTURE === '1') {
 const path=resolve(fixture,'model/catalog/views.viewlayout');
 const artifact=parse(readFileSync(path,'utf8'));
 const layout=artifact.layouts.vehicleRoutingPilot;
 layout.futureLayout={retain:'session2'};
 layout.canvas={...layout.canvas,autoLayout:true,futureCanvas:{retain:'session2'}};
 writeFileSync(path,stringify(artifact));
}
// Session 4 copy gives the tested container legal title/child clearance; the
// original dense review sidecar and cumulative baseline are not changed.
if (process.env.MEMO_SESSION4_FIXTURE === '1') {
 const path=resolve(fixture,'model/catalog/views.viewlayout');
 const artifact=parse(readFileSync(path,'utf8'));const layout=artifact.layouts.vehicleRoutingPilot;
 const p=layout.nodes['memo_vehicle_routing::vehicle::powertrain'];p.width=900;p.height=480;p.y=64;
 layout.nodes['memo_vehicle_routing::vehicle::powertrain::fuelTank'].x=24;
 layout.nodes['memo_vehicle_routing::vehicle::powertrain::engine'].y=100;
 layout.futureLayout={retain:'session4'};
 layout.canvas={...layout.canvas,autoLayout:false,futureCanvas:{retain:'session4'}};
 writeFileSync(path,stringify(artifact));
}
if (process.env.MEMO_SESSION5_FIXTURE === '1') {
 const path=resolve(fixture,'model/catalog/views.sysml');
 const source=readFileSync(path,'utf8');
 writeFileSync(path,source.slice(0,source.lastIndexOf('}'))+`
    view acquisitionGeneral : MemoDiagramView {
        @MemoIdentity { :>> label = "Acquisition general control"; }
        expose memo_vehicle_routing::*;
        attribute depth = 1;
        attribute :>> viewKind = DiagramViewKind::general;
        attribute :>> diagramType = "bdd";
    }
}
`);
}
if (process.env.MEMO_SESSION6 === '1') {
 const path=resolve(fixture,'model/catalog/views.viewlayout');
 const artifact=parse(readFileSync(path,'utf8')),layout=artifact.layouts.vehicleRoutingPilot;
 layout.canvas={...layout.canvas,routingMode:'automatic',routingType:process.env.MEMO_SESSION6_TYPE??'straight',...(process.env.MEMO_SESSION6_AUTOPLACEMENT==='1'?{autoLayout:true}:{})};
 // Only the fresh fixture drops this saved generated slot, making one ordinary
 // port eligible. The production sidecar and every other authored port stay fixed.
 delete layout.nodes['memo_vehicle_routing::vehicle::powertrain::engine'].ports['memo_vehicle_routing::vehicle::powertrain::engine::engineStatusOut'];
 writeFileSync(path,stringify(artifact));
}
// Migrate the historical YAML seed into current view metadata before starting
// the server. No production path reads/writes the obsolete sidecar.
{
 const seed=resolve(fixture,'model/catalog/views.viewlayout');
 const source=resolve(fixture,'model/catalog/views.sysml');
 let text=readFileSync(source,'utf8');
 for(const [id,layout] of Object.entries(parse(readFileSync(seed,'utf8')).layouts)) {
  const updated=replaceViewLayout(text,`memo_vehicle_routing_views::${id}`,layout);
  if(updated===undefined)throw new Error(`Seed view ${id} is missing`);
  text=updated;
 }
 writeFileSync(source,text);
 rmSync(seed);
}
symlinkSync(resolve(root,'node_modules'),resolve(fixture,'node_modules'));
writeFileSync(resolve(output,'runtime.json'),JSON.stringify({root,fixture,node:process.version,seed:'tests/browser/fixtures/vehicle-layout.yaml',session2Seed:process.env.MEMO_SESSION2_FIXTURE==='1',session4Seed:process.env.MEMO_SESSION4_FIXTURE==='1',tools:realpathSync(resolve(root,'node_modules/@memoarchitect/tools')),ontology:realpathSync(resolve(root,'node_modules/@memoarchitect/ontology')),port:process.env.MEMO_PILOT_PORT??'32117',hmr:process.env.MEMO_PILOT_HMR_PORT??'23217'},null,2));
const child = spawn(process.execPath,[resolve(root,'lib/bin/memo-architect.js'),'dev','--port',process.env.MEMO_PILOT_PORT??'32117','--no-open','--keep-alive','--experimental','--toolchain.compiler=syside'],{cwd:fixture,stdio:['ignore','pipe','pipe'],env:{...process.env,MEMO_PILOT_HMR_PORT:process.env.MEMO_PILOT_HMR_PORT??'23217'}});
for(const stream of [child.stdout,child.stderr]) stream.on('data',data=>{appendFileSync(resolve(output,'server.log'),data);process.stdout.write(data);});
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));

import {spawnSync}from'node:child_process';import{writeFileSync}from'node:fs';import{resolve}from'node:path';
const root=process.cwd(),out=resolve(process.env.MEMO_SESSION9_CHECK_OUTPUT??'artifacts/ibd-session9/checks');const checks=[
 ['focused',root,['pnpm','exec','vitest','run',...['ibd-caption-clearance','movement-history','ibd-movement-routing','ibd-crossovers','ibd-port-constraints','ibd-placement-score','ibd-resize','ibd-session6','layout-ownership','ibd-resize-integration','layout-coordinate-migration','ibd-routing','ibd-hit-targets','jointjs-pilot','x6-adapter'].map(n=>`packages/web/src/diagram/__tests__/${n}.test.ts`),'packages/web/src/views/__tests__/connector-routing.test.ts']],
 ['web',root,['pnpm','test:web']],['cli',root,['pnpm','test:cli']],['types',root,['pnpm','type-check']],['build',root,['pnpm','build:client']],
 ['tools-layout',resolve('../memo-tools/packages/tools'),['pnpm','exec','vitest','run','src/__tests__/view-layout-store.test.ts']],
 ['validator',resolve('../memo-tools'),['node','scripts/check-syside-gate.mjs']]
];const results=[];for(const[name,cwd,command]of checks){const r=spawnSync(command[0],command.slice(1),{cwd,env:process.env,encoding:'utf8',maxBuffer:64*1024*1024});writeFileSync(`${out}/check-${name}.txt`,r.stdout+r.stderr);results.push({name,cwd,command,status:r.status,error:r.error?.message});writeFileSync(`${out}/check-results.json`,JSON.stringify(results,null,2));console.log(name,r.status)}

process.exitCode=results.some(result=>result.status!==0)?1:0;

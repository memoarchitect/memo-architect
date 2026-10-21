import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
// Node --env-file does not override inherited PATH. Apply this task's explicit
// test environment so validator/compiler gates cannot silently use a fallback.
const runtime = parseEnv(readFileSync('artifacts/ibd-session8/runtime.env','utf8'));
for(const key of ['PATH','MEMO_SYSIDE_PYTHON','MEMO_TOOLCHAIN_COMPILER','MEMO_TEST_COMPILER'])if(runtime[key])process.env[key]=runtime[key];
const directory='artifacts/ibd-session8';mkdirSync(directory,{recursive:true});
const phase=process.argv[2]??'before';
if(phase==='validator'){const r=spawnSync('node',['scripts/check-syside-gate.mjs'],{cwd:'../memo-tools',env:process.env,encoding:'utf8'});writeFileSync('artifacts/ibd-session8/check-validator-retry.txt',r.stdout+r.stderr);console.log('validator',r.status);process.exit(r.status??1)}
if(phase==='checks'){await import('./run-session8-checks.mjs');process.exit(0)}
const groups={before:[['small',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1'}],['normal',{MEMO_SESSION8:'1',MEMO_SESSION8_NORMAL:'1'}],['routing',{MEMO_SESSION6:'1',MEMO_SESSION4_FIXTURE:'1'}],['movement',{MEMO_UNDO_DIAGNOSTIC:'1',MEMO_UNDO_VARIANT:'current'}]],after:[['acquisition',{MEMO_SESSION5_FIXTURE:'1',MEMO_SESSION4_FIXTURE:'1'}],['routing',{MEMO_SESSION6:'1',MEMO_SESSION4_FIXTURE:'1'}],['movement',{MEMO_UNDO_DIAGNOSTIC:'1',MEMO_UNDO_VARIANT:'current'}],['dense',{MEMO_SESSION8:'1'}],['small',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_ACTIONS:'1'}]]};
groups.regression=[['ownership',{MEMO_SESSION2_FIXTURE:'1'}],['resize',{MEMO_SESSION4_FIXTURE:'1'}],['orthogonal',{MEMO_SESSION6:'1',MEMO_SESSION4_FIXTURE:'1',MEMO_SESSION6_TYPE:'orthogonal'}],['automatic',{MEMO_SESSION6:'1',MEMO_SESSION4_FIXTURE:'1',MEMO_SESSION6_AUTOPLACEMENT:'1'}],['control',{MEMO_UNDO_DIAGNOSTIC:'1',MEMO_UNDO_VARIANT:'current',MEMO_UNDO_DIRECT:'1'}],['cumulative',{}]];
 groups.deep=[['deep',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_ACTIONS:'1',MEMO_SESSION8_DEEP:'1'}]];
 groups.perimeter=[['perimeter',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_PERIMETER:'1'}]];
 groups.stage2=[...groups.deep,...groups.perimeter];
 groups.placement=[['automatic',{MEMO_SESSION6:'1',MEMO_SESSION4_FIXTURE:'1',MEMO_SESSION6_AUTOPLACEMENT:'1'}]];
 groups.quality=[['dense',{MEMO_SESSION8:'1',MEMO_SESSION8_MANHATTAN:'1'}],['small',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_MANHATTAN:'1'}]];
 groups.qualityPlacement=[['dense',{MEMO_SESSION8:'1',MEMO_SESSION8_MANHATTAN:'1',MEMO_SESSION8_ALLPORTS:'1'}],['small',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_MANHATTAN:'1',MEMO_SESSION8_ALLPORTS:'1'}]];
 groups.normal=[['normal',{MEMO_SESSION8:'1',MEMO_SESSION8_NORMAL:'1'}]];
 groups.captionQuality=[...groups.perimeter,...groups.qualityPlacement];
 groups.movementRouting=[['movement-routing',{MEMO_SESSION8:'1',MEMO_SESSION8_SMALL:'1',MEMO_SESSION8_MOVEMENT:'1'}]];
 groups.repairedInteractions=[...groups.movementRouting,['ownership',{MEMO_SESSION2_FIXTURE:'1'}],['resize',{MEMO_SESSION4_FIXTURE:'1'}],...groups.after,...groups.stage2,...groups.regression.filter(([name])=>!['ownership','resize'].includes(name)),...groups.normal];
 groups.finalCaptures=[...groups.movementRouting,...groups.qualityPlacement];
 groups.finalInteractions=[...groups.movementRouting,...groups.after,...groups.stage2,...groups.regression,...groups.normal];
 const results=[];
for(const [name,flags]of groups[phase]??[]){const command=['pnpm','test:browser:ibd',...(name==='automatic'?['routing.spec.ts','--grep','routing geometry transactions']:[])];const result=spawnSync(command[0],command.slice(1),{env:{...process.env,...flags},encoding:'utf8',maxBuffer:32*1024*1024});writeFileSync(`${directory}/${phase}-${name}.txt`,result.stdout+result.stderr);results.push({name,command,flags,status:result.status,error:result.error?.message});writeFileSync(`${directory}/${phase}-results.json`,JSON.stringify(results,null,2));console.log(name,result.status);if((phase==='after'||phase==='stage2'||phase==='captionQuality')&&result.status!==0)break;}

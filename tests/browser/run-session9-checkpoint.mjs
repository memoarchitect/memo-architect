import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
// Node --env-file does not override inherited PATH. Apply this task's explicit
// test environment so validator/compiler gates cannot silently use a fallback.
const runtime = parseEnv(readFileSync('artifacts/ibd-session8/runtime.env','utf8'));
function frozenSource(capture) {
 const directory=resolve('artifacts/ibd-baseline',capture);
 const fixtures=readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&entry.name.startsWith('vehicle-')&&existsSync(resolve(directory,entry.name,'model/catalog/views.sysml')));
 if(fixtures.length!==1)throw new Error(`Expected one actual retained frozen fixture in ${directory}; obtain the evidence, do not manufacture a before source`);
 return resolve(directory,fixtures[0].name,'model/catalog/views.sysml');
}
for(const key of ['PATH','MEMO_SYSIDE_PYTHON','MEMO_TOOLCHAIN_COMPILER','MEMO_TEST_COMPILER'])if(runtime[key])process.env[key]=runtime[key];
process.env.MEMO_PILOT_PORT='32927';process.env.MEMO_PILOT_HMR_PORT='23927';
const phase=process.argv[2]??'before';
const directory=`artifacts/ibd-session9/${new Date().toISOString().replaceAll(':','-')}-${phase}`;mkdirSync(directory,{recursive:true});console.log('Checkpoint logs:',directory);
if(phase==='validator'){const r=spawnSync('node',['scripts/check-syside-gate.mjs'],{cwd:'../memo-tools',env:process.env,encoding:'utf8'});writeFileSync(`${directory}/check-validator-retry.txt`,r.stdout+r.stderr);console.log('validator',r.status);process.exit(r.status??1)}
if(phase==='checks'){process.env.MEMO_SESSION9_CHECK_OUTPUT=directory;await import('./run-session9-checkpoint-checks.mjs');process.exit(process.exitCode??0)}
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
 groups.frozen=[["dense-frozen", {"MEMO_SESSION8": "1", "MEMO_SESSION8_MANHATTAN": "1", "MEMO_SESSION9_REROUTE": "1", "MEMO_SESSION9_FROZEN_SOURCE": frozenSource('2026-10-21T15-57-16.765Z')}], ["small-frozen", {"MEMO_SESSION8": "1", "MEMO_SESSION8_MANHATTAN": "1", "MEMO_SESSION8_SMALL": "1", "MEMO_SESSION9_REROUTE": "1", "MEMO_SESSION9_FROZEN_SOURCE": frozenSource('2026-10-21T15-58-00.414Z')}]];
 groups.checkpoint=[...groups.movementRouting,...groups.stage2,...groups.qualityPlacement,...groups.normal];
 groups.reliability=[["combined", {"MEMO_SESSION9_COMBINED": "1", "MEMO_SESSION9_HEADED": "1", "MEMO_SESSION8": "1", "MEMO_SESSION8_SMALL": "1", "MEMO_SESSION8_MOVEMENT": "1"}], ["save-faults", {"MEMO_SESSION9_SAVES": "1", "MEMO_SESSION2_FIXTURE": "1"}], ["dense-latency", {"MEMO_SESSION9_FROZEN_SOURCE": frozenSource('2026-10-21T16-11-12.070Z')}]];
 groups.remaining=[...groups.regression,...groups.after.filter(([name])=>['acquisition','routing','movement'].includes(name)),['native',{MEMO_SESSION7:'1',MEMO_SESSION4_FIXTURE:'1'}]];
 groups.combined=[groups.reliability[0]];groups.saves=[groups.reliability[1]];groups.latency=[groups.reliability[2]];
 groups.headedCombined=[['headed-combined',{...groups.reliability[0][1],MEMO_SESSION9_HEADED:'1'}]];
 const results=[];
for(const [name,flags]of groups[phase]??[]){const command=['pnpm','test:browser:ibd',...(name==='automatic'?['routing.spec.ts','--grep','routing geometry transactions']:[])];const result=spawnSync(command[0],command.slice(1),{env:{...process.env,...flags},encoding:'utf8',maxBuffer:32*1024*1024});writeFileSync(`${directory}/${phase}-${name}.txt`,result.stdout+result.stderr);results.push({name,command,flags,status:result.status,error:result.error?.message});writeFileSync(`${directory}/${phase}-results.json`,JSON.stringify(results,null,2));console.log(name,result.status);if((phase==='after'||phase==='stage2'||phase==='captionQuality')&&result.status!==0)break;}

process.exitCode=results.some(result=>result.status!==0)?1:0;

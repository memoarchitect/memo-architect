// Diagnostic copies only: original transaction operations remain intact.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,posix,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const dest=process.env.MEMO_DIAGNOSTIC_GENERATED_DIR??'packages/web/pilot-baseline/undo-diagnostic';mkdirSync(dest,{recursive:true});
const sha=s=>createHash('sha256').update(s).digest('hex');const manifest=[];
const includeBefore=process.env.MEMO_UNDO_VARIANT==='before'||process.env.MEMO_DIAGNOSTIC_INCLUDE_BEFORE==='1';
for(const variant of includeBefore?['current','before']:['current']){
 const dir=`${dest}/${variant}`;mkdirSync(dir,{recursive:true});
 for(const name of ['DiagramCanvas','InterconnectionNode','InterconnectionEdge']){
 const path=variant==='current'?(name==='DiagramCanvas'&&process.env.MEMO_DIAGNOSTIC_CURRENT_CANVAS?process.env.MEMO_DIAGNOSTIC_CURRENT_CANVAS:`packages/web/src/views/${name}.tsx`):`artifacts/ibd-session5/${name}.before.tsx`;
 const original=readFileSync(path,'utf8');let s=original.replace(/(from\s+|import\s+)(['"])(\.[^'"]+)\2/g,(all,p,q,rel)=>`${p}${q}/src/${posix.normalize(`views/${rel}`)}${q}`);
 if(name==='DiagramCanvas'){
 s=s.replaceAll("'/src/views/InterconnectionNode'","'./InterconnectionNode'").replaceAll("'/src/views/InterconnectionEdge'","'./InterconnectionEdge'");
 s=`const diagLog=(stage:string,value:any)=>{const w=window as any;(w.undoDiagnosticLog??=[]).push({time:performance.now(),stage,value:JSON.parse(JSON.stringify(value))});};\n`+s;
 const inject=(needle,extra)=>{if(!s.includes(needle))throw Error(`Missing ${needle}`);s=s.replace(needle,needle+extra);};
 inject('const redoStack = useRef<UndoCommand[]>([]);',`\n    const diagnosticState=()=>({nodes:nodesRef.current.map(n=>({id:n.id,position:n.position,parentId:n.parentId,width:n.width,height:n.height,ports:n.data?.ports})),edges:edgesRef.current.map(e=>({id:e.id,source:e.source,target:e.target,data:e.data})),cache:[...positionCacheRef.current],undo:undoStack.current.length,redo:redoStack.current.length,routing:routingRef.current,layout:selectedDiagramId?useModelStore.getState().diagramLayouts[selectedDiagramId]:null});\n    (window as any).undoDiagnosticState=diagnosticState;`);
 inject('const pushUndo = useCallback((cmd: UndoCommand) => {',"\n        diagLog('history-push',{stack:new Error().stack,state:diagnosticState()});");
 inject('const onNodeDragStart = useCallback((_: RFAny, node: FlowNode) => {',"\n        diagLog('drag-start',{node:node.position,state:diagnosticState()});");
 inject('const onNodeDragStop = useCallback((_: RFAny, node: FlowNode) => {',"\n        diagLog('drag-stop',{node:node.position,state:diagnosticState()});");
 if(s.includes('const prevPos = positionCacheRef.current.get(node.id);')) inject('const prevPos = positionCacheRef.current.get(node.id);',"\n        diagLog('move-history-choice',{start,prevPos,final:{x,y}});");
 else inject('const before = start.geometry;',"\n        diagLog('move-history-choice',{start:{id:start.id,x:start.x,y:start.y},before,final:{x,y}});");
 inject('const undoLastDiagramEdit = useCallback(() => {',"\n        diagLog('undo-before',diagnosticState());");
 inject('if (cmd) { cmd.undo(); redoStack.current.push(cmd); }',"\n        diagLog('undo-after',diagnosticState());");
 inject('const redoLastDiagramEdit = useCallback(() => {',"\n        diagLog('redo-before',diagnosticState());");
 inject('if (cmd) { cmd.do(); undoStack.current.push(cmd); }',"\n        diagLog('redo-after',diagnosticState());");
 inject('const scheduleGeometryUpdate = useCallback((nextNodes: FlowNode[], reroute = true) => {',"\n        diagLog('geometry-schedule',{reroute,nodes:nextNodes.map(n=>({id:n.id,position:n.position,ports:n.data?.ports}))});");
 inject('nodesRef.current = stableNodes;',"\n            diagLog('geometry-stable',{nodes:stableNodes.map(n=>({id:n.id,position:n.position,ports:n.data?.ports}))});");
 inject('if (cancelled) return;',"\n            diagLog('layout-apply-input',{nodes:n.map(n=>({id:n.id,position:n.position})),state:diagnosticState()});");
 inject('setIsLayouting(false);\n            setLayoutVersion'," "); // whitespace-only anchor proof
 inject('const savedLayout = selectedDiagramId'," ");
 if(s.includes('const restore = (points: Array<{ x: number; y: number }>, manual: boolean) => {')) inject('const restore = (points: Array<{ x: number; y: number }>, manual: boolean) => {',"\n            diagLog('route-restore',{edgeId,points,manual,state:diagnosticState()});");
 if(s.includes("if (JSON.stringify(before) === JSON.stringify(after)) return;")) inject("if (JSON.stringify(before) === JSON.stringify(after)) return;", "\n        diagLog('route-commit',{edgeId,before,after,wasManual,state:diagnosticState()});");
 }
 writeFileSync(`${dir}/${name}.tsx`,s);manifest.push({variant,name,path,originalSha256:sha(original),instrumentedSha256:sha(s)});
 }
}
writeFileSync(`${dest}/index.html`,'<html><body style="margin:0"><div id="root"></div><script type="module" src="/pilot-baseline/undo-diagnostic/main.tsx"></script></body></html>');
writeFileSync(`${dest}/main.tsx`,`import React from 'react';import {createRoot} from 'react-dom/client';import '/src/index.css';import {DiagramCanvas as Current} from './current/DiagramCanvas';${includeBefore?"import {DiagramCanvas as Before} from './before/DiagramCanvas';":''}import {useModelStore} from '/src/store/model-store';import {connectWebSocket} from '/src/store/ws-client';function Fixture(){const model=useModelStore(s=>s.model);const [open,setOpen]=React.useState(false);React.useEffect(()=>connectWebSocket(),[]);if(!model)return <div>Loading normal bootstrap…</div>;${includeBefore?"const Canvas=new URLSearchParams(location.search).has('before')?Before:Current;":"if(new URLSearchParams(location.search).has('before'))return <div>Frozen diagnostic unavailable: generate it with MEMO_UNDO_VARIANT=before and retained snapshots.</div>;const Canvas=Current;"}return open?<div style={{height:'100vh',display:'flex'}}><Canvas/></div>:<button onClick={()=>{useModelStore.getState().selectDiagram('vehicleRoutingPilot');setOpen(true);}}>Open IBD diagnostic</button>;}createRoot(document.getElementById('root')!).render(<Fixture/>);`);
const manifestPath=process.env.MEMO_DIAGNOSTIC_MANIFEST??'artifacts/ibd-move-repair/source-manifest.json';mkdirSync(dirname(manifestPath),{recursive:true});
writeFileSync(manifestPath,JSON.stringify({layers:!includeBefore?'Current Canvas (or the explicitly requested override), Node and Edge, with shared current helpers and dependencies. No frozen control included.':process.env.MEMO_DIAGNOSTIC_CURRENT_CANVAS?'Frozen/current Canvas, Node and Edge only; shared current CSS, renderer profile, template, store, ws, routing and resize helpers, dependencies. No full older bundle claim.':'Repaired current Canvas and its new movement-history helper differ from frozen pre-Session-5 Canvas; frozen/current Node and Edge preserve their Session-5 differences. CSS, renderer profile, template, store, ws, routing/resize helpers and dependencies are shared. No full older bundle claim.',files:manifest},null,2));

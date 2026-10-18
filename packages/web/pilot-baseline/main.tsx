import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, ConnectionMode, useNodesState, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useModelStore } from '../src/store/model-store';
import { InterconnectionNode } from '../src/views/InterconnectionNode';
const data = (label: string, extra = {}) => ({ label, kind: 'LogicalComponent', layer: 'logical', color: '#2563eb', isContainer: false, ports: [], minWidth: 100, minHeight: 70, ...extra });
const fixture = [
 {id:'grand',type:'ibd',position:{x:-400,y:-200},width:1100,height:850,data:data('Grandparent',{isContainer:true,hasChildren:true})},
 {id:'parent',type:'ibd',parentId:'grand',position:{x:200,y:100},width:800,height:650,data:data('Parent',{isContainer:true,hasChildren:true})},
 {id:'nested',type:'ibd',parentId:'parent',position:{x:300,y:200},width:200,height:100,data:data('Nested subject')},
 {id:'sibling',type:'ibd',parentId:'parent',position:{x:550,y:200},width:200,height:100,data:data('Sibling')},
 {id:'floor',type:'ibd',position:{x:750,y:150},width:240,height:140,data:data('Generated size floor',{minWidth:240,minHeight:140})},
 {id:'port',type:'ibd',position:{x:750,y:400},width:240,height:140,data:data('Port target',{onPortResize:()=>{},onPortMove:()=>{},onPortSelect:()=>{},ports:[{id:'p',name:'Signal',x:230,y:130,side:'right',size:20}]})},
];
const nodeTypes = {ibd: InterconnectionNode};
function Fixture() {
 const acquisition=new URLSearchParams(location.search).has('acquisition');
 const events=React.useRef<any[]>([]);
 const [nodes,setNodes,onNodesChange] = useNodesState((acquisition ? [...fixture,{id:'connection-target',type:'ibd',position:{x:1080,y:400},width:180,height:240,data:data('Connection target',{ports:[{id:'p2',name:'Receive',x:-10,y:230,side:'left',size:20}]})}] : fixture).map(node=>node.id==='port' ? {...node,height:acquisition?240:node.height,data:{...node.data,
  ports:acquisition?[{id:'p',name:'Signal',x:230,y:230,side:'right',size:20},{id:'dense-upper',name:'Upper',x:230,y:70,side:'right',size:20},{id:'dense-lower',name:'Lower',x:230,y:120,side:'right',size:20}]:node.data.ports,
  onPortSelect:(id:string,inspect?:boolean)=>{events.current.push({type:inspect?'inspect':'select',id});useModelStore.setState({canvasPortSelection:id});},
  onPortMove:(id:string,along:number,side?:string)=>{events.current.push({type:'move',id,along,side});setNodes(previous=>previous.map(n=>n.id==='port'?{...n,data:{...n.data,ports:(n.data.ports as any[]).map(p=>p.id===id?{...p,y:along}:p)}}:n));},
  onPortCommit:(id:string)=>events.current.push({type:'commit',id}),
 }}:node));
 (window as any).acquisitionEvents=()=>events.current;

 (window as any).baselineNodes = () => nodes.map(({id,parentId,position,width,height,selected})=>({id,parentId,position,width,height,selected}));
 return <div style={{width:'100vw',height:'100vh'}}><ReactFlow nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange} connectionMode={ConnectionMode.Loose} onConnect={connection=>events.current.push({type:'connect',connection})} defaultViewport={{x:acquisition?-650*Number(new URLSearchParams(location.search).get('zoom')??.7)+120:420,y:acquisition?-300*Number(new URLSearchParams(location.search).get('zoom')??.7)+120:260,zoom:Number(new URLSearchParams(location.search).get('zoom') ?? 0.7)}} minZoom={0.2} maxZoom={2}><Background/><Controls/></ReactFlow></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);

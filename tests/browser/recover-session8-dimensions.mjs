// Recover missing style-only dimensions from the same frozen DOM, without rerouting.
import fs from 'node:fs';import {routeMetrics} from './session8-metrics.ts';
const dir=process.argv[2],d=JSON.parse(fs.readFileSync(dir+'/readability.json')),dom=fs.readFileSync(dir+'/readability-dom.xml','utf8');
if(!fs.existsSync(dir+'/readability.original.json'))fs.copyFileSync(dir+'/readability.json',dir+'/readability.original.json');
for(const n of d.state.nodes){const tags=dom.match(/<div\b[^>]*>/g)||[];const tag=tags.find(t=>t.includes('data-id="'+n.id+'"'));if(!tag)throw Error(n.id);const style=tag.match(/style="([^"]*)"/)?.[1]??'';n.width=Number(style.match(/(?:^|;)\s*width:\s*([\d.]+)px/)?.[1]);n.height=Number(style.match(/(?:^|;)\s*height:\s*([\d.]+)px/)?.[1]);if(!n.width||!n.height)throw Error('missing dimensions '+n.id);}
d.metrics=routeMetrics(d.state.nodes,d.routes);d.dimensionProvenance='Recovered exact style width/height from this same frozen readability-dom.xml; initial getter omitted style-only dimensions. Original retained.';fs.writeFileSync(dir+'/readability.json',JSON.stringify(d,null,2));console.log(dir,Object.fromEntries(Object.entries(d.metrics).filter(([k])=>!k.endsWith('Locations'))));

const byId=new Map(d.state.nodes.map(n=>[n.id,n]));const abs=id=>{const n=byId.get(id),p=n.parentId?abs(n.parentId):{x:0,y:0};return{x:p.x+n.position.x,y:p.y+n.position.y}};
const bs=d.state.nodes.map(n=>({...abs(n.id),w:n.width,h:n.height}));const x=Math.min(...bs.map(n=>n.x))-40,y=Math.min(...bs.map(n=>n.y))-40,w=Math.max(...bs.map(n=>n.x+n.w))-x+40,h=Math.max(...bs.map(n=>n.y+n.h))-y+40;
const paths=(dom.match(/<path\b[^>]*class="react-flow__edge-path"[^>]*\/>/g)||[]).join('');
const boxes=bs.map(n=>`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="#94a3b8"/>`).join('');
fs.writeFileSync(dir+'/readability-geometry.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">${boxes}<g fill="none" stroke="#334155">${paths}</g></svg>`);

import type { Node, Edge } from '@xyflow/react';
type Point={x:number;y:number};
const near=(a:Point,b:Point)=>Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6;
/** Cheap orthogonal placement objective. This guides proposals; final geometry
 * still goes through the obstacle router and the independent readability gate. */
export function placementRouteConflicts(nodes:Node[],edges:Edge[]) {
    const byId=new Map(nodes.map(n=>[n.id,n]));
    const absolute=(id:string):Point=>{const n=byId.get(id)!;const p=n.parentId?absolute(n.parentId):{x:0,y:0};return{x:n.position.x+p.x,y:n.position.y+p.y}};
    const ancestor=(id:string,end:string)=>{for(let n=byId.get(end);n;n=byId.get(n.parentId??''))if(n.id===id)return true;return false};
    const routes=edges.map(e=>({edge:e,points:(e.data?.points??[])as Point[]})).filter(r=>r.points.length>=2);
    let blocked=0,overlap=0;const contacts=new Set<string>(),byEdge:Record<string,number>={};
    const segments=(ps:Point[])=>ps.slice(1).map((b,i)=>({a:ps[i],b})).filter(({a,b})=>!near(a,b));
    for(let i=0;i<routes.length;i++){
        const r=routes[i];
        for(const{a,b}of segments(r.points))for(const n of nodes){
            if(n.hidden||n.type==='annotationNode'||n.data.isFrame||(n.id!==r.edge.source&&ancestor(n.id,r.edge.source))||(n.id!==r.edge.target&&ancestor(n.id,r.edge.target)))continue;
            const p=absolute(n.id),w=Number(n.width??n.style?.width),h=Number(n.height??n.style?.height);
            if(a.y===b.y?a.y>p.y&&a.y<p.y+h&&Math.min(Math.max(a.x,b.x),p.x+w)>Math.max(Math.min(a.x,b.x),p.x)
                :a.x>p.x&&a.x<p.x+w&&Math.min(Math.max(a.y,b.y),p.y+h)>Math.max(Math.min(a.y,b.y),p.y))blocked++;
        }
        for(let j=i+1;j<routes.length;j++)for(const{a,b}of segments(r.points))for(const{a:c,b:d}of segments(routes[j].points)){
            if(a.y===b.y&&c.y===d.y&&a.y===c.y){overlap+=Math.max(0,Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))-Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x)));continue;}
            if(a.x===b.x&&c.x===d.x&&a.x===c.x){overlap+=Math.max(0,Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))-Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y)));continue;}
            if((a.y===b.y)===(c.y===d.y))continue;
            const h=a.y===b.y?[a,b]:[c,d],v=a.y===b.y?[c,d]:[a,b],p={x:v[0].x,y:h[0].y};
            if(p.x<Math.min(h[0].x,h[1].x)||p.x>Math.max(h[0].x,h[1].x)||p.y<Math.min(v[0].y,v[1].y)||p.y>Math.max(v[0].y,v[1].y))continue;
            const ends=(route:typeof r)=>[{p:route.points[0],key:route.edge.source+':'+route.edge.data?.sourcePortId},{p:route.points.at(-1)!,key:route.edge.target+':'+route.edge.data?.targetPortId}];
            if(ends(r).some(e=>near(e.p,p)&&ends(routes[j]).some(f=>near(f.p,p)&&f.key===e.key)))continue;
            contacts.add(`${i}:${j}:${p.x.toFixed(6)}:${p.y.toFixed(6)}`);
        }
    }
    for(const contact of contacts){const[i,j]=contact.split(':').map(Number);for(const index of[i,j]){const id=routes[index].edge.id;byEdge[id]=(byEdge[id]??0)+1}}
    return{crossings:contacts.size,blocked,overlap,byEdge};
}

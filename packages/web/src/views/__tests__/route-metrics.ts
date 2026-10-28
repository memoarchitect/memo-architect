// Metrics use the undecorated geometric skeleton, never crossover decorations.
type P={x:number,y:number};
const cross=(a:P,b:P)=>a.x*b.y-a.y*b.x;
const sub=(a:P,b:P)=>({x:a.x-b.x,y:a.y-b.y});
const eps=1e-6;
export function routeMetrics(nodes:any[],routes:any[]){
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const abs=(id:string):P=>{const n=byId.get(id),p=n.parentId?abs(n.parentId):{x:0,y:0};return{x:p.x+n.position.x,y:p.y+n.position.y}};
 const ancestor=(id:string,end:string):boolean=>{for(let n=byId.get(end);n;n=byId.get(n.parentId))if(n.id===id)return true;return false};
 const clean=(ps:P[])=>{const out:P[]=[];for(const p of ps){if(out.length&&Math.hypot(p.x-out.at(-1)!.x,p.y-out.at(-1)!.y)<eps)continue;while(out.length>1&&Math.abs(cross(sub(out.at(-1)!,out.at(-2)!),sub(p,out.at(-1)!)))<eps&&((out.at(-1)!.x-out.at(-2)!.x)*(p.x-out.at(-1)!.x)+(out.at(-1)!.y-out.at(-2)!.y)*(p.y-out.at(-1)!.y))>=0)out.pop();out.push(p)}return out};
 const rs=routes.map(r=>({...r,points:clean(r.points)}));
 const segments=(ps:P[])=>ps.slice(1).map((b,i)=>({a:ps[i],b}));
 let length=0,bends=0,collinearOverlap=0;const crossings:any[]=[],partIntersections:any[]=[];
 for(let i=0;i<rs.length;i++){
  const r=rs[i],segs=segments(r.points);bends+=Math.max(0,r.points.length-2);
  for(const s of segs){length+=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
   for(const n of nodes){if(ancestor(n.id,r.source)||ancestor(n.id,r.target))continue;const p=abs(n.id),w=n.width,h=n.height;if(!w||!h)continue;
    // Liang-Barsky interval in the strict interior; touching a boundary is legal.
    let lo=0,hi=1;for(const [a,d,min,max] of [[s.a.x,s.b.x-s.a.x,p.x+eps,p.x+w-eps],[s.a.y,s.b.y-s.a.y,p.y+eps,p.y+h-eps]]){if(Math.abs(d)<eps){if(a<min||a>max)hi=-1}else{const x=(min-a)/d,y=(max-a)/d;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y))}}
    if(hi>lo+eps)partIntersections.push({edge:r.id,part:n.id,segment:s});
   }
  }
  for(let j=i+1;j<rs.length;j++){
   const seen=new Set<string>();for(const s of segs)for(const t of segments(rs[j].points)){
    const u=sub(s.b,s.a),v=sub(t.b,t.a),w=sub(t.a,s.a),den=cross(u,v);
    if(Math.abs(den)<eps){if(Math.abs(cross(w,u))>eps)continue;const mag=Math.hypot(u.x,u.y);if(mag<eps)continue;const a=(w.x*u.x+w.y*u.y)/mag,b=((t.b.x-s.a.x)*u.x+(t.b.y-s.a.y)*u.y)/mag;collinearOverlap+=Math.max(0,Math.min(mag,Math.max(a,b))-Math.max(0,Math.min(a,b)));continue}
    const a=cross(w,v)/den,b=cross(w,u)/den;if(a<-eps||a>1+eps||b<-eps||b>1+eps)continue;
    const p={x:s.a.x+a*u.x,y:s.a.y+a*u.y};
    const endpoint=(r:any)=>[{p:r.points[0],key:r.source+'::'+(r.data?.sourcePortId??'')},{p:r.points.at(-1),key:r.target+'::'+(r.data?.targetPortId??'')}].filter(q=>Math.hypot(p.x-q.p.x,p.y-q.p.y)<eps);
    if(endpoint(r).some(a=>endpoint(rs[j]).some(b=>a.key===b.key)))continue;
    const k=p.x.toFixed(5)+','+p.y.toFixed(5);if(!seen.has(k)){seen.add(k);crossings.push({a:r.id,b:rs[j].id,...p})}
   }
  }
 }
 return{connectors:rs.length,crossings:crossings.length,collinearOverlap,length,bends,partIntersections:partIntersections.length,crossingLocations:crossings,intersectionLocations:partIntersections};
}

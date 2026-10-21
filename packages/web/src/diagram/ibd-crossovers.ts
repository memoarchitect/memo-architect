import {attachedRoute,type IbdRoutingType,type RoutePoint,type RouteSide} from './ibd-routing';
export interface CrossoverRoute {
    id:string; points:RoutePoint[]; type?:IbdRoutingType; manual?:boolean;
    sourceSide?:RouteSide; targetSide?:RouteSide; sourceKey?:string; targetKey?:string;
}
const near=(a:RoutePoint,b:RoutePoint)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-6;
const midpoint=(a:RoutePoint,b:RoutePoint)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const flat=(a:RoutePoint,b:RoutePoint,p:RoutePoint)=>{
    const length=Math.hypot(b.x-a.x,b.y-a.y);
    return length?Math.abs((b.x-a.x)*(a.y-p.y)-(a.x-p.x)*(b.y-a.y))/length:Math.hypot(p.x-a.x,p.y-a.y);
};
function quadratic(a:RoutePoint,b:RoutePoint,c:RoutePoint,out:RoutePoint[],depth=0){
    if(depth>=10||flat(a,c,b)<=.2){out.push(c);return;}
    const ab=midpoint(a,b),bc=midpoint(b,c),m=midpoint(ab,bc);
    quadratic(a,ab,m,out,depth+1);quadratic(m,bc,c,out,depth+1);
}
function cubic(a:RoutePoint,b:RoutePoint,c:RoutePoint,d:RoutePoint,out:RoutePoint[],depth=0){
    if(depth>=10||Math.max(flat(a,d,b),flat(a,d,c))<=.2){out.push(d);return;}
    const ab=midpoint(a,b),bc=midpoint(b,c),cd=midpoint(c,d),abc=midpoint(ab,bc),bcd=midpoint(bc,cd),m=midpoint(abc,bcd);
    cubic(a,ab,abc,m,out,depth+1);cubic(m,bcd,cd,d,out,depth+1);
}
/** Drawing-only tessellation mirrors the existing SVG curves. Routing metrics
 * keep the original, undecorated points and never use this approximation. */
export function renderedRoutePolyline(route:CrossoverRoute):RoutePoint[]{
    const type=route.type??'orthogonal',points=attachedRoute(route.points,type,route.sourceSide,route.targetSide,route.manual);
    if(points.length<2)return points;
    const out=[points[0]];
    if(type==='arc'&&!route.manual){
        const a=points[0],b=points[points.length-1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),bow=Math.min(60,length/4);
        quadratic(a,{x:(a.x+b.x)/2-dy/(length||1)*bow,y:(a.y+b.y)/2+dx/(length||1)*bow},b,out);return out;
    }
    if(type==='curved'||type==='arc'){
        for(let i=0;i<points.length-1;i++){
            const a=points[i],b=points[i+1],previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)];
            cubic(a,{x:a.x+(b.x-previous.x)/6,y:a.y+(b.y-previous.y)/6},{x:b.x-(next.x-a.x)/6,y:b.y-(next.y-a.y)/6},b,out);
        }return out;
    }
    if(type==='rounded'){
        for(let i=1;i<points.length-1;i++){
            const a=points[i-1],b=points[i],c=points[i+1],radius=Math.min(7,Math.hypot(b.x-a.x,b.y-a.y)/2,Math.hypot(c.x-b.x,c.y-b.y)/2);
            const incoming=Math.hypot(b.x-a.x,b.y-a.y)||1,outgoing=Math.hypot(c.x-b.x,c.y-b.y)||1;
            const entry={x:b.x-(b.x-a.x)/incoming*radius,y:b.y-(b.y-a.y)/incoming*radius},exit={x:b.x+(c.x-b.x)/outgoing*radius,y:b.y+(c.y-b.y)/outgoing*radius};
            out.push(entry);quadratic(entry,b,exit,out);
        }out.push(points[points.length-1]);return out;
    }
    return points;
}
interface Segment {a:RoutePoint;b:RoutePoint;route:CrossoverRoute}
const intersection=(s:Segment,t:Segment):RoutePoint|null=>{
    const ux=s.b.x-s.a.x,uy=s.b.y-s.a.y,vx=t.b.x-t.a.x,vy=t.b.y-t.a.y,den=ux*vy-uy*vx;
    if(Math.abs(den)<1e-8)return null; // Collinear overlap needs routing, not decoration.
    const wx=t.a.x-s.a.x,wy=t.a.y-s.a.y,p=(wx*vy-wy*vx)/den,q=(wx*uy-wy*ux)/den;
    return p>=-1e-8&&p<=1+1e-8&&q>=-1e-8&&q<=1+1e-8?{x:s.a.x+p*ux,y:s.a.y+p*uy}:null;
};
const endpoints=(route:CrossoverRoute,p:RoutePoint)=>[
    {point:route.points[0],key:route.sourceKey},{point:route.points[route.points.length-1],key:route.targetKey},
].filter(end=>end.point&&near(end.point,p));
/** Exactly one passing connector receives a gap. Shared semantic endpoints are
 * junctions. A passing wire yields to an unrelated terminating wire, preserving
 * the latter's arrow/port attachment. Other ties use stable edge identity. */
export function crossoverGaps(routes:CrossoverRoute[]):Map<string,RoutePoint[]>{
    const segments:Segment[]=[],buckets=new Map<string,number[]>(),long:number[]=[],result=new Map<string,RoutePoint[]>(),seen=new Set<string>();
    for(const route of routes){const points=renderedRoutePolyline(route);for(let i=1;i<points.length;i++)if(!near(points[i-1],points[i]))segments.push({a:points[i-1],b:points[i],route});}
    for(let i=0;i<segments.length;i++){
        const s=segments[i],x0=Math.floor(Math.min(s.a.x,s.b.x)/128),x1=Math.floor(Math.max(s.a.x,s.b.x)/128),y0=Math.floor(Math.min(s.a.y,s.b.y)/128),y1=Math.floor(Math.max(s.a.y,s.b.y)/128);
        const large=(x1-x0+1)*(y1-y0+1)>4096,candidates=new Set<number>(large?Array.from({length:i},(_,n)=>n):long);
        if(!large)for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const id of buckets.get(`${x},${y}`)??[])candidates.add(id);
        for(const j of candidates){const t=segments[j];if(s.route.id===t.route.id)continue;const p=intersection(s,t);if(!p)continue;
            const a=endpoints(s.route,p),b=endpoints(t.route,p);
            if(a.some(e=>e.key!==undefined&&b.some(f=>f.key===e.key)))continue;
            const owner=a.length&&!b.length?t.route.id:b.length&&!a.length?s.route.id:s.route.id>t.route.id?s.route.id:t.route.id;
            const key=`${owner}:${p.x.toFixed(5)}:${p.y.toFixed(5)}`;if(seen.has(key))continue;seen.add(key);
            const gaps=result.get(owner)??[];gaps.push(p);result.set(owner,gaps);
        }
        if(large)long.push(i);else for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=`${x},${y}`,ids=buckets.get(key)??[];ids.push(i);buckets.set(key,ids);}
    }
    return result;
}

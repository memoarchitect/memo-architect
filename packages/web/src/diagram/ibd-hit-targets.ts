import type { Node } from '@xyflow/react';
import type { PortInfo } from '../views/templates/interconnection-view';
export interface HitRect { x: number; y: number; width: number; height: number }

/** Non-overlapping union strips: overlapping exclusions must not cancel under evenodd. */
export function unionHitRects(rects: HitRect[]): HitRect[] {
    const ys = [...new Set(rects.flatMap(r => [r.y, r.y + r.height]))].sort((a,b) => a-b);
    const result: HitRect[] = [];
    for (let i=1;i<ys.length;i++) {
        const y=ys[i-1], bottom=ys[i];
        const spans=rects.filter(r => r.y < bottom && r.y+r.height > y)
            .map(r => [r.x,r.x+r.width]).sort((a,b)=>a[0]-b[0]);
        let span: number[] | undefined;
        for (const next of spans) {
            if (span && next[0] <= span[1]) span[1]=Math.max(span[1],next[1]);
            else { if(span)result.push({x:span[0],y,width:span[1]-span[0],height:bottom-y}); span=[...next]; }
        }
        if(span)result.push({x:span[0],y,width:span[1]-span[0],height:bottom-y});
    }
    return result;
}

const cache = new WeakMap<Node[], { zoom: number; path: string }>();
/** Clip only connector acquisition, leaving visible routing geometry intact. */
export function ibdEdgeHitClip(nodes: Node[], zoom: number): string {
    const cached=cache.get(nodes);if(cached?.zoom===zoom)return cached.path;
    const byId=new Map(nodes.map(n=>[n.id,n]));
    const absolute=(node: Node): {x:number;y:number} => {
        const parent=node.parentId ? byId.get(node.parentId) : undefined;
        const p=parent ? absolute(parent) : {x:0,y:0};
        return {x:p.x+node.position.x,y:p.y+node.position.y};
    };
    const rects: HitRect[]=[];
    for(const node of nodes) {
        if(node.hidden || !['interconnectionNode','ibd'].includes(node.type ?? ''))continue;
        const {x,y}=absolute(node), width=Number(node.width??node.style?.width??0),height=Number(node.height??node.style?.height??0);
        const margin=node.selected ? Math.max(16 / Math.max(zoom,.1), ...((node.data.ports??[]) as PortInfo[]).map(port => (port.size??32)/2+8/Math.max(zoom,.1)))+7/Math.max(zoom,.1) : 1;
        if(!node.data.isContainer && !node.data.isFrame)rects.push({x:x-margin,y:y-margin,width:width+margin*2,height:height+margin*2});
        else {
            rects.push({x:x-margin,y:y-margin,width:width+margin*2,height:(node.data.isFrame?38:58)+margin});
            if(node.selected)rects.push(
                {x:x-margin,y,width:margin*2,height:height+margin},
                {x:x+width-margin,y,width:margin*2,height:height+margin},
                {x:x-margin,y:y+height-margin,width:width+margin*2,height:margin*2});
        }
        for(const port of (node.data.ports??[]) as PortInfo[]) {
            const size=port.size??32,padding=4;
            rects.push({x:x+port.x-padding,y:y+port.y-padding,width:size+padding*2,height:size+padding*2});
        }
    }
    const path='M -100000 -100000 H 100000 V 100000 H -100000 Z '+unionHitRects(rects)
        .map(r=>`M ${r.x} ${r.y} h ${r.width} v ${r.height} h ${-r.width} Z`).join(' ');
    cache.set(nodes,{zoom,path});return path;
}

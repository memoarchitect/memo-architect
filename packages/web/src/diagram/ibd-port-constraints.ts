import type { CSSProperties } from 'react';
import type { PortSide } from '../views/templates/interconnection-view';
interface Port { id:string; x:number; y:number; side:PortSide; size?:number; nested?:boolean; wallSpan?:number }
export interface PortConstraintRect { x:number; y:number; width:number; height:number; clearance?:number }
export interface PortConstraintBounds { envelopes:PortConstraintRect[]; exclusions:PortConstraintRect[]; containment?:PortConstraintRect }

/** Nearest legal along-wall coordinate. A port move never owns its part's size. */
export function legalPortSlot(port:Port, peers:Port[], side:PortSide, along:number,
    width:number, height:number, bounds?:PortConstraintBounds):{x:number;y:number;side:PortSide}|null {
    const vertical=side==='left'||side==='right', size=port.size??32, span=port.wallSpan??size;
    let min=vertical?58:12, max=(vertical?height:width)-span-12;
    const cross=side==='left'?-size/2:side==='right'?width-size/2:side==='top'?-size/2:height-size/2;
    const envelopes=bounds?.envelopes??[{x:0,y:0,width:size,height:size}];
    if(bounds?.containment)for(const e of envelopes){
        const c=bounds.containment;
        const normal=cross+(vertical?e.x:e.y), extent=vertical?e.width:e.height;
        const low=vertical?c.x:c.y, high=low+(vertical?c.width:c.height);
        if(normal<low-1e-8||normal+extent>high+1e-8)return null;
        min=Math.max(min,(vertical?c.y:c.x)-(vertical?e.y:e.x));
        max=Math.min(max,(vertical?c.y+c.height:c.x+c.width)-(vertical?e.y+e.height:e.x+e.width));
    }
    if(!Number.isFinite(max)||max<min)return null;
    const blocked:Array<[number,number]>=peers.filter(p=>p.id!==port.id&&!p.nested&&p.side===side)
        .map(p=>{const a=vertical?p.y:p.x;return[a-span-12,a+(p.wallSpan??p.size??32)+12]});
    for(const obstacle of bounds?.exclusions??[])for(const e of envelopes){
        const gap=obstacle.clearance??4, normal=cross+(vertical?e.x:e.y), extent=vertical?e.width:e.height;
        const low=(vertical?obstacle.x:obstacle.y)-gap;
        const high=(vertical?obstacle.x+obstacle.width:obstacle.y+obstacle.height)+gap;
        if(normal+extent<=low+1e-8||normal>=high-1e-8)continue;
        blocked.push([(vertical?obstacle.y:obstacle.x)-(vertical?e.y+e.height:e.x+e.width)-gap,
            (vertical?obstacle.y+obstacle.height:obstacle.x+obstacle.width)-(vertical?e.y:e.x)+gap]);
    }
    const candidates=[Math.max(min,Math.min(max,along)),min,max,...blocked.flat()]
        .filter(v=>v>=min&&v<=max&&!blocked.some(([a,b])=>v>a+1e-8&&v<b-1e-8))
        .sort((a,b)=>Math.abs(a-along)-Math.abs(b-along)||a-b);
    if(!candidates.length)return null;
    const value=candidates[0];
    return vertical?{x:cross,y:value,side}:{x:value,y:cross,side};
}

/** Where a port the user is dragging lands on `side`. It may sit anywhere along
 * the wall except the corners and, on a side wall, the header row. A peer on
 * the same wall is never overlapped: the port takes the nearest free slot, so
 * dragging past a peer hops over it. Null only when the wall has no free slot.
 */
export function draggedPortSlot(port:Port, peers:Port[], side:PortSide, along:number,
    width:number, height:number):{x:number;y:number;side:PortSide}|null {
    const vertical=side==='left'||side==='right', size=port.size??32, span=port.wallSpan??size;
    const length=vertical?height:width, gap=4;
    const min=vertical?Math.min(HEADER_ROW,Math.max(gap,(length-span)/2)):gap, max=length-span-gap;
    if(max<min)return null;
    const cross=side==='left'?-size/2:side==='right'?width-size/2:side==='top'?-size/2:height-size/2;
    const blocked=peers.filter(p=>p.id!==port.id&&!p.nested&&p.side===side)
        .map(p=>{const a=vertical?p.y:p.x;return[a-span-gap,a+(p.wallSpan??p.size??32)+gap] as [number,number]});
    const free=(v:number)=>v>=min-1e-8&&v<=max+1e-8&&!blocked.some(([a,b])=>v>a+1e-8&&v<b-1e-8);
    const best=[Math.max(min,Math.min(max,along)),...blocked.flat()].filter(free)
        .sort((a,b)=>Math.abs(a-along)-Math.abs(b-along)||a-b)[0];
    if(best===undefined)return null;
    return vertical?{x:cross,y:best,side}:{x:best,y:cross,side};
}

/** Side-wall ports stay below a part's name row. */
const HEADER_ROW=24;

/** Proposed glyph and caption envelopes relative to the port's origin. */
export function measurePortEnvelopes(owner:HTMLElement,port:HTMLElement,size:number,
    placement:CSSProperties,zoom:number):PortConstraintRect[]{
    const origin=owner.getBoundingClientRect(),glyph=port.getBoundingClientRect();
    const offset={x:(glyph.x-origin.x)/zoom-parseFloat(port.style.left),y:(glyph.y-origin.y)/zoom-parseFloat(port.style.top)};
    const envelopes:PortConstraintRect[]=[{...offset,width:size,height:size}];
    const caption=port.querySelector<HTMLElement>('[data-ibd-caption]');
    if(caption){
        const shell=document.createElement('div'), clone=caption.cloneNode(true) as HTMLElement;
        Object.assign(shell.style,{position:'fixed',left:'-10000px',top:'-10000px',width:`${size}px`,height:`${size}px`,border:'1px solid',boxSizing:'border-box',visibility:'hidden',pointerEvents:'none'});
        Object.assign(clone.style,{left:'auto',right:'auto',top:'auto',bottom:'auto',transform:'none',margin:'0',width:'auto',height:'auto',fontWeight:'750'});
        for(const[key,value]of Object.entries(placement))if(value!==undefined)(clone.style as any)[key]=typeof value==='number'?`${value}px`:String(value);
        shell.append(clone);document.body.append(shell);
        try{const a=shell.getBoundingClientRect(),b=clone.getBoundingClientRect();envelopes.push({x:offset.x+b.x-a.x,y:offset.y+b.y-a.y,width:b.width,height:b.height});}
        finally{shell.remove();}
    }
    return envelopes;
}

/** Read actual text/controls and measure the proposed caption offscreen, never
 * changing the mounted scene. Coordinates are in the owner's world frame. */
export function measuredPortBounds(owner:HTMLElement, port:HTMLElement, size:number,
    placement:CSSProperties, ancestorIds:Set<string>, zoom:number, peerBounds?:(peer:HTMLElement)=>PortConstraintRect[]|undefined):PortConstraintBounds {
    const origin=owner.getBoundingClientRect();
    const relative=(r:DOMRect):PortConstraintRect=>({x:(r.x-origin.x)/zoom,y:(r.y-origin.y)/zoom,width:r.width/zoom,height:r.height/zoom});
    const envelopes=measurePortEnvelopes(owner,port,size,placement,zoom),exclusions:PortConstraintRect[]=[];
    const containers:PortConstraintRect[]=[];
    for(const el of document.querySelectorAll<HTMLElement>('.react-flow__node')){
        if(el===owner)continue;
        const r=relative(el.getBoundingClientRect());if(!r.width||!r.height)continue;
        if(ancestorIds.has(el.dataset.id??''))containers.push(r);else exclusions.push(r);
    }
    for(const header of document.querySelectorAll('[data-ibd-header]')){
        const walker=document.createTreeWalker(header,NodeFilter.SHOW_TEXT);let text:Node|null;
        while(text=walker.nextNode()){
            if(!text.textContent?.trim())continue;
            const range=document.createRange();range.selectNodeContents(text);
            const r=relative(range.getBoundingClientRect());if(r.width&&r.height)exclusions.push(r);
        }
        for(const button of header.querySelectorAll('button'))exclusions.push(relative(button.getBoundingClientRect()));
    }
    for(const peer of document.querySelectorAll<HTMLElement>('[data-ibd-port]')){
        if(peer===port)continue;
        const proposed=peerBounds?.(peer);
        if(proposed){exclusions.push(...proposed.map(rect=>({...rect,clearance:12})));continue;}
        exclusions.push({...relative(peer.getBoundingClientRect()),clearance:12});
        const label=peer.querySelector('[data-ibd-caption]');if(label)exclusions.push({...relative(label.getBoundingClientRect()),clearance:12});
    }
    let containment:PortConstraintRect|undefined;
    if(containers.length){const x=Math.max(...containers.map(r=>r.x+4)),y=Math.max(...containers.map(r=>r.y+4));containment={x,y,width:Math.min(...containers.map(r=>r.x+r.width-4))-x,height:Math.min(...containers.map(r=>r.y+r.height-4))-y};}
    return{envelopes,exclusions,containment};
}

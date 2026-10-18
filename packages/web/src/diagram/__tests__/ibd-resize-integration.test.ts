import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { resizeIbdNodes, restoreIbdGeometry } from '../ibd-resize-integration';
import type { ResizeDirection } from '../ibd-resize';
const node = (id: string, x: number, y: number, width=200, height=100, parentId?: string): Node =>
    ({id, type:'interconnectionNode', parentId, position:{x,y}, width, height, style:{width,height}, data:{opaque:'retain',ports:[]}});
const minima={title:{width:80,height:30}};
describe('React Flow IBD resize integration geometry',()=>{
    it.each(['n','ne','e','se','s','sw','w','nw'] as ResizeDirection[])('applies %s to dimensions, style and measured bounds coherently',direction=>{
        const start=[node('a',50,50)];
        const after=resizeIbdNodes(start,'a',direction,{x:direction.includes('w')?-10:10,y:direction.includes('n')?-10:10},minima)!;
        expect(after[0].width).toBe(direction.includes('e')||direction.includes('w')?210:200);
        expect(after[0].height).toBe(direction.includes('n')||direction.includes('s')?110:100);
        expect(after[0].style?.width).toBe(after[0].width);
        expect(after[0].measured?.height).toBe(after[0].height);
        expect(start[0].width).toBe(200);
    });
    it('shrinks below generated minima and uses original geometry after overshoot',()=>{
        const start=[{...node('a',50,50),data:{minWidth:200,minHeight:100}},node('peer',300,50)];
        expect(resizeIbdNodes(start,'a','e',{x:500,y:0},minima)![0].width).toBe(246);
        expect(resizeIbdNodes(start,'a','e',{x:20,y:0},minima)![0].width).toBe(220);
        expect(resizeIbdNodes(start,'a','se',{x:-90,y:-40},minima)![0].width).toBe(110);
    });
    it('rebases immediate children, retains deeper local offsets and restores geometry without selection/data loss',()=>{
        const start=[node('root',-200,-100,800,600),node('a',100,80,500,400,'root'),node('child',80,80,100,100,'a'),node('deep',10,20,40,40,'child')];
        const after=resizeIbdNodes(start,'a','nw',{x:-20,y:-10},minima)!;
        expect(after[2].position).toEqual({x:100,y:90});
        expect(after[3]).toBe(start[3]);
        const current=after.map(n=>({...n,selected:true,data:{...n.data,future:'current'}}));
        const undone=restoreIbdGeometry(current,start,new Set(['a','child']));
        expect(undone[1].position).toEqual(start[1].position);
        expect(undone[1].selected).toBe(true);expect(undone[1].data.future).toBe('current');
        const redone=restoreIbdGeometry(undone,after,new Set(['a','child']));
        expect(redone[2].position).toEqual(after[2].position);
    });
    it('undo materializes initial style-only dimensions so persistence cannot retain the resized size',()=>{
        const initial={...node('a',50,50),width:undefined,height:undefined,measured:{width:200,height:100}};
        const after=resizeIbdNodes([initial],'a','se',{x:20,y:10},minima)!;
        const undone=restoreIbdGeometry(after,[initial],new Set(['a']));
        expect(undone[0].width).toBe(200);expect(undone[0].height).toBe(100);
        expect(undone[0].style).toMatchObject({width:200,height:100});
    });
    it('anchors right/bottom wall ports from original positions and preserves unknown port fields',()=>{
        const start=[{...node('a',50,50),data:{ports:[{id:'r',x:190,y:40,side:'right',future:1},{id:'b',x:60,y:90,side:'bottom'}]}}];
        const result=resizeIbdNodes(start,'a','se',{x:20,y:10},minima)![0];
        expect(result.data.ports).toEqual([{id:'r',x:210,y:40,side:'right',future:1},{id:'b',x:60,y:100,side:'bottom'}]);
    });
    it('retains the monotone overlap policy and leaves annotations outside peer bounds',()=>{
        const start=[node('a',50,50),node('peer',220,60),{...node('note',250,50),type:'annotationNode'}];
        expect(resizeIbdNodes(start,'a','e',{x:30,y:0},minima)![0].width).toBe(200);
        expect(resizeIbdNodes(start,'a','e',{x:-30,y:0},minima)![0].width).toBe(170);
    });
});

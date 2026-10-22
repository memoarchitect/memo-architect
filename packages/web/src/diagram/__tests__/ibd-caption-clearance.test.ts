import {it,expect} from 'vitest';
import {BaseInterconnectionRenderer,IbdInterconnectionRenderer} from '../renderers/interconnection-renderer';
import type {PortInfo} from '../../views/templates/interconnection-view';
it.each([new BaseInterconnectionRenderer(),new IbdInterconnectionRenderer()])('keeps ordinary top-caption text beside its terminal axis for $id',renderer=>{
 for(const size of [20,32,48]){
  const port={id:'port',side:'top',x:80,y:-size/2,size} as PortInfo;
  const style=renderer.portLabelPlacement(port,{labelOffset:size+6});
  expect(typeof style.left).toBe('number');expect(style.left as number).toBeGreaterThan(size/2);
  expect(style.transform??'').not.toContain('translateX');
 }
});

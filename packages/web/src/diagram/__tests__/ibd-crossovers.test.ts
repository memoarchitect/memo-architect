import{it,expect}from'vitest';import{crossoverGaps,renderedRoutePolyline,type CrossoverRoute}from'../ibd-crossovers';
const h:CrossoverRoute={id:'h',points:[{x:0,y:50},{x:100,y:50}],sourceKey:'a',targetKey:'b'};
it('marks one connector at a non-junction crossing without changing route geometry',()=>{
 const v:CrossoverRoute={id:'v',points:[{x:50,y:0},{x:50,y:100}],sourceKey:'c',targetKey:'d'},before=structuredClone([h,v]);
 expect([...crossoverGaps([h,v])]).toEqual([['v',[{x:50,y:50}]]]);expect([h,v]).toEqual(before);
});
it('keeps shared endpoints as junctions and gaps a passing wire for an unrelated endpoint',()=>{
 const v:CrossoverRoute={id:'v',points:[{x:100,y:50},{x:100,y:100}],sourceKey:'b',targetKey:'d'};
 expect(crossoverGaps([h,v]).size).toBe(0);
 const passing={...h,points:[{x:0,y:50},{x:200,y:50}]};
 expect([...crossoverGaps([passing,v])]).toEqual([['h',[{x:100,y:50}]]]);
});
it('does not pretend collinear overlap was removed by a decoration',()=>{
 expect(crossoverGaps([h,{...h,id:'other'}]).size).toBe(0);
});
it('locates automatic arc and rounded-corner crossovers on their actual curves',()=>{
 const arc:CrossoverRoute={id:'a',type:'arc',points:[{x:0,y:0},{x:100,y:0}]};
 const vertical:CrossoverRoute={id:'v',points:[{x:50,y:-100},{x:50,y:100}]};
 expect(crossoverGaps([arc,vertical]).get('v')![0].y).toBeCloseTo(12.5,5);
 const rounded:CrossoverRoute={id:'a',type:'rounded',points:[{x:0,y:50},{x:50,y:50},{x:50,y:100}]};
 expect(crossoverGaps([rounded,{...vertical,points:[{x:48.25,y:0},{x:48.25,y:100}]}]).get('v')![0].y).toBeCloseTo(51.75,5);
 expect(renderedRoutePolyline(rounded)[0]).toEqual(rounded.points[0]);
});

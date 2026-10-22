import {it,expect} from 'vitest';
import {compileDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene} from '../src/scene/fixture';
import {workSegment,type WalkingArea} from '../src/sim/work-navigation';

const area:WalkingArea={id:'yard',grounds:['yard'],access:[],network:true};
function scene(bottom=0){
 const spec=compileDream(`dream 2;material brick(style=toon,colors=[#995b4c,#995b4c]);object wall(label="Barrier"){
  measure(kind=custom,axis=x,meters=6);body(interaction=solid,radius=4,height=40);
  contact slab(at=[0,${bottom},0],size=[60,6],height=4);
  part footing(shape=box,material=brick,at=[0,.5,0],size=[1,1,1]);
  part beam(shape=box,material=brick,at=[0,${bottom+2},0],size=[60,4,6]);
 }`)[0]!;
 return parseScene({...createFixtureScene(),objects:[{id:'barrier',kind:'custom',labelText:'Barrier',x:480,y:360,headingRad:Math.PI/4,scale:1,spec}],regions:[],terrain:{hills:[]},surfaces:[{id:'yard',color:'#819461',points:[{x:300,y:240},{x:660,y:240},{x:660,y:480},{x:300,y:480}]}]});
}
const point=(along:number,offset:number)=>({x:480+(along-offset)*Math.SQRT1_2,y:360+(along+offset)*Math.SQRT1_2});
it('retains full cylinder clearance beside a diagonal box, across it and at stationary endpoints',()=>{
 const doc=scene();
 expect(workSegment(doc,area,point(-25,7.1),point(25,7.1),undefined)).toBe(true);
 expect(workSegment(doc,area,point(-25,6.9),point(25,6.9),undefined)).toBe(false);
 expect(workSegment(doc,area,point(0,-40),point(0,40),undefined)).toBe(false);
 expect(workSegment(doc,area,point(0,7.1),point(0,7.1),undefined)).toBe(true);
 expect(workSegment(doc,area,point(0,6.9),point(0,6.9),undefined)).toBe(false);
 expect(workSegment(doc,area,{x:550,y:300},{x:550,y:420},undefined)).toBe(true);
});
it('retains precise vertical headroom when a path passes beneath an oriented slab',()=>{
 expect(workSegment(scene(18),area,point(0,-40),point(0,40),undefined)).toBe(true);
 expect(workSegment(scene(17.9),area,point(0,-40),point(0,40),undefined)).toBe(false);
});

import {nearestWorkNodes,type WorkNode} from '../src/sim/work-navigation';
const referenceNearest=(nodes:WorkNode[],p:{x:number;y:number})=>nodes.map((n,i)=>({i,d:Math.hypot(n.x-p.x,n.y-p.y)})).filter(n=>nodes[n.i]!.links.length).sort((a,b)=>a.d-b.d || a.i-b.i).slice(0,32);
it('retains the exact nearest 32, stable ties and the pre-clearance cutoff across dense and sparse graphs',()=>{
 let seed=917;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(const spacing of [1,20,1000]){
  const nodes:WorkNode[]=Array.from({length:2048},(_,i)=>({x:Math.floor(random()*40)*spacing,y:Math.floor(random()*40)*spacing,links:i%11 ? [0] : []}));
  for(const p of [{x:0,y:0},{x:19*spacing,y:19*spacing},{x:-100000,y:200000},...Array.from({length:30},()=>({x:random()*40*spacing,y:random()*40*spacing}))])expect(nearestWorkNodes(nodes,p)).toEqual(referenceNearest(nodes,p));
 }
 const ties:WorkNode[]=Array.from({length:80},(_,i)=>({x:i%2 ? 64 : -64,y:0,links:[0]}));expect(nearestWorkNodes(ties,{x:0,y:0}).map(n=>n.i)).toEqual(Array.from({length:32},(_,i)=>i));
});
it('keeps empty/unlinked graphs, small graphs and independently primed node arrays distinct',()=>{
 for(const nodes of [[],Array.from({length:100},(_,i)=>({x:i,y:0,links:[]})),[{x:1,y:2,links:[0]}]])expect(nearestWorkNodes(nodes,{x:0,y:0})).toEqual(referenceNearest(nodes,{x:0,y:0}));
 const first:WorkNode[]=Array.from({length:64},(_,i)=>({x:i,y:0,links:[0]})),second=first.map(n=>({...n,x:n.x+10000}));
 expect(nearestWorkNodes(first,{x:0,y:0})).toEqual(referenceNearest(first,{x:0,y:0}));expect(nearestWorkNodes(second,{x:0,y:0})).toEqual(referenceNearest(second,{x:0,y:0}));
});

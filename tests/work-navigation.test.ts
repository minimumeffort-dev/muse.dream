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

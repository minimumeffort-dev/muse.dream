import type {ObjectDslV2} from '../scene/object-dsl';
import {assemblyBounds} from '../scene/measure';

export const gaitRun=(speed:number)=>Math.max(0,Math.min(1,(speed-22)/30));
export const gaitStance=(run:number)=>.62-.2*run;
export const gaitReach=(run:number)=>12.5+1.5*run;
export const gaitStride=(run:number)=>2*gaitReach(run)/gaitStance(run);
export const gaitPlantReach=(upper:number,lower:number)=>(upper+lower)*.72;

/** Linear ground travel during stance; the return clears the support plane. */
export function strideFoot(phase:number,run:number):{x:number;y:number;toe:number} {
 const t=((phase%1)+1)%1,stance=gaitStance(run),reach=gaitReach(run);
 if(t<stance)return {x:reach*(1-2*t/stance),y:0,toe:0};
 const u=(t-stance)/(1-stance),ease=u*u*(3-2*u);
 return {x:reach*(2*ease-1),y:Math.sin(Math.PI*u)**1.5*(4.5+3.5*run),toe:-.25*Math.sin(Math.PI*u)};
}
export type Sole=readonly [number,number,number];
/** Cached ankle-local support bounds, including authored shoe size and rotation. */
export function humanoidFeet(spec:ObjectDslV2,joints=spec.joints!):[{sole:Sole;radius:number},{sole:Sole;radius:number}]{
 return (['left','right'] as const).map(side=>{
  const id=joints.find(j=>j.bone===`${side}_ankle`)?.id;
  const parts=spec.parts.filter(p=>p.parent===id).map(({parent,...part})=>part);
  if(!id || !parts.length)return {sole:[-2.2,6.8,-3] as Sole,radius:Math.hypot(6.8,3)};
  const bounds=assemblyBounds({...spec,parts,joints:[]});return {sole:[bounds.min.x,bounds.max.x,bounds.min.y] as Sole,radius:Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))};
 }) as [{sole:Sole;radius:number},{sole:Sole;radius:number}];
}
export const humanoidSoles=(spec:ObjectDslV2,joints=spec.joints!):[Sole,Sole]=>humanoidFeet(spec,joints).map(f=>f.sole) as [Sole,Sole];
export function soleSupport(sole:Sole,toe:number):number {
 return -Math.min(sole[0]*Math.sin(toe),sole[1]*Math.sin(toe))-sole[2]*Math.cos(toe);
}

export type TravelPose={x:number;y?:number;z:number;heading:number};
export type GroundSample={height:number;slopeX:number;slopeZ:number;surfaceOffset?:number};
export type GroundSampler=(x:number,z:number,fromHeight:number,radius:number)=>GroundSample;
/** Visual contacts only: two anchors, independent of physics and saved simulation state. */
export class FootPlants {
 private feet=Array.from({length:2},()=>({x:0,z:0,height:0,slopeX:0,slopeZ:0,surfaceOffset:0,queryX:0,queryZ:0,queryHeight:0,queriedAt:-Infinity,heading:0,supported:true,down:false,cycle:0,valid:false}));
 private result=Array.from({length:2},()=>({x:0,z:0,yaw:0,lift:0,rise:0,slopeX:0,slopeZ:0,normalY:1,originRise:0,surfaceOffset:0}));
 private previous:TravelPose|undefined;
 private move=0;
 private turn=0;
 private clock=0;
 private ground:GroundSampler|undefined;
 private radius=0;
 constructor(private sampleSeconds=0){}
 reset(){this.previous=undefined;for(const foot of this.feet){foot.down=foot.valid=false;foot.queriedAt=-Infinity;}}
 begin(pose:TravelPose,scale:number,dt:number,ground?:GroundSampler,radius=0){
  const distance=this.previous ? Math.hypot(pose.x-this.previous.x,pose.z-this.previous.z) : 0;
  if(Math.hypot(distance,(pose.y??0)-(this.previous?.y??0))>scale*80)this.reset();
  this.clock+=Math.max(0,dt);this.ground=ground;this.radius=radius;
  this.move=Math.max(distance*4,scale*180*Math.max(0,dt));this.turn=12*Math.max(0,dt);
  if(this.previous){this.previous.x=pose.x;this.previous.y=pose.y;this.previous.z=pose.z;this.previous.heading=pose.heading;}
  else this.previous={...pose};
 }
 sample(index:number,pose:TravelPose,scale:number,x:number,z:number,down:boolean,cycle:number,unit=1,reach=Infinity){
  const foot=this.feet[index]!,result=this.result[index]!,c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  if(!foot.valid || this.move>0 || this.turn>0){
   const px=(foot.x-pose.x)/scale,pz=(foot.z-pose.z)/scale;
   const release=foot.valid && foot.down && (Math.hypot(c*px+s*pz,-s*px+c*pz-z,(foot.height-(pose.y??0))/scale)>reach || foot.cycle!==cycle);
   if(release)foot.down=false;
   const targetX=pose.x+scale*(c*x-s*z),targetZ=pose.z+scale*(s*x+c*z);
   const fresh=!foot.valid;
   if(fresh){foot.x=targetX;foot.z=targetZ;foot.heading=pose.heading;foot.valid=true;}
   else if(!foot.down || !down || foot.cycle!==cycle){
    // Turning the body must not teleport a foot that is already returning through the air.
    const dx=targetX-foot.x,dz=targetZ-foot.z,t=Math.min(1,this.move/(Math.hypot(dx,dz)||1));
    foot.x+=dx*t;foot.z+=dz*t;
    const yaw=Math.atan2(Math.sin(pose.heading-foot.heading),Math.cos(pose.heading-foot.heading));foot.heading+=Math.max(-this.turn,Math.min(this.turn,yaw));
   }
   if(fresh || !foot.down || !down || foot.cycle!==cycle){
    if(fresh || this.clock-foot.queriedAt+1e-9>=this.sampleSeconds){
     const sample=this.ground?.(foot.x,foot.z,pose.y??0,this.radius);
     foot.supported=!sample || Number.isFinite(sample.height) && Math.abs(sample.height-(pose.y??0))<=reach*scale;
     foot.queryX=foot.x;foot.queryZ=foot.z;foot.queryHeight=foot.supported ? sample?.height??pose.y??0 : (pose.y??0)+foot.surfaceOffset;
     foot.slopeX=foot.supported ? sample?.slopeX??0 : 0;foot.slopeZ=foot.supported ? sample?.slopeZ??0 : 0;
     if(foot.supported)foot.surfaceOffset=sample?.surfaceOffset??0;foot.queriedAt=this.clock;
    }
    const target=foot.queryHeight+foot.slopeX*(foot.x-foot.queryX)+foot.slopeZ*(foot.z-foot.queryZ);
    foot.height=fresh ? target : foot.height+Math.max(-this.move,Math.min(this.move,target-foot.height));
   }
   const groundHeight=foot.queryHeight+foot.slopeX*(foot.x-foot.queryX)+foot.slopeZ*(foot.z-foot.queryZ);
   const remaining=Math.hypot(targetX-foot.x,targetZ-foot.z,groundHeight-foot.height),returning=down && (!foot.supported || release || !foot.down && remaining>1e-8);
   result.lift=returning ? release || !foot.supported ? .8*unit : Math.min(.8*unit,remaining/scale) : 0;
   foot.down=down && !returning;foot.cycle=cycle;
  }
  const dx=(foot.x-pose.x)/scale,dz=(foot.z-pose.z)/scale;
  result.x=c*dx+s*dz;result.z=-s*dx+c*dz;result.yaw=Math.atan2(Math.sin(pose.heading-foot.heading),Math.cos(pose.heading-foot.heading));
  result.rise=(foot.height-(pose.y??0))/scale;
  result.originRise=(foot.height+foot.slopeX*(pose.x-foot.x)+foot.slopeZ*(pose.z-foot.z)-(pose.y??0))/scale;result.surfaceOffset=foot.surfaceOffset/scale;
  result.slopeX=c*foot.slopeX+s*foot.slopeZ;result.slopeZ=-s*foot.slopeX+c*foot.slopeZ;result.normalY=1/Math.hypot(1,foot.slopeX,foot.slopeZ);
  return result;
 }
}
